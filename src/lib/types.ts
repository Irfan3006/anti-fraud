/**
 * Type definitions for Anti-Fraud Nota Verification System
 */

export type VerificationStatus =
  | 'INITIATED'
  | 'DEVICE_RECORDED'
  | 'LOCATION_GRANTED'
  | 'CAMERA_GRANTED'
  | 'FRONT_CAPTURED'
  | 'BACK_CAPTURED'
  | 'VERIFIED'
  | 'FAILED'
  | 'EXPIRED';

export type FailureReason =
  | 'LOCATION_DENIED'
  | 'LOCATION_TIMEOUT'
  | 'LOW_LOCATION_ACCURACY'
  | 'CAMERA_DENIED'
  | 'FRONT_CAMERA_FAILED'
  | 'BACK_CAMERA_FAILED'
  | 'UPLOAD_FAILED'
  | 'SESSION_EXPIRED'
  | 'INVALID_SESSION'
  | 'RATE_LIMITED'
  | 'TAMPERING_DETECTED'
  | 'USER_CANCELLED';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  deviceModel?: string;
  gpuRenderer?: string;
  gpuVendor?: string;
  language: string;
  languages?: string[];
  timezone: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  touchSupport?: boolean;
  maxTouchPoints?: number;
  mobile: boolean;
  deviceHash: string;
  // Enhanced Forensic Telemetry
  batteryLevel?: number; // 0 - 100 percentage
  isCharging?: boolean; // true = charging, false = battery
  batteryChargingTime?: number;
  batteryDischargingTime?: number;
  networkType?: string; // wifi, cellular, ethernet, etc.
  effectiveType?: string; // 4g, 5g, 3g, 2g
  downlinkSpeed?: number; // Mbps
  rtt?: number; // Round Trip Time (ms)
  saveData?: boolean;
  screenOrientation?: string; // portrait-primary, landscape-primary
  colorDepth?: number; // 24, 30, 32
  colorGamut?: string; // srgb, p3, rec2020
  isDarkMode?: boolean;
  hdrSupport?: boolean;
  storageEstimate?: { quota: number; usage: number; available: number };
  audioContextSampleRate?: number;
  canvasFingerprintHash?: string;
}

export interface CameraEvidence {
  dataUri: string; // compressed base64 JPEG/WebP
  facingMode: 'user' | 'environment';
  captureTimestamp: number;
  trackReadyState: string;
  resolution?: { width: number; height: number };
}

export interface IpIntelligence {
  ip: string;
  isp?: string;
  as?: string;
  city?: string;
  regionName?: string;
  country?: string;
  countryCode?: string;
  lat?: number;
  lon?: number;
  isVpn?: boolean;
  vpnType?: string;
  locationSummary?: string;
}

export interface VerificationSession {
  id: string;
  notaId: string;
  status: VerificationStatus;
  step: number; // 1: Privacy/Gate, 2: Device, 3: Location, 4: Front Cam, 5: Back Cam, 6: Complete
  antiSpoofNonce: string;
  createdAt: number;
  expiresAt: number;
  ipAddress: string;
  device?: DeviceInfo;
  location?: LocationData;
  frontCamera?: CameraEvidence;
  backCamera?: CameraEvidence;
  failureReason?: FailureReason | string;
  verifiedAt?: number;
  durationMs?: number;
  ipIntelligence?: IpIntelligence;
}

export type NotaType = 'nota' | 'link';

export interface Nota {
  id: string;
  notaNumber: string;
  title: string;
  description: string;
  imageData: string; // base64 encoded protected nota image or placeholder
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml' | string;
  fileSize: number;
  createdAt: string; // ISO string
  createdBy: string;
  type?: NotaType; // 'nota' (receipt/invoice) or 'link' (bait URL)
  targetUrl?: string; // external URL to redirect to after capture
  ogImage?: string; // Open Graph image preview URL
  siteName?: string; // e.g. Instagram, TikTok, YouTube
}

export interface AuditLog {
  verificationId: string;
  notaId: string;
  timestamp: string;
  status: VerificationStatus;
  latitude?: number | string;
  longitude?: number | string;
  locationAccuracy?: string;
  altitude?: number | string;
  altitudeAccuracy?: number | string;
  heading?: number | string;
  speed?: number | string;
  timezone?: string;
  ipAddress?: string;
  userAgent?: string;
  platform?: string;
  deviceModel?: string;
  language?: string;
  screenResolution?: string;
  devicePixelRatio?: number | string;
  hardwareConcurrency?: number | string;
  deviceMemory?: number | string;
  mobile?: boolean | string;
  frontCameraFile?: string;
  backCameraFile?: string;
  deviceHash?: string;
  verificationDuration?: string;
  failureReason?: string;
  // Enhanced Forensic Telemetry Fields
  batteryInfo?: string;
  networkInfo?: string;
  displayInfo?: string;
  storageInfo?: string;
  // IP Intelligence & VPN Detection Fields
  isp?: string;
  cityLocation?: string;
  isVpn?: boolean;
  vpnTag?: string;
}

export interface VerifiedTokenPayload {
  notaId: string;
  verificationId: string;
  verifiedAt: number;
  expiresAt: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
