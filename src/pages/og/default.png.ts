import type { APIRoute } from 'astro';
import { Resvg } from '@resvg/resvg-js';

export const prerender = false;

export const GET: APIRoute = async () => {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" style="background:#070d1e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <rect width="1200" height="630" fill="#0b132b" />
    <rect x="30" y="30" width="1140" height="570" rx="16" fill="none" stroke="#1d4ed8" stroke-width="2" opacity="0.6" />
    <g transform="translate(100, 160)">
      <rect x="0" y="0" width="80" height="80" rx="16" fill="#1d4ed8" />
      <path d="M40 18 L60 62 L20 62 Z" fill="#ffffff" />
      <text x="110" y="55" font-size="48" font-weight="bold" fill="#ffffff">ANTI-FRAUD NOTA VERIFICATION</text>
    </g>
    <g transform="translate(100, 300)">
      <text x="0" y="0" font-size="28" fill="#94a3b8">Secure, tamper-evident invoice verification network.</text>
      <text x="0" y="45" font-size="22" fill="#64748b">Prevents fraud with mandatory device, location, and camera verification audits.</text>
    </g>
    <g transform="translate(100, 480)">
      <rect x="0" y="0" width="340" height="50" rx="8" fill="#16a34a" />
      <text x="35" y="32" font-size="20" font-weight="bold" fill="#ffffff">&#10003; Verified Anti-Tamper System</text>
    </g>
  </svg>
  `.trim();

  try {
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: 1200
      }
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new Response(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pngBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err) {
    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  }
};
