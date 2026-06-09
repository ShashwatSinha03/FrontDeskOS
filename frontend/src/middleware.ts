import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal Next.js paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
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
