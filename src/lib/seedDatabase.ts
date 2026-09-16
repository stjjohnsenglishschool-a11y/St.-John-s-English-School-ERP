import { fetchCollectionData, saveDocument } from './firebase'

export async function seedSupabaseDatabase(force = false): Promise<{ success: boolean; message: string; seededCount: number }> {
  try {
    const isAlreadySeeded = localStorage.getItem('sjes_database_seeded') === 'true'
    if (!force && isAlreadySeeded) {
      return {
        success: true,
        message: 'Database is up to date',
        seededCount: 0,
      }
    }

    let count = 0
    const errors: string[] = []

    const safeSeedTable = async (tableName: string, records: any[], primaryKey = 'code') => {
      try {
        const existing = await fetchCollectionData(tableName)
        if (force || (!isAlreadySeeded && (!existing || existing.length === 0))) {
          for (const rec of records) {
            let pk = primaryKey
            if (rec.department_code) pk = 'department_code'
            else if (rec.class_name) pk = 'class_name'
            else if (rec.vendor_code) pk = 'vendor_code'
            else if (rec.admission_no) pk = 'admission_no'
            else if (rec.emp_code) pk = 'emp_code'
            else if (rec.receipt_number) pk = 'receipt_number'
            else if (rec.user_name) pk = 'user_name'
            else if (rec.asset_code) pk = 'asset_code'
            else if (rec.item_code) pk = 'item_code'

            const res = await saveDocument(tableName, pk, rec)
            if (res.success) {
              count++
            } else if (res.error) {
              errors.push(`${tableName}: ${res.error}`)
            }
          }
        }
      } catch (e) {
        console.error(`Error seeding ${tableName} in Firebase:`, e)
      }
    }

    // 1. Seed Department Master
    await safeSeedTable('department_master', [
      { department_code: 'DEPT-MANA', department_name: 'Management', description: 'School Management & Administration', is_active: true },
      { department_code: 'DEPT-TCH', department_name: 'Teaching Staff', description: 'Academic faculty, subject teachers and educators', is_active: true },
      { department_code: 'DEPT-STF', department_name: 'Non-Teaching Staff', description: 'Support staff and educational assistants', is_active: true },
      { department_code: 'DEPT-OFF', department_name: 'Administrative Office', description: 'Front office, registrar, admissions and clerical team', is_active: true },
      { department_code: 'DEPT-ACC', department_name: 'Accounts & Finance', description: 'Fee management, billing, payroll and accounting', is_active: true },
      { department_code: 'DEPT-SPT', department_name: 'Sports & Physical Education', description: 'Athletics, sports trainers and physical education instructors', is_active: true },
      { department_code: 'DEPT-IT', department_name: 'Information Technology', description: 'ERP administration, computer laboratories and IT support', is_active: true },
      { department_code: 'DEPT-CLN', department_name: 'Housekeeping & Facility', description: 'Campus maintenance, cleaning and security operations', is_active: true },
    ])

    // 2. Seed Class Master
    await safeSeedTable('class_master', [
      { class_name: 'NURSERY', academic_year: '2026-2027', capacity: 30, is_active: true },
      { class_name: 'LKG', academic_year: '2026-2027', capacity: 35, is_active: true },
      { class_name: 'UKG', academic_year: '2026-2027', capacity: 35, is_active: true },
      { class_name: 'CLASS I', academic_year: '2026-2027', capacity: 40, is_active: true },
      { class_name: 'CLASS II', academic_year: '2026-2027', capacity: 40, is_active: true },
      { class_name: 'CLASS III', academic_year: '2026-2027', capacity: 40, is_active: true },
      { class_name: 'CLASS IV', academic_year: '2026-2027', capacity: 40, is_active: true },
      { class_name: 'CLASS V', academic_year: '2026-2027', capacity: 40, is_active: true },
      { class_name: 'CLASS VI', academic_year: '2026-2027', capacity: 45, is_active: true },
      { class_name: 'CLASS VII', academic_year: '2026-2027', capacity: 45, is_active: true },
      { class_name: 'CLASS VIII', academic_year: '2026-2027', capacity: 45, is_active: true },
    ])

    // 3. Seed Subject Master
    await safeSeedTable('subject_master', [
      { class_name: 'CLASS I', subject_name: 'English Language', subject_type: 'Scholastic', is_active: true },
      { class_name: 'CLASS I', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
      { class_name: 'CLASS I', subject_name: 'Environmental Studies', subject_type: 'Scholastic', is_active: true },
      { class_name: 'CLASS V', subject_name: 'General Science', subject_type: 'Scholastic', is_active: true },
      { class_name: 'CLASS V', subject_name: 'Social Studies', subject_type: 'Scholastic', is_active: true },
      { class_name: 'CLASS V', subject_name: 'Computer Applications', subject_type: 'Co-scholastic', is_active: true },
    ])

    // 4. Seed User Master
    const allModuleKeys = [
      'school_master', 'department_master', 'class_master', 'subject_master', 'vendor_master', 'student_master', 'employee_master', 'user_master', 'student_attendance', 'employee_attendance', 'fees_collection', 'expense_master', 'income_master', 'salary_slip', 'leave_application', 'leave_balance', 'warning_letter', 'offer_letter', 'employee_document', 'asset_master', 'inventory_master', 'teacher_idcard', 'student_idcard', 'escort_card', 'assignments_master', 'notice_automation', 'userlog_master'
    ]
    await safeSeedTable('user_master', [
      { user_full_name: 'Administrator', user_name: 'admin', department: 'Management', role: 'admin', status: 'active', is_active: true, password: 'admin123', active_module: allModuleKeys, allowed_modules: allModuleKeys },
      { user_full_name: 'John Stevens', user_name: 'principal', department: 'Management', role: 'principal', status: 'active', is_active: true, password: 'principal123', active_module: ['school_master', 'department_master', 'class_master', 'student_master', 'employee_master', 'student_attendance', 'employee_attendance', 'fees_collection', 'notice_automation'], allowed_modules: ['school_master', 'department_master', 'class_master', 'student_master', 'employee_master', 'student_attendance', 'employee_attendance', 'fees_collection', 'notice_automation'] },
      { user_full_name: 'Soma Chakraborty', user_name: 'schakraborty', department: 'Teaching Staff', role: 'teacher', status: 'active', is_active: true, password: 'teacher123', active_module: ['student_master', 'student_attendance', 'assignments_master', 'notice_automation', 'student_idcard'], allowed_modules: ['student_master', 'student_attendance', 'assignments_master', 'notice_automation', 'student_idcard'] },
      { user_full_name: 'Ramesh Dutta', user_name: 'rdutta', department: 'Accounts & Finance', role: 'accounts', status: 'active', is_active: true, password: 'accounts123', active_module: ['fees_collection', 'expense_master', 'income_master', 'salary_slip', 'vendor_master'], allowed_modules: ['fees_collection', 'expense_master', 'income_master', 'salary_slip', 'vendor_master'] },
    ])

    localStorage.setItem('sjes_database_seeded', 'true')

    return {
      success: true,
      message: errors.length > 0 
        ? `Seeded ${count} records into Firebase (Some records skipped: ${errors.join('; ')})`
        : `Successfully seeded ${count} live records into Firebase Firestore!`,
      seededCount: count,
    }
  } catch (err) {
    console.error('Error seeding Firebase database:', err)
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Database seeding failed',
      seededCount: 0,
    }
  }
}
