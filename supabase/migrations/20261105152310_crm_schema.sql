-- Kontur CRM: run once in a NEW Supabase project, as postgres (SQL Editor).
-- Schema migrations are transactional. Do not recreate these tables manually.
begin;

create schema private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke create on schema public from public, anon, authenticated;

create type public.app_role as enum ('manager', 'executor');
create type public.task_status as enum ('new', 'in_progress', 'review', 'revision', 'accepted');

create function private.clean_text(p_value text) returns text
language sql immutable set search_path = '' as $$
  select pg_catalog.btrim(p_value, E' \t\n\r\f\v' || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null check (char_length(private.clean_text(full_name)) between 2 and 120),
  email text not null check (email = lower(email) and char_length(email) between 3 and 254),
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index profiles_email_unique on public.profiles (lower(email));

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(private.clean_text(name)) between 2 and 120),
  address text not null check (char_length(private.clean_text(address)) between 5 and 250),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  deleted_at timestamptz
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(private.clean_text(title)) between 3 and 160),
  description text not null default '' check (char_length(description) <= 5000),
  object_id uuid not null references public.objects(id) on delete restrict,
  assignee_id uuid not null references public.profiles(id) on delete restrict,
  status public.task_status not null default 'new',
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  deleted_at timestamptz
);

create table public.task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  from_status public.task_status,
  to_status public.task_status not null,
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default clock_timestamp(),
  constraint valid_history_transition check (
    (from_status is null and to_status = 'new') or
    (from_status is not null and (
      (from_status = 'new' and to_status = 'in_progress') or
      (from_status = 'in_progress' and to_status = 'review') or
      (from_status = 'review' and to_status in ('accepted', 'revision')) or
      (from_status = 'revision' and to_status = 'in_progress')
    ))
  ),
  constraint revision_needs_comment check (
    to_status <> 'revision' or coalesce(char_length(private.clean_text(comment)), 0) > 0
  )
);

create index objects_created_by_idx on public.objects(created_by);
create index tasks_object_idx on public.tasks(object_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_author_idx on public.tasks(author_id);
create index tasks_live_assignee_status_idx on public.tasks(assignee_id, status) where deleted_at is null;
create index tasks_live_object_status_idx on public.tasks(object_id, status) where deleted_at is null;
create index history_task_time_idx on public.task_history(task_id, created_at, id);
create index history_actor_idx on public.task_history(actor_id);
create unique index history_one_creation_idx on public.task_history(task_id) where from_status is null;

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;

revoke all on public.profiles, public.objects, public.tasks, public.task_history from public, anon, authenticated;
grant select on public.profiles, public.objects, public.tasks, public.task_history to authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

commit;
