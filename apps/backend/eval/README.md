# Eval set — spec §13

The **moat** for Bangla quality lives here. Every PR that touches the agent
prompt or model should re-run this set; CI gates on the score (default
threshold: 70%).

## Running

```
# all cases
pnpm --filter @jobab/backend eval

# one file
pnpm --filter @jobab/backend eval eval/cases/order.yaml

# machine-readable output
pnpm --filter @jobab/backend eval -- --json /tmp/eval.json
```

The runner spins a fresh org per case (id `eval_<case-id>`), seeds the
catalog, drives the conversation through the same `AgentService`
the webhook uses, then evaluates each expectation. Cases are wiped at
the end.

## What's currently in the set

22 hand-curated cases across 7 files (~73 expectations):

| File | Cases | What it covers |
|---|---|---|
| `price.yaml` | 3 | Bangla / Banglish / mixed price asks |
| `order.yaml` | 4 | Happy path, missing fields, fabrication, OOS |
| `handoff.yaml` | 3 | Complaint, refund, "talk to human" |
| `empty-catalog.yaml` | 2 | Unknown product, vague greeting |
| `multilang.yaml` | 3 | Pure Bangla, pure English, code-switch |
| `edge-cases.yaml` | 4 | Emoji-only, spam, long text, phone-only |
| `comment-bridge.yaml` | 2 | Comment-to-DM with intent tag |

## Expectation kinds

```yaml
- { kind: tool_called,     tool: <name> }                    # tool must fire
- { kind: tool_not_called, tool: <name> }                    # tool must NOT fire
- { kind: reply_contains,  all: [str, ...] }                 # all substrings present (case-insensitive)
- { kind: reply_excludes,  any: [str, ...] }                 # none of these present
- { kind: order_created,   required_total: 1650 }            # order row in DB
- { kind: no_order,        reason: missing_fields|... }      # no order row
- { kind: language,        must_be_one_of: [bangla, banglish, english] }  # detected reply language
```

## How to grow it

**During the pilot** (spec §13 says this is THE moat):
- Every time a merchant marks an AI reply as wrong → new case.
- Every time the AI does something unexpected good → new case.
- Every time we touch the system prompt → run the set, don't deploy if score drops.

Cases are deliberately YAML, not TS, so a non-engineer can write them.
We should hit **100 cases** by end of pilot week 2 and **200 by week 4**.

## Why expectations are loose by design

The eval can't be too strict — `language` checks for "contains Bangla
characters", `reply_contains: [1650]` doesn't care if the agent wrote
"1650 taka" or "৳1650" or "BDT 1650". This is intentional: a strict eval
would punish the model for harmless rephrasing and reward verbatim parroting.

For semantic checks (e.g., "did the agent acknowledge the customer's
concern empathetically?") plug in an LLM-as-judge in a second pass — out
of scope for the first 22-case set but trivial to add.
