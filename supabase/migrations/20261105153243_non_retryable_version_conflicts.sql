-- PostgREST 14 retries SQLSTATE 40001 indefinitely. Business version conflicts
-- are permanent for this request: return HTTP 409 through PT409 instead.
do $$ declare f record; begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname in ('update_object','delete_object','update_task','transition_task','delete_task')
  loop
    execute replace(pg_get_functiondef(f.oid), '''40001''', '''PT409''');
  end loop;
end; $$;
notify pgrst, 'reload schema';
