/**
 * Anti-Fraud Nota Verification - Google Apps Script Backend
 *
 * This Web App handles:
 * 1. Verification of the shared secret
 * 2. Automated Google Drive folder creation and secure image evidence storage
 * 3. Appending structured audit log records to Google Sheets
 */

// Configuration: Store your secret in Script Properties or set default here
var DEFAULT_SECRET = "antifraud-secret-key-change-this-in-production-12345";
var ROOT_FOLDER_NAME = "Anti Fraud Verification";
var SPREADSHEET_NAME = "Anti Fraud Verification Logs";

/**
 * Handle incoming POST requests from Astro Server
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respondJson({ success: false, error: "Empty request payload" }, 400);
    }

    var payload = JSON.parse(e.postData.contents);
    var secret = getScriptSecret();

    // Authenticate shared secret
    var providedSecret = payload.secret || (e.parameter && e.parameter.secret);
    if (providedSecret !== secret) {
      return respondJson({ success: false, error: "Unauthorized: Invalid secret key" }, 401);
    }

    // 0. Handle saveNota Action
    if (payload.action === "saveNota" && payload.nota) {
      var notasFolder = getOrCreateNotasFolder();
      var notaObj = payload.nota;
      var fileContent = JSON.stringify(notaObj);
      
      var existingFiles = notasFolder.getFilesByName(notaObj.id + ".json");
      if (existingFiles.hasNext()) {
        existingFiles.next().setContent(fileContent);
      } else {
        notasFolder.createFile(notaObj.id + ".json", fileContent, MimeType.PLAIN_TEXT);
      }

      return respondJson({
        success: true,
        message: "Nota saved successfully",
        data: { id: notaObj.id, notaNumber: notaObj.notaNumber }
      }, 200);
    }

    var verificationId = payload.verificationId || "VERIF-" + Utilities.getUuid().substring(0, 8);
    var notaId = payload.notaId || "UNKNOWN";
    var status = payload.status || "VERIFIED";
    var location = payload.location || {};
    var device = payload.device || {};
    var duration = payload.verificationDurationMs || 0;
    var failureReason = payload.failureReason || "";
    var ipAddress = payload.ipAddress || "";

    // Server-side timestamp
    var serverTimestamp = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd'T'HH:mm:ssXXX");

    // 1. Save Image Evidence to Google Drive
    var frontFileResult = null;
    var backFileResult = null;

    if (payload.frontCamera || payload.backCamera) {
      var targetFolder = getOrCreateTargetFolder(notaId, verificationId);

      if (payload.frontCamera) {
        frontFileResult = saveBase64Image(
          targetFolder,
          verificationId + "_front.jpg",
          payload.frontCamera
        );
      }

      if (payload.backCamera) {
        backFileResult = saveBase64Image(
          targetFolder,
          verificationId + "_back.jpg",
          payload.backCamera
        );
      }
    }

    // 2. Append Audit Log Record to Google Sheets
    var sheet = getOrCreateLogSheet();
    var frontUrl = frontFileResult ? frontFileResult.getUrl() : "-";
    var backUrl = backFileResult ? backFileResult.getUrl() : "-";
    var screenRes = (device.screenWidth || "-") + "x" + (device.screenHeight || "-");

    var batteryStatus = payload.batteryInfo || (device.batteryLevel != null ? (device.batteryLevel + "% " + (device.isCharging ? "(Charging)" : "(Battery)")) : "-");
    var networkTelemetry = payload.networkInfo || (device.effectiveType ? (device.effectiveType.toUpperCase() + (device.networkType ? " / " + device.networkType : "") + (device.downlinkSpeed ? " (" + device.downlinkSpeed + " Mbps, " + (device.rtt || 0) + "ms)" : "")) : "-");
    var displayMetrics = payload.displayInfo || (device.screenWidth ? (device.screenOrientation || "portrait") + " · " + (device.colorDepth ? device.colorDepth + "-bit" : "24-bit") + " · " + (device.colorGamut ? device.colorGamut.toUpperCase() : "sRGB") + " · " + (device.isDarkMode ? "Dark" : "Light") : "-");
    var storageMetrics = payload.storageInfo || (device.storageEstimate ? ((device.storageEstimate.available / (1024 * 1024 * 1024)).toFixed(1) + " GB Free / " + (device.storageEstimate.quota / (1024 * 1024 * 1024)).toFixed(1) + " GB") : "-");
    var ispProvider = payload.isp || "-";
    var vpnStatus = payload.vpnTag || (payload.isVpn ? "VPN DETECTED" : "DIRECT");
    var ispCityLocation = payload.cityLocation || "-";

    var row = [
      verificationId,
      notaId,
      serverTimestamp,
      status,
      location.latitude || "-",
      location.longitude || "-",
      location.accuracy ? "±" + location.accuracy + "m" : "-",
      location.altitude || "-",
      location.altitudeAccuracy || "-",
      location.heading || "-",
      location.speed || "-",
      device.timezone || "-",
      ipAddress || "-",
      device.userAgent || "-",
      device.deviceModel || device.platform || "-",
      device.language || "-",
      screenRes,
      device.devicePixelRatio || "-",
      device.hardwareConcurrency || "-",
      device.deviceMemory || "-",
      device.mobile ? "TRUE" : "FALSE",
      frontUrl,
      backUrl,
      device.deviceHash || "-",
      duration ? (duration / 1000).toFixed(1) + "s" : "-",
      failureReason || "-",
      batteryStatus,
      networkTelemetry,
      displayMetrics,
      storageMetrics,
      ispProvider,
      vpnStatus,
      ispCityLocation
    ];

    sheet.appendRow(row);

    return respondJson({
      success: true,
      message: "Evidence successfully archived and logged",
      data: {
        verificationId: verificationId,
        notaId: notaId,
        status: status,
        timestamp: serverTimestamp,
        frontCameraFile: frontUrl,
        backCameraFile: backUrl
      }
    }, 200);

  } catch (error) {
    return respondJson({
      success: false,
      error: error.message || "Internal server error"
    }, 500);
  }
}

/**
 * Handle GET request (Health Check & Live Sheet Logs Fetching)
 */
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  var providedSecret = e && e.parameter && e.parameter.secret;

  // Live Audit Logs Query from Google Sheet
  if (action === "getLogs") {
    var secret = getScriptSecret();
    if (providedSecret !== secret) {
      return respondJson({ success: false, error: "Unauthorized: Invalid secret key" }, 401);
    }

    try {
      var sheet = getOrCreateLogSheet();
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return respondJson({ success: true, logs: [] }, 200);
      }

      var numCols = Math.max(30, sheet.getLastColumn());
      var data = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
      var logs = [];

      for (var i = 0; i < data.length; i++) {
        var r = data[i];
        if (!r[0]) continue; // skip empty rows
          var platformStr = String(r[14] || "-");
          if (/24117RN76/i.test(platformStr)) {
            platformStr = "Xiaomi Redmi Note 14 4G";
          }
          var ispStr = r[30] ? String(r[30]) : "-";
          var vpnTagStr = r[31] ? String(r[31]) : "DIRECT";
          var isConsumer = /medianet|sarana insanmuda|citranet|iconnet|myrepublic|biznet|indihome|telkom|xl\b|axis|indosat|tri\b|smartfren|firstmedia|mnc|oxygen|cbn\b|moratel|gmedia|nusanet/i.test(ispStr);
          var isVpnVal = !isConsumer && vpnTagStr && (vpnTagStr.toUpperCase().indexOf("VPN") !== -1 || vpnTagStr.toUpperCase().indexOf("PROXY") !== -1);
          if (isConsumer && (vpnTagStr === "Hosting / Datacenter IP" || vpnTagStr.indexOf("VPN") !== -1)) {
            vpnTagStr = "DIRECT";
          }

          logs.push({
            verificationId: String(r[0]),
            notaId: String(r[1]),
            timestamp: String(r[2]),
            status: String(r[3]),
            latitude: r[4] !== "" ? r[4] : "-",
            longitude: r[5] !== "" ? r[5] : "-",
            locationAccuracy: String(r[6] || "-"),
            altitude: r[7] !== "" ? r[7] : "-",
            altitudeAccuracy: r[8] !== "" ? r[8] : "-",
            heading: r[9] !== "" ? r[9] : "-",
            speed: r[10] !== "" ? r[10] : "-",
            timezone: String(r[11] || "-"),
            ipAddress: String(r[12] || "-"),
            userAgent: String(r[13] || "-"),
            platform: platformStr,
            language: String(r[15] || "-"),
            screenResolution: String(r[16] || "-"),
            devicePixelRatio: r[17] !== "" ? r[17] : "-",
            hardwareConcurrency: r[18] !== "" ? r[18] : "-",
            deviceMemory: r[19] !== "" ? r[19] : "-",
            mobile: r[20] === true || r[20] === "TRUE" || r[20] === "true",
            frontCameraFile: String(r[21] || "-"),
            backCameraFile: String(r[22] || "-"),
            deviceHash: String(r[23] || "-"),
            verificationDuration: String(r[24] || "-"),
            failureReason: String(r[25] || "-"),
            batteryInfo: r[26] ? String(r[26]) : "-",
            networkInfo: r[27] ? String(r[27]) : "-",
            displayInfo: r[28] ? String(r[28]) : "-",
            storageInfo: r[29] ? String(r[29]) : "-",
            isp: ispStr,
            vpnTag: vpnTagStr,
            isVpn: isVpnVal,
            cityLocation: r[32] ? String(r[32]) : "-"
          });
      }

      // Return most recent logs first
      return respondJson({ success: true, logs: logs.reverse() }, 200);
    } catch (err) {
      return respondJson({ success: false, error: err.message || "Failed to read logs from Sheet" }, 500);
    }
  }

  // Query single Nota by ID
  if (action === "getNota") {
    var secret = getScriptSecret();
    if (providedSecret !== secret) {
      return respondJson({ success: false, error: "Unauthorized: Invalid secret key" }, 401);
    }

    var id = e && e.parameter && e.parameter.id;
    if (!id) {
      return respondJson({ success: false, error: "Missing ID" }, 400);
    }

    try {
      var notasFolder = getOrCreateNotasFolder();
      var files = notasFolder.getFilesByName(id + ".json");
      if (files.hasNext()) {
        var content = files.next().getBlob().getDataAsString();
        return respondJson({ success: true, nota: JSON.parse(content) }, 200);
      }
      return respondJson({ success: false, error: "Nota not found" }, 404);
    } catch (err) {
      return respondJson({ success: false, error: err.message }, 500);
    }
  }

  // Query all Notas
  if (action === "listNotas") {
    var secret = getScriptSecret();
    if (providedSecret !== secret) {
      return respondJson({ success: false, error: "Unauthorized: Invalid secret key" }, 401);
    }

    try {
      var notasFolder = getOrCreateNotasFolder();
      var files = notasFolder.getFiles();
      var notasList = [];
      while (files.hasNext()) {
        var file = files.next();
        if (file.getName().indexOf(".json") !== -1) {
          try {
            var n = JSON.parse(file.getBlob().getDataAsString());
            notasList.push(n);
          } catch(e) {}
        }
      }
      return respondJson({ success: true, notas: notasList }, 200);
    } catch (err) {
      return respondJson({ success: false, error: err.message }, 500);
    }
  }

  return respondJson({
    status: "OK",
    service: "Anti-Fraud Verification Web App API",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  }, 200);
}

