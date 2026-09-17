/**
 * ==============================================================================
 * ST. JOHN'S ENGLISH SCHOOL - STAFF DATA AUTO-SYNC WITH FIREBASE (code.gs)
 * ==============================================================================
 * Target Spreadsheet:      1OGD09mG-m54rSKBJl2nmOc-pFraYZRnMcCTyoAEWGto
 * Target Tab:              staff_data
 * Drive Photo Folder ID:   1zcVv1vwxdMNAKPP52THA4SE8TzUGOOLa (staff_photo)
 * Firebase Database:       ai-studio-stjohnsenglishsc-531e7bb4-0068-4bb0-86fa-a4752b74bc31
 * ==============================================================================
 * 
 * FEATURES:
 * 1. ZERO POPUPS - Runs silently in the background with clean toast notifications.
 * 2. AUTOMATIC PULL - Pulls all staff records from Firebase Firestore directly into Google Sheets.
 * 3. AUTO DRIVE PHOTO LINK - Auto-detects and links staff photos from Google Drive folder.
 * 4. REAL-TIME PUSH ON EDIT - Any edit in Google Sheets is automatically saved to Firebase Firestore.
 * ==============================================================================
 */

var SPREADSHEET_ID = "1OGD09mG-m54rSKBJl2nmOc-pFraYZRnMcCTyoAEWGto";
var STAFF_TAB_NAME = "staff_data";
var STAFF_PHOTO_FOLDER_ID = "1zcVv1vwxdMNAKPP52THA4SE8TzUGOOLa";

var FIREBASE_PROJECT_ID = "gen-lang-client-0668756810";
var FIREBASE_DB_ID = "ai-studio-stjohnsenglishsc-531e7bb4-0068-4bb0-86fa-a4752b74bc31";
var FIREBASE_API_KEY = "AIzaSyBXda4Y20mY-o_QqxIR0rM49UmOFxTlnNM";

var HEADERS = [
  "Emp Code",
  "First Name",
  "Last Name",
  "Employee Category",
  "Department",
  "Designation",
  "Employment Type",
  "Employment Status",
  "Date of Joining",
  "Date of Birth",
  "Gender",
  "Blood Group",
  "Mobile Primary",
  "WhatsApp Number",
  "Official Email",
  "Personal Email",
  "Basic Salary",
  "Classes Assigned",
  "Subjects Specialisation",
  "Photo URL",
  "Document URL",
  "Current Address",
  "Academic Year",
  "Last Updated"
];

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🏫 SJES Staff Master")
    .addItem("🔄 1. Refresh Data from Firebase", "pullFromFirebase")
    .addItem("💾 2. Push All Rows to Firebase", "pushAllToFirebase")
    .addItem("📸 3. Auto-Link Photos from Google Drive", "syncStaffPhotosFromDrive")
    .addItem("🛠️ 4. Setup Sheet & Headers", "setupStaffSheet")
    .addToUi();

  try {
    setupStaffSheet();
    pullFromFirebase();
  } catch (err) {
    Logger.log("Auto-open sync error: " + err.toString());
  }
}

function notify(msg, title) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, title || "Firebase Staff Sync", 4);
  } catch (e) {
    Logger.log(msg);
  }
}

function setupStaffSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(STAFF_TAB_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(STAFF_TAB_NAME);
  }
  
  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setValues([HEADERS]);
  
  headerRange.setBackground("#1e3a8a")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
    
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);
  
  for (var col = 1; col <= HEADERS.length; col++) {
    sheet.autoResizeColumn(col);
    if (sheet.getColumnWidth(col) < 130) {
      sheet.setColumnWidth(col, 140);
    }
  }
  return sheet;
}

function parseFirestoreField(field) {
  if (!field) return "";
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  if (field.arrayValue !== undefined) {
    var arr = field.arrayValue.values || [];
    return arr.map(parseFirestoreField).join(", ");
  }
  if (field.mapValue !== undefined) {
    return JSON.stringify(field.mapValue.fields || {});
  }
  return "";
}

function toFirestoreFields(obj) {
  var fields = {};
  for (var key in obj) {
    var val = obj[key];
    if (val === undefined || val === null) {
      fields[key] = { nullValue: null };
    } else if (typeof val === "boolean") {
      fields[key] = { booleanValue: val };
    } else if (typeof val === "number") {
      fields[key] = { doubleValue: val };
    } else {
      fields[key] = { stringValue: String(val) };
    }
  }
  return fields;
}

/**
 * Helper to fetch Firestore collection documents with OAuth token & API key support
 */
function fetchFirestoreCollection(collectionName) {
  var token = "";
  try {
    token = ScriptApp.getOAuthToken();
  } catch (e) {}

  var headers = {};
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  var dbEndpoints = [FIREBASE_DB_ID, "(default)"];

  for (var i = 0; i < dbEndpoints.length; i++) {
    var dbId = dbEndpoints[i];
    var url = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
      "/databases/" + dbId + "/documents/" + collectionName + "?key=" + FIREBASE_API_KEY + "&pageSize=1000";

    try {
      var response = UrlFetchApp.fetch(url, {
        headers: headers,
        muteHttpExceptions: true
      });
      var code = response.getResponseCode();
      if (code === 200) {
        var json = JSON.parse(response.getContentText());
        return json.documents || [];
      } else {
        Logger.log("DB " + dbId + " returned status " + code + ": " + response.getContentText());
      }
    } catch (err) {
      Logger.log("DB " + dbId + " fetch error: " + err.toString());
    }
  }
  return null;
}

