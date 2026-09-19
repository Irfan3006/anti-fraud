# Anti-Fraud Verification Platform

An enterprise-grade, forensic document verification and canary tracking platform engineered with Astro Server-Side Rendering (SSR), TypeScript, and a high-performance vanilla CSS design system. The application operates on Vercel Serverless infrastructure, coupling client-side hardware telemetry with persistent cloud archiving in Google Drive, structured audit logging in Google Sheets via Google Apps Script, and real-time alert dispatching through the Telegram Bot API.

---

## 1. System Overview and Core Architecture

The platform provides a secure verification gateway designed for fraud prevention, document tamper detection, and canary link tracking. When a client requests access to a protected document or tracking link, the server enforces an authoritative verification gate before issuing access privileges or executing redirections.

```text
Visitor / Target Client
       |
       v
Astro SSR Security Gate (/nota/[id])
       |
       +---> [Unverified Request] ---> HTTP 302 Redirect to /verify/[id]
       |
       v
Client Forensic Execution Gateway (/verify/[id])
       |
       +---> Collects Hardware, Display, Battery, and Network Telemetry
       +---> Requests High-Accuracy Geolocation Coordinates
       +---> Captures Front and Rear Optical Camera Frames
       |
       v
Consolidated Payload Submission (/api/verification/complete)
       |
       +---> Parallel Dispatch to Google Drive and Google Sheets (Apps Script)
       +---> Parallel Dispatch to Telegram Bot API (Photo and Telemetry)
       +---> Server Issues Cryptographically Signed HMAC Session Token
       |
       v
Access Granted
       |
       +---> Renders Protected Document (/nota/[id]) OR
       +---> Redirects Target to Configured External Destination URL
```

### Core Security Tenets

* **Server-Authoritative Validation**: Client-side state manipulations, query modifications, and local storage overrides are rejected. Access authorization is computed and validated solely by the server runtime on each request.
* **Isolated Document Delivery**: Protected document assets are stored outside public static directories. Files are streamed exclusively through authenticated SSR endpoints upon validation of a cryptographically signed HMAC token.
* **Metadata Protection**: Dynamic Open Graph preview endpoints generate obfuscated security identifiers and advisory banners while concealing invoice values, financial sums, and customer data from web crawlers.
* **Graceful Degradation**: Telemetry collection captures all accessible environmental parameters. If browser permissions are denied or timed out, the system records the event, logs the audit trail, and directs the visitor to the configured destination URL.

---

## 2. Operational Modes

The platform supports two distinct operational modes configured during asset creation:

### Protected Document Mode (`nota`)
Designed for invoices, receipts, contracts, and sensitive financial records. Visitors must undergo the identity and environment verification sequence before the server reveals the protected document. Once verified, the server issues an HTTP-only session cookie containing an HMAC signature, permitting access to the protected document viewer.

### Canary Honeypot Tracking Mode (`link`)
Designed for fraud investigation, phishing tracking, and threat actor profiling. When a suspect visits the generated link, the interface displays an authentic document verification screen, collects maximum available environment telemetry, and silently archives the data. Upon completion or permission rejection, the system seamlessly redirects the visitor to a specified destination URL (such as an external portal or target website).

---

## 3. Forensic Telemetry Engine

The platform captures a multi-layered profile of the client environment across hardware, display, power, network, storage, location, and network routing layers.

### Client Hardware and Device Profile
* **High-Entropy Browser Hints**: Extracts architecture, platform version, model name, and bitness using `navigator.userAgentData` where supported.
* **Exact Model Resolution**: Evaluates platform strings, user agent patterns, screen aspect ratios, and GPU signatures against a database of commercial hardware profiles (for example, resolving internal Xiaomi, Samsung, and Apple board identifiers).
* **Processing Concurrency**: Detects logical CPU core count via `navigator.hardwareConcurrency`.
* **Memory Capacity**: Estimates client RAM in gigabytes via `navigator.deviceMemory`.
* **GPU Subsystem**: Extracts WebGL unmasked vendor and renderer strings to identify physical graphics chipsets (for example, Adreno, Mali, Apple GPU, or Nvidia).

