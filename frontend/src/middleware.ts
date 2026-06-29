import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_OPS = '/ops';
const PROTECTED_ADMIN = /^\/[a-z0-9]+(?:[-][a-z0-9]+)*\/admin(?:\/|$)/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const setPathname = (res: NextResponse) => {
    res.headers.set('x-pathname', pathname);
    return res;
  };

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return setPathname(NextResponse.next());
  }

  // Root path — always serve marketing page
  if (pathname === '/') {
    return setPathname(NextResponse.next());
  }

  // Auth check for protected routes
  if (pathname.startsWith(PROTECTED_OPS) || PROTECTED_ADMIN.test(pathname)) {
    const { user, supabaseResponse } = await updateSession(request);

    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      const redirect = NextResponse.redirect(loginUrl);
      redirect.headers.set('x-pathname', pathname);
      return redirect;
    }

    supabaseResponse.headers.set('x-pathname', pathname);
    return supabaseResponse;
  }

  // Skip if already on a slug path (e.g. /some-slug/...)
  if (pathname.match(/^\/[a-z0-9]+(?:[-][a-z0-9]+)*(?:\/|$)/)) {
    return setPathname(NextResponse.next());
  }

  const host = request.headers.get('host') || '';
  const subdomain = host.split('.')[0];

  if (subdomain && subdomain !== 'localhost' && subdomain !== 'www' && subdomain !== 'localhost:3000') {
    const url = new URL(request.url);
    url.pathname = `/${subdomain}${pathname}`;
    const rewrite = NextResponse.rewrite(url);
    rewrite.headers.set('x-pathname', pathname);
    return rewrite;
  }

  return setPathname(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
