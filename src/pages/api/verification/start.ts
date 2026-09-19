import type { APIRoute } from 'astro';
import { getNota, saveNota, saveSession } from '../../../lib/storage';
import { fetchNotaFromAppsScript } from '../../../lib/apps-script';
import { createNewVerificationSession, setVerificationCookie } from '../../../lib/session';
import { checkRateLimit } from '../../../lib/security';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ip = clientAddress || request.headers.get('x-forwarded-for') || '127.0.0.1';

  // Rate limiting (20 verification starts per minute per IP)
  const rateLimit = checkRateLimit(`verif_start_${ip}`, 20, 60 * 1000);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Too many verification requests. Please wait ${rateLimit.resetInSeconds} seconds before trying again.`
        }
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const notaId = body?.notaId;

    if (!notaId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'MISSING_NOTA_ID', message: 'Nota ID is required to start verification.' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let nota = getNota(notaId);
    if (!nota) {
      nota = await fetchNotaFromAppsScript(notaId).catch(() => null);
      if (nota) {
        saveNota(nota);
      }
    }

    if (!nota) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOTA_NOT_FOUND', message: 'Requested nota does not exist in registry.' }
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = createNewVerificationSession(notaId, ip);
    saveSession(session);
    setVerificationCookie(cookies, session.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sessionId: session.id,
          notaId: session.notaId,
          antiSpoofNonce: session.antiSpoofNonce,
          expiresAt: session.expiresAt,
          step: 1
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || 'Failed to start verification.' }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