### Display and Visual Metrics
* **Resolution and Density**: Captures screen width, screen height, and device pixel ratio (DPR).
* **Orientation State**: Evaluates viewport orientation (`portrait-primary`, `landscape-primary`).
* **Color Depth and Gamut**: Inspects display bit depth (24-bit, 30-bit) and wide-gamut capabilities including sRGB, Display P3, and Rec2020.
* **System Color Scheme**: Detects user theme preferences (Dark Mode vs Light Mode).

### Power and Battery Diagnostics
Utilizes the Battery Status API where exposed by the browser:
* **Battery Charge Level**: Percentage of remaining battery charge (0 to 100).
* **Charging State**: Determines whether the device is currently connected to AC power.
* **Charging and Discharging Times**: Temporal estimates for complete battery charge or depletion.

### Network and Latency Diagnostics
Leverages the Network Information API:
* **Effective Connection Type**: Measures cellular and network profile categories (`4g`, `3g`, `2g`, `slow-2g`).
* **Downlink Throughput**: Estimated download bandwidth in megabits per second (Mbps).
* **Round-Trip Latency (RTT)**: Granular network round-trip time in milliseconds.
* **Data Saver Preference**: Identifies whether the client has enabled bandwidth reduction mode.

### Storage Diagnostics
Utilizes the StorageManager API:
* **Quota Allocation**: Calculates total disk quota assigned to the origin in gigabytes.
* **Available Space**: Estimates free storage remaining on the host device.

### Geolocation Extraction
* **High-Accuracy GPS**: Queries `navigator.geolocation` with `enableHighAccuracy: true` and an explicit 8000ms timeout budget.
* **Spatial Coordinates**: Extracts latitude, longitude, and accuracy radius in meters.
* **Kinematic Metrics**: Measures altitude, altitude accuracy, heading angle in degrees, and ground speed in meters per second.

### Server-Side IP Intelligence and Routing Analysis
The server runtime inspects client IP headers (`x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`) and performs high-speed network classification:
* **Autonomous System (AS) and ISP Resolution**: Identifies the Internet Service Provider, organization name, and routing AS number.
* **ISP Normalization**: Maps complex corporate carrier names to clean commercial brand identifiers (for example, Telkomsel, Indosat, XL Axiata, Biznet, MyRepublic).
* **Datacenter and Hosting Detection**: Checks IP addresses against known cloud infrastructure networks (AWS, Google Cloud, Azure, DigitalOcean, Linode, Hetzner, OVH).
* **Proxy and VPN Heuristics**: Distinguishes between commercial anonymizers and legitimate residential or mobile carrier CGNAT networks to eliminate false-positive flags.
* **Regional Fallback**: Determines estimated city, region, and country coordinates when physical GPS permissions are declined.

---

## 4. Optical Evidence Acquisition Pipeline

The platform incorporates an automated dual-camera capture sequence engineered for mobile WebKit and Chromium engines:

1. **Permission Sequencing**: Solicits location and camera access in distinct sequential phases to prevent operating system modal dialog collisions on mobile platforms.
2. **In-Viewport Hardware Acceleration**: Keeps camera video elements mounted within active viewport bounds (using transparent styling and non-zero dimensions) to guarantee that hardware video decoders remain active on iOS WebKit.
3. **Front-Facing Sensor**: Initializes `getUserMedia` with `facingMode: "user"`, pauses briefly for sensor auto-exposure stabilization, and captures a high-resolution frame.
4. **Environment Sensor**: Shuts down the front stream, opens the rear sensor with `facingMode: "environment"`, and extracts a frame of the physical surroundings.
5. **Frame Compression**: Draws captured frames to an HTML5 Canvas, compresses them to JPEG format at 0.75 quality, and encodes the output into Base64 Data URIs.

---

## 5. Metadata Scraper and Open Graph Engine

For canary tracking links, the platform includes an automated Open Graph scraping and spoofing engine:

* **Upstream Scraper**: When a target URL is entered in the administrative panel, the backend fetches the page using simulated crawler user agents (`facebookexternalhit`, `WhatsApp`), parses HTML metadata, and extracts title, description, and preview image attributes.
* **Dynamic OG Generator**: Synthesizes custom Open Graph banners using `@resvg/resvg-js`. Previews presented on WhatsApp, Telegram, or Twitter display authentic title and metadata while keeping document details and monetary amounts protected from automated scrapers.
* **Desktop WhatsApp Preview Compatibility**: Ensures standard HTTP 200 responses with static content types to guarantee image rendering in messaging clients.

