import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { BetaAccessRequestStatus } from "@prisma/client";
import { apiError } from "@/lib/api";
import { sendAlert } from "@/lib/alerts";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/beta/access";
import { RATE_LIMITS, enforceRateLimit, isRateLimitError, rateLimitErrorResponse, requestClientIp } from "@/lib/rate-limit";
import { betaAccessRequestSchema, betaFeedbackSchema, betaRequestStatusPatchSchema, idParamSchema, parseBody, zodDetails } from "@/lib/validators";

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function bestEffortRateLimitKey(req: NextRequest, scope: string) {
  const ip = requestClientIp(req);
  if (ip && ip !== "unknown") return `${scope}:ip:${ip}`;
  const ua = req.headers.get("user-agent") ?? "unknown";
  const reqId = req.headers.get("x-request-id") ?? "unknown";
  const hash = crypto.createHash("sha256").update(`${ua}:${reqId}`).digest("hex").slice(0, 16);
  return `${scope}:anon:${hash}`;
}

export async function handleRequestAccess(req: NextRequest, userId?: string) {
  try {
    await enforceRateLimit({
      key: bestEffortRateLimitKey(req, "beta-request-access"),
      limit: RATE_LIMITS.betaRequestAccess.limit,
      windowMs: RATE_LIMITS.betaRequestAccess.windowMs,
    });
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
  }

  const parsed = betaAccessRequestSchema.safeParse(await parseBody(req));
  if (!parsed.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsed.error));

  const email = normalizeEmail(parsed.data.email);
  const note = parsed.data.note?.trim() || null;

  const item = await db.betaAccessRequest.upsert({
    where: { email },
    update: { note, userId: userId ?? null },
    create: { email, note, userId: userId ?? null },
    select: { id: true, email: true, createdAt: true },
  });

  if (process.env.ALERT_WEBHOOK_URL) {
    await sendAlert({
      severity: "info",
      title: "beta_access_request_created",
      body: `beta access request ${item.id}`,
      tags: { email: item.email, createdAt: item.createdAt.toISOString() },
    });
  }

  return noStoreJson({ ok: true });
}

export async function handleFeedback(req: NextRequest, userId?: string) {
  try {
    await enforceRateLimit({
      key: bestEffortRateLimitKey(req, "beta-feedback"),
      limit: RATE_LIMITS.betaFeedback.limit,
      windowMs: RATE_LIMITS.betaFeedback.windowMs,
    });
  } catch (error) {
    if (isRateLimitError(error)) return rateLimitErrorResponse(error);
  }

  const parsed = betaFeedbackSchema.safeParse(await parseBody(req));
  if (!parsed.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsed.error));

  const item = await db.betaFeedback.create({
    data: {
      email: parsed.data.email ? normalizeEmail(parsed.data.email) : null,
      pagePath: parsed.data.pagePath || null,
      message: parsed.data.message,
      meta: {
        userAgent: req.headers.get("user-agent") || undefined,
        requestId: req.headers.get("x-request-id") || undefined,
      },
      userId: userId ?? null,
    },
    select: { id: true, email: true, pagePath: true, createdAt: true },
  });

  if (process.env.ALERT_WEBHOOK_URL) {
    await sendAlert({
      severity: "info",
      title: "beta_feedback_created",
      body: `beta feedback ${item.id}`,
      tags: { email: item.email, pagePath: item.pagePath, createdAt: item.createdAt.toISOString() },
    });
  }

  return noStoreJson({ ok: true });
}

export async function handleAdminPatchRequestStatus(
  req: NextRequest,
  params: Promise<{ id: string }>,
  actorUser?: { id: string; email: string },
) {
  const parsedId = idParamSchema.safeParse(await params);
  if (!parsedId.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedId.error));

  const parsedBody = betaRequestStatusPatchSchema.safeParse(await parseBody(req));
  if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

  const status = parsedBody.data.status as BetaAccessRequestStatus;
  await db.betaAccessRequest.update({
    where: { id: parsedId.data.id },
    data: { status },
  });

  return noStoreJson({ ok: true });
}
