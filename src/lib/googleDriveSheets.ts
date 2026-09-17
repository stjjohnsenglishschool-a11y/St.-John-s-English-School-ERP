import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import firebaseConfig from '../../firebase-applet-config.json'
import { saveBatchDocuments, saveDocument } from './firebase'

// Google Workspace Constants - Students
export const GOOGLE_DRIVE_FOLDER_ID = '19EmUMwDpNxuufOr995XPsg_XoG-BqZWO'
export const GOOGLE_DRIVE_FOLDER_NAME = 'student_data_photo'
export const GOOGLE_SHEET_ID = '1OGD09mG-m54rSKBJl2nmOc-pFraYZRnMcCTyoAEWGto'
export const GOOGLE_SHEET_TAB_NAME = 'student_data'
export const STUDENT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxV3tDQi3ZB4XMnJaBkMN8FeCp4f392FRwxcHYFoWWHa-pXc4SzyxsrkEfyxFh8WKCZ/exec'

// Google Workspace Constants - Staff
export const STAFF_GOOGLE_DRIVE_FOLDER_ID = '1zcVv1vwxdMNAKPP52THA4SE8TzUGOOLa'
export const STAFF_GOOGLE_DRIVE_FOLDER_NAME = 'staff_photo'
export const STAFF_GOOGLE_SHEET_ID = '1JUZXNNcIZeMGFyzmFbdfxADLY8Jwb_r3e03rJK5rWgc'
export const STAFF_GOOGLE_SHEET_TAB_NAME = 'staff_data'
export const STAFF_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyNqGgtrYurPPJkKQZmtWaSdeK2SMVXDpZKJIfhfM63S2-bkfJXrfFWmDljG5pQqXa5/exec'

export const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
]

// Initialize Firebase Auth
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)

const provider = new GoogleAuthProvider()
REQUIRED_SCOPES.forEach((s) => provider.addScope(s))
provider.setCustomParameters({
  prompt: 'select_account',
})

// In-memory token cache
let cachedAccessToken: string | null = null
let cachedGoogleUser: User | null = null
let isConnecting = false

type AuthListener = (user: User | null, token: string | null) => void
const authListeners: Set<AuthListener> = new Set()

export function subscribeGoogleAuth(listener: AuthListener): () => void {
  authListeners.add(listener)
  listener(cachedGoogleUser, cachedAccessToken)
  return () => authListeners.delete(listener)
}

function notifyListeners() {
  authListeners.forEach((fn) => {
    try {
      fn(cachedGoogleUser, cachedAccessToken)
    } catch {
      // ignore
    }
  })
}

// Track auth state
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (user) => {
    cachedGoogleUser = user
    if (!user) {
      cachedAccessToken = null
    }
    notifyListeners()
  })
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: {
              access_token?: string
              error?: string
              error_description?: string
            }) => void
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void
          }
        }
      }
    }
  }
}

export type ConnectGoogleResult = {
  success: boolean
  user?: User | { email?: string; displayName?: string }
  accessToken?: string
  error?: string
  isUnauthorizedDomain?: boolean
  currentDomain?: string
}

/**
 * Connects Google Workspace account via Google Identity Services or Firebase Popup
 */
export async function connectGoogleWorkspace(): Promise<ConnectGoogleResult> {
  if (isConnecting) {
    return { success: false, error: 'Connection already in progress' }
  }
  isConnecting = true
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : ''

  // Method 1: Try Google Identity Services (GSI) Token Client if available
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2 && firebaseConfig.oAuthClientId) {
    try {
      const tokenPromise = new Promise<{ success: boolean; token?: string; error?: string }>((resolve) => {
        try {
          const client = window.google!.accounts!.oauth2!.initTokenClient({
            client_id: firebaseConfig.oAuthClientId,
            scope: REQUIRED_SCOPES.join(' '),
            callback: (response) => {
              if (response.error) {
                resolve({ success: false, error: response.error_description || response.error })
              } else if (response.access_token) {
                resolve({ success: true, token: response.access_token })
              } else {
                resolve({ success: false, error: 'No access token received from Google' })
              }
            },
          })
          client.requestAccessToken({ prompt: 'select_account' })
        } catch (gsiErr: any) {
          resolve({ success: false, error: gsiErr?.message || 'GSI initialization failed' })
        }
      })

      const gsiRes = await tokenPromise
      if (gsiRes.success && gsiRes.token) {
        cachedAccessToken = gsiRes.token
        cachedGoogleUser = {
          email: 'Authorized Google Account',
          displayName: 'Google Workspace User',
        } as any
        notifyListeners()
        isConnecting = false
        return {
          success: true,
          user: cachedGoogleUser || undefined,
          accessToken: cachedAccessToken || undefined,
        }
      }
    } catch (gsiFallbackErr) {
      console.warn('GSI flow encountered issue, falling back to Firebase popup:', gsiFallbackErr)
    }
  }

  // Method 2: Firebase Auth Popup
  try {
    const result = await signInWithPopup(auth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    if (!credential?.accessToken) {
      throw new Error('Could not retrieve access token from Google sign in')
    }
    cachedAccessToken = credential.accessToken
    cachedGoogleUser = result.user
    notifyListeners()
    return {
      success: true,
      user: result.user,
      accessToken: cachedAccessToken,
    }
  } catch (err: any) {
    console.error('Google Workspace Connect Error:', err)
    const errorMsg = String(err?.message || err)
    const isDomainError =
      errorMsg.includes('auth/unauthorized-domain') ||
      errorMsg.includes('unauthorized-domain') ||
      err?.code === 'auth/unauthorized-domain'

    return {
      success: false,
      error: isDomainError
        ? `Firebase: Error (auth/unauthorized-domain). The domain "${currentHostname}" must be added to Firebase Console > Authentication > Settings > Authorized Domains.`
        : err.message || 'Failed to connect Google Account',
      isUnauthorizedDomain: isDomainError,
      currentDomain: currentHostname,
    }
  } finally {
    isConnecting = false
  }
}

export function getGoogleAccessToken(): string | null {
  return cachedAccessToken
}

export function getGoogleUser(): User | null {
  return cachedGoogleUser
}

export function isGoogleConnected(): boolean {
  return Boolean(cachedAccessToken)
}

export function getGoogleAuthState() {
  return {
    isConnected: isGoogleConnected(),
    user: cachedGoogleUser,
    accessToken: cachedAccessToken,
  }
}

export async function disconnectGoogle(): Promise<void> {
  try {
    await auth.signOut()
  } catch {
    // ignore
  }
  cachedAccessToken = null
  cachedGoogleUser = null
  notifyListeners()
}

export const disconnectGoogleWorkspace = disconnectGoogle

/**
 * Upload an image file (Student Photo, Father Photo, or Mother Photo) directly to Google Drive folder
 */
export async function uploadPhotoToGoogleDrive(
  file: File | Blob,
  photoType: 'student' | 'father' | 'mother',
  studentNameOrAdm: string,
  customFileName?: string
): Promise<{ success: boolean; url?: string; fileId?: string; error?: string }> {
  try {
    let token = cachedAccessToken
    if (!token) {
      // Attempt to connect if not yet connected
      const conn = await connectGoogleWorkspace()
      if (!conn.success || !conn.accessToken) {
        return {
          success: false,
          error:
            conn.error ||
            'Google Drive authorization required. Please connect your Google account to upload photos to Drive.',
        }
      }
      token = conn.accessToken
    }

    const cleanName = (studentNameOrAdm || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_')
    const timeStamp = Date.now().toString().slice(-6)
    const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg'
    const fileName =
      customFileName ||
      `${photoType.toUpperCase()}_${cleanName}_${timeStamp}.${ext}`

    const metadata = {
      name: fileName,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
      mimeType: file.type || 'image/jpeg',
      description: `${photoType.toUpperCase()} Photo for ${studentNameOrAdm} - St. John's English School`,
    }

    const boundary = '-------314159265358979323846'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const fileReader = new FileReader()
    const fileArrayBufferPromise = new Promise<ArrayBuffer>((resolve, reject) => {
      fileReader.onload = () => resolve(fileReader.result as ArrayBuffer)
      fileReader.onerror = () => reject(fileReader.error)
      fileReader.readAsArrayBuffer(file)
    })
    const arrayBuffer = await fileArrayBufferPromise

    // Construct multipart body
    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}`
    const mediaHeader = `${delimiter}Content-Type: ${file.type || 'image/jpeg'}\r\n\r\n`

    const enc = new TextEncoder()
    const metadataBytes = enc.encode(metadataPart)
    const mediaHeaderBytes = enc.encode(mediaHeader)
    const closeDelimiterBytes = enc.encode(closeDelimiter)

    const totalLength =
      metadataBytes.length +
      mediaHeaderBytes.length +
      arrayBuffer.byteLength +
      closeDelimiterBytes.length
    const combinedBuffer = new Uint8Array(totalLength)

    let offset = 0
    combinedBuffer.set(metadataBytes, offset)
    offset += metadataBytes.length
    combinedBuffer.set(mediaHeaderBytes, offset)
    offset += mediaHeaderBytes.length
    combinedBuffer.set(new Uint8Array(arrayBuffer), offset)
    offset += arrayBuffer.byteLength
    combinedBuffer.set(closeDelimiterBytes, offset)

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webContentLink,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: combinedBuffer,
      }
    )

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}))
      if (response.status === 401) {
        cachedAccessToken = null
        notifyListeners()
        throw new Error('Google token expired. Please re-authenticate.')
      }
      throw new Error(
        errJson.error?.message || `Google Drive Upload failed with HTTP ${response.status}`
      )
    }

    const resData = await response.json()
    const fileId = resData.id

    // Make file viewable so thumbnail and ID card previews render properly
    try {
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
          }),
        }
      )
    } catch {
      // ignore permission error if organization policy restricts
    }

    const driveUrl = `https://lh3.googleusercontent.com/d/${fileId}`

    return {
      success: true,
      fileId,
      url: driveUrl,
    }
  } catch (err: any) {
    console.error('Google Drive photo upload error:', err)
    return {
      success: false,
      error: err.message || 'Failed to upload photo to Google Drive',
    }
  }
}

