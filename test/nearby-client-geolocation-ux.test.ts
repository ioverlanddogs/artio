import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("nearby client shows current location CTA and hardened geolocation options", async () => {
  const source = await readFile(new URL("../app/nearby/nearby-client.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("Use my current location"), true);
  assert.equal(source.includes("timeout: 10000"), true);
  assert.equal(source.includes("maximumAge: 300000"), true);
  assert.equal(source.includes("enableHighAccuracy: false"), true);
});