/**
 * Get or create the notas storage folder
 */
function getOrCreateNotasFolder() {
  var rootFolders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  var rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);

  var notasFolders = rootFolder.getFoldersByName("notas");
  return notasFolders.hasNext() ? notasFolders.next() : rootFolder.createFolder("notas");
}

/**
 * Helper to get configured secret from Script Properties or fallback
 */
function getScriptSecret() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("GOOGLE_APPS_SCRIPT_SECRET");
  return secret || DEFAULT_SECRET;
}

/**
 * Create or traverse folder hierarchy:
 * Anti Fraud Verification/nota/{notaId}/{verificationId}/
 */
function getOrCreateTargetFolder(notaId, verificationId) {
  var rootFolders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  var rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);

  var notaParentFolders = rootFolder.getFoldersByName("nota");
  var notaParentFolder = notaParentFolders.hasNext() ? notaParentFolders.next() : rootFolder.createFolder("nota");

  var notaFolders = notaParentFolder.getFoldersByName(notaId);
  var notaFolder = notaFolders.hasNext() ? notaFolders.next() : notaParentFolder.createFolder(notaId);

  var sessionFolders = notaFolder.getFoldersByName(verificationId);
  var sessionFolder = sessionFolders.hasNext() ? sessionFolders.next() : notaFolder.createFolder(verificationId);

  return sessionFolder;
}

