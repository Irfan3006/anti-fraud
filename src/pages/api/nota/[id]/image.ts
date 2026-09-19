import type { APIRoute } from 'astro';
import { verifyVerifiedNotaToken, verifyAdminSessionToken } from '../../../../lib/security';
import { getVerifiedTokenCookie, getAdminCookie } from '../../../../lib/session';
import { getNota, saveNota } from '../../../../lib/storage';
import { fetchNotaFromAppsScript } from '../../../../lib/apps-script';

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
  const { id } = params;
  if (!id) {
    return new Response('Nota ID required', { status: 400 });
  }

  let nota = getNota(id);
  if (!nota) {
    nota = await fetchNotaFromAppsScript(id).catch(() => null);
    if (nota) {
      saveNota(nota);
    }
  }

  if (!nota) {
    return new Response('Nota not found', { status: 404 });
  }

  // 1. Check if caller is verified user
  const verifiedToken = getVerifiedTokenCookie(cookies);
  const verifiedPayload = verifyVerifiedNotaToken(verifiedToken);
  const isVerifiedUser = verifiedPayload && verifiedPayload.notaId === id;

  // 2. Check if caller is authenticated admin
  const adminToken = getAdminCookie(cookies);
  const isAdmin = verifyAdminSessionToken(adminToken);

  if (!isVerifiedUser && !isAdmin) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED_ACCESS',
          message: 'Access denied. You must complete anti-fraud identity & device verification to view this document.'
        }
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Parse imageData Data URI
  const rawData = nota.imageData;
  let contentType = nota.mimeType || 'image/jpeg';
  let imageBuffer: Buffer;

  if (rawData.startsWith('data:')) {
    const parts = rawData.split(',');
    const match = parts[0].match(/:(.*?);/);
    if (match) {
      contentType = match[1] as any;
    }

    if (parts[0].includes('base64')) {
      imageBuffer = Buffer.from(parts[1], 'base64');
    } else {
      imageBuffer = Buffer.from(decodeURIComponent(parts[1]), 'utf-8');
    }
  } else {
    imageBuffer = Buffer.from(rawData, 'base64');
  }

  return new Response(new Uint8Array(imageBuffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length.toString(),
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
};
