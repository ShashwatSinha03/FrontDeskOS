const ALLOWED_REDIRECT_PREFIXES = [
  '/ops',
  '/admin',
  '/dashboard',
  '/settings',
  '/login',
  '/auth',
];

export function isSafeRedirect(path: string | null): boolean {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path.includes('//') || path.includes(':')) return false;
  try {
    const decoded = decodeURIComponent(path);
    if (decoded.includes('//') || decoded.includes(':')) return false;
  } catch {
    return false;
  }
  return ALLOWED_REDIRECT_PREFIXES.some((prefix) => path.startsWith(prefix));
}
