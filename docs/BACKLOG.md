# Backlog And Deferred Work

This document is intentionally honest about scope. The prototype demonstrates a complete operational workflow, but it is not presented as a production treasury platform.

## Implemented Primary Frictions

### The Fragile Data Feed

Current implementation:

- Deterministic BTC/ETH market feed modes: `HEALTHY`, `DELAYED`, `DRIFTED`, `OFFLINE`.
- Price records expose confidence, source, feed mode, age, and schema version.
- Stale/offline/drift behavior drives alerts and circuit breaker state.
- The dashboard makes degraded data visible instead of silently trusting it.

What production would add:

- Multiple real providers.
- Price consensus and outlier rejection.
- Provider-specific SLOs and clock-skew handling.
- Durable replay of market-data events.

Why not now:

- The assessment needs a reliable prototype, not a partially integrated provider network.
- Deterministic feeds make failure scenarios repeatable for tests and Loom.

### The Invisible Liquidity Dashboard

Current implementation:

- Live liquidity snapshot with `available`, `locked`, `inFlight`, and `total`.
- Lock/release actions update liquidity state and audit entries.
- Conservative mode applies a fixed haircut when price confidence degrades.
- Operators can see max lockable amount under degraded pricing.

What production would add:

- Real source connectors.
- Drill-down by provider, account, currency, and counterparty.
- Durable audit and reconciliation history.
- Role-based operator workflows.

Why not now:

- The prototype focuses on proving the operational decision loop end to end.
- Real connectors and signed audit would add deployment/security scope beyond the challenge window.

### The Settlement Timing Trap

Current implementation:

- Deterministic vertical slice for settlement operations.
- Starting settlement moves liquidity into in-flight exposure.
- Settling reduces in-flight exposure.
- Failing reverses funds back to available liquidity.
- Delayed/failed/exposure-breach settlement alerts are modeled.
- Dashboard shows pending settlement amount, delayed amount, oldest pending age, and operation status.

What production would add:

- Idempotency keys.
- Durable workflow orchestration.
- External settlement rail reconciliation.
- Retry/compensation policy.
- Signed settlement audit trail.

Why not now:

- The current slice demonstrates the timing mismatch clearly without turning the project into a full settlement platform.
- Event sourcing, workflow durability, and reconciliation belong in production evolution.

## Adjacent But Not Fully Implemented

### The Cascading Integration Failure

How the current system relates:

- Backend modules communicate through explicit events.
- Alerts and snapshots make internal state transitions visible.
- Settlement failure partially demonstrates reversal behavior.

What would be needed to fully solve it:

- A multi-step workflow or saga across simulated internal/external systems.
- Retry policy with backoff.
- Compensating transactions.
- Step-level observability and operator intervention states.
- Idempotency and deduplication per workflow step.

Why deferred:

- A full saga would be a separate vertical slice and would compete with the core feed/liquidity/settlement story.
- Implementing it correctly would require more workflow state than this prototype needs.

### The Blind Spot Under Pressure

How the current system relates:

- Circuit breakers show graceful degradation under feed failure.
- Health metrics expose current operational state.
- Deterministic scenarios simulate degraded conditions, but not high-volume load.

What would be needed to fully solve it:

- Surge/load simulator.
- Queue depth, latency, and throughput metrics.
- Backpressure or priority lanes.
- Bottleneck visualization.
- Load-focused tests.

Why deferred:

- It is valuable, but it shifts the prototype from operational correctness to performance engineering.
- The current scope prioritizes explainable behavior under degraded data and settlement timing.

## Incremental Backlog

These can be added without changing the core architecture:

- GitHub Actions CI for backend tests, frontend build, and lint.
- EC2 backend deploy automation.
- S3/CloudFront frontend deploy automation.
- CloudFront invalidation workflow.
- UI drill-down for liquidity sources and settlement operations.
- Full audit table with filters.
- More deterministic scenarios for liquidity-source degradation and settlement failures.
- Better `/health/metrics` with event counts, active alert severity counts, and settlement exposure thresholds.
- Frontend code splitting to remove the Vite bundle-size warning.
- Frontend e2e smoke tests for the main demo scenarios.

## Production Evolution

These are intentionally deferred because they are structural:

- NATS JetStream durable streams and replay.
- Event-sourced reconciliation/audit model.
- Configurable risk-policy engine.
- Multi-provider price consensus.
- Auth/RBAC.
- Signed audit trail.
- Full OpenTelemetry collector/exporter/dashboard setup.
- Terraform hardening for production environments.
