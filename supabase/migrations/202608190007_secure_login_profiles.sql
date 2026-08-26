-- Friendly login identities. Passwords remain exclusively in Supabase Auth and are never stored here.
create table public.login_aliases(
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  username text not null,
  display_name text,
  portal_type public.app_role not null,
  last_login_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(school_id,username), unique(school_id,user_id)
);
create unique index login_aliases_username_ci on public.login_aliases(school_id,lower(username));
alter table public.login_aliases enable row level security;
create policy "users read own login identity" on public.login_aliases for select to authenticated using(user_id=auth.uid());
create policy "admins manage login identities" on public.login_aliases for all to authenticated using(public.has_school_role(school_id,array['super_admin','school_admin']::public.app_role[])) with check(public.has_school_role(school_id,array['super_admin','school_admin']::public.app_role[]));

create or replace function public.create_profile_for_auth_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,full_name,phone,avatar_url) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.raw_user_meta_data->>'phone',new.raw_user_meta_data->>'avatar_url') on conflict(id) do nothing; return new; end $$;
drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup after insert on auth.users for each row execute function public.create_profile_for_auth_user();
revoke all on function public.create_profile_for_auth_user() from public,anon,authenticated;
