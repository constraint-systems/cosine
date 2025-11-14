import { GoogleGenAI } from "@google/genai";

function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

/**
 * Generate an embedding for the given text using Gemini's text-embedding model
 * @param text - The text to embed
 * @param dimensions - Output dimensionality (128-3072, recommended: 768, 1536, 3072)
 * @returns The embedding as an array of numbers
 */
export async function generateEmbedding(
  text: string,
  dimensions: number = 768,
): Promise<number[]> {
  try {
    const genAI = getGenAI();
    const result = await genAI.models.embedContent({
      model: "text-embedding-004",
      contents: text,
      config: {
        outputDimensionality: dimensions,
      },
    });

    console.log(
      `Generated embedding with ${result.embeddings[0].values.length} dimensions`,
    );
    return result.embeddings[0].values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(`Failed to generate embedding: ${error}`);
  }
}

/**
 * Generate embeddings for multiple texts in a batch
 * @param texts - Array of texts to embed
 * @param dimensions - Output dimensionality
 * @returns Array of embeddings
 */
export async function generateBatchEmbeddings(
  texts: string[],
  dimensions: number = 768,
): Promise<number[][]> {
  const genAI = getGenAI();
  const result = await genAI.models.embedContent({
    model: "text-embedding-004",
    contents: texts,
    config: {
      outputDimensionality: dimensions,
    },
  });

  return result.embeddings.map((embedding) => embedding.values);
}
