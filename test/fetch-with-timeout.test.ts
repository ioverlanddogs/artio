import test from "node:test";
import assert from "node:assert/strict";
import { FetchTimeoutError, fetchWithTimeout } from "@/lib/fetch-with-timeout";

test("fetchWithTimeout throws FetchTimeoutError on abort", async () => {
  const originalFetch = global.fetch;

  try {
    global.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }) as typeof fetch;

    await assert.rejects(() => fetchWithTimeout("https://example.com", {}, 5), FetchTimeoutError);
  } finally {
    global.fetch = originalFetch;
  }
});
