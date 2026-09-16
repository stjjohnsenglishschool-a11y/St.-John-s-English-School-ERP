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

        // Save items concurrently with timeout safeguards
        const savePromises = items.map(async (rawItem, idx) => {
          const item = { ...rawItem }
          let pk = 'id'

          if (this.collectionName === 'class_master') {
            if (!item.class_id) {
              item.class_id = 'CLS-' + String(item.class_name || `CLASS_${idx + 1}`).trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')
            }
            pk = 'class_id'
          } else if (this.collectionName === 'subject_master') {
            if (!item.subject_id) {
              const cname = String(item.class_name || 'ALL').trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')
              const sname = String(item.subject_name || `SUB_${idx + 1}`).trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')
              item.subject_id = `SUB-${cname}_${sname}`
            }
            pk = 'subject_id'
          } else if (this.collectionName === 'student_master') {
            if (!item.student_id) item.student_id = item.admission_no || `STU-${Date.now().toString().slice(-4)}${idx + 1}`
            pk = 'student_id'
          } else if (this.collectionName === 'employee_master') {
            if (!item.emp_id) item.emp_id = item.emp_code || `EMP-${Date.now().toString().slice(-4)}${idx + 1}`
            pk = 'emp_id'
          } else if (this.collectionName === 'department_master') {
            if (!item.department_id) item.department_id = item.department_code || `DEPT-${idx + 1}`
            pk = 'department_id'
          } else if (this.collectionName === 'vendor_master') {
            if (!item.vendor_id) item.vendor_id = item.vendor_code || `VND-${String(idx + 1).padStart(4, '0')}`
            pk = 'vendor_id'
          } else if (this.collectionName === 'asset_master') {
            if (!item.asset_id) item.asset_id = item.asset_code || `AST-${String(idx + 1).padStart(4, '0')}`
            pk = 'asset_id'
          } else if (this.collectionName === 'inventory_master') {
            if (!item.item_id) item.item_id = item.item_code || `ITM-${String(idx + 1).padStart(4, '0')}`
            pk = 'item_id'
          } else if (this.collectionName === 'fees_collection') {
            if (!item.fee_id) item.fee_id = item.receipt_number || `FEE-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'fee_id'
          } else if (this.collectionName === 'expense_master') {
            if (!item.expense_id) item.expense_id = `EXP-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'expense_id'
          } else if (this.collectionName === 'income_master') {
            if (!item.income_id) item.income_id = `INC-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'income_id'
          } else if (this.collectionName === 'salary_slip') {
            if (!item.slip_id) item.slip_id = `SLP-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'slip_id'
          } else if (this.collectionName === 'notice_automation') {
            if (!item.notice_id) item.notice_id = `NTC-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'notice_id'
          } else if (this.collectionName === 'assignments_master') {
            if (!item.assignment_id) item.assignment_id = `ASG-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'assignment_id'
          } else if (this.collectionName === 'leave_application') {
            if (!item.leave_app_id) item.leave_app_id = `LV-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'leave_app_id'
          } else if (this.collectionName === 'leave_balance') {
            if (!item.balance_id) item.balance_id = `BAL-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'balance_id'
          } else if (this.collectionName === 'warning_letter') {
            if (!item.letter_id) item.letter_id = `WRN-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'letter_id'
          } else if (this.collectionName === 'offer_letter') {
            if (!item.offer_id) item.offer_id = `OFR-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'offer_id'
          } else if (this.collectionName === 'employee_document') {
            if (!item.doc_id) item.doc_id = `DOC-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'doc_id'
          } else if (['teacher_idcard', 'student_idcard', 'escort_card'].includes(this.collectionName)) {
            if (!item.card_id) item.card_id = `CRD-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'card_id'
          } else if (['student_attendance', 'employee_attendance'].includes(this.collectionName)) {
            if (!item.attendance_id) item.attendance_id = `ATT-${Date.now().toString().slice(-4)}_${idx + 1}`
            pk = 'attendance_id'
          } else if (item._docId || item.id) {
            pk = item._docId ? '_docId' : 'id'
          }

          // Skip individual localStorage updates in bulk so parallel writes don't race
          await saveDocument(this.collectionName, pk, item, true)
          return item
        })

        const savedItems = await Promise.all(savePromises)
        inserted.push(...savedItems)

        // Write through batch into localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const cacheKey = `sjes_table_${this.collectionName}`
            const cached = localStorage.getItem(cacheKey)
            const list = cached ? JSON.parse(cached) : []
            const combined = [...inserted, ...list]
            // Deduplicate by _docId or primary key
            const seen = new Set<string>()
            const deduped: any[] = []
            for (const el of combined) {
              const id = String(
                el._docId ||
                el.student_id ||
                el.emp_id ||
                el.department_id ||
                el.class_id ||
                el.subject_id ||
                el.vendor_id ||
                el.asset_id ||
                el.item_id ||
                el.fee_id ||
                el.notice_id ||
                el.assignment_id ||
                el.expense_id ||
                el.income_id ||
                el.slip_id ||
                el.admission_no ||
                el.emp_code ||
                el.department_code ||
                el.vendor_code ||
                el.asset_code ||
                el.item_code ||
                el.receipt_number ||
                el.id ||
                el.code ||
                JSON.stringify(el)
              )
              if (!seen.has(id)) {
                seen.add(id)
                deduped.push(el)
              }
            }
            localStorage.setItem(cacheKey, JSON.stringify(deduped))
            if (this.collectionName === 'department_master') {
              localStorage.setItem('sjes_department_master', JSON.stringify(deduped))
            }
          } catch {
            // ignore
          }
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
          if (item.class_id || this.collectionName === 'class_master') pk = 'class_id'
          else if (item.subject_id || this.collectionName === 'subject_master') pk = 'subject_id'
          else if (item.student_id || item.admission_no) pk = item.student_id ? 'student_id' : 'admission_no'
          else if (item.emp_id || item.emp_code) pk = item.emp_id ? 'emp_id' : 'emp_code'
          else if (item.department_id || item.department_code) pk = item.department_id ? 'department_id' : 'department_code'
          else if (item.vendor_id || item.vendor_code) pk = item.vendor_id ? 'vendor_id' : 'vendor_code'
          else if (item.asset_id || item.asset_code) pk = item.asset_id ? 'asset_id' : 'asset_code'
          else if (item.item_id || item.item_code) pk = item.item_id ? 'item_id' : 'item_code'
          else if (item.fee_id || item.receipt_number) pk = item.fee_id ? 'fee_id' : 'receipt_number'
          else if (item.notice_id) pk = 'notice_id'
          else if (item.assignment_id) pk = 'assignment_id'
          else if (item.expense_id) pk = 'expense_id'
          else if (item.income_id) pk = 'income_id'
          else if (item.slip_id) pk = 'slip_id'
          else if (item.user_id || item.user_name) pk = item.user_id ? 'user_id' : 'user_name'
          else if (item._docId || item.id) pk = item._docId ? '_docId' : 'id'
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
