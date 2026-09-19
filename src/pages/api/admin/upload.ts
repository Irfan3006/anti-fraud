import type { APIRoute } from 'astro';
import { verifyAdminSessionToken, generateSecureId, validateImageFile } from '../../../lib/security';
import { getAdminCookie } from '../../../lib/session';
import { saveNota } from '../../../lib/storage';
import { dispatchSaveNotaToAppsScript } from '../../../lib/apps-script';
import type { Nota } from '../../../lib/types';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
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
    const contentType = request.headers.get('content-type') || '';

    let title = '';
    let notaNumber = '';
    let description = '';
    let imageData = '';
    let mimeType: any = 'image/jpeg';
    let fileSize = 0;
    let type: 'nota' | 'link' = 'nota';
    let targetUrl: string | undefined = undefined;
    let ogImage: string | undefined = undefined;
    let siteName: string | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = (formData.get('title') as string) || '';
      notaNumber = (formData.get('notaNumber') as string) || '';
      description = (formData.get('description') as string) || '';
      type = ((formData.get('type') as string) === 'link' ? 'link' : 'nota');
      targetUrl = (formData.get('targetUrl') as string) || undefined;
      ogImage = (formData.get('ogImage') as string) || undefined;
      siteName = (formData.get('siteName') as string) || undefined;

      const file = formData.get('file') as File | null;
      if (type === 'nota') {
        if (!file || file.size === 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NO_FILE', message: 'No nota image file provided.' }
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        mimeType = file.type;
        fileSize = file.size;

        const fileValidation = validateImageFile(mimeType, fileSize, 10 * 1024 * 1024);
        if (!fileValidation.valid) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'INVALID_FILE', message: fileValidation.error }
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        imageData = `data:${mimeType};base64,${base64}`;
      } else {
        // Link type via multipart form
        if (!targetUrl) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'MISSING_TARGET_URL', message: 'Target URL is required for link type.' }
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        imageData = ogImage || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="315" viewBox="0 0 600 315"><rect width="100%" height="100%" fill="%230b132b"/></svg>`;
        mimeType = 'image/jpeg';
        fileSize = imageData.length;
      }
    } else {
      const json = await request.json().catch(() => ({}));
      title = json.title || '';
      notaNumber = json.notaNumber || '';
      description = json.description || '';
      type = json.type === 'link' ? 'link' : 'nota';
      targetUrl = json.targetUrl || undefined;
      ogImage = json.ogImage || undefined;
      siteName = json.siteName || undefined;
      imageData = json.imageData || '';
      mimeType = json.mimeType || 'image/jpeg';
      fileSize = imageData.length;

      if (type === 'link') {
        if (!targetUrl) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'MISSING_TARGET_URL', message: 'Target URL is required for link mode.' }
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (!imageData) {
          imageData = ogImage || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="315" viewBox="0 0 600 315"><rect width="100%" height="100%" fill="%230b132b"/></svg>`;
          fileSize = imageData.length;
        }
      } else {
        if (!imageData) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'NO_FILE', message: 'Missing image data.' }
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (!title || !notaNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Title and document/invoice number are required.' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate safe random unique nota ID (8 hex chars)
    const notaId = generateSecureId('', 4); // 8 hex characters
    const createdAt = new Date().toISOString();

    const newNota: Nota = {
      id: notaId,
      notaNumber: notaNumber.trim(),
      title: title.trim(),
      description: description.trim(),
      imageData: imageData,
      mimeType: mimeType,
      fileSize: fileSize,
      createdAt: createdAt,
      createdBy: 'Administrator',
      type: type,
      targetUrl: targetUrl ? targetUrl.trim() : undefined,
      ogImage: ogImage ? ogImage.trim() : undefined,
      siteName: siteName ? siteName.trim() : undefined
    };

    saveNota(newNota);

    // Persist to Google Apps Script / Drive permanently before returning response
    await dispatchSaveNotaToAppsScript(newNota).catch((err) => {
      console.error('Failed to persist nota to Apps Script:', err);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Nota created successfully.',
        data: {
          notaId: newNota.id,
          notaNumber: newNota.notaNumber,
          title: newNota.title,
          verificationUrl: `/nota/${newNota.id}`,
          createdAt: newNota.createdAt
        }
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || 'Failed to create nota' }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
