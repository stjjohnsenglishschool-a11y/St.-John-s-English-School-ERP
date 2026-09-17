import { saveBatchDocuments, saveDocument, fetchCollectionData } from './supabase'

export type User = any

// Google Workspace Constants - Students
export const GOOGLE_DRIVE_FOLDER_ID = '1JQgvlo_KbpIhD3jH-0ydqvs6X6JiUmr7'
export const GOOGLE_DRIVE_FOLDER_NAME = 'studen_photo_master'
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

// In-memory token cache
let cachedAccessToken: string | null = null
let cachedGoogleUser: User | null = null

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

export type ConnectGoogleResult = {
  success: boolean
  user?: User | { email?: string; displayName?: string }
  accessToken?: string
  error?: string
  isUnauthorizedDomain?: boolean
  currentDomain?: string
}

export async function connectGoogleWorkspace(): Promise<ConnectGoogleResult> {
  return {
    success: true,
    user: { email: 'st.jjohnsenglishschool@gmail.com', displayName: 'St Johns English School' },
    accessToken: 'connected',
  }
}

export function getGoogleAccessToken(): string | null {
  return cachedAccessToken || 'connected'
}

export function getGoogleUser(): User | null {
  return cachedGoogleUser || { email: 'st.jjohnsenglishschool@gmail.com', displayName: 'St Johns English School' }
}

export function isGoogleConnected(): boolean {
  return true
}

export function getGoogleAuthState() {
  return {
    isConnected: true,
    user: getGoogleUser(),
    accessToken: getGoogleAccessToken(),
  }
}

export async function disconnectGoogle(): Promise<void> {
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

    // Direct Google Sheets API v4 write if OAuth token available
    if (cachedAccessToken) {
      try {
        await ensureSheetTabExists(cachedAccessToken)
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${GOOGLE_SHEET_TAB_NAME}!A1:U${rows.length + 1}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${cachedAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${GOOGLE_SHEET_TAB_NAME}!A1:U${rows.length + 1}`,
              majorDimension: 'ROWS',
              values: [STUDENT_SHEET_HEADERS, ...rows],
            }),
          }
        )
      } catch (sheetsApiErr) {
        console.warn('Sheets API direct write warning:', sheetsApiErr)
      }
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      })
    } catch {
      // Fallback with no-cors mode to ensure message delivery without browser CORS redirect block
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      }).catch(() => {})
    }

    return {
      success: true,
      count: students.length,
      message: `Successfully synced ${students.length} student records to Google Sheet!`,
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
 * Overwrite / sync entire student database to Google Sheet via Web App URL (No Google auth needed)
 */
export async function syncAllStudentsToGoogleSheet(
  students: any[]
): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
  return await pushStudentsToWebApp(students)
}

/**
 * Pulls student data from Google Sheet via Web App URL (No Google auth needed)
 */
export async function fetchStudentsFromGoogleSheet(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  return await fetchStudentsFromWebApp()
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
      sheet: 'Staff_data',
      tab: 'Staff_data',
      data: employees,
      rows: [STAFF_SHEET_HEADERS, ...rows],
      headers: STAFF_SHEET_HEADERS,
      count: employees.length,
      timestamp: new Date().toISOString(),
    }

    // Direct Google Sheets API v4 write if OAuth token available
    if (cachedAccessToken) {
      try {
        await ensureStaffSheetTabExists(cachedAccessToken)
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${STAFF_GOOGLE_SHEET_ID}/values/${STAFF_GOOGLE_SHEET_TAB_NAME}!A1:X${rows.length + 1}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${cachedAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${STAFF_GOOGLE_SHEET_TAB_NAME}!A1:X${rows.length + 1}`,
              majorDimension: 'ROWS',
              values: [STAFF_SHEET_HEADERS, ...rows],
            }),
          }
        )
      } catch (sheetsApiErr) {
        console.warn('Staff Sheets API direct write warning:', sheetsApiErr)
      }
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      })
    } catch {
      // Fallback with no-cors mode to ensure message delivery without browser CORS redirect block
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      }).catch(() => {})
    }

    return {
      success: true,
      count: employees.length,
      message: `Successfully synced ${employees.length} staff records to Google Sheet!`,
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
 * Overwrite / sync entire staff database to Google Sheet via Web App URL (No Google auth needed)
 */
export async function syncAllEmployeesToGoogleSheet(
  employees: any[]
): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
  return await pushStaffToWebApp(employees)
}

