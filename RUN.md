# RUN — поднять весь стек MedArchive локально

Пошаговый гайд: Postgres → backend (FastAPI) → frontend (React/Vite) → загрузка прайсов.
Все команды готовы к копипасту. Пути относительно корня репозитория `medtech-hackathon/`.

## 0. Требования

- **PostgreSQL 16** с расширениями **pgvector** и **pg_trgm**
  (миграции создают `CREATE EXTENSION vector` и `pg_trgm` — расширения должны быть
  установлены в самом Postgres).
  - macOS (Homebrew): `brew install postgresql@16 pgvector`
  - либо Docker-образ с pgvector (см. вариант B в шаге 1).
- **Python 3.13** и [**uv**](https://docs.astral.sh/uv/) (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Node.js 18+** и npm

---

## 1. Postgres: база + расширения

### Вариант A — локальный Postgres (Homebrew)

```bash
# создать базу
createdb medarchive

# включить расширения (vector обязателен — без него миграции не пройдут)
psql -d medarchive -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql -d medarchive -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

Проверка, что расширения на месте:

```bash
psql -d medarchive -c "\dx"
```

### Вариант B — Postgres в Docker (с pgvector «из коробки»)

```bash
docker run -d --name medarchive_db \
  -e POSTGRES_USER=med -e POSTGRES_PASSWORD=med -e POSTGRES_DB=medarchive \
  -p 5432:5432 pgvector/pgvector:pg16

# расширения (если миграция не создаст их сама)
docker exec -it medarchive_db psql -U med -d medarchive \
  -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

> Если выбрали вариант B — в шаге 2 в `.env` поставьте `DB_USER=med`, `DB_PASSWORD=med`.

---

## 2. Backend: env + миграции + сервер

```bash
cd backend

# 1) .env из шаблона
cp .env.example .env
```

Откройте `backend/.env` и приведите его к локальному виду — БД на `localhost`,
эмбеддинги выключены для лёгкого старта:

```env
DB_USER=postgres          # ваш локальный Postgres-юзер (для варианта B — med)
DB_PASSWORD=postgres      # ваш пароль (для варианта B — med)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medarchive

SECRET_KEY=dev-secret-local-change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OCR сканов выключен (нет ключей) → сканы уходят в needs_review
OCR_AZURE_ENDPOINT=
OCR_AZURE_KEY=

# Meilisearch выключен → /search/full недоступен, поиск идёт через pg_trgm
MEILI_URL=
MEILI_KEY=

# ВАЖНО: лёгкий старт без загрузки модели эмбеддингов
EMBED_MODEL=intfloat/multilingual-e5-large
EMBED_ENABLED=false

DEBUG=true
APP_NAME=MedArchive
```

> `EMBED_ENABLED=false` — модель эмбеддингов (~2 ГБ) не качается, старт быстрый.
> Как включить семантический поиск позже — см. `RECOMMENDATIONS.md`.

Установка зависимостей, миграции, запуск:

```bash
# 2) зависимости
uv sync

# 3) применить миграции (создаст таблицы + extensions vector/pg_trgm)
uv run alembic upgrade head

# 4) поднять API на :8010 (фронт ждёт бэкенд именно тут)
uv run uvicorn src.main:app --reload --port 8010
```

Проверка:

- Swagger UI — http://localhost:8010/docs
- Health — http://localhost:8010/health
- API под базовым путём `/api/v1`

---

## 3. Frontend: React + Vite

В **новом терминале**:

```bash
cd frontend
npm install
npm run dev          # http://localhost:4321
```

Открыть **http://localhost:4321**. Vite-прокси перекидывает `/api → http://localhost:8010`.
Если бэкенд на другом порту/хосте:

```bash
VITE_API_TARGET=http://localhost:8000 npm run dev
```

Подробнее по фронту — `frontend/README.md`.

---

## 4. Залить прайсы (ETL-пайплайн)

Архив прайс-листов (ZIP с PDF/DOCX/XLSX/XLS) загружается одним POST-запросом, затем
запускается конвейер **parse → normalize → validate**.

### Через UI

Открыть http://localhost:4321/upload и загрузить ZIP-архив — фронт сам вызовет импорт
и прогонит пайплайн по каждому документу.

### Через API (curl)

```bash
# (a) загрузить архив → вернёт {"documents": N, "doc_ids": [...]}
curl -s -X POST http://localhost:8010/api/v1/admin/imports \
  -F "file=@/path/to/prices.zip"

# (b) распарсить все ожидающие документы
curl -s -X POST http://localhost:8010/api/v1/admin/parse-all

# (c) нормализовать все распарсенные позиции (привязать к справочнику услуг)
curl -s -X POST http://localhost:8010/api/v1/admin/normalize-all
```

Альтернатива — прогнать **полный пайплайн по конкретному документу** (parse → normalize
→ validate, включая поиск аномалий) для каждого `doc_id` из ответа шага (a):

```bash
curl -s -X POST http://localhost:8010/api/v1/admin/pipeline/<doc_id>
```

Полезные служебные эндпоинты:

```bash
# статистика качества импорта (её показывает дашборд)
curl -s http://localhost:8010/api/v1/admin/stats

# список документов и их статус парсинга
curl -s http://localhost:8010/api/v1/admin/documents

# (опционально) переиндексировать Meilisearch — только если MEILI_URL задан
curl -s -X POST http://localhost:8010/api/v1/admin/reindex

# (опционально) построить эмбеддинги — только при EMBED_ENABLED=true
curl -s -X POST http://localhost:8010/api/v1/admin/embed
```

После загрузки данные видно на http://localhost:4321 — Дашборд, Каталог, Поиск,
Документы, Несопоставленное.

---

## Шпаргалка адресов

| Что              | URL                              |
|------------------|----------------------------------|
| Frontend (UI)    | http://localhost:4321            |
| Backend API      | http://localhost:8010/api/v1     |
| Swagger UI       | http://localhost:8010/docs       |
| Health           | http://localhost:8010/health     |
| PostgreSQL       | localhost:5432 / `medarchive`    |

## Типичные проблемы

- **`extension "vector" is not available`** при `alembic upgrade` — pgvector не установлен
  в Postgres. Поставьте `brew install pgvector` (вариант A) или используйте образ
  `pgvector/pgvector:pg16` (вариант B).
- **Фронт показывает мок-данные** — backend недоступен на `:8010`. Проверьте, что uvicorn
  запущен, и при необходимости задайте `VITE_API_TARGET`.
- **Долгий первый старт backend** — скорее всего `EMBED_ENABLED=true` тянет модель. Для
  демо держите `false`.
- **`role "postgres" does not exist`** — у локального Postgres другой суперпользователь
  (часто ваш системный юзер). Поправьте `DB_USER`/`DB_PASSWORD` в `backend/.env`.

## Что докрутить к защите

См. `RECOMMENDATIONS.md`.
