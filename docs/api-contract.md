# API Contract — MedArchive backend

For the frontend dev wiring `src/data.js` → real API.

- **Base URL**: `http://localhost:8000` (FastAPI). All app endpoints under `/api/v1`.
- **CORS**: `*` origins allowed; credentials supported. Vite dev (`:4321`) can call directly.
- **Envelope**: every 2xx JSON body is wrapped: `{ "data": <payload> }`. Unwrap `.data` client-side.
  - Paginated lists return `{ "data": { "<items>": [...], "pagination": { page, pageSize, total<Items>, totalPages } } }`.
- **Errors**: `{ "status": "error", "code": <http>, "message": "..." }`. 404 for "not found", 400 for bad input, 422 for body validation.
- **Money**: `tariffs` is a list of `{ tariff_type, amount (float), currency }`. `tariff_type` ∈ resident / cis / far_abroad / insurance / with_vat / partner.

## Catalog / Services
| Method | Path | Query | `data` payload |
|---|---|---|---|
| GET | `/api/v1/services` | `q, category, limit, offset` | `{ items: [{id,name,category,icd_code,is_active}], total }` |
| GET | `/api/v1/services/{id}` | — | `{id,name,category,icd_code,is_active}` |
| GET | `/api/v1/services/{id}/partners` | — | `{service_id, partners:[{partner_id,effective_date,tariffs,is_anomaly,provenance}]}` |
| GET | `/api/v1/services/{id}/price-history` | `partner_id?` | `[{item_id,partner_id,effective_date,tariffs,is_active,is_anomaly,anomaly_reason,created_at}]` |
| GET | `/api/v1/services/{id}/price-compare` | — | `[{partner_id, tariffs:{type:amount}, effective_date, is_anomaly}]` |

## Partners (clinics)
| Method | Path | Query | `data` payload |
|---|---|---|---|
| GET | `/api/v1/partners` | `city, is_active, limit` | `{items:[{id,name,city,is_active,bin,contact_email,contact_phone}], total}` |
| GET | `/api/v1/partners/{id}` | — | `{id,name,city,is_active,bin,contact_email,contact_phone}` |
| GET | `/api/v1/partners/{id}/services` | — | `{partner_id, items:[{item_id,service_id,service_name_raw,effective_date,tariffs,is_anomaly,match_method,match_confidence}]}` |

## Search / Verify queue / Match (powers Search.jsx, Verify.jsx, Match.jsx)
| Method | Path | Query/Body | `data` payload |
|---|---|---|---|
| GET | `/api/v1/search` | `q (required), limit` | `{query, items:[{item_id,partner_id,service_name_raw,service_id,effective_date,tariffs,is_anomaly}], total}` |
| GET | `/api/v1/unmatched` | `limit, offset` | `{items:[{item_id,partner_id,service_name_raw,service_code_source,provenance,tariffs}], total, limit, offset}` |
| POST | `/api/v1/match` | body: `{item_id, service_id?, new_service_name?, new_service_category?, note?}` | `{item_id,service_id,method,synonyms_added,twins_rematched}` |

`POST /match` is self-learning: it adds the raw name as an operator synonym and auto-matches twin
items with the same raw text. Provide `service_id` to link an existing service, or `new_service_name`
to create one.

## Admin / pipeline (powers Upload.jsx, Documents.jsx, Dashboard.jsx)
| Method | Path | Body | `data` payload |
|---|---|---|---|
| POST | `/api/v1/admin/imports` | multipart `file=@archive.zip` | `{documents, doc_ids}` |
| GET | `/api/v1/admin/documents` | — | `{documents:[{id,partner_id,file_name,file_format,parse_status,effective_date,parse_log,created_at}]}` |
| POST | `/api/v1/admin/documents/{id}/parse` | — | `{doc_id, rows}` |
| POST | `/api/v1/admin/documents/{id}/normalize` | — | `{doc_id, matched, unmatched, auto_matched, needs_review}` |
| POST | `/api/v1/admin/documents/{id}/validate` | — | `{doc_id, checked, anomalies, archived, errors, warnings}` |
| POST | `/api/v1/admin/pipeline/{id}` | — | `{doc_id, rows, matched, unmatched, anomalies, archived}` |
| POST | `/api/v1/admin/parse-all` | — | `{processed, results}` |
| POST | `/api/v1/admin/normalize-all` | — | `{docs_processed, total_matched, total_unmatched}` |
| GET | `/api/v1/admin/stats` | — | `{total_documents, documents_by_status, total_items, items_matched, items_unmatched, match_rate_pct, anomalies, items_by_method, partners_active, services_count}` |

`parse_status` ∈ pending / processing / done / needs_review / error → maps to `data.js` statusLabel
(done→ok, needs_review→warn, processing→info, pending→pend, error→err).

## Anomalies page
No dedicated endpoint — anomalies surface as `is_anomaly: true` + `anomaly_reason` on price items
(via `/search`, `/services/{id}/price-history`, `/services/{id}/partners`). `admin/stats.anomalies`
gives the total count.

## Auth
Cookie-JWT via `/api/v1/auth/*` (register/login/refresh/logout). Public read endpoints above do not
require auth in the current build; admin write endpoints are open for the demo.
