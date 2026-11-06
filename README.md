# Makarios Client Intelligence Dashboard

A client-facing SEO performance portal for Makarios Marketing. This is a
**presentation mockup** — the full UI, interactions and data shapes are real;
the numbers are demo data pending the API integrations.

**Demo client:** Americana Iron Works & Fence (`americanafence.com`)

---

## Running it

It is a static site with **no build step and no dependencies**, plus one
serverless function in `api/`. Open `index.html` directly for the offline
demo, or run it with the live endpoint:

```bash
vercel dev          # needs LD_API_KEY in .env.local (git-ignored)
```

**Demo sign-in:** the credentials are pre-filled — just press *Sign in to dashboard*.

---

## What's in it

### Screens
| Screen | Shows |
|---|---|
| **Overview** | KPI row, click trend, keyword table, local grid, AI visibility, work completed |
| **Search Rankings** | GSC-style date picker + comparison, clicks/impressions toggle, per-keyword change table |
| **Local Map Grid** | Real Local Dominator captures per keyword, coverage breakdown, modelled 7×7 grid |
| **Website Analytics** | GA4 — sessions, users, engagement, conversions, channels, devices, landing pages |
| **Business Profile** | GBP rating, reviews, response rate, and the four customer actions |
| **AI Visibility** | Citation rate across ChatGPT, Google AI Overviews, Copilot, Perplexity |
| **Competitors** | Share of local voice, five-dimension comparison, intelligence modules |
| **Backlinks** | Referring domain growth, total links, domain authority |
| **Action Plan** | Prioritised recommendations ranked by impact vs. effort |
| **Reports** | Monthly PDF reports and audits |

### Date range & comparison (Search Rankings)
Modelled on Google Search Console: a preset picker (7 days → 12 months) plus a
**Custom range** with real date inputs and a live day count, and a separate
comparison selector (previous period / same period last year / custom / none).
Changing either repaints the chart, the legend and the keyword table, which
shows the current value, the prior value, and the percentage change per keyword.

### Local Dominator — live
The Local Map Grid (and the Overview's map card) pull **live scans from the
Local Dominator API** through `/api/local-grid`, a Vercel function that keeps
the API key server-side. For each tracked keyword it shows the latest scan:
Local Dominator's own heat-map image, the real rank grid (any size up to
21×21), average rank and its change since the previous scan, a rank trend,
the high/medium/low/not-found split, and links to the interactive map and
scan report.

It reads both **one-time scans** (`GET /v1/scans`) and **scheduled
campaigns** (`/v1/scheduled-scans` → runs), keeps the newest scan per
keyword and builds history from the rest. Responses are cached at Vercel's
edge for 5 minutes.

#### Fresh scans on request
Each keyword has a **Request a fresh scan** button (click twice — scans
spend credits). It calls `POST /api/local-scan`, which runs the keyword's
own monthly campaign immediately ("run now"); the page polls
`GET /api/local-scan` every 20 s and swaps in the new scan when it lands.
The server — not the button — enforces, by reading Local Dominator itself:
one requested scan per keyword every **7 days** (any scan of the keyword
counts), never while one is already running, and only for keywords with
their **own single-keyword campaign** (running a multi-keyword campaign
would bill every keyword in it). Requests need an `X-Dashboard: 1` header,
so other sites cannot trigger scans from a visitor's browser. Out of
credits returns `no_credits`.

#### Monthly scans (one-time setup per client)
```bash
node scripts/ld-monthly-setup.js amf           # dry run: plan + pins per month
node scripts/ld-monthly-setup.js amf --apply   # create the campaigns
```
Creates one monthly campaign per keyword (1st of the month, 13:00 UTC),
copying the grid of that keyword's latest scan so results stay comparable,
and skips keywords that already have one. These campaigns are also what
switch on the fresh-scan button. Reads `LD_API_KEY` from `.env.local`
(git-ignored). Runs locally only — the website cannot create campaigns.

If the key is missing, Local Dominator is down, or the page is opened as a
local file, the view falls back to the saved **August 2026 captures** in
`assets/img/local/` and says so (amber "Saved capture" chip — hover it for
the reason). If a map image will not load, the scan's rank grid is drawn in
its place.

**Setup:** add `LD_API_KEY` in Vercel → Project → Settings → Environment
Variables, then redeploy. **Adding a client:** add an entry to
[`api/_lib/clients.js`](api/_lib/clients.js) with the same id as in
`data.js` — set `placeId` (Google Place ID) for exact matching.

Tests: `node --test tests/local-grid.test.js` (mocked API, no key needed).

### Interaction
- Login / logout with a profile menu (details, notifications, data sources, settings)
- Client switcher for the agency view
- Light / dark theme, persisted to `localStorage`
- Date-range selector, table-view toggles, CSV/PDF export affordances
- Tooltips on every metric, written in plain language for non-SEO readers
- Animated buttons (ripple + sheen), card entrance stagger, number count-ups,
  chart draw-in, animated geo-grid
