import React, { useState, useEffect } from 'react'
import {
  HardDrive,
  FileSpreadsheet,
  Mail,
  FileText,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Upload,
  FolderPlus,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Folder,
  ShieldCheck,
  LogOut,
  Info,
  Clock,
  Sparkles,
  ChevronRight,
  Database,
} from 'lucide-react'
import {
  googleSignIn,
  getWorkspaceAccessToken,
  workspaceSignOut,
  getWorkspaceUser,
  initWorkspaceAuth,
  listDriveFiles,
  createDriveFolder,
  uploadFileToDrive,
  deleteDriveFile,
  getDriveAbout,
  listSpreadsheets,
  createSpreadsheet,
  getSpreadsheetDetails,
  getSpreadsheetValues,
  appendSpreadsheetValues,
  exportTableToGoogleSheet,
  listGmailMessages,
  sendGmailMessage,
  trashGmailMessage,
  listGoogleDocs,
  createGoogleDoc,
  exportNoticeToGoogleDoc,
  DriveFileItem,
  GmailMessageItem,
  GoogleSheetMeta,
} from '../lib/googleWorkspace'
import { fetchCollectionData } from '../lib/firebase'

interface GoogleWorkspaceStudioProps {
  initialTab?: 'drive' | 'sheets' | 'gmail' | 'docs'
  setToast: (msg: string) => void
  onExportFromErp?: (moduleKey: string) => void
}

