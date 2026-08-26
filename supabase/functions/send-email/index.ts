import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
serve(async req => {
  const auth = req.headers.get('Authorization') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  // Validate recipient/template, call Gmail API with a server-side OAuth token,
  // and record the outcome in communication_log. Never accept arbitrary HTML from clients.
  return Response.json({ message: 'Connect Google OAuth before enabling email.' }, { status: 501 })
})
