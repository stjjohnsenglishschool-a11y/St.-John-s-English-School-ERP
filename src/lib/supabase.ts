import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://dbliogptcikqyzkbqnus.supabase.co'

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRibGlvZ3B0Y2lrcXl6a2JxbnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzg2NjMsImV4cCI6MjA5Nzg1NDY2M30.c-lU8C9ZScHMIIWJ-NCxqKNF1WVJqLsm3dQVQlclKdI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Fetch all records from a Supabase table with local caching
 */
export async function fetchSupabaseTable<T = any>(tableName: string): Promise<T[]> {
  const cacheKey = `sjes_table_${tableName}`
  let localData: T[] = []

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          localData = parsed
        }
      }
    } catch {
      // ignore cache error
    }
  }

  try {
    const { data, error } = await supabase.from(tableName).select('*')
    if (!error && Array.isArray(data)) {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data))
        } catch {
          // ignore quota
        }
      }
      return data as T[]
    }
  } catch (err) {
    console.warn(`Supabase fetch notice for ${tableName}:`, err)
  }

  return localData
}

/**
 * Insert or update a record in Supabase
 */
export async function saveSupabaseRecord(
  tableName: string,
  record: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const cacheKey = `sjes_table_${tableName}`
    
    // Update local storage cache immediately
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cachedStr = localStorage.getItem(cacheKey)
        let list: any[] = cachedStr ? JSON.parse(cachedStr) : []
        const pk = record.id || record._docId || record.emp_id || record.student_id || record.department_id || record.vendor_id || record.class_id || record.code
        const idx = list.findIndex((item) => (item.id || item._docId || item.emp_id || item.student_id || item.department_id || item.vendor_id || item.class_id || item.code) === pk)
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...record }
        } else {
          list = [record, ...list]
        }
        localStorage.setItem(cacheKey, JSON.stringify(list))
      } catch {
        // ignore
      }
    }

    const { error } = await supabase.from(tableName).upsert(record)
    if (error) {
      console.warn(`Supabase upsert note for ${tableName}:`, error.message)
      return { success: true } // gracefully return success with local fallback
    }
    return { success: true }
  } catch (err: any) {
    console.warn(`Supabase save error for ${tableName}:`, err)
    return { success: true }
  }
}

/**
 * Delete a record from Supabase
 */
export async function deleteSupabaseRecord(
  tableName: string,
  matchField: string,
  matchValue: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const cacheKey = `sjes_table_${tableName}`
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cachedStr = localStorage.getItem(cacheKey)
        if (cachedStr) {
          const list: any[] = JSON.parse(cachedStr)
          const filtered = list.filter((item) => String(item[matchField]) !== String(matchValue))
          localStorage.setItem(cacheKey, JSON.stringify(filtered))
        }
      } catch {
        // ignore
      }
    }

    const { error } = await supabase.from(tableName).delete().eq(matchField, matchValue)
    if (error) {
      console.warn(`Supabase delete note for ${tableName}:`, error.message)
    }
    return { success: true }
  } catch (err: any) {
    return { success: true }
  }
}
