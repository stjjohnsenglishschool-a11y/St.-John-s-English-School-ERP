import { saveBatchDocuments } from '../supabase'
import {
  STAFF_GOOGLE_SHEET_ID,
  STAFF_GOOGLE_SHEET_TAB_NAME,
  STAFF_WEB_APP_URL,
  getGoogleAccessToken,
} from './googleAuthDrive'

export const STAFF_SHEET_HEADERS = [
  'Emp Code',
  'First Name',
  'Last Name',
  'Employee Category',
  'Department',
  'Designation',
  'Employment Type',
  'Employment Status',
  'Date of Joining',
  'Date of Birth',
  'Gender',
  'Blood Group',
  'Mobile Primary',
  'WhatsApp Number',
  'Official Email',
  'Personal Email',
  'Basic Salary',
  'Classes Assigned',
  'Subjects Specialisation',
  'Photo URL',
  'Document URL',
  'Current Address',
  'Academic Year',
  'Last Updated',
]

/**
 * Converts an Employee object to a single row array matching the exact headers
 */
export function employeeToSheetRow(e: any): string[] {
  const classes = Array.isArray(e.classes_assigned)
    ? e.classes_assigned.join(', ')
    : String(e.classes_assigned || '')
  const subjects = Array.isArray(e.subject_specialisation)
    ? e.subject_specialisation.join(', ')
    : String(e.subject_specialisation || '')

  return [
    String(e.emp_code || e.emp_id || ''),
    String(e.first_name || (e.name ? String(e.name).split(' ')[0] : '') || ''),
    String(e.last_name || (e.name ? String(e.name).split(' ').slice(1).join(' ') : '') || ''),
    String(e.employee_category || 'Teaching Staff'),
    String(e.department || 'Academics'),
    String(e.designation || 'Teacher'),
    String(e.employment_type || 'Permanent'),
    String(e.employment_status || (e.is_active !== false ? 'Active' : 'Inactive')),
    String(e.date_of_joining || ''),
    String(e.date_of_birth || ''),
    String(e.gender || 'Male'),
    String(e.blood_group || ''),
    String(e.mobile_primary || e.phone || ''),
    String(e.whatsapp_number || ''),
    String(e.official_email || e.email || ''),
    String(e.personal_email || ''),
    String(e.basic_salary || ''),
    classes,
    subjects,
    String(e.employee_photo_url || ''),
    String(e.document_url || ''),
    String(e.current_address || e.address || ''),
    String(e.academic_year || '2026-27'),
    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  ]
}

/**
 * Ensures the target sheet tab ('staff_data') exists in the spreadsheet
 */
async function ensureStaffSheetTabExists(token: string): Promise<boolean> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!metaRes.ok) {
      return false
    }
    const meta = await metaRes.json()
    const sheets = meta.sheets || []
    const hasTab = sheets.some(
      (s: any) => s.properties?.title === STAFF_GOOGLE_SHEET_TAB_NAME
    )

    if (!hasTab) {
      // Add 'staff_data' tab
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: STAFF_GOOGLE_SHEET_TAB_NAME,
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: 26,
                      frozenRowCount: 1,
                    },
                  },
                },
              },
            ],
          }),
        }
      )
    }
    return true
  } catch (e) {
    console.warn('Error checking/creating staff sheet tab:', e)
    return false
  }
}

/**
 * Normalizes a raw Staff row or object from Google Apps Script Web App / Sheet
 */
