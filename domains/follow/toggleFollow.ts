import type { FollowTargetType, PrismaClient } from "@prisma/client";
import { trackUserInteraction } from "@/domains/recommendation/interaction";

export async function trackFollowInteraction(db: PrismaClient, params: { userId: string; targetType: FollowTargetType; targetId: string }) {
  await trackUserInteraction(db, {
    userId: params.userId,
    type: "FOLLOW",
    entityType: params.targetType,
    entityId: params.targetId,
  });
}
