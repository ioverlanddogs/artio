# SEO — Artpulse

- SSR/server components for public discovery and detail pages
- Rich metadata (title/description)
- OpenGraph + Twitter cards
- `sitemap.xml` includes published/discoverable entities
- `robots.txt` is generated via `app/robots.ts` and currently disallows:
  - `/admin`
  - `/login`
  - `/account`
  - `/api`
- Structured data support for event/place-oriented surfaces where applicable

Keep this document aligned with `app/robots.ts` when disallow rules change.
