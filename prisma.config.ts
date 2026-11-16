import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection. Neon on Vercel provides it under one of these names.
    url:
      process.env["DATABASE_URL_UNPOOLED"] ??
      process.env["DATABASE_POSTGRES_URL_NON_POOLING"] ??
      process.env["DATABASE_URL"],
  },
});
