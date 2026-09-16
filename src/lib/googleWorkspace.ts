import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth'
import { auth, logActivity } from './firebase'

// All requested Google Workspace scopes
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/documents.readonly',
]

// In-memory cache for the access token (do NOT store in localStorage/sessionStorage)
let cachedAccessToken: string | null = null
let isSigningIn = false
let cachedUser: User | null = null

const provider = new GoogleAuthProvider()
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope))
provider.setCustomParameters({
  prompt: 'select_account',
})

/**
 * Initialize auth state listener.
 */
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken)
      } else if (!isSigningIn) {
        // Token is not cached yet in this session
        if (onAuthFailure) onAuthFailure()
      }
    } else {
      cachedUser = null
      cachedAccessToken = null
      if (onAuthFailure) onAuthFailure()
    }
  })
}

/**
 * Sign in with Google Popup and obtain the OAuth access token
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true
    const result = await signInWithPopup(auth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token from Google sign-in')
    }

    cachedAccessToken = credential.accessToken
    cachedUser = result.user

    await logActivity({
      action: `Connected Google Workspace (${result.user.email})`,
      module: 'google_workspace',
      status: 'success',
    })

    return { user: result.user, accessToken: cachedAccessToken }
  } catch (error: any) {
    console.error('Google Workspace sign in error:', error)
    throw error
  } finally {
    isSigningIn = false
  }
}

/**
 * Get current in-memory access token
 */
export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken
}

/**
 * Set in-memory access token (if refreshed)
 */
export const setWorkspaceAccessToken = (token: string | null) => {
  cachedAccessToken = token
}

/**
 * Get current signed-in Google user
 */
export const getWorkspaceUser = (): User | null => {
  return cachedUser || auth.currentUser
}

/**
 * Sign out from Google Workspace
 */
export const workspaceSignOut = async () => {
  try {
    await signOut(auth)
    cachedAccessToken = null
    cachedUser = null
    await logActivity({
      action: 'Disconnected Google Workspace session',
      module: 'google_workspace',
      status: 'info',
    })
  } catch (err) {
    console.error('Error signing out of Google Workspace:', err)
  }
}

/* =========================================================================
   GOOGLE DRIVE APIS
   ========================================================================= */

export interface DriveFileItem {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  webContentLink?: string
  iconLink?: string
  thumbnailLink?: string
  createdTime?: string
  modifiedTime?: string
  size?: string
  owners?: { displayName: string; emailAddress: string; photoLink?: string }[]
  parents?: string[]
}

/**
 * List files from Google Drive
 */
export async function listDriveFiles(
  token: string,
  params?: {
    pageSize?: number
    query?: string
    folderId?: string
    orderBy?: string
  }
): Promise<{ files: DriveFileItem[]; nextPageToken?: string }> {
  const qParts: string[] = ['trashed = false']
  if (params?.folderId) {
    qParts.push(`'${params.folderId}' in parents`)
  }
  if (params?.query) {
    qParts.push(`name contains '${params.query.replace(/'/g, "\\'")}'`)
  }

  const queryParams = new URLSearchParams({
    pageSize: String(params?.pageSize || 30),
    fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, iconLink, thumbnailLink, createdTime, modifiedTime, size, owners, parents)',
    q: qParts.join(' and '),
    orderBy: params?.orderBy || 'modifiedTime desc',
  })

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Google Drive error (${res.status}): ${errText}`)
  }

  return await res.json()
}

/**
 * Create a new folder in Google Drive
 */
export async function createDriveFolder(
  token: string,
  name: string,
  parentFolderId?: string
): Promise<DriveFileItem> {
  const metadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentFolderId) {
    metadata.parents = [parentFolderId]
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Failed to create Drive folder: ${errText}`)
  }

  return await res.json()
}

/**
 * Upload a file to Google Drive using multipart upload
 */
