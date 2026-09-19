import type { Nota, VerificationSession, AuditLog } from './types';

// Sample pre-generated high-fidelity invoice SVG as Base64 Data URI
const SAMPLE_INVOICE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100" style="background:#ffffff; font-family: 'Segoe UI', Arial, sans-serif;">
  <!-- Header Bar -->
  <rect x="0" y="0" width="800" height="24" fill="#0b132b" />
  <rect x="0" y="24" width="800" height="6" fill="#1d4ed8" />

  <!-- Company Header -->
  <g transform="translate(60, 70)">
    <rect x="0" y="0" width="50" height="50" rx="10" fill="#0b132b" />
    <path d="M25 10 L37 38 L13 38 Z" fill="#ffffff" />
    <circle cx="25" cy="30" r="4" fill="#1d4ed8" />
    <text x="65" y="32" font-size="22" font-weight="bold" fill="#0b132b">CYBER FRAUD GUARD CORP.</text>
    <text x="65" y="48" font-size="12" fill="#64748b">Verified Financial Document &amp; Anti-Tamper Registry</text>
  </g>

  <!-- Document Meta Badge -->
  <g transform="translate(560, 65)">
    <rect x="0" y="0" width="180" height="56" rx="6" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
    <text x="15" y="22" font-size="11" font-weight="bold" fill="#64748b">OFFICIAL INVOICE</text>
    <text x="15" y="44" font-size="16" font-weight="bold" fill="#1d4ed8">#INV-2026-00123</text>
  </g>

  <!-- Divider -->
  <line x1="60" y1="140" x2="740" y2="140" stroke="#e2e8f0" stroke-width="2" />

  <!-- Bill To & Metadata Details -->
  <g transform="translate(60, 165)">
    <text x="0" y="0" font-size="12" font-weight="bold" fill="#64748b">BILLED TO:</text>
    <text x="0" y="20" font-size="15" font-weight="bold" fill="#0f172a">PT SENTOSA TEKNOLOGI NUSANTARA</text>
    <text x="0" y="38" font-size="12" fill="#475569">Jl. Jenderal Sudirman Kav. 52-53, SCBD</text>
    <text x="0" y="54" font-size="12" fill="#475569">Jakarta Selatan, DKI Jakarta 12190</text>
    <text x="0" y="70" font-size="12" fill="#475569">NPWP: 01.839.294.1-012.000</text>
  </g>

  <g transform="translate(480, 165)">
    <text x="0" y="0" font-size="12" font-weight="bold" fill="#64748b">PAYMENT DETAILS:</text>
    <text x="0" y="20" font-size="13" fill="#0f172a"><tspan font-weight="bold">Date:</tspan> 25 August 2026</text>
    <text x="0" y="38" font-size="13" fill="#0f172a"><tspan font-weight="bold">Due Date:</tspan> 10 September 2026</text>
    <text x="0" y="54" font-size="13" fill="#0f172a"><tspan font-weight="bold">Status:</tspan> <tspan fill="#16a34a" font-weight="bold">PAID (CONFIRMED)</tspan></text>
    <text x="0" y="70" font-size="13" fill="#0f172a"><tspan font-weight="bold">Verification ID:</tspan> VRF-8F92A7C1</text>
  </g>

  <!-- Items Table Header -->
  <g transform="translate(60, 270)">
    <rect x="0" y="0" width="680" height="38" rx="4" fill="#0b132b" />
    <text x="20" y="24" font-size="12" font-weight="bold" fill="#ffffff">DESCRIPTION / ITEM</text>
    <text x="360" y="24" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">QTY</text>
    <text x="490" y="24" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="end">UNIT PRICE</text>
    <text x="660" y="24" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="end">AMOUNT</text>
  </g>

  <!-- Items Rows -->
  <g transform="translate(60, 310)">
    <!-- Row 1 -->
    <rect x="0" y="0" width="680" height="50" fill="#f8fafc" />
    <text x="20" y="26" font-size="13" font-weight="bold" fill="#0f172a">Enterprise Anti-Fraud Server Gateway V3</text>
    <text x="20" y="42" font-size="11" fill="#64748b">12-Month Dedicated Security Gateway Appliance</text>
    <text x="360" y="30" font-size="13" fill="#0f172a" text-anchor="middle">2 Units</text>
    <text x="490" y="30" font-size="13" fill="#0f172a" text-anchor="end">Rp 45.000.000</text>
    <text x="660" y="30" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="end">Rp 90.000.000</text>
    <line x1="0" y1="50" x2="680" y2="50" stroke="#e2e8f0" />

    <!-- Row 2 -->
    <rect x="0" y="50" width="680" height="50" fill="#ffffff" />
    <text x="20" y="76" font-size="13" font-weight="bold" fill="#0f172a">Hardware Security Module (HSM) Cryptographic Key</text>
    <text x="20" y="92" font-size="11" fill="#64748b">FIPS 140-2 Level 3 Cryptographic Token Key Pair</text>
    <text x="360" y="80" font-size="13" fill="#0f172a" text-anchor="middle">1 Set</text>
    <text x="490" y="80" font-size="13" fill="#0f172a" text-anchor="end">Rp 18.500.000</text>
    <text x="660" y="80" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="end">Rp 18.500.000</text>
    <line x1="0" y1="100" x2="680" y2="100" stroke="#e2e8f0" />

    <!-- Row 3 -->
    <rect x="0" y="100" width="680" height="50" fill="#f8fafc" />
    <text x="20" y="126" font-size="13" font-weight="bold" fill="#0f172a">Deployment &amp; Compliance Audit SLA</text>
    <text x="20" y="142" font-size="11" fill="#64748b">On-site deployment, 24/7 incident response SLA</text>
    <text x="360" y="130" font-size="13" fill="#0f172a" text-anchor="middle">1 Paket</text>
    <text x="490" y="130" font-size="13" fill="#0f172a" text-anchor="end">Rp 12.000.000</text>
    <text x="660" y="130" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="end">Rp 12.000.000</text>
    <line x1="0" y1="150" x2="680" y2="150" stroke="#e2e8f0" />
  </g>

  <!-- Totals Section -->
  <g transform="translate(420, 480)">
    <text x="140" y="25" font-size="13" fill="#64748b" text-anchor="end">Subtotal:</text>
    <text x="320" y="25" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="end">Rp 120.500.000</text>

    <text x="140" y="50" font-size="13" fill="#64748b" text-anchor="end">PPN (11%):</text>
    <text x="320" y="50" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="end">Rp 13.255.000</text>

    <rect x="20" y="65" width="300" height="42" rx="4" fill="#0b132b" />
    <text x="40" y="92" font-size="14" font-weight="bold" fill="#ffffff">TOTAL AMOUNT:</text>
    <text x="305" y="92" font-size="16" font-weight="bold" fill="#60a5fa" text-anchor="end">Rp 133.755.000</text>
  </g>

  <!-- Official Security Stamp & QR Sign -->
  <g transform="translate(80, 650)">
    <rect x="0" y="0" width="260" height="120" rx="8" fill="#f8fafc" stroke="#16a34a" stroke-width="2" stroke-dasharray="4 2" />
    <circle cx="45" cy="60" r="28" fill="#16a34a" opacity="0.12" />
    <path d="M35 60 L42 67 L56 53" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round" />
    <text x="85" y="45" font-size="14" font-weight="bold" fill="#16a34a">VERIFIED AUTHENTIC</text>
    <text x="85" y="65" font-size="11" fill="#334155">PT Cyber Fraud Guard</text>
    <text x="85" y="80" font-size="10" fill="#64748b">Cryptographically Sealed</text>
    <text x="85" y="95" font-size="9" fill="#94a3b8">Doc Hash: 8f92a7c1b520d6</text>
  </g>

  <g transform="translate(480, 650)">
    <text x="120" y="20" font-size="12" fill="#64748b" text-anchor="middle">Authorized Signature,</text>
    <!-- Signature Line -->
    <path d="M40 70 Q 70 30 110 60 T 170 50 T 210 70" fill="none" stroke="#0b132b" stroke-width="2" />
    <line x1="20" y1="85" x2="220" y2="85" stroke="#cbd5e1" stroke-width="1" />
    <text x="120" y="105" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="middle">Dr. Hendra Wijaya, M.Kom</text>
    <text x="120" y="120" font-size="10" fill="#64748b" text-anchor="middle">Chief Information Security Officer</text>
  </g>

  <!-- Security Footer & Notice -->
  <g transform="translate(60, 830)">
    <rect x="0" y="0" width="680" height="85" rx="6" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1" />
    <text x="20" y="25" font-size="12" font-weight="bold" fill="#0b132b">SECURITY &amp; COMPLIANCE NOTICE</text>
    <text x="20" y="45" font-size="11" fill="#475569">This invoice is registered in the Anti-Fraud Tamper Detection Network. Any alteration or unauthorized reproduction</text>
    <text x="20" y="62" font-size="11" fill="#475569">is automatically logged with high-accuracy biometric and geolocation audit trails pursuant to cyber regulations.</text>
  </g>

  <!-- Bottom Accent -->
  <rect x="0" y="1076" width="800" height="24" fill="#0b132b" />
