import { http, HttpResponse } from 'msw';

/**
 * Baseline handlers — pass through with empty success responses. Individual
 * tests override these with `server.use(...)` to inject fixtures or failures.
 *
 * The web app talks to `/api/backend/*` (a Next rewrite). In jsdom the rewrite
 * isn't active, so we intercept the same path absolute-style.
 */
const BASE = '/api/backend';

export const handlers = [
  http.get(`${BASE}/conversations`, () => HttpResponse.json([])),
  http.get(`${BASE}/conversations/:id`, () => HttpResponse.json(null, { status: 404 })),
  http.post(`${BASE}/conversations/:id/takeover`, () => HttpResponse.json({ ok: true })),
  http.post(`${BASE}/conversations/:id/hand-back`, () => HttpResponse.json({ ok: true })),
  http.get(`${BASE}/orders`, () => HttpResponse.json([])),
  http.get(`${BASE}/auth/me`, () => HttpResponse.json(null, { status: 401 })),
];
