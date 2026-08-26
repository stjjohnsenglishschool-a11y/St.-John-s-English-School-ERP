-- Authoritative 26-table schema supplied for the St. John's ERP frontend.
-- Password authentication remains in Supabase Auth. RLS remains enabled.

do $$ begin
 create type public.app_role as enum('super_admin','school_admin','principal','vice_principal','teacher','accountant','hr_manager','staff','parent','student');
exception when duplicate_object then null; end $$;

create table if not exists public.schools(
 id uuid primary key default gen_random_uuid(), name text not null, code text unique not null,
 email text, phone text, address text, city text, state text, pincode text, created_at timestamptz default now()
);
create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade, full_name text,
 phone text, avatar_url text, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.user_roles(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 school_id uuid not null references public.schools(id) on delete cascade, role public.app_role not null,
 created_at timestamptz default now(), unique(user_id,school_id,role)
);
create table if not exists public.login_aliases(
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, username text not null,
 display_name text, portal_type public.app_role not null, login_email text not null,
 last_login_at timestamptz, is_active boolean not null default true, created_at timestamptz default now(),
 unique(school_id,username), unique(school_id,user_id)
);
create unique index if not exists login_aliases_username_ci on public.login_aliases(school_id,lower(username));

create or replace function public.has_school_role(target_school uuid,allowed_roles public.app_role[]) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and school_id=target_school and role=any(allowed_roles));
$$;
create or replace function public.create_profile_for_auth_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,full_name,phone,avatar_url)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.raw_user_meta_data->>'phone',new.raw_user_meta_data->>'avatar_url')
 on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup after insert on auth.users for each row execute function public.create_profile_for_auth_user();
revoke all on function public.has_school_role(uuid,public.app_role[]),public.create_profile_for_auth_user() from public,anon;
grant execute on function public.has_school_role(uuid,public.app_role[]) to authenticated;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.login_aliases enable row level security;
grant select on public.schools,public.profiles,public.user_roles,public.login_aliases to authenticated;
grant insert,update,delete on public.user_roles,public.login_aliases to authenticated;
create policy "members read school" on public.schools for select to authenticated
 using(exists(select 1 from public.user_roles where user_id=auth.uid() and school_id=schools.id));
create policy "users read own profile" on public.profiles for select to authenticated using(id=auth.uid());
create policy "users read own roles" on public.user_roles for select to authenticated using(user_id=auth.uid());
create policy "admins manage roles" on public.user_roles for all to authenticated
 using(public.has_school_role(school_id,array['super_admin','school_admin']::public.app_role[]))
 with check(public.has_school_role(school_id,array['super_admin','school_admin']::public.app_role[]));
create policy "users read own login alias" on public.login_aliases for select to authenticated using(user_id=auth.uid());
create policy "admins manage login aliases" on public.login_aliases for all to authenticated
 using(public.has_school_role(school_id,array['super_admin','school_admin']::public.app_role[]))
 with check(public.has_school_role(school_id,array['super_admin','school_admin']::public.app_role[]));

insert into public.schools(name,code,email,phone,address,city,state,pincode)
values('St. John''s English School','STJES','st.jjohnsenglishschool@gmail.com','9674368297','Dankuni, Hooghly 712311','Dankuni','West Bengal','712311')
on conflict(code) do update set name=excluded.name,phone=excluded.phone,address=excluded.address,city=excluded.city,state=excluded.state,pincode=excluded.pincode;

