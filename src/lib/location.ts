import type { LocationData } from './types';

/**
 * Accuracy threshold in meters. Accepts GPS, cellular, Wi-Fi, and network coordinates.
 */
export const MAX_ALLOWED_ACCURACY_METERS = 50000;

/**
 * Validate and sanitize incoming location data from client
 */
export function validateLocationData(data: any): {
  valid: boolean;
  sanitized?: LocationData;
  error?: string;
  isLowAccuracy?: boolean;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Missing location payload.' };
  }

  const lat = Number(data.latitude);
  const lng = Number(data.longitude);
  const acc = Number(data.accuracy);
  const timestamp = Number(data.timestamp) || Date.now();

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return { valid: false, error: 'Invalid latitude value.' };
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    return { valid: false, error: 'Invalid longitude value.' };
  }

  if (isNaN(acc) || acc <= 0) {
    return { valid: false, error: 'Invalid GPS accuracy reading.' };
  }

  // Check accuracy threshold
  if (acc > MAX_ALLOWED_ACCURACY_METERS) {
    return {
      valid: false,
      isLowAccuracy: true,
      error: `Location accuracy is currently too low (±${Math.round(acc)}m). Please enable precise location in device settings.`
    };
  }

  const sanitized: LocationData = {
    latitude: parseFloat(lat.toFixed(6)),
    longitude: parseFloat(lng.toFixed(6)),
    accuracy: parseFloat(acc.toFixed(1)),
    altitude: data.altitude != null && !isNaN(Number(data.altitude)) ? parseFloat(Number(data.altitude).toFixed(1)) : null,
    altitudeAccuracy: data.altitudeAccuracy != null && !isNaN(Number(data.altitudeAccuracy)) ? parseFloat(Number(data.altitudeAccuracy).toFixed(1)) : null,
    heading: data.heading != null && !isNaN(Number(data.heading)) ? parseFloat(Number(data.heading).toFixed(1)) : null,
    speed: data.speed != null && !isNaN(Number(data.speed)) ? parseFloat(Number(data.speed).toFixed(2)) : null,
    timestamp: timestamp
  };

  return { valid: true, sanitized };
}

/**
 * Format location accuracy for user display (e.g., "±8 meters")
 */
export function formatAccuracy(accuracyMeters: number | undefined): string {
  if (accuracyMeters == null || isNaN(accuracyMeters)) return 'Unknown';
  return `±${Math.round(accuracyMeters)} meters`;
}
