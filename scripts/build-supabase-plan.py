from pathlib import Path
from xml.sax.saxutils import escape
import json, textwrap
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Preformatted, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, Line, String, Polygon

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf'
OUT.mkdir(parents=True, exist_ok=True)
for name, filename in [('Body','arial.ttf'),('BodyBold','arialbd.ttf'),('BodyItalic','ariali.ttf'),('Mono','consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(Path('C:/Windows/Fonts') / filename)))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='BodyBold', italic='BodyItalic', boldItalic='BodyBold')
BLUE = colors.HexColor('#2274cf'); INK = colors.HexColor('#303c50'); MUTED = colors.HexColor('#607087')
PALE = colors.HexColor('#eaf3ff'); LINE = colors.HexColor('#e2e8f1'); LIGHT = colors.HexColor('#f6f8fb')
WIDTH = 511.27
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleCRM', fontName='BodyBold',fontSize=29,leading=36,textColor=INK,spaceAfter=18))
styles.add(ParagraphStyle(name='SectionCRM',fontName='BodyBold',fontSize=20,leading=26,textColor=INK,spaceAfter=16))
styles.add(ParagraphStyle(name='SubCRM',fontName='BodyBold',fontSize=11.5,leading=16,textColor=BLUE,spaceBefore=13,spaceAfter=7))
styles.add(ParagraphStyle(name='BodyCRM',fontName='Body',fontSize=10,leading=14.4,textColor=INK,spaceAfter=8))
styles.add(ParagraphStyle(name='SmallCRM',fontName='Body',fontSize=8.4,leading=12,textColor=MUTED,spaceAfter=6))
styles.add(ParagraphStyle(name='CellCRM',fontName='Body',fontSize=8.5,leading=11.8,textColor=INK))
styles.add(ParagraphStyle(name='HeadCRM',fontName='BodyBold',fontSize=8.5,leading=11.8,textColor=BLUE))
styles.add(ParagraphStyle(name='CodeCRM',fontName='Mono',fontSize=8,leading=11,textColor=INK,backColor=LIGHT,borderPadding=10,spaceBefore=5,spaceAfter=12))
styles.add(ParagraphStyle(name='CalloutCRM',fontName='Body',fontSize=10,leading=15,textColor=INK,backColor=PALE,borderPadding=12,spaceBefore=8,spaceAfter=18))
story=[]
def p(text, style='BodyCRM'):
    story.append(Paragraph(escape(text).replace('\n','<br/>'),styles[style]))
def rich(text,style='BodyCRM'): story.append(Paragraph(text,styles[style]))
def h(text): p(text,'SubCRM')
def bullet(text): rich('<font color="#2274cf">•</font>  '+escape(text))
def code(text):
    lines=[]
    for line in text.strip().splitlines():
        lines.extend(textwrap.wrap(line,105,replace_whitespace=False,drop_whitespace=False) or [''])
    story.append(Preformatted('\n'.join(lines),styles['CodeCRM']))
def table(headers, rows, widths, compact=False):
    data=[[Paragraph(escape(str(x)),styles['HeadCRM']) for x in headers]]
    data += [[Paragraph(escape(str(x)).replace('\n','<br/>'),styles['CellCRM']) for x in row] for row in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    pad=6 if compact else 8
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),pad),('BOTTOMPADDING',(0,0),(-1,-1),pad),('LINEBELOW',(0,0),(-1,0),.6,LINE),('LINEBELOW',(0,1),(-1,-1),.35,LINE),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,LIGHT])]))
    story.append(t); story.append(Spacer(1,10))
def section(number,title):
    if story: story.append(PageBreak())
    p(f'{number:02d} / SUPABASE','SmallCRM'); p(title,'SectionCRM')
def note(text): p(text,'CalloutCRM')

fixture=json.loads((ROOT/'supabase/fixtures/demo.json').read_text(encoding='utf-8'))
validation=json.loads((OUT/'supabase-validation.json').read_text(encoding='utf-8'))

