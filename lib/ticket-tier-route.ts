import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { parseBody, zodDetails } from "@/lib/validators";

type SessionUser = { id: string };

type TicketTierRecord = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  capacity: number | null;
  sortOrder: number;
  isActive: boolean;
};

type CreateTierInput = {
  eventId: string;
  name: string;
  description?: string | null;
  priceAmount: number;
  currency: string;
  capacity?: number | null;
  sortOrder: number;
  isActive: boolean;
};

type UpdateTierInput = {
  name?: string;
  description?: string | null;
  capacity?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

type Deps = {
  requireAuth: () => Promise<SessionUser>;
  findManagedEventById: (eventId: string, userId: string) => Promise<{ id: string } | null>;
  listTiersByEventId: (eventId: string) => Promise<TicketTierRecord[]>;
  findMaxSortOrderByEventId: (eventId: string) => Promise<number | null>;
  createTier: (data: CreateTierInput) => Promise<TicketTierRecord>;
  findTierByIdAndEventId: (tierId: string, eventId: string) => Promise<TicketTierRecord | null>;
  updateTier: (tierId: string, data: UpdateTierInput) => Promise<TicketTierRecord>;
};

const paramsSchema = z.object({ eventId: z.string().uuid() });
const tierParamsSchema = z.object({ eventId: z.string().uuid(), tierId: z.string().uuid() });

const createTierSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().max(500).optional().nullable(),
  priceAmount: z.number().int().min(0),
  currency: z.string().trim().min(1).max(16).default("GBP"),
  capacity: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

const updateTierSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required");

async function requireManagedEvent(eventId: string, userId: string, deps: Deps) {
  const event = await deps.findManagedEventById(eventId, userId);
  if (!event) return null;
  return event;
}

export async function handleGetTicketTiers(_req: NextRequest, params: Promise<{ eventId: string }>, deps: Deps) {
  try {
    const user = await deps.requireAuth();
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedParams.error));

    const event = await requireManagedEvent(parsedParams.data.eventId, user.id, deps);
    if (!event) return apiError(404, "not_found", "Event not found");

    const tiers = await deps.listTiersByEventId(event.id);
    return NextResponse.json({ tiers });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function handlePostTicketTier(req: NextRequest, params: Promise<{ eventId: string }>, deps: Deps) {
  try {
    const user = await deps.requireAuth();
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedParams.error));

    const event = await requireManagedEvent(parsedParams.data.eventId, user.id, deps);
    if (!event) return apiError(404, "not_found", "Event not found");

    const parsedBody = createTierSchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

    const maxSortOrder = await deps.findMaxSortOrderByEventId(event.id);
    const tier = await deps.createTier({
      eventId: event.id,
      name: parsedBody.data.name,
      description: parsedBody.data.description ?? null,
      priceAmount: parsedBody.data.priceAmount,
      currency: parsedBody.data.currency,
      capacity: parsedBody.data.capacity ?? null,
      sortOrder: parsedBody.data.sortOrder ?? (maxSortOrder ?? -1) + 1,
      isActive: parsedBody.data.isActive,
    });

    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function handlePatchTicketTier(req: NextRequest, params: Promise<{ eventId: string; tierId: string }>, deps: Deps) {
  try {
    const user = await deps.requireAuth();
    const parsedParams = tierParamsSchema.safeParse(await params);
    if (!parsedParams.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedParams.error));

    const event = await requireManagedEvent(parsedParams.data.eventId, user.id, deps);
    if (!event) return apiError(404, "not_found", "Event not found");

    const tier = await deps.findTierByIdAndEventId(parsedParams.data.tierId, event.id);
    if (!tier) return apiError(404, "not_found", "Ticket tier not found");

    const parsedBody = updateTierSchema.safeParse(await parseBody(req));
    if (!parsedBody.success) return apiError(400, "invalid_request", "Invalid payload", zodDetails(parsedBody.error));

    const updated = await deps.updateTier(tier.id, parsedBody.data);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}

export async function handleDeleteTicketTier(_req: NextRequest, params: Promise<{ eventId: string; tierId: string }>, deps: Deps) {
  try {
    const user = await deps.requireAuth();
    const parsedParams = tierParamsSchema.safeParse(await params);
    if (!parsedParams.success) return apiError(400, "invalid_request", "Invalid route parameter", zodDetails(parsedParams.error));

    const event = await requireManagedEvent(parsedParams.data.eventId, user.id, deps);
    if (!event) return apiError(404, "not_found", "Event not found");

    const tier = await deps.findTierByIdAndEventId(parsedParams.data.tierId, event.id);
    if (!tier) return apiError(404, "not_found", "Ticket tier not found");

    const updated = await deps.updateTier(tier.id, { isActive: false });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return apiError(401, "unauthorized", "Authentication required");
    }
    return apiError(500, "internal_error", "Unexpected server error");
  }
}
