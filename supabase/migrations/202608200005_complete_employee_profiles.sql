-- Complete teacher, staff, reporting, academic and contact profile fields.
alter table public.employee_master
  add column if not exists employee_category varchar(40),
  add column if not exists middle_name varchar(80),
  add column if not exists blood_group varchar(5),
  add column if not exists marital_status varchar(20),
  add column if not exists whatsapp_number varchar(15),
  add column if not exists personal_email varchar(150),
  add column if not exists official_email varchar(150),
  add column if not exists emergency_contact_name varchar(150),
  add column if not exists emergency_contact_phone varchar(15),
  add column if not exists current_address text,
  add column if not exists permanent_address text,
  add column if not exists department varchar(150),
  add column if not exists academic_year varchar(10),
  add column if not exists reporting_to varchar(200),
  add column if not exists reporting_designation varchar(100),
  add column if not exists confirmation_date date,
  add column if not exists date_of_leaving date,
  add column if not exists shift_name varchar(100),
  add column if not exists qualification varchar(255),
  add column if not exists professional_qualification varchar(255),
  add column if not exists total_experience_years numeric(4,1),
  add column if not exists subject_specialisation text[],
  add column if not exists classes_assigned text[],
  add column if not exists class_teacher_of varchar(50),
  add column if not exists section_assigned varchar(50),
  add column if not exists employee_photo_url text,
  add column if not exists document_url text,
  add column if not exists pan_number varchar(20);

create index if not exists employee_master_department_idx on public.employee_master(department, employee_category);
create index if not exists employee_master_reporting_idx on public.employee_master(reporting_to);
