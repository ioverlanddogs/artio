import { z } from "zod";
import { httpUrlSchema } from "@/lib/validators";

export type VenuePublishIssue = {
  field: "name" | "description" | "coverImage" | "location" | "websiteUrl";
  message: string;
};

export type VenuePublishInput = {
  name: string | null;
  description: string | null;
  featuredAssetId: string | null;
  featuredImageUrl: string | null;
  addressLine1: string | null;
  city: string | null;
  country: string | null;
  websiteUrl: string | null;
  images: Array<{ id: string }>;
};

const venuePublishSchema = z.object({
  name: z.string().trim().min(1, "Venue name is required"),
  description: z.string().trim().min(20, "Description must be at least 20 characters"),
  hasCoverImage: z.boolean().refine((value) => value, "Add a cover image before submitting"),
  hasLocation: z.boolean().refine((value) => value, "Add an address or city + country before submitting"),
  websiteUrl: httpUrlSchema.optional().nullable(),
});

export function getVenuePublishIssues(venue: VenuePublishInput): VenuePublishIssue[] {
  const hasCoverImage = Boolean(venue.featuredAssetId || venue.featuredImageUrl || venue.images.length > 0);
  const hasLocation = Boolean(venue.addressLine1?.trim() || (venue.city?.trim() && venue.country?.trim()));

  const parsed = venuePublishSchema.safeParse({
    name: venue.name ?? "",
    description: venue.description ?? "",
    hasCoverImage,
    hasLocation,
    websiteUrl: venue.websiteUrl,
  });

  if (parsed.success) return [];

  return parsed.error.issues.map((issue) => {
    const path = issue.path[0];
    if (path === "name") return { field: "name", message: issue.message };
    if (path === "description") return { field: "description", message: issue.message };
    if (path === "hasCoverImage") return { field: "coverImage", message: issue.message };
    if (path === "hasLocation") return { field: "location", message: issue.message };
    return { field: "websiteUrl", message: issue.message };
  });
}
