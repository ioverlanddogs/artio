import { fetchHtmlWithGuards } from "@/lib/ingest/fetch-html";
import { assertSafeUrl } from "@/lib/ingest/url-guard";

export type HomepageImageCandidate = {
  url: string;
  source: "og_image" | "twitter_image" | "preload" | "hero_img" | "body_img";
  sortOrder: number;
};

export type ExtractHomepageImagesResult = {
  candidates: HomepageImageCandidate[];
  warning?: string;
};

export type FetchedHomepage = {
  html: string;
  finalUrl: string;
  contentType: string;
};

const HERO_HINT_RE = /(hero|banner|cover|feature|highlight)/i;

function parseNumberAttr(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/\d+/);
  if (!m) return null;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

function getAttr(tag: string, attr: string): string | null {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*=\\s*([\"'])(.*?)\\1`, "i");
  const match = tag.match(re);
  return match?.[2]?.trim() || null;
}

function shouldExcludeUrl(resolved: URL, width: number | null, height: number | null): boolean {
  const path = resolved.pathname.toLowerCase();
  if (path.endsWith(".svg") || path.endsWith(".ico")) return true;
  if (path.includes("/icon") || path.includes("/logo") || path.includes("/favicon") || path.includes("/sprite")) return true;
  if (width !== null && height !== null && width <= 2 && height <= 2) return true;
  return false;
}

async function pushCandidate(
  out: HomepageImageCandidate[],
  seen: Set<string>,
  rawUrl: string | null,
  source: HomepageImageCandidate["source"],
  sortOrder: number,
  baseUrl: string,
  assertUrl: typeof assertSafeUrl,
  width: number | null = null,
  height: number | null = null,
) {
  if (!rawUrl) return;

  let resolved: URL;
  try {
    resolved = new URL(rawUrl, baseUrl);
  } catch {
    return;
  }

  if (shouldExcludeUrl(resolved, width, height)) return;

  try {
    await assertUrl(resolved.toString());
  } catch {
    return;
  }

  const finalUrl = resolved.toString();
  if (seen.has(finalUrl)) return;
  seen.add(finalUrl);
  out.push({ url: finalUrl, source, sortOrder });
}

export async function extractHomepageImages(args: {
  websiteUrl: string | null;
  fetchHtml: typeof fetchHtmlWithGuards;
  assertUrl: typeof assertSafeUrl;
}): Promise<ExtractHomepageImagesResult | null> {
  if (!args.websiteUrl) return null;
  const fetched = await fetchHomepage({
    websiteUrl: args.websiteUrl,
    fetchHtml: args.fetchHtml,
    assertUrl: args.assertUrl,
  });
  if (!fetched) return null;
  return extractHomepageImagesFromHtml(fetched, args.assertUrl);
}

export async function fetchHomepage(args: {
  websiteUrl: string;
  fetchHtml: typeof fetchHtmlWithGuards;
  assertUrl: typeof assertSafeUrl;
}): Promise<FetchedHomepage | null> {
  try {
    await args.assertUrl(args.websiteUrl);
  } catch {
    return null;
  }

  let fetched: Awaited<ReturnType<typeof fetchHtmlWithGuards>>;
  try {
    fetched = await args.fetchHtml(args.websiteUrl);
  } catch {
    return null;
  }

  if (!fetched.contentType?.toLowerCase().includes("html")) return null;

  return {
    html: fetched.html ?? "",
    finalUrl: fetched.finalUrl,
    contentType: fetched.contentType,
  };
}

export async function extractHomepageImagesFromHtml(
  fetched: FetchedHomepage,
  assertUrl: typeof assertSafeUrl,
): Promise<ExtractHomepageImagesResult> {
  try {
    const html = fetched.html ?? "";
    const candidates: HomepageImageCandidate[] = [];
    const seen = new Set<string>();

    const ogMetaRe = /<meta\b[^>]*\bproperty\s*=\s*(["'])og:image\1[^>]*\bcontent\s*=\s*(["'])(.*?)\2[^>]*>/gi;
    for (const m of html.matchAll(ogMetaRe)) await pushCandidate(candidates, seen, m[3], "og_image", 0, fetched.finalUrl, assertUrl);

    const twMetaRe = /<meta\b[^>]*\bname\s*=\s*(["'])twitter:image\1[^>]*\bcontent\s*=\s*(["'])(.*?)\2[^>]*>/gi;
    for (const m of html.matchAll(twMetaRe)) await pushCandidate(candidates, seen, m[3], "twitter_image", 10, fetched.finalUrl, assertUrl);

    const preloadRe = /<link\b[^>]*\brel\s*=\s*(["'])preload\1[^>]*\bas\s*=\s*(["'])image\2[^>]*\bhref\s*=\s*(["'])(.*?)\3[^>]*>/gi;
    for (const m of html.matchAll(preloadRe)) await pushCandidate(candidates, seen, m[4], "preload", 20, fetched.finalUrl, assertUrl);

    const heroBlocks = [
      ...html.matchAll(/<header\b[^>]*>[\s\S]*?<\/header>/gi),
      ...html.matchAll(/<(?:section|div)\b[^>]*(?:class|id)\s*=\s*(["'])(.*?)\1[^>]*>[\s\S]*?<\/(?:section|div)>/gi),
    ];

    let heroIndex = 0;
    for (const blockMatch of heroBlocks) {
      const attrs = blockMatch[2] ?? "";
      if (blockMatch[0].toLowerCase().startsWith("<header") || HERO_HINT_RE.test(attrs)) {
        const imgRe = /<img\b[^>]*>/gi;
        for (const imgMatch of blockMatch[0].matchAll(imgRe)) {
          const tag = imgMatch[0];
          await pushCandidate(candidates, seen, getAttr(tag, "src"), "hero_img", 30 + heroIndex, fetched.finalUrl, assertUrl, parseNumberAttr(getAttr(tag, "width")), parseNumberAttr(getAttr(tag, "height")));
          heroIndex += 1;
        }
      }
    }

    const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    const body = bodyMatch?.[1] ?? html;
    let bodyIndex = 0;
    for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      const width = parseNumberAttr(getAttr(tag, "width"));
      const srcset = getAttr(tag, "srcset");
      if ((width !== null && width >= 400) || srcset) {
        await pushCandidate(candidates, seen, getAttr(tag, "src"), "body_img", 40 + bodyIndex, fetched.finalUrl, assertUrl, width, parseNumberAttr(getAttr(tag, "height")));
        bodyIndex += 1;
      }
    }

    return { candidates: candidates.sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 12) };
  } catch {
    return { candidates: [] };
  }
}
