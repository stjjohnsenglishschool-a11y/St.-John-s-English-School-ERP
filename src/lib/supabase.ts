import { createClient } from '@supabase/supabase-js'

const rawUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  'https://dbliogptcikqyzkbqnus.supabase.co'
)
  .toString()
  .replace(/^["']|["']$/g, '')
  .trim()
  .replace(/\/+$/, '')

const rawKey = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRibGlvZ3B0Y2lrcXl6a2JxbnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzg2NjMsImV4cCI6MjA5Nzg1NDY2M30.c-lU8C9ZScHMIIWJ-NCxqKNF1WVJqLsm3dQVQlclKdI'
)
  .toString()
  .replace(/^["']|["']$/g, '')
  .trim()

export const SUPABASE_URL = rawUrl
export const SUPABASE_ANON_KEY = rawKey

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export function isUUID(str: any): boolean {
  if (typeof str !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

/**
 * Exact schema columns present in Supabase PostgreSQL tables
 */
export const TABLE_KNOWN_COLUMNS: Record<string, string[]> = {
  student_master: [
    'student_id', 'admission_no', 'admission_date', 'gr_number', 'roll_no', 'academic_year',
    'class_name', 'section', 'house_name', 'student_status', 'full_name', 'first_name',
    'middle_name', 'last_name', 'date_of_birth', 'gender', 'blood_group', 'nationality',
    'religion', 'category', 'mother_tongue', 'student_photo_url', 'mobile_primary',
    'student_email', 'father_name', 'father_mobile', 'father_whatsapp', 'father_email',
    'father_occupation', 'mother_name', 'mother_mobile', 'mother_whatsapp', 'mother_email',
    'mother_occupation', 'guardian_name', 'guardian_relation', 'guardian_mobile',
    'emergency_contact_name', 'emergency_contact_phone', 'address', 'permanent_address',
    'previous_school', 'previous_class', 'medical_conditions', 'allergies', 'doctor_name',
    'doctor_phone', 'birth_certificate_no', 'document_url', 'is_active', 'created_at', 'updated_at'
  ],
  employee_master: [
    'emp_id', 'emp_code', 'employee_category', 'first_name', 'middle_name', 'last_name',
    'date_of_birth', 'gender', 'blood_group', 'marital_status', 'mobile_primary',
    'whatsapp_number', 'personal_email', 'official_email', 'emergency_contact_name',
    'emergency_contact_phone', 'current_address', 'permanent_address', 'department',
    'designation', 'employment_type', 'employment_status', 'academic_year', 'reporting_to',
    'reporting_designation', 'date_of_joining', 'confirmation_date', 'date_of_leaving',
    'shift_name', 'qualification', 'professional_qualification', 'total_experience_years',
    'subject_specialisation', 'classes_assigned', 'class_teacher_of', 'section_assigned',
    'employee_photo_url', 'document_url', 'basic_salary', 'bank_name', 'bank_account_no',
    'ifsc_code', 'pan_number', 'is_active', 'created_at', 'updated_at'
  ],
  department_master: [
    'department_id', 'department_code', 'department_name', 'description', 'is_active', 'created_at', 'updated_at'
  ],
  class_master: [
    'class_id', 'class_name', 'academic_year', 'capacity', 'is_active', 'created_at', 'updated_at'
  ],
  subject_master: [
    'subject_id', 'class_name', 'subject_name', 'subject_type', 'is_active', 'created_at'
  ],
  vendor_master: [
    'vendor_id', 'vendor_code', 'vendor_name', 'vendor_type', 'contact_person', 'phone_primary',
    'phone_secondary', 'email', 'whatsapp_number', 'address', 'payment_terms', 'credit_limit',
    'outstanding_amount', 'rating', 'is_active', 'created_at', 'updated_at'
  ],
  user_master: [
    'user_id', 'user_full_name', 'user_name', 'password', 'department', 'active_module',
    'status', 'role', 'last_login_at', 'is_active', 'created_at', 'updated_at'
  ],
  teacher_idcard: [
    'card_id', 'emp_id', 'employee_name', 'designation', 'department', 'mobile', 'photo_url',
    'issue_date', 'valid_until', 'is_active', 'created_at'
  ],
  student_idcard: [
    'card_id', 'student_id', 'student_name', 'class_name', 'roll_no', 'mobile', 'photo_url',
    'issue_date', 'valid_until', 'is_active', 'created_at'
  ],
  escort_card: [
    'card_id', 'student_name', 'class_name', 'escort_name', 'relation', 'mobile', 'photo_url',
    'issue_date', 'valid_until', 'is_active', 'created_at'
  ],
  notice_automation: [
    'notice_id', 'title', 'message', 'send_via', 'scheduled_at', 'status', 'created_by', 'created_at'
  ],
  fees_structure: [
    'fee_struct_id', 'class_id', 'class_name', 'fee_type', 'amount', 'frequency',
    'due_day', 'academic_year', 'remarks', 'description', 'is_active', 'created_at', 'updated_at'
  ],
  fees_collection: [
    'fee_id', 'student_id', 'admission_no', 'student_name', 'class_name', 'academic_year',
    'fee_type', 'amount_due', 'amount_paid', 'payment_date', 'payment_mode', 'receipt_number',
    'status', 'remarks', 'created_at', 'updated_at'
  ],
  income_head_master: [
    'head_id', 'head_category', 'head_name', 'head_code', 'default_amount', 'frequency',
    'description', 'is_active', 'created_at', 'updated_at'
  ],
  income_master: [
    'income_id', 'income_date', 'income_category', 'income_type', 'description', 'amount',
    'payment_mode', 'received_from', 'receipt_number', 'status', 'remarks', 'created_at', 'updated_at'
  ]
}

/**
 * Strips synthetic frontend fields (_docId, _id) and non-existent columns for Supabase PostgreSQL
 */
export function sanitizePayload(record: Record<string, any>, tableName?: string): Record<string, any> {
  if (!record || typeof record !== 'object') return record
  const clean: Record<string, any> = {}
  const knownCols = tableName && TABLE_KNOWN_COLUMNS[tableName] ? new Set(TABLE_KNOWN_COLUMNS[tableName]) : null

  // Special preservation for student_master parent photos into document_url
  if (tableName === 'student_master' && (record.father_photo_url || record.mother_photo_url)) {
    let docParsed: Record<string, any> = {}
    const existingDoc = record.document_url
    if (existingDoc && typeof existingDoc === 'string' && existingDoc.trim().startsWith('{')) {
      try {
        docParsed = JSON.parse(existingDoc)
      } catch {}
    }
    if (record.father_photo_url) docParsed.father_photo_url = record.father_photo_url
    if (record.mother_photo_url) docParsed.mother_photo_url = record.mother_photo_url
    if (record.father_name) docParsed.father_name = record.father_name
    if (record.father_mobile) docParsed.father_mobile = record.father_mobile
    if (record.mother_name) docParsed.mother_name = record.mother_name
    if (record.mother_mobile) docParsed.mother_mobile = record.mother_mobile
    clean.document_url = JSON.stringify(docParsed)
  }

  // Special preservation for fees_collection metadata (due_month, fine, concession, etc.) packed into remarks
  if (tableName === 'fees_collection') {
    let feeMeta: Record<string, any> = {}
    const existingRemarks = record.remarks
    if (existingRemarks && typeof existingRemarks === 'string' && existingRemarks.trim().startsWith('{')) {
      try {
        feeMeta = JSON.parse(existingRemarks)
      } catch {}
    } else if (existingRemarks && typeof existingRemarks === 'string') {
      feeMeta.notes = existingRemarks
    }
    if (record.due_month !== undefined) feeMeta.due_month = record.due_month
    if (record.fees_amount !== undefined) feeMeta.fees_amount = record.fees_amount
    if (record.fine_amount !== undefined) feeMeta.fine_amount = record.fine_amount
    if (record.fine_waived !== undefined) feeMeta.fine_waived = record.fine_waived
    if (record.principal_approval !== undefined) feeMeta.principal_approval = record.principal_approval
    if (record.waive_approved_by_principal !== undefined) feeMeta.waive_approved_by_principal = record.waive_approved_by_principal
    if (record.fine_waive_reason !== undefined) feeMeta.fine_waive_reason = record.fine_waive_reason
    if (record.approved_by !== undefined) feeMeta.approved_by = record.approved_by
    if (record.section !== undefined) feeMeta.section = record.section
    if (record.roll_no !== undefined) feeMeta.roll_no = record.roll_no
    if (Object.keys(feeMeta).length > 0) {
      clean.remarks = JSON.stringify(feeMeta)
    }
  }

  for (const key of Object.keys(record)) {
    if (key === '_docId' || key === '_id') {
      continue
    }
    // If the table has known columns, filter out any column that doesn't exist in PostgreSQL
    if (knownCols && !knownCols.has(key)) {
      continue
    }
    // If key ends with _id or is id and is non-empty string but not a valid UUID format, remove it so Postgres auto-generates UUID
    if ((key.endsWith('_id') || key === 'id') && record[key] && typeof record[key] === 'string' && !isUUID(record[key])) {
      continue
    }
    // Do not overwrite document_url if already packed with parent photos
    if (key === 'document_url' && clean.document_url) {
      continue
    }
    clean[key] = record[key]
  }
  return clean
}

/**
 * Resilient upsert that automatically recovers if PostgreSQL reports an unmapped column in the schema cache
 */
export async function resilientUpsert(
  tableName: string,
  records: Record<string, any>[]
): Promise<{ data: any; error: any }> {
  if (!records || records.length === 0) {
    return { data: [], error: null }
  }

  let currentRecords = records.map((r) => sanitizePayload(r, tableName))

  for (let attempt = 0; attempt < 10; attempt++) {
    const { data, error } = await supabase.from(tableName).upsert(currentRecords).select()
    if (!error) {
      return { data, error: null }
    }

    // Match "Could not find the 'xyz' column of 'table' in the schema cache"
    const missingColMatch = error.message.match(/Could not find the '([^']+)' column/i)
    if (missingColMatch && missingColMatch[1]) {
      const badCol = missingColMatch[1]
      console.warn(`[Supabase Resilient] Stripping missing column '${badCol}' from ${tableName} and retrying...`)
      currentRecords = currentRecords.map((r) => {
        const copy = { ...r }
        delete copy[badCol]
        return copy
      })
      continue
    }

    // Match "column table.xyz does not exist"
    const colNotExistMatch = error.message.match(/column ([^\s.]+\.)?([^\s.]+) does not exist/i)
    if (colNotExistMatch && colNotExistMatch[2]) {
      const badCol = colNotExistMatch[2]
      console.warn(`[Supabase Resilient] Stripping non-existent column '${badCol}' from ${tableName} and retrying...`)
      currentRecords = currentRecords.map((r) => {
        const copy = { ...r }
        delete copy[badCol]
        return copy
      })
      continue
    }

    return { data: null, error }
  }

  return { data: null, error: new Error(`Failed to upsert records into ${tableName} after schema reconciliation.`) }
}

/**
 * Fetch all records directly from Supabase (Live Source of Truth)
 */
export async function fetchSupabaseTable<T = any>(tableName: string): Promise<T[]> {
  // Purge any stale employee local storage caches to prevent stale data display
  if (typeof window !== 'undefined' && window.localStorage && (tableName === 'employee_master' || tableName === 'employees')) {
    try {
      localStorage.removeItem('sjes_table_employee_master')
      localStorage.removeItem('sjes_table_employees')
      localStorage.removeItem('sjes_table_staff')
    } catch {}
  }

  try {
    const { data, error } = await supabase.from(tableName).select('*')
    if (error) {
      console.error(`Supabase query error for table ${tableName}:`, error.message)
      throw new Error(error.message)
    }
    return (data || []) as T[]
  } catch (err: any) {
    console.error(`Fetch failure for table ${tableName}:`, err)
    throw err
  }
}

/**
 * Save or update a record directly in Supabase table
 */
export async function saveSupabaseRecord(
  tableName: string,
  rawRecord: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Purge local storage employee cache so stale status is never served
    if (typeof window !== 'undefined' && window.localStorage && (tableName === 'employee_master' || tableName === 'employees')) {
      try {
        localStorage.removeItem('sjes_table_employee_master')
        localStorage.removeItem('sjes_table_employees')
        localStorage.removeItem('sjes_table_staff')
      } catch {}
    }

    // Ensure payload has no synthetic _docId / _id columns that don't exist in Supabase Postgres schema
    const record = sanitizePayload(rawRecord, tableName)

    // Sync employment_status and is_active strictly for employee_master
    if (tableName === 'employee_master') {
      const statusStr = String(record.employment_status || 'Active')
      const isInactive =
        statusStr === 'Inactive' ||
        statusStr === 'Resigned' ||
        statusStr === 'Retired' ||
        statusStr === 'Left' ||
        statusStr === 'Suspended'
      record.employment_status = statusStr
      record.is_active = !isInactive
    }
    record.updated_at = new Date().toISOString()

    let resError: string | null = null
    let resData: any = null

    // Perform exact update query matching primary keys
    if (record.emp_code) {
      const { data, error } = await supabase
        .from(tableName)
        .update(record)
        .eq('emp_code', record.emp_code)
        .select()

      if (!error && data && data.length > 0) {
        resData = data[0]
      } else {
        const upsertRes = await resilientUpsert(tableName, [record])
        if (upsertRes.error) resError = upsertRes.error.message
        else resData = upsertRes.data?.[0]
      }
    } else if (record.admission_no) {
      const { data, error } = await supabase
        .from(tableName)
        .update(record)
        .eq('admission_no', record.admission_no)
        .select()

      if (!error && data && data.length > 0) {
        resData = data[0]
      } else {
        const upsertRes = await resilientUpsert(tableName, [record])
        if (upsertRes.error) resError = upsertRes.error.message
        else resData = upsertRes.data?.[0]
      }
    } else if (record.id && isUUID(record.id)) {
      const { data, error } = await supabase
        .from(tableName)
        .update(record)
        .eq('id', record.id)
        .select()

      if (!error && data && data.length > 0) {
        resData = data[0]
      } else {
        const upsertRes = await resilientUpsert(tableName, [record])
        if (upsertRes.error) resError = upsertRes.error.message
        else resData = upsertRes.data?.[0]
      }
    } else {
      const upsertRes = await resilientUpsert(tableName, [record])
      if (upsertRes.error) resError = upsertRes.error.message
      else resData = upsertRes.data?.[0]
    }

    if (resError) {
      console.error(`Supabase update error on table ${tableName}:`, resError)
      return { success: false, error: resError }
    }

    return { success: true, data: resData }
  } catch (err: any) {
    console.error(`Exception saving to Supabase table ${tableName}:`, err)
    return { success: false, error: err?.message || 'Database error occurred' }
  }
}

/**
 * Delete a record from Supabase and purge from all local caches
 */
export async function deleteSupabaseRecord(
  tableName: string,
  matchField: string,
  matchValue: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const valStr = String(matchValue || '').trim()
    if (!valStr) return { success: true }

    // List of possible cache keys to purge
    const cacheKeys = [
      `sjes_table_${tableName}`,
      tableName === 'student_master' ? 'sjes_table_students' : null,
      tableName === 'employee_master' ? 'sjes_table_employees' : null,
      tableName === 'employee_master' ? 'sjes_table_staff' : null,
      tableName === 'department_master' ? 'sjes_department_master' : null,
    ].filter(Boolean) as string[]

    if (typeof window !== 'undefined' && window.localStorage) {
      for (const cacheKey of cacheKeys) {
        try {
          const cachedStr = localStorage.getItem(cacheKey)
          if (cachedStr) {
            const list: any[] = JSON.parse(cachedStr)
            const filtered = list.filter((item) => {
              const itemVals = [
                item._docId,
                item.id,
                item.student_id,
                item.admission_no,
                item.emp_id,
                item.emp_code,
                item.department_id,
                item.department_code,
                item.vendor_id,
                item.vendor_code,
                item.class_id,
                item.subject_id,
                item.asset_id,
                item.item_id,
                item.fee_id,
                item.notice_id,
                item.assignment_id,
                item.expense_id,
                item.income_id,
                item.slip_id,
                item.code,
                item[matchField],
              ].map((v) => String(v || '').trim())

              return !itemVals.includes(valStr)
            })
            localStorage.setItem(cacheKey, JSON.stringify(filtered))
          }
        } catch {
          // ignore
        }
      }
    }

    // Attempt delete in Supabase across possible primary key column names (never query _docId column)
    const deleteFields = [
      matchField,
      'admission_no',
      'student_id',
      'emp_code',
      'emp_id',
      'department_code',
      'department_id',
      'class_id',
      'subject_id',
      'vendor_code',
      'vendor_id',
      'id',
      'code'
    ].filter(
      (v, i, a) => v && v !== '_docId' && a.indexOf(v) === i
    )

    for (const field of deleteFields) {
      try {
        const { error } = await supabase.from(tableName).delete().eq(field, matchValue)
        if (!error) break
      } catch {
        // try next
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: true }
  }
}

/**
 * Record an activity log entry in userlog_master table in Supabase
 */
export async function logActivity(params: {
  username?: string
  action: string
  module: string
  status?: 'success' | 'failed' | 'warning' | 'info'
  errorMessage?: string
}) {
  try {
    const username = params.username || 'Administrator'
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    const logData = {
      log_id: logId,
      username,
      action: params.action,
      module: params.module,
      status: params.status || 'success',
      error_message: params.errorMessage || null,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
    }

    await saveDocument('userlog_master', 'log_id', logData)
  } catch (err) {
    console.warn('Failed to record activity log:', err)
  }
}

/**
 * Compresses and uploads image or document to Supabase or Data URL fallback
 */
export async function uploadToSupabaseStorage(
  file: File,
  filename: string,
  bucketFolder: string = 'app_uploads'
): Promise<string> {
  const readFileAsDataUrl = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            const maxWidth = 900
            const maxHeight = 900
            let { width, height } = img
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width)
                width = maxWidth
              } else {
                width = Math.round((width * maxHeight) / height)
                height = maxHeight
              }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height)
              resolve(canvas.toDataURL('image/jpeg', 0.85))
              return
            }
            resolve(e.target?.result as string)
          }
          img.onerror = () => resolve(e.target?.result as string)
          img.src = e.target?.result as string
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      } else {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      }
    })
  }

  try {
    const cleanPath = `${bucketFolder}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { data, error } = await supabase.storage.from('uploads').upload(cleanPath, file, {
      cacheControl: '3600',
      upsert: true
    })

    if (!error && data?.path) {
      const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(data.path)
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl
      }
    }
  } catch (err) {
    console.warn('Storage upload notice, returning optimized local Data URL:', err)
  }

  return await readFileAsDataUrl()
}

export const uploadToFirebaseStorage = uploadToSupabaseStorage

/**
 * Fetch all documents from a Supabase collection/table with local caching fallback
 */
export async function fetchCollectionData<T = any>(collectionName: string): Promise<T[]> {
  const unpackRow = (row: any) => {
    if (!row) return row
    if (collectionName === 'student_master') {
      if (row.document_url && typeof row.document_url === 'string' && row.document_url.trim().startsWith('{')) {
        try {
          const doc = JSON.parse(row.document_url)
          if (!row.father_photo_url && (doc.father_photo_url || doc.fatherPhotoUrl)) {
            row.father_photo_url = doc.father_photo_url || doc.fatherPhotoUrl
          }
          if (!row.mother_photo_url && (doc.mother_photo_url || doc.motherPhotoUrl)) {
            row.mother_photo_url = doc.mother_photo_url || doc.motherPhotoUrl
          }
          if (!row.father_name && doc.father_name) row.father_name = doc.father_name
          if (!row.father_mobile && doc.father_mobile) row.father_mobile = doc.father_mobile
          if (!row.mother_name && doc.mother_name) row.mother_name = doc.mother_name
          if (!row.mother_mobile && doc.mother_mobile) row.mother_mobile = doc.mother_mobile
        } catch {}
      }
    }
    if (collectionName === 'fees_collection') {
      if (row.remarks && typeof row.remarks === 'string' && row.remarks.trim().startsWith('{')) {
        try {
          const meta = JSON.parse(row.remarks)
          if (meta.due_month !== undefined && !row.due_month) row.due_month = meta.due_month
          if (meta.fees_amount !== undefined && row.fees_amount === undefined) row.fees_amount = meta.fees_amount
          if (meta.fine_amount !== undefined && row.fine_amount === undefined) row.fine_amount = meta.fine_amount
          if (meta.fine_waived !== undefined && row.fine_waived === undefined) row.fine_waived = meta.fine_waived
          if (meta.principal_approval !== undefined && !row.principal_approval) row.principal_approval = meta.principal_approval
          if (meta.waive_approved_by_principal !== undefined && row.waive_approved_by_principal === undefined) row.waive_approved_by_principal = meta.waive_approved_by_principal
          if (meta.fine_waive_reason !== undefined && !row.fine_waive_reason) row.fine_waive_reason = meta.fine_waive_reason
          if (meta.approved_by !== undefined && !row.approved_by) row.approved_by = meta.approved_by
          if (meta.section !== undefined && !row.section) row.section = meta.section
          if (meta.roll_no !== undefined && !row.roll_no) row.roll_no = meta.roll_no
        } catch {}
      }
    }
    return row
  }

  try {
    const supaData = await fetchSupabaseTable<T>(collectionName)
    if (supaData && Array.isArray(supaData)) {
      const unpacked = supaData.map(unpackRow) as T[]
      if (typeof window !== 'undefined' && window.localStorage && unpacked.length > 0) {
        try {
          localStorage.setItem(`sjes_table_${collectionName}`, JSON.stringify(unpacked))
        } catch {}
      }
      return unpacked
    }
  } catch (err) {
    console.warn(`Supabase fetch error for ${collectionName}:`, err)
  }

  let cachedResults: T[] = []
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToCheck = [
        `sjes_table_${collectionName}`,
        collectionName === 'employee_master' ? 'sjes_table_employees' : null,
        collectionName === 'employee_master' ? 'sjes_table_staff' : null,
        collectionName === 'student_master' ? 'sjes_table_students' : null,
        collectionName === 'department_master' ? 'sjes_department_master' : null,
      ].filter(Boolean) as string[]

      for (const k of keysToCheck) {
        const cached = localStorage.getItem(k)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) {
            cachedResults = parsed.map(unpackRow) as T[]
            break
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return cachedResults
}

/**
 * Checks if a table exists and is accessible in the live Supabase database
 */
export async function checkSupabaseTableStatus(tableName: string): Promise<{ exists: boolean; message?: string }> {
  try {
    const { error } = await supabase.from(tableName).select('*').limit(1)
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist') || error.code === '42P01') {
        return { exists: false, message: `Table "${tableName}" does not exist in Supabase database.` }
      }
      return { exists: false, message: error.message }
    }
    return { exists: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error checking table'
    return { exists: false, message: msg }
  }
}

export const SUPABASE_FEES_STRUCTURE_SQL = `-- Run this in Supabase Dashboard -> SQL Editor:
-- https://supabase.com/dashboard/project/dbliogptcikqyzkbqnus/sql/new

CREATE TABLE IF NOT EXISTS public.fees_structure (
    fee_struct_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.class_master(class_id) ON DELETE SET NULL,
    class_name VARCHAR(50) NOT NULL,
    fee_type VARCHAR(100) NOT NULL DEFAULT 'Monthly Tuition Fee',
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    frequency VARCHAR(50) DEFAULT 'Monthly',
    due_day INT DEFAULT 10,
    academic_year VARCHAR(20) DEFAULT '2026-27',
    description TEXT,
    remarks TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fees_structure ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fees_structure' AND policyname = 'Allow all access to fees_structure'
    ) THEN
        CREATE POLICY "Allow all access to fees_structure" ON public.fees_structure
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.class_master(class_id) ON DELETE SET NULL;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS due_month VARCHAR(50);
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS fees_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS fine_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS fine_waived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS waive_approved_by_principal BOOLEAN DEFAULT FALSE;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS fine_waive_reason TEXT;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);

