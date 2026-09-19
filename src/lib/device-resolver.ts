/**
 * Comprehensive High-Precision Device Model Resolver
 * Detects exact mobile models (Apple iPhone 1st gen to iPhone 17 Pro Max, iPads, Macs, Watch, Vision Pro,
 * Samsung Galaxy A56/S24, Xiaomi, Pixel, Oppo, Vivo, PC/Laptops, etc.)
 */

export interface RawDeviceDetectionInput {
  userAgent?: string;
  platform?: string;
  model?: string;
  brand?: string;
  gpuRenderer?: string;
  gpuVendor?: string;
  screenWidth?: number;
  screenHeight?: number;
  devicePixelRatio?: number;
  maxTouchPoints?: number;
  mobile?: boolean;
}

export function resolveExactDeviceModel(input: RawDeviceDetectionInput): string {
  const ua = input.userAgent || '';
  const clientModel = (input.model || '').trim();
  const gpu = (input.gpuRenderer || '').trim();
  const w = input.screenWidth || 0;
  const h = input.screenHeight || 0;
  const dpr = input.devicePixelRatio || 1;
  const maxDim = Math.max(w, h);
  const minDim = Math.min(w, h);
  const touchPoints = input.maxTouchPoints || 0;

  // 1. Apple Vision Pro / visionOS
  if (/visionOS|RealityOS/i.test(ua) || (gpu.includes('Apple') && /xr|spatial|vision/i.test(ua))) {
    return 'Apple Vision Pro';
  }

  // 2. Apple Watch (WatchOS WebKit browser)
  if (/AppleWatch|watchOS/i.test(ua) || (minDim <= 260 && maxDim <= 320 && dpr >= 2)) {
    if (minDim >= 205) return 'Apple Watch Ultra 2 / Ultra / Series 10 (46mm)';
    if (minDim >= 198) return 'Apple Watch Series 10 (42mm) / Series 9 (45mm)';
    if (minDim >= 184) return 'Apple Watch Series 9 / 8 / 7 (41mm) / SE';
    return 'Apple Watch';
  }

  // 3. Apple iOS / iPadOS / macOS Device Identification
  const isIos = /iPhone|iPad|iPod/i.test(ua) || (input.platform === 'MacIntel' && touchPoints > 1);
  if (isIos) {
    return resolveAppleIosModel(minDim, maxDim, dpr, gpu, ua, touchPoints);
  }

  // 4. Apple Mac Desktop / Laptop Identification (macOS)
  if (/Macintosh|Mac OS X/i.test(ua) || input.platform === 'MacIntel') {
    return resolveAppleMacModel(minDim, maxDim, dpr, gpu, ua);
  }

  // 5. Android Client Hints direct model check (Samsung, Xiaomi, Poco, Vivo, Oppo, etc.)
  if (clientModel && clientModel !== 'undefined' && clientModel !== 'null' && clientModel.toUpperCase() !== 'K') {
    const mapped = matchAndroidModel(clientModel);
    if (mapped) return mapped;
  }

  // 6. Parse User-Agent for Android model codes
  const uaModel = extractModelFromUserAgent(ua);
  if (uaModel && uaModel.toUpperCase() !== 'K') {
    const mapped = matchAndroidModel(uaModel);
    if (mapped) return mapped;
  }

  // 7. Android generic brand / GPU lookup
  if (/Android/i.test(ua)) {
    const androidMatch = matchAndroidGeneric(ua, gpu);
    if (androidMatch) return androidMatch;
    if (clientModel && clientModel.toUpperCase() !== 'K') {
      return `Android (${clientModel})`;
    }
    return 'Android Device';
  }

  // 8. Windows PC / Laptop Detection
  if (/Windows NT/i.test(ua) || input.platform === 'Win32') {
    let winVer = 'Windows';
    if (/Windows NT 10.0/i.test(ua)) winVer = 'Windows 10 / 11';
    else if (/Windows NT 6.3/i.test(ua)) winVer = 'Windows 8.1';
    else if (/Windows NT 6.1/i.test(ua)) winVer = 'Windows 7';

    if (gpu && !/SwiftShader|ANGLE|Google/i.test(gpu)) {
      return `${winVer} PC (${gpu})`;
    }
    return `${winVer} PC`;
  }

  // 9. Linux / ChromeOS
  if (/CrOS/i.test(ua)) return 'Google Chromebook';
  if (/Linux/i.test(ua)) return 'Linux Desktop';

  return input.platform || 'Unknown Device';
}

/**
 * Match complete Apple iPhone / iPad models from iPhone 1st gen to iPhone 17 Pro Max
 */
function resolveAppleIosModel(
  minDim: number,
  maxDim: number,
  dpr: number,
  gpu: string,
  ua: string,
  touchPoints: number
): string {
  // Extract iOS Version from User-Agent (e.g. CPU iPhone OS 18_7 -> 18.7)
  const iosVerMatch = ua.match(/CPU iPhone OS ([0-9_]+) like Mac OS X/i);
  const iosVer = iosVerMatch ? iosVerMatch[1].replace(/_/g, '.') : '';
  const iosMajor = iosVer ? parseInt(iosVer.split('.')[0], 10) : 0;
  const isNear = (val: number, target: number, tol: number = 6) => Math.abs(val - target) <= tol;

  // iPod Touch
  if (/iPod/i.test(ua)) {
    if (isNear(minDim, 320) && isNear(maxDim, 568)) return 'Apple iPod touch (7th / 6th Gen)';
    return 'Apple iPod touch';
  }

  // ==========================
  // iPad Family
  // ==========================
  const isExplicitIpad = /iPad/i.test(ua) || minDim >= 700 || touchPoints > 4;

  if (isExplicitIpad && minDim >= 700) {
    // 13-inch iPad Pro (M4) / iPad Pro 12.9-inch ($1024 \times 1366$ @ 2x)
    if (isNear(minDim, 1024) && isNear(maxDim, 1366)) {
      if (gpu.includes('M4')) return 'Apple iPad Pro (13-inch M4)';
      if (gpu.includes('M2')) return 'Apple iPad Pro (12.9-inch 6th Gen M2) / iPad Air (13-inch M2)';
      if (gpu.includes('M1')) return 'Apple iPad Pro (12.9-inch 5th Gen M1)';
      if (gpu.includes('A12Z') || gpu.includes('A12X')) return 'Apple iPad Pro (12.9-inch 3rd/4th Gen)';
      return 'Apple iPad Pro 12.9-inch / 13-inch';
    }

    // 11-inch iPad Pro (M4) ($834 \times 1210$ @ 2x)
    if (isNear(minDim, 834) && isNear(maxDim, 1210)) {
      return 'Apple iPad Pro (11-inch M4)';
    }

    // 11-inch iPad Pro (M2 / M1) ($834 \times 1194$ @ 2x)
    if (isNear(minDim, 834) && isNear(maxDim, 1194)) {
      if (gpu.includes('M2')) return 'Apple iPad Pro (11-inch 4th Gen M2)';
      if (gpu.includes('M1')) return 'Apple iPad Pro (11-inch 3rd Gen M1)';
      return 'Apple iPad Pro 11-inch';
    }

    // 10.9-inch iPad Air / iPad 10th Gen ($820 \times 1180$ @ 2x)
    if (isNear(minDim, 820) && isNear(maxDim, 1180)) {
      if (gpu.includes('M2')) return 'Apple iPad Air (11-inch M2)';
      if (gpu.includes('M1')) return 'Apple iPad Air (5th Gen M1)';
      if (gpu.includes('A14')) return 'Apple iPad (10th Gen) / iPad Air (4th Gen)';
      return 'Apple iPad Air / iPad 10th Gen';
    }

    // 10.5-inch iPad Pro / iPad Air 3 ($834 \times 1112$ @ 2x)
    if (isNear(minDim, 834) && isNear(maxDim, 1112)) {
      return 'Apple iPad Pro (10.5-inch) / iPad Air (3rd Gen)';
    }

    // 10.2-inch iPad 9th / 8th / 7th Gen ($810 \times 1080$ @ 2x)
    if (isNear(minDim, 810) && isNear(maxDim, 1080)) {
      if (gpu.includes('A13')) return 'Apple iPad (9th Gen)';
      if (gpu.includes('A12')) return 'Apple iPad (8th Gen)';
      return 'Apple iPad (7th/8th/9th Gen 10.2-inch)';
    }

    // 8.3-inch iPad mini 7 / mini 6 ($744 \times 1133$ @ 2x)
    if (isNear(minDim, 744) && isNear(maxDim, 1133)) {
      if (gpu.includes('A17')) return 'Apple iPad mini (7th Gen / A17 Pro)';
      return 'Apple iPad mini (6th Gen / A15)';
    }

    // Classic 9.7-inch iPad ($768 \times 1024$ @ 2x or 1x)
    if (isNear(minDim, 768) && isNear(maxDim, 1024)) {
      if (gpu.includes('A10')) return 'Apple iPad (6th Gen)';
      if (gpu.includes('A9')) return 'Apple iPad (5th Gen) / Pro 9.7-inch';
      if (gpu.includes('A8')) return 'Apple iPad mini 4 / iPad Air 2';
      return 'Apple iPad (9.7-inch) / iPad mini';
    }

    if (gpu.includes('M4') || gpu.includes('M3') || gpu.includes('M2') || gpu.includes('M1')) {
      return `Apple iPad Pro (${gpu.replace('Apple ', '')})`;
    }
    return 'Apple iPad';
  }

  // ==========================
  // iPhone Family (Fuzzy Pixel Match + GPU + iOS Version)
  // ==========================

  // iPhone 17 Pro Max / 16 Pro Max ($440 \times 956$ @ 3x)
  if (isNear(minDim, 440) && isNear(maxDim, 956)) {
    if (gpu.includes('A19')) return 'Apple iPhone 17 Pro Max';
    if (gpu.includes('A18')) return 'Apple iPhone 16 Pro Max';
    return 'Apple iPhone 16 / 17 Pro Max';
  }

  // iPhone 17 / 17 Pro / 16 Pro ($402 \times 874$ @ 3x)
  if (isNear(minDim, 402) && isNear(maxDim, 874)) {
    if (gpu.includes('A19') || iosVer.includes('18.7') || iosVer.includes('18.8') || iosMajor >= 19) return 'Apple iPhone 17';
    if (gpu.includes('A18')) return 'Apple iPhone 16 Pro';
    if (iosMajor >= 18) return 'Apple iPhone 17 / 16 Pro';
    return 'Apple iPhone 16 / 17 Pro';
  }

  // iPhone 17 Air / Slim ($412 \times 892$ @ 3x)
  if (isNear(minDim, 412) && isNear(maxDim, 892)) {
    return 'Apple iPhone 17 Air / Slim';
  }

  // iPhone 16 Plus / 15 Pro Max / 15 Plus / 14 Pro Max ($430 \times 932$ @ 3x)
  if (isNear(minDim, 430) && isNear(maxDim, 932)) {
    if (gpu.includes('A18')) return 'Apple iPhone 16 Plus';
    if (gpu.includes('A17')) return 'Apple iPhone 15 Pro Max';
    if (gpu.includes('A16')) return 'Apple iPhone 15 Plus / 14 Pro Max';
    if (iosMajor >= 18) return 'Apple iPhone 16 Plus / 15 Pro Max';
    return 'Apple iPhone 15 / 16 Plus / 15 Pro Max';
  }

  // iPhone 17 / 16 / 15 Pro / 15 / 14 Pro ($393 \times 852$ @ 3x)
  if (isNear(minDim, 393) && isNear(maxDim, 852)) {
    if (gpu.includes('A19') || iosVer.includes('18.7') || iosVer.includes('18.8') || iosMajor >= 19) return 'Apple iPhone 17';
    if (gpu.includes('A18')) return 'Apple iPhone 16';
    if (gpu.includes('A17')) return 'Apple iPhone 15 Pro';
    if (gpu.includes('A16')) return 'Apple iPhone 15 / 14 Pro';
    if (iosMajor >= 18) return 'Apple iPhone 17 / 16';
    return 'Apple iPhone 15 / 16 / 14 Pro';
  }

  // iPhone 14 Plus / 13 Pro Max / 12 Pro Max ($428 \times 926$ @ 3x)
  if (isNear(minDim, 428) && isNear(maxDim, 926)) {
    if (gpu.includes('A15')) return 'Apple iPhone 14 Plus / 13 Pro Max';
    if (gpu.includes('A14')) return 'Apple iPhone 12 Pro Max';
    return 'Apple iPhone 13 Pro Max / 14 Plus';
  }

  // iPhone 14 / 13 Pro / 13 / 12 Pro / 12 ($390 \times 844$ @ 3x)
  if (isNear(minDim, 390) && isNear(maxDim, 844)) {
    if (gpu.includes('A15')) return 'Apple iPhone 14 / 13 / 13 Pro';
    if (gpu.includes('A14')) return 'Apple iPhone 12 / 12 Pro';
    return 'Apple iPhone 13 / 14 / 12';
  }

  // iPhone 11 Pro Max / XS Max ($414 \times 896$ @ 3x)
  if (isNear(minDim, 414) && isNear(maxDim, 896) && dpr >= 2.5) {
    if (gpu.includes('A13')) return 'Apple iPhone 11 Pro Max';
    return 'Apple iPhone XS Max / 11 Pro Max';
  }

  // iPhone 11 / XR ($414 \times 896$ @ 2x)
  if (isNear(minDim, 414) && isNear(maxDim, 896)) {
    if (gpu.includes('A13')) return 'Apple iPhone 11';
    return 'Apple iPhone 11 / XR';
  }

  // iPhone 13 mini / 12 mini / 11 Pro / XS / X ($375 \times 812$ @ 3x)
  if (isNear(minDim, 375) && isNear(maxDim, 812) && dpr >= 2.5) {
    if (gpu.includes('A15')) return 'Apple iPhone 13 mini';
    if (gpu.includes('A14')) return 'Apple iPhone 12 mini';
    if (gpu.includes('A13')) return 'Apple iPhone 11 Pro';
    if (gpu.includes('A12')) return 'Apple iPhone XS';
    return 'Apple iPhone X / XS / 11 Pro';
  }

  // iPhone 8 Plus / 7 Plus / 6s Plus / 6 Plus ($414 \times 736$ @ 3x)
  if (isNear(minDim, 414) && isNear(maxDim, 736)) {
    if (gpu.includes('A11')) return 'Apple iPhone 8 Plus';
    if (gpu.includes('A10')) return 'Apple iPhone 7 Plus';
    return 'Apple iPhone 6s Plus / 7 Plus / 8 Plus';
  }

  // iPhone SE (3rd / 2nd Gen) / 8 / 7 / 6s / 6 ($375 \times 667$ @ 2x)
  if (isNear(minDim, 375) && isNear(maxDim, 667)) {
    if (gpu.includes('A15')) return 'Apple iPhone SE (3rd Gen)';
    if (gpu.includes('A13')) return 'Apple iPhone SE (2nd Gen)';
    if (gpu.includes('A11')) return 'Apple iPhone 8';
    if (gpu.includes('A10')) return 'Apple iPhone 7';
    if (gpu.includes('A9')) return 'Apple iPhone 6s';
    return 'Apple iPhone SE / 8 / 7';
  }

  // iPhone SE (1st Gen) / 5s / 5c / 5 ($320 \times 568$ @ 2x)
  if (isNear(minDim, 320) && isNear(maxDim, 568)) {
    if (gpu.includes('A9')) return 'Apple iPhone SE (1st Gen)';
    if (gpu.includes('A7')) return 'Apple iPhone 5s';
    return 'Apple iPhone 5 / 5c / 5s';
  }

  // iPhone 4s / 4 ($320 \times 480$ @ 2x)
  if (isNear(minDim, 320) && isNear(maxDim, 480) && dpr >= 1.5) {
    return 'Apple iPhone 4 / 4S';
  }

  // iPhone 3GS / 3G / Original ($320 \times 480$ @ 1x)
  if (isNear(minDim, 320) && isNear(maxDim, 480)) {
    return 'Apple iPhone (Original / 3G / 3GS)';
  }

  // Fallback when dimensions are 0 or unlisted: Use iOS version + GPU
  if (iosVer) {
    if (iosVer.includes('18.7') || iosVer.includes('18.8') || iosMajor >= 19) return `Apple iPhone 17 (iOS ${iosVer})`;
    if (iosMajor >= 18) return `Apple iPhone 17 / 16 (iOS ${iosVer})`;
    if (iosMajor === 17) return `Apple iPhone 15 / 14 (iOS ${iosVer})`;
    if (iosMajor === 16) return `Apple iPhone 14 / 13 (iOS ${iosVer})`;
    return `Apple iPhone (iOS ${iosVer})`;
  }

  return gpu.includes('Apple') ? `Apple iPhone (${gpu})` : 'Apple iPhone';
}

