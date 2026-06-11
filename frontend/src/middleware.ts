import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

  // Skip auth pages and auth callbacks
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // Protect /ops/* routes — require auth + SUPER_ADMIN
  if (pathname.startsWith('/ops')) {
    let response = NextResponse.next({ request: { headers: request.headers } });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const meRes = await fetch(`${request.nextUrl.origin}/api/admin/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const meJson = await meRes.json();

      if (!meJson.success || meJson.data?.global_role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    return response;
  }

  // Skip if already on a slug path (e.g. /some-slug/...)
  // Public pages: /:slug, /:slug/book, /:slug/contact, /:slug/services
  // Also passes through /:slug/admin/* (handled in a later batch)
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
