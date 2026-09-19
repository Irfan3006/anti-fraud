import { computeDeviceHash } from './security';
import { resolveExactDeviceModel } from './device-resolver';
import type { DeviceInfo } from './types';

/**
 * Validate and sanitize device metadata received from the client
 */
export function sanitizeDeviceInfo(raw: any, fallbackUserAgent: string = ''): DeviceInfo {
  const userAgent = typeof raw?.userAgent === 'string' && raw.userAgent.length > 0 
    ? raw.userAgent.substring(0, 500) 
    : (fallbackUserAgent || 'Unknown').substring(0, 500);

  const platform = typeof raw?.platform === 'string' ? raw.platform.substring(0, 100) : 'Unknown';
  const language = typeof raw?.language === 'string' ? raw.language.substring(0, 50) : 'en';
  const timezone = typeof raw?.timezone === 'string' ? raw.timezone.substring(0, 100) : 'UTC';

  const screenWidth = typeof raw?.screenWidth === 'number' && raw.screenWidth > 0 && raw.screenWidth < 20000 
    ? Math.round(raw.screenWidth) 
    : 0;

  const screenHeight = typeof raw?.screenHeight === 'number' && raw.screenHeight > 0 && raw.screenHeight < 20000 
    ? Math.round(raw.screenHeight) 
    : 0;

  const devicePixelRatio = typeof raw?.devicePixelRatio === 'number' && raw.devicePixelRatio > 0 && raw.devicePixelRatio < 20 
    ? parseFloat(raw.devicePixelRatio.toFixed(2)) 
    : 1;

  const hardwareConcurrency = typeof raw?.hardwareConcurrency === 'number' && raw.hardwareConcurrency > 0 && raw.hardwareConcurrency <= 256 
    ? Math.round(raw.hardwareConcurrency) 
    : undefined;

  const deviceMemory = typeof raw?.deviceMemory === 'number' && raw.deviceMemory > 0 && raw.deviceMemory <= 512 
    ? Math.round(raw.deviceMemory) 
    : undefined;

  const touchSupport = Boolean(raw?.touchSupport);

  // Mobile detection based on hints and UA
  const isMobileUa = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const mobile = typeof raw?.mobile === 'boolean' ? raw.mobile : isMobileUa;

  const languages = Array.isArray(raw?.languages) 
    ? raw.languages.filter((l: any) => typeof l === 'string').map((l: string) => l.substring(0, 10)).slice(0, 5) 
    : [language];

  const maxTouchPoints = typeof raw?.maxTouchPoints === 'number' && raw.maxTouchPoints >= 0 && raw.maxTouchPoints <= 50
    ? Math.round(raw.maxTouchPoints)
    : (touchSupport ? 5 : 0);

  // Enhanced Forensics: Battery
  const batteryLevel = typeof raw?.batteryLevel === 'number' && raw.batteryLevel >= 0 && raw.batteryLevel <= 100
    ? Math.round(raw.batteryLevel)
    : undefined;
  const isCharging = typeof raw?.isCharging === 'boolean' ? raw.isCharging : undefined;
  const batteryChargingTime = typeof raw?.batteryChargingTime === 'number' ? Math.round(raw.batteryChargingTime) : undefined;
  const batteryDischargingTime = typeof raw?.batteryDischargingTime === 'number' ? Math.round(raw.batteryDischargingTime) : undefined;

  // Enhanced Forensics: Network
  const networkType = typeof raw?.networkType === 'string' ? raw.networkType.substring(0, 30) : undefined;
  const effectiveType = typeof raw?.effectiveType === 'string' ? raw.effectiveType.substring(0, 10) : undefined;
  const downlinkSpeed = typeof raw?.downlinkSpeed === 'number' && raw.downlinkSpeed >= 0 ? parseFloat(raw.downlinkSpeed.toFixed(2)) : undefined;
  const rtt = typeof raw?.rtt === 'number' && raw.rtt >= 0 ? Math.round(raw.rtt) : undefined;
  const saveData = typeof raw?.saveData === 'boolean' ? raw.saveData : undefined;

  // Enhanced Forensics: Display & Color
  const screenOrientation = typeof raw?.screenOrientation === 'string' ? raw.screenOrientation.substring(0, 50) : undefined;
  const colorDepth = typeof raw?.colorDepth === 'number' && raw.colorDepth > 0 && raw.colorDepth <= 64 ? Math.round(raw.colorDepth) : undefined;
  const colorGamut = typeof raw?.colorGamut === 'string' ? raw.colorGamut.substring(0, 20) : undefined;
  const isDarkMode = typeof raw?.isDarkMode === 'boolean' ? raw.isDarkMode : undefined;
  const hdrSupport = typeof raw?.hdrSupport === 'boolean' ? raw.hdrSupport : undefined;

  // Enhanced Forensics: Storage & Audio
  const storageEstimate = (raw?.storageEstimate && typeof raw.storageEstimate === 'object') ? {
    quota: typeof raw.storageEstimate.quota === 'number' ? Math.round(raw.storageEstimate.quota) : 0,
    usage: typeof raw.storageEstimate.usage === 'number' ? Math.round(raw.storageEstimate.usage) : 0,
    available: typeof raw.storageEstimate.available === 'number' ? Math.round(raw.storageEstimate.available) : 0
  } : undefined;

  const audioContextSampleRate = typeof raw?.audioContextSampleRate === 'number' && raw.audioContextSampleRate > 0
    ? Math.round(raw.audioContextSampleRate)
    : undefined;
  const canvasFingerprintHash = typeof raw?.canvasFingerprintHash === 'string' ? raw.canvasFingerprintHash.substring(0, 64) : undefined;

  // Resolve High-Precision Device Model (e.g. Samsung Galaxy A56, iPhone 16 Pro, Poco M4)
  const deviceModel = resolveExactDeviceModel({
    userAgent,
    platform,
    model: typeof raw?.model === 'string' ? raw.model : '',
    brand: typeof raw?.brand === 'string' ? raw.brand : '',
    gpuRenderer: typeof raw?.gpuRenderer === 'string' ? raw.gpuRenderer : '',
    gpuVendor: typeof raw?.gpuVendor === 'string' ? raw.gpuVendor : '',
    screenWidth,
    screenHeight,
    devicePixelRatio,
    maxTouchPoints,
    mobile
  });

  const deviceHash = computeDeviceHash({
    userAgent,
    platform,
    deviceModel,
    screenWidth,
    screenHeight,
    devicePixelRatio,
    timezone,
    language,
    hardwareConcurrency,
    canvasFingerprintHash
  });

  return {
    userAgent,
    platform,
    deviceModel,
    gpuRenderer: typeof raw?.gpuRenderer === 'string' ? raw.gpuRenderer : undefined,
    gpuVendor: typeof raw?.gpuVendor === 'string' ? raw.gpuVendor : undefined,
    language,
    languages,
    timezone,
    screenWidth,
    screenHeight,
    devicePixelRatio,
    hardwareConcurrency,
    deviceMemory,
    touchSupport,
    maxTouchPoints,
    mobile,
    deviceHash,
    batteryLevel,
    isCharging,
    batteryChargingTime,
    batteryDischargingTime,
    networkType,
    effectiveType,
    downlinkSpeed,
    rtt,
    saveData,
    screenOrientation,
    colorDepth,
    colorGamut,
    isDarkMode,
    hdrSupport,
    storageEstimate,
    audioContextSampleRate,
    canvasFingerprintHash
  };
}