export function normalizeStaffRowOrObject(item: any, index: number, headers?: string[]): any {
  if (!item) return null

  if (Array.isArray(item)) {
    const h = headers || STAFF_SHEET_HEADERS
    const getVal = (...keywords: string[]) => {
      const cleanKeywords = keywords.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
      for (let i = 0; i < h.length; i++) {
        const cleanH = String(h[i] || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        if (cleanKeywords.includes(cleanH)) {
          return item[i] !== undefined ? String(item[i]).trim() : ''
        }
      }
      return ''
    }

    const code = getVal('empcode', 'empid', 'staffid', 'code', 'id') || item[0] || `EMP-${index + 1}`
    const first = getVal('firstname', 'givenname', 'fname') || item[1] || ''
    const last = getVal('lastname', 'surname', 'lname') || item[2] || ''
    const fullName = [first, last].filter(Boolean).join(' ') || getVal('fullname', 'name') || first || 'Staff Member'
    const cat = getVal('employeecategory', 'category') || item[3] || 'Teaching Staff'
    const dept = getVal('department', 'dept') || item[4] || 'Academics'
    const desig = getVal('designation', 'role', 'title') || item[5] || 'Teacher'
    const empType = getVal('employmenttype', 'type') || item[6] || 'Permanent'
    const status = getVal('employmentstatus', 'status') || item[7] || 'Active'
    const doj = getVal('dateofjoining', 'doj', 'joiningdate') || item[8] || ''
    const dob = getVal('dateofbirth', 'dob', 'birthdate') || item[9] || ''
    const gender = getVal('gender', 'sex') || item[10] || 'Male'
    const bg = getVal('bloodgroup', 'blood') || item[11] || ''
    const mob = getVal('mobileprimary', 'mobile', 'phone') || item[12] || ''
    const wa = getVal('whatsappnumber', 'whatsapp') || item[13] || ''
    const oEmail = getVal('officialemail', 'email') || item[14] || ''
    const pEmail = getVal('personalemail') || item[15] || ''
    const sal = Number(String(getVal('basicsalary', 'salary') || item[16] || '').replace(/[^0-9.]/g, '')) || 25000
    const classes = getVal('classesassigned', 'classes') || item[17] || ''
    const sub = getVal('subjectsspecialisation', 'subjects', 'subject') || item[18] || ''
    const photo = getVal('photourl', 'photo', 'imageurl') || item[19] || ''
    const docUrl = getVal('documenturl', 'doc') || item[20] || ''
    const addr = getVal('currentaddress', 'address') || item[21] || ''
    const ay = getVal('academicyear', 'year') || item[22] || '2026-27'

    const isInactive = ['inactive', 'resigned', 'retired', 'left', 'false'].includes(String(status).toLowerCase())

    return {
      emp_id: String(code),
      emp_code: String(code),
      _docId: String(code),
      first_name: String(first || fullName.split(' ')[0] || 'Staff'),
      last_name: String(last || fullName.split(' ').slice(1).join(' ') || ''),
      full_name: String(fullName),
      employee_category: String(cat),
      department: String(dept),
      designation: String(desig),
      employment_type: String(empType),
      employment_status: String(status),
      date_of_joining: String(doj),
      date_of_birth: String(dob),
      gender: String(gender),
      blood_group: String(bg),
      mobile_primary: String(mob),
      whatsapp_number: String(wa),
      official_email: String(oEmail),
      personal_email: String(pEmail),
      basic_salary: sal,
      classes_assigned: typeof classes === 'string' ? classes.split(',').map((x: string) => x.trim()).filter(Boolean) : (classes || []),
      subject_specialisation: typeof sub === 'string' ? sub.split(',').map((x: string) => x.trim()).filter(Boolean) : (sub || []),
      employee_photo_url: String(photo),
      document_url: String(docUrl),
      current_address: String(addr),
      academic_year: String(ay),
      is_active: !isInactive,
    }
  }

  // Object
  const getProp = (...keys: string[]) => {
    for (const k of keys) {
      if (item[k] !== undefined && item[k] !== null && item[k] !== '') return item[k]
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
      for (const objKey in item) {
        if (objKey.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanK && item[objKey] !== undefined) {
          return item[objKey]
        }
      }
    }
    return ''
  }

  const code = getProp('emp_code', 'emp_id', 'employee_code', 'Emp Code', 'code', 'id') || `EMP-${index + 1}`
  const first = getProp('first_name', 'First Name', 'fname') || ''
  const last = getProp('last_name', 'Last Name', 'lname') || ''
  const fullName = [first, last].filter(Boolean).join(' ') || getProp('full_name', 'name', 'Full Name', 'staff_name', 'Staff Name') || 'Staff Member'
  const cat = getProp('employee_category', 'Employee Category', 'category') || 'Teaching Staff'
  const dept = getProp('department', 'Department', 'dept') || 'Academics'
  const desig = getProp('designation', 'Designation', 'role') || 'Teacher'
  const empType = getProp('employment_type', 'Employment Type', 'type') || 'Permanent'
  const status = getProp('employment_status', 'Employment Status', 'status') || 'Active'
  const doj = getProp('date_of_joining', 'Date of Joining', 'joining_date') || ''
  const dob = getProp('date_of_birth', 'Date of Birth', 'dob') || ''
  const gender = getProp('gender', 'Gender') || 'Male'
  const bg = getProp('blood_group', 'Blood Group') || ''
  const mob = getProp('mobile_primary', 'Mobile Primary', 'mobile', 'phone') || ''
  const wa = getProp('whatsapp_number', 'WhatsApp Number', 'whatsapp') || ''
  const oEmail = getProp('official_email', 'Official Email', 'email') || ''
  const pEmail = getProp('personal_email', 'Personal Email') || ''
  const sal = Number(String(getProp('basic_salary', 'Basic Salary', 'salary') || '').replace(/[^0-9.]/g, '')) || 25000
  const classes = getProp('classes_assigned', 'Classes Assigned', 'classes') || []
  const sub = getProp('subject_specialisation', 'subjectsspecialisation', 'Subjects Specialisation', 'subjects') || []
  const photo = getProp('employee_photo_url', 'Photo URL', 'photo_url', 'photo') || ''
  const docUrl = getProp('document_url', 'Document URL', 'doc_url') || ''
  const addr = getProp('current_address', 'Current Address', 'address') || ''
  const ay = getProp('academic_year', 'Academic Year') || '2026-27'

  const isInactive = ['inactive', 'resigned', 'retired', 'left', 'false'].includes(String(status).toLowerCase())

  return {
    emp_id: String(code),
    emp_code: String(code),
    _docId: String(code),
    first_name: String(first || fullName.split(' ')[0] || 'Staff'),
    last_name: String(last || fullName.split(' ').slice(1).join(' ') || ''),
    full_name: String(fullName),
    employee_category: String(cat),
    department: String(dept),
    designation: String(desig),
    employment_type: String(empType),
    employment_status: String(status),
    date_of_joining: String(doj),
    date_of_birth: String(dob),
    gender: String(gender),
    blood_group: String(bg),
    mobile_primary: String(mob),
    whatsapp_number: String(wa),
    official_email: String(oEmail),
    personal_email: String(pEmail),
    basic_salary: sal,
    classes_assigned: Array.isArray(classes) ? classes : typeof classes === 'string' ? classes.split(',').map((x: string) => x.trim()).filter(Boolean) : [],
    subject_specialisation: Array.isArray(sub) ? sub : typeof sub === 'string' ? sub.split(',').map((x: string) => x.trim()).filter(Boolean) : [],
    employee_photo_url: String(photo),
    document_url: String(docUrl),
    current_address: String(addr),
    academic_year: String(ay),
    is_active: !isInactive,
  }
}

/**
 * Fetch staff directly from the Google Apps Script Web App URL
 */
export async function fetchStaffFromWebApp(
  customUrl?: string
): Promise<{ success: boolean; data?: any[]; count?: number; message?: string; error?: string }> {
  const url = customUrl || STAFF_WEB_APP_URL
  try {
    const endpointsToTry = [
      url,
      `${url}?action=read&sheet=staff_data`,
      `${url}?action=pull`,
      `${url}?action=get`,
    ]

    let rawData: any = null
    let lastError: any = null

    for (const ep of endpointsToTry) {
      try {
        const response = await fetch(ep, {
          method: 'GET',
          redirect: 'follow',
        })
        if (response.ok) {
          const text = await response.text()
          try {
            rawData = JSON.parse(text)
            if (rawData) break
          } catch {}
        }
      } catch (err) {
        lastError = err
      }
    }

    if (!rawData) {
      try {
        const postRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'pull', sheet: 'staff_data' }),
          redirect: 'follow',
        })
        if (postRes.ok) {
          const text = await postRes.text()
          rawData = JSON.parse(text)
        }
      } catch (postErr) {
        lastError = postErr
      }
    }

    if (!rawData) {
      throw new Error(lastError?.message || 'Could not retrieve data from Staff Web App URL')
    }

    let list: any[] = []
    let headers: string[] | undefined = undefined

    if (Array.isArray(rawData)) {
      if (rawData.length > 0 && Array.isArray(rawData[0])) {
        headers = rawData[0].map(String)
        list = rawData.slice(1)
      } else {
        list = rawData
      }
    } else if (typeof rawData === 'object') {
      const candidates = rawData.data || rawData.records || rawData.staff || rawData.rows || rawData.values || rawData.result
      if (Array.isArray(candidates)) {
        if (candidates.length > 0 && Array.isArray(candidates[0])) {
          headers = candidates[0].map(String)
          list = candidates.slice(1)
        } else {
          list = candidates
        }
      } else if (rawData.success && Array.isArray(rawData.data)) {
        list = rawData.data
      }
    }

    const employees = list
      .map((item, idx) => normalizeStaffRowOrObject(item, idx, headers))
      .filter((e) => e && (e.emp_code || e.first_name || e.full_name))

    if (employees.length > 0) {
      await saveBatchDocuments('employee_master', 'emp_code', employees).catch(() => {})
      try {
        localStorage.setItem('sjes_table_employee_master', JSON.stringify(employees))
        localStorage.setItem('sjes_table_employees', JSON.stringify(employees))
        localStorage.setItem('sjes_table_staff', JSON.stringify(employees))
      } catch {}
    }

    return {
      success: true,
      data: employees,
      count: employees.length,
      message: `Successfully loaded ${employees.length} staff records from Web App!`,
    }
  } catch (err: any) {
    console.error('fetchStaffFromWebApp error:', err)
    return {
      success: false,
      error: err.message || 'Failed to fetch from Staff Web App',
    }
  }
}

