# MedArchive — Кейс 2 (MedPartners)

ETL-конвейер, превращающий архив прайс-листов клиник-партнёров (PDF-текст, PDF-скан,
DOCX, XLSX/XLS) в нормализованную БД **партнёр · услуга · цена** с привязкой к единому
справочнику услуг, REST API (OpenAPI) и веб-UI (поиск, страница партнёра, очередь
верификации, дашборд).

## Структура (monorepo)

```
medtech-hackathon/
├── backend/     FastAPI + Postgres (pg_trgm + pgvector) — ETL, нормализация, API
├── frontend/    Веб-UI (React)  ← фронт коммитит сюда
├── docs/        Планы, спецификации
└── medarchive-c4.excalidraw   C4-диаграмма системы
```

Бэкенд и фронт живут в **одном репозитории**, в соседних папках — конфликтов по файлам
нет, потому что каждый работает в своей директории.

## Backend

```bash
cd backend
uv sync
cp .env.example .env        # заполнить DB_*, SECRET_KEY
make migrate-upgrade        # применить миграции
uv run uvicorn src.main:app --reload
```

API-доки: `http://localhost:8000/docs`. Подробнее — `backend/README.md`.

## Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:4321
```

UI ходит в API через прокси `/api → backend` (см. `vite.config.js`). По умолчанию
бэкенд ожидается на `:8010`; переопределить — `VITE_API_TARGET=http://host:port npm run dev`.
Все страницы тянут живые данные из API с фолбэком на мок (`src/data.js`), если бэкенд недоступен.

## Демо: связанный стек (back + front)

```bash
# 1. БД с расширениями pg_trgm + pgvector (нужен pgvector-образ, не обычный postgres)
docker run -d --name medtech_db -e POSTGRES_USER=med -e POSTGRES_PASSWORD=med \
  -e POSTGRES_DB=medarchive -p 5544:5432 pgvector/pgvector:pg16

# 2. Бэкенд: миграции + демо-данные + сервер на :8010
cd backend
export DB_HOST=localhost DB_PORT=5544 DB_USER=med DB_PASSWORD=med DB_NAME=medarchive SECRET_KEY=devsecret
uv run alembic upgrade head
uv run python -m src.cli seed          # 8 клиник, 8 услуг, прайсы, аномалии
uv run uvicorn src.main:app --port 8010

# 3. Фронтенд на :4321 (проксирует /api → :8010)
cd ../frontend && npm install && npm run dev
```

Открыть `http://localhost:4321` → Дашборд/Каталог/Поиск/Документы/Несопоставленное
показывают живые данные. Контракт API — `docs/api-contract.md`.

Подробнее — `frontend/README.md`.

## Командная работа

- Бэкенд — папка `backend/`, фронт — папка `frontend/`. Файлы не пересекаются.
- Перед пушем: `git pull --rebase origin main`, затем `git push`.
- По желанию — ветка на человека (`git switch -c feat/<имя>`) и PR в `main`.
