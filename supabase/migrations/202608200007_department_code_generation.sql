create sequence if not exists public.department_code_sequence start with 1;

create or replace function public.assign_department_code()
returns trigger language plpgsql security definer as $$
declare
  dept_abbr text;
begin
  if new.department_code is null or btrim(new.department_code) = '' then
    if new.department_name is not null and btrim(new.department_name) <> '' then
      dept_abbr := upper(regexp_replace(new.department_name, '[^a-zA-Z0-9]', '', 'g'));
      dept_abbr := substring(dept_abbr from 1 for 4);
      if length(dept_abbr) < 2 then
        dept_abbr := 'D' || lpad(nextval('public.department_code_sequence')::text, 3, '0');
      end if;
      new.department_code := 'DEPT-' || dept_abbr;
    else
      new.department_code := 'DEPT-' || lpad(nextval('public.department_code_sequence')::text, 3, '0');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_department_code_before_insert on public.department_master;
create trigger assign_department_code_before_insert
before insert on public.department_master
for each row execute function public.assign_department_code();
