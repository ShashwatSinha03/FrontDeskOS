import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_OPS = '/ops';
const PROTECTED_ADMIN = /^\/[a-z0-9]+(?:[-][a-z0-9]+)*\/admin(?:\/|$)/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal Next.js paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Root path — always serve marketing page
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Auth check for protected routes
  if (pathname.startsWith(PROTECTED_OPS) || PROTECTED_ADMIN.test(pathname)) {
    const { user, supabaseResponse } = await updateSession(request);

    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  // Skip if already on a slug path (e.g. /some-slug/...)
  if (pathname.match(/^\/[a-z0-9]+(?:[-][a-z0-9]+)*(?:\/|$)/)) {
    return NextResponse.next();
  }

  const host = request.headers.get('host') || '';
  const subdomain = host.split('.')[0];

  if (subdomain && subdomain !== 'localhost' && subdomain !== 'www' && subdomain !== 'localhost:3000') {
    const url = new URL(request.url);
    url.pathname = `/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
