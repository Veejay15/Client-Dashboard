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
    name: "Mark Thompson",
    initials: "MT",
    email: "mark@americanafence.com",
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

  /* ---------------------------------------------------- local grid rankings
     7x7 geo grid centred on the business. Values are the ranking position
     returned for the primary keyword at each lat/lng sample point.         */
  geoGrid: {
    keyword: "wrought iron fence installation",
    center: "Americana Iron Works & Fence — 1420 S Main St",
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
  keywords: [
    { kw: "wrought iron fence installation", vol: 1300, pos: 3,  prev: 9,  url: "/wrought-iron-fences", intent: "Ready to hire" },
    { kw: "iron fence company near me",      vol: 880,  pos: 2,  prev: 6,  url: "/", intent: "Ready to hire" },
    { kw: "custom iron gates",               vol: 720,  pos: 5,  prev: 11, url: "/custom-gates", intent: "Ready to hire" },
    { kw: "automatic driveway gates",        vol: 590,  pos: 7,  prev: 14, url: "/driveway-gates", intent: "Ready to hire" },
    { kw: "ornamental fence contractor",     vol: 410,  pos: 4,  prev: 4,  url: "/services", intent: "Ready to hire" },
    { kw: "security fence installation",     vol: 390,  pos: 11, prev: 19, url: "/security-fencing", intent: "Solution aware" },
    { kw: "aluminum fence vs iron fence",    vol: 320,  pos: 6,  prev: 12, url: "/blog/aluminum-vs-iron", intent: "Solution aware" },
    { kw: "iron fence repair",               vol: 260,  pos: 8,  prev: 7,  url: "/repairs", intent: "Ready to hire" },
    { kw: "how much does an iron fence cost",vol: 1900, pos: 14, prev: 22, url: "/blog/iron-fence-cost", intent: "Problem aware" },
    { kw: "commercial fencing contractor",   vol: 480,  pos: 16, prev: 16, url: "/commercial", intent: "Ready to hire" }
  ],

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
  ]
};
