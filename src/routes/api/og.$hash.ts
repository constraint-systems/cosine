import { createFileRoute } from "@tanstack/react-router";
import { getTextByHash } from "@/data/db-actions";
import { generateOGImage } from "@/utils/generate-og-image";
import fs from "fs/promises";
import path from "path";

export const Route = createFileRoute("/api/og/$hash")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { hash } = params;

        try {
          // Check if we have a cached version locally
          const cacheDir = path.join(process.cwd(), "public", "og-cache");
          const cacheFilePath = path.join(cacheDir, `${hash}.png`);

          try {
            // Try to read from cache
            const cachedImage = await fs.readFile(cacheFilePath);
            return new Response(cachedImage, {
              headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          } catch {
            // Cache miss, continue to generate
          }

          // Fetch the text from database
          const result = await getTextByHash({ data: { hash } });

          if (!result || !result.text) {
            return new Response("Text not found", { status: 404 });
          }

          // Generate the OG image
          const imageBuffer = await generateOGImage({
            text: result.text,
            hash,
          });

          // Save to cache
          try {
            await fs.mkdir(cacheDir, { recursive: true });
            await fs.writeFile(cacheFilePath, imageBuffer);
          } catch (error) {
            console.error("Failed to cache OG image:", error);
            // Continue even if caching fails
          }

          // Return the image
          return new Response(imageBuffer, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch (error) {
          console.error("Error generating OG image:", error);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