/**
 * Match Apple Mac models (MacBook Pro, MacBook Air, iMac, Mac Studio, Mac Pro, Mac mini)
 */
function resolveAppleMacModel(
  minDim: number,
  maxDim: number,
  dpr: number,
  gpu: string,
  ua: string
): string {
  // Apple Silicon M4 Series
  if (gpu.includes('M4 Max') || gpu.includes('M4 Pro') || gpu.includes('M4')) {
    if (gpu.includes('M4 Max')) return 'Apple MacBook Pro (M4 Max) / Mac Studio';
    if (gpu.includes('M4 Pro')) return 'Apple MacBook Pro / Mac mini (M4 Pro)';
    if (maxDim >= 1700) return 'Apple iMac (24-inch M4)';
    return 'Apple MacBook Pro / Air / Mac mini (M4)';
  }

  // Apple Silicon M3 Series
  if (gpu.includes('M3 Max') || gpu.includes('M3 Pro') || gpu.includes('M3')) {
    if (gpu.includes('M3 Max')) return 'Apple MacBook Pro (14/16-inch M3 Max)';
    if (gpu.includes('M3 Pro')) return 'Apple MacBook Pro (14/16-inch M3 Pro)';
    if (maxDim >= 1700) return 'Apple iMac (24-inch M3)';
    return 'Apple MacBook Air / Pro (M3)';
  }

  // Apple Silicon M2 Series
  if (gpu.includes('M2 Ultra') || gpu.includes('M2 Max') || gpu.includes('M2 Pro') || gpu.includes('M2')) {
    if (gpu.includes('M2 Ultra')) return 'Apple Mac Studio / Mac Pro (M2 Ultra)';
    if (gpu.includes('M2 Max')) return 'Apple MacBook Pro / Mac Studio (M2 Max)';
    if (gpu.includes('M2 Pro')) return 'Apple MacBook Pro / Mac mini (M2 Pro)';
    return 'Apple MacBook Air / Pro / Mac mini (M2)';
  }

  // Apple Silicon M1 Series
  if (gpu.includes('M1 Ultra') || gpu.includes('M1 Max') || gpu.includes('M1 Pro') || gpu.includes('M1')) {
    if (gpu.includes('M1 Ultra')) return 'Apple Mac Studio (M1 Ultra)';
    if (gpu.includes('M1 Max')) return 'Apple MacBook Pro 14/16-inch / Mac Studio (M1 Max)';
    if (gpu.includes('M1 Pro')) return 'Apple MacBook Pro 14/16-inch (M1 Pro)';
    if (maxDim >= 1700) return 'Apple iMac (24-inch M1)';
    return 'Apple MacBook Air / Pro / Mac mini (M1)';
  }

  // Intel Mac models
  if (gpu && /Intel|AMD|Radeon|Iris/i.test(gpu)) {
    return `Apple Mac (Intel / ${gpu})`;
  }

  if (gpu && /Apple/i.test(gpu)) {
    return `Apple Mac (${gpu})`;
  }

  return 'Apple Mac';
}

/**
 * Extract model number pattern from Android User-Agent
 */
function extractModelFromUserAgent(ua: string): string | null {
  // Samsung SM-xxxx
  const smMatch = ua.match(/;\s*(SM-[A-Z0-9]+)/i);
  if (smMatch) return smMatch[1].toUpperCase();

  // Explicit Poco / Xiaomi / Redmi model patterns in UA
  const brandMatch = ua.match(/;\s*(POCO\s+[A-Z0-9\s]+|Redmi\s+[A-Z0-9\s]+|Mi\s+[A-Z0-9\s]+|Xiaomi\s+[A-Z0-9\s]+)/i);
  if (brandMatch) return brandMatch[1].trim();

  // Generic Android Build patterns: "Android ...; <Model> Build/"
  const buildMatch = ua.match(/Android[^;]+;\s*([^;]+?)\s*(?:Build|\))/i);
  if (buildMatch && buildMatch[1]) {
    const raw = buildMatch[1].trim();
    if (!/^(?:Version|Mobile|Linux|U;|wv|K)$/i.test(raw) && !/Version|Mobile|Linux/i.test(raw)) {
      return raw;
    }
  }

  return null;
}

/**
 * Map hardware model codes to human-readable brand names
 */
