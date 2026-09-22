import type { APIRoute } from 'astro';
import { testTelegramConnection } from '../../../lib/telegram';
import { verifyAdminSessionToken } from '../../../lib/security';
import { getAdminCookie } from '../../../lib/session';

export const prerender = false;

export const ALL: APIRoute = async ({ cookies }) => {
  const adminToken = getAdminCookie(cookies);
  if (!verifyAdminSessionToken(adminToken)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Admin authentication required.' }
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result = await testTelegramConnection();

  return new Response(
    JSON.stringify(result),
    {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
