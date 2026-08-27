import { ACADEMIC_YEAR_OPTIONS } from './lib/academicYear'

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'time'
  | 'number'
  | 'textarea'
  | 'select'
  | 'boolean'
  | 'array'
  | 'relation'

export type Field = {
  key: string
  label: string
  type?: FieldType
  options?: string[]
  required?: boolean
  reference?: { table: string; value: string; label: string }
}

export type Module = {
  title: string
  group: string
  table: string
  primaryKey: string
  description: string
  fields: Field[]
  columns: string[]
  initialRows?: Record<string, any>[]
}

export type NavSection = { label: string; items: string[] }
export type NavGroup = { label: string; items: string[]; sections?: NavSection[] }

const f = (
  key: string,
  label: string,
  type: FieldType = 'text',
  required = false,
  options?: string[],
  reference?: Field['reference']
): Field => ({ key, label, type, required, options, reference })

const rel = (
  key: string,
  label: string,
  table: string,
  value: string,
  display: string,
  required = false
) => f(key, label, 'relation', required, undefined, { table, value, label: display })

export const ALL_SUBMENU_MODULES = [
  { key: 'school_master', label: 'School Master', group: 'Master Setup' },
  { key: 'department_master', label: 'Department Master', group: 'Master Setup' },
  { key: 'class_master', label: 'Class Master', group: 'Master Setup' },
  { key: 'subject_master', label: 'Subject Master', group: 'Master Setup' },
  { key: 'vendor_master', label: 'Vendor Master', group: 'Master Setup' },
  { key: 'student_master', label: 'Student Master', group: 'Master Setup' },
  { key: 'employee_master', label: 'Employee Master', group: 'Master Setup' },
  { key: 'user_master', label: 'User Master', group: 'Master Setup' },
  { key: 'student_attendance', label: 'Student Attendance', group: 'Attendance' },
  { key: 'employee_attendance', label: 'Employee Attendance', group: 'Attendance' },
  { key: 'fees_collection', label: 'Fee Collection', group: 'Finance' },
  { key: 'expense_master', label: 'Expenses', group: 'Finance' },
  { key: 'income_master', label: 'Income', group: 'Finance' },
  { key: 'salary_slip', label: 'Salary / Payroll', group: 'Finance' },
  { key: 'leave_application', label: 'Leave Application', group: 'HR' },
  { key: 'leave_balance', label: 'Leave Balance', group: 'HR' },
  { key: 'warning_letter', label: 'Warning Letters', group: 'HR' },
  { key: 'offer_letter', label: 'Offer Letters', group: 'HR' },
  { key: 'employee_document', label: 'Employee Documents', group: 'HR' },
  { key: 'asset_master', label: 'Asset Master', group: 'Assets & Inventory' },
  { key: 'inventory_master', label: 'Inventory Master', group: 'Assets & Inventory' },
  { key: 'teacher_idcard', label: 'Teacher ID Card', group: 'ID Cards' },
  { key: 'student_idcard', label: 'Student ID Card', group: 'ID Cards' },
  { key: 'escort_card', label: 'Escort Card', group: 'ID Cards' },
  { key: 'assignments_master', label: 'Assignments', group: 'Academics' },
  { key: 'notice_automation', label: 'Notice Automation', group: 'Communication' },
  { key: 'userlog_master', label: 'User Activity Logs', group: 'Administration' },
]

export const ALL_MODULE_KEYS = ALL_SUBMENU_MODULES.map((m) => m.key)

