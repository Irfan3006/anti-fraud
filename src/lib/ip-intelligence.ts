import type { IpIntelligence } from './types';

// In-memory cache for IP Intelligence lookups (IP -> result)
const ipCache = new Map<string, { data: IpIntelligence; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours cache

// Known Datacenter / Commercial VPN Hosting Providers
export const KNOWN_DATACENTER_PROVIDERS = [
  'digitalocean', 'amazon', 'aws', 'google cloud', 'gcp', 'microsoft azure',
  'linode', 'hetzner', 'ovh', 'vultr', 'choopa', 'm247', 'datacamp',
  'packethub', 'hostinger', 'leaseweb', 'alibaba cloud', 'tencent cloud', 'oracle cloud',
  'cloudflare', 'fastly', 'zenlayer', 'contabo', 'kamatera', 'scaleway',
  'ipvanish', 'expressvpn', 'nordvpn', 'surfshark', 'cyberghost', 'mullvad',
  'protonvpn', 'private internet access', 'tor exit', 'windscribe', 'hidemyass',
  'shadowsocks', 'purevpn', 'hotspot shield', 'tunnelbear', 'clouvider',
  'serverius', 'reliablesite', 'colocrossing', 'hivelocity',
  'dci indonesia', 'pt dci', 'indonesia cloud', 'idcloudhost', 'qwords', 'niagahoster', 'rumahweb'
];

// Patterns for recognized residential, mobile, and broadband telecommunication carriers
export const CONSUMER_ISP_PATTERNS = [
  // Indonesian Cellular & Mobile Providers
  'telkomsel', 'telekomunikasi selular',
  'indosat', 'ooredoo', 'im3',
  'xl axiata', 'axis', 'xl-axiata',
  'smartfren', 'wireless indonesia',
  'hutchison', 'tri id', '3 indonesia', 'tri gsm',
  // Indonesian Fixed Broadband & Fiber ISPs
  'telkom indonesia', 'indihome', 'speedy', 'telkom aksestama',
  'supra primatama', 'biznet',
  'link net', 'first media', 'firstmedia',
  'mora telematika', 'moratelindo', 'oxygen.id', 'oxygen',
  'cyberindo aditama', 'cbn',
  'myrepublic', 'innovate',
  'mnc kabel', 'mnc play',
  'bali tower', 'fiberstar', 'balifiber', 'bali fiber', 'lintasarta', 'transvision',
  // Yogyakarta & Regional Indonesian Broadband / Fiber / WISPs
  'jogja medianet', 'medianet', 'sarana insanmuda selaras', 'insanmuda selaras', 'citranet', 'sims',
  'indonesia comnets plus', 'icon+', 'iconplus', 'iconnet', 'pln icon plus',
  'trans hybrid communication', 'gmedia',
  'media antar nusa', 'nusanet',
  'iforte', 'protelindo',
  'megavision', 'indoritel',
  'citra sari makmur', 'csm',
  'remala abadi', 'tachyon',
  'varnion', 'varnion technology semesta',
  'hypernet', 'hipernet indodata',
  'qubika', 'arsy buana sentosa', 'abnet',
  'comet', 'retina', 'gasnet', 'pgn com',
  'radnet', 'centrin', 'jargas',
  'jet coms netindo', 'panca rasa pratama', 'solusindo kreasi pratama',
  'solonet', 'lintasdata', 'citraweb', 'citra web', 'dnet', 'jalawave',
  'parsaoran global datatrans', 'hsp net',
  'trias sentosa', 'mitra transaksi wahana', 'cempaka telematika',
  'groovy', 'kembar putra', 'jembatan citra nusantara',
  'maxindo', 'maxindo mitra solusi',
  'bignet', 'satnetindo',
  'sinarmas multimedia',
  'apjii', 'idnic',
  // Global Tier 1 & Consumer Providers
  'singtel', 'starhub', 'tmnet', 'telekom malaysia', 'celcom', 'digi telecommunications', 'maxis',
  'comcast', 'verizon', 'at&t', 'spectrum', 'charter communications', 't-mobile',
  'vodafone', 'orange', 'ee limited', 'bt group', 'virgin media'
];

/**
 * Checks whether the ISP or AS belongs to a recognized consumer/cellular telecommunications provider
 */
export function isConsumerIsp(rawIsp: string = '', asName: string = '', org: string = ''): boolean {
  const combined = `${rawIsp || ''} ${asName || ''} ${org || ''}`.toLowerCase();
  return CONSUMER_ISP_PATTERNS.some((pattern) => combined.includes(pattern));
}

/**
 * Normalizes Indonesian ISP names to friendly branded names
 */
export function normalizeIspName(rawIsp: string, asName: string): string {
  const combined = `${rawIsp} ${asName}`.toLowerCase();

  if (combined.includes('telekomunikasi selular') || combined.includes('telkomsel')) {
    return 'Telkomsel';
  }
  if (combined.includes('indosat') || combined.includes('ooredoo') || combined.includes('im3')) {
    return 'Indosat Ooredoo';
  }
  if (combined.includes('xl axiata') || combined.includes('axis')) {
    return 'XL Axiata';
  }
  if (combined.includes('smartfren')) {
    return 'Smartfren';
  }
  if (combined.includes('hutchison') || combined.includes('tri id') || combined.includes('3 indonesia')) {
    return 'Tri (3) Indonesia';
  }
  if (combined.includes('telkom indonesia') || combined.includes('indihome') || combined.includes('speedy')) {
    return 'Telkom / IndiHome';
  }
  if (combined.includes('supra primatama') || combined.includes('biznet')) {
    return 'Biznet';
  }
  if (combined.includes('link net') || combined.includes('first media') || combined.includes('firstmedia')) {
    return 'FirstMedia';
  }
  if (combined.includes('mora telematika') || combined.includes('oxygen')) {
    return 'Oxygen.id / Moratelindo';
  }
  if (combined.includes('cyberindo aditama') || combined.includes('cbn')) {
    return 'CBN';
  }
  if (combined.includes('myrepublic') || combined.includes('innovate')) {
    return 'MyRepublic';
  }
  if (combined.includes('mnc play') || combined.includes('mnc kabel')) {
    return 'MNC Play';
  }
  if (combined.includes('jogja medianet') || combined.includes('sarana insanmuda selaras') || combined.includes('citranet')) {
    return 'Jogja Medianet';
  }
  if (combined.includes('indonesia comnets plus') || combined.includes('icon+') || combined.includes('iconnet')) {
    return 'PLN Iconnet';
  }
  if (combined.includes('media antar nusa') || combined.includes('nusanet')) {
    return 'Nusanet';
  }
  if (combined.includes('trans hybrid communication') || combined.includes('gmedia')) {
    return 'Gmedia';
  }
  if (combined.includes('iforte')) {
    return 'iForte';
  }
  if (combined.includes('bali tower') || combined.includes('balifiber')) {
    return 'Bali Fiber';
  }

  return rawIsp || asName || 'Unknown ISP';
}

/**
 * Checks if an IP is a private/local IP address
 */
function isPrivateIp(ip: string): boolean {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

/**
 * Performs high-speed IP Intelligence lookup with caching and VPN/Proxy/Datacenter detection
 */
export async function lookupIpIntelligence(ip: string, userAgent?: string): Promise<IpIntelligence> {
  const cleanIp = (ip || '').trim().split(',')[0].trim();

  // Handle local development or missing IP
  if (!cleanIp || isPrivateIp(cleanIp)) {
    return {
      ip: cleanIp || '127.0.0.1',
      isp: 'Local Development Network',
      as: 'Local Network',
      city: 'Local Machine',
      regionName: 'Development Environment',
      country: 'Localhost',
      countryCode: 'ID',
      isVpn: false,
      vpnType: 'Direct',
      locationSummary: 'Local Development'
    };
  }

  // Check cache
  const cached = ipCache.get(cleanIp);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s strict timeout

    const url = `http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.status !== 'success') {
      throw new Error(json.message || 'Lookup failed');
    }

    const rawIsp = json.isp || '';
    const rawAs = json.as || '';
    const rawOrg = json.org || '';
    const friendlyIsp = normalizeIspName(rawIsp, rawAs);

    const asLower = `${rawAs} ${rawOrg} ${rawIsp}`.toLowerCase();
    const isConsumer = isConsumerIsp(rawIsp, rawAs, rawOrg);
    const hasDatacenterProvider = KNOWN_DATACENTER_PROVIDERS.some((kw) => asLower.includes(kw));

    // Decision Matrix
    let isVpn = false;
    let vpnType = 'Direct';

    if (json.proxy === true) {
      isVpn = true;
      vpnType = 'Proxy / Anonymizer';
    } else if (hasDatacenterProvider) {
      isVpn = true;
      vpnType = 'Datacenter / VPN Host';
    } else if (isConsumer) {
      // Whitelisted consumer / regional broadband / mobile telecom carrier
      // Ignore false-positive 'hosting: true' from ip-api for cellular CGNAT pools or regional FTTH WISPs
      isVpn = false;
      vpnType = `Direct (${friendlyIsp})`;
    } else if (json.countryCode === 'ID' && !hasDatacenterProvider) {
      // Indonesian regional ISP heuristic:
      // In Indonesia, ip-api frequently flags regional broadband ISPs as 'hosting: true'
      // If it is not a known datacenter host and proxy is false, verify if it's an ISP
      const hasHostingKeywords = ['vps', 'cloud', 'datacenter', 'data center', 'dedicated', 'colocation', 'server'].some((kw) => asLower.includes(kw));
      if (!hasHostingKeywords) {
        // Legitimate Indonesian regional broadband / ISP
        isVpn = false;
        vpnType = `Direct (${friendlyIsp})`;
      } else {
        isVpn = true;
        vpnType = 'Hosting / Datacenter IP';
      }
    } else if (json.hosting === true && json.mobile !== true) {
      isVpn = true;
      vpnType = 'Hosting / Datacenter IP';
    }

    const city = json.city || '';
    const regionName = json.regionName || '';
    const country = json.country || '';
    const locationParts = [city, regionName, country].filter(Boolean);
    const locationSummary = locationParts.join(', ') || 'Lokasi tidak terdeteksi';

    const result: IpIntelligence = {
      ip: cleanIp,
      isp: friendlyIsp,
      as: rawAs,
      city: city || '-',
      regionName: regionName || '-',
      country: country || '-',
      countryCode: json.countryCode || '',
      lat: json.lat,
      lon: json.lon,
      isVpn,
      vpnType,
      locationSummary
    };

    // Cache the result
    ipCache.set(cleanIp, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });

    return result;
  } catch (err) {
    console.warn(`IP Intelligence lookup failed for ${cleanIp}:`, (err as any)?.message || err);
    // Return gracefully populated fallback
    return {
      ip: cleanIp,
      isp: 'Provider Tidak Diketahui',
      as: '-',
      city: '-',
      regionName: '-',
      country: '-',
      countryCode: '',
      isVpn: false,
      vpnType: 'Unknown',
      locationSummary: '-'
    };
  }
}