p('КОНТУР / ПЛАН БАЗЫ ДАННЫХ','SmallCRM'); story.append(Spacer(1,27))
p('Объекты и задачи\nНастройка Supabase','TitleCRM')
p('Пошаговый план для создания базы, защиты данных и переноса существующих моков. Версия от 5 ноября 2026 года.','BodyCRM')
story.append(Spacer(1,18))
table(['Пользователи','Объекты','Задачи','История'],[['3 аккаунта','3 стройки','8 задач','21 событие']],[127.8]*4)
h('Что вы получите после выполнения плана')
for x in ['Схему из четырёх таблиц и связей с Supabase Auth.', 'Две бизнес-роли: постановщик и исполнитель. Права действуют внутри базы.', 'Строгое изменение статусов через RPC и неизменяемую историю.', 'Автоматическую загрузку всех исходных объектов, задач и событий из моков.', 'Проверки прав, план подключения React-приложения и отдельные SQL-файлы.']: bullet(x)
story.append(Spacer(1,12))
note('Сейчас приложение работает на localStorage. Документ и SQL подготовлены для нового Supabase-проекта; в ваш облачный аккаунт ничего не загружено. Переключение фронтенда потребует реализации адаптера и небольших изменений DTO/форм.')
h('Как читать документ')
p('Сначала разделы 1-3: порядок настройки, решения и связи. Разделы 4-8 описывают поля и защиту. Разделы 9-11 посвящены миграциям и демо-данным. В разделах 12-14 - подключение приложения, проверки и источники.')
p(f'SQL локально прошёл {validation["assertions"]} проверок в PostgreSQL/WASM, включая {validation["matrixCases"]} сочетаний роли и статуса. Настоящие Auth, Data API и настройки Dashboard требуют отдельной проверки после установки.','SmallCRM')

section(1,'Быстрый маршрут настройки')
for title,body in [
('1. Создать новый проект','Supabase Dashboard → New project. Сохранить пароль базы в менеджере паролей. Выбрать подходящий регион и дождаться готовности проекта.'),
('2. Закрыть регистрацию','Authentication → Sign In / Providers: выключить Allow new users to sign up и anonymous sign-ins. Оставить email/password. Названия разделов могут немного меняться. [1]'),
('3. Создать схему','SQL Editor → New query. Выполнить 20261105152310_crm_schema.sql. Затем отдельно 20261105152318_crm_security_rpc.sql. Не создавать таблицы вручную параллельно с миграциями.'),
('4. Проверить экспонируемые схемы','В Data API / API settings оставить public. private не должна входить в Exposed schemas. Не включать auth и служебные схемы.'),
('5. Создать аккаунты','Запустить локальный create-demo-users.mjs с серверным ключом и выбранным тестовым паролем. Альтернатива - создать три пользователя в Authentication → Users.'),
('6. Загрузить данные','В SQL Editor выполнить supabase/seeds/demo.sql. Это создаст profiles и перенесёт 3 объекта, 8 задач и 21 запись истории.'),
('7. Проверить защиту','Выполнить setup-check.sql. Затем проверять Data API с пользовательскими сессиями всех трёх аккаунтов, а не только из SQL Editor.'),
('8. Подключить приложение','Реализовать CrmApi-адаптер Supabase, маппинг полей и обработку version. Только после этого менять VITE_DATA_PROVIDER на supabase.')]:
    h(title); p(body)

section(2,'Ключи, роли и принятые решения')
h('Ключи и учётные записи')
table(['Где используется','Что указать','Граница доступа'],[
('React / Vite','Project URL + publishable key','Публичный ключ; права задают RLS и сессия пользователя.'),
('Локальный скрипт создания пользователей','SUPABASE_SECRET_KEY','Административный ключ только в локальном .env.supabase; никогда не VITE_*.'),
('Постановщик в CRM','profiles.role = manager','Обычный Auth-пользователь. Не является администратором Supabase.'),
('Исполнитель в CRM','profiles.role = executor','Обычный Auth-пользователь; доступ только к назначенным задачам.')],[130,163,218])
p('Publishable key предназначен для клиентского кода. Secret key и устаревший service_role дают привилегированный доступ, поэтому не включаются во фронтенд или Git. [2]')
h('Решения для этой схемы')
for x in [
'Один Supabase-проект обслуживает одну строительную компанию. Изоляция нескольких компаний не предусмотрена; для неё понадобится organization_id во всех данных и политиках.',
'Роль задаётся доверенным администратором в profiles. Ни постановщик через приложение, ни user_metadata не могут повысить привилегии.',
'Удаление логическое: deleted_at скрывает объект/задачу, но сохраняет связи и историю. У объекта сначала должны отсутствовать активные задачи.',
'Переназначение разрешено постановщику в любом статусе без автоматического сброса статуса. Предыдущий исполнитель теряет доступ, новый видит всю историю.',
'Принятая задача не открывается повторно: таблица переходов ТЗ этого не допускает. Редактировать её обычные данные постановщик может.',
'is_active=false блокирует доступ к CRM на уровне БД. Для запрета самого входа отдельно заблокировать аккаунт в Auth.',
'Дата и автор формируются сервером. Описание необязательно. Реальных паролей, токенов и ключей в seed нет.'
]: bullet(x)

