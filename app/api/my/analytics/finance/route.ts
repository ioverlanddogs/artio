import { NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleGetMyAnalyticsFinance } from "@/lib/my-analytics-finance-route";
import { RATE_LIMITS, enforceRateLimit, isRateLimitError, principalRateLimitKey, rateLimitErrorResponse } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/site-settings/get-site-settings";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await enforceRateLimit({
      key: principalRateLimitKey(req, "my-analytics-finance", user.id),
      limit: RATE_LIMITS.expensiveReads.limit,
      windowMs: RATE_LIMITS.expensiveReads.windowMs,
    });

    return handleGetMyAnalyticsFinance({
      requireAuth: async () => user,
      hasVenueMembership: async (userId) => Boolean(await db.venueMembership.findFirst({ where: { userId }, select: { id: true } })),
      listFinanceRows: async (userId) => {
        const settings = await getSiteSettings();
        const platformFeePercent = settings.platformFeePercent;

        const events = await db.event.findMany({
          where: { venue: { memberships: { some: { userId } } } },
          select: {
            title: true,
            registrations: {
              select: {
                status: true,
                amountPaidGbp: true,
                refundedAmountGbp: true,
              },
            },
          },
        });

        return events.map((event) => {
          const confirmed = event.registrations.filter((registration) => registration.status === "CONFIRMED");
          const confirmedCount = confirmed.length;
          const grossRevenue = confirmed.reduce((sum, registration) => sum + (registration.amountPaidGbp ?? 0), 0);
          const platformFees = confirmed.reduce((sum, registration) => sum + Math.round((registration.amountPaidGbp ?? 0) * (platformFeePercent / 100)), 0);
          const netRevenue = grossRevenue - platformFees;
          const refundedAmount = event.registrations.reduce((sum, registration) => sum + (registration.refundedAmountGbp ?? 0), 0);

          return {
            eventTitle: event.title,
            confirmedCount,
            grossRevenue,
            platformFees,
            netRevenue,
            refundedAmount,
          };
        });
      },
    });
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    throw error;
  }
}
