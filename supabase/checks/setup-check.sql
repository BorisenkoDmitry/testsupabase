-- Read-only catalog checks. Run as postgres in SQL Editor after migrations and seed.
select 'profiles' as entity, count(*) from public.profiles
union all select 'objects', count(*) from public.objects where deleted_at is null
union all select 'tasks', count(*) from public.tasks where deleted_at is null
union all select 'history', count(*) from public.task_history;
-- Initial expected counts: 3 / 3 / 8 / 21. Counts can change after using the CRM.

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('profiles','objects','tasks','task_history');

select tablename, policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename in ('profiles','objects','tasks','task_history')
order by tablename;
-- Expected: SELECT policies only; no client mutation policy.

select table_name, grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('profiles','objects','tasks','task_history')
and grantee in ('anon','authenticated','PUBLIC') order by table_name,grantee,privilege_type;
-- Expected: authenticated SELECT only. No anon/PUBLIC grants.

select n.nspname as schema_name, p.proname as function_name,
       p.prosecdef as security_definer, p.proconfig,
       has_function_privilege('anon',p.oid,'execute') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'execute') as signed_in_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='public' and p.proname like 'crm_%') or n.nspname='private'
order by n.nspname,p.proname;
-- public.crm_*: security_definer=false, anon=false, authenticated=true.
-- private mutators/helpers: pinned search_path, no PUBLIC/anon execution.

select t.tgname, pg_get_triggerdef(t.oid) from pg_trigger t
where t.tgrelid in ('public.tasks'::regclass,'public.task_history'::regclass) and not t.tgisinternal;
-- Expected: validate_task_assignee and immutable_history.
