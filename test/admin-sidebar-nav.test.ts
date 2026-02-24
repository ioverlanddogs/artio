import test from "node:test";
import assert from "node:assert/strict";
import { isRouteActive } from "../app/(admin)/admin/_components/admin-sidebar-nav-utils";

test("isRouteActive marks nested admin routes active by segment", () => {
  assert.equal(isRouteActive("/admin/events/123", "/admin/events"), true);
  assert.equal(isRouteActive("/admin/events", "/admin/events"), true);
});

test("isRouteActive avoids false positives on similar prefixes", () => {
  assert.equal(isRouteActive("/admin/event", "/admin/events"), false);
  assert.equal(isRouteActive("/admin/events-archive", "/admin/events"), false);
});