</svg>
`)}`;

// In-Memory global storage state for Serverless runtime
const globalStore = globalThis as unknown as {
  __AF_NOTAS__?: Map<string, Nota>;
  __AF_SESSIONS__?: Map<string, VerificationSession>;
  __AF_AUDIT_LOGS__?: AuditLog[];
};

if (!globalStore.__AF_NOTAS__) {
  globalStore.__AF_NOTAS__ = new Map<string, Nota>();
  
  // Seed sample Nota
  const sampleNota: Nota = {
    id: '8f92a7c1',
    notaNumber: 'INV-2026-00123',
    title: 'Official Enterprise Security & Hardware Invoice',
    description: 'Hardware Security Module (HSM) Cryptographic Key & Gateway Deployment invoice verified by Anti-Fraud Network.',
    imageData: SAMPLE_INVOICE_SVG,
    mimeType: 'image/svg+xml' as any,
    fileSize: SAMPLE_INVOICE_SVG.length,
    createdAt: new Date().toISOString(),
    createdBy: 'System Admin'
  };
  globalStore.__AF_NOTAS__.set(sampleNota.id, sampleNota);
}

if (!globalStore.__AF_SESSIONS__) {
  globalStore.__AF_SESSIONS__ = new Map<string, VerificationSession>();
}

