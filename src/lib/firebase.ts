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
  Unsubscribe
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
 * Upload a document or image to Firebase Storage (with base64 fallback)
 */
export async function uploadToFirebaseStorage(
  file: File,
  bucketFolder = 'school-documents',
  prefix = 'uploads'
): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin'
  const filename = `${prefix}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`
  const fileRef = ref(storage, `${bucketFolder}/${filename}`)

  try {
    const snapshot = await uploadBytes(fileRef, file)
    const downloadUrl = await getDownloadURL(snapshot.ref)
    return downloadUrl
  } catch (err) {
    console.warn('Firebase Storage upload warning, using local data URL fallback:', err)
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}

/**
 * Fetch all documents from a Firestore collection
 */
export async function fetchCollectionData<T = any>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName))
    const results: T[] = []
    querySnapshot.forEach((docSnap) => {
      const d = docSnap.data() || {}
      results.push({
        _docId: docSnap.id,
        id: d.id || docSnap.id,
        ...d,
      } as T)
    })
    return results
  } catch (err) {
    console.error(`Error fetching collection ${collectionName} from Firebase:`, err)
    return []
  }
}

/**
 * Save (insert or update) a document in Firestore
 */
export async function saveDocument(collectionName: string, primaryKeyField: string, data: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  try {
    let docId = data._docId || data[primaryKeyField] || data.id || data.code || data.user_id || data.student_id || data.emp_id || data.employee_id
    if (!docId) {
      docId = doc(collection(db, collectionName)).id
    }
    docId = String(docId)
    data[primaryKeyField] = data[primaryKeyField] || docId

    await setDoc(doc(db, collectionName, docId), {
      ...data,
      _docId: docId,
      updated_at: new Date().toISOString()
    }, { merge: true })

    return { success: true }
  } catch (err: any) {
    console.error(`Error saving document to ${collectionName}:`, err)
    return { success: false, error: err?.message || 'Failed to save to Firebase' }
  }
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
      if (additionalInfo.class_name) targetDocIds.add(String(additionalInfo.class_name))
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
        data.class_id, data.class_name, data.subject_id, data.subject_name,
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
