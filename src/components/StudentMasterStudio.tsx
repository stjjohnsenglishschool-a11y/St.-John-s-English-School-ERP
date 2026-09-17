import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  X,
  Check,
  CreditCard,
  Calendar,
  FileText,
  User,
  Phone,
  Home,
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
  CloudUpload,
  FolderGit2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Link2,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  Copy,
  Info,
} from 'lucide-react'
import { supabase, logActivity, deleteDocument, saveDocument, saveBatchDocuments, fetchCollectionData, subscribeToCollection } from '../lib/firebase'
import { getCurrentAcademicYear, ACADEMIC_YEAR_OPTIONS, CURRENT_ACADEMIC_YEAR } from '../lib/academicYear'
import { modules } from '../modules'
import { downloadSampleCsv } from '../lib/csvUtils'
import { formatImageUrl, handleImageError } from '../lib/imageUtils'
import CsvImportModal from './CsvImportModal'
import {
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_FOLDER_NAME,
  GOOGLE_SHEET_ID,
  GOOGLE_SHEET_TAB_NAME,
  STUDENT_SHEET_HEADERS,
  connectGoogleWorkspace,
  disconnectGoogle,
  isGoogleConnected,
  getGoogleUser,
  subscribeGoogleAuth,
  uploadPhotoToGoogleDrive,
  syncAllStudentsToGoogleSheet,
  fetchStudentsFromGoogleSheet,
} from '../lib/googleDriveSheets'

export type Student = {
  student_id?: string
  admission_no?: string
  roll_no?: string
  academic_year?: string
  class_name?: string
  section?: string
  student_status?: string
  full_name?: string
  date_of_birth?: string
  gender?: string
  blood_group?: string
  student_photo_url?: string
  father_name?: string
  father_mobile?: string
  father_occupation?: string
  father_photo_url?: string
  mother_name?: string
  mother_mobile?: string
  mother_occupation?: string
  mother_photo_url?: string
  address?: string
  is_active?: boolean
  created_at?: string
  _docId?: string
  [key: string]: unknown
}

