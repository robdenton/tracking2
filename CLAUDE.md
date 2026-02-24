# Claude Instructions — Marketing Activity Impact

## Project
Next.js marketing measurement tool. Tracks newsletter, podcast, YouTube, LinkedIn, and X activities. Computes incremental uplift above baseline for each activity using a 14-day pre/post window model.

## Critical: Always use production database for analysis
- **Local `dev.db` (SQLite) is a test database and is out of sync with production.**
- Always use the **Neon Postgres production DB** for any analysis or data queries.
- The production `DATABASE_URL` is in Vercel environment variables. If not available in the current session, ask the user for it before proceeding.
- Prisma client is at `node_modules/@prisma/client/index.js` (root of project).

## Newsletter analysis
When asked to run a newsletter performance analysis or CEO update:
1. Read `docs/newsletter-analysis.md` first — it contains the full methodology, decision criteria, report structure, and any feedback that has been applied.
2. Query production Neon Postgres directly using the Prisma client.
3. Follow the report structure and decision framework exactly as documented.
4. If the user gives feedback on the report, update `docs/newsletter-analysis.md` and commit the change.

## Key technical facts
- Post-window lengths: newsletter = 2 days, podcast = 5 days, all others = 7 days (config default)
- Baseline window: 14 days before activity date
- Proportional attribution (click-share credit splitting) is applied for newsletters in the app, but NOT in ad-hoc DB queries — flag this caveat in any analysis
- Channel filter tabs on homepage are dynamic (from DB data) — podcast tab only appears once podcast activities are imported via Google Sheets sync
- `ACTIVITY_TABS` env var controls which Google Sheet tabs are imported (currently: Newsletter, YouTube, Socials, LinkedIn, Podcast)

## Measurement page
Deep-link anchors: `#account-created`, `#nau`, `#enau`, `#incremental-account-created`, `#incremental-nau`, `#cpa`

## Stack
- Next.js 16 App Router, Prisma ORM, Tailwind CSS, Neon Postgres (prod) / SQLite (local)
- Core measurement package: `packages/core/src/`
- Web app: `apps/web/src/app/`
- Data functions: `apps/web/src/lib/data.ts`
