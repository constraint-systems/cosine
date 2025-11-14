import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { db } from "../db/index";
import { user } from "../db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";

export const checkUsernameAvailability = createServerFn({
  method: "GET",
})
  .inputValidator((data: { username: string }) => data)
  .handler(async ({ data }) => {
    const { username } = data;

    if (!username) {
      throw new Error('Username is required');
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return {
        available: false,
        error: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens'
      };
    }

    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    return { available: existingUser.length === 0 };
  });

export const setUsername = createServerFn({
  method: "POST",
})
  .inputValidator((data: { username: string }) => data)
  .handler(async ({ data }) => {
    const { username } = data;

    // Get the request to access headers
    const request = getRequest();

    // Get the current session from the request headers
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    if (!username) {
      throw new Error('Username is required');
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      throw new Error('Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens');
    }

    // Check if username is already taken
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    if (existingUser.length > 0 && existingUser[0].id !== session.user.id) {
      throw new Error('Username is already taken');
    }

    // Update the user's username
    await db
      .update(user)
      .set({ username })
      .where(eq(user.id, session.user.id));

    return { success: true, username };
  });

export const getUserByUsername = createServerFn({
  method: "GET",
})
  .inputValidator((data: { username: string }) => data)
  .handler(async ({ data }) => {
    const userData = await db
      .select()
      .from(user)
      .where(eq(user.username, data.username))
      .limit(1);

    if (!userData || userData.length === 0) {
      throw new Error('User not found');
    }

    return userData[0];
  });

export const getUserTexts = createServerFn({
  method: "GET",
})
  .inputValidator((data: { userId: string; cursor?: string; limit?: number }) => data)
  .handler(async ({ data }) => {
    const limit = data.limit || 20;
    const cursor = data.cursor;

    const { textData, metadata } = await import("../db/schema");
    const { sql } = await import("drizzle-orm");

    // Build query for texts this user has added
    let query = db
      .select({
        id: metadata.id,
        text: textData.text,
        hash: textData.hash,
        notes: metadata.notes,
        createdBy: metadata.createdBy,
        createdAt: metadata.createdAt,
        username: user.username,
        userAddedAt: metadata.createdAt,
      })
      .from(metadata)
      .innerJoin(textData, eq(metadata.textHash, textData.hash))
      .leftJoin(user, eq(metadata.createdBy, user.id))
      .where(sql`${metadata.createdBy} = ${data.userId} AND ${metadata.deletedAt} IS NULL`)
      .orderBy(sql`${metadata.createdAt} DESC`);

    // Apply cursor filter if provided
    if (cursor) {
      query = query.where(
        sql`${metadata.createdBy} = ${data.userId} AND ${metadata.deletedAt} IS NULL AND ${metadata.createdAt} < ${cursor}`
      );
    }

    const allTexts = await query;

    // For each text this user added, get ALL metadata entries (not just theirs)
    const textHashes = [...new Set(allTexts.map(t => t.hash))];

    if (textHashes.length === 0) {
      return { items: [], nextCursor: null };
    }

    const allMetadataForTexts = await db
      .select({
        id: metadata.id,
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
          textHashes.map((h) => sql`${h}`),
          sql`, `,
        )}) AND ${metadata.deletedAt} IS NULL`,
      );

    // Group metadata by text hash
    const metadataByHash: Record<string, Array<any>> = {};
    allMetadataForTexts.forEach((meta) => {
      if (!metadataByHash[meta.textHash]) {
        metadataByHash[meta.textHash] = [];
      }
      metadataByHash[meta.textHash].push({
        id: meta.id,
        notes: meta.notes,
        textHash: meta.textHash,
        createdBy: meta.createdBy,
        createdAt: meta.createdAt,
        username: meta.username,
      });
    });

    // Group by text hash, keeping track of when this user added it
    const groupedTexts = allTexts.reduce(
      (acc, entry) => {
        if (!acc[entry.hash]) {
          acc[entry.hash] = {
            text: entry.text,
            hash: entry.hash,
            metadata: metadataByHash[entry.hash] || [],
            userAddedAt: entry.userAddedAt,
          };
        }
        return acc;
      },
      {} as Record<
        string,
        {
          text: string;
          hash: string;
          metadata: any[];
          userAddedAt: Date | null;
        }
      >,
    );

    // Sort by when the user added them
    const sortedTexts = Object.values(groupedTexts).sort((a, b) => {
      if (!a.userAddedAt || !b.userAddedAt) return 0;
      return new Date(b.userAddedAt).getTime() - new Date(a.userAddedAt).getTime();
    });

    // Apply limit
    const paginatedTexts = sortedTexts.slice(0, limit);

    // Determine next cursor
    let nextCursor: string | null = null;
    if (paginatedTexts.length === limit) {
      const oldestText = paginatedTexts[paginatedTexts.length - 1];
      if (oldestText.userAddedAt) {
        nextCursor = oldestText.userAddedAt.toISOString();
      }
    }

    return { items: paginatedTexts, nextCursor };
  });

export const getPinnedTexts = createServerFn({
  method: "GET",
})
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const { textData, metadata } = await import("../db/schema");
    const { sql } = await import("drizzle-orm");

    // Get pinned texts for this user, showing only their own metadata
    const pinnedTexts = await db
      .select({
        text: textData.text,
        hash: textData.hash,
        notes: metadata.notes,
        createdBy: metadata.createdBy,
        createdAt: metadata.createdAt,
        pinnedAt: metadata.pinnedAt,
        username: user.username,
        metadataId: metadata.id,
      })
      .from(metadata)
      .innerJoin(textData, eq(metadata.textHash, textData.hash))
      .leftJoin(user, eq(metadata.createdBy, user.id))
      .where(
        sql`${metadata.createdBy} = ${data.userId} AND ${metadata.pinnedAt} IS NOT NULL AND ${metadata.deletedAt} IS NULL`
      )
      .orderBy(sql`${metadata.pinnedAt} DESC`);

    // Format the results to match the expected structure
    const formattedTexts = pinnedTexts.map((item) => ({
      text: item.text,
      hash: item.hash,
      metadata: [
        {
          id: item.metadataId,
          notes: item.notes,
          textHash: item.hash,
          createdBy: item.createdBy,
          createdAt: item.createdAt,
          pinnedAt: item.pinnedAt,
          username: item.username,
        },
      ],
    }));

    return formattedTexts;
  });
