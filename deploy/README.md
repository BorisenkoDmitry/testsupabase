# Развёртывание

Фронтенд работает в отдельном Docker Compose-проекте testsupabase. База/Auth — облачный Supabase. Серверный ключ контейнеру не нужен и на сервер не копируется.

Docker собирает исходники через Node.js 24, затем отдаёт только dist непривилегированным nginx. UID 101, файловая система только для чтения, временный /tmp, без Linux capabilities и опубликованных host-портов.

Требуются Docker/Compose и external-сеть coolify с существующим Traefik. DNS testsupabase.dmitriy-borisenko.ru должен указывать на сервер. Порты 80/443 и маршруты других проектов не менять.

Исключённый из Git серверный .env.production содержит только RELEASE_TAG (commit), VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY. Серверные секреты Supabase туда не добавлять.

Команды: sudo docker compose --env-file .env.production build --pull; затем sudo docker compose --env-file .env.production up -d --wait.

После healthcheck установить deploy/traefik.yaml отдельным файлом testsupabase.yaml в динамический каталог существующего Traefik. Действующий resolver letsencrypt автоматически выпускает и продлевает сертификат через HTTP-01. Старые proxy-файлы и acme.json не менять.

Проверить HTTPS/сертификат, HTTP→HTTPS, /healthz, вход, прямое открытие /tasks и отсутствие выдачи .env/database.txt/basedata.txt. Прогнать браузерные тесты с CRM_BASE_URL.

Релизы: /opt/testsupabase/releases/<commit>; текущий — ссылка /opt/testsupabase/current. Сначала собирается новый image, затем заменяется только web. Для отката использовать предыдущий каталог и его env. Миграции базы при обновлении фронтенда автоматически не выполняются; тома и другие проекты не затрагиваются.
