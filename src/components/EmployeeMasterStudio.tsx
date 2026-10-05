import React, { useState, useEffect, useMemo } from 'react'
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
  CreditCard,
  Briefcase,
  User,
  Phone,
  BookOpen,
  DollarSign,
  Building,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Sparkles,
  ExternalLink,
  Code2,
  CheckCircle2,
  FolderOpen,
  AlertCircle,
  Key,
  Copy,
  Check,
} from 'lucide-react'
import {
  fetchCollectionData,
  saveDocument,
  saveBatchDocuments,
  deleteDocument,
  subscribeToCollection,
  uploadToFirebaseStorage,
  logActivity,
} from '../lib/supabase'
import { getCurrentAcademicYear, ACADEMIC_YEAR_OPTIONS, CURRENT_ACADEMIC_YEAR } from '../lib/academicYear'
import { modules } from '../modules'
import { downloadSampleCsv } from '../lib/csvUtils'
import { formatImageUrl, handleImageError } from '../lib/imageUtils'
import { getEmployeeProbationStatus } from '../lib/leaveSalaryRules'
import {
  STAFF_GOOGLE_DRIVE_FOLDER_ID,
  STAFF_GOOGLE_DRIVE_FOLDER_NAME,
  STAFF_GOOGLE_SHEET_ID,
  STAFF_GOOGLE_SHEET_TAB_NAME,
  uploadStaffPhotoToGoogleDrive,
  syncAllEmployeesToGoogleSheet,
  syncSingleEmployeeToGoogleSheet,
  fetchEmployeesFromGoogleSheet,
  generateStaffAppsScriptCode,
  subscribeGoogleAuth,
  connectGoogleWorkspace,
  disconnectGoogleWorkspace,
  getGoogleAuthState,
} from '../lib/googleDriveSheets'
import CsvImportModal from './CsvImportModal'
import EmployeeGoogleScriptModal from './EmployeeGoogleScriptModal'
import EmployeeFormModal from './employee-studio/EmployeeFormModal'

type Employee = {
  emp_id?: string
  emp_code?: string
  employee_category?: string
  first_name?: string
  middle_name?: string
  last_name?: string
  date_of_birth?: string
  gender?: string
  blood_group?: string
  marital_status?: string
  mobile_primary?: string
  whatsapp_number?: string
  personal_email?: string
  official_email?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  current_address?: string
  permanent_address?: string
  department?: string
  designation?: string
  employment_type?: string
  employment_status?: string
  academic_year?: string
  reporting_to?: string
  reporting_designation?: string
  date_of_joining?: string
  confirmation_date?: string
  resignation_date?: string
  last_working_date?: string
  date_of_leaving?: string
  shift_name?: string
  qualification?: string
  professional_qualification?: string
  total_experience_years?: number
  subject_specialisation?: string[]
  classes_assigned?: string[]
  class_teacher_of?: string
  section_assigned?: string
  employee_photo_url?: string
  document_url?: string
  basic_salary?: number
  bank_name?: string
  bank_account_no?: string
  ifsc_code?: string
  pan_number?: string
  is_active?: boolean
  created_at?: string
  [key: string]: unknown
}