---

## 6. Cryptographic Security Specifications

* **HMAC Token Signatures**: The server signs verification session tokens using HMAC-SHA256 with a 32-character minimum secret key (`SESSION_SECRET`). Tokens contain base64url-encoded payloads concatenated with a cryptographic digest:
  ```text
  base64url(payload) . base64url(hmac_sha256(payload, secret))
  ```
* **Timing-Safe Evaluation**: All token signatures and administrative credentials are evaluated using `crypto.timingSafeEqual` to neutralize timing side-channel attacks.
* **Anti-Replay Nonce**: Verification cycles generate unique cryptographic nonces tied to specific document identifiers and timestamps. Expired or duplicate nonces are invalidated immediately.
* **Rate Limiting**: Critical endpoints (such as `/api/auth/login` and `/api/verification/start`) incorporate in-memory rate limiting windows based on client IP addresses.
* **Cookie Protection**: Authentication cookies enforce `HttpOnly`, `SameSite=Lax`, and `Secure` (in production environments) attributes to defend against cross-site scripting (XSS) and cross-site request forgery (CSRF).

---

## 7. Cloud Storage and Audit Log Integration

The application delegates cloud file archiving and audit records to Google Apps Script, functioning as a serverless backend bridge to Google Drive and Google Sheets.

```text
Astro Server (Vercel)
       |
       | POST JSON Payload (Includes Shared Secret)
       v
Google Apps Script Web App (Code.gs)
       |
       +---> [Action: saveNota] ---> Saves Document Metadata JSON to Drive
       |
       +---> [Evidence Dispatch]
                 |
                 +---> Decodes Front & Rear Base64 JPEG Images
                 +---> Creates Nested Directory: Anti Fraud Verification/nota/{notaId}/{verifId}/
                 +---> Saves front.jpg and back.jpg to Google Drive
                 +---> Appends 33-Column Record to Google Sheet "Anti Fraud Verification Logs"
```

### Google Sheet Column Registry
The Google Apps Script deployment automatically creates and manages a 33-column audit schema with automatic column migration:

| Index | Column Header | Data Description |
|---|---|---|
| 1 | `verification_id` | Unique verification session identifier |
| 2 | `nota_id` | Associated document or canary link ID |
| 3 | `timestamp` | ISO-8601 server timestamp (GMT+7) |
| 4 | `status` | Session outcome (`VERIFIED`, `FAILED`, `EXPIRED`) |
| 5 | `latitude` | Physical GPS latitude coordinate |
| 6 | `longitude` | Physical GPS longitude coordinate |
| 7 | `location_accuracy` | GPS accuracy radius (for example, `+/- 8m`) |
| 8 | `altitude` | Elevation above sea level in meters |
| 9 | `altitude_accuracy` | Altitude measurement accuracy |
| 10 | `heading` | Direction of travel in degrees |
| 11 | `speed` | Ground velocity in meters per second |
| 12 | `timezone` | Client system timezone identifier |
| 13 | `ip_address` | Client public IP address |
| 14 | `user_agent` | Raw browser User-Agent header |
| 15 | `platform` | Resolved device model and operating system |
| 16 | `language` | Client primary language setting |
| 17 | `screen_resolution` | Physical display pixel dimensions |
| 18 | `device_pixel_ratio` | Device pixel scale factor |
| 19 | `hardware_concurrency` | Count of CPU execution threads |
| 20 | `device_memory` | Host RAM allocation in gigabytes |
| 21 | `mobile` | Boolean indicator for mobile user agents |
| 22 | `front_camera_file` | Direct Google Drive URL for front capture |
| 23 | `back_camera_file` | Direct Google Drive URL for rear capture |
| 24 | `device_hash` | Client hardware fingerprint digest |
| 25 | `verification_duration` | Total duration of the verification cycle |
| 26 | `failure_reason` | Failure classification and telemetry backup |
| 27 | `battery_status` | Battery percentage and charging indicator |
| 28 | `network_telemetry` | Network type, downlink speed, and RTT |
| 29 | `display_metrics` | Orientation, color depth, and gamut |
| 30 | `storage_metrics` | Free and total storage quota |
| 31 | `isp_provider` | Resolved Internet Service Provider |
| 32 | `vpn_status` | Classification (`DIRECT`, `VPN DETECTED`, `HOSTING`) |
| 33 | `isp_city_location` | Approximate city and regional location |

