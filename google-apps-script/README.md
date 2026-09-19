# Google Apps Script Setup Guide

Follow these steps to deploy the Google Apps Script backend for **Anti-Fraud Nota Verification**.

## 1. Create a New Google Apps Script Project
1. Open [Google Apps Script Dashboard](https://script.google.com/).
2. Click **+ New Project** (or **New script**).
3. Rename the project to `Anti-Fraud Evidence Backend`.

## 2. Paste the Script Code
1. Open the file `Code.gs` in your Google Apps Script editor.
2. Replace all existing content with the code inside [`google-apps-script/Code.gs`](./Code.gs).
3. Click **Save** (Ctrl+S or the disk icon).

## 3. Set Script Properties (Security Secret)
1. In the Apps Script editor, click on the **Project Settings** (gear icon ⚙️ on the left sidebar).
2. Scroll down to **Script Properties** and click **Edit script properties**.
3. Click **Add script property**:
   - **Property**: `GOOGLE_APPS_SCRIPT_SECRET`
   - **Value**: `antifraud-secret-key-change-this-in-production-12345` (or any custom 32+ character secret).
4. Click **Save script properties**.

## 4. Deploy as a Web App
1. At the top right, click **Deploy** > **New deployment**.
2. Select type: **Web app** (click the gear icon next to "Select type").
3. Set the deployment fields:
   - **Description**: `Production Evidence Backend v1`
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone** (This allows the Astro server to dispatch evidence via POST with the secret key header).
4. Click **Deploy**.
5. When prompted, click **Authorize access** and approve Google Drive and Google Sheets permissions.
6. Copy the **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

## 5. Configure Your Astro Environment
Paste the copied Web App URL and your secret in your Astro project `.env` file:
```env
GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycb.../exec"
GOOGLE_APPS_SCRIPT_SECRET="antifraud-secret-key-change-this-in-production-12345"
```

## 6. Verification of Google Drive & Sheets
Upon the first verification submission:
- A root folder named `Anti Fraud Verification/` is automatically created in your Google Drive.
- A spreadsheet named `Anti Fraud Verification Logs` is created and stored within that folder.
- Subfolders `Anti Fraud Verification/nota/{notaId}/{verificationId}/` are generated for each session containing `front.jpg` and `back.jpg`.
