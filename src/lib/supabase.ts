import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://dbliogptcikqyzkbqnus.supabase.co'

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRibGlvZ3B0Y2lrcXl6a2JxbnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzg2NjMsImV4cCI6MjA5Nzg1NDY2M30.c-lU8C9ZScHMIIWJ-NCxqKNF1WVJqLsm3dQVQlclKdI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
  record: Record<string, any>
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
      } else if (error) {
        resError = error.message
      } else {
        // Fallback to upsert if row doesn't exist yet
        const upsertRes = await supabase.from(tableName).upsert([record]).select()
        if (upsertRes.error) resError = upsertRes.error.message
        else resData = upsertRes.data?.[0]
      }
    } else if (record.emp_id) {
      const { data, error } = await supabase
        .from(tableName)
        .update(record)
        .eq('emp_id', record.emp_id)
        .select()

      if (!error && data && data.length > 0) {
        resData = data[0]
      } else if (error) {
        resError = error.message
      } else {
        const upsertRes = await supabase.from(tableName).upsert([record]).select()
        if (upsertRes.error) resError = upsertRes.error.message
        else resData = upsertRes.data?.[0]
      }
    } else if (record.id) {
      const { data, error } = await supabase
        .from(tableName)
        .update(record)
        .eq('id', record.id)
        .select()

      if (!error && data && data.length > 0) {
        resData = data[0]
      } else if (error) {
        resError = error.message
      } else {
        const upsertRes = await supabase.from(tableName).upsert([record]).select()
        if (upsertRes.error) resError = upsertRes.error.message
        else resData = upsertRes.data?.[0]
      }
    } else {
      const upsertRes = await supabase.from(tableName).upsert([record]).select()
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

    // Attempt delete in Supabase across possible primary key column names
    const deleteFields = [matchField, '_docId', 'id', 'admission_no', 'emp_code', 'department_code', 'vendor_code', 'code'].filter(
      (v, i, a) => a.indexOf(v) === i
    )

    for (const field of deleteFields) {
      try {
        await supabase.from(tableName).delete().eq(field, matchValue)
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
    let docId = data[primaryKeyName] || data._docId || data.id || data.emp_code || data.emp_id || data.admission_no || data.student_id || data.code
    if (!docId) {
      docId = `${collectionName}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    }

    const payload = {
      ...data,
      [primaryKeyName]: docId,
      _docId: docId,
      id: data.id || docId,
      updated_at: new Date().toISOString()
    }

    await saveSupabaseRecord(collectionName, payload)
    return { success: true, id: String(docId) }
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
    const sanitizedItems = items.map((item) => {
      let docId = item[primaryKeyName] || item._docId || item.id || item.emp_code || item.admission_no || item.code
      if (!docId) {
        docId = `${collectionName}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
      }

      return {
        ...item,
        [primaryKeyName]: docId,
        _docId: docId,
        id: item.id || docId,
        updated_at: new Date().toISOString()
      }
    })

    const cacheKey = `sjes_table_${collectionName}`
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(sanitizedItems))
      } catch {
        // ignore quota
      }
    }

    await supabase.from(collectionName).upsert(sanitizedItems)
    return { success: true, count: sanitizedItems.length }
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
    await deleteSupabaseRecord(collectionName, '_docId', docId)
    await deleteSupabaseRecord(collectionName, 'id', docId)
    if (additionalInfo) {
      const pk = additionalInfo.emp_code || additionalInfo.admission_no || additionalInfo.department_code || additionalInfo.vendor_code || additionalInfo.code
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

