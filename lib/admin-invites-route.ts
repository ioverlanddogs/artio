import crypto from "crypto";
import type { Prisma, Role } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/beta/access";

const inviteCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(["USER", "EDITOR", "ADMIN"]).optional(),
});

const revokeParamsSchema = z.object({ id: z.guid() });

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type AdminActor = { id: string; email: string; role: "USER" | "EDITOR" | "ADMIN" };

type AdminInvitesDeps = {
  requireAdminUser: () => Promise<AdminActor>;
  appDb: typeof db;
  now?: () => Date;
  randomBytesFn?: (size: number) => Buffer;
};

function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function resolveInviteOrigin(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return appUrl.replace(/\/$/, "");
  return req.nextUrl.origin;
}

function getRequestDetails(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0]?.trim() : req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");
  return { ip: ip || null, userAgent: userAgent || null };
}

function inviteStatus(invite: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date }, now: Date) {
  if (invite.acceptedAt) return "accepted" as const;
  if (invite.revokedAt) return "revoked" as const;
  if (invite.expiresAt <= now) return "expired" as const;
  return "active" as const;
}

export async function handleAdminInviteCreate(req: NextRequest, deps: AdminInvitesDeps) {
  try {
    const actor = await deps.requireAdminUser();
    const parsed = inviteCreateSchema.safeParse(await req.json());
    if (!parsed.success) return apiError(400, "invalid_body", "Invalid invite payload");

    const normalized = normalizeEmail(parsed.data.email);
    const intendedRole = (parsed.data.role ?? "EDITOR") as Role;
    const now = deps.now?.() ?? new Date();

    const existing = await deps.appDb.adminInvite.findUnique({
      where: { normalizedEmail: normalized },
      select: { id: true, email: true, intendedRole: true, expiresAt: true, acceptedAt: true, revokedAt: true },
    });

    const origin = resolveInviteOrigin(req);

    if (existing && !existing.acceptedAt && !existing.revokedAt && existing.expiresAt > now) {
      return NextResponse.json({
        inviteId: existing.id,
        email: existing.email,
        intendedRole: existing.intendedRole,
        expiresAt: existing.expiresAt,
        inviteUrl: null,
        reused: true,
      });
    }

    const rawToken = (deps.randomBytesFn ?? crypto.randomBytes)(32).toString("base64url");
    const tokenHash = hashInviteToken(rawToken);
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    const { ip, userAgent } = getRequestDetails(req);

    const invite = await deps.appDb.$transaction(async (tx) => {
      const created = await tx.adminInvite.upsert({
        where: { normalizedEmail: normalized },
        create: {
          email: parsed.data.email.trim(),
          normalizedEmail: normalized,
          intendedRole,
          tokenHash,
          createdById: actor.id,
          expiresAt,
        },
        update: {
          email: parsed.data.email.trim(),
          intendedRole,
          tokenHash,
          createdById: actor.id,
          createdAt: now,
          expiresAt,
          acceptedAt: null,
          revokedAt: null,
        },
        select: { id: true, email: true, intendedRole: true, expiresAt: true },
      });

      const metadata = {
        actorUserId: actor.id,
        actorEmail: actor.email,
        email: normalized,
        intendedRole,
        expiresAt: expiresAt.toISOString(),
      } satisfies Prisma.InputJsonValue;

      await tx.adminAuditLog.create({
        data: {
          actorEmail: actor.email,
          action: "ADMIN_INVITE_CREATED",
          targetType: "admin_invite",
          targetId: created.id,
          metadata,
          ip,
          userAgent,
        },
      });

      return created;
    });

    return NextResponse.json({
      inviteId: invite.id,
      email: invite.email,
      intendedRole: invite.intendedRole,
      expiresAt: invite.expiresAt,
      inviteUrl: `${origin}/invite/${rawToken}`,
      reused: false,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Admin role required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function handleAdminInvitesList(_: NextRequest, deps: AdminInvitesDeps) {
  try {
    await deps.requireAdminUser();
    const now = deps.now?.() ?? new Date();

    const invites = await deps.appDb.adminInvite.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        email: true,
        intendedRole: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
      },
    });

    return NextResponse.json({
      invites: invites.map((invite) => ({
        ...invite,
        status: inviteStatus(invite, now),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Admin role required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function handleAdminInviteRevoke(req: NextRequest, params: { id: string }, deps: AdminInvitesDeps) {
  try {
    const actor = await deps.requireAdminUser();
    const parsedParams = revokeParamsSchema.safeParse(params);
    if (!parsedParams.success) return apiError(400, "invalid_invite_id", "Invalid invite id");

    const invite = await deps.appDb.adminInvite.findUnique({
      where: { id: parsedParams.data.id },
      select: { id: true, acceptedAt: true, revokedAt: true },
    });

    if (!invite) return apiError(404, "not_found", "Invite not found");
    if (invite.acceptedAt) return apiError(409, "already_accepted", "Invite already accepted");
    if (invite.revokedAt) return NextResponse.json({ success: true, alreadyRevoked: true });

    const { ip, userAgent } = getRequestDetails(req);

    await deps.appDb.$transaction(async (tx) => {
      const now = deps.now?.() ?? new Date();
      await tx.adminInvite.update({ where: { id: invite.id }, data: { revokedAt: now } });
      const metadata = {
        actorUserId: actor.id,
        actorEmail: actor.email,
        inviteId: invite.id,
      } satisfies Prisma.InputJsonValue;
      await tx.adminAuditLog.create({
        data: {
          actorEmail: actor.email,
          action: "ADMIN_INVITE_REVOKED",
          targetType: "admin_invite",
          targetId: invite.id,
          metadata,
          ip,
          userAgent,
        },
      });
    });

    return NextResponse.json({ success: true, alreadyRevoked: false });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Admin role required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export { hashInviteToken };
