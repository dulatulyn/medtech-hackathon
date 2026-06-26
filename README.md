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
# первый раз: npm create vite@latest .   (React + TS)
npm install
npm run dev
```

Подробнее — `frontend/README.md`.

## Командная работа

- Бэкенд — папка `backend/`, фронт — папка `frontend/`. Файлы не пересекаются.
- Перед пушем: `git pull --rebase origin main`, затем `git push`.
- По желанию — ветка на человека (`git switch -c feat/<имя>`) и PR в `main`.
