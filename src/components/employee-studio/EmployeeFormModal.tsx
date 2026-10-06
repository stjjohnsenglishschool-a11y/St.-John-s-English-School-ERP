import React from 'react'
import { User, Upload, X, FileText, DollarSign } from 'lucide-react'
import { formatImageUrl, handleImageError } from '../../lib/imageUtils'
import { getEmployeeProbationStatus } from '../../lib/leaveSalaryRules'
import { ACADEMIC_YEAR_OPTIONS, CURRENT_ACADEMIC_YEAR } from '../../lib/academicYear'
import { STAFF_GOOGLE_DRIVE_FOLDER_NAME } from '../../lib/googleDriveSheets'

export type Employee = {
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
  updated_at?: string
  _docId?: string
}

export interface EmployeeFormModalProps {
  modalMode: 'create' | 'edit' | 'view'
  selectedEmp: Employee | null
  formState: Partial<Employee>
  activeTab: string
  setActiveTab: (tab: string) => void
  updateForm: (field: keyof Employee, value: any) => void
  toggleArrayItem: (field: 'subject_specialisation' | 'classes_assigned', value: string) => void
  closeModal: () => void
  handleSubmit: (e: React.FormEvent) => void
  submitting: boolean
  departments: string[]
  classesList: string[]
  subjectsList: string[]
  handleDrivePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploadingPhotoDrive: boolean
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploadingPhoto: boolean
  handleDocUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploadingDoc: boolean
}

export default function EmployeeFormModal({
  modalMode,
  selectedEmp,
  formState,
  activeTab,
  setActiveTab,
  updateForm,
  toggleArrayItem,
  closeModal,
  handleSubmit,
  submitting,
  departments,
  classesList,
  subjectsList,
  handleDrivePhotoUpload,
  uploadingPhotoDrive,
  handlePhotoUpload,
  uploadingPhoto,
  handleDocUpload,
  uploadingDoc,
}: EmployeeFormModalProps) {
  if (!modalMode) return null

  return (
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
                ? `Edit: ${formState.first_name || ''} ${formState.last_name || ''}`
                : `Staff Profile: ${selectedEmp?.first_name || ''} ${selectedEmp?.last_name || ''}`}
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
                    <img
                      src={formatImageUrl(formState.employee_photo_url)}
                      alt="Staff"
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                    />
                  ) : (
                    <User size={48} opacity={0.3} />
                  )}
                </div>
                {modalMode !== 'view' && (
                  <div className="photo-actions" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <label
                        className="btn-upload-label"
                        style={{
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: uploadingPhotoDrive ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        title={`Upload photograph to Google Drive folder '${STAFF_GOOGLE_DRIVE_FOLDER_NAME}'`}
                      >
                        <Upload size={13} />
                        {uploadingPhotoDrive ? 'Saving to Drive...' : `Drive (${STAFF_GOOGLE_DRIVE_FOLDER_NAME})`}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDrivePhotoUpload}
                          disabled={uploadingPhotoDrive}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <label
                        className="btn-upload-label"
                        style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: uploadingPhoto ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Upload size={13} />
                        {uploadingPhoto ? 'Uploading...' : 'Cloud Storage'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          disabled={uploadingPhoto}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                    <input
                      type="url"
                      placeholder="Or paste Google Drive Photo link / Direct image URL..."
                      value={formState.employee_photo_url || ''}
                      onChange={(e) => updateForm('employee_photo_url', e.target.value)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        width: '100%',
                      }}
                    />
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
                    <option value="Resigned">Resigned</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Terminated">Terminated</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
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

              {/* Resignation & Termination Details */}
              {(formState.employment_status === 'Resigned' ||
                formState.employment_status === 'Terminated' ||
                formState.employment_status === 'Inactive' ||
                formState.employment_status === 'Retired' ||
                formState.employment_status === 'Left') && (
                <div
                  style={{
                    background: '#fff7ed',
                    border: '1px solid #ffedd5',
                    borderRadius: '10px',
                    padding: '14px',
                    marginTop: '12px',
                    display: 'grid',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠️ Resignation & Last Working Details (Supabase Source of Truth)</span>
                  </div>
                  <div className="form-row-3">
                    <label>
                      <span style={{ color: '#9a3412', fontWeight: 600 }}>Resignation Date</span>
                      <input
                        type="date"
                        disabled={modalMode === 'view'}
                        value={formState.resignation_date || ''}
                        onChange={(e) => {
                          updateForm('resignation_date', e.target.value)
                          if (!formState.last_working_date) updateForm('last_working_date', e.target.value)
                          if (!formState.date_of_leaving) updateForm('date_of_leaving', e.target.value)
                        }}
                      />
                    </label>
                    <label>
                      <span style={{ color: '#9a3412', fontWeight: 600 }}>Last Working Date</span>
                      <input
                        type="date"
                        disabled={modalMode === 'view'}
                        value={formState.last_working_date || formState.date_of_leaving || ''}
                        onChange={(e) => {
                          updateForm('last_working_date', e.target.value)
                          updateForm('date_of_leaving', e.target.value)
                        }}
                      />
                    </label>
                    <label>
                      <span style={{ color: '#9a3412', fontWeight: 600 }}>Official Relieving / Leaving Date</span>
                      <input
                        type="date"
                        disabled={modalMode === 'view'}
                        value={formState.date_of_leaving || formState.last_working_date || ''}
                        onChange={(e) => {
                          updateForm('date_of_leaving', e.target.value)
                          if (!formState.last_working_date) updateForm('last_working_date', e.target.value)
                        }}
                      />
                    </label>
                  </div>
                  <div style={{ fontSize: '12px', color: '#7c2d12', lineHeight: '1.4' }}>
                    <b>Payroll Rule:</b> Salary for the resignation month will be calculated pro-rata up to the <b>Last Working Date</b>. For subsequent months, this employee will be excluded from regular payroll unless Admin selects them for final settlement.
                  </div>
                </div>
              )}

              {formState.date_of_joining && (() => {
                const prob = getEmployeeProbationStatus(formState.date_of_joining);
                return (
                  <div
                    style={{
                      background: prob.isPermanent ? '#f0fdf4' : '#fffbeb',
                      border: `1px solid ${prob.isPermanent ? '#bbf7d0' : '#fde68a'}`,
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      marginTop: '8px',
                      color: prob.isPermanent ? '#166534' : '#92400e',
                    }}
                  >
                    <b>SJES Leave & Employment Status Policy:</b>
                    <div style={{ marginTop: '2px' }}>
                      Status: <b>{prob.status}</b> ({prob.completedMonths} months completed since {formState.date_of_joining}).
                      {prob.isPermanent ? (
                        <span> • Completed 6 months probation period.</span>
                      ) : (
                        <span> • On probation until {prob.probationEndDate} (6 months from joining).</span>
                      )}
                    </div>
                    <div style={{ marginTop: '2px', fontSize: '11px' }}>
                      {prob.isEligibleForPL ? (
                        <span>✓ Eligible for Privilege Leave (1 PL/month automatic credit). Currently entitled to {prob.plEntitledMonths} PL in this session.</span>
                      ) : (
                        <span>• On probation (0 PL). Will become eligible for 1 PL/month credit after completing 6 months service on {prob.probationEndDate}.</span>
                      )}
                    </div>
                  </div>
                );
              })()}
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
                    {uploadingDoc ? 'Uploading...' : 'Upload Document to Cloud Storage'}
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
  )
}
