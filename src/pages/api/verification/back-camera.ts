import type { APIRoute } from 'astro';
import { getSession, saveSession } from '../../../lib/storage';
import { getVerificationCookie } from '../../../lib/session';
import type { CameraEvidence } from '../../../lib/types';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json().catch(() => null);
    const sessionId = body?.sessionId || getVerificationCookie(cookies);
    const dataUri = body?.dataUri;
    const captureTimestamp = Number(body?.captureTimestamp) || Date.now();
    const trackReadyState = body?.trackReadyState || 'live';
    const resolution = body?.resolution;

    if (!sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NO_SESSION', message: 'Verification session not found.' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = getSession(sessionId);
    if (!session || session.status === 'EXPIRED') {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'SESSION_EXPIRED', message: 'Verification session expired.' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_IMAGE', message: 'Back camera frame capture is missing or corrupted.' }
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (dataUri.length > 4 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'IMAGE_TOO_LARGE', message: 'Compressed capture frame exceeds allowed size.' }
        }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const evidence: CameraEvidence = {
      dataUri,
      facingMode: 'environment',
      captureTimestamp,
      trackReadyState,
      resolution
    };

    session.backCamera = evidence;
    session.step = 5;
    session.status = 'BACK_CAPTURED';
    saveSession(session);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          step: 5,
          message: 'Back camera evidence securely staged.'
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || 'Error processing back camera frame.' }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
