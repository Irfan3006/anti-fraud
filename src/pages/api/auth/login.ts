import type { APIRoute } from 'astro';
import { validateAdminPassword, createAdminSessionToken, checkRateLimit } from '../../../lib/security';
import { setAdminCookie } from '../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ip = clientAddress || request.headers.get('x-forwarded-for') || '127.0.0.1';

  // Rate limiting (5 attempts per minute)
  const rateLimit = checkRateLimit(`login_${ip}`, 5, 60 * 1000);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Too many login attempts. Try again in ${rateLimit.resetInSeconds} seconds.`
        }
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const password = body?.password;

    if (!password || !validateAdminPassword(password)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid administrative password.'
          }
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = createAdminSessionToken();
    setAdminCookie(cookies, token);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin authentication successful.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || 'Internal server error' }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
