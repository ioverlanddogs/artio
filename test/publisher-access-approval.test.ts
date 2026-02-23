import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleAdminPatchRequestStatus } from "../lib/beta/routes.ts";
import { PATCH } from "../app/api/admin/beta/requests/[id]/route";
import { db } from "../lib/db.ts";

type RequestRow = { id: string; email: string; userId: string | null; status: "PENDING" | "APPROVED" | "DENIED" };
type UserRow = { id: string; email: string; role: "USER" | "EDITOR" | "ADMIN" };

const originalTransaction = db.$transaction;

function installHarness({ request, users }: { request: RequestRow; users: UserRow[] }) {
  const state = {
    request: { ...request },
    users: users.map((user) => ({ ...user })),
    auditEntries: [] as Array<{ action: string; targetId: string | null; metadata: Record<string, unknown> }>,
    notifications: [] as Array<{ userId: string; title: string; body: string }>,
  };

  db.$transaction = (async (callback: (tx: typeof db) => Promise<unknown>) => {
    const tx = {
      betaAccessRequest: {
        update: async ({ data }: { data: { status: RequestRow["status"] } }) => {
          state.request.status = data.status;
          return { id: state.request.id, email: state.request.email, userId: state.request.userId };
        },
      },
      user: {
        findUnique: async ({ where }: { where: { id: string } }) => state.users.find((user) => user.id === where.id) ?? null,
        findFirst: async ({ where }: { where: { email: { equals: string } } }) => state.users.find((user) => user.email.toLowerCase() === where.email.equals.toLowerCase()) ?? null,
        update: async ({ where, data }: { where: { id: string }; data: { role: UserRow["role"] } }) => {
          const target = state.users.find((user) => user.id === where.id);
          if (!target) throw new Error("missing_user");
          target.role = data.role;
          return { id: target.id, role: target.role };
        },
      },
      adminAuditLog: {
        create: async ({ data }: { data: { action: string; targetId: string | null; metadata: Record<string, unknown> } }) => {
          state.auditEntries.push({ action: data.action, targetId: data.targetId, metadata: data.metadata });
          return { id: "audit-1" };
        },
      },
      notification: {
        create: async ({ data }: { data: { userId: string; title: string; body: string } }) => {
          state.notifications.push({ userId: data.userId, title: data.title, body: data.body });
          return { id: "notification-1" };
        },
      },
    } as unknown as typeof db;

    return callback(tx);
  }) as typeof db.$transaction;

  return state;
}

test("approving with userId elevates USER to EDITOR and records audit + notification", async () => {
  const state = installHarness({
    request: { id: "req-1", email: "person@example.com", userId: "u1", status: "PENDING" },
    users: [{ id: "u1", email: "person@example.com", role: "USER" }],
  });

  const req = new NextRequest("http://localhost/api/admin/beta/requests/req-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "APPROVED" }),
  });

  const res = await handleAdminPatchRequestStatus(req, Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }), { id: "editor-1", email: "editor@example.com" });
  assert.equal(res.status, 200);
  assert.equal(state.users[0]?.role, "EDITOR");
  assert.equal(state.auditEntries.length, 1);
  assert.equal(state.auditEntries[0]?.action, "ROLE_GRANT_PUBLISHER");
  assert.equal(state.notifications.length, 1);
});

test("approving for ADMIN user does not change role", async () => {
  const state = installHarness({
    request: { id: "req-2", email: "admin@example.com", userId: "u2", status: "PENDING" },
    users: [{ id: "u2", email: "admin@example.com", role: "ADMIN" }],
  });

  const req = new NextRequest("http://localhost/api/admin/beta/requests/req-2", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "APPROVED" }),
  });

  const res = await handleAdminPatchRequestStatus(req, Promise.resolve({ id: "11111111-1111-4111-8111-111111111112" }), { id: "editor-1", email: "editor@example.com" });
  assert.equal(res.status, 200);
  assert.equal(state.users[0]?.role, "ADMIN");
  assert.equal(state.auditEntries.length, 0);
  assert.equal(state.notifications.length, 0);
});

test("approving with email-only request matches user by email and elevates", async () => {
  const state = installHarness({
    request: { id: "req-3", email: "Creator@Example.com", userId: null, status: "PENDING" },
    users: [{ id: "u3", email: "creator@example.com", role: "USER" }],
  });

  const req = new NextRequest("http://localhost/api/admin/beta/requests/req-3", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "APPROVED" }),
  });

  const res = await handleAdminPatchRequestStatus(req, Promise.resolve({ id: "11111111-1111-4111-8111-111111111113" }), { id: "editor-1", email: "editor@example.com" });
  assert.equal(res.status, 200);
  assert.equal(state.users[0]?.role, "EDITOR");
});

test("denying request does not change role", async () => {
  const state = installHarness({
    request: { id: "req-4", email: "user@example.com", userId: "u4", status: "PENDING" },
    users: [{ id: "u4", email: "user@example.com", role: "USER" }],
  });

  const req = new NextRequest("http://localhost/api/admin/beta/requests/req-4", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "DENIED" }),
  });

  const res = await handleAdminPatchRequestStatus(req, Promise.resolve({ id: "11111111-1111-4111-8111-111111111114" }), { id: "editor-1", email: "editor@example.com" });
  assert.equal(res.status, 200);
  assert.equal(state.users[0]?.role, "USER");
  assert.equal(state.auditEntries.length, 0);
  assert.equal(state.notifications.length, 0);
});

test("admin beta request PATCH route is protected", async () => {
  const req = new NextRequest("http://localhost/api/admin/beta/requests/11111111-1111-4111-8111-111111111111", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "APPROVED" }),
  });

  const res = await PATCH(req, { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) });
  assert.notEqual(res.status, 200);
});

test.after(() => {
  db.$transaction = originalTransaction;
});