/**
 * Convert base64 data URI to image blob and save to Drive
 */
function saveBase64Image(folder, filename, base64Data) {
  var cleanBase64 = base64Data;
  var mimeType = MimeType.JPEG;

  if (base64Data.indexOf("data:") === 0) {
    var parts = base64Data.split(",");
    var mimeMatch = parts[0].match(/:(.*?);/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
    cleanBase64 = parts[1];
  }

  var decodedBytes = Utilities.base64Decode(cleanBase64);
  var blob = Utilities.newBlob(decodedBytes, mimeType, filename);
  return folder.createFile(blob);
}

/**
 * Get or create the Google Sheets log spreadsheet and setup columns
 */
function getOrCreateLogSheet() {
  var files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  var spreadsheet;

  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
  } else {
    spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
    // Move spreadsheet into Root Folder
    var rootFolders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
    var rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);
    var file = DriveApp.getFileById(spreadsheet.getId());
    rootFolder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  }

  var sheet = spreadsheet.getActiveSheet();

  var headers = [
    "verification_id",
    "nota_id",
    "timestamp",
    "status",
    "latitude",
    "longitude",
    "location_accuracy",
    "altitude",
    "altitude_accuracy",
    "heading",
    "speed",
    "timezone",
    "ip_address",
    "user_agent",
    "platform",
    "language",
    "screen_resolution",
    "device_pixel_ratio",
    "hardware_concurrency",
    "device_memory",
    "mobile",
    "front_camera_file",
    "back_camera_file",
    "device_hash",
    "verification_duration",
    "failure_reason",
    "battery_status",
    "network_telemetry",
    "display_metrics",
    "storage_metrics",
    "isp_provider",
    "vpn_status",
    "isp_city_location"
  ];

  // If empty sheet, create header row
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);

    // Format header row with Dark Navy styling
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0b132b");
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < headers.length) {
    // Automatically append missing header columns to existing sheet
    for (var col = sheet.getLastColumn() + 1; col <= headers.length; col++) {
      sheet.getRange(1, col)
        .setValue(headers[col - 1])
        .setFontWeight("bold")
        .setBackground("#0b132b")
        .setFontColor("#ffffff");
    }
  }

  return sheet;
}

/**
 * JSON Response helper
 */
function respondJson(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
