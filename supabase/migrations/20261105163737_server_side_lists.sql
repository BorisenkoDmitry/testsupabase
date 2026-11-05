-- Read-only list endpoints. SECURITY INVOKER preserves existing RLS for rows,
-- joined display names, counts and aggregates. No client-side list processing.
do $$ begin
  if exists(select 1 from pg_collation where collprovider='i') then
    execute 'create collation public.crm_ru (provider=icu, locale=''ru-u-kn-true'', deterministic=true)';
  else
    -- Portable fallback for the isolated PostgreSQL/WASM test engine.
    execute 'create collation public.crm_ru from pg_catalog."C"';
  end if;
end; $$;

create function public.crm_list_tasks(
  p_search text default '', p_object_id uuid default null,
  p_status public.task_status default null, p_assignee_id uuid default null,
  p_sort text default 'createdAt', p_direction text default 'desc',
  p_page integer default 0, p_page_size integer default 10
) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb;
begin
  if p_page is null or p_page < 0 or p_page_size is null or p_page_size not between 1 and 100
    or p_sort is null or p_sort not in ('title','status','assigneeName','createdAt')
    or p_direction is null or p_direction not in ('asc','desc')
    or char_length(coalesce(p_search,'')) > 200 then
    raise exception 'Некорректные параметры списка.' using errcode='22023';
  end if;
  with base as materialized (
    select t.*, o.name as object_name, a.full_name as assignee_name
    from public.tasks t
    join public.objects o on o.id=t.object_id
    join public.profiles a on a.id=t.assignee_id
    where p_object_id is null or t.object_id=p_object_id
  ), filtered as materialized (
    select b.* from base b
    where (p_status is null or b.status=p_status)
      and (p_assignee_id is null or b.assignee_id=p_assignee_id)
      and (coalesce(btrim(p_search),'')='' or strpos(lower(b.title),lower(btrim(p_search)))>0)
  ), bounds as (
    select count(*) as total,
      least(p_page,greatest((count(*)-1)/p_page_size,0))::integer as page_index
    from filtered
  ), ranked as (
    select f.*, row_number() over(order by
      case when p_sort='title' and p_direction='asc' then lower(f.title) end collate public.crm_ru asc,
      case when p_sort='title' and p_direction='desc' then lower(f.title) end collate public.crm_ru desc,
      case when p_sort='assigneeName' and p_direction='asc' then lower(f.assignee_name) end collate public.crm_ru asc,
      case when p_sort='assigneeName' and p_direction='desc' then lower(f.assignee_name) end collate public.crm_ru desc,
      case when p_sort='status' and p_direction='asc' then f.status end asc,
      case when p_sort='status' and p_direction='desc' then f.status end desc,
      case when p_sort='createdAt' and p_direction='asc' then f.created_at end asc,
      case when p_sort='createdAt' and p_direction='desc' then f.created_at end desc,
      f.id asc
    ) as position from filtered f
  ), page as (
    select * from ranked order by position
    limit p_page_size offset ((select page_index from bounds)*p_page_size)
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(p)-'position' order by p.position) from page p),'[]'::jsonb),
    'total',(select total from bounds), 'pageIndex',(select page_index from bounds), 'pageSize',p_page_size,
    'summary',jsonb_build_object(
      'total',(select count(*) from base),
      'newCount',(select count(*) from base where status='new'),
      'inProgressCount',(select count(*) from base where status in ('in_progress','revision')),
      'reviewCount',(select count(*) from base where status='review')
    )
  ) into v_result;
  return v_result;
end; $$;

create function public.crm_list_objects(
  p_search text default '', p_sort text default 'createdAt',
  p_direction text default 'desc', p_page integer default 0, p_page_size integer default 10
) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb;
begin
  if p_page is null or p_page < 0 or p_page_size is null or p_page_size not between 1 and 100
    or p_sort is null or p_sort not in ('name','address','createdAt')
    or p_direction is null or p_direction not in ('asc','desc')
    or char_length(coalesce(p_search,'')) > 200 then
    raise exception 'Некорректные параметры списка.' using errcode='22023';
  end if;
  with filtered as materialized (
    select o.* from public.objects o
    where coalesce(btrim(p_search),'')='' or strpos(lower(o.name || ' ' || o.address),lower(btrim(p_search)))>0
  ), bounds as (
    select count(*) as total,least(p_page,greatest((count(*)-1)/p_page_size,0))::integer as page_index
    from filtered
  ), ranked as (
    select f.*,row_number() over(order by
      case when p_sort='name' and p_direction='asc' then lower(f.name) end collate public.crm_ru asc,
      case when p_sort='name' and p_direction='desc' then lower(f.name) end collate public.crm_ru desc,
      case when p_sort='address' and p_direction='asc' then lower(f.address) end collate public.crm_ru asc,
      case when p_sort='address' and p_direction='desc' then lower(f.address) end collate public.crm_ru desc,
      case when p_sort='createdAt' and p_direction='asc' then f.created_at end asc,
      case when p_sort='createdAt' and p_direction='desc' then f.created_at end desc,
      f.id asc
    ) as position from filtered f
  ), page as (
    select * from ranked order by position
    limit p_page_size offset ((select page_index from bounds)*p_page_size)
  ), enriched as (
    select p.*, (select count(*) from public.tasks t where t.object_id=p.id) as task_count,
      (select count(*) from public.tasks t where t.object_id=p.id and t.status='accepted') as accepted_count,
      (select count(*) from public.tasks t where t.object_id=p.id and t.status='review') as review_count
    from page p
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(e)-'position' order by e.position) from enriched e),'[]'::jsonb),
    'total',(select total from bounds),'pageIndex',(select page_index from bounds),'pageSize',p_page_size,
    'summary',jsonb_build_object(
      'objectCount',(select count(*) from public.objects),
      'activeTaskCount',(select count(*) from public.tasks where status<>'accepted'),
      'reviewCount',(select count(*) from public.tasks where status='review')
    )
  ) into v_result;
  return v_result;
end; $$;

revoke all on function public.crm_list_tasks(text,uuid,public.task_status,uuid,text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.crm_list_objects(text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.crm_list_tasks(text,uuid,public.task_status,uuid,text,text,integer,integer) to authenticated;
grant execute on function public.crm_list_objects(text,text,text,integer,integer) to authenticated;
notify pgrst,'reload schema';