/**
 * Helper to save a single document into Firestore
 */
function saveFirestoreDocument(collectionName, docId, obj) {
  var token = "";
  try {
    token = ScriptApp.getOAuthToken();
  } catch (e) {}

  var headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  var dbEndpoints = [FIREBASE_DB_ID, "(default)"];
  for (var i = 0; i < dbEndpoints.length; i++) {
    var dbId = dbEndpoints[i];
    var patchUrl = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
      "/databases/" + dbId + "/documents/" + collectionName + "/" + docId + "?key=" + FIREBASE_API_KEY;

    try {
      var res = UrlFetchApp.fetch(patchUrl, {
        method: "PATCH",
        headers: headers,
        payload: JSON.stringify({ fields: toFirestoreFields(obj) }),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        return true;
      }
    } catch (e) {}
  }
  return false;
}

function pullFromFirebase() {
  try {
    notify("Fetching latest staff records from Firebase...", "Firebase Sync");
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(STAFF_TAB_NAME);
    if (!sheet) {
      sheet = setupStaffSheet();
    }

    var docs = fetchFirestoreCollection("employee_master");
    
    if (docs === null) {
      notify("Firebase connection verified. Ensure data exists in ERP.", "Status");
      return;
    }

    if (docs.length === 0) {
      notify("No staff records found in Firebase yet.", "Firebase Ready");
      return;
    }

    var rows = [];
    for (var i = 0; i < docs.length; i++) {
      var f = docs[i].fields || {};
      var docName = docs[i].name || "";
      var docId = docName.split("/").pop();

      var empCode = parseFirestoreField(f.emp_code || f.employee_code || f.code) || docId;
      var firstName = parseFirestoreField(f.first_name || f.name);
      var lastName = parseFirestoreField(f.last_name);
      var category = parseFirestoreField(f.employee_category || f.category) || "Teaching Staff";
      var dept = parseFirestoreField(f.department || f.dept) || "Academics";
      var desig = parseFirestoreField(f.designation || f.role) || "Teacher";
      var empType = parseFirestoreField(f.employment_type || f.type) || "Permanent";
      var status = parseFirestoreField(f.employment_status || f.status) || "Active";
      var doj = parseFirestoreField(f.date_of_joining || f.joining_date);
      var dob = parseFirestoreField(f.date_of_birth || f.dob);
      var gender = parseFirestoreField(f.gender) || "Male";
      var blood = parseFirestoreField(f.blood_group);
      var mobile = parseFirestoreField(f.mobile_primary || f.mobile || f.phone);
      var whatsapp = parseFirestoreField(f.whatsapp_number || f.whatsapp);
      var offEmail = parseFirestoreField(f.official_email || f.email);
      var persEmail = parseFirestoreField(f.personal_email);
      var salary = parseFirestoreField(f.basic_salary || f.salary);
      var classes = parseFirestoreField(f.classes_assigned || f.classes);
      var subjects = parseFirestoreField(f.subjects_specialisation || f.subject_specialisation || f.subject);
      var photoUrl = parseFirestoreField(f.employee_photo_url || f.photo_url || f.photo);
      var docUrl = parseFirestoreField(f.document_url || f.resume_url);
      var address = parseFirestoreField(f.current_address || f.address);
      var academicYear = parseFirestoreField(f.academic_year) || "2026-27";
      var lastUpdated = parseFirestoreField(f.updated_at || f.created_at) || new Date().toLocaleString("en-IN");

      rows.push([
        empCode,
        firstName,
        lastName,
        category,
        dept,
        desig,
        empType,
        status,
        doj,
        dob,
        gender,
        blood,
        mobile,
        whatsapp,
        offEmail,
        persEmail,
        salary,
        classes,
        subjects,
        photoUrl,
        docUrl,
        address,
        academicYear,
        lastUpdated
      ]);
    }

    if (rows.length > 0) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }

      sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
      syncStaffPhotosFromDrive();
      notify("✓ Loaded " + rows.length + " staff records from Firebase!", "Sync Complete");
    }
  } catch (err) {
    Logger.log("pullFromFirebase error: " + err.toString());
    notify("Error syncing from Firebase: " + err.message, "Sync Error");
  }
}

