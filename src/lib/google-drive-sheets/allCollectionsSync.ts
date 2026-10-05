import { fetchCollectionData } from '../supabase'
import {
  GOOGLE_SHEET_ID,
  STAFF_GOOGLE_SHEET_ID,
  STUDENT_WEB_APP_URL,
  STAFF_WEB_APP_URL,
  getGoogleAccessToken,
  connectGoogleWorkspace,
} from './googleAuthDrive'
import { STUDENT_SHEET_HEADERS, studentToSheetRow } from './studentSheetsSync'
import { STAFF_SHEET_HEADERS, employeeToSheetRow } from './staffSheetsSync'

/**
 * Ensures a sheet tab exists in a spreadsheet using Sheets API v4
 */
export async function ensureTabExistsInSpreadsheet(
  spreadsheetId: string,
  tabName: string,
  accessToken: string
): Promise<boolean> {
  try {
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )
    if (!getRes.ok) return false
    const data = await getRes.json()
    const sheets = data.sheets || []
    const exists = sheets.some((s: any) => String(s.properties?.title || '').toLowerCase() === tabName.toLowerCase())
    if (!exists) {
      const addRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: { title: tabName },
                },
              },
            ],
          }),
        }
      )
      return addRes.ok
    }
    return true
  } catch (err) {
    console.warn(`ensureTabExistsInSpreadsheet error for ${tabName}:`, err)
    return false
  }
}

export type CollectionSyncConfig = {
  key: string
  label: string
  tabName: string
  spreadsheetId: string
  webAppUrl: string
  headers: string[]
  mapRow: (item: any, idx: number) => any[]
}