---

## 8. Telegram Bot Alert Integration

Upon completion of a verification session, the server runtime dispatches a structured notification directly to configured Telegram administrative chats.

* **Immediate Dispatch**: Alerts are delivered asynchronously using the Telegram Bot HTTP API.
* **Photo Attachment**: If optical evidence was collected, the front camera capture is attached as a primary photo accompanied by an HTML-formatted caption.
* **Interactive Controls**: Generates dynamic inline keyboard buttons linking directly to Google Maps coordinates and the administrative console.
* **Telemetry Formatting**: Summarizes hardware identity, ISP provider, VPN status, battery level, network speed, and GPS coordinates within a single message.

---

## 9. Technology Stack

* **Core Framework**: Astro 5 configured for Server-Side Rendering (`output: "server"`)
* **Serverless Runtime Adapter**: `@astrojs/vercel`
* **Programming Language**: TypeScript 5 in strict mode
* **Dynamic Image Generation**: `@resvg/resvg-js`
* **Cloud Storage**: Google Drive API via Google Apps Script Web App
* **Audit Database**: Google Sheets via Google Apps Script Web App
* **Push Notifications**: Telegram Bot HTTP API
* **Styling**: Vanilla CSS Design System with dark mode tokens

---

## 10. Repository Structure

```text
anti-scam/
├── astro.config.mjs               # Astro server configuration and adapter setup
├── package.json                   # Dependencies, scripts, and package metadata
├── tsconfig.json                  # Strict TypeScript compiler configuration
├── vercel.json                    # Vercel deployment routing and header policies
├── .env.example                   # Environment configuration template
├── LICENSE                        # MIT License declaration
├── google-apps-script/
│   ├── Code.gs                    # Production Apps Script deployment code
│   └── README.md                  # Google Apps Script configuration walkthrough
├── public/
│   └── favicon.svg                # System vector favicon
├── src/
│   ├── components/
│   │   ├── AdminNav.astro         # Administrative navigation bar
│   │   ├── Header.astro           # Public brand header
│   │   ├── Icons.astro            # SVG vector icon registry
│   │   ├── NotaViewer.astro       # Verified document presentation component
│   │   └── VerificationProgress.astro # Interactive step progression indicator
│   ├── layouts/
│   │   └── Layout.astro           # Base layout with dynamic Open Graph integration
│   ├── lib/
│   │   ├── apps-script.ts         # Google Apps Script client and telemetry encoder
│   │   ├── device.ts              # Hardware telemetry collector and hasher
│   │   ├── device-resolver.ts     # Device model resolution engine
│   │   ├── ip-intelligence.ts     # IP lookup, ISP normalization, and VPN detector
│   │   ├── location.ts            # Geolocation verification utilities
│   │   ├── og-scraper.ts          # External Open Graph scraper engine
│   │   ├── security.ts            # HMAC signatures, token utilities, rate limits
│   │   ├── session.ts             # Secure cookie management utilities
│   │   ├── storage.ts             # In-memory storage state for serverless runtimes
│   │   ├── telegram.ts            # Telegram Bot API notification dispatcher
│   │   └── types.ts               # Complete TypeScript data model interfaces
│   ├── pages/
│   │   ├── 404.astro              # Custom error page
│   │   ├── index.astro            # Public verification portal landing page
│   │   ├── admin/
│   │   │   ├── index.astro        # Administrative analytics and live audit table
│   │   │   ├── login.astro        # Administrator authentication portal
│   │   │   ├── create.astro       # Nota and decoy link generation interface
│   │   │   └── nota/[id].astro    # Document audit history view
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── audit-logs.ts  # Audit log deletion and retrieval endpoints
│   │   │   │   ├── nota.ts        # Document registration and deletion endpoints
│   │   │   │   ├── scrape-og.ts   # Upstream Open Graph scraper endpoint
│   │   │   │   └── upload.ts      # Document image upload endpoint
│   │   │   ├── auth/
│   │   │   │   ├── login.ts       # Administrator credential validation endpoint
│   │   │   │   └── logout.ts      # Session termination endpoint
│   │   │   ├── nota/
│   │   │   │   ├── [id].ts        # Document retrieval endpoint
│   │   │   │   └── [id]/image.ts  # Authenticated document image stream endpoint
│   │   │   └── verification/
│   │   │       ├── back-camera.ts # Rear camera capture upload endpoint
│   │   │       ├── complete.ts    # Consolidated verification submission endpoint
│   │   │       ├── device.ts      # Device telemetry ingestion endpoint
│   │   │       ├── front-camera.ts# Front camera capture upload endpoint
│   │   │       ├── location.ts    # Geolocation submission endpoint
│   │   │       └── start.ts       # Verification cycle initialization endpoint
│   │   ├── nota/[id].astro        # Protected document access gate
│   │   ├── og/
│   │   │   ├── default.png.ts     # Default dynamic Open Graph image generator
│   │   │   └── nota/[id].png.ts   # Document-specific Open Graph image generator
│   │   └── verify/[id].astro      # Interactive client verification interface
│   └── styles/
│       └── global.css             # Design tokens, typography, and dark UI styles
```