-- Insert authoritative initial school fee structure
INSERT INTO public.fees_structure (class_name, fee_type, amount, frequency, due_day, academic_year, remarks)
SELECT c.class_name, 'Monthly Tuition Fee', c.amount, 'Monthly', 10, '2026-27', c.class_name || ' Monthly Tuition Fee'
FROM (
    VALUES 
        ('PG', 800.00),
        ('NURSERY', 900.00),
        ('LKG', 1000.00),
        ('UKG', 1000.00),
        ('CLASS I', 1200.00),
        ('CLASS II', 1200.00),
        ('CLASS III', 1300.00),
        ('CLASS IV', 1300.00),
        ('CLASS V', 1400.00),
        ('CLASS VI', 1500.00),
        ('CLASS VII', 1500.00),
        ('CLASS VIII', 1600.00),
        ('CLASS IX', 1800.00),
        ('CLASS X', 2000.00)
) AS c(class_name, amount)
WHERE NOT EXISTS (SELECT 1 FROM public.fees_structure);
`;

export const DEFAULT_FEE_STRUCTURES = [
  { fee_struct_id: 'fs_pg_tuition', class_name: 'PG', fee_type: 'Monthly Tuition Fee', amount: 800, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Playgroup monthly tuition' },
  { fee_struct_id: 'fs_nur_tuition', class_name: 'NURSERY', fee_type: 'Monthly Tuition Fee', amount: 900, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Nursery monthly tuition' },
  { fee_struct_id: 'fs_lkg_tuition', class_name: 'LKG', fee_type: 'Monthly Tuition Fee', amount: 1000, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'LKG monthly tuition' },
  { fee_struct_id: 'fs_ukg_tuition', class_name: 'UKG', fee_type: 'Monthly Tuition Fee', amount: 1000, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'UKG monthly tuition' },
  { fee_struct_id: 'fs_c1_tuition', class_name: 'CLASS I', fee_type: 'Monthly Tuition Fee', amount: 1200, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Primary Class I tuition' },
  { fee_struct_id: 'fs_c2_tuition', class_name: 'CLASS II', fee_type: 'Monthly Tuition Fee', amount: 1200, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Primary Class II tuition' },
  { fee_struct_id: 'fs_c3_tuition', class_name: 'CLASS III', fee_type: 'Monthly Tuition Fee', amount: 1300, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Class III tuition' },
  { fee_struct_id: 'fs_c4_tuition', class_name: 'CLASS IV', fee_type: 'Monthly Tuition Fee', amount: 1300, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Class IV tuition' },
  { fee_struct_id: 'fs_c5_tuition', class_name: 'CLASS V', fee_type: 'Monthly Tuition Fee', amount: 1400, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Class V tuition' },
  { fee_struct_id: 'fs_c6_tuition', class_name: 'CLASS VI', fee_type: 'Monthly Tuition Fee', amount: 1500, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Middle School Class VI tuition' },
  { fee_struct_id: 'fs_c7_tuition', class_name: 'CLASS VII', fee_type: 'Monthly Tuition Fee', amount: 1500, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Middle School Class VII tuition' },
  { fee_struct_id: 'fs_c8_tuition', class_name: 'CLASS VIII', fee_type: 'Monthly Tuition Fee', amount: 1600, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Middle School Class VIII tuition' },
  { fee_struct_id: 'fs_c9_tuition', class_name: 'CLASS IX', fee_type: 'Monthly Tuition Fee', amount: 1800, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Secondary Class IX tuition' },
  { fee_struct_id: 'fs_c10_tuition', class_name: 'CLASS X', fee_type: 'Monthly Tuition Fee', amount: 2000, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Board Exam Class X tuition' },
  { fee_struct_id: 'fs_all_adm', class_name: 'UKG', fee_type: 'Admission Fee', amount: 5000, frequency: 'One-Time', due_day: 10, academic_year: '2026-27', remarks: 'One-time admission charge' },
  { fee_struct_id: 'fs_all_ann', class_name: 'UKG', fee_type: 'Annual / Session Fee', amount: 2500, frequency: 'Annually', due_day: 10, academic_year: '2026-27', remarks: 'Annual development & session charge' },
  { fee_struct_id: 'fs_all_exam', class_name: 'UKG', fee_type: 'Examination Fee', amount: 600, frequency: 'Half-Yearly', due_day: 10, academic_year: '2026-27', remarks: 'Exam fee per term' },
  { fee_struct_id: 'fs_all_comp', class_name: 'UKG', fee_type: 'Computer / Smart Class Fee', amount: 300, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'Smart class & computer lab' },
  { fee_struct_id: 'fs_all_trans', class_name: 'UKG', fee_type: 'Transport Fee', amount: 800, frequency: 'Monthly', due_day: 10, academic_year: '2026-27', remarks: 'School bus transport charge' },
]

export const DEFAULT_INCOME_HEADS = [
  // 1. Fee Income
  { head_id: 'inc_head_exam', head_category: 'Fee Income', head_name: 'Examination Fee', head_code: 'INC-FEE-EXAM', default_amount: 500, frequency: 'As Needed', is_active: true, description: 'Term exam & assessment fees' },
  { head_id: 'inc_head_comp', head_category: 'Fee Income', head_name: 'Computer Fee', head_code: 'INC-FEE-COMP', default_amount: 300, frequency: 'Monthly', is_active: true, description: 'IT lab usage & software' },
  { head_id: 'inc_head_smart', head_category: 'Fee Income', head_name: 'Smart Class Fee', head_code: 'INC-FEE-SMART', default_amount: 250, frequency: 'Monthly', is_active: true, description: 'Interactive smart board fee' },
  { head_id: 'inc_head_act', head_category: 'Fee Income', head_name: 'Activity Fee', head_code: 'INC-FEE-ACT', default_amount: 200, frequency: 'Quarterly', is_active: true, description: 'Co-curricular and workshop charges' },
  { head_id: 'inc_head_sports', head_category: 'Fee Income', head_name: 'Sports Fee', head_code: 'INC-FEE-SPORT', default_amount: 350, frequency: 'Annual', is_active: true, description: 'Annual sports meet and physical education' },
  { head_id: 'inc_head_cult', head_category: 'Fee Income', head_name: 'Cultural Activity Fee', head_code: 'INC-FEE-CULT', default_amount: 250, frequency: 'Annual', is_active: true, description: 'Festivals, debates & cultural celebrations' },
  { head_id: 'inc_head_ann_func', head_category: 'Fee Income', head_name: 'Annual Function Fee', head_code: 'INC-FEE-ANN', default_amount: 600, frequency: 'Annual', is_active: true, description: 'Annual Day celebration & stage programs' },
  { head_id: 'inc_head_mag', head_category: 'Fee Income', head_name: 'Magazine Fee', head_code: 'INC-FEE-MAG', default_amount: 150, frequency: 'Annual', is_active: true, description: 'School yearbook & magazine publication' },
  { head_id: 'inc_head_id', head_category: 'Fee Income', head_name: 'Identity Card Fee', head_code: 'INC-FEE-ID', default_amount: 100, frequency: 'One-time', is_active: true, description: 'RFID / PVC ID card generation' },
  { head_id: 'inc_head_diary', head_category: 'Fee Income', head_name: 'School Diary Fee', head_code: 'INC-FEE-DIARY', default_amount: 120, frequency: 'Annual', is_active: true, description: 'Student calendar diary & handbook' },
  { head_id: 'inc_head_tc', head_category: 'Fee Income', head_name: 'Transfer Certificate Fee', head_code: 'INC-FEE-TC', default_amount: 250, frequency: 'One-time', is_active: true, description: 'Official TC issuance fee' },
  { head_id: 'inc_head_mig', head_category: 'Fee Income', head_name: 'Migration Certificate Fee', head_code: 'INC-FEE-MIG', default_amount: 300, frequency: 'One-time', is_active: true, description: 'State/board migration certificate' },
  { head_id: 'inc_head_readm', head_category: 'Fee Income', head_name: 'Re-admission Fee', head_code: 'INC-FEE-READM', default_amount: 1000, frequency: 'One-time', is_active: true, description: 'Student re-admission fee' },
  { head_id: 'inc_head_late', head_category: 'Fee Income', head_name: 'Late Fee', head_code: 'INC-FEE-LATE', default_amount: 50, frequency: 'As Needed', is_active: true, description: 'Fee payment after due date' },
  { head_id: 'inc_head_fine', head_category: 'Fee Income', head_name: 'Fine and Penalty', head_code: 'INC-FEE-FINE', default_amount: 100, frequency: 'As Needed', is_active: true, description: 'General penalty or overdue fine' },
  { head_id: 'inc_head_misc_std', head_category: 'Fee Income', head_name: 'Miscellaneous Student Charges', head_code: 'INC-FEE-MISC', default_amount: 150, frequency: 'As Needed', is_active: true, description: 'Ad-hoc student charges and certifications' },

  // 2. Uniform and Educational Materials
  { head_id: 'inc_head_unif_sch', head_category: 'Uniform and Educational Materials', head_name: 'School Uniform Sales', head_code: 'INC-MAT-UNIF', default_amount: 850, frequency: 'As Needed', is_active: true, description: 'Regular school uniform set' },
  { head_id: 'inc_head_unif_sport', head_category: 'Uniform and Educational Materials', head_name: 'Sports Uniform Sales', head_code: 'INC-MAT-SPUNIF', default_amount: 650, frequency: 'As Needed', is_active: true, description: 'House sports tracksuit / uniform' },
  { head_id: 'inc_head_socks', head_category: 'Uniform and Educational Materials', head_name: 'Socks Sales', head_code: 'INC-MAT-SOCKS', default_amount: 80, frequency: 'As Needed', is_active: true, description: 'School uniform socks pair' },
  { head_id: 'inc_head_books', head_category: 'Uniform and Educational Materials', head_name: 'Books Sales', head_code: 'INC-MAT-BOOKS', default_amount: 1800, frequency: 'Annual', is_active: true, description: 'Annual course syllabus textbooks set' },
  { head_id: 'inc_head_notebooks', head_category: 'Uniform and Educational Materials', head_name: 'Notebooks Sales', head_code: 'INC-MAT-NOTES', default_amount: 500, frequency: 'As Needed', is_active: true, description: 'Branded school exercise notebooks' },
  { head_id: 'inc_head_stat', head_category: 'Uniform and Educational Materials', head_name: 'Stationery Sales', head_code: 'INC-MAT-STAT', default_amount: 250, frequency: 'As Needed', is_active: true, description: 'Geometry box, pens, pencils, erasers' },
  { head_id: 'inc_head_bag', head_category: 'Uniform and Educational Materials', head_name: 'School Bag Sales', head_code: 'INC-MAT-BAG', default_amount: 450, frequency: 'As Needed', is_active: true, description: 'Official school crest backpack' },
  { head_id: 'inc_head_belt', head_category: 'Uniform and Educational Materials', head_name: 'Belt', head_code: 'INC-MAT-BELT', default_amount: 90, frequency: 'As Needed', is_active: true, description: 'School uniform buckle belt' },
  { head_id: 'inc_head_craft', head_category: 'Uniform and Educational Materials', head_name: 'Art and Craft Materials', head_code: 'INC-MAT-CRAFT', default_amount: 300, frequency: 'As Needed', is_active: true, description: 'Drawing book, colors, clay and craft kit' },

  // 3. Extra-Curricular Income
  { head_id: 'inc_head_coach', head_category: 'Extra-Curricular Income', head_name: 'Coaching Class Fee', head_code: 'INC-EXT-COACH', default_amount: 1200, frequency: 'Monthly', is_active: true, description: 'Remedial & board exam preparation coaching' },
  { head_id: 'inc_head_music', head_category: 'Extra-Curricular Income', head_name: 'Music Class Fee', head_code: 'INC-EXT-MUSIC', default_amount: 400, frequency: 'Monthly', is_active: true, description: 'Vocal and instrumental music training' },
  { head_id: 'inc_head_dance', head_category: 'Extra-Curricular Income', head_name: 'Dance Class Fee', head_code: 'INC-EXT-DANCE', default_amount: 400, frequency: 'Monthly', is_active: true, description: 'Classical and contemporary dance sessions' },
  { head_id: 'inc_head_draw', head_category: 'Extra-Curricular Income', head_name: 'Drawing Class Fee', head_code: 'INC-EXT-DRAW', default_amount: 350, frequency: 'Monthly', is_active: true, description: 'Fine arts and painting guidance' },
  { head_id: 'inc_head_comptrn', head_category: 'Extra-Curricular Income', head_name: 'Computer Training Fee', head_code: 'INC-EXT-COMPTRN', default_amount: 600, frequency: 'Monthly', is_active: true, description: 'Advanced coding & robotics training' },
  { head_id: 'inc_head_eng', head_category: 'Extra-Curricular Income', head_name: 'Spoken English Fee', head_code: 'INC-EXT-ENG', default_amount: 500, frequency: 'Monthly', is_active: true, description: 'Communication and personality development' },
  { head_id: 'inc_head_abacus', head_category: 'Extra-Curricular Income', head_name: 'Abacus Class Fee', head_code: 'INC-EXT-ABACUS', default_amount: 550, frequency: 'Monthly', is_active: true, description: 'Mental arithmetic and abacus course' },
  { head_id: 'inc_head_yoga', head_category: 'Extra-Curricular Income', head_name: 'Yoga Class Fee', head_code: 'INC-EXT-YOGA', default_amount: 300, frequency: 'Monthly', is_active: true, description: 'Wellness, breathing and yoga sessions' },
  { head_id: 'inc_head_martial', head_category: 'Extra-Curricular Income', head_name: 'Martial Arts Fee', head_code: 'INC-EXT-MARTIAL', default_amount: 450, frequency: 'Monthly', is_active: true, description: 'Karate & Taekwondo self-defense' },
  { head_id: 'inc_head_swim', head_category: 'Extra-Curricular Income', head_name: 'Swimming Fee', head_code: 'INC-EXT-SWIM', default_amount: 800, frequency: 'Monthly', is_active: true, description: 'Pool training & lifeguard supervision' },
  { head_id: 'inc_head_camp', head_category: 'Extra-Curricular Income', head_name: 'Summer Camp Fee', head_code: 'INC-EXT-CAMP', default_amount: 1500, frequency: 'One-time', is_active: true, description: 'Special vacation camp activities' },
  { head_id: 'inc_head_tour', head_category: 'Extra-Curricular Income', head_name: 'Educational Tour Fee', head_code: 'INC-EXT-TOUR', default_amount: 2000, frequency: 'One-time', is_active: true, description: 'Outstation educational trip' },
  { head_id: 'inc_head_excur', head_category: 'Extra-Curricular Income', head_name: 'Excursion Fee', head_code: 'INC-EXT-EXCUR', default_amount: 750, frequency: 'One-time', is_active: true, description: 'Day excursion and museum/park visit' },
  { head_id: 'inc_head_compete', head_category: 'Extra-Curricular Income', head_name: 'Competition Fee', head_code: 'INC-EXT-COMPETE', default_amount: 200, frequency: 'As Needed', is_active: true, description: 'Olympiad & inter-school registration' },
]

/**
 * Save or update a document in Supabase table
 */
export async function saveDocument(
  collectionName: string,
  primaryKeyName: string,
  data: Record<string, any>
): Promise<{ success: boolean; id: string; error?: string }> {
  try {
    const isUuidCol = primaryKeyName.endsWith('_id') || primaryKeyName === 'id'
    let docId = data[primaryKeyName] || data._docId || data.id || data.emp_code || data.admission_no || data.code
    
    const objToSave: Record<string, any> = {
      ...data,
      updated_at: new Date().toISOString()
    }

    if (docId) {
      if (!isUuidCol || isUUID(docId)) {
        objToSave[primaryKeyName] = docId
      }
    }

    const payload = sanitizePayload(objToSave, collectionName)

    const res = await saveSupabaseRecord(collectionName, payload)
    if (!res.success) {
      // Fallback for tables not yet provisioned in Supabase schema (e.g. fees_structure before migration)
      if (
        typeof window !== 'undefined' &&
        window.localStorage &&
        (res.error?.includes('schema cache') ||
          res.error?.includes('does not exist') ||
          res.error?.includes('Could not find the table'))
      ) {
        const cacheKey = `sjes_table_${collectionName}`
        let list: any[] = []
        try {
          const raw = localStorage.getItem(cacheKey)
          if (raw) list = JSON.parse(raw)
        } catch {}
        const idVal = docId || `${collectionName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const recordToCache = {
          ...data,
          [primaryKeyName]: idVal,
          _docId: idVal,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        const idx = list.findIndex((x) => x[primaryKeyName] === idVal || x._docId === idVal)
        if (idx >= 0) list[idx] = recordToCache
        else list.unshift(recordToCache)
        localStorage.setItem(cacheKey, JSON.stringify(list))
        return { success: true, id: String(idVal) }
      }
      return { success: false, id: '', error: res.error || 'Failed to save record' }
    }

    // Keep localStorage cache in sync for instant responsive updates
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cacheKey = `sjes_table_${collectionName}`
        const raw = localStorage.getItem(cacheKey)
        const list: any[] = raw ? JSON.parse(raw) : []
        const savedRecord = { ...data, ...(res.data || {}) }
        const idVal = savedRecord[primaryKeyName] || docId
        if (idVal) {
          const idx = list.findIndex((x) => x[primaryKeyName] === idVal || x._docId === idVal)
          if (idx >= 0) list[idx] = savedRecord
          else list.unshift(savedRecord)
          localStorage.setItem(cacheKey, JSON.stringify(list))
        }
      } catch {}
    }

    return { success: true, id: String(res.data?.[primaryKeyName] || docId || '') }
  } catch (err: any) {
    console.error(`Error saving record to table ${collectionName}:`, err)
    return { success: false, id: '', error: err?.message || 'Failed to save record' }
  }
}

