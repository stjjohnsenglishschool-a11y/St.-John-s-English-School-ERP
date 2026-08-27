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
  Check,
  CreditCard,
  Calendar,
  FileText,
  User,
  Phone,
  Home,
  HeartPulse,
  Award,
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
} from 'lucide-react'
import { supabase, uploadToSupabaseStorage, logActivity } from '../lib/supabase'
import { getCurrentAcademicYear, ACADEMIC_YEAR_OPTIONS, CURRENT_ACADEMIC_YEAR } from '../lib/academicYear'
import { modules } from '../modules'
import { downloadSampleCsv } from '../lib/csvUtils'
import CsvImportModal from './CsvImportModal'

type Student = {
  student_id?: string
  admission_no?: string
  admission_date?: string
  gr_number?: string
  roll_no?: string
  academic_year?: string
  class_name?: string
  section?: string
  house_name?: string
  student_status?: string
  full_name?: string
  first_name?: string
  middle_name?: string
  last_name?: string
  date_of_birth?: string
  gender?: string
  blood_group?: string
  nationality?: string
  religion?: string
  category?: string
  mother_tongue?: string
  student_photo_url?: string
  mobile_primary?: string
  student_email?: string
  father_name?: string
  father_mobile?: string
  father_whatsapp?: string
  father_email?: string
  father_occupation?: string
  mother_name?: string
  mother_mobile?: string
  mother_whatsapp?: string
  mother_email?: string
  mother_occupation?: string
  guardian_name?: string
  guardian_relation?: string
  guardian_mobile?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  address?: string
  permanent_address?: string
  previous_school?: string
  previous_class?: string
  medical_conditions?: string
  allergies?: string
  doctor_name?: string
  doctor_phone?: string
  birth_certificate_no?: string
  document_url?: string
  is_active?: boolean
  created_at?: string
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
  const [students, setStudents] = useState<Student[]>([])
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

  // Form / Profile Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [activeTab, setActiveTab] = useState<
    'admission' | 'personal' | 'contact' | 'parents' | 'address' | 'previous' | 'medical' | 'docs'
  >('admission')
  const [formState, setFormState] = useState<Student>({})
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showCsvModal, setShowCsvModal] = useState(false)

  // Fetch classes from class_master
  useEffect(() => {
    if (!supabase) return
    supabase
      .from('class_master')
      .select('class_name')
      .eq('is_active', true)
      .order('class_name')
      .then(({ data }) => {
        if (data) {
          const names = data.map((c) => c.class_name).filter(Boolean)
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

  // Load students
  const loadStudents = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('student_master')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      console.warn('Error loading students:', err)
      setToast(err instanceof Error ? err.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()

    if (!supabase) return
    const channel = supabase
      .channel('rt-student-master')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_master' },
        () => {
          loadStudents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filtering
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.admission_no && s.admission_no.toLowerCase().includes(q)) ||
        (s.roll_no && s.roll_no.toLowerCase().includes(q)) ||
        (s.mobile_primary && s.mobile_primary.includes(q)) ||
        (s.father_name && s.father_name.toLowerCase().includes(q)) ||
        (s.father_mobile && s.father_mobile.includes(q))

      const matchClass = !filterClass || s.class_name === filterClass
      const matchSection = !filterSection || s.section === filterSection
      const matchGender = !filterGender || s.gender === filterGender
      const matchStatus =
        !filterStatus ||
        (filterStatus === 'active' ? s.is_active !== false : s.student_status === filterStatus)
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
    setActiveTab('admission')
    if (mode === 'create') {
      const year = getCurrentAcademicYear()
      setFormState({
        admission_no: `ADM-${Date.now().toString().slice(-4)}`,
        admission_date: new Date().toISOString().slice(0, 10),
        academic_year: year,
        class_name: classes[0] || 'CLASS I',
        section: 'A',
        student_status: 'Active',
        is_active: true,
        nationality: 'Indian',
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
    setFormState((prev) => {
      const next = { ...prev, [key]: value }

      // Auto update full_name if first/middle/last change
      if (key === 'first_name' || key === 'middle_name' || key === 'last_name') {
        const parts = [
          key === 'first_name' ? value : next.first_name,
          key === 'middle_name' ? value : next.middle_name,
          key === 'last_name' ? value : next.last_name,
        ]
          .filter(Boolean)
          .map(String)
        next.full_name = parts.join(' ').trim()
      }

      return next
    })
  }

  // Copy current address to permanent
  const copyAddress = () => {
    if (formState.address) {
      updateForm('permanent_address', formState.address)
      setToast('Permanent address set identical to current address')
    }
  }

  // Photo Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const url = await uploadToSupabaseStorage(
        file,
        'school-documents',
        `students/${formState.admission_no || 'profile'}/photos`
      )
      updateForm('student_photo_url', url)
      setToast('Student photo uploaded successfully')
    } catch {
      setToast('Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Document Upload Handler
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingDoc(true)
    try {
      const url = await uploadToSupabaseStorage(
        file,
        'school-documents',
        `students/${formState.admission_no || 'profile'}/documents`
      )
      updateForm('document_url', url)
      setToast('Student document uploaded')
    } catch {
      setToast('Document upload failed')
    } finally {
      setUploadingDoc(false)
    }
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    if (!formState.admission_no || !formState.full_name || !formState.class_name) {
      setToast('Please fill in Admission No, Full Name, and Class.')
      return
    }

    setSubmitting(true)
    try {
      // Sanitize payload to avoid postgres type errors on empty strings
      const payload: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(formState)) {
        if (k === 'student_id' && modalMode === 'create') continue
        if (v === '' || v === undefined) {
          if (modalMode === 'edit') {
            payload[k] = null
          }
        } else if (k === 'roll_no') {
          payload[k] = String(v).trim()
        } else {
          payload[k] = v
        }
      }

      if (modalMode === 'create') {
        const { error } = await supabase.from('student_master').insert([payload])
        if (error) throw error
        await logActivity({
          action: `Admitted new student: ${formState.full_name} (${formState.admission_no})`,
          module: 'student_master',
        })
        setToast(`Student ${formState.full_name} registered successfully`)
      } else if (modalMode === 'edit' && selectedStudent?.student_id) {
        const { error } = await supabase
          .from('student_master')
          .update(payload)
          .eq('student_id', selectedStudent.student_id)
        if (error) throw error
        await logActivity({
          action: `Updated student record: ${formState.full_name} (${formState.admission_no})`,
          module: 'student_master',
        })
        setToast('Student profile updated')
      }
      closeModal()
      loadStudents()
    } catch (err) {
      console.warn('Save error:', err)
      setToast(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Student
  const handleDelete = async (student: Student) => {
    if (!supabase || !student.student_id) return
    if (!confirm(`Are you sure you want to remove ${student.full_name}?`)) return

    try {
      const { error } = await supabase
        .from('student_master')
        .delete()
        .eq('student_id', student.student_id)
      if (error) throw error
      await logActivity({
        action: `Deleted student: ${student.full_name} (${student.admission_no})`,
        module: 'student_master',
      })
      setToast('Student record deleted')
      loadStudents()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Admission No',
      'Roll No',
      'Full Name',
      'Class',
      'Section',
      'Academic Year',
      'Gender',
      'DOB',
      'Father Name',
      'Father Mobile',
      'Mother Name',
      'Address',
      'Blood Group',
      'Status',
    ]
    const rows = filteredStudents.map((s) => [
      s.admission_no || '',
      s.roll_no || '',
      s.full_name || '',
      s.class_name || '',
      s.section || '',
      s.academic_year || '',
      s.gender || '',
      s.date_of_birth || '',
      s.father_name || '',
      s.father_mobile || '',
      s.mother_name || '',
      `"${(s.address || '').replace(/"/g, '""')}"`,
      s.blood_group || '',
      s.student_status || (s.is_active ? 'Active' : 'Inactive'),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Student_Master_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    setToast('Student roster exported to CSV')
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
          <p>Comprehensive admission, academic, parent contact, medical, and document directory</p>
        </div>
        <div className="hero-actions">
          <button
            className="btn-secondary"
            onClick={() => downloadSampleCsv(modules.student_master)}
            title="Download pre-filled sample CSV template for bulk student upload"
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
          <button className="btn-secondary" onClick={loadStudents} title="Reload records">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button className="btn-primary" onClick={() => openModal('create')}>
            <Plus size={16} /> New Admission
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="studio-filters-card">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, admission no, roll no, mobile, father name..."
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
            <option value="Active">Active</option>
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
              <th>Father Name</th>
              <th>Contact Phone</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="table-loading">
                  <div className="loader-spinner" /> Loading student records from database...
                </td>
              </tr>
            ) : paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-empty">
                  <User size={36} opacity={0.4} />
                  <p>No students found matching current filters.</p>
                  <button className="btn-primary-sm" onClick={() => openModal('create')}>
                    <Plus size={14} /> Register New Student
                  </button>
                </td>
              </tr>
            ) : (
              paginatedStudents.map((student) => (
                <tr key={student.student_id || student.admission_no}>
                  <td>
                    <div className="table-avatar">
                      {student.student_photo_url ? (
                        <img
                          src={student.student_photo_url}
                          alt={student.full_name}
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <span>{student.full_name?.slice(0, 2).toUpperCase() || 'ST'}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="code-pill">{student.admission_no}</span>
                  </td>
                  <td>
                    <div className="name-cell">
                      <b>{student.full_name}</b>
                      <small>{student.academic_year || '2025-2026'}</small>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-light">
                      {student.class_name || 'N/A'}{' '}
                      {student.section ? `- ${student.section}` : ''}
                    </span>
                  </td>
                  <td>{student.roll_no || '—'}</td>
                  <td>{student.father_name || '—'}</td>
                  <td>
                    <a
                      href={`tel:${student.father_mobile || student.mobile_primary}`}
                      className="contact-link"
                    >
                      {student.father_mobile || student.mobile_primary || '—'}
                    </a>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        student.student_status === 'Active' || student.is_active
                          ? 'status-active'
                          : 'status-inactive'
                      }`}
                    >
                      {student.student_status || (student.is_active ? 'Active' : 'Inactive')}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        title="View Full Profile"
                        onClick={() => openModal('view', student)}
                      >
                        <Eye size={16} />
                      </button>
                      <button title="Edit Student" onClick={() => openModal('edit', student)}>
                        <Edit3 size={16} />
                      </button>
                      {onNavigateToIdCard && (
                        <button
                          title="Generate ID Card"
                          onClick={() => onNavigateToIdCard(student.student_id || '')}
                          style={{ color: '#2563eb' }}
                        >
                          <CreditCard size={16} />
                        </button>
                      )}
                      <button
                        title="Delete Record"
                        className="danger"
                        onClick={() => handleDelete(student)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="table-pagination">
        <span>
          Showing {(page - 1) * pageSize + 1} to{' '}
          {Math.min(page * pageSize, filteredStudents.length)} of {filteredStudents.length} students
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

      {/* Multi-Section Admission & Profile Modal */}
      {modalMode && (
        <div className="modal-bg">
          <div className="multi-section-modal">
            {/* Modal Header */}
            <div className="modal-header">
              <div className="header-info">
                <span className="modal-tag">STUDENT MASTER</span>
                <h2>
                  {modalMode === 'create'
                    ? 'New Student Registration'
                    : modalMode === 'edit'
                    ? `Edit Student: ${formState.full_name}`
                    : `Student Profile: ${selectedStudent?.full_name}`}
                </h2>
              </div>
              <button className="close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="modal-tab-bar">
              <button
                className={`tab-btn ${activeTab === 'admission' ? 'active' : ''}`}
                onClick={() => setActiveTab('admission')}
              >
                1. Admission
              </button>
              <button
                className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('personal')}
              >
                2. Personal
              </button>
              <button
                className={`tab-btn ${activeTab === 'parents' ? 'active' : ''}`}
                onClick={() => setActiveTab('parents')}
              >
                3. Parents & Guardian
              </button>
              <button
                className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
                onClick={() => setActiveTab('contact')}
              >
                4. Student Contact
              </button>
              <button
                className={`tab-btn ${activeTab === 'address' ? 'active' : ''}`}
                onClick={() => setActiveTab('address')}
              >
                5. Address
              </button>
              <button
                className={`tab-btn ${activeTab === 'previous' ? 'active' : ''}`}
                onClick={() => setActiveTab('previous')}
              >
                6. Previous School
              </button>
              <button
                className={`tab-btn ${activeTab === 'medical' ? 'active' : ''}`}
                onClick={() => setActiveTab('medical')}
              >
                7. Medical
              </button>
              <button
                className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
                onClick={() => setActiveTab('docs')}
              >
                8. Documents
              </button>
            </div>

            {/* Modal Body / Tab Content */}
            <form onSubmit={handleSubmit} className="modal-body-form">
              {/* TAB 1: ADMISSION */}
              {activeTab === 'admission' && (
                <div className="tab-pane">
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
                      <span>Admission Date</span>
                      <input
                        type="date"
                        disabled={modalMode === 'view'}
                        value={formState.admission_date || ''}
                        onChange={(e) => updateForm('admission_date', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>GR Number</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.gr_number || ''}
                        onChange={(e) => updateForm('gr_number', e.target.value)}
                      />
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
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.section || 'A'}
                        onChange={(e) => updateForm('section', e.target.value)}
                      >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                        <option value="D">Section D</option>
                      </select>
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
                  </div>

                  <div className="form-row-3">
                    <label>
                      <span>Academic Year</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.academic_year || CURRENT_ACADEMIC_YEAR}
                        onChange={(e) => updateForm('academic_year', e.target.value)}
                      >
                        {ACADEMIC_YEAR_OPTIONS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr} {yr === CURRENT_ACADEMIC_YEAR ? '(Current Session)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>House Name</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.house_name || ''}
                        onChange={(e) => updateForm('house_name', e.target.value)}
                      >
                        <option value="">None</option>
                        <option value="Red House (Ruby)">Red House (Ruby)</option>
                        <option value="Blue House (Sapphire)">Blue House (Sapphire)</option>
                        <option value="Green House (Emerald)">Green House (Emerald)</option>
                        <option value="Yellow House (Topaz)">Yellow House (Topaz)</option>
                      </select>
                    </label>
                    <label>
                      <span>Student Status</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.student_status || 'Active'}
                        onChange={(e) => updateForm('student_status', e.target.value)}
                      >
                        <option value="Active">Active</option>
                        <option value="New Admission">New Admission</option>
                        <option value="Promoted">Promoted</option>
                        <option value="Left">Left</option>
                        <option value="Alumni">Alumni</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: PERSONAL */}
              {activeTab === 'personal' && (
                <div className="tab-pane">
                  <div className="photo-upload-section">
                    <div className="avatar-preview-box">
                      {formState.student_photo_url ? (
                        <img src={formState.student_photo_url} alt="Student" />
                      ) : (
                        <User size={48} opacity={0.3} />
                      )}
                    </div>
                    {modalMode !== 'view' && (
                      <div className="photo-actions">
                        <label className="btn-upload-label">
                          <Upload size={14} />{' '}
                          {uploadingPhoto ? 'Uploading...' : 'Upload Student Photo'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            disabled={uploadingPhoto}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <small>Max 2MB · PNG, JPG, JPEG</small>
                      </div>
                    )}
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
                        value={formState.first_name || ''}
                        onChange={(e) => updateForm('first_name', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Middle Name</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.middle_name || ''}
                        onChange={(e) => updateForm('middle_name', e.target.value)}
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
                        value={formState.last_name || ''}
                        onChange={(e) => updateForm('last_name', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-row-3">
                    <label>
                      <span>
                        Full Name <b>*</b>
                      </span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        required
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
                  </div>

                  <div className="form-row-4">
                    <label>
                      <span>Blood Group</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.blood_group || ''}
                        onChange={(e) => updateForm('blood_group', e.target.value)}
                      >
                        <option value="">Unknown</option>
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
                    <label>
                      <span>Nationality</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.nationality || 'Indian'}
                        onChange={(e) => updateForm('nationality', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Religion</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.religion || ''}
                        placeholder="e.g. Christian, Hindu, Muslim"
                        onChange={(e) => updateForm('religion', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Category</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.category || 'General'}
                        onChange={(e) => updateForm('category', e.target.value)}
                      >
                        <option value="General">General</option>
                        <option value="OBC">OBC</option>
                        <option value="SC">SC</option>
                        <option value="ST">ST</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 3: PARENTS & GUARDIAN */}
              {activeTab === 'parents' && (
                <div className="tab-pane">
                  <h4 className="section-title">Father Details</h4>
                  <div className="form-row-3">
                    <label>
                      <span>Father Name</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.father_name || ''}
                        onChange={(e) => updateForm('father_name', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Father Mobile</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formState.father_mobile || ''}
                        onChange={(e) => updateForm('father_mobile', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Father WhatsApp</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formState.father_whatsapp || ''}
                        onChange={(e) => updateForm('father_whatsapp', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="form-row-2">
                    <label>
                      <span>Father Email</span>
                      <input
                        type="email"
                        disabled={modalMode === 'view'}
                        value={formState.father_email || ''}
                        onChange={(e) => updateForm('father_email', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Father Occupation</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.father_occupation || ''}
                        onChange={(e) => updateForm('father_occupation', e.target.value)}
                      />
                    </label>
                  </div>

                  <h4 className="section-title" style={{ marginTop: '1.5rem' }}>
                    Mother Details
                  </h4>
                  <div className="form-row-3">
                    <label>
                      <span>Mother Name</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.mother_name || ''}
                        onChange={(e) => updateForm('mother_name', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Mother Mobile</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formState.mother_mobile || ''}
                        onChange={(e) => updateForm('mother_mobile', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Mother WhatsApp</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formState.mother_whatsapp || ''}
                        onChange={(e) => updateForm('mother_whatsapp', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="form-row-2">
                    <label>
                      <span>Mother Email</span>
                      <input
                        type="email"
                        disabled={modalMode === 'view'}
                        value={formState.mother_email || ''}
                        onChange={(e) => updateForm('mother_email', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Mother Occupation</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.mother_occupation || ''}
                        onChange={(e) => updateForm('mother_occupation', e.target.value)}
                      />
                    </label>
                  </div>

                  <h4 className="section-title" style={{ marginTop: '1.5rem' }}>
                    Guardian & Emergency Contact
                  </h4>
                  <div className="form-row-3">
                    <label>
                      <span>Guardian Name</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.guardian_name || ''}
                        onChange={(e) => updateForm('guardian_name', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Relationship</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        placeholder="e.g. Uncle, Grandfather"
                        value={formState.guardian_relation || ''}
                        onChange={(e) => updateForm('guardian_relation', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Guardian Mobile</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formState.guardian_mobile || ''}
                        onChange={(e) => updateForm('guardian_mobile', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 4: STUDENT CONTACT */}
              {activeTab === 'contact' && (
                <div className="tab-pane">
                  <div className="form-row-2">
                    <label>
                      <span>Primary Mobile Phone</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formState.mobile_primary || ''}
                        placeholder="e.g. +91 9876543210"
                        onChange={(e) => updateForm('mobile_primary', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Student Email Address</span>
                      <input
                        type="email"
                        disabled={modalMode === 'view'}
                        value={formState.student_email || ''}
                        placeholder="student@school.edu"
                        onChange={(e) => updateForm('student_email', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="form-row-2">
                    <label>
                      <span>Emergency Contact Person</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.emergency_contact_name || ''}
                        onChange={(e) => updateForm('emergency_contact_name', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Emergency Contact Phone</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formState.emergency_contact_phone || ''}
                        onChange={(e) => updateForm('emergency_contact_phone', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 5: ADDRESS */}
              {activeTab === 'address' && (
                <div className="tab-pane">
                  <label className="full">
                    <span>Current Residential Address</span>
                    <textarea
                      rows={3}
                      disabled={modalMode === 'view'}
                      value={formState.address || ''}
                      placeholder="Street, locality, area, city, pincode"
                      onChange={(e) => updateForm('address', e.target.value)}
                    />
                  </label>

                  {modalMode !== 'view' && (
                    <div style={{ margin: '0.75rem 0' }}>
                      <button type="button" className="btn-secondary-sm" onClick={copyAddress}>
                        Same as Current Address
                      </button>
                    </div>
                  )}

                  <label className="full">
                    <span>Permanent Address</span>
                    <textarea
                      rows={3}
                      disabled={modalMode === 'view'}
                      value={formState.permanent_address || ''}
                      placeholder="Permanent address if different from current"
                      onChange={(e) => updateForm('permanent_address', e.target.value)}
                    />
                  </label>
                </div>
              )}

              {/* TAB 6: PREVIOUS SCHOOL */}
              {activeTab === 'previous' && (
                <div className="tab-pane">
                  <div className="form-row-2">
                    <label>
                      <span>Previous School Name</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.previous_school || ''}
                        onChange={(e) => updateForm('previous_school', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Previous Class Attended</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.previous_class || ''}
                        onChange={(e) => updateForm('previous_class', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 7: MEDICAL */}
              {activeTab === 'medical' && (
                <div className="tab-pane">
                  <div className="form-row-2">
                    <label>
                      <span>Known Medical Conditions / Chronic Illness</span>
                      <textarea
                        rows={2}
                        disabled={modalMode === 'view'}
                        value={formState.medical_conditions || ''}
                        placeholder="e.g. Asthma, Diabetes, Heart condition"
                        onChange={(e) => updateForm('medical_conditions', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Known Allergies</span>
                      <textarea
                        rows={2}
                        disabled={modalMode === 'view'}
                        value={formState.allergies || ''}
                        placeholder="e.g. Peanut allergy, Penicillin allergy"
                        onChange={(e) => updateForm('allergies', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="form-row-2">
                    <label>
                      <span>Family Doctor / Clinic Name</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.doctor_name || ''}
                        onChange={(e) => updateForm('doctor_name', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Doctor Phone Number</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formState.doctor_phone || ''}
                        onChange={(e) => updateForm('doctor_phone', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 8: DOCUMENTS */}
              {activeTab === 'docs' && (
                <div className="tab-pane">
                  <div className="form-row-2">
                    <label>
                      <span>Birth Certificate / Aadhaar Number</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.birth_certificate_no || ''}
                        onChange={(e) => updateForm('birth_certificate_no', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Document URL</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.document_url || ''}
                        placeholder="https://..."
                        onChange={(e) => updateForm('document_url', e.target.value)}
                      />
                    </label>
                  </div>

                  {modalMode !== 'view' && (
                    <div style={{ marginTop: '1rem' }}>
                      <label className="btn-upload-label">
                        <Upload size={14} />{' '}
                        {uploadingDoc ? 'Uploading document...' : 'Upload Document to Supabase Storage'}
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={handleDocUpload}
                          disabled={uploadingDoc}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  )}

                  {formState.document_url && (
                    <div style={{ marginTop: '1rem' }}>
                      <a
                        href={formState.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="contact-link"
                      >
                        <FileText size={16} /> View Attached Document Link
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {modalMode !== 'view' && (
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : modalMode === 'edit' ? 'Save Changes' : 'Register Student'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {showCsvModal && modules['student_master'] && (
        <CsvImportModal
          mod={modules['student_master']}
          onClose={() => setShowCsvModal(false)}
          onSuccess={(count) => {
            setToast(`✓ Successfully imported ${count} students!`)
            loadStudents()
          }}
        />
      )}
    </div>
  )
}
