-- Read with RLS; write only through authorized RPC functions.
-- private must NOT appear in Dashboard > Data API > Exposed schemas.
begin;

create function private.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.is_active and p.role = 'manager');
$$;

create function private.can_read_task(p_task_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t join public.objects o on o.id = t.object_id
    join public.profiles me on me.id = auth.uid() and me.is_active
    where t.id = p_task_id and t.deleted_at is null and o.deleted_at is null
      and (me.role = 'manager' or t.assignee_id = me.id)
  );
$$;

create function private.can_read_object(p_object_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.objects o
    join public.profiles me on me.id = auth.uid() and me.is_active
    where o.id = p_object_id and o.deleted_at is null and (
      me.role = 'manager' or exists (
        select 1 from public.tasks t where t.object_id = o.id
          and t.assignee_id = me.id and t.deleted_at is null
      )
    )
  );
$$;

create function private.can_read_profile(p_profile_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.is_active and (
      me.role = 'manager' or me.id = p_profile_id or
      exists(select 1 from public.tasks t where (t.author_id = p_profile_id or t.assignee_id = p_profile_id) and private.can_read_task(t.id)) or
      exists(select 1 from public.task_history h where h.actor_id = p_profile_id and private.can_read_task(h.task_id))
    )
  );
$$;

create policy profiles_read on public.profiles for select to authenticated using (private.can_read_profile(id));
create policy objects_read on public.objects for select to authenticated using (private.can_read_object(id));
create policy tasks_read on public.tasks for select to authenticated using (private.can_read_task(id));
create policy history_read on public.task_history for select to authenticated using (private.can_read_task(task_id));

create function private.require_manager() returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_manager() then
    raise exception 'Действие доступно только активному постановщику.' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

create function private.enforce_assignee() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles p where p.id = new.assignee_id and p.role = 'executor' and p.is_active) then
    raise exception 'Назначьте активного исполнителя.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_task_assignee before insert or update of assignee_id on public.tasks
for each row execute function private.enforce_assignee();

create function private.block_history_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Историю задачи нельзя изменять или удалять.' using errcode = '42501';
end;
$$;
create trigger immutable_history before update or delete on public.task_history
for each row execute function private.block_history_mutation();

create function private.create_object(p_name text, p_address text) returns public.objects
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_object public.objects;
begin
  v_actor := private.require_manager();
  insert into public.objects(name, address, created_by)
  values(private.clean_text(p_name), private.clean_text(p_address), v_actor) returning * into v_object;
  return v_object;
end;
$$;

create function private.update_object(p_id uuid, p_expected_version bigint, p_name text, p_address text) returns public.objects
language plpgsql security definer set search_path = '' as $$
declare v_object public.objects;
begin
  perform private.require_manager();
  select * into v_object from public.objects where id = p_id and deleted_at is null for update;
  if not found then raise exception 'Объект не найден.' using errcode = 'P0002'; end if;
  if p_expected_version is distinct from v_object.version then raise exception 'Объект изменён. Обновите страницу.' using errcode = '40001'; end if;
  update public.objects set name = private.clean_text(p_name), address = private.clean_text(p_address),
    updated_at = clock_timestamp(), version = version + 1 where id = p_id returning * into v_object;
  return v_object;
end;
$$;

