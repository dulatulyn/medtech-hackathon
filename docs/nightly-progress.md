# Nightly Progress — 2026-06-27

## Status: P0–P8 complete + verified live (2026-06-28)

---

## What's done

### P0 Foundation (pre-existing)
- FastAPI + Dishka DI + ULID PKs + cookie-JWT auth
- Structured logging, health/readiness endpoints
- Async SQLAlchemy 2.0 + Alembic, exception handlers, response wrapper

### P1 Domain Model (pre-existing)
- `Service`, `ServiceSynonym` (catalog + self-learning synonyms)
- `Partner` (clinic)
- `PriceDocument`, `PriceItem`, `PriceTariff` (flexible multi-tariff model)
- Enums: `FileFormat`, `ParseStatus`, `MatchMethod`, `TariffType`, `Currency`, `SynonymSource`
- Migration `0002_domain`: pg_trgm + pgvector extensions, GIN + HNSW indexes
- Migration `0003_anomaly`: `is_anomaly` + `anomaly_reason` columns on `price_items`

### P2 Dictionary Loader (pre-existing)
- `CatalogService.load_dictionary()` — idempotent upsert (JSON/XLSX)
- CLI: `python -m src.cli load-dict <path>`

### P3 Archive Ingestion (pre-existing)
- `ImportService.import_archive()` — unzip, detect format, guess partner/date, store, create docs
- `LocalStorage` (filesystem) + `NoOpQueue` for infra-light local mode
- CLI: `python -m src.cli import <zip>`
- API: `POST /api/v1/admin/imports`, `GET /api/v1/admin/documents`

### P4 Parsers (pre-existing + refined)
- Excel (openpyxl + xlrd), DOCX (python-docx), PDF text + geometry
- `pdf_geometry`: borderless table reconstruction via word-position clustering
- `columns.resolve_header`: two-row header merge + tariff-keyword detection
- **Coverage**: 8/10 files extract well (Клиника 1,2,3,4,6,7,8 xlsx + some PDFs)
- Клиника 5 (scrambled OCR layer) → routes through OcrProvider, falls back to `needs_review`

### P4b OcrProvider seam (this session)
- `src/integrations/ocr.py` — `OcrProvider` Protocol + `NoOpOcrProvider` (infra-light) + `AzureOcrProvider` stub
- Config `OCR_AZURE_ENDPOINT` / `OCR_AZURE_KEY`; DI-wired at APP scope (`InfraProvider.get_ocr`)
- `ParseService._try_ocr`: text-less scans route through OCR when configured; else `needs_review`
  with explanatory `parse_log` (`needs_ocr` / `ocr_unavailable` / `ocr_text_extracted`)
- CLI `_build_ocr()` mirrors container selection
- **6 OCR unit tests — all green**; Azure HTTP call is the documented next step

### P5 Normalization (this session)
- `src/normalization/cascade.py` — 4-step cascade: code → exact → synonym → fuzzy (pg_trgm)
- Step 5 semantic stub (returns None, logs `needs_semantic`)
- `NormalizationService.normalize_document(doc_id)` — runs cascade on all unmatched items
- `normalize_name()`: lowercase + strip punctuation + collapse whitespace (Cyrillic-safe)
- CLI: `python -m src.cli normalize`, `normalize-doc <id>`
- API: `POST /api/v1/admin/documents/{doc_id}/normalize`
- **9 cascade unit tests — all green**

### P6 Validation / History / Anomalies (this session)
- `ValidationService.validate_document(doc_id)` — after normalization, for each matched item:
  - Check tariff amounts > 0
  - Archive previous active item for same partner+service (soft delete via `is_active=False`, `superseded_by`)
  - Flag price change >50% as anomaly (`is_anomaly=True`, `anomaly_reason`)
- Price history preserved — no data deleted (idempotent reprocessing safe)
- CLI: `python -m src.cli validate-doc <id>`
- API: `POST /api/v1/admin/documents/{doc_id}/validate`
- **5 validation unit tests — all green**

### P7 Verification / Self-Learning (this session)
- `POST /api/v1/match` — operator confirms a match:
  - Links item to service (`match_method=manual`, `is_verified=True`)
  - Adds `service_name_raw` as `ServiceSynonym(source="operator")` — self-learning
  - Auto-rematches all unmatched twins with same raw name (`synonym` method, 0.95 confidence)
- `GET /api/v1/unmatched` — paginated queue of items without `service_id`

### P8 Search / API / Stats (this session)

#### Services
- `GET /api/v1/services?q=&category=&limit=&offset=` — catalog with pg_trgm search
- `GET /api/v1/services/{id}` — single service
- `GET /api/v1/services/{id}/partners` — all partners offering this service with current prices
- `GET /api/v1/services/{id}/price-history?partner_id=` — full price history (active + archived)
- `GET /api/v1/services/{id}/price-compare` — cross-partner price comparison

#### Partners
- `GET /api/v1/partners?city=&is_active=` — list clinics
- `GET /api/v1/partners/{id}` — single partner
- `GET /api/v1/partners/{id}/services` — all active services for a partner

#### Catalog / Verification
- `GET /api/v1/search?q=&limit=` — trigram search across all active price items
- `GET /api/v1/unmatched?limit=&offset=` — verification queue
- `POST /api/v1/match` — manual link + self-learning

#### Admin
- `GET /api/v1/admin/stats` — live quality report: docs by status, match %, anomalies, per-method breakdown
- `POST /api/v1/admin/documents/{id}/parse` — parse one document
- `POST /api/v1/admin/documents/{id}/normalize` — normalize one document
- `POST /api/v1/admin/documents/{id}/validate` — validate one document
- `POST /api/v1/admin/pipeline/{id}` — run full parse→normalize→validate pipeline
- `POST /api/v1/admin/parse-all` — parse all pending documents

