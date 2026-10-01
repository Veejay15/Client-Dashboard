# Makarios Client Intelligence Dashboard

A client-facing SEO performance portal for Makarios Marketing. This is a
**presentation mockup** — the full UI, interactions and data shapes are real;
the numbers are demo data pending the API integrations.

**Demo client:** Americana Iron Works & Fence (`americanafence.com`)

---

## Running it

It is a static site with **no build step and no dependencies**. Open
`index.html` directly, or serve the folder:

```bash
npx serve .
```

**Demo sign-in:** the credentials are pre-filled — just press *Sign in to dashboard*.

---

## What's in it

### Screens
| Screen | Shows |
|---|---|
| **Overview** | KPI row, click trend, keyword table, local grid, AI visibility, work completed |
| **Search Rankings** | All tracked keywords with position, movement, landing page, buyer stage |
| **Local Map Grid** | 7×7 geo-grid of Google Maps rank by location, plus coverage summary |
| **Business Profile** | GBP rating, reviews, response rate, and the four customer actions |
| **AI Visibility** | Citation rate across ChatGPT, Google AI Overviews, Copilot, Perplexity |
| **Competitors** | Share of local voice, five-dimension comparison, intelligence modules |
| **Backlinks** | Referring domain growth, total links, domain authority |
| **Action Plan** | Prioritised recommendations ranked by impact vs. effort |
| **Reports** | Monthly PDF reports and audits |

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
| `geoGrid` | Local Dominator API |
| `competitors`, `recommendations`, `modules` | Makarios competitor-analysis suite |
| `backlinks` | Moz / Ahrefs |

The `modules` list maps 1:1 to the existing Makarios audit skills
(`keyword-gap-audit`, `backlink-gap-audit`, `content-gap`, `gbp-category-audit`,
`citation-audit`, `review-sentiment`, `entity-optimization`, `intent-keyword-map`).

### Before this goes live
This mockup has **no authentication** — the login screen is a visual prop. A
production build needs real auth, per-client data scoping, server-side API
credential storage (never client-side OAuth tokens), and an audit trail.

---

## Structure

```
index.html              markup + inline SVG icon sprite
assets/css/styles.css   design tokens, components, light/dark, responsive
assets/js/data.js       all demo data — the only file to replace
assets/js/charts.js     dependency-free SVG charts
assets/js/app.js        rendering, tooltips, nav, theme, auth flow
vercel.json             caching + security headers
```

## Deploying

Vercel auto-detects it as a static site — no framework preset, no build command,
output directory is the repo root. Push to `main` and it ships.

---

© 2026 Makarios Marketing
