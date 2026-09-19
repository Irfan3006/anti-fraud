import crypto from 'node:crypto';
import type { VerifiedTokenPayload } from './types';

// Read secrets from environment
const SESSION_SECRET = process.env.SESSION_SECRET || 'super-secure-anti-fraud-session-secret-key-32-chars-minimum';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword123';

/**
 * Generate a cryptographically secure random alphanumeric ID
 */
export function generateSecureId(prefix: string = '', length: number = 8): string {
  const randomBytes = crypto.randomBytes(length).toString('hex');
  return prefix ? `${prefix}-${randomBytes}` : randomBytes;
}

/**
 * Perform timing-safe string comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Create a signed HMAC token for verified nota access
 */
export function createVerifiedNotaToken(payload: VerifiedTokenPayload): string {
  const dataString = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(dataString)
    .digest('base64url');
  return `${dataString}.${signature}`;
}

/**
 * Verify and decode an HMAC token for verified nota access
 */
export function verifyVerifiedNotaToken(token: string | undefined): VerifiedTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataString, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(dataString)
    .digest('base64url');

  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload: VerifiedTokenPayload = JSON.parse(
      Buffer.from(dataString, 'base64url').toString('utf-8')
    );

    // Check expiration
    if (!payload.expiresAt || Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Create an admin session token
 */
export function createAdminSessionToken(): string {
  const payload = {
    role: 'admin',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  const dataString = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET + '_admin')
    .update(dataString)
    .digest('base64url');
  return `${dataString}.${signature}`;
}

/**
 * Verify an admin session token
 */
export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [dataString, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET + '_admin')
    .update(dataString)
    .digest('base64url');

  if (!timingSafeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(dataString, 'base64url').toString('utf-8'));
    return payload.role === 'admin' && Date.now() <= payload.expiresAt;
  } catch {
    return false;
  }
}

/**
 * Validate admin password with timing-safe comparison
 */
export function validateAdminPassword(input: string): boolean {
  if (!input) return false;
  return timingSafeEqual(input, ADMIN_PASSWORD);
}

/**
 * Format timestamp to Western Indonesia Time (WIB / GMT+7)
 */
export function formatWIB(timestamp: string | number | Date | undefined | null): string {
  if (!timestamp) return '-';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    const dateStr = d.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timeStr = d.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\./g, ':');
    return `${dateStr} ${timeStr} WIB`;
  } catch {
    return String(timestamp);
  }
}

/**
 * Create pseudonymous SHA-256 device hash from hardware hints
 */
export function computeDeviceHash(data: {
  userAgent?: string;
  platform?: string;
  deviceModel?: string;
  screenWidth?: number;
  screenHeight?: number;
  devicePixelRatio?: number;
  timezone?: string;
  language?: string;
  hardwareConcurrency?: number;
  canvasFingerprintHash?: string;
}): string {
  const raw = [
    data.userAgent || '',
    data.platform || '',
    data.deviceModel || '',
    data.screenWidth || '',
    data.screenHeight || '',
    data.devicePixelRatio || '',
    data.timezone || '',
    data.language || '',
    data.hardwareConcurrency || '',
    data.canvasFingerprintHash || ''
  ].join('|');

  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

// In-Memory Sliding Window Rate Limiter (Serverless friendly)
interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple sliding-window rate limiter
 * @returns { allowed: boolean, remaining: number, resetInSeconds: number }
 */
export function checkRateLimit(
  key: string,
  limit: number = 20,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Periodic cleanup
  if (rateLimitStore.size > 2000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now - v.firstRequest > windowMs) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!entry || now - entry.firstRequest > windowMs) {
    rateLimitStore.set(key, { count: 1, firstRequest: now });
    return { allowed: true, remaining: limit - 1, resetInSeconds: Math.ceil(windowMs / 1000) };
  }

  if (entry.count >= limit) {
    const resetInSeconds = Math.ceil((entry.firstRequest + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetInSeconds: Math.ceil((entry.firstRequest + windowMs - now) / 1000)
  };
}

/**
 * Validate image file upload constraints (JPEG, PNG, WebP only, max size 10MB)
 */
export function validateImageFile(
  mimeType: string,
  fileSize: number,
  maxSizeBytes: number = 10 * 1024 * 1024
): { valid: boolean; error?: string } {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file format (${mimeType}). Only JPEG, PNG, and WebP images are allowed.`
    };
  }

  if (fileSize > maxSizeBytes) {
    const sizeMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size exceeds the limit of ${sizeMb}MB.`
    };
  }

  return { valid: true };
}