export default function GoogleWorkspaceStudio({
  initialTab = 'drive',
  setToast,
}: GoogleWorkspaceStudioProps) {
  const [activeTab, setActiveTab] = useState<'drive' | 'sheets' | 'gmail' | 'docs'>(initialTab)
  const [accessToken, setAccessToken] = useState<string | null>(getWorkspaceAccessToken())
  const [currentUser, setCurrentUser] = useState(getWorkspaceUser())
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [loading, setLoading] = useState(false)

  // Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([])
  const [driveFilter, setDriveFilter] = useState<string>('all')
  const [driveSearch, setDriveSearch] = useState<string>('')
  const [driveQuota, setDriveQuota] = useState<{ usage?: string; limit?: string } | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showFolderModal, setShowFolderModal] = useState(false)

  // Sheets state
  const [sheetsList, setSheetsList] = useState<DriveFileItem[]>([])
  const [selectedSheetMeta, setSelectedSheetMeta] = useState<GoogleSheetMeta | null>(null)
  const [sheetValues, setSheetValues] = useState<any[][]>([])
  const [loadingSheetData, setLoadingSheetData] = useState(false)
  const [newSheetTitle, setNewSheetTitle] = useState('')
  const [showCreateSheetModal, setShowCreateSheetModal] = useState(false)
  const [erpSyncModule, setErpSyncModule] = useState('student_master')
  const [isSyncingErp, setIsSyncingErp] = useState(false)

  // Gmail state
  const [messages, setMessages] = useState<GmailMessageItem[]>([])
  const [gmailSearch, setGmailSearch] = useState('')
  const [composeModalOpen, setComposeModalOpen] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailCc, setEmailCc] = useState('')

  // Docs state
  const [docsList, setDocsList] = useState<DriveFileItem[]>([])
  const [docSearch, setDocSearch] = useState('')
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [showCreateDocModal, setShowCreateDocModal] = useState(false)

  // Confirmation Modal for Destructive Operations (MANDATORY REQUIREMENT)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    actionLabel: string
    isDanger?: boolean
    onConfirm: () => Promise<void>
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionLabel: 'Confirm',
    onConfirm: async () => {},
  })

  // Watch auth state
  useEffect(() => {
    const unsub = initWorkspaceAuth(
      (user, token) => {
        setCurrentUser(user)
        setAccessToken(token)
      },
      () => {
        setAccessToken(getWorkspaceAccessToken())
        setCurrentUser(getWorkspaceUser())
      }
    )
    return () => unsub()
  }, [])

  // Auto-fetch data on activeTab or token change
  useEffect(() => {
    if (accessToken) {
      if (activeTab === 'drive') loadDriveData()
      if (activeTab === 'sheets') loadSheetsData()
      if (activeTab === 'gmail') loadGmailData()
      if (activeTab === 'docs') loadDocsData()
    }
  }, [accessToken, activeTab])

  const handleSignIn = async () => {
    setIsAuthenticating(true)
    try {
      const res = await googleSignIn()
      if (res) {
        setAccessToken(res.accessToken)
        setCurrentUser(res.user)
        setToast(`Successfully connected Google account: ${res.user.email}`)
      }
    } catch (err: any) {
      console.error('Sign in error:', err)
      setToast(err.message || 'Failed to sign in with Google')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleSignOut = async () => {
    await workspaceSignOut()
    setAccessToken(null)
    setCurrentUser(null)
    setDriveFiles([])
    setSheetsList([])
    setMessages([])
    setDocsList([])
    setToast('Disconnected Google Workspace account')
  }

  /* ---------------- DRIVE ACTIONS ---------------- */
  const loadDriveData = async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await listDriveFiles(accessToken, { query: driveSearch })
      setDriveFiles(res.files)
      try {
        const about = await getDriveAbout(accessToken)
        if (about.storageQuota) {
          setDriveQuota(about.storageQuota)
        }
      } catch {
        // quota optional
      }
    } catch (err: any) {
      setToast(err.message || 'Failed to load Google Drive files')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !newFolderName.trim()) return
    try {
      setLoading(true)
      await createDriveFolder(accessToken, newFolderName.trim())
      setToast(`Created folder "${newFolderName}" in Google Drive`)
      setNewFolderName('')
      setShowFolderModal(false)
      loadDriveData()
    } catch (err: any) {
      setToast(err.message || 'Failed to create folder')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !accessToken) return
    try {
      setLoading(true)
      setToast(`Uploading "${file.name}" to Google Drive...`)
      await uploadFileToDrive(accessToken, file, file.name, file.type)
      setToast(`Successfully uploaded "${file.name}" to Google Drive`)
      loadDriveData()
    } catch (err: any) {
      setToast(err.message || 'File upload failed')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const confirmDeleteDriveFile = (file: DriveFileItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete from Google Drive',
      description: `Are you sure you want to permanently delete "${file.name}" from your Google Drive? This action cannot be undone.`,
      actionLabel: 'Delete File',
      isDanger: true,
      onConfirm: async () => {
        if (!accessToken) return
        await deleteDriveFile(accessToken, file.id)
        setToast(`Deleted "${file.name}" from Google Drive`)
        loadDriveData()
      },
    })
  }

  /* ---------------- SHEETS ACTIONS ---------------- */
  const loadSheetsData = async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const list = await listSpreadsheets(accessToken)
      setSheetsList(list)
    } catch (err: any) {
      setToast(err.message || 'Failed to list spreadsheets')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSheet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !newSheetTitle.trim()) return
    try {
      setLoading(true)
      const res = await createSpreadsheet(accessToken, newSheetTitle.trim(), 'Sheet1', [
        'ID',
        'Title',
        'Date',
        'Status',
        'Notes',
      ])
      setToast(`Created spreadsheet "${newSheetTitle}" in Google Drive`)
      setNewSheetTitle('')
      setShowCreateSheetModal(false)
      loadSheetsData()
      window.open(res.spreadsheetUrl, '_blank')
    } catch (err: any) {
      setToast(err.message || 'Failed to create spreadsheet')
    } finally {
      setLoading(false)
    }
  }

  const viewSheetContent = async (sheetFile: DriveFileItem) => {
    if (!accessToken) return
    setLoadingSheetData(true)
    try {
      const details = await getSpreadsheetDetails(accessToken, sheetFile.id)
      setSelectedSheetMeta(details)
      const firstSheetName = details.sheets[0]?.properties.title || 'Sheet1'
      const values = await getSpreadsheetValues(
        accessToken,
        sheetFile.id,
        `${firstSheetName}!A1:Z50`
      )
      setSheetValues(values)
    } catch (err: any) {
      setToast(err.message || 'Failed to read spreadsheet')
    } finally {
      setLoadingSheetData(false)
    }
  }

  const handleSyncErpToGoogleSheets = async () => {
    if (!accessToken) return
    setIsSyncingErp(true)
    try {
      const data = await fetchCollectionData(erpSyncModule)
      if (!data || data.length === 0) {
        setToast(`No records found in ${erpSyncModule} to export`)
        setIsSyncingErp(false)
        return
      }

      // Format headers and rows
      const allKeys = Object.keys(data[0] || {}).filter(
        (k) => !k.startsWith('_') && typeof data[0][k] !== 'object'
      )
      const headers = allKeys.map((k) => k.replace(/_/g, ' ').toUpperCase())
      const rows = data.map((item) =>
        allKeys.map((k) => (item[k] !== undefined && item[k] !== null ? String(item[k]) : ''))
      )

      const modTitle = erpSyncModule.replace(/_/g, ' ').toUpperCase()
      const res = await exportTableToGoogleSheet(accessToken, modTitle, headers, rows)
      setToast(`Exported ${data.length} records to Google Sheet: "${modTitle}"`)
      loadSheetsData()
      window.open(res.spreadsheetUrl, '_blank')
    } catch (err: any) {
      setToast(err.message || 'Failed to export table to Google Sheets')
    } finally {
      setIsSyncingErp(false)
    }
  }

  /* ---------------- GMAIL ACTIONS ---------------- */
  const loadGmailData = async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await listGmailMessages(accessToken, { query: gmailSearch, maxResults: 15 })
      setMessages(res.messages)
    } catch (err: any) {
      setToast(err.message || 'Failed to load Gmail messages')
    } finally {
      setLoading(false)
    }
  }

  const promptSendEmail = (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailTo.trim() || !emailSubject.trim()) {
      setToast('Please enter both recipient and subject')
      return
    }

    // MANDATORY Confirmation dialog for sending email
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Email Transmission',
      description: `Are you sure you want to send this email to ${emailTo} with the subject "${emailSubject}" from your official Gmail account?`,
      actionLabel: 'Send Email Now',
      isDanger: false,
      onConfirm: async () => {
        if (!accessToken) return
        setLoading(true)
        try {
          await sendGmailMessage(accessToken, {
            to: emailTo.trim(),
            subject: emailSubject.trim(),
            bodyHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
              ${emailBody.replace(/\n/g, '<br/>')}
              <br/><br/>
              <hr style="border: none; border-top: 1px solid #e2e8f0;"/>
              <p style="font-size: 11px; color: #64748b;">
                Sent from <b>St. John's English School Portal</b> via Google Workspace Integration.
              </p>
            </div>`,
            cc: emailCc.trim() || undefined,
          })
          setToast(`Email sent successfully to ${emailTo}`)
          setComposeModalOpen(false)
          setEmailTo('')
          setEmailSubject('')
          setEmailBody('')
          setEmailCc('')
          loadGmailData()
        } catch (err: any) {
          setToast(err.message || 'Failed to send email')
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const confirmTrashEmail = (msg: GmailMessageItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Move Email to Trash',
      description: `Move message "${msg.subject || '(No Subject)'}" to Trash in Gmail?`,
      actionLabel: 'Move to Trash',
      isDanger: true,
      onConfirm: async () => {
        if (!accessToken) return
        await trashGmailMessage(accessToken, msg.id)
        setToast('Message moved to Trash')
        loadGmailData()
      },
    })
  }

  /* ---------------- DOCS ACTIONS ---------------- */
  const loadDocsData = async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const list = await listGoogleDocs(accessToken, docSearch)
      setDocsList(list)
    } catch (err: any) {
      setToast(err.message || 'Failed to list Google Docs')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !newDocTitle.trim()) return
    try {
      setLoading(true)
      const res = await createGoogleDoc(accessToken, newDocTitle.trim(), newDocContent.trim())
      setToast(`Created Google Doc "${newDocTitle}" in Drive`)
      setNewDocTitle('')
      setNewDocContent('')
      setShowCreateDocModal(false)
      loadDocsData()
      window.open(res.documentUrl, '_blank')
    } catch (err: any) {
      setToast(err.message || 'Failed to create Google Doc')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSchoolCircular = async () => {
    if (!accessToken) return
    try {
      setLoading(true)
      const sampleNotice = `It is hereby notified to all students, faculty, and parents that the upcoming Mid-Term Examination schedules have been published. Please ensure all student ID cards and admit cards are in order.\n\nAll departments are requested to conduct review classes and conclude coursework by the end of this month.`
      const res = await exportNoticeToGoogleDoc(
        accessToken,
        'Mid-Term Examination Circular',
        sampleNotice
      )
      setToast('Generated Official Circular in Google Docs!')
      loadDocsData()
      window.open(res.documentUrl, '_blank')
    } catch (err: any) {
      setToast(err.message || 'Failed to generate circular')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="google-workspace-studio" style={{ paddingBottom: '40px' }}>
      {/* Studio Header */}
      <div
        className="page-head"
        style={{
          background: 'linear-gradient(135deg, #071e3d 0%, #153c69 50%, #1d4ed8 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '24px 28px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(7, 30, 61, 0.25)',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1px',
              color: '#93c5fd',
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            <ShieldCheck size={15} color="#60a5fa" />
            Official Google Workspace Suite Integration
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              margin: '0 0 6px',
              fontFamily: 'Manrope, sans-serif',
              letterSpacing: '-0.5px',
              color: '#ffffff',
            }}
          >
            Google Workspace Hub
          </h1>
          <p style={{ margin: 0, color: '#bfdbfe', fontSize: '13px', maxWidth: '640px' }}>
            Seamlessly access Google Drive, Google Sheets, Gmail, and Google Docs with full
            security and real-time synchronization with St. John's English School ERP.
          </p>
        </div>

        {/* Auth Status / Sign In Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {accessToken && currentUser ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                padding: '8px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Google User'}
                  style={{ width: '34px', height: '34px', borderRadius: '50%' }}
                />
              ) : (
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: '#2563eb',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  {(currentUser.displayName || currentUser.email || 'G')[0].toUpperCase()}
                </div>
              )}
              <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                  {currentUser.displayName || 'Google Account'}
                </div>
                <div style={{ fontSize: '10px', color: '#93c5fd' }}>{currentUser.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                title="Disconnect Google Workspace"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  marginLeft: '6px',
                }}
              >
                <LogOut size={13} />
                Disconnect
              </button>
            </div>
          ) : (
            /* OFFICIAL GSI MATERIAL BUTTON */
            <button
              className="gsi-material-button"
              onClick={handleSignIn}
              disabled={isAuthenticating}
              style={{
                background: '#ffffff',
                border: '1px solid #747775',
                borderRadius: '8px',
                padding: '0 16px',
                height: '42px',
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <div className="gsi-material-button-state"></div>
              <div
                className="gsi-material-button-content-wrapper"
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block', width: '20px', height: '20px' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span
                  className="gsi-material-button-contents"
                  style={{
                    color: '#1f1f1f',
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {isAuthenticating ? 'Connecting...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        <button
          onClick={() => setActiveTab('drive')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'drive' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'drive' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'drive' ? 800 : 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <HardDrive size={18} color={activeTab === 'drive' ? '#2563eb' : '#64748b'} />
          Google Drive
        </button>

        <button
          onClick={() => setActiveTab('sheets')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'sheets' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'sheets' ? '#059669' : '#64748b',
            fontWeight: activeTab === 'sheets' ? 800 : 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <FileSpreadsheet size={18} color={activeTab === 'sheets' ? '#059669' : '#64748b'} />
          Google Sheets
        </button>

        <button
          onClick={() => setActiveTab('gmail')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'gmail' ? '3px solid #dc2626' : '3px solid transparent',
            color: activeTab === 'gmail' ? '#dc2626' : '#64748b',
            fontWeight: activeTab === 'gmail' ? 800 : 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Mail size={18} color={activeTab === 'gmail' ? '#dc2626' : '#64748b'} />
          Gmail
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'docs' ? '3px solid #4f46e5' : '3px solid transparent',
            color: activeTab === 'docs' ? '#4f46e5' : '#64748b',
            fontWeight: activeTab === 'docs' ? 800 : 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={18} color={activeTab === 'docs' ? '#4f46e5' : '#64748b'} />
          Google Docs
        </button>
      </div>

      {/* If Not Signed In Prompt */}
      {!accessToken && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            maxWidth: '680px',
            margin: '40px auto',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 20px',
            }}
          >
            <ShieldCheck size={32} />
          </div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 10px',
              fontFamily: 'Manrope, sans-serif',
            }}
          >
            Connect St. John's Google Workspace Account
          </h2>
          <p
            style={{
              color: '#64748b',
              fontSize: '14px',
              lineHeight: 1.6,
              maxWidth: '480px',
              margin: '0 auto 24px',
            }}
          >
            Click below to authenticate securely with your Google account. This provides direct
            integration with <b>Google Drive</b>, <b>Google Sheets</b>, <b>Gmail</b>, and{' '}
            <b>Google Docs</b> with permission from your account.
          </p>
          <button
            className="gsi-material-button"
            onClick={handleSignIn}
            disabled={isAuthenticating}
            style={{
              background: '#ffffff',
              border: '1px solid #747775',
              borderRadius: '8px',
              padding: '0 24px',
              height: '46px',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(0,0,0,0.12)',
            }}
          >
            <div className="gsi-material-button-state"></div>
            <div
              className="gsi-material-button-content-wrapper"
              style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block', width: '22px', height: '22px' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span
                className="gsi-material-button-contents"
                style={{
                  color: '#1f1f1f',
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {isAuthenticating ? 'Connecting to Google...' : 'Sign in with Google'}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* TAB 1: GOOGLE DRIVE */}
      {accessToken && activeTab === 'drive' && (
        <div>
          {/* Drive Action Bar */}
          <div
            style={{
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search files in Google Drive..."
                  value={driveSearch}
                  onChange={(e) => setDriveSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadDriveData()}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </div>
              <button
                onClick={loadDriveData}
                disabled={loading}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                Refresh
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setShowFolderModal(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <FolderPlus size={15} color="#2563eb" />
                New Folder
              </button>

              <label
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Upload size={15} />
                Upload File
                <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Drive Files Grid / List */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                Files in Google Drive ({driveFiles.length})
              </span>
              {driveQuota && (
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Drive Storage Used:{' '}
                  <b>{Math.round(Number(driveQuota.usage || 0) / (1024 * 1024 * 1024))} GB</b>
                </span>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px' }} />
                <div>Loading files from Google Drive...</div>
              </div>
            ) : driveFiles.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <HardDrive size={36} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                  No files found in Google Drive
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Upload documents or create a new folder above to get started.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>
                        File Name
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>
                        Type
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>
                        Modified
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {driveFiles.map((file) => {
                      const isFolder = file.mimeType === 'application/vnd.google-apps.folder'
                      const isSheet =
                        file.mimeType === 'application/vnd.google-apps.spreadsheet'
                      const isDoc =
                        file.mimeType === 'application/vnd.google-apps.document'

                      return (
                        <tr
                          key={file.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {isFolder ? (
                                <Folder size={18} color="#d97706" />
                              ) : isSheet ? (
                                <FileSpreadsheet size={18} color="#059669" />
                              ) : isDoc ? (
                                <FileText size={18} color="#2563eb" />
                              ) : (
                                <HardDrive size={18} color="#64748b" />
                              )}
                              <span>{file.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                            {isFolder
                              ? 'Folder'
                              : isSheet
                              ? 'Google Spreadsheet'
                              : isDoc
                              ? 'Google Doc'
                              : file.mimeType.split('/').pop()?.toUpperCase() || 'File'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                            {file.modifiedTime
                              ? new Date(file.modifiedTime).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '8px',
                              }}
                            >
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open in Google Drive / Docs"
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    color: '#0284c7',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <ExternalLink size={12} />
                                  Open
                                </a>
                              )}
                              <button
                                onClick={() => confirmDeleteDriveFile(file)}
                                title="Delete file"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #fecaca',
                                  background: '#fff1f2',
                                  color: '#dc2626',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE SHEETS */}
      {accessToken && activeTab === 'sheets' && (
        <div>
          {/* Sheets Controls & ERP Sync Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            {/* Quick Create Sheet */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#059669',
                  fontWeight: 700,
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                <FileSpreadsheet size={16} />
                Create New Spreadsheet
              </div>
              <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '12px' }}>
                Generate a fresh Google Sheet saved directly to your Google Drive with column
                headers ready.
              </p>
              <button
                onClick={() => setShowCreateSheetModal(true)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} />
                New Blank Spreadsheet
              </button>
            </div>

            {/* Direct ERP Export to Google Sheets */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                borderRadius: '14px',
                border: '1px solid #bbf7d0',
                padding: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#15803d',
                  fontWeight: 800,
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                <Database size={16} />
                Export ERP Data to Live Google Sheet
              </div>
              <p style={{ margin: '0 0 14px', color: '#166534', fontSize: '12px' }}>
                Select an ERP table to generate an official Google Spreadsheet with all current
                records.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  value={erpSyncModule}
                  onChange={(e) => setErpSyncModule(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #86efac',
                    background: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    flex: 1,
                  }}
                >
                  <option value="student_master">Student Master (Students List)</option>
                  <option value="employee_master">Employee Master (Staff List)</option>
                  <option value="fees_collection">Fee Collection (Finance Records)</option>
                  <option value="expense_master">Expense Master (School Expenses)</option>
                  <option value="vendor_master">Vendor Master</option>
                  <option value="student_attendance">Student Attendance Log</option>
                  <option value="employee_attendance">Employee Attendance Log</option>
                  <option value="asset_master">Asset Master</option>
                </select>
                <button
                  onClick={handleSyncErpToGoogleSheets}
                  disabled={isSyncingErp}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <FileSpreadsheet size={15} />
                  {isSyncingErp ? 'Exporting...' : 'Export to Sheets'}
                </button>
              </div>
            </div>
          </div>

          {/* Existing Spreadsheets List */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                Your Google Spreadsheets ({sheetsList.length})
              </span>
              <button
                onClick={loadSheetsData}
                disabled={loading}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} className={loading ? 'spin' : ''} />
                Refresh List
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Loading spreadsheets...
              </div>
            ) : sheetsList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                No Google Sheets found. Create one above to get started!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>
                        Spreadsheet Title
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>
                        Last Modified
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetsList.map((sheet) => (
                      <tr key={sheet.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileSpreadsheet size={16} color="#059669" />
                            {sheet.name}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                          {sheet.modifiedTime
                            ? new Date(sheet.modifiedTime).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: '8px',
                            }}
                          >
                            <button
                              onClick={() => viewSheetContent(sheet)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#0f766e',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Explore Data
                            </button>
                            {sheet.webViewLink && (
                              <a
                                href={sheet.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#059669',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <ExternalLink size={12} />
                                Open in Google Sheets
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* In-app Spreadsheet Data Viewer */}
          {selectedSheetMeta && (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #10b981',
                padding: '20px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '10px',
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#065f46' }}>
                    Data Viewer: {selectedSheetMeta.properties.title}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Sheets available:{' '}
                    {selectedSheetMeta.sheets.map((s) => s.properties.title).join(', ')}
                  </div>
                </div>
                <a
                  href={selectedSheetMeta.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#059669',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ExternalLink size={12} />
                  Open Live Spreadsheet
                </a>
              </div>

              {loadingSheetData ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  Loading cell contents...
                </div>
              ) : sheetValues.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  No values found in the first sheet.
                </div>
              ) : (
                <div
                  style={{
                    overflowX: 'auto',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    maxHeight: '350px',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <tbody>
                      {sheetValues.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          style={{
                            background: rIdx === 0 ? '#f0fdf4' : rIdx % 2 === 0 ? '#f8fafc' : '#ffffff',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              style={{
                                padding: '8px 12px',
                                borderRight: '1px solid #e2e8f0',
                                fontWeight: rIdx === 0 ? 700 : 400,
                                color: rIdx === 0 ? '#166534' : '#1e293b',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {String(cell || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GMAIL */}
      {accessToken && activeTab === 'gmail' && (
        <div>
          {/* Gmail Action Bar */}
          <div
            style={{
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search emails in Gmail..."
                  value={gmailSearch}
                  onChange={(e) => setGmailSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadGmailData()}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </div>
              <button
                onClick={loadGmailData}
                disabled={loading}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                Check Mail
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => {
                  setEmailTo('')
                  setEmailSubject('')
                  setEmailBody('')
                  setComposeModalOpen(true)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)',
                }}
              >
                <Send size={15} />
                Compose Email
              </button>
            </div>
          </div>

          {/* Quick Communication Templates */}
          <div
            style={{
              background: '#fff5f5',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '12px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
              Quick Templates:
            </span>
            <button
              onClick={() => {
                setEmailSubject("Fee Payment Reminder - St. John's English School")
                setEmailBody(
                  "Dear Parent / Guardian,\n\nThis is a gentle reminder regarding the outstanding term fees for the current academic session. Kindly clear the dues at the school fee collection counter or online via the school portal.\n\nThank you for your cooperation.\nAccounts Department\nSt. John's English School"
                )
                setComposeModalOpen(true)
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Fee Reminder Notice
            </button>
            <button
              onClick={() => {
                setEmailSubject("Absence Notification - St. John's English School")
                setEmailBody(
                  "Dear Parent / Guardian,\n\nWe noticed that your ward was marked absent today without prior leave intimation. Kindly contact the class teacher or submit a leave application.\n\nWarm regards,\nAttendance Incharge\nSt. John's English School"
                )
                setComposeModalOpen(true)
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Absence Alert
            </button>
            <button
              onClick={() => {
                setEmailSubject("Official Circular - St. John's English School")
                setEmailBody(
                  "Dear Teachers, Staff and Parents,\n\nPlease find attached the updated circular for upcoming school activities and holidays. Review the schedule carefully.\n\nPrincipal's Office\nSt. John's English School"
                )
                setComposeModalOpen(true)
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              General Circular
            </button>
          </div>

          {/* Messages Table */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                Inbox & Recent Messages ({messages.length})
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Connected to Gmail: <b>{currentUser?.email}</b>
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px' }} />
                <div>Fetching messages from Gmail...</div>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <Mail size={36} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                  No messages found
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Check your search filter or compose a new email above.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>
                        Sender / Recipient
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>
                        Subject & Preview
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>
                        Date
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg) => (
                      <tr
                        key={msg.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td
                          style={{
                            padding: '12px 16px',
                            fontWeight: 600,
                            color: '#1e293b',
                            maxWidth: '220px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {msg.from || msg.to || 'Unknown'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                            {msg.subject || '(No Subject)'}
                          </div>
                          <div
                            style={{
                              color: '#64748b',
                              fontSize: '11px',
                              maxWidth: '450px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {msg.snippet}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {msg.date ? new Date(msg.date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => confirmTrashEmail(msg)}
                            title="Move to Trash in Gmail"
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              background: '#fff1f2',
                              color: '#dc2626',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GOOGLE DOCS */}
      {accessToken && activeTab === 'docs' && (
        <div>
          {/* Docs Controls */}
          <div
            style={{
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search Google Docs in Drive..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadDocsData()}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </div>
              <button
                onClick={loadDocsData}
                disabled={loading}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                Refresh
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleGenerateSchoolCircular}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #c7d2fe',
                  background: '#eef2ff',
                  color: '#4338ca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={15} />
                Generate School Circular
              </button>

              <button
                onClick={() => setShowCreateDocModal(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} />
                New Google Doc
              </button>
            </div>
          </div>

          {/* Docs Table */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                Your Google Docs ({docsList.length})
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                Loading Google Docs...
              </div>
            ) : docsList.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <FileText size={36} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                  No Google Docs found
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Click "New Google Doc" or "Generate School Circular" above!
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>
                        Document Title
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>
                        Last Modified
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {docsList.map((doc) => (
                      <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={16} color="#4f46e5" />
                            {doc.name}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                          {doc.modifiedTime
                            ? new Date(doc.modifiedTime).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {doc.webViewLink && (
                            <a
                              href={doc.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                background: '#4f46e5',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <ExternalLink size={12} />
                              Open in Google Docs
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Create Folder */}
      {showFolderModal && (
        <div className="modal-bg">
          <div className="record-modal" style={{ maxWidth: '440px' }}>
            <header>
              <div>
                <span>GOOGLE DRIVE</span>
                <h2>New Folder</h2>
              </div>
              <button onClick={() => setShowFolderModal(false)}>✕</button>
            </header>
            <form onSubmit={handleCreateFolder} style={{ padding: '20px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
                Folder Name
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Student Certificates 2026"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </label>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '18px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                  }}
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Spreadsheet */}
      {showCreateSheetModal && (
        <div className="modal-bg">
          <div className="record-modal" style={{ maxWidth: '440px' }}>
            <header>
              <div>
                <span>GOOGLE SHEETS</span>
                <h2>New Spreadsheet</h2>
              </div>
              <button onClick={() => setShowCreateSheetModal(false)}>✕</button>
            </header>
            <form onSubmit={handleCreateSheet} style={{ padding: '20px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
                Spreadsheet Title
                <input
                  type="text"
                  required
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  placeholder="e.g. Annual Sports Day Scoreboard"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </label>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '18px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateSheetModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                  }}
                >
                  Create Spreadsheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Compose Email */}
      {composeModalOpen && (
        <div className="modal-bg">
          <div className="record-modal" style={{ maxWidth: '640px' }}>
            <header>
              <div>
                <span>GMAIL INTEGRATION</span>
                <h2>Compose School Email</h2>
              </div>
              <button onClick={() => setComposeModalOpen(false)}>✕</button>
            </header>
            <form onSubmit={promptSendEmail} style={{ padding: '20px', display: 'grid', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                To: (Recipient Email)
                <input
                  type="email"
                  required
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="parent@example.com, teacher@school.edu"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </label>
              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                Cc: (Optional)
                <input
                  type="text"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  placeholder="principal@stjohns.edu"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </label>
              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                Subject:
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="School Circular / Fee Reminder"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </label>
              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                Message Body:
                <textarea
                  rows={7}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Type your official email message here..."
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                  }}
                />
              </label>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setComposeModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={14} />
                  Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Create Google Doc */}
      {showCreateDocModal && (
        <div className="modal-bg">
          <div className="record-modal" style={{ maxWidth: '540px' }}>
            <header>
              <div>
                <span>GOOGLE DOCS</span>
                <h2>New Google Document</h2>
              </div>
              <button onClick={() => setShowCreateDocModal(false)}>✕</button>
            </header>
            <form onSubmit={handleCreateDoc} style={{ padding: '20px', display: 'grid', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                Document Title
                <input
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Faculty Meeting Minutes"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </label>
              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                Initial Content / Notes (Optional)
                <textarea
                  rows={5}
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder="Type initial agenda, notice notes, or curriculum text..."
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontFamily: 'inherit',
                  }}
                />
              </label>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateDocModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                  }}
                >
                  Create Google Doc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION MODAL FOR DESTRUCTIVE OPERATIONS */}
      {confirmDialog.isOpen && (
        <div className="modal-bg" style={{ zIndex: 9999 }}>
          <div
            className="record-modal"
            style={{
              maxWidth: '460px',
              padding: '24px',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: confirmDialog.isDanger ? '#fee2e2' : '#eff6ff',
                  color: confirmDialog.isDanger ? '#dc2626' : '#2563eb',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={24} />
              </div>
              <div>
                <h3
                  style={{
                    margin: '0 0 6px',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#0f172a',
                    fontFamily: 'Manrope, sans-serif',
                  }}
                >
                  {confirmDialog.title}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const runAction = confirmDialog.onConfirm
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
                  try {
                    await runAction()
                  } catch (err: any) {
                    setToast(err.message || 'Operation failed')
                  }
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: confirmDialog.isDanger ? '#dc2626' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: confirmDialog.isDanger
                    ? '0 2px 8px rgba(220, 38, 38, 0.25)'
                    : '0 2px 8px rgba(37, 99, 235, 0.25)',
                }}
              >
                {confirmDialog.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
