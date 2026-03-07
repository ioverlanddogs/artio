import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";

type SessionUser = { id: string };

type FinanceRow = {
  eventTitle: string;
  confirmedCount: number;
  grossRevenue: number;
  platformFees: number;
  netRevenue: number;
  refundedAmount: number;
};

type Deps = {
  requireAuth: () => Promise<SessionUser>;
  hasVenueMembership: (userId: string) => Promise<boolean>;
  listFinanceRows: (userId: string) => Promise<FinanceRow[]>;
};

export async function handleGetMyAnalyticsFinance(deps: Deps) {
  try {
    const user = await deps.requireAuth();
    const isPublisher = await deps.hasVenueMembership(user.id);
    if (!isPublisher) return apiError(403, "forbidden", "Venue membership required");

    const rows = await deps.listFinanceRows(user.id);
    return NextResponse.json({ rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
