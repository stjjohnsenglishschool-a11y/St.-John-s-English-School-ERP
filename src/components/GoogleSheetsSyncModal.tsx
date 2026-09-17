import React, { useState, useEffect } from 'react'
import {
  X,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Database,
  Code,
  Download,
  Copy,
  Check
} from 'lucide-react'
import {
  ALL_FIREBASE_COLLECTIONS_SYNC,
  syncSingleCollectionToGoogleSheet,
  syncAllFirebaseToGoogleSheets,
  connectGoogleWorkspace,
  getGoogleAuthState,
  GOOGLE_SHEET_ID,
  STAFF_GOOGLE_SHEET_ID
} from '../lib/googleDriveSheets'

interface GoogleSheetsSyncModalProps {
  isOpen: boolean
  onClose: () => void
  onNotify?: (msg: string) => void
}

export default function GoogleSheetsSyncModal({
  isOpen,
  onClose,
  onNotify
}: GoogleSheetsSyncModalProps) {
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncingKey, setSyncingKey] = useState<string | null>(null)
  const [authState, setAuthState] = useState(getGoogleAuthState())
  const [syncResults, setSyncResults] = useState<
    Record<string, { success: boolean; count: number; message: string; timestamp?: string }>
  >({})
  const [copiedScript, setCopiedScript] = useState(false)
  const [activeTab, setActiveTab] = useState<'collections' | 'appsScript'>('collections')

  useEffect(() => {
    setAuthState(getGoogleAuthState())
  }, [isOpen])

  if (!isOpen) return null

  const handleConnectAccount = async () => {
    const res = await connectGoogleWorkspace()
    setAuthState(getGoogleAuthState())
    if (res.success) {
      if (onNotify) onNotify('Google Account connected successfully!')
    } else {
      if (onNotify) onNotify(res.error || 'Failed to connect Google Account')
    }
  }

  const handleSyncAll = async () => {
    setSyncingAll(true)
    try {
      const res = await syncAllFirebaseToGoogleSheets()
      const newResults: Record<string, any> = {}
      res.results.forEach((r) => {
        newResults[r.key] = {
          success: r.success,
          count: r.count,
          message: r.message,
          timestamp: new Date().toLocaleTimeString('en-IN')
        }
      })
      setSyncResults(newResults)
      if (onNotify) onNotify(res.message)
    } catch (err: any) {
      if (onNotify) onNotify('Master sync failed: ' + (err?.message || err))
    } finally {
      setSyncingAll(false)
    }
  }

  const handleSyncSingle = async (key: string) => {
    setSyncingKey(key)
    try {
      const res = await syncSingleCollectionToGoogleSheet(key)
      setSyncResults((prev) => ({
        ...prev,
        [key]: {
          success: res.success,
          count: res.count,
          message: res.message,
          timestamp: new Date().toLocaleTimeString('en-IN')
        }
      }))
      if (onNotify) onNotify(res.message)
    } catch (err: any) {
      if (onNotify) onNotify('Sync failed: ' + (err?.message || err))
    } finally {
      setSyncingKey(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Firebase Firestore ↔ Google Sheets Sync Center
              </h2>
              <p className="text-xs text-slate-400">
                Direct two-way synchronization for all 17 Firebase collections & Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Status Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <span>Google Integration:</span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-xs font-medium">
                  Active & Enabled
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Connected User: <strong className="text-slate-700">st.jjohnsenglishschool@gmail.com</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!authState.isConnected && (
              <button
                onClick={handleConnectAccount}
                className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Authorize Google Workspace Token
              </button>
            )}
            <a
              href={`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Student Sheet <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://docs.google.com/spreadsheets/d/${STAFF_GOOGLE_SHEET_ID}/edit`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Staff Sheet <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-6 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-xl shadow-md">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                <Zap className="w-4 h-4" /> 1-Click Master Synchronization
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Pushes all Firebase records (Students, Staff, Fees, Attendance, Assets, Expenses, etc.) into Google Sheet tabs immediately.
              </p>
            </div>
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-emerald-900/30 flex items-center gap-2 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
              {syncingAll ? 'Syncing All Collections...' : '⚡ Sync ALL Firebase Data to Google Sheets'}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 mt-6 gap-6 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('collections')}
              className={`pb-3 flex items-center gap-2 transition border-b-2 ${
                activeTab === 'collections'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-4 h-4" /> Firebase Collections ({ALL_FIREBASE_COLLECTIONS_SYNC.length})
            </button>
            <button
              onClick={() => setActiveTab('appsScript')}
              className={`pb-3 flex items-center gap-2 transition border-b-2 ${
                activeTab === 'appsScript'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code className="w-4 h-4" /> Google Apps Script Setup (code.gs)
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 pt-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'collections' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Each collection maps to a dedicated tab in your Google Sheet. Click <strong>"Sync Now"</strong> to push data individually or use Master Sync above.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ALL_FIREBASE_COLLECTIONS_SYNC.map((col) => {
                  const res = syncResults[col.key]
                  const isLoadingThis = syncingKey === col.key
                  return (
                    <div
                      key={col.key}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate">{col.label}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                            Tab: {col.tabName}
                          </span>
                        </div>

                        {res ? (
                          <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Synced {res.count} records at {res.timestamp}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            Firestore key: <code className="text-slate-600">{col.key}</code>
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleSyncSingle(col.key)}
                        disabled={isLoadingThis || syncingAll}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shrink-0 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThis ? 'animate-spin' : ''}`} />
                        {isLoadingThis ? 'Syncing...' : 'Sync Now'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'appsScript' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Web App URL & Google Sheets API Integration Active
                </h4>
                <p className="text-emerald-800 mt-1">
                  Your Web App synchronizes data directly using Google Sheets API v4 and background Web App URLs. If you want Google Sheets edits to reflect back into Firebase Firestore automatically, paste the Apps Script code into your spreadsheet!
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">Quick Apps Script Deployment Steps:</h4>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-700">
                  <li>Open your Google Sheet &gt; <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Paste the code from <strong>Employee Master Studio</strong> or <strong>Student Master Studio</strong>.</li>
                  <li>Click <strong>Deploy</strong> &gt; <strong>Manage deployments</strong> &gt; ✏️ <strong>Edit</strong>.</li>
                  <li>Select <strong>Version: New version</strong>, <strong>Execute as: Me</strong>, and <strong>Who has access: Anyone</strong>.</li>
                  <li>Click <strong>Deploy</strong>.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between text-xs text-slate-500">
          <span>St. John's English School — Firebase & Google Workspace Cloud Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
