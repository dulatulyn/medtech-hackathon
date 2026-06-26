# MedArchive Build Plan (on the cleaned FastAPI-DI foundation)

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development or
> superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
> Conventions are fixed by `backend/CLAUDE.md` — read it before any task.

**Goal:** Turn the heterogeneous clinic price-list archive into a normalized, searchable
database of partners / services / prices, with a verification queue and an API + dashboard.

**Foundation (already provided by `backend/`, do NOT rebuild):**
layered `src/` (controller → service → repository), **Dishka** DI, cookie-JWT auth
(register/login/refresh/logout/me/profile), structured logging, health/readiness, async
SQLAlchemy 2.0 + Alembic, ULID PKs + timestamps, exception handlers, response wrapper.

**Tech added on top:** `pg_trgm` + `pgvector` (fuzzy + semantic), `arq` + Redis (workers),
MinIO/S3 (raw files), parsers (openpyxl / python-docx / pdfplumber / pytesseract), LLM
(Anthropic) for scan extraction + normalization tail, optional Meilisearch.

## Global Constraints

- Follow `backend/CLAUDE.md` exactly: controllers use **schemas**, services use **DTOs**,
  repositories use **models**; never return ORM models from services.
- New models inherit `Base` + `ULIDMixin` + `TimestampMixin`; register their import in
  `alembic/env.py`.
- Every new service/repository is registered in the matching `src/ioc/*_provider.py`.
- All DB I/O async. Type hints + 1-line docstrings. Structured logs only.
- Each phase ends with a passing test and an applied migration (if models changed).
- Map每 feature to the ТЗ scoring weight it serves (noted per phase).

---

## Phase 0 — Make the foundation runnable end-to-end  ⏱ first

**Goal:** prove the cleaned starter boots, migrates, and auth works locally.

- [ ] Switch Postgres image to `pgvector/pgvector:pg16` in `docker-compose.yml` (needed later).
- [ ] `uv sync`; `cp .env.example .env`; set `SECRET_KEY`, `DB_*`.
- [ ] `docker compose up -d db`; `make migrate-upgrade` (applies `0001_init`).
- [ ] Add `tests/conftest.py`: a test-DB engine fixture (create_all/drop_all), a Dishka
      test container, and an `httpx.AsyncClient` against `src.main:app`.
- [ ] Add `tests/test_auth_flow.py`: register → login (cookies set) → `/auth/me` →
      refresh → logout. Run `uv run pytest` green.
- [ ] `make dev-backend`; confirm `/docs`, `/health`, `/health/ready`.

**Acceptance:** auth flow test passes; Swagger renders; readiness returns DB-connected.
**Serves:** baseline for everything (API 15%).

---

## Phase 1 — Domain data model

**Goal:** schema for flexible tariffs + provenance + price versioning (our edge over the ТЗ).

**Files (create):**
- `src/models/catalog.py` — `Service`, `ServiceSynonym`.
- `src/models/partner.py` — `Partner`.
- `src/models/pricing.py` — `PriceDocument`, `PriceItem`, `PriceTariff`.
- `src/enums/__init__.py` — `FileFormat`, `ParseStatus`, `MatchMethod`, `TariffType`, `Currency`.
- `alembic/versions/0002_domain.py` — tables + extensions (`pg_trgm`, `vector`) + indexes
  (GIN trigram on `service.name`/synonyms, HNSW on `service.embedding`).

**Model notes:**
- `Service(name, category, icd_code, embedding Vector(1024)|null, is_active)`.
- `ServiceSynonym(service_id FK, text, source: dict|operator)` — powers self-learning.
- `Partner(name, city, address, bin, contact_email, contact_phone, is_active)`.
- `PriceDocument(partner_id FK, file_name, file_format, object_key, effective_date,
  parse_status, parse_log, raw_ref)`.
