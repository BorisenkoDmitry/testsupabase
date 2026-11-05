-- Generated from src/shared/api/mock/seed.ts. Trusted SQL Editor only.
-- Preserves source timestamps, statuses and all history. Does not overwrite existing rows.
-- Run AFTER migrations 001/002 and create-demo-users.mjs. Demo data only, not production.
begin;
do $$ begin
  if (select count(*) from auth.users where lower(email) in ('manager@demo.ru', 'ivan@demo.ru', 'alexey@demo.ru')) <> 3 then
    raise exception 'Create the three Auth users first (scripts/supabase/create-demo-users.mjs).';
  end if;
end; $$;

insert into public.profiles(id,full_name,email,role)
select id,'Александр Волков','manager@demo.ru','manager' from auth.users where lower(email)='manager@demo.ru' on conflict(id) do nothing;
do $$ begin
  if not exists(select 1 from public.profiles where email='manager@demo.ru' and role='manager' and is_active) then
    raise exception 'Existing profile differs from expected demo role. Check profiles before importing.';
  end if;
end; $$;

insert into public.profiles(id,full_name,email,role)
select id,'Иван Петров','ivan@demo.ru','executor' from auth.users where lower(email)='ivan@demo.ru' on conflict(id) do nothing;
do $$ begin
  if not exists(select 1 from public.profiles where email='ivan@demo.ru' and role='executor' and is_active) then
    raise exception 'Existing profile differs from expected demo role. Check profiles before importing.';
  end if;
end; $$;

insert into public.profiles(id,full_name,email,role)
select id,'Алексей Смирнов','alexey@demo.ru','executor' from auth.users where lower(email)='alexey@demo.ru' on conflict(id) do nothing;
do $$ begin
  if not exists(select 1 from public.profiles where email='alexey@demo.ru' and role='executor' and is_active) then
    raise exception 'Existing profile differs from expected demo role. Check profiles before importing.';
  end if;
end; $$;

insert into public.objects(id,name,address,created_by,created_at,updated_at)
values('09039b60-b56c-4174-86ed-1b8a8ddca04f','ЖК «Сосновый»','Москва, ул. Лесная, 15 · Корпус 2',(select id from public.profiles where email = 'manager@demo.ru'),'2026-10-20T09:00:00Z','2026-10-20T09:00:00Z') on conflict(id) do nothing;

insert into public.objects(id,name,address,created_by,created_at,updated_at)
values('a39395e2-63e0-4632-817a-3610b05fb4ae','Бизнес-центр «Горизонт»','Москва, Ленинградский проспект, 36',(select id from public.profiles where email = 'manager@demo.ru'),'2026-10-22T09:00:00Z','2026-10-22T09:00:00Z') on conflict(id) do nothing;

insert into public.objects(id,name,address,created_by,created_at,updated_at)
values('65a55476-312e-4327-8bfe-6f857afcd440','Дом в Репино','Московская область, пос. Репино, участок 8',(select id from public.profiles where email = 'manager@demo.ru'),'2026-10-25T09:00:00Z','2026-10-25T09:00:00Z') on conflict(id) do nothing;

insert into public.tasks(id,title,description,object_id,assignee_id,status,author_id,created_at,updated_at,version)
values('f45dd046-a0fe-4f0a-8d75-00db64bcae5c','Смонтировать электропроводку на первом этаже','Проложить кабель по согласованной схеме. Проверить маркировку линий и подготовить фотографии перед закрытием штроб.','09039b60-b56c-4174-86ed-1b8a8ddca04f',(select id from public.profiles where email = 'ivan@demo.ru'),'in_progress',(select id from public.profiles where email = 'manager@demo.ru'),'2026-11-01T08:00:00Z','2026-11-01T09:00:00.000Z',2) on conflict(id) do nothing;

do $$ begin
if not exists(select 1 from public.tasks where id='f45dd046-a0fe-4f0a-8d75-00db64bcae5c' and title='Смонтировать электропроводку на первом этаже' and description='Проложить кабель по согласованной схеме. Проверить маркировку линий и подготовить фотографии перед закрытием штроб.' and object_id='09039b60-b56c-4174-86ed-1b8a8ddca04f' and assignee_id=(select id from public.profiles where email = 'ivan@demo.ru') and author_id=(select id from public.profiles where email = 'manager@demo.ru') and status='in_progress' and version=2 and deleted_at is null) then
  raise exception 'Existing task differs from the snapshot. Import into a fresh database or reconcile explicitly.';
end if; end; $$;

