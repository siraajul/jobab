# ADR 0004: Phase 2 — RBAC, comments, mobile

**Status:** Accepted · **Date:** 2026-05-30

## Context

Phase 2 of the build spec adds three differentiators: image-to-product (§9,
already shipped), multi-user + RBAC (§11), comment-to-DM automation (§10),
and a mobile app (§12). This ADR records the key choices for the latter three.

## Decisions

### Auth (spec §11)

- **Database-backed credentials**, not a paid IDP. `users.password_hash`
  (bcrypt, cost 11). The trade-off is real: we own password reset, MFA,
  email verification later. The win is zero external dependencies during
  Phase 2; switching to Clerk/Supabase is one auth-controller swap away.
- **Signed cookie sessions** via HMAC-SHA256 over a JSON payload. The
  encryption key is reused (different domain separator) so rotation
  invalidates all sessions. Cookie value is `<payload-b64>.<sig-b64>`,
  HttpOnly, sameSite=lax, 14-day TTL.
- **Invites** live in `invites` table. Plaintext token is shown **once** to
  the inviter; the DB stores only the HMAC hash. 7-day expiry. Audit-logged.
- **`AuthGuard` as global** (`APP_GUARD`). Routes opt out with `@Public()`.
  Resolves the active org from a `jobab_org` cookie, then a `x-org-id`
  header, then the user's only membership.
- **`@Roles('owner','admin')`** decorator + same guard enforces RBAC.

### Comments (spec §10)

- **Webhook handling for `feed` events.** New `MetaFeedChange` shape in
  `meta-webhook.types.ts`. The webhook dispatches `comment / verb=add`
  through `CommentsService`.
- **Intent classifier** is Groq's chat model with a focused JSON-mode prompt
  and a cheap heuristic (price tokens, emoji-only) that short-circuits the
  API call for the obvious 50% of comments.
- **Per-org `CommentRule`** rows control behaviour per intent
  (`replyMode: ai | manual | off`, `publicTemplate`, `privateAllowed`).
  Seed creates sensible defaults (price → "apnake inbox e details
  pathiyechi 🙂", spam → off).
- **Rate limit** per (org, post): max 10 public replies / minute. Meta
  flags pages that reply too fast in one thread.
- **DM bridge** uses the same conversation upsert path as Messenger DMs —
  the agent worker picks up the seeded "[from comment on post …]" message
  and the agent prompt has a rule for it.

### Mobile (spec §12)

- **Expo + expo-router + NativeWind.** Same Tailwind tokens as web.
- **Shared API contract** via `@jobab/shared`.
- **Session via `expo-secure-store`** — parse `Set-Cookie` at login, send
  back as `Cookie: jobab_session=…` on every request. Same backend
  AuthGuard handles either form.
- **Push** via Expo Push API → APNs/FCM. `PushService.notifyUser(userId)`
  posts to `https://exp.host/--/api/v2/push/send` and respects
  `MESSENGER_DRY_RUN` in dev.

## Consequences

- Adding paid auth (Clerk) replaces `AuthService` and `auth.controller.ts`
  only; everything else (guards, decorators, downstream APIs) is unchanged.
- The comment classifier is *the* model-quality lever for comment automation;
  the eval set (§13) should include comment classification cases.
- Mobile cookie-as-header is mildly non-standard but avoids a JWT layer
  that would have to be kept in sync with the cookie session.