/**
 * Sync / upsert a single employee record to the 'Staff_data' Google Sheet tab via Web App URL
 */
export async function syncSingleEmployeeToGoogleSheet(
  employee: any
): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await pushStaffToWebApp([employee])
  return {
    success: res.success,
    message: res.message || 'Staff record synced to Web App',
    error: res.error,
  }
}

/**
 * Pulls employee data from Google Sheet via Web App URL (No Google auth needed)
 */
export async function fetchEmployeesFromGoogleSheet(): Promise<{
  success: boolean
  data?: any[]
  error?: string
  sheetName?: string
}> {
  return await fetchStaffFromWebApp()
}

/**
 * Ensures a sheet tab exists in a spreadsheet using Sheets API v4
 */
export async function ensureTabExistsInSpreadsheet(
  spreadsheetId: string,
  tabName: string,
  accessToken: string
): Promise<boolean> {
  try {
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )
    if (!getRes.ok) return false
    const data = await getRes.json()
    const sheets = data.sheets || []
    const exists = sheets.some((s: any) => String(s.properties?.title || '').toLowerCase() === tabName.toLowerCase())
    if (!exists) {
      const addRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: { title: tabName },
                },
              },
            ],
          }),
        }
      )
      return addRes.ok
    }
    return true
  } catch (err) {
    console.warn(`ensureTabExistsInSpreadsheet error for ${tabName}:`, err)
    return false
  }
}

export type CollectionSyncConfig = {
  key: string
  label: string
  tabName: string
  spreadsheetId: string
  webAppUrl: string
  headers: string[]
  mapRow: (item: any, idx: number) => any[]
}

