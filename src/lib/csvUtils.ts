import { Field, Module, label, moduleName } from '../modules'
import { getCurrentAcademicYear } from './academicYear'

/**
 * Standard aliases map for common column variations
 */
const COMMON_ALIASES: Record<string, string[]> = {
  department_name: ['dept_name', 'department', 'name', 'dept'],
  department_code: ['dept_code', 'code', 'dept_no', 'department_id_code'],
  class_name: ['class', 'std', 'standard', 'grade'],
  academic_year: ['year', 'session', 'ay'],
  capacity: ['intake', 'total_seats', 'seats', 'strength'],
  subject_name: ['subject', 'course', 'sub_name'],
  subject_type: ['type', 'category'],
  full_name: ['student_name', 'employee_name', 'staff_name', 'emp_name', 'teacher_name', 'name', 'candidate_name', 'applicant_name', 'faculty_name'],
  admission_no: ['admission_number', 'adm_no', 'adm_number', 'reg_no', 'registration_no'],
  roll_no: ['roll_number', 'roll', 'class_roll'],
  date_of_birth: ['dob', 'birth_date', 'birthdate'],
  mobile_primary: ['mobile', 'phone', 'contact', 'mobile_no', 'phone_no', 'primary_mobile', 'contact_no'],
  official_email: ['email', 'email_id', 'work_email', 'school_email', 'official_email_id'],
  personal_email: ['personal_email_id', 'alternate_email'],
  gender: ['sex'],
  blood_group: ['blood_grp', 'blood'],
  first_name: ['fname', 'given_name', 'first', 'first_name'],
  last_name: ['lname', 'surname', 'family_name', 'last', 'last_name'],
  emp_code: ['employee_code', 'emp_no', 'staff_id', 'employee_id', 'emp_id', 'code'],
  employee_category: ['staff_category', 'category', 'type'],
  designation: ['post', 'role', 'job_title'],
  department: ['dept', 'department_name'],
  date_of_joining: ['doj', 'joining_date', 'join_date'],
  basic_salary: ['salary', 'basic_pay', 'basic'],
  amount: ['fee_amount', 'paid_amount', 'total_amount', 'cost'],
  amount_paid: ['paid', 'payment_amount', 'received_amount'],
  payment_mode: ['mode', 'payment_type', 'pay_mode'],
  receipt_number: ['receipt_no', 'rcpt_no', 'voucher_no'],
  vendor_name: ['supplier_name', 'vendor', 'supplier', 'firm_name'],
  vendor_code: ['supplier_code', 'vcode'],
  is_active: ['active', 'status_active', 'is_enabled'],
  student_status: ['status', 'enrollment_status'],
  employment_status: ['status', 'staff_status'],
  father_photo_url: ['father_photo', 'father_photo_url', 'father_image', 'fatherphoto'],
  mother_photo_url: ['mother_photo', 'mother_photo_url', 'mother_image', 'motherphoto'],
  father_occupation: ['father_job', 'father_profession', 'father_occ', 'foccupation'],
  mother_occupation: ['mother_job', 'mother_profession', 'mother_occ', 'moccupation'],
}

/**
 * Normalizes string for fuzzy header comparison
 */
export function normaliseHeader(str: string): string {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '') // Strip UTF-8 BOM
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Robust CSV parser that handles quotes, commas inside quotes, multi-line cells, and BOM
 */
export function parseCsvText(text: string): string[][] {
  // Strip BOM if present
  const clean = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    if (char === '"') {
      if (quoted && clean[i + 1] === '"') {
        cell += '"'
        i++ // Skip escaped quote
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && clean[i + 1] === '\n') {
        i++
      }
      row.push(cell.trim())
      if (row.some((val) => val.length > 0)) {
        rows.push(row)
      }
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some((val) => val.length > 0)) {
    rows.push(row)
  }

  return rows
}

/**
 * Maps raw CSV headers to module table field keys
 */
export function mapCsvHeaders(
  rawHeaders: string[],
  mod: Module
): { mappedKey: string | null; headerName: string; isMatched: boolean }[] {
  const normMap = new Map<string, string>()

  // Register exact field keys & labels
  mod.fields.forEach((f) => {
    normMap.set(normaliseHeader(f.key), f.key)
    normMap.set(normaliseHeader(f.label), f.key)
  })

  mod.columns.forEach((c) => {
    normMap.set(normaliseHeader(c), c)
    normMap.set(normaliseHeader(label(c)), c)
  })

  // Register aliases
  Object.entries(COMMON_ALIASES).forEach(([targetKey, aliases]) => {
    const fieldExists = mod.fields.some((f) => f.key === targetKey) || mod.columns.includes(targetKey)
    if (fieldExists) {
      aliases.forEach((alias) => {
        normMap.set(normaliseHeader(alias), targetKey)
      })
    }
  })

  return rawHeaders.map((hdr) => {
    const norm = normaliseHeader(hdr)
    const matched = normMap.get(norm) || null
    return {
      headerName: hdr,
      mappedKey: matched,
      isMatched: matched !== null,
    }
  })
}

