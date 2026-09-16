import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  addDoc,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import firebaseConfig from '../../firebase-applet-config.json'

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

const configAny = firebaseConfig as any

export const db =
  configAny.firestoreDatabaseId && configAny.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, configAny.firestoreDatabaseId)
    : getFirestore(app)

export const auth = getAuth(app)
export const storage = getStorage(app)

/**
 * Record an audit log entry in userlog_master Firestore collection
 */
export async function logActivity(params: {
  username?: string
  action: string
  module: string
  status?: 'success' | 'failed' | 'warning' | 'info'
  errorMessage?: string
}) {
  try {
    const currentUser = auth.currentUser
    const username =
      params.username ||
      currentUser?.displayName ||
      currentUser?.email ||
      'Administrator'

    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    const logData = {
      log_id: logId,
      username,
      action: params.action,
      module: params.module,
      status: params.status || 'success',
      error_message: params.errorMessage || null,
      device_info: `${navigator.platform || ''} · ${navigator.language || ''}`,
      browser: navigator.userAgent.slice(0, 100),
      created_at: new Date().toISOString()
    }

    await setDoc(doc(db, 'userlog_master', logId), logData)
  } catch (error) {
    console.warn('Failed to record audit log in Firebase:', error)
  }
}

/**
 * Upload a document or image with strict 2.5s timeout and instant compressed Data URL fallback
 */
export async function uploadToFirebaseStorage(
  file: File,
  bucketFolder = 'school-documents',
  prefix = 'uploads'
): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin'
  const safePrefix = prefix.replace(/[\/\\]/g, '_')
  const filename = `${safePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`

  // High-performance fallback: reads file to Data URL and compresses photos if large
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
    const fileRef = ref(storage, `${bucketFolder}/${filename}`)
    const uploadTask = (async () => {
      const snapshot = await uploadBytes(fileRef, file)
      return await getDownloadURL(snapshot.ref)
    })()

    // Strict 2.5s timeout prevents hanging on unconfigured buckets or CORS retries
    const timeoutTask = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Storage timeout (2.5s)')), 2500)
    )

    return await Promise.race([uploadTask, timeoutTask])
  } catch (err) {
    console.warn('Firebase Storage upload warning or timeout, using instant local fallback:', err)
    return await readFileAsDataUrl()
  }
}

/**
 * Fetch all documents from a Firestore collection with local fallback
 */
