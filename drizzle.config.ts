/**
 * Drizzle Kit configuration.
 *
 * Usage:
 *   bun run db:generate   → generate SQL migration files in src/server/db/migrations
 *   bun run db:migrate     → apply migrations to DATABASE_URL
 *   bun run db:studio      → open Drizzle Studio at https://local.studio.drizzle.team
 *
 * The schema is namespaced under the `iec` Postgres schema, so the same
 * DATABASE_URL can host other applications without table collisions.
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  schemaFilter: ["iec"],
  verbose: true,
  strict: true,
});
