import type { AstroCookies } from 'astro';
import { generateSecureId } from './security';
import type { VerificationSession } from './types';

export const VERIFICATION_COOKIE_NAME = 'af_verif_session';
export const VERIFIED_TOKEN_COOKIE_NAME = 'af_verified_token';
export const ADMIN_COOKIE_NAME = 'af_admin_session';

export const VERIFICATION_SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const VERIFIED_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Initialize a new verification session object
 */
export function createNewVerificationSession(
  notaId: string,
  ipAddress: string = '127.0.0.1'
): VerificationSession {
  const now = Date.now();
  return {
    id: generateSecureId('VRF', 10),
    notaId,
    status: 'INITIATED',
    step: 1,
    antiSpoofNonce: generateSecureId('NONCE', 8),
    createdAt: now,
    expiresAt: now + VERIFICATION_SESSION_TTL_MS,
    ipAddress
  };
}

/**
 * Cookie helper functions
 */
export function setVerificationCookie(cookies: AstroCookies, sessionId: string): void {
  cookies.set(VERIFICATION_COOKIE_NAME, sessionId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(VERIFICATION_SESSION_TTL_MS / 1000)
  });
}

export function getVerificationCookie(cookies: AstroCookies): string | undefined {
  return cookies.get(VERIFICATION_COOKIE_NAME)?.value;
}

export function clearVerificationCookie(cookies: AstroCookies): void {
  cookies.delete(VERIFICATION_COOKIE_NAME, { path: '/' });
}

export function setVerifiedTokenCookie(cookies: AstroCookies, token: string): void {
  cookies.set(VERIFIED_TOKEN_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(VERIFIED_TOKEN_TTL_MS / 1000)
  });
}

export function getVerifiedTokenCookie(cookies: AstroCookies): string | undefined {
  return cookies.get(VERIFIED_TOKEN_COOKIE_NAME)?.value;
}

export function clearVerifiedTokenCookie(cookies: AstroCookies): void {
  cookies.delete(VERIFIED_TOKEN_COOKIE_NAME, { path: '/' });
}

export function setAdminCookie(cookies: AstroCookies, token: string): void {
  cookies.set(ADMIN_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000)
  });
}

export function getAdminCookie(cookies: AstroCookies): string | undefined {
  return cookies.get(ADMIN_COOKIE_NAME)?.value;
}

export function clearAdminCookie(cookies: AstroCookies): void {
  cookies.delete(ADMIN_COOKIE_NAME, { path: '/' });
}
