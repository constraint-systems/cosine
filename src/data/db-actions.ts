import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { db } from "../db/index";
import { eq, sql } from "drizzle-orm";
import { textData, metadata, Metadata } from "../db/schema.js";
import { createHash } from "crypto";
import { generateEmbedding } from "@/utils/embeddings.js";
import pgvector from "pgvector";
import { auth } from "../lib/auth";

export const getRecentTexts = createServerFn({
  method: "GET",
})
  .inputValidator((data: { cursor?: string; limit?: number } = {}) => data)
  .handler(async ({ data }) => {
    const limit = data.limit || 20;
    const cursor = data.cursor;

    // Get all texts grouped by text hash, with all metadata entries
    // Join with user table to get username
    const { user } = await import("../db/schema");

    // First, find the latest createdAt for each text hash
    // This subquery helps us identify which texts to show based on their most recent metadata
    const latestMetadataPerText = db
      .select({
        textHash: metadata.textHash,
        latestCreatedAt: sql<Date>`MAX(${metadata.createdAt})`.as('latest_created_at'),
      })
      .from(metadata)
      .where(sql`${metadata.deletedAt} IS NULL`)
      .groupBy(metadata.textHash)
      .as('latest_metadata');

    // Build a query that fetches texts with their latest timestamp
    let textsToFetch = db
      .select({
        hash: textData.hash,
        latestCreatedAt: latestMetadataPerText.latestCreatedAt,
      })
      .from(textData)
      .innerJoin(latestMetadataPerText, eq(textData.hash, latestMetadataPerText.textHash));

    // Apply cursor filter at the grouped level (not individual metadata)
    if (cursor) {
      textsToFetch = textsToFetch.where(sql`${latestMetadataPerText.latestCreatedAt} < ${cursor}`);
    }

    // Order by latest metadata timestamp and limit
    const textsWithLatest = await textsToFetch
      .orderBy(sql`${latestMetadataPerText.latestCreatedAt} DESC`)
      .limit(limit);

    // Extract the hashes we want to fetch full metadata for
    const hashesToFetch = textsWithLatest.map(t => t.hash);

    if (hashesToFetch.length === 0) {
      return {
        items: [],
        nextCursor: null,
      };
    }

    // Now fetch ALL metadata for these specific texts
    const allTexts = await db
      .select({
        id: metadata.id,
        text: textData.text,
        hash: textData.hash,
        notes: metadata.notes,
        createdBy: metadata.createdBy,
        createdAt: metadata.createdAt,
        username: user.username,
      })
      .from(textData)
      .innerJoin(metadata, eq(metadata.textHash, textData.hash))
      .leftJoin(user, eq(metadata.createdBy, user.id))
      .where(
        sql`${textData.hash} IN (${sql.join(
          hashesToFetch.map((h) => sql`${h}`),
          sql`, `,
        )}) AND ${metadata.deletedAt} IS NULL`
      );

    // Group by text hash and aggregate metadata
    const groupedTexts = allTexts.reduce(
      (acc, entry) => {
        if (!acc[entry.hash]) {
          acc[entry.hash] = {
            text: entry.text,
            hash: entry.hash,
            metadata: [],
            latestCreatedAt: null as Date | null,
          };
        }

        acc[entry.hash].metadata.push({
          id: entry.id,
          notes: entry.notes,
          textHash: entry.hash,
          createdBy: entry.createdBy,
          createdAt: entry.createdAt,
          username: entry.username,
        });

        // Track the most recent createdAt date
        if (
          entry.createdAt &&
          (!acc[entry.hash].latestCreatedAt ||
            new Date(entry.createdAt) >
              new Date(acc[entry.hash].latestCreatedAt!))
        ) {
          acc[entry.hash].latestCreatedAt = entry.createdAt;
        }

        return acc;
      },
      {} as Record<
        string,
        {
          text: string;
          hash: string;
          metadata: Metadata[];
          latestCreatedAt: Date | null;
        }
      >,
    );

    // Convert to array and sort by latestCreatedAt (preserve the order from our query)
    const sortedTexts = Object.values(groupedTexts).sort((a, b) => {
      if (!a.latestCreatedAt || !b.latestCreatedAt) return 0;
      return (
        new Date(b.latestCreatedAt).getTime() -
        new Date(a.latestCreatedAt).getTime()
      );
    });

    // Determine next cursor (oldest createdAt from this batch)
    let nextCursor: string | null = null;
    if (textsWithLatest.length === limit) {
      const oldestText = textsWithLatest[textsWithLatest.length - 1];
      if (oldestText.latestCreatedAt) {
        nextCursor = new Date(oldestText.latestCreatedAt).toISOString();
      }
    }

    return {
      items: sortedTexts,
      nextCursor,
    };
  });