/**
 * Batch insert or update multiple documents in Supabase
 */
export async function saveBatchDocuments(
  collectionName: string,
  primaryKeyName: string,
  items: Array<Record<string, any>>
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!items || items.length === 0) return { success: true, count: 0 }

  try {
    const isUuidCol = primaryKeyName.endsWith('_id') || primaryKeyName === 'id'
    const sanitizedItems = items.map((item) => {
      let docId = item[primaryKeyName] || item._docId || item.id || item.emp_code || item.admission_no || item.code
      const obj: Record<string, any> = {
        ...item,
        updated_at: new Date().toISOString()
      }
      if (docId && (!isUuidCol || isUUID(docId))) {
        obj[primaryKeyName] = docId
      }
      return sanitizePayload(obj, collectionName)
    })

    const cacheKey = `sjes_table_${collectionName}`
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(sanitizedItems))
      } catch {
        // ignore quota
      }
    }

    const { data, error } = await resilientUpsert(collectionName, sanitizedItems)
    if (error) {
      console.error(`Batch save error for table ${collectionName}:`, error.message)
      return { success: false, count: 0, error: error.message }
    }
    return { success: true, count: data?.length || sanitizedItems.length }
  } catch (err: any) {
    console.error(`Batch save error for table ${collectionName}:`, err)
    return { success: false, count: 0, error: err?.message || 'Failed to batch save' }
  }
}