export default function EmployeeMasterStudio({
  setToast,
  onGenerateSalarySlip,
  onGenerateIdCard,
}: {
  setToast: (msg: string) => void
  onGenerateSalarySlip?: (emp: Employee) => void
  onGenerateIdCard?: (empId: string) => void
}) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [classesList, setClassesList] = useState<string[]>([])
  const [subjectsList, setSubjectsList] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterYear, setFilterYear] = useState('')

  const [page, setPage] = useState(1)
  const pageSize = 15

  // Google Workspace & Sheets Integration State
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleUser, setGoogleUser] = useState<any>(null)
  const [syncingSheet, setSyncingSheet] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false)
  const [showDomainModal, setShowDomainModal] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)
  const [copiedDomain, setCopiedDomain] = useState(false)
  const [uploadingPhotoDrive, setUploadingPhotoDrive] = useState(false)

  // Form Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | null>(null)
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)
  const [activeTab, setActiveTab] = useState<
    'personal' | 'contact' | 'employment' | 'qualification' | 'teaching' | 'salary' | 'bank' | 'docs'
  >('personal')
  const [formState, setFormState] = useState<Employee>({})
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showCsvModal, setShowCsvModal] = useState(false)

  // Listen to Google OAuth state
  useEffect(() => {
    const { user, accessToken } = getGoogleAuthState()
    setGoogleConnected(Boolean(accessToken))
    setGoogleUser(user)

    const unsubAuth = subscribeGoogleAuth((usr, tok) => {
      setGoogleConnected(Boolean(tok))
      setGoogleUser(usr)
    })

    return () => {
      unsubAuth()
    }
  }, [])

  // Load masters for relationships
  useEffect(() => {
    // Departments
    fetchCollectionData('department_master').then((data) => {
      if (data && data.length > 0) {
        setDepartments(data.map((d: any) => d.department_name).filter(Boolean))
      } else {
        setDepartments(['Academics', 'Administration', 'Accounts', 'Sports', 'Science', 'Arts'])
      }
    })

    // Classes
    fetchCollectionData('class_master').then((data) => {
      if (data && data.length > 0) {
        setClassesList(data.map((c: any) => c.class_name).filter(Boolean))
      } else {
        setClassesList(['CLASS I', 'CLASS II', 'CLASS III', 'CLASS IV', 'CLASS V', 'CLASS VI', 'CLASS VII', 'CLASS VIII'])
      }
    })

    // Subjects
    fetchCollectionData('subject_master').then((data) => {
      if (data && data.length > 0) {
        const unique = Array.from(new Set(data.map((s: any) => s.subject_name).filter(Boolean))) as string[]
        setSubjectsList(unique)
      } else {
        setSubjectsList(['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Bengali', 'Computer Science'])
      }
    })
  }, [])

  // Load Employees directly from Supabase (Live Source of Truth)
  const loadEmployees = async () => {
    setLoading(true)
    try {
      const data = await fetchCollectionData('employee_master')
      const empList = (data || []) as Employee[]
      setEmployees(empList)
    } catch (err) {
      console.warn('Error loading employees:', err)
      setToast(err instanceof Error ? err.message : 'Failed to load employees from Supabase')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()

    // Realtime subscription to Supabase employee_master table
    const unsub = subscribeToCollection('employee_master', (data) => {
      const empList = (data || []) as Employee[]
      setEmployees(empList)
      setLoading(false)
    })

    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [])

  // Quick toggle employee Active / Inactive status
  const handleToggleEmployeeActive = async (emp: Employee, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const currentlyActive =
      emp.is_active !== false &&
      emp.employment_status !== 'Inactive' &&
      emp.employment_status !== 'Resigned' &&
      emp.employment_status !== 'Retired' &&
      emp.employment_status !== 'Left' &&
      emp.employment_status !== 'Suspended'

    const newActive = !currentlyActive
    const newStatus = newActive ? 'Active' : 'Inactive'

    const displayName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.emp_code || 'Staff'
    setToast(`Saving status '${newStatus}' for ${displayName} directly to Supabase...`)

    const updatedEmp: Employee = {
      ...emp,
      is_active: newActive,
      employment_status: newStatus,
      updated_at: new Date().toISOString(),
    }

    const pk = emp.emp_code || emp.emp_id || (emp as any)._docId || `EMP-${Date.now()}`
    const res = await saveDocument('employee_master', 'emp_code', {
      ...updatedEmp,
      _docId: pk,
    })

    if (!res.success) {
      setToast(`❌ Supabase update failed: ${res.error || 'Could not save status change'}`)
      return
    }

    // Immediately re-fetch live data from Supabase to verify status
    await loadEmployees()

    setToast(`✓ ${displayName} status updated to '${newStatus}' in Supabase`)

    // Real-time synchronization to Google Sheet (staff_data)
    syncSingleEmployeeToGoogleSheet(updatedEmp).catch(() => {})
  }

  // Quick change employee status
  const handleQuickChangeEmployeeStatus = async (emp: Employee, newStatus: string) => {
    const isInactive =
      newStatus === 'Inactive' ||
      newStatus === 'Resigned' ||
      newStatus === 'Terminated' ||
      newStatus === 'Retired' ||
      newStatus === 'Left' ||
      newStatus === 'Suspended'

    const isActive = !isInactive
    const displayName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.emp_code || 'Staff'
    setToast(`Saving status '${newStatus}' for ${displayName} directly to Supabase...`)

    const todayStr = new Date().toISOString().slice(0, 10)
    const updatedEmp: Employee = {
      ...emp,
      is_active: isActive,
      employment_status: newStatus,
      updated_at: new Date().toISOString(),
      date_of_leaving: isInactive ? emp.date_of_leaving || todayStr : emp.date_of_leaving,
      resignation_date: isInactive ? emp.resignation_date || todayStr : emp.resignation_date,
      last_working_date: isInactive ? emp.last_working_date || todayStr : emp.last_working_date,
    }

    const pk = emp.emp_code || emp.emp_id || (emp as any)._docId || `EMP-${Date.now()}`
    const res = await saveDocument('employee_master', 'emp_code', {
      ...updatedEmp,
      _docId: pk,
    })

    if (!res.success) {
      setToast(`❌ Supabase update failed: ${res.error || 'Could not save status change'}`)
      return
    }

    // Immediately re-fetch live data from Supabase to verify status
    await loadEmployees()

    setToast(`✓ ${displayName} status updated to '${newStatus}' in Supabase`)

    // Real-time synchronization to Google Sheet (staff_data)
    syncSingleEmployeeToGoogleSheet(updatedEmp).catch(() => {})
  }

  // Push all staff to Google Sheet (staff_data tab in Sheet 1JUZXNNcIZeMGFyzmFbdfxADLY8Jwb_r3e03rJK5rWgc)
  const handleSyncToGoogleSheet = async (employeesList?: Employee[]) => {
    const listToSync = employeesList || employees
    if (listToSync.length === 0) {
      setToast('No staff records found to sync')
      return
    }
    setSyncingSheet(true)
    try {
      const res = await syncAllEmployeesToGoogleSheet(listToSync)
      if (res.success) {
        const timeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
        setLastSyncTime(timeStr)
        setToast(`✓ Google Sheet synced (${res.count} staff records) on tab '${STAFF_GOOGLE_SHEET_TAB_NAME}'!`)
      } else {
        setToast(`Google Sheet Sync: ${res.error || 'Authentication required'}`)
      }
    } catch (err: any) {
      setToast(`Sheet Sync Failed: ${err.message || 'Unknown error'}`)
    } finally {
      setSyncingSheet(false)
    }
  }

  // Pull records from Google Sheet ('staff_data' or first available tab)
  const handlePullFromGoogleSheet = async () => {
    setSyncingSheet(true)
    try {
      const res = await fetchEmployeesFromGoogleSheet()
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to fetch Google Sheet data')
      }
      if (res.data.length === 0) {
        setToast(res.error || 'No employee rows found in Google Sheet.')
        setSyncingSheet(false)
        return
      }

      // Permanently save to Firestore in batch & update local cache
      await saveBatchDocuments('employee_master', 'emp_code', res.data)

      setEmployees((prev) => {
        const incoming = res.data as Employee[]
        const combined = [...incoming, ...prev]
        const seen = new Set<string>()
        const deduped: Employee[] = []
        for (const emp of combined) {
          const id = String(emp.emp_code || emp.emp_id || (emp as any)._docId || JSON.stringify(emp))
          if (!seen.has(id)) {
            seen.add(id)
            deduped.push(emp)
          }
        }
        try {
          localStorage.setItem('sjes_table_employee_master', JSON.stringify(deduped))
          localStorage.setItem('sjes_table_employees', JSON.stringify(deduped))
        } catch {}
        return deduped
      })

      setToast(`✓ Successfully imported & saved ${res.data.length} staff members from Google Sheet (${res.sheetName || 'staff_data'})!`)
    } catch (err: any) {
      setToast(`Google Sheet Import Error: ${err.message || err}`)
    } finally {
      setSyncingSheet(false)
    }
  }

  // Google Connect
  const handleGoogleConnect = async () => {
    try {
      const res = await connectGoogleWorkspace()
      if (res.success) {
        setGoogleConnected(true)
        setGoogleUser(res.user)
        setToast('Google Account connected successfully! Real-time staff sync enabled.')
      } else {
        if (res.error?.includes('auth/unauthorized-domain')) {
          setShowDomainModal(true)
        } else {
          setToast(`Google Sign-In: ${res.error || 'Failed to authenticate'}`)
        }
      }
    } catch (err: any) {
      if (String(err?.message || '').includes('auth/unauthorized-domain')) {
        setShowDomainModal(true)
      } else {
        setToast(`Google Sign-In Failed: ${err?.message || 'Unknown error'}`)
      }
    }
  }

  // Google Disconnect
  const handleGoogleDisconnect = async () => {
    await disconnectGoogleWorkspace()
    setGoogleConnected(false)
    setGoogleUser(null)
    setToast('Google Account disconnected')
  }

  // Filtering - Comprehensive search handling all name & code formats
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const q = search.toLowerCase().trim()
      const rawFullName = [
        e.first_name,
        e.middle_name,
        e.last_name,
        (e as any).full_name,
        (e as any).name,
        (e as any).employee_name,
        (e as any).staff_name,
        (e as any).teacher_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const empCodeStr = String(e.emp_code || e.emp_id || (e as any).code || '').toLowerCase()
      const phoneStr = String(e.mobile_primary || (e as any).phone || (e as any).contact_no || '').toLowerCase()
      const emailStr = String(e.official_email || e.personal_email || (e as any).email || '').toLowerCase()
      const desigStr = String(e.designation || '').toLowerCase()
      const deptStr = String(e.department || '').toLowerCase()

      const matchSearch =
        !q ||
        rawFullName.includes(q) ||
        empCodeStr.includes(q) ||
        phoneStr.includes(q) ||
        emailStr.includes(q) ||
        desigStr.includes(q) ||
        deptStr.includes(q)

      const matchDept = !filterDept || e.department === filterDept
      const matchCategory = !filterCategory || e.employee_category === filterCategory

      const matchStatus =
        !filterStatus ||
        (filterStatus === 'Active'
          ? e.is_active !== false &&
            e.employment_status !== 'Inactive' &&
            e.employment_status !== 'Resigned' &&
            e.employment_status !== 'Terminated' &&
            e.employment_status !== 'Retired' &&
            e.employment_status !== 'Left'
          : filterStatus === 'Resigned'
          ? e.employment_status === 'Resigned'
          : filterStatus === 'Terminated'
          ? e.employment_status === 'Terminated'
          : filterStatus === 'Inactive'
          ? e.employment_status === 'Inactive' ||
            (e.is_active === false && e.employment_status !== 'Resigned' && e.employment_status !== 'Terminated')
          : e.employment_status === filterStatus)

      const matchYear = !filterYear || e.academic_year === filterYear || (!e.academic_year && filterYear === CURRENT_ACADEMIC_YEAR)

      return matchSearch && matchDept && matchCategory && matchStatus && matchYear
    })
  }, [employees, search, filterDept, filterCategory, filterStatus, filterYear])

  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredEmployees.slice(start, start + pageSize)
  }, [filteredEmployees, page])

  // Open Modal
  const openModal = (mode: 'create' | 'edit' | 'view', emp?: Employee) => {
    setModalMode(mode)
    setSelectedEmp(emp || null)
    setActiveTab('personal')
    if (mode === 'create') {
      setFormState({
        emp_code: `EMP-${Date.now().toString().slice(-4)}`,
        employee_category: 'Teaching Staff',
        department: departments[0] || 'Academics',
        designation: 'Assistant Teacher',
        employment_type: 'Permanent',
        employment_status: 'Active',
        academic_year: getCurrentAcademicYear(),
        date_of_joining: new Date().toISOString().slice(0, 10),
        shift_name: 'Morning Shift (8:00 AM - 2:00 PM)',
        subject_specialisation: [],
        classes_assigned: [],
        basic_salary: 25000,
        is_active: true,
      })
    } else if (emp) {
      setFormState({
        ...emp,
        subject_specialisation: Array.isArray(emp.subject_specialisation)
          ? emp.subject_specialisation
          : typeof emp.subject_specialisation === 'string'
          ? (emp.subject_specialisation as string).split(',').map((x) => x.trim())
          : [],
        classes_assigned: Array.isArray(emp.classes_assigned)
          ? emp.classes_assigned
          : typeof emp.classes_assigned === 'string'
          ? (emp.classes_assigned as string).split(',').map((x) => x.trim())
          : [],
      })
    }
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedEmp(null)
    setFormState({})
  }

  const updateForm = (key: keyof Employee, value: unknown) => {
    setFormState((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'employment_status') {
        const valStr = String(value)
        const isInactive =
          valStr === 'Inactive' ||
          valStr === 'Resigned' ||
          valStr === 'Terminated' ||
          valStr === 'Retired' ||
          valStr === 'Left' ||
          valStr === 'Suspended'
        next.is_active = !isInactive
        const todayStr = new Date().toISOString().slice(0, 10)
        if (isInactive) {
          if (!next.date_of_leaving) next.date_of_leaving = todayStr
          if (!next.resignation_date) next.resignation_date = todayStr
          if (!next.last_working_date) next.last_working_date = todayStr
        }
      }
      return next
    })
  }

  // Toggle multi-select items
  const toggleArrayItem = (key: 'subject_specialisation' | 'classes_assigned', item: string) => {
    setFormState((prev) => {
      const current = (prev[key] || []) as string[]
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item]
      return { ...prev, [key]: next }
    })
  }

  // Photo upload to Firebase Storage
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const url = await uploadToFirebaseStorage(
        file,
        'school-documents',
        `employees_${formState.emp_code || 'staff'}_photo`
      )
      updateForm('employee_photo_url', url)
      setToast('Staff photograph uploaded to cloud storage')
    } catch {
      setToast('Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Direct upload to Staff Google Drive folder (staff_photo - 1zcVv1vwxdMNAKPP52THA4SE8TzUGOOLa)
  const handleDrivePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhotoDrive(true)
    try {
      const code = formState.emp_code || 'EMP'
      const name = `${formState.first_name || ''}_${formState.last_name || ''}`.trim() || 'staff'
      const customFileName = `${code}_${name}_photo.${file.name.split('.').pop() || 'jpg'}`
      const res = await uploadStaffPhotoToGoogleDrive(file, code, customFileName)
      if (res.success && res.url) {
        updateForm('employee_photo_url', res.url)
        setToast(`✓ Staff photo saved to Google Drive folder '${STAFF_GOOGLE_DRIVE_FOLDER_NAME}'!`)
      } else {
        if (res.error?.includes('auth/unauthorized-domain')) {
          setShowDomainModal(true)
        } else {
          setToast(`Google Drive Upload: ${res.error || 'Authentication required'}`)
        }
      }
    } catch (err: any) {
      if (String(err?.message || '').includes('auth/unauthorized-domain')) {
        setShowDomainModal(true)
      } else {
        setToast(`Drive upload failed: ${err.message || 'Unknown error'}`)
      }
    } finally {
      setUploadingPhotoDrive(false)
    }
  }

  // Document upload
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingDoc(true)
    try {
      const url = await uploadToFirebaseStorage(
        file,
        'school-documents',
        `employees_${formState.emp_code || 'staff'}_doc`
      )
      updateForm('document_url', url)
      setToast('Staff document uploaded')
    } catch {
      setToast('Document upload failed')
    } finally {
      setUploadingDoc(false)
    }
  }

  // Save handler with Firebase persistence & Google Sheet sync
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formState.emp_code || !formState.first_name || !formState.last_name) {
      setToast('Please enter Employee Code, First Name, and Last Name.')
      return
    }

    setSubmitting(true)
    try {
      const statusStr = String(formState.employment_status || 'Active')
      const isInactiveStatus =
        statusStr === 'Inactive' ||
        statusStr === 'Resigned' ||
        statusStr === 'Retired' ||
        statusStr === 'Left' ||
        statusStr === 'Suspended'

      const payload: Record<string, unknown> = {
        ...formState,
        emp_code: String(formState.emp_code).trim().toUpperCase(),
        first_name: String(formState.first_name).trim(),
        last_name: String(formState.last_name).trim(),
        academic_year: formState.academic_year || getCurrentAcademicYear(),
        employment_status: statusStr,
        is_active: isInactiveStatus ? false : formState.is_active !== false,
        updated_at: new Date().toISOString(),
      }

      if (modalMode === 'create') {
        const res = await saveDocument('employee_master', 'emp_code', payload)
        if (!res.success) throw new Error(res.error || 'Failed to create employee')
        await logActivity({
          action: `Added new employee: ${formState.first_name} ${formState.last_name} (${formState.emp_code})`,
          module: 'employee_master',
        })
        setToast(`Staff member registered successfully in database`)
      } else if (modalMode === 'edit') {
        const res = await saveDocument('employee_master', 'emp_code', payload)
        if (!res.success) throw new Error(res.error || 'Failed to update employee')
        await logActivity({
          action: `Updated employee: ${formState.first_name} ${formState.last_name} (${formState.emp_code})`,
          module: 'employee_master',
        })
        setToast('Staff record updated successfully')
      }

      await loadEmployees()
      closeModal()

      // Real-time synchronization to Google Sheet (staff_data)
      syncSingleEmployeeToGoogleSheet(payload)
        .then((sheetRes) => {
          if (sheetRes.success) {
            setLastSyncTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }))
          }
        })
        .catch(() => {})
    } catch (err) {
      console.warn('Employee save error:', err)
      setToast(err instanceof Error ? err.message : 'Save operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete with auto-sync
  const handleDelete = async (emp: Employee) => {
    const eId = (emp as any)._docId || emp.emp_id || emp.emp_code
    if (!eId) return
    if (!confirm(`Delete employee record for ${emp.first_name} ${emp.last_name}?`)) return

    try {
      await deleteDocument('employee_master', eId, emp)
      await logActivity({
        action: `Deleted employee: ${emp.first_name} ${emp.last_name} (${emp.emp_code})`,
        module: 'employee_master',
      })
      await loadEmployees()
      setToast('Employee record deleted')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    if (employees.length === 0) {
      setToast('No employee records available to export')
      return
    }
    const headers = [
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
      'Academic Year',
    ]
    const rows = filteredEmployees.map((e) => [
      `"${String(e.emp_code || '').replace(/"/g, '""')}"`,
      `"${String(e.first_name || '').replace(/"/g, '""')}"`,
      `"${String(e.last_name || '').replace(/"/g, '""')}"`,
      `"${String(e.employee_category || 'Teaching Staff').replace(/"/g, '""')}"`,
      `"${String(e.department || '').replace(/"/g, '""')}"`,
      `"${String(e.designation || '').replace(/"/g, '""')}"`,
      `"${String(e.employment_type || 'Permanent').replace(/"/g, '""')}"`,
      `"${String(e.employment_status || (e.is_active !== false ? 'Active' : 'Inactive')).replace(/"/g, '""')}"`,
      `"${String(e.date_of_joining || '').replace(/"/g, '""')}"`,
      `"${String(e.date_of_birth || '').replace(/"/g, '""')}"`,
      `"${String(e.gender || 'Male').replace(/"/g, '""')}"`,
      `"${String(e.blood_group || '').replace(/"/g, '""')}"`,
      `"${String(e.mobile_primary || '').replace(/"/g, '""')}"`,
      `"${String(e.whatsapp_number || '').replace(/"/g, '""')}"`,
      `"${String(e.official_email || '').replace(/"/g, '""')}"`,
      `"${String(e.personal_email || '').replace(/"/g, '""')}"`,
      `"${String(e.basic_salary || 25000).replace(/"/g, '""')}"`,
      `"${(e.classes_assigned || []).join(', ').replace(/"/g, '""')}"`,
      `"${(e.subject_specialisation || []).join(', ').replace(/"/g, '""')}"`,
      `"${String(e.academic_year || '2026-27').replace(/"/g, '""')}"`,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Employee_Master_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    setToast(`Exported ${filteredEmployees.length} employee records to CSV`)
  }

  return (
    <div className="module-view">
      {/* Hero */}
      <div className="module-hero">
        <div className="hero-left">
          <div className="hero-title-row">
            <h1>Employee Master Studio</h1>
            <span className="count-badge">{filteredEmployees.length} Staff Members</span>
          </div>
          <p>Faculty and administrative staff credentials, assignments, qualifications and payroll profiles</p>
        </div>
        <div className="hero-actions">
          <button
            className="btn-secondary"
            onClick={() => downloadSampleCsv(modules.employee_master)}
            title="Download pre-filled sample CSV template for bulk employee upload"
          >
            <Download size={16} /> Sample CSV
          </button>
          <button
            className="btn-secondary"
            onClick={() => setShowCsvModal(true)}
            title="Import employee roster from CSV"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button
            className="btn-secondary"
            onClick={handleExportCsv}
            title="Export filtered staff records to CSV"
          >
            <Download size={16} /> Export CSV
          </button>
          <button className="btn-secondary" onClick={loadEmployees} title="Reload records">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button className="btn-primary" onClick={() => openModal('create')}>
            <Plus size={16} /> Add Employee
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
          <span>All Staff</span>
          <span
            style={{
              background: !filterStatus ? '#1e40af' : '#e2e8f0',
              color: !filterStatus ? '#ffffff' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
            }}
          >
            {employees.length}
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
          <span>Active</span>
          <span
            style={{
              background: filterStatus === 'Active' ? '#16a34a' : '#e2e8f0',
              color: filterStatus === 'Active' ? '#ffffff' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
            }}
          >
            {
              employees.filter(
                (e) =>
                  e.is_active !== false &&
                  e.employment_status !== 'Inactive' &&
                  e.employment_status !== 'Resigned' &&
                  e.employment_status !== 'Terminated' &&
                  e.employment_status !== 'Retired' &&
                  e.employment_status !== 'Left'
              ).length
            }
          </span>
        </button>

        <button
          onClick={() => {
            setFilterStatus('Resigned')
            setPage(1)
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterStatus === 'Resigned' ? '2px solid #ea580c' : '1px solid #cbd5e1',
            background: filterStatus === 'Resigned' ? '#fff7ed' : '#ffffff',
            color: filterStatus === 'Resigned' ? '#c2410c' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c' }} />
          <span>Resigned</span>
          <span
            style={{
              background: filterStatus === 'Resigned' ? '#ea580c' : '#e2e8f0',
              color: filterStatus === 'Resigned' ? '#ffffff' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
            }}
          >
            {employees.filter((e) => e.employment_status === 'Resigned').length}
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
          <span>Inactive</span>
          <span
            style={{
              background: filterStatus === 'Inactive' ? '#dc2626' : '#e2e8f0',
              color: filterStatus === 'Inactive' ? '#ffffff' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
            }}
          >
            {
              employees.filter(
                (e) =>
                  e.employment_status === 'Inactive' ||
                  (e.is_active === false && e.employment_status !== 'Resigned' && e.employment_status !== 'Terminated')
              ).length
            }
          </span>
        </button>

        <button
          onClick={() => {
            setFilterStatus('Terminated')
            setPage(1)
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterStatus === 'Terminated' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
            background: filterStatus === 'Terminated' ? '#f5f3ff' : '#ffffff',
            color: filterStatus === 'Terminated' ? '#6d28d9' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7c3aed' }} />
          <span>Terminated</span>
          <span
            style={{
              background: filterStatus === 'Terminated' ? '#7c3aed' : '#e2e8f0',
              color: filterStatus === 'Terminated' ? '#ffffff' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
            }}
          >
            {employees.filter((e) => e.employment_status === 'Terminated').length}
          </span>
        </button>

        <button
          onClick={() => {
            setFilterStatus('On Leave')
            setPage(1)
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: filterStatus === 'On Leave' ? '2px solid #d97706' : '1px solid #cbd5e1',
            background: filterStatus === 'On Leave' ? '#fffbeb' : '#ffffff',
            color: filterStatus === 'On Leave' ? '#b45309' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706' }} />
          <span>On Leave</span>
          <span
            style={{
              background: filterStatus === 'On Leave' ? '#d97706' : '#e2e8f0',
              color: filterStatus === 'On Leave' ? '#ffffff' : '#475569',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
            }}
          >
            {employees.filter((e) => e.employment_status === 'On Leave').length}
          </span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="studio-filters-card">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, emp code, phone, email, designation..."
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
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Categories</option>
            <option value="Teaching Staff">Teaching Staff</option>
            <option value="Non-Teaching Staff">Non-Teaching Staff</option>
            <option value="Management">Management</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Resigned">Resigned</option>
            <option value="Inactive">Inactive</option>
            <option value="Terminated">Terminated</option>
            <option value="On Leave">On Leave</option>
            <option value="Suspended">Suspended</option>
            <option value="Retired">Retired</option>
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

          {(filterDept || filterCategory || filterStatus || filterYear || search) && (
            <button
              className="btn-reset-filters"
              onClick={() => {
                setSearch('')
                setFilterDept('')
                setFilterCategory('')
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

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '48px' }}>Photo</th>
              <th>Emp Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Contact Phone</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="table-loading">
                  <div className="loader-spinner" /> Loading employee directory...
                </td>
              </tr>
            ) : paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-empty">
                  <Briefcase size={36} opacity={0.4} />
                  <p>
                    {employees.length === 0
                      ? 'No staff records found in database.'
                      : 'No staff records match the current filter criteria.'}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
                    {employees.length > 0 && (
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setSearch('')
                          setFilterDept('')
                          setFilterCategory('')
                          setFilterStatus('')
                          setFilterYear('')
                        }}
                      >
                        Clear All Filters ({employees.length} total staff available)
                      </button>
                    )}
                    <button className="btn-primary-sm" onClick={() => openModal('create')}>
                      <Plus size={14} /> Add New Employee
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp) => {
                const displayName =
                  [emp.first_name, emp.last_name].filter(Boolean).join(' ') ||
                  (emp as any).full_name ||
                  (emp as any).name ||
                  (emp as any).employee_name ||
                  (emp as any).staff_name ||
                  emp.emp_code ||
                  'Staff Member'

                const initialLetter = (
                  emp.first_name?.[0] ||
                  (emp as any).full_name?.[0] ||
                  emp.emp_code?.[0] ||
                  'S'
                ).toUpperCase()

                return (
                  <tr key={emp.emp_id || emp.emp_code || String(emp._docId || Math.random())}>
                    <td>
                      <div className="table-avatar">
                        {emp.employee_photo_url ? (
                          <img
                            src={formatImageUrl(emp.employee_photo_url)}
                            alt={displayName}
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                        ) : (
                          <span>{initialLetter}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="code-pill">{emp.emp_code || '—'}</span>
                    </td>
                    <td>
                      <div className="name-cell">
                        <b>{displayName}</b>
                        <small>{emp.official_email || emp.personal_email || 'No email'}</small>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-light">{emp.employee_category || 'Teaching Staff'}</span>
                    </td>
                    <td>{emp.department || '—'}</td>
                    <td>{emp.designation || '—'}</td>
                    <td>
                      <a href={`tel:${emp.mobile_primary}`} className="contact-link">
                        {emp.mobile_primary || '—'}
                      </a>
                    </td>
                    <td>
                      {(() => {
                        const isActive =
                          emp.is_active !== false &&
                          emp.employment_status !== 'Inactive' &&
                          emp.employment_status !== 'Resigned' &&
                          emp.employment_status !== 'Retired'
                        const prob = getEmployeeProbationStatus(emp.date_of_joining)
                        const isProb = prob.status === 'Probationary'
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleEmployeeActive(emp, e)}
                              title={`Click to set ${isActive ? 'Inactive' : 'Active'}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: isActive ? '#dcfce7' : '#fee2e2',
                                color: isActive ? '#15803d' : '#b91c1c',
                                border: `1px solid ${isActive ? '#86efac' : '#fca5a5'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: isActive ? '#16a34a' : '#dc2626',
                                }}
                              />
                              {emp.employment_status || (isActive ? 'Active' : 'Inactive')}
                            </button>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: '8px',
                                fontSize: '10px',
                                fontWeight: 600,
                                background: isProb ? '#fef3c7' : '#f1f5f9',
                                color: isProb ? '#92400e' : '#475569',
                              }}
                            >
                              {prob.status} ({prob.completedMonths}m)
                            </span>
                          </div>
                        )
                      })()}
                    </td>
                    <td>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button title="View Profile" onClick={() => openModal('view', emp)}>
                          <Eye size={16} />
                        </button>
                        <button title="Edit Employee" onClick={() => openModal('edit', emp)}>
                          <Edit3 size={16} />
                        </button>
                        {onGenerateSalarySlip && (
                          <button
                            title="Generate Pay Slip"
                            onClick={() => onGenerateSalarySlip(emp)}
                            style={{ color: '#059669' }}
                          >
                            <DollarSign size={16} />
                          </button>
                        )}
                        {onGenerateIdCard && (
                          <button
                            title="Staff ID Card"
                            onClick={() => onGenerateIdCard(emp.emp_id || emp.emp_code || '')}
                            style={{ color: '#2563eb' }}
                          >
                            <CreditCard size={16} />
                          </button>
                        )}
                        <button
                          title="Delete Record"
                          className="danger"
                          onClick={() => handleDelete(emp)}
                        >
                          <Trash2 size={16} />
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
      <div className="table-pagination">
        <span>
          Showing {(page - 1) * pageSize + 1} to{' '}
          {Math.min(page * pageSize, filteredEmployees.length)} of {filteredEmployees.length} records
        </span>
        <div className="page-buttons">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="page-btn"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="page-indicator">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="page-btn"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Multi-Section Employee Form Modal */}
      <EmployeeFormModal
        modalMode={modalMode}
        selectedEmp={selectedEmp}
        formState={formState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        updateForm={updateForm}
        toggleArrayItem={toggleArrayItem}
        closeModal={closeModal}
        handleSubmit={handleSubmit}
        submitting={submitting}
        departments={departments}
        classesList={classesList}
        subjectsList={subjectsList}
        handleDrivePhotoUpload={handleDrivePhotoUpload}
        uploadingPhotoDrive={uploadingPhotoDrive}
        handlePhotoUpload={handlePhotoUpload}
        uploadingPhoto={uploadingPhoto}
        handleDocUpload={handleDocUpload}
        uploadingDoc={uploadingDoc}
      />
      {showCsvModal && modules['employee_master'] && (
        <CsvImportModal
          mod={modules['employee_master']}
          onClose={() => setShowCsvModal(false)}
          onSuccess={(count, insertedItems) => {
            setShowCsvModal(false)
            setToast(`✓ Successfully imported ${count} staff records!`)
            if (insertedItems && insertedItems.length > 0) {
              setEmployees((prev) => {
                const combined = [...(insertedItems as unknown as Employee[]), ...prev]
                const seen = new Set<string>()
                const deduped: Employee[] = []
                for (const emp of combined) {
                  const eid = String(emp.emp_id || emp.emp_code || (emp as any)._docId || JSON.stringify(emp))
                  if (!seen.has(eid)) {
                    seen.add(eid)
                    deduped.push(emp)
                  }
                }
                try {
                  localStorage.setItem('sjes_table_employee_master', JSON.stringify(deduped))
                } catch {}

                // Sync to Google Sheet if connected
                if (googleConnected) {
                  syncAllEmployeesToGoogleSheet(deduped).then((res) => {
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

      {/* Google Apps Script Modal (code.gs) */}
      <EmployeeGoogleScriptModal
        isOpen={showAppsScriptModal}
        onClose={() => setShowAppsScriptModal(false)}
      />
    </div>
  )
}
