import type { APIRoute } from 'astro';
import { getNota } from '../../../lib/storage';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Missing nota ID.' }
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const nota = getNota(id);
  if (!nota) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Nota not found.' }
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Return public metadata ONLY (Zero sensitive image content or confidential payload)
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        id: nota.id,
        notaNumber: nota.notaNumber,
        title: nota.title,
        createdAt: nota.createdAt,
        isProtected: true,
        verificationRequired: true
      }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
