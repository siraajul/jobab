# ADR 0003: Order guardrail and grounded `save_customer_detail`

**Status:** Accepted · **Date:** 2026-05-29

## Context

Per spec §6 the LLM **proposes** an order; deterministic code **decides**
whether one is created. The cost of a wrong order is real (refund, lost
trust, hand-packed parcel for the wrong customer). The model also tends to
invent customer details — addresses in particular — when the customer hasn't
provided them.

## Decision

Two layered guards:

### 1. `OrderGuardrail.tryCreate`

Before persisting an order, runs five deterministic checks:

1. Required customer fields present (name, phone, address).
2. No active order already exists on this conversation.
3. Every proposed variant exists and belongs to this org.
4. Live stock ≥ requested qty for each variant.
5. Total recomputed from live prices (we never trust the model's number).

Returns a structured error for each failure mode; the model reads it and
asks the customer for the missing piece.

### 2. `save_customer_detail` grounding

The model can only persist a value that **textually appears** (lightly
normalised) in a recent customer message. The catch:

- "House 14, Banani, Dhaka" inserted by the model → blocked.
- "01713 456789" matched to a saved customer message "01713-456789" → allowed.

The grounding check is non-strict by design (light reformatting is fine), but
it stops the obvious failure mode where the model invents fields.

## Alternatives considered

- LLM-only validation (system-prompt rules) — proven unreliable: the model
  still occasionally invents fields when the prompt isn't crystal clear.
- Token-level grounding via embeddings — overkill for Phase 1.

## Consequences

- The agent's behaviour is bounded: it can only assert facts it has seen.
- Five unit tests in `order.guardrail.spec.ts` lock the behaviour down.
- A new failure mode (`not_grounded_in_conversation`) for the model to
  reason about — currently it just asks the customer.
