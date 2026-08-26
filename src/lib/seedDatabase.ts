import { createClient } from '@supabase/supabase-js'
import { supabase, SUPABASE_SERVICE_ROLE_KEY } from './supabase'

const SUPABASE_URL = 'https://dbliogptcikqyzkbqnus.supabase.co'

// Service role client bypasses RLS for initial database seeding
const adminSupabase = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : supabase

export async function seedSupabaseDatabase(force = false): Promise<{ success: boolean; message: string; seededCount: number }> {
  const client = adminSupabase || supabase
  if (!client) {
    return { success: false, message: 'Supabase client is not available', seededCount: 0 }
  }

  try {
    // 1. Check if department_master already has data
    if (!force) {
      const { data: deptData } = await client.from('department_master').select('department_id').limit(1)
      if (deptData && deptData.length > 0) {
        return { success: true, message: 'Supabase tables already contain live data.', seededCount: 0 }
      }
    }

    let count = 0

    // 2. Seed Schools
    const { data: schoolCheck } = await client.from('schools').select('id').limit(1)
    if (!schoolCheck || schoolCheck.length === 0 || force) {
      await client.from('schools').upsert([
        {
          code: 'SJES-001',
          name: "St. John's English School",
          email: 'admin@stjohns.edu',
          phone: '+91 9674368297',
          address: 'Campus Road, Dankuni, Hooghly, West Bengal - 712311',
          city: 'Dankuni',
          state: 'West Bengal',
          pincode: '712311',
        },
      ])
      count += 1
    }

    // 3. Seed Department Master
    const { data: deptCheck } = await client.from('department_master').select('department_id').limit(1)
    if (!deptCheck || deptCheck.length === 0 || force) {
      await client.from('department_master').upsert([
        { department_code: 'DEPT-MANA', department_name: 'Management', description: 'School Management & Administration', is_active: true },
        { department_code: 'DEPT-TCH', department_name: 'Teaching Staff', description: 'Academic faculty, subject teachers and educators', is_active: true },
        { department_code: 'DEPT-STF', department_name: 'Non-Teaching Staff', description: 'Support staff and educational assistants', is_active: true },
        { department_code: 'DEPT-OFF', department_name: 'Administrative Office', description: 'Front office, registrar, admissions and clerical team', is_active: true },
        { department_code: 'DEPT-ACC', department_name: 'Accounts & Finance', description: 'Fee management, billing, payroll and accounting', is_active: true },
        { department_code: 'DEPT-SPT', department_name: 'Sports & Physical Education', description: 'Athletics, sports trainers and physical education instructors', is_active: true },
        { department_code: 'DEPT-IT', department_name: 'Information Technology', description: 'ERP administration, computer laboratories and IT support', is_active: true },
        { department_code: 'DEPT-CLN', department_name: 'Housekeeping & Facility', description: 'Campus maintenance, cleaning and security operations', is_active: true },
      ], { onConflict: 'department_code' })
      count += 8
    }

    // 4. Seed Class Master
    const { data: classCheck } = await client.from('class_master').select('class_id').limit(1)
    if (!classCheck || classCheck.length === 0 || force) {
      await client.from('class_master').upsert([
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
      count += 11
    }

    // 5. Seed Subject Master
    const { data: subjectCheck } = await client.from('subject_master').select('subject_id').limit(1)
    if (!subjectCheck || subjectCheck.length === 0 || force) {
      await client.from('subject_master').upsert([
        { class_name: 'CLASS I', subject_name: 'English Language', subject_type: 'Scholastic', is_active: true },
        { class_name: 'CLASS I', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
        { class_name: 'CLASS I', subject_name: 'Environmental Studies', subject_type: 'Scholastic', is_active: true },
        { class_name: 'CLASS V', subject_name: 'General Science', subject_type: 'Scholastic', is_active: true },
        { class_name: 'CLASS V', subject_name: 'Social Studies', subject_type: 'Scholastic', is_active: true },
        { class_name: 'CLASS V', subject_name: 'Computer Applications', subject_type: 'Co-scholastic', is_active: true },
      ])
      count += 6
    }

    // 6. Seed Vendor Master
    const { data: vendorCheck } = await client.from('vendor_master').select('vendor_id').limit(1)
    if (!vendorCheck || vendorCheck.length === 0 || force) {
      await client.from('vendor_master').upsert([
        { vendor_code: 'VND-STAT', vendor_name: 'National Stationery Suppliers', vendor_type: 'Stationery & Books', contact_person: 'Rajesh Kumar', phone_primary: '+91 9831012345', email: 'sales@nationalstationery.com', address: '12 College Street, Kolkata', payment_terms: 'Net 30', credit_limit: 50000, outstanding_amount: 12500, rating: 5, is_active: true },
        { vendor_code: 'VND-UNIF', vendor_name: 'StyleCraft School Uniforms', vendor_type: 'Uniform & Apparel', contact_person: 'Sunita Sharma', phone_primary: '+91 9830056789', email: 'info@stylecraftuniforms.in', address: '88 MG Road, Howrah', payment_terms: 'Net 15', credit_limit: 100000, outstanding_amount: 34000, rating: 4, is_active: true },
        { vendor_code: 'VND-IT', vendor_name: 'Apex Infotech & Systems', vendor_type: 'IT Hardware & Lab', contact_person: 'Amitabh Roy', phone_primary: '+91 9831122334', email: 'support@apexinfotech.co.in', address: 'Sector V, Salt Lake, Kolkata', payment_terms: 'Immediate', credit_limit: 150000, outstanding_amount: 0, rating: 5, is_active: true },
      ])
      count += 3
    }

    // 7. Seed Student Master
    const { data: studentCheck } = await client.from('student_master').select('student_id').limit(1)
    if (!studentCheck || studentCheck.length === 0 || force) {
      await client.from('student_master').upsert([
        { admission_no: 'ADM-2026-001', full_name: 'Aarav Mukherjee', class_name: 'CLASS V', section: 'A', roll_no: '01', academic_year: '2026-2027', student_status: 'Active', gender: 'Male', date_of_birth: '2015-05-14', father_name: 'Subhash Mukherjee', father_mobile: '+91 9830111222', father_email: 'subhash.m@gmail.com', is_active: true },
        { admission_no: 'ADM-2026-002', full_name: 'Ananya Banerjee', class_name: 'CLASS V', section: 'A', roll_no: '02', academic_year: '2026-2027', student_status: 'Active', gender: 'Female', date_of_birth: '2015-08-22', father_name: 'Debashis Banerjee', father_mobile: '+91 9830222333', father_email: 'dbanerjee@gmail.com', is_active: true },
        { admission_no: 'ADM-2026-003', full_name: 'Rohan Sen', class_name: 'CLASS IV', section: 'B', roll_no: '15', academic_year: '2026-2027', student_status: 'Active', gender: 'Male', date_of_birth: '2016-01-10', father_name: 'Pradeep Sen', father_mobile: '+91 9830333444', father_email: 'pradeep.sen@yahoo.com', is_active: true },
        { admission_no: 'ADM-2026-004', full_name: 'Priya Roy', class_name: 'CLASS III', section: 'A', roll_no: '08', academic_year: '2026-2027', student_status: 'Active', gender: 'Female', date_of_birth: '2017-11-03', father_name: 'Suman Roy', father_mobile: '+91 9830444555', father_email: 'suman.roy@outlook.com', is_active: true },
        { admission_no: 'ADM-2026-005', full_name: 'Siddharth Das', class_name: 'CLASS VI', section: 'A', roll_no: '12', academic_year: '2026-2027', student_status: 'Active', gender: 'Male', date_of_birth: '2014-03-18', father_name: 'Amit Das', father_mobile: '+91 9830555666', father_email: 'amit.das@gmail.com', is_active: true },
      ])
      count += 5
    }

    // 8. Seed Employee Master
    const { data: empCheck } = await client.from('employee_master').select('emp_id').limit(1)
    if (!empCheck || empCheck.length === 0 || force) {
      await client.from('employee_master').upsert([
        { emp_code: 'EMP-001', employee_category: 'Teaching Staff', first_name: 'Soma', last_name: 'Chakraborty', department: 'Teaching Staff', designation: 'Senior Teacher', mobile_primary: '+91 9831234567', official_email: 'soma.c@stjohns.edu', employment_status: 'Active', is_active: true },
        { emp_code: 'EMP-002', employee_category: 'Teaching Staff', first_name: 'Vikram', last_name: 'Ghosh', department: 'Teaching Staff', designation: 'Assistant Teacher', mobile_primary: '+91 9832345678', official_email: 'vikram.g@stjohns.edu', employment_status: 'Active', is_active: true },
        { emp_code: 'EMP-003', employee_category: 'Non-Teaching Staff', first_name: 'Ramesh', last_name: 'Dutta', department: 'Accounts & Finance', designation: 'Accountant', mobile_primary: '+91 9833456789', official_email: 'accounts@stjohns.edu', employment_status: 'Active', is_active: true },
        { emp_code: 'EMP-004', employee_category: 'Management', first_name: 'John', last_name: 'Stevens', department: 'Management', designation: 'Principal', mobile_primary: '+91 9674368297', official_email: 'principal@stjohns.edu', employment_status: 'Active', is_active: true },
      ])
      count += 4
    }

    // 9. Seed Fees Collection
    const { data: feeCheck } = await client.from('fees_collection').select('fee_id').limit(1)
    if (!feeCheck || feeCheck.length === 0 || force) {
      await client.from('fees_collection').upsert([
        { receipt_number: 'RCPT-2026-101', student_name: 'Aarav Mukherjee', admission_no: 'ADM-2026-001', class_name: 'CLASS V', fee_type: 'Tuition Fee (Q1)', amount_due: 12000, amount_paid: 12000, payment_date: '2026-04-10', payment_mode: 'UPI', status: 'paid' },
        { receipt_number: 'RCPT-2026-102', student_name: 'Ananya Banerjee', admission_no: 'ADM-2026-002', class_name: 'CLASS V', fee_type: 'Tuition Fee (Q1)', amount_due: 12000, amount_paid: 12000, payment_date: '2026-04-12', payment_mode: 'Cash', status: 'paid' },
        { receipt_number: 'RCPT-2026-103', student_name: 'Rohan Sen', admission_no: 'ADM-2026-003', class_name: 'CLASS IV', fee_type: 'Tuition Fee (Q1)', amount_due: 11000, amount_paid: 5000, payment_date: '2026-04-15', payment_mode: 'UPI', status: 'partial' },
        { receipt_number: 'RCPT-2026-104', student_name: 'Priya Roy', admission_no: 'ADM-2026-004', class_name: 'CLASS III', fee_type: 'Tuition Fee (Q1)', amount_due: 10000, amount_paid: 0, status: 'pending' },
      ])
      count += 4
    }

    // 10. Seed Expenses
    const { data: expCheck } = await client.from('expense_master').select('expense_id').limit(1)
    if (!expCheck || expCheck.length === 0 || force) {
      await client.from('expense_master').upsert([
        { expense_date: '2026-08-01', expense_category: 'Utilities', description: 'Electricity Bill - Campus Main Building', amount: 24500, payment_mode: 'Bank Transfer', vendor_name: 'WBSEDCL', approved_by: 'Principal', status: 'paid' },
        { expense_date: '2026-08-05', expense_category: 'Stationery', description: 'Annual Examination Answer Sheets & Printing', amount: 15800, payment_mode: 'Cheque', vendor_name: 'National Stationery Suppliers', approved_by: 'Accounts Officer', status: 'paid' },
        { expense_date: '2026-08-12', expense_category: 'Maintenance', description: 'Computer Lab UPS Replacement', amount: 32000, payment_mode: 'UPI', vendor_name: 'Apex Infotech & Systems', approved_by: 'Principal', status: 'paid' },
      ])
      count += 3
    }

    // 11. Seed Income
    const { data: incCheck } = await client.from('income_master').select('income_id').limit(1)
    if (!incCheck || incCheck.length === 0 || force) {
      await client.from('income_master').upsert([
        { income_date: '2026-08-02', income_type: 'Prospectus & Admission Forms', description: 'Sale of new admission prospectus', amount: 8500, payment_mode: 'Cash', received_from: 'Admission Counter', receipt_number: 'INC-2026-01', status: 'received' },
        { income_date: '2026-08-10', income_type: 'Auditorium Booking', description: 'Weekend community cultural event rental', amount: 15000, payment_mode: 'Bank Transfer', received_from: 'Dankuni Cultural Club', receipt_number: 'INC-2026-02', status: 'received' },
      ])
      count += 2
    }

    // 12. Seed Assets
    const { data: assetCheck } = await client.from('asset_master').select('asset_id').limit(1)
    if (!assetCheck || assetCheck.length === 0 || force) {
      await client.from('asset_master').upsert([
        { asset_code: 'AST-LAB-01', asset_name: 'Dell OptiPlex Desktop Computer', asset_category: 'IT Hardware', asset_type: 'Desktop PC', brand: 'Dell', serial_number: 'DL-994821', purchase_date: '2025-06-15', purchase_price: 45000, current_value: 38000, condition: 'Good', status: 'Active', assigned_to: 'Computer Lab 1', is_active: true },
        { asset_code: 'AST-AV-01', asset_name: 'Epson Interactive Projector', asset_category: 'Electronics', asset_type: 'Projector', brand: 'Epson', serial_number: 'EP-10492', purchase_date: '2025-09-01', purchase_price: 52000, current_value: 46000, condition: 'New', status: 'Active', assigned_to: 'Auditorium', is_active: true },
      ])
      count += 2
    }

    // 13. Seed Inventory
    const { data: invCheck } = await client.from('inventory_master').select('item_id').limit(1)
    if (!invCheck || invCheck.length === 0 || force) {
      await client.from('inventory_master').upsert([
        { item_code: 'ITM-PAP-A4', item_name: 'A4 Printing Paper Reams (75 GSM)', item_category: 'Stationery', unit: 'Reams', current_stock: 45, minimum_stock: 10, maximum_stock: 100, unit_cost: 260, is_consumable: true, is_active: true },
        { item_code: 'ITM-CHLK-W', item_name: 'White Dustless Chalk Box', item_category: 'Stationery', unit: 'Boxes', current_stock: 80, minimum_stock: 20, maximum_stock: 150, unit_cost: 85, is_consumable: true, is_active: true },
      ])
      count += 2
    }

    // 14. Seed Assignments
    const { data: assCheck } = await client.from('assignments_master').select('assignment_id').limit(1)
    if (!assCheck || assCheck.length === 0 || force) {
      await client.from('assignments_master').upsert([
        { class_name: 'CLASS V', subject: 'Mathematics', title: 'Fractions & Decimals Exercise Sheet', description: 'Solve problems 1 to 20 from Chapter 4 in homework notebook.', assigned_by: 'Soma Chakraborty', assigned_date: '2026-08-20', due_date: '2026-08-28', status: 'active' },
        { class_name: 'CLASS IV', subject: 'Science', title: 'Plant Photosynthesis Diagram', description: 'Draw and label the photosynthesis process neatly.', assigned_by: 'Vikram Ghosh', assigned_date: '2026-08-22', due_date: '2026-08-29', status: 'active' },
      ])
      count += 2
    }

    // 15. Seed Notices
    const { data: notCheck } = await client.from('notice_automation').select('notice_id').limit(1)
    if (!notCheck || notCheck.length === 0 || force) {
      await client.from('notice_automation').upsert([
        { title: 'Independence Day Celebration & Assembly Schedule', message: 'All students must attend the Flag Hoisting Ceremony on 15th August at 8:00 AM in proper school uniform.', send_via: 'WhatsApp', scheduled_at: '2026-08-14', status: 'sent', created_by: 'Principal' },
        { title: 'Parent-Teacher Meeting (PTM) Notice for Class I - VIII', message: 'PTM for Q1 performance will be held on Saturday from 9:00 AM to 12:30 PM.', send_via: 'Email', scheduled_at: '2026-08-30', status: 'scheduled', created_by: 'Administrator' },
      ])
      count += 2
    }

    // 16. Seed User Master
    const { data: usrCheck } = await client.from('user_master').select('user_id').limit(1)
    if (!usrCheck || usrCheck.length === 0 || force) {
      await client.from('user_master').upsert([
        { user_full_name: 'Administrator', user_name: 'admin', department: 'Management', role: 'admin', status: 'active', is_active: true, password: 'SUPABASE_AUTH' },
        { user_full_name: 'John Stevens', user_name: 'principal', department: 'Management', role: 'principal', status: 'active', is_active: true, password: 'SUPABASE_AUTH' },
        { user_full_name: 'Soma Chakraborty', user_name: 'schakraborty', department: 'Teaching Staff', role: 'teacher', status: 'active', is_active: true, password: 'SUPABASE_AUTH' },
      ])
      count += 3
    }

    return {
      success: true,
      message: `Successfully seeded ${count} live records into Supabase database!`,
      seededCount: count,
    }
  } catch (err) {
    console.error('Error seeding Supabase database:', err)
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Database seeding failed',
      seededCount: 0,
    }
  }
}
