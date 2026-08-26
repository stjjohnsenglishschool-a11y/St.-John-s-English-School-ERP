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
  full_name: ['student_name', 'name', 'candidate_name', 'applicant_name'],
  admission_no: ['admission_number', 'adm_no', 'adm_number', 'reg_no', 'registration_no'],
  roll_no: ['roll_number', 'roll', 'class_roll'],
  date_of_birth: ['dob', 'birth_date', 'birthdate'],
  mobile_primary: ['mobile', 'phone', 'contact', 'mobile_no', 'phone_no', 'primary_mobile', 'contact_no'],
  official_email: ['email', 'email_id', 'work_email', 'school_email'],
  personal_email: ['personal_email_id', 'alternate_email'],
  gender: ['sex'],
  blood_group: ['blood_grp', 'blood'],
  first_name: ['fname', 'given_name'],
  last_name: ['lname', 'surname', 'family_name'],
  emp_code: ['employee_code', 'emp_no', 'staff_id', 'employee_id', 'code'],
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
  rawRow: Record<string, string>,
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

  // Auto-generate missing unique codes if required
  if (mod.table === 'department_master') {
    if (!payload.department_code || String(payload.department_code).trim() === '') {
      const name = String(payload.department_name || `DEPT${rowIndex + 1}`)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
      payload.department_code = `DEPT-${name.slice(0, 4) || 'GEN'}`
    }
    if (payload.is_active === undefined) payload.is_active = true
  }

  if (mod.table === 'vendor_master') {
    if (!payload.vendor_code || String(payload.vendor_code).trim() === '') {
      const pad = String(rowIndex + 1).padStart(4, '0')
      payload.vendor_code = `VND-${pad}`
    }
    if (payload.is_active === undefined) payload.is_active = true
  }

  if (mod.table === 'class_master') {
    if (!payload.academic_year) {
      payload.academic_year = getCurrentAcademicYear()
    }
    if (payload.is_active === undefined) payload.is_active = true
  }

  if (mod.table === 'student_master') {
    if (!payload.admission_no || String(payload.admission_no).trim() === '') {
      payload.admission_no = `ADM-${Date.now().toString().slice(-4)}${rowIndex + 1}`
    }
    if (!payload.academic_year) {
      payload.academic_year = getCurrentAcademicYear()
    }
    if (!payload.full_name && (payload.first_name || payload.last_name)) {
      payload.full_name = [payload.first_name, payload.middle_name, payload.last_name].filter(Boolean).join(' ')
    }
    if (payload.is_active === undefined) payload.is_active = true
    if (!payload.student_status) payload.student_status = 'Active'
  }

  if (mod.table === 'employee_master') {
    if (!payload.emp_code || String(payload.emp_code).trim() === '') {
      payload.emp_code = `EMP-${Date.now().toString().slice(-4)}${rowIndex + 1}`
    }
    if (!payload.academic_year) {
      payload.academic_year = getCurrentAcademicYear()
    }
    if (payload.is_active === undefined) payload.is_active = true
    if (!payload.employment_status) payload.employment_status = 'Active'
  }

  return payload
}

/**
 * Generates sample CSV template text for a module
 */
export function generateSampleCsv(mod: Module): string {
  const fields = mod.fields.filter((f) => f.key !== mod.primaryKey)
  const headers = fields.map((f) => f.label)

  const sampleRow: string[] = fields.map((f) => {
    if (f.key === 'department_name') return 'Mathematics'
    if (f.key === 'department_code') return 'DEPT-MATH'
    if (f.key === 'description') return 'Department of Mathematics'
    if (f.key === 'class_name') return 'CLASS I'
    if (f.key === 'academic_year') return getCurrentAcademicYear()
    if (f.key === 'capacity') return '40'
    if (f.key === 'subject_name') return 'English Grammar'
    if (f.key === 'subject_type') return 'Scholastic'
    if (f.key === 'vendor_name') return 'Oxford University Press'
    if (f.key === 'contact_person') return 'Debashis Roy'
    if (f.key === 'phone_primary' || f.key === 'mobile_primary') return '9830112233'
    if (f.key === 'email' || f.key === 'official_email') return 'contact@example.com'
    if (f.key === 'address' || f.key === 'current_address') return 'Dankuni, Hooghly, West Bengal'
    if (f.key === 'first_name') return 'Aarav'
    if (f.key === 'last_name') return 'Sharma'
    if (f.key === 'full_name') return 'Aarav Sharma'
    if (f.key === 'gender') return 'Male'
    if (f.key === 'date_of_birth') return '2016-05-15'
    if (f.key === 'admission_no') return 'ADM-2026-001'
    if (f.key === 'roll_no') return '1'
    if (f.key === 'section') return 'A'
    if (f.key === 'father_name') return 'Rajesh Sharma'
    if (f.key === 'father_mobile') return '9876543210'
    if (f.key === 'mother_name') return 'Sunita Sharma'
    if (f.key === 'emp_code') return 'EMP-001'
    if (f.key === 'designation') return 'Senior Teacher'
    if (f.key === 'employee_category') return 'Teaching'
    if (f.key === 'date_of_joining') return '2022-04-01'
    if (f.key === 'basic_salary') return '35000'
    if (f.type === 'boolean') return 'true'
    if (f.type === 'number') return '100'
    return 'Sample Value'
  })

  return [headers.join(','), sampleRow.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')].join('\n')
}