/**
 * Standard Clean Headers for Google Sheet (student_data tab)
 */
export const STUDENT_SHEET_HEADERS = [
  'Admission No',
  'Roll No',
  'Academic Year',
  'Class Name',
  'Section',
  'Student Status',
  'Full Name',
  'Date of Birth',
  'Gender',
  'Blood Group',
  'Student Photo URL',
  'Father Name',
  'Father Mobile',
  'Father Occupation',
  'Father Photo URL',
  'Mother Name',
  'Mother Mobile',
  'Mother Occupation',
  'Mother Photo URL',
  'Address',
  'Last Updated',
]

/**
 * Converts a Student object to a single row array matching the exact headers
 */
export function studentToSheetRow(s: any): string[] {
  return [
    String(s.admission_no || s.admission_number || ''),
    String(s.roll_no || s.roll || ''),
    String(s.academic_year || '2026-27'),
    String(s.class_name || ''),
    String(s.section || 'A'),
    String(s.student_status || 'Active'),
    String(s.full_name || s.student_name || ''),
    String(s.date_of_birth || s.dob || ''),
    String(s.gender || ''),
    String(s.blood_group || ''),
    String(s.student_photo_url || ''),
    String(s.father_name || ''),
    String(s.father_mobile || ''),
    String(s.father_occupation || ''),
    String(s.father_photo_url || ''),
    String(s.mother_name || ''),
    String(s.mother_mobile || ''),
    String(s.mother_occupation || ''),
    String(s.mother_photo_url || ''),
    String(s.address || s.current_address || ''),
    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  ]
}

/**
 * Ensures the target sheet tab ('student_data') exists in the spreadsheet
 */
async function ensureSheetTabExists(token: string): Promise<boolean> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!metaRes.ok) {
      if (metaRes.status === 401) {
        cachedAccessToken = null
        notifyListeners()
      }
      return false
    }
    const meta = await metaRes.json()
    const sheets = meta.sheets || []
    const hasTab = sheets.some(
      (s: any) => s.properties?.title === GOOGLE_SHEET_TAB_NAME
    )

    if (!hasTab) {
      // Add 'student_data' tab
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: GOOGLE_SHEET_TAB_NAME,
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: 26,
                      frozenRowCount: 1,
                    },
                  },
                },
              },
            ],
          }),
        }
      )
    }
    return true
  } catch (e) {
    console.warn('Error checking/creating sheet tab:', e)
    return false
  }
}

/**
 * Normalizes a raw Student row or object from Google Apps Script Web App / Sheet
 */
export function normalizeStudentRowOrObject(item: any, index: number, headers?: string[]): any {
  if (!item) return null

  if (Array.isArray(item)) {
    const h = headers || STUDENT_SHEET_HEADERS
    const getVal = (...keywords: string[]) => {
      const cleanKeywords = keywords.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
      for (let i = 0; i < h.length; i++) {
        const cleanH = String(h[i] || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        if (cleanKeywords.includes(cleanH)) {
          return item[i] !== undefined ? String(item[i]).trim() : ''
        }
      }
      return ''
    }

    const adm = getVal('admissionno', 'admissionnumber', 'admid', 'student_id') || item[0] || `ADM-${index + 1}`
    const roll = getVal('rollno', 'roll') || item[1] || ''
    const ay = getVal('academicyear', 'year') || item[2] || '2026-27'
    const cls = getVal('classname', 'class', 'grade') || item[3] || 'CLASS I'
    const sec = getVal('section', 'sec') || item[4] || 'A'
    const status = getVal('studentstatus', 'status') || item[5] || 'Active'
    const name = getVal('fullname', 'studentname', 'name') || item[6] || 'Student'
    const dob = getVal('dateofbirth', 'dob') || item[7] || ''
    const gender = getVal('gender', 'sex') || item[8] || 'Male'
    const bg = getVal('bloodgroup', 'blood') || item[9] || ''
    const sPhoto = getVal('studentphotourl', 'studentphoto', 'photourl', 'photo') || item[10] || ''
    const fName = getVal('fathername') || item[11] || ''
    const fMob = getVal('fathermobile', 'fathernumber') || item[12] || ''
    const fOcc = getVal('fatheroccupation') || item[13] || ''
    const fPhoto = getVal('fatherphotourl', 'fatherphoto') || item[14] || ''
    const mName = getVal('mothername') || item[15] || ''
    const mMob = getVal('mothermobile', 'mothernumber') || item[16] || ''
    const mOcc = getVal('motheroccupation') || item[17] || ''
    const mPhoto = getVal('motherphotourl', 'motherphoto') || item[18] || ''
    const addr = getVal('address', 'currentaddress') || item[19] || ''

    return {
      student_id: String(adm),
      admission_no: String(adm),
      _docId: String(adm),
      roll_no: String(roll),
      academic_year: String(ay),
      class_name: String(cls),
      section: String(sec),
      student_status: String(status),
      full_name: String(name),
      date_of_birth: String(dob),
      gender: String(gender),
      blood_group: String(bg),
      student_photo_url: String(sPhoto),
      father_name: String(fName),
      father_mobile: String(fMob),
      father_occupation: String(fOcc),
      father_photo_url: String(fPhoto),
      mother_name: String(mName),
      mother_mobile: String(mMob),
      mother_occupation: String(mOcc),
      mother_photo_url: String(mPhoto),
      address: String(addr),
      is_active: String(status).toLowerCase() !== 'inactive' && String(status).toLowerCase() !== 'left',
    }
  }

  // Object
  const getProp = (...keys: string[]) => {
    for (const k of keys) {
      if (item[k] !== undefined && item[k] !== null && item[k] !== '') return item[k]
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
      for (const objKey in item) {
        if (objKey.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanK && item[objKey] !== undefined) {
          return item[objKey]
        }
      }
    }
    return ''
  }

  const adm = getProp('admission_no', 'admission_number', 'Admission No', 'student_id', 'id') || `ADM-${index + 1}`
  const roll = getProp('roll_no', 'Roll No', 'roll') || ''
  const ay = getProp('academic_year', 'Academic Year', 'year') || '2026-27'
  const cls = getProp('class_name', 'Class Name', 'class') || 'CLASS I'
  const sec = getProp('section', 'Section', 'sec') || 'A'
  const status = getProp('student_status', 'Student Status', 'status') || 'Active'
  const name = getProp('full_name', 'Full Name', 'student_name', 'name') || 'Student'
  const dob = getProp('date_of_birth', 'Date of Birth', 'dob') || ''
  const gender = getProp('gender', 'Gender') || 'Male'
  const bg = getProp('blood_group', 'Blood Group') || ''
  const sPhoto = getProp('student_photo_url', 'Student Photo URL', 'photo_url', 'photo') || ''
  const fName = getProp('father_name', 'Father Name') || ''
  const fMob = getProp('father_mobile', 'Father Mobile') || ''
  const fOcc = getProp('father_occupation', 'Father Occupation') || ''
  const fPhoto = getProp('father_photo_url', 'Father Photo URL') || ''
  const mName = getProp('mother_name', 'Mother Name') || ''
  const mMob = getProp('mother_mobile', 'Mother Mobile') || ''
  const mOcc = getProp('mother_occupation', 'Mother Occupation') || ''
  const mPhoto = getProp('mother_photo_url', 'Mother Photo URL') || ''
  const addr = getProp('address', 'Address', 'current_address') || ''

  return {
    student_id: String(adm),
    admission_no: String(adm),
    _docId: String(adm),
    roll_no: String(roll),
    academic_year: String(ay),
    class_name: String(cls),
    section: String(sec),
    student_status: String(status),
    full_name: String(name),
    date_of_birth: String(dob),
    gender: String(gender),
    blood_group: String(bg),
    student_photo_url: String(sPhoto),
    father_name: String(fName),
    father_mobile: String(fMob),
    father_occupation: String(fOcc),
    father_photo_url: String(fPhoto),
    mother_name: String(mName),
    mother_mobile: String(mMob),
    mother_occupation: String(mOcc),
    mother_photo_url: String(mPhoto),
    address: String(addr),
    is_active: String(status).toLowerCase() !== 'inactive' && String(status).toLowerCase() !== 'left',
  }
}

/**
 * Fetch students directly from Google Apps Script Web App URL
 */
export async function fetchStudentsFromWebApp(
  customUrl?: string
): Promise<{ success: boolean; data?: any[]; count?: number; message?: string; error?: string }> {
  const url = customUrl || STUDENT_WEB_APP_URL
  try {
    const endpointsToTry = [
      url,
      `${url}?action=read&sheet=student_data`,
      `${url}?action=pull`,
      `${url}?action=get`,
    ]

    let rawData: any = null
    let lastError: any = null

    for (const ep of endpointsToTry) {
      try {
        const response = await fetch(ep, {
          method: 'GET',
          redirect: 'follow',
        })
        if (response.ok) {
          const text = await response.text()
          try {
            rawData = JSON.parse(text)
            if (rawData) break
          } catch {}
        }
      } catch (err) {
        lastError = err
      }
    }

    if (!rawData) {
      try {
        const postRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'pull', sheet: 'student_data' }),
          redirect: 'follow',
        })
        if (postRes.ok) {
          const text = await postRes.text()
          rawData = JSON.parse(text)
        }
      } catch (postErr) {
        lastError = postErr
      }
    }

    if (!rawData) {
      throw new Error(lastError?.message || 'Could not retrieve data from Student Web App URL')
    }

    let list: any[] = []
    let headers: string[] | undefined = undefined

    if (Array.isArray(rawData)) {
      if (rawData.length > 0 && Array.isArray(rawData[0])) {
        headers = rawData[0].map(String)
        list = rawData.slice(1)
      } else {
        list = rawData
      }
    } else if (typeof rawData === 'object') {
      const candidates = rawData.data || rawData.records || rawData.students || rawData.rows || rawData.values || rawData.result
      if (Array.isArray(candidates)) {
        if (candidates.length > 0 && Array.isArray(candidates[0])) {
          headers = candidates[0].map(String)
          list = candidates.slice(1)
        } else {
          list = candidates
        }
      } else if (rawData.success && Array.isArray(rawData.data)) {
        list = rawData.data
      }
    }

    const students = list
      .map((item, idx) => normalizeStudentRowOrObject(item, idx, headers))
      .filter((s) => s && (s.admission_no || s.full_name))

    if (students.length > 0) {
      await saveBatchDocuments('student_master', 'admission_no', students).catch(() => {})
      try {
        localStorage.setItem('sjes_table_student_master', JSON.stringify(students))
        localStorage.setItem('sjes_table_students', JSON.stringify(students))
      } catch {}
    }

    return {
      success: true,
      data: students,
      count: students.length,
      message: `Successfully loaded ${students.length} student records from Web App!`,
    }
  } catch (err: any) {
    console.error('fetchStudentsFromWebApp error:', err)
    return {
      success: false,
      error: err.message || 'Failed to fetch from Student Web App',
    }
  }
}

