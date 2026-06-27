# RECOMMENDATIONS — что докрутить к защите

Базовый стек поднимается по `RUN.md` и работает «вживую» (импорт → нормализация →
поиск → дашборд). Ниже — что включить/добавить, чтобы усилить демо. Всё это уже
заложено в коде и конфиге — нужно лишь активировать.

---

## 1. Семантический поиск (эмбеддинги) — приоритет №1

Сейчас для быстрого старта `EMBED_ENABLED=false`, и нормализация идёт каскадом
(точное совпадение → синонимы → `pg_trgm`). Включение эмбеддингов добавляет
семантический шаг через **pgvector** (`multilingual-e5-large`, 1024-dim, косинусное
расстояние, HNSW-индекс уже создан миграцией) — лучше ловит перефразированные названия
услуг.

```bash
# backend/.env
EMBED_ENABLED=true
```

После перезапуска backend построить эмбеддинги для справочника услуг:

```bash
curl -s -X POST http://localhost:8010/api/v1/admin/embed
```

> Первый запуск тянет модель (~2 ГБ) — заложите время заранее, не на самой защите.
> Затем повторно прогоните `normalize-all`, чтобы пересопоставить позиции с учётом
> семантики.

---

## 2. OCR для сканов (Azure Document Intelligence)

Без ключей сканированные PDF уходят в статус `needs_review` (не парсятся). Подключение
Azure Document Intelligence (`prebuilt-read`) включает распознавание сканов.

```bash
# backend/.env (регион зашит в endpoint URL)
OCR_AZURE_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com/
OCR_AZURE_KEY=<your-key>
```

После этого скан-PDF проходят парсинг как обычные документы. Демонстрирует полноту
охвата форматов (PDF-текст, **PDF-скан**, DOCX, XLSX/XLS).

---

## 3. Полнотекстовый поиск (Meilisearch)

Без `MEILI_URL` поиск идёт через `pg_trgm` (триграммы). Meilisearch даёт быстрый
полнотекст с устойчивостью к опечаткам — фронт сам предпочитает `/search/full` и
падает на `pg_trgm`, если Meili недоступен.

```bash
# поднять Meilisearch
docker run -d --name meili -p 7700:7700 \
  -e MEILI_MASTER_KEY=devmasterkey getmeili/meilisearch:v1.6

# backend/.env
MEILI_URL=http://localhost:7700
MEILI_KEY=devmasterkey
```

Перезапустить backend и построить индекс:

```bash
curl -s -X POST http://localhost:8010/api/v1/admin/reindex
```

В выдаче поиска фронт показывает, каким движком найдено (`meilisearch` / `pg_trgm`).

---

## 4. Авторизация (JWT уже в backend)

Cookie-JWT уже реализован: `POST /api/v1/auth/register` · `/login` · `/refresh` ·
`/logout`, `GET /api/v1/auth/me`. Токены — `HttpOnly`-куки, клиент их не трогает.

Сейчас публичные read-эндпоинты и admin-write открыты ради демо. К защите стоит:

- закрыть `admin/*` (импорт, пайплайн, reindex/embed) и `POST /match` за авторизацией;
- добавить на фронте экран логина и состояние пользователя;
- сгенерировать стойкий `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 5. Наполнение реальными данными

Чем больше реальных прайсов залито — тем убедительнее метрики (match-rate, аномалии,
сравнение цен по партнёрам).

- Загрузить настоящие архивы прайс-листов клиник-партнёров через
  `POST /api/v1/admin/imports` (см. `RUN.md`, шаг 4).
- Прогнать `pipeline/{id}` по каждому документу — получите аномалии и историю цен.
- Свериться с дашбордом: `GET /api/v1/admin/stats` (match-rate, кол-во несопоставленных,
  аномалии, покрытие по партнёрам).
- Несопоставленные позиции добить вручную через `POST /api/v1/match` — он
  самообучающийся: добавляет синоним и автоматически досопоставляет «близнецов».

---

## 6. Деплой (docker-compose уже есть)

В `backend/docker-compose.yml` уже описаны сервисы `db` (Postgres) + `app` (FastAPI),
есть `Dockerfile`. Запуск:

```bash
cd backend
docker compose up --build
```

Что поправить перед демо-деплоем:

- **Образ БД**: в compose стоит `postgres:16-alpine` — в нём **нет pgvector**, и
  миграция `CREATE EXTENSION vector` упадёт. Замените образ на `pgvector/pgvector:pg16`
  (либо доустановите расширение в свой образ).
- **Миграции**: после старта контейнеров прогнать `alembic upgrade head`
  (например, отдельной командой в контейнере `app`).
- **Frontend**: собрать `npm run build` и раздавать `frontend/dist/` через статику
  (Nginx / отдельный сервис); прокси `/api` направить на сервис `app`.
- **Секреты**: задать реальные `SECRET_KEY`, `OCR_*`, `MEILI_*` через переменные
  окружения деплоя, не коммитить `.env`.

---

## Краткий чек-лист к защите

- [ ] `EMBED_ENABLED=true` + `POST /admin/embed` (семантический поиск)
- [ ] Azure OCR-ключи (сканы парсятся)
- [ ] Meilisearch поднят + `POST /admin/reindex` (полнотекст с опечатками)
- [ ] admin/match закрыты JWT, стойкий `SECRET_KEY`
- [ ] залиты реальные прайсы, дашборд показывает живые метрики
- [ ] docker-compose с pgvector-образом проверен end-to-end
