# Dealership Intelligence Scraper

Production-grade distributed dealership web scraping system with a real-time control dashboard.

## Architecture

```
├── apps/
│   ├── scraper/     # Node.js/TypeScript scraper service
│   └── dashboard/   # Next.js 14 dark SaaS dashboard
├── packages/
│   └── shared/      # Shared TypeScript types
├── firebase.json    # Firestore config → project: carpilothq
└── firestore.rules
```

## Quick Start

### 1. Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Firebase project `carpilothq` with Firestore enabled
- Service account JSON downloaded to `service-account.json`

### 2. Environment Setup

```bash
cp .env.example .env
# Fill in:
#   GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX  (Google Custom Search)
#   FIREBASE_SERVICE_ACCOUNT_PATH       (path to service-account.json)
#   NEXT_PUBLIC_FIREBASE_*              (Firebase web SDK config)
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Deploy Firestore Rules & Indexes

```bash
firebase use carpilothq
firebase deploy --only firestore
```

### 5. Run the Scraper

```bash
# Discover dealer URLs (populates discovery_urls collection)
pnpm scraper:discover

# Or discover specific states/brands
cd apps/scraper && pnpm discover --states TX,CA,FL --brands Toyota,Honda

# Process the scrape queue
pnpm scraper:scrape

# Or with custom concurrency
cd apps/scraper && pnpm scrape --concurrency 20

# Full pipeline (discover + scrape)
cd apps/scraper && pnpm dev run --states TX --concurrency 10
```

### 6. Run the Dashboard

```bash
pnpm dev:dashboard
# Open http://localhost:3000
```

---

## Scraper Features

### Discovery Pipeline
- **Google Custom Search API** — `"[Brand] dealership [City] [State]"` queries across all 50 states × 300 cities
- **Google Maps Places API** — Dealership category search
- **Directory scrapers** — Cars.com, Autotrader, DealerRater, CarGurus, Yelp, YellowPages
- **Recursive crawler** — Follows domains to depth 2 (`/about`, `/contact`, `/inventory`)
- **URL deduplication** — Normalized domain-level dedup before any scraping

### Per-Dealership Extraction
- Business info (name, address, phones, emails, hours, parent group) via Schema.org + heuristics
- Website intelligence (SSL cert, redirect chain, load time, sitemap, robots.txt)
- Social links (Facebook, Instagram, Twitter/X, YouTube, TikTok, LinkedIn)
- Inventory system (VIN detection, platform, route existence, vehicle count)

### Detection Engine
- **20+ CMS platforms** — WordPress, Drupal, Joomla, Squarespace, Wix, Webflow, Dealer.com, DealerSocket, CDK Global, Dealer Inspire, eLead, DealerFire, Sincro, Podium
- **Full tech stack** — React/Vue/Angular/jQuery, GA4/GTM/Segment/Hotjar, chat widgets, CRM hints, CDN, ad pixels
- **Captcha** — reCAPTCHA v2/v3, hCaptcha, Cloudflare Turnstile, Arkose/FunCaptcha
- **WAF** — Cloudflare, Imperva, DataDome, PerimeterX, Akamai

### Efficiency & Reliability
- `p-queue` concurrent workers (1–50, default 10)
- 20+ rotating user agents + header randomization
- Proxy pool support (list or rotating endpoint)
- Exponential backoff: 3 retries at 1s → 3s → 9s
- 15s hard timeout per request
- 429 detection → 30s worker cooldown
- 30-day incremental skip (re-scrape with `--force-refresh`)
- Graceful degradation — stores `partial` records, never skips

---

## Dashboard

Open `http://localhost:3000` after running `pnpm dev:dashboard`.

| Page | Description |
|------|-------------|
| `/` | Command center — live stats, throughput chart, worker grid, log feed |
| `/dealers` | Filterable/sortable dealership table with CSV export |
| `/dealers/[id]` | Full detail view — all fields, tech stack badges, raw JSON |
| `/jobs` | Job queue monitor — start/stop jobs, live log stream |

---

## Firestore Collections

| Collection | Description |
|------------|-------------|
| `dealerships/{domain}` | Scraped dealership records |
| `scrape_jobs/{id}` | Job queue (created by dashboard, processed by scraper) |
| `discovery_urls/{domain}` | URL discovery queue |
| `stats/global` | Aggregate counters |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CSE_API_KEY` | Google Custom Search API key |
| `GOOGLE_CSE_CX` | Custom Search Engine ID |
| `GOOGLE_MAPS_API_KEY` | Google Maps Places API key (optional) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to service account JSON |
| `FIREBASE_PROJECT_ID` | `carpilothq` |
| `SCRAPER_CONCURRENCY` | Worker count (default: 10) |
| `SCRAPER_DELAY_MS` | Base delay between requests (default: 500) |
| `SCRAPER_DELAY_JITTER_MS` | Random jitter ±ms (default: 200) |
| `PROXY_LIST` | Comma-separated proxy URLs |
| `PROXY_ROTATING_ENDPOINT` | Rotating proxy service endpoint |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web SDK config (for dashboard) |
