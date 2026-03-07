import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleGetMyAnalyticsFinance } from "@/lib/my-analytics-finance-route";
import { getSiteSettings } from "@/lib/site-settings/get-site-settings";

export const runtime = "nodejs";

export async function GET() {
  return handleGetMyAnalyticsFinance({
    requireAuth,
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
}