---

## 11. Environment Configuration Variables

Copy `.env.example` to `.env` in the project root and populate the configuration keys:

```bash
cp .env.example .env
```

| Variable Name | Required | Description | Example / Format |
|---|---|---|---|
| `GOOGLE_APPS_SCRIPT_URL` | Yes | Published Google Apps Script Web App URL | `https://script.google.com/macros/s/AKfycb.../exec` |
| `GOOGLE_APPS_SCRIPT_SECRET` | Yes | Shared secret key for Apps Script validation | Any strong string (32 characters or more) |
| `ADMIN_PASSWORD` | Yes | Password required to access `/admin` dashboard | Strong administrative password |
| `SESSION_SECRET` | Yes | Cryptographic key for HMAC signatures | Minimum 32-character random string |
| `PUBLIC_SITE_URL` | Yes | Canonical URL of the deployment | `https://your-domain.vercel.app` |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram Bot API token for instant alerts | `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ` |
| `TELEGRAM_CHAT_ID` | Optional | Telegram chat or channel ID for alerts | `1212973672` |

---

## 12. Local Installation and Setup

### Prerequisites
* Node.js version 18.17.0 or higher (Node.js 22 LTS recommended)
* npm version 9.0.0 or higher

### Step-by-Step Installation

1. Clone the repository to your local workstation:
   ```bash
   git clone https://github.com/Irfan3006/anti-fraud.git
   cd anti-fraud
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your local environment variables:
   ```bash
   cp .env.example .env
   ```
   Open `.env` in an editor and configure appropriate values for development.

4. Start the local development server:
   ```bash
   npm run dev
   ```

5. Open local endpoints in your browser:
   * Public Portal: `http://localhost:4321`
   * Sample Protected Nota: `http://localhost:4321/nota/8f92a7c1`
   * Administrative Dashboard: `http://localhost:4321/admin`

---

## 13. Google Apps Script Backend Deployment

The Google Apps Script deployment acts as a persistent storage gateway to Google Drive and Google Sheets.

