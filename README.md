# Ledn Challenge - Confidence-Aware Liquidity Operations

This is a full-stack operational dashboard for two financial operations frictions:

- **The Fragile Data Feed:** market data can become delayed, drifted, or unavailable, and the system must make its confidence visible instead of silently trusting bad data.
- **The Invisible Liquidity Dashboard:** treasury operators need a live view of available, locked, and in-flight liquidity, including whether operational actions are safe under degraded market data.

The core idea is simple: **price confidence is treated as operational data**. When a feed degrades, the UI does not only show an alert; liquidity automatically enters conservative mode and lock decisions use adjusted availability.

## What Is Implemented

- Mock BTC/ETH price feed with deterministic modes:
  - `HEALTHY`: live ticks, `FRESH`, `LIVE`
  - `DELAYED`: sparse ticks, eventually `STALE`
  - `DRIFTED`: live ticks with drift, `ESTIMATED`, `PRICE_DRIFT`
  - `OFFLINE`: no ticks, stale/cache fallback path
- Circuit breaker with `CLOSED`, `HALF_OPEN`, and `OPEN` states.
- Redis-backed alert deduplication: one active alert per `(type, resourceId)`.
- Live WebSocket event envelope: `{ type, payload }`.
- Price records with confidence metadata: `confidence`, `source`, `feedMode`, `ageMs`, timestamps, `schemaVersion`.
- Liquidity snapshot with `available`, `locked`, `inFlight`, source status, confidence, and conservative-mode fields.
- Confidence-aware liquidity policy:
  - if any asset is `STALE` or `ESTIMATED`, `conservativeMode = true`
  - `availableAdjusted = available * 0.9`
  - lock operations validate against `availableAdjusted`
- Operator UI for:
  - feed health
  - circuit state
  - alerts
  - liquidity snapshot
  - lock/release actions
  - recent audit entries
  - deterministic demo scenarios
- Lightweight observability:
  - structured JSON logs through Nest `Logger`
  - `GET /health/metrics`
- Focused tests for the demo-critical invariants.

## Architecture Overview

```txt
Mock Feed Service
  -> PriceService
     -> Redis last-known price cache
     -> MongoDB price history
     -> CircuitBreakerService
     -> alert.trigger events
     -> NATS PRICE_UPDATED

NATS events
  -> DashboardGateway
     -> Socket.IO ws:event { type, payload }
     -> React + Zustand store

NATS PRICE_UPDATED
  -> LiquidityService
     -> tracks degraded assets
     -> applies conservative liquidity policy
     -> NATS LIQUIDITY_SNAPSHOT

LiquidityController
  -> GET /liquidity/snapshot
  -> GET /liquidity/audit
  -> POST /liquidity/lock
  -> POST /liquidity/release
```

The backend uses NestJS, MongoDB, Redis, NATS, and Socket.IO. The frontend uses React, Vite, Chakra UI, Socket.IO client, and Zustand. Shared contracts live in `packages/shared`.

## Data Flow

1. `FeedService` emits deterministic mock ticks for BTC and ETH.
2. `PriceService` converts ticks into `PriceRecord` contracts and publishes `PRICE_UPDATED`.
3. Staleness checks mark old prices as `STALE`, raise `DATA_STALE` or `FEED_OFFLINE`, and record circuit breaker failures.
4. `CircuitBreakerService` opens after repeated failures and emits `CIRCUIT_STATE_CHANGED`.
5. `AlertService` deduplicates alerts in Redis and emits `ALERT_CREATED` / `ALERT_RESOLVED`.
6. `LiquidityService` listens to `PRICE_UPDATED`, tracks degraded assets, and applies a 10% haircut to available liquidity when pricing confidence is degraded.
7. `DashboardGateway` forwards backend events to the UI using a stable WebSocket envelope.
8. Zustand stores the current operational state for the dashboard.

## Local Setup

### Prerequisites

- Node.js
- npm
- Docker
- A MongoDB connection string

### 1. Install dependencies

```bash
npm install
```

### 2. Start local infrastructure

```bash
docker compose up -d
```

This starts:

- NATS on `localhost:4222`
- Redis on `localhost:6379`

MongoDB is configured through `MONGODB_URI`.

### 3. Create environment files

Copy `.env.example` to `.env` at the repository root, then fill `MONGODB_URI`. The NestJS backend reads this root `.env` file.

For frontend builds, the same file documents the Vite variables. Export them in your shell or create `apps/frontend/.env.local` with:

- `VITE_WS_URL`
- `VITE_API_URL`

### 4. Build shared contracts

```bash
npm run build --workspace @ledn/shared
```

### 5. Start backend

```bash
npm run start:dev --workspace apps/backend
```