section(3,'Таблицы и связи')
d=Drawing(WIDTH,315)
def box(x,y,w,h,title,lines,fill=LIGHT):
    d.add(Rect(x,y,w,h,rx=8,ry=8,fillColor=fill,strokeColor=LINE,strokeWidth=.7))
    d.add(String(x+12,y+h-20,title,fontName='BodyBold',fontSize=10,fillColor=INK))
    for i,line in enumerate(lines): d.add(String(x+12,y+h-38-i*13,line,fontName='Body',fontSize=8.1,fillColor=MUTED))
def arrow(x1,y1,x2,y2):
    d.add(Line(x1,y1,x2,y2,strokeColor=BLUE,strokeWidth=1))
    if x2>x1: pts=[x2,y2,x2-5,y2+3,x2-5,y2-3]
    else: pts=[x2,y2,x2-3,y2+5,x2+3,y2+5]
    d.add(Polygon(pts,fillColor=BLUE,strokeColor=BLUE))
box(0,245,150,65,'auth.users',['Управляет Supabase Auth','id, email, учётные данные'])
box(230,245,281,65,'public.profiles',['id = auth.users.id','Имя, email, роль, активность'],PALE)
arrow(150,278,230,278); d.add(String(175,288,'1 : 1',fontName='Body',fontSize=8,fillColor=BLUE))
box(0,60,150,110,'public.objects',['id, name, address','created_by → profiles','version, deleted_at'])
box(185,60,160,110,'public.tasks',['object_id → objects','assignee_id → profiles','author_id → profiles','status, version, deleted_at'])
box(370,60,141,110,'public.task_history',['task_id → tasks','actor_id → profiles','from/to status','comment, created_at'])
arrow(150,110,185,110); arrow(345,110,370,110)
d.add(Line(245,245,75,200,strokeColor=BLUE,strokeWidth=1)); arrow(75,200,75,170)
arrow(265,245,265,170); arrow(440,245,440,170)
d.add(String(9,25,'1 объект → много задач. 1 задача → много событий истории.',fontName='Body',fontSize=9,fillColor=MUTED))
story.append(d)
h('Назначение таблиц')
table(['Таблица','Что хранит','Как создаётся'],[
('auth.users','Пользователи, email, проверка пароля и сессии.','Только Supabase Auth / Admin API.'),
('public.profiles','Публичный профиль и бизнес-роль. Пароля здесь нет.','Доверенный SQL seed или администратор.'),
('public.objects','Стройки с названием и адресом.','Постановщик через RPC.'),
('public.tasks','Поручения, назначение и текущий статус.','Постановщик через RPC.'),
('public.task_history','События создания/изменения статуса.','RPC в той же транзакции, что и задача.')],[120,229,162])
p('Во всех связях используются настоящие UUID. auth.users не открывается в Data API. Собственная profiles связывается с ней через первичный ключ. [3]')
p('Внешние ключи используют ON DELETE RESTRICT: физическое удаление связанного пользователя или задачи не должно случайно уничтожить аудит. Учётные записи с историей лучше деактивировать.','SmallCRM')

section(4,'Поля profiles и objects')
table(['profiles: поле','Тип / обязательно','Правило'],[
('id','uuid / да / PK','FK → auth.users.id. UUID того же Auth-пользователя.'),
('full_name','text / да','Имя, 2-120 символов после обрезки пробелов.'),
('email','text / да','Нижний регистр, уникальность по lower(email). Синхронизировать администратором при смене email в Auth.'),
('role','app_role / да','manager или executor. Клиенту запись запрещена.'),
('is_active','boolean / да','По умолчанию true. false закрывает доступ к CRM.'),
('created_at','timestamptz / да','Время сервера, по умолчанию now().')],[107,119,285])
table(['objects: поле','Тип / обязательно','Правило'],[
('id','uuid / да / PK','gen_random_uuid().'),
('name','text / да','2-120 символов; пустое название запрещено.'),
('address','text / да','5-250 символов.'),
('created_by','uuid / да / FK','Автор объекта → profiles.id; RPC берёт auth.uid().'),
('created_at','timestamptz / да','Формирует сервер.'),
('updated_at','timestamptz / да','Обновляется при изменении.'),
('version','bigint / да','Начинается с 1; увеличивается при каждой записи.'),
('deleted_at','timestamptz / нет','NULL - активен; дата - скрыт из API.')],[107,119,285])
h('Индексы и уникальность')
p('profiles_email_unique не допускает одинаковый email с разным регистром. objects_created_by_idx ускоряет проверки связей. Уникальность названия объекта не требуется: две стройки могут называться одинаково.')
note('Таблицу auth.users вручную не создавать и пароли в SQL не вставлять. Создать реального Auth-пользователя - отдельная операция, затем добавить профиль с его UUID.')

