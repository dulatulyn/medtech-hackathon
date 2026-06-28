# MedArchive — Кейс 2 (MedPartners)

ETL-платформа, превращающая архив прайс-листов клиник-партнёров (PDF-текст, PDF-скан,
DOCX, XLSX/XLS) в нормализованную базу **партнёр · услуга · цена** с привязкой к единому
справочнику услуг. Включает REST API (OpenAPI), полнотекстовый и семантический поиск,
детектор аномалий цен, очередь ручной верификации и веб-консоль оператора с авторизацией.

---

## Что умеет (по ТЗ)

| Раздел ТЗ | Реализация |
|---|---|
| 4.1 Загрузка архива | Приём ZIP через веб-UI и CLI, автоопределение формата, очередь обработки, хранение оригиналов |
| 4.2 Извлечение | XLSX/XLS, DOCX (с tracked changes), PDF-текст (+ геометрия таблиц), PDF-скан → **Azure OCR** |
| 4.3 Нормализация | Каскад: код → точное → синоним → нечёткое (pg_trgm) → **семантика (pgvector + e5)** |
| 4.4 Валидация | Цена>0, нерезидент≥резидент, дата не в будущем, дедуп, аномалии >50%, **конвертация валют** |
| 4.5 API | Все эндпоинты ТЗ + история/сравнение цен, OpenAPI на `/docs` |
| 4.6 UI | Поиск, страница партнёра/услуги, загрузка, дашборд качества, очереди верификации |
| Версионирование | История цен бессрочно (`is_active`/`superseded_by`), исходники не удаляются |
| Авторизация | Логин/регистрация (cookie-JWT), защищённая консоль оператора |

---

## Стек

- **Backend:** FastAPI + Dishka (DI), async SQLAlchemy 2.0 + Alembic
- **БД:** PostgreSQL 16 + `pg_trgm` (нечёткий) + `pgvector` (семантика, HNSW)
- **Поиск:** Meilisearch (полнотекстовый, опечатки) + Postgres FTS как фолбэк
- **OCR:** Azure AI Document Intelligence (`prebuilt-read`)
- **Эмбеддинги:** локальный `intfloat/multilingual-e5-large` (1024-dim, $0/офлайн)
- **Frontend:** React + Vite (прокси `/api → backend`)
- **Хранилище оригиналов:** файловая система (`backend/storage/`), сменяемо на S3/MinIO

## Структура (monorepo)

```
medtech-hackathon/
├── backend/     FastAPI + Postgres + ETL + нормализация + API
├── frontend/    Веб-консоль (React)
├── docs/        Планы, контракт API, прогресс
├── RUN.md                  подробный гайд запуска
└── RECOMMENDATIONS.md      заметки по доработкам
```

---

## Быстрый старт для проверки (без OCR и пайплайна) ⭐

В репозитории лежит **готовый снимок базы** (`backend/fixtures/demo_db.sql.gz`): 10
обработанных документов, 18k позиций с ценами, нормализация, аномалии, эмбеддинги
каталога и демо-логин. Восстанавливается за секунды — **ничего не нужно распознавать
через OCR, не нужны ключи Azure, не нужно гонять пайплайн.**

```bash
# 1. Поднять Postgres (pgvector) + Meilisearch
docker run -d --name medtech_db -e POSTGRES_USER=med -e POSTGRES_PASSWORD=med \
  -e POSTGRES_DB=medarchive -p 5544:5432 pgvector/pgvector:pg16
docker run -d --name medtech_meili -e MEILI_MASTER_KEY=devmeilikey -p 7700:7700 getmeili/meilisearch:v1.10

# 2. Восстановить готовые данные (instant)
cd backend && make restore-demo

# 3. Запустить бэкенд и фронт
export DB_HOST=localhost DB_PORT=5544 DB_USER=med DB_PASSWORD=med DB_NAME=medarchive \
       SECRET_KEY=devsecret MEILI_URL=http://localhost:7700 MEILI_KEY=devmeilikey \
       COOKIE_SECURE=false COOKIE_SAMESITE=lax
uv sync && uv run uvicorn src.main:app --port 8010
# в другом терминале:
cd ../frontend && npm install && VITE_API_TARGET=http://localhost:8010 npm run dev
```

Открыть **http://localhost:4321** → войти `operator` / `Operator123` → всё уже наполнено
живыми данными. (Опционально для полнотекстового поиска: `make -C backend reindex`-эквивалент
через `POST /api/v1/admin/reindex`.)

> Полный прогон с нуля (импорт ZIP → OCR → нормализация) — ниже. Снимок пересоздаётся
> командой `make dump-demo`.

---

## Запуск с нуля (полный пайплайн)

Нужны: Docker, `uv` (Python), Node.js.

