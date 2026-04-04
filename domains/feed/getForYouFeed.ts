import type { PrismaClient } from "@prisma/client";
import { getForYouRecommendations } from "@/lib/recommendations-for-you";

export async function getForYouFeed(db: PrismaClient, input: { userId: string; days: 7 | 30; limit: number }) {
  return getForYouRecommendations(db, input);
}