/**
 * Sanitize and coerce record values for Supabase Postgres insertion
 */
export function sanitizeRecordForTable(
  rawRow: Record<string, any>,
  mod: Module,
  rowIndex: number
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  for (const [key, rawValue] of Object.entries(rawRow)) {
    if (key === mod.primaryKey && (!rawValue || rawValue === '')) {
      // Don't include empty primary keys (let DB generate them)
      continue
    }

    const trimmed = typeof rawValue === 'string' ? rawValue.trim() : rawValue
    if (trimmed === '' || trimmed === null || trimmed === undefined) {
      // For empty values in CSV:
      // Don't send empty string for non-string fields or let defaults apply
      continue
    }

    const fieldDef = mod.fields.find((f) => f.key === key)
    const fieldType = fieldDef?.type || 'text'

    if (fieldType === 'number') {
      // Strip currency signs, commas
      const numClean = String(trimmed).replace(/[^0-9.-]/g, '')
      const num = Number(numClean)
      payload[key] = isNaN(num) ? null : num
    } else if (fieldType === 'boolean') {
      const lower = String(trimmed).toLowerCase()
      payload[key] = ['true', 'yes', '1', 'active', 'y', 'enabled'].includes(lower)
    } else if (fieldType === 'array') {
      payload[key] = String(trimmed)
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (fieldType === 'date') {
      // Standardize date YYYY-MM-DD or DD-MM-YYYY
      const dateStr = String(trimmed)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        payload[key] = dateStr
      } else if (dateStr.match(/^\d{2}[-/]\d{2}[-/]\d{4}$/)) {
        const [d, m, y] = dateStr.split(/[-/]/)
        payload[key] = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      } else {
        payload[key] = dateStr
      }
    } else {
      payload[key] = trimmed
    }
  }

  // Auto-generate missing unique codes and primary keys if required
  if (mod.table === 'department_master') {
    if (!payload.department_code || String(payload.department_code).trim() === '') {
      const name = String(payload.department_name || `DEPT${rowIndex + 1}`)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
      payload.department_code = `DEPT-${name.slice(0, 4) || 'GEN'}-${rowIndex + 1}`
    }
    if (!payload.department_id || String(payload.department_id).trim() === '') {
      payload.department_id = String(payload.department_code)
    }
    if (payload.is_active === undefined) payload.is_active = true
  }

  if (mod.table === 'vendor_master') {
    if (!payload.vendor_code || String(payload.vendor_code).trim() === '') {
      const pad = String(rowIndex + 1).padStart(4, '0')
      payload.vendor_code = `VND-${pad}`
    }
    if (!payload.vendor_id || String(payload.vendor_id).trim() === '') {
      payload.vendor_id = String(payload.vendor_code)
    }
    if (payload.is_active === undefined) payload.is_active = true
  }

  if (mod.table === 'class_master') {
    if (!payload.class_id || String(payload.class_id).trim() === '') {
      const cname = String(payload.class_name || `CLASS_${rowIndex + 1}`)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
      payload.class_id = `CLS-${cname}`
    }
    if (!payload.academic_year) {
      payload.academic_year = getCurrentAcademicYear()
    }
    if (payload.is_active === undefined) payload.is_active = true
  }

  if (mod.table === 'subject_master') {
    if (!payload.subject_id || String(payload.subject_id).trim() === '') {
      const cname = String(payload.class_name || 'ALL')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
      const sname = String(payload.subject_name || `SUB_${rowIndex + 1}`)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
      payload.subject_id = `SUB-${cname}_${sname}`
    }
    if (payload.is_active === undefined) payload.is_active = true
  }

  if (mod.table === 'asset_master') {
    if (!payload.asset_code || String(payload.asset_code).trim() === '') {
      payload.asset_code = `AST-${String(rowIndex + 1).padStart(4, '0')}`
    }
    if (!payload.asset_id || String(payload.asset_id).trim() === '') {
      payload.asset_id = String(payload.asset_code)
    }
    if (payload.is_active === undefined) payload.is_active = true
  }

  if (mod.table === 'inventory_master') {
    if (!payload.item_code || String(payload.item_code).trim() === '') {
      payload.item_code = `ITM-${String(rowIndex + 1).padStart(4, '0')}`
    }
    if (!payload.item_id || String(payload.item_id).trim() === '') {
      payload.item_id = String(payload.item_code)
    }
    if (payload.is_active === undefined) payload.is_active = true
  }

  if (mod.table === 'student_master') {
    if (!payload.admission_no || String(payload.admission_no).trim() === '') {
      payload.admission_no = `ADM-${Date.now().toString().slice(-4)}${rowIndex + 1}`
    }
    if (!payload.class_name || String(payload.class_name).trim() === '') {
      payload.class_name = 'CLASS I'
    }
    if (!payload.section || String(payload.section).trim() === '') {
      payload.section = 'A'
    }
    if (!payload.academic_year) {
      payload.academic_year = getCurrentAcademicYear()
    }
    if (!payload.full_name && (payload.first_name || payload.last_name)) {
      payload.full_name = [payload.first_name, payload.middle_name, payload.last_name].filter(Boolean).join(' ')
    }
    if (!payload.full_name) {
      payload.full_name = `Student ${payload.admission_no}`
    }
    if (payload.is_active === undefined) payload.is_active = true
    if (!payload.student_status) payload.student_status = 'Active'
    // Ensure father_photo_url & mother_photo_url are stripped since they do not exist in Postgres
    delete payload.father_photo_url
    delete payload.mother_photo_url
  }

  if (mod.table === 'employee_master') {
    if (!payload.emp_code || String(payload.emp_code).trim() === '') {
      payload.emp_code = `EMP-${Date.now().toString().slice(-4)}${rowIndex + 1}`
    }
    if (!payload.first_name && (payload.full_name || payload.name || payload.employee_name || payload.staff_name || payload.teacher_name)) {
      const combined = String(payload.full_name || payload.name || payload.employee_name || payload.staff_name || payload.teacher_name).trim()
      const parts = combined.split(/\s+/)
      payload.first_name = parts[0] || 'Staff'
      payload.last_name = parts.slice(1).join(' ') || ''
    }
    if (!payload.first_name) {
      payload.first_name = `Staff`
    }
    if (payload.last_name === undefined) {
      payload.last_name = ''
    }
    if (!payload.academic_year) {
      payload.academic_year = getCurrentAcademicYear()
    }
    if (payload.is_active === undefined) payload.is_active = true
    if (!payload.employment_status) payload.employment_status = 'Active'
    if (!payload.employee_category) payload.employee_category = 'Teaching Staff'
    if (!payload.department) payload.department = 'Academics'
    delete payload.resignation_date
    delete payload.last_working_date
  }

  if (mod.table === 'user_master') {
    if (payload.is_active === undefined) payload.is_active = true
    delete payload.allowed_modules
  }

  if (mod.table === 'notice_automation') {
    if (!payload.notice_id || String(payload.notice_id).trim() === '') {
      payload.notice_id = `NTC-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  if (mod.table === 'assignments_master') {
    if (!payload.assignment_id || String(payload.assignment_id).trim() === '') {
      payload.assignment_id = `ASG-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  if (mod.table === 'fees_collection') {
    if (!payload.fee_id || String(payload.fee_id).trim() === '') {
      payload.fee_id = String(payload.receipt_number || `FEE-${Date.now().toString().slice(-4)}_${rowIndex + 1}`)
    }
  }

  if (mod.table === 'expense_master') {
    if (!payload.expense_id || String(payload.expense_id).trim() === '') {
      payload.expense_id = `EXP-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  if (mod.table === 'income_master') {
    if (!payload.income_id || String(payload.income_id).trim() === '') {
      payload.income_id = `INC-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  if (mod.table === 'salary_slip') {
    if (!payload.slip_id || String(payload.slip_id).trim() === '') {
      payload.slip_id = `SLP-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  if (mod.table === 'leave_application') {
    if (!payload.leave_app_id || String(payload.leave_app_id).trim() === '') {
      payload.leave_app_id = `LV-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  if (mod.table === 'leave_balance') {
    if (!payload.balance_id || String(payload.balance_id).trim() === '') {
      payload.balance_id = `BAL-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  if (mod.table === 'warning_letter') {
    if (!payload.letter_id || String(payload.letter_id).trim() === '') {
      payload.letter_id = `WRN-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  if (mod.table === 'offer_letter') {
    if (!payload.offer_id || String(payload.offer_id).trim() === '') {
      payload.offer_id = `OFR-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  if (mod.table === 'employee_document') {
    if (!payload.doc_id || String(payload.doc_id).trim() === '') {
      payload.doc_id = `DOC-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  if (mod.table === 'student_attendance' || mod.table === 'employee_attendance') {
    if (!payload.attendance_id || String(payload.attendance_id).trim() === '') {
      payload.attendance_id = `ATT-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  if (['teacher_idcard', 'student_idcard', 'escort_card'].includes(mod.table)) {
    if (!payload.card_id || String(payload.card_id).trim() === '') {
      payload.card_id = `CRD-${Date.now().toString().slice(-4)}_${rowIndex + 1}`
    }
  }

  // Universal fallback for primary key across any table (only if not a UUID column)
  const pkField = mod.primaryKey || 'id'
  if (!pkField.endsWith('_id') && pkField !== 'id') {
    if (!payload[pkField] || String(payload[pkField]).trim() === '') {
      payload[pkField] = `${mod.table.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-5)}-${rowIndex + 1}`
    }
  }

  // Ensure no non-existent Postgres column properties are sent to Supabase
  delete payload._docId
  delete payload._id

  // Remove any non-UUID value in a column ending with _id or named id
  for (const k of Object.keys(payload)) {
    if ((k.endsWith('_id') || k === 'id') && payload[k] && typeof payload[k] === 'string') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload[k])
      if (!isUuid) {
        delete payload[k]
      }
    }
  }

  return payload
}

/**
 * Generates sample CSV template text for a module with 2 realistic pre-filled sample rows
 */
export function generateSampleCsv(mod: Module): string {
  const fields = mod.fields.filter((f) => f.key !== mod.primaryKey)
  const headers = fields.map((f) => f.label)

  const getSampleVal = (f: Field, rowIndex: number): string => {
    const k = f.key.toLowerCase()

    if (k === 'department_name') return rowIndex === 0 ? 'Mathematics' : 'Science & Technology'
    if (k === 'department_code') return rowIndex === 0 ? 'DEPT-MATH' : 'DEPT-SCI'
    if (k === 'description') return rowIndex === 0 ? 'Department of Mathematics' : 'Department of Natural Sciences'
    if (k === 'class_name') return rowIndex === 0 ? 'CLASS I' : 'CLASS II'
    if (k === 'academic_year') return getCurrentAcademicYear()
    if (k === 'capacity') return rowIndex === 0 ? '40' : '45'
    if (k === 'subject_name') return rowIndex === 0 ? 'English Grammar' : 'Mathematics'
    if (k === 'subject_type') return rowIndex === 0 ? 'Scholastic' : 'Co-Scholastic'
    if (k === 'vendor_name') return rowIndex === 0 ? 'Oxford University Press' : 'Camlin Stationary Pvt Ltd'
    if (k === 'vendor_code') return rowIndex === 0 ? 'VND-0001' : 'VND-0002'
    if (k === 'contact_person') return rowIndex === 0 ? 'Debashis Roy' : 'Sujata Banerjee'
    if (k === 'phone_primary' || k === 'mobile_primary' || k === 'whatsapp_number' || k === 'phone')
      return rowIndex === 0 ? '9830112233' : '9830998877'
    if (k === 'email' || k === 'official_email' || k === 'personal_email')
      return rowIndex === 0 ? 'contact@stjohns.edu' : 'info@stjohns.edu'
    if (k === 'address' || k === 'current_address' || k === 'permanent_address')
      return rowIndex === 0 ? 'Station Road, Dankuni, Hooghly, WB' : 'GT Road, Serampore, Hooghly, WB'
    if (k === 'first_name') return rowIndex === 0 ? 'Aarav' : 'Ananya'
    if (k === 'last_name') return rowIndex === 0 ? 'Sharma' : 'Sen'
    if (k === 'full_name' || k === 'student_name') return rowIndex === 0 ? 'Aarav Sharma' : 'Ananya Sen'
    if (k === 'gender') return rowIndex === 0 ? 'Male' : 'Female'
    if (k === 'date_of_birth' || k === 'dob') return rowIndex === 0 ? '2016-05-15' : '2017-08-22'
    if (k === 'admission_no' || k === 'admission_number') return rowIndex === 0 ? 'ADM-2026-001' : 'ADM-2026-002'
    if (k === 'roll_no' || k === 'roll_number') return rowIndex === 0 ? '1' : '2'
    if (k === 'section') return rowIndex === 0 ? 'A' : 'B'
    if (k === 'father_name') return rowIndex === 0 ? 'Rajesh Sharma' : 'Subhash Sen'
    if (k === 'father_mobile') return rowIndex === 0 ? '9876543210' : '9876543211'
    if (k === 'father_occupation') return rowIndex === 0 ? 'Business' : 'Private Service'
    if (k === 'father_photo_url' || k === 'father_photo') return rowIndex === 0 ? 'https://lh3.googleusercontent.com/d/1example_father_id' : ''
    if (k === 'mother_name') return rowIndex === 0 ? 'Sunita Sharma' : 'Priti Sen'
    if (k === 'mother_mobile') return rowIndex === 0 ? '9876543220' : '9876543221'
    if (k === 'mother_occupation') return rowIndex === 0 ? 'Homemaker' : 'Teacher'
    if (k === 'mother_photo_url' || k === 'mother_photo') return rowIndex === 0 ? 'https://lh3.googleusercontent.com/d/1example_mother_id' : ''
    if (k === 'student_photo_url' || k === 'student_photo') return rowIndex === 0 ? 'https://lh3.googleusercontent.com/d/1example_student_id' : ''
    if (k === 'student_status') return rowIndex === 0 ? 'Active' : 'New Admission'
    if (k === 'blood_group') return rowIndex === 0 ? 'A+' : 'B+'
    if (k === 'is_active') return 'true'
    if (k === 'emp_code' || k === 'employee_code') return rowIndex === 0 ? 'EMP-001' : 'EMP-002'
    if (k === 'designation') return rowIndex === 0 ? 'Senior Teacher' : 'Assistant Teacher'
    if (k === 'employee_category') return rowIndex === 0 ? 'Teaching Staff' : 'Administrative Office'
    if (k === 'department') return rowIndex === 0 ? 'Teaching Staff' : 'Accounts & Finance'
    if (k === 'date_of_joining' || k === 'doj') return rowIndex === 0 ? '2022-04-01' : '2023-01-10'
    if (k === 'basic_salary') return rowIndex === 0 ? '35000' : '28000'
    if (k === 'receipt_number') return rowIndex === 0 ? 'RCPT-2026-101' : 'RCPT-2026-102'
    if (k === 'receipt_date' || k === 'date') return rowIndex === 0 ? '2026-08-01' : '2026-08-05'
    if (k === 'amount' || k === 'amount_paid' || k === 'total_amount' || k === 'fee_amount')
      return rowIndex === 0 ? '2500' : '3200'
    if (k === 'payment_mode') return rowIndex === 0 ? 'Cash' : 'UPI / Online'
    if (k === 'user_name' || k === 'username') return rowIndex === 0 ? 'asharma' : 'asen'
    if (k === 'user_full_name') return rowIndex === 0 ? 'Aarav Sharma' : 'Ananya Sen'
    if (k === 'password') return rowIndex === 0 ? 'pass123' : 'pass456'
    if (k === 'role') return rowIndex === 0 ? 'teacher' : 'accounts'
    if (k === 'item_name') return rowIndex === 0 ? 'Whiteboard Marker Box' : 'A4 Printing Paper Reams'
    if (k === 'item_code') return rowIndex === 0 ? 'ITM-001' : 'ITM-002'
    if (k === 'asset_name') return rowIndex === 0 ? 'Dell OptiPlex Desktop' : 'Epson LCD Projector'
    if (k === 'asset_code') return rowIndex === 0 ? 'AST-001' : 'AST-002'
    if (k === 'leave_type') return rowIndex === 0 ? 'Casual Leave (CL)' : 'Medical Leave (ML)'
    if (k === 'check_in_time' || k === 'in_time') return '09:30'
    if (k === 'check_out_time' || k === 'out_time') return '14:45'
    if (k === 'title' || k === 'assignment_title' || k === 'notice_title')
      return rowIndex === 0 ? 'Mathematics Homework Chapter 3' : 'Annual Sports Day Announcement'

    if (f.options && f.options.length > 0) {
      return f.options[rowIndex % f.options.length]
    }
    if (f.type === 'boolean') return 'true'
    if (f.type === 'number') return rowIndex === 0 ? '100' : '200'
    if (f.type === 'date') return rowIndex === 0 ? '2026-01-15' : '2026-02-20'

    return rowIndex === 0 ? 'Sample Value 1' : 'Sample Value 2'
  }

  const row1 = fields.map((f) => getSampleVal(f, 0))
  const row2 = fields.map((f) => getSampleVal(f, 1))

  return [
    headers.join(','),
    row1.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
    row2.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
  ].join('\n')
}

/**
 * Downloads pre-filled sample CSV template for bulk upload
 */
export function downloadSampleCsv(mod: Module) {
  const csvContent = generateSampleCsv(mod)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${mod.table}_sample_data.csv`
  link.click()
}