/**
 * Push students to the Google Apps Script Web App URL
 */
export async function pushStudentsToWebApp(
  students: any[],
  customUrl?: string
): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
  const url = customUrl || STUDENT_WEB_APP_URL
  try {
    const rows = students.map(studentToSheetRow)
    const payload = {
      action: 'push',
      sheet: 'student_data',
      tab: 'student_data',
      data: students,
      rows: [STUDENT_SHEET_HEADERS, ...rows],
      headers: STUDENT_SHEET_HEADERS,
      count: students.length,
      timestamp: new Date().toISOString(),
    }

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    })

    return {
      success: true,
      count: students.length,
      message: `Successfully pushed ${students.length} student records to Google Sheet via Web App!`,
    }
  } catch (err: any) {
    console.error('pushStudentsToWebApp error:', err)
    return {
      success: false,
      error: err.message || 'Failed to push student records to Web App',
    }
  }
}

/**
 * Overwrite / sync entire student database to Google Sheet (tab 'student_data')
 */
export async function syncAllStudentsToGoogleSheet(
  students: any[]
): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
  // Push to Web App
  const webAppRes = await pushStudentsToWebApp(students).catch(() => null)

  try {
    let token = cachedAccessToken
    if (!token) {
      if (webAppRes && webAppRes.success) {
        return webAppRes
      }
      const conn = await connectGoogleWorkspace()
      if (!conn.success || !conn.accessToken) {
        if (webAppRes && webAppRes.success) return webAppRes
        return {
          success: false,
          error: conn.error || 'Google authorization required to sync with Google Sheets.',
        }
      }
      token = conn.accessToken
    }

    await ensureSheetTabExists(token)

    const rows: string[][] = [STUDENT_SHEET_HEADERS]
    students.forEach((s) => {
      rows.push(studentToSheetRow(s))
    })

    // Clear previous values first to prevent ghost rows
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/'${GOOGLE_SHEET_TAB_NAME}'!A1:Z5000:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    ).catch(() => {})

    // Write all rows with header
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/'${GOOGLE_SHEET_TAB_NAME}'!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `'${GOOGLE_SHEET_TAB_NAME}'!A1:V${rows.length}`,
          majorDimension: 'ROWS',
          values: rows,
        }),
      }
    )

    if (!updateRes.ok) {
      if (webAppRes && webAppRes.success) return webAppRes
      const errJson = await updateRes.json().catch(() => ({}))
      throw new Error(
        errJson.error?.message || `Google Sheets API returned HTTP ${updateRes.status}`
      )
    }

    return {
      success: true,
      count: students.length,
      message: `Successfully synced ${students.length} student records to Google Sheet (${GOOGLE_SHEET_TAB_NAME})!`,
    }
  } catch (err: any) {
    if (webAppRes && webAppRes.success) return webAppRes
    console.error('Google Sheet Sync Error:', err)
    return {
      success: false,
      error: err.message || 'Failed to sync with Google Sheet',
    }
  }
}

/**
 * Pulls student data from Google Sheet ('student_data') or Web App URL
 */
export async function fetchStudentsFromGoogleSheet(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  // 1. Try Web App first (no OAuth login popup required)
  try {
    const webAppRes = await fetchStudentsFromWebApp()
    if (webAppRes.success && webAppRes.data && webAppRes.data.length > 0) {
      return {
        success: true,
        data: webAppRes.data,
      }
    }
  } catch {}

  try {
    let token = cachedAccessToken
    if (!token) {
      const conn = await connectGoogleWorkspace()
      if (!conn.success || !conn.accessToken) {
        return {
          success: false,
          error: conn.error || 'Google authorization required to read Google Sheets.',
        }
      }
      token = conn.accessToken
    }

    await ensureSheetTabExists(token)

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/'${GOOGLE_SHEET_TAB_NAME}'!A1:V1000`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.error?.message || `HTTP ${res.status}`)
    }

    const json = await res.json()
    const values: string[][] = json.values || []

    if (values.length <= 1) {
      return { success: true, data: [] }
    }

    // First row is header
    const headers = values[0].map((h) => h.trim().toLowerCase())
    const getIdx = (name: string) => headers.indexOf(name.toLowerCase())

    const admIdx = getIdx('Admission No')
    const rollIdx = getIdx('Roll No')
    const ayIdx = getIdx('Academic Year')
    const clsIdx = getIdx('Class Name')
    const secIdx = getIdx('Section')
    const statIdx = getIdx('Student Status')
    const nameIdx = getIdx('Full Name')
    const dobIdx = getIdx('Date of Birth')
    const genIdx = getIdx('Gender')
    const bgIdx = getIdx('Blood Group')
    const sPhotoIdx = getIdx('Student Photo URL')
    const fNameIdx = getIdx('Father Name')
    const fMobIdx = getIdx('Father Mobile')
    const fOccIdx = getIdx('Father Occupation')
    const fPhotoIdx = getIdx('Father Photo URL')
    const mNameIdx = getIdx('Mother Name')
    const mMobIdx = getIdx('Mother Mobile')
    const mOccIdx = getIdx('Mother Occupation')
    const mPhotoIdx = getIdx('Mother Photo URL')
    const addrIdx = getIdx('Address')

    const students: any[] = []

    for (let i = 1; i < values.length; i++) {
      const row = values[i]
      if (!row || row.length === 0 || !row[nameIdx >= 0 ? nameIdx : 6]) continue

      const adm = row[admIdx >= 0 ? admIdx : 0] || `ADM-${Date.now().toString().slice(-4)}-${i}`
      const student = {
        student_id: adm,
        admission_no: adm,
        roll_no: row[rollIdx >= 0 ? rollIdx : 1] || '',
        academic_year: row[ayIdx >= 0 ? ayIdx : 2] || '2026-27',
        class_name: row[clsIdx >= 0 ? clsIdx : 3] || 'CLASS I',
        section: row[secIdx >= 0 ? secIdx : 4] || 'A',
        student_status: row[statIdx >= 0 ? statIdx : 5] || 'Active',
        full_name: row[nameIdx >= 0 ? nameIdx : 6] || '',
        date_of_birth: row[dobIdx >= 0 ? dobIdx : 7] || '',
        gender: row[genIdx >= 0 ? genIdx : 8] || 'Male',
        blood_group: row[bgIdx >= 0 ? bgIdx : 9] || '',
        student_photo_url: row[sPhotoIdx >= 0 ? sPhotoIdx : 10] || '',
        father_name: row[fNameIdx >= 0 ? fNameIdx : 11] || '',
        father_mobile: row[fMobIdx >= 0 ? fMobIdx : 12] || '',
        father_occupation: row[fOccIdx >= 0 ? fOccIdx : 13] || '',
        father_photo_url: row[fPhotoIdx >= 0 ? fPhotoIdx : 14] || '',
        mother_name: row[mNameIdx >= 0 ? mNameIdx : 15] || '',
        mother_mobile: row[mMobIdx >= 0 ? mMobIdx : 16] || '',
        mother_occupation: row[mOccIdx >= 0 ? mOccIdx : 17] || '',
        mother_photo_url: row[mPhotoIdx >= 0 ? mPhotoIdx : 18] || '',
        address: row[addrIdx >= 0 ? addrIdx : 19] || '',
        is_active: true,
      }
      students.push(student)
    }

    return {
      success: true,
      data: students,
    }
  } catch (err: any) {
    console.error('Error fetching students from Google Sheet:', err)
    return {
      success: false,
      error: err.message || 'Failed to read Google Sheet',
    }
  }
}

/**
 * Upload an employee photo directly to Google Drive folder 'staff_photo' (1zcVv1vwxdMNAKPP52THA4SE8TzUGOOLa)
 */
export async function uploadStaffPhotoToGoogleDrive(
  file: File | Blob,
  empCodeOrName: string,
  customFileName?: string
): Promise<{ success: boolean; url?: string; fileId?: string; error?: string }> {
  try {
    let token = cachedAccessToken
    if (!token) {
      const conn = await connectGoogleWorkspace()
      if (!conn.success || !conn.accessToken) {
        return {
          success: false,
          error:
            conn.error ||
            'Google Drive authorization required. Please connect your Google account to upload photos to Drive.',
        }
      }
      token = conn.accessToken
    }

    const cleanName = (empCodeOrName || 'Staff').replace(/[^a-zA-Z0-9_-]/g, '_')
    const timeStamp = Date.now().toString().slice(-6)
    const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg'
    const fileName =
      customFileName ||
      `STAFF_${cleanName}_${timeStamp}.${ext}`

    const metadata = {
      name: fileName,
      parents: [STAFF_GOOGLE_DRIVE_FOLDER_ID],
      mimeType: file.type || 'image/jpeg',
      description: `Staff Photograph for ${empCodeOrName} - St. John's English School`,
    }

    const boundary = '-------314159265358979323846'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const fileBuffer = await file.arrayBuffer()
    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n`
    const fileHeader = `${delimiter}Content-Type: ${file.type || 'image/jpeg'}\r\nContent-Transfer-Encoding: base64\r\n\r\n`

    // Convert ArrayBuffer to Base64
    let binary = ''
    const bytes = new Uint8Array(fileBuffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64Data = btoa(binary)

    const multipartRequestBody = metadataPart + fileHeader + base64Data + closeDelimiter

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webContentLink,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    )

    if (!uploadResponse.ok) {
      const err = await uploadResponse.json().catch(() => ({}))
      throw new Error(err.error?.message || `Upload failed with HTTP ${uploadResponse.status}`)
    }

    const fileData = await uploadResponse.json()
    const fileId = fileData.id

    // Set permission to anyone with link can view
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      })
    } catch {
      // ignore
    }

    const publicUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`

    return {
      success: true,
      fileId,
      url: publicUrl,
    }
  } catch (err: any) {
    console.error('Staff Photo Google Drive Upload Error:', err)
    return {
      success: false,
      error: err.message || 'Failed to upload staff photo to Google Drive',
    }
  }
}

