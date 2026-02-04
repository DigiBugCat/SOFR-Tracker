# SOFR Tracker

A Cloudflare-hosted dashboard for tracking SOFR rates, percentile spreads, and the Fed rate corridor.

## Features

- **7 Chart Views**:
  - Rate Corridor (SOFR, EFFR, IORB, SRF, RRP)
  - SOFR 1st-99th Percentile Spread
  - SOFR Percentile Bands
  - SOFR-RRP Spread
  - EFFR-RRP Spread
  - RRP Volume
  - SOFR Transaction Volume

- **Data Sources** (all free, no auth):
  - NY Fed API: SOFR, EFFR, RRP operations
  - FRED CSV: IORB, SRF, RRP rate

- **Infrastructure**:
  - Cloudflare Workers (API)
  - Cloudflare D1 (database)
  - Cloudflare Pages (frontend)
  - Daily cron sync at 6am ET

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Create D1 Database

```bash
# Create the database
npx wrangler d1 create sofr-tracker-db

# Copy the database_id from the output and update wrangler.toml
```

### 3. Update wrangler.toml

Replace `placeholder-will-be-replaced-after-creation` with your actual database ID.

### 4. Run Database Migrations

```bash
# Local development
npm run db:migrate:local

# Production
npm run db:migrate
```

### 5. Run Locally

```bash
npm run dev
```

The API will be available at `http://localhost:8787`.

### 6. Backfill Historical Data

```bash
# Start 2024-01-01 to today
curl -X POST "http://localhost:8787/api/backfill?start=2024-01-01"
```

### 7. Deploy

```bash
# Deploy Worker
npm run deploy

# Deploy frontend to Pages (from the frontend/ directory)
npx wrangler pages deploy frontend --project-name=sofr-tracker
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/rates` | SOFR, EFFR, policy rates |
| `GET /api/spreads?type=X` | Calculated spreads (sofr-percentile, sofr-rrp, effr-rrp) |
| `GET /api/rrp` | RRP operation volumes |
| `GET /api/volume` | SOFR transaction volumes |
| `GET /api/markers` | Quarter-end and tax deadline dates |
| `GET /api/status` | Sync metadata and record counts |
| `POST /api/sync` | Trigger manual sync |
| `POST /api/backfill?start=YYYY-MM-DD` | Backfill historical data |

All endpoints support `?start=YYYY-MM-DD&end=YYYY-MM-DD` query parameters.

## Architecture

```
CF Pages (Frontend)
      │
      │ fetch
      ▼
CF Worker (API)
      │
      │ query
      ▼
D1 Database
      ▲
      │ cron (6am ET)
CF Worker (Sync)
      │
      │ fetch
      ▼
NY Fed API / FRED CSV
```

## Development

```bash
# Run with local D1
npm run dev

# Test scheduled sync
npm run sync

# Type check
npm run typecheck
```
