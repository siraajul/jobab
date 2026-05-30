# Security Policy

If you've found a security vulnerability in Jobab, thank you for
reporting it responsibly. We take security seriously.

## How to report

Email **security@jobab.com** with:

- A description of the issue
- Steps to reproduce
- Affected version / commit if known
- Your name (so we can credit you in the changelog) — optional

**Do not** open a public GitHub issue for security problems.

We'll acknowledge within **24 hours** and aim to ship a fix or a
mitigation within **14 days** for high-severity issues.

## What's in scope

- The Jobab backend (`apps/backend`)
- The Jobab web dashboard (`apps/web`)
- The Jobab mobile app (`apps/mobile`)
- The shared package (`packages/shared`)
- Any infrastructure under `jobab.com` or `*.jobab.com`

## What's out of scope

- Third-party services we depend on (Meta, Groq, bKash, Sentry,
  Langfuse) — report to them directly
- Social engineering of Jobab staff
- Physical attacks
- Self-XSS or vulnerabilities requiring physical access to a user's
  unlocked device

## Responsible disclosure

We commit to:

- Acknowledging your report within 24 hours
- Keeping you updated as we investigate
- Crediting you publicly (if you want) once the fix is shipped
- Not pursuing legal action against good-faith researchers

We expect researchers to:

- Give us reasonable time to fix the issue before public disclosure
  (industry standard: 90 days)
- Not access, modify, or destroy data belonging to other users
- Not perform attacks that degrade service for other users (DoS, etc.)

## Bug bounty

We don't have a paid bug bounty yet. We do publicly credit
contributors in the changelog and on the docs site. If we add a
bounty, this section will say so.

## Past disclosures

| Date       | Reporter | Issue | Status |
| ---------- | -------- | ----- | ------ |
| (none yet) |          |       |        |