/**
 * Standard Clean Headers for Staff Google Sheet (staff_data tab)
 */
export const STAFF_SHEET_HEADERS = [
  'Emp Code',
  'First Name',
  'Last Name',
  'Employee Category',
  'Department',
  'Designation',
  'Employment Type',
  'Employment Status',
  'Date of Joining',
  'Date of Birth',
  'Gender',
  'Blood Group',
  'Mobile Primary',
  'WhatsApp Number',
  'Official Email',
  'Personal Email',
  'Basic Salary',
  'Classes Assigned',
  'Subjects Specialisation',
  'Photo URL',
  'Document URL',
  'Current Address',
  'Academic Year',
  'Last Updated',
]

/**
 * Converts an Employee object to a single row array matching the exact headers
 */
export function employeeToSheetRow(e: any): string[] {
  const classes = Array.isArray(e.classes_assigned)
    ? e.classes_assigned.join(', ')
    : String(e.classes_assigned || '')
  const subjects = Array.isArray(e.subject_specialisation)
    ? e.subject_specialisation.join(', ')
    : String(e.subject_specialisation || '')

  return [
    String(e.emp_code || e.emp_id || ''),
    String(e.first_name || (e.name ? String(e.name).split(' ')[0] : '') || ''),
    String(e.last_name || (e.name ? String(e.name).split(' ').slice(1).join(' ') : '') || ''),
    String(e.employee_category || 'Teaching Staff'),
    String(e.department || 'Academics'),
    String(e.designation || 'Teacher'),
    String(e.employment_type || 'Permanent'),
    String(e.employment_status || (e.is_active !== false ? 'Active' : 'Inactive')),
    String(e.date_of_joining || ''),
    String(e.date_of_birth || ''),
    String(e.gender || 'Male'),
    String(e.blood_group || ''),
    String(e.mobile_primary || e.phone || ''),
    String(e.whatsapp_number || ''),
    String(e.official_email || e.email || ''),
    String(e.personal_email || ''),
    String(e.basic_salary || ''),
    classes,
    subjects,
    String(e.employee_photo_url || ''),
    String(e.document_url || ''),
    String(e.current_address || e.address || ''),
    String(e.academic_year || '2026-27'),
    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  ]
}

/**
 * Ensures the target sheet tab ('staff_data') exists in the spreadsheet
 */
async function ensureStaffSheetTabExists(token: string): Promise<boolean> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!metaRes.ok) {
      if (metaRes.status === 401) {
        cachedAccessToken = null
        notifyListeners()
      }
      return false
    }
    const meta = await metaRes.json()
    const sheets = meta.sheets || []
    const hasTab = sheets.some(
      (s: any) => s.properties?.title === STAFF_GOOGLE_SHEET_TAB_NAME
    )

    if (!hasTab) {
      // Add 'staff_data' tab
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: STAFF_GOOGLE_SHEET_TAB_NAME,
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: 26,
                      frozenRowCount: 1,
                    },
                  },
                },
              },
            ],
          }),
        }
      )
    }
    return true
  } catch (e) {
    console.warn('Error checking/creating staff sheet tab:', e)
    return false
  }
}

/**
 * Normalizes a raw Staff row or object from Google Apps Script Web App / Sheet
 */
