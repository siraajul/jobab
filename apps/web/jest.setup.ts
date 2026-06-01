import '@testing-library/jest-dom';

// MSW server boot is intentionally left out of the default setup — it pulls
// in an ESM dependency chain that needs additional `transformIgnorePatterns`
// tuning. Tests that want network-level mocking can import + boot the
// server from `./test/msw/server` themselves. For hook tests, prefer
// `jest.mock('@/lib/api', ...)` — it's faster and avoids the global server
// lifecycle.
