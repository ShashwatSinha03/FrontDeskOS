import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const ADMIN_API_KEY = 'fdos_adm_8a3f9c2e1b7d4f6a8c0e2d4b6a8c0e2d';

async function proxy(req: NextRequest, method: string) {
  const path = req.nextUrl.pathname.replace('/api/admin/', '');
  const search = req.nextUrl.search;
  const url = `${BACKEND_URL}/${path}${search}`;

  const headers: Record<string, string> = { 'x-api-key': ADMIN_API_KEY };

  // Forward Authorization header (Bearer token) for session-based auth
  const authHeader = req.headers.get('authorization');
  if (authHeader) headers['Authorization'] = authHeader;

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const contentType = req.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;
    body = await req.text();
  }

  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return NextResponse.json(data, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}

export async function GET(req: NextRequest) { return proxy(req, 'GET'); }
export async function POST(req: NextRequest) { return proxy(req, 'POST'); }
export async function PUT(req: NextRequest) { return proxy(req, 'PUT'); }
export async function DELETE(req: NextRequest) { return proxy(req, 'DELETE'); }
export async function PATCH(req: NextRequest) { return proxy(req, 'PATCH'); }