insert into public.tasks(id,title,description,object_id,assignee_id,status,author_id,created_at,updated_at,version)
values('03330045-04d2-4204-8e26-11eb07f139de','Проверить гидроизоляцию подвала','Проверить примыкания и швы. Приложить результаты осмотра в комментарии при отправке на проверку.','09039b60-b56c-4174-86ed-1b8a8ddca04f',(select id from public.profiles where email = 'alexey@demo.ru'),'review',(select id from public.profiles where email = 'manager@demo.ru'),'2026-11-02T08:00:00Z','2026-11-02T10:00:00.000Z',3) on conflict(id) do nothing;

do $$ begin
if not exists(select 1 from public.tasks where id='03330045-04d2-4204-8e26-11eb07f139de' and title='Проверить гидроизоляцию подвала' and description='Проверить примыкания и швы. Приложить результаты осмотра в комментарии при отправке на проверку.' and object_id='09039b60-b56c-4174-86ed-1b8a8ddca04f' and assignee_id=(select id from public.profiles where email = 'alexey@demo.ru') and author_id=(select id from public.profiles where email = 'manager@demo.ru') and status='review' and version=3 and deleted_at is null) then
  raise exception 'Existing task differs from the snapshot. Import into a fresh database or reconcile explicitly.';
end if; end; $$;

insert into public.tasks(id,title,description,object_id,assignee_id,status,author_id,created_at,updated_at,version)
values('7ee4b411-dbf8-4991-84c1-be1e7f7ab0a6','Установить окна в подъезде № 1','Установить оконные блоки на втором этаже. Проверить геометрию и герметичность монтажных швов.','09039b60-b56c-4174-86ed-1b8a8ddca04f',(select id from public.profiles where email = 'ivan@demo.ru'),'new',(select id from public.profiles where email = 'manager@demo.ru'),'2026-11-03T08:00:00Z','2026-11-03T08:00:00.000Z',1) on conflict(id) do nothing;

do $$ begin
if not exists(select 1 from public.tasks where id='7ee4b411-dbf8-4991-84c1-be1e7f7ab0a6' and title='Установить окна в подъезде № 1' and description='Установить оконные блоки на втором этаже. Проверить геометрию и герметичность монтажных швов.' and object_id='09039b60-b56c-4174-86ed-1b8a8ddca04f' and assignee_id=(select id from public.profiles where email = 'ivan@demo.ru') and author_id=(select id from public.profiles where email = 'manager@demo.ru') and status='new' and version=1 and deleted_at is null) then
  raise exception 'Existing task differs from the snapshot. Import into a fresh database or reconcile explicitly.';
end if; end; $$;

insert into public.tasks(id,title,description,object_id,assignee_id,status,author_id,created_at,updated_at,version)
values('2540ee6e-b3c6-4ee5-8ac1-89200a4abfaf','Исправить стяжку в холле','Устранить неровности основания перед укладкой напольного покрытия.','a39395e2-63e0-4632-817a-3610b05fb4ae',(select id from public.profiles where email = 'alexey@demo.ru'),'revision',(select id from public.profiles where email = 'manager@demo.ru'),'2026-11-01T08:00:00Z','2026-11-01T11:00:00.000Z',4) on conflict(id) do nothing;

do $$ begin
if not exists(select 1 from public.tasks where id='2540ee6e-b3c6-4ee5-8ac1-89200a4abfaf' and title='Исправить стяжку в холле' and description='Устранить неровности основания перед укладкой напольного покрытия.' and object_id='a39395e2-63e0-4632-817a-3610b05fb4ae' and assignee_id=(select id from public.profiles where email = 'alexey@demo.ru') and author_id=(select id from public.profiles where email = 'manager@demo.ru') and status='revision' and version=4 and deleted_at is null) then
  raise exception 'Existing task differs from the snapshot. Import into a fresh database or reconcile explicitly.';
end if; end; $$;

insert into public.tasks(id,title,description,object_id,assignee_id,status,author_id,created_at,updated_at,version)
values('a8d5a2c7-e3e1-4f2b-8e3e-d3837dd2963c','Подготовить стены под покраску','Зашпаклевать стены в кабинетах 201–204. После высыхания выполнить шлифовку.','a39395e2-63e0-4632-817a-3610b05fb4ae',(select id from public.profiles where email = 'ivan@demo.ru'),'new',(select id from public.profiles where email = 'manager@demo.ru'),'2026-11-02T08:00:00Z','2026-11-02T08:00:00.000Z',1) on conflict(id) do nothing;

do $$ begin
if not exists(select 1 from public.tasks where id='a8d5a2c7-e3e1-4f2b-8e3e-d3837dd2963c' and title='Подготовить стены под покраску' and description='Зашпаклевать стены в кабинетах 201–204. После высыхания выполнить шлифовку.' and object_id='a39395e2-63e0-4632-817a-3610b05fb4ae' and assignee_id=(select id from public.profiles where email = 'ivan@demo.ru') and author_id=(select id from public.profiles where email = 'manager@demo.ru') and status='new' and version=1 and deleted_at is null) then
  raise exception 'Existing task differs from the snapshot. Import into a fresh database or reconcile explicitly.';