if (!globalStore.__AF_AUDIT_LOGS__) {
  globalStore.__AF_AUDIT_LOGS__ = [
    {
      verificationId: 'VRF-INIT-DEMO',
      notaId: '8f92a7c1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: 'VERIFIED',
      latitude: -6.2088,
      longitude: 106.8456,
      locationAccuracy: '±8m',
      altitude: 12.5,
      altitudeAccuracy: 3.0,
      heading: 0,
      speed: 0,
      timezone: 'Asia/Jakarta',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      platform: 'Win32',
      language: 'id-ID',
      screenResolution: '1920x1080',
      devicePixelRatio: 1,
      hardwareConcurrency: 8,
      deviceMemory: 8,
      mobile: false,
      frontCameraFile: 'https://drive.google.com/sample_front',
      backCameraFile: 'https://drive.google.com/sample_back',
      deviceHash: 'a89f72c019b8',
      verificationDuration: '14.2s',
      failureReason: '-'
    }
  ];
}

const notasStore = globalStore.__AF_NOTAS__;
const sessionsStore = globalStore.__AF_SESSIONS__;
const auditLogsStore = globalStore.__AF_AUDIT_LOGS__;

/**
 * Nota operations
 */
export function getNota(id: string): Nota | null {
  return notasStore.get(id) || null;
}

export function saveNota(nota: Nota): void {
  notasStore.set(nota.id, nota);
}

export function listNotas(): Nota[] {
  return Array.from(notasStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function deleteNota(id: string): boolean {
  return notasStore.delete(id);
}

/**
 * Verification Session operations
 */
export function getSession(id: string): VerificationSession | null {
  const session = sessionsStore.get(id);
  if (!session) return null;
  // Auto-expire check
  if (Date.now() > session.expiresAt) {
    session.status = 'EXPIRED';
    session.failureReason = 'SESSION_EXPIRED';
    return session;
  }
  return session;
}

export function saveSession(session: VerificationSession): void {
  sessionsStore.set(session.id, session);
}

export function deleteSession(id: string): boolean {
  return sessionsStore.delete(id);
}

/**
 * Audit Log operations
 */
export function appendAuditLog(log: AuditLog): void {
  auditLogsStore.unshift(log);
  // Cap at 1000 items in memory
  if (auditLogsStore.length > 1000) {
    auditLogsStore.pop();
  }
}

export function getAuditLogs(): AuditLog[] {
  return [...auditLogsStore];
}

export function getLogsForNota(notaId: string): AuditLog[] {
  return auditLogsStore.filter((l) => l.notaId === notaId);
}

export function deleteAuditLog(verificationId: string): boolean {
  const index = auditLogsStore.findIndex((l) => l.verificationId === verificationId);
  if (index !== -1) {
    auditLogsStore.splice(index, 1);
    return true;
  }
  return false;
}

export function deleteAllAuditLogs(notaId?: string): number {
  if (notaId) {
    const initialLength = auditLogsStore.length;
    for (let i = auditLogsStore.length - 1; i >= 0; i--) {
      if (auditLogsStore[i].notaId === notaId) {
        auditLogsStore.splice(i, 1);
      }
    }
    return initialLength - auditLogsStore.length;
  } else {
    const count = auditLogsStore.length;
    auditLogsStore.length = 0;
    return count;
  }
}

/**
 * Calculate Dashboard Metrics
 */
export function getDashboardStats() {
  const allNotas = listNotas();
  const allLogs = getAuditLogs();
  
  const totalNotas = allNotas.length;
  const totalVerifications = allLogs.length;
  const successfulVerifications = allLogs.filter((l) => l.status === 'VERIFIED').length;
  const failedVerifications = allLogs.filter(
    (l) => l.status === 'FAILED' || l.status === 'EXPIRED'
  ).length;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayVerifications = allLogs.filter((l) => {
    const logTime = new Date(l.timestamp).getTime();
    return logTime >= startOfDay;
  }).length;

  return {
    totalNotas,
    totalVerifications,
    successfulVerifications,
    failedVerifications,
    todayVerifications
  };
}
