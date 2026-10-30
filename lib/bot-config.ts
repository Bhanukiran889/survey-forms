import 'server-only';

export function botConfiguration() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!siteKey && !secretKey) return { mode: 'basic' as const };
  const keyPattern = /^[a-zA-Z0-9_-]{10,256}$/;
  if (!siteKey || !secretKey || !keyPattern.test(siteKey) || !keyPattern.test(secretKey)) throw new Error('CONFIG_BOT_PROTECTION');
  // Official always-pass testing keys must never silently protect a production deployment.
  if (process.env.NODE_ENV === 'production' && (/^[123]x0{10}/.test(siteKey) || /^[123]x0{10}/.test(secretKey))) throw new Error('CONFIG_BOT_TEST_KEYS');
  return { mode: 'turnstile' as const, siteKey, secretKey };
}