export async function uploadFileToDrive(
  token: string,
  file: File | Blob,
  fileName: string,
  mimeType: string,
  parentFolderId?: string
): Promise<DriveFileItem> {
  const metadata: any = {
    name: fileName,
    mimeType: mimeType || 'application/octet-stream',
  }
  if (parentFolderId) {
    metadata.parents = [parentFolderId]
  }

  const boundary = '-------314159265358979323846'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const reader = new FileReader()
  const fileArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })

  const metadataContentType = 'application/json; charset=UTF-8'
  const metadataPayload = JSON.stringify(metadata)

  // Construct multipart body
  const encoder = new TextEncoder()
  const part1 = encoder.encode(
    `${delimiter}Content-Type: ${metadataContentType}\r\n\r\n${metadataPayload}${delimiter}Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`
  )
  const part2 = new Uint8Array(fileArrayBuffer)
  const part3 = encoder.encode(closeDelimiter)

  const fullBody = new Uint8Array(part1.byteLength + part2.byteLength + part3.byteLength)
  fullBody.set(part1, 0)
  fullBody.set(part2, part1.byteLength)
  fullBody.set(part3, part1.byteLength + part2.byteLength)

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: fullBody,
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Google Drive upload failed: ${errText}`)
  }

  return await res.json()
}

/**
 * Delete a file in Google Drive (Destructive operation - MUST require user confirmation in caller)
 */
export async function deleteDriveFile(token: string, fileId: string): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 204) {
    const errText = await res.text()
    throw new Error(`Failed to delete file from Google Drive: ${errText}`)
  }
  return true
}

/**
 * Get Google Drive storage quota info
 */
export async function getDriveAbout(token: string): Promise<{
  displayName: string
  emailAddress: string
  photoLink?: string
  storageQuota?: { limit?: string; usage?: string; usageInDrive?: string }
}> {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=user,storageQuota',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!res.ok) {
    throw new Error('Failed to retrieve Drive account info')
  }
  const data = await res.json()
  return {
    displayName: data.user?.displayName || 'Google User',
    emailAddress: data.user?.emailAddress || '',
    photoLink: data.user?.photoLink,
    storageQuota: data.storageQuota,
  }
}

/* =========================================================================
   GOOGLE SHEETS APIS
   ========================================================================= */

export interface GoogleSheetMeta {
  spreadsheetId: string
  properties: {
    title: string
    locale?: string
    timeZone?: string
  }
  sheets: {
    properties: {
      sheetId: number
      title: string
      index: number
      gridProperties?: { rowCount: number; columnCount: number }
    }
  }[]
  spreadsheetUrl: string
}

/**
 * List spreadsheets from user's Google Drive
 */
export async function listSpreadsheets(
  token: string,
  search?: string
): Promise<DriveFileItem[]> {
  const qParts = ["mimeType = 'application/vnd.google-apps.spreadsheet'", 'trashed = false']
  if (search) {
    qParts.push(`name contains '${search.replace(/'/g, "\\'")}'`)
  }
  const queryParams = new URLSearchParams({
    pageSize: '25',
    q: qParts.join(' and '),
    fields: 'files(id, name, mimeType, webViewLink, createdTime, modifiedTime)',
    orderBy: 'modifiedTime desc',
  })
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to list Google Sheets')
  const data = await res.json()
  return data.files || []
}

/**
 * Create a new spreadsheet with initial headers and rows
 */
export async function createSpreadsheet(
  token: string,
  title: string,
  sheetTitle = 'Sheet1',
  headers?: string[],
  rows?: any[][]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const body: any = {
    properties: { title },
    sheets: [
      {
        properties: { title: sheetTitle },
      },
    ],
  }

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create spreadsheet: ${err}`)
  }

  const result = await res.json()
  const spreadsheetId = result.spreadsheetId

  // If initial headers or rows provided, write them
  if (headers && headers.length > 0) {
    const valuesToWrite = [headers, ...(rows || [])]
    await updateSpreadsheetValues(token, spreadsheetId, `${sheetTitle}!A1`, valuesToWrite)
  }

  return {
    spreadsheetId,
    spreadsheetUrl: result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  }
}

/**
 * Get spreadsheet details and sheet names
 */
export async function getSpreadsheetDetails(
  token: string,
  spreadsheetId: string
): Promise<GoogleSheetMeta> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties,spreadsheetUrl`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to get spreadsheet details: ${err}`)
  }
  return await res.json()
}

/**
 * Get values from a spreadsheet range (e.g., "Sheet1!A1:Z100")
 */
export async function getSpreadsheetValues(
  token: string,
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  const encodedRange = encodeURIComponent(range)
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to get values from range: ${err}`)
  }
  const data = await res.json()
  return data.values || []
}

/**
 * Append rows to an existing spreadsheet
 */
export async function appendSpreadsheetValues(
  token: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<{ updatedRows: number }> {
  const encodedRange = encodeURIComponent(range)
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to append values: ${err}`)
  }
  const data = await res.json()
  return { updatedRows: data.updates?.updatedRows || values.length }
}

/**
 * Update values in a specific range
 */
export async function updateSpreadsheetValues(
  token: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const encodedRange = encodeURIComponent(range)
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to write values: ${err}`)
  }
}

/**
 * Export any ERP table into a brand new Google Sheet
 */
export async function exportTableToGoogleSheet(
  token: string,
  title: string,
  headers: string[],
  rows: any[][]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const dateStr = new Date().toISOString().slice(0, 10)
  const fullTitle = `SJES - ${title} (${dateStr})`
  return await createSpreadsheet(token, fullTitle, title, headers, rows)
}

/* =========================================================================
   GMAIL APIS
   ========================================================================= */

export interface GmailMessageHeader {
  name: string
  value: string
}

export interface GmailMessageItem {
  id: string
  threadId: string
  snippet?: string
  subject?: string
  from?: string
  to?: string
  date?: string
  labelIds?: string[]
}

/**
 * List Gmail messages
 */