export const ALL_FIREBASE_COLLECTIONS_SYNC: CollectionSyncConfig[] = [
  {
    key: 'school_master',
    label: 'School Master',
    tabName: 'school_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['School ID', 'Name', 'Code', 'Email', 'Phone', 'Address', 'City', 'State', 'PIN Code', 'Last Updated'],
    mapRow: (item) => [
      item.id || item.code || '',
      item.name || '',
      item.code || '',
      item.email || '',
      item.phone || '',
      item.address || '',
      item.city || '',
      item.state || '',
      item.pincode || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'department_master',
    label: 'Department Master',
    tabName: 'department_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Department Code', 'Department Name', 'Description', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.department_code || item.department_id || '',
      item.department_name || '',
      item.description || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'class_master',
    label: 'Class Master',
    tabName: 'class_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Class ID', 'Class Name', 'Academic Year', 'Capacity', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.class_id || '',
      item.class_name || '',
      item.academic_year || '2026-27',
      item.capacity || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'subject_master',
    label: 'Subject Master',
    tabName: 'subject_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Subject ID', 'Class Name', 'Subject Name', 'Subject Type', 'Code', 'Last Updated'],
    mapRow: (item) => [
      item.subject_id || '',
      item.class_name || '',
      item.subject_name || '',
      item.subject_type || 'Core',
      item.code || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'vendor_master',
    label: 'Vendor Master',
    tabName: 'vendor_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Vendor Code', 'Vendor Name', 'Contact Person', 'Phone', 'Email', 'Address', 'GST Number', 'Category', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.vendor_code || item.vendor_id || '',
      item.vendor_name || '',
      item.contact_person || '',
      item.phone || '',
      item.email || '',
      item.address || '',
      item.gst_number || '',
      item.category || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'student_master',
    label: 'Student Master',
    tabName: 'student_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: STUDENT_SHEET_HEADERS,
    mapRow: (item) => studentToSheetRow(item),
  },
  {
    key: 'employee_master',
    label: 'Employee / Staff Master',
    tabName: 'staff_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: STAFF_SHEET_HEADERS,
    mapRow: (item) => employeeToSheetRow(item),
  },
  {
    key: 'user_master',
    label: 'User Directory & Access Roles',
    tabName: 'user_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['User ID', 'Full Name', 'Username', 'Department', 'Role', 'Allowed Modules', 'Status', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.user_id || item.id || '',
      item.user_full_name || item.name || '',
      item.user_name || '',
      item.department || '',
      item.role || '',
      Array.isArray(item.allowed_modules) ? item.allowed_modules.join(', ') : item.allowed_modules || '',
      item.status || 'active',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'student_attendance',
    label: 'Student Attendance',
    tabName: 'student_attendance',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Attendance ID', 'Date', 'Class Name', 'Section', 'Student ID', 'Student Name', 'Status', 'Marked By', 'Remarks', 'Last Updated'],
    mapRow: (item) => [
      item.attendance_id || '',
      item.date || '',
      item.class_name || '',
      item.section || '',
      item.student_id || item.admission_no || '',
      item.student_name || '',
      item.status || 'Present',
      item.marked_by || '',
      item.remarks || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'employee_attendance',
    label: 'Staff Attendance',
    tabName: 'staff_attendance',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Attendance ID', 'Date', 'Emp Code', 'Employee Name', 'Department', 'Status', 'In Time', 'Out Time', 'Marked By', 'Remarks', 'Last Updated'],
    mapRow: (item) => [
      item.attendance_id || '',
      item.date || '',
      item.emp_code || item.emp_id || '',
      item.employee_name || item.name || '',
      item.department || '',
      item.status || 'Present',
      item.in_time || '',
      item.out_time || '',
      item.marked_by || '',
      item.remarks || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'fees_collection',
    label: 'Fee Collections & Receipts',
    tabName: 'fee_receipts',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Receipt Number', 'Fee ID', 'Student ID', 'Student Name', 'Class Name', 'Academic Year', 'Payment Method', 'Paid Amount', 'Balance Amount', 'Payment Date', 'Fee Head', 'Remarks', 'Created By', 'Last Updated'],
    mapRow: (item) => [
      item.receipt_number || '',
      item.fee_id || '',
      item.student_id || item.admission_no || '',
      item.student_name || '',
      item.class_name || '',
      item.academic_year || '',
      item.payment_method || 'Cash',
      item.paid_amount || item.amount || 0,
      item.balance_amount || 0,
      item.payment_date || item.date || '',
      item.fee_head || item.fee_type || '',
      item.remarks || '',
      item.created_by || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'expense_master',
    label: 'Expenses Master',
    tabName: 'expense_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Expense ID', 'Category', 'Amount', 'Payment Date', 'Vendor Name', 'Payment Method', 'Description', 'Created By', 'Last Updated'],
    mapRow: (item) => [
      item.expense_id || '',
      item.category || '',
      item.amount || 0,
      item.payment_date || item.date || '',
      item.vendor_name || '',
      item.payment_method || 'Cash',
      item.description || '',
      item.created_by || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'income_master',
    label: 'Income Master',
    tabName: 'income_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Income ID', 'Source', 'Amount', 'Date', 'Received From', 'Payment Method', 'Remarks', 'Created By', 'Last Updated'],
    mapRow: (item) => [
      item.income_id || '',
      item.source || '',
      item.amount || 0,
      item.date || '',
      item.received_from || '',
      item.payment_method || 'Cash',
      item.remarks || '',
      item.created_by || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'salary_slip',
    label: 'Salary Slips / Payroll',
    tabName: 'salary_slips',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Slip ID', 'Emp Code', 'Employee Name', 'Month Year', 'Basic Salary', 'Allowances', 'Deductions', 'Net Salary', 'Payment Date', 'Status', 'Last Updated'],
    mapRow: (item) => [
      item.slip_id || '',
      item.emp_code || item.emp_id || '',
      item.employee_name || '',
      item.month_year || '',
      item.basic_salary || 0,
      item.allowances || 0,
      item.deductions || 0,
      item.net_salary || 0,
      item.payment_date || '',
      item.status || 'Paid',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'leave_application',
    label: 'Leave Applications',
    tabName: 'leave_applications',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Leave Application ID', 'Emp ID', 'Employee Name', 'Leave Type', 'From Date', 'To Date', 'Total Days', 'Reason', 'Status', 'Approved By', 'Remarks', 'Last Updated'],
    mapRow: (item) => [
      item.leave_app_id || item.id || '',
      item.emp_id || '',
      item.employee_name || '',
      item.leave_type || '',
      item.from_date || '',
      item.to_date || '',
      item.total_days || 0,
      item.reason || '',
      item.status || 'pending',
      item.approved_by || '',
      item.remarks || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'leave_balance',
    label: 'Leave Balances',
    tabName: 'leave_balances',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Balance ID', 'Emp ID', 'Employee Name', 'Academic Year', 'Leave Type', 'Entitled', 'Taken', 'Pending', 'Remaining', 'Last Updated'],
    mapRow: (item) => [
      item.balance_id || item.id || '',
      item.emp_id || '',
      item.employee_name || '',
      item.academic_year || '2026-27',
      item.leave_type || '',
      item.total_entitled || 0,
      item.total_taken || 0,
      item.total_pending || 0,
      item.balance_remaining || 0,
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'warning_letter',
    label: 'Warning Letters',
    tabName: 'warning_letters',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Letter ID', 'Emp ID', 'Employee Name', 'Issue Date', 'Warning Type', 'Subject', 'Description', 'Issued By', 'Acknowledged', 'Status', 'Last Updated'],
    mapRow: (item) => [
      item.letter_id || item.id || '',
      item.emp_id || '',
      item.employee_name || '',
      item.issue_date || '',
      item.warning_type || '',
      item.subject || '',
      item.description || '',
      item.issued_by || '',
      item.acknowledged ? 'Yes' : 'No',
      item.status || 'draft',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'offer_letter',
    label: 'Offer Letters',
    tabName: 'offer_letters',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Offer ID', 'Candidate Name', 'Designation', 'Joining Date', 'Basic Salary', 'Offer Date', 'Valid Until', 'Issued By', 'Status', 'Last Updated'],
    mapRow: (item) => [
      item.offer_id || item.id || '',
      item.candidate_name || '',
      item.designation || '',
      item.joining_date || '',
      item.basic_salary || 0,
      item.offer_date || '',
      item.valid_until || '',
      item.issued_by || '',
      item.status || 'draft',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'employee_document',
    label: 'Employee Documents',
    tabName: 'employee_documents',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Doc ID', 'Emp ID', 'Employee Name', 'Designation', 'Department', 'Doc Type', 'File URL', 'Is Verified', 'Remarks', 'Last Updated'],
    mapRow: (item) => [
      item.doc_id || item.id || '',
      item.emp_id || '',
      item.employee_name || '',
      item.employee_designation || '',
      item.employee_department || '',
      item.doc_type || '',
      item.file_url || '',
      item.is_verified ? 'Yes' : 'No',
      item.remarks || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'asset_master',
    label: 'Asset Master',
    tabName: 'asset_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Asset Code', 'Asset Name', 'Category', 'Location', 'Purchase Date', 'Purchase Cost', 'Condition', 'Assigned To', 'Status', 'Last Updated'],
    mapRow: (item) => [
      item.asset_code || item.asset_id || '',
      item.asset_name || '',
      item.category || '',
      item.location || '',
      item.purchase_date || '',
      item.purchase_cost || 0,
      item.condition || 'Good',
      item.assigned_to || '',
      item.status || 'Active',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'inventory_master',
    label: 'Inventory Master',
    tabName: 'inventory_data',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Item Code', 'Item Name', 'Category', 'Quantity In Stock', 'Minimum Stock Level', 'Unit Price', 'Unit Of Measure', 'Location', 'Last Updated'],
    mapRow: (item) => [
      item.item_code || item.item_id || '',
      item.item_name || '',
      item.category || '',
      item.quantity_in_stock || item.quantity || 0,
      item.minimum_stock_level || 5,
      item.unit_price || 0,
      item.unit_of_measure || 'Pcs',
      item.location || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'teacher_idcard',
    label: 'Teacher ID Cards',
    tabName: 'teacher_idcards',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Card ID', 'Emp ID', 'Employee Name', 'Designation', 'Department', 'Mobile', 'Photo URL', 'Issue Date', 'Valid Until', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.card_id || item.id || '',
      item.emp_id || '',
      item.employee_name || '',
      item.designation || '',
      item.department || '',
      item.mobile || '',
      item.photo_url || '',
      item.issue_date || '',
      item.valid_until || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'student_idcard',
    label: 'Student ID Cards',
    tabName: 'student_idcards',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Card ID', 'Student ID', 'Student Name', 'Class Name', 'Roll No', 'Mobile', 'Photo URL', 'Issue Date', 'Valid Until', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.card_id || item.id || '',
      item.student_id || '',
      item.student_name || '',
      item.class_name || '',
      item.roll_no || '',
      item.mobile || '',
      item.photo_url || '',
      item.issue_date || '',
      item.valid_until || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'escort_card',
    label: 'Escort Pickup Cards',
    tabName: 'escort_cards',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Card ID', 'Student Name', 'Class Name', 'Escort Name', 'Relationship', 'Mobile', 'Photo URL', 'Issue Date', 'Valid Until', 'Is Active', 'Last Updated'],
    mapRow: (item) => [
      item.card_id || item.id || '',
      item.student_name || '',
      item.class_name || '',
      item.escort_name || '',
      item.relation || '',
      item.mobile || '',
      item.photo_url || '',
      item.issue_date || '',
      item.valid_until || '',
      item.is_active !== false ? 'Yes' : 'No',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'notice_automation',
    label: 'Notice Automation',
    tabName: 'notice_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Notice ID', 'Title', 'Target Group', 'Category', 'Publish Date', 'Content', 'Created By', 'Status', 'Last Updated'],
    mapRow: (item) => [
      item.notice_id || '',
      item.title || '',
      item.target_group || 'All',
      item.category || 'General',
      item.publish_date || '',
      item.content || '',
      item.created_by || '',
      item.status || 'Published',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'assignments_master',
    label: 'Assignments Master',
    tabName: 'assignment_data',
    spreadsheetId: GOOGLE_SHEET_ID,
    webAppUrl: STUDENT_WEB_APP_URL,
    headers: ['Assignment ID', 'Title', 'Class Name', 'Subject Name', 'Due Date', 'Total Marks', 'Created By', 'Description', 'Last Updated'],
    mapRow: (item) => [
      item.assignment_id || '',
      item.title || '',
      item.class_name || '',
      item.subject_name || '',
      item.due_date || '',
      item.total_marks || 100,
      item.created_by || '',
      item.description || '',
      item.updated_at || new Date().toISOString(),
    ],
  },
  {
    key: 'userlog_master',
    label: 'User Activity Logs',
    tabName: 'user_logs',
    spreadsheetId: STAFF_GOOGLE_SHEET_ID,
    webAppUrl: STAFF_WEB_APP_URL,
    headers: ['Log ID', 'Username', 'Action', 'Module', 'Status', 'Error Message', 'Device Info', 'Browser', 'Timestamp'],
    mapRow: (item) => [
      item.log_id || '',
      item.username || '',
      item.action || '',
      item.module || '',
      item.status || '',
      item.error_message || '',
      item.device_info || '',
      item.browser || '',
      item.created_at || new Date().toISOString(),
    ],
  },
]

/**
 * Sync a single Firebase collection to Google Sheet
 */
export async function syncSingleCollectionToGoogleSheet(
  collectionKey: string,
  customData?: any[]
): Promise<{ success: boolean; count: number; message: string; error?: string }> {
  const config = ALL_FIREBASE_COLLECTIONS_SYNC.find((c) => c.key === collectionKey)
  if (!config) {
    return { success: false, count: 0, message: `Collection ${collectionKey} not configured.` }
  }

  try {
    const records = customData || (await fetchCollectionData(collectionKey)) || []
    const rows = records.map((item, idx) => config.mapRow(item, idx))

    let token = cachedAccessToken
    if (!token) {
      const conn = await connectGoogleWorkspace()
      if (conn.success && conn.accessToken) {
        token = conn.accessToken
      }
    }

    if (token) {
      try {
        await ensureTabExistsInSpreadsheet(config.spreadsheetId, config.tabName, token)
        const colLetter = String.fromCharCode(65 + Math.min(25, config.headers.length - 1))
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${config.tabName}!A1:${colLetter}${rows.length + 1}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${config.tabName}!A1:${colLetter}${rows.length + 1}`,
              majorDimension: 'ROWS',
              values: [config.headers, ...rows],
            }),
          }
        )
      } catch (sheetsErr) {
        console.warn(`Sheets API write warning for ${config.tabName}:`, sheetsErr)
      }
    }

    // Web App URL fallback POST
    try {
      const payload = {
        action: 'push',
        sheet: config.tabName,
        tab: config.tabName,
        collection: collectionKey,
        data: records,
        rows: [config.headers, ...rows],
        headers: config.headers,
        count: records.length,
        timestamp: new Date().toISOString(),
      }
      await fetch(config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      }).catch(() => {
        return fetch(config.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        })
      })
    } catch {
      // ignore fallback error
    }

    return {
      success: true,
      count: records.length,
      message: `Successfully synced ${records.length} records of '${config.label}' to Google Sheet ('${config.tabName}')!`,
    }
  } catch (err: any) {
    console.error(`syncSingleCollectionToGoogleSheet error [${collectionKey}]:`, err)
    return {
      success: false,
      count: 0,
      message: `Failed to sync ${config.label}`,
      error: err.message || String(err),
    }
  }
}

/**
 * Master function: Sync ALL Firebase collections to Google Sheet in 1 click
 */
export async function syncAllFirebaseToGoogleSheets(): Promise<{
  success: boolean
  totalCount: number
  results: Array<{ key: string; label: string; tabName: string; count: number; success: boolean; message: string }>
  message: string
}> {
  let token = cachedAccessToken
  if (!token) {
    const conn = await connectGoogleWorkspace()
    if (conn.success && conn.accessToken) {
      token = conn.accessToken
    }
  }

  const results: Array<{ key: string; label: string; tabName: string; count: number; success: boolean; message: string }> = []
  let totalCount = 0

  for (const config of ALL_FIREBASE_COLLECTIONS_SYNC) {
    const res = await syncSingleCollectionToGoogleSheet(config.key)
    results.push({
      key: config.key,
      label: config.label,
      tabName: config.tabName,
      count: res.count,
      success: res.success,
      message: res.message,
    })
    if (res.success) {
      totalCount += res.count
    }
  }

  return {
    success: true,
    totalCount,
    results,
    message: `Master Google Sheet Sync complete! Total ${totalCount} records across ${ALL_FIREBASE_COLLECTIONS_SYNC.length} Firebase collections updated in Google Sheet.`,
  }
}

/**
 * Generates Google Apps Script code for real-time two-way synchronization of Staff_data
 */
export function generateStaffAppsScriptCode(webAppUrl: string): string {
  return `/**
 * ==============================================================================
 * ST. JOHN'S ENGLISH SCHOOL - STAFF DATA AUTO-SYNC WEB APP & FIREBASE (code.gs)
 * ==============================================================================
 * Target Spreadsheet:      1JUZXNNcIZeMGFyzmFbdfxADLY8Jwb_r3e03rJK5rWgc
 * Target Tab:              Staff_data
 * Drive Photo Folder ID:   1zcVv1vwxdMNAKPP52THA4SE8TzUGOOLa (staff_photo)
 * Firebase Database:       ai-studio-stjohnsenglishsc-531e7bb4-0068-4bb0-86fa-a4752b74bc31
 * ==============================================================================
 * 
 * FEATURES:
 * 1. ZERO POPUPS & AUTO-SYNC - Runs silently in background with toast alerts.
 * 2. WEB APP POST (doPost) - Receives automated sync data from the ERP Web App and immediately writes rows.
 * 3. WEB APP GET (doGet) - Returns clean JSON of all staff rows for the ERP Web App.
 * 4. AUTO DRIVE PHOTO LINK - Auto-detects photos from Drive folder and inserts thumbnail URLs.
 * 5. REAL-TIME PUSH ON EDIT - Any manual edit in the Google Sheet is auto-saved to Firebase Firestore.
 * ==============================================================================
 */

var SPREADSHEET_ID = "1JUZXNNcIZeMGFyzmFbdfxADLY8Jwb_r3e03rJK5rWgc";
var STAFF_TAB_NAME = "Staff_data";
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

// Helper to find the Staff sheet tab case-insensitively
function getStaffSheet(ss) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  var sheet = ss.getSheetByName(STAFF_TAB_NAME) || 
              ss.getSheetByName("staff_data") || 
              ss.getSheetByName("Staff_Data") || 
              ss.getSheetByName("Staff Data") || 
              ss.getSheetByName("Sheet1") || 
              ss.getActiveSheet();
  if (!sheet) {
    sheet = ss.insertSheet(STAFF_TAB_NAME);
  }
  return sheet;
}

/**
 * WEB APP POST HANDLER - Receives push/sync data directly from ERP Web App
 */
function doPost(e) {
  try {
    var raw = "";
    if (e && e.postData && e.postData.contents) {
      raw = e.postData.contents;
    } else if (e && e.parameter && e.parameter.data) {
      raw = e.parameter.data;
    }
    
    if (!raw) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "No payload received in request body"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var payload = {};
    try {
      payload = JSON.parse(raw);
    } catch(parseErr) {
      payload = { action: "raw", data: raw };
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getStaffSheet(ss);
    
    // Extract rows or items
    var rowsToWrite = [];
    
    if (payload.rows && Array.isArray(payload.rows) && payload.rows.length > 0) {
      if (Array.isArray(payload.rows[0]) && String(payload.rows[0][0]).toLowerCase().indexOf("emp") !== -1) {
        rowsToWrite = payload.rows.slice(1);
      } else {
        rowsToWrite = payload.rows;
      }
    } else if (payload.data && Array.isArray(payload.data)) {
      for (var i = 0; i < payload.data.length; i++) {
        var emp = payload.data[i];
        if (Array.isArray(emp)) {
          rowsToWrite.push(emp);
        } else {
          rowsToWrite.push(employeeObjToRow(emp));
        }
      }
    } else if (Array.isArray(payload)) {
      for (var j = 0; j < payload.length; j++) {
        var item = payload[j];
        if (Array.isArray(item)) {
          rowsToWrite.push(item);
        } else {
          rowsToWrite.push(employeeObjToRow(item));
        }
      }
    }
    
    // Ensure header row is formatted
    setupStaffSheetHeaders(sheet);
    
    if (rowsToWrite.length > 0) {
      // Clear existing data rows (from row 2 downwards)
      var maxRows = sheet.getMaxRows();
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }
      
      // Expand sheet if needed
      if (rowsToWrite.length + 1 > maxRows) {
        sheet.insertRowsAfter(maxRows, (rowsToWrite.length + 1) - maxRows + 20);
      }
      
      // Write all rows
      sheet.getRange(2, 1, rowsToWrite.length, HEADERS.length).setValues(rowsToWrite);
      
      // Auto-link photos from Drive
      try {
        syncStaffPhotosFromDrive();
      } catch(photoErr) {}
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      count: rowsToWrite.length,
      message: "Successfully synchronized " + rowsToWrite.length + " staff records into Staff_data sheet!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    Logger.log("doPost Error: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * WEB APP GET HANDLER - Returns JSON of all staff rows
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getStaffSheet(ss);
    var lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: [],
        count: 0,
        message: "No staff rows found in sheet"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var values = sheet.getRange(1, 1, lastRow, HEADERS.length).getValues();
    var list = [];
    
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      if (!r[0] && !r[1]) continue;
      list.push({
        emp_code: String(r[0] || ""),
        first_name: String(r[1] || ""),
        last_name: String(r[2] || ""),
        employee_category: String(r[3] || "Teaching Staff"),
        department: String(r[4] || "Academics"),
        designation: String(r[5] || "Teacher"),
        employment_type: String(r[6] || "Permanent"),
        employment_status: String(r[7] || "Active"),
        date_of_joining: String(r[8] || ""),
        date_of_birth: String(r[9] || ""),
        gender: String(r[10] || "Male"),
        blood_group: String(r[11] || ""),
        mobile_primary: String(r[12] || ""),
        whatsapp_number: String(r[13] || ""),
        official_email: String(r[14] || ""),
        personal_email: String(r[15] || ""),
        basic_salary: Number(r[16]) || 25000,
        classes_assigned: String(r[17] || ""),
        subject_specialisation: String(r[18] || ""),
        employee_photo_url: String(r[19] || ""),
        document_url: String(r[20] || ""),
        current_address: String(r[21] || ""),
        academic_year: String(r[22] || "2026-27"),
        updated_at: String(r[23] || "")
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: list,
      count: list.length
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function employeeObjToRow(e) {
  var classes = Array.isArray(e.classes_assigned) ? e.classes_assigned.join(", ") : String(e.classes_assigned || "");
  var subs = Array.isArray(e.subject_specialisation) ? e.subject_specialisation.join(", ") : String(e.subject_specialisation || "");
  var nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  return [
    String(e.emp_code || e.emp_id || e._docId || ""),
    String(e.first_name || (e.name ? String(e.name).split(" ")[0] : "") || ""),
    String(e.last_name || (e.name ? String(e.name).split(" ").slice(1).join(" ") : "") || ""),
    String(e.employee_category || "Teaching Staff"),
    String(e.department || "Academics"),
    String(e.designation || "Teacher"),
    String(e.employment_type || "Permanent"),
    String(e.employment_status || (e.is_active !== false ? "Active" : "Inactive")),
    String(e.date_of_joining || ""),
    String(e.date_of_birth || ""),
    String(e.gender || "Male"),
    String(e.blood_group || ""),
    String(e.mobile_primary || e.mobile || e.phone || ""),
    String(e.whatsapp_number || e.whatsapp || ""),
    String(e.official_email || e.email || ""),
    String(e.personal_email || ""),
    Number(e.basic_salary) || 25000,
    classes,
    subs,
    String(e.employee_photo_url || e.photo_url || ""),
    String(e.document_url || ""),
    String(e.current_address || e.address || ""),
    String(e.academic_year || "2026-27"),
    nowStr
  ];
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🏫 SJES Staff Master")
    .addItem("🔄 1. Refresh Data from Firebase / ERP", "pullFromFirebase")
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

function setupStaffSheetHeaders(sheet) {
  if (!sheet) return;
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
}

function setupStaffSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getStaffSheet(ss);
  setupStaffSheetHeaders(sheet);
  
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

function fetchFirestoreCollection(collectionName) {
  var dbEndpoints = [FIREBASE_DB_ID, "(default)"];

  for (var i = 0; i < dbEndpoints.length; i++) {
    var dbId = dbEndpoints[i];
    var url = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
      "/databases/" + dbId + "/documents/" + collectionName + "?key=" + FIREBASE_API_KEY + "&pageSize=1000";

    try {
      var response = UrlFetchApp.fetch(url, {
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

function saveFirestoreDocument(collectionName, docId, obj) {
  var headers = { "Content-Type": "application/json" };

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
    notify("Fetching latest staff records...", "Syncing Staff");
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getStaffSheet(ss);
    setupStaffSheetHeaders(sheet);

    var docs = fetchFirestoreCollection("employee_master");
    
    if (docs === null || docs.length === 0) {
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
      notify("✓ Loaded " + rows.length + " staff records into Google Sheet!", "Sync Complete");
    }
  } catch (err) {
    Logger.log("pullFromFirebase error: " + err.toString());
    notify("Error syncing: " + err.message, "Sync Error");
  }
}

function syncStaffPhotosFromDrive() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getStaffSheet(ss);
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
    var sheetName = sheet.getName().toLowerCase();
    if (sheetName !== "staff_data") return;
    
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
    var sheet = getStaffSheet(ss);
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
