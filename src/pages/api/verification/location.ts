import type { APIRoute } from 'astro';
import { getSession, saveSession } from '../../../lib/storage';
import { validateLocationData } from '../../../lib/location';
import { getVerificationCookie } from '../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json().catch(() => null);
    const sessionId = body?.sessionId || getVerificationCookie(cookies);
    const rawLocation = body?.location;

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
          error: { code: 'SESSION_EXPIRED', message: 'Verification session has expired.' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validation = validateLocationData(rawLocation);
    if (!validation.valid || !validation.sanitized) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: validation.isLowAccuracy ? 'LOW_LOCATION_ACCURACY' : 'INVALID_LOCATION',
            message: validation.error || 'Failed to validate GPS location coordinates.'
          }
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    session.location = validation.sanitized;
    session.step = 3;
    session.status = 'LOCATION_GRANTED';
    saveSession(session);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          step: 3,
          accuracy: validation.sanitized.accuracy,
          formattedAccuracy: `±${Math.round(validation.sanitized.accuracy)} meters`
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || 'Error processing location.' }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