section(5,'Поля tasks и task_history')
table(['tasks: поле','Тип','Правило'],[
('id','uuid / PK','Автоматический UUID.'),('title','text / NOT NULL','3-160 символов после trim.'),
('description','text / NOT NULL','По умолчанию пустая строка; максимум 5000 символов.'),
('object_id','uuid / FK','Объект → objects.id.'),('assignee_id','uuid / FK','Активный executor → profiles.id.'),
('status','task_status','new / in_progress / review / revision / accepted. Начальный - new.'),
('author_id','uuid / FK','Автор → profiles.id. При создании берётся текущий пользователь.'),
('created_at','timestamptz','Задаёт сервер; не редактируется клиентом.'),('updated_at','timestamptz','Время последнего изменения.'),
('version','bigint > 0','1 при создании; +1 при изменении/переходе/удалении.'),('deleted_at','timestamptz / NULL','Признак логического удаления.')],[106,111,294])
table(['task_history: поле','Тип','Правило'],[
('id','uuid / PK','Автоматический UUID.'),('task_id','uuid / FK','Ссылка на задачу; физический каскад не используется.'),
('actor_id','uuid / FK','Кто выполнил действие. Только auth.uid() из RPC.'),
('from_status','task_status / NULL','NULL только для события создания.'),('to_status','task_status','Новый статус; проверка допустимой пары статусов.'),
('comment','text / NULL','До 2000 символов. Для revision обязателен непустой текст.'),
('created_at','timestamptz','Время сервера, clock_timestamp().')],[106,111,294])
p('История имеет уникальный индекс на событие создания каждой задачи и индекс (task_id, created_at, id). Объект и исполнитель индексируются отдельно и вместе со статусом для активных задач.','SmallCRM')

section(6,'Доступ: RLS и SQL-привилегии')
p('RLS фильтрует строки внутри PostgreSQL. Помимо политик задаются SQL-привилегии: authenticated получает SELECT, anon не получает доступ к CRM-таблицам. Прямые INSERT/UPDATE/DELETE от клиентских ролей запрещены. [4]')
table(['Операция','Постановщик','Исполнитель'],[
('Читать задачи','Все активные задачи.','Только assignee_id = auth.uid().'),
('Читать объекты','Все активные объекты.','Только с его активными задачами.'),
('Читать историю','У доступных активных задач.','У собственных доступных задач.'),
('Читать профили','Все профили для назначения и истории.','Свой профиль, авторы/исполнители и участники истории доступных задач.'),
('Создавать/редактировать/удалять','Через разрешённые RPC.','Запрещено.'),
('Менять статус','Принять/вернуть с проверки.','Взять в работу/отправить на проверку.'),
('Менять роль / историю','Запрещено через приложение.','Запрещено.')],[138,182,191])
h('Какие политики создают миграции')
code('''profiles_read → private.can_read_profile(id)
objects_read  → private.can_read_object(id)
tasks_read    → private.can_read_task(id)
history_read  → private.can_read_task(task_id)''')
p('Все четыре политики - FOR SELECT TO authenticated. Проверки учитывают is_active, назначение и deleted_at. Для остальных операций нет ни грантов, ни разрешающих политик.')
h('Почему проверки вынесены в private')
p('Взаимные SELECT-политики objects/tasks/profiles способны вызвать рекурсию. Небольшие функции SECURITY DEFINER читают данные с правами владельца, но сами проверяют auth.uid(). У каждой закреплён пустой search_path; имена таблиц полностью квалифицированы. private не экспонируется в Data API. [4, 5]')

