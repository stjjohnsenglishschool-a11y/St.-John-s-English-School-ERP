-- Directory of every visible ERP menu and submenu for St. John's English School.
-- The frontend keeps its routes in src/modules.ts; this table provides the
-- authoritative, auditable Supabase record of those routes and display names.

create table if not exists public.erp_navigation_modules (
  module_id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  menu_name text not null,
  module_name text not null,
  module_key text not null,
  table_name text,
  display_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, module_key)
);

create index if not exists erp_navigation_modules_school_order_idx
  on public.erp_navigation_modules(school_id, display_order);

alter table public.erp_navigation_modules enable row level security;
grant select on public.erp_navigation_modules to authenticated;
grant insert, update, delete on public.erp_navigation_modules to authenticated;
revoke all on public.erp_navigation_modules from anon;

drop policy if exists "erp staff read navigation modules" on public.erp_navigation_modules;
drop policy if exists "erp admins manage navigation modules" on public.erp_navigation_modules;

create policy "erp staff read navigation modules"
  on public.erp_navigation_modules for select to authenticated
  using (public.erp_staff_access());

create policy "erp admins manage navigation modules"
  on public.erp_navigation_modules for all to authenticated
  using (public.erp_admin_access())
  with check (public.erp_admin_access());

insert into public.erp_navigation_modules
  (school_id, menu_name, module_name, module_key, table_name, display_order, is_active)
select
  school.id,
  item.menu_name,
  item.module_name,
  item.module_key,
  item.table_name,
  item.display_order,
  true
from public.schools as school
cross join (
  values
    ('Dashboard', 'Overview', 'overview', null, 1),
    ('Masters', 'Department', 'department_master', 'department_master', 10),
    ('Masters', 'Class', 'class_master', 'class_master', 11),
    ('Masters', 'Subject', 'subject_master', 'subject_master', 12),
    ('Masters', 'Vendor', 'vendor_master', 'vendor_master', 13),
    ('People', 'Student', 'student_master', 'student_master', 20),
    ('People', 'Employee', 'employee_master', 'employee_master', 21),
    ('People', 'User', 'user_master', 'user_master', 22),
    ('Attendance', 'Student Attendance', 'student_attendance', 'student_attendance', 30),
    ('Attendance', 'Employee Attendance', 'employee_attendance', 'employee_attendance', 31),
    ('Finance', 'Fees Collection', 'fees_collection', 'fees_collection', 40),
    ('Finance', 'Expense', 'expense_master', 'expense_master', 41),
    ('Finance', 'Income', 'income_master', 'income_master', 42),
    ('Finance', 'Salary Slip', 'salary_slip', 'salary_slip', 43),
    ('HR', 'Leave Application', 'leave_application', 'leave_application', 50),
    ('HR', 'Leave Balance', 'leave_balance', 'leave_balance', 51),
    ('HR', 'Warning Letter', 'warning_letter', 'warning_letter', 52),
    ('HR', 'Offer Letter', 'offer_letter', 'offer_letter', 53),
    ('HR', 'Employee Document', 'employee_document', 'employee_document', 54),
    ('Assets & Inventory', 'Asset', 'asset_master', 'asset_master', 60),
    ('Assets & Inventory', 'Inventory', 'inventory_master', 'inventory_master', 61),
    ('ID Cards', 'Teacher ID Card', 'teacher_idcard', 'teacher_idcard', 70),
    ('ID Cards', 'Student ID Card', 'student_idcard', 'student_idcard', 71),
    ('ID Cards', 'Escort Card', 'escort_card', 'escort_card', 72),
    ('Academics', 'Assignments', 'assignments_master', 'assignments_master', 80),
    ('Academics', 'Notice Automation', 'notice_automation', 'notice_automation', 81),
    ('System', 'User Activity Log', 'userlog_master', 'userlog_master', 90)
) as item(menu_name, module_name, module_key, table_name, display_order)
where school.code = 'STJES'
on conflict (school_id, module_key) do update set
  menu_name = excluded.menu_name,
  module_name = excluded.module_name,
  table_name = excluded.table_name,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  updated_at = now();
