import satori from "satori";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

interface GenerateOGImageOptions {
  text: string;
  hash: string;
}

// Cache for font data
let interFontCache: ArrayBuffer | null = null;
let baskervilleFontCache: ArrayBuffer | null = null;

export async function generateOGImage({
  text,
}: GenerateOGImageOptions): Promise<Buffer> {
  // Truncate text to ~250 characters for display
  const displayText = text.length > 300 ? text.slice(0, 300) + "..." : text;
  const fontSize = text.length > 300 ? 42 : 52;

  // Get font data
  const [interFont, baskervilleFont] = await Promise.all([
    getInterFont(),
    getBaskervilleFont(),
  ]);

  // Create SVG using Satori
  const svg = await satori(
    // @ts-expect-error
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          padding: "0",
          flexDirection: "column",
          background: "#efefef",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                fontSize: 28,
                padding: "60px 80px 18px",
                borderBottom: "2px solid #ddd",
                display: "flex",
                fontFamily: "Inter",
              },
              children: [
                "Cosine",
                {
                  type: "span",
                  props: {
                    style: {
                      marginLeft: 10,
                      color: "#737373",
                    },
                    children: "Text",
                  },
                },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontSize: fontSize,
                lineHeight: 1.4,
                padding: "18px 80px",
                color: "#000",
                textAlign: "left",
                fontFamily: "Libre Baskerville",
              },
              children: displayText,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: interFont,
          weight: 400,
          style: "normal",
        },
        {
          name: "Libre Baskerville",
          data: baskervilleFont,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );

  // Convert SVG to PNG using Sharp
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return png;
}

// Helper to load Inter font
async function getInterFont(): Promise<ArrayBuffer> {
  // Return cached font if available
  if (interFontCache) {
    return interFontCache;
  }

  // Load local font file
  // In production, fonts are in .output/public/fonts
  // In development, fonts are in public/fonts
  const possiblePaths = [
    path.join(process.cwd(), ".output", "public", "fonts", "inter-regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "inter-regular.ttf"),
  ];

  let fontBuffer: Buffer | null = null;
  for (const fontPath of possiblePaths) {
    try {
      fontBuffer = await fs.readFile(fontPath);
      break;
    } catch (error) {
      // Try next path
      continue;
    }
  }

  if (!fontBuffer) {
    throw new Error(
      `Could not find inter-regular.ttf in any of: ${possiblePaths.join(", ")}`,
    );
  }

  interFontCache = fontBuffer.buffer.slice(
    fontBuffer.byteOffset,
    fontBuffer.byteOffset + fontBuffer.byteLength,
  );
  return interFontCache;
}

// Helper to load Libre Baskerville font
async function getBaskervilleFont(): Promise<ArrayBuffer> {
  // Return cached font if available
  if (baskervilleFontCache) {
    return baskervilleFontCache;
  }

  // Load local font file
  // In production, fonts are in .output/public/fonts
  // In development, fonts are in public/fonts
  const possiblePaths = [
    path.join(
      process.cwd(),
      ".output",
      "public",
      "fonts",
      "libre-baskerville-regular.ttf",
    ),
    path.join(process.cwd(), "public", "fonts", "libre-baskerville-regular.ttf"),
  ];

  let fontBuffer: Buffer | null = null;
  for (const fontPath of possiblePaths) {
    try {
      fontBuffer = await fs.readFile(fontPath);
      break;
    } catch (error) {
      // Try next path
      continue;
    }
  }

  if (!fontBuffer) {
    throw new Error(
      `Could not find libre-baskerville-regular.ttf in any of: ${possiblePaths.join(", ")}`,
    );
  }

  baskervilleFontCache = fontBuffer.buffer.slice(
    fontBuffer.byteOffset,
    fontBuffer.byteOffset + fontBuffer.byteLength,
  );
  return baskervilleFontCache;
}