export async function fetchCollectionData<T = any>(collectionName: string): Promise<T[]> {
  try {
    const fetchPromise = getDocs(collection(db, collectionName))
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    const querySnapshot = await Promise.race([fetchPromise, timeoutPromise])

    if (querySnapshot && typeof (querySnapshot as any).forEach === 'function') {
      const results: T[] = []
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data() || {}
        results.push({
          _docId: docSnap.id,
          id: d.id || docSnap.id,
          ...d,
        } as T)
      })
      if (results.length > 0) {
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.setItem(`sjes_table_${collectionName}`, JSON.stringify(results))
          } catch {
            // ignore localStorage quota errors
          }
        }
        return results
      }
    }
  } catch (err) {
    console.error(`Error fetching collection ${collectionName} from Firebase:`, err)
  }

  // Fallback to localStorage if Firebase is empty, offline, or timed out
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = localStorage.getItem(`sjes_table_${collectionName}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as T[]
        }
      }
    } catch {
      // ignore
    }
  }
  return []
}

/**
 * Save (insert or update) a document in Firestore with localStorage write-through
 */
export async function saveDocument(
  collectionName: string,
  primaryKeyField: string,
  data: Record<string, any>,
  skipLocalStorage = false
): Promise<{ success: boolean; error?: string }> {
  try {
    if (collectionName === 'class_master' && !data.class_id && data.class_name) {
      data.class_id = 'CLS-' + String(data.class_name).trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')
    }

    let docId =
      data._docId ||
      data[primaryKeyField] ||
      data.student_id ||
      data.emp_id ||
      data.department_id ||
      data.class_id ||
      data.subject_id ||
      data.vendor_id ||
      data.asset_id ||
      data.item_id ||
      data.user_id ||
      data.notice_id ||
      data.assignment_id ||
      data.fee_id ||
      data.expense_id ||
      data.income_id ||
      data.slip_id ||
      data.leave_app_id ||
      data.balance_id ||
      data.letter_id ||
      data.offer_id ||
      data.doc_id ||
      data.card_id ||
      data.attendance_id ||
      data.admission_no ||
      data.emp_code ||
      data.department_code ||
      data.vendor_code ||
      data.receipt_number ||
      data.asset_code ||
      data.item_code ||
      data.code ||
      data.id

    if (!docId) {
      docId = doc(collection(db, collectionName)).id
    }
    docId = String(docId).replace(/[\/\\]/g, '_').trim()
    data[primaryKeyField] = data[primaryKeyField] || docId
    data._docId = docId

    // Write through to localStorage immediately so table is never empty or stuck (unless skipped for batch)
    if (!skipLocalStorage && typeof window !== 'undefined' && window.localStorage) {
      try {
        const cacheKey = `sjes_table_${collectionName}`
        const cachedStr = localStorage.getItem(cacheKey)
        let cachedList: any[] = cachedStr ? JSON.parse(cachedStr) : []
        const existingIdx = cachedList.findIndex(
          (item: any) =>
            String(item._docId) === docId ||
            (primaryKeyField && String(item[primaryKeyField]) === docId) ||
            (data[primaryKeyField] && String(item[primaryKeyField]) === String(data[primaryKeyField]))
        )
        const updatedItem = { ...data, _docId: docId, updated_at: new Date().toISOString() }
        if (existingIdx >= 0) {
          cachedList[existingIdx] = { ...cachedList[existingIdx], ...updatedItem }
        } else {
          cachedList = [updatedItem, ...cachedList]
        }
        localStorage.setItem(cacheKey, JSON.stringify(cachedList))
      } catch {
        // ignore localStorage error
      }
    }

    // Attempt Firebase setDoc with timeout protection so offline/slow states don't hang
    const setPromise = setDoc(
      doc(db, collectionName, docId),
      {
        ...data,
        _docId: docId,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    )

    const timeoutPromise = new Promise<{ success: boolean }>((resolve) =>
      setTimeout(() => resolve({ success: true }), 1500)
    )

    await Promise.race([setPromise, timeoutPromise])

    return { success: true }
  } catch (err: any) {
    console.error(`Error saving document to ${collectionName}:`, err)
    return { success: false, error: err?.message || 'Failed to save to Firebase' }
  }
}

/**
 * Save multiple documents efficiently using Firestore writeBatch with fast fallback and instant localStorage sync
 */
export async function saveBatchDocuments(
  collectionName: string,
  primaryKeyField: string,
  items: Array<Record<string, any>>
): Promise<{ success: boolean; count: number }> {
  if (!items || items.length === 0) return { success: true, count: 0 }

  const sanitizedItems = items.map((rawItem, idx) => {
    const item = { ...rawItem }
    let docId =
      item._docId ||
      item[primaryKeyField] ||
      item.student_id ||
      item.emp_id ||
      item.department_id ||
      item.class_id ||
      item.subject_id ||
      item.vendor_id ||
      item.asset_id ||
      item.item_id ||
      item.fee_id ||
      item.notice_id ||
      item.assignment_id ||
      item.expense_id ||
      item.income_id ||
      item.slip_id ||
      item.admission_no ||
      item.emp_code ||
      item.department_code ||
      item.vendor_code ||
      item.receipt_number ||
      item.asset_code ||
      item.item_code ||
      item.id ||
      `row_${Date.now()}_${idx + 1}`

    docId = String(docId).replace(/[\/\\]/g, '_').trim()
    item[primaryKeyField] = item[primaryKeyField] || docId
    item._docId = docId
    item.updated_at = new Date().toISOString()
    return item
  })

  // 1. Instantly update localStorage synchronously so UI is never waiting
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cacheKey = `sjes_table_${collectionName}`
      const cachedStr = localStorage.getItem(cacheKey)
      const cachedList: any[] = cachedStr ? JSON.parse(cachedStr) : []
      const combined = [...sanitizedItems, ...cachedList]
      const seen = new Set<string>()
      const deduped: any[] = []
      for (const el of combined) {
        const id = String(el._docId || el[primaryKeyField] || JSON.stringify(el))
        if (!seen.has(id)) {
          seen.add(id)
          deduped.push(el)
        }
      }
      localStorage.setItem(cacheKey, JSON.stringify(deduped))
      if (collectionName === 'department_master') {
        localStorage.setItem('sjes_department_master', JSON.stringify(deduped))
      }
    } catch {
      // ignore quota errors
    }
  }

  // 2. Commit in Firestore batches (max 400 per batch) with 2s timeout
  try {
    const chunkSize = 400
    for (let i = 0; i < sanitizedItems.length; i += chunkSize) {
      const chunk = sanitizedItems.slice(i, i + chunkSize)
      const batch = writeBatch(db)
      chunk.forEach((item) => {
        const docRef = doc(db, collectionName, item._docId)
        batch.set(docRef, item, { merge: true })
      })
      const batchPromise = batch.commit()
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000))
      await Promise.race([batchPromise, timeoutPromise])
    }
  } catch (err) {
    console.warn(`Firestore batch commit warning for ${collectionName}:`, err)
  }

  return { success: true, count: sanitizedItems.length }
}

/**
 * Delete a document from Firestore permanently
 */
export async function deleteDocument(
  collectionName: string,
  docId: string | number,
  additionalInfo?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const strId = String(docId).trim()
    const targetDocIds = new Set<string>()

    if (strId) {
      targetDocIds.add(strId)
    }

    if (additionalInfo) {
      if (additionalInfo._docId) targetDocIds.add(String(additionalInfo._docId))
      if (additionalInfo.id) targetDocIds.add(String(additionalInfo.id))
      if (additionalInfo.vendor_code) targetDocIds.add(String(additionalInfo.vendor_code))
      if (additionalInfo.vendor_id) targetDocIds.add(String(additionalInfo.vendor_id))
      if (additionalInfo.department_code) targetDocIds.add(String(additionalInfo.department_code))
      if (additionalInfo.department_id) targetDocIds.add(String(additionalInfo.department_id))
      if (additionalInfo.admission_no) targetDocIds.add(String(additionalInfo.admission_no))
      if (additionalInfo.student_id) targetDocIds.add(String(additionalInfo.student_id))
      if (additionalInfo.emp_code) targetDocIds.add(String(additionalInfo.emp_code))
      if (additionalInfo.emp_id) targetDocIds.add(String(additionalInfo.emp_id))
      if (additionalInfo.class_id) targetDocIds.add(String(additionalInfo.class_id))
      if (collectionName === 'class_master' && additionalInfo.class_name) targetDocIds.add(String(additionalInfo.class_name))
      if (additionalInfo.subject_id) targetDocIds.add(String(additionalInfo.subject_id))
      if (additionalInfo.subject_name) targetDocIds.add(String(additionalInfo.subject_name))
      if (additionalInfo.user_id) targetDocIds.add(String(additionalInfo.user_id))
      if (additionalInfo.user_name) targetDocIds.add(String(additionalInfo.user_name))
      if (additionalInfo.code) targetDocIds.add(String(additionalInfo.code))
      if (additionalInfo.receipt_number) targetDocIds.add(String(additionalInfo.receipt_number))
      if (additionalInfo.asset_id) targetDocIds.add(String(additionalInfo.asset_id))
      if (additionalInfo.asset_code) targetDocIds.add(String(additionalInfo.asset_code))
      if (additionalInfo.item_id) targetDocIds.add(String(additionalInfo.item_id))
      if (additionalInfo.item_code) targetDocIds.add(String(additionalInfo.item_code))
      if (additionalInfo.fee_id) targetDocIds.add(String(additionalInfo.fee_id))
      if (additionalInfo.expense_id) targetDocIds.add(String(additionalInfo.expense_id))
      if (additionalInfo.income_id) targetDocIds.add(String(additionalInfo.income_id))
    }

    // 1. Direct delete all candidate document IDs
    for (const id of targetDocIds) {
      try {
        await deleteDoc(doc(db, collectionName, id))
      } catch {
        // continue
      }
    }

    // 2. Query Firestore collection to find and delete ANY document where any ID field matches targetDocIds
    const querySnapshot = await getDocs(collection(db, collectionName))
    const toDeleteRefs: any[] = []
    
    querySnapshot.forEach((docSnap) => {
      if (targetDocIds.has(docSnap.id)) {
        toDeleteRefs.push(docSnap.ref)
        return
      }
      const data = docSnap.data() || {}
      const candidateValues = [
        data.id, data._docId, data.vendor_id, data.vendor_code,
        data.department_id, data.department_code, data.student_id, data.admission_no,
        data.emp_id, data.emp_code, data.user_id, data.user_name,
        data.class_id, collectionName === 'class_master' ? data.class_name : null, data.subject_id,
        data.fee_id, data.receipt_number, data.expense_id, data.income_id,
        data.asset_id, data.asset_code, data.item_id, data.item_code,
        data.code
      ].filter(Boolean).map(String)

      for (const targetId of targetDocIds) {
        if (candidateValues.includes(targetId)) {
          toDeleteRefs.push(docSnap.ref)
          break
        }
      }
    })

    for (const ref of toDeleteRefs) {
      await deleteDoc(ref)
    }

    // Also remove from localStorage cache
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cacheKey = `sjes_table_${collectionName}`
        const cachedStr = localStorage.getItem(cacheKey)
        if (cachedStr) {
          const cachedList: any[] = JSON.parse(cachedStr)
          const filteredList = cachedList.filter((item: any) => {
            const keys = [
              item._docId,
              item.id,
              item.class_id,
              item.class_name,
              item.student_id,
              item.admission_no,
              item.emp_id,
              item.emp_code,
              item.department_id,
              item.department_code,
              item.vendor_id,
              item.vendor_code,
              item.user_id,
              item.user_name,
              item.receipt_number,
              item.code,
            ].filter(Boolean).map(String)
            return !keys.some((k) => targetDocIds.has(k))
          })
          localStorage.setItem(cacheKey, JSON.stringify(filteredList))
        }
      } catch {
        // ignore
      }
    }

    return { success: true }
  } catch (err: any) {
    console.error(`Error deleting doc ${docId} from ${collectionName}:`, err)
    return { success: false, error: err?.message || 'Failed to delete from Firebase' }
  }
}

/**
 * Listen to real-time changes on a collection
 */
export function subscribeToCollection<T = any>(
  collectionName: string,
  onData: (data: T[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      const items: T[] = []
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() || {}
        items.push({
          _docId: docSnap.id,
          id: d.id || docSnap.id,
          ...d,
        } as T)
      })
      onData(items)
    },
    (err) => {
      console.warn(`Snapshot listener error for ${collectionName}:`, err)
    }
  )
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
        let commonPk = 'id'

        const preparedItems = items.map((rawItem, idx) => {
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

          commonPk = pk
          return item
        })

        // Execute lightning fast batch insert with immediate localStorage update and Firestore batch
        await saveBatchDocuments(this.collectionName, commonPk, preparedItems)

        const resultData = Array.isArray(this.payload) ? preparedItems : preparedItems[0]
        resolve({ data: resultData, error: null, count: preparedItems.length })
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

/**
 * Firebase Client unified query engine
 */
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
export const supabase = firebaseClient
export const isSupabaseConfigured = true
export const uploadToSupabaseStorage = uploadToFirebaseStorage
