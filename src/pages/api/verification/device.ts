import type { APIRoute } from 'astro';
import { getSession, saveSession } from '../../../lib/storage';
import { sanitizeDeviceInfo } from '../../../lib/device';
import { getVerificationCookie } from '../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json().catch(() => null);
    const sessionId = body?.sessionId || getVerificationCookie(cookies);
    const rawDevice = body?.device;

    if (!sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NO_SESSION', message: 'Verification session not found or expired.' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = getSession(sessionId);
    if (!session || session.status === 'EXPIRED') {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'SESSION_EXPIRED', message: 'Verification session expired. Please restart verification.' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userAgentHeader = request.headers.get('user-agent') || '';
    const deviceInfo = sanitizeDeviceInfo(rawDevice, userAgentHeader);

    session.device = deviceInfo;
    session.step = 2;
    session.status = 'DEVICE_RECORDED';
    saveSession(session);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          step: 2,
          deviceHash: deviceInfo.deviceHash
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || 'Error processing device info.' }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