create function private.delete_object(p_id uuid, p_expected_version bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_object public.objects;
begin
  perform private.require_manager();
  select * into v_object from public.objects where id = p_id and deleted_at is null for update;
  if not found then raise exception 'Объект не найден.' using errcode = 'P0002'; end if;
  if p_expected_version is distinct from v_object.version then raise exception 'Объект изменён. Обновите страницу.' using errcode = '40001'; end if;
  if exists(select 1 from public.tasks where object_id = p_id and deleted_at is null) then
    raise exception 'Сначала удалите активные задачи объекта.' using errcode = '23503';
  end if;
  update public.objects set deleted_at = clock_timestamp(), updated_at = clock_timestamp(), version = version + 1 where id = p_id;
end;
$$;

create function private.create_task(p_title text, p_description text, p_object_id uuid, p_assignee_id uuid) returns public.tasks
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_task public.tasks;
begin
  v_actor := private.require_manager();
  perform 1 from public.objects where id = p_object_id and deleted_at is null for update;
  if not found then raise exception 'Объект не найден.' using errcode = 'P0002'; end if;
  insert into public.tasks(title, description, object_id, assignee_id, author_id)
  values(private.clean_text(p_title), coalesce(private.clean_text(p_description), ''), p_object_id, p_assignee_id, v_actor)
  returning * into v_task;
  insert into public.task_history(task_id, actor_id, from_status, to_status) values(v_task.id, v_actor, null, 'new');
  return v_task;
end;
$$;

create function private.update_task(p_id uuid, p_expected_version bigint, p_title text, p_description text, p_object_id uuid, p_assignee_id uuid) returns public.tasks
language plpgsql security definer set search_path = '' as $$
declare v_task public.tasks;
begin
  perform private.require_manager();
  select * into v_task from public.tasks where id = p_id and deleted_at is null for update;
  if not found then raise exception 'Задача не найдена.' using errcode = 'P0002'; end if;
  if p_expected_version is distinct from v_task.version then raise exception 'Задача изменена. Обновите страницу.' using errcode = '40001'; end if;
  perform 1 from public.objects where id = p_object_id and deleted_at is null for update;
  if not found then raise exception 'Объект не найден.' using errcode = 'P0002'; end if;
  update public.tasks set title = private.clean_text(p_title), description = coalesce(private.clean_text(p_description), ''),
    object_id = p_object_id, assignee_id = p_assignee_id, version = version + 1, updated_at = clock_timestamp()
  where id = p_id returning * into v_task;
  return v_task;
end;
$$;

create function private.transition_task(p_id uuid, p_expected_version bigint, p_to_status public.task_status, p_comment text default null) returns public.tasks
language plpgsql security definer set search_path = '' as $$
declare v_task public.tasks; v_actor public.profiles; v_allowed boolean := false; v_comment text;
begin
  select * into v_actor from public.profiles where id = auth.uid() and is_active;
  if not found then raise exception 'Требуется активный пользователь.' using errcode = '42501'; end if;
  select * into v_task from public.tasks where id = p_id and deleted_at is null for update;
  if not found or not private.can_read_task(p_id) then
    raise exception 'Задача не найдена или доступ ограничен.' using errcode = '42501';
  end if;
  if p_expected_version is distinct from v_task.version then raise exception 'Задача изменена. Обновите страницу.' using errcode = '40001'; end if;
  if v_actor.role = 'manager' then
    v_allowed := v_task.status = 'review' and p_to_status in ('accepted', 'revision');
  elsif v_task.assignee_id = v_actor.id then
    v_allowed := (v_task.status in ('new', 'revision') and p_to_status = 'in_progress') or
                 (v_task.status = 'in_progress' and p_to_status = 'review');
  end if;
  if not coalesce(v_allowed, false) then raise exception 'Запрещённый переход статуса.' using errcode = '23514'; end if;
  v_comment := nullif(private.clean_text(p_comment), '');
  if p_to_status = 'revision' and v_comment is null then raise exception 'Укажите причину возврата.' using errcode = '23514'; end if;
  insert into public.task_history(task_id, actor_id, from_status, to_status, comment)
  values(v_task.id, v_actor.id, v_task.status, p_to_status, v_comment);
  update public.tasks set status = p_to_status, updated_at = clock_timestamp(), version = version + 1
  where id = p_id returning * into v_task;
  return v_task;
end;
$$;

create function private.delete_task(p_id uuid, p_expected_version bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_task public.tasks;
begin
  perform private.require_manager();
  select * into v_task from public.tasks where id = p_id and deleted_at is null for update;
  if not found then raise exception 'Задача не найдена.' using errcode = 'P0002'; end if;
  if p_expected_version is distinct from v_task.version then raise exception 'Задача изменена. Обновите страницу.' using errcode = '40001'; end if;
  update public.tasks set deleted_at = clock_timestamp(), updated_at = clock_timestamp(), version = version + 1 where id = p_id;
  -- No delete from task_history: history is retained, while RLS hides the archived task.
end;
$$;

-- Exposed entry points are SECURITY INVOKER; privileged implementations stay private.
create function public.crm_create_object(p_name text, p_address text) returns public.objects
language sql security invoker set search_path = '' as $$ select private.create_object(p_name, p_address); $$;
create function public.crm_update_object(p_id uuid, p_expected_version bigint, p_name text, p_address text) returns public.objects
language sql security invoker set search_path = '' as $$ select private.update_object(p_id, p_expected_version, p_name, p_address); $$;
create function public.crm_delete_object(p_id uuid, p_expected_version bigint) returns void
language sql security invoker set search_path = '' as $$ select private.delete_object(p_id, p_expected_version); $$;
create function public.crm_create_task(p_title text, p_description text, p_object_id uuid, p_assignee_id uuid) returns public.tasks
language sql security invoker set search_path = '' as $$ select private.create_task(p_title, p_description, p_object_id, p_assignee_id); $$;
create function public.crm_update_task(p_id uuid, p_expected_version bigint, p_title text, p_description text, p_object_id uuid, p_assignee_id uuid) returns public.tasks
language sql security invoker set search_path = '' as $$ select private.update_task(p_id, p_expected_version, p_title, p_description, p_object_id, p_assignee_id); $$;
create function public.crm_transition_task(p_id uuid, p_expected_version bigint, p_to_status public.task_status, p_comment text default null) returns public.tasks
language sql security invoker set search_path = '' as $$ select private.transition_task(p_id, p_expected_version, p_to_status, p_comment); $$;
create function public.crm_delete_task(p_id uuid, p_expected_version bigint) returns void
language sql security invoker set search_path = '' as $$ select private.delete_task(p_id, p_expected_version); $$;

-- Explicit grants also neutralize any Supabase default grants on newly created functions.
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.can_read_task(uuid), private.can_read_object(uuid), private.can_read_profile(uuid) to authenticated;
grant execute on function private.create_object(text,text), private.update_object(uuid,bigint,text,text), private.delete_object(uuid,bigint),
  private.create_task(text,text,uuid,uuid), private.update_task(uuid,bigint,text,text,uuid,uuid),
  private.transition_task(uuid,bigint,public.task_status,text), private.delete_task(uuid,bigint) to authenticated;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'crm_create_object','crm_update_object','crm_delete_object','crm_create_task',
      'crm_update_task','crm_transition_task','crm_delete_task'
    ) loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to authenticated', f.signature);
  end loop;
end; $$;

revoke all on public.profiles, public.objects, public.tasks, public.task_history from public, anon, authenticated;
grant select on public.profiles, public.objects, public.tasks, public.task_history to authenticated;

notify pgrst, 'reload schema';
commit;
