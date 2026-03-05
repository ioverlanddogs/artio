import type { FetchedHomepage } from "./extract-homepage-images";

export type HomepageDetails = {
  description: string | null;
  openingHours: string | null;
  contactEmail: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
};

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getMetaContent(html: string, attr: "name" | "property", key: string): string | null {
  const re = new RegExp(`<meta\\b[^>]*\\b${attr}\\s*=\\s*(["'])${key}\\1[^>]*\\bcontent\\s*=\\s*(["'])([\\s\\S]*?)\\2[^>]*>`, "i");
  const match = html.match(re);
  if (!match) return null;
  const value = stripTags(match[3]);
  if (value.length < 20) return null;
  return value.slice(0, 500);
}

function extractOpeningHours(html: string): string | null {
  const re = /<(p|li|td|span|div)\b[^>]*(?:class|id)\s*=\s*(["'])[^"']*(hour|open|time)[^"']*\2[^>]*>[\s\S]*?<\/\1>/gi;
  for (const match of html.matchAll(re)) {
    const text = stripTags(match[0]);
    if (/\b(mon|tue|wed|thu|fri|sat|sun)\b/i.test(text) && /(\d{1,2}:\d{2}|\d{1,2}\s?(?:am|pm)|\bam\b|\bpm\b)/i.test(text)) {
      return text.slice(0, 200);
    }
  }
  return null;
}

function extractContactEmail(html: string): string | null {
  const mailtoMatch = html.match(/<a\b[^>]*\bhref\s*=\s*(["'])mailto:([^"'>\s?]+)\1/i);
  if (mailtoMatch) return mailtoMatch[2].trim();

  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  for (const match of html.matchAll(emailRe)) {
    const email = match[0].trim();
    if (/^(?:noreply|no-reply)@/i.test(email)) continue;
    if (/^support@/i.test(email)) continue;
    return email;
  }

  return null;
}

function resolveSocialUrl(raw: string, baseUrl: string, platform: "instagram" | "facebook"): string | null {
  let resolved: URL;
  try {
    resolved = new URL(raw, baseUrl);
  } catch {
    return null;
  }

  const hostname = resolved.hostname.toLowerCase();
  const expected = `${platform}.com`;
  if (!hostname.includes(expected)) return null;

  const segments = resolved.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  return resolved.toString();
}

function extractSocialUrl(html: string, baseUrl: string, platform: "instagram" | "facebook"): string | null {
  const re = new RegExp(`<a\\b[^>]*\\bhref\\s*=\\s*(["'])([^"']*${platform}\\.com[^"']*)\\1`, "gi");
  for (const match of html.matchAll(re)) {
    const resolved = resolveSocialUrl(match[2], baseUrl, platform);
    if (resolved) return resolved;
  }

  return null;
}

export function extractHomepageDetails(fetched: FetchedHomepage): HomepageDetails {
  const html = fetched.html ?? "";

  return {
    description: getMetaContent(html, "name", "description") ?? getMetaContent(html, "property", "og:description"),
    openingHours: extractOpeningHours(html),
    contactEmail: extractContactEmail(html),
    instagramUrl: extractSocialUrl(html, fetched.finalUrl, "instagram"),
    facebookUrl: extractSocialUrl(html, fetched.finalUrl, "facebook"),
  };
}
