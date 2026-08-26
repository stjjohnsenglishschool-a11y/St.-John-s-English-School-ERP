import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors={
 'Access-Control-Allow-Origin':'*',
 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS'
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers:cors})
 const {username,password}=await req.json()
 if(typeof username!=='string'||typeof password!=='string'||username.length>100||password.length>200)return Response.json({error:'Invalid login'},{status:400,headers:cors})
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
 const {data:alias}=await admin.from('login_aliases').select('login_email').ilike('username',username.trim()).eq('is_active',true).limit(1).maybeSingle()
 if(!alias?.login_email)return Response.json({error:'Invalid username or password'},{status:401,headers:cors})
 const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!)
 const {data,error}=await auth.auth.signInWithPassword({email:alias.login_email,password})
 if(error||!data.session)return Response.json({error:'Invalid username or password'},{status:401,headers:cors})
 await admin.from('login_aliases').update({last_login_at:new Date().toISOString()}).ilike('username',username.trim())
 return Response.json({access_token:data.session.access_token,refresh_token:data.session.refresh_token},{headers:cors})
})