export const getTextByHash = createServerFn({
  method: "GET",
})
  .inputValidator((data: { hash: string }) => data)
  .handler(async ({ data }) => {
    const { user } = await import("../db/schema");

    const results = await db
      .select({
        id: metadata.id,
        text: textData.text,
        hash: textData.hash,
        notes: metadata.notes,
        createdBy: metadata.createdBy,
        createdAt: metadata.createdAt,
        pinnedAt: metadata.pinnedAt,
        username: user.username,
      })
      .from(textData)
      .leftJoin(metadata, sql`${textData.hash} = ${metadata.textHash} AND ${metadata.deletedAt} IS NULL`)
      .leftJoin(user, eq(metadata.createdBy, user.id))
      .where(eq(textData.hash, data.hash));

    // Add metadata aggregation
    const aggregated = results.reduce(
      (acc, row) => {
        if (acc.text === "") {
          acc.text = row.text;
          acc.hash = row.hash;
        }
        if (row.id) {
          acc.metadata.push({
            id: row.id,
            notes: row.notes,
            textHash: row.hash,
            createdBy: row.createdBy!,
            createdAt: row.createdAt,
            pinnedAt: row.pinnedAt,
            username: row.username,
          });
        }
        return acc;
      },
      {
        text: "",
        hash: "",
        metadata: [] as Array<any>,
      },
    );

    return aggregated;
  });

export const getNeighborsByHash = createServerFn({
  method: "GET",
})
  .inputValidator((data: { hash: string; offset?: number; limit?: number }) => data)
  .handler(async ({ data }) => {
    const limit = data.limit || 20;
    const offset = data.offset || 0;

    // First, get the embedding for the given hash
    const sourceEmbedding = await db
      .select({ embedding: textData.embedding })
      .from(textData)
      .where(eq(textData.hash, data.hash))
      .limit(1);

    if (!sourceEmbedding.length) {
      return { items: [], nextOffset: null };
    }

    const embeddingVector = `[${sourceEmbedding[0].embedding!.join(",")}]`;

    // Find nearest neighbor texts using cosine distance
    const nearestTexts = await db
      .select({
        text: textData.text,
        hash: textData.hash,
        distance: sql<number>`${textData.embedding} <=> '${sql.raw(embeddingVector)}'::vector`,
      })
      .from(textData)
      .where(sql`${textData.hash} != ${data.hash}`)
      .orderBy(
        sql`${textData.embedding} <=> '${sql.raw(embeddingVector)}'::vector`,
      )
      .limit(limit)
      .offset(offset);

    // Get all metadata for the nearest neighbor texts
    const neighborHashes = nearestTexts.map((n) => n.hash);
    const { user } = await import("../db/schema");

    let allMetadata: any[] = [];
    if (neighborHashes.length > 0) {
      allMetadata = await db
        .select({
          metadataId: metadata.id,
          textHash: metadata.textHash,
          notes: metadata.notes,
          createdBy: metadata.createdBy,
          createdAt: metadata.createdAt,
          username: user.username,
        })
        .from(metadata)
        .leftJoin(user, eq(metadata.createdBy, user.id))
        .where(
          sql`${metadata.textHash} IN (${sql.join(
            neighborHashes.map((h) => sql`${h}`),
            sql`, `,
          )}) AND ${metadata.deletedAt} IS NULL`,
        );
    }

    // Group metadata by text hash
    const metadataByHash: Record<string, Array<any>> = {};

    allMetadata.forEach((meta) => {
      if (!metadataByHash[meta.textHash]) {
        metadataByHash[meta.textHash] = [];
      }
      metadataByHash[meta.textHash].push({
        id: meta.metadataId,
        notes: meta.notes,
        textHash: meta.textHash,
        createdBy: meta.createdBy,
        createdAt: meta.createdAt,
        username: meta.username,
      });
    });

    // Combine texts with their metadata, filtering out texts with no non-deleted metadata
    const neighbors = nearestTexts
      .map((text) => ({
        text: text.text,
        hash: text.hash,
        distance: text.distance,
        metadata: metadataByHash[text.hash] || [],
      }))
      .filter((neighbor) => neighbor.metadata.length > 0);

    // Determine next offset
    const nextOffset = nearestTexts.length === limit ? offset + limit : null;

    return {
      items: neighbors,
      nextOffset,
    };
  });

