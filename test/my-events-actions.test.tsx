import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { submitEventForReviewRequest } from "../app/my/_components/MyEventSubmitButton";

test("my events actions do not link directly to submit/revisions API routes", async () => {
  const pageSource = await readFile(new URL("../app/my/events/page.tsx", import.meta.url), "utf8");

  assert.equal(pageSource.includes("href={`/api/my/events/"), false);
  assert.equal(pageSource.includes("/submit`}"), false);
  assert.equal(pageSource.includes("href={`/api/my/venues/"), false);
  assert.equal(pageSource.includes("/revisions`}"), false);
});

test("submit event action posts to submit API route", async () => {
  let calledUrl = "";
  let calledInit: RequestInit | undefined;

  const result = await submitEventForReviewRequest({
    eventId: "event_123",
    fetchImpl: async (input: URL | RequestInfo, init?: RequestInit) => {
      calledUrl = String(input);
      calledInit = init;
      return new Response(null, { status: 204 });
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(calledUrl, "/api/my/events/event_123/submit");
  assert.equal(calledInit?.method, "POST");
  assert.equal((calledInit?.headers as Record<string, string>)?.["Content-Type"], "application/json");
  assert.equal(calledInit?.body, "{}");
});
