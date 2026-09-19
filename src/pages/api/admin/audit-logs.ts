import type { APIRoute } from 'astro';
import { verifyAdminSessionToken } from '../../../lib/security';
import { getAdminCookie } from '../../../lib/session';
import { getAuditLogs, listNotas, deleteAuditLog, deleteAllAuditLogs } from '../../../lib/storage';
import { fetchLiveSheetLogs, dispatchDeleteLogToAppsScript, dispatchDeleteAllLogsToAppsScript } from '../../../lib/apps-script';

export const prerender = false;

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

  const localLogs = getAuditLogs();
  const liveSheetLogs = await fetchLiveSheetLogs().catch(() => []);

  const logMap = new Map();
  liveSheetLogs.forEach((l) => logMap.set(l.verificationId, l));
  localLogs.forEach((l) => {
    if (!logMap.has(l.verificationId)) {
      logMap.set(l.verificationId, l);
    }
  });
  const logs = Array.from(logMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const notas = listNotas();
  const stats = {
    totalNotas: notas.length,
    totalVerifications: logs.length,
    successfulVerifications: logs.filter((l) => l.status === 'VERIFIED').length,
    failedVerifications: logs.filter((l) => l.status === 'FAILED').length,
    todayVerifications: logs.filter((l) => {
      const d = new Date(l.timestamp);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length
  };

  return new Response(
    JSON.stringify({
      success: true,
      data: { stats, logs }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

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
    const isDeleteAll = url.searchParams.get('all') === 'true';
    const targetNotaId = url.searchParams.get('notaId');
    let verificationId = url.searchParams.get('id') || url.searchParams.get('verificationId');

    let requestBody: any = {};
    if (request.headers.get('content-type')?.includes('application/json')) {
      requestBody = await request.json().catch(() => ({}));
    }

    // 1. Delete ALL Logs Case
    if (isDeleteAll || requestBody.all === true) {
      const deletedCount = deleteAllAuditLogs();
      dispatchDeleteAllLogsToAppsScript().catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          message: `Semua ${deletedCount} log audit berhasil dihapus.`,
          data: { count: deletedCount }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Delete All Logs for a Specific Nota
    if (targetNotaId || requestBody.notaId) {
      const nId = targetNotaId || requestBody.notaId;
      const deletedCount = deleteAllAuditLogs(nId);
      dispatchDeleteAllLogsToAppsScript(nId).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          message: `Semua log untuk nota ${nId} berhasil dihapus.`,
          data: { notaId: nId, count: deletedCount }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Single Log Deletion
    if (!verificationId) {
      verificationId = requestBody.verificationId || requestBody.id;
    }

    if (!verificationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'verificationId, notaId, atau all=true diperlukan.' }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete single log
    deleteAuditLog(verificationId);
    dispatchDeleteLogToAppsScript(verificationId).catch(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Log audit berhasil dihapus.',
        data: { verificationId }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err?.message || 'Gagal menghapus log audit.' }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
