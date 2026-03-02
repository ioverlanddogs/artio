import { NextResponse } from "next/server";
import type { ContentStatus, PrismaClient } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api";

export type ModerationIntentAction = "approve_publish" | "request_changes" | "reject" | "unpublish" | "restore" | "archive";

export type ModerationIntentResponse = {
  ok: true;
  status: string;
  message: string;
  publicUrl?: string;
};

function hasReason(action: ModerationIntentAction) {
  return action === "request_changes" || action === "reject";
}

export async function parseModerationIntentBody(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: apiError(400, "invalid_request", "Invalid JSON body") } as const;
  }

  const action = typeof (body as { action?: unknown })?.action === "string" ? (body as { action: ModerationIntentAction }).action : null;
  if (!action || !["approve_publish", "request_changes", "reject", "unpublish", "restore", "archive"].includes(action)) {
    return { error: apiError(400, "invalid_request", "Invalid moderation action") } as const;
  }

  const reason = typeof (body as { reason?: unknown })?.reason === "string" ? (body as { reason: string }).reason.trim() : "";
  if (hasReason(action) && reason.length < 3) {
    return { error: apiError(400, "invalid_request", "Reason is required") } as const;
  }

  return { action, reason } as const;
}

export async function requireModerationAdmin() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return { error: apiError(401, "unauthorized", "Authentication required") } as const;
    return { error: apiError(403, "forbidden", "Admin role required") } as const;
  }
  return {} as const;
}

export function toPublisherLabel(status: ContentStatus | "LIVE" | "ARCHIVED") {
  if (status === "PUBLISHED" || status === "APPROVED" || status === "LIVE") return "Live";
  if (status === "IN_REVIEW") return "Under review";
  if (status === "CHANGES_REQUESTED" || status === "REJECTED") return "Needs changes";
  if (status === "ARCHIVED") return "Archived";
  return "Draft";
}

export function ok(response: ModerationIntentResponse) {
  return NextResponse.json(response);
}

export type AppDb = PrismaClient;
