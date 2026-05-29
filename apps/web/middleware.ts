import { NextResponse, type NextRequest } from 'next/server';

/**
 * Real auth via the backend's signed-cookie session (spec §11). The cookie
 * (`jobab_session`) is set by the backend's POST /auth/login, which the web
 * proxies to via /api/backend/auth/login.
 *
 * Public paths: login, accept-invite, and the backend proxy itself (so the
 * unauthenticated login POST can pass through).
 */
const PUBLIC_PREFIXES = ['/login', '/sign-up', '/accept-invite', '/api/backend'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }
  const session = req.cookies.get('jobab_session');
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