---

## Test Summary
- **45 tests, all green** — verified end-to-end against a pgvector Postgres
  - 38 pure unit (parsers, normalization cascade, validation, OCR seam) — no DB
  - 7 DB-connected (auth flow, catalog, domain round-trip, import, parse→persist)
- Run DB tests: `DB_HOST=localhost DB_PORT=<pg> DB_USER=.. DB_PASSWORD=.. DB_NAME=.. SECRET_KEY=x uv run pytest`
  (needs a Postgres with `pg_trgm` + `vector`; conftest provisions `<name>_test` automatically)

### Fixes (this session)
- `create_app()` now registers all routers via `_register_routes()` — previously the factory
  returned a routeless app, so the test client (and any factory caller) 404'd on every endpoint.

---

## Frontend integration (this session) — LIVE
- Frontend dev pushed React UI (`frontend/`, commit `6f72b63`). Now wired to the backend.
- `frontend/vite.config.js`: proxy `/api → :8010` (`VITE_API_TARGET` override).
- `frontend/src/api.js`: fetch client, unwraps `{data}`, maps backend → page shapes.
- Wired pages (live data + mock fallback so UI never breaks):
  - **Dashboard** → `/admin/stats` + `/admin/documents`
  - **Catalog** → `/services` + `/services/{id}/price-compare` (partners/min/max)
  - **Search** → `/search` (debounced) + comparison stats
  - **Documents** → `/admin/documents`
  - **Match** → `/unmatched` + live candidate search + `POST /match` (self-learning + twin re-match)
- `src/seed.py` + `python -m src.cli seed`: demo data (8 clinics, 8 services, 52 matched items,
  6 anomalies, 4 unmatched) so every read endpoint returns content.
- **Verified end-to-end**: vite :4321 → proxy → backend :8010 → pgvector Postgres. `POST /match`
  confirmed to create a service and add an operator synonym (`synonyms_added=1`) through the proxy.
- Run guide: README → "Демо: связанный стек". Contract: `docs/api-contract.md`.
- Not yet wired (mock still): Anomalies, Verify, Service/Clinic detail, Upload — straightforward
  next steps using the same `api.js` pattern (backend endpoints already exist).

---

## Differentiators Delivered

| Differentiator | Status |
|---|---|
| Flexible multi-tariff model (resident/CIS/far_abroad/insurance/with_vat/partner) | ✅ |
| Provenance for every extracted price (sheet, row, bbox, raw_text JSON) | ✅ |
| Self-learning normalization (operator synonyms → auto-match twins) | ✅ |
| Price history and anomaly detection (>50% change flagged) | ✅ |
| Inter-clinic price comparison (`/services/{id}/price-compare`) | ✅ |
| Bulk verification queue (GET /unmatched + POST /match) | ✅ |
| Idempotent reprocessing + lineage (superseded_by, is_active versioning) | ✅ |
| Infra-light local mode (LocalStorage + NoOpQueue, zero extra services) | ✅ |

---

## Update 2026-06-28 — gaps closed + live end-to-end verification

**Now built & verified live (against running Postgres + Meili):**
- **OCR** — Azure Document Intelligence (`prebuilt-read`) live; real Cyrillic scan → rows.
- **Semantic search** — local e5 embeddings + pgvector; `POST /admin/embed` (8 services, ~16s),
  `/search/semantic?q=мозг` → «МРТ головного мозга» similarity 0.844. Cascade step 5 wired.
- **Meilisearch** — `POST /admin/reindex` (56 docs); `/search/full` typo-tolerant
  («аналз крови» → «Общий анализ крови»). Frontend prefers Meili, falls back to pg_trgm.
- **Currency conversion (ТЗ 4.4)** — `StaticFxConverter` (pluggable to NB RK); `detect_currency`
  in cleaning; `ParseService._persist_tariff` converts non-KZT → KZT keeping `original_amount`.
- **Frontend ↔ backend** — all 11 pages live through the Vite proxy; verified browser→proxy→
  backend→DB returns real data (stats 94.6% match, services/partners/search/anomalies all live).
  `POST /match` write path confirmed (self-learning synonym added, rate rose 92.9%→94.6%).

**Tests: 60 green** (52 pure-unit incl. 6 new FX/currency + 8 DB-connected: auth/catalog/domain/import/parse).

**Remaining minor gaps (non-blocking):**
| Item | Notes |
|---|---|
| Клиника 5 OCR | Scrambled scan text layer; routes to OCR, else `needs_review` |
| Клиника 8 second sheet ("востребованные") | Minor parser gap — low priority |
| NL search (LLM text-to-filter) | Optional, not built |
| Live FX rate feed | Static rate table; NB RK per-date feed is the drop-in seam |

---

## How to run a full demo pipeline

```bash
# From backend/
DB_USER=... DB_PASSWORD=... DB_NAME=medarchive SECRET_KEY=... uv run uvicorn src.main:app --reload

# In another terminal:
uv run python -m src.cli load-dict /path/to/dictionary.xlsx
uv run python -m src.cli import /path/to/Хакатон.zip
uv run python -m src.cli parse
uv run python -m src.cli normalize

# Or via API:
curl -X POST http://localhost:8000/api/v1/admin/imports -F file=@Хакатон.zip
curl -X POST http://localhost:8000/api/v1/admin/parse-all
# Then for each doc_id from /admin/documents:
curl -X POST http://localhost:8000/api/v1/admin/pipeline/{doc_id}

# Check stats:
curl http://localhost:8000/api/v1/admin/stats

# Search:
curl "http://localhost:8000/api/v1/search?q=анализ+крови"
```