export default function StudentMasterStudio({
  setToast,
  onNavigateToIdCard,
  onNavigateToFees,
}: {
  setToast: (msg: string) => void
  onNavigateToIdCard?: (studentId: string) => void
  onNavigateToFees?: (studentId: string) => void
}) {
  const [students, setStudents] = useState<Student[]>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cached =
          localStorage.getItem('sjes_table_student_master') ||
          localStorage.getItem('sjes_table_students')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      } catch {}
    }
    return []
  })
  const [classes, setClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterYear, setFilterYear] = useState('')

  const [page, setPage] = useState(1)
  const pageSize = 15

  // Google Workspace state
  const [googleUser, setGoogleUser] = useState<any>(null)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [syncingSheet, setSyncingSheet] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [showScriptModal, setShowScriptModal] = useState(false)
  const [showDomainModal, setShowDomainModal] = useState(false)
  const [domainCopied, setDomainCopied] = useState(false)

  // Form / Profile Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [activeTab, setActiveTab] = useState<'student' | 'parents' | 'address'>('student')
  const [formState, setFormState] = useState<Student>({})
  const [submitting, setSubmitting] = useState(false)
  const [showCsvModal, setShowCsvModal] = useState(false)

  // Photo upload states
  const [uploadingStudentPhoto, setUploadingStudentPhoto] = useState(false)
  const [uploadingFatherPhoto, setUploadingFatherPhoto] = useState(false)
  const [uploadingMotherPhoto, setUploadingMotherPhoto] = useState(false)

  // Subscribe to Google Auth state
  useEffect(() => {
    const unsub = subscribeGoogleAuth((user, token) => {
      setGoogleUser(user)
      setGoogleConnected(Boolean(token))
    })
    return () => unsub()
  }, [])

  // Fetch classes from class_master
  useEffect(() => {
    fetchCollectionData('class_master').then((data) => {
      if (data && data.length > 0) {
        const names = data.map((c: any) => c.class_name).filter(Boolean)
        setClasses(
          names.length > 0
            ? names
            : [
                'PG',
                'NURSERY',
                'LKG',
                'UKG',
                'CLASS I',
                'CLASS II',
                'CLASS III',
                'CLASS IV',
                'CLASS V',
                'CLASS VI',
                'CLASS VII',
                'CLASS VIII',
              ]
        )
      }
    })
  }, [])

  // Helper to sanitize student records and strip deprecated/deleted fields
  const sanitizeStudentRecord = (record: any): Student => {
    const clean = { ...record }
    delete clean.gr_number
    delete clean.house_name
    delete clean.house
    delete clean.first_name
    delete clean.middle_name
    delete clean.last_name
    delete clean.mobile_primary
    delete clean.student_mobile
    delete clean.student_email
    delete clean.father_email
    delete clean.mother_email
    return clean as Student
  }

  // Load students from database
  const loadStudents = async () => {
    setLoading(true)
    try {
      const data = await fetchCollectionData('student_master')
      const sanitized = (data || []).map(sanitizeStudentRecord)
      if (sanitized && sanitized.length > 0) {
        setStudents(sanitized)
        try {
          localStorage.setItem('sjes_table_student_master', JSON.stringify(sanitized))
          localStorage.setItem('sjes_table_students', JSON.stringify(sanitized))
        } catch {}
      } else {
        // Fallback to local storage if remote returned empty
        const cached = localStorage.getItem('sjes_table_student_master') || localStorage.getItem('sjes_table_students')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStudents(parsed.map(sanitizeStudentRecord))
          }
        }
      }
    } catch (err: any) {
      console.warn('Error loading students:', err)
      setToast(err?.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
    const unsub = subscribeToCollection<Student>('student_master', (data) => {
      if (data && data.length > 0) {
        const sanitized = data.map(sanitizeStudentRecord)
        setStudents(sanitized)
        try {
          localStorage.setItem('sjes_table_student_master', JSON.stringify(sanitized))
          localStorage.setItem('sjes_table_students', JSON.stringify(sanitized))
        } catch {}
      }
    })
    return () => unsub()
  }, [])

  // Push all students to Google Sheet via Web App URL (no Google auth)
  const handleSyncToGoogleSheet = async (studentsList?: Student[]) => {
    const listToSync = studentsList || students
    if (listToSync.length === 0) {
      setToast('No student records to sync')
      return
    }
    setSyncingSheet(true)
    try {
      const res = await syncAllStudentsToGoogleSheet(listToSync)
      if (res.success) {
        const timeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
        setLastSyncTime(timeStr)
        setToast(`✓ Google Sheet synced (${res.count || listToSync.length} student records) via Web App!`)
      } else {
        setToast(`Google Sheet Sync: ${res.error || 'Failed to sync with Web App'}`)
      }
    } catch (err: any) {
      setToast(`Sheet Sync Failed: ${err.message || 'Unknown error'}`)
    } finally {
      setSyncingSheet(false)
    }
  }

  // Pull records from Google Sheet via Web App URL (no Google auth)
  const handlePullFromGoogleSheet = async () => {
    setSyncingSheet(true)
    try {
      const res = await fetchStudentsFromGoogleSheet()
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to fetch student data from Web App')
      }
      if (res.data.length === 0) {
        setToast(res.error || 'No student rows found in Google Sheet.')
        setSyncingSheet(false)
        return
      }

      await saveBatchDocuments('student_master', 'admission_no', res.data)
      setStudents((prev) => {
        const incoming = res.data as Student[]
        const combined = [...incoming, ...prev]
        const seen = new Set<string>()
        const deduped: Student[] = []
        for (const s of combined) {
          const id = String(s.admission_no || s.student_id || (s as any)._docId || JSON.stringify(s))
          if (!seen.has(id)) {
            seen.add(id)
            deduped.push(s)
          }
        }
        try {
          localStorage.setItem('sjes_table_student_master', JSON.stringify(deduped))
          localStorage.setItem('sjes_table_students', JSON.stringify(deduped))
        } catch {}
        return deduped
      })

      const timeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
      setLastSyncTime(timeStr)
      setToast(`✓ Successfully imported ${res.data.length} students from Google Sheet via Web App!`)
    } catch (err: any) {
      setToast(`Google Sheet Import Error: ${err.message || err}`)
    } finally {
      setSyncingSheet(false)
    }
  }

  // Connect Google Workspace
  const handleGoogleConnect = async () => {
    try {
      const res = await connectGoogleWorkspace()
      if (res.success) {
        setToast(`Connected to Google Account: ${res.user?.email || 'Authorized'}`)
      } else {
        if (res.isUnauthorizedDomain) {
          setShowDomainModal(true)
        }
        setToast(res.error || 'Google connection failed')
      }
    } catch (err: any) {
      if (String(err?.message || err).includes('unauthorized-domain')) {
        setShowDomainModal(true)
      }
      setToast(err.message || 'Connection error')
    }
  }

  // Quick toggle student Active / Inactive status
  const handleToggleStudentActive = async (student: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const currentlyActive =
      student.is_active !== false &&
      student.student_status !== 'Inactive' &&
      student.student_status !== 'Left'
    const newActive = !currentlyActive
    const newStatus = newActive ? 'Active' : 'Inactive'

    const updatedStudent: Student = {
      ...student,
      is_active: newActive,
      student_status: newStatus,
      updated_at: new Date().toISOString(),
    }

    setStudents((prev) =>
      prev.map((s) => (s.admission_no === student.admission_no ? updatedStudent : s))
    )

    const pk = student.admission_no || student.student_id || (student as any)._docId || `ADM-${Date.now()}`
    await saveDocument('student_master', 'admission_no', {
      ...updatedStudent,
      _docId: pk,
    })

    setToast(`✓ Student ${student.full_name || student.admission_no} marked as ${newStatus}`)

    if (googleConnected) {
      handleSyncToGoogleSheet()
    }
  }

  // Quick change student status
  const handleQuickChangeStatus = async (student: Student, newStatus: string) => {
    const isActive = newStatus !== 'Inactive' && newStatus !== 'Left'
    const updatedStudent: Student = {
      ...student,
      is_active: isActive,
      student_status: newStatus,
      updated_at: new Date().toISOString(),
    }

    setStudents((prev) =>
      prev.map((s) => (s.admission_no === student.admission_no ? updatedStudent : s))
    )

    const pk = student.admission_no || student.student_id || (student as any)._docId || `ADM-${Date.now()}`
    await saveDocument('student_master', 'admission_no', {
      ...updatedStudent,
      _docId: pk,
    })

    setToast(`✓ ${student.full_name || student.admission_no} status changed to '${newStatus}'`)

    if (googleConnected) {
      handleSyncToGoogleSheet()
    }
  }

  // Filtering
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.admission_no && s.admission_no.toLowerCase().includes(q)) ||
        (s.roll_no && s.roll_no.toLowerCase().includes(q)) ||
        (s.father_name && s.father_name.toLowerCase().includes(q)) ||
        (s.father_mobile && s.father_mobile.includes(q)) ||
        (s.mother_name && s.mother_name.toLowerCase().includes(q)) ||
        (s.mother_mobile && s.mother_mobile.includes(q))

      const matchClass = !filterClass || s.class_name === filterClass
      const matchSection = !filterSection || s.section === filterSection
      const matchGender = !filterGender || s.gender === filterGender
      const matchStatus =
        !filterStatus ||
        (filterStatus.toLowerCase() === 'active'
          ? s.is_active !== false && s.student_status !== 'Inactive'
          : filterStatus.toLowerCase() === 'inactive'
          ? s.is_active === false || s.student_status === 'Inactive'
          : s.student_status?.toLowerCase() === filterStatus.toLowerCase())
      const matchYear = !filterYear || s.academic_year === filterYear

      return matchSearch && matchClass && matchSection && matchGender && matchStatus && matchYear
    })
  }, [students, search, filterClass, filterSection, filterGender, filterStatus, filterYear])

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1
  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [filteredStudents, page])

  // Open Create / Edit / View
  const openModal = (mode: 'create' | 'edit' | 'view', student?: Student) => {
    setModalMode(mode)
    setSelectedStudent(student || null)
    setActiveTab('student')
    if (mode === 'create') {
      const year = getCurrentAcademicYear()
      setFormState({
        admission_no: `ADM-${Date.now().toString().slice(-4)}`,
        academic_year: year,
        class_name: classes[0] || 'CLASS I',
        section: 'A',
        student_status: 'Active',
        gender: 'Male',
        blood_group: 'A+',
        is_active: true,
      })
    } else if (student) {
      setFormState({ ...student })
    }
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedStudent(null)
    setFormState({})
  }

  // Update Field helper
  const updateForm = (key: keyof Student, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Google Drive Photo Upload Handler
  const handlePhotoUpload = async (
    file: File | null,
    photoType: 'student' | 'father' | 'mother'
  ) => {
    if (!file) return
    const setLoader =
      photoType === 'student'
        ? setUploadingStudentPhoto
        : photoType === 'father'
        ? setUploadingFatherPhoto
        : setUploadingMotherPhoto

    setLoader(true)
    try {
      const studentIdentifier = formState.full_name || formState.admission_no || 'Student'
      const res = await uploadPhotoToGoogleDrive(file, photoType, studentIdentifier)

      if (res.success && res.url) {
        if (photoType === 'student') updateForm('student_photo_url', res.url)
        if (photoType === 'father') updateForm('father_photo_url', res.url)
        if (photoType === 'mother') updateForm('mother_photo_url', res.url)
        setToast(`${photoType === 'student' ? 'Student' : photoType === 'father' ? "Father's" : "Mother's"} photo saved to Google Drive folder 'student_data_photo'!`)
      } else {
        setToast(res.error || 'Google Drive photo upload failed')
      }
    } catch (err: any) {
      setToast(err.message || 'Photo upload error')
    } finally {
      setLoader(false)
    }
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formState.admission_no || !formState.full_name || !formState.class_name) {
      setToast('Please fill in Admission No, Full Name, and Class.')
      return
    }

    setSubmitting(true)
    try {
      const sanitized = sanitizeStudentRecord(formState)
      const payload: Record<string, unknown> = {
        ...sanitized,
        roll_no: formState.roll_no ? String(formState.roll_no).trim() : '',
        academic_year: formState.academic_year || getCurrentAcademicYear(),
        student_status: formState.student_status || 'Active',
        is_active: formState.is_active !== false,
      }

      const docId = String(payload.admission_no || payload.student_id || `ADM-${Date.now().toString().slice(-4)}`)
      payload.student_id = docId
      payload._docId = docId

      // 1. Save to Firebase / local DB
      await saveDocument('student_master', 'admission_no', payload)

      await logActivity({
        action: `${modalMode === 'create' ? 'Admitted' : 'Updated'} student: ${formState.full_name} (${formState.admission_no})`,
        module: 'student_master',
      })

      // 2. Realtime Sync with Google Sheet
      const updatedList = modalMode === 'create'
        ? [payload as Student, ...students.filter((s) => s.admission_no !== payload.admission_no)]
        : students.map((s) => (s.admission_no === payload.admission_no ? (payload as Student) : s))

      setStudents(updatedList)
      closeModal()
      setToast(`Student ${formState.full_name} saved successfully! Syncing Google Sheet...`)

      // Background Google Sheet Sync
      syncAllStudentsToGoogleSheet(updatedList).then((res) => {
        if (res.success) {
          setLastSyncTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }))
        }
      })
    } catch (err: any) {
      console.warn('Save error:', err)
      setToast(err?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Student
  const handleDelete = async (student: Student) => {
    const sId = (student as any)._docId || student.student_id || student.admission_no
    if (!sId) return
    if (!confirm(`Are you sure you want to remove ${student.full_name}?`)) return

    try {
      await deleteDocument('student_master', sId, student)
      await logActivity({
        action: `Deleted student: ${student.full_name} (${student.admission_no})`,
        module: 'student_master',
      })

      const remaining = students.filter((s) => s.admission_no !== student.admission_no)
      setStudents(remaining)
      setToast('Student record deleted. Syncing Google Sheet...')

      // Sync remaining to Google Sheet
      syncAllStudentsToGoogleSheet(remaining).then((res) => {
        if (res.success) {
          setLastSyncTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }))
        }
      })
    } catch (err: any) {
      setToast(err?.message || 'Delete failed')
    }
  }

  // Export CSV (Clean matching headers)
  const handleExportCsv = () => {
    const rows = filteredStudents.map((s) => [
      `"${String(s.admission_no || '').replace(/"/g, '""')}"`,
      `"${String(s.roll_no || '').replace(/"/g, '""')}"`,
      `"${String(s.academic_year || '2026-27').replace(/"/g, '""')}"`,
      `"${String(s.class_name || '').replace(/"/g, '""')}"`,
      `"${String(s.section || 'A').replace(/"/g, '""')}"`,
      `"${String(s.student_status || 'Active').replace(/"/g, '""')}"`,
      `"${String(s.full_name || '').replace(/"/g, '""')}"`,
      `"${String(s.date_of_birth || '').replace(/"/g, '""')}"`,
      `"${String(s.gender || 'Male').replace(/"/g, '""')}"`,
      `"${String(s.blood_group || '').replace(/"/g, '""')}"`,
      `"${String(s.student_photo_url || '').replace(/"/g, '""')}"`,
      `"${String(s.father_name || '').replace(/"/g, '""')}"`,
      `"${String(s.father_mobile || '').replace(/"/g, '""')}"`,
      `"${String(s.father_occupation || '').replace(/"/g, '""')}"`,
      `"${String(s.father_photo_url || '').replace(/"/g, '""')}"`,
      `"${String(s.mother_name || '').replace(/"/g, '""')}"`,
      `"${String(s.mother_mobile || '').replace(/"/g, '""')}"`,
      `"${String(s.mother_occupation || '').replace(/"/g, '""')}"`,
      `"${String(s.mother_photo_url || '').replace(/"/g, '""')}"`,
      `"${String(s.address || '').replace(/"/g, '""')}"`,
    ])

    const csv = [STUDENT_SHEET_HEADERS.slice(0, 20).join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Student_Data_Roster_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    setToast('Student roster exported to clean CSV')
  }

  // Clean Sample CSV Download
  const handleDownloadCleanSample = () => {
    const headers = STUDENT_SHEET_HEADERS.slice(0, 20)
    const sampleRow1 = [
      'ADM-2026-001',
      '1',
      '2026-27',
      'CLASS I',
      'A',
      'Active',
      'Aarav Sharma',
      '2016-05-15',
      'Male',
      'A+',
      'https://lh3.googleusercontent.com/d/1sample_student_id',
      'Rajesh Sharma',
      '9876543210',
      'Business',
      'https://lh3.googleusercontent.com/d/1sample_father_id',
      'Sunita Sharma',
      '9876543220',
      'Homemaker',
      'https://lh3.googleusercontent.com/d/1sample_mother_id',
      'Station Road, Dankuni, Hooghly, WB',
    ]

    const csvContent = [headers.join(','), sampleRow1.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Student_Data_Sample_Template.csv`
    link.click()
    setToast('Downloaded clean Student Data CSV template')
  }

  return (
    <div className="module-view">
      {/* Studio Header */}
      <div className="module-hero">
        <div className="hero-left">
          <div className="hero-title-row">
            <h1>Student Master Studio</h1>
            <span className="count-badge">{filteredStudents.length} Students</span>
          </div>
          <p>Comprehensive student registry and academic records management</p>
        </div>
        <div className="hero-actions">
          <button
            className="btn-secondary"
            onClick={handleDownloadCleanSample}
            title="Download clean sample CSV template without unneeded fields"
          >
            <Download size={16} /> Sample CSV
          </button>
          <button
            className="btn-secondary"
            onClick={() => setShowCsvModal(true)}
            title="Import student roster from CSV"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button
            className="btn-secondary"
            onClick={handleSyncToGoogleSheet}
            disabled={syncingSheet}
            title="Sync all current student records directly into linked Google Sheet (student_data)"
            style={{
              background: '#f0fdf4',
              color: '#15803d',
              borderColor: '#bbf7d0',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={16} className={syncingSheet ? 'spin' : ''} />
            {syncingSheet ? 'Syncing...' : 'Sync with Google Sheet'}
          </button>
          <button
            className="btn-secondary"
            onClick={handlePullFromGoogleSheet}
            disabled={syncingSheet}
            title="Import or update student records directly from linked Google Sheet"
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              borderColor: '#93c5fd',
              fontWeight: 600,
            }}
          >
            <FileSpreadsheet size={16} className={syncingSheet ? 'spin' : ''} />
            {syncingSheet ? 'Importing Sheet...' : 'Import Google Sheet'}
          </button>
          <button
            className="btn-secondary"
            onClick={handleExportCsv}
            title="Export full filtered roster to CSV"
          >
            <Download size={16} /> Export
          </button>
          <button className="btn-secondary" onClick={loadStudents} title="Reload records">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button className="btn-primary" onClick={() => openModal('create')}>
            <Plus size={16} /> New Admission
          </button>
        </div>
      </div>

      {/* Quick Status Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            setFilterStatus('')
            setPage(1)
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: !filterStatus ? '2px solid #1e40af' : '1px solid #cbd5e1',
            background: !filterStatus ? '#eff6ff' : '#ffffff',
            color: !filterStatus ? '#1e40af' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>All Students</span>
          <span
            style={{
              background: !filterStatus ? '#1e40af' : '#e2e8f0',
              color: !filterStatus ? '#ffffff' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
            }}
          >
            {students.length}
          </span>
        </button>

        <button
          onClick={() => {
            setFilterStatus('Active')
            setPage(1)
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterStatus === 'Active' ? '2px solid #16a34a' : '1px solid #cbd5e1',
            background: filterStatus === 'Active' ? '#f0fdf4' : '#ffffff',
            color: filterStatus === 'Active' ? '#15803d' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
          <span>Active (Enrolled)</span>
          <span
            style={{
              background: filterStatus === 'Active' ? '#16a34a' : '#e2e8f0',
              color: filterStatus === 'Active' ? '#ffffff' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
            }}
          >
            {students.filter((s) => s.is_active !== false && s.student_status !== 'Inactive' && s.student_status !== 'Left').length}
          </span>
        </button>

        <button
          onClick={() => {
            setFilterStatus('Inactive')
            setPage(1)
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterStatus === 'Inactive' ? '2px solid #dc2626' : '1px solid #cbd5e1',
            background: filterStatus === 'Inactive' ? '#fef2f2' : '#ffffff',
            color: filterStatus === 'Inactive' ? '#b91c1c' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626' }} />
          <span>Inactive / Left</span>
          <span
            style={{
              background: filterStatus === 'Inactive' ? '#dc2626' : '#e2e8f0',
              color: filterStatus === 'Inactive' ? '#ffffff' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
            }}
          >
            {students.filter((s) => s.is_active === false || s.student_status === 'Inactive' || s.student_status === 'Left').length}
          </span>
        </button>

        <button
          onClick={() => {
            setFilterStatus('New Admission')
            setPage(1)
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterStatus === 'New Admission' ? '2px solid #2563eb' : '1px solid #cbd5e1',
            background: filterStatus === 'New Admission' ? '#eff6ff' : '#ffffff',
            color: filterStatus === 'New Admission' ? '#1d4ed8' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
          <span>New Admissions</span>
          <span
            style={{
              background: filterStatus === 'New Admission' ? '#2563eb' : '#e2e8f0',
              color: filterStatus === 'New Admission' ? '#ffffff' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
            }}
          >
            {students.filter((s) => s.student_status === 'New Admission').length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="studio-filters-card">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, admission no, roll no, mobile, father or mother name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
          {search && (
            <button className="clear-search" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-group">
          <select
            value={filterClass}
            onChange={(e) => {
              setFilterClass(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterSection}
            onChange={(e) => {
              setFilterSection(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>

          <select
            value={filterGender}
            onChange={(e) => {
              setFilterGender(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active (Enrolled)</option>
            <option value="Inactive">Inactive</option>
            <option value="New Admission">New Admission</option>
            <option value="Promoted">Promoted</option>
            <option value="Left">Left</option>
            <option value="Alumni">Alumni</option>
          </select>

          <select
            value={filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Academic Years</option>
            {ACADEMIC_YEAR_OPTIONS.map((yr) => (
              <option key={yr} value={yr}>
                {yr} {yr === CURRENT_ACADEMIC_YEAR ? '(Current)' : ''}
              </option>
            ))}
          </select>

          {(filterClass || filterSection || filterGender || filterStatus || filterYear || search) && (
            <button
              className="btn-reset-filters"
              onClick={() => {
                setSearch('')
                setFilterClass('')
                setFilterSection('')
                setFilterGender('')
                setFilterStatus('')
                setFilterYear('')
                setPage(1)
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Student Data Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '48px' }}>Photo</th>
              <th>Adm No</th>
              <th>Student Name</th>
              <th>Class & Sec</th>
              <th>Roll</th>
              <th>Father Details & Photo</th>
              <th>Mother Details & Photo</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                  <div>Loading student directory...</div>
                </td>
              </tr>
            ) : paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <User size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <div style={{ fontWeight: 600 }}>No students found matching current filters.</div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    Click &ldquo;New Admission&rdquo; or &ldquo;Import CSV&rdquo; to add student records.
                  </div>
                </td>
              </tr>
            ) : (
              paginatedStudents.map((student) => {
                const studentImg = formatImageUrl(student.student_photo_url)
                const fatherImg = formatImageUrl(student.father_photo_url)
                const motherImg = formatImageUrl(student.mother_photo_url)

                return (
                  <tr key={student.admission_no || student.student_id}>
                    <td>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {studentImg ? (
                          <img
                            src={studentImg}
                            alt={student.full_name}
                            onError={handleImageError}
                            referrerPolicy="no-referrer"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <User size={18} color="#94a3b8" />
                        )}
                      </div>
                    </td>
                    <td>
                      <b style={{ color: '#1e40af' }}>{student.admission_no}</b>
                      {student.academic_year && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{student.academic_year}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{student.full_name}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {student.class_name} - {student.section || 'A'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{student.roll_no || '-'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {fatherImg ? (
                            <img
                              src={fatherImg}
                              alt="Father"
                              onError={handleImageError}
                              referrerPolicy="no-referrer"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <User size={14} color="#94a3b8" />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{student.father_name || '-'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {student.father_occupation ? `${student.father_occupation} • ` : ''}
                            {student.father_mobile || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {motherImg ? (
                            <img
                              src={motherImg}
                              alt="Mother"
                              onError={handleImageError}
                              referrerPolicy="no-referrer"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <User size={14} color="#94a3b8" />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{student.mother_name || '-'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {student.mother_occupation ? `${student.mother_occupation} • ` : ''}
                            {student.mother_mobile || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const isActive =
                          student.is_active !== false &&
                          student.student_status !== 'Inactive' &&
                          student.student_status !== 'Left'
                        const statusLabel = student.student_status || (isActive ? 'Active' : 'Inactive')
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleStudentActive(student, e)}
                              title={`Click to set ${isActive ? 'Inactive' : 'Active'}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background:
                                  isActive && statusLabel === 'Active'
                                    ? '#dcfce7'
                                    : statusLabel === 'New Admission'
                                    ? '#dbeafe'
                                    : statusLabel === 'Promoted'
                                    ? '#fef3c7'
                                    : '#fee2e2',
                                color:
                                  isActive && statusLabel === 'Active'
                                    ? '#15803d'
                                    : statusLabel === 'New Admission'
                                    ? '#1d4ed8'
                                    : statusLabel === 'Promoted'
                                    ? '#b45309'
                                    : '#b91c1c',
                                border: `1px solid ${
                                  isActive && statusLabel === 'Active'
                                    ? '#86efac'
                                    : statusLabel === 'New Admission'
                                    ? '#93c5fd'
                                    : statusLabel === 'Promoted'
                                    ? '#fde68a'
                                    : '#fca5a5'
                                }`,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background:
                                    isActive && statusLabel === 'Active'
                                      ? '#16a34a'
                                      : statusLabel === 'New Admission'
                                      ? '#2563eb'
                                      : statusLabel === 'Promoted'
                                      ? '#d97706'
                                      : '#dc2626',
                                }}
                              />
                              {statusLabel}
                            </button>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>
                              {isActive ? 'Enrolled' : 'Not Active'}
                            </span>
                          </div>
                        )
                      })()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          className="action-btn"
                          title="View Profile"
                          onClick={() => openModal('view', student)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="action-btn"
                          title="Edit Student"
                          onClick={() => openModal('edit', student)}
                        >
                          <Edit3 size={15} />
                        </button>
                        {onNavigateToIdCard && (
                          <button
                            className="action-btn"
                            title="Generate Student ID Card"
                            onClick={() => onNavigateToIdCard(student.admission_no || '')}
                          >
                            <CreditCard size={15} color="#2563eb" />
                          </button>
                        )}
                        <button
                          className="action-btn delete-btn"
                          title="Delete Record"
                          onClick={() => handleDelete(student)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <div className="page-info">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredStudents.length)} of{' '}
            {filteredStudents.length} students
          </div>
          <div className="page-controls">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="current-page">
              {page} / {totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT / VIEW STUDENT MODAL */}
      {modalMode && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '850px', width: '95%' }}>
            <div className="modal-header">
              <div>
                <span className="modal-tag">STUDENT MASTER</span>
                <h2>
                  {modalMode === 'create'
                    ? 'New Student Admission'
                    : modalMode === 'edit'
                    ? `Edit Student: ${formState.full_name || formState.admission_no}`
                    : `Student Profile: ${selectedStudent?.full_name || selectedStudent?.admission_no}`}
                </h2>
              </div>
              <button className="close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs (Streamlined: Student Info, Parents Info, Address) */}
            <div className="modal-tab-bar">
              <button
                className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`}
                onClick={() => setActiveTab('student')}
              >
                1. Student & Academic Info
              </button>
              <button
                className={`tab-btn ${activeTab === 'parents' ? 'active' : ''}`}
                onClick={() => setActiveTab('parents')}
              >
                2. Parents Information
              </button>
              <button
                className={`tab-btn ${activeTab === 'address' ? 'active' : ''}`}
                onClick={() => setActiveTab('address')}
              >
                3. Address & Status
              </button>
            </div>

            {/* Modal Body / Tab Content */}
            <form onSubmit={handleSubmit} className="modal-body-form">
              {/* TAB 1: STUDENT & ACADEMIC INFO */}
              {activeTab === 'student' && (
                <div className="tab-pane">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '16px' }}>
                    <div>
                      <div className="form-row-3">
                        <label>
                          <span>
                            Admission No <b>*</b>
                          </span>
                          <input
                            type="text"
                            disabled={modalMode === 'view'}
                            required
                            value={formState.admission_no || ''}
                            onChange={(e) => updateForm('admission_no', e.target.value)}
                          />
                        </label>
                        <label>
                          <span>Roll Number</span>
                          <input
                            type="text"
                            disabled={modalMode === 'view'}
                            value={formState.roll_no || ''}
                            onChange={(e) => updateForm('roll_no', e.target.value)}
                          />
                        </label>
                        <label>
                          <span>Academic Year</span>
                          <select
                            disabled={modalMode === 'view'}
                            value={formState.academic_year || getCurrentAcademicYear()}
                            onChange={(e) => updateForm('academic_year', e.target.value)}
                          >
                            {ACADEMIC_YEAR_OPTIONS.map((yr) => (
                              <option key={yr} value={yr}>
                                {yr}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="form-row-3">
                        <label>
                          <span>
                            Class <b>*</b>
                          </span>
                          <select
                            disabled={modalMode === 'view'}
                            required
                            value={formState.class_name || ''}
                            onChange={(e) => updateForm('class_name', e.target.value)}
                          >
                            <option value="">Select Class</option>
                            {classes.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Section</span>
                          <input
                            type="text"
                            disabled={modalMode === 'view'}
                            value={formState.section || 'A'}
                            onChange={(e) => updateForm('section', e.target.value)}
                          />
                        </label>
                        <label>
                          <span>Student Status</span>
                          <select
                            disabled={modalMode === 'view'}
                            value={formState.student_status || 'Active'}
                            onChange={(e) => {
                              const st = e.target.value
                              updateForm('student_status', st)
                              updateForm('is_active', st !== 'Inactive' && st !== 'Left')
                            }}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="New Admission">New Admission</option>
                            <option value="Promoted">Promoted</option>
                            <option value="Left">Left</option>
                            <option value="Alumni">Alumni</option>
                          </select>
                        </label>
                      </div>

                      {/* Active Status Toggle Banner */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: formState.is_active !== false && formState.student_status !== 'Inactive' ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${formState.is_active !== false && formState.student_status !== 'Inactive' ? '#bbf7d0' : '#fecaca'}`,
                          borderRadius: '8px',
                          marginBottom: '16px',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              color: formState.is_active !== false && formState.student_status !== 'Inactive' ? '#15803d' : '#b91c1c',
                            }}
                          >
                            Enrollment Status:{' '}
                            {formState.is_active !== false && formState.student_status !== 'Inactive'
                              ? 'Active (Currently Enrolled)'
                              : 'Inactive'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {formState.is_active !== false && formState.student_status !== 'Inactive'
                              ? 'Student appears on attendance registers, fee bills, and reports.'
                              : 'Student is inactive / suspended / left.'}
                          </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                          <input
                            type="checkbox"
                            disabled={modalMode === 'view'}
                            checked={formState.is_active !== false && formState.student_status !== 'Inactive'}
                            onChange={(e) => {
                              const active = e.target.checked
                              updateForm('is_active', active)
                              updateForm('student_status', active ? 'Active' : 'Inactive')
                            }}
                            style={{ width: '18px', height: '18px', accentColor: '#16a34a' }}
                          />
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                            {formState.is_active !== false && formState.student_status !== 'Inactive' ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      </div>

                      <div className="form-row-2">
                        <label>
                          <span>
                            Full Name <b>*</b>
                          </span>
                          <input
                            type="text"
                            disabled={modalMode === 'view'}
                            required
                            placeholder="Student's complete name"
                            value={formState.full_name || ''}
                            onChange={(e) => updateForm('full_name', e.target.value)}
                          />
                        </label>
                        <label>
                          <span>Date of Birth</span>
                          <input
                            type="date"
                            disabled={modalMode === 'view'}
                            value={formState.date_of_birth || ''}
                            onChange={(e) => updateForm('date_of_birth', e.target.value)}
                          />
                        </label>
                      </div>

                      <div className="form-row-2">
                        <label>
                          <span>Gender</span>
                          <select
                            disabled={modalMode === 'view'}
                            value={formState.gender || 'Male'}
                            onChange={(e) => updateForm('gender', e.target.value)}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                        <label>
                          <span>Blood Group</span>
                          <select
                            disabled={modalMode === 'view'}
                            value={formState.blood_group || ''}
                            onChange={(e) => updateForm('blood_group', e.target.value)}
                          >
                            <option value="">Select Blood Group</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    {/* Student Photo Card with Google Drive Uploader */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                        Student Photo
                      </div>
                      <div
                        style={{
                          width: '100px',
                          height: '110px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '2px dashed #cbd5e1',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          marginBottom: '8px',
                        }}
                      >
                        {formState.student_photo_url ? (
                          <img
                            src={formatImageUrl(formState.student_photo_url)}
                            alt="Student"
                            onError={handleImageError}
                            referrerPolicy="no-referrer"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Camera size={32} color="#94a3b8" />
                        )}
                        {uploadingStudentPhoto && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.6)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                            }}
                          >
                            <RefreshCw size={18} className="spin" />
                          </div>
                        )}
                      </div>

                      {modalMode !== 'view' && (
                        <>
                          <label
                            style={{
                              background: '#2563eb',
                              color: '#fff',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginBottom: '6px',
                            }}
                          >
                            <CloudUpload size={13} />
                            Save to Drive
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null, 'student')}
                            />
                          </label>
                          <input
                            type="text"
                            placeholder="Drive Photo URL"
                            value={formState.student_photo_url || ''}
                            onChange={(e) => updateForm('student_photo_url', e.target.value)}
                            style={{ fontSize: '10px', padding: '4px 6px', width: '100%' }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PARENTS INFORMATION (Beside Father Occupation -> Father Photo, Beside Mother Occupation -> Mother Photo) */}
              {activeTab === 'parents' && (
                <div className="tab-pane">
                  {/* Father Details Section */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '14px', marginBottom: '12px' }}>
                      Father&apos;s Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 140px', gap: '12px', alignItems: 'flex-start' }}>
                      <label>
                        <span>Father Name</span>
                        <input
                          type="text"
                          disabled={modalMode === 'view'}
                          placeholder="Father's full name"
                          value={formState.father_name || ''}
                          onChange={(e) => updateForm('father_name', e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Father Mobile</span>
                        <input
                          type="tel"
                          disabled={modalMode === 'view'}
                          placeholder="Father's phone"
                          value={formState.father_mobile || ''}
                          onChange={(e) => updateForm('father_mobile', e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Father Occupation</span>
                        <input
                          type="text"
                          disabled={modalMode === 'view'}
                          placeholder="e.g. Business / Engineer"
                          value={formState.father_occupation || ''}
                          onChange={(e) => updateForm('father_occupation', e.target.value)}
                        />
                      </label>

                      {/* Father Photo Box (Beside Father Occupation) */}
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '8px',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Father Photo
                        </div>
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: '#f1f5f9',
                            border: '1px solid #94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            marginBottom: '4px',
                          }}
                        >
                          {formState.father_photo_url ? (
                            <img
                              src={formatImageUrl(formState.father_photo_url)}
                              alt="Father"
                              onError={handleImageError}
                              referrerPolicy="no-referrer"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <User size={20} color="#94a3b8" />
                          )}
                          {uploadingFatherPhoto && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <RefreshCw size={14} className="spin" color="#fff" />
                            </div>
                          )}
                        </div>

                        {modalMode !== 'view' && (
                          <label
                            style={{
                              background: '#1e40af',
                              color: '#fff',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <CloudUpload size={11} /> Drive
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null, 'father')}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mother Details Section */}
                  <div
                    style={{
                      background: '#fdf4ff',
                      border: '1px solid #f0abfc',
                      borderRadius: '10px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#86198f', fontSize: '14px', marginBottom: '12px' }}>
                      Mother&apos;s Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 140px', gap: '12px', alignItems: 'flex-start' }}>
                      <label>
                        <span>Mother Name</span>
                        <input
                          type="text"
                          disabled={modalMode === 'view'}
                          placeholder="Mother's full name"
                          value={formState.mother_name || ''}
                          onChange={(e) => updateForm('mother_name', e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Mother Mobile</span>
                        <input
                          type="tel"
                          disabled={modalMode === 'view'}
                          placeholder="Mother's phone"
                          value={formState.mother_mobile || ''}
                          onChange={(e) => updateForm('mother_mobile', e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Mother Occupation</span>
                        <input
                          type="text"
                          disabled={modalMode === 'view'}
                          placeholder="e.g. Homemaker / Teacher"
                          value={formState.mother_occupation || ''}
                          onChange={(e) => updateForm('mother_occupation', e.target.value)}
                        />
                      </label>

                      {/* Mother Photo Box (Beside Mother Occupation) */}
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #f5d0fe',
                          borderRadius: '8px',
                          padding: '8px',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#701a75', marginBottom: '4px' }}>
                          Mother Photo
                        </div>
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: '#fdf2f8',
                            border: '1px solid #f472b6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            marginBottom: '4px',
                          }}
                        >
                          {formState.mother_photo_url ? (
                            <img
                              src={formatImageUrl(formState.mother_photo_url)}
                              alt="Mother"
                              onError={handleImageError}
                              referrerPolicy="no-referrer"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <User size={20} color="#f472b6" />
                          )}
                          {uploadingMotherPhoto && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <RefreshCw size={14} className="spin" color="#fff" />
                            </div>
                          )}
                        </div>

                        {modalMode !== 'view' && (
                          <label
                            style={{
                              background: '#a21caf',
                              color: '#fff',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <CloudUpload size={11} /> Drive
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null, 'mother')}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ADDRESS & STATUS */}
              {activeTab === 'address' && (
                <div className="tab-pane">
                  <label style={{ display: 'block', marginBottom: '16px' }}>
                    <span>Residential Address</span>
                    <textarea
                      disabled={modalMode === 'view'}
                      rows={4}
                      placeholder="Enter complete residential address, city, district, state & pin code..."
                      value={formState.address || ''}
                      onChange={(e) => updateForm('address', e.target.value)}
                    />
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                    <input
                      type="checkbox"
                      id="st_active"
                      disabled={modalMode === 'view'}
                      checked={formState.is_active !== false}
                      onChange={(e) => updateForm('is_active', e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <label htmlFor="st_active" style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                      Active Student in School Roster
                    </label>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="modal-footer">
                <div style={{ display: 'flex', gap: '8px' }}>
                  {activeTab !== 'student' && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setActiveTab(activeTab === 'address' ? 'parents' : 'student')}
                    >
                      &larr; Back
                    </button>
                  )}
                  {activeTab !== 'address' && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setActiveTab(activeTab === 'student' ? 'parents' : 'address')}
                    >
                      Next &rarr;
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    {modalMode === 'view' ? 'Close' : 'Cancel'}
                  </button>
                  {modalMode !== 'view' && (
                    <button type="submit" className="btn-primary" disabled={submitting}>
                      {submitting ? (
                        <>
                          <RefreshCw size={16} className="spin" /> Saving & Syncing...
                        </>
                      ) : (
                        <>
                          <Check size={16} /> Save & Sync to Google Sheet
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOOGLE APPS SCRIPT CODE MODAL */}
      {showScriptModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '750px', width: '90%' }}>
            <div className="modal-header">
              <div>
                <span className="modal-tag">GOOGLE WORKSPACE INTEGRATION</span>
                <h2>Google Apps Script Sync Code (code.gs)</h2>
              </div>
              <button className="close-btn" onClick={() => setShowScriptModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                Copy this code into your Google Sheet (<b>Extensions &rarr; Apps Script</b>) to manage automatic sheet initialization, header formatting, and backup sync:
              </p>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    const code = `/**
 * Google Apps Script for St. John's English School - Student Data Realtime Sync
 * Target Spreadsheet: 1OGD09mG-m54rSKBJl2nmOc-pFraYZRnMcCTyoAEWGto
 * Target Tab: student_data
 * Target Photo Drive Folder: 19EmUMwDpNxuufOr995XPsg_XoG-BqZWO (student_data_photo)
 */
const SPREADSHEET_ID = '${GOOGLE_SHEET_ID}';
const SHEET_TAB_NAME = '${GOOGLE_SHEET_TAB_NAME}';
const HEADERS = ${JSON.stringify(STUDENT_SHEET_HEADERS, null, 2)};

function initializeStudentSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_TAB_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_TAB_NAME);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground('#1e3a8a');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
  for (let i = 1; i <= HEADERS.length; i++) sheet.autoResizeColumn(i);
}`
                    navigator.clipboard.writeText(code)
                    setToast('Apps Script code copied to clipboard!')
                  }}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 10,
                  }}
                >
                  <Copy size={13} /> Copy Code
                </button>
                <pre
                  style={{
                    background: '#0f172a',
                    color: '#e2e8f0',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    lineHeight: '1.5',
                  }}
                >
{`/**
 * Google Apps Script for St. John's English School - Student Data Realtime Sync
 * Target Spreadsheet: ${GOOGLE_SHEET_ID}
 * Target Tab: ${GOOGLE_SHEET_TAB_NAME}
 * Target Photo Drive Folder: ${GOOGLE_DRIVE_FOLDER_ID} (student_data_photo)
 */
const SPREADSHEET_ID = '${GOOGLE_SHEET_ID}';
const SHEET_TAB_NAME = '${GOOGLE_SHEET_TAB_NAME}';
const HEADERS = [
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
  'Last Updated'
];

function initializeStudentSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TAB_NAME);
  }
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground('#1e3a8a');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
  for (let i = 1; i <= HEADERS.length; i++) {
    sheet.autoResizeColumn(i);
  }
}`}
                </pre>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowScriptModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <CsvImportModal
          mod={modules.student_master}
          onClose={() => setShowCsvModal(false)}
          onSuccess={async (count, insertedItems) => {
            setShowCsvModal(false)
            setToast(`✓ Imported ${count} student records! Synchronizing Google Sheet...`)
            if (insertedItems && insertedItems.length > 0) {
              setStudents((prev) => {
                const combined = [...(insertedItems as unknown as Student[]), ...prev]
                const seen = new Set<string>()
                const deduped: Student[] = []
                for (const s of combined) {
                  const sid = String(s.admission_no || s.student_id || (s as any)._docId || JSON.stringify(s))
                  if (!seen.has(sid)) {
                    seen.add(sid)
                    deduped.push(s)
                  }
                }
                try {
                  localStorage.setItem('sjes_table_student_master', JSON.stringify(deduped))
                } catch {}

                if (googleConnected) {
                  syncAllStudentsToGoogleSheet(deduped).then((res) => {
                    if (res.success) {
                      setLastSyncTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }))
                    }
                  })
                }

                return deduped
              })
            }
          }}
        />
      )}

      {/* Firebase Domain Authorization Guide Modal */}
      {showDomainModal && (
        <div className="modal-overlay" onClick={() => setShowDomainModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ background: '#1e3a8a', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#93c5fd" />
                <h3 style={{ margin: 0, color: '#ffffff' }}>Authorize Domain for Google Sign-In</h3>
              </div>
              <button
                className="close-btn"
                style={{ color: '#ffffff' }}
                onClick={() => setShowDomainModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, margin: '0 0 16px' }}>
                Firebase requires web applications to whitelist their domain in the Firebase Console before Google Sign-In popups can complete.
              </p>

              {/* Current Domain Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Your Current Domain to Authorize:
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ffffff',
                    border: '1px solid #94a3b8',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    gap: '8px',
                  }}
                >
                  <code style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, wordBreak: 'break-all' }}>
                    {typeof window !== 'undefined' ? window.location.hostname : 'Current App Domain'}
                  </code>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(window.location.hostname)
                        setDomainCopied(true)
                        setTimeout(() => setDomainCopied(false), 3000)
                      }
                    }}
                    style={{
                      background: domainCopied ? '#16a34a' : '#1e40af',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {domainCopied ? <Check size={14} /> : <Copy size={14} />}
                    {domainCopied ? 'Copied!' : 'Copy Domain'}
                  </button>
                </div>
              </div>

              {/* Step-by-Step Guide */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#1e3a8a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    1
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    Open your <b>Firebase Console</b> at{' '}
                    <a
                      href="https://console.firebase.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 600 }}
                    >
                      console.firebase.google.com
                    </a>{' '}
                    and select your project.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#1e3a8a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    2
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    In the left navigation menu, click on <b>Authentication</b> &rarr; click the <b>Settings</b> tab (top bar).
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#1e3a8a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    3
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    Scroll down to the <b>Authorized domains</b> section and click <b>Add domain</b>.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#1e3a8a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    4
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    Paste your domain (copied above) and click <b>Save</b>. Then return here and click <b>Connect Google Account</b>.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowDomainModal(false)}
              >
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowDomainModal(false)
                  handleGoogleConnect()
                }}
              >
                <Sparkles size={14} /> Try Connecting Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
