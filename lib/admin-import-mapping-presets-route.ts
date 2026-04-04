import type { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";

type AdminActor = { id: string; email: string; role: "USER" | "EDITOR" | "ADMIN" };

type AdminImportMappingPresetsDeps = {
  requireAdminUser: () => Promise<AdminActor>;
  appDb: typeof db;
};

const entityTypeSchema = z.enum(["venues", "events", "artists"]);
const listQuerySchema = z.object({ entityType: entityTypeSchema });
const presetIdSchema = z.object({ id: z.guid() });
const savePresetBodySchema = z.object({
  entityType: entityTypeSchema,
  name: z.string().trim().min(2).max(60),
  mapping: z.record(z.string(), z.union([z.string(), z.null()])).default({}),
  overwrite: z.boolean().optional(),
});

function getRequestDetails(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0]?.trim() : req.headers.get("x-real-ip");
  return { ip: ip || null, userAgent: req.headers.get("user-agent") || null };
}

function sanitizeMapping(mapping: Record<string, string | null>) {
  const sanitized: Record<string, string> = {};
  for (const [column, value] of Object.entries(mapping)) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (!normalized || normalized === "__ignore") continue;
    sanitized[column] = normalized;
  }
  return sanitized;
}

export async function handleImportMappingPresetList(req: NextRequest, deps: AdminImportMappingPresetsDeps) {
  try {
    const actor = await deps.requireAdminUser();
    const parsed = listQuerySchema.safeParse({ entityType: req.nextUrl.searchParams.get("entityType") ?? "" });
    if (!parsed.success) return apiError(400, "invalid_query", "Invalid entityType");

    const presets = await deps.appDb.importMappingPreset.findMany({
      where: { createdById: actor.id, entityType: parsed.data.entityType },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      select: { id: true, name: true, entityType: true, updatedAt: true },
    });

    return NextResponse.json({ presets });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Admin role required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function handleImportMappingPresetGet(_: NextRequest, params: { id: string }, deps: AdminImportMappingPresetsDeps) {
  try {
    const actor = await deps.requireAdminUser();
    const parsedParams = presetIdSchema.safeParse(params);
    if (!parsedParams.success) return apiError(400, "invalid_preset_id", "Invalid preset id");

    const preset = await deps.appDb.importMappingPreset.findUnique({
      where: { id: parsedParams.data.id },
      select: { id: true, name: true, entityType: true, mappingJson: true, updatedAt: true, createdById: true },
    });

    if (!preset) return apiError(404, "not_found", "Preset not found");
    if (preset.createdById !== actor.id) return apiError(404, "not_found", "Preset not found");

    return NextResponse.json({ id: preset.id, name: preset.name, entityType: preset.entityType, mappingJson: preset.mappingJson, updatedAt: preset.updatedAt });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Admin role required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function handleImportMappingPresetSave(req: NextRequest, deps: AdminImportMappingPresetsDeps) {
  try {
    const actor = await deps.requireAdminUser();
    const parsedBody = savePresetBodySchema.safeParse(await req.json());
    if (!parsedBody.success) return apiError(400, "invalid_body", "Invalid preset payload", parsedBody.error.flatten());

    const { ip, userAgent } = getRequestDetails(req);
    const mapping = sanitizeMapping(parsedBody.data.mapping);
    const name = parsedBody.data.name.trim();

    const existing = await deps.appDb.importMappingPreset.findUnique({
      where: {
        createdById_entityType_name: {
          createdById: actor.id,
          entityType: parsedBody.data.entityType,
          name,
        },
      },
      select: { id: true },
    });

    if (existing && !parsedBody.data.overwrite) {
      return apiError(409, "conflict", "A preset with this name already exists");
    }

    const saved = await deps.appDb.$transaction(async (tx) => {
      const preset = existing
        ? await tx.importMappingPreset.update({
          where: { id: existing.id },
          data: { mappingJson: mapping },
          select: { id: true, name: true, entityType: true, mappingJson: true, updatedAt: true },
        })
        : await tx.importMappingPreset.create({
          data: {
            createdById: actor.id,
            entityType: parsedBody.data.entityType,
            name,
            mappingJson: mapping,
          },
          select: { id: true, name: true, entityType: true, mappingJson: true, updatedAt: true },
        });

      const metadata = {
        entityType: parsedBody.data.entityType,
        name,
        overwrite: Boolean(existing && parsedBody.data.overwrite),
      } satisfies Prisma.InputJsonValue;

      await tx.adminAuditLog.create({
        data: {
          actorEmail: actor.email,
          action: "ADMIN_IMPORT_PRESET_SAVED",
          targetType: "import_mapping_preset",
          targetId: preset.id,
          metadata,
          ip,
          userAgent,
        },
      });

      return preset;
    });

    return NextResponse.json(saved);
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Admin role required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function handleImportMappingPresetDelete(req: NextRequest, params: { id: string }, deps: AdminImportMappingPresetsDeps) {
  try {
    const actor = await deps.requireAdminUser();
    const parsedParams = presetIdSchema.safeParse(params);
    if (!parsedParams.success) return apiError(400, "invalid_preset_id", "Invalid preset id");

    const existing = await deps.appDb.importMappingPreset.findUnique({
      where: { id: parsedParams.data.id },
      select: { id: true, name: true, entityType: true, createdById: true },
    });

    if (!existing || existing.createdById !== actor.id) return apiError(404, "not_found", "Preset not found");

    const { ip, userAgent } = getRequestDetails(req);
    await deps.appDb.$transaction(async (tx) => {
      await tx.importMappingPreset.delete({ where: { id: existing.id } });
      const metadata = { entityType: existing.entityType, name: existing.name } satisfies Prisma.InputJsonValue;
      await tx.adminAuditLog.create({
        data: {
          actorEmail: actor.email,
          action: "ADMIN_IMPORT_PRESET_DELETED",
          targetType: "import_mapping_preset",
          targetId: existing.id,
          metadata,
          ip,
          userAgent,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") return apiError(401, "unauthorized", "Authentication required");
    if (error instanceof Error && error.message === "forbidden") return apiError(403, "forbidden", "Admin role required");
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
