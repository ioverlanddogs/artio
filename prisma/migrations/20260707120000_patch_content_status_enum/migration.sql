-- Idempotent patch: ensures ContentStatus enum contains all required values.
-- Handles all DB states regardless of how the preceding unified_content_status
-- migration was applied. ALTER TYPE ... ADD VALUE IF NOT EXISTS is a no-op
-- when the value already exists (PostgreSQL 9.1+, Neon uses PostgreSQL 16).
ALTER TYPE "ContentStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ContentStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "ContentStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';
