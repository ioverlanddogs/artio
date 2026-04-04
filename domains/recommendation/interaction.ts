import type { PrismaClient, UserInteractionEntityType, UserInteractionType } from "@prisma/client";

type DbLike = Pick<PrismaClient, "userInteraction">;

export async function trackUserInteraction(db: DbLike, input: {
  userId: string;
  type: UserInteractionType;
  entityType: UserInteractionEntityType;
  entityId: string;
}) {
  await db.userInteraction.create({ data: input });
}
