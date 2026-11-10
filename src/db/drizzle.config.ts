import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.POSTGRES_URL;

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: connectionString
    ? {
        url: connectionString,
        ssl: connectionString.includes("neon.tech") || connectionString.includes("sslmode=require") ? true : false,
      }
    : {
        host: sqlHost || "localhost",
        user: user || "postgres",
        password: password || "",
        database: sqlDbName || "postgres",
        ssl: process.env.SQL_SSL === "true",
      },
  verbose: true,
});