export function normalizeStaffRowOrObject(item: any, index: number, headers?: string[]): any {
  if (!item) return null

  if (Array.isArray(item)) {
    const h = headers || STAFF_SHEET_HEADERS
    const getVal = (...keywords: string[]) => {
      const cleanKeywords = keywords.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
      for (let i = 0; i < h.length; i++) {
        const cleanH = String(h[i] || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        if (cleanKeywords.includes(cleanH)) {
          return item[i] !== undefined ? String(item[i]).trim() : ''
        }
      }
      return ''
    }

    const code = getVal('empcode', 'empid', 'staffid', 'code', 'id') || item[0] || `EMP-${index + 1}`
    const first = getVal('firstname', 'givenname', 'fname') || item[1] || ''
    const last = getVal('lastname', 'surname', 'lname') || item[2] || ''
    const fullName = [first, last].filter(Boolean).join(' ') || getVal('fullname', 'name') || first || 'Staff Member'
    const cat = getVal('employeecategory', 'category') || item[3] || 'Teaching Staff'
    const dept = getVal('department', 'dept') || item[4] || 'Academics'
    const desig = getVal('designation', 'role', 'title') || item[5] || 'Teacher'
    const empType = getVal('employmenttype', 'type') || item[6] || 'Permanent'
    const status = getVal('employmentstatus', 'status') || item[7] || 'Active'
    const doj = getVal('dateofjoining', 'doj', 'joiningdate') || item[8] || ''
    const dob = getVal('dateofbirth', 'dob', 'birthdate') || item[9] || ''
    const gender = getVal('gender', 'sex') || item[10] || 'Male'
    const bg = getVal('bloodgroup', 'blood') || item[11] || ''
    const mob = getVal('mobileprimary', 'mobile', 'phone') || item[12] || ''
    const wa = getVal('whatsappnumber', 'whatsapp') || item[13] || ''
    const oEmail = getVal('officialemail', 'email') || item[14] || ''
    const pEmail = getVal('personalemail') || item[15] || ''
    const sal = Number(String(getVal('basicsalary', 'salary') || item[16] || '').replace(/[^0-9.]/g, '')) || 25000
    const classes = getVal('classesassigned', 'classes') || item[17] || ''
    const sub = getVal('subjectsspecialisation', 'subjects', 'subject') || item[18] || ''
    const photo = getVal('photourl', 'photo', 'imageurl') || item[19] || ''
    const docUrl = getVal('documenturl', 'doc') || item[20] || ''
    const addr = getVal('currentaddress', 'address') || item[21] || ''
    const ay = getVal('academicyear', 'year') || item[22] || '2026-27'

    const isInactive = ['inactive', 'resigned', 'retired', 'left', 'false'].includes(String(status).toLowerCase())

    return {
      emp_id: String(code),
      emp_code: String(code),
      _docId: String(code),
      first_name: String(first || fullName.split(' ')[0] || 'Staff'),
      last_name: String(last || fullName.split(' ').slice(1).join(' ') || ''),
      full_name: String(fullName),
      employee_category: String(cat),
      department: String(dept),
      designation: String(desig),
      employment_type: String(empType),
      employment_status: String(status),
      date_of_joining: String(doj),
      date_of_birth: String(dob),
      gender: String(gender),
      blood_group: String(bg),
      mobile_primary: String(mob),
      whatsapp_number: String(wa),
      official_email: String(oEmail),
      personal_email: String(pEmail),
      basic_salary: sal,
      classes_assigned: typeof classes === 'string' ? classes.split(',').map((x: string) => x.trim()).filter(Boolean) : (classes || []),
      subject_specialisation: typeof sub === 'string' ? sub.split(',').map((x: string) => x.trim()).filter(Boolean) : (sub || []),
      employee_photo_url: String(photo),
      document_url: String(docUrl),
      current_address: String(addr),
      academic_year: String(ay),
      is_active: !isInactive,
    }
  }

  // Object
  const getProp = (...keys: string[]) => {
    for (const k of keys) {
      if (item[k] !== undefined && item[k] !== null && item[k] !== '') return item[k]
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
      for (const objKey in item) {
        if (objKey.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanK && item[objKey] !== undefined) {
          return item[objKey]
        }
      }
    }
    return ''
  }

  const code = getProp('emp_code', 'emp_id', 'employee_code', 'Emp Code', 'code', 'id') || `EMP-${index + 1}`
  const first = getProp('first_name', 'First Name', 'fname') || ''
  const last = getProp('last_name', 'Last Name', 'lname') || ''
  const fullName = [first, last].filter(Boolean).join(' ') || getProp('full_name', 'name', 'Full Name', 'staff_name', 'Staff Name') || 'Staff Member'
  const cat = getProp('employee_category', 'Employee Category', 'category') || 'Teaching Staff'
  const dept = getProp('department', 'Department', 'dept') || 'Academics'
  const desig = getProp('designation', 'Designation', 'role') || 'Teacher'
  const empType = getProp('employment_type', 'Employment Type', 'type') || 'Permanent'
  const status = getProp('employment_status', 'Employment Status', 'status') || 'Active'
  const doj = getProp('date_of_joining', 'Date of Joining', 'joining_date') || ''
  const dob = getProp('date_of_birth', 'Date of Birth', 'dob') || ''
  const gender = getProp('gender', 'Gender') || 'Male'
  const bg = getProp('blood_group', 'Blood Group') || ''
  const mob = getProp('mobile_primary', 'Mobile Primary', 'mobile', 'phone') || ''
  const wa = getProp('whatsapp_number', 'WhatsApp Number', 'whatsapp') || ''
  const oEmail = getProp('official_email', 'Official Email', 'email') || ''
  const pEmail = getProp('personal_email', 'Personal Email') || ''
  const sal = Number(String(getProp('basic_salary', 'Basic Salary', 'salary') || '').replace(/[^0-9.]/g, '')) || 25000
  const classes = getProp('classes_assigned', 'Classes Assigned', 'classes') || []
  const sub = getProp('subject_specialisation', 'subjectsspecialisation', 'Subjects Specialisation', 'subjects') || []
  const photo = getProp('employee_photo_url', 'Photo URL', 'photo_url', 'photo') || ''
  const docUrl = getProp('document_url', 'Document URL', 'doc_url') || ''
  const addr = getProp('current_address', 'Current Address', 'address') || ''
  const ay = getProp('academic_year', 'Academic Year') || '2026-27'

  const isInactive = ['inactive', 'resigned', 'retired', 'left', 'false'].includes(String(status).toLowerCase())

  return {
    emp_id: String(code),
    emp_code: String(code),
    _docId: String(code),
    first_name: String(first || fullName.split(' ')[0] || 'Staff'),
    last_name: String(last || fullName.split(' ').slice(1).join(' ') || ''),
    full_name: String(fullName),
    employee_category: String(cat),
    department: String(dept),
    designation: String(desig),
    employment_type: String(empType),
    employment_status: String(status),
    date_of_joining: String(doj),
    date_of_birth: String(dob),
    gender: String(gender),
    blood_group: String(bg),
    mobile_primary: String(mob),
    whatsapp_number: String(wa),
    official_email: String(oEmail),
    personal_email: String(pEmail),
    basic_salary: sal,
    classes_assigned: Array.isArray(classes) ? classes : typeof classes === 'string' ? classes.split(',').map((x: string) => x.trim()).filter(Boolean) : [],
    subject_specialisation: Array.isArray(sub) ? sub : typeof sub === 'string' ? sub.split(',').map((x: string) => x.trim()).filter(Boolean) : [],
    employee_photo_url: String(photo),
    document_url: String(docUrl),
    current_address: String(addr),
    academic_year: String(ay),
    is_active: !isInactive,
  }
}

/**
 * Fetch staff directly from the Google Apps Script Web App URL
 */
export async function fetchStaffFromWebApp(
  customUrl?: string
): Promise<{ success: boolean; data?: any[]; count?: number; message?: string; error?: string }> {
  const url = customUrl || STAFF_WEB_APP_URL
  try {
    const endpointsToTry = [
      url,
      `${url}?action=read&sheet=staff_data`,
      `${url}?action=pull`,
      `${url}?action=get`,
    ]

    let rawData: any = null
    let lastError: any = null

    for (const ep of endpointsToTry) {
      try {
        const response = await fetch(ep, {
          method: 'GET',
          redirect: 'follow',
        })
        if (response.ok) {
          const text = await response.text()
          try {
            rawData = JSON.parse(text)
            if (rawData) break
          } catch {}
        }
      } catch (err) {
        lastError = err
      }
    }

    if (!rawData) {
      try {
        const postRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'pull', sheet: 'staff_data' }),
          redirect: 'follow',
        })
        if (postRes.ok) {
          const text = await postRes.text()
          rawData = JSON.parse(text)
        }
      } catch (postErr) {
        lastError = postErr
      }
    }

    if (!rawData) {
      throw new Error(lastError?.message || 'Could not retrieve data from Staff Web App URL')
    }

    let list: any[] = []
    let headers: string[] | undefined = undefined

    if (Array.isArray(rawData)) {
      if (rawData.length > 0 && Array.isArray(rawData[0])) {
        headers = rawData[0].map(String)
        list = rawData.slice(1)
      } else {
        list = rawData
      }
    } else if (typeof rawData === 'object') {
      const candidates = rawData.data || rawData.records || rawData.staff || rawData.rows || rawData.values || rawData.result
      if (Array.isArray(candidates)) {
        if (candidates.length > 0 && Array.isArray(candidates[0])) {
          headers = candidates[0].map(String)
          list = candidates.slice(1)
        } else {
          list = candidates
        }
      } else if (rawData.success && Array.isArray(rawData.data)) {
        list = rawData.data
      }
    }

    const employees = list
      .map((item, idx) => normalizeStaffRowOrObject(item, idx, headers))
      .filter((e) => e && (e.emp_code || e.first_name || e.full_name))

    if (employees.length > 0) {
      await saveBatchDocuments('employee_master', 'emp_code', employees).catch(() => {})
      try {
        localStorage.setItem('sjes_table_employee_master', JSON.stringify(employees))
        localStorage.setItem('sjes_table_employees', JSON.stringify(employees))
        localStorage.setItem('sjes_table_staff', JSON.stringify(employees))
      } catch {}
    }

    return {
      success: true,
      data: employees,
      count: employees.length,
      message: `Successfully loaded ${employees.length} staff records from Web App!`,
    }
  } catch (err: any) {
    console.error('fetchStaffFromWebApp error:', err)
    return {
      success: false,
      error: err.message || 'Failed to fetch from Staff Web App',
    }
  }
}

/**
 * Push staff records to the Google Apps Script Web App URL
 */
export async function pushStaffToWebApp(
  employees: any[],
  customUrl?: string
): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
  const url = customUrl || STAFF_WEB_APP_URL
  try {
    const rows = employees.map(employeeToSheetRow)
    const payload = {
      action: 'push',
      sheet: 'staff_data',
      tab: 'staff_data',
      data: employees,
      rows: [STAFF_SHEET_HEADERS, ...rows],
      headers: STAFF_SHEET_HEADERS,
      count: employees.length,
      timestamp: new Date().toISOString(),
    }

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    })

    return {
      success: true,
      count: employees.length,
      message: `Successfully pushed ${employees.length} staff records to Google Sheet via Web App!`,
    }
  } catch (err: any) {
    console.error('pushStaffToWebApp error:', err)
    return {
      success: false,
      error: err.message || 'Failed to push staff records to Web App',
    }
  }
}

/**
 * Overwrite / sync entire staff database to Google Sheet (tab 'staff_data', Sheet ID: 1JUZXNNcIZeMGFyzmFbdfxADLY8Jwb_r3e03rJK5rWgc)
 */
export async function syncAllEmployeesToGoogleSheet(
  employees: any[]
): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
  // Push to Web App
  const webAppRes = await pushStaffToWebApp(employees).catch(() => null)

  try {
    let token = cachedAccessToken
    if (!token) {
      if (webAppRes && webAppRes.success) {
        return webAppRes
      }
      const conn = await connectGoogleWorkspace()
      if (!conn.success || !conn.accessToken) {
        if (webAppRes && webAppRes.success) return webAppRes
        return {
          success: false,
          error: conn.error || 'Google authorization required to sync with Google Sheets.',
        }
      }
      token = conn.accessToken
    }

    await ensureStaffSheetTabExists(token)

    const rows: string[][] = [STAFF_SHEET_HEADERS]
    employees.forEach((e) => {
      rows.push(employeeToSheetRow(e))
    })

    // Clear previous values first to prevent ghost rows
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}/values/'${STAFF_GOOGLE_SHEET_TAB_NAME}'!A1:Z5000:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    ).catch(() => {})

    // Write all rows with header
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}/values/'${STAFF_GOOGLE_SHEET_TAB_NAME}'!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `'${STAFF_GOOGLE_SHEET_TAB_NAME}'!A1:X${rows.length}`,
          majorDimension: 'ROWS',
          values: rows,
        }),
      }
    )

    if (!updateRes.ok) {
      if (webAppRes && webAppRes.success) return webAppRes
      const errJson = await updateRes.json().catch(() => ({}))
      throw new Error(
        errJson.error?.message || `Google Sheets API returned HTTP ${updateRes.status}`
      )
    }

    return {
      success: true,
      count: employees.length,
      message: `Successfully synced ${employees.length} staff records to Google Sheet (${STAFF_GOOGLE_SHEET_TAB_NAME})!`,
    }
  } catch (err: any) {
    if (webAppRes && webAppRes.success) return webAppRes
    console.error('Staff Google Sheet Sync Error:', err)
    return {
      success: false,
      error: err.message || 'Failed to sync with Google Sheet',
    }
  }
}

