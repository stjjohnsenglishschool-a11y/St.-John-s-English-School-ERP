import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import firebaseConfig from '../../firebase-applet-config.json'

// Google Workspace Constants
export const GOOGLE_DRIVE_FOLDER_ID = '19EmUMwDpNxuufOr995XPsg_XoG-BqZWO'
export const GOOGLE_DRIVE_FOLDER_NAME = 'student_data_photo'
export const GOOGLE_SHEET_ID = '1OGD09mG-m54rSKBJl2nmOc-pFraYZRnMcCTyoAEWGto'
export const GOOGLE_SHEET_TAB_NAME = 'student_data'

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

/**
 * Connects Google Workspace account via popup to get valid Drive & Sheets access token
 */
export async function connectGoogleWorkspace(): Promise<{
  success: boolean
  user?: User
  accessToken?: string
  error?: string
}> {
  if (isConnecting) {
    return { success: false, error: 'Connection already in progress' }
  }
  isConnecting = true
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
    return {
      success: false,
      error: err.message || 'Failed to connect Google Account',
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
  'Student Mobile',
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
    String(s.mobile_primary || s.student_mobile || s.phone || ''),
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
 * Overwrite / sync entire student database to Google Sheet (tab 'student_data')
 */
export async function syncAllStudentsToGoogleSheet(
  students: any[]
): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
  try {
    let token = cachedAccessToken
    if (!token) {
      const conn = await connectGoogleWorkspace()
      if (!conn.success || !conn.accessToken) {
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
    console.error('Google Sheet Sync Error:', err)
    return {
      success: false,
      error: err.message || 'Failed to sync with Google Sheet',
    }
  }
}

/**
 * Pulls student data from Google Sheet ('student_data')
 */
export async function fetchStudentsFromGoogleSheet(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
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
    const mobIdx = getIdx('Student Mobile')
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
        mobile_primary: row[mobIdx >= 0 ? mobIdx : 10] || '',
        student_photo_url: row[sPhotoIdx >= 0 ? sPhotoIdx : 11] || '',
        father_name: row[fNameIdx >= 0 ? fNameIdx : 12] || '',
        father_mobile: row[fMobIdx >= 0 ? fMobIdx : 13] || '',
        father_occupation: row[fOccIdx >= 0 ? fOccIdx : 14] || '',
        father_photo_url: row[fPhotoIdx >= 0 ? fPhotoIdx : 15] || '',
        mother_name: row[mNameIdx >= 0 ? mNameIdx : 16] || '',
        mother_mobile: row[mMobIdx >= 0 ? mMobIdx : 17] || '',
        mother_occupation: row[mOccIdx >= 0 ? mOccIdx : 18] || '',
        mother_photo_url: row[mPhotoIdx >= 0 ? mPhotoIdx : 19] || '',
        address: row[addrIdx >= 0 ? addrIdx : 20] || '',
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
