import { saveBatchDocuments } from '../supabase'
import {
  GOOGLE_SHEET_ID,
  GOOGLE_SHEET_TAB_NAME,
  STUDENT_WEB_APP_URL,
  getGoogleAccessToken,
} from './googleAuthDrive'

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

    const token = getGoogleAccessToken()
    if (token) {
      try {
        await ensureSheetTabExists(token)
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${GOOGLE_SHEET_TAB_NAME}!A1:U${rows.length + 1}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
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