section(7,'Безопасная запись через RPC')
p('RPC - вызов заранее определённой функции базы. Клиент передаёт разрешённые поля, а функция проверяет пользователя и выполняет транзакцию. Универсальной функции «обновить любое поле» нет.')
table(['Публичная функция','Кто вызывает','Параметры'],[
('crm_create_object','manager','p_name, p_address'),
('crm_update_object','manager','p_id, p_expected_version, p_name, p_address'),
('crm_delete_object','manager','p_id, p_expected_version'),
('crm_create_task','manager','p_title, p_description, p_object_id, p_assignee_id'),
('crm_update_task','manager','p_id, p_expected_version, p_title, p_description, p_object_id, p_assignee_id'),
('crm_transition_task','По схеме статусов','p_id, p_expected_version, p_to_status, p_comment (необязателен, кроме revision)'),
('crm_delete_task','manager','p_id, p_expected_version')],[149,85,277])
h('Два уровня функций')
bullet('public.crm_* имеют SECURITY INVOKER и служат доступными API-входами. EXECUTE разрешён только authenticated; у PUBLIC и anon он отозван.')
bullet('Узкие реализации в private используют SECURITY DEFINER, проверяют бизнес-роль/назначение и выполняют запись. Они не открываются REST-маршрутами.')
bullet('search_path = пустая строка; таблицы и функции указываются со схемой. Параметры не склеиваются с SQL-текстом. [5]')
h('Служебные поля отсутствуют в параметрах')
p('Нельзя передать author_id, created_at, actor_id, deleted_at или произвольный status в функции создания/редактирования. Начальный статус всегда new. Только transition_task управляет статусом и историей.')
p('GRANT EXECUTE сам по себе не означает разрешение действия: исполнитель может достучаться до RPC, но проверка require_manager отклонит запись. Это проверяется вне интерфейса.','SmallCRM')

section(8,'Статусы, история и одновременная работа')
table(['Из','В','Кто / условие'],[
('Создание','new / Новая','Постановщик; автоматически.'),('new / Новая','in_progress / В работе','Назначенный исполнитель.'),
('in_progress / В работе','review / На проверке','Назначенный исполнитель.'),('review / На проверке','accepted / Принята','Постановщик.'),
('review / На проверке','revision / На доработке','Постановщик; комментарий обязателен.'),('revision / На доработке','in_progress / В работе','Назначенный исполнитель.')],[147,154,210])
h('Как работает crm_transition_task')
for x in ['Проверяет активный профиль пользователя по auth.uid().','Читает задачу FOR UPDATE: конкурирующий запрос ждёт освобождения строки.','Проверяет доступ и p_expected_version: клиент должен передать версию, показанную в карточке.','Проверяет строго разрешённую пару статусов, роль, назначение и комментарий.','Добавляет историю с реальным actor_id и текущим временем; обновляет статус и увеличивает version.','Всё фиксируется вместе. При любой ошибке не сохраняются ни новый статус, ни событие.']: bullet(x)
h('Пример конфликта')
p('Два пользователя открыли версию 3. Первый изменил запись: стала версия 4. Второй отправил expected_version=3: БД вернёт 40001. Интерфейс должен показать сообщение и перечитать данные, а не автоматически повторять действие.')
h('История защищена отдельно')
p('Клиенту не выданы права записи. Триггер immutable_history дополнительно отклоняет UPDATE/DELETE событий. Удаление задачи заполняет deleted_at, не удаляя историю. Полный администратор БД технически может изменить саму схему; защита рассчитана на клиентские запросы, не на владельца проекта.')

section(9,'Файлы миграций: что и где запускать')
table(['Файл / путь в пакете','Что делает','Порядок'],[
('supabase/migrations/\n20261105152310_crm_schema.sql','Типы, таблицы, связи, ограничения, индексы, включение RLS и начальные запреты.','1, SQL Editor'),
('supabase/migrations/\n20261105152318_crm_security_rpc.sql','Политики, функции, триггеры, точные права EXECUTE/SELECT.','2, SQL Editor'),
('scripts/supabase/\ncreate-demo-users.mjs','Три настоящих Auth-аккаунта через Admin API.','3, локальный Node'),
('supabase/seeds/demo.sql','Профили, 3 объекта, 8 задач, 21 событие из моков.','4, SQL Editor'),
('supabase/checks/\nsetup-check.sql','Читает каталоги и проверяет состав схемы/прав.','5, SQL Editor')],[194,238,79])
h('Правила выполнения')
bullet('Каждая миграция содержит BEGIN/COMMIT. Если произошла ошибка, не выполнять следующие шаги. При ручной незакрытой транзакции сначала ROLLBACK, затем выяснить причину.')
bullet('Миграции схемы рассчитаны на однократное выполнение в новом проекте. Ошибка «already exists» не лечится повторным созданием таблиц или отключением RLS.')
bullet('Seed отдельный: демонстрационные данные не следует автоматически загружать в рабочую клиентскую базу.')
bullet('Если используете Supabase CLI, файлы migrations применяются через db push. Демо-пользователей и seed облачной базы выполнить отдельно в том же порядке; история ручных миграций и CLI должна быть согласована.')
h('Почему не нужно вручную расставлять галочки доступа')
p('SQL уже создаёт индексы, RLS, права и функции. Table Editor можно использовать для осмотра, но ручное изменение ролей, типов и политик после установки способно нарушить согласованность пакета.')

