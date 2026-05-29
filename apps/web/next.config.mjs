/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output bundles only what the server needs for the Docker image.
  output: 'standalone',
  // The whole monorepo root is the build context so the shared package resolves.
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  // Proxy the backend through Next so auth cookies stay same-origin.
  // The browser sees /api/backend/... ; Next forwards to the real API.
  async rewrites() {
    const target = process.env.BACKEND_URL ?? 'http://localhost:3000';
    return [{ source: '/api/backend/:path*', destination: `${target}/:path*` }];
  },
};
export default nextConfig;