end if; end; $$;

insert into public.tasks(id,title,description,object_id,assignee_id,status,author_id,created_at,updated_at,version)
values('b1de8fd9-a4da-4415-8c83-7541a2475d5f','Принять поставку вентиляционного оборудования','Проверить комплектность по накладной и осмотреть оборудование на наличие повреждений.','a39395e2-63e0-4632-817a-3610b05fb4ae',(select id from public.profiles where email = 'alexey@demo.ru'),'accepted',(select id from public.profiles where email = 'manager@demo.ru'),'2026-11-03T08:00:00Z','2026-11-03T11:00:00.000Z',4) on conflict(id) do nothing;

do $$ begin
if not exists(select 1 from public.tasks where id='b1de8fd9-a4da-4415-8c83-7541a2475d5f' and title='Принять поставку вентиляционного оборудования' and description='Проверить комплектность по накладной и осмотреть оборудование на наличие повреждений.' and object_id='a39395e2-63e0-4632-817a-3610b05fb4ae' and assignee_id=(select id from public.profiles where email = 'alexey@demo.ru') and author_id=(select id from public.profiles where email = 'manager@demo.ru') and status='accepted' and version=4 and deleted_at is null) then
  raise exception 'Existing task differs from the snapshot. Import into a fresh database or reconcile explicitly.';
end if; end; $$;

insert into public.tasks(id,title,description,object_id,assignee_id,status,author_id,created_at,updated_at,version)
values('d72031f6-a2c1-4c9e-8511-1d038f43c04e','Собрать опалубку фундамента','Выполнить сборку по проекту. Проверить диагонали и закрепление щитов.','65a55476-312e-4327-8bfe-6f857afcd440',(select id from public.profiles where email = 'ivan@demo.ru'),'in_progress',(select id from public.profiles where email = 'manager@demo.ru'),'2026-11-01T08:00:00Z','2026-11-01T09:00:00.000Z',2) on conflict(id) do nothing;

do $$ begin
if not exists(select 1 from public.tasks where id='d72031f6-a2c1-4c9e-8511-1d038f43c04e' and title='Собрать опалубку фундамента' and description='Выполнить сборку по проекту. Проверить диагонали и закрепление щитов.' and object_id='65a55476-312e-4327-8bfe-6f857afcd440' and assignee_id=(select id from public.profiles where email = 'ivan@demo.ru') and author_id=(select id from public.profiles where email = 'manager@demo.ru') and status='in_progress' and version=2 and deleted_at is null) then
  raise exception 'Existing task differs from the snapshot. Import into a fresh database or reconcile explicitly.';
end if; end; $$;

insert into public.tasks(id,title,description,object_id,assignee_id,status,author_id,created_at,updated_at,version)
values('ca009f2c-02b3-4886-8ca3-1dade241a06d','Проверить разметку участка','Сверить оси и отметки с геодезическим планом.','65a55476-312e-4327-8bfe-6f857afcd440',(select id from public.profiles where email = 'alexey@demo.ru'),'accepted',(select id from public.profiles where email = 'manager@demo.ru'),'2026-11-02T08:00:00Z','2026-11-02T11:00:00.000Z',4) on conflict(id) do nothing;

do $$ begin
if not exists(select 1 from public.tasks where id='ca009f2c-02b3-4886-8ca3-1dade241a06d' and title='Проверить разметку участка' and description='Сверить оси и отметки с геодезическим планом.' and object_id='65a55476-312e-4327-8bfe-6f857afcd440' and assignee_id=(select id from public.profiles where email = 'alexey@demo.ru') and author_id=(select id from public.profiles where email = 'manager@demo.ru') and status='accepted' and version=4 and deleted_at is null) then
  raise exception 'Existing task differs from the snapshot. Import into a fresh database or reconcile explicitly.';
