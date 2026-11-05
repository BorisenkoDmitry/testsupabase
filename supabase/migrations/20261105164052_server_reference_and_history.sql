-- Compact reference values are filtered and sorted by the database.
create function public.crm_list_options(p_kind text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb;
begin
  if p_kind='objects' then
    select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'name',o.name)
      order by lower(o.name) collate public.crm_ru,o.id),'[]'::jsonb)
    into v_result from public.objects o;
  elsif p_kind in ('profiles','assignees') then
    select coalesce(jsonb_agg(to_jsonb(p) order by lower(p.full_name) collate public.crm_ru,p.id),'[]'::jsonb)
    into v_result from public.profiles p
    where p_kind='profiles' or (p.role='executor' and p.is_active);
  else
    raise exception 'Некорректный справочник.' using errcode='22023';
  end if;
  return v_result;
end; $$;

create function public.crm_task_history_page(p_task_id uuid,p_page integer default 0,p_page_size integer default 10)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb;
begin
  if p_page is null or p_page<0 or p_page_size is null or p_page_size not between 1 and 100 then
    raise exception 'Некорректные параметры страницы.' using errcode='22023';
  end if;
  with base as materialized (
    select h.* from public.task_history h where h.task_id=p_task_id
  ), bounds as (
    select count(*) as total,least(p_page,greatest((count(*)-1)/p_page_size,0))::integer as page_index from base
  ), page as (
    select * from base order by created_at desc,id asc
    limit p_page_size offset ((select page_index from bounds)*p_page_size)
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id asc) from page p),'[]'::jsonb),
    'total',(select total from bounds),'pageIndex',(select page_index from bounds),'pageSize',p_page_size
  ) into v_result;
  return v_result;
end; $$;
revoke all on function public.crm_list_options(text),public.crm_task_history_page(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.crm_list_options(text),public.crm_task_history_page(uuid,integer,integer) to authenticated;
notify pgrst,'reload schema';
