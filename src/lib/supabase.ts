import {
  db,
  auth,
  storage,
  logActivity,
  uploadToFirebaseStorage,
  fetchCollectionData,
  saveDocument,
  deleteDocument,
  subscribeToCollection
} from './firebase'

export {
  db,
  auth,
  storage,
  logActivity,
  uploadToFirebaseStorage as uploadToSupabaseStorage,
  fetchCollectionData,
  saveDocument,
  deleteDocument,
  subscribeToCollection
}

export type Session = any

class QueryBuilder {
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
    if (this.mode === 'select') {
      this.mode = 'select'
    }
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

  range(_from: number, _to: number) {
    return this
  }

  or(_condition: string) {
    return this
  }

  order(_field: string, _opts?: { ascending?: boolean }) {
    return this
  }

  limit(n: number) {
    this.limitVal = n
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  maybeSingle() {
    this.isSingle = true
    return this
  }

  insert(records: any | any[]) {
    this.mode = 'insert'
    this.payload = records
    return this
  }

  upsert(records: any | any[], _opts?: any) {
    this.mode = 'insert'
    this.payload = records
    return this
  }

  update(payload: any) {
    this.mode = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.mode = 'delete'
    return this
  }

  async then(resolve: (res: { data: any; error: any; count?: number }) => void, reject?: (err: any) => void) {
    try {
      if (this.mode === 'insert') {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload]
        const inserted: any[] = []
        for (const item of items) {
          let pk = 'id'
          if (item.department_id || item.department_code) pk = item.department_id ? 'department_id' : 'department_code'
          else if (item.class_id || item.class_name) pk = item.class_id ? 'class_id' : 'class_name'
          else if (item.student_id || item.admission_no) pk = item.student_id ? 'student_id' : 'admission_no'
          else if (item.emp_id || item.emp_code) pk = item.emp_id ? 'emp_id' : 'emp_code'
          else if (item.receipt_number) pk = 'receipt_number'
          else if (item.user_id || item.user_name) pk = item.user_id ? 'user_id' : 'user_name'
          else if (item.asset_code) pk = 'asset_code'
          else if (item.item_code) pk = 'item_code'
          else if (item.code) pk = 'code'

          await saveDocument(this.collectionName, pk, item)
          inserted.push(item)
        }
        const resultData = Array.isArray(this.payload) ? inserted : inserted[0]
        resolve({ data: resultData, error: null, count: inserted.length })
        return
      }

      let data = await fetchCollectionData(this.collectionName)

      // Apply filters
      for (const filter of this.filters) {
        if (filter.op === 'eq') {
          data = data.filter((item: any) => String(item[filter.field]) === String(filter.value))
        } else if (filter.op === 'neq') {
          data = data.filter((item: any) => String(item[filter.field]) !== String(filter.value))
        } else if (filter.op === 'in') {
          const arr = Array.isArray(filter.value) ? filter.value.map(String) : []
          data = data.filter((item: any) => arr.includes(String(item[filter.field])))
        } else if (filter.op === 'gt') {
          data = data.filter((item: any) => item[filter.field] > filter.value)
        } else if (filter.op === 'gte') {
          data = data.filter((item: any) => item[filter.field] >= filter.value)
        } else if (filter.op === 'lt') {
          data = data.filter((item: any) => item[filter.field] < filter.value)
        } else if (filter.op === 'lte') {
          data = data.filter((item: any) => item[filter.field] <= filter.value)
        }
      }

      if (this.mode === 'update') {
        for (const item of data) {
          let pk = 'id'
          if (item.department_id || item.department_code) pk = item.department_id ? 'department_id' : 'department_code'
          else if (item.class_id || item.class_name) pk = item.class_id ? 'class_id' : 'class_name'
          else if (item.student_id || item.admission_no) pk = item.student_id ? 'student_id' : 'admission_no'
          else if (item.emp_id || item.emp_code) pk = item.emp_id ? 'emp_id' : 'emp_code'
          else if (item.receipt_number) pk = 'receipt_number'
          else if (item.user_id || item.user_name) pk = item.user_id ? 'user_id' : 'user_name'
          else if (item.asset_code) pk = 'asset_code'
          else if (item.item_code) pk = 'item_code'
          else if (item.code) pk = 'code'

          await saveDocument(this.collectionName, pk, { ...item, ...this.payload })
        }
        resolve({ data, error: null })
        return
      }

      if (this.mode === 'delete') {
        for (const item of data) {
          const pk = item._docId || item.id || item.department_id || item.class_id || item.student_id || item.emp_id || item.user_id || item.code || item.department_code || item.receipt_number || item.asset_code || item.item_code || item.vendor_id || item.vendor_code
          if (pk) {
            await deleteDocument(this.collectionName, pk, item)
          }
        }
        resolve({ data, error: null })
        return
      }

      // Default: select mode
      const totalCount = data.length
      if (this.limitVal) {
        data = data.slice(0, this.limitVal)
      }
      if (this.isSingle) {
        resolve({ data: data[0] || null, error: null, count: totalCount })
      } else {
        resolve({ data, error: null, count: totalCount })
      }
    } catch (error: any) {
      if (reject) reject(error)
      else resolve({ data: null, error })
    }
  }
}

class ChannelBuilder {
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

export const supabase = {
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

export const isSupabaseConfigured = true
export const SUPABASE_SERVICE_ROLE_KEY = ''
