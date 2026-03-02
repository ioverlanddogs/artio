import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { db } from "../lib/db.ts";
import { logAdminAction } from "../lib/admin-audit.ts";

test("logAdminAction writes an AdminAuditLog entry via Prisma client", async () => {
  const originalCreate = db.adminAuditLog.create;
  let capturedData: Record<string, unknown> | null = null;

  db.adminAuditLog.create = (async (input: { data: Record<string, unknown> }) => {
    capturedData = input.data;
    return { id: "audit-1" } as never;
  }) as typeof db.adminAuditLog.create;

  try {
    await logAdminAction({
      actorEmail: "admin@example.com",
      action: "admin.audit.test",
      targetType: "test",
      targetId: "target-1",
      metadata: { sample: true },
      req: new NextRequest("http://localhost:3000/api/admin/audit/selftest", {
        headers: {
          "x-forwarded-for": "203.0.113.9, 10.0.0.1",
          "user-agent": "test-agent",
        },
      }),
    });

    assert.equal(capturedData?.actorEmail, "admin@example.com");
    assert.equal(capturedData?.action, "admin.audit.test");
    assert.equal(capturedData?.targetType, "test");
    assert.equal(capturedData?.targetId, "target-1");
    assert.deepEqual(capturedData?.metadata, { sample: true });
    assert.equal(capturedData?.ip, "203.0.113.9");
    assert.equal(capturedData?.userAgent, "test-agent");
  } finally {
    db.adminAuditLog.create = originalCreate;
  }
});
