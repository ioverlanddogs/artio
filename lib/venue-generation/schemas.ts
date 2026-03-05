import { z } from "zod";

const SAFE_GEO_RE = /^[\w\s,.()\-'À-ÖØ-öø-ÿ]+$/u;

export const venueGenerationInputSchema = z.object({
  country: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(SAFE_GEO_RE, "Country contains invalid characters"),
  region: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(SAFE_GEO_RE, "Region contains invalid characters"),
});

const urlSchema = z.string().trim().max(500);

export const generatedVenueSchema = z.object({
  name: z.string().trim().min(1).max(200),
  addressLine1: z.string().trim().max(200).nullable(),
  addressLine2: z.string().trim().max(200).nullable(),
  city: z.string().trim().max(120).nullable(),
  region: z.string().trim().max(120).nullable(),
  postcode: z.string().trim().max(40).nullable(),
  country: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().max(320).nullable(),
  contactPhone: z.string().trim().max(80).nullable(),
  websiteUrl: urlSchema.nullable(),
  instagramUrl: urlSchema.nullable(),
  facebookUrl: urlSchema.nullable(),
  openingHours: z.string().trim().max(400).nullable(),
  venueType: z.enum(["GALLERY", "MUSEUM", "ART_CENTRE", "FOUNDATION", "OTHER"]),
});

export const generatedVenuesResponseSchema = z.object({
  venues: z.array(generatedVenueSchema).max(300),
});

export type GeneratedVenue = z.infer<typeof generatedVenueSchema>;
export type VenueGenerationInput = z.infer<typeof venueGenerationInputSchema>;