```bash
# 1. Инфраструктура: Postgres (с pgvector) + Meilisearch
docker run -d --name medtech_db \
  -e POSTGRES_USER=med -e POSTGRES_PASSWORD=med -e POSTGRES_DB=medarchive \
  -p 5544:5432 pgvector/pgvector:pg16

docker run -d --name medtech_meili \
  -e MEILI_MASTER_KEY=devmeilikey \
  -p 7700:7700 getmeili/meilisearch:v1.10

# 2. Backend (порт 8010)
cd backend
uv sync
export DB_HOST=localhost DB_PORT=5544 DB_USER=med DB_PASSWORD=med DB_NAME=medarchive
export SECRET_KEY=devsecret
export MEILI_URL=http://localhost:7700 MEILI_KEY=devmeilikey
export COOKIE_SECURE=false COOKIE_SAMESITE=lax     # cookie работают по http://localhost
uv run alembic upgrade head
uv run python -m src.cli seed                       # демо-данные + логин operator/Operator123
uv run uvicorn src.main:app --port 8010

# 3. Frontend (порт 4321) — в отдельном терминале
cd frontend
npm install
VITE_API_TARGET=http://localhost:8010 npm run dev
```

Открыть **http://localhost:4321** → войти `operator` / `Operator123`.

---

## Ссылки и доступы

| Что | URL | Доступ |
|---|---|---|
| Веб-консоль | http://localhost:4321 | `operator` / `Operator123` |
| API + Swagger | http://localhost:8010/docs | — |
| Health/Ready | http://localhost:8010/health · `/health/ready` | — |
| Meilisearch | http://localhost:7700 | master key `devmeilikey` |
| Postgres | localhost:5544 | `med` / `med` / `medarchive` |

> Демо-логин создаётся командой `seed`. Свой: `uv run python -m src.cli create-user <логин> <email> <пароль>`
> (пароль ≥8 символов, минимум по одной заглавной/строчной букве и цифре).

---

## Полный сценарий «как пользователь»

```bash
# 1) Загрузить реальный справочник услуг (цель нормализации)
uv run python -m src.cli load-dict "/путь/Справочник услуг.xlsx"

# 2) Дальше — через веб-UI: войти → «Загрузка архива» → выбрать Хакатон.zip
#    Платформа сама: определит форматы → разберёт → нормализует → отметит аномалии → проиндексирует
```

На что смотреть в UI:
- **Дашборд** — % автонормализации, очереди, аномалии (отчёт о качестве, кнопка «Печать»)
- **Поиск** — «МРТ», «анализ крови» → кто оказывает и по какой цене, сравнение клиник
- **Документы** — клик по строке → извлечённые позиции + лог обработки
- **Несопоставленное** — ручная разметка; система запоминает синонимы (self-learning)
- **Аномалии** — переплаты/скачки цен · **Клиники/Справочник** — карточки и эталон услуг

---

## CLI (`python -m src.cli ...`)

| Команда | Назначение |
|---|---|
| `seed` | демо-данные + демо-логин |
| `create-user <u> <email> <pass>` | создать пользователя |
| `load-dict <файл.xlsx/json>` | загрузить справочник услуг |
| `import <архив.zip>` | импорт архива прайсов |
| `parse` · `normalize` | разбор / нормализация всех документов |
| `validate-doc <id>` | валидация + история + аномалии |
| `embed` · `reindex` | эмбеддинги каталога / переиндексация Meili |

## Основные эндпоинты API

```
POST /api/v1/auth/register · /login · /logout · GET /me        — авторизация
POST /api/v1/admin/imports                                     — загрузка ZIP
GET  /api/v1/admin/documents · /documents/{id}                 — документы + детали
GET  /api/v1/admin/stats                                       — отчёт о качестве
GET  /api/v1/services · /services/{id}/partners · /price-*     — каталог, цены, история
GET  /api/v1/partners · /partners/{id}/services                — клиники
GET  /api/v1/search · /search/full · /search/semantic          — поиск (trgm/Meili/вектор)
GET  /api/v1/unmatched · POST /api/v1/match                    — очередь верификации
GET  /api/v1/anomalies                                         — аномалии цен
```

## Переменные окружения (backend)

| Переменная | Назначение | Пример |
|---|---|---|
| `DB_HOST/PORT/USER/PASSWORD/NAME` | Postgres | `localhost / 5544 / med / med / medarchive` |
| `SECRET_KEY` | JWT-подпись | `devsecret` |
| `MEILI_URL` / `MEILI_KEY` | Meilisearch | `http://localhost:7700` / `devmeilikey` |
| `EMBED_ENABLED` | семантика вкл/выкл | `true` |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` | cookie (dev) | `false` / `lax` |
| `OCR_AZURE_ENDPOINT` / `OCR_AZURE_KEY` | Azure OCR (опц.) | — |

## Тесты

```bash
cd backend
DB_HOST=localhost DB_PORT=5544 DB_USER=med DB_PASSWORD=med DB_NAME=medarchive \
SECRET_KEY=x MEILI_URL=http://localhost:7700 MEILI_KEY=devmeilikey uv run pytest -q
```

60 тестов (юнит: парсеры, каскад нормализации, валидация, OCR, валюты + DB: auth, каталог, импорт, парсинг).

---

## Командная работа

- Бэкенд — `backend/`, фронт — `frontend/`.
- Перед пушем: `git pull --rebase origin main`, затем `git push`. Force-push не использовать.
- Подробный гайд запуска и нюансы — **`RUN.md`**.
