import { createClient, SupabaseClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || 'https://zjuowrqmkdzfnrzausgq.supabase.co'
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''

export const isSupabaseConfigured = Boolean(rawUrl && rawKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/**
 * Record an audit log entry in userlog_master table
 */
export async function logActivity(params: {
  username?: string
  action: string
  module: string
  status?: 'success' | 'failed' | 'warning' | 'info'
  errorMessage?: string
}) {
  if (!supabase) return
  try {
    const session = (await supabase.auth.getSession()).data.session
    const username =
      params.username ||
      session?.user?.user_metadata?.full_name ||
      session?.user?.email ||
      'Administrator'

    await supabase.from('userlog_master').insert({
      username,
      action: params.action,
      module: params.module,
      status: params.status || 'success',
      error_message: params.errorMessage || null,
      device_info: `${navigator.platform || ''} · ${navigator.language || ''}`,
      browser: navigator.userAgent.slice(0, 100),
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('Failed to record audit log:', error)
  }
}

/**
 * Upload a document or image to Supabase Storage
 */
export async function uploadToSupabaseStorage(
  file: File,
  bucket = 'school-documents',
  prefix = 'uploads'
): Promise<string> {
  if (!supabase) {
    // If not configured, convert to data url for preview
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const ext = file.name.split('.').pop() || 'bin'
  const filename = `${prefix}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`

  try {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      // If bucket doesn't exist or permissions fail, fallback to base64 preview
      console.warn('Storage upload error, using local data URL fallback:', uploadError.message)
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filename)
    return data.publicUrl
  } catch (err) {
    console.warn('Upload failed:', err)
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}
