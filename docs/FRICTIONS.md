# Frictions

## The Cascading Integration Failure

**The Friction:** In financial operations, a single customer action—a transfer, a repayment, an account change—can require handoffs across multiple disconnected internal systems and external counterparties. Each handoff is a potential failure point: data arrives out of sync, a step silently fails, or two systems disagree on the state of a transaction. At scale, these gaps accumulate into reconciliation nightmares and customer-facing errors that are painful to debug and costly to fix.

**Your Canvas:** How do you make a multi-step financial workflow bulletproof? Design and build a prototype that orchestrates a mock multi-step operation across simulated services. You decide the architecture: Is it an event-driven saga with compensating transactions? A workflow state machine with visibility dashboards? A smart retry layer that alerts humans only when it truly can't self-heal? Show us how you'd make the invisible handoffs between systems reliable, observable, and resilient at scale.

## The Settlement Timing Trap

**The Friction:** In financial platforms, some operations settle in real time while others settle hours or days later. This mismatch creates a dangerous window: the system believes it has resources it doesn't yet have, or holds reserves for obligations that have already resolved. Manually tracking these temporary exposure windows is error-prone and doesn't scale—especially when markets move fast and the margin for error shrinks.

**Your Canvas:** How do you build a system that knows what it knows _right now_ versus what it only _thinks_ it knows? Design a prototype that models and surfaces these timing mismatches across mock financial operations. You decide the approach: A real-time reconciliation engine that flags exposure breaches as they emerge? A timeline view that makes the settlement lifecycle transparent to operators? A predictive alert that fires before a mismatch becomes a problem? Bridge the gap between "booked" and "settled."

## The Blind Spot Under Pressure

**The Friction:** Some systems handle normal load with ease—but when a market spike hits, a flash crash unfolds, or a sudden wave of user activity arrives, the same workflows that ran smoothly become dangerous choke points. The bottleneck isn't always the code; it's the invisible assumptions baked into the architecture that were never stress-tested: serial queues, blocking I/O, manual approval steps that simply can't scale with volume. Teams only discover these blind spots when users are already impacted.

**Your Canvas:** How do you find and fix hidden breaking points before your users find them for you? Build a prototype that simulates a surge event on a mock financial workflow. You decide how to make it resilient: Do you instrument the system to surface latency and queue depth in real time? Do you introduce circuit breakers, backpressure, or priority lanes for critical operations? Show us how you'd design a system that degrades gracefully under pressure instead of failing catastrophically.

## The Fragile Data Feed

**The Friction:** Risk, pricing, and treasury decisions in financial platforms often depend on real-time data from external providers—price feeds, rate quotes, market indices. When those feeds are delayed, degraded, or unavailable, the system faces a hard choice: halt operations, act on stale data, or make a guess. Most systems weren't designed with a clear, intentional answer to that question—and operators find out what the system actually does only when something goes wrong at the worst possible moment.

**Your Canvas:** How do you build a system that stays confident and correct even when its data source gets unreliable? Design a prototype around a mock real-time data feed with simulated degradation scenarios. You decide the shape of the solution: A circuit breaker that falls back to a stale-data policy with human escalation? A multi-source aggregator that detects and compensates for feed drift? A UI that surfaces data confidence levels so decision-makers know exactly how much to trust what they're seeing? Show us how you'd keep the system trustworthy when the outside world isn't.

## The Invisible Liquidity Dashboard

**The Friction:** Operations and treasury teams in financial platforms often lack a unified, real-time view of where their resources actually are—which balances are locked, which are available, and which are in flight across systems. Instead, they piece together information from disparate tools, run manual queries, or rely on reports that were accurate an hour ago. When conditions change quickly, critical decisions get made on outdated information—and the cost of being wrong scales with the speed of the market.

**Your Canvas:** How do you give an operator a single source of truth that is always live? Build a prototype that aggregates and surfaces mock resource data in real time. You decide the form: A live operational dashboard with drill-down views and threshold alerts? A query interface that lets operators ask questions in natural language and receive structured, current answers? A proactive system that surfaces anomalies before anyone has to go looking? Show us how you'd turn fragmented, delayed data into a decision-making superpower.