- `PriceItem(doc_id FK, partner_id FK, service_name_raw, service_code_source,
  service_id FK|null, match_method, match_confidence, is_verified, verification_note,
  effective_date, is_active, superseded_by|null, provenance JSON{sheet,page,row,bbox,raw_text})`.
- `PriceTariff(item_id FK, tariff_type, amount Numeric, currency, original_amount|null)`
  — **many tariffs per item** (resident / cis / far_abroad / insurance / with_vat / partner).

- [ ] Register all new models in `alembic/env.py`.
- [ ] Add repositories: `ServiceRepository`, `PartnerRepository`, `PriceRepository`;
      register in `RepositoryProvider`.
- [ ] Tests: create a partner, a service with 2 synonyms, a doc with an item carrying 3
      tariffs; assert round-trip and the provenance JSON persists.

**Acceptance:** `make migrate-upgrade` builds all tables + extensions + indexes; repo tests green.
**Serves:** validation/versioning 20%, normalization 25% (synonyms), the whole pipeline.

---

## Phase 2 — Reference dictionary loader

**Goal:** load the organizer-provided services dictionary (XLSX/JSON) into `Service` + synonyms.

- [ ] `src/services/catalog_service.py: load_dictionary(rows) -> int` (upsert by name/code,
      attach synonyms with `source="dict"`).
- [ ] CLI `python -m src.cli load-dict <path>` calling the same service.
- [ ] Test: load a small fixture, assert services + synonyms counts.

**Acceptance:** dictionary import is idempotent; counts correct.
**Serves:** normalization 25% (the matching target).

---

## Phase 3 — Archive ingestion

**Goal:** accept the ZIP → store originals → create `PriceDocument`s → enqueue parse jobs.

- [ ] `src/integrations/storage.py` — MinIO/S3 client (put/get by `object_key`).
- [ ] `src/integrations/queue.py` — arq settings + enqueue helper; register in IoC.
- [ ] `src/services/import_service.py` — unzip, detect format (signature + extension),
      guess partner/date from filename, store original, create doc(`pending`), enqueue.
- [ ] Controller `POST /api/v1/admin/imports` (UploadFile zip) + `GET /admin/documents`
      (statuses). CLI `python -m src.cli import <zip>` → same service.
- [ ] Test: import a 2-file zip → 2 docs `pending`, 2 objects in storage, idempotent re-import.

**Acceptance:** our real archive creates the right docs; originals retrievable.
**Serves:** ТЗ 4.1; extraction 30% (entry point).

---

## Phase 4 — Format parsers

**Goal:** raw document → rows of `PriceItem` (+ tariffs + provenance). One interface, per-format impls.

**Files:** `src/parsers/base.py` (`Parser.parse(doc) -> list[RawRow]`), then
`excel.py` (openpyxl/xls via soffice), `docx.py` (python-docx, accept tracked changes),
`pdf_text.py` (pdfplumber), `pdf_scan.py` (pytesseract + OCR cleanup), `llm_extract.py`
(LLM structured-extraction fallback). Dispatcher picks impl by `file_format`.

- [ ] Header-row detection (not first row), skip title/section rows, column mapping
      (name / source code / unit / price columns → `TariffType`).
- [ ] OCR cleanup: digit-letter fixes (С→0, О→0, И→11), de-spacing broken words.
- [ ] `arq` task `parse_document(doc_id)`: load file, parse, persist items+tariffs, set
      status `done`/`needs_review`/`error`, write `parse_log`.
- [ ] Tests: one fixture per format from the real files; assert row counts + a known price.

**Acceptance:** all 10 sample files parse to rows; price field-accuracy ≥95% text / ≥85% scan;
<60s text / <3min scan per doc.
**Serves:** extraction 30% (the biggest weight).

---

## Phase 5 — Normalization cascade

**Goal:** map `service_name_raw` → `service_id`, maximize auto-match %.