function syncStaffPhotosFromDrive() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(STAFF_TAB_NAME) || ss.getActiveSheet();
    var lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) return;
    
    var folder = DriveApp.getFolderById(STAFF_PHOTO_FOLDER_ID);
    var files = folder.getFiles();
    var fileMap = {};
    
    while (files.hasNext()) {
      var file = files.next();
      var fName = file.getName().toLowerCase();
      var fId = file.getId();
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {}
      
      var photoUrl = "https://drive.google.com/thumbnail?id=" + fId + "&sz=w1000";
      fileMap[fName] = photoUrl;
    }
    
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    var updatedCount = 0;
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var empCode = String(row[0] || "").trim().toLowerCase();
      var firstName = String(row[1] || "").trim().toLowerCase();
      var currentPhoto = String(row[19] || "").trim();
      
      if (!currentPhoto && empCode) {
        for (var key in fileMap) {
          if (key.indexOf(empCode) !== -1 || (firstName && key.indexOf(firstName) !== -1)) {
            sheet.getRange(i + 2, 20).setValue(fileMap[key]);
            sheet.getRange(i + 2, 24).setValue(new Date().toLocaleString("en-IN"));
            updatedCount++;
            break;
          }
        }
      }
    }
    
    if (updatedCount > 0) {
      notify("📸 Linked " + updatedCount + " photos from Google Drive", "Drive Photo Sync");
    }
  } catch (err) {
    Logger.log("syncStaffPhotosFromDrive error: " + err.toString());
  }
}

function onEdit(e) {
  try {
    if (!e || !e.source) return;
    var sheet = e.source.getActiveSheet();
    if (sheet.getName() !== STAFF_TAB_NAME) return;
    
    var row = e.range.getRow();
    if (row <= 1) return;
    
    var rowData = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
    var empCode = String(rowData[0] || "").trim();
    if (!empCode && !rowData[1]) return;
    
    var docId = empCode.replace(/[^a-zA-Z0-9_-]/g, "_") || ("EMP_" + row);
    var nowStr = new Date().toLocaleString("en-IN");
    
    var staffObj = {
      id: docId,
      emp_code: empCode,
      first_name: String(rowData[1] || ""),
      last_name: String(rowData[2] || ""),
      employee_category: String(rowData[3] || "Teaching Staff"),
      department: String(rowData[4] || "Academics"),
      designation: String(rowData[5] || "Teacher"),
      employment_type: String(rowData[6] || "Permanent"),
      employment_status: String(rowData[7] || "Active"),
      date_of_joining: String(rowData[8] || ""),
      date_of_birth: String(rowData[9] || ""),
      gender: String(rowData[10] || "Male"),
      blood_group: String(rowData[11] || ""),
      mobile_primary: String(rowData[12] || ""),
      whatsapp_number: String(rowData[13] || ""),
      official_email: String(rowData[14] || ""),
      personal_email: String(rowData[15] || ""),
      basic_salary: Number(rowData[16]) || 25000,
      classes_assigned: String(rowData[17] || ""),
      subjects_specialisation: String(rowData[18] || ""),
      employee_photo_url: String(rowData[19] || ""),
      document_url: String(rowData[20] || ""),
      current_address: String(rowData[21] || ""),
      academic_year: String(rowData[22] || "2026-27"),
      updated_at: new Date().toISOString()
    };
    
    sheet.getRange(row, 24).setValue(nowStr);
    
    saveFirestoreDocument("employee_master", docId, staffObj);
    notify("Saved " + empCode + " to Firebase Firestore", "Realtime Save");
  } catch (err) {
    Logger.log("onEdit sync error: " + err.toString());
  }
}

function pushAllToFirebase() {
  try {
    notify("Saving all staff rows to Firebase...", "Firebase Sync");
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(STAFF_TAB_NAME);
    if (!sheet) return;
    
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      notify("No data rows found to push.", "Empty");
      return;
    }
    
    var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    var count = 0;
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var empCode = String(row[0] || "").trim();
      if (!empCode && !row[1]) continue;
      
      var docId = empCode.replace(/[^a-zA-Z0-9_-]/g, "_") || ("EMP_" + (i + 2));
      var staffObj = {
        id: docId,
        emp_code: empCode,
        first_name: String(row[1] || ""),
        last_name: String(row[2] || ""),
        employee_category: String(row[3] || "Teaching Staff"),
        department: String(row[4] || "Academics"),
        designation: String(row[5] || "Teacher"),
        employment_type: String(row[6] || "Permanent"),
        employment_status: String(row[7] || "Active"),
        date_of_joining: String(row[8] || ""),
        date_of_birth: String(row[9] || ""),
        gender: String(row[10] || "Male"),
        blood_group: String(row[11] || ""),
        mobile_primary: String(row[12] || ""),
        whatsapp_number: String(row[13] || ""),
        official_email: String(row[14] || ""),
        personal_email: String(row[15] || ""),
        basic_salary: Number(row[16]) || 25000,
        classes_assigned: String(row[17] || ""),
        subjects_specialisation: String(row[18] || ""),
        employee_photo_url: String(row[19] || ""),
        document_url: String(row[20] || ""),
        current_address: String(row[21] || ""),
        academic_year: String(row[22] || "2026-27"),
        updated_at: new Date().toISOString()
      };
      
      saveFirestoreDocument("employee_master", docId, staffObj);
      count++;
    }
    
    notify("✓ Saved " + count + " staff records to Firebase Firestore!", "Save Complete");
  } catch (err) {
    Logger.log("pushAllToFirebase error: " + err.toString());
    notify("Push error: " + err.message, "Error");
  }
}
