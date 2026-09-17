import { supabase as realSupabaseClient, fetchSupabaseTable, saveSupabaseRecord, deleteSupabaseRecord, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'

export const db = null as any
export const auth = {
  currentUser: null,
  onAuthStateChanged: (cb: any) => { cb(null); return () => {} },
  signOut: async () => {},
  signInWithEmailAndPassword: async () => ({ user: null })
} as any

export const storage = null as any

/**
 * Record an audit log entry in userlog_master table in Supabase
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
    console.warn('Failed to record activity log to Supabase:', err)
  }
}

/**
 * Compresses and uploads image or document to Supabase or Data URL fallback
 */
export async function uploadToFirebaseStorage(
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
    const { data, error } = await realSupabaseClient.storage.from('uploads').upload(cleanPath, file, {
      cacheControl: '3600',
      upsert: true
    })

    if (!error && data?.path) {
      const { data: publicUrlData } = realSupabaseClient.storage.from('uploads').getPublicUrl(data.path)
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl
      }
    }
  } catch (err) {
    console.warn('Supabase storage upload notice, returning optimized local Data URL:', err)
  }

  return await readFileAsDataUrl()
}

/**
 * Fetch all documents from a Supabase collection/table with local caching fallback
 */
export async function fetchCollectionData<T = any>(collectionName: string): Promise<T[]> {
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedResults = parsed as T[]
            break
          }
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const supaData = await fetchSupabaseTable<T>(collectionName)
    if (supaData && supaData.length > 0) {
      return supaData
    }
  } catch (err) {
    console.warn(`Supabase fetch error for ${collectionName}:`, err)
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
    let docId = data[primaryKeyName] || data._docId || data.id || data.emp_code || data.admission_no || data.code
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
    console.error(`Error saving record to Supabase table ${collectionName}:`, err)
    return { success: false, id: '', error: err?.message || 'Failed to save to Supabase' }
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

    await realSupabaseClient.from(collectionName).upsert(sanitizedItems)
    return { success: true, count: sanitizedItems.length }
  } catch (err: any) {
    console.error(`Batch save error for Supabase table ${collectionName}:`, err)
    return { success: false, count: 0, error: err?.message || 'Failed to batch save to Supabase' }
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
    console.error(`Error deleting from Supabase table ${collectionName}:`, err)
    return { success: false, error: err?.message || 'Failed to delete from Supabase' }
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
    const channel = realSupabaseClient
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
      realSupabaseClient.removeChannel(channel)
    }
  } catch (err) {
    console.warn(`Supabase realtime channel note for ${collectionName}:`, err)
    return () => {}
  }
}

export type Session = any

export class QueryBuilder {
  private collectionName: string
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: any = null
  private filters: Array<{ field: string; op: 'eq' | 'neq' | 'in' | 'gt' | 'gte' | 'lt' | 'lte'; value: any }> = []
  private limitVal?: number
  private isSingle = false

  constructor(collectionName: string) {
    this.collectionName = collectionName
  }

  select(_cols?: string, _opts?: any) {
    this.mode = 'select'
    return this
  }

  eq(field: string, value: any) {
    this.filters.push({ field, op: 'eq', value })
    return this
  }

  neq(field: string, value: any) {
    this.filters.push({ field, op: 'neq', value })
    return this
  }

  in(field: string, values: any[]) {
    this.filters.push({ field, op: 'in', value: values })
    return this
  }

  gt(field: string, value: any) {
    this.filters.push({ field, op: 'gt', value })
    return this
  }

  gte(field: string, value: any) {
    this.filters.push({ field, op: 'gte', value })
    return this
  }

  lt(field: string, value: any) {
    this.filters.push({ field, op: 'lt', value })
    return this
  }

  lte(field: string, value: any) {
    this.filters.push({ field, op: 'lte', value })
    return this
  }

  limit(num: number) {
    this.limitVal = num
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  insert(values: any) {
    this.mode = 'insert'
    this.payload = values
    return this
  }

  update(values: any) {
    this.mode = 'update'
    this.payload = values
    return this
  }

  delete() {
    this.mode = 'delete'
    return this
  }

  upsert(values: any) {
    this.mode = 'insert'
    this.payload = values
    return this
  }

  async then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    try {
      if (this.mode === 'insert') {
        const records = Array.isArray(this.payload) ? this.payload : [this.payload]
        for (const item of records) {
          const pk = item._docId || item.id || item.student_id || item.emp_id || item.code || 'id'
          await saveDocument(this.collectionName, pk, item)
        }
        resolve({ data: this.payload, error: null })
        return
      }

      let data: any[] = await fetchCollectionData(this.collectionName)

      for (const filter of this.filters) {
        if (filter.op === 'eq') {
          data = data.filter((item: any) => String(item[filter.field]) === String(filter.value))
        } else if (filter.op === 'neq') {
          data = data.filter((item: any) => String(item[filter.field]) !== String(filter.value))
        } else if (filter.op === 'in') {
          const arr = Array.isArray(filter.value) ? filter.value.map((v) => String(v).toLowerCase()) : []
          data = data.filter((item: any) => arr.includes(String(item[filter.field] ?? '').toLowerCase()))
        }
      }

      if (this.mode === 'update') {
        for (const item of data) {
          const pk = item._docId || item.id || item.code || 'id'
          await saveDocument(this.collectionName, pk, { ...item, ...this.payload })
        }
        resolve({ data, error: null })
        return
      }

      if (this.mode === 'delete') {
        for (const item of data) {
          const pk = item._docId || item.id || item.code || 'id'
          await deleteDocument(this.collectionName, pk, item)
        }
        resolve({ data, error: null })
        return
      }

      if (this.limitVal) {
        data = data.slice(0, this.limitVal)
      }

      if (this.isSingle) {
        resolve({ data: data[0] || null, error: null })
      } else {
        resolve({ data, error: null })
      }
    } catch (err) {
      if (reject) reject(err)
      else resolve({ data: null, error: err })
    }
  }
}

export class ChannelBuilder {
  private collectionName: string
  private callback?: (payload: any) => void
  private unsub?: () => void

  constructor(channelName: string) {
    this.collectionName = channelName.replace(/^table-rt-/, '')
  }

  on(_event: string, filter: any, callback: (payload: any) => void) {
    const colName = filter?.table || this.collectionName
    this.callback = callback
    this.unsub = subscribeToCollection(colName, (items) => {
      if (this.callback) {
        this.callback({ eventType: 'UPDATE', new: items })
      }
    })
    return this
  }

  subscribe(statusCb?: (status: string) => void) {
    if (statusCb) statusCb('SUBSCRIBED')
    return this
  }

  unsubscribe() {
    if (this.unsub) this.unsub()
  }
}

export const firebaseClient = {
  from(tableName: string) {
    return new QueryBuilder(tableName)
  },
  channel(name: string) {
    return new ChannelBuilder(name)
  },
  removeChannel(channel: any) {
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe()
    }
  },
  auth: {
    async getSession() {
      return { data: { session: null }, error: null }
    },
    onAuthStateChange(_callback: any) {
      return { data: { subscription: { unsubscribe: () => {} } } }
    },
    async signInWithPassword(_credentials: any) {
      return { data: { user: null, session: null }, error: null }
    },
    async signOut() {
      return { error: null }
    }
  }
}

export const firebase = firebaseClient
export const supabase = realSupabaseClient
export const isSupabaseConfigured = true
export const uploadToSupabaseStorage = uploadToFirebaseStorage
