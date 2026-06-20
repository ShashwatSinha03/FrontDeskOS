'use client';

const SESSION_COOKIE = 'fdos_session';

export function getSessionId(): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function setSessionId(id: string): void {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${secureFlag}`;
}

export async function ensureSession(businessId: string): Promise<string> {
  let sessionId = getSessionId();

  if (!sessionId) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/sessions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId }),
    });
    const json = await res.json();
    if (json.success && json.data?.sessionId) {
      sessionId = json.data.sessionId as string;
      setSessionId(sessionId);
    } else {
      sessionId = crypto.randomUUID();
      setSessionId(sessionId);
    }
  }

  return sessionId;
}