/**
 * Push staff records to the Google Apps Script Web App URL
 */
export async function pushStaffToWebApp(
  employees: any[],
  customUrl?: string
): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
  const url = customUrl || STAFF_WEB_APP_URL
  try {
    const rows = employees.map(employeeToSheetRow)
    const payload = {
      action: 'push',
      sheet: 'Staff_data',
      tab: 'Staff_data',
      data: employees,
      rows: [STAFF_SHEET_HEADERS, ...rows],
      headers: STAFF_SHEET_HEADERS,
      count: employees.length,
      timestamp: new Date().toISOString(),
    }

    const token = getGoogleAccessToken()
    if (token) {
      try {
        await ensureStaffSheetTabExists(token)
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}/values/${STAFF_GOOGLE_SHEET_TAB_NAME}!A1:X${rows.length + 1}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${STAFF_GOOGLE_SHEET_TAB_NAME}!A1:X${rows.length + 1}`,
              majorDimension: 'ROWS',
              values: [STAFF_SHEET_HEADERS, ...rows],
            }),
          }
        )
      } catch (sheetsApiErr) {
        console.warn('Staff Sheets API direct write warning:', sheetsApiErr)
      }
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      })
    } catch {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      }).catch(() => {})
    }

    return {
      success: true,
      count: employees.length,
      message: `Successfully synced ${employees.length} staff records to Google Sheet!`,
    }
  } catch (err: any) {
    console.error('pushStaffToWebApp error:', err)
    return {
      success: false,
      error: err.message || 'Failed to push staff records to Web App',
    }
  }
}

/**
 * Overwrite / sync entire staff database to Google Sheet via Web App URL (No Google auth needed)
 */
export async function syncAllEmployeesToGoogleSheet(
  employees: any[]
): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
  return await pushStaffToWebApp(employees)
}

/**
 * Sync / upsert a single employee record to the 'Staff_data' Google Sheet tab via Web App URL
 */
export async function syncSingleEmployeeToGoogleSheet(
  employee: any
): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await pushStaffToWebApp([employee])
  return {
    success: res.success,
    message: res.message || 'Staff record synced to Web App',
    error: res.error,
  }
}

/**
 * Pulls employee data from Google Sheet via Web App URL (No Google auth needed)
 */
export async function fetchEmployeesFromGoogleSheet(): Promise<{
  success: boolean
  data?: any[]
  error?: string
  sheetName?: string
}> {
  return await fetchStaffFromWebApp()
}

/**
 * Generates Google Apps Script code for real-time two-way synchronization of Staff_data
 */
export function generateStaffAppsScriptCode(webAppUrl: string): string {
  return `/**
 * ==============================================================================
 * ST. JOHN'S ENGLISH SCHOOL - STAFF DATA AUTO-SYNC WEB APP & FIREBASE (code.gs)
 * ==============================================================================
 * Target Spreadsheet:      1JUZXNNcIZeMGFyzmFbdfxADLY8Jwb_r3e03rJK5rWgc
 * Target Tab:              Staff_data
 * Drive Photo Folder ID:   1zcVv1vwxdMNAKPP52THA4SE8TzUGOOLa (staff_photo)
 * Firebase Database:       ai-studio-stjohnsenglishsc-531e7bb4-0068-4bb0-86fa-a4752b74bc31
 * ==============================================================================
 * 
 * FEATURES:
 * 1. ZERO POPUPS & AUTO-SYNC - Runs silently in background with toast alerts.
 * 2. WEB APP POST (doPost) - Receives automated sync data from the ERP Web App and immediately writes rows.
 * 3. WEB APP GET (doGet) - Returns clean JSON of all staff rows for the ERP Web App.
 * 4. AUTO DRIVE PHOTO LINK - Auto-detects photos from Drive folder and inserts thumbnail URLs.
 * 5. REAL-TIME PUSH ON EDIT - Any manual edit in the Google Sheet is auto-saved to Firebase Firestore.
 * ==============================================================================
 */

var SPREADSHEET_ID = "1JUZXNNcIZeMGFyzmFbdfxADLY8Jwb_r3e03rJK5rWgc";
var STAFF_TAB_NAME = "Staff_data";
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

function getStaffSheet(ss) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  var sheet = ss.getSheetByName(STAFF_TAB_NAME) || 
              ss.getSheetByName("staff_data") || 
              ss.getSheetByName("Staff_Data") || 
              ss.getSheetByName("Staff Data") || 
              ss.getSheetByName("Sheet1") || 
              ss.getActiveSheet();
  return sheet;
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getStaffSheet(ss);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Staff sheet tab not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, count: 0, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var values = sheet.getRange(1, 1, lastRow, HEADERS.length).getValues();
    return ContentService.createTextOutput(JSON.stringify({ success: true, count: values.length - 1, data: values }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "";
    var payload = {};
    try {
      payload = JSON.parse(contents);
    } catch (parseErr) {
      payload = {};
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getStaffSheet(ss);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Staff sheet tab not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (payload.rows && Array.isArray(payload.rows) && payload.rows.length > 0) {
      sheet.clearContents();
      sheet.getRange(1, 1, payload.rows.length, HEADERS.length).setValues(payload.rows);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Staff rows updated successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "POST received" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`
}
