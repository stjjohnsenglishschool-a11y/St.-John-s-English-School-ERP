/**
 * Google Apps Script for St. John's English School - Student Data Realtime Sync
 * 
 * Target Spreadsheet: 1OGD09mG-m54rSKBJl2nmOc-pFraYZRnMcCTyoAEWGto
 * Target Sheet Tab: student_data
 * Target Photo Drive Folder: 19EmUMwDpNxuufOr995XPsg_XoG-BqZWO (student_data_photo)
 * 
 * How to use:
 * 1. In your Google Sheet, click Extensions -> Apps Script
 * 2. Replace any existing code with this script
 * 3. Save (Ctrl+S) and run `initializeStudentSheet()` once to setup headers
 */

const SPREADSHEET_ID = '1OGD09mG-m54rSKBJl2nmOc-pFraYZRnMcCTyoAEWGto';
const SHEET_TAB_NAME = 'student_data';
const PHOTO_FOLDER_ID = '19EmUMwDpNxuufOr995XPsg_XoG-BqZWO';

const HEADERS = [
  'Admission No',
  'Roll No',
  'Academic Year',
  'Class Name',
  'Section',
  'Student Status',
  'Full Name',
  'Date of Birth',
  'Gender',
  'Blood Group',
  'Student Mobile',
  'Student Photo URL',
  'Father Name',
  'Father Mobile',
  'Father Occupation',
  'Father Photo URL',
  'Mother Name',
  'Mother Mobile',
  'Mother Occupation',
  'Mother Photo URL',
  'Address',
  'Last Updated'
];

/**
 * Initializes the 'student_data' sheet tab and formats the header row neatly
 */
function initializeStudentSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_TAB_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TAB_NAME);
  }
  
  // Set headers in row 1
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  
  // Format Header styling
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground('#1e3a8a'); // Dark Navy
  headerRange.setFontColor('#ffffff'); // White text
  headerRange.setFontWeight('bold');
  headerRange.setFontFamily('Arial');
  headerRange.setFontSize(11);
  headerRange.setHorizontalAlignment('center');
  
  // Freeze top row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns for readability
  for (let i = 1; i <= HEADERS.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  Logger.log('Student sheet initialized successfully with standard headers!');
}

/**
 * Web App Endpoint (Optional doPost / doGet for direct external webhooks)
 */
function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_TAB_NAME);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', rows: data.length - 1 }))
    .setMimeType(ContentService.MimeType.JSON);
}