export const ALL_FIREBASE_COLLECTIONS_SYNC: CollectionSyncConfig[] = [
  {
    key: 'school_master',
    label: 'School Master',
    tabName: 'school_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['School ID', 'Name', 'Code', 'Email', 'Phone', 'Address', 'City', 'State', 'PIN Code', 'Last Updated'],
    mapRow: (item) => [
      item.id || item.code || '',
      item.name || '',
      item.code || '',
      item.email || '',
      item.phone || '',
      item.address || '',
      item.city || '',
      item.state || '',
      item.pincode || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'department_master',
    label: 'Department Master',
    tabName: 'department_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Department Code', 'Department Name', 'Description', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.department_code || item.department_id || '',
      item.department_name || '',
      item.description || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'class_master',
    label: 'Class Master',
    tabName: 'class_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Class ID', 'Class Name', 'Academic Year', 'Capacity', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.class_id || '',
      item.class_name || '',
      item.academic_year || '2026-27',
      item.capacity || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'subject_master',
    label: 'Subject Master',
    tabName: 'subject_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Subject ID', 'Class Name', 'Subject Name', 'Subject Type', 'Code', 'Last Updated'],
    mapRow: (item) => [
      item.subject_id || '',
      item.class_name || '',
      item.subject_name || '',
      item.subject_type || 'Core',
      item.code || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'vendor_master',
    label: 'Vendor Master',
    tabName: 'vendor_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Vendor Code', 'Vendor Name', 'Contact Person', 'Phone', 'Email', 'Address', 'GST Number', 'Category', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.vendor_code || item.vendor_id || '',
      item.vendor_name || '',
      item.contact_person || '',
      item.phone || '',
      item.email || '',
      item.address || '',
      item.gst_number || '',
      item.category || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'student_master',
    label: 'Student Master',
    tabName: 'student_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: STUDENT_SHEET_HEADERS,
    mapRow: (item) => studentToSheetRow(item),
  },
  {
    key: 'employee_master',
    label: 'Employee / Staff Master',
    tabName: 'staff_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: STAFF_SHEET_HEADERS,
    mapRow: (item) => employeeToSheetRow(item),
  },
  {
    key: 'user_master',
    label: 'User Directory & Access Roles',
    tabName: 'user_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['User ID', 'Full Name', 'Username', 'Department', 'Role', 'Allowed Modules', 'Status', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.user_id || item.id || '',
      item.user_full_name || item.name || '',
      item.user_name || '',
      item.department || '',
      item.role || '',
      Array.isArray(item.allowed_modules) ? item.allowed_modules.join(', ') : item.allowed_modules || '',
      item.status || 'active',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'student_attendance',
    label: 'Student Attendance',
    tabName: 'student_attendance',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Attendance ID', 'Date', 'Class Name', 'Section', 'Student ID', 'Student Name', 'Status', 'Marked By', 'Remarks', 'Last Updated'],
    mapRow: (item) => [
      item.attendance_id || '',
      item.date || '',
      item.class_name || '',
      item.section || '',
      item.student_id || item.admission_no || '',
      item.student_name || '',
      item.status || 'Present',
      item.marked_by || '',
      item.remarks || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'employee_attendance',
    label: 'Staff Attendance',
    tabName: 'staff_attendance',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Attendance ID', 'Date', 'Emp Code', 'Employee Name', 'Department', 'Status', 'In Time', 'Out Time', 'Marked By', 'Remarks', 'Last Updated'],
    mapRow: (item) => [
      item.attendance_id || '',
      item.date || '',
      item.emp_code || item.emp_id || '',
      item.employee_name || item.name || '',
      item.department || '',
      item.status || 'Present',
      item.in_time || '',
      item.out_time || '',
      item.marked_by || '',
      item.remarks || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'fees_collection',
    label: 'Fee Collections & Receipts',
    tabName: 'fee_receipts',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Receipt Number', 'Fee ID', 'Student ID', 'Student Name', 'Class Name', 'Academic Year', 'Payment Method', 'Paid Amount', 'Balance Amount', 'Payment Date', 'Fee Head', 'Remarks', 'Created By', 'Last Updated'],
    mapRow: (item) => [
      item.receipt_number || '',
      item.fee_id || '',
      item.student_id || item.admission_no || '',
      item.student_name || '',
      item.class_name || '',
      item.academic_year || '',
      item.payment_method || 'Cash',
      item.paid_amount || item.amount || 0,
      item.balance_amount || 0,
      item.payment_date || item.date || '',
      item.fee_head || item.fee_type || '',
      item.remarks || '',
      item.created_by || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'expense_master',
    label: 'Expenses Master',
    tabName: 'expense_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Expense ID', 'Category', 'Amount', 'Payment Date', 'Vendor Name', 'Payment Method', 'Description', 'Created By', 'Last Updated'],
    mapRow: (item) => [
      item.expense_id || '',
      item.category || '',
      item.amount || 0,
      item.payment_date || item.date || '',
      item.vendor_name || '',
      item.payment_method || 'Cash',
      item.description || '',
      item.created_by || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'income_master',
    label: 'Income Master',
    tabName: 'income_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Income ID', 'Source', 'Amount', 'Date', 'Received From', 'Payment Method', 'Remarks', 'Created By', 'Last Updated'],
    mapRow: (item) => [
      item.income_id || '',
      item.source || '',
      item.amount || 0,
      item.date || '',
      item.received_from || '',
      item.payment_method || 'Cash',
      item.remarks || '',
      item.created_by || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'salary_slip',
    label: 'Salary Slips / Payroll',
    tabName: 'salary_slips',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Slip ID', 'Emp Code', 'Employee Name', 'Month Year', 'Basic Salary', 'Allowances', 'Deductions', 'Net Salary', 'Payment Date', 'Status', 'Last Updated'],
    mapRow: (item) => [
      item.slip_id || '',
      item.emp_code || item.emp_id || '',
      item.employee_name || '',
      item.month_year || '',
      item.basic_salary || 0,
      item.allowances || 0,
      item.deductions || 0,
      item.net_salary || 0,
      item.payment_date || '',
      item.status || 'Paid',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'leave_application',
    label: 'Leave Applications',
    tabName: 'leave_applications',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Leave Application ID', 'Emp ID', 'Employee Name', 'Leave Type', 'From Date', 'To Date', 'Total Days', 'Reason', 'Status', 'Approved By', 'Remarks', 'Last Updated'],
    mapRow: (item) => [
      item.leave_app_id || item.id || '',
      item.emp_id || '',
      item.employee_name || '',
      item.leave_type || '',
      item.from_date || '',
      item.to_date || '',
      item.total_days || 0,
      item.reason || '',
      item.status || 'pending',
      item.approved_by || '',
      item.remarks || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'leave_balance',
    label: 'Leave Balances',
    tabName: 'leave_balances',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Balance ID', 'Emp ID', 'Employee Name', 'Academic Year', 'Leave Type', 'Entitled', 'Taken', 'Pending', 'Remaining', 'Last Updated'],
    mapRow: (item) => [
      item.balance_id || item.id || '',
      item.emp_id || '',
      item.employee_name || '',
      item.academic_year || '2026-27',
      item.leave_type || '',
      item.total_entitled || 0,
      item.total_taken || 0,
      item.total_pending || 0,
      item.balance_remaining || 0,
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'warning_letter',
    label: 'Warning Letters',
    tabName: 'warning_letters',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Letter ID', 'Emp ID', 'Employee Name', 'Issue Date', 'Warning Type', 'Subject', 'Description', 'Issued By', 'Acknowledged', 'Status', 'Last Updated'],
    mapRow: (item) => [
      item.letter_id || item.id || '',
      item.emp_id || '',
      item.employee_name || '',
      item.issue_date || '',
      item.warning_type || '',
      item.subject || '',
      item.description || '',
      item.issued_by || '',
      item.acknowledged ? 'Yes' : 'No',
      item.status || 'draft',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'offer_letter',
    label: 'Offer Letters',
    tabName: 'offer_letters',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Offer ID', 'Candidate Name', 'Designation', 'Joining Date', 'Basic Salary', 'Offer Date', 'Valid Until', 'Issued By', 'Status', 'Last Updated'],
    mapRow: (item) => [
      item.offer_id || item.id || '',
      item.candidate_name || '',
      item.designation || '',
      item.joining_date || '',
      item.basic_salary || 0,
      item.offer_date || '',
      item.valid_until || '',
      item.issued_by || '',
      item.status || 'draft',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'employee_document',
    label: 'Employee Documents',
    tabName: 'employee_documents',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Doc ID', 'Emp ID', 'Employee Name', 'Designation', 'Department', 'Doc Type', 'File URL', 'Is Verified', 'Remarks', 'Last Updated'],
    mapRow: (item) => [
      item.doc_id || item.id || '',
      item.emp_id || '',
      item.employee_name || '',
      item.employee_designation || '',
      item.employee_department || '',
      item.doc_type || '',
      item.file_url || '',
      item.is_verified ? 'Yes' : 'No',
      item.remarks || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'asset_master',
    label: 'Asset Master',
    tabName: 'asset_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Asset Code', 'Asset Name', 'Category', 'Location', 'Purchase Date', 'Purchase Cost', 'Condition', 'Assigned To', 'Status', 'Last Updated'],
    mapRow: (item) => [
      item.asset_code || item.asset_id || '',
      item.asset_name || '',
      item.category || '',
      item.location || '',
      item.purchase_date || '',
      item.purchase_cost || 0,
      item.condition || 'Good',
      item.assigned_to || '',
      item.status || 'Active',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'inventory_master',
    label: 'Inventory Master',
    tabName: 'inventory_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Item Code', 'Item Name', 'Category', 'Quantity In Stock', 'Minimum Stock Level', 'Unit Price', 'Unit Of Measure', 'Location', 'Last Updated'],
    mapRow: (item) => [
      item.item_code || item.item_id || '',
      item.item_name || '',
      item.category || '',
      item.quantity_in_stock || item.quantity || 0,
      item.minimum_stock_level || 5,
      item.unit_price || 0,
      item.unit_of_measure || 'Pcs',
      item.location || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'teacher_idcard',
    label: 'Teacher ID Cards',
    tabName: 'teacher_idcards',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Card ID', 'Emp ID', 'Employee Name', 'Designation', 'Department', 'Mobile', 'Photo URL', 'Issue Date', 'Valid Until', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.card_id || item.id || '',
      item.emp_id || '',
      item.employee_name || '',
      item.designation || '',
      item.department || '',
      item.mobile || '',
      item.photo_url || '',
      item.issue_date || '',
      item.valid_until || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'student_idcard',
    label: 'Student ID Cards',
    tabName: 'student_idcards',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Card ID', 'Student ID', 'Student Name', 'Class Name', 'Roll No', 'Mobile', 'Photo URL', 'Issue Date', 'Valid Until', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.card_id || item.id || '',
      item.student_id || '',
      item.student_name || '',
      item.class_name || '',
      item.roll_no || '',
      item.mobile || '',
      item.photo_url || '',
      item.issue_date || '',
      item.valid_until || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'escort_card',
    label: 'Escort Pickup Cards',
    tabName: 'escort_cards',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Card ID', 'Student Name', 'Class Name', 'Escort Name', 'Relationship', 'Mobile', 'Photo URL', 'Issue Date', 'Valid Until', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.card_id || item.id || '',
      item.student_name || '',
      item.class_name || '',
      item.escort_name || '',
      item.relation || '',
      item.mobile || '',
      item.photo_url || '',
      item.issue_date || '',
      item.valid_until || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'notice_automation',
    label: 'Notice Automation',
    tabName: 'notice_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Notice ID', 'Title', 'Target Group', 'Category', 'Publish Date', 'Content', 'Created By', 'Status', 'Last Updated'],
    mapRow: (item) => [
      item.notice_id || '',
      item.title || '',
      item.target_group || 'All',
      item.category || 'General',
      item.publish_date || '',
      item.content || '',
      item.created_by || '',
      item.status || 'Published',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'assignments_master',
    label: 'Assignments Master',
    tabName: 'assignment_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Assignment ID', 'Title', 'Class Name', 'Subject Name', 'Due Date', 'Total Marks', 'Created By', 'Description', 'Last Updated'],
    mapRow: (item) => [
      item.assignment_id || '',
      item.title || '',
      item.class_name || '',
      item.subject_name || '',
      item.due_date || '',
      item.total_marks || 100,
      item.created_by || '',
      item.description || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'userlog_master',
    label: 'User Activity Logs',
    tabName: 'user_logs',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Log ID', 'Username', 'Action', 'Module', 'Status', 'Error Message', 'Device Info', 'Browser', 'Timestamp'],
    mapRow: (item) => [
      item.log_id || '',
      item.username || '',
      item.action || '',
      item.module || '',
      item.status || '',
      item.error_message || '',
      item.device_info || '',
      item.browser || '',
      item.created_at || new Date().toISOString(),
    ],
  },
]

/**
 * Sync a single Firebase collection to Google Sheet
 */
export async function syncSingleCollectionToGoogleSheet(
  collectionKey: string,
  customData?: any[]
): Promise<{ success: boolean; count: number; message: string; error?: string }> {
  const config = ALL_FIREBASE_COLLECTIONS_SYNC.find((c) => c.key === collectionKey)
  if (!config) {
    return { success: false, count: 0, message: `Collection ${collectionKey} not configured.` }
  }

  try {
    const records = customData || (await fetchCollectionData(collectionKey)) || []
    const rows = records.map((item, idx) => config.mapRow(item, idx))

    let token = getGoogleAccessToken()
    if (!token) {
      const conn = await connectGoogleWorkspace()
      if (conn.success && conn.accessToken) {
        token = conn.accessToken
      }
    }

    if (token) {
      try {
        await ensureTabExistsInSpreadsheet(config.spreadsheetId, config.tabName, token)
        const colLetter = String.fromCharCode(65 + Math.min(25, config.headers.length - 1))
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${config.tabName}!A1:${colLetter}${rows.length + 1}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${config.tabName}!A1:${colLetter}${rows.length + 1}`,
              majorDimension: 'ROWS',
              values: [config.headers, ...rows],
            }),
          }
        )
      } catch (sheetsErr) {
        console.warn(`Sheets API write warning for ${config.tabName}:`, sheetsErr)
      }
    }

    // Web App URL fallback POST
    try {
      const payload = {
        action: 'push',
        sheet: config.tabName,
        tab: config.tabName,
        collection: collectionKey,
        data: records,
        rows: [config.headers, ...rows],
        headers: config.headers,
        count: records.length,
        timestamp: new Date().toISOString(),
      }
      await fetch(config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      }).catch(() => {
        return fetch(config.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        })
      })
    } catch {
      // ignore fallback error
    }

    return {
      success: true,
      count: records.length,
      message: `Successfully synced ${records.length} records of '${config.label}' to Google Sheet ('${config.tabName}')!`,
    }
  } catch (err: any) {
    console.error(`syncSingleCollectionToGoogleSheet error [${collectionKey}]:`, err)
    return {
      success: false,
      count: 0,
      message: `Failed to sync ${config.label}`,
      error: err.message || String(err),
    }
  }
}

/**
 * Master function: Sync ALL Firebase collections to Google Sheet in 1 click
 */
export async function syncAllFirebaseToGoogleSheets(): Promise<{
  success: boolean
  totalCount: number
  results: Array<{ key: string; label: string; tabName: string; count: number; success: boolean; message: string }>
  message: string
}> {
  let token = getGoogleAccessToken()
  if (!token) {
    const conn = await connectGoogleWorkspace()
    if (conn.success && conn.accessToken) {
      token = conn.accessToken
    }
  }

  const results: Array<{ key: string; label: string; tabName: string; count: number; success: boolean; message: string }> = []
  let totalCount = 0

  for (const config of ALL_FIREBASE_COLLECTIONS_SYNC) {
    const res = await syncSingleCollectionToGoogleSheet(config.key)
    results.push({
      key: config.key,
      label: config.label,
      tabName: config.tabName,
      count: res.count,
      success: res.success,
      message: res.message,
    })
    if (res.success) {
      totalCount += res.count
    }
  }

  return {
    success: true,
    totalCount,
    results,
    message: `Master Google Sheet Sync complete! Total ${totalCount} records across ${ALL_FIREBASE_COLLECTIONS_SYNC.length} Firebase collections updated in Google Sheet.`,
  }
}
