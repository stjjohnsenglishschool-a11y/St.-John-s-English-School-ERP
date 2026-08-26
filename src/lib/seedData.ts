import { supabase, logActivity } from './supabase'
import { getCurrentAcademicYear } from './academicYear'

export interface SeedRecord {
  [key: string]: unknown
}

export const SEED_DATA: Record<string, SeedRecord[]> = {
  department_master: [
    {
      department_code: 'DEPT-TCH',
      department_name: 'Teacher',
      description: 'Teaching Staff Department',
      is_active: true,
    },
    {
      department_code: 'DEPT-STF',
      department_name: 'Staff',
      description: 'Non-Teaching Staff',
      is_active: true,
    },
    {
      department_code: 'DEPT-OFF',
      department_name: 'Office Staff',
      description: 'Administrative Office',
      is_active: true,
    },
    {
      department_code: 'DEPT-ACC',
      department_name: 'Accounts',
      description: 'Accounts Department',
      is_active: true,
    },
    {
      department_code: 'DEPT-SPT',
      department_name: 'Sports',
      description: 'Sports Department',
      is_active: true,
    },
    {
      department_code: 'DEPT-IT',
      department_name: 'IT Department',
      description: 'Information Technology',
      is_active: true,
    },
    {
      department_code: 'DEPT-CLN',
      department_name: 'Cleaning Staff',
      description: 'Housekeeping & Maintenance',
      is_active: true,
    },
  ],
  class_master: [
    { class_name: 'PG', academic_year: getCurrentAcademicYear(), capacity: 20, is_active: true },
    { class_name: 'NURSERY', academic_year: getCurrentAcademicYear(), capacity: 25, is_active: true },
    { class_name: 'LKG', academic_year: getCurrentAcademicYear(), capacity: 30, is_active: true },
    { class_name: 'UKG', academic_year: getCurrentAcademicYear(), capacity: 30, is_active: true },
    { class_name: 'CLASS I', academic_year: getCurrentAcademicYear(), capacity: 40, is_active: true },
    { class_name: 'CLASS II', academic_year: getCurrentAcademicYear(), capacity: 40, is_active: true },
    { class_name: 'CLASS III', academic_year: getCurrentAcademicYear(), capacity: 40, is_active: true },
    { class_name: 'CLASS IV', academic_year: getCurrentAcademicYear(), capacity: 40, is_active: true },
    { class_name: 'CLASS V', academic_year: getCurrentAcademicYear(), capacity: 40, is_active: true },
    { class_name: 'CLASS VI', academic_year: getCurrentAcademicYear(), capacity: 40, is_active: true },
    { class_name: 'CLASS VII', academic_year: getCurrentAcademicYear(), capacity: 40, is_active: true },
    { class_name: 'CLASS VIII', academic_year: getCurrentAcademicYear(), capacity: 40, is_active: true },
  ],
  subject_master: [
    { class_name: 'PG', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'PG', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'PG', subject_name: 'Rhymes', subject_type: 'Activity', is_active: true },
    { class_name: 'NURSERY', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'NURSERY', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'NURSERY', subject_name: 'Art & Craft', subject_type: 'Activity', is_active: true },
    { class_name: 'LKG', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'LKG', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'LKG', subject_name: 'Rhymes', subject_type: 'Activity', is_active: true },
    { class_name: 'UKG', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'UKG', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'UKG', subject_name: 'General Knowledge', subject_type: 'Co-scholastic', is_active: true },
    { class_name: 'CLASS I', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'CLASS I', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS I', subject_name: 'Environmental Studies', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS I', subject_name: 'Computer', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS II', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'CLASS II', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS II', subject_name: 'Environmental Studies', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS II', subject_name: 'Computer', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS III', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'CLASS III', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS III', subject_name: 'Science', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS III', subject_name: 'Computer', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS IV', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'CLASS IV', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS IV', subject_name: 'Science', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS IV', subject_name: 'Social Studies', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS V', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'CLASS V', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS V', subject_name: 'Science', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS V', subject_name: 'Social Studies', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS VI', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'CLASS VI', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS VI', subject_name: 'Science', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS VI', subject_name: 'Social Science', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS VII', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'CLASS VII', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS VII', subject_name: 'Science', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS VII', subject_name: 'Social Science', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS VIII', subject_name: 'English', subject_type: 'Language', is_active: true },
    { class_name: 'CLASS VIII', subject_name: 'Mathematics', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS VIII', subject_name: 'Science', subject_type: 'Scholastic', is_active: true },
    { class_name: 'CLASS VIII', subject_name: 'Social Science', subject_type: 'Scholastic', is_active: true },
  ],
  vendor_master: [
    {
      vendor_code: 'VND-00001',
      vendor_name: 'Oxford University Press',
      vendor_type: 'Books & Publication',
      contact_person: 'Debashis Roy',
      phone_primary: '9830112233',
      email: 'sales.kolkata@oup.com',
      address: 'Kolkata, West Bengal',
      payment_terms: '30 Days Net',
      credit_limit: 50000,
      outstanding_amount: 0,
      rating: 5,
      is_active: true,
    },
    {
      vendor_code: 'VND-00002',
      vendor_name: 'St. John Uniforms & Tailors',
      vendor_type: 'Uniform & Dress',
      contact_person: 'Sunil Shaw',
      phone_primary: '9674001122',
      email: 'uniforms.dankuni@gmail.com',
      address: 'Dankuni Market, Hooghly',
      payment_terms: '15 Days Net',
      credit_limit: 25000,
      outstanding_amount: 0,
      rating: 4,
      is_active: true,
    },
  ],
}

/**
 * Seeds default records into Supabase for a given table
 */
export async function seedModuleData(
  tableName: string
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!supabase) {
    return { success: false, count: 0, error: 'Supabase client is not initialized.' }
  }

  const items = SEED_DATA[tableName]
  if (!items || items.length === 0) {
    return { success: false, count: 0, error: `No seed records available for ${tableName}.` }
  }

  try {
    let inserted = 0
    // Insert item by item or batch to handle conflicts smoothly
    for (const row of items) {
      const { error } = await supabase.from(tableName).insert(row)
      if (!error) {
        inserted++
      } else if (error.code === '23505') {
        // Unique constraint violation (already exists), count as ok
        inserted++
      } else {
        console.warn(`Seed insert error for ${tableName}:`, error.message)
        // If RLS blocked, report clear error
        if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('policy')) {
          return {
            success: false,
            count: inserted,
            error: `Permission error (RLS): Anon role cannot insert. Run RLS policy update in Supabase SQL Editor. Error: ${error.message}`,
          }
        }
      }
    }

    await logActivity({
      action: 'Seed Initial Data',
      module: tableName,
      status: 'success',
    })

    return { success: true, count: inserted }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, count: 0, error: msg }
  }
}
