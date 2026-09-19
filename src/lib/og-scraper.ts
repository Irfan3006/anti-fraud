/**
 * Open Graph & Social Media Metadata Scraper
 * Extracts og:title, og:description, og:image, and site_name from target URLs
 * including Instagram, TikTok, YouTube, news, and standard websites.
 */

export interface ScrapedOgMetadata {
  title: string;
  description: string;
  ogImage: string;
  siteName: string;
  targetUrl: string;
  themeColor?: string;
  favicon?: string;
}

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .trim();
}

function extractMetaContent(html: string, propertyOrNames: string[]): string | null {
  for (const name of propertyOrNames) {
    // Case 1: property/name before content
    const regex1 = new RegExp(
      `<meta\\s+[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`,
      'i'
    );
    const match1 = html.match(regex1);
    if (match1 && match1[1]) {
      return decodeHtmlEntities(match1[1]);
    }

    // Case 2: content before property/name
    const regex2 = new RegExp(
      `<meta\\s+[^>]*content=["']([^"']*)["'][^>]*?(?:property|name)=["']${name}["']`,
      'i'
    );
    const match2 = html.match(regex2);
    if (match2 && match2[1]) {
      return decodeHtmlEntities(match2[1]);
    }
  }
  return null;
}

function extractTagContent(html: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = html.match(regex);
  if (match && match[1]) {
    return decodeHtmlEntities(match[1].replace(/<[^>]+>/g, '').trim());
  }
  return null;
}

function extractLinkHref(html: string, rel: string): string | null {
  const regex1 = new RegExp(`<link\\s+[^>]*rel=["']${rel}["'][^>]*href=["']([^"']*)["']`, 'i');
  const match1 = html.match(regex1);
  if (match1 && match1[1]) return match1[1].trim();

  const regex2 = new RegExp(`<link\\s+[^>]*href=["']([^"']*)["'][^>]*rel=["']${rel}["']`, 'i');
  const match2 = html.match(regex2);
  if (match2 && match2[1]) return match2[1].trim();

  return null;
}

function resolveUrl(relativeOrAbsolute: string | null | undefined, baseUrl: string): string {
  if (!relativeOrAbsolute) return '';
  try {
    return new URL(relativeOrAbsolute, baseUrl).href;
  } catch {
    return relativeOrAbsolute;
  }
}

/**
 * Scrape Open Graph and Twitter Card metadata from any public URL
 */
export async function scrapeOgMetadata(rawUrl: string): Promise<ScrapedOgMetadata> {
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (err: any) {
    throw new Error(`URL tidak valid: ${err.message}`);
  }

  // Handle direct image URLs (e.g. .jpg, .png, .webp, .gif)
  if (/\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(parsedUrl.pathname)) {
    const filename = parsedUrl.pathname.split('/').pop() || 'Image';
    return {
      title: filename,
      description: `Gambar dari ${parsedUrl.hostname}`,
      ogImage: url,
      siteName: parsedUrl.hostname,
      targetUrl: url
    };
  }

  // User-Agents to simulate social crawlers
  const primaryUa = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
  const fallbackUa = 'Twitterbot/1.0';

  let html = '';
  let finalUrl = url;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    let res = await fetch(url, {
      headers: {
        'User-Agent': primaryUa,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeout);

    if (!res.ok && res.status >= 400) {
      // Try fallback User-Agent
      const fallbackController = new AbortController();
      const fbTimeout = setTimeout(() => fallbackController.abort(), 10000);
      res = await fetch(url, {
        headers: {
          'User-Agent': fallbackUa,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        signal: fallbackController.signal,
        redirect: 'follow'
      });
      clearTimeout(fbTimeout);
    }

    finalUrl = res.url || url;
    html = await res.text();
  } catch (err: any) {
    console.warn(`Scraping warning for ${url}:`, err.message);
    // Even if fetch fails, return minimal default structure
    return {
      title: parsedUrl.hostname,
      description: `Tautan ke ${parsedUrl.hostname}`,
      ogImage: '',
      siteName: parsedUrl.hostname,
      targetUrl: url
    };
  }

  // 1. Title
  const title =
    extractMetaContent(html, ['og:title', 'twitter:title', 'title']) ||
    extractTagContent(html, 'title') ||
    parsedUrl.hostname;

  // 2. Description
  const description =
    extractMetaContent(html, ['og:description', 'twitter:description', 'description']) ||
    `Lihat konten ini di ${parsedUrl.hostname}`;

  // 3. Image
  let rawOgImage =
    extractMetaContent(html, [
      'og:image',
      'og:image:secure_url',
      'og:image:url',
      'twitter:image',
      'twitter:image:src'
    ]) ||
    extractLinkHref(html, 'image_src') ||
    '';

  const ogImage = rawOgImage ? resolveUrl(rawOgImage, finalUrl) : '';

  // 4. Site Name
  let siteName =
    extractMetaContent(html, ['og:site_name', 'application-name', 'twitter:site']) ||
    parsedUrl.hostname.replace(/^www\./, '');

  // Normalize popular site names
  if (/instagram\.com$/i.test(parsedUrl.hostname)) siteName = 'Instagram';
  else if (/tiktok\.com$/i.test(parsedUrl.hostname)) siteName = 'TikTok';
  else if (/youtube\.com|youtu\.be$/i.test(parsedUrl.hostname)) siteName = 'YouTube';
  else if (/facebook\.com|fb\.watch$/i.test(parsedUrl.hostname)) siteName = 'Facebook';
  else if (/twitter\.com|x\.com$/i.test(parsedUrl.hostname)) siteName = 'X (Twitter)';
  else if (/shopee\./i.test(parsedUrl.hostname)) siteName = 'Shopee';
  else if (/tokopedia\.com$/i.test(parsedUrl.hostname)) siteName = 'Tokopedia';

  // 5. Favicon & Theme Color
  const rawFavicon =
    extractLinkHref(html, 'icon') ||
    extractLinkHref(html, 'shortcut icon') ||
    extractLinkHref(html, 'apple-touch-icon') ||
    '/favicon.ico';
  const favicon = resolveUrl(rawFavicon, finalUrl);
  const themeColor = extractMetaContent(html, ['theme-color']) || undefined;

  return {
    title,
    description,
    ogImage,
    siteName,
    targetUrl: url,
    themeColor,
    favicon
  };
}
