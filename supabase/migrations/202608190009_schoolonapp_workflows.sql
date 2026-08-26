-- Dedicated workflow tables for the SchoolOnApp-inspired top-menu experience.
-- Library and transport are intentionally excluded for St. John's English School.

create table public.school_accounts(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  account_name text not null,
  bank_name text,
  account_number text,
  ifsc_code text,
  pan_number text,
  gst_number text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_permissions(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  role public.app_role not null,
  module_key text not null,
  can_view boolean not null default true,
  can_create boolean not null default false,
  can_update boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  unique(school_id,role,module_key)
);

create table public.admission_forms(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  academic_session_id uuid references public.academic_sessions on delete set null,
  title text not null,
  class_name text,
  opens_on date,
  closes_on date,
  application_fee numeric(12,2) not null default 0,
  form_schema jsonb not null default '[]',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  check(closes_on is null or opens_on is null or closes_on>=opens_on)
);

create table public.inquiry_stages(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  colour text,
  is_closed boolean not null default false,
  unique(school_id,name)
);

create table public.inquiry_followups(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  enquiry_id uuid not null references public.admission_enquiries on delete cascade,
  followup_at timestamptz not null,
  channel text not null default 'call',
  outcome text,
  notes text,
  status text not null default 'planned',
  assigned_to uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

create table public.admission_communications(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  enquiry_id uuid references public.admission_enquiries on delete set null,
  admission_id uuid references public.admissions on delete set null,
  channel text not null,
  recipient text not null,
  message text not null,
  status text not null default 'queued',
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admission_payments(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  admission_id uuid not null references public.admissions on delete cascade,
  receipt_no text not null,
  amount numeric(12,2) not null check(amount>=0),
  payment_method text not null,
  transaction_ref text,
  paid_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique(school_id,receipt_no)
);

create table public.student_tags(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  tag text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique(student_id,tag)
);

create table public.qr_profile_tokens(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  token_label text not null,
  token_hash text not null default md5(gen_random_uuid()::text || clock_timestamp()::text),
  expires_on date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.document_templates(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  name text not null,
  document_type text not null,
  page_size text not null default 'CR80',
  orientation text not null default 'portrait',
  layout jsonb not null default '{}',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_print_history(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  document_type text not null,
  reference_id uuid,
  provider_file_id text,
  file_url text,
  copies integer not null default 1 check(copies>0),
  status text not null default 'generated',
  generated_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

create table public.attendance_devices(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  name text not null,
  device_code text not null,
  device_type text not null,
  location text,
  last_sync_at timestamptz,
  status text not null default 'offline',
  created_at timestamptz not null default now(),
  unique(school_id,device_code)
);

create table public.attendance_alerts(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  attendance_date date not null,
  channel text not null,
  recipient text not null,
  status text not null default 'queued',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.exam_feedback(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  exam_id uuid not null references public.exams on delete cascade,
  rating integer check(rating between 1 and 5),
  comment text,
  acknowledged boolean not null default false,
  submitted_by uuid references public.profiles on delete set null,
  submitted_at timestamptz not null default now(),
  unique(student_id,exam_id)
);

create table public.result_notifications(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  exam_id uuid not null references public.exams on delete cascade,
  channel text not null,
  recipient text not null,
  status text not null default 'queued',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.fee_reminders(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  due_amount numeric(12,2) not null check(due_amount>=0),
  due_date date not null,
  channel text not null,
  status text not null default 'scheduled',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payment_transactions(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  student_id uuid references public.students on delete set null,
  provider text not null,
  order_id text not null,
  transaction_id text,
  amount numeric(12,2) not null check(amount>=0),
  currency text not null default 'INR',
  status text not null default 'created',
  provider_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(school_id,provider,order_id)
);

create table public.cheque_records(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  cheque_no text not null,
  bank_name text not null,
  party_name text not null,
  amount numeric(12,2) not null check(amount>=0),
  cheque_date date not null,
  direction text not null,
  status text not null default 'pending',
  cleared_on date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.school_tasks(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles on delete set null,
  assigned_by uuid references public.profiles on delete set null,
  priority text not null default 'normal',
  due_on date,
  status text not null default 'open',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.custom_forms(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  title text not null,
  description text,
  audience text not null default 'staff',
  form_schema jsonb not null default '[]',
  opens_on date,
  closes_on date,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  check(closes_on is null or opens_on is null or closes_on>=opens_on)
);

create table public.custom_form_responses(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  form_id uuid not null references public.custom_forms on delete cascade,
  respondent_id uuid references public.profiles on delete set null,
  respondent_name text,
  respondent_email text,
  response_data jsonb not null default '{}',
  status text not null default 'submitted',
  submitted_at timestamptz not null default now()
);

create index inquiry_followups_school_date_idx on public.inquiry_followups(school_id,followup_at);
create index admission_payments_school_date_idx on public.admission_payments(school_id,paid_on);
create index attendance_alerts_school_date_idx on public.attendance_alerts(school_id,attendance_date);
create index fee_reminders_school_due_idx on public.fee_reminders(school_id,due_date,status);
create index payment_transactions_school_status_idx on public.payment_transactions(school_id,status);
create index school_tasks_school_due_idx on public.school_tasks(school_id,status,due_on);
create index custom_form_responses_form_idx on public.custom_form_responses(form_id,submitted_at);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'school_accounts','role_permissions','admission_forms','inquiry_stages',
    'inquiry_followups','admission_communications','admission_payments','student_tags',
    'qr_profile_tokens','document_templates','document_print_history','attendance_devices',
    'attendance_alerts','exam_feedback','result_notifications','fee_reminders',
    'payment_transactions','cheque_records','school_tasks','custom_forms','custom_form_responses'
  ] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('grant select,insert,update,delete on public.%I to authenticated',table_name);
  end loop;
end $$;

-- Administrative configuration is limited to school leadership.
create policy "admins manage school accounts" on public.school_accounts for all to authenticated
using(public.has_school_role(school_id,array['super_admin','school_admin','principal','accountant']::public.app_role[]))
with check(public.has_school_role(school_id,array['super_admin','school_admin','principal','accountant']::public.app_role[]));
create policy "admins manage module rights" on public.role_permissions for all to authenticated
using(public.has_school_role(school_id,array['super_admin','school_admin']::public.app_role[]))
with check(public.has_school_role(school_id,array['super_admin','school_admin']::public.app_role[]));

-- Fee and banking records are limited to leadership and accounts users.
do $$
declare table_name text;
begin
  foreach table_name in array array['admission_payments','fee_reminders','payment_transactions','cheque_records'] loop
    execute format('create policy "accounts staff manage" on public.%I for all to authenticated using(public.has_school_role(school_id,array[''super_admin'',''school_admin'',''principal'',''accountant'']::public.app_role[])) with check(public.has_school_role(school_id,array[''super_admin'',''school_admin'',''principal'',''accountant'']::public.app_role[]))',table_name);
  end loop;
end $$;

-- Remaining workflows are available only to authenticated school staff.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'admission_forms','inquiry_stages','inquiry_followups','admission_communications',
    'student_tags','qr_profile_tokens','document_templates','document_print_history',
    'attendance_devices','attendance_alerts','exam_feedback','result_notifications',
    'school_tasks','custom_forms','custom_form_responses'
  ] loop
    execute format('create policy "school staff manage" on public.%I for all to authenticated using(public.has_school_role(school_id,array[''super_admin'',''school_admin'',''principal'',''vice_principal'',''teacher'',''accountant'',''hr_manager'',''staff'']::public.app_role[])) with check(public.has_school_role(school_id,array[''super_admin'',''school_admin'',''principal'',''vice_principal'',''teacher'',''accountant'',''hr_manager'',''staff'']::public.app_role[]))',table_name);
  end loop;
end $$;
