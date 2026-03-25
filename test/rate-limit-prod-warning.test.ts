import test from "node:test";
import assert from "node:assert/strict";
import { __resetRateLimitWarningsForTests, enforceRateLimit } from "@/lib/rate-limit";

test("rate limit throws in production when Redis unavailable", async () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL;
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    __resetRateLimitWarningsForTests();

    await assert.rejects(
      () => enforceRateLimit({
        key: "prod-throw-test",
        limit: 10,
        windowMs: 1000,
      }),
      (err: Error) => {
        assert.match(err.message, /Upstash Redis is unavailable in production/);
        return true;
      },
    );
  } finally {
    if (prevNodeEnv == null) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevVercel == null) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
    if (prevUrl == null) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    if (prevToken == null) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    __resetRateLimitWarningsForTests();
  }
});