- Responsive to phone width; `⌘K` focuses search, `Esc` closes overlays
- Honours `prefers-reduced-motion` and has a print stylesheet

---

## Design decisions worth knowing

**Brand colour is sampled from makariosmarketing.com.** `#0f5a34` is the primary
green, with `#124f2e` / `#003f18` deeps and `#9fe29f` as the mint accent.

**Chart colours are not the brand colour.** `#0f5a34` fails as a data-series
colour — it is too dark and too low-chroma, so it reads as grey on a chart. The
brand green drives the UI chrome; the series palette is separate and was
validated with the data-viz validator across all six checks in **both** light
and dark modes:

| Slot | Light | Dark |
|---|---|---|
| 1 — client | `#2ba24a` | `#2eaa55` |
| 2 | `#2a78d6` | `#3987e5` |
| 3 | `#eb6834` | `#d95926` |
| 4 | `#4a3aa7` | `#9085e9` |

Ordering matters: blue and violet collide under protanopia on a dark surface, so
they are never adjacent. Scatter-type charts cap at the first three slots.

**One axis, always.** No chart uses a second y-scale. "This period vs. previous
period" works because both series share a unit.

**The local grid is sequential, not a rainbow.** A green→yellow→red heatmap is
the local-SEO convention but fails colour-blind checks. This uses a single-hue
ramp (darker = better) **and prints the rank number in every cell**, so colour is
never the only encoding.

**Share of voice is an emphasis chart** — the client in brand green, competitors
in a de-emphasis grey, bars scaled to the leader so the set uses the full track.

---

## Wiring up real data

All demo data lives in [`assets/js/data.js`](assets/js/data.js), keyed close to
the real API field names so the swap is mechanical. Replace each block with a
fetch:

| Block | Source |
|---|---|
| `kpis`, `traffic`, `keywords` | Google Search Console API |
| `kpis.conversions` | GA4 Data API |
| `gbp` | Google Business Profile API |
| `localDominator`, `geoGrid` | ✅ **Live** — Local Dominator API via `/api/local-grid` (demo values are the fallback) |
| `competitors`, `recommendations`, `modules` | Makarios competitor-analysis suite |
| `backlinks` | Moz / Ahrefs |

The `modules` list maps 1:1 to the existing Makarios audit skills
(`keyword-gap-audit`, `backlink-gap-audit`, `content-gap`, `gbp-category-audit`,
`citation-audit`, `review-sentiment`, `entity-optimization`, `intent-keyword-map`).

### Before this goes live
This mockup has **no authentication** — the login screen is a visual prop. A
production build needs real auth, per-client data scoping, server-side API
credential storage (never client-side OAuth tokens), and an audit trail.

Until real auth exists, `/api/local-grid?client=<id>` is public: anyone with
the URL can read that client's map rankings. It only serves clients listed in
`api/_lib/clients.js` and never exposes the API key, but per-client access
control belongs in front of it before real clients get logins.

The same goes for `/api/local-scan`: anyone with the URL can start fresh
scans. The 7-day limit caps the worst case at one scan per keyword per week
(for Americana, roughly the same credits as one extra monthly run per
week), but it should sit behind real logins too.

---

## Structure

```
index.html                  markup + inline SVG icon sprite
assets/css/styles.css       design tokens, core components, light/dark, responsive
assets/css/components.css   date controls, Local Dominator, GA4
assets/js/data.js           all demo data — the only file to replace
assets/js/charts.js         dependency-free SVG charts
assets/js/modules.js        date range + comparison, Local Dominator, GA4
assets/js/app.js            rendering, tooltips, nav, theme, auth flow
assets/img/local/*.webp     saved Local Dominator captures (offline fallback)
api/local-grid.js           serverless endpoint — live Local Dominator data
api/local-scan.js           serverless endpoint — start / track a fresh scan
scripts/ld-monthly-setup.js one-time monthly campaign setup (local only)
api/_lib/localDominator.js  Local Dominator API client + normalisation
api/_lib/clients.js         which scans belong to which client
tests/                      endpoint tests (excluded from deploys)
vercel.json                 caching + security headers, function limits
```

### A note on chart sizing
Every chart measures its container and builds the viewBox in CSS pixels, so one
SVG unit is one pixel. A fixed viewBox stretched with `preserveAspectRatio="none"`
scales the axis *text* along with the geometry — that is what makes a chart look
blurry and oversized on a wide screen. If you add a chart, measure first.

## Deploying

Vercel auto-detects it as a static site — no framework preset, no build command,
output directory is the repo root. Push to `main` and it ships.

---

© 2026 Makarios Marketing