export const modules: Record<string, Module> = {
  'school_master': {
    title: 'school_master',
    group: 'Master Setup',
    table: 'schools',
    primaryKey: 'id',
    description: 'School institutional identity, affiliation, principal and contact configuration',
    fields: [
      f('name', 'School name', 'text', true),
      f('code', 'School code', 'text', true),
      f('email', 'Official email', 'email'),
      f('phone', 'Phone', 'tel'),
      f('address', 'Campus address', 'textarea'),
      f('city', 'City', 'text'),
      f('state', 'State', 'text'),
      f('pincode', 'PIN Code', 'text'),
    ],
    columns: ['code', 'name', 'email', 'phone', 'city', 'state', 'pincode'],
  },
  'department_master': {
    title: 'department_master',
    group: 'Master Setup',
    table: 'department_master',
    primaryKey: 'department_id',
    description: 'Teaching, office and operational departments. Department code is generated automatically.',
    fields: [
      f('department_code', 'Department Code', 'text', true),
      f('department_name', 'Department Name', 'text', true),
      f('description', 'Description', 'textarea'),
      f('is_active', 'Is Active', 'boolean'),
    ],
    columns: ['department_code', 'department_name', 'description', 'is_active'],
  },
  'class_master': {
    title: 'class_master',
    group: 'Master Setup',
    table: 'class_master',
    primaryKey: 'class_id',
    description: 'Academic year, class capacity and availability',
    fields: [
      f('class_name', 'Class name', 'text', true),
      f('academic_year', 'Academic year', 'select', false, ACADEMIC_YEAR_OPTIONS),
      f('capacity', 'Capacity', 'number'),
      f('is_active', 'Active', 'boolean'),
    ],
    columns: ['class_name', 'academic_year', 'capacity', 'is_active', 'updated_at'],
  },
  'subject_master': {
    title: 'subject_master',
    group: 'Master Setup',
    table: 'subject_master',
    primaryKey: 'subject_id',
    description: 'Class-wise school subject catalogue and subject type',
    fields: [
      f('class_name', 'Class name', 'select', true, [
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
      ]),
      f('subject_name', 'Subject name', 'text', true),
      f('subject_type', 'Subject type', 'select', false, ['Scholastic', 'Co-scholastic', 'Activity', 'Language']),
      f('is_active', 'Active', 'boolean'),
    ],
    columns: ['class_name', 'subject_name', 'subject_type', 'is_active', 'created_at'],
  },
  'vendor_master': {
    title: 'vendor_master',
    group: 'Master Setup',
    table: 'vendor_master',
    primaryKey: 'vendor_id',
    description: 'Supplier contacts, payment terms and balances. Vendor code is generated automatically.',
    fields: [
      f('vendor_name', 'Vendor name', 'text', true),
      f('vendor_code', 'Vendor code (Auto-generated)', 'text', false),
      f('vendor_type', 'Vendor type'),
      f('contact_person', 'Contact person'),
      f('phone_primary', 'Primary phone', 'tel'),
      f('phone_secondary', 'Secondary phone', 'tel'),
      f('email', 'Email', 'email'),
      f('whatsapp_number', 'WhatsApp number', 'tel'),
      f('address', 'Address', 'textarea'),
      f('payment_terms', 'Payment terms'),
      f('credit_limit', 'Credit limit', 'number'),
      f('outstanding_amount', 'Outstanding amount', 'number'),
      f('rating', 'Rating (1-5)', 'number'),
      f('is_active', 'Active', 'boolean'),
    ],
    columns: ['vendor_code', 'vendor_name', 'vendor_type', 'phone_primary', 'outstanding_amount', 'is_active'],
  },
  'student_master': {
    title: 'student_master',
    group: 'Master Setup',
    table: 'student_master',
    primaryKey: 'student_id',
    description: 'Complete student admission, academic, parent, contact and medical profile',
    fields: [
      f('admission_no', 'Admission number', 'text', true),
      f('admission_date', 'Admission date', 'date'),
      f('gr_number', 'GR number'),
      f('roll_no', 'Roll number'),
      f('academic_year', 'Academic year', 'select', false, ACADEMIC_YEAR_OPTIONS),
      f('class_name', 'Class name', 'select', true, [
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
      ]),
      f('section', 'Section'),
      f('house_name', 'House'),
      f('student_status', 'Student status', 'select', false, ['Active', 'New Admission', 'Promoted', 'Left', 'Alumni']),
      f('full_name', 'Full name', 'text', true),
      f('first_name', 'First name'),
      f('middle_name', 'Middle name'),
      f('last_name', 'Last name'),
      f('date_of_birth', 'Date of birth', 'date'),
      f('gender', 'Gender', 'select', false, ['Male', 'Female', 'Other']),
      f('blood_group', 'Blood group', 'select', false, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
      f('nationality', 'Nationality'),
      f('religion', 'Religion'),
      f('category', 'Category', 'select', false, ['General', 'OBC', 'SC', 'ST', 'Other']),
      f('mother_tongue', 'Mother tongue'),
      f('student_photo_url', 'Student photo URL'),
      f('mobile_primary', 'Student mobile', 'tel'),
      f('student_email', 'Student email', 'email'),
      f('father_name', 'Father name'),
      f('father_mobile', 'Father mobile', 'tel'),
      f('father_whatsapp', 'Father WhatsApp', 'tel'),
      f('father_email', 'Father email', 'email'),
      f('father_occupation', 'Father occupation'),
      f('mother_name', 'Mother name'),
      f('mother_mobile', 'Mother mobile', 'tel'),
      f('mother_whatsapp', 'Mother WhatsApp', 'tel'),
      f('mother_email', 'Mother email', 'email'),
      f('mother_occupation', 'Mother occupation'),
      f('guardian_name', 'Guardian name'),
      f('guardian_relation', 'Guardian relationship'),
      f('guardian_mobile', 'Guardian mobile', 'tel'),
      f('emergency_contact_name', 'Emergency contact name'),
      f('emergency_contact_phone', 'Emergency contact phone', 'tel'),
      f('address', 'Current address', 'textarea'),
      f('permanent_address', 'Permanent address', 'textarea'),
      f('previous_school', 'Previous school'),
      f('previous_class', 'Previous class'),
      f('medical_conditions', 'Medical conditions', 'textarea'),
      f('allergies', 'Allergies', 'textarea'),
      f('doctor_name', 'Doctor / clinic name'),
      f('doctor_phone', 'Doctor phone', 'tel'),
      f('birth_certificate_no', 'Birth certificate number'),
      f('document_url', 'Document URL'),
      f('is_active', 'Active', 'boolean'),
    ],
    columns: ['admission_no', 'full_name', 'class_name', 'section', 'roll_no', 'father_mobile', 'student_status', 'is_active'],
  },
  'employee_master': {
    title: 'employee_master',
    group: 'Master Setup',
    table: 'employee_master',
    primaryKey: 'emp_id',
    description: 'Complete teacher and staff profile, academic assignment, reporting and payroll details',
    fields: [
      f('emp_code', 'Employee code', 'text', true),
      f('employee_category', 'Employee category', 'select', true, ['Teaching Staff', 'Non-Teaching Staff', 'Management']),
      f('first_name', 'First name', 'text', true),
      f('middle_name', 'Middle name'),
      f('last_name', 'Last name', 'text', true),
      f('date_of_birth', 'Date of birth', 'date'),
      f('gender', 'Gender', 'select', false, ['Male', 'Female', 'Other']),
      f('blood_group', 'Blood group', 'select', false, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
      f('marital_status', 'Marital status', 'select', false, ['Single', 'Married', 'Other']),
      f('mobile_primary', 'Primary mobile', 'tel'),
      f('whatsapp_number', 'WhatsApp number', 'tel'),
      f('personal_email', 'Personal email', 'email'),
      f('official_email', 'Official email', 'email'),
      f('emergency_contact_name', 'Emergency contact name'),
      f('emergency_contact_phone', 'Emergency contact phone', 'tel'),
      f('current_address', 'Current address', 'textarea'),
      f('permanent_address', 'Permanent address', 'textarea'),
      f('department', 'Department'),
      f('designation', 'Designation'),
      f('employment_type', 'Employment type', 'select', false, ['Permanent', 'Contract', 'Part-time', 'Temporary']),
      f('employment_status', 'Employment status', 'select', false, ['Active', 'On Leave', 'Suspended', 'Resigned', 'Retired']),
      f('academic_year', 'Academic year', 'select', false, ACADEMIC_YEAR_OPTIONS),
      f('reporting_to', 'Reporting to'),
      f('reporting_designation', 'Reporting designation'),
      f('date_of_joining', 'Date of joining', 'date'),
      f('confirmation_date', 'Confirmation date', 'date'),
      f('date_of_leaving', 'Date of leaving', 'date'),
      f('shift_name', 'Shift / duty timing'),
      f('qualification', 'Highest qualification'),
      f('professional_qualification', 'Professional qualification'),
      f('total_experience_years', 'Total experience (years)', 'number'),
      f('subject_specialisation', 'Subject specialisation', 'array'),
      f('classes_assigned', 'Classes assigned', 'array'),
      f('class_teacher_of', 'Class teacher of'),
      f('section_assigned', 'Section assigned'),
      f('employee_photo_url', 'Employee photo URL'),
      f('document_url', 'Document URL'),
      f('basic_salary', 'Basic salary', 'number'),
      f('bank_name', 'Bank name'),
      f('bank_account_no', 'Bank account number'),
      f('ifsc_code', 'IFSC code'),
      f('pan_number', 'PAN number'),
      f('is_active', 'Active', 'boolean'),
    ],
    columns: ['emp_code', 'first_name', 'last_name', 'employee_category', 'department', 'designation', 'reporting_to', 'whatsapp_number', 'employment_status', 'is_active'],
  },
  'user_master': {
    title: 'user_master',
    group: 'Master Setup',
    table: 'user_master',
    primaryKey: 'user_id',
    description: 'Application user directory; authentication accounts, passwords, roles and module permission management',
    fields: [
      f('user_full_name', 'Full name', 'text', true),
      f('user_name', 'Username', 'text', true),
      f('password', 'Password', 'text', true),
      f('department', 'Department', 'select', false, ['Management', 'Teaching Staff', 'Non-Teaching Staff', 'Administrative Office', 'Accounts & Finance', 'Sports & Physical Education', 'Information Technology']),
      f('role', 'Role', 'select', true, ['admin', 'principal', 'teacher', 'accounts', 'hr', 'staff']),
      f('allowed_modules', 'Allowed Modules (Multiple Selection)', 'array'),
      f('status', 'Status', 'select', false, ['active', 'inactive', 'suspended']),
      f('is_active', 'Active', 'boolean'),
    ],
    columns: ['user_full_name', 'user_name', 'password', 'department', 'role', 'allowed_modules', 'status', 'is_active'],
    initialRows: [
      {
        user_full_name: 'Administrator',
        user_name: 'admin',
        password: 'admin123',
        department: 'Management',
        role: 'admin',
        allowed_modules: ALL_MODULE_KEYS,
        status: 'active',
        is_active: true,
      },
      {
        user_full_name: 'John Stevens',
        user_name: 'principal',
        password: 'principal123',
        department: 'Management',
        role: 'principal',
        allowed_modules: ['school_master', 'department_master', 'class_master', 'student_master', 'employee_master', 'student_attendance', 'employee_attendance', 'fees_collection', 'notice_automation'],
        status: 'active',
        is_active: true,
      },
      {
        user_full_name: 'Soma Chakraborty',
        user_name: 'schakraborty',
        password: 'teacher123',
        department: 'Teaching Staff',
        role: 'teacher',
        allowed_modules: ['student_master', 'student_attendance', 'assignments_master', 'notice_automation', 'student_idcard'],
        status: 'active',
        is_active: true,
      },
      {
        user_full_name: 'Ramesh Dutta',
        user_name: 'rdutta',
        password: 'accounts123',
        department: 'Accounts & Finance',
        role: 'accounts',
        allowed_modules: ['fees_collection', 'expense_master', 'income_master', 'salary_slip', 'vendor_master'],
        status: 'active',
        is_active: true,
      },
    ],
  },
  'student_attendance': {
    title: 'student_attendance',
    group: 'Attendance',
    table: 'student_attendance',
    primaryKey: 'attendance_id',
    description: 'Daily class attendance and remarks',
    fields: [
      rel('student_id', 'Student', 'student_master', 'student_id', 'full_name'),
      f('student_name', 'Student name'),
      f('class_name', 'Class name'),
      f('attendance_date', 'Attendance date', 'date', true),
      f('status', 'Status', 'select', false, ['present', 'absent', 'late', 'leave', 'half-day']),
      f('remarks', 'Remarks', 'textarea'),
      f('marked_by', 'Marked by'),
    ],
    columns: ['student_name', 'class_name', 'attendance_date', 'status', 'marked_by'],
  },
  'employee_attendance': {
    title: 'employee_attendance',
    group: 'Attendance',
    table: 'employee_attendance',
    primaryKey: 'attendance_id',
    description: 'Employee check-in, check-out and attendance status',
    fields: [
      f('employee_name', 'Employee name'),
      f('attendance_date', 'Attendance date', 'date', true),
      f('check_in_time', 'Check-in time', 'time'),
      f('check_out_time', 'Check-out time', 'time'),
      f('status', 'Status', 'select', false, ['present', 'absent', 'late', 'leave', 'half-day']),
      f('remarks', 'Remarks', 'textarea'),
    ],
    columns: ['employee_name', 'attendance_date', 'check_in_time', 'check_out_time', 'status'],
  },
  'fees_collection': {
    title: 'fees_collection',
    group: 'Finance',
    table: 'fees_collection',
    primaryKey: 'fee_id',
    description: 'Student dues, payments and receipt records',
    fields: [
      rel('student_id', 'Student', 'student_master', 'student_id', 'full_name'),
      f('admission_no', 'Admission number'),
      f('student_name', 'Student name'),
      f('class_name', 'Class name'),
      f('academic_year', 'Academic year', 'select', false, ACADEMIC_YEAR_OPTIONS),
      f('fee_type', 'Fee type'),
      f('amount_due', 'Amount due', 'number'),
      f('amount_paid', 'Amount paid', 'number'),
      f('payment_date', 'Payment date', 'date'),
      f('payment_mode', 'Payment mode', 'select', false, ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque']),
      f('receipt_number', 'Receipt number'),
      f('status', 'Status', 'select', false, ['pending', 'partial', 'paid', 'cancelled']),
      f('remarks', 'Remarks', 'textarea'),
    ],
    columns: ['receipt_number', 'student_name', 'class_name', 'amount_due', 'amount_paid', 'status'],
  },
  'expense_master': {
    title: 'expense_master',
    group: 'Finance',
    table: 'expense_master',
    primaryKey: 'expense_id',
    description: 'School expenditure, vendors and approvals',
    fields: [
      f('expense_date', 'Expense date', 'date', true),
      f('expense_category', 'Expense category'),
      f('description', 'Description', 'textarea'),
      f('amount', 'Amount', 'number', true),
      f('payment_mode', 'Payment mode', 'select', false, ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque']),
      rel('vendor_id', 'Vendor', 'vendor_master', 'vendor_id', 'vendor_name'),
      f('vendor_name', 'Vendor name'),
      f('approved_by', 'Approved by'),
      f('status', 'Status', 'select', false, ['draft', 'pending', 'approved', 'rejected', 'paid']),
      f('remarks', 'Remarks', 'textarea'),
    ],
    columns: ['expense_date', 'expense_category', 'vendor_name', 'amount', 'payment_mode', 'status'],
  },
  'income_master': {
    title: 'income_master',
    group: 'Finance',
    table: 'income_master',
    primaryKey: 'income_id',
    description: 'Non-fee receipts and other school income',
    fields: [
      f('income_date', 'Income date', 'date', true),
      f('income_type', 'Income type'),
      f('description', 'Description', 'textarea'),
      f('amount', 'Amount', 'number', true),
      f('payment_mode', 'Payment mode', 'select', false, ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque']),
      f('received_from', 'Received from'),
      f('receipt_number', 'Receipt number'),
      f('status', 'Status', 'select', false, ['received', 'pending', 'cancelled']),
      f('remarks', 'Remarks', 'textarea'),
    ],
    columns: ['income_date', 'income_type', 'received_from', 'receipt_number', 'amount', 'status'],
  },
  'salary_slip': {
    title: 'salary_slip',
    group: 'Finance',
    table: 'salary_slip',
    primaryKey: 'slip_id',
    description: 'Monthly salary, allowances and deduction records',
    fields: [
      rel('emp_id', 'Employee', 'employee_master', 'emp_id', 'emp_code'),
      f('employee_name', 'Employee name'),
      f('month', 'Month'),
      f('year', 'Year', 'number'),
      f('basic_salary', 'Basic salary', 'number'),
      f('hra', 'HRA', 'number'),
      f('da', 'DA', 'number'),
      f('other_allowances', 'Other allowances', 'number'),
      f('gross_salary', 'Gross salary', 'number'),
      f('pf_deduction', 'PF deduction', 'number'),
      f('esi_deduction', 'ESI deduction', 'number'),
      f('tds', 'TDS', 'number'),
      f('other_deductions', 'Other deductions', 'number'),
      f('total_deductions', 'Total deductions', 'number'),
      f('net_salary', 'Net salary', 'number'),
      f('payment_date', 'Payment date', 'date'),
      f('payment_mode', 'Payment mode'),
      f('status', 'Status', 'select', false, ['draft', 'generated', 'paid', 'cancelled']),
    ],
    columns: ['employee_name', 'month', 'year', 'gross_salary', 'total_deductions', 'net_salary', 'status'],
  },
  'leave_application': {
    title: 'leave_application',
    group: 'HR',
    table: 'leave_application',
    primaryKey: 'leave_app_id',
    description: 'Employee leave requests and approval status',
    fields: [
      rel('emp_id', 'Employee', 'employee_master', 'emp_id', 'emp_code'),
      f('employee_name', 'Employee name'),
      f('leave_type', 'Leave type', 'select', false, ['Casual', 'Sick', 'Earned', 'Maternity', 'Paternity', 'Unpaid']),
      f('from_date', 'From date', 'date'),
      f('to_date', 'To date', 'date'),
      f('total_days', 'Total days', 'number'),
      f('reason', 'Reason', 'textarea'),
      f('status', 'Status', 'select', false, ['pending', 'approved', 'rejected', 'cancelled']),
      f('approved_by', 'Approved by'),
      f('remarks', 'Remarks', 'textarea'),
    ],
    columns: ['employee_name', 'leave_type', 'from_date', 'to_date', 'total_days', 'status'],
  },
  'leave_balance': {
    title: 'leave_balance',
    group: 'HR',
    table: 'leave_balance',
    primaryKey: 'balance_id',
    description: 'Annual employee leave entitlement and remaining balance',
    fields: [
      rel('emp_id', 'Employee', 'employee_master', 'emp_id', 'emp_code'),
      f('employee_name', 'Employee name'),
      f('academic_year', 'Academic year', 'select', false, ACADEMIC_YEAR_OPTIONS),
      f('leave_type', 'Leave type'),
      f('total_entitled', 'Total entitled', 'number'),
      f('total_taken', 'Total taken', 'number'),
      f('total_pending', 'Total pending', 'number'),
      f('balance_remaining', 'Balance remaining', 'number'),
    ],
    columns: ['employee_name', 'academic_year', 'leave_type', 'total_entitled', 'total_taken', 'balance_remaining'],
  },
  'warning_letter': {
    title: 'warning_letter',
    group: 'HR',
    table: 'warning_letter',
    primaryKey: 'letter_id',
    description: 'Employee warning notices and acknowledgement',
    fields: [
      rel('emp_id', 'Employee', 'employee_master', 'emp_id', 'emp_code'),
      f('employee_name', 'Employee name'),
      f('issue_date', 'Issue date', 'date'),
      f('warning_type', 'Warning type'),
      f('subject', 'Subject'),
      f('description', 'Description', 'textarea'),
      f('issued_by', 'Issued by'),
      f('acknowledged', 'Acknowledged', 'boolean'),
      f('status', 'Status', 'select', false, ['draft', 'issued', 'acknowledged', 'withdrawn']),
    ],
    columns: ['employee_name', 'issue_date', 'warning_type', 'subject', 'acknowledged', 'status'],
  },
  'offer_letter': {
    title: 'offer_letter',
    group: 'HR',
    table: 'offer_letter',
    primaryKey: 'offer_id',
    description: 'Candidate offer and joining details',
    fields: [
      f('candidate_name', 'Candidate name'),
      f('designation', 'Designation'),
      f('joining_date', 'Joining date', 'date'),
      f('basic_salary', 'Basic salary', 'number'),
      f('offer_date', 'Offer date', 'date'),
      f('valid_until', 'Valid until', 'date'),
      f('status', 'Status', 'select', false, ['draft', 'issued', 'accepted', 'declined', 'expired']),
      f('issued_by', 'Issued by'),
    ],
    columns: ['candidate_name', 'designation', 'joining_date', 'basic_salary', 'valid_until', 'status'],
  },
  'employee_document': {
    title: 'employee_document',
    group: 'HR',
    table: 'employee_document',
    primaryKey: 'doc_id',
    description: 'Employee document links and verification status',
    fields: [
      rel('emp_id', 'Employee', 'employee_master', 'emp_id', 'emp_code'),
      f('employee_name', 'Employee name'),
      f('employee_designation', 'Designation'),
      f('employee_department', 'Department'),
      f('doc_type', 'Document type'),
      f('file_url', 'File URL'),
      f('is_verified', 'Verified', 'boolean'),
      f('remarks', 'Remarks', 'textarea'),
    ],
    columns: ['employee_name', 'employee_designation', 'doc_type', 'is_verified', 'created_at'],
  },
  'asset_master': {
    title: 'asset_master',
    group: 'Assets & Inventory',
    table: 'asset_master',
    primaryKey: 'asset_id',
    description: 'Asset value, assignment, warranty and condition',
    fields: [
      f('asset_code', 'Asset code', 'text', true),
      f('asset_name', 'Asset name', 'text', true),
      f('asset_category', 'Asset category'),
      f('asset_type', 'Asset type'),
      f('brand', 'Brand'),
      f('model', 'Model'),
      f('serial_number', 'Serial number'),
      f('purchase_date', 'Purchase date', 'date'),
      f('purchase_price', 'Purchase price', 'number'),
      f('current_value', 'Current value', 'number'),
      f('condition', 'Condition', 'select', false, ['New', 'Good', 'Fair', 'Poor', 'Damaged']),
      f('status', 'Status', 'select', false, ['Active', 'Assigned', 'Repair', 'Disposed']),
      f('assigned_to', 'Assigned to'),
      f('warranty_expiry', 'Warranty expiry', 'date'),
      f('vendor_name', 'Vendor name'),
      f('remarks', 'Remarks', 'textarea'),
      f('is_active', 'Active', 'boolean'),
    ],
    columns: ['asset_code', 'asset_name', 'asset_category', 'condition', 'status', 'assigned_to'],
  },
  'inventory_master': {
    title: 'inventory_master',
    group: 'Assets & Inventory',
    table: 'inventory_master',
    primaryKey: 'item_id',
    description: 'Stock, reorder limits, unit cost and vendor',
    fields: [
      f('item_code', 'Item code', 'text', true),
      f('item_name', 'Item name', 'text', true),
      f('item_category', 'Item category'),
      f('item_sub_category', 'Item sub-category'),
      f('description', 'Description', 'textarea'),
      f('unit', 'Unit'),
      f('current_stock', 'Current stock', 'number'),
      f('minimum_stock', 'Minimum stock', 'number'),
      f('maximum_stock', 'Maximum stock', 'number'),
      f('unit_cost', 'Unit cost', 'number'),
      rel('vendor_id', 'Vendor', 'vendor_master', 'vendor_id', 'vendor_name'),
      f('last_purchase_date', 'Last purchase date', 'date'),
      f('expiry_date', 'Expiry date', 'date'),
      f('is_consumable', 'Consumable', 'boolean'),
      f('is_active', 'Active', 'boolean'),
    ],
    columns: ['item_code', 'item_name', 'item_category', 'current_stock', 'minimum_stock', 'unit_cost', 'is_active'],
  },
  'teacher_idcard': {
    title: 'teacher_idcard',
    group: 'ID Cards',
    table: 'teacher_idcard',
    primaryKey: 'card_id',
    description: 'Teacher identity card details and photograph',
    fields: [
      rel('emp_id', 'Employee', 'employee_master', 'emp_id', 'emp_code'),
      f('employee_name', 'Employee name'),
      f('designation', 'Designation'),
      f('department', 'Department'),
      f('mobile', 'Mobile', 'tel'),
      f('photo_url', 'Photo URL'),
      f('issue_date', 'Issue date', 'date'),
      f('valid_until', 'Valid until', 'date'),
      f('is_active', 'Active', 'boolean'),
    ],
    columns: ['employee_name', 'designation', 'department', 'mobile', 'valid_until', 'is_active'],
  },
  'student_idcard': {
    title: 'student_idcard',
    group: 'ID Cards',
    table: 'student_idcard',
    primaryKey: 'card_id',
    description: 'Generate and maintain student identity cards',
    fields: [
      rel('student_id', 'Student', 'student_master', 'student_id', 'full_name'),
      f('student_name', 'Student name'),
      f('class_name', 'Class name'),
      f('roll_no', 'Roll number'),
      f('mobile', 'Mobile', 'tel'),
      f('photo_url', 'Photo URL'),
      f('issue_date', 'Issue date', 'date'),
      f('valid_until', 'Valid until', 'date'),
      f('is_active', 'Active', 'boolean'),
    ],
    columns: ['student_name', 'class_name', 'roll_no', 'mobile', 'valid_until', 'is_active'],
  },
  'escort_card': {
    title: 'escort_card',
    group: 'ID Cards',
    table: 'escort_card',
    primaryKey: 'card_id',
    description: 'Authorised student pickup and escort cards',
    fields: [
      f('student_name', 'Student name'),
      f('class_name', 'Class name'),
      f('escort_name', 'Escort name'),
      f('relation', 'Relationship'),
      f('mobile', 'Mobile', 'tel'),
      f('photo_url', 'Photo URL'),
      f('issue_date', 'Issue date', 'date'),
      f('valid_until', 'Valid until', 'date'),
      f('is_active', 'Active', 'boolean'),
    ],
    columns: ['student_name', 'class_name', 'escort_name', 'relation', 'mobile', 'valid_until', 'is_active'],
  },
  'assignments_master': {
    title: 'assignments_master',
    group: 'Academics',
    table: 'assignments_master',
    primaryKey: 'assignment_id',
    description: 'Class assignments, deadlines and attachments',
    fields: [
      f('class_name', 'Class name', 'select', true, [
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
      ]),
      f('subject', 'Subject', 'text', true),
      f('title', 'Title', 'text', true),
      f('description', 'Description', 'textarea'),
      f('assigned_by', 'Assigned by'),
      f('assigned_date', 'Assigned date', 'date'),
      f('due_date', 'Due date', 'date'),
      f('attachment_url', 'Attachment URL'),
      f('status', 'Status', 'select', false, ['draft', 'active', 'completed', 'archived']),
    ],
    columns: ['class_name', 'subject', 'title', 'assigned_by', 'assigned_date', 'due_date', 'status'],
  },
  'notice_automation': {
    title: 'notice_automation',
    group: 'Communication',
    table: 'notice_automation',
    primaryKey: 'notice_id',
    description: 'Schedule school notices through configured channels (Email, WhatsApp, SMS, Push)',
    fields: [
      f('title', 'Title', 'text', true),
      f('message', 'Message', 'textarea', true),
      f('send_via', 'Send via', 'select', false, ['Email', 'WhatsApp', 'SMS', 'Push']),
      f('scheduled_at', 'Scheduled date', 'date'),
      f('status', 'Status', 'select', false, ['draft', 'scheduled', 'sent', 'failed', 'cancelled']),
      f('created_by', 'Created by'),
    ],
    columns: ['title', 'send_via', 'scheduled_at', 'status', 'created_by'],
  },
  'userlog_master': {
    title: 'userlog_master',
    group: 'Administration',
    table: 'userlog_master',
    primaryKey: 'log_id',
    description: 'Security and application activity audit logs',
    fields: [],
    columns: ['username', 'action', 'module', 'status', 'browser', 'created_at'],
  },
}

const group = (label: string, sections: NavSection[]): NavGroup => ({
  label,
  sections,
  items: sections.flatMap((section) => section.items),
})

export const navGroups: NavGroup[] = [
  { label: 'Dashboard', items: ['Overview'] },
  group('Master Setup', [
    {
      label: 'Core Masters',
      items: [
        'school_master',
        'department_master',
        'class_master',
        'subject_master',
        'vendor_master',
        'student_master',
        'employee_master',
        'user_master',
      ],
    },
  ]),
  group('Attendance', [
    {
      label: 'Attendance Log',
      items: ['student_attendance', 'employee_attendance'],
    },
  ]),
  group('Finance', [
    {
      label: 'Financial Operations',
      items: ['fees_collection', 'expense_master', 'income_master', 'salary_slip'],
    },
  ]),
  group('HR', [
    {
      label: 'Human Resources',
      items: ['leave_application', 'leave_balance', 'warning_letter', 'offer_letter', 'employee_document'],
    },
  ]),
  group('Assets & Inventory', [
    {
      label: 'Asset & Stock',
      items: ['asset_master', 'inventory_master'],
    },
  ]),
  group('ID Cards', [
    {
      label: 'Card Studio',
      items: ['teacher_idcard', 'student_idcard', 'escort_card'],
    },
  ]),
  group('Academics', [
    {
      label: 'Curriculum & Learning',
      items: ['assignments_master'],
    },
  ]),
  group('Communication', [
    {
      label: 'Broadcast & Circulars',
      items: ['notice_automation'],
    },
  ]),
  group('Administration', [
    {
      label: 'System Admin',
      items: ['user_master', 'userlog_master'],
    },
  ]),
]

export const label = (key: string) => {
  if (key === 'school_master') return 'School Master'
  if (key === 'department_master') return 'Department Master'
  if (key === 'class_master') return 'Class Master'
  if (key === 'subject_master') return 'Subject Master'
  if (key === 'vendor_master') return 'Vendor Master'
  if (key === 'student_master') return 'Student Master'
  if (key === 'employee_master') return 'Employee Master'
  if (key === 'user_master') return 'User Master'
  if (key === 'student_attendance') return 'Student Attendance'
  if (key === 'employee_attendance') return 'Employee Attendance'
  if (key === 'fees_collection') return 'Fee Collection'
  if (key === 'expense_master') return 'Expenses'
  if (key === 'income_master') return 'Income'
  if (key === 'salary_slip') return 'Salary / Payroll'
  if (key === 'leave_application') return 'Leave Application'
  if (key === 'leave_balance') return 'Leave Balance'
  if (key === 'warning_letter') return 'Warning Letters'
  if (key === 'offer_letter') return 'Offer Letters'
  if (key === 'employee_document') return 'Employee Documents'
  if (key === 'asset_master') return 'Asset Master'
  if (key === 'inventory_master') return 'Inventory Master'
  if (key === 'teacher_idcard') return 'Teacher ID Card'
  if (key === 'student_idcard') return 'Student ID Card'
  if (key === 'escort_card') return 'Escort Card'
  if (key === 'assignments_master') return 'Assignments'
  if (key === 'notice_automation') return 'Notice Automation'
  if (key === 'userlog_master') return 'User Activity Logs'

  return key
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase())
}

export const moduleName = (key: string) => label(key)