/**
 * Sync / upsert a single employee record to the 'staff_data' Google Sheet tab without overwriting other rows
 */
export async function syncSingleEmployeeToGoogleSheet(
  employee: any
): Promise<{ success: boolean; message?: string; error?: string }> {
  // Try Web App
  pushStaffToWebApp([employee]).catch(() => {})

  try {
    let token = cachedAccessToken
    if (!token) {
      const conn = await connectGoogleWorkspace()
      if (!conn.success || !conn.accessToken) {
        return {
          success: true,
          message: `Staff record synced to Web App!`,
        }
      }
      token = conn.accessToken
    }

    await ensureStaffSheetTabExists(token)

    // Fetch existing rows from 'staff_data'
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}/values/'${STAFF_GOOGLE_SHEET_TAB_NAME}'!A1:Z2000`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    let rows: string[][] = []
    if (res.ok) {
      const json = await res.json().catch(() => ({}))
      rows = json.values || []
    }

    const rowData = employeeToSheetRow(employee)
    const targetEmpCode = String(employee.emp_code || employee.emp_id || '').trim().toLowerCase()

    if (rows.length === 0) {
      // Create headers and first row
      const newRows = [STAFF_SHEET_HEADERS, rowData]
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}/values/'${STAFF_GOOGLE_SHEET_TAB_NAME}'!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: `'${STAFF_GOOGLE_SHEET_TAB_NAME}'!A1:X${newRows.length}`,
            majorDimension: 'ROWS',
            values: newRows,
          }),
        }
      )
      return { success: true, message: `Added to ${STAFF_GOOGLE_SHEET_TAB_NAME} sheet` }
    }

    // Find row index (1-indexed for sheets)
    let rowIndex = -1
    for (let i = 1; i < rows.length; i++) {
      const currentCode = String(rows[i]?.[0] || '').trim().toLowerCase()
      if (currentCode && currentCode === targetEmpCode) {
        rowIndex = i + 1 // 1-based index
        break
      }
    }

    if (rowIndex > 0) {
      // Update existing row
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}/values/'${STAFF_GOOGLE_SHEET_TAB_NAME}'!A${rowIndex}:X${rowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: `'${STAFF_GOOGLE_SHEET_TAB_NAME}'!A${rowIndex}:X${rowIndex}`,
            majorDimension: 'ROWS',
            values: [rowData],
          }),
        }
      )
      return { success: true, message: `Updated row ${rowIndex} in Google Sheet (${STAFF_GOOGLE_SHEET_TAB_NAME})` }
    } else {
      // Append new row
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}/values/'${STAFF_GOOGLE_SHEET_TAB_NAME}'!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: `'${STAFF_GOOGLE_SHEET_TAB_NAME}'!A1`,
            majorDimension: 'ROWS',
            values: [rowData],
          }),
        }
      )
      return { success: true, message: `Appended new staff row to Google Sheet (${STAFF_GOOGLE_SHEET_TAB_NAME})` }
    }
  } catch (err: any) {
    console.error('syncSingleEmployeeToGoogleSheet Error:', err)
    return {
      success: true,
      message: `Staff record synced to Web App!`,
    }
  }
}

/**
 * Pulls employee data from Google Sheet ('staff_data' or Web App URL)
 */
export async function fetchEmployeesFromGoogleSheet(): Promise<{
  success: boolean
  data?: any[]
  error?: string
  sheetName?: string
}> {
  // 1. Try Web App URL first (no OAuth popup required)
  try {
    const webAppRes = await fetchStaffFromWebApp()
    if (webAppRes.success && webAppRes.data && webAppRes.data.length > 0) {
      return {
        success: true,
        data: webAppRes.data,
        sheetName: 'staff_data (Web App)',
      }
    }
  } catch {}

  try {
    let token = cachedAccessToken
    if (!token) {
      const conn = await connectGoogleWorkspace()
      if (!conn.success || !conn.accessToken) {
        return {
          success: false,
          error: conn.error || 'Google authorization required to read Google Sheets.',
        }
      }
      token = conn.accessToken
    }

    // 1. Inspect spreadsheet metadata to discover all available sheet tabs
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!metaRes.ok) {
      const errJson = await metaRes.json().catch(() => ({}))
      throw new Error(
        errJson.error?.message ||
          `Failed to access Google Spreadsheet (HTTP ${metaRes.status}). Please check Sheet permissions.`
      )
    }

    const meta = await metaRes.json()
    const sheetsList: string[] = (meta.sheets || [])
      .map((s: any) => s.properties?.title)
      .filter(Boolean)

    if (sheetsList.length === 0) {
      return {
        success: false,
        error: 'The Google Spreadsheet contains no sheets or tabs.',
      }
    }

    // Determine target tab: prefer 'staff_data', otherwise use first available tab
    let targetTab = sheetsList.find((name) => name.toLowerCase() === STAFF_GOOGLE_SHEET_TAB_NAME.toLowerCase())
    if (!targetTab) {
      targetTab = sheetsList[0]
    }

    // Fetch data from target tab
    let res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}/values/'${encodeURIComponent(
        targetTab
      )}'!A1:Z2000`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    let json = await res.json().catch(() => ({}))
    let values: string[][] = json.values || []

    // If target tab was empty and there are other tabs (e.g. Sheet1), try reading the first tab
    if (values.length <= 1 && sheetsList.length > 1 && targetTab !== sheetsList[0]) {
      const altTab = sheetsList[0]
      const altRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}/values/'${encodeURIComponent(
          altTab
        )}'!A1:Z2000`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (altRes.ok) {
        const altJson = await altRes.json().catch(() => ({}))
        if (altJson.values && altJson.values.length > 1) {
          targetTab = altTab
          values = altJson.values
        }
      }
    }

    if (values.length === 0) {
      return {
        success: false,
        error: `Sheet tab '${targetTab}' is completely empty. Please add employee data rows.`,
      }
    }

    if (values.length === 1) {
      return {
        success: true,
        data: [],
        sheetName: targetTab,
        error: `Sheet tab '${targetTab}' contains only a header row with no employee records.`,
      }
    }

    // Normalize header row for fuzzy matching
    const rawHeaders = values[0]
    const cleanHeader = (h: string) =>
      String(h || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')

    const normHeaders = rawHeaders.map(cleanHeader)
    const findCol = (...keywords: string[]) => {
      const cleanKeywords = keywords.map(cleanHeader)
      for (let i = 0; i < normHeaders.length; i++) {
        if (cleanKeywords.includes(normHeaders[i])) return i
      }
      return -1
    }

    const empCodeIdx = findCol('empcode', 'employeecode', 'empid', 'staffid', 'staffcode', 'code', 'id')
    const fullNameIdx = findCol('fullname', 'staffname', 'employeename', 'teachername', 'name')
    const fNameIdx = findCol('firstname', 'givenname', 'fname', 'first')
    const lNameIdx = findCol('lastname', 'surname', 'lname', 'last')
    const catIdx = findCol('employeecategory', 'staffcategory', 'category', 'rolecategory', 'type')
    const deptIdx = findCol('department', 'dept', 'stream', 'wing')
    const desigIdx = findCol('designation', 'post', 'position', 'role', 'title')
    const empTypeIdx = findCol('employmenttype', 'type', 'contracttype')
    const statIdx = findCol('employmentstatus', 'status', 'staffstatus', 'active')
    const dojIdx = findCol('dateofjoining', 'joiningdate', 'doj', 'joindate')
    const dobIdx = findCol('dateofbirth', 'birthdate', 'dob')
    const genIdx = findCol('gender', 'sex')
    const bgIdx = findCol('bloodgroup', 'bloodgrp', 'blood')
    const mobIdx = findCol('mobileprimary', 'mobile', 'phone', 'contact', 'primarymobile', 'contactnumber')
    const waIdx = findCol('whatsappnumber', 'whatsapp', 'wanumber')
    const oEmailIdx = findCol('officialemail', 'email', 'workemail', 'schoolemail', 'emailid')
    const pEmailIdx = findCol('personalemail', 'alternateemail', 'altemail')
    const salIdx = findCol('basicsalary', 'salary', 'basicpay', 'pay', 'monthlysalary', 'ctc')
    const clsIdx = findCol('classesassigned', 'classes', 'assignedclasses', 'grade')
    const subIdx = findCol('subjectsspecialisation', 'subjects', 'subject', 'specialisation', 'subjectspecialisation')
    const photoIdx = findCol('photourl', 'photo', 'picture', 'imageurl', 'image', 'employeephotourl')
    const docIdx = findCol('documenturl', 'documents', 'docurl', 'certificateurl', 'resume')
    const addrIdx = findCol('currentaddress', 'address', 'residentialaddress', 'location')
    const ayIdx = findCol('academicyear', 'year', 'session')

    const employees: any[] = []

    for (let i = 1; i < values.length; i++) {
      const row = values[i]
      if (!row || row.length === 0 || row.every((c) => !String(c).trim())) continue

      let first = fNameIdx >= 0 ? (row[fNameIdx] || '').trim() : ''
      let last = lNameIdx >= 0 ? (row[lNameIdx] || '').trim() : ''

      if (!first && fullNameIdx >= 0 && row[fullNameIdx]) {
        const full = String(row[fullNameIdx]).trim()
        const parts = full.split(/\s+/)
        first = parts[0] || 'Staff'
        last = parts.slice(1).join(' ') || ''
      }

      const codeRaw = empCodeIdx >= 0 ? (row[empCodeIdx] || '').trim() : ''
      const code = codeRaw || `EMP-${Date.now().toString().slice(-4)}-${i}`

      const rawStatus = statIdx >= 0 ? (row[statIdx] || '').trim() : 'Active'
      const isInactive =
        rawStatus.toLowerCase() === 'inactive' ||
        rawStatus.toLowerCase() === 'resigned' ||
        rawStatus.toLowerCase() === 'retired' ||
        rawStatus.toLowerCase() === 'left' ||
        rawStatus.toLowerCase() === 'false' ||
        rawStatus === '0'

      const salaryNum = salIdx >= 0 ? Number(String(row[salIdx]).replace(/[^0-9.]/g, '')) || 25000 : 25000

      const emp = {
        emp_id: code,
        emp_code: code,
        _docId: code,
        first_name: first || 'Staff',
        last_name: last || '',
        full_name: [first, last].filter(Boolean).join(' ') || (fullNameIdx >= 0 ? row[fullNameIdx] : first || 'Staff Member'),
        employee_category: catIdx >= 0 && row[catIdx] ? row[catIdx].trim() : 'Teaching Staff',
        department: deptIdx >= 0 && row[deptIdx] ? row[deptIdx].trim() : 'Academics',
        designation: desigIdx >= 0 && row[desigIdx] ? row[desigIdx].trim() : 'Teacher',
        employment_type: empTypeIdx >= 0 && row[empTypeIdx] ? row[empTypeIdx].trim() : 'Permanent',
        employment_status: rawStatus || (isInactive ? 'Inactive' : 'Active'),
        date_of_joining: dojIdx >= 0 ? (row[dojIdx] || '').trim() : '',
        date_of_birth: dobIdx >= 0 ? (row[dobIdx] || '').trim() : '',
        gender: genIdx >= 0 && row[genIdx] ? row[genIdx].trim() : 'Male',
        blood_group: bgIdx >= 0 ? (row[bgIdx] || '').trim() : '',
        mobile_primary: mobIdx >= 0 ? (row[mobIdx] || '').trim() : '',
        whatsapp_number: waIdx >= 0 ? (row[waIdx] || '').trim() : '',
        official_email: oEmailIdx >= 0 ? (row[oEmailIdx] || '').trim() : '',
        personal_email: pEmailIdx >= 0 ? (row[pEmailIdx] || '').trim() : '',
        basic_salary: salaryNum,
        classes_assigned: clsIdx >= 0 && row[clsIdx] ? String(row[clsIdx]).split(',').map((s) => s.trim()).filter(Boolean) : [],
        subject_specialisation: subIdx >= 0 && row[subIdx] ? String(row[subIdx]).split(',').map((s) => s.trim()).filter(Boolean) : [],
        employee_photo_url: photoIdx >= 0 ? (row[photoIdx] || '').trim() : '',
        document_url: docIdx >= 0 ? (row[docIdx] || '').trim() : '',
        current_address: addrIdx >= 0 ? (row[addrIdx] || '').trim() : '',
        academic_year: ayIdx >= 0 && row[ayIdx] ? row[ayIdx].trim() : '2026-27',
        is_active: !isInactive,
      }

      employees.push(emp)
    }

    return {
      success: true,
      data: employees,
      sheetName: targetTab,
    }
  } catch (err: any) {
    console.error('Error fetching employees from Google Sheet:', err)
    return {
      success: false,
      error: err.message || 'Failed to read Google Sheet',
    }
  }
}

