import { pgTable, text, timestamp, uuid, vector, boolean } from "drizzle-orm/pg-core";

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  username: text("username").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// App tables
export const textData = pgTable("text_data", {
  hash: text("hash").primaryKey(),
  text: text("text").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const metadata = pgTable("metadata", {
  id: uuid("id").defaultRandom().primaryKey(),
  textHash: text("text_hash")
    .notNull()
    .references(() => textData.hash, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().default("anon"),
  createdAt: timestamp("created_at").defaultNow(),
  notes: text("notes"),
  pinnedAt: timestamp("pinned_at"),
  deletedAt: timestamp("deleted_at"),
});

// Types
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type TextData = typeof textData.$inferSelect;
export type NewTextData = typeof textData.$inferInsert;
export type Metadata = typeof metadata.$inferSelect;
export type NewMetadata = typeof metadata.$inferInsert;
