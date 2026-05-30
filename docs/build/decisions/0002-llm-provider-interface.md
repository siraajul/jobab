# ADR 0002: Swappable LLM / Vision / Embedding provider interfaces

**Status:** Accepted · **Date:** 2026-05-29

## Context

The hardest part of this product per spec §13 is Bangla quality. We don't
yet know which model wins on the eval set, so the agent loop must not be
coupled to any single provider. Same goes for vision (image-to-product
recognition, spec §9) and for embeddings.

## Decision

Three small interfaces, each with one concrete implementation we currently
ship and room for more:

- `LlmProvider` — `call({messages, tools, model}) → {text, toolCalls, tokens}`.
  Implemented by `GroqProvider` (OpenAI-compatible API at Groq).
- `VisionProvider` — `describe(url)` + `confirmMatch({photo, candidates})`.
  Implemented by `GroqVisionProvider` (Llama 4 Scout).
- `EmbeddingProvider` — `embedText` + `embedImage` → `number[]`.
  Implemented by `JinaEmbeddingProvider` (Jina v3 + CLIP v2). Has an
  `available` flag so the catalog sync + image-match tool degrade gracefully
  to describe-then-search when no key is configured.

## Alternatives considered

- LangChain / Vercel AI SDK abstractions — too heavy and they impose their
  own tool-calling model; we want full control over the loop.
- One provider per environment (Gemini in prod, mock in dev) — fine, but the
  abstractions make this trivial without separate code paths.

## Consequences

- Adding GPT-4o-mini or Claude Haiku as a comparison provider is a single
  file each.
- The agent loop and tools don't care about which provider is active.
- We pay a small abstraction cost: each provider must reformat history into
  its native shape (OpenAI vs Gemini vs Anthropic).