create table if not exists public.department_master(
 department_id uuid primary key default gen_random_uuid(), department_code varchar(20) unique not null,
 department_name varchar(150) not null, description text, is_active boolean default true,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.user_master(
 user_id uuid primary key default gen_random_uuid(), user_full_name varchar(200) not null,
 user_name varchar(100) unique not null, password text not null default 'SUPABASE_AUTH',
 department varchar(150), active_module text[], status varchar(20) default 'active',
 role varchar(50) default 'staff', last_login_at timestamptz, is_active boolean default true,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.user_master alter column password set default 'SUPABASE_AUTH';
create table if not exists public.class_master(
 class_id uuid primary key default gen_random_uuid(), class_name varchar(50) not null,
 academic_year varchar(10), capacity integer default 40, is_active boolean default true,
 created_at timestamptz default now(), updated_at timestamptz default now(), unique(class_name,academic_year)
);
create table if not exists public.employee_master(
 emp_id uuid primary key default gen_random_uuid(), emp_code varchar(20) unique not null,
 first_name varchar(80) not null, last_name varchar(80) not null, date_of_birth date,
 gender varchar(10), mobile_primary varchar(15), designation varchar(100), employment_type varchar(30),
 employment_status varchar(30) default 'Active', date_of_joining date, basic_salary numeric(10,2),
 bank_name varchar(100), bank_account_no varchar(30), ifsc_code varchar(15), is_active boolean default true,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.student_master(
 student_id uuid primary key default gen_random_uuid(), admission_no varchar(30) unique not null,
 gr_number varchar(30), roll_no varchar(20), academic_year varchar(10), full_name varchar(80) not null,
 date_of_birth date, gender varchar(10), mobile_primary varchar(15), father_name varchar(150),
 mother_name varchar(150), address text, is_active boolean default true,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.vendor_master(
 vendor_id uuid primary key default gen_random_uuid(), vendor_code varchar(20) unique not null,
 vendor_name varchar(200) not null, vendor_type varchar(80), contact_person varchar(150),
 phone_primary varchar(15), phone_secondary varchar(15), email varchar(150), whatsapp_number varchar(15),
 address text, payment_terms varchar(100), credit_limit numeric(12,2), outstanding_amount numeric(12,2) default 0,
 rating smallint, is_active boolean default true, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.asset_master(
 asset_id uuid primary key default gen_random_uuid(), asset_code varchar(30) unique not null,
 asset_name varchar(200) not null, asset_category varchar(80), asset_type varchar(80), brand varchar(100),
 model varchar(100), serial_number varchar(100), purchase_date date, purchase_price numeric(12,2),
 current_value numeric(12,2), condition varchar(30), status varchar(30) default 'Active', assigned_to varchar(200),
 warranty_expiry date, vendor_name varchar(200), remarks text, is_active boolean default true,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.inventory_master(
 item_id uuid primary key default gen_random_uuid(), item_code varchar(30) unique not null,
 item_name varchar(200) not null, item_category varchar(80), item_sub_category varchar(80), description text,
 unit varchar(20), current_stock numeric(10,2) default 0, minimum_stock numeric(10,2) default 0,
 maximum_stock numeric(10,2), unit_cost numeric(10,2), vendor_id uuid references public.vendor_master(vendor_id),
 last_purchase_date date, expiry_date date, is_consumable boolean default true, is_active boolean default true,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.fees_collection(
 fee_id uuid primary key default gen_random_uuid(), student_id uuid references public.student_master(student_id),
 admission_no varchar(30), student_name varchar(255), class_name varchar(50), academic_year varchar(10),
 fee_type varchar(80), amount_due numeric(12,2), amount_paid numeric(12,2) default 0, payment_date date,
 payment_mode varchar(30), receipt_number varchar(50), status varchar(30) default 'pending', remarks text,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.expense_master(
 expense_id uuid primary key default gen_random_uuid(), expense_date date not null, expense_category varchar(80),
 description text, amount numeric(12,2) not null, payment_mode varchar(30),
 vendor_id uuid references public.vendor_master(vendor_id), vendor_name varchar(200), approved_by varchar(200),
 status varchar(30) default 'approved', remarks text, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.income_master(
 income_id uuid primary key default gen_random_uuid(), income_date date not null, income_type varchar(80),
 description text, amount numeric(12,2) not null, payment_mode varchar(30), received_from varchar(200),
 receipt_number varchar(50), status varchar(30) default 'received', remarks text,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.leave_application(
 leave_app_id uuid primary key default gen_random_uuid(), emp_id uuid references public.employee_master(emp_id),
 employee_name varchar(255), leave_type varchar(50), from_date date, to_date date, total_days numeric(4,1),
 reason text, status varchar(20) default 'pending', approved_by varchar(200), remarks text,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.leave_balance(
 balance_id uuid primary key default gen_random_uuid(), emp_id uuid references public.employee_master(emp_id),
 employee_name varchar(255), academic_year varchar(10), leave_type varchar(50), total_entitled integer default 0,
 total_taken integer default 0, total_pending integer default 0, balance_remaining integer default 0,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.warning_letter(
 letter_id uuid primary key default gen_random_uuid(), emp_id uuid references public.employee_master(emp_id),
 employee_name varchar(255), issue_date date, warning_type varchar(80), subject varchar(255), description text,
 issued_by varchar(200), acknowledged boolean default false, status varchar(30) default 'issued',
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.offer_letter(
 offer_id uuid primary key default gen_random_uuid(), candidate_name varchar(255), designation varchar(100),
 joining_date date, basic_salary numeric(10,2), offer_date date, valid_until date,
 status varchar(30) default 'issued', issued_by varchar(200), created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.teacher_idcard(
 card_id uuid primary key default gen_random_uuid(), emp_id uuid references public.employee_master(emp_id),
 employee_name varchar(255), designation varchar(100), department varchar(150), mobile varchar(15), photo_url text,
 issue_date date, valid_until date, is_active boolean default true, created_at timestamptz default now()
);
create table if not exists public.student_idcard(
 card_id uuid primary key default gen_random_uuid(), student_id uuid references public.student_master(student_id),
 student_name varchar(255), class_name varchar(50), roll_no varchar(20), mobile varchar(15), photo_url text,
 issue_date date, valid_until date, is_active boolean default true, created_at timestamptz default now()
);
create table if not exists public.escort_card(
 card_id uuid primary key default gen_random_uuid(), student_name varchar(255), class_name varchar(50),
 escort_name varchar(255), relation varchar(50), mobile varchar(15), photo_url text, issue_date date,
 valid_until date, is_active boolean default true, created_at timestamptz default now()
);
create table if not exists public.salary_slip(
 slip_id uuid primary key default gen_random_uuid(), emp_id uuid references public.employee_master(emp_id),
 employee_name varchar(255), month varchar(20), year integer, basic_salary numeric(10,2), hra numeric(10,2),
 da numeric(10,2), other_allowances numeric(10,2), gross_salary numeric(10,2), pf_deduction numeric(10,2),
 esi_deduction numeric(10,2), tds numeric(10,2), other_deductions numeric(10,2), total_deductions numeric(10,2),
 net_salary numeric(10,2), payment_date date, payment_mode varchar(30), status varchar(20) default 'generated',
 created_at timestamptz default now()
);
create table if not exists public.assignments_master(
 assignment_id uuid primary key default gen_random_uuid(), class_name varchar(50), subject varchar(100),
 title varchar(255), description text, assigned_by varchar(200), assigned_date date, due_date date,
 attachment_url text, status varchar(30) default 'active', created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.student_attendance(
 attendance_id uuid primary key default gen_random_uuid(), student_id uuid references public.student_master(student_id),
 student_name varchar(255), class_name varchar(50), attendance_date date not null, status varchar(20) default 'present',
 remarks text, marked_by varchar(200), created_at timestamptz default now()
);
create table if not exists public.employee_attendance(
 attendance_id uuid primary key default gen_random_uuid(), employee_name varchar(255), attendance_date date not null,
 check_in_time time, check_out_time time, status varchar(20) default 'present', remarks text, created_at timestamptz default now()
);
create table if not exists public.subject_master(
 subject_id uuid primary key default gen_random_uuid(), subject_name varchar(150) not null,
 subject_type varchar(50), is_active boolean default true, created_at timestamptz default now()
);
create table if not exists public.userlog_master(
 log_id uuid primary key default gen_random_uuid(), user_id uuid references public.user_master(user_id),
 username varchar(100), action varchar(100), module varchar(100), status varchar(30), error_message text,
 device_info text, browser varchar(100), created_at timestamptz default now()
);
create table if not exists public.notice_automation(
 notice_id uuid primary key default gen_random_uuid(), title varchar(255), message text, send_via varchar(50),
 scheduled_at timestamptz, status varchar(30) default 'draft', created_by varchar(200), created_at timestamptz default now()
);
create table if not exists public.employee_document(
 doc_id uuid primary key default gen_random_uuid(), emp_id uuid references public.employee_master(emp_id),
 employee_name varchar(255), employee_designation varchar(100), employee_department varchar(150),
 doc_type varchar(100), file_url text, is_verified boolean default false, remarks text, created_at timestamptz default now()
);

create or replace function public.erp_staff_access() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and role=any(array['super_admin','school_admin','principal','vice_principal','teacher','accountant','hr_manager','staff']::public.app_role[]));
$$;
create or replace function public.erp_admin_access() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and role=any(array['super_admin','school_admin','principal']::public.app_role[]));
$$;
create or replace function public.erp_finance_access() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and role=any(array['super_admin','school_admin','principal','accountant']::public.app_role[]));
$$;
revoke all on function public.erp_staff_access(),public.erp_admin_access(),public.erp_finance_access() from public,anon;
grant execute on function public.erp_staff_access(),public.erp_admin_access(),public.erp_finance_access() to authenticated;

do $$
declare table_name text;
begin
 foreach table_name in array array[
  'department_master','user_master','class_master','employee_master','student_master','vendor_master',
  'asset_master','inventory_master','fees_collection','expense_master','income_master','leave_application',
  'leave_balance','warning_letter','offer_letter','teacher_idcard','student_idcard','escort_card','salary_slip',
  'assignments_master','student_attendance','employee_attendance','subject_master','userlog_master',
  'notice_automation','employee_document'
 ] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('grant select,insert,update,delete on public.%I to authenticated',table_name);
  execute format('revoke all on public.%I from anon',table_name);
 end loop;
end $$;

do $$
declare table_name text;
begin
 foreach table_name in array array[
  'department_master','class_master','employee_master','student_master','vendor_master','asset_master',
  'inventory_master','leave_application','leave_balance','warning_letter','offer_letter','teacher_idcard',
  'student_idcard','escort_card','assignments_master','student_attendance','employee_attendance','subject_master',
  'notice_automation','employee_document'
 ] loop
  execute format('create policy "erp staff manage" on public.%I for all to authenticated using(public.erp_staff_access()) with check(public.erp_staff_access())',table_name);
 end loop;
end $$;

create policy "erp admins manage users" on public.user_master for all to authenticated using(public.erp_admin_access()) with check(public.erp_admin_access());
create policy "erp admins read logs" on public.userlog_master for select to authenticated using(public.erp_admin_access());
create policy "erp finance manage fees" on public.fees_collection for all to authenticated using(public.erp_finance_access()) with check(public.erp_finance_access());
create policy "erp finance manage expenses" on public.expense_master for all to authenticated using(public.erp_finance_access()) with check(public.erp_finance_access());
create policy "erp finance manage income" on public.income_master for all to authenticated using(public.erp_finance_access()) with check(public.erp_finance_access());
create policy "erp finance manage salary" on public.salary_slip for all to authenticated using(public.erp_finance_access()) with check(public.erp_finance_access());

create index if not exists student_master_name_idx on public.student_master(full_name);
create index if not exists employee_master_name_idx on public.employee_master(last_name,first_name);
create index if not exists fees_collection_student_idx on public.fees_collection(student_id,status);
create index if not exists student_attendance_date_idx on public.student_attendance(attendance_date,class_name);
create index if not exists employee_attendance_date_idx on public.employee_attendance(attendance_date);
create index if not exists assignments_due_idx on public.assignments_master(due_date,status);

insert into public.department_master(department_code,department_name,description,is_active) values
 ('DEPT-TCH','Teacher','Teaching Staff Department',true),('DEPT-STF','Staff','Non-Teaching Staff',true),
 ('DEPT-OFF','Office Staff','Administrative Office',true),('DEPT-ACC','Accounts','Accounts Department',true),
 ('DEPT-SPT','Sports','Sports Department',true),('DEPT-IT','IT Department','Information Technology',true),
 ('DEPT-CLN','Cleaning Staff','Housekeeping',true)
on conflict(department_code) do nothing;
insert into public.class_master(class_name,academic_year,capacity,is_active) values
 ('PG','2026-27',20,true),('NURSERY','2026-27',25,true),('LKG','2026-27',30,true),('UKG','2026-27',30,true),
 ('CLASS I','2026-27',40,true),('CLASS II','2026-27',40,true),('CLASS III','2026-27',40,true),
 ('CLASS IV','2026-27',40,true),('CLASS V','2026-27',40,true),('CLASS VI','2026-27',40,true),
 ('CLASS VII','2026-27',40,true),('CLASS VIII','2026-27',40,true)
on conflict(class_name,academic_year) do nothing;
insert into public.user_master(user_full_name,user_name,password,role,status,is_active)
values('System Admin','admin','SUPABASE_AUTH','admin','active',true)
on conflict(user_name) do update set password='SUPABASE_AUTH',role='admin',status='active',is_active=true;
