import { IngestError } from "@/lib/ingest/errors";
import { assertSafeUrl } from "@/lib/ingest/url-guard";

type FetchImageOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  allowSvg?: boolean;
  minWidth?: number;
  minHeight?: number;
  fetchImpl?: typeof fetch;
  assertSafeUrlImpl?: typeof assertSafeUrl;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = Number.parseInt(process.env.AI_INGEST_IMAGE_MAX_BYTES ?? "5000000", 10) || 5_000_000;
const DEFAULT_MAX_REDIRECTS = 5;

async function readBodyLimited(response: Response, maxBytes: number): Promise<{ bytes: Uint8Array; sizeBytes: number }> {
  if (!response.body) {
    return { bytes: new Uint8Array(), sizeBytes: 0 };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let sizeBytes = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    sizeBytes += value.byteLength;
    if (sizeBytes > maxBytes) {
      await reader.cancel();
      throw new IngestError("FETCH_TOO_LARGE", "Image response exceeded byte limit", { maxBytes });
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(sizeBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { bytes: merged, sizeBytes };
}

function readImageDimensions(
  bytes: Uint8Array,
  contentType: string,
): { width: number; height: number } | null {
  try {
    // JPEG: starts with FF D8 FF
    // Dimensions in SOF0 (FF C0) or SOF2 (FF C2) marker
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      let i = 2; // skip FF D8
      while (i < bytes.length - 8) {
        if (bytes[i] !== 0xff) break;
        const marker = bytes[i + 1];
        const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
        // SOF markers: C0, C1, C2, C3, C5, C6, C7, C9, CA, CB, CD, CE, CF
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          // SOF: [FF][marker][length:2][precision:1][height:2][width:2]
          const height = (bytes[i + 5] << 8) | bytes[i + 6];
          const width = (bytes[i + 7] << 8) | bytes[i + 8];
          return { width, height };
        }
        i += 2 + segLen;
      }
      return null;
    }

    // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
    // IHDR chunk at offset 8: [length:4][IHDR:4][width:4][height:4]
    if (contentType.includes("png")) {
      if (bytes.length < 24) return null;
      const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      for (let j = 0; j < 8; j++) {
        if (bytes[j] !== sig[j]) return null;
      }
      const width =
        (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
      const height =
        (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
      return { width: width >>> 0, height: height >>> 0 };
    }

    // WebP: RIFF????WEBP VP8 [space|L|X]
    // VP8  (lossy):  10 bytes in, then [2:tag][2:size][3:frame_tag][width:2][height:2]
    // VP8L (lossless): signature byte then packed width/height
    // VP8X (extended): has canvas width/height at fixed offsets
    if (contentType.includes("webp")) {
      if (bytes.length < 30) return null;
      // Check RIFF header
      if (
        bytes[0] !== 0x52 || bytes[1] !== 0x49 ||
        bytes[2] !== 0x46 || bytes[3] !== 0x46 ||
        bytes[8] !== 0x57 || bytes[9] !== 0x45 ||
        bytes[10] !== 0x42 || bytes[11] !== 0x50
      ) return null;

      const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

      if (chunk === "VP8 " && bytes.length >= 30) {
        // VP8 bitstream: width at bytes 26-27 (14-bit LE), height at 28-29 (14-bit LE)
        const width = ((bytes[27] << 8) | bytes[26]) & 0x3fff;
        const height = ((bytes[29] << 8) | bytes[28]) & 0x3fff;
        return { width, height };
      }

      if (chunk === "VP8L" && bytes.length >= 25) {
        // VP8L: signature 0x2f at byte 20, then packed dimensions
        if (bytes[20] !== 0x2f) return null;
        const b0 = bytes[21], b1 = bytes[22], b2 = bytes[23], b3 = bytes[24];
        const bits = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
        const width = (bits & 0x3fff) + 1;
        const height = ((bits >> 14) & 0x3fff) + 1;
        return { width, height };
      }

      if (chunk === "VP8X" && bytes.length >= 30) {
        // Canvas width at bytes 24-26 (24-bit LE, stored as value-1)
        // Canvas height at bytes 27-29 (24-bit LE, stored as value-1)
        const width = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1;
        const height = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1;
        return { width, height };
      }

      return null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function fetchImageWithGuards(url: string, opts: FetchImageOptions = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const allowSvg = opts.allowSvg ?? false;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const assertSafeUrlImpl = opts.assertSafeUrlImpl ?? assertSafeUrl;

  let currentUrl = (await assertSafeUrlImpl(url)).toString();

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const response = await fetchImpl(currentUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          "user-agent": "ArtioIngestBot/1.0 (+https://artio.co)",
          accept: "image/*",
        },
        signal: abortController.signal,
      });
      clearTimeout(timeout);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new IngestError("FETCH_FAILED", "Redirect response missing location header", { status: response.status });
        if (redirectCount === maxRedirects) throw new IngestError("FETCH_FAILED", "Too many redirects", { maxRedirects });
        currentUrl = (await assertSafeUrlImpl(new URL(location, currentUrl).toString())).toString();
        continue;
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.startsWith("image/")) {
        throw new IngestError("UNSUPPORTED_CONTENT_TYPE", "Only image responses are supported", { contentType });
      }
      if (!allowSvg && contentType.startsWith("image/svg+xml")) {
        throw new IngestError("UNSUPPORTED_CONTENT_TYPE", "SVG images are not supported", { contentType });
      }

      const { bytes, sizeBytes } = await readBodyLimited(response, maxBytes);

      // Dimension gate — only applied when minWidth or minHeight is set
      const minWidth = opts.minWidth;
      const minHeight = opts.minHeight;
      if (minWidth !== undefined || minHeight !== undefined) {
        const dims = readImageDimensions(bytes, contentType);
        if (dims !== null) {
          if (
            (minWidth !== undefined && dims.width < minWidth) ||
            (minHeight !== undefined && dims.height < minHeight)
          ) {
            throw new IngestError(
              "IMAGE_TOO_SMALL",
              "Image dimensions are below the minimum threshold",
              {
                width: dims.width,
                height: dims.height,
                minWidth,
                minHeight,
              },
            );
          }
        }
        // If dims === null (format not parseable), allow through — don't reject
        // images whose format we can't read dimensions for
      }

      return { bytes, contentType, finalUrl: currentUrl, sizeBytes };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof IngestError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new IngestError("FETCH_TIMEOUT", "Timed out fetching image URL", { timeoutMs });
      }
      throw new IngestError("FETCH_FAILED", "Unable to fetch image URL", {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw new IngestError("FETCH_FAILED", "Unexpected fetch redirect flow");
}
