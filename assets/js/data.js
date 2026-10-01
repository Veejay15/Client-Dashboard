/* ==========================================================================
   DEMO DATA  —  Makarios Client Intelligence Dashboard
   --------------------------------------------------------------------------
   Everything here is illustrative mock data shaped like the real API payloads
   (GSC, GA4, GBP, Local Dominator). Swap each block for a live fetch when the
   integrations are wired. Keys are intentionally close to the real API field
   names so the migration is mechanical.
   ========================================================================== */

const DEMO = {

  /* ---------------------------------------------------------------- account */
  user: {
    name: "Jason Thompson",
    initials: "JT",
    email: "jason@americanafence.com",
    role: "Owner",
    lastLogin: "Today, 8:42 AM"
  },

  agency: {
    name: "Makarios Marketing",
    strategist: "Veejay Guibone",
    strategistInitials: "VG"
  },

  /* ---------------------------------------------------------------- clients */
  clients: [
    { id: "amf", name: "Americana Iron Works & Fence", short: "AF", domain: "americanafence.com", plan: "Local SEO — Growth", active: true },
    { id: "apg", name: "A Plus Garage Doors", short: "AP", domain: "aplusgaragedoors.com", plan: "Local SEO — Pro", active: false },
    { id: "jit", name: "Junk In The Truck", short: "JT", domain: "junkinthetruck.com", plan: "Local SEO — Growth", active: false },
    { id: "lhv", name: "Lincolnton Home VA", short: "LH", domain: "lincolntonhomeva.com", plan: "Local SEO — Starter", active: false }
  ],

  /* ------------------------------------------------------------------- KPIs
     delta = % change vs the previous period of equal length               */
  kpis: [
    {
      id: "clicks",
      label: "Organic Clicks",
      value: 1284,
      delta: 18.4,
      spark: [612, 648, 701, 689, 744, 798, 812, 876, 903, 968, 1044, 1118, 1206, 1284],
      icon: "cursor",
      source: "Google Search Console",
      tip: "Total clicks from Google organic search results to the website. This is the closest thing to 'free traffic earned' — it excludes ads, direct visits and referrals."
    },
    {
      id: "impressions",
      label: "Impressions",
      value: 148200,
      format: "compact",
      delta: 24.1,
      spark: [71000, 74500, 79200, 83100, 88400, 92700, 97300, 104000, 112500, 119800, 127400, 134900, 141600, 148200],
      icon: "eye",
      source: "Google Search Console",
      tip: "How many times a page from this site appeared in Google search results. Rising impressions mean the site is being shown for more searches — the first step before clicks grow."
    },
    {
      id: "calls",
      label: "Phone Calls",
      value: 213,
      delta: 31.7,
      spark: [92, 104, 98, 118, 126, 131, 142, 149, 158, 171, 182, 194, 203, 213],
      icon: "phone",
      source: "Google Business Profile",
      tip: "Calls placed directly from the Google Business Profile listing. These are high-intent — the caller found the business on Google Maps and tapped Call."
    },
    {
      id: "localpack",
      label: "Map Pack Keywords",
      value: 34,
      delta: 41.6,
      spark: [12, 14, 15, 17, 18, 21, 22, 24, 26, 27, 29, 31, 32, 34],
      icon: "pin",
      source: "Local Dominator",
      tip: "Keywords where the business now appears in Google's local 3-pack (the map results at the top). Map pack placement typically drives 3–5x the calls of a standard organic listing."
    },
    {
      id: "avgpos",
      label: "Avg. Position",
      value: 8.4,
      decimals: 1,
      delta: 26.3,
      // Position falls as it improves, so the raw % would read backwards.
      deltaLabel: "5.8 positions",
      invertDelta: true,
      spark: [14.2, 13.8, 13.1, 12.6, 12.2, 11.7, 11.1, 10.6, 10.2, 9.8, 9.4, 9.0, 8.7, 8.4],
      icon: "trend",
      source: "Google Search Console",
      tip: "Average ranking position across all tracked keywords. Lower is better — position 8.4 means the site sits near the bottom of page 1 on average. Crossing below 10 means page 1."
    },
    {
      id: "conversions",
      label: "Form Leads",
      value: 87,
      delta: 22.5,
      spark: [38, 41, 44, 47, 49, 53, 58, 61, 66, 70, 74, 79, 83, 87],
      icon: "inbox",
      source: "Google Analytics 4",
      tip: "Quote-request form submissions tracked as a GA4 conversion event. Combined with phone calls, this is the true lead volume the SEO campaign produced."
    }
  ],

  /* ------------------------------------------------------- traffic timeline
     Same unit on one axis (clicks). Previous period is the comparison
     baseline — never a second y-axis.                                     */
  traffic: {
    labels: ["Apr 1", "Apr 15", "May 1", "May 15", "Jun 1", "Jun 15", "Jul 1", "Jul 15", "Aug 1", "Aug 15", "Sep 1", "Sep 15"],
    current:  [58, 64, 71, 69, 78, 84, 91, 97, 104, 112, 121, 134],
    previous: [51, 53, 56, 54, 58, 61, 63, 66, 68, 71, 74, 79]
  },

  /* ------------------------------------------------ Local Dominator maps
     Real August 2026 Local Dominator captures for this account. Every stat
     here is read off the capture itself, so the panel and the image always
     agree. Replace `img` with a live render once the API is connected.     */
  localDominator: {
    business: "Americana Iron Works & Fence",
    address: "939 W North Ave, Chicago, IL 60642",
    captured: "August 2026",
    tarp: 7.45,
    keywords: [
      { kw: "Chicago wrought iron gates",      img: "wrought-iron-gates",       avg: 2.59, high: 80, med: 20, low: 0,  competitors: 48 },
      { kw: "metal fence installation Chicago",img: "metal-fence-installation", avg: 2.72, high: 75, med: 25, low: 0,  competitors: 55 },
      { kw: "fence installation chicago",      img: "fence-installation",       avg: 3.67, high: 53, med: 47, low: 0,  competitors: 78 },
      { kw: "fence repair chicago",            img: "fence-repair",             avg: 3.77, high: 62, med: 33, low: 5,  competitors: 77 },
      { kw: "chicago fence company",           img: "fence-company",            avg: 5.85, high: 26, med: 51, low: 23, competitors: 47 },
      { kw: "fence contractor chicago",        img: "fence-contractor",         avg: 5.96, high: 41, med: 40, low: 19, competitors: 53 }
    ]
  },

  /* ---------------------------------------------------- local grid rankings
     7x7 geo grid centred on the business. Values are the ranking position
     returned for the primary keyword at each lat/lng sample point.         */
  geoGrid: {
    keyword: "fence installation chicago",
    center: "Americana Iron Works & Fence — 939 W North Ave",
    radius: "5 mi",
    cells: [
      11, 9, 7, 6, 8, 12, 15,
       8, 6, 4, 3, 5,  9, 13,
       6, 4, 2, 2, 3,  6, 10,
       5, 3, 1, 1, 2,  4,  8,
       6, 4, 2, 2, 3,  5,  9,
       9, 7, 5, 4, 6,  8, 12,
      13, 11, 9, 8, 10, 13, 17
    ],
    avgRank: 6.9,
    avgRankPrev: 11.2,
    top3Share: 24,
    top3SharePrev: 8
  },

  /* -------------------------------------------------------------- keywords */
  /* clicks / impressions / ctr are the current period; the `p` fields are the
     same metrics for the comparison period, so the GSC-style compare view can
     diff them without a second request shape. */
  keywords: [
    { kw: "fence installation chicago",       vol: 1300, pos: 3,  prev: 9,  clicks: 184, pClicks: 96,  impr: 9400, pImpr: 7100, url: "/fence-installation", intent: "Ready to hire" },
    { kw: "chicago fence company",            vol: 880,  pos: 2,  prev: 6,  clicks: 151, pClicks: 88,  impr: 8100, pImpr: 6400, url: "/", intent: "Ready to hire" },
    { kw: "Chicago wrought iron gates",       vol: 720,  pos: 5,  prev: 11, clicks: 118, pClicks: 54,  impr: 6900, pImpr: 4800, url: "/wrought-iron-gates", intent: "Ready to hire" },
    { kw: "metal fence installation Chicago", vol: 590,  pos: 7,  prev: 14, clicks:  94, pClicks: 41,  impr: 5600, pImpr: 3900, url: "/metal-fencing", intent: "Ready to hire" },
    { kw: "fence contractor chicago",         vol: 410,  pos: 4,  prev: 4,  clicks:  87, pClicks: 79,  impr: 4800, pImpr: 4500, url: "/services", intent: "Ready to hire" },
    { kw: "fence repair chicago",             vol: 390,  pos: 11, prev: 19, clicks:  62, pClicks: 24,  impr: 4100, pImpr: 2600, url: "/fence-repair", intent: "Ready to hire" },
    { kw: "fence painting chicago",           vol: 320,  pos: 6,  prev: 12, clicks:  48, pClicks: 21,  impr: 3300, pImpr: 2200, url: "/fence-painting", intent: "Solution aware" },
    { kw: "fence installation hyde park",     vol: 260,  pos: 8,  prev: 7,  clicks:  39, pClicks: 42,  impr: 2700, pImpr: 2800, url: "/areas/hyde-park", intent: "Ready to hire" },
    { kw: "how much does an iron fence cost", vol: 1900, pos: 14, prev: 22, clicks:  34, pClicks: 11,  impr: 7800, pImpr: 3100, url: "/blog/iron-fence-cost", intent: "Problem aware" },
    { kw: "fence contractor north center",    vol: 480,  pos: 16, prev: 16, clicks:  21, pClicks: 19,  impr: 2400, pImpr: 2300, url: "/areas/north-center", intent: "Ready to hire" },
    { kw: "residential iron fence chicago",   vol: 350,  pos: 9,  prev: 15, clicks:  44, pClicks: 18,  impr: 3100, pImpr: 2000, url: "/residential", intent: "Ready to hire" },
    { kw: "fence installation buena park",    vol: 210,  pos: 12, prev: 18, clicks:  17, pClicks:  7,  impr: 1900, pImpr: 1300, url: "/areas/buena-park", intent: "Ready to hire" }
  ],

  /* --------------------------------------------------------- GA4 analytics
     Behaviour and acquisition — what people did once they landed.          */
  ga4: {
    kpis: [
      { id: "sessions", label: "Sessions", value: 3847, delta: 21.3, spark: [1920,2040,2180,2260,2410,2580,2710,2880,3060,3240,3420,3610,3740,3847], icon: "users", source: "Google Analytics 4", tip: "A session is one visit to the website. One person can start several sessions across a month — this counts visits, not people." },
      { id: "users", label: "Active Users", value: 2914, delta: 18.9, spark: [1510,1600,1690,1760,1870,1980,2080,2190,2320,2450,2580,2710,2840,2914], icon: "user", source: "Google Analytics 4", tip: "Unique people who visited at least once. Lower than sessions because repeat visitors are only counted once." },
      { id: "engagement", label: "Engagement Rate", value: 64.2, decimals: 1, suffix: "%", delta: 9.4, spark: [52.1,53.4,54.8,55.9,57.2,58.4,59.1,60.3,61.2,62.0,62.8,63.4,63.9,64.2], icon: "spark", source: "Google Analytics 4", tip: "Share of sessions that lasted over 10 seconds, had a conversion, or viewed 2+ pages. GA4's replacement for bounce rate — higher is better." },
      { id: "avgtime", label: "Avg. Engagement", value: 112, suffix: "s", delta: 14.7, spark: [78,81,84,86,89,92,95,98,101,104,107,109,111,112], icon: "clock", source: "Google Analytics 4", tip: "Average time a visitor actively spent on the site per session. Rising time usually means the content is answering the question people arrived with." },
      { id: "convrate", label: "Conversion Rate", value: 3.8, decimals: 1, suffix: "%", delta: 26.7, spark: [2.1,2.2,2.3,2.4,2.6,2.7,2.9,3.0,3.2,3.3,3.5,3.6,3.7,3.8], icon: "target", source: "Google Analytics 4", tip: "Share of sessions that completed a quote request or call. This is the number that turns traffic into revenue — it matters more than raw session growth." },
      { id: "newusers", label: "New Users", value: 2341, delta: 23.8, spark: [1180,1250,1320,1390,1470,1560,1650,1740,1850,1960,2070,2180,2280,2341], icon: "up", source: "Google Analytics 4", tip: "First-time visitors in this period. Healthy local SEO should keep this climbing — it means reach is expanding, not just the same people returning." }
    ],
    /* Acquisition channels — part-to-whole, so a single stacked bar. */
    channels: [
      { name: "Organic Search", sessions: 2418, pct: 62.9, delta: 28.4 },
      { name: "Direct",         sessions: 684,  pct: 17.8, delta: 12.1 },
      { name: "Google Maps",    sessions: 412,  pct: 10.7, delta: 34.2 },
      { name: "Referral",       sessions: 201,  pct: 5.2,  delta: 8.6 },
      { name: "Social",         sessions: 132,  pct: 3.4,  delta: -4.3 }
    ],
    devices: [
      { name: "Mobile",  pct: 68.4, sessions: 2631 },
      { name: "Desktop", pct: 26.1, sessions: 1004 },
      { name: "Tablet",  pct: 5.5,  sessions: 212 }
    ],
    landingPages: [
      { url: "/",                       sessions: 1142, rate: 4.2, time: 98 },
      { url: "/fence-installation",     sessions: 684,  rate: 5.8, time: 142 },
      { url: "/wrought-iron-gates",     sessions: 521,  rate: 6.1, time: 156 },
      { url: "/fence-repair",           sessions: 398,  rate: 3.4, time: 104 },
      { url: "/blog/iron-fence-cost",   sessions: 347,  rate: 1.2, time: 187 },
      { url: "/metal-fencing",          sessions: 289,  rate: 4.9, time: 121 },
      { url: "/areas/hyde-park",        sessions: 164,  rate: 3.1, time: 88 }
    ],
    /* Conversion events, same unit — one axis. */
    events: {
      labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
      values: [61, 72, 84, 97, 118, 147]
    }
  },

  /* ------------------------------------------------------- competitor set
     Share of local voice across the tracked keyword set.
     Series order matches the validated categorical palette.               */
  competitors: {
    labels: ["Map pack\npresence", "Avg. position", "Review count", "Domain\nauthority", "Content\ndepth"],
    entities: [
      { name: "Americana Fence", isClient: true,  series: 1, scores: [68, 72, 54, 48, 61] },
      { name: "Sterling Ironworks", isClient: false, series: 2, scores: [81, 76, 88, 67, 54] },
      { name: "Heritage Fence Co.", isClient: false, series: 3, scores: [55, 61, 72, 59, 44] },
      { name: "Apex Gate & Fence",  isClient: false, series: 4, scores: [47, 52, 41, 43, 38] }
    ],
    table: [
      { name: "Sterling Ironworks", sov: 31.4, kws: 412, reviews: 287, rating: 4.8, da: 34, gap: "Leads on reviews + DA" },
      { name: "Americana Fence",    sov: 24.8, kws: 318, reviews: 142, rating: 4.9, da: 24, gap: "Highest rating, fewest reviews", isClient: true },
      { name: "Heritage Fence Co.", sov: 19.2, kws: 266, reviews: 198, rating: 4.6, da: 29, gap: "Strong local citations" },
      { name: "Apex Gate & Fence",  sov: 12.1, kws: 174, reviews:  86, rating: 4.4, da: 21, gap: "Weakest overall — overtake first" },
      { name: "All others",         sov: 12.5, kws: null, reviews: null, rating: null, da: null, gap: "Long tail of 14 smaller firms" }
    ]
  },

  /* ----------------------------------------------- Google Business Profile */
  gbp: {
    rating: 4.9,
    reviews: 142,
    reviewsDelta: 23,
    responseRate: 96,
    views: 18400,
    viewsDelta: 27.8,
    actions: [
      { label: "Phone calls",        value: 213, delta: 31.7 },
      { label: "Direction requests", value: 164, delta: 19.2 },
      { label: "Website clicks",     value: 391, delta: 24.6 },
      { label: "Message requests",   value:  48, delta: 54.8 }
    ],
    photosThisMonth: 18,
    postsThisMonth: 11
  },

  /* ---------------------------------------------------------- AI visibility
     Citation rate = how often the business is named in an AI answer for the
     tracked question set.                                                  */
  aiVisibility: {
    overall: 34,
    overallPrev: 11,
    sources: [
      { name: "ChatGPT Search", short: "GPT", rate: 41, queries: 120, note: "Cited in 49 of 120 tracked prompts" },
      { name: "Google AI Overviews", short: "AIO", rate: 36, queries: 120, note: "Appears in 43 of 120 AI Overviews" },
      { name: "Microsoft Copilot", short: "CP", rate: 29, queries: 120, note: "Cited in 35 of 120 tracked prompts" },
      { name: "Perplexity", short: "PX", rate: 27, queries: 120, note: "Cited in 32 of 120 tracked prompts" }
    ]
  },

  /* ------------------------------------------------------------- backlinks */
  backlinks: {
    labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    referring: [42, 48, 57, 66, 78, 91],
    total: 318,
    da: 24,
    daPrev: 18,
    newThisMonth: 13,
    lost: 2
  },

  /* ------------------------------------------------- SEO recommendations
     Generated by the Makarios competitor-analysis skill suite.             */
  recommendations: [
    {
      title: "Fix brand-term click-through on Bing",
      severity: "crit",
      severityLabel: "Critical",
      desc: "The brand query \"americana iron works & fence\" returns 25 impressions at position 2.5 but zero clicks. A directory listing is outranking the homepage and absorbing the traffic.",
      impact: "High", effort: "Low", source: "money-page-audit"
    },
    {
      title: "Close the review gap against Sterling Ironworks",
      severity: "serious",
      severityLabel: "High",
      desc: "Rating is higher (4.9 vs 4.8) but review count trails by 145. At the current velocity of 23/mo the gap closes in roughly 7 months — a review request script would cut that to 4.",
      impact: "High", effort: "Medium", source: "gbp-review-teardown"
    },
    {
      title: "Add 4 missing GBP categories",
      severity: "serious",
      severityLabel: "High",
      desc: "All three competitors carry \"Gate contractor\", \"Welder\", \"Metal fabricator\" and \"Fence supplier\" as secondary categories. The profile currently has none of them.",
      impact: "High", effort: "Low", source: "gbp-category-audit"
    },
    {
      title: "Build 6 service-city landing pages",
      severity: "warn",
      severityLabel: "Medium",
      desc: "The site ranks for the metro but has no dedicated pages for the 6 outlying service areas named on the contact page. Each is a 150–400/mo keyword cluster with no competition.",
      impact: "Medium", effort: "High", source: "service-city-pages"
    },
    {
      title: "Capture 11 page-2 keywords",
      severity: "warn",
      severityLabel: "Medium",
      desc: "11 keywords sit in positions 11–20 with 100+ monthly impressions each. Title tag and first-100-words optimisation moves most of these to page 1 within 30 days.",
      impact: "Medium", effort: "Low", source: "gsc-page2-sprint"
    }
  ],

  /* ------------------------------------------------- work completed / feed */
  activity: [
    { type: "done", title: "Published 'Aluminum vs Iron Fence' guide", meta: "1,840 words · targets 3 keywords", time: "2d ago" },
    { type: "done", title: "Added 18 geotagged GBP photos", meta: "Project galleries + team shots", time: "4d ago" },
    { type: "live", title: "Backlink outreach — 13 new referring domains", meta: "Local chamber, 2 trade directories, 10 niche blogs", time: "1w ago" },
    { type: "done", title: "Rebuilt /custom-gates page", meta: "New H1, schema markup, 6 project photos", time: "1w ago" },
    { type: "done", title: "Fixed 23 missing image alt tags", meta: "Site-wide accessibility + image SEO pass", time: "2w ago" },
    { type: "done", title: "Submitted NAP corrections to 9 directories", meta: "Yelp, BBB, Angi, Houzz + 5 more", time: "3w ago" }
  ],

  /* --------------------------------------------------------- audit modules
     These map 1:1 to the Makarios skill suite.                             */
  modules: [
    { name: "Keyword Gap Audit",     desc: "Keywords all 3 competitors rank for that you don't", icon: "target", status: "Updated 2d ago" },
    { name: "Backlink Gap Audit",    desc: "Domains linking to competitors but not to you",      icon: "link",   status: "Updated 5d ago" },
    { name: "Content Gap",           desc: "Blog topics driving competitor traffic",             icon: "doc",    status: "Updated 1w ago" },
    { name: "GBP Category Audit",    desc: "Missing categories vs the local map pack",           icon: "grid",   status: "4 actions" },
    { name: "Citation Audit",        desc: "NAP consistency across 16 directories",              icon: "check",  status: "2 issues" },
    { name: "Review Sentiment",      desc: "Voice-of-customer language from 100 reviews",        icon: "star",   status: "Updated 3d ago" },
    { name: "Entity Optimization",   desc: "Knowledge graph + schema strength",                  icon: "globe",  status: "Updated 2w ago" },
    { name: "Intent Keyword Map",    desc: "Keywords mapped to buyer-journey stage",             icon: "map",    status: "Updated 1w ago" }
  ],

  /* ---------------------------------------------------------------- reports */
  reports: [
    { name: "September 2026 SEO Report", date: "Oct 1, 2026", size: "4.2 MB", pages: 18, isNew: true },
    { name: "August 2026 SEO Report",    date: "Sep 1, 2026", size: "3.9 MB", pages: 17 },
    { name: "Q3 2026 Strategy Review",   date: "Sep 1, 2026", size: "2.1 MB", pages: 11 },
    { name: "July 2026 SEO Report",      date: "Aug 1, 2026", size: "3.7 MB", pages: 16 },
    { name: "Technical SEO Audit",       date: "Jun 14, 2026", size: "6.8 MB", pages: 24 }
  ],

  /* ------------------------------------------------------------ date ranges */
  ranges: [
    { id: "28d", label: "28 days" },
    { id: "3m",  label: "3 months", active: true },
    { id: "6m",  label: "6 months" },
    { id: "12m", label: "12 months" }
  ],

  /* GSC-style date + comparison controls for the Search Rankings view. */
  datePresets: [
    { id: "7d",   label: "Last 7 days",    from: "2026-09-24", to: "2026-09-30" },
    { id: "28d",  label: "Last 28 days",   from: "2026-09-03", to: "2026-09-30" },
    { id: "3m",   label: "Last 3 months",  from: "2026-07-01", to: "2026-09-30", active: true },
    { id: "6m",   label: "Last 6 months",  from: "2026-04-01", to: "2026-09-30" },
    { id: "12m",  label: "Last 12 months", from: "2025-10-01", to: "2026-09-30" },
    { id: "custom", label: "Custom range", from: "2026-07-01", to: "2026-09-30" }
  ],

  compareModes: [
    { id: "none",  label: "No comparison" },
    { id: "prev",  label: "Previous period", active: true, from: "2026-04-02", to: "2026-06-30" },
    { id: "year",  label: "Same period last year", from: "2025-07-01", to: "2025-09-30" },
    { id: "custom",label: "Custom", from: "2026-01-01", to: "2026-03-31" }
  ]
};
