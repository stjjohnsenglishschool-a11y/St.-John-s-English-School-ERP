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
import { supabase, logActivity, deleteDocument, saveDocument, saveBatchDocuments, fetchCollectionData, subscribeToCollection, uploadToFirebaseStorage } from '../lib/supabase'
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
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'academic' | 'parents' | 'health'>('personal')
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

    // Parse document_url if present
    let docParsed: any = {}
    if (clean.document_url && typeof clean.document_url === 'string' && clean.document_url.trim().startsWith('{')) {
      try {
        docParsed = JSON.parse(clean.document_url)
      } catch {}
    }

    // Local extra cache lookup
    let extra: any = {}
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const allExtra = JSON.parse(localStorage.getItem('sjes_escort_cards_extra') || '{}')
        extra =
          allExtra[clean.student_id] ||
          allExtra[clean.admission_no] ||
          allExtra[clean.full_name] ||
          {}
      } catch {}
    }

    clean.father_photo_url =
      clean.father_photo_url ||
      docParsed.father_photo_url ||
      docParsed.fatherPhotoUrl ||
      extra.fatherPhotoUrl ||
      extra.father_photo_url ||
      ''

    clean.mother_photo_url =
      clean.mother_photo_url ||
      docParsed.mother_photo_url ||
      docParsed.motherPhotoUrl ||
      extra.motherPhotoUrl ||
      extra.mother_photo_url ||
      ''

    clean.father_name = clean.father_name || docParsed.father_name || extra.fatherName || ''
    clean.father_mobile = clean.father_mobile || docParsed.father_mobile || extra.fatherContact || ''
    clean.mother_name = clean.mother_name || docParsed.mother_name || extra.motherName || ''
    clean.mother_mobile = clean.mother_mobile || docParsed.mother_mobile || extra.motherContact || ''

    return clean as Student
  }

  // Load students from database
  const loadStudents = async () => {
    setLoading(true)
    try {
      const data = await fetchCollectionData('student_master')

      // Fetch escort_card table to merge any escort photos
      let escortRows: any[] = []
      if (supabase) {
        try {
          const { data: escorts } = await supabase.from('escort_card').select('*')
          if (escorts) escortRows = escorts
        } catch (e) {
          console.warn('Could not fetch escort_card table:', e)
        }
      }

      // Load local extra cache
      let allExtra: Record<string, any> = {}
      try {
        allExtra = JSON.parse(localStorage.getItem('sjes_escort_cards_extra') || '{}')
      } catch {}

      const sanitized = (data || []).map((s) => {
        const studentObj = sanitizeStudentRecord(s)

        // Find escort matches if not already resolved
        if (!studentObj.father_photo_url) {
          const fatherEscort = escortRows.find(
            (er: any) =>
              (er.student_name === studentObj.full_name ||
                er.student_name?.toLowerCase() === studentObj.full_name?.toLowerCase()) &&
              (er.relation === 'Father' || er.relation?.toLowerCase() === 'father')
          )
          if (fatherEscort?.photo_url) {
            studentObj.father_photo_url = fatherEscort.photo_url
          }
        }

        if (!studentObj.mother_photo_url) {
          const motherEscort = escortRows.find(
            (er: any) =>
              (er.student_name === studentObj.full_name ||
                er.student_name?.toLowerCase() === studentObj.full_name?.toLowerCase()) &&
              (er.relation === 'Mother' || er.relation?.toLowerCase() === 'mother')
          )
          if (motherEscort?.photo_url) {
            studentObj.mother_photo_url = motherEscort.photo_url
          }
        }

        const extra =
          allExtra[studentObj.student_id || ''] ||
          allExtra[studentObj.admission_no || ''] ||
          allExtra[studentObj.full_name || ''] ||
          {}
        if (!studentObj.father_photo_url && (extra.fatherPhotoUrl || extra.father_photo_url)) {
          studentObj.father_photo_url = extra.fatherPhotoUrl || extra.father_photo_url
        }
        if (!studentObj.mother_photo_url && (extra.motherPhotoUrl || extra.mother_photo_url)) {
          studentObj.mother_photo_url = extra.motherPhotoUrl || extra.mother_photo_url
        }

        return studentObj
      })

      setStudents(sanitized)
      try {
        localStorage.setItem('sjes_table_student_master', JSON.stringify(sanitized))
        localStorage.setItem('sjes_table_students', JSON.stringify(sanitized))
      } catch {}
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
      let allExtra: Record<string, any> = {}
      try {
        allExtra = JSON.parse(localStorage.getItem('sjes_escort_cards_extra') || '{}')
      } catch {}

      const sanitized = (data || []).map((s) => {
        const studentObj = sanitizeStudentRecord(s)
        const extra =
          allExtra[studentObj.student_id || ''] ||
          allExtra[studentObj.admission_no || ''] ||
          allExtra[studentObj.full_name || ''] ||
          {}
        if (!studentObj.father_photo_url && (extra.fatherPhotoUrl || extra.father_photo_url)) {
          studentObj.father_photo_url = extra.fatherPhotoUrl || extra.father_photo_url
        }
        if (!studentObj.mother_photo_url && (extra.motherPhotoUrl || extra.mother_photo_url)) {
          studentObj.mother_photo_url = extra.motherPhotoUrl || extra.mother_photo_url
        }
        return studentObj
      })
      setStudents(sanitized)
      try {
        localStorage.setItem('sjes_table_student_master', JSON.stringify(sanitized))
        localStorage.setItem('sjes_table_students', JSON.stringify(sanitized))
      } catch {}
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
    setActiveTab('personal')
    if (mode === 'create') {
      const year = getCurrentAcademicYear()
      const admNo = `ADM-${Date.now().toString().slice(-4)}`
      setFormState({
        admission_no: admNo,
        academic_year: year,
        class_name: classes[0] || 'CLASS I',
        section: 'A',
        student_status: 'New Admission',
        gender: 'Male',
        blood_group: 'Unknown',
        is_active: true,
        first_name: '',
        middle_name: '',
        last_name: '',
        full_name: '',
      })
    } else if (student) {
      let first = (student as any).first_name || ''
      let middle = (student as any).middle_name || ''
      let last = (student as any).last_name || ''
      if (!first && !last && student.full_name) {
        const tokens = student.full_name.trim().split(/\s+/)
        if (tokens.length === 1) {
          first = tokens[0]
        } else if (tokens.length === 2) {
          first = tokens[0]
          last = tokens[1]
        } else if (tokens.length >= 3) {
          first = tokens[0]
          middle = tokens.slice(1, -1).join(' ')
          last = tokens[tokens.length - 1]
        }
      }

      let fPhoto = student.father_photo_url || ''
      let mPhoto = student.mother_photo_url || ''

      // Check document_url
      if ((!fPhoto || !mPhoto) && student.document_url && typeof student.document_url === 'string' && student.document_url.trim().startsWith('{')) {
        try {
          const docObj = JSON.parse(student.document_url)
          if (!fPhoto) fPhoto = docObj.father_photo_url || docObj.fatherPhotoUrl || ''
          if (!mPhoto) mPhoto = docObj.mother_photo_url || docObj.motherPhotoUrl || ''
        } catch {}
      }

      // Check localStorage extra cache
      if (!fPhoto || !mPhoto) {
        try {
          const allExtra = JSON.parse(localStorage.getItem('sjes_escort_cards_extra') || '{}')
          const ex = allExtra[student.student_id || ''] || allExtra[student.admission_no || ''] || allExtra[student.full_name || '']
          if (ex) {
            if (!fPhoto) fPhoto = ex.fatherPhotoUrl || ex.father_photo_url || ''
            if (!mPhoto) mPhoto = ex.motherPhotoUrl || ex.mother_photo_url || ''
          }
        } catch {}
      }

      setFormState({
        ...student,
        first_name: first,
        middle_name: middle,
        last_name: last,
        father_photo_url: fPhoto,
        mother_photo_url: mPhoto,
      })
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

  // Synchronize first, middle, last name with full_name
  const handleNameChange = (field: 'first_name' | 'middle_name' | 'last_name', value: string) => {
    setFormState((prev) => {
      const updated = { ...prev, [field]: value }
      const parts = [
        updated.first_name || '',
        updated.middle_name || '',
        updated.last_name || '',
      ].filter(Boolean)
      updated.full_name = parts.join(' ')
      return updated
    })
  }

  // Google Drive Photo Upload Handler
  const handlePhotoUpload = async (
    file: File | null,
    photoType: 'student' | 'father' | 'mother'
  ) => {
    if (!file) return

    // Immediately show instant object preview
    const instantPreview = URL.createObjectURL(file)
    if (photoType === 'student') updateForm('student_photo_url', instantPreview)
    if (photoType === 'father') updateForm('father_photo_url', instantPreview)
    if (photoType === 'mother') updateForm('mother_photo_url', instantPreview)

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
        setToast(`${photoType === 'student' ? 'Student' : photoType === 'father' ? "Father's" : "Mother's"} photo saved to Google Drive!`)
      } else {
        // Fallback to storage if Google Drive API is not active
        const identifier = formState.admission_no || formState.full_name || 'student'
        const fallbackUrl = await uploadToFirebaseStorage(
          file,
          `student_${identifier}_${photoType}.jpg`,
          'studen_photo_master'
        )
        if (photoType === 'student') updateForm('student_photo_url', fallbackUrl)
        if (photoType === 'father') updateForm('father_photo_url', fallbackUrl)
        if (photoType === 'mother') updateForm('mother_photo_url', fallbackUrl)
        setToast(`${photoType === 'student' ? 'Student' : photoType === 'father' ? "Father's" : "Mother's"} photo saved successfully!`)
      }
    } catch (err: any) {
      setToast(err.message || 'Photo upload error')
    } finally {
      setLoader(false)
    }
  }

  // Cloud Storage Photo Upload Handler
  const handleCloudPhotoUpload = async (
    file: File | null,
    photoType: 'student' | 'father' | 'mother'
  ) => {
    if (!file) return

    // Immediately show instant object preview
    const instantPreview = URL.createObjectURL(file)
    if (photoType === 'student') updateForm('student_photo_url', instantPreview)
    if (photoType === 'father') updateForm('father_photo_url', instantPreview)
    if (photoType === 'mother') updateForm('mother_photo_url', instantPreview)

    const setLoader =
      photoType === 'student'
        ? setUploadingStudentPhoto
        : photoType === 'father'
        ? setUploadingFatherPhoto
        : setUploadingMotherPhoto

    setLoader(true)
    try {
      const identifier = formState.admission_no || 'student'
      const url = await uploadToFirebaseStorage(
        file,
        `student_${identifier}_${photoType}.jpg`,
        'student_photos'
      )
      if (photoType === 'student') updateForm('student_photo_url', url)
      if (photoType === 'father') updateForm('father_photo_url', url)
      if (photoType === 'mother') updateForm('mother_photo_url', url)
      setToast(`${photoType === 'student' ? 'Student' : photoType === 'father' ? "Father's" : "Mother's"} photo uploaded to Cloud Storage`)
    } catch (err: any) {
      setToast(err.message || 'Photo upload failed')
    } finally {
      setLoader(false)
    }
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const calculatedFullName =
      formState.full_name?.trim() ||
      [formState.first_name, formState.middle_name, formState.last_name]
        .filter(Boolean)
        .join(' ')
        .trim()

    if (!formState.admission_no || !calculatedFullName || !formState.class_name) {
      setToast('Please fill in Admission No, Name, and Class.')
      return
    }

    setSubmitting(true)
    try {
      const sanitized = sanitizeStudentRecord({
        ...formState,
        full_name: calculatedFullName,
      })

      // 1. Pack father_photo_url and mother_photo_url into document_url JSON
      let docParsed: Record<string, any> = {}
      if (formState.document_url && typeof formState.document_url === 'string' && formState.document_url.trim().startsWith('{')) {
        try { docParsed = JSON.parse(formState.document_url) } catch {}
      }
      const docPayload = {
        ...docParsed,
        father_photo_url: formState.father_photo_url || '',
        mother_photo_url: formState.mother_photo_url || '',
        father_name: formState.father_name || '',
        father_mobile: formState.father_mobile || '',
        mother_name: formState.mother_name || '',
        mother_mobile: formState.mother_mobile || '',
        updated_at: new Date().toISOString(),
      }

      const payload: Record<string, unknown> = {
        ...sanitized,
        document_url: JSON.stringify(docPayload),
        roll_no: formState.roll_no ? String(formState.roll_no).trim() : '',
        academic_year: formState.academic_year || getCurrentAcademicYear(),
        student_status: formState.student_status || 'Active',
        is_active: formState.is_active !== false,
      }

      const docId = String(payload.admission_no || payload.student_id || `ADM-${Date.now().toString().slice(-4)}`)
      payload.student_id = docId
      payload._docId = docId

      // 2. Save to Supabase student_master
      await saveDocument('student_master', 'admission_no', payload)

      // 3. Upsert Father & Mother escort records into Supabase escort_card table
      const todayIso = new Date().toISOString().slice(0, 10)
      if (supabase && (formState.father_name || formState.father_photo_url)) {
        try {
          await supabase.from('escort_card').upsert(
            [
              {
                student_name: calculatedFullName,
                class_name: formState.class_name,
                escort_name: formState.father_name || 'Father',
                relation: 'Father',
                mobile: formState.father_mobile || null,
                photo_url: formState.father_photo_url || null,
                issue_date: todayIso,
                is_active: true,
              },
            ],
            { onConflict: 'card_id' }
          )
        } catch (e) {
          console.warn('Escort card father upsert error:', e)
        }
      }

      if (supabase && (formState.mother_name || formState.mother_photo_url)) {
        try {
          await supabase.from('escort_card').upsert(
            [
              {
                student_name: calculatedFullName,
                class_name: formState.class_name,
                escort_name: formState.mother_name || 'Mother',
                relation: 'Mother',
                mobile: formState.mother_mobile || null,
                photo_url: formState.mother_photo_url || null,
                issue_date: todayIso,
                is_active: true,
              },
            ],
            { onConflict: 'card_id' }
          )
        } catch (e) {
          console.warn('Escort card mother upsert error:', e)
        }
      }

      // 4. Update sjes_escort_cards_extra cache in localStorage
      try {
        const allExtra = JSON.parse(localStorage.getItem('sjes_escort_cards_extra') || '{}')
        const extraObj = {
          fatherName: formState.father_name || '',
          fatherContact: formState.father_mobile || '',
          fatherPhotoUrl: formState.father_photo_url || '',
          motherName: formState.mother_name || '',
          motherContact: formState.mother_mobile || '',
          motherPhotoUrl: formState.mother_photo_url || '',
          studentName: calculatedFullName,
          className: formState.class_name || '',
          updatedAt: new Date().toISOString(),
        }
        if (payload.student_id) allExtra[String(payload.student_id)] = extraObj
        if (payload.admission_no) allExtra[String(payload.admission_no)] = extraObj
        allExtra[calculatedFullName] = extraObj
        localStorage.setItem('sjes_escort_cards_extra', JSON.stringify(allExtra))
      } catch {}

      await logActivity({
        action: `${modalMode === 'create' ? 'Admitted' : 'Updated'} student: ${formState.full_name} (${formState.admission_no})`,
        module: 'student_master',
      })

      // 5. Update local state and cache
      const studentResult: Student = {
        ...(payload as any),
        father_photo_url: formState.father_photo_url || '',
        mother_photo_url: formState.mother_photo_url || '',
      }

      const updatedList = modalMode === 'create'
        ? [studentResult, ...students.filter((s) => s.admission_no !== payload.admission_no)]
        : students.map((s) => (s.admission_no === payload.admission_no ? studentResult : s))

      setStudents(updatedList)
      try {
        localStorage.setItem('sjes_table_student_master', JSON.stringify(updatedList))
        localStorage.setItem('sjes_table_students', JSON.stringify(updatedList))
      } catch {}

      closeModal()
      setToast(`Student ${calculatedFullName} saved successfully! Syncing Google Sheet...`)

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
          <div className="multi-section-modal">
            <div className="modal-header">
              <div>
                <span className="modal-tag">STUDENT MASTER</span>
                <h2>
                  {modalMode === 'create'
                    ? 'Add New Student / Admission'
                    : modalMode === 'edit'
                    ? `Edit Student: ${formState.full_name || formState.admission_no}`
                    : `Student Profile: ${selectedStudent?.full_name || selectedStudent?.admission_no}`}
                </h2>
              </div>
              <button type="button" className="close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="modal-tab-bar">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('personal')}
              >
                1. Personal
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
                onClick={() => setActiveTab('contact')}
              >
                2. Contact & Address
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'academic' ? 'active' : ''}`}
                onClick={() => setActiveTab('academic')}
              >
                3. Academic & Class
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'parents' ? 'active' : ''}`}
                onClick={() => setActiveTab('parents')}
              >
                4. Parents & Guardian
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'health' ? 'active' : ''}`}
                onClick={() => setActiveTab('health')}
              >
                5. Health & Documents
              </button>
            </div>

            {/* Modal Body / Tab Content */}
            <form onSubmit={handleSubmit} className="modal-body-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* TAB 1: PERSONAL */}
              {activeTab === 'personal' && (
                <div className="tab-pane">
                  {/* Photo Upload Box matching Employee style */}
                  <div className="photo-upload-section">
                    <div
                      className="avatar-preview-box"
                      style={{ position: 'relative', cursor: modalMode !== 'view' ? 'pointer' : 'default' }}
                      title={modalMode !== 'view' ? 'Click to upload Student photo' : 'Student photo'}
                      onClick={() => {
                        if (modalMode !== 'view') {
                          const input = document.getElementById('student-photo-input') as HTMLInputElement
                          input?.click()
                        }
                      }}
                    >
                      {formState.student_photo_url ? (
                        <img
                          src={formatImageUrl(formState.student_photo_url)}
                          alt="Student"
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                        />
                      ) : (
                        <User size={40} opacity={0.35} />
                      )}
                      {modalMode !== 'view' && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#ffffff',
                            fontSize: '9px',
                            textAlign: 'center',
                            padding: '2px 0',
                            fontWeight: 600,
                          }}
                        >
                          <Camera size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                          Edit
                        </div>
                      )}
                    </div>
                    {modalMode !== 'view' && (
                      <div className="photo-actions" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <label
                            className="btn-upload-label"
                            style={{
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              padding: '7px 14px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: uploadingStudentPhoto ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                            title="Upload photograph to Google Drive folder 'student_data_photo'"
                          >
                            <CloudUpload size={14} />
                            {uploadingStudentPhoto ? 'Saving to Drive...' : 'Drive (student_photo)'}
                            <input
                              id="student-photo-input"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null, 'student')}
                              disabled={uploadingStudentPhoto}
                              style={{ display: 'none' }}
                            />
                          </label>

                          <label
                            className="btn-upload-label"
                            style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              padding: '7px 14px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: uploadingStudentPhoto ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Upload size={14} />
                            Cloud Storage
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleCloudPhotoUpload(e.target.files?.[0] || null, 'student')}
                              disabled={uploadingStudentPhoto}
                              style={{ display: 'none' }}
                            />
                          </label>

                          {formState.student_photo_url && (
                            <button
                              type="button"
                              onClick={() => updateForm('student_photo_url', '')}
                              style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Clear Student Photo"
                            >
                              <X size={12} /> Clear
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Or paste Google Drive Photo link / Direct image URL / File ID..."
                            value={
                              formState.student_photo_url?.startsWith('data:')
                                ? '[Uploaded Image File - Active]'
                                : formState.student_photo_url || ''
                            }
                            onChange={(e) => updateForm('student_photo_url', e.target.value)}
                            style={{
                              padding: '8px 12px',
                              fontSize: '12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              flex: 1,
                            }}
                          />
                          {formState.student_photo_url && !formState.student_photo_url.startsWith('data:') && (
                            <a
                              href={formatImageUrl(formState.student_photo_url)}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#475569',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title="Open image in new tab"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-row-3">
                    <label>
                      <span>
                        Admission Code / No <b>*</b>
                      </span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        required
                        placeholder="e.g. ADM-2026-001"
                        value={formState.admission_no || ''}
                        onChange={(e) => updateForm('admission_no', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>
                        Academic Year <b>*</b>
                      </span>
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
                    <label>
                      <span>Roll Number</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. 15"
                        value={formState.roll_no || ''}
                        onChange={(e) => updateForm('roll_no', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-row-3">
                    <label>
                      <span>
                        First Name <b>*</b>
                      </span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        required
                        placeholder="First Name"
                        value={formState.first_name || ''}
                        onChange={(e) => handleNameChange('first_name', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Middle Name</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="Middle Name"
                        value={formState.middle_name || ''}
                        onChange={(e) => handleNameChange('middle_name', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>
                        Last Name <b>*</b>
                      </span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        required
                        placeholder="Last Name"
                        value={formState.last_name || ''}
                        onChange={(e) => handleNameChange('last_name', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-row-3">
                    <label>
                      <span>Date of Birth</span>
                      <input
                        type="date"
                        disabled={modalMode === 'view'}
                        value={formState.date_of_birth || ''}
                        onChange={(e) => updateForm('date_of_birth', e.target.value)}
                      />
                    </label>
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
                        value={formState.blood_group || 'Unknown'}
                        onChange={(e) => updateForm('blood_group', e.target.value)}
                      >
                        <option value="Unknown">Unknown</option>
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
              )}

              {/* TAB 2: CONTACT & ADDRESS */}
              {activeTab === 'contact' && (
                <div className="tab-pane">
                  <div className="form-row-3">
                    <label>
                      <span>
                        Primary Contact / Mobile <b>*</b>
                      </span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. 9876543210"
                        value={formState.mobile || formState.father_mobile || ''}
                        onChange={(e) => updateForm('mobile', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>WhatsApp Number</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. 9876543210"
                        value={formState.whatsapp_no || ''}
                        onChange={(e) => updateForm('whatsapp_no', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Email Address</span>
                      <input
                        type="email"
                        disabled={modalMode === 'view'}
                        placeholder="student@school.com"
                        value={formState.email || ''}
                        onChange={(e) => updateForm('email', e.target.value)}
                      />
                    </label>
                  </div>

                  <label style={{ display: 'block' }}>
                    <span>Residential Address</span>
                    <textarea
                      disabled={modalMode === 'view'}
                      rows={3}
                      placeholder="Enter complete house / street residential address..."
                      value={formState.address || ''}
                      onChange={(e) => updateForm('address', e.target.value)}
                    />
                  </label>

                  <div className="form-row-3">
                    <label>
                      <span>City / Town</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. City Name"
                        value={formState.city || ''}
                        onChange={(e) => updateForm('city', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>District / State</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. State"
                        value={formState.state || ''}
                        onChange={(e) => updateForm('state', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Pincode</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. 110001"
                        value={formState.pincode || ''}
                        onChange={(e) => updateForm('pincode', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-row-2">
                    <label>
                      <span>Emergency Contact Person</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="Name of relative / guardian"
                        value={formState.emergency_contact_name || ''}
                        onChange={(e) => updateForm('emergency_contact_name', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Emergency Phone Number</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        placeholder="Emergency contact mobile"
                        value={formState.emergency_phone || ''}
                        onChange={(e) => updateForm('emergency_phone', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 3: ACADEMIC & CLASS */}
              {activeTab === 'academic' && (
                <div className="tab-pane">
                  {/* Enrollment Status Banner */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: formState.is_active !== false && formState.student_status !== 'Inactive' ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${formState.is_active !== false && formState.student_status !== 'Inactive' ? '#bbf7d0' : '#fecaca'}`,
                      borderRadius: '10px',
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
                          ? 'Student appears on active registers, fee billing, and class rosters.'
                          : 'Student is suspended, left, or inactive.'}
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
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                        {formState.is_active !== false && formState.student_status !== 'Inactive' ? 'Active' : 'Inactive'}
                      </span>
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
                      <span>
                        Section <b>*</b>
                      </span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        required
                        placeholder="e.g. A"
                        value={formState.section || 'A'}
                        onChange={(e) => updateForm('section', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Student Status</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.student_status || 'New Admission'}
                        onChange={(e) => {
                          const st = e.target.value
                          updateForm('student_status', st)
                          updateForm('is_active', st !== 'Inactive' && st !== 'Left')
                        }}
                      >
                        <option value="New Admission">New Admission</option>
                        <option value="Active">Active</option>
                        <option value="Promoted">Promoted</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Left">Left</option>
                        <option value="Alumni">Alumni</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-row-3">
                    <label>
                      <span>Enrollment Date</span>
                      <input
                        type="date"
                        disabled={modalMode === 'view'}
                        value={formState.enrollment_date || new Date().toISOString().split('T')[0]}
                        onChange={(e) => updateForm('enrollment_date', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Previous School Name</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. Model Public School"
                        value={formState.previous_school || ''}
                        onChange={(e) => updateForm('previous_school', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Previous Grade / Marks (%)</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. 85%"
                        value={formState.previous_marks || ''}
                        onChange={(e) => updateForm('previous_marks', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-row-2">
                    <label>
                      <span>Transfer Certificate (TC) Number</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="TC-99210"
                        value={formState.tc_no || ''}
                        onChange={(e) => updateForm('tc_no', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>House / Activity Group</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. Blue House / Red House"
                        value={formState.house_group || ''}
                        onChange={(e) => updateForm('house_group', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 4: PARENTS & GUARDIAN */}
              {activeTab === 'parents' && (
                <div className="tab-pane">
                  {/* Father Details Section */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                    }}
                  >
                    <div className="section-title">Father&apos;s Information</div>
                    <div className="photo-upload-section" style={{ marginBottom: '14px' }}>
                      <div
                        className="avatar-preview-box"
                        style={{ position: 'relative', cursor: modalMode !== 'view' ? 'pointer' : 'default' }}
                        title={modalMode !== 'view' ? 'Click to upload Father photo' : 'Father photo'}
                        onClick={() => {
                          if (modalMode !== 'view') {
                            const input = document.getElementById('father-photo-input') as HTMLInputElement
                            input?.click()
                          }
                        }}
                      >
                        {formState.father_photo_url ? (
                          <img
                            src={formatImageUrl(formState.father_photo_url)}
                            alt="Father"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                        ) : (
                          <User size={36} opacity={0.35} />
                        )}
                        {modalMode !== 'view' && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'rgba(15, 23, 42, 0.75)',
                              color: '#ffffff',
                              fontSize: '9px',
                              textAlign: 'center',
                              padding: '2px 0',
                              fontWeight: 600,
                            }}
                          >
                            <Camera size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                            Edit
                          </div>
                        )}
                      </div>
                      {modalMode !== 'view' && (
                        <div className="photo-actions" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <label
                              className="btn-upload-label"
                              style={{
                                background: '#1e40af',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: uploadingFatherPhoto ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <CloudUpload size={13} />
                              {uploadingFatherPhoto ? 'Uploading...' : 'Drive (father_photo)'}
                              <input
                                id="father-photo-input"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null, 'father')}
                                disabled={uploadingFatherPhoto}
                                style={{ display: 'none' }}
                              />
                            </label>

                            <label
                              className="btn-upload-label"
                              style={{
                                background: '#ffffff',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: uploadingFatherPhoto ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <Upload size={13} />
                              Cloud Storage
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleCloudPhotoUpload(e.target.files?.[0] || null, 'father')}
                                disabled={uploadingFatherPhoto}
                                style={{ display: 'none' }}
                              />
                            </label>

                            {formState.father_photo_url && (
                              <button
                                type="button"
                                onClick={() => updateForm('father_photo_url', '')}
                                style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="Clear Father Photo"
                              >
                                <X size={12} /> Clear
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Father Drive link / file ID / photo URL..."
                              value={
                                formState.father_photo_url?.startsWith('data:')
                                  ? '[Uploaded Image File - Active]'
                                  : formState.father_photo_url || ''
                              }
                              onChange={(e) => updateForm('father_photo_url', e.target.value)}
                              style={{ flex: 1, padding: '6px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                            {formState.father_photo_url && !formState.father_photo_url.startsWith('data:') && (
                              <a
                                href={formatImageUrl(formState.father_photo_url)}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#475569',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                                title="Open in new tab"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-row-3">
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
                    <div className="section-title" style={{ color: '#86198f', borderColor: '#f5d0fe' }}>Mother&apos;s Information</div>
                    <div className="photo-upload-section" style={{ marginBottom: '14px', background: '#ffffff', borderColor: '#f0abfc' }}>
                      <div
                        className="avatar-preview-box"
                        style={{ background: '#fdf2f8', borderColor: '#f472b6', position: 'relative', cursor: modalMode !== 'view' ? 'pointer' : 'default' }}
                        title={modalMode !== 'view' ? 'Click to upload Mother photo' : 'Mother photo'}
                        onClick={() => {
                          if (modalMode !== 'view') {
                            const input = document.getElementById('mother-photo-input') as HTMLInputElement
                            input?.click()
                          }
                        }}
                      >
                        {formState.mother_photo_url ? (
                          <img
                            src={formatImageUrl(formState.mother_photo_url)}
                            alt="Mother"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                        ) : (
                          <User size={36} opacity={0.35} color="#db2777" />
                        )}
                        {modalMode !== 'view' && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'rgba(15, 23, 42, 0.75)',
                              color: '#ffffff',
                              fontSize: '9px',
                              textAlign: 'center',
                              padding: '2px 0',
                              fontWeight: 600,
                            }}
                          >
                            <Camera size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                            Edit
                          </div>
                        )}
                      </div>
                      {modalMode !== 'view' && (
                        <div className="photo-actions" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <label
                              className="btn-upload-label"
                              style={{
                                background: '#a21caf',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: uploadingMotherPhoto ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <CloudUpload size={13} />
                              {uploadingMotherPhoto ? 'Uploading...' : 'Drive (mother_photo)'}
                              <input
                                id="mother-photo-input"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null, 'mother')}
                                disabled={uploadingMotherPhoto}
                                style={{ display: 'none' }}
                              />
                            </label>

                            <label
                              className="btn-upload-label"
                              style={{
                                background: '#ffffff',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: uploadingMotherPhoto ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <Upload size={13} />
                              Cloud Storage
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleCloudPhotoUpload(e.target.files?.[0] || null, 'mother')}
                                disabled={uploadingMotherPhoto}
                                style={{ display: 'none' }}
                              />
                            </label>

                            {formState.mother_photo_url && (
                              <button
                                type="button"
                                onClick={() => updateForm('mother_photo_url', '')}
                                style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="Clear Mother Photo"
                              >
                                <X size={12} /> Clear
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Mother Drive link / file ID / photo URL..."
                              value={
                                formState.mother_photo_url?.startsWith('data:')
                                  ? '[Uploaded Image File - Active]'
                                  : formState.mother_photo_url || ''
                              }
                              onChange={(e) => updateForm('mother_photo_url', e.target.value)}
                              style={{ flex: 1, padding: '6px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                            {formState.mother_photo_url && !formState.mother_photo_url.startsWith('data:') && (
                              <a
                                href={formatImageUrl(formState.mother_photo_url)}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#475569',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                                title="Open in new tab"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-row-3">
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
                    </div>
                  </div>

                  {/* Guardian Section */}
                  <div className="form-row-3" style={{ marginTop: '12px' }}>
                    <label>
                      <span>Guardian Name</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="Guardian full name"
                        value={formState.guardian_name || ''}
                        onChange={(e) => updateForm('guardian_name', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Guardian Relation</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. Uncle / Grandfather"
                        value={formState.guardian_relation || ''}
                        onChange={(e) => updateForm('guardian_relation', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Guardian Mobile</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        placeholder="Guardian phone number"
                        value={formState.guardian_mobile || ''}
                        onChange={(e) => updateForm('guardian_mobile', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 5: HEALTH & DOCUMENTS */}
              {activeTab === 'health' && (
                <div className="tab-pane">
                  <div className="form-row-2">
                    <label>
                      <span>Aadhaar Card / Student ID Number</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. 1234 5678 9012"
                        value={formState.aadhaar_no || ''}
                        onChange={(e) => updateForm('aadhaar_no', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Medical Conditions / Allergies</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. Asthma, Peanut Allergy, None"
                        value={formState.medical_conditions || ''}
                        onChange={(e) => updateForm('medical_conditions', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-row-2">
                    <label>
                      <span>Transport Mode</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.transport_mode || 'Private'}
                        onChange={(e) => updateForm('transport_mode', e.target.value)}
                      >
                        <option value="Private">Private / Self</option>
                        <option value="School Bus">School Bus</option>
                        <option value="Van">School Van / Cab</option>
                        <option value="Walking">Walking</option>
                      </select>
                    </label>
                    <label>
                      <span>Bus Route / Stop Name</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. Route 4 - Main Gate"
                        value={formState.bus_route || ''}
                        onChange={(e) => updateForm('bus_route', e.target.value)}
                      />
                    </label>
                  </div>

                  <label style={{ display: 'block' }}>
                    <span>Document Link / Drive URL (Aadhaar / Birth Cert / TC)</span>
                    <input
                      type="url"
                      disabled={modalMode === 'view'}
                      placeholder="Paste Drive link or Document URL..."
                      value={formState.document_url || ''}
                      onChange={(e) => updateForm('document_url', e.target.value)}
                    />
                  </label>
                </div>
              )}

              {/* Modal Action Bar / Footer */}
              <div
                style={{
                  padding: '14px 20px',
                  background: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  borderRadius: '0 0 16px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  {activeTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['personal', 'contact', 'academic', 'parents', 'health']
                        const idx = tabs.indexOf(activeTab)
                        if (idx > 0) setActiveTab(tabs[idx - 1] as any)
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      &larr; Previous Tab
                    </button>
                  )}
                  {activeTab !== 'health' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs = ['personal', 'contact', 'academic', 'parents', 'health']
                        const idx = tabs.indexOf(activeTab)
                        if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1] as any)
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Next Tab &rarr;
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {modalMode === 'view' ? 'Close' : 'Cancel'}
                  </button>
                  {modalMode !== 'view' && (
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: '8px 22px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: submitting ? 'wait' : 'pointer',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {submitting ? (
                        <>
                          <RefreshCw size={15} className="spin" />
                          Saving Student...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          {modalMode === 'create' ? 'Add Student' : 'Save Student Record'}
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
    </div>
  )
}