/**
 * Delete a document from Supabase table
 */
export async function deleteDocument(
  collectionName: string,
  docId: string,
  additionalInfo?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteSupabaseRecord(collectionName, 'id', docId)
    if (additionalInfo) {
      const pk = additionalInfo.emp_code || additionalInfo.admission_no || additionalInfo.department_code || additionalInfo.vendor_code || additionalInfo.code || additionalInfo.student_id || additionalInfo.emp_id || additionalInfo.department_id
      if (pk) {
        await deleteSupabaseRecord(collectionName, 'code', pk)
      }
    }
    return { success: true }
  } catch (err: any) {
    console.error(`Error deleting from table ${collectionName}:`, err)
    return { success: false, error: err?.message || 'Failed to delete record' }
  }
}

/**
 * Listen to real-time changes on a Supabase table
 */
export function subscribeToCollection<T = any>(
  collectionName: string,
  onData: (data: T[]) => void
): () => void {
  fetchCollectionData<T>(collectionName).then((initialData) => {
    if (initialData && initialData.length > 0) {
      onData(initialData)
    }
  })

  try {
    const channel = supabase
      .channel(`table-rt-${collectionName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: collectionName },
        async () => {
          const freshData = await fetchCollectionData<T>(collectionName)
          if (freshData && freshData.length > 0) {
            onData(freshData)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  } catch (err) {
    console.warn(`Realtime channel note for ${collectionName}:`, err)
    return () => {}
  }
}

export const isSupabaseConfigured = true
export type Session = any
export const db = null as any
export const auth = {
  currentUser: null,
  onAuthStateChanged: (cb: any) => { cb(null); return () => {} },
  signOut: async () => {},
  signInWithEmailAndPassword: async () => ({ user: null })
} as any
export const storage = null as any

