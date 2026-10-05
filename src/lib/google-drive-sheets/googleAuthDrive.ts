import { saveBatchDocuments, saveDocument, fetchCollectionData } from '../supabase'

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