function matchAndroidModel(code: string): string | null {
  const c = code.toUpperCase().trim();

  // ==========================================
  // SAMSUNG GALAXY S-SERIES (S25 down to S1)
  // ==========================================
  if (c.startsWith('SM-S938')) return 'Samsung Galaxy S25 Ultra';
  if (c.startsWith('SM-S936')) return 'Samsung Galaxy S25+';
  if (c.startsWith('SM-S931')) return 'Samsung Galaxy S25';
  if (c.startsWith('SM-S928')) return 'Samsung Galaxy S24 Ultra';
  if (c.startsWith('SM-S926')) return 'Samsung Galaxy S24+';
  if (c.startsWith('SM-S921')) return 'Samsung Galaxy S24';
  if (c.startsWith('SM-S721')) return 'Samsung Galaxy S24 FE';
  if (c.startsWith('SM-S918')) return 'Samsung Galaxy S23 Ultra';
  if (c.startsWith('SM-S916')) return 'Samsung Galaxy S23+';
  if (c.startsWith('SM-S911')) return 'Samsung Galaxy S23';
  if (c.startsWith('SM-S711')) return 'Samsung Galaxy S23 FE';
  if (c.startsWith('SM-S908')) return 'Samsung Galaxy S22 Ultra';
  if (c.startsWith('SM-S906')) return 'Samsung Galaxy S22+';
  if (c.startsWith('SM-S901')) return 'Samsung Galaxy S22';
  if (c.startsWith('SM-G998')) return 'Samsung Galaxy S21 Ultra 5G';
  if (c.startsWith('SM-G996')) return 'Samsung Galaxy S21+ 5G';
  if (c.startsWith('SM-G991')) return 'Samsung Galaxy S21 5G';
  if (c.startsWith('SM-G990')) return 'Samsung Galaxy S21 FE 5G';
  if (c.startsWith('SM-G988')) return 'Samsung Galaxy S20 Ultra 5G';
  if (c.startsWith('SM-G986')) return 'Samsung Galaxy S20+ 5G';
  if (c.startsWith('SM-G981') || c.startsWith('SM-G980')) return 'Samsung Galaxy S20 / 5G';
  if (c.startsWith('SM-G780') || c.startsWith('SM-G781')) return 'Samsung Galaxy S20 FE / 5G';
  if (c.startsWith('SM-G975')) return 'Samsung Galaxy S10+';
  if (c.startsWith('SM-G973')) return 'Samsung Galaxy S10';
  if (c.startsWith('SM-G970')) return 'Samsung Galaxy S10e';
  if (c.startsWith('SM-G977')) return 'Samsung Galaxy S10 5G';
  if (c.startsWith('SM-G770')) return 'Samsung Galaxy S10 Lite';
  if (c.startsWith('SM-G965')) return 'Samsung Galaxy S9+';
  if (c.startsWith('SM-G960')) return 'Samsung Galaxy S9';
  if (c.startsWith('SM-G955')) return 'Samsung Galaxy S8+';
  if (c.startsWith('SM-G950')) return 'Samsung Galaxy S8';
  if (c.startsWith('SM-G892')) return 'Samsung Galaxy S8 Active';
  if (c.startsWith('SM-G935')) return 'Samsung Galaxy S7 Edge';
  if (c.startsWith('SM-G930')) return 'Samsung Galaxy S7';
  if (c.startsWith('SM-G928')) return 'Samsung Galaxy S6 Edge+';
  if (c.startsWith('SM-G925')) return 'Samsung Galaxy S6 Edge';
  if (c.startsWith('SM-G920')) return 'Samsung Galaxy S6';
  if (c.startsWith('SM-G900')) return 'Samsung Galaxy S5';
  if (c.startsWith('GT-I9500') || c.startsWith('GT-I9505') || c.startsWith('SCH-I545')) return 'Samsung Galaxy S4';
  if (c.startsWith('GT-I9300') || c.startsWith('SCH-I535')) return 'Samsung Galaxy S III';
  if (c.startsWith('GT-I9100')) return 'Samsung Galaxy S II';
  if (c.startsWith('GT-I9000') || c.startsWith('GT-I7500')) return 'Samsung Galaxy S (Original)';

  // ==========================================
  // SAMSUNG GALAXY Z FOLD & Z FLIP SERIES
  // ==========================================
  if (c.startsWith('SM-F966')) return 'Samsung Galaxy Z Fold 7';
  if (c.startsWith('SM-F761')) return 'Samsung Galaxy Z Flip 7';
  if (c.startsWith('SM-F956')) return 'Samsung Galaxy Z Fold 6';
  if (c.startsWith('SM-F741')) return 'Samsung Galaxy Z Flip 6';
  if (c.startsWith('SM-F946')) return 'Samsung Galaxy Z Fold 5';
  if (c.startsWith('SM-F731')) return 'Samsung Galaxy Z Flip 5';
  if (c.startsWith('SM-F936')) return 'Samsung Galaxy Z Fold 4';
  if (c.startsWith('SM-F721')) return 'Samsung Galaxy Z Flip 4';
  if (c.startsWith('SM-F926')) return 'Samsung Galaxy Z Fold 3 5G';
  if (c.startsWith('SM-F711')) return 'Samsung Galaxy Z Flip 3 5G';
  if (c.startsWith('SM-F916')) return 'Samsung Galaxy Z Fold 2 5G';
  if (c.startsWith('SM-F700') || c.startsWith('SM-F707')) return 'Samsung Galaxy Z Flip / 5G';
  if (c.startsWith('SM-F900') || c.startsWith('SM-F907')) return 'Samsung Galaxy Fold';

  // ==========================================
  // SAMSUNG GALAXY NOTE SERIES
  // ==========================================
  if (c.startsWith('SM-N986')) return 'Samsung Galaxy Note 20 Ultra 5G';
  if (c.startsWith('SM-N981') || c.startsWith('SM-N980')) return 'Samsung Galaxy Note 20 / 5G';
  if (c.startsWith('SM-N975') || c.startsWith('SM-N976')) return 'Samsung Galaxy Note 10+ / 5G';
  if (c.startsWith('SM-N970') || c.startsWith('SM-N971')) return 'Samsung Galaxy Note 10 / 5G';
  if (c.startsWith('SM-N770')) return 'Samsung Galaxy Note 10 Lite';
  if (c.startsWith('SM-N960')) return 'Samsung Galaxy Note 9';
  if (c.startsWith('SM-N950')) return 'Samsung Galaxy Note 8';
  if (c.startsWith('SM-N935')) return 'Samsung Galaxy Note Fan Edition';
  if (c.startsWith('SM-N930')) return 'Samsung Galaxy Note 7';
  if (c.startsWith('SM-N920')) return 'Samsung Galaxy Note 5';
  if (c.startsWith('SM-N910')) return 'Samsung Galaxy Note 4';
  if (c.startsWith('SM-N915')) return 'Samsung Galaxy Note Edge';
  if (c.startsWith('SM-N900')) return 'Samsung Galaxy Note 3';
  if (c.startsWith('GT-N7100')) return 'Samsung Galaxy Note II';
  if (c.startsWith('GT-N7000')) return 'Samsung Galaxy Note (Original)';

  // ==========================================
  // SAMSUNG GALAXY A-SERIES (A01 to A57)
  // ==========================================
  if (c.startsWith('SM-A576')) return 'Samsung Galaxy A57 5G';
  if (c.startsWith('SM-A566')) return 'Samsung Galaxy A56 5G';
  if (c.startsWith('SM-A556')) return 'Samsung Galaxy A55 5G';
  if (c.startsWith('SM-A546')) return 'Samsung Galaxy A54 5G';
  if (c.startsWith('SM-A536')) return 'Samsung Galaxy A53 5G';
  if (c.startsWith('SM-A528')) return 'Samsung Galaxy A52s 5G';
  if (c.startsWith('SM-A525') || c.startsWith('SM-A526')) return 'Samsung Galaxy A52 / 5G';
  if (c.startsWith('SM-A515') || c.startsWith('SM-A516')) return 'Samsung Galaxy A51 / 5G';
  if (c.startsWith('SM-A505') || c.startsWith('SM-A507')) return 'Samsung Galaxy A50 / A50s';
  if (c.startsWith('SM-A376')) return 'Samsung Galaxy A37 5G';
  if (c.startsWith('SM-A366')) return 'Samsung Galaxy A36 5G';
  if (c.startsWith('SM-A356')) return 'Samsung Galaxy A35 5G';
  if (c.startsWith('SM-A346')) return 'Samsung Galaxy A34 5G';
  if (c.startsWith('SM-A336')) return 'Samsung Galaxy A33 5G';
  if (c.startsWith('SM-A325') || c.startsWith('SM-A326')) return 'Samsung Galaxy A32 / 5G';
  if (c.startsWith('SM-A315')) return 'Samsung Galaxy A31';
  if (c.startsWith('SM-A305') || c.startsWith('SM-A307')) return 'Samsung Galaxy A30 / A30s';
  if (c.startsWith('SM-A276')) return 'Samsung Galaxy A27 5G';
  if (c.startsWith('SM-A266')) return 'Samsung Galaxy A26 5G';
  if (c.startsWith('SM-A256')) return 'Samsung Galaxy A25 5G';
  if (c.startsWith('SM-A245')) return 'Samsung Galaxy A24';
  if (c.startsWith('SM-A235') || c.startsWith('SM-A236')) return 'Samsung Galaxy A23 / 5G';
  if (c.startsWith('SM-A225') || c.startsWith('SM-A226')) return 'Samsung Galaxy A22 / 5G';
  if (c.startsWith('SM-A215') || c.startsWith('SM-A217')) return 'Samsung Galaxy A21 / A21s';
  if (c.startsWith('SM-A205') || c.startsWith('SM-A207')) return 'Samsung Galaxy A20 / A20s';
  if (c.startsWith('SM-A176')) return 'Samsung Galaxy A17 5G';
  if (c.startsWith('SM-A166')) return 'Samsung Galaxy A16 5G';
  if (c.startsWith('SM-A155') || c.startsWith('SM-A156')) return 'Samsung Galaxy A15 / 5G';
  if (c.startsWith('SM-A145') || c.startsWith('SM-A146')) return 'Samsung Galaxy A14 / 5G';
  if (c.startsWith('SM-A135') || c.startsWith('SM-A137')) return 'Samsung Galaxy A13';
  if (c.startsWith('SM-A125') || c.startsWith('SM-A127')) return 'Samsung Galaxy A12';
  if (c.startsWith('SM-A115')) return 'Samsung Galaxy A11';
  if (c.startsWith('SM-A105') || c.startsWith('SM-A107')) return 'Samsung Galaxy A10 / A10s';
  if (c.startsWith('SM-A065')) return 'Samsung Galaxy A06';
  if (c.startsWith('SM-A055') || c.startsWith('SM-A057')) return 'Samsung Galaxy A05 / A05s';
  if (c.startsWith('SM-A045') || c.startsWith('SM-A047') || c.startsWith('SM-A042')) return 'Samsung Galaxy A04 / A04s / A04e';
  if (c.startsWith('SM-A035') || c.startsWith('SM-A037') || c.startsWith('SM-A032')) return 'Samsung Galaxy A03 / A03s / A03 Core';
  if (c.startsWith('SM-A022') || c.startsWith('SM-A025')) return 'Samsung Galaxy A02 / A02s';
  if (c.startsWith('SM-A015')) return 'Samsung Galaxy A01';
  if (c.startsWith('SM-A736')) return 'Samsung Galaxy A73 5G';
  if (c.startsWith('SM-A725')) return 'Samsung Galaxy A72';
  if (c.startsWith('SM-A715') || c.startsWith('SM-A716')) return 'Samsung Galaxy A71 / 5G';
  if (c.startsWith('SM-A705') || c.startsWith('SM-A707')) return 'Samsung Galaxy A70 / A70s';
  if (c.startsWith('SM-A805')) return 'Samsung Galaxy A80';
  if (c.startsWith('SM-A908')) return 'Samsung Galaxy A90 5G';
  if (c.startsWith('SM-A800') || c.startsWith('SM-A810') || c.startsWith('SM-A820')) return 'Samsung Galaxy A8 Series';
  if (c.startsWith('SM-A700') || c.startsWith('SM-A710') || c.startsWith('SM-A720')) return 'Samsung Galaxy A7 Series';
  if (c.startsWith('SM-A500') || c.startsWith('SM-A510') || c.startsWith('SM-A520')) return 'Samsung Galaxy A5 Series';
  if (c.startsWith('SM-A300') || c.startsWith('SM-A310') || c.startsWith('SM-A320')) return 'Samsung Galaxy A3 Series';

  // ==========================================
  // SAMSUNG GALAXY M & F SERIES
  // ==========================================
  if (c.startsWith('SM-M556') || c.startsWith('SM-M558')) return 'Samsung Galaxy M55 5G / M55s';
  if (c.startsWith('SM-M546')) return 'Samsung Galaxy M54 5G';
  if (c.startsWith('SM-M536')) return 'Samsung Galaxy M53 5G';
  if (c.startsWith('SM-M526')) return 'Samsung Galaxy M52 5G';
  if (c.startsWith('SM-M515')) return 'Samsung Galaxy M51';
  if (c.startsWith('SM-M356')) return 'Samsung Galaxy M35 5G';
  if (c.startsWith('SM-M346')) return 'Samsung Galaxy M34 5G';
  if (c.startsWith('SM-M336')) return 'Samsung Galaxy M33 5G';
  if (c.startsWith('SM-M325') || c.startsWith('SM-M326')) return 'Samsung Galaxy M32 / 5G';
  if (c.startsWith('SM-M315') || c.startsWith('SM-M317')) return 'Samsung Galaxy M31 / M31s';
  if (c.startsWith('SM-M305') || c.startsWith('SM-M307')) return 'Samsung Galaxy M30 / M30s';
  if (c.startsWith('SM-M156')) return 'Samsung Galaxy M15 5G';
  if (c.startsWith('SM-M145') || c.startsWith('SM-M146')) return 'Samsung Galaxy M14 4G/5G';
  if (c.startsWith('SM-M135')) return 'Samsung Galaxy M13';
  if (c.startsWith('SM-M127')) return 'Samsung Galaxy M12';
  if (c.startsWith('SM-M115')) return 'Samsung Galaxy M11';
  if (c.startsWith('SM-M055')) return 'Samsung Galaxy M05';
  if (c.startsWith('SM-M045')) return 'Samsung Galaxy M04';
  if (c.startsWith('SM-F556')) return 'Samsung Galaxy F55 5G';
  if (c.startsWith('SM-F546')) return 'Samsung Galaxy F54 5G';
  if (c.startsWith('SM-F346')) return 'Samsung Galaxy F34 5G';
  if (c.startsWith('SM-F236')) return 'Samsung Galaxy F23 5G';
  if (c.startsWith('SM-F156')) return 'Samsung Galaxy F15 5G';
  if (c.startsWith('SM-F146')) return 'Samsung Galaxy F14 5G';
  if (c.startsWith('SM-F055')) return 'Samsung Galaxy F05';

  // ==========================================
  // SAMSUNG GALAXY TAB SERIES
  // ==========================================
  if (c.startsWith('SM-X920') || c.startsWith('SM-X926')) return 'Samsung Galaxy Tab S10 Ultra';
  if (c.startsWith('SM-X820') || c.startsWith('SM-X826')) return 'Samsung Galaxy Tab S10+';
  if (c.startsWith('SM-X910') || c.startsWith('SM-X916')) return 'Samsung Galaxy Tab S9 Ultra';
  if (c.startsWith('SM-X810') || c.startsWith('SM-X816')) return 'Samsung Galaxy Tab S9+';
  if (c.startsWith('SM-X710') || c.startsWith('SM-X716')) return 'Samsung Galaxy Tab S9';
  if (c.startsWith('SM-X510') || c.startsWith('SM-X610')) return 'Samsung Galaxy Tab S9 FE / FE+';
  if (c.startsWith('SM-X210') || c.startsWith('SM-X216')) return 'Samsung Galaxy Tab A9+';
  if (c.startsWith('SM-X110') || c.startsWith('SM-X115')) return 'Samsung Galaxy Tab A9';
  if (c.startsWith('SM-X900') || c.startsWith('SM-X906')) return 'Samsung Galaxy Tab S8 Ultra';
  if (c.startsWith('SM-X800') || c.startsWith('SM-X806')) return 'Samsung Galaxy Tab S8+';
  if (c.startsWith('SM-X700') || c.startsWith('SM-X706')) return 'Samsung Galaxy Tab S8';
  if (c.startsWith('SM-T970') || c.startsWith('SM-T870')) return 'Samsung Galaxy Tab S7+ / S7';
  if (c.startsWith('SM-T730') || c.startsWith('SM-T736')) return 'Samsung Galaxy Tab S7 FE';
  if (c.startsWith('SM-P610') || c.startsWith('SM-P613') || c.startsWith('SM-P620')) return 'Samsung Galaxy Tab S6 Lite';
  if (c.startsWith('SM-T860')) return 'Samsung Galaxy Tab S6';
  if (c.startsWith('SM-T720')) return 'Samsung Galaxy Tab S5e';
  if (c.startsWith('SM-T830')) return 'Samsung Galaxy Tab S4';
  if (c.startsWith('SM-T820')) return 'Samsung Galaxy Tab S3';
  if (c.startsWith('SM-T810') || c.startsWith('SM-T710')) return 'Samsung Galaxy Tab S2';
  if (c.startsWith('SM-T800') || c.startsWith('SM-T700')) return 'Samsung Galaxy Tab S';
  if (c.startsWith('SM-T500') || c.startsWith('SM-T505')) return 'Samsung Galaxy Tab A7 10.4';
  if (c.startsWith('SM-T220') || c.startsWith('SM-T225')) return 'Samsung Galaxy Tab A7 Lite';
  if (c.startsWith('SM-X200') || c.startsWith('SM-X205')) return 'Samsung Galaxy Tab A8 10.5';
  if (c.startsWith('SM-T510') || c.startsWith('SM-T290')) return 'Samsung Galaxy Tab A 10.1 / 8.0';

  // ==========================================
  // SAMSUNG GALAXY WATCH & WEARABLES
  // ==========================================
  if (c.startsWith('SM-L705')) return 'Samsung Galaxy Watch Ultra';
  if (c.startsWith('SM-L310') || c.startsWith('SM-L315')) return 'Samsung Galaxy Watch 7 (44mm)';
  if (c.startsWith('SM-L300') || c.startsWith('SM-L305')) return 'Samsung Galaxy Watch 7 (40mm)';
  if (c.startsWith('SM-R960') || c.startsWith('SM-R965')) return 'Samsung Galaxy Watch 6 Classic (47mm)';
  if (c.startsWith('SM-R950') || c.startsWith('SM-R955')) return 'Samsung Galaxy Watch 6 Classic (43mm)';
  if (c.startsWith('SM-R940') || c.startsWith('SM-R945')) return 'Samsung Galaxy Watch 6 (44mm)';
  if (c.startsWith('SM-R930') || c.startsWith('SM-R935')) return 'Samsung Galaxy Watch 6 (40mm)';
  if (c.startsWith('SM-R920') || c.startsWith('SM-R925')) return 'Samsung Galaxy Watch 5 Pro';
  if (c.startsWith('SM-R910') || c.startsWith('SM-R900')) return 'Samsung Galaxy Watch 5';
  if (c.startsWith('SM-R890') || c.startsWith('SM-R880')) return 'Samsung Galaxy Watch 4 Classic';
  if (c.startsWith('SM-R870') || c.startsWith('SM-R860')) return 'Samsung Galaxy Watch 4';
  if (c.startsWith('SM-R840') || c.startsWith('SM-R850')) return 'Samsung Galaxy Watch 3';
  if (c.startsWith('SM-R820') || c.startsWith('SM-R830')) return 'Samsung Galaxy Watch Active 2';
  if (c.startsWith('SM-R500')) return 'Samsung Galaxy Watch Active';
  if (c.startsWith('SM-R800') || c.startsWith('SM-R810')) return 'Samsung Galaxy Watch';
  if (c.startsWith('SM-R390')) return 'Samsung Galaxy Fit 3';

  // ==========================================
  // SAMSUNG GALAXY J & ON & VINTAGE SERIES
  // ==========================================
  if (c.startsWith('SM-J810')) return 'Samsung Galaxy J8';
  if (c.startsWith('SM-J730') || c.startsWith('SM-J701') || c.startsWith('SM-J700')) return 'Samsung Galaxy J7 Series / Prime';
  if (c.startsWith('SM-J610') || c.startsWith('SM-J600')) return 'Samsung Galaxy J6 / J6+';
  if (c.startsWith('SM-J530') || c.startsWith('SM-J500')) return 'Samsung Galaxy J5 Series';
  if (c.startsWith('SM-J415') || c.startsWith('SM-J400')) return 'Samsung Galaxy J4 / J4+';
  if (c.startsWith('SM-J330') || c.startsWith('SM-J320')) return 'Samsung Galaxy J3 Series';
  if (c.startsWith('SM-J260') || c.startsWith('SM-J200')) return 'Samsung Galaxy J2 / Core';
  if (c.startsWith('SM-J120') || c.startsWith('SM-J100')) return 'Samsung Galaxy J1 Series';
  if (c.startsWith('SM-G610') || c.startsWith('SM-G570')) return 'Samsung Galaxy On7 / On5';

  if (c.startsWith('SM-')) return `Samsung Galaxy (${c})`;
  if (c.startsWith('GT-') || c.startsWith('SCH-') || c.startsWith('SPH-') || c.startsWith('SGH-')) return `Samsung (${c})`;

  // === GOOGLE PIXEL ===
  if (/Pixel 9 Pro/i.test(c)) return 'Google Pixel 9 Pro';
  if (/Pixel 9/i.test(c)) return 'Google Pixel 9';
  if (/Pixel 8 Pro/i.test(c)) return 'Google Pixel 8 Pro';
  if (/Pixel 8a/i.test(c)) return 'Google Pixel 8a';
  if (/Pixel 8/i.test(c)) return 'Google Pixel 8';
  if (/Pixel 7 Pro/i.test(c)) return 'Google Pixel 7 Pro';
  if (/Pixel 7a/i.test(c)) return 'Google Pixel 7a';
  if (/Pixel 7/i.test(c)) return 'Google Pixel 7';
  if (/Pixel 6/i.test(c)) return 'Google Pixel 6 Series';
  if (/Pixel/i.test(c)) return `Google ${c}`;

  // ==========================================
  // XIAOMI FLAGSHIP & MI SERIES
  // ==========================================
  if (/Xiaomi 16/i.test(c)) return 'Xiaomi 16 Series';
  if (/24129PN74|24100PN60|Xiaomi 15/i.test(c)) {
    if (c.includes('Ultra') || c.startsWith('24100')) return 'Xiaomi 15 Ultra';
    if (c.includes('Pro') || c.startsWith('24129PN74C')) return 'Xiaomi 15 Pro';
    return 'Xiaomi 15 5G';
  }
  if (/23127PN0|23116PN5|24030PN6|24053PY0|Xiaomi 14/i.test(c)) {
    if (c.includes('Ultra') || c.startsWith('24030')) return 'Xiaomi 14 Ultra';
    if (c.includes('Pro') || c.startsWith('23116')) return 'Xiaomi 14 Pro';
    if (c.includes('Civi') || c.startsWith('24053')) return 'Xiaomi 14 Civi / Civi 4 Pro';
    if (c.includes('14T')) return 'Xiaomi 14T / 14T Pro';
    return 'Xiaomi 14 5G';
  }
  if (/2211133|2210132|2304FPN6|Xiaomi 13/i.test(c)) {
    if (c.includes('Ultra') || c.startsWith('2304F')) return 'Xiaomi 13 Ultra';
    if (c.includes('Pro')) return 'Xiaomi 13 Pro';
    if (c.includes('Lite')) return 'Xiaomi 13 Lite';
    if (c.includes('13T')) return 'Xiaomi 13T / 13T Pro';
    return 'Xiaomi 13 5G';
  }
  if (/Xiaomi 12/i.test(c) || /2201123|2201122/i.test(c)) {
    if (c.includes('Ultra') || c.includes('12S Ultra')) return 'Xiaomi 12S Ultra';
    if (c.includes('12S')) return 'Xiaomi 12S / 12S Pro';
    if (c.includes('12T')) return 'Xiaomi 12T / 12T Pro';
    if (c.includes('Pro')) return 'Xiaomi 12 Pro';
    if (c.includes('Lite')) return 'Xiaomi 12 Lite';
    return 'Xiaomi 12 / 12X';
  }
  if (/Xiaomi 11|Mi 11/i.test(c)) {
    if (c.includes('Ultra')) return 'Xiaomi Mi 11 Ultra';
    if (c.includes('Pro')) return 'Xiaomi Mi 11 Pro';
    if (c.includes('11T')) return 'Xiaomi 11T / 11T Pro';
    if (c.includes('Lite')) return 'Xiaomi Mi 11 Lite 5G';
    return 'Xiaomi Mi 11 / 11i / 11X';
  }
  if (/Mi 10/i.test(c)) {
    if (c.includes('Ultra')) return 'Xiaomi Mi 10 Ultra';
    if (c.includes('Pro')) return 'Xiaomi Mi 10 Pro';
    if (c.includes('10T')) return 'Xiaomi Mi 10T / 10T Pro';
    return 'Xiaomi Mi 10 / 10 Lite';
  }
  if (/Mi 9/i.test(c)) return 'Xiaomi Mi 9 / 9T / 9 SE';
  if (/Mi 8/i.test(c)) return 'Xiaomi Mi 8 / 8 Pro / 8 Lite';
  if (/Mi 6/i.test(c)) return 'Xiaomi Mi 6 / 6X';
  if (/Mi 5/i.test(c)) return 'Xiaomi Mi 5 / 5s / 5X';
  if (/Mi 4/i.test(c)) return 'Xiaomi Mi 4 / 4i / 4c';
  if (/Mi 3/i.test(c) || /Mi 2/i.test(c) || /Mi 1/i.test(c)) return 'Xiaomi Mi 1 / 2 / 3';

  // ==========================================
  // XIAOMI MIX FOLD, FLIP, & PAD SERIES
  // ==========================================
  if (/MIX Fold 4|24072PX77/i.test(c)) return 'Xiaomi MIX Fold 4';
  if (/MIX Flip|2405CPX3D/i.test(c)) return 'Xiaomi MIX Flip';
  if (/MIX Fold 3|2308CPND8/i.test(c)) return 'Xiaomi MIX Fold 3';
  if (/MIX Fold 2|22081212/i.test(c)) return 'Xiaomi MIX Fold 2';
  if (/MIX Fold/i.test(c)) return 'Xiaomi Mi MIX Fold';
  if (/Mi MIX 3/i.test(c)) return 'Xiaomi Mi MIX 3';
  if (/Mi MIX 2/i.test(c)) return 'Xiaomi Mi MIX 2 / 2S';
  if (/Mi MIX/i.test(c)) return 'Xiaomi Mi MIX / Alpha';

  if (/Pad 7/i.test(c)) return 'Xiaomi Pad 7 / 7 Pro / 7S Pro';
  if (/Pad 6/i.test(c) || /23046P/i.test(c)) return 'Xiaomi Pad 6 / 6 Pro / 6S Pro';
  if (/Pad 5/i.test(c) || /2105118/i.test(c)) return 'Xiaomi Pad 5 / 5 Pro';
  if (/Redmi Pad Pro/i.test(c)) return 'Redmi Pad Pro 5G';
  if (/Redmi Pad SE/i.test(c)) return 'Redmi Pad SE / 8.7';
  if (/Redmi Pad/i.test(c)) return 'Redmi Pad';
  if (/Mi Pad/i.test(c)) return 'Xiaomi Mi Pad';

  // ==========================================
  // REDMI NOTE SERIES (Note 15 down to Note 1)
  // ==========================================
  if (/Redmi Note 15/i.test(c)) return 'Xiaomi Redmi Note 15 4G / 5G / Pro / Pro+';
  if (/24117RN76|24116RAC|24116RN98|24115RA8|24090RA2|24094RAD|Redmi Note 14/i.test(c)) {
    if (c.includes('Pro+') || c.startsWith('24115')) return 'Xiaomi Redmi Note 14 Pro+ 5G';
    if (c.includes('Pro') || c.startsWith('24090') || c.startsWith('24116')) return 'Xiaomi Redmi Note 14 Pro 4G/5G';
    if (c.includes('24117RN76')) return 'Xiaomi Redmi Note 14 4G';
    return 'Xiaomi Redmi Note 14 4G / 5G / 14R';
  }
  if (/2312DRA50|2311FRAF8|23129RAA4|Redmi Note 13/i.test(c)) {
    if (c.includes('Pro+') || c.startsWith('2312DRA50')) return 'Xiaomi Redmi Note 13 Pro+ 5G';
    if (c.includes('Pro') || c.startsWith('2311FRAF8')) return 'Xiaomi Redmi Note 13 Pro 4G/5G';
    return 'Xiaomi Redmi Note 13 4G / 5G / 13R';
  }
  if (/23021RAA|23028RA6|22101316|Redmi Note 12/i.test(c)) {
    if (c.includes('Turbo') || c.includes('Discovery')) return 'Xiaomi Redmi Note 12 Turbo / Discovery';
    if (c.includes('Pro+') || c.startsWith('22101316')) return 'Xiaomi Redmi Note 12 Pro+ 5G';
    if (c.includes('Pro')) return 'Xiaomi Redmi Note 12 Pro 4G/5G';
    if (c.includes('12S') || c.includes('12R') || c.includes('Speed')) return 'Xiaomi Redmi Note 12S / 12R / Speed';
    return 'Xiaomi Redmi Note 12 4G / 5G / 12T Pro';
  }
  if (/2201116|Redmi Note 11/i.test(c)) {
    if (c.includes('Pro+') || c.includes('11T Pro')) return 'Xiaomi Redmi Note 11 Pro+ 5G / 11T Pro / Pro+';
    if (c.includes('Pro')) return 'Xiaomi Redmi Note 11 Pro 4G/5G';
    if (c.includes('11S') || c.includes('11E') || c.includes('11R')) return 'Xiaomi Redmi Note 11S / 11E / 11R';
    return 'Xiaomi Redmi Note 11 4G / 5G / 11T 5G';
  }
  if (/Redmi Note 10/i.test(c)) return 'Xiaomi Redmi Note 10 4G/5G / 10S / 10T / 10 Pro / Pro Max';
  if (/Redmi Note 9/i.test(c)) return 'Xiaomi Redmi Note 9 4G/5G / 9S / 9 Pro / 9 Pro Max / 9T';
  if (/Redmi Note 8/i.test(c)) return 'Xiaomi Redmi Note 8 / 8T / 8 Pro / 8 (2021)';
  if (/Redmi Note 7/i.test(c)) return 'Xiaomi Redmi Note 7 / 7 Pro / 7S';
  if (/Redmi Note 6/i.test(c)) return 'Xiaomi Redmi Note 6 Pro';
  if (/Redmi Note 5/i.test(c)) return 'Xiaomi Redmi Note 5 / 5 Pro / AI';
  if (/Redmi Note 4/i.test(c)) return 'Xiaomi Redmi Note 4 / 4X';
  if (/Redmi Note 3/i.test(c)) return 'Xiaomi Redmi Note 3 / Snapdragon / SE';
  if (/Redmi Note 2/i.test(c)) return 'Xiaomi Redmi Note 2 / Prime';
  if (/Redmi Note 3G|Redmi Note 4G|Redmi Note/i.test(c)) return 'Xiaomi Redmi Note';

  // ==========================================
  // REDMI K-SERIES & TURBO SERIES
  // ==========================================
  if (/Redmi K100/i.test(c)) return 'Xiaomi Redmi K100 Series';
  if (/Redmi K90/i.test(c)) return 'Xiaomi Redmi K90 / K90 Pro / K90 Ultra';
  if (/24117RK2|Redmi K80/i.test(c)) return 'Xiaomi Redmi K80 / K80 Pro';
  if (/2407FRK8|23117RK6|Redmi K70/i.test(c)) return 'Xiaomi Redmi K70 / K70 Pro / K70E / K70 Ultra';
  if (/Redmi K60/i.test(c)) return 'Xiaomi Redmi K60 / K60 Pro / K60E / K60 Ultra';
  if (/Redmi K50/i.test(c)) return 'Xiaomi Redmi K50 / K50 Pro / K50 Gaming / Ultra / K50i';
  if (/Redmi K40/i.test(c)) return 'Xiaomi Redmi K40 / K40 Pro / K40 Pro+ / K40 Gaming / K40S';
  if (/Redmi K30/i.test(c)) return 'Xiaomi Redmi K30 4G/5G / Pro / Zoom / Ultra / K30S';
  if (/Redmi K20/i.test(c)) return 'Xiaomi Redmi K20 / K20 Pro / Premium';

  if (/Redmi Turbo 5/i.test(c)) return 'Xiaomi Redmi Turbo 5';
  if (/Redmi Turbo 4/i.test(c)) return 'Xiaomi Redmi Turbo 4 / 4 Pro';
  if (/Redmi Turbo 3/i.test(c)) return 'Xiaomi Redmi Turbo 3';

  // ==========================================
  // REDMI NUMBERED SERIES (Redmi 15 down to Redmi 1) & A-SERIES
  // ==========================================
  if (/Redmi 15/i.test(c)) return 'Xiaomi Redmi 15 Series';
  if (/2409BRN2C|Redmi 14/i.test(c)) return 'Xiaomi Redmi 14 4G/5G / 14A / 14R / 14C 5G';
  if (/24040RN64|Redmi 13/i.test(c)) return 'Xiaomi Redmi 13 4G/5G / 13C / 13R 5G';
  if (/23076RN4B|23053RN02|Redmi 12/i.test(c)) return 'Xiaomi Redmi 12 4G/5G / 12C';
  if (/Redmi 11 Prime/i.test(c)) return 'Xiaomi Redmi 11 Prime 4G / 5G';
  if (/Redmi 10X/i.test(c)) return 'Xiaomi Redmi 10X 4G / 5G / Pro';
  if (/Redmi 10/i.test(c)) return 'Xiaomi Redmi 10 4G/5G / 10A / 10C / 10 Prime / Power';
  if (/Redmi 9/i.test(c)) return 'Xiaomi Redmi 9 / 9A / 9C / 9T / 9i / Prime / Power';
  if (/Redmi 8/i.test(c)) return 'Xiaomi Redmi 8 / 8A / Dual / Pro';
  if (/Redmi 7/i.test(c)) return 'Xiaomi Redmi 7 / 7A';
  if (/Redmi 6/i.test(c)) return 'Xiaomi Redmi 6 / 6A / 6 Pro';
  if (/Redmi 5/i.test(c)) return 'Xiaomi Redmi 5 / 5A / 5 Plus';
  if (/Redmi 4/i.test(c)) return 'Xiaomi Redmi 4 / 4A / 4X / 4 Prime';
  if (/Redmi 3/i.test(c)) return 'Xiaomi Redmi 3 / 3 Pro / 3S / 3X';
  if (/Redmi 2/i.test(c)) return 'Xiaomi Redmi 2 / 2A / 2 Prime';
  if (/Redmi 1S|Redmi 1\b/i.test(c)) return 'Xiaomi Redmi 1 / 1S';
  if (/Redmi Pro\b/i.test(c)) return 'Xiaomi Redmi Pro';

  if (/Redmi A5/i.test(c)) return 'Xiaomi Redmi A5 5G';
  if (/Redmi A4/i.test(c)) return 'Xiaomi Redmi A4 5G';
  if (/Redmi A3/i.test(c)) return 'Xiaomi Redmi A3 / A3x / A3 Pro';
  if (/Redmi A2/i.test(c)) return 'Xiaomi Redmi A2 / A2+';
  if (/Redmi A1/i.test(c)) return 'Xiaomi Redmi A1 / A1+';
  if (/Redmi Y1|Redmi Y2|Redmi Y3|Redmi S2|Redmi Go/i.test(c)) return `Xiaomi ${c}`;

  // ==========================================
  // POCO F, X, M, & C SERIES
  // ==========================================
  // POCO F-SERIES (F9 down to F1)
  if (/POCO F9/i.test(c)) return 'Poco F9 Series';
  if (/POCO F8/i.test(c)) return 'Poco F8 / F8 Pro / F8 Ultra';
  if (/24119PCD|POCO F7/i.test(c)) return 'Poco F7 5G / F7 Pro / F7 Ultra';
  if (/Deadpool/i.test(c) && /POCO F6|F6/i.test(c)) return 'Poco F6 (Deadpool Edition)';
  if (/24069PC2|23117RK66|POCO F6 Pro/i.test(c)) return 'Poco F6 Pro 5G';
  if (/POCO F6\b/i.test(c)) return 'Poco F6 5G';
  if (/23049PCD8|POCO F5 Pro/i.test(c)) return 'Poco F5 Pro 5G';
  if (/POCO F5\b/i.test(c)) return 'Poco F5 5G';
  if (/22011211|POCO F4 GT/i.test(c)) return 'Poco F4 GT 5G';
  if (/POCO F4\b/i.test(c)) return 'Poco F4 5G';
  if (/POCO F3 GT/i.test(c)) return 'Poco F3 GT';
  if (/M2012K11AG|M2012K11AI|POCO F3\b/i.test(c)) return 'Poco F3 5G';
  if (/M2004J11G|POCO F2 Pro/i.test(c)) return 'Poco F2 Pro';
  if (/M1805E10A|POCO F1|POCOPHONE F1/i.test(c)) return 'Poco F1 (Pocophone)';

  // POCO X-SERIES (X9 down to X2)
  if (/POCO X9/i.test(c)) return 'Poco X9 Series';
  if (/POCO X8/i.test(c)) return 'Poco X8 5G / X8 Pro 5G';
  if (/2412DPC0|POCO X7/i.test(c)) return 'Poco X7 5G / X7 Pro 5G / X7 Neo';
  if (/23122PCD|2310FPCA|24016PCA|POCO X6 Pro/i.test(c)) return 'Poco X6 Pro 5G';
  if (/POCO X6\b/i.test(c)) return 'Poco X6 5G / X6 Neo';
  if (/22101320|22111317|POCO X5 Pro/i.test(c)) return 'Poco X5 Pro 5G';
  if (/POCO X5\b/i.test(c)) return 'Poco X5 5G';
  if (/POCO X4 GT/i.test(c)) return 'Poco X4 GT';
  if (/2201116PG|2201116PI|2201116P|2201116|POCO X4 Pro/i.test(c)) return 'Poco X4 Pro 5G';
  if (/POCO X4\b/i.test(c)) return 'Poco X4';
  if (/POCO X3 Pro/i.test(c)) return 'Poco X3 Pro';
  if (/M2007J20CG|M2007J20CT|POCO X3 NFC|POCO X3\b/i.test(c)) return 'Poco X3 / X3 NFC';
  if (/POCO X2\b/i.test(c)) return 'Poco X2';

  // POCO M-SERIES (M8 down to M2)
  if (/POCO M8/i.test(c)) return 'Poco M8 5G / M8 Pro 5G';
  if (/POCO M7/i.test(c)) return 'Poco M7 4G / M7 5G / M7 Pro 5G';
  if (/24076PCD|POCO M6 Plus/i.test(c)) return 'Poco M6 Plus 5G';
  if (/23076PC4|23128PC9|POCO M6 Pro/i.test(c)) return 'Poco M6 Pro 4G / 5G';
  if (/24066PC9|POCO M6/i.test(c)) return 'Poco M6 4G / 5G';
  if (/22071219C|22071219CG|22071219CI|POCO M5s/i.test(c)) return 'Poco M5s';
  if (/22071219G|22071219I|22071219|POCO M5\b/i.test(c)) return 'Poco M5';

  // POCO M4 Series (Exact Hardware Codes & Names)
  if (/2201117PG|2201117PI|2201117SI|2201117SY|2201117P|2201117S|2201117|MZB0AUVIN|MZB0B0EIN|POCO M4 Pro 4G|POCO M4 Pro\b|M4 Pro\b/i.test(c)) {
    return 'Poco M4 Pro (Xiaomi)';
  }
  if (/21091116AG|21091116AI|21091116UG|21091116UC|21091116UI|21091116TG|21091116|POCO M4 Pro 5G|M4 Pro 5G/i.test(c)) {
    return 'Poco M4 Pro 5G (Xiaomi)';
  }
  if (/22041219G|22041219I|22041219PI|22041219PG|22041219|MZB0B5EIN|MZB0B5FIN|MZB0B5GIN|POCO M4 5G|POCO M4\b|M4 5G|M4\b/i.test(c)) {
    return 'Poco M4 5G (Xiaomi)';
  }

  if (/M2103K19PG|M2103K19PI|M2103K19PY|M2103K19G|M2103K19|POCO M3 Pro/i.test(c)) return 'Poco M3 Pro 5G';
  if (/M2010J19CG|M2010J19CT|M2010J19CI|M2010J19|POCO M3\b/i.test(c)) return 'Poco M3';
  if (/POCO M2 Reloaded/i.test(c)) return 'Poco M2 Reloaded';
  if (/M2003J6CI|M2003J6C|POCO M2 Pro/i.test(c)) return 'Poco M2 Pro';
  if (/MZB9919IN|M2004J19PI|M2004J19P|POCO M2\b/i.test(c)) return 'Poco M2';

  // POCO C-SERIES (C85 down to C3)
  if (/POCO C85|POCO C81/i.test(c)) return 'Poco C85 / C81';
  if (/POCO C75|POCO C71/i.test(c)) return 'Poco C75 / C71';
  if (/2310FPCA|POCO C65|POCO C61/i.test(c)) return 'Poco C65 / C61';
  if (/22127PC95G|22127PC95I|POCO C55/i.test(c)) return 'Poco C55';
  if (/MZB0DX0IN|POCO C51/i.test(c)) return 'Poco C51';
  if (/MZB0D3PIN|POCO C50/i.test(c)) return 'Poco C50';
  if (/220333QPG|220333QPI|POCO C40/i.test(c)) return 'Poco C40';
  if (/MZB0A0MIN|MZB0A0NIN|POCO C31/i.test(c)) return 'Poco C31';
  if (/MZB07RIIN|MZB07RJIN|POCO C3\b/i.test(c)) return 'Poco C3';

  // ==========================================
  // XIAOMI SMART ECOSYSTEM & VEHICLES
  // ==========================================
  if (/SU7|SU8/i.test(c)) return `Xiaomi ${c} (Smart EV)`;
  if (/Watch S5|Watch S4|Watch S3|Watch S2|Watch S1|Watch 2|Watch 3/i.test(c)) return `Xiaomi ${c}`;
  if (/Smart Band|Mi Band/i.test(c)) return `Xiaomi ${c}`;

  if (/Redmi/i.test(c)) return `Xiaomi ${c}`;
  if (/POCO/i.test(c)) return `Poco ${c}`;
  if (/Xiaomi|Mi /i.test(c)) return c.startsWith('Xiaomi') ? c : `Xiaomi ${c}`;

  // ==========================================
  // OPPO FIND & FIND N FOLDABLE SERIES
  // ==========================================
  if (/Find X10|Find X9/i.test(c)) return `Oppo ${c}`;
  if (/CPH2659|PKB110|Find X8 Pro/i.test(c)) return 'Oppo Find X8 Pro';
  if (/CPH2651|PKC110|Find X8/i.test(c)) return 'Oppo Find X8 5G';
  if (/PHY110|Find X7 Ultra/i.test(c)) return 'Oppo Find X7 Ultra';
  if (/PHZ110|Find X7/i.test(c)) return 'Oppo Find X7';
  if (/CPH2451|PGEM10|Find X6 Pro/i.test(c)) return 'Oppo Find X6 Pro';
  if (/Find X6/i.test(c)) return 'Oppo Find X6';
  if (/CPH2305|PFEM10|Find X5 Pro/i.test(c)) return 'Oppo Find X5 Pro';
  if (/Find X5/i.test(c)) return 'Oppo Find X5 / Lite';
  if (/CPH2173|PEEM00|Find X3 Pro/i.test(c)) return 'Oppo Find X3 Pro';
  if (/Find X3/i.test(c)) return 'Oppo Find X3 / Neo / Lite';
  if (/CPH2025|PDEM30|Find X2 Pro/i.test(c)) return 'Oppo Find X2 Pro';
  if (/Find X2/i.test(c)) return 'Oppo Find X2 / Neo / Lite';
  if (/CPH1871|PAFM00|Find X/i.test(c)) return 'Oppo Find X';
  if (/Find 7/i.test(c) || /Find 5/i.test(c) || /Finder/i.test(c)) return `Oppo ${c}`;

  if (/Find N6|Find N5/i.test(c)) return `Oppo ${c}`;
  if (/CPH2499|PHT110|Find N3/i.test(c)) return 'Oppo Find N3';
  if (/CPH2519|PHN110|Find N3 Flip/i.test(c)) return 'Oppo Find N3 Flip';
  if (/PGU110|Find N2/i.test(c)) return 'Oppo Find N2';
  if (/PFT110|Find N2 Flip/i.test(c)) return 'Oppo Find N2 Flip';
  if (/PEUM00|Find N/i.test(c)) return 'Oppo Find N';

  // ==========================================
  // OPPO RENO SERIES (Reno 15 down to Reno 1)
  // ==========================================
  if (/Reno15|Reno 15/i.test(c)) return 'Oppo Reno 15 Series';
  if (/Reno14|Reno 14/i.test(c)) return 'Oppo Reno 14 Series';
  if (/CPH2683|Reno13 Pro|Reno 13 Pro/i.test(c)) return 'Oppo Reno 13 Pro 5G';
  if (/CPH2689|Reno13|Reno 13/i.test(c)) return 'Oppo Reno 13 5G / 13 F';
  if (/CPH2607|Reno12 Pro|Reno 12 Pro/i.test(c)) return 'Oppo Reno 12 Pro 5G';
  if (/CPH2629|CPH2631|Reno12|Reno 12/i.test(c)) return 'Oppo Reno 12 5G';
  if (/CPH2637|Reno12 F|Reno 12 F/i.test(c)) return 'Oppo Reno 12 F 4G/5G';
  if (/CPH2529|CPH2531|Reno11 Pro|Reno 11 Pro/i.test(c)) return 'Oppo Reno 11 Pro 5G';
  if (/CPH2525|CPH2599|Reno11|Reno 11/i.test(c)) return 'Oppo Reno 11 5G';
  if (/CPH2603|Reno11 F|Reno 11 F/i.test(c)) return 'Oppo Reno 11 F 5G';
  if (/CPH2501|CPH2523|Reno10 Pro|Reno 10 Pro/i.test(c)) return 'Oppo Reno 10 Pro / Pro+ 5G';
  if (/CPH2543|Reno10|Reno 10/i.test(c)) return 'Oppo Reno 10 5G';
  if (/Reno9|Reno 9/i.test(c)) return 'Oppo Reno 9 / 9 Pro / 9 Pro+';
  if (/CPH2359|CPH2361|Reno8 Pro|Reno 8 Pro/i.test(c)) return 'Oppo Reno 8 Pro 5G';
  if (/CPH2475|CPH2481|Reno8 T|Reno 8 T/i.test(c)) return 'Oppo Reno 8 T 4G/5G';
  if (/CPH2357|Reno8|Reno 8/i.test(c)) return 'Oppo Reno 8 5G / 8 Z';
  if (/CPH2371|CPH2363|Reno7|Reno 7/i.test(c)) return 'Oppo Reno 7 / 7 Pro / 7 Z 5G';
  if (/CPH2237|CPH2251|CPH2235|Reno6|Reno 6/i.test(c)) return 'Oppo Reno 6 / 6 Pro / 6 Z 5G';
  if (/CPH2145|CPH2159|Reno5|Reno 5/i.test(c)) return 'Oppo Reno 5 / 5 5G / 5 Pro / 5 F';
  if (/CPH2089|CPH2113|CPH2065|Reno4|Reno 4/i.test(c)) return 'Oppo Reno 4 / 4 Pro / 4 5G / 4 F';
  if (/CPH2043|Reno3|Reno 3/i.test(c)) return 'Oppo Reno 3 / 3 Pro 5G';
  if (/CPH1907|Reno2|Reno 2/i.test(c)) return 'Oppo Reno 2 / 2 F / 2 Z';
  if (/CPH1917|Reno/i.test(c)) return 'Oppo Reno / 10x Zoom / 5G';

  // ==========================================
  // OPPO F-SERIES & K-SERIES
  // ==========================================
  if (/F29/i.test(c)) return 'Oppo F29 / F29 Pro 5G';
  if (/CPH2635|F27/i.test(c)) return 'Oppo F27 / F27 Pro+ 5G';
  if (/CPH2605|F25/i.test(c)) return 'Oppo F25 Pro 5G';
  if (/CPH2523|F23/i.test(c)) return 'Oppo F23 5G';
  if (/CPH2343|F21/i.test(c)) return 'Oppo F21 Pro / F21s Pro 5G';
  if (/CPH2285|CPH2219|F19/i.test(c)) return 'Oppo F19 / F19 Pro / F19s';
  if (/CPH2095|F17/i.test(c)) return 'Oppo F17 / F17 Pro';
  if (/F15/i.test(c)) return 'Oppo F15';
  if (/CPH1969|F11/i.test(c)) return 'Oppo F11 / F11 Pro';
  if (/CPH1823|F9/i.test(c)) return 'Oppo F9 / F9 Pro';
  if (/CPH1851|F7/i.test(c)) return 'Oppo F7 / F7 Youth';
  if (/CPH1723|F5/i.test(c)) return 'Oppo F5 / F5 Youth';
  if (/CPH1609|F3/i.test(c)) return 'Oppo F3 / F3 Plus';
  if (/CPH1601|F1/i.test(c)) return 'Oppo F1 / F1s / F1 Plus';

  if (/K13/i.test(c)) return 'Oppo K13 Series';
  if (/PKS110|PJV110|PJE110|K12/i.test(c)) return 'Oppo K12 / K12x / K12 Plus';
  if (/PHZ110|K11/i.test(c)) return 'Oppo K11 / K11x';
  if (/PGZ110|K10/i.test(c)) return 'Oppo K10 / K10 5G / K10 Pro';
  if (/K9|K7|K5|K3|K1/i.test(c)) return `Oppo ${c}`;

  // ==========================================
  // OPPO A-SERIES
  // ==========================================
  if (/CPH2669|A80|A81/i.test(c)) return 'Oppo A80 5G';
  if (/CPH2639|A60|A61/i.test(c)) return 'Oppo A60';
  if (/CPH2609|A3 Pro/i.test(c)) return 'Oppo A3 Pro 5G';
  if (/CPH2643|A3x/i.test(c)) return 'Oppo A3x 4G';
  if (/CPH2661|A3 /i.test(c)) return 'Oppo A3 4G';
  if (/CPH2527|A98/i.test(c)) return 'Oppo A98 5G';
  if (/CPH2467|A97/i.test(c)) return 'Oppo A97 5G';
  if (/CPH2365|A96/i.test(c)) return 'Oppo A96';
  if (/A95/i.test(c)) return 'Oppo A95 / A95 5G';
  if (/CPH2203|A94/i.test(c)) return 'Oppo A94 4G/5G';
  if (/A93/i.test(c)) return 'Oppo A93 / A93 5G';
  if (/CPH2059|A92/i.test(c)) return 'Oppo A92 / A92s';
  if (/A91|A9 /i.test(c)) return 'Oppo A91 / A9 (2020)';
  if (/A83/i.test(c)) return 'Oppo A83';
  if (/CPH2505|A79/i.test(c)) return 'Oppo A79 5G';
  if (/CPH2477|CPH2495|A78/i.test(c)) return 'Oppo A78 4G/5G';
  if (/CPH2387|CPH2339|A77/i.test(c)) return 'Oppo A77 / A77s / A77 5G';
  if (/CPH2219|CPH2197|A74/i.test(c)) return 'Oppo A74 4G/5G';
  if (/A73|A72|A71|A7 /i.test(c)) return 'Oppo A73 / A72 / A71 / A7';
  if (/CPH2577|A58/i.test(c)) return 'Oppo A58 4G/5G';
  if (/CPH2385|A57/i.test(c)) return 'Oppo A57';
  if (/CPH2325|A55/i.test(c)) return 'Oppo A55 4G/5G';
  if (/CPH2239|A54/i.test(c)) return 'Oppo A54 / A54 5G / A54s';
  if (/CPH2127|A53/i.test(c)) return 'Oppo A53 / A53s';
  if (/CPH2069|A52|A5 /i.test(c)) return 'Oppo A52 / A5 (2020)';
  if (/CPH2565|A38/i.test(c)) return 'Oppo A38';
  if (/A37|A39|A33|A3s|CPH1803/i.test(c)) return 'Oppo A37 / A39 / A3s';
  if (/CPH2015|A31/i.test(c)) return 'Oppo A31 (2020)';
  if (/CPH2579|A18/i.test(c)) return 'Oppo A18';
  if (/CPH2471|CPH2473|A17/i.test(c)) return 'Oppo A17 / A17k';
  if (/CPH2269|A16/i.test(c)) return 'Oppo A16 / A16s / A16k';
  if (/CPH2185|A15/i.test(c)) return 'Oppo A15 / A15s';
  if (/A12|A1k|CPH1923/i.test(c)) return 'Oppo A12 / A1k';
  if (/A5s|CPH1909/i.test(c)) return 'Oppo A5s';

  // ==========================================
  // OPPO N, R, & NEO SERIES
  // ==========================================
  if (/N3|N1/i.test(c)) return `Oppo ${c}`;
  if (/R17|R15|R11|R9|R7|R5/i.test(c)) return `Oppo ${c}`;
  if (/Neo 7|Neo 5|Neo 3/i.test(c)) return `Oppo ${c}`;

  // ==========================================
  // ONEPLUS / REALME
  // ==========================================
  if (c === 'CPH2581' || c === 'PJD110') return 'OnePlus 12 5G';
  if (c === 'CPH2449' || c === 'CPH2451') return 'OnePlus 11 5G';
  if (c.startsWith('CPH')) return `Oppo (${c})`;

  // ==========================================
  // REALME NUMBERED SERIES (Realme 15 down to Realme 1)
  // ==========================================
  if (/Realme 15/i.test(c)) return 'Realme 15 Series';
  if (/RMX50|Realme 14/i.test(c)) return 'Realme 14 5G / 14 Pro / 14 Pro+ / 14x 5G';
  if (/RMX3921|RMX3989|Realme 13/i.test(c)) return 'Realme 13 4G/5G / 13+ / 13 Pro+ 5G';
  if (/RMX3840|RMX3842|RMX3999|Realme 12/i.test(c)) return 'Realme 12 5G / 12+ / 12 Pro / 12 Pro+ 5G';
  if (/RMX3741|RMX3771|RMX3780|Realme 11/i.test(c)) return 'Realme 11 4G/5G / 11 Pro / 11 Pro+ 5G';
  if (/RMX3630|RMX3663|RMX3686|Realme 10/i.test(c)) return 'Realme 10 4G/5G / 10 Pro / 10 Pro+ 5G';
  if (/RMX3491|RMX3471|RMX3392|Realme 9/i.test(c)) return 'Realme 9 4G/5G / 9 Pro / 9 Pro+ / 9i 5G';
  if (/RMX3081|RMX3085|RMX3241|Realme 8/i.test(c)) return 'Realme 8 4G/5G / 8 Pro / 8s / 8i';
  if (/RMX2151|RMX2170|RMX2103|Realme 7/i.test(c)) return 'Realme 7 / 7 Pro / 7 5G / 7i';
  if (/RMX2001|RMX2061|Realme 6/i.test(c)) return 'Realme 6 / 6 Pro / 6i / 6S';
  if (/Realme 5/i.test(c)) return 'Realme 5 / 5 Pro / 5s / 5i';
  if (/Realme 3/i.test(c)) return 'Realme 3 / 3 Pro / 3i';
  if (/Realme 2/i.test(c)) return 'Realme 2 / 2 Pro';
  if (/Realme 1\b/i.test(c)) return 'Realme 1';

  // ==========================================
  // REALME GT & P SERIES
  // ==========================================
  if (/GT 8|Fold Concept/i.test(c)) return `Realme ${c}`;
  if (/RMX5060|GT 7/i.test(c)) return 'Realme GT 7 / GT 7 Pro / GT 7 Ultra / GT Neo 7';
  if (/RMX3851|RMX3850|RMX3852|GT 6/i.test(c)) return 'Realme GT 6 5G / GT 6T / GT Neo 6';
  if (/RMX3708|RMX3700|RMX3888|GT 5/i.test(c)) return 'Realme GT 5 240W / GT 5 Pro / GT Neo 5';
  if (/GT 3/i.test(c)) return 'Realme GT 3 (240W)';
  if (/RMX3310|RMX3301|RMX3371|GT 2/i.test(c)) return 'Realme GT 2 / GT 2 Pro / GT Neo 3 / 3T';
  if (/RMX2202|RMX3363|RMX3370|GT /i.test(c)) return 'Realme GT 5G / GT Master Edition / GT Neo 2';

  if (/Realme P3/i.test(c)) return 'Realme P3 5G / P3 Pro 5G';
  if (/RMX3987|Realme P2/i.test(c)) return 'Realme P2 Pro 5G';
  if (/RMX3870|RMX3844|Realme P1/i.test(c)) return 'Realme P1 5G / P1 Pro 5G / P1 Speed 5G';

  // ==========================================
  // REALME NARZO SERIES
  // ==========================================
  if (/Narzo 80/i.test(c)) return 'Realme Narzo 80 5G / 80 Pro 5G';
  if (/RMX3869|Narzo 70/i.test(c)) return 'Realme Narzo 70 5G / 70 Pro / 70 Turbo / 70x';
  if (/RMX3750|RMX3782|Narzo 60/i.test(c)) return 'Realme Narzo 60 5G / 60 Pro / 60x 5G';
  if (/Narzo N65|Narzo N63|Narzo N61|Narzo N55|Narzo N53|RMX3711/i.test(c)) return `Realme ${c}`;
  if (/Narzo 50/i.test(c)) return 'Realme Narzo 50 / 50A / 50i / 50 5G / 50 Pro 5G';
  if (/Narzo 30/i.test(c)) return 'Realme Narzo 30 / 30A / 30 Pro 5G';
  if (/Narzo 20/i.test(c)) return 'Realme Narzo 20 / 20A / 20 Pro';
  if (/Narzo 10/i.test(c)) return 'Realme Narzo 10 / 10A';

  // ==========================================
  // REALME C-SERIES & NOTE SERIES
  // ==========================================
  if (/Note 70|Note 60|Note 50|RMX3933|RMX3834/i.test(c)) return `Realme ${c}`;
  if (/Realme C75|Realme C73|Realme C71/i.test(c)) return `Realme ${c}`;
  if (/RMX3890|Realme C67/i.test(c)) return 'Realme C67 4G / 5G';
  if (/RMX3910|Realme C65/i.test(c)) return 'Realme C65 4G / 5G';
  if (/RMX3939|Realme C63/i.test(c)) return 'Realme C63 / C63 5G';
  if (/RMX3930|Realme C61/i.test(c)) return 'Realme C61';
  if (/RMX3710|Realme C55/i.test(c)) return 'Realme C55';
  if (/RMX3830|Realme C53/i.test(c)) return 'Realme C53';
  if (/RMX3760|Realme C51/i.test(c)) return 'Realme C51 / C51s';
  if (/Realme C35|Realme C33|Realme C31|Realme C30/i.test(c)) return `Realme ${c}`;
  if (/Realme C25|Realme C21|Realme C20|Realme C17|Realme C15|Realme C12|Realme C11|Realme C3|Realme C2|Realme C1/i.test(c)) return `Realme ${c}`;

  // ==========================================
  // REALME X, V, Q & U SERIES
  // ==========================================
  if (/Realme X50|Realme X3|Realme XT|Realme X2|Realme X\b/i.test(c)) return `Realme ${c}`;
  if (/Realme V25|Realme V23|Realme V20|Realme V15|Realme V13|Realme V11|Realme V5|Realme V3/i.test(c)) return `Realme ${c}`;
  if (/Realme Q5|Realme Q3|Realme Q2/i.test(c)) return `Realme ${c}`;
  if (/Realme U1/i.test(c)) return 'Realme U1';
  if (c.startsWith('RMX')) return `Realme (${c})`;

  // ==========================================
  // VIVO X SERIES & FOLDABLES
  // ==========================================
  if (/X300/i.test(c)) return 'Vivo X300 / X300 Pro';
  if (/V2405|V2419|V2415|X200/i.test(c)) return 'Vivo X200 / X200 Pro / Pro mini / Ultra';
  if (/V2324|V2309|V2359|X100/i.test(c)) return 'Vivo X100 / X100 Pro / Ultra / X100s';
  if (/V2241|V2242|V2227|X90/i.test(c)) return 'Vivo X90 / X90 Pro / Pro+ / X90s';
  if (/V2185|V2144|X80/i.test(c)) return 'Vivo X80 / X80 Pro / Pro+ / Lite';
  if (/V2104|V2105|X70/i.test(c)) return 'Vivo X70 / X70 Pro / X70 Pro+';
  if (/V2045|V2046|X60/i.test(c)) return 'Vivo X60 / X60 Pro / Pro+ / X60t';
  if (/V2005|V2006|X50/i.test(c)) return 'Vivo X50 / X50 Pro / Pro+ / Lite';
  if (/X30|X27|X23|X21|X20|X9|X7|X6|X5Max|Xshot|X3|Xplay|X1/i.test(c)) return `Vivo ${c}`;
  if (/NEX/i.test(c)) return `Vivo ${c}`;
  if (/APEX/i.test(c)) return `Vivo ${c}`;

  if (/X Fold 5|X Fold 4/i.test(c)) return `Vivo ${c}`;
  if (/V2303A|V2337A|X Fold 3/i.test(c)) return 'Vivo X Fold 3 / Fold 3 Pro';
  if (/V2229A|X Fold 2|X Fold\+/i.test(c)) return 'Vivo X Fold 2 / Fold+';
  if (/X Fold/i.test(c)) return 'Vivo X Fold';
  if (/X Flip 3|X Flip 2|X Flip/i.test(c)) return 'Vivo X Flip';
  if (/TriFold/i.test(c)) return 'Vivo X TriFold Concept';

  // ==========================================
  // VIVO V SERIES (V60 down to V1)
  // ==========================================
  if (/V60|V50/i.test(c)) return `Vivo ${c}`;
  if (/V2338|V2348|V2418|V2408|V40/i.test(c)) return 'Vivo V40 / V40 Pro / V40e / V40 Lite 5G';
  if (/V2303|V2318|V2327|V2319|V30/i.test(c)) return 'Vivo V30 / V30 Pro / V30e / V30 Lite';
  if (/V2250|V2254|V29/i.test(c)) return 'Vivo V29 / V29 Pro / V29e / V29 Lite';
  if (/V2204|V2205|V2230|V27/i.test(c)) return 'Vivo V27 / V27 Pro / V27e 5G';
  if (/V2202|V2158|V2201|V25/i.test(c)) return 'Vivo V25 / V25 Pro / V25e';
  if (/V2130|V2132|V2116|V23/i.test(c)) return 'Vivo V23 5G / V23 Pro / V23e';
  if (/V2050|V2061|V21/i.test(c)) return 'Vivo V21 5G / V21e / V21s';
  if (/V2025|V2024|V20/i.test(c)) return 'Vivo V20 / V20 Pro / V20 SE';
  if (/V19|V17|V15|V11|V9|V7|V5|V3|V1/i.test(c)) return `Vivo ${c}`;

  // ==========================================
  // VIVO Y SERIES (Y301 down to Y01)
  // ==========================================
  if (/Y301|Y201|Y101|Y39|Y29|Y19s|Y04/i.test(c)) return `Vivo ${c}`;
  if (/Y300/i.test(c)) return 'Vivo Y300 / Y300 Pro / Y300 Plus 5G';
  if (/V2307|V2329|Y200/i.test(c)) return 'Vivo Y200 / Y200e / Y200+ / Y200 Pro 5G';
  if (/V2310|V2342|Y100/i.test(c)) return 'Vivo Y100 4G / 5G';
  if (/Y58|Y38/i.test(c)) return `Vivo ${c}`;
  if (/V2247|V2248|Y36/i.test(c)) return 'Vivo Y36 4G / 5G';
  if (/Y35/i.test(c)) return 'Vivo Y35 4G / 5G';
  if (/V2343|V2346|Y28/i.test(c)) return 'Vivo Y28 4G / 5G / Y28s 5G';
  if (/V2249|Y27/i.test(c)) return 'Vivo Y27 4G / 5G / Y27s';
  if (/V2207|V2206|Y22/i.test(c)) return 'Vivo Y22 / Y22s';
  if (/V2333|V2344|Y18/i.test(c)) return 'Vivo Y18 / Y18e / Y18t';
  if (/Y17/i.test(c)) return 'Vivo Y17 / Y17s';
  if (/V2204|Y16/i.test(c)) return 'Vivo Y16';
  if (/V2332|V2409|Y03/i.test(c)) return 'Vivo Y03 / Y03t';
  if (/V2217|V2203|Y02/i.test(c)) return 'Vivo Y02 / Y02s / Y02t';
  if (/V2140|Y01/i.test(c)) return 'Vivo Y01 / Y01A';
  if (/Y95|Y93|Y91|Y85|Y83|Y81|Y75|Y73|Y72|Y71|Y70|Y69|Y67|Y55|Y53|Y51|Y50|Y33|Y31|Y30|Y21|Y20|Y15|Y12|Y11/i.test(c)) return `Vivo ${c}`;

  // ==========================================
  // VIVO T & S SERIES, PADS, & IQOO
  // ==========================================
  if (/T5|T4/i.test(c)) return `Vivo ${c}`;
  if (/V2322|V2334|T3/i.test(c)) return 'Vivo T3 5G / T3x / T3 Pro / T3 Ultra';
  if (/V2225|T2/i.test(c)) return 'Vivo T2 5G / T2x / T2 Pro';
  if (/V2144|T1/i.test(c)) return 'Vivo T1 5G / T1 44W / T1 Pro / T1x';

  if (/S22|S21|S20|S19|S18|S17|S16|S15|S12|S10|S9|S7|S6|S5|S1/i.test(c)) return `Vivo ${c}`;
  if (/U20|U10|Z6|Z5|Z3|Z1/i.test(c)) return `Vivo ${c}`;

  if (/Vivo Pad/i.test(c) || /Pad Air|Pad 4|Pad 3|Pad 2/i.test(c)) return `Vivo ${c}`;
  if (/Vivo Watch|Watch GT|Watch 4|Watch 3|Watch 2/i.test(c)) return `Vivo ${c}`;
  if (/Vision AR|Vision MR/i.test(c)) return 'Vivo Vision AR / MR Headset';

  // ==========================================
  // IQOO FLAGSHIPS, NEO, Z & U SERIES
  // ==========================================
  if (/iQOO 14|iQOO Fold/i.test(c)) return `iQOO ${c.replace(/^iQOO /i, '')}`;
  if (/I2401|V2408|iQOO 13/i.test(c)) return 'iQOO 13 / 13 Pro 5G';
  if (/I2208|I2220|iQOO 12/i.test(c)) return 'iQOO 12 / 12 Pro 5G';
  if (/I2212|iQOO 11/i.test(c)) return 'iQOO 11 / 11 Pro / 11S 5G';
  if (/iQOO 10/i.test(c)) return 'iQOO 10 / 10 Pro 5G';
  if (/I2021|I2022|iQOO 9/i.test(c)) return 'iQOO 9 / 9 Pro / 9 SE / 9T 5G';
  if (/iQOO 8/i.test(c)) return 'iQOO 8 / 8 Pro 5G';
  if (/I2009|iQOO 7/i.test(c)) return 'iQOO 7 / 7 Legend 5G';
  if (/iQOO 5/i.test(c)) return 'iQOO 5 / 5 Pro 5G';
  if (/I1927|iQOO 3/i.test(c)) return 'iQOO 3 4G/5G';
  if (/iQOO Pro/i.test(c)) return 'iQOO Pro 5G';
  if (/iQOO \(Original\)|^iQOO$/i.test(c)) return 'iQOO (Original)';

  if (/iQOO Neo11/i.test(c)) return 'iQOO Neo11 / Neo11 Pro';
  if (/iQOO Neo10/i.test(c)) return 'iQOO Neo10 / Neo10 Pro / SE / Neo10S Pro';
  if (/I2301|V2339A|iQOO Neo9/i.test(c)) return 'iQOO Neo9 / Neo9 Pro / Neo9S Pro / Pro+';
  if (/iQOO Neo8/i.test(c)) return 'iQOO Neo8 / Neo8 Pro';
  if (/I2214|iQOO Neo7/i.test(c)) return 'iQOO Neo7 / Neo7 SE / Racing / Neo7 Pro 5G';
  if (/I2126|iQOO Neo6/i.test(c)) return 'iQOO Neo6 / Neo6 SE 5G';
  if (/iQOO Neo5/i.test(c)) return 'iQOO Neo5 / Neo5 Lite / Neo5 SE / Neo5S';
  if (/iQOO Neo3/i.test(c)) return 'iQOO Neo3 5G';
  if (/iQOO Neo 855/i.test(c)) return 'iQOO Neo 855 / Racing';
  if (/iQOO Neo\b/i.test(c)) return 'iQOO Neo';

  if (/iQOO Z11/i.test(c)) return 'iQOO Z11 Series';
  if (/iQOO Z10/i.test(c)) return 'iQOO Z10 5G / Z10x / Z10 Pro / Z10 Turbo / Turbo+';
  if (/I2209|I2302|iQOO Z9/i.test(c)) return 'iQOO Z9 5G / Z9x / Z9 Turbo / Turbo+ / Z9s Pro';
  if (/I2207|I2213|iQOO Z7/i.test(c)) return 'iQOO Z7 5G / Z7x / Z7s / Z7 Pro 5G';
  if (/I2127|I2128|iQOO Z6/i.test(c)) return 'iQOO Z6 5G / 44W / Z6 Pro / Z6 Lite / Z6x';
  if (/I2019|iQOO Z5/i.test(c)) return 'iQOO Z5 / Z5x';
  if (/I2011|iQOO Z3/i.test(c)) return 'iQOO Z3 5G';
  if (/iQOO Z1/i.test(c)) return 'iQOO Z1 5G / Z1x';

  if (/iQOO U5|iQOO U3|iQOO U1/i.test(c)) return `iQOO ${c.replace(/^iQOO /i, '')}`;
  if (/iQOO Pad/i.test(c)) return `iQOO ${c.replace(/^iQOO /i, '')}`;
  if (/iQOO Watch|iQOO TWS/i.test(c)) return `iQOO ${c.replace(/^iQOO /i, '')}`;

  if (c.startsWith('I23') || c.startsWith('I22') || c.startsWith('I21') || c.startsWith('I20') || c.startsWith('I19')) return `iQOO (${c})`;
  if (/iQOO/i.test(c)) return c;
  if (c.startsWith('V2') || c.startsWith('V1')) return `Vivo (${c})`;

  // ==========================================
  // INFINIX ZERO SERIES & GT GAMING SERIES
  // ==========================================
  if (/Zero 50|Zero Fold/i.test(c)) return `Infinix ${c}`;
  if (/X6878|Zero Flip/i.test(c)) return 'Infinix Zero Flip 5G';
  if (/X6860|X6861|Zero 40/i.test(c)) return 'Infinix Zero 40 4G/5G';
  if (/X6731|X6732|Zero 30/i.test(c)) return 'Infinix Zero 30 4G/5G';
  if (/X6821|Zero 20/i.test(c)) return 'Infinix Zero 20';
  if (/X6815|Zero 5G/i.test(c)) return 'Infinix Zero 5G (2023 Turbo)';
  if (/X6810|X6811|Zero X/i.test(c)) return 'Infinix Zero X / Pro / Neo';
  if (/X687|Zero 8/i.test(c)) return 'Infinix Zero 8 / 8i';
  if (/X620|Zero 6/i.test(c)) return 'Infinix Zero 6 / 6 Pro';
  if (/X603|Zero 5/i.test(c)) return 'Infinix Zero 5 / 5 Pro';
  if (/X555|Zero 4/i.test(c)) return 'Infinix Zero 4 / 4 Plus';
  if (/X552|Zero 3/i.test(c)) return 'Infinix Zero 3';
  if (/X509|Zero 2/i.test(c)) return 'Infinix Zero 2';
  if (/X506|Zero/i.test(c)) return 'Infinix Zero (Original)';

  if (/GT 40|GT 30|GT Ultra/i.test(c)) return `Infinix ${c}`;
  if (/X6871|X6872|GT 20 Pro/i.test(c)) return 'Infinix GT 20 Pro 5G';
  if (/X6739|GT 10 Pro/i.test(c)) return 'Infinix GT 10 Pro 5G';

  // ==========================================
  // INFINIX NOTE SERIES (Note 60 down to Note 2)
  // ==========================================
  if (/Note 60|Note 50/i.test(c)) return `Infinix ${c}`;
  if (/X6850|X6851|Note 40 Pro/i.test(c)) return 'Infinix Note 40 Pro 4G/5G / Pro+ 5G';
  if (/X6853|X6831|Note 40/i.test(c)) return 'Infinix Note 40 4G / 40 5G / 40S';
  if (/X6710|Note 30 VIP/i.test(c)) return 'Infinix Note 30 VIP / Racing';
  if (/X6716|X6711|Note 30 Pro/i.test(c)) return 'Infinix Note 30 Pro 5G';
  if (/Note 30/i.test(c)) return 'Infinix Note 30 / 30 5G / 30i';
  if (/X670|X663|Note 12/i.test(c)) return 'Infinix Note 12 / 12 Pro / 12 VIP / G96';
  if (/X698|Note 11/i.test(c)) return 'Infinix Note 11 / 11 Pro / 11s / 11i';
  if (/X695|Note 10/i.test(c)) return 'Infinix Note 10 / 10 Pro / NFC';
  if (/X692|Note 8/i.test(c)) return 'Infinix Note 8 / 8i';
  if (/X690|Note 7/i.test(c)) return 'Infinix Note 7 / 7 Lite';
  if (/Note 6|Note 5|Note 4|Note 3|Note 2/i.test(c)) return `Infinix ${c}`;

  // ==========================================
  // INFINIX HOT SERIES (Hot 60 down to Hot 1)
  // ==========================================
  if (/Hot 60/i.test(c)) return `Infinix ${c}`;
  if (/X6858|X6859|Hot 50 Pro/i.test(c)) return 'Infinix Hot 50 Pro / Pro+ 5G';
  if (/X6880|Hot 50/i.test(c)) return 'Infinix Hot 50 4G / 5G / 50i';
  if (/X6837|Hot 40 Pro/i.test(c)) return 'Infinix Hot 40 Pro';
  if (/X6836|Hot 40/i.test(c)) return 'Infinix Hot 40 / 40i / Play';
  if (/X669|X676|Hot 30/i.test(c)) return 'Infinix Hot 30 / 30i / 30 5G / Play';
  if (/X6825|X6827|Hot 20/i.test(c)) return 'Infinix Hot 20 / 20 5G / 20s / 20i';
  if (/X6817|X6812|Hot 12/i.test(c)) return 'Infinix Hot 12 / 12 Play / 12i / Pro';
  if (/Hot 11/i.test(c)) return 'Infinix Hot 11 / 11S / 11 Play';
  if (/Hot 10/i.test(c)) return 'Infinix Hot 10 / 10S / 10 Play / 10T';
  if (/Hot 9/i.test(c)) return 'Infinix Hot 9 / 9 Pro / 9 Play';
  if (/Hot 8/i.test(c)) return 'Infinix Hot 8 / 8 Lite';
  if (/Hot 7/i.test(c)) return 'Infinix Hot 7 / 7 Pro';
  if (/Hot 6/i.test(c)) return 'Infinix Hot 6 / 6 Pro / 6X';
  if (/Hot 5/i.test(c)) return 'Infinix Hot 5 / 5 Lite';
  if (/Hot 4/i.test(c)) return 'Infinix Hot 4 / 4 Pro';
  if (/Hot 3/i.test(c)) return 'Infinix Hot 3 / 3 Pro';
  if (/Hot 2/i.test(c)) return 'Infinix Hot 2 (Android One)';
  if (/Hot/i.test(c)) return 'Infinix Hot';

  // ==========================================
  // INFINIX SMART SERIES & VINTAGE
  // ==========================================
  if (/Smart 10/i.test(c)) return 'Infinix Smart 10 / 10 Pro';
  if (/X6531|X6532|Smart 9/i.test(c)) return 'Infinix Smart 9 / 9 HD / 9 Pro';
  if (/X6525|X6528|Smart 8/i.test(c)) return 'Infinix Smart 8 / 8 HD / 8 Pro / Plus';
  if (/X6515|X6517|Smart 7/i.test(c)) return 'Infinix Smart 7 / 7 HD / 7 Plus';
  if (/X6511|X6512|Smart 6/i.test(c)) return 'Infinix Smart 6 / 6 Plus / 6 HD';
  if (/Smart 5/i.test(c)) return 'Infinix Smart 5 / 5A / 5 Pro';
  if (/Smart 4/i.test(c)) return 'Infinix Smart 4 / 4c';
  if (/Smart 3/i.test(c)) return 'Infinix Smart 3 / 3 Plus';
  if (/Smart 2/i.test(c)) return 'Infinix Smart 2 / 2 Pro / HD';
  if (/Smart/i.test(c)) return 'Infinix Smart';

  if (/Alpha Marvel|Race Bolt|Race Max|Surf Bravo|Joypad/i.test(c)) return `Infinix ${c}`;
  if (c.startsWith('X6') || c.startsWith('X5')) return `Infinix (${c})`;
  if (/Infinix/i.test(c)) return c;
  if (c.startsWith('KJ8') || c.startsWith('CK8') || c.startsWith('LH8')) return `Tecno Spark / Camon (${c})`;

  // ==========================================
  // ITEL S, P, A, RS, VISION & FLIP SERIES
  // ==========================================
  if (/itel S27|itel S26|itel S25/i.test(c)) return `${c.startsWith('itel') ? c : `itel ${c}`}`;
  if (/S666LN|itel S24/i.test(c)) return 'itel S24';
  if (/S681LN|itel S23\+|itel S23 Plus/i.test(c)) return 'itel S23+';
  if (/S665L|itel S23/i.test(c)) return 'itel S23';
  if (/itel S18|itel S17|itel S16|itel S15|itel S13|itel S12|itel S11/i.test(c)) return `${c.startsWith('itel') ? c : `itel ${c}`}`;

  if (/itel P85|itel P75/i.test(c)) return `${c.startsWith('itel') ? c : `itel ${c}`}`;
  if (/P671N|itel P65/i.test(c)) return 'itel P65';
  if (/P661N|P662L|itel P55/i.test(c)) return 'itel P55 / P55+ / P55 5G / P55T';
  if (/P662N|itel P40/i.test(c)) return 'itel P40 / P40+';
  if (/itel P38|itel P37|itel P36|itel P33|itel P32|itel P17|itel P15|itel P13|itel P12|itel P11/i.test(c)) return `${c.startsWith('itel') ? c : `itel ${c}`}`;

  if (/itel A90/i.test(c)) return 'itel A90';
  if (/A671LC|itel A80/i.test(c)) return 'itel A80';
  if (/A665L|itel A70/i.test(c)) return 'itel A70';
  if (/W6004P|A662LM|itel A60/i.test(c)) return 'itel A60 / A60s';
  if (/itel A58|itel A56|itel A49|itel A48|itel A44|itel A37|itel A36|itel A35|itel A33|itel A32F|itel A27|itel A26|itel A25|itel A24|itel A23|itel A22|itel A17|itel A16|itel A15|itel A14|itel A13|itel A12|itel A11/i.test(c)) return `${c.startsWith('itel') ? c : `itel ${c}`}`;

  if (/itel RS6|itel RS5/i.test(c)) return `${c.startsWith('itel') ? c : `itel ${c}`}`;
  if (/S663L|itel RS4/i.test(c)) return 'itel RS4 (Gaming)';
  if (/P683L|Color Pro/i.test(c)) return 'itel Color Pro 5G';
  if (/itel Flip 1|itel Fold 1/i.test(c)) return `${c.startsWith('itel') ? c : `itel ${c}`}`;
  if (/Vision 5|Vision 3|Vision 2|Vision 1/i.test(c)) return `itel ${c}`;
  if (/it1556|it1516|it1508|it1506|it1505|it1503|it1500|it1400/i.test(c)) return `itel (${c})`;
  if (/itel/i.test(c)) return c;

  // ==========================================
  // ASUS ROG PHONE & ZENFONE SERIES
  // ==========================================
  if (/ROG Phone 11|ROG Phone 10/i.test(c)) return `Asus ${c}`;
  if (/ASUS_AI2501|ROG Phone 9/i.test(c)) return 'Asus ROG Phone 9 / Pro / FE';
  if (/ASUS_AI2401|ROG Phone 8/i.test(c)) return 'Asus ROG Phone 8 / 8 Pro / Pro Edition';
  if (/ASUS_AI2205|ROG Phone 7/i.test(c)) return 'Asus ROG Phone 7 / 7 Ultimate';
  if (/ASUS_AI2201|ASUS_AI2203|ROG Phone 6/i.test(c)) return 'Asus ROG Phone 6 / 6 Pro / 6D / Batman';
  if (/ASUS_I005D|ROG Phone 5/i.test(c)) return 'Asus ROG Phone 5 / 5 Pro / 5 Ultimate / 5s';
  if (/ASUS_I003D|ROG Phone 3/i.test(c)) return 'Asus ROG Phone 3 / 3 Strix';
  if (/ASUS_I001D|ROG Phone II|ROG Phone 2/i.test(c)) return 'Asus ROG Phone II';
  if (/ASUS_Z01QD|ROG Phone/i.test(c)) return 'Asus ROG Phone (1st Gen)';

  if (/ZenFone 13|ZenFone 12/i.test(c)) return `Asus ${c}`;
  if (/ASUS_AI2401_D|ZenFone 11/i.test(c)) return 'Asus ZenFone 11 Ultra';
  if (/ASUS_AI2302|ZenFone 10/i.test(c)) return 'Asus ZenFone 10';
  if (/ASUS_AI2202|ZenFone 9/i.test(c)) return 'Asus ZenFone 9';
  if (/ASUS_I006D|ASUS_I004D|ZenFone 8/i.test(c)) return 'Asus ZenFone 8 / 8 Flip';
  if (/ASUS_I002D|ZenFone 7/i.test(c)) return 'Asus ZenFone 7 / 7 Pro';
  if (/ASUS_I01WD|ZenFone 6/i.test(c)) return 'Asus ZenFone 6 (6z)';
  if (/ASUS_X00QD|ZenFone 5/i.test(c)) return 'Asus ZenFone 5 / 5z / 5Q';
  if (/ASUS_X00TD|ASUS_X01BDA|ZenFone Max Pro/i.test(c)) return 'Asus ZenFone Max Pro (M1 / M2)';
  if (/ZenFone Max/i.test(c)) return 'Asus ZenFone Max (M1 / M2 / Plus)';
  if (/ASUS_X008D|ZenFone 4/i.test(c)) return 'Asus ZenFone 4 / Pro / Selfie / Max';
  if (/ASUS_Z010D|ZenFone 3/i.test(c)) return 'Asus ZenFone 3 / Deluxe / Ultra / Zoom S';
  if (/ASUS_Z00AD|ZenFone 2/i.test(c)) return 'Asus ZenFone 2 / Laser / Deluxe / Selfie';
  if (/ZenFone Live/i.test(c)) return 'Asus ZenFone Live (L1 / L2)';
  if (/ZenFone C|ZenFone AR|ZenFone Go/i.test(c)) return `Asus ${c}`;
  if (/ZenFone/i.test(c)) return `Asus ${c}`;

  if (/Snapdragon Insiders|ASUS_I007D/i.test(c)) return 'Asus Smartphone for Snapdragon Insiders';
  if (/PadFone/i.test(c)) return `Asus ${c}`;
  if (/Fonepad/i.test(c)) return `Asus ${c}`;
  if (/nuvifone/i.test(c)) return `Asus ${c}`;
  if (/P505|P525|P535|P526|P527|P320|P552w|P565/i.test(c)) return `Asus ${c}`;
  if (/ASUS_/i.test(c)) return `Asus (${c})`;

  // ==========================================
  // HUAWEI PURA, MATE, NOVA, ENJOY, Y, & MATEPAD SERIES
  // ==========================================
  // MATE XT TRI-FOLD & MATE SERIES
  if (/Mate XT/i.test(c)) return 'Huawei Mate XT Ultimate Design (Tri-Fold)';
  if (/Mate 80|Mate 70|HBN-AL/i.test(c)) return 'Huawei Mate 70 / 80 Pro / RS Ultimate';
  if (/Mate X6|Mate X5|Mate X3|Mate X2|Mate Xs 2|Mate Xs|Mate X\b/i.test(c)) return `Huawei ${c}`;
  if (/ALN-AL|Mate 60/i.test(c)) return 'Huawei Mate 60 / 60 Pro / Pro+ / RS Ultimate';
  if (/DCO-AL|CET-AL|Mate 50/i.test(c)) return 'Huawei Mate 50 / 50 Pro / 50E / RS Porsche Design';
  if (/Mate 40/i.test(c)) return 'Huawei Mate 40 / 40 Pro / Pro+ / RS Porsche Design / 40E';
  if (/TAS-AN|LIO-AN|Mate 30/i.test(c)) return 'Huawei Mate 30 / 30 Pro / 5G / RS Porsche Design';
  if (/Mate 20/i.test(c)) return 'Huawei Mate 20 / 20 Pro / 20 X / Lite / RS';
  if (/ALP-L|BLA-L|Mate 10/i.test(c)) return 'Huawei Mate 10 / 10 Pro / Lite / Porsche Design';
  if (/Mate 9|Mate 8|Mate S|Nexus 6P/i.test(c)) return `Huawei ${c}`;

  // PURA & P-SERIES
  if (/Pura 80/i.test(c)) return 'Huawei Pura 80 / Pro / Ultra';
  if (/HBP-AL|Pura 70/i.test(c)) return 'Huawei Pura 70 / Pro / Pro+ / Ultra';
  if (/Pocket 3|Pocket 2|P50 Pocket/i.test(c)) return `Huawei ${c}`;
  if (/MNA-AL|P60/i.test(c)) return 'Huawei P60 / P60 Pro / P60 Art';
  if (/JAD-AL|ABR-AL|P50/i.test(c)) return 'Huawei P50 / P50 Pro / P50E';
  if (/ANA-AN|ELS-AN|P40/i.test(c)) return 'Huawei P40 / P40 Pro / Pro+ / Lite';
  if (/VOG-L|ELE-L|MAR-L|P30/i.test(c)) return 'Huawei P30 / P30 Pro / Lite / New Edition';
  if (/EML-L|CLT-L|P20/i.test(c)) return 'Huawei P20 / P20 Pro / Lite';
  if (/P10|P9|P8/i.test(c)) return `Huawei ${c}`;
  if (/Ascend/i.test(c)) return `Huawei ${c}`;

  // NOVA SERIES (Nova 14 down to Nova 1)
  if (/Nova 14|Nova Flip/i.test(c)) return `Huawei ${c}`;
  if (/Nova 13/i.test(c)) return 'Huawei Nova 13 / 13 Pro / 13 Ultra / 13i';
  if (/FIN-AL|Nova 12/i.test(c)) return 'Huawei Nova 12 / Lite / 12s / 12i / 12 Pro / 12 Ultra';
  if (/FOA-AL|Nova 11/i.test(c)) return 'Huawei Nova 11 / Pro / Ultra / 11i / 11 SE';
  if (/NCO-AL|GLA-AL|Nova 10/i.test(c)) return 'Huawei Nova 10 / Pro / SE / Youth';
  if (/NAM-AL|Nova 9/i.test(c)) return 'Huawei Nova 9 / Pro / SE';
  if (/ANG-AN|JLN-L|Nova 8/i.test(c)) return 'Huawei Nova 8 / Pro / SE / 8i';
  if (/JEF-AN|Nova 7/i.test(c)) return 'Huawei Nova 7 / Pro / SE / 7i';
  if (/WLZ-AN|Nova 6/i.test(c)) return 'Huawei Nova 6 / 6 5G / 6 SE';
  if (/SEA-AL|YAL-L|Nova 5/i.test(c)) return 'Huawei Nova 5 / Pro / 5i / 5T / 5z';
  if (/Nova 4|Nova 3|Nova 2|Nova Plus|Nova /i.test(c)) return `Huawei ${c}`;

  // Y-SERIES, ENJOY, & VINTAGE
  if (/Enjoy 80|Enjoy 70|Enjoy 60|Enjoy 50|Enjoy 20|Enjoy 10|Enjoy 9|Enjoy 8|Enjoy 7|Enjoy 6|Enjoy 5/i.test(c)) return `Huawei ${c}`;
  if (/Y9a|Y7a|Y8p|Y7p|Y6p|Y5p|Y9s|Y6s|Y9 Prime|Y9|Y7|Y6|Y5|Y3/i.test(c)) return `Huawei ${c}`;
  if (/Ideos|Sonic|Honor \(U8860\)|U8800|U8150|U8300|U8110|U8220|U5700|U526|U626|C300/i.test(c)) return `Huawei ${c}`;

  // TABLETS, LAPTOPS, WEARABLES & AUDIO
  if (/MatePad/i.test(c)) return `Huawei ${c}`;
  if (/MateBook/i.test(c)) return `Huawei ${c}`;
  if (/Huawei Watch|Watch GT|Watch Fit|Watch Ultimate|Watch Buds|Watch D/i.test(c)) return `Huawei ${c}`;
  if (/Huawei Band/i.test(c)) return `Huawei ${c}`;
  if (/FreeBuds|FreeClip/i.test(c)) return `Huawei ${c}`;
  if (/Vision Smart TV|Vision Glass/i.test(c)) return `Huawei ${c}`;

  if (/Huawei/i.test(c)) return c;

  // ==========================================
  // GOOGLE PIXEL, WATCH, BUDS & LAPTOPS
  // ==========================================
  if (/Pixel 11/i.test(c)) return 'Google Pixel 11 / 11 Pro / 11 Pro XL / 11 Pro Fold';
  if (/Pixel 10/i.test(c)) return 'Google Pixel 10 / 10 Pro / 10 Pro XL / 10 Pro Fold / 10a';
  if (/Pixel 9 Pro XL/i.test(c)) return 'Google Pixel 9 Pro XL';
  if (/Pixel 9 Pro Fold/i.test(c)) return 'Google Pixel 9 Pro Fold';
  if (/Pixel 9 Pro/i.test(c)) return 'Google Pixel 9 Pro';
  if (/Pixel 9a/i.test(c)) return 'Google Pixel 9a';
  if (/Pixel 9\b/i.test(c)) return 'Google Pixel 9';

  if (/Pixel 8 Pro/i.test(c)) return 'Google Pixel 8 Pro';
  if (/Pixel 8a/i.test(c)) return 'Google Pixel 8a';
  if (/Pixel 8\b/i.test(c)) return 'Google Pixel 8';

  if (/Pixel Fold/i.test(c)) return 'Google Pixel Fold';
  if (/Pixel Tablet/i.test(c)) return 'Google Pixel Tablet';
  if (/Pixel 7 Pro/i.test(c)) return 'Google Pixel 7 Pro';
  if (/Pixel 7a/i.test(c)) return 'Google Pixel 7a';
  if (/Pixel 7\b/i.test(c)) return 'Google Pixel 7';

  if (/Pixel 6 Pro/i.test(c)) return 'Google Pixel 6 Pro';
  if (/Pixel 6a/i.test(c)) return 'Google Pixel 6a';
  if (/Pixel 6\b/i.test(c)) return 'Google Pixel 6';

  if (/Pixel 5a/i.test(c)) return 'Google Pixel 5a (5G)';
  if (/Pixel 5\b/i.test(c)) return 'Google Pixel 5';

  if (/Pixel 4a/i.test(c)) return 'Google Pixel 4a / 4a (5G)';
  if (/Pixel 4 XL/i.test(c)) return 'Google Pixel 4 XL';
  if (/Pixel 4\b/i.test(c)) return 'Google Pixel 4';

  if (/Pixel 3a XL/i.test(c)) return 'Google Pixel 3a XL';
  if (/Pixel 3a/i.test(c)) return 'Google Pixel 3a';
  if (/Pixel 3 XL/i.test(c)) return 'Google Pixel 3 XL';
  if (/Pixel 3\b/i.test(c)) return 'Google Pixel 3';

  if (/Pixel 2 XL/i.test(c)) return 'Google Pixel 2 XL';
  if (/Pixel 2\b/i.test(c)) return 'Google Pixel 2';

  if (/Pixel XL/i.test(c)) return 'Google Pixel XL';
  if (/Pixel C/i.test(c)) return 'Google Pixel C';
  if (/Pixelbook/i.test(c)) return `Google ${c}`;
  if (/Chromebook Pixel/i.test(c)) return 'Google Chromebook Pixel';
  if (/Pixel Watch/i.test(c)) return `Google ${c}`;
  if (/Pixel Buds/i.test(c)) return `Google ${c}`;
  if (/^Pixel$/i.test(c)) return 'Google Pixel';

  // GOOGLE NEST & SMART HOME
  if (/Nest Hub|Nest Audio|Nest Mini|Nest Wifi|Nest Thermostat|Nest Cam|Nest Doorbell/i.test(c)) return `Google ${c}`;
  if (/Google Home/i.test(c)) return `Google ${c}`;

  // GOOGLE TV, STREAMING, & XR GLASSES
  if (/Google TV Streamer/i.test(c)) return 'Google TV Streamer';
  if (/Chromecast/i.test(c)) return `Google ${c}`;
  if (/Project Astra|Google Glass/i.test(c)) return `Google ${c}`;

  // GOOGLE NEXUS FAMILY
  if (/Nexus 6P/i.test(c)) return 'Google Nexus 6P (Huawei)';
  if (/Nexus 5X/i.test(c)) return 'Google Nexus 5X (LG)';
  if (/Nexus 6\b/i.test(c)) return 'Google Nexus 6 (Motorola)';
  if (/Nexus 5\b/i.test(c)) return 'Google Nexus 5 (LG)';
  if (/Nexus 4\b/i.test(c)) return 'Google Nexus 4 (LG)';
  if (/Galaxy Nexus/i.test(c)) return 'Samsung Galaxy Nexus (Google)';
  if (/Nexus S/i.test(c)) return 'Google Nexus S (Samsung)';
  if (/Nexus One/i.test(c)) return 'Google Nexus One (HTC)';
  if (/Nexus 10/i.test(c)) return 'Google Nexus 10 Tablet (Samsung)';
  if (/Nexus 9/i.test(c)) return 'Google Nexus 9 Tablet (HTC)';
  if (/Nexus 7/i.test(c)) return 'Google Nexus 7 Tablet (Asus)';
  if (/Nexus Q|Nexus Player/i.test(c)) return `Google ${c}`;
  if (/Nexus/i.test(c)) return `Google ${c}`;
  if (/Pixel/i.test(c)) return `Google ${c}`;

  // ==========================================
  // NOKIA ANDROID, LUMIA, N-SERIES, COMMUNICATOR & CLASSICS
  // ==========================================
  // MODERN NOKIA ANDROID (X, XR, G, C, PUREVIEW & TABLETS)
  if (/^TA-\d{4}/i.test(c)) return `Nokia (${c})`;
  if (/Nokia/i.test(c)) return c;
  if (/^(?:XR30|XR21|XR20|X40|X30|X20|X10)\b/i.test(c)) return `Nokia ${c}`;
  if (/PureView/i.test(c)) return `Nokia ${c}`;
  if (/^(?:G62|G52|G60|G50|G42|G400|G310|G300|G22|G21|G20|G11|G10)\b/i.test(c)) return `Nokia ${c}`;
  if (/^(?:C300|C210|C110|C200|C100|C32|C31|C30|C22|C21|C20|C12|C10|C02|C01)\b/i.test(c)) return `Nokia ${c}`;
  if (/Nokia 8\.3|Nokia 8\.1|Nokia 8 Sirocco|Nokia 8\b/i.test(c)) return `Nokia ${c}`;
  if (/Nokia 7\.2|Nokia 7\.1|Nokia 7 Plus|Nokia 7\b/i.test(c)) return `Nokia ${c}`;
  if (/Nokia 6\.2|Nokia 6\.1|Nokia 6\b/i.test(c)) return `Nokia ${c}`;
  if (/Nokia 5\.4|Nokia 5\.3|Nokia 5\.1|Nokia 5\b/i.test(c)) return `Nokia ${c}`;
  if (/Nokia 4\.2|Nokia 3\.4|Nokia 3\.2|Nokia 3\.1|Nokia 3\b/i.test(c)) return `Nokia ${c}`;
  if (/Nokia 2\.4|Nokia 2\.3|Nokia 2\.2|Nokia 2\.1|Nokia 2\b/i.test(c)) return `Nokia ${c}`;
  if (/Nokia 1\.4|Nokia 1\.3|Nokia 1 Plus|Nokia 1\b/i.test(c)) return `Nokia ${c}`;
  if (/Nokia T21|Nokia T20|Nokia T10|Nokia N1/i.test(c)) return `Nokia ${c}`;

  // WINDOWS PHONE / LUMIA SERIES
  if (/Lumia/i.test(c)) return `Nokia ${c}`;

  // NOKIA X ANDROID FORK
  if (/Nokia X2|Nokia XL|Nokia X\+|Nokia X\b/i.test(c)) return `Nokia ${c}`;

  // SYMBIAN, N-SERIES & E-SERIES (STRICTLY ANCHORED)
  if (/^(?:N900|N9\b|N97|N96|N95|N93|N92|N91|N90|N86|N85|N82|N81|N80|N79|N78|N77|N76|N75|N73|N72|N71|N70|N8-00)/i.test(c)) return `Nokia ${c}`;
  if (/^(?:E90|E75|E72|E71|E70|E66|E65|E63|E62|E61|E60|E55|E52|E51|E50|E7-00|E6-00|E5-00)/i.test(c)) return `Nokia ${c}`;

  // COMMUNICATOR, N-GAGE & LUXURY
  if (/Communicator|N-Gage|Prism|Supernova/i.test(c)) return `Nokia ${c}`;
  if (/^(?:9500|9300|9210|9110|9000|8800|8600 Luna|8910|8855|8850|8890|8810)$/i.test(c)) return `Nokia ${c}`;

  // XPRESSMUSIC, ASHA & CLASSIC PHONES (STRICTLY ANCHORED)
  if (/XpressMusic|XpressAudio|Asha/i.test(c)) return `Nokia ${c}`;
  if (/^(?:3310|3210|8110|6310|6300|8210|8000|2720 Flip|800 Tough|2660 Flip)$/i.test(c)) return `Nokia ${c}`;
  if (/^(?:105|106|107|108|110|125|130|150|215|216|220|222|225|230|235)$/i.test(c)) return `Nokia ${c}`;
  if (/^(?:1100|1110|1200|1600|2100|2300|3100|3200|3220|5110|6110|6600|6630|6680|7110|2110|1011)$/i.test(c)) return `Nokia ${c}`;
  if (/Nokia/i.test(c)) return c;

  return code.length > 2 ? `${code}` : null;
}

function matchAndroidGeneric(ua: string, gpu: string): string | null {
  if (/Pixel|Nexus/i.test(ua)) return 'Google Pixel / Nexus Device';
  if (/Samsung/i.test(ua)) {
    return gpu ? `Samsung Device (${gpu})` : 'Samsung Galaxy';
  }
  if (/Xiaomi|Redmi|POCO/i.test(ua)) {
    return gpu ? `Xiaomi Device (${gpu})` : 'Xiaomi Redmi / Poco';
  }
  if (/Oppo/i.test(ua)) return 'Oppo Device';
  if (/Vivo/i.test(ua)) return 'Vivo Device';
  if (/Realme/i.test(ua)) return 'Realme Device';
  if (/Infinix/i.test(ua)) return 'Infinix Device';
  if (/OnePlus/i.test(ua)) return 'OnePlus Device';
  if (/Huawei|Honor/i.test(ua)) return 'Huawei / Honor Device';
  if (/Nokia/i.test(ua)) return 'Nokia Device';

  if (gpu && !/SwiftShader|ANGLE|Google/i.test(gpu)) {
    return `Android (${gpu})`;
  }
  return null;
}
