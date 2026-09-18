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
  ]
}

/**
 * Strips synthetic frontend fields (_docId, _id) and non-existent columns for Supabase PostgreSQL
 */
export function sanitizePayload(record: Record<string, any>, tableName?: string): Record<string, any> {
  if (!record || typeof record !== 'object') return record
  const clean: Record<string, any> = {}
  const knownCols = tableName && TABLE_KNOWN_COLUMNS[tableName] ? new Set(TABLE_KNOWN_COLUMNS[tableName]) : null

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
  try {
    const supaData = await fetchSupabaseTable<T>(collectionName)
    if (supaData && Array.isArray(supaData)) {
      return supaData
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
            cachedResults = parsed as T[]
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
      return { success: false, id: '', error: res.error || 'Failed to save record' }
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

