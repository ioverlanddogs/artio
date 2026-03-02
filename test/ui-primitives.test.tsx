import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Skeleton } from "../components/ui/skeleton";
import { LoadingCard } from "../components/ui/loading-card";
import { ErrorCard } from "../components/ui/error-card";
;(globalThis as any).React = React

test("Skeleton renders base styles", () => {
  const html = renderToStaticMarkup(<Skeleton className="h-4 w-10" />);
  assert.match(html, /animate-pulse/);
  assert.match(html, /h-4/);
});

test("LoadingCard renders loading region", () => {
  const html = renderToStaticMarkup(<LoadingCard lines={2} />);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Loading/);
});

test("ErrorCard renders retry button when provided", () => {
  const html = renderToStaticMarkup(<ErrorCard message="Failed" onRetry={() => undefined} />);
  assert.match(html, /Failed/);
  assert.match(html, /Retry/);
});
