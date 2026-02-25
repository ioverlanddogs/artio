import test from "node:test";
import assert from "node:assert/strict";
import { computeChecklist, maybeCompleteOnboarding, setOnboardingFlagForSession, type OnboardingStateRecord } from "../lib/onboarding.ts";
import { db } from "../lib/db.ts";
import { isOnboardingPanelDismissed, setOnboardingPanelDismissed } from "../lib/onboarding-panel-storage.ts";
import { GET as getOnboarding } from "../app/api/onboarding/route.ts";

const baseState: OnboardingStateRecord = {
  id: "state-1",
  userId: "user-1",
  completedAt: null,
  hasFollowedSomething: false,
  hasVisitedFollowing: false,
  hasAcceptedInvite: false,
  hasCreatedVenue: false,
  hasSubmittedEvent: false,
  hasViewedNotifications: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

test("onboarding checklist marks incomplete flags as not done", () => {
  const checklist = computeChecklist(baseState);

  assert.equal(checklist.length, 5);
  assert.equal(checklist.filter((item) => item.done).length, 0);
  assert.deepEqual(checklist.map((item) => item.href), ["/following", "/my/venues", "/my/venues", "/my/venues", "/notifications"]);
});

test("onboarding checklist marks completed flags", () => {
  const checklist = computeChecklist({
    ...baseState,
    hasFollowedSomething: true,
    hasAcceptedInvite: true,
    hasSubmittedEvent: true,
  });

  const doneFlags = checklist.filter((item) => item.done).map((item) => item.flag);
  assert.deepEqual(doneFlags, ["hasFollowedSomething", "hasAcceptedInvite", "hasSubmittedEvent"]);
});

test("dismissed onboarding panel state is client-only", () => {
  const originalWindow = globalThis.window;
  // @ts-expect-error test override
  delete globalThis.window;

  assert.equal(isOnboardingPanelDismissed(), false);
  assert.doesNotThrow(() => setOnboardingPanelDismissed(true));

  const storage = new Map<string, string>();
  // @ts-expect-error test override
  globalThis.window = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    },
  };

  setOnboardingPanelDismissed(true);
  assert.equal(isOnboardingPanelDismissed(), true);
  setOnboardingPanelDismissed(false);
  assert.equal(isOnboardingPanelDismissed(), false);

  if (originalWindow) {
    // @ts-expect-error test restore
    globalThis.window = originalWindow;
  } else {
    // @ts-expect-error test restore
    delete globalThis.window;
  }
});

test("/api/onboarding returns 500 when auth session lookup fails unexpectedly", async () => {
  const response = await getOnboarding();
  assert.equal(response.status, 500);
});


test("onboarding auto-complete sets completedAt when core flags are done", async () => {
  const originalUpdate = db.onboardingState.update;
  let updated = false;

  db.onboardingState.update = (async () => {
    updated = true;
    return { ...baseState, completedAt: new Date("2026-01-02T00:00:00.000Z"), hasFollowedSomething: true, hasCreatedVenue: true, hasViewedNotifications: true };
  }) as typeof db.onboardingState.update;

  try {
    await maybeCompleteOnboarding({
      ...baseState,
      hasFollowedSomething: true,
      hasCreatedVenue: true,
      hasViewedNotifications: true,
    });

    assert.equal(updated, true);
  } finally {
    db.onboardingState.update = originalUpdate;
  }
});

test("setOnboardingFlagForSession creates/uses persisted db user before onboarding upsert", async () => {
  const originalFindUnique = db.user.findUnique;
  const originalUpsertUser = db.user.upsert;
  const originalUpsertOnboarding = db.onboardingState.upsert;

  const calls: { findUnique: number; upsertUser: number; onboardingUserId: string | null } = {
    findUnique: 0,
    upsertUser: 0,
    onboardingUserId: null,
  };

  db.user.findUnique = (async ({ where }) => {
    calls.findUnique += 1;
    if ("id" in where) return null;
    if ("email" in where) return null;
    return null;
  }) as typeof db.user.findUnique;

  db.user.upsert = (async () => {
    calls.upsertUser += 1;
    return {
      id: "db-user-1",
      email: "user@example.com",
      name: "Recovered User",
      imageUrl: null,
      role: "USER",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      locationLabel: null,
      locationLat: null,
      locationLng: null,
      locationRadiusKm: 25,
    };
  }) as typeof db.user.upsert;

  db.onboardingState.upsert = (async ({ where }) => {
    calls.onboardingUserId = where.userId;
    return { ...baseState, userId: where.userId, hasVisitedFollowing: true };
  }) as typeof db.onboardingState.upsert;

  try {
    await setOnboardingFlagForSession({ id: "missing-session-id", email: "User@Example.com", name: "Recovered User" }, "hasVisitedFollowing");
    assert.equal(calls.findUnique >= 2, true);
    assert.equal(calls.upsertUser, 1);
    assert.equal(calls.onboardingUserId, "db-user-1");
  } finally {
    db.user.findUnique = originalFindUnique;
    db.user.upsert = originalUpsertUser;
    db.onboardingState.upsert = originalUpsertOnboarding;
  }
});

test("setOnboardingFlagForSession skips writes when no session identity exists", async () => {
  const originalUpsertOnboarding = db.onboardingState.upsert;
  let wrote = false;

  db.onboardingState.upsert = (async () => {
    wrote = true;
    return baseState;
  }) as typeof db.onboardingState.upsert;

  try {
    await setOnboardingFlagForSession(null, "hasVisitedFollowing");
    assert.equal(wrote, false);
  } finally {
    db.onboardingState.upsert = originalUpsertOnboarding;
  }
});

test("setOnboardingFlagForSession swallows P2003 onboarding upsert errors", async () => {
  const originalFindUnique = db.user.findUnique;
  const originalUpsertOnboarding = db.onboardingState.upsert;
  const originalConsoleWarn = console.warn;

  let warned = false;

  db.user.findUnique = (async () => ({
    id: "db-user-2",
    email: "user2@example.com",
    name: "User Two",
    imageUrl: null,
    role: "USER",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    locationLabel: null,
    locationLat: null,
    locationLng: null,
    locationRadiusKm: 25,
  })) as typeof db.user.findUnique;

  db.onboardingState.upsert = (async () => {
    const err = new Error("fk") as Error & { code: string };
    err.code = "P2003";
    throw err;
  }) as typeof db.onboardingState.upsert;

  console.warn = () => {
    warned = true;
  };

  try {
    await assert.doesNotReject(async () => setOnboardingFlagForSession({ id: "db-user-2", email: "user2@example.com" }, "hasVisitedFollowing", true, { path: "/following" }));
    assert.equal(warned, true);
  } finally {
    db.user.findUnique = originalFindUnique;
    db.onboardingState.upsert = originalUpsertOnboarding;
    console.warn = originalConsoleWarn;
  }
});


test("/api/onboarding returns 500 for non-auth internal errors", async () => {
  const originalFindFirst = db.venueMembership.findFirst;

  db.venueMembership.findFirst = (async () => {
    throw new Error("db exploded");
  }) as typeof db.venueMembership.findFirst;

  try {
    const response = await getOnboarding();
    assert.equal(response.status, 500);
  } finally {
    db.venueMembership.findFirst = originalFindFirst;
  }
});
