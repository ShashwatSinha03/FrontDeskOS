import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: 'Nuvora',
    short_name: 'Nuvora',
    description: 'AI Receptionist for Service Businesses',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };

  return NextResponse.json(manifest);
}
