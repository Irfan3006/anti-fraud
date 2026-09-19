import type { APIRoute } from 'astro';
import { getNota, saveNota } from '../../../lib/storage';
import { fetchNotaFromAppsScript } from '../../../lib/apps-script';
import { Resvg } from '@resvg/resvg-js';

export const prerender = false;

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(null, { status: 404 });
  }

  // 1. Fetch nota from memory or persistent Apps Script / Drive
  let nota = getNota(id);
  if (!nota) {
    nota = await fetchNotaFromAppsScript(id).catch(() => null);
    if (nota) {
      saveNota(nota); // Cache in memory
    }
  }

  // 2. If admin uploaded a real invoice/receipt image, serve the exact uploaded image
  if (nota && nota.imageData) {
    try {
      // If it's a raster base64 Data URI (JPEG, PNG, WebP)
      if (nota.imageData.startsWith('data:image/')) {
        const matches = nota.imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const imageBuffer = Buffer.from(base64Data, 'base64');

          return new Response(imageBuffer, {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Content-Length': imageBuffer.length.toString(),
              'Cache-Control': 'public, max-age=3600, s-maxage=86400'
            }
          });
        }

        // If it's an SVG Data URI, render to high-res PNG using Resvg
        if (nota.imageData.startsWith('data:image/svg+xml')) {
          let svgContent = '';
          if (nota.imageData.includes(';utf8,')) {
            svgContent = decodeURIComponent(nota.imageData.split(';utf8,')[1]);
          } else if (nota.imageData.includes(';base64,')) {
            svgContent = Buffer.from(nota.imageData.split(';base64,')[1], 'base64').toString('utf-8');
          }

          if (svgContent) {
            const resvg = new Resvg(svgContent, {
              fitTo: { mode: 'width', value: 1200 }
            });
            const pngData = resvg.render();
            const pngBuffer = pngData.asPng();

            return new Response(new Uint8Array(pngBuffer), {
              status: 200,
              headers: {
                'Content-Type': 'image/png',
                'Content-Length': pngBuffer.length.toString(),
                'Cache-Control': 'public, max-age=3600, s-maxage=86400'
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('Error processing uploaded nota image for OG:', err);
    }
  }

  // 3. Fallback to Dynamic Security OG Card
  const rawNotaNumber = nota ? nota.notaNumber : (id ? `#${id}` : '#UNKNOWN');
  const rawTitle = nota ? (nota.title.length > 50 ? nota.title.substring(0, 47) + '...' : nota.title) : 'Official Protected Document';
  const rawDateStr = nota ? new Date(nota.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Verified Registry';

  const notaNumber = escapeXml(rawNotaNumber);
  const title = escapeXml(rawTitle);
  const dateStr = escapeXml(rawDateStr);

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" style="background:#070d1e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <defs>
      <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0b132b" />
        <stop offset="100%" stop-color="#070d1e" />
      </linearGradient>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2563eb" />
        <stop offset="100%" stop-color="#1d4ed8" />
      </linearGradient>
    </defs>

    <rect width="1200" height="630" fill="url(#gridGrad)" />
    <rect x="30" y="30" width="1140" height="570" rx="16" fill="none" stroke="#1d4ed8" stroke-width="2" opacity="0.6" />
    
    <g transform="translate(80, 80)">
      <rect x="0" y="0" width="310" height="38" rx="6" fill="#1c2541" stroke="#3a506b" stroke-width="1" />
      <circle cx="20" cy="19" r="6" fill="#22c55e" />
      <text x="36" y="24" font-size="14" font-weight="bold" fill="#ffffff" letter-spacing="1">ANTI-FRAUD VERIFIED NOTE</text>
    </g>

    <g transform="translate(930, 80)">
      <circle cx="90" cy="90" r="80" fill="#0b132b" stroke="#1d4ed8" stroke-width="3" />
      <path d="M90 40 L130 55 L130 95 C130 125 90 145 90 145 C90 145 50 125 50 95 L50 55 Z" fill="url(#shieldGrad)" />
      <path d="M75 90 L85 100 L108 78" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <g transform="translate(80, 180)">
      <text x="0" y="0" font-size="20" font-weight="600" fill="#94a3b8" letter-spacing="0.5">SECURE FINANCIAL DOCUMENT</text>
      <text x="0" y="55" font-size="52" font-weight="800" fill="#ffffff" letter-spacing="-1">Nota ${notaNumber}</text>
      <text x="0" y="105" font-size="24" fill="#cbd5e1">${title}</text>
    </g>

    <g transform="translate(80, 340)">
      <rect x="0" y="0" width="760" height="120" rx="12" fill="#0b132b" stroke="#dc2626" stroke-width="1.5" />
      <g transform="translate(24, 28)">
        <rect x="0" y="12" width="28" height="22" rx="3" fill="#ef4444" />
        <path d="M6 12 V8 A8 8 0 0 1 22 8 V12" fill="none" stroke="#ef4444" stroke-width="4" />
        <circle cx="14" cy="22" r="2.5" fill="#ffffff" />
      </g>
      <text x="75" y="44" font-size="20" font-weight="bold" fill="#ef4444">Verification Required Before Viewing</text>
      <text x="75" y="74" font-size="15" fill="#94a3b8">This confidential document requires biometric and device verification.</text>
      <text x="75" y="96" font-size="13" fill="#64748b">Registry Date: ${dateStr} &#8226; Tamper Detection Active</text>
    </g>

    <g transform="translate(80, 530)">
      <text x="0" y="0" font-size="16" font-weight="bold" fill="#60a5fa">ANTI-FRAUD NOTA REGISTRY</text>
      <text x="0" y="24" font-size="14" fill="#64748b">Cryptographically signed &#8226; Evidence logged to Google Drive &amp; Sheets Audit Trail</text>
    </g>
  </svg>
  `.trim();

  try {
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 }
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new Response(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pngBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600, s-maxage=86400'
      }
    });
  } catch {
    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400'
      }
    });
  }
};