section(10,'Тестовые пользователи без ручного ввода')
table(['Email','Имя','Роль'],[[u['email'],u['name'],u['role']] for u in fixture['users']],[157,224,130])
h('Подготовить локальный файл настроек')
p('Скопировать supabase/demo.env.example в .env.supabase в корне проекта. Файл уже исключён из Git. Задать URL проекта, серверный secret key и новый тестовый пароль длиной минимум 12 символов. Общий пароль допустим только для этих демонстрационных аккаунтов.')
code('''SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
DEMO_USERS_PASSWORD=YOUR_UNIQUE_TEST_PASSWORD''')
h('Запустить из папки проекта')
code('''npm ci
node --env-file=.env.supabase scripts/supabase/create-demo-users.mjs''')
p('Скрипт создаёт отсутствующих пользователей с подтверждённым email, без отправки писем. Уже существующих пользователей пропускает, их пароль не меняет. Бизнес-роли не берёт из metadata: они будут назначены seed через доверенный SQL.')
note('Пароль Demo123! существует только в моковом интерфейсе. В облако он не переносится. После запуска использовать пароль из вашего .env.supabase; если аккаунт уже существовал - его прежний пароль.')
h('Альтернатива через Dashboard')
p('В Authentication → Users создать три аккаунта с указанными email и подтвердить их email. Затем выполнить тот же seed. UUID вручную подставлять не нужно: seed находит их по email.')
p('Профиль без Auth-аккаунта создать нельзя из-за внешнего ключа. Auth-аккаунт без profiles может войти в Auth, но не получит доступ к CRM.','SmallCRM')

section(11,'Перенос исходных моковых данных')
p('Seed сгенерирован непосредственно из src/shared/api/mock/seed.ts. Сохраняются названия, описания, адреса, назначения, авторы, статусы, даты и комментарии. Только строковые идентификаторы object-1/task-1/history-* преобразованы в детерминированные UUID.')
labels={'new':'Новая','in_progress':'В работе','review':'На проверке','revision':'На доработке','accepted':'Принята'}
object_names={x['id']:x['name'] for x in fixture['database']['objects']}
user_names={x['id']:x['name'].split()[0] for x in fixture['users']}
table(['Задача','Объект / исполнитель','Статус'],[[t['title'],object_names[t['objectId']]+' / '+user_names[t['assigneeId']],labels[t['status']]] for t in fixture['database']['tasks']],[234,183,94])
h('Результат первого импорта')
p('3 профиля; 3 объекта; 8 задач: 2 новые, 2 в работе, 1 на проверке, 1 на доработке, 2 принятые. Всего 21 событие истории, включая 8 событий создания. version исходной задачи соответствует количеству её импортируемых событий.')
h('Повтор и обновлённый снимок браузера')
p('Повтор seed на неизменённых данных не создаёт дубликатов. Если существующая задача отличается от снимка, импорт прерывается и откатывается; seed не предназначен для объединения расходящихся версий.')
p('Изменения, сделанные пользователем в localStorage, не входят в исходную фикстуру. Чтобы перенести именно их, сохранить JSON ключа kontur.mock.database.v1 в tmp/mock-snapshot.json и сгенерировать SQL вместо исходного seed:')
code('''node scripts/supabase/export-mock-seed.mjs --snapshot tmp/mock-snapshot.json --out tmp/import-snapshot.sql''')
p('Полученный SQL применять в пустой CRM-базе. При неизвестном пользователе или отсутствующей связи генератор остановится. Удалённые ранее моковые данные, которых нет в JSON, не восстанавливаются.','SmallCRM')

