import test from "node:test";
import assert from "node:assert/strict";
import { handleGetMyAnalyticsFinance } from "@/lib/my-analytics-finance-route";

test("auth required", async () => {
  const res = await handleGetMyAnalyticsFinance({
    requireAuth: async () => {
      throw new Error("unauthorized");
    },
    hasVenueMembership: async () => true,
    listFinanceRows: async () => [],
  });

  assert.equal(res.status, 401);
});

test("only includes user's venues and correct revenue calculations", async () => {
  const res = await handleGetMyAnalyticsFinance({
    requireAuth: async () => ({ id: "user-1" }),
    hasVenueMembership: async () => true,
    listFinanceRows: async () => [
      {
        eventTitle: "Owned Event",
        confirmedCount: 3,
        grossRevenue: 4500,
        platformFees: 450,
        netRevenue: 4050,
        refundedAmount: 1200,
      },
    ],
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.rows.length, 1);
  assert.deepEqual(body.rows[0], {
    eventTitle: "Owned Event",
    confirmedCount: 3,
    grossRevenue: 4500,
    platformFees: 450,
    netRevenue: 4050,
    refundedAmount: 1200,
  });
});
