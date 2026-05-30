/**
 * DI token for the active `LlmProvider`. Resolved at boot in `AgentModule`
 * based on `LLM_PROVIDER` env. Inject via `@Inject(LLM_PROVIDER)` so callers
 * depend on the interface, not a concrete class.
 */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
