import test from "node:test";
import assert from "node:assert/strict";
import { handleGetRegistrationsMine } from "@/lib/registration-mine-route";

const now = new Date("2026-05-01T10:00:00.000Z");

const rows = [
  {
    id: "up-1",
    confirmationCode: "AP-UP1",
    guestEmail: "a@example.com",
    status: "CONFIRMED" as const,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    event: { title: "Future", slug: "future", startAt: new Date("2026-06-01T00:00:00.000Z"), venue: { name: "Venue A" } },
  },
  {
    id: "past-1",
    confirmationCode: "AP-PA1",
    guestEmail: "a@example.com",
    status: "CONFIRMED" as const,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    event: { title: "Past", slug: "past", startAt: new Date("2026-04-01T00:00:00.000Z"), venue: { name: "Venue B" } },
  },
  {
    id: "wait-1",
    confirmationCode: "AP-WA1",
    guestEmail: "a@example.com",
    status: "WAITLISTED" as const,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    event: { title: "Future wait", slug: "future-wait", startAt: new Date("2026-07-01T00:00:00.000Z"), venue: { name: "Venue C" } },
  },
];

test("registration mine route requires auth", async () => {
  const res = await handleGetRegistrationsMine({
    requireAuth: async () => { throw new Error("unauthorized"); },
    listRegistrationsByUserId: async () => rows,
    now: () => now,
  });
  assert.equal(res.status, 401);
});

test("registration mine route splits upcoming and past and returns shape", async () => {
  const res = await handleGetRegistrationsMine({
    requireAuth: async () => ({ id: "user-1" }),
    listRegistrationsByUserId: async () => rows,
    now: () => now,
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.upcoming.length, 1);
  assert.equal(body.upcoming[0].confirmationCode, "AP-UP1");
  assert.equal(body.past.length, 2);
  assert.equal(typeof body.past[0].event.title, "string");
});
