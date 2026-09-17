import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import firebaseConfig from '../../firebase-applet-config.json'

// Google Workspace Constants - Students
export const GOOGLE_DRIVE_FOLDER_ID = '19EmUMwDpNxuufOr995XPsg_XoG-BqZWO'
export const GOOGLE_DRIVE_FOLDER_NAME = 'student_data_photo'
export const GOOGLE_SHEET_ID = '1OGD09mG-m54rSKBJl2nmOc-pFraYZRnMcCTyoAEWGto'
export const GOOGLE_SHEET_TAB_NAME = 'student_data'

// Google Workspace Constants - Staff
export const STAFF_GOOGLE_DRIVE_FOLDER_ID = '1zcVv1vwxdMNAKPP52THA4SE8TzUGOOLa'
export const STAFF_GOOGLE_DRIVE_FOLDER_NAME = 'staff_photo'
export const STAFF_GOOGLE_SHEET_ID = '1JUZXNNcIZeMGFyzmFbdfxADLY8Jwb_r3e03rJK5rWgc'
export const STAFF_GOOGLE_SHEET_TAB_NAME = 'staff_data'

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
 * Overwrite / sync entire staff database to Google Sheet (tab 'staff_data', Sheet ID: 1JUZXNNcIZeMGFyzmFbdfxADLY8Jwb_r3e03rJK5rWgc)
 */
export async function syncAllEmployeesToGoogleSheet(
  employees: any[]
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
    console.error('Staff Google Sheet Sync Error:', err)
    return {
      success: false,
      error: err.message || 'Failed to sync with Google Sheet',
    }
  }
}

/**
 * Pulls employee data from Google Sheet ('staff_data' or first available sheet tab)
 */
export async function fetchEmployeesFromGoogleSheet(): Promise<{
  success: boolean
  data?: any[]
  error?: string
  sheetName?: string
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
 * Google Apps Script for St. John's English School - Staff Data Auto-Sync
 * Sheet ID: ${STAFF_GOOGLE_SHEET_ID}
 * Sheet Tab: ${STAFF_GOOGLE_SHEET_TAB_NAME}
 * Drive Photo Folder: ${STAFF_GOOGLE_DRIVE_FOLDER_NAME} (${STAFF_GOOGLE_DRIVE_FOLDER_ID})
 */

var ERP_API_URL = "${webAppUrl || 'https://ais-dev-zun4rr2xtnvxzdqyicokal-854403608887.asia-east1.run.app'}";
var STAFF_TAB_NAME = "${STAFF_GOOGLE_SHEET_TAB_NAME}";

function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    if (sheet.getName() !== STAFF_TAB_NAME) return;
    
    var row = e.range.getRow();
    if (row <= 1) return; // Header row
    
    var rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    var payload = {
      emp_code: rowData[0],
      first_name: rowData[1],
      last_name: rowData[2],
      employee_category: rowData[3],
      department: rowData[4],
      designation: rowData[5],
      employment_type: rowData[6],
      employment_status: rowData[7],
      date_of_joining: rowData[8],
      date_of_birth: rowData[9],
      gender: rowData[10],
      blood_group: rowData[11],
      mobile_primary: rowData[12],
      whatsapp_number: rowData[13],
      official_email: rowData[14],
      personal_email: rowData[15],
      basic_salary: rowData[16],
      classes_assigned: rowData[17],
      subject_specialisation: rowData[18],
      employee_photo_url: rowData[19],
      document_url: rowData[20],
      current_address: rowData[21],
      academic_year: rowData[22]
    };
    
    UrlFetchApp.fetch(ERP_API_URL + "/api/webhook/staff-sheet-sync", {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("Staff Auto-sync error: " + err.toString());
  }
}
`
}