1. Navigate to [Google Apps Script](https://script.google.com/) and create a new project.
2. Replace all editor contents with the code inside [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
3. Open **Project Settings** (gear icon on the left navigation panel).
4. Under **Script Properties**, add a property:
   * **Property**: `GOOGLE_APPS_SCRIPT_SECRET`
   * **Value**: A secure secret matching `GOOGLE_APPS_SCRIPT_SECRET` in your `.env`.
5. Click **Deploy** > **New deployment**:
   * **Select type**: Click the gear icon and select **Web app**.
   * **Description**: `Production Storage Gateway v1`
   * **Execute as**: **Me** (your Google account)
   * **Who has access**: **Anyone** (allows Astro server to send POST requests with secret verification).
6. Click **Deploy**, approve the necessary Drive and Sheets permissions, and copy the **Web App URL**.
7. Assign this URL to `GOOGLE_APPS_SCRIPT_URL` in your `.env` file and Vercel project settings.

---

## 14. Telegram Bot Alert Setup

1. Open Telegram and initiate a conversation with `@BotFather`.
2. Issue the `/newbot` command and follow prompts to assign a name and username.
3. Copy the provided HTTP API token and set it as `TELEGRAM_BOT_TOKEN`.
4. Open `@userinfobot` in Telegram to obtain your personal numerical Telegram ID.
5. Send `/start` to your newly created bot to initialize communication.
6. Set your user ID as `TELEGRAM_CHAT_ID`.

---

## 15. Production Deployment on Vercel

1. Install the Vercel CLI or link your GitHub repository in the Vercel Dashboard:
   ```bash
   npm install -g vercel
   vercel
   ```

2. Configure all environment variables in **Project Settings** > **Environment Variables**:
   * `GOOGLE_APPS_SCRIPT_URL`
   * `GOOGLE_APPS_SCRIPT_SECRET`
   * `ADMIN_PASSWORD`
   * `SESSION_SECRET`
   * `PUBLIC_SITE_URL`
   * `TELEGRAM_BOT_TOKEN`
   * `TELEGRAM_CHAT_ID`

3. Deploy the application to production:
   ```bash
   vercel --prod
   ```

---

## 16. REST API Endpoint Reference

### Public and Client Endpoints

* `GET /nota/[id]`: Protected document gate. Evaluates authentication cookie. Redirects unverified clients to `/verify/[id]`.
* `GET /verify/[id]`: Interactive forensic collection gate for the specified document or canary link.
* `POST /api/verification/start`: Initializes a verification session, generates an anti-spoof nonce, and records initial IP intelligence.
* `POST /api/verification/device`: Receives initial client device telemetry.
* `POST /api/verification/location`: Ingests GPS coordinates and location accuracy metrics.
* `POST /api/verification/front-camera`: Receives Base64-encoded front camera evidence.
* `POST /api/verification/back-camera`: Receives Base64-encoded rear camera evidence.
* `POST /api/verification/complete`: Consolidates telemetry, initiates parallel dispatch to Google Apps Script and Telegram, and issues an HMAC session cookie.
* `GET /api/nota/[id]/image`: Streams protected document binary assets upon valid session token verification.

### Administrative Endpoints

* `POST /api/auth/login`: Authenticates administrator password and issues session token.
* `POST /api/auth/logout`: Clears administrative session cookies.
* `POST /api/admin/upload`: Handles document file uploads and SVG synthesis.
* `POST /api/admin/nota`: Registers new documents or canary tracking links.
* `DELETE /api/admin/nota`: Deletes existing document records.
* `POST /api/admin/scrape-og`: Fetches and extracts upstream Open Graph metadata from external URLs.
* `GET /api/admin/audit-logs`: Retrieves audit trail logs from the Google Sheets backend.
* `DELETE /api/admin/audit-logs`: Clears audit records.

---

## 17. Verification Test Scenarios

| Scenario | Trigger Condition | System Action | Target Outcome |
|---|---|---|---|
| Direct Document Request | Unauthenticated client opens `/nota/[id]` | Intercepts request at SSR gate | HTTP 302 redirect to `/verify/[id]` |
| Tampered HMAC Token | Cookie payload or signature modified | Validates HMAC signature via `timingSafeEqual` | Cookie rejected, redirected to verification gate |
| Full Permissions Granted | Location and camera access accepted | Extracts GPS coordinates and dual camera frames | Status `VERIFIED`, images archived, Telegram alerted |
| Location Denied, Camera Granted | User permits camera but rejects GPS | Captures camera frames and IP fallback location | Status `FAILED`, notes recorded, document unlocked |
| Permissions Denied | User blocks all device permissions | Captures hardware, battery, and IP telemetry | Redirects to destination URL gracefully |
| Stale Cache Prevention | Navigation through browser history | Serves strict `Cache-Control: no-store` headers | Always delivers fresh server-rendered state |

---

## 18. Operational Guidelines and Compliance

This software is developed strictly for authorized transaction verification, forensic fraud analysis, and digital audit operations. Operators must ensure deployments adhere to applicable telecommunications laws, electronic privacy regulations, and organizational data handling standards.

---

## 19. License

This project is licensed under the [MIT License](LICENSE).
