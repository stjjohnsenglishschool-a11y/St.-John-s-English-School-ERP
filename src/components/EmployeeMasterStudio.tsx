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
} from 'lucide-react'
import { supabase, uploadToSupabaseStorage, logActivity } from '../lib/supabase'
import { getCurrentAcademicYear, ACADEMIC_YEAR_OPTIONS, CURRENT_ACADEMIC_YEAR } from '../lib/academicYear'
import { modules } from '../modules'
import CsvImportModal from './CsvImportModal'

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
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterYear, setFilterYear] = useState('')

  const [page, setPage] = useState(1)
  const pageSize = 15

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

  // Load masters for relationships
  useEffect(() => {
    if (!supabase) return

    // Departments
    supabase
      .from('department_master')
      .select('department_name')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDepartments(data.map((d) => d.department_name).filter(Boolean))
        } else {
          setDepartments(['Academics', 'Administration', 'Accounts', 'Sports', 'Science', 'Arts'])
        }
      })

    // Classes
    supabase
      .from('class_master')
      .select('class_name')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setClassesList(data.map((c) => c.class_name).filter(Boolean))
        } else {
          setClassesList(['CLASS I', 'CLASS II', 'CLASS III', 'CLASS IV', 'CLASS V', 'CLASS VI', 'CLASS VII', 'CLASS VIII'])
        }
      })

    // Subjects
    supabase
      .from('subject_master')
      .select('subject_name')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const unique = Array.from(new Set(data.map((s) => s.subject_name).filter(Boolean)))
          setSubjectsList(unique)
        } else {
          setSubjectsList(['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Bengali', 'Computer Science'])
        }
      })
  }, [])

  // Load Employees
  const loadEmployees = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('employee_master')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setEmployees(data || [])
    } catch (err) {
      console.warn('Error loading employees:', err)
      setToast(err instanceof Error ? err.message : 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()

    if (!supabase) return
    const channel = supabase
      .channel('rt-employee-master')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employee_master' },
        () => {
          loadEmployees()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filtering
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const q = search.toLowerCase()
      const fullName = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase()
      const matchSearch =
        !q ||
        fullName.includes(q) ||
        (e.emp_code && e.emp_code.toLowerCase().includes(q)) ||
        (e.mobile_primary && e.mobile_primary.includes(q)) ||
        (e.official_email && e.official_email.toLowerCase().includes(q)) ||
        (e.designation && e.designation.toLowerCase().includes(q))

      const matchDept = !filterDept || e.department === filterDept
      const matchCategory = !filterCategory || e.employee_category === filterCategory
      const matchStatus =
        !filterStatus ||
        (filterStatus === 'Active' ? e.is_active !== false : e.employment_status === filterStatus)
      const matchYear = !filterYear || e.academic_year === filterYear

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
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  // Toggle multi-select items
  const toggleArrayItem = (key: 'subject_specialisation' | 'classes_assigned', item: string) => {
    setFormState((prev) => {
      const current = (prev[key] || []) as string[]
      const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item]
      return { ...prev, [key]: next }
    })
  }

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const url = await uploadToSupabaseStorage(
        file,
        'school-documents',
        `employees/${formState.emp_code || 'staff'}/photos`
      )
      updateForm('employee_photo_url', url)
      setToast('Staff photograph updated')
    } catch {
      setToast('Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Document upload
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingDoc(true)
    try {
      const url = await uploadToSupabaseStorage(
        file,
        'school-documents',
        `employees/${formState.emp_code || 'staff'}/documents`
      )
      updateForm('document_url', url)
      setToast('Staff document uploaded')
    } catch {
      setToast('Document upload failed')
    } finally {
      setUploadingDoc(false)
    }
  }

  // Save handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    if (!formState.emp_code || !formState.first_name || !formState.last_name) {
      setToast('Please enter Employee Code, First Name, and Last Name.')
      return
    }

    setSubmitting(true)
    try {
      // Sanitize payload to avoid postgres type errors on empty strings
      const payload: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(formState)) {
        if (k === 'emp_id' && modalMode === 'create') continue
        if (v === '' || v === undefined) {
          if (modalMode === 'edit') {
            payload[k] = null
          }
        } else if (k === 'basic_salary' || k === 'total_experience_years') {
          const num = Number(v)
          payload[k] = isNaN(num) ? (modalMode === 'edit' ? null : undefined) : num
        } else {
          payload[k] = v
        }
      }

      if (modalMode === 'create') {
        const { error } = await supabase.from('employee_master').insert([payload])
        if (error) throw error
        await logActivity({
          action: `Added new employee: ${formState.first_name} ${formState.last_name} (${formState.emp_code})`,
          module: 'employee_master',
        })
        setToast(`Staff member registered successfully`)
      } else if (modalMode === 'edit' && selectedEmp?.emp_id) {
        const { error } = await supabase
          .from('employee_master')
          .update(payload)
          .eq('emp_id', selectedEmp.emp_id)
        if (error) throw error
        await logActivity({
          action: `Updated employee: ${formState.first_name} ${formState.last_name} (${formState.emp_code})`,
          module: 'employee_master',
        })
        setToast('Staff record updated')
      }
      closeModal()
      loadEmployees()
    } catch (err) {
      console.warn('Employee save error:', err)
      setToast(err instanceof Error ? err.message : 'Save operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete
  const handleDelete = async (emp: Employee) => {
    if (!supabase || !emp.emp_id) return
    if (!confirm(`Delete employee record for ${emp.first_name} ${emp.last_name}?`)) return

    try {
      const { error } = await supabase
        .from('employee_master')
        .delete()
        .eq('emp_id', emp.emp_id)
      if (error) throw error
      await logActivity({
        action: `Deleted employee: ${emp.first_name} ${emp.last_name} (${emp.emp_code})`,
        module: 'employee_master',
      })
      setToast('Employee record deleted')
      loadEmployees()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Emp Code',
      'First Name',
      'Last Name',
      'Category',
      'Department',
      'Designation',
      'Mobile',
      'Email',
      'Joining Date',
      'Basic Salary',
      'Status',
    ]
    const rows = filteredEmployees.map((e) => [
      e.emp_code || '',
      e.first_name || '',
      e.last_name || '',
      e.employee_category || '',
      e.department || '',
      e.designation || '',
      e.mobile_primary || '',
      e.official_email || e.personal_email || '',
      e.date_of_joining || '',
      e.basic_salary || '',
      e.employment_status || (e.is_active ? 'Active' : 'Inactive'),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Employee_Master_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    setToast('Employee list exported to CSV')
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
          <button className="btn-secondary" onClick={handleExportCsv} title="Export CSV">
            <Download size={16} /> Export CSV
          </button>
          <button
            className="btn-secondary"
            onClick={() => setShowCsvModal(true)}
            title="Import employee roster from CSV"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button className="btn-secondary" onClick={loadEmployees} title="Reload">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button className="btn-primary" onClick={() => openModal('create')}>
            <Plus size={16} /> Add Employee
          </button>
        </div>
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
            <option value="On Leave">On Leave</option>
            <option value="Suspended">Suspended</option>
            <option value="Resigned">Resigned</option>
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
                  <p>No staff records found.</p>
                  <button className="btn-primary-sm" onClick={() => openModal('create')}>
                    <Plus size={14} /> Add New Employee
                  </button>
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp) => (
                <tr key={emp.emp_id || emp.emp_code}>
                  <td>
                    <div className="table-avatar">
                      {emp.employee_photo_url ? (
                        <img
                          src={emp.employee_photo_url}
                          alt={emp.first_name}
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <span>{emp.first_name?.slice(0, 1) || 'E'}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="code-pill">{emp.emp_code}</span>
                  </td>
                  <td>
                    <div className="name-cell">
                      <b>
                        {emp.first_name} {emp.last_name}
                      </b>
                      <small>{emp.official_email || emp.personal_email || 'No email'}</small>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-light">{emp.employee_category}</span>
                  </td>
                  <td>{emp.department || '—'}</td>
                  <td>{emp.designation || '—'}</td>
                  <td>
                    <a href={`tel:${emp.mobile_primary}`} className="contact-link">
                      {emp.mobile_primary || '—'}
                    </a>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        emp.employment_status === 'Active' || emp.is_active
                          ? 'status-active'
                          : 'status-inactive'
                      }`}
                    >
                      {emp.employment_status || (emp.is_active ? 'Active' : 'Inactive')}
                    </span>
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
                          onClick={() => onGenerateIdCard(emp.emp_id || '')}
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
              ))
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
      {modalMode && (
        <div className="modal-bg">
          <div className="multi-section-modal">
            {/* Header */}
            <div className="modal-header">
              <div className="header-info">
                <span className="modal-tag">EMPLOYEE MASTER</span>
                <h2>
                  {modalMode === 'create'
                    ? 'Add New Staff / Faculty Member'
                    : modalMode === 'edit'
                    ? `Edit: ${formState.first_name} ${formState.last_name}`
                    : `Staff Profile: ${selectedEmp?.first_name} ${selectedEmp?.last_name}`}
                </h2>
              </div>
              <button className="close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="modal-tab-bar">
              <button
                className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('personal')}
              >
                1. Personal
              </button>
              <button
                className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
                onClick={() => setActiveTab('contact')}
              >
                2. Contact & Address
              </button>
              <button
                className={`tab-btn ${activeTab === 'employment' ? 'active' : ''}`}
                onClick={() => setActiveTab('employment')}
              >
                3. Employment
              </button>
              <button
                className={`tab-btn ${activeTab === 'qualification' ? 'active' : ''}`}
                onClick={() => setActiveTab('qualification')}
              >
                4. Qualification
              </button>
              <button
                className={`tab-btn ${activeTab === 'teaching' ? 'active' : ''}`}
                onClick={() => setActiveTab('teaching')}
              >
                5. Teaching Assignment
              </button>
              <button
                className={`tab-btn ${activeTab === 'salary' ? 'active' : ''}`}
                onClick={() => setActiveTab('salary')}
              >
                6. Salary
              </button>
              <button
                className={`tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
                onClick={() => setActiveTab('bank')}
              >
                7. Banking & PAN
              </button>
              <button
                className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
                onClick={() => setActiveTab('docs')}
              >
                8. Documents
              </button>
            </div>

            {/* Tab Form */}
            <form onSubmit={handleSubmit} className="modal-body-form">
              {/* TAB 1: PERSONAL */}
              {activeTab === 'personal' && (
                <div className="tab-pane">
                  <div className="photo-upload-section">
                    <div className="avatar-preview-box">
                      {formState.employee_photo_url ? (
                        <img src={formState.employee_photo_url} alt="Staff" />
                      ) : (
                        <User size={48} opacity={0.3} />
                      )}
                    </div>
                    {modalMode !== 'view' && (
                      <div className="photo-actions">
                        <label className="btn-upload-label">
                          <Upload size={14} />{' '}
                          {uploadingPhoto ? 'Uploading...' : 'Upload Staff Photograph'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            disabled={uploadingPhoto}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <small>Max 2MB · PNG, JPG</small>
                      </div>
                    )}
                  </div>

                  <div className="form-row-3">
                    <label>
                      <span>
                        Employee Code <b>*</b>
                      </span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        required
                        value={formState.emp_code || ''}
                        onChange={(e) => updateForm('emp_code', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>
                        Employee Category <b>*</b>
                      </span>
                      <select
                        disabled={modalMode === 'view'}
                        required
                        value={formState.employee_category || 'Teaching Staff'}
                        onChange={(e) => updateForm('employee_category', e.target.value)}
                      >
                        <option value="Teaching Staff">Teaching Staff</option>
                        <option value="Non-Teaching Staff">Non-Teaching Staff</option>
                        <option value="Management">Management</option>
                      </select>
                    </label>
                    <label>
                      <span>Marital Status</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.marital_status || 'Single'}
                        onChange={(e) => updateForm('marital_status', e.target.value)}
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Other">Other</option>
                      </select>
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
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACT & ADDRESS */}
              {activeTab === 'contact' && (
                <div className="tab-pane">
                  <div className="form-row-2">
                    <label>
                      <span>Primary Mobile</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formState.mobile_primary || ''}
                        placeholder="+91 9876543210"
                        onChange={(e) => updateForm('mobile_primary', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>WhatsApp Number</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formState.whatsapp_number || ''}
                        onChange={(e) => updateForm('whatsapp_number', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-row-2">
                    <label>
                      <span>Official Email</span>
                      <input
                        type="email"
                        disabled={modalMode === 'view'}
                        value={formState.official_email || ''}
                        placeholder="teacher@school.edu"
                        onChange={(e) => updateForm('official_email', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Personal Email</span>
                      <input
                        type="email"
                        disabled={modalMode === 'view'}
                        value={formState.personal_email || ''}
                        onChange={(e) => updateForm('personal_email', e.target.value)}
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
                      <span>Emergency Phone</span>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formState.emergency_contact_phone || ''}
                        onChange={(e) => updateForm('emergency_contact_phone', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-row-2">
                    <label className="full">
                      <span>Current Residential Address</span>
                      <textarea
                        rows={2}
                        disabled={modalMode === 'view'}
                        value={formState.current_address || ''}
                        onChange={(e) => updateForm('current_address', e.target.value)}
                      />
                    </label>
                    <label className="full">
                      <span>Permanent Address</span>
                      <textarea
                        rows={2}
                        disabled={modalMode === 'view'}
                        value={formState.permanent_address || ''}
                        onChange={(e) => updateForm('permanent_address', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 3: EMPLOYMENT */}
              {activeTab === 'employment' && (
                <div className="tab-pane">
                  <div className="form-row-3">
                    <label>
                      <span>Department</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.department || ''}
                        onChange={(e) => updateForm('department', e.target.value)}
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Designation</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.designation || ''}
                        placeholder="e.g. Senior Maths Teacher"
                        onChange={(e) => updateForm('designation', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Employment Type</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.employment_type || 'Permanent'}
                        onChange={(e) => updateForm('employment_type', e.target.value)}
                      >
                        <option value="Permanent">Permanent</option>
                        <option value="Contract">Contract</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Temporary">Temporary</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-row-3">
                    <label>
                      <span>Employment Status</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.employment_status || 'Active'}
                        onChange={(e) => updateForm('employment_status', e.target.value)}
                      >
                        <option value="Active">Active</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Resigned">Resigned</option>
                        <option value="Retired">Retired</option>
                      </select>
                    </label>
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
                      <span>Duty Shift Timing</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.shift_name || ''}
                        placeholder="8:00 AM - 2:00 PM"
                        onChange={(e) => updateForm('shift_name', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-row-3">
                    <label>
                      <span>Date of Joining</span>
                      <input
                        type="date"
                        disabled={modalMode === 'view'}
                        value={formState.date_of_joining || ''}
                        onChange={(e) => updateForm('date_of_joining', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Confirmation Date</span>
                      <input
                        type="date"
                        disabled={modalMode === 'view'}
                        value={formState.confirmation_date || ''}
                        onChange={(e) => updateForm('confirmation_date', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Reporting Manager</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.reporting_to || ''}
                        placeholder="Principal / Head of Dept"
                        onChange={(e) => updateForm('reporting_to', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 4: QUALIFICATION */}
              {activeTab === 'qualification' && (
                <div className="tab-pane">
                  <div className="form-row-2">
                    <label>
                      <span>Highest Academic Qualification</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.qualification || ''}
                        placeholder="e.g. M.Sc. in Physics, B.Sc. Mathematics"
                        onChange={(e) => updateForm('qualification', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Professional Qualification</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.professional_qualification || ''}
                        placeholder="e.g. B.Ed., D.El.Ed., CTET Certified"
                        onChange={(e) =>
                          updateForm('professional_qualification', e.target.value)
                        }
                      />
                    </label>
                  </div>
                  <div className="form-row-2">
                    <label>
                      <span>Total Teaching Experience (Years)</span>
                      <input
                        type="number"
                        disabled={modalMode === 'view'}
                        value={formState.total_experience_years || 0}
                        onChange={(e) =>
                          updateForm('total_experience_years', Number(e.target.value))
                        }
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 5: TEACHING ASSIGNMENT */}
              {activeTab === 'teaching' && (
                <div className="tab-pane">
                  <div className="multi-select-section">
                    <label>
                      <span>Subject Specialisation (Multi-Select)</span>
                    </label>
                    <div className="chips-grid">
                      {subjectsList.map((subj) => {
                        const selected = (formState.subject_specialisation || []).includes(subj)
                        return (
                          <button
                            type="button"
                            key={subj}
                            disabled={modalMode === 'view'}
                            className={`chip-toggle ${selected ? 'active' : ''}`}
                            onClick={() => toggleArrayItem('subject_specialisation', subj)}
                          >
                            {subj}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="multi-select-section" style={{ marginTop: '1.5rem' }}>
                    <label>
                      <span>Assigned Classes (Multi-Select)</span>
                    </label>
                    <div className="chips-grid">
                      {classesList.map((cls) => {
                        const selected = (formState.classes_assigned || []).includes(cls)
                        return (
                          <button
                            type="button"
                            key={cls}
                            disabled={modalMode === 'view'}
                            className={`chip-toggle ${selected ? 'active' : ''}`}
                            onClick={() => toggleArrayItem('classes_assigned', cls)}
                          >
                            {cls}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="form-row-2" style={{ marginTop: '1.5rem' }}>
                    <label>
                      <span>Class Teacher Of (Optional)</span>
                      <select
                        disabled={modalMode === 'view'}
                        value={formState.class_teacher_of || ''}
                        onChange={(e) => updateForm('class_teacher_of', e.target.value)}
                      >
                        <option value="">None</option>
                        {classesList.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Section Assigned</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.section_assigned || ''}
                        placeholder="e.g. A, B"
                        onChange={(e) => updateForm('section_assigned', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 6: SALARY */}
              {activeTab === 'salary' && (
                <div className="tab-pane">
                  <div className="form-row-2">
                    <label>
                      <span>Basic Monthly Salary (₹)</span>
                      <input
                        type="number"
                        disabled={modalMode === 'view'}
                        value={formState.basic_salary || 0}
                        onChange={(e) => updateForm('basic_salary', Number(e.target.value))}
                      />
                    </label>
                  </div>
                  <div className="salary-hint-card">
                    <DollarSign size={20} />
                    <div>
                      <b>Payroll Auto-Calculation Available</b>
                      <p>
                        When generating monthly salary slips from Finance, HRA, DA, PF and TDS
                        deductions are calculated on top of this basic salary figure.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: BANK & PAN */}
              {activeTab === 'bank' && (
                <div className="tab-pane">
                  <div className="form-row-2">
                    <label>
                      <span>Bank Name</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.bank_name || ''}
                        placeholder="e.g. State Bank of India, HDFC Bank"
                        onChange={(e) => updateForm('bank_name', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Bank Account Number</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.bank_account_no || ''}
                        onChange={(e) => updateForm('bank_account_no', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="form-row-2">
                    <label>
                      <span>IFSC Code</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.ifsc_code || ''}
                        placeholder="e.g. SBIN0001234"
                        onChange={(e) => updateForm('ifsc_code', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>PAN Card Number</span>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formState.pan_number || ''}
                        placeholder="ABCDE1234F"
                        onChange={(e) => updateForm('pan_number', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 8: DOCUMENTS */}
              {activeTab === 'docs' && (
                <div className="tab-pane">
                  <label className="full">
                    <span>Document File URL</span>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formState.document_url || ''}
                      placeholder="https://..."
                      onChange={(e) => updateForm('document_url', e.target.value)}
                    />
                  </label>

                  {modalMode !== 'view' && (
                    <div style={{ marginTop: '1rem' }}>
                      <label className="btn-upload-label">
                        <Upload size={14} />{' '}
                        {uploadingDoc ? 'Uploading...' : 'Upload Document to Supabase'}
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
                        <FileText size={16} /> View Uploaded Credentials / Degree Certificate
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {modalMode !== 'view' && (
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting
                      ? 'Saving...'
                      : modalMode === 'edit'
                      ? 'Save Changes'
                      : 'Add Staff Member'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {showCsvModal && modules['employee_master'] && (
        <CsvImportModal
          mod={modules['employee_master']}
          onClose={() => setShowCsvModal(false)}
          onSuccess={(count) => {
            setToast(`✓ Successfully imported ${count} staff records!`)
            loadEmployees()
          }}
        />
      )}
    </div>
  )
}