section(12,'Что изменить в React-приложении')
h('Адаптер и формат полей')
p('Создать src/shared/api/supabase/provider.ts с реализацией CrmApi. Чтение - .from(...).select(...), запись - только .rpc("crm_..."). В shared/api/index.ts добавить выбор адаптера. TanStack Query и существующие страницы продолжают работать через общий контракт.')
table(['В базе','В TypeScript','Комментарий'],[
('full_name','name','Профиль User.'),('object_id / assignee_id','objectId / assigneeId','UUID вместо строковых mock-ID.'),('author_id / actor_id','authorId / actorId','Автор задачи / участник истории.'),('created_at','createdAt','ISO-строка; время хранится с часовым поясом.'),('from_status / to_status','fromStatus / toStatus','Имена enum совпадают с текущими значениями статусов.'),('version','version','Добавить в Task и ConstructionObject; передавать в мутации.')],[146,153,212])
h('Версии и формы')
bullet('Расширить методы save/remove/transition аргументом expectedVersion. Передавать версию из открытой карточки, а не получать свежую прямо перед записью.')
bullet('При 40001 показать конфликт и перечитать данные. Не повторять мутации автоматически. После успешной записи инвалидировать связанные query keys.')
bullet('Снять ограничение формы «переназначение только у новой задачи»: новая БД разрешает переназначение в любом статусе. Обновить текст подтверждения удаления: история сохраняется.')
h('Пример перехода')
code('''const { data, error } = await supabase
  .rpc('crm_transition_task', {
    p_id: task.id,
    p_expected_version: task.version,
    p_to_status: 'review',
    p_comment: 'Работы завершены'
  }).single();''')
p('Для входа использовать signInWithPassword, затем загрузить profiles. Обрабатывать onAuthStateChange и истечение сессии; очищать query-кэш при выходе/смене пользователя. Демо-кнопки с паролем показывать только в mock-режиме.','SmallCRM')

section(13,'Проверки после установки в облаке')
note('SQL Editor обычно работает как владелец БД и обходит RLS. Проверять доступ нужно через Data API с publishable key и настоящим access token конкретного пользователя. Не использовать secret/service_role при этих проверках.')
table(['Проверка','Ожидаемый результат'],[
('Без входа: SELECT tasks / objects','Нет доступа к таблицам.'),('manager: SELECT tasks','Все 8 исходных активных задач.'),
('ivan: SELECT tasks','Только 4 его задачи.'),('alexey: SELECT tasks','Только 4 его задачи.'),
('Исполнитель: прочитать чужой UUID / историю','Пустой результат либо отказ; никаких чужих полей.'),
('Исполнитель: создать/редактировать/удалить','RPC отклонён, состояние не меняется.'),('Любая роль: прямой UPDATE tasks.status','Отказ по SQL-привилегиям.'),
('Любая роль: INSERT/UPDATE/DELETE task_history','Отказ; история не меняется.'),('Исполнитель: изменить profiles.role','Отказ; роль остаётся прежней.'),
('Новая → Принята / Принята → В работе','Отказ; история не пополняется.'),('Возврат без текста / только пробелы','Отказ; история и статус неизменны.'),
('Повтор запроса со старой version','40001; нет второй записи истории.'),('Переназначение','Старый исполнитель теряет задачу и историю; новый получает доступ.'),
('Удаление задачи','Запись скрыта, история физически остаётся.'),('Открытая регистрация','Отключена в настройках; новый пользователь не регистрируется.')],[266,245],compact=True)
h('Прямой REST-запрос для проверки чтения')
code('''GET https://PROJECT.supabase.co/rest/v1/tasks?select=*
apikey: PUBLIC_PUBLISHABLE_KEY
Authorization: Bearer USER_ACCESS_TOKEN''')
p('Токен берётся из настоящего входа пользователя. Нельзя подставлять UUID пользователя в Authorization или проверять права только скрытием кнопок.','SmallCRM')

section(14,'Контроль установки и границы проверки')
h('Проверить каталоги')
p('supabase/checks/setup-check.sql показывает счётчики, RLS, политики, гранты, функции и триггеры. Должны быть четыре таблицы с RLS, только SELECT-гранты для authenticated и семь invoker RPC без EXECUTE для anon.')
code('''select relname, relrowsecurity
from pg_class
where oid in ('public.profiles'::regclass,
              'public.objects'::regclass,
              'public.tasks'::regclass,
              'public.task_history'::regclass);''')