export const getRandomHash = createServerFn({
  method: "GET",
}).handler(async () => {
  // Get a random text hash - make sure it has one non-deleted metadata entry
  const allTexts = await db
    .select({
      hash: textData.hash,
    })
    .from(textData)
    .innerJoin(
      metadata,
      sql`${textData.hash} = ${metadata.textHash} AND ${metadata.deletedAt} IS NULL`,
    )
    .groupBy(textData.hash);

  if (allTexts.length === 0) {
    throw new Error("No texts found in database");
  }

  return allTexts[Math.floor(Math.random() * allTexts.length)].hash;
});

// Helper function to generate content hash
// Normalizes text (trim + lowercase) for consistent hashing and deduplication
function generateContentHash(text: string): string {
  const normalized = text.trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

export const addText = createServerFn({
  method: "GET",
})
  .inputValidator(
    (data: {
      text: string;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      // Get the current user from session
      const request = getRequest();
      const session = await auth.api.getSession({ headers: request.headers });
      const userId = session?.user?.id || "anon";

      // Trim the input text
      const trimmedText = data.text.trim();

      // Generate content hash from normalized text (trimmed + lowercase)
      const hash = generateContentHash(trimmedText);
      console.log("Generated hash:", hash);

      // Generate embedding using Gemini with the trimmed text
      console.log("Generating embedding...");
      const embedding = await generateEmbedding(trimmedText);
      console.log("Embedding generated, length:", embedding.length);
      console.log("First 5 values:", embedding.slice(0, 5));

      // Insert or get existing text data
      console.log("Inserting text data...");
      const vectorString = pgvector.toSql(embedding);
      console.log(
        "Vector string format:",
        vectorString.substring(0, 100) + "...",
      );

      await db
        .insert(textData)
        .values({
          hash,
          text: trimmedText,
          embedding: sql`${vectorString}::vector`,
        })
        .onConflictDoNothing();

      console.log("Text data inserted successfully");

      // Insert metadata
      console.log("Inserting metadata...");
      const [newMetadata] = await db
        .insert(metadata)
        .values({
          textHash: hash,
          createdBy: userId,
          notes: data.notes,
        })
        .returning();

      console.log("Metadata inserted successfully");

      return {
        id: newMetadata.id,
        text: trimmedText,
        hash,
        notes: newMetadata.notes,
        createdBy: newMetadata.createdBy,
        createdAt: newMetadata.createdAt,
      };
    } catch (error) {
      console.error("Error in addText mutation:");
      throw error;
    }
  });

export const togglePinText = createServerFn({
  method: "POST",
})
  .inputValidator((data: { textHash: string }) => data)
  .handler(async ({ data }) => {
    // Get the current user from session
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    // Find the metadata entry for this user and text
    const [userMetadata] = await db
      .select()
      .from(metadata)
      .where(
        sql`${metadata.textHash} = ${data.textHash} AND ${metadata.createdBy} = ${userId}`
      )
      .limit(1);

    if (!userMetadata) {
      throw new Error("You must add this text before pinning it");
    }

    // Toggle the pin: if pinnedAt is null, set it to now; otherwise set to null
    const newPinnedAt = userMetadata.pinnedAt ? null : new Date();

    await db
      .update(metadata)
      .set({ pinnedAt: newPinnedAt })
      .where(eq(metadata.id, userMetadata.id));

    return {
      success: true,
      isPinned: newPinnedAt !== null,
      pinnedAt: newPinnedAt
    };
  });

export const deleteText = createServerFn({
  method: "POST",
})
  .inputValidator((data: { textHash: string }) => data)
  .handler(async ({ data }) => {
    // Get the current user from session
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    // Find the metadata entry for this user and text
    const [userMetadata] = await db
      .select()
      .from(metadata)
      .where(
        sql`${metadata.textHash} = ${data.textHash} AND ${metadata.createdBy} = ${userId}`
      )
      .limit(1);

    if (!userMetadata) {
      throw new Error("Text not found");
    }

    // Soft delete by setting deletedAt timestamp
    await db
      .update(metadata)
      .set({ deletedAt: new Date() })
      .where(eq(metadata.id, userMetadata.id));

    return {
      success: true,
      deletedAt: new Date()
    };
  });