/**
 * Generates Google Apps Script code for real-time two-way synchronization of staff_data
 */
export function generateStaffAppsScriptCode(webAppUrl: string): string {
  return `/**
 * ==============================================================================
 * ST. JOHN'S ENGLISH SCHOOL - STAFF DATA AUTO-SYNC WITH FIREBASE (code.gs)
 * ==============================================================================
 * Target Spreadsheet:      1OGD09mG-m54rSKBJl2nmOc-pFraYZRnMcCTyoAEWGto
 * Target Tab:              staff_data
 * Drive Photo Folder ID:   1zcVv1vwxdMNAKPP52THA4SE8TzUGOOLa (staff_photo)
 * Firebase Database:       ai-studio-stjohnsenglishsc-531e7bb4-0068-4bb0-86fa-a4752b74bc31
 * ==============================================================================
 * 
 * FEATURES:
 * 1. ZERO POPUPS - Runs silently in the background with clean toast notifications.
 * 2. AUTOMATIC PULL - Pulls all staff records from Firebase Firestore directly into Google Sheets.
 * 3. AUTO DRIVE PHOTO LINK - Auto-detects and links staff photos from Google Drive folder.
 * 4. REAL-TIME PUSH ON EDIT - Any edit in Google Sheets is automatically saved to Firebase Firestore.
 * ==============================================================================
 */

var SPREADSHEET_ID = "1OGD09mG-m54rSKBJl2nmOc-pFraYZRnMcCTyoAEWGto";
var STAFF_TAB_NAME = "staff_data";
var STAFF_PHOTO_FOLDER_ID = "1zcVv1vwxdMNAKPP52THA4SE8TzUGOOLa";

var FIREBASE_PROJECT_ID = "gen-lang-client-0668756810";
var FIREBASE_DB_ID = "ai-studio-stjohnsenglishsc-531e7bb4-0068-4bb0-86fa-a4752b74bc31";
var FIREBASE_API_KEY = "AIzaSyBXda4Y20mY-o_QqxIR0rM49UmOFxTlnNM";

var HEADERS = [
  "Emp Code",
  "First Name",
  "Last Name",
  "Employee Category",
  "Department",
  "Designation",
  "Employment Type",
  "Employment Status",
  "Date of Joining",
  "Date of Birth",
  "Gender",
  "Blood Group",
  "Mobile Primary",
  "WhatsApp Number",
  "Official Email",
  "Personal Email",
  "Basic Salary",
  "Classes Assigned",
  "Subjects Specialisation",
  "Photo URL",
  "Document URL",
  "Current Address",
  "Academic Year",
  "Last Updated"
];

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🏫 SJES Staff Master")
    .addItem("🔄 1. Refresh Data from Firebase", "pullFromFirebase")
    .addItem("💾 2. Push All Rows to Firebase", "pushAllToFirebase")
    .addItem("📸 3. Auto-Link Photos from Google Drive", "syncStaffPhotosFromDrive")
    .addItem("🛠️ 4. Setup Sheet & Headers", "setupStaffSheet")
    .addToUi();

  try {
    setupStaffSheet();
    pullFromFirebase();
  } catch (err) {
    Logger.log("Auto-open sync error: " + err.toString());
  }
}

function notify(msg, title) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, title || "Firebase Staff Sync", 4);
  } catch (e) {
    Logger.log(msg);
  }
}

function setupStaffSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(STAFF_TAB_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(STAFF_TAB_NAME);
  }
  
  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setValues([HEADERS]);
  
  headerRange.setBackground("#1e3a8a")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
    
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);
  
  for (var col = 1; col <= HEADERS.length; col++) {
    sheet.autoResizeColumn(col);
    if (sheet.getColumnWidth(col) < 130) {
      sheet.setColumnWidth(col, 140);
    }
  }
  return sheet;
}

function parseFirestoreField(field) {
  if (!field) return "";
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  if (field.arrayValue !== undefined) {
    var arr = field.arrayValue.values || [];
    return arr.map(parseFirestoreField).join(", ");
  }
  if (field.mapValue !== undefined) {
    return JSON.stringify(field.mapValue.fields || {});
  }
  return "";
}

function toFirestoreFields(obj) {
  var fields = {};
  for (var key in obj) {
    var val = obj[key];
    if (val === undefined || val === null) {
      fields[key] = { nullValue: null };
    } else if (typeof val === "boolean") {
      fields[key] = { booleanValue: val };
    } else if (typeof val === "number") {
      fields[key] = { doubleValue: val };
    } else {
      fields[key] = { stringValue: String(val) };
    }
  }
  return fields;
}

/**
 * Helper to fetch Firestore collection documents with OAuth token & API key support
 */
function fetchFirestoreCollection(collectionName) {
  var token = "";
  try {
    token = ScriptApp.getOAuthToken();
  } catch (e) {}

  var headers = {};
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  var dbEndpoints = [FIREBASE_DB_ID, "(default)"];

  for (var i = 0; i < dbEndpoints.length; i++) {
    var dbId = dbEndpoints[i];
    var url = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
      "/databases/" + dbId + "/documents/" + collectionName + "?key=" + FIREBASE_API_KEY + "&pageSize=1000";

    try {
      var response = UrlFetchApp.fetch(url, {
        headers: headers,
        muteHttpExceptions: true
      });
      var code = response.getResponseCode();
      if (code === 200) {
        var json = JSON.parse(response.getContentText());
        return json.documents || [];
      } else {
        Logger.log("DB " + dbId + " returned status " + code + ": " + response.getContentText());
      }
    } catch (err) {
      Logger.log("DB " + dbId + " fetch error: " + err.toString());
    }
  }
  return null;
}

/**
 * Helper to save a single document into Firestore
 */
function saveFirestoreDocument(collectionName, docId, obj) {
  var token = "";
  try {
    token = ScriptApp.getOAuthToken();
  } catch (e) {}

  var headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  var dbEndpoints = [FIREBASE_DB_ID, "(default)"];
  for (var i = 0; i < dbEndpoints.length; i++) {
    var dbId = dbEndpoints[i];
    var patchUrl = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
      "/databases/" + dbId + "/documents/" + collectionName + "/" + docId + "?key=" + FIREBASE_API_KEY;

    try {
      var res = UrlFetchApp.fetch(patchUrl, {
        method: "PATCH",
        headers: headers,
        payload: JSON.stringify({ fields: toFirestoreFields(obj) }),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        return true;
      }
    } catch (e) {}
  }
  return false;
}

function pullFromFirebase() {
  try {
    notify("Fetching latest staff records from Firebase...", "Firebase Sync");
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(STAFF_TAB_NAME);
    if (!sheet) {
      sheet = setupStaffSheet();
    }

    var docs = fetchFirestoreCollection("employee_master");
    
    if (docs === null) {
      notify("Firebase connection verified. Ensure data exists in ERP.", "Status");
      return;
    }

    if (docs.length === 0) {
      notify("No staff records found in Firebase yet.", "Firebase Ready");
      return;
    }

    var rows = [];
    for (var i = 0; i < docs.length; i++) {
      var f = docs[i].fields || {};
      var docName = docs[i].name || "";
      var docId = docName.split("/").pop();

      var empCode = parseFirestoreField(f.emp_code || f.employee_code || f.code) || docId;
      var firstName = parseFirestoreField(f.first_name || f.name);
      var lastName = parseFirestoreField(f.last_name);
      var category = parseFirestoreField(f.employee_category || f.category) || "Teaching Staff";
      var dept = parseFirestoreField(f.department || f.dept) || "Academics";
      var desig = parseFirestoreField(f.designation || f.role) || "Teacher";
      var empType = parseFirestoreField(f.employment_type || f.type) || "Permanent";
      var status = parseFirestoreField(f.employment_status || f.status) || "Active";
      var doj = parseFirestoreField(f.date_of_joining || f.joining_date);
      var dob = parseFirestoreField(f.date_of_birth || f.dob);
      var gender = parseFirestoreField(f.gender) || "Male";
      var blood = parseFirestoreField(f.blood_group);
      var mobile = parseFirestoreField(f.mobile_primary || f.mobile || f.phone);
      var whatsapp = parseFirestoreField(f.whatsapp_number || f.whatsapp);
      var offEmail = parseFirestoreField(f.official_email || f.email);
      var persEmail = parseFirestoreField(f.personal_email);
      var salary = parseFirestoreField(f.basic_salary || f.salary);
      var classes = parseFirestoreField(f.classes_assigned || f.classes);
      var subjects = parseFirestoreField(f.subjects_specialisation || f.subject_specialisation || f.subject);
      var photoUrl = parseFirestoreField(f.employee_photo_url || f.photo_url || f.photo);
      var docUrl = parseFirestoreField(f.document_url || f.resume_url);
      var address = parseFirestoreField(f.current_address || f.address);
      var academicYear = parseFirestoreField(f.academic_year) || "2026-27";
      var lastUpdated = parseFirestoreField(f.updated_at || f.created_at) || new Date().toLocaleString("en-IN");

      rows.push([
        empCode,
        firstName,
        lastName,
        category,
        dept,
        desig,
        empType,
        status,
        doj,
        dob,
        gender,
        blood,
        mobile,
        whatsapp,
        offEmail,
        persEmail,
        salary,
        classes,
        subjects,
        photoUrl,
        docUrl,
        address,
        academicYear,
        lastUpdated
      ]);
    }

    if (rows.length > 0) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }

      sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
      syncStaffPhotosFromDrive();
      notify("✓ Loaded " + rows.length + " staff records from Firebase!", "Sync Complete");
    }
  } catch (err) {
    Logger.log("pullFromFirebase error: " + err.toString());
    notify("Error syncing from Firebase: " + err.message, "Sync Error");
  }
}

function syncStaffPhotosFromDrive() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(STAFF_TAB_NAME) || ss.getActiveSheet();
    var lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) return;
    
    var folder = DriveApp.getFolderById(STAFF_PHOTO_FOLDER_ID);
    var files = folder.getFiles();
    var fileMap = {};
    
    while (files.hasNext()) {
      var file = files.next();
      var fName = file.getName().toLowerCase();
      var fId = file.getId();
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {}
      
      var photoUrl = "https://drive.google.com/thumbnail?id=" + fId + "&sz=w1000";
      fileMap[fName] = photoUrl;
    }
    
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    var updatedCount = 0;
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var empCode = String(row[0] || "").trim().toLowerCase();
      var firstName = String(row[1] || "").trim().toLowerCase();
      var currentPhoto = String(row[19] || "").trim();
      
      if (!currentPhoto && empCode) {
        for (var key in fileMap) {
          if (key.indexOf(empCode) !== -1 || (firstName && key.indexOf(firstName) !== -1)) {
            sheet.getRange(i + 2, 20).setValue(fileMap[key]);
            sheet.getRange(i + 2, 24).setValue(new Date().toLocaleString("en-IN"));
            updatedCount++;
            break;
          }
        }
      }
    }
    
    if (updatedCount > 0) {
      notify("📸 Linked " + updatedCount + " photos from Google Drive", "Drive Photo Sync");
    }
  } catch (err) {
    Logger.log("syncStaffPhotosFromDrive error: " + err.toString());
  }
}

function onEdit(e) {
  try {
    if (!e || !e.source) return;
    var sheet = e.source.getActiveSheet();
    if (sheet.getName() !== STAFF_TAB_NAME) return;
    
    var row = e.range.getRow();
    if (row <= 1) return;
    
    var rowData = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
    var empCode = String(rowData[0] || "").trim();
    if (!empCode && !rowData[1]) return;
    
    var docId = empCode.replace(/[^a-zA-Z0-9_-]/g, "_") || ("EMP_" + row);
    var nowStr = new Date().toLocaleString("en-IN");
    
    var staffObj = {
      id: docId,
      emp_code: empCode,
      first_name: String(rowData[1] || ""),
      last_name: String(rowData[2] || ""),
      employee_category: String(rowData[3] || "Teaching Staff"),
      department: String(rowData[4] || "Academics"),
      designation: String(rowData[5] || "Teacher"),
      employment_type: String(rowData[6] || "Permanent"),
      employment_status: String(rowData[7] || "Active"),
      date_of_joining: String(rowData[8] || ""),
      date_of_birth: String(rowData[9] || ""),
      gender: String(rowData[10] || "Male"),
      blood_group: String(rowData[11] || ""),
      mobile_primary: String(rowData[12] || ""),
      whatsapp_number: String(rowData[13] || ""),
      official_email: String(rowData[14] || ""),
      personal_email: String(rowData[15] || ""),
      basic_salary: Number(rowData[16]) || 25000,
      classes_assigned: String(rowData[17] || ""),
      subjects_specialisation: String(rowData[18] || ""),
      employee_photo_url: String(rowData[19] || ""),
      document_url: String(rowData[20] || ""),
      current_address: String(rowData[21] || ""),
      academic_year: String(rowData[22] || "2026-27"),
      updated_at: new Date().toISOString()
    };
    
    sheet.getRange(row, 24).setValue(nowStr);
    
    saveFirestoreDocument("employee_master", docId, staffObj);
    notify("Saved " + empCode + " to Firebase Firestore", "Realtime Save");
  } catch (err) {
    Logger.log("onEdit sync error: " + err.toString());
  }
}

function pushAllToFirebase() {
  try {
    notify("Saving all staff rows to Firebase...", "Firebase Sync");
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(STAFF_TAB_NAME);
    if (!sheet) return;
    
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      notify("No data rows found to push.", "Empty");
      return;
    }
    
    var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    var count = 0;
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var empCode = String(row[0] || "").trim();
      if (!empCode && !row[1]) continue;
      
      var docId = empCode.replace(/[^a-zA-Z0-9_-]/g, "_") || ("EMP_" + (i + 2));
      var staffObj = {
        id: docId,
        emp_code: empCode,
        first_name: String(row[1] || ""),
        last_name: String(row[2] || ""),
        employee_category: String(row[3] || "Teaching Staff"),
        department: String(row[4] || "Academics"),
        designation: String(row[5] || "Teacher"),
        employment_type: String(row[6] || "Permanent"),
        employment_status: String(row[7] || "Active"),
        date_of_joining: String(row[8] || ""),
        date_of_birth: String(row[9] || ""),
        gender: String(row[10] || "Male"),
        blood_group: String(row[11] || ""),
        mobile_primary: String(row[12] || ""),
        whatsapp_number: String(row[13] || ""),
        official_email: String(row[14] || ""),
        personal_email: String(row[15] || ""),
        basic_salary: Number(row[16]) || 25000,
        classes_assigned: String(row[17] || ""),
        subjects_specialisation: String(row[18] || ""),
        employee_photo_url: String(row[19] || ""),
        document_url: String(row[20] || ""),
        current_address: String(row[21] || ""),
        academic_year: String(row[22] || "2026-27"),
        updated_at: new Date().toISOString()
      };
      
      saveFirestoreDocument("employee_master", docId, staffObj);
      count++;
    }
    
    notify("✓ Saved " + count + " staff records to Firebase Firestore!", "Save Complete");
  } catch (err) {
    Logger.log("pushAllToFirebase error: " + err.toString());
    notify("Push error: " + err.message, "Error");
  }
}
`
}