h('Что уже проверено локально')
for check_text in [
'Миграции выполняются; seed выполняется дважды без дубликатов: 3 профиля, 3 объекта, 8 задач, 21 событие.',
'Исполнитель видит свои задачи, объекты и историю; прямые изменения таблиц и повышение роли запрещены.',
'Полный цикл доработки, обязательный комментарий, конфликт версии и откат неуспешного перехода.',
'Переназначение и потеря доступа прежним исполнителем; архивирование без удаления истории.',
f'Всего {validation["assertions"]} проверок, включая {validation["matrixCases"]} сочетаний роли/исходного/нового статуса. Публичные RPC не имеют SECURITY DEFINER.'
]: bullet(check_text)
p('Движок: PostgreSQL/WASM PGlite. auth.users и auth.uid() имитировались только в тестовой памяти; в облачных миграциях эти объекты не создаются. Отчёт находится в output/pdf/supabase-validation.json.')
h('Что ещё проверить в вашем проекте')
bullet('Настоящие настройки Auth, выдачу JWT и отключение регистрации; чтение и RPC через PostgREST.')
bullet('Две одновременно открытые сессии с одной версией записи: один результат успешен, второй получает конфликт.')
bullet('Экспонируемые схемы, отсутствие серверных ключей в клиентской сборке, Security Advisor и журнал ошибок.')
bullet('После входа под каждой ролью - весь сценарий интерфейса, историю, фильтры, выход и истечение сессии.')
p('Новые таблицы и RPC в будущем требуют своих RLS-политик, точных грантов и allow/deny-проверок. Не исправлять 403 выдачей широких ALL или отключением RLS.','SmallCRM')

section(15,'Ошибки, эксплуатация и источники')
table(['Симптом','Что проверить'],[
('Пользователь вошёл, но данных нет','Есть ли profiles с его UUID, ролью и is_active=true. У исполнителя есть ли назначенные задачи.'),
('Seed просит создать Auth-пользователей','Email трёх аккаунтов должны совпадать с fixture. В Auth и profiles разные назначения.'),
('403 на прямую запись в таблицу','Ожидаемый запрет. Использовать crm_* RPC, а не выдавать INSERT/UPDATE/DELETE.'),
('RPC не найдена','Применена ли вторая миграция; public экспонируется; дождаться обновления schema cache.'),
('40001 при сохранении','Данные изменились. Обновить карточку и повторно принять решение.'),
('Seed сообщает о несовпадении задачи','Не затирать рабочие изменения. Импортировать снимок в пустую базу или отдельно согласовать слияние.')],[179,332])
h('Перед работой с реальными клиентскими данными')
p('Заменить демонстрационные пароли, ограничить доступ к Dashboard, удалить локальные административные секреты после настройки, настроить резервное копирование в рамках доступного тарифа. В рабочую базу не загружать демонстрационный seed.')
h('Официальная документация, проверена 05.11.2026')
sources=[
('1','Настройки регистрации и входа','https://supabase.com/docs/guides/auth/general-configuration'),
('2','Публичные и серверные API-ключи','https://supabase.com/docs/guides/getting-started/api-keys'),
('3','Auth-пользователи и собственные профили','https://supabase.com/docs/guides/auth/managing-user-data'),
('4','RLS, привилегии и рекурсивные политики','https://supabase.com/docs/guides/database/postgres/row-level-security'),
('5','Безопасность и права функций','https://supabase.com/docs/guides/database/functions'),
]
for number,title,url in sources:
    rich(f'<b>[{number}] {escape(title)}</b><br/><link href="{url}" color="#2274cf">{escape(url)}</link>','SmallCRM')
p('Схема, решения и SQL являются проектным предложением для текущей CRM. Документация объясняет механизмы Supabase; она не заменяет проверку конкретного установленного проекта.','SmallCRM')

class NumberedCanvas(canvas.Canvas):
    def __init__(self,*args,**kwargs): super().__init__(*args,**kwargs); self._states=[]
    def showPage(self): self._states.append(dict(self.__dict__)); self._startPage()
    def save(self):
        total=len(self._states)
        for state in self._states:
            self.__dict__.update(state); self.decorate(total); super().showPage()
        super().save()
    def decorate(self,total):
        w,h=595.27,841.89
        self.setStrokeColor(LINE); self.setLineWidth(.5); self.line(42,h-42,w-42,h-42); self.line(42,42,w-42,42)
        self.setFont('BodyBold',8); self.setFillColor(BLUE); self.drawString(42,h-31,'КОНТУР')
        self.setFont('Body',8); self.setFillColor(MUTED); self.drawRightString(w-42,h-31,'SUPABASE / ПЛАН НАСТРОЙКИ')
        self.drawString(42,28,'05.11.2026 · Схема, доступ и перенос данных')
        self.drawRightString(w-42,28,f'{self._pageNumber} / {total}')

doc=SimpleDocTemplate(str(OUT/'kontur-supabase-plan.pdf'),pagesize=(595.27,841.89),rightMargin=42,leftMargin=42,topMargin=64,bottomMargin=60,title='Контур - план настройки Supabase',author='Контур / технический план',allowSplitting=True)
doc.build(story,canvasmaker=NumberedCanvas)
print(OUT/'kontur-supabase-plan.pdf')
