import type { Prisma, Role } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/beta/access";
import { hashInviteToken } from "@/lib/admin-invites-route";
import { UnauthorizedError, isUnauthorizedError } from "@/lib/http-errors";

const acceptSchema = z.object({ token: z.string().min(32).max(512) });

type SessionUser = { id: string; email: string; role: "USER" | "EDITOR" | "ADMIN" };

type AcceptDeps = {
  requireUser: () => Promise<SessionUser>;
  appDb: typeof db;
  now?: () => Date;
};

const roleRank: Record<Role, number> = { USER: 1, EDITOR: 2, ADMIN: 3 };

function higherRole(current: Role, incoming: Role) {
  return roleRank[incoming] > roleRank[current] ? incoming : current;
}

function getRequestDetails(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0]?.trim() : req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");
  return { ip: ip || null, userAgent: userAgent || null };
}

export async function handleAdminInviteAccept(req: NextRequest, deps: AcceptDeps) {
  try {
    const sessionUser = await deps.requireUser();
    const parsedBody = acceptSchema.safeParse(await req.json());
    if (!parsedBody.success) return apiError(400, "invalid_body", "Invalid invite token");

    const now = deps.now?.() ?? new Date();
    const tokenHash = hashInviteToken(parsedBody.data.token);
    const normalizedSessionEmail = normalizeEmail(sessionUser.email);

    const invite = await deps.appDb.adminInvite.findUnique({
      where: { tokenHash },
      select: { id: true, normalizedEmail: true, intendedRole: true, expiresAt: true, acceptedAt: true, revokedAt: true },
    });

    if (!invite) return apiError(404, "invalid_invite", "Invite is invalid");
    if (invite.expiresAt <= now) return apiError(409, "expired_invite", "Invite has expired");
    if (invite.revokedAt) return apiError(409, "revoked_invite", "Invite has been revoked");
    if (invite.acceptedAt) return apiError(409, "already_accepted", "Invite has already been accepted");
    if (invite.normalizedEmail !== normalizedSessionEmail) {
      return apiError(403, "email_mismatch", "Invite email does not match authenticated user");
    }

    const { ip, userAgent } = getRequestDetails(req);

    const result = await deps.appDb.$transaction(async (tx) => {
      const userBefore = await tx.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, role: true, email: true } });
      if (!userBefore) throw new UnauthorizedError();

      const afterRole = higherRole(userBefore.role, invite.intendedRole);

      await tx.adminInvite.update({ where: { id: invite.id }, data: { acceptedAt: now } });

      const updatedUser = await tx.user.update({
        where: { id: sessionUser.id },
        data: { role: afterRole },
        select: { role: true },
      });

      const metadata = {
        inviteId: invite.id,
        email: normalizedSessionEmail,
        beforeRole: userBefore.role,
        afterRole: updatedUser.role,
      } satisfies Prisma.InputJsonValue;

      await tx.adminAuditLog.create({
        data: {
          actorEmail: normalizedSessionEmail,
          action: "ADMIN_INVITE_ACCEPTED",
          targetType: "admin_invite",
          targetId: invite.id,
          metadata,
          ip,
          userAgent,
        },
      });

      return updatedUser;
    });

    return NextResponse.json({ success: true, role: result.role });
  } catch (error) {
    if (isUnauthorizedError(error)) return apiError(401, "unauthorized", "Authentication required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
