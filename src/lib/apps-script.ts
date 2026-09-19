import type { VerificationSession, AuditLog } from './types';
import { appendAuditLog } from './storage';
import { isConsumerIsp } from './ip-intelligence';

const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';
const GOOGLE_APPS_SCRIPT_SECRET =
  process.env.GOOGLE_APPS_SCRIPT_SECRET || 'antifraud-secret-key-change-this-in-production-12345';

export interface DispatchEvidenceResult {
  success: boolean;
  message?: string;
  frontCameraUrl?: string;
  backCameraUrl?: string;
  error?: string;
}

/**
 * Dispatch verification evidence and metadata to Google Apps Script backend
 */
export async function dispatchEvidenceToAppsScript(
  session: VerificationSession,
  status: 'VERIFIED' | 'FAILED' = 'VERIFIED',
  failureReason: string = ''
): Promise<DispatchEvidenceResult> {
  const durationMs = Date.now() - session.createdAt;
  const timestamp = new Date().toISOString();

  const batteryInfo = session.device?.batteryLevel != null 
    ? `${session.device.batteryLevel}% ${session.device.isCharging ? '(Charging)' : '(Battery)'}` 
    : '-';
  const networkInfo = session.device?.effectiveType 
    ? `${session.device.effectiveType.toUpperCase()}${session.device.networkType ? ` / ${session.device.networkType}` : ''}${session.device.downlinkSpeed ? ` (${session.device.downlinkSpeed} Mbps, ${session.device.rtt ?? 0}ms)` : ''}` 
    : (session.device?.networkType || '-');
  const displayInfo = session.device 
    ? `${session.device.screenOrientation || 'portrait'} · ${session.device.colorDepth ? `${session.device.colorDepth}-bit` : '24-bit'} · ${session.device.colorGamut?.toUpperCase() || 'sRGB'} · ${session.device.isDarkMode ? 'Dark' : 'Light'}` 
    : '-';
  const storageInfo = session.device?.storageEstimate 
    ? `${(session.device.storageEstimate.available / (1024 * 1024 * 1024)).toFixed(1)} GB Free / ${(session.device.storageEstimate.quota / (1024 * 1024 * 1024)).toFixed(1)} GB` 
    : '-';

  const ipIntel = session.ipIntelligence;

  // Safely package rich telemetry into failureReason so Google Sheets permanently archives it
  const forensicMeta = {
    batt: batteryInfo,
    net: networkInfo,
    disp: displayInfo,
    stor: storageInfo,
    isp: ipIntel?.isp || '-',
    vpn: ipIntel?.isVpn ? (ipIntel.vpnType || 'VPN') : 'NO',
    city: ipIntel?.locationSummary || '-'
  };
  const cleanReason = failureReason || session.failureReason || '-';
  const persistentFailureReason = `${cleanReason} __F_${encodeURIComponent(JSON.stringify(forensicMeta))}`;

  const payload = {
    secret: GOOGLE_APPS_SCRIPT_SECRET,
    verificationId: session.id,
    notaId: session.notaId,
    status: status,
    timestamp: timestamp,
    verificationDurationMs: durationMs,
    failureReason: persistentFailureReason,
    batteryInfo,
    networkInfo,
    displayInfo,
    storageInfo,
    isp: ipIntel?.isp || '-',
    vpnTag: ipIntel?.isVpn ? (ipIntel.vpnType || 'VPN DETECTED') : 'DIRECT',
    cityLocation: ipIntel?.locationSummary || '-',
    ipAddress: session.ipAddress || '127.0.0.1',
    location: session.location || {
      latitude: 0,
      longitude: 0,
      accuracy: 0
    },
    device: session.device || {},
    frontCamera: session.frontCamera?.dataUri || '',
    backCamera: session.backCamera?.dataUri || ''
  };

  let frontCameraUrl = session.frontCamera ? `[Archived locally: ${session.id}_front.jpg]` : '-';
  let backCameraUrl = session.backCamera ? `[Archived locally: ${session.id}_back.jpg]` : '-';

  // If Google Apps Script Web App URL is configured, send HTTP POST
  if (GOOGLE_APPS_SCRIPT_URL && GOOGLE_APPS_SCRIPT_URL.startsWith('http')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          frontCameraUrl = result.data.frontCameraFile || frontCameraUrl;
          backCameraUrl = result.data.backCameraFile || backCameraUrl;
        }
      } else {
        console.warn(`Google Apps Script returned status ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      console.error('Error dispatching evidence to Google Apps Script:', err.message || err);
      // Even if GAS network fails, we continue audit trail locally so user experience is not blocked
    }
  } else {
    // In local development / unconfigured GAS mode
    frontCameraUrl = session.frontCamera ? `Google Drive: Anti Fraud Verification/nota/${session.notaId}/${session.id}/${session.id}_front.jpg` : '-';
    backCameraUrl = session.backCamera ? `Google Drive: Anti Fraud Verification/nota/${session.notaId}/${session.id}/${session.id}_back.jpg` : '-';
  }

  // Always log to local/serverless audit trail store
  const auditLogEntry: AuditLog = {
    verificationId: session.id,
    notaId: session.notaId,
    timestamp: timestamp,
    status: status,
    latitude: session.location?.latitude ?? '-',
    longitude: session.location?.longitude ?? '-',
    locationAccuracy: session.location?.accuracy ? `±${session.location.accuracy}m` : '-',
    altitude: session.location?.altitude ?? '-',
    altitudeAccuracy: session.location?.altitudeAccuracy ?? '-',
    heading: session.location?.heading ?? '-',
    speed: session.location?.speed ?? '-',
    timezone: session.device?.timezone ?? '-',
    ipAddress: session.ipAddress ?? '-',
    userAgent: session.device?.userAgent ?? '-',
    platform: session.device?.deviceModel || session.device?.platform || '-',
    deviceModel: session.device?.deviceModel || '-',
    language: session.device?.language ?? '-',
    screenResolution: session.device ? `${session.device.screenWidth}x${session.device.screenHeight}` : '-',
    devicePixelRatio: session.device?.devicePixelRatio ?? '-',
    hardwareConcurrency: session.device?.hardwareConcurrency ?? '-',
    deviceMemory: session.device?.deviceMemory ?? '-',
    mobile: session.device?.mobile ? 'TRUE' : 'FALSE',
    frontCameraFile: frontCameraUrl,
    backCameraFile: backCameraUrl,
    // Format Enhanced Forensic Telemetry Strings
    batteryInfo,
    networkInfo,
    displayInfo,
    storageInfo,
    isp: ipIntel?.isp || '-',
    cityLocation: ipIntel?.locationSummary || '-',
    isVpn: ipIntel?.isVpn ?? false,
    vpnTag: ipIntel?.isVpn ? (ipIntel.vpnType || 'VPN DETECTED') : 'DIRECT',
    deviceHash: session.device?.deviceHash ?? '-',
    verificationDuration: `${(durationMs / 1000).toFixed(1)}s`,
    failureReason: cleanReason
  };

  appendAuditLog(auditLogEntry);

  return {
    success: true,
    frontCameraUrl,
    backCameraUrl
  };
}

/**
 * Fetch live audit logs directly from Google Sheets via Google Apps Script Web App
 */
export async function fetchLiveSheetLogs(): Promise<AuditLog[]> {
  if (!GOOGLE_APPS_SCRIPT_URL || !GOOGLE_APPS_SCRIPT_URL.startsWith('http')) {
    return [];
  }

  try {
    const targetUrl = `${GOOGLE_APPS_SCRIPT_URL}?action=getLogs&secret=${encodeURIComponent(GOOGLE_APPS_SCRIPT_SECRET)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const json = await res.json();
    if (json.success && Array.isArray(json.logs) && json.logs.length > 0) {
      return json.logs.map((log: any) => {
        let failureReason = String(log.failureReason || '-');
        let batteryInfo = log.batteryInfo || '-';
        let networkInfo = log.networkInfo || '-';
        let displayInfo = log.displayInfo || '-';
        let storageInfo = log.storageInfo || '-';
        let isp = log.isp || '-';
        let cityLocation = log.cityLocation || '-';
        let isVpn = log.isVpn ?? false;
        let vpnTag = log.vpnTag || (isVpn ? 'VPN DETECTED' : 'DIRECT');

        if (failureReason.includes('__F_')) {
          const parts = failureReason.split('__F_');
          failureReason = parts[0].trim() || '-';
          try {
            const meta = JSON.parse(decodeURIComponent(parts[1]));
            if (meta.batt && meta.batt !== '-') batteryInfo = meta.batt;
            if (meta.net && meta.net !== '-') networkInfo = meta.net;
            if (meta.disp && meta.disp !== '-') displayInfo = meta.disp;
            if (meta.stor && meta.stor !== '-') storageInfo = meta.stor;
            if (meta.isp && meta.isp !== '-') isp = meta.isp;
            if (meta.city && meta.city !== '-') cityLocation = meta.city;
            if (meta.vpn && meta.vpn !== 'NO') {
              isVpn = true;
              vpnTag = meta.vpn;
            }
          } catch {}
        }

        let platform = String(log.platform || '-');
        if (/24117RN76/i.test(platform)) {
          platform = 'Xiaomi Redmi Note 14 4G';
        }
        let deviceModel = log.deviceModel ? String(log.deviceModel) : platform;
        if (/24117RN76/i.test(deviceModel)) {
          deviceModel = 'Xiaomi Redmi Note 14 4G';
        }

        // Sanitize false positive VPN detections for consumer/regional ISPs (e.g. Jogja Medianet)
        if (isConsumerIsp(isp)) {
          if (!vpnTag || vpnTag === 'Hosting / Datacenter IP' || vpnTag === 'VPN DETECTED' || !vpnTag.toUpperCase().includes('PROXY')) {
            isVpn = false;
            vpnTag = 'DIRECT';
          }
        }

        return {
          ...log,
          platform,
          deviceModel,
          failureReason,
          batteryInfo,
          networkInfo,
          displayInfo,
          storageInfo,
          isp,
          cityLocation,
          isVpn,
          vpnTag
        };
      });
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Persist created Nota to Google Apps Script / Drive
 */
export async function dispatchSaveNotaToAppsScript(nota: any): Promise<boolean> {
  if (!GOOGLE_APPS_SCRIPT_URL || !GOOGLE_APPS_SCRIPT_URL.startsWith('http')) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: GOOGLE_APPS_SCRIPT_SECRET,
        action: 'saveNota',
        nota
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const json = await res.json();
    return json.success === true;
  } catch {
    return false;
  }
}

/**
 * Fetch a single Nota from Google Apps Script / Drive
 */
export async function fetchNotaFromAppsScript(id: string): Promise<any | null> {
  if (!GOOGLE_APPS_SCRIPT_URL || !GOOGLE_APPS_SCRIPT_URL.startsWith('http')) {
    return null;
  }

  try {
    const targetUrl = `${GOOGLE_APPS_SCRIPT_URL}?action=getNota&id=${encodeURIComponent(id)}&secret=${encodeURIComponent(GOOGLE_APPS_SCRIPT_SECRET)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const json = await res.json();
    if (json.success && json.nota) {
      return json.nota;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch all Notas from Google Apps Script / Drive
 */
export async function fetchLiveNotasFromAppsScript(): Promise<any[]> {
  if (!GOOGLE_APPS_SCRIPT_URL || !GOOGLE_APPS_SCRIPT_URL.startsWith('http')) {
    return [];
  }

  try {
    const targetUrl = `${GOOGLE_APPS_SCRIPT_URL}?action=listNotas&secret=${encodeURIComponent(GOOGLE_APPS_SCRIPT_SECRET)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const json = await res.json();
    if (json.success && Array.isArray(json.notas)) {
      return json.notas;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Delete a single Audit Log from Google Apps Script / Sheet
 */
export async function dispatchDeleteLogToAppsScript(verificationId: string): Promise<boolean> {
  if (!GOOGLE_APPS_SCRIPT_URL || !GOOGLE_APPS_SCRIPT_URL.startsWith('http')) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: GOOGLE_APPS_SCRIPT_SECRET,
        action: 'deleteLog',
        verificationId
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const json = await res.json();
    return json.success === true;
  } catch {
    return false;
  }
}

/**
 * Delete all Audit Logs from Google Apps Script / Sheet (optionally filtered by notaId)
 */
export async function dispatchDeleteAllLogsToAppsScript(notaId?: string): Promise<boolean> {
  if (!GOOGLE_APPS_SCRIPT_URL || !GOOGLE_APPS_SCRIPT_URL.startsWith('http')) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: GOOGLE_APPS_SCRIPT_SECRET,
        action: 'deleteAllLogs',
        notaId: notaId || undefined
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const json = await res.json();
    return json.success === true;
  } catch {
    return false;
  }
}