end if; end; $$;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('d141d5b3-d2f9-43fe-841a-2a572d0170e9','f45dd046-a0fe-4f0a-8d75-00db64bcae5c',(select id from public.profiles where email = 'manager@demo.ru'),null,'new',null,'2026-11-01T08:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('5e40a5fe-b327-48d0-83ff-11ccd0a9ada9','f45dd046-a0fe-4f0a-8d75-00db64bcae5c',(select id from public.profiles where email = 'ivan@demo.ru'),'new','in_progress',null,'2026-11-01T09:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('a2063d0d-f820-471f-8182-5dafe68e4910','03330045-04d2-4204-8e26-11eb07f139de',(select id from public.profiles where email = 'manager@demo.ru'),null,'new',null,'2026-11-02T08:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('0d3e932f-07fd-4625-842a-2084a553351e','03330045-04d2-4204-8e26-11eb07f139de',(select id from public.profiles where email = 'alexey@demo.ru'),'new','in_progress',null,'2026-11-02T09:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('ba26f2b0-66bd-4b4a-812f-0918deb04ceb','03330045-04d2-4204-8e26-11eb07f139de',(select id from public.profiles where email = 'alexey@demo.ru'),'in_progress','review',null,'2026-11-02T10:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('087f86a9-5d89-43fa-8c6d-97b25d9b38f5','7ee4b411-dbf8-4991-84c1-be1e7f7ab0a6',(select id from public.profiles where email = 'manager@demo.ru'),null,'new',null,'2026-11-03T08:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('1be9cd98-fee8-48f9-8f82-e45ebf3eeea3','2540ee6e-b3c6-4ee5-8ac1-89200a4abfaf',(select id from public.profiles where email = 'manager@demo.ru'),null,'new',null,'2026-11-01T08:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('c3a06f08-f5d0-4945-8316-5b4a8c1ac578','2540ee6e-b3c6-4ee5-8ac1-89200a4abfaf',(select id from public.profiles where email = 'alexey@demo.ru'),'new','in_progress',null,'2026-11-01T09:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('c00bfd01-765a-4aaf-83bb-a8f4e7cb37b6','2540ee6e-b3c6-4ee5-8ac1-89200a4abfaf',(select id from public.profiles where email = 'alexey@demo.ru'),'in_progress','review',null,'2026-11-01T10:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('bc581dd3-442e-47e8-84ff-8fc5131c15ef','2540ee6e-b3c6-4ee5-8ac1-89200a4abfaf',(select id from public.profiles where email = 'manager@demo.ru'),'review','revision','У входной группы остался перепад около 8 мм. Выровняйте участок и повторно отправьте на проверку.','2026-11-01T11:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('221bb681-c907-4eca-805f-66fb045b034d','a8d5a2c7-e3e1-4f2b-8e3e-d3837dd2963c',(select id from public.profiles where email = 'manager@demo.ru'),null,'new',null,'2026-11-02T08:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('7322bf32-937a-4c27-8416-1052d9310c93','b1de8fd9-a4da-4415-8c83-7541a2475d5f',(select id from public.profiles where email = 'manager@demo.ru'),null,'new',null,'2026-11-03T08:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('08fe0afb-c0a9-4189-85de-3f2792694527','b1de8fd9-a4da-4415-8c83-7541a2475d5f',(select id from public.profiles where email = 'alexey@demo.ru'),'new','in_progress',null,'2026-11-03T09:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('a7d2202c-48fd-4b38-8421-2f7bbacabfe2','b1de8fd9-a4da-4415-8c83-7541a2475d5f',(select id from public.profiles where email = 'alexey@demo.ru'),'in_progress','review',null,'2026-11-03T10:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('7b49e144-792e-4192-8766-292076653028','b1de8fd9-a4da-4415-8c83-7541a2475d5f',(select id from public.profiles where email = 'manager@demo.ru'),'review','accepted',null,'2026-11-03T11:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('2b47268a-b8ca-45e2-88b2-78cbbb8c928a','d72031f6-a2c1-4c9e-8511-1d038f43c04e',(select id from public.profiles where email = 'manager@demo.ru'),null,'new',null,'2026-11-01T08:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('0bf89525-8a29-4270-8cf4-b8c93dd2cefe','d72031f6-a2c1-4c9e-8511-1d038f43c04e',(select id from public.profiles where email = 'ivan@demo.ru'),'new','in_progress',null,'2026-11-01T09:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('b179be8f-bd4c-4571-8855-108c7e8338d6','ca009f2c-02b3-4886-8ca3-1dade241a06d',(select id from public.profiles where email = 'manager@demo.ru'),null,'new',null,'2026-11-02T08:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('9c276c7e-0965-4bec-873d-196e7028bf72','ca009f2c-02b3-4886-8ca3-1dade241a06d',(select id from public.profiles where email = 'alexey@demo.ru'),'new','in_progress',null,'2026-11-02T09:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('d8c614d5-5056-4782-8280-d2bef8c4c7b1','ca009f2c-02b3-4886-8ca3-1dade241a06d',(select id from public.profiles where email = 'alexey@demo.ru'),'in_progress','review',null,'2026-11-02T10:00:00.000Z') on conflict(id) do nothing;

insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values('f0df00e0-477b-4ed2-8e42-4029b1867cea','ca009f2c-02b3-4886-8ca3-1dade241a06d',(select id from public.profiles where email = 'manager@demo.ru'),'review','accepted',null,'2026-11-02T11:00:00.000Z') on conflict(id) do nothing;

commit;
