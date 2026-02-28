#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function hasColumn(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    table,
    column,
  );
  return rows.length > 0;
}

function buildCase(hasModerationStatus) {
  const moderationExpr = hasModerationStatus
    ? `
      WHEN "moderationStatus" = 'APPROVED' THEN 'APPROVED'
      WHEN "moderationStatus" = 'REJECTED' THEN 'REJECTED'
      WHEN "moderationStatus" = 'PENDING' THEN 'IN_REVIEW'
    `
    : "";

  return `
    CASE
      WHEN "isPublished" = true THEN 'PUBLISHED'
      ${moderationExpr}
      ELSE 'DRAFT'
    END
  `;
}

async function migrateTable(table) {
  const hasModerationStatus = await hasColumn(table, "moderationStatus");
  const statusExpr = buildCase(hasModerationStatus);
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "${table}"
    SET "status" = ${statusExpr}
    WHERE "status" IS NULL OR "status" = 'DRAFT'
  `);
  return { table, updated: result, usedModerationStatus: hasModerationStatus };
}

async function main() {
  const venue = await migrateTable("Venue");
  const event = await migrateTable("Event");
  console.log(JSON.stringify({ ok: true, venue, event }));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
