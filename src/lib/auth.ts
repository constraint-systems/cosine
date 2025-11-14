import { config } from "dotenv";

// Load environment variables
config({ path: ".env" });

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { reactStartCookies } from "better-auth/react-start";
import { db } from "../db";
import * as schema from "../db/schema";

export const auth = betterAuth({
  baseURL: process.env.APP_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
        unique: true,
      },
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  trustedOrigins: [
    process.env.APP_URL || "http://localhost:3000",
  ],
  plugins: [reactStartCookies()],
});
