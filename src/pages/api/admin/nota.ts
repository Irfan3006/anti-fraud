import type { APIRoute } from 'astro';
import { verifyAdminSessionToken } from '../../../lib/security';
import { getAdminCookie } from '../../../lib/session';
import { listNotas, deleteNota, getNota, saveNota } from '../../../lib/storage';
import { fetchLiveNotasFromAppsScript } from '../../../lib/apps-script';

export const prerender = false;

// GET: List all notas (admin only)
export const GET: APIRoute = async ({ cookies }) => {
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

  const localNotas = listNotas();
  const remoteNotas = await fetchLiveNotasFromAppsScript().catch(() => []);

  const notaMap = new Map();
  remoteNotas.forEach((n) => {
    notaMap.set(n.id, n);
    saveNota(n); // Cache in memory
  });
  localNotas.forEach((n) => {
    if (!notaMap.has(n.id)) {
      notaMap.set(n.id, n);
    }
  });

  const notas = Array.from(notaMap.values()).map(({ imageData, ...meta }) => meta);

  return new Response(
    JSON.stringify({
      success: true,
      data: { notas }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// DELETE: Delete a nota (admin only)
export const DELETE: APIRoute = async ({ request, cookies }) => {
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
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Missing nota ID parameter.' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existing = getNota(id);
    if (!existing) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Nota not found.' }
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    deleteNota(id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Nota ${existing.notaNumber} deleted successfully.`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || 'Internal error' }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
