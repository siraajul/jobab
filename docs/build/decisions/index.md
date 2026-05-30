# Architecture decisions

Short records of the big calls that shaped this codebase. Each one captures
the context, the alternatives we looked at, and why we picked what we picked.

Read these when you're about to change something and want to understand why
it's the way it is.

| #                                             | Decision                                       |
| --------------------------------------------- | ---------------------------------------------- |
| [0001](./0001-monorepo-pnpm.md)               | Use a pnpm monorepo                            |
| [0002](./0002-llm-provider-interface.md)      | Wrap the LLM behind a provider interface       |
| [0003](./0003-order-guardrail.md)             | Validate orders outside the AI (the guardrail) |
| [0004](./0004-phase2-rbac-comments-mobile.md) | Phase 2 — RBAC, comments, mobile               |

New decisions get the next number. Keep them short — context, decision,
consequence. Don't write a thesis.