Backend runs on `http://localhost:3000` by default.

### 6. Start frontend

```bash
npm run dev --workspace apps/frontend
```

Frontend runs on the Vite dev server, usually `http://localhost:5173`.

## Useful Commands

```bash
# Backend tests
npm run test --workspace apps/backend -- --runInBand

# Backend build
npm run build --workspace apps/backend

# Frontend build
npm run build --workspace apps/frontend

# All workspace lint scripts, if present
npm run lint
```

## Demo Scenarios

The UI exposes deterministic scenario buttons:

- `BTC_GOES_OFFLINE`
- `ETH_DRIFTS`
- `DUAL_PRESSURE`

Suggested walkthrough:

1. Start healthy: BTC/ETH show `HEALTHY`, `FRESH`, `LIVE`, circuit breaker `CLOSED`.
2. Run `BTC_GOES_OFFLINE`: BTC moves through delayed/offline behavior, price confidence degrades, alerts appear, and circuit state changes.
3. Watch liquidity enter conservative mode: the dashboard shows raw available and conservative available.
4. Try to lock more than conservative available: the backend rejects the action with an explicit conservative-liquidity message.
5. Recover feed to `HEALTHY`: alerts resolve, circuit closes, liquidity exits conservative mode.

See `docs/LOOM_SCRIPT.md` for a 3-5 minute recording script.

## API Reference

### Feed

- `GET /feed/status`
- `PATCH /feed/:assetId/mode`
- `PATCH /feed/scenarios/:scenario/start`

### Liquidity

- `GET /liquidity/snapshot`
- `GET /liquidity/audit`
- `POST /liquidity/lock` with `{ "amount": number }`
- `POST /liquidity/release` with `{ "amount": number }`

### Health / Observability

- `GET /health/metrics`

Response shape:

```ts
{
  timestamp: number
  activeAlertsCount: number
  activeAlertsByType: Record<string, number>
  feedModes: Record<string, string>
  circuitStates: Record<string, string>
  liquidity: {
    conservativeMode: boolean
    available: number
    availableAdjusted?: number
    degradedAssets: string[]
    confidence: string
  }
}
```

## Tests

The backend test suite focuses on critical invariants instead of broad coverage:

- alert deduplication
- circuit breaker opening and recovery path
- liquidity policy haircut behavior
- lock/release total preservation
- conservative-mode lock rejection
- feed offline/delayed/drifted semantics
- drift alert publication

Run:

```bash
npm run test --workspace apps/backend -- --runInBand
```

## Technical Decisions And Trade-Offs

### NATS Core, not JetStream

The prototype uses NATS as an event bus and keeps state in Redis, MongoDB, and service snapshots. JetStream would be the production evolution for durable replay and stronger delivery guarantees, but it would add ack/replay/idempotency complexity that is not required to demonstrate the operational workflow.

### Snapshot-based state, not event sourcing

The dashboard needs current operational truth: latest prices, active alerts, circuit state, and liquidity snapshot. Event sourcing would be useful for full reconciliation and audit replay, but snapshots keep the prototype focused and demoable.

### Fixed 10% haircut, not a full risk engine

The conservative liquidity policy is intentionally simple and auditable: degraded pricing applies a 10% haircut. In production, this would become a configurable policy based on asset, volatility, exposure, and counterparty.

### Mock deterministic feeds, not external providers

The feed is deterministic so failures are reproducible in tests and Loom. Production would use multiple providers, outlier detection, quorum, and clock-skew handling.

### Zustand, not Redux

The UI state is live, local, and small. Zustand keeps the WebSocket-to-dashboard path direct without adding unnecessary boilerplate.

### Lightweight observability, not full OpenTelemetry

Structured logs and `/health/metrics` make the system explainable without deploying a collector, dashboard, or trace backend. Full OpenTelemetry is listed as production evolution.

## Incremental Backlog

These can be added without changing the core architecture:

- GitHub Actions CI validation.
- EC2 backend deploy wiring.
- S3/CloudFront frontend deploy wiring.
- CloudFront invalidation.
- Better source drill-down UI.
- More detailed audit table.
- Operator tooltips for `FRESH`, `STALE`, `ESTIMATED`, and circuit states.
- More scenario buttons for liquidity-source degradation.

## Production Evolution Intentionally Deferred

These are valuable, but structural enough that they were intentionally left out of the prototype:

- NATS JetStream durable streams and replay.
- Event-sourced reconciliation/audit model.
- Configurable risk-policy engine.
- Multi-provider price consensus.
- Auth/RBAC.
- Signed audit trail.
- Full OpenTelemetry collector/exporter/dashboard setup.
- Terraform hardening for production environments.