export async function listGmailMessages(
  token: string,
  params?: {
    maxResults?: number
    query?: string
    labelIds?: string[]
  }
): Promise<{ messages: GmailMessageItem[]; resultSizeEstimate: number }> {
  const queryParams = new URLSearchParams({
    maxResults: String(params?.maxResults || 20),
  })
  if (params?.query) {
    queryParams.set('q', params.query)
  }
  if (params?.labelIds && params.labelIds.length > 0) {
    params.labelIds.forEach((l) => queryParams.append('labelIds', l))
  }

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${queryParams.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to list Gmail messages: ${err}`)
  }

  const data = await res.json()
  const rawList: { id: string; threadId: string }[] = data.messages || []

  // Fetch metadata details for the messages in parallel (top 15)
  const detailList = await Promise.all(
    rawList.slice(0, 15).map(async (m) => {
      try {
        const itemRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        if (!itemRes.ok) return { id: m.id, threadId: m.threadId }
        const item = await itemRes.json()
        const headers: GmailMessageHeader[] = item.payload?.headers || []
        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

        return {
          id: item.id,
          threadId: item.threadId,
          snippet: item.snippet,
          subject: getHeader('Subject') || '(No Subject)',
          from: getHeader('From'),
          to: getHeader('To'),
          date: getHeader('Date'),
          labelIds: item.labelIds,
        }
      } catch {
        return { id: m.id, threadId: m.threadId }
      }
    })
  )

  return {
    messages: detailList,
    resultSizeEstimate: data.resultSizeEstimate || detailList.length,
  }
}

/**
 * Send an email message via Gmail (MANDATORY: callers must include confirmation dialog before executing)
 */
export async function sendGmailMessage(
  token: string,
  params: {
    to: string
    subject: string
    bodyHtml: string
    cc?: string
    bcc?: string
  }
): Promise<{ id: string; threadId: string }> {
  // Construct RFC 2822 email format
  const lines = [
    `To: ${params.to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
  ]
  if (params.cc) lines.push(`Cc: ${params.cc}`)
  if (params.bcc) lines.push(`Bcc: ${params.bcc}`)
  lines.push('', params.bodyHtml)

  const rawMessage = lines.join('\r\n')
  // URL-safe Base64 encode
  const base64Encoded = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64Encoded }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to send email via Gmail: ${err}`)
  }

  const data = await res.json()
  await logActivity({
    action: `Sent Gmail to ${params.to}: "${params.subject}"`,
    module: 'gmail',
    status: 'success',
  })

  return data
}

/**
 * Trash a Gmail message (MANDATORY: callers must include confirmation dialog before executing)
 */
export async function trashGmailMessage(token: string, messageId: string): Promise<boolean> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to trash email: ${err}`)
  }
  return true
}

/* =========================================================================
   GOOGLE DOCS APIS
   ========================================================================= */

export interface GoogleDocDetails {
  documentId: string
  title: string
  body?: {
    content?: any[]
  }
  revisionId?: string
}

/**
 * List Google Docs documents from Google Drive
 */
export async function listGoogleDocs(
  token: string,
  search?: string
): Promise<DriveFileItem[]> {
  const qParts = ["mimeType = 'application/vnd.google-apps.document'", 'trashed = false']
  if (search) {
    qParts.push(`name contains '${search.replace(/'/g, "\\'")}'`)
  }
  const queryParams = new URLSearchParams({
    pageSize: '25',
    q: qParts.join(' and '),
    fields: 'files(id, name, mimeType, webViewLink, createdTime, modifiedTime)',
    orderBy: 'modifiedTime desc',
  })
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to list Google Docs')
  const data = await res.json()
  return data.files || []
}

/**
 * Create a new Google Document with initial title and body text
 */
export async function createGoogleDoc(
  token: string,
  title: string,
  initialText?: string
): Promise<{ documentId: string; documentUrl: string }> {
  // 1. Create document
  const res = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create Google Doc: ${err}`)
  }

  const docData = await res.json()
  const documentId = docData.documentId

  // 2. Insert initial text if provided
  if (initialText && initialText.trim().length > 0) {
    await insertTextToGoogleDoc(token, documentId, initialText)
  }

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
  }
}

/**
 * Get Google Document content and metadata
 */
export async function getGoogleDoc(
  token: string,
  documentId: string
): Promise<GoogleDocDetails> {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to fetch Google Doc: ${err}`)
  }
  return await res.json()
}

/**
 * Insert text into an existing Google Doc
 */
export async function insertTextToGoogleDoc(
  token: string,
  documentId: string,
  text: string,
  index = 1
): Promise<void> {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index },
            text: text.endsWith('\n') ? text : text + '\n',
          },
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to insert text into Google Doc: ${err}`)
  }
}

/**
 * Helper to export an official school notice or circular to Google Docs
 */
export async function exportNoticeToGoogleDoc(
  token: string,
  noticeTitle: string,
  noticeBody: string,
  schoolName = "St. John's English School"
): Promise<{ documentId: string; documentUrl: string }> {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const headerText = `${schoolName.toUpperCase()}\nCIRCULAR / OFFICIAL NOTICE\nDate: ${dateStr}\n\nTitle: ${noticeTitle}\n\n${noticeBody}\n\n--\nIssued by School Administration\nSt. John's English School\n`

  return await createGoogleDoc(token, `${noticeTitle} - ${dateStr}`, headerText)
}
