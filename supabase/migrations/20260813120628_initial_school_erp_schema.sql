create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum ('super_admin','school_admin','principal','vice_principal','teacher','accountant','hr_manager','librarian','transport_manager','staff','parent','student'); exception when duplicate_object then null; end $$;
do $$ begin create type public.gender as enum ('male','female','other','prefer_not_to_say'); exception when duplicate_object then null; end $$;
do $$ begin create type public.attendance_status as enum ('present','absent','late','half_day','leave'); exception when duplicate_object then null; end $$;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  email text,
  phone text,
  address text,
  city text,
  state text default 'West Bengal',
  country text not null default 'India',
  pincode text,
  logo_url text,
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, school_id, role)
);

create table public.academic_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique(school_id, name)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(school_id, name)
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  capacity integer,
  created_at timestamptz not null default now(),
  unique(class_id, name),
  check (capacity is null or capacity > 0)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  admission_no text not null,
  roll_no text,
  first_name text not null,
  middle_name text,
  last_name text,
  date_of_birth date,
  gender public.gender,
  blood_group text,
  nationality text default 'Indian',
  religion text,
  category text,
  aadhaar_last4 text,
  photo_url text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  pincode text,
  admission_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(school_id, admission_no)
);

create table public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  academic_session_id uuid not null references public.academic_sessions(id) on delete cascade,
  class_id uuid not null references public.classes(id),
  section_id uuid references public.sections(id),
  roll_no text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique(student_id, academic_session_id)
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  relation text not null,
  phone text,
  email text,
  occupation text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  code text,
  max_marks numeric(8,2),
  pass_marks numeric(8,2),
  created_at timestamptz not null default now(),
  unique(school_id, name)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  academic_session_id uuid not null references public.academic_sessions(id) on delete cascade,
  attendance_date date not null,
  status public.attendance_status not null,
  remarks text,
  marked_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(student_id, attendance_date)
);

create table public.fee_heads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  code text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(school_id, name)
);

create table public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_session_id uuid not null references public.academic_sessions(id) on delete cascade,
  class_id uuid references public.classes(id),
  fee_head_id uuid not null references public.fee_heads(id),
  amount numeric(12,2) not null check(amount >= 0),
  frequency text not null default 'annual',
  due_day integer,
  created_at timestamptz not null default now()
);

create table public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id),
  academic_session_id uuid not null references public.academic_sessions(id),
  receipt_no text not null,
  amount numeric(12,2) not null check(amount > 0),
  payment_method text not null default 'cash',
  transaction_ref text,
  paid_at timestamptz not null default now(),
  collected_by uuid references public.profiles(id),
  remarks text,
  created_at timestamptz not null default now(),
  unique(school_id, receipt_no)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  school_id uuid references public.schools(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text,
  record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_user_roles_user_school on public.user_roles(user_id, school_id);
create index idx_students_school on public.students(school_id);
create index idx_enrollments_session_class on public.student_enrollments(academic_session_id, class_id);
create index idx_attendance_student_date on public.attendance(student_id, attendance_date);
create index idx_fee_payments_student_date on public.fee_payments(student_id, paid_at);
create index idx_audit_logs_school_date on public.audit_logs(school_id, created_at desc);

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.academic_sessions enable row level security;
alter table public.classes enable row level security;
alter table public.sections enable row level security;
alter table public.students enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.guardians enable row level security;
alter table public.subjects enable row level security;
alter table public.attendance enable row level security;
alter table public.fee_heads enable row level security;
alter table public.fee_structures enable row level security;
alter table public.fee_payments enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.has_school_role(target_school uuid, allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = target_school
      and ur.role = any(allowed_roles)
  );
$$;

create policy "profiles_self_read" on public.profiles for select using (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update using (id = auth.uid());
create policy "roles_self_read" on public.user_roles for select using (user_id = auth.uid());
create policy "school_members_read" on public.schools for select using (public.has_school_role(id, array['super_admin','school_admin','principal','vice_principal','teacher','accountant','hr_manager','librarian','transport_manager','staff','parent','student']::public.app_role[]));
create policy "academic_members_read" on public.academic_sessions for select using (public.has_school_role(school_id, array['super_admin','school_admin','principal','vice_principal','teacher','accountant','hr_manager','librarian','transport_manager','staff','parent','student']::public.app_role[]));
create policy "classes_members_read" on public.classes for select using (public.has_school_role(school_id, array['super_admin','school_admin','principal','vice_principal','teacher','parent','student']::public.app_role[]));
create policy "sections_members_read" on public.sections for select using (exists(select 1 from public.classes c where c.id=class_id and public.has_school_role(c.school_id, array['super_admin','school_admin','principal','vice_principal','teacher','parent','student']::public.app_role[])));
create policy "students_staff_read" on public.students for select using (public.has_school_role(school_id, array['super_admin','school_admin','principal','vice_principal','teacher','accountant','hr_manager','librarian','transport_manager','staff']::public.app_role[]));
create policy "students_admin_write" on public.students for all using (public.has_school_role(school_id, array['super_admin','school_admin','principal']::public.app_role[])) with check (public.has_school_role(school_id, array['super_admin','school_admin','principal']::public.app_role[]));
create policy "enrollment_staff_read" on public.student_enrollments for select using (exists(select 1 from public.students s where s.id=student_id and public.has_school_role(s.school_id, array['super_admin','school_admin','principal','vice_principal','teacher','accountant','staff']::public.app_role[])));
create policy "guardians_staff_read" on public.guardians for select using (exists(select 1 from public.students s where s.id=student_id and public.has_school_role(s.school_id, array['super_admin','school_admin','principal','vice_principal','teacher','staff']::public.app_role[])));
create policy "subjects_members_read" on public.subjects for select using (public.has_school_role(school_id, array['super_admin','school_admin','principal','vice_principal','teacher','student','parent']::public.app_role[]));
create policy "attendance_staff_read" on public.attendance for select using (exists(select 1 from public.students s where s.id=student_id and public.has_school_role(s.school_id, array['super_admin','school_admin','principal','vice_principal','teacher','staff']::public.app_role[])));
create policy "fees_accounting_read" on public.fee_heads for select using (public.has_school_role(school_id, array['super_admin','school_admin','principal','accountant','parent','student']::public.app_role[]));
create policy "fee_structures_accounting_read" on public.fee_structures for select using (public.has_school_role(school_id, array['super_admin','school_admin','principal','accountant','parent','student']::public.app_role[]));
create policy "payments_accounting_read" on public.fee_payments for select using (public.has_school_role(school_id, array['super_admin','school_admin','principal','accountant']::public.app_role[]));
create policy "audit_admin_read" on public.audit_logs for select using (public.has_school_role(school_id, array['super_admin','school_admin','principal']::public.app_role[]));
;
