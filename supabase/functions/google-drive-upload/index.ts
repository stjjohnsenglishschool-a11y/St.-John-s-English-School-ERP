import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors })

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const auth = req.headers.get('Authorization') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Sign in before uploading files.' }, 401)
  const form = await req.formData()
  const file = form.get('file'), schoolId = String(form.get('school_id') ?? ''), category = String(form.get('category') ?? 'School document')
  const studentId = String(form.get('student_id') ?? '') || null, staffId = String(form.get('staff_id') ?? '') || null
  if (!(file instanceof File) || !schoolId) return json({ error: 'File and school are required.' }, 400)
  if (file.size > 15 * 1024 * 1024) return json({ error: 'Maximum file size is 15 MB.' }, 413)
  const { data: allowed } = await supabase.rpc('has_school_role', {target_school:schoolId,allowed_roles:['super_admin','school_admin','principal','vice_principal','teacher']})
  if (!allowed) return json({ error: 'Your role cannot upload school documents.' }, 403)
  const clientId=Deno.env.get('GOOGLE_CLIENT_ID'), clientSecret=Deno.env.get('GOOGLE_CLIENT_SECRET'), refreshToken=Deno.env.get('GOOGLE_REFRESH_TOKEN')
  const folderSetting=Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')??'', folderId=folderSetting.match(/folders\/([^/?]+)/)?.[1]??folderSetting
  if (!clientId||!clientSecret||!refreshToken||!folderId) return json({ error: 'Google Drive server secrets are incomplete.' }, 503)
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:'refresh_token'})})
  const token=await tokenResponse.json()
  if (!tokenResponse.ok||!token.access_token) return json({ error: 'Google authorization must be renewed.' }, 502)
  const boundary=`sjes_${crypto.randomUUID()}`, metadata=JSON.stringify({name:file.name,parents:[folderId]})
  const uploadBody=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,`--${boundary}\r\nContent-Type: ${file.type||'application/octet-stream'}\r\n\r\n`,await file.arrayBuffer(),`\r\n--${boundary}--`])
  const driveResponse=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink',{method:'POST',headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':`multipart/related; boundary=${boundary}`},body:uploadBody})
  const driveFile=await driveResponse.json()
  if (!driveResponse.ok) return json({ error: driveFile.error?.message??'Google Drive upload failed.' }, 502)
  const {data:document,error}=await supabase.from('documents').insert({school_id:schoolId,student_id:studentId,staff_id:staffId,name:driveFile.name,category,storage_provider:'google_drive',provider_file_id:driveFile.id,mime_type:driveFile.mimeType,size_bytes:Number(driveFile.size??file.size),uploaded_by:user.id}).select().single()
  if (error) return json({ error:error.message }, 400)
  return json({ document, drive_url:driveFile.webViewLink })
})
