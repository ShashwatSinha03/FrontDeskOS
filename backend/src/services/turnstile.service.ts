import { config } from '../config';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', config.TURNSTILE_SECRET_KEY);
    formData.append('response', token);

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) {
      console.error(`Turnstile verification HTTP ${response.status}`);
      return false;
    }

    const data = await response.json() as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}
