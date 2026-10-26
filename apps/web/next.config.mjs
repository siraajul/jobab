import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.JOBAB_NEXT_DIST_DIR ?? '.next',
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ] }];
  },
  // Standalone output bundles only what the server needs for the Docker image.
  output: 'standalone',
  // The whole monorepo root is the build context so the shared package resolves.
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  // Proxy the backend through Next so auth cookies stay same-origin.
  // The browser sees /api/backend/... ; Next forwards to the real API.
  async rewrites() {
    const target = process.env.BACKEND_URL ?? 'http://localhost:3000';
    return [{ source: '/api/backend/:path*', destination: `${target}/:path*` }];
  },
};
export default nextConfig;
