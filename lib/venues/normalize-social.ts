import { z } from "zod";

type NormalizedValue = {
  value: string | null;
  warning?: string;
};

const emailSchema = z.string().email();
const commonImageExtension = /\.(?:jpe?g|png|webp)(?:$|[?#])/i;
const likelyImagePath = /(image|images|img|photo|photos|media|cdn|upload|uploads|assets)/i;

function parseHttpUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function normalizeSocialUrl(input: string | null | undefined, hostnames: string[], warning: string): NormalizedValue {
  const value = input?.trim();
  if (!value) return { value: null };

  const parsed = parseHttpUrl(value);
  if (!parsed || parsed.protocol !== "https:") return { value: null, warning };
  const hostname = parsed.hostname.toLowerCase();
  if (!hostnames.includes(hostname)) return { value: null, warning };

  const segments = parsed.pathname.split("/").filter(Boolean);
  const handle = segments[0]?.trim();
  if (!handle) return { value: null, warning };

  return { value: `https://www.${hostnames[0].replace(/^www\./, "")}/${handle}` };
}

export function normalizeInstagramUrl(input: string | null | undefined): NormalizedValue {
  return normalizeSocialUrl(input, ["instagram.com", "www.instagram.com"], "invalid_instagram_url");
}

export function normalizeFacebookUrl(input: string | null | undefined): NormalizedValue {
  return normalizeSocialUrl(input, ["facebook.com", "www.facebook.com"], "invalid_facebook_url");
}

export function normalizeEmail(input: string | null | undefined): NormalizedValue {
  const value = input?.trim();
  if (!value) return { value: null };
  const parsed = emailSchema.safeParse(value);
  if (!parsed.success) return { value: null, warning: "invalid_contact_email" };
  return { value: parsed.data };
}

export function normalizeHttpsImageUrl(input: string | null | undefined): NormalizedValue {
  const value = input?.trim();
  if (!value || value.startsWith("data:")) return { value: null, warning: value ? "invalid_featured_image_url" : undefined };

  const parsed = parseHttpUrl(value);
  if (!parsed || parsed.protocol !== "https:") return { value: null, warning: "invalid_featured_image_url" };

  const pathname = parsed.pathname.toLowerCase();
  if (!pathname || pathname === "/") return { value: null, warning: "invalid_featured_image_url" };
  const looksLikeImage = commonImageExtension.test(pathname) || likelyImagePath.test(pathname);
  if (!looksLikeImage) return { value: null, warning: "invalid_featured_image_url" };

  parsed.hash = "";
  return { value: parsed.toString() };
}