- [ ] `src/normalization/cascade.py: match(raw, code) -> MatchResult` running, in order:
      (1) source code, (2) exact normalized name, (3) synonym, (4) pg_trgm fuzzy,
      (5) pgvector top-k → LLM confirm. Configurable threshold (env, default 0.85).
- [ ] `src/integrations/llm.py` — Anthropic client: embeddings + confirm-match call.
- [ ] `arq` task `normalize_document(doc_id)`: set `service_id` + `match_method` +
      `match_confidence`; below threshold → `needs_review`.
- [ ] Tests: feed the real raw strings (see prior cascade demo); assert method per string
      and overall auto-match % on a sample.

**Acceptance:** auto-match % reported (target ≥70%, aim 85%+); precision ≥95% on sample.
**Serves:** normalization 25%.

---

## Phase 6 — Validation, anomalies, versioning

**Goal:** ТЗ 4.4 checks + price history.

- [ ] `src/services/validation_service.py`: price>0 & numeric; nonresident≥resident (warn);
      empty name → skip+log; future date (warn); dedup (partner+service+date → archive old);
      price change >50% vs previous → anomaly flag; currency≠KZT → convert by NB RK rate on
      date (keep original); no recognizable data → `error`.
- [ ] Versioning: on change, set old `is_active=false`, `superseded_by=new_id` (never delete).
- [ ] Tests: Клиника 1 (2024/2026) & Клиника 2 (2025/2026) build history + trigger >50% anomaly.

**Acceptance:** history built across the year-pairs; anomalies flagged; checks logged.
**Serves:** validation 20%.

---

## Phase 7 — Verification queue + self-learning

**Goal:** operator clears the tail; confirmations teach the system.

- [ ] `GET /api/v1/unmatched` — items `needs_review` with candidate matches + provenance.
- [ ] `POST /api/v1/match` — confirm / correct / create-service. On confirm/correct, write
      `service_name_raw` as `ServiceSynonym(source="operator")` and re-match similar pending.
- [ ] Bulk: confirm all `>0.95`; group similar.
- [ ] Tests: a `match` call links the item AND creates a synonym AND auto-matches a twin.

**Acceptance:** synonym written; twin row auto-matches on next run; queue shrinks.
**Serves:** normalization 25% + UX 10%.

---

## Phase 8 — Search & public API

**Goal:** all ТЗ 4.5 endpoints + extras, documented in Swagger.

- [ ] `GET /services` (filter category), `GET /services/{id}/partners` (partners + tariffs),
      `GET /partners` (filter city/status), `GET /partners/{id}/services`,
      `GET /search?q=` (Postgres FTS or Meilisearch), `GET /unmatched`, `POST /match`.
- [ ] Extras: `GET /services/{id}/price-history`, `GET /services/{id}/price-compare`.
- [ ] Optional Meilisearch index refreshed after normalization; optional `GET /search/nl`
      (LLM text-to-filter).
- [ ] `GET /admin/stats` — docs by status, auto-normalization %, queue size, anomalies,
      coverage, per-format success — the live quality report.
- [ ] Tests: each endpoint returns expected shape; search p95 < 100ms on seeded data.

**Acceptance:** OpenAPI complete; endpoints green; stats match a real archive run.
**Serves:** API 15% + the required quality report.

---

## Execution order

```
P0 (run foundation) → P1 (model) → P2 (dict) → P3 (ingest) → P4 (parsers) → P5 (normalize)
                                                                  ├→ P6 (validate/history)
                                                                  ├→ P7 (verify + self-learn)
                                                                  └→ P8 (search/API/stats)
```

Demo-minimum: **P0→P5 + P8** (upload archive → normalized → search "who & how much").
P6/P7/P8-stats add the validation/UX/report points.

## Definition of Done (per phase)
- Code in the right layer per `CLAUDE.md`; DI registered; migration applied if models changed.
- Tests green; `.env.example` updated if new config; endpoints visible in `/docs`.
