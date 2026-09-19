import type { APIRoute } from 'astro';
import { verifyAdminSessionToken } from '../../../lib/security';
import { getAdminCookie } from '../../../lib/session';
import { scrapeOgMetadata } from '../../../lib/og-scraper';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
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

  try {
    const body = await request.json().catch(() => ({}));
    const url = body?.url;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_URL', message: 'URL target tidak boleh kosong.' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const metadata = await scrapeOgMetadata(url.trim());

    return new Response(
      JSON.stringify({
        success: true,
        data: metadata
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'SCRAPE_FAILED', message: err.message || 'Gagal mengekstrak metadata dari URL target.' }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
