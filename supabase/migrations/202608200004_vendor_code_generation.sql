-- Generate one immutable supplier code per new vendor, including CSV imports.
create sequence if not exists public.vendor_code_sequence start with 1;

create or replace function public.assign_vendor_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.vendor_code := 'VND-' || lpad(nextval('public.vendor_code_sequence')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists assign_vendor_code_before_insert on public.vendor_master;
create trigger assign_vendor_code_before_insert
before insert on public.vendor_master
for each row execute function public.assign_vendor_code();
