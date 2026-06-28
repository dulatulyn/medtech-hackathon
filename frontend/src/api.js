// API client for the MedArchive backend — every page renders from these live calls.
// Calls go through the Vite proxy (/api -> backend) and unwrap the {data:...} envelope.
// No mock data lives here; pages show loading/empty states until these resolve.

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

async function get(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error(`${r.status} ${path}`)
  const body = await r.json()
  return body && 'data' in body ? body.data : body
}

async function post(path, payload) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error(`${r.status} ${path}`)
  const body = await r.json()
  return body && 'data' in body ? body.data : body
}

// ---- mapping helpers -------------------------------------------------------

export const STATUS = { done: 'ok', needs_review: 'warn', processing: 'info', pending: 'pend', error: 'err' }
export const STATUS_LABEL = { ok: 'Готово', warn: 'На ревью', info: 'Обработка', pend: 'В очереди', err: 'Ошибка' }
const FORMAT = { xlsx: 'XLSX', xls: 'XLS', pdf: 'PDF', scan_pdf: 'Скан', docx: 'DOCX' }

export const fmt = (n) => (n == null ? '—' : Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' '))
const tariff = (tariffs, type) => tariffs?.find((t) => t.tariff_type === type)?.amount ?? null
const resident = (tariffs) => tariff(tariffs, 'resident') ?? tariffs?.[0]?.amount ?? null
const nonresident = (tariffs) => tariff(tariffs, 'far_abroad') ?? tariff(tariffs, 'cis') ?? null
// compare-shape tariffs are an object {resident: n, far_abroad: n}, not an array
const resObj = (t) => t?.resident ?? Object.values(t || {})[0] ?? null
const nonresObj = (t) => t?.far_abroad ?? t?.cis ?? null
const num = (s) => { const n = Number(String(s).replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : null }

let _partnerCache = null
export async function partnerMap() {
  if (_partnerCache) return _partnerCache
  const d = await get('/partners?limit=500')
  _partnerCache = new Map((d.items || []).map((p) => [p.id, p]))
  return _partnerCache
}
export function clearPartnerCache() { _partnerCache = null }

// ---- dashboard / stats -----------------------------------------------------

export async function getStats() {
  return get('/admin/stats')
}

// Donut + status-bar data derived purely from live stats.
export function deriveNormalization(stats) {
  const total = stats?.total_items || 0
  const by = stats?.items_by_method || {}
  const auto = ['code', 'exact', 'synonym', 'fuzzy', 'semantic'].reduce((s, k) => s + (by[k] || 0), 0)
  const manual = by.manual || 0
  const none = by.none || 0
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0)
  return { autoPct: pct(auto), manualPct: pct(manual), nonePct: pct(none), total }
}

export function deriveStatusBars(stats) {
  const by = stats?.documents_by_status || {}
  const order = ['done', 'needs_review', 'processing', 'pending', 'error']
  const label = { done: 'Готово', needs_review: 'Ревью', processing: 'Обраб.', pending: 'Очередь', error: 'Ошибка' }
  const entries = order.filter((k) => by[k]).map((k) => ({ key: k, label: label[k], n: by[k] }))
  const max = Math.max(1, ...entries.map((e) => e.n))
  return entries.map((e) => ({ ...e, h: Math.round((e.n / max) * 100) }))
}

// ---- documents -------------------------------------------------------------

function mapDocSummary(x, pmap) {
  const p = pmap.get(x.partner_id)
  return {
    id: x.id,
    file: x.file_name,
    clinic: p?.name || '—',
    city: p?.city || '',
    partner_id: x.partner_id,
    format: FORMAT[x.file_format] || x.file_format,
    rawFormat: x.file_format,
    date: x.effective_date || '—',
    status: STATUS[x.parse_status] || 'info',
    rawStatus: x.parse_status,
    parse_log: x.parse_log,
  }
}

export async function listDocuments() {
  const [d, pmap] = await Promise.all([get('/admin/documents'), partnerMap()])
  return (d.documents || []).map((x) => mapDocSummary(x, pmap))
}

export async function getDocumentDetail(id) {
  const [d, pmap] = await Promise.all([get(`/admin/documents/${id}`), partnerMap()])
  const p = pmap.get(d.partner_id)
  return {
    id: d.id,
    file: d.file_name,
    clinic: p?.name || '—',
    city: p?.city || '',
    format: FORMAT[d.file_format] || d.file_format,
    rawFormat: d.file_format,
    status: STATUS[d.parse_status] || 'info',
    date: d.effective_date || '—',
    parse_log: d.parse_log,
    itemCount: d.item_count,
    rows: (d.items || []).map((it) => ({
      raw: it.service_name_raw,
      service: it.service_name,
      res: fmt(resident(it.tariffs)),
      nonres: fmt(nonresident(it.tariffs)),
      method: it.match_method,
      conf: it.match_confidence,
      flag: it.is_anomaly,
      match: it.service_id ? (it.match_method === 'manual' ? 'ok' : 'ok') : 'err',
      matchLabel: it.service_name || (it.service_id ? 'сопоставлено' : 'не сопоставлено'),
    })),
  }
}

// ---- catalog / services ----------------------------------------------------

export async function listCatalog() {
  const d = await get('/services?limit=200')
  const services = d.items || []
  return Promise.all(
    services.map(async (s) => {
      let partners = 0, min = null, max = null
      try {
        const rows = await get(`/services/${s.id}/price-compare`)
        partners = rows.length
        const vals = rows.map((r) => resObj(r.tariffs)).filter((v) => v != null)
        if (vals.length) { min = Math.min(...vals); max = Math.max(...vals) }
      } catch { /* leave zeros */ }
      return {
        id: s.id, name: s.name, cat: s.category || '—',
        syn: (s.synonyms || []).join(', '), partners, min: fmt(min), max: fmt(max),
      }
    })
  )
}

export async function listServices() {
  const d = await get('/services?limit=200')
  return d.items || []
}

export async function searchServices(q) {
  const d = await get(`/services?q=${encodeURIComponent(q)}&limit=5`)
  return d.items || []
}

// Full service detail by id: partners + prices, metrics, yearly history.
export async function getServiceDetail(id) {
  const [svc, compare, history, pmap] = await Promise.all([
    get(`/services/${id}`),
    get(`/services/${id}/price-compare`).catch(() => []),
    get(`/services/${id}/price-history`).catch(() => []),
    partnerMap(),
  ])
  const rows = compare.map((r) => {
    const p = pmap.get(r.partner_id)
    const res = resObj(r.tariffs)
    return { clinic: p?.name || '—', city: p?.city || '', res: fmt(res), nonres: fmt(nonresObj(r.tariffs)), resNum: res, flag: r.is_anomaly }
  })
  const vals = rows.map((r) => r.resNum).filter((v) => v != null).sort((a, b) => a - b)
  const best = vals[0] ?? null
  rows.forEach((r) => { r.best = r.resNum != null && r.resNum === best })
  const median = vals.length ? vals[Math.floor(vals.length / 2)] : null
  // history: median resident price per year (across partners), oldest → newest
  const byYear = new Map()
  history.forEach((h) => {
    const yr = String(h.effective_date || h.created_at || '').slice(0, 4)
    const price = resident(h.tariffs)
    if (yr && price != null) { if (!byYear.has(yr)) byYear.set(yr, []); byYear.get(yr).push(price) }
  })
  const hist = [...byYear.entries()].sort().map(([date, vals]) => {
    const s = vals.sort((a, b) => a - b)
    return { date, price: s[Math.floor(s.length / 2)] }
  })
  return {
    service: svc,
    metrics: { best, median, max: vals[vals.length - 1] ?? null, partners: rows.length },
    rows,
    history: hist,
  }
}

// ---- partners / clinics ----------------------------------------------------

export async function listPartners() {
  const d = await get('/partners?limit=500')
  return d.items || []
}

export async function getClinicDetail(id) {
  const [p, svc, docs] = await Promise.all([
    get(`/partners/${id}`),
    get(`/partners/${id}/services`).catch(() => ({ items: [] })),
    listDocuments().catch(() => []),
  ])
  return {
    partner: p,
    items: (svc.items || []).map((it) => ({
      service: it.service_name_raw,
      service_id: it.service_id,
      res: fmt(resident(it.tariffs)),
      nonres: fmt(nonresident(it.tariffs)),
      flag: it.is_anomaly,
      method: it.match_method,
    })),
    documents: docs.filter((d) => d.partner_id === id),
  }
}

// ---- search ----------------------------------------------------------------

export async function search(q) {
  let rows = null
  try {
    const m = await get(`/search/full?q=${encodeURIComponent(q)}&limit=50`)
    rows = (m.items || []).map((h) => ({
      clinic: h.partner_name || '—', city: h.city || '',
      res: fmt(h.resident_price), nonres: fmt(h.nonresident_price), resNum: h.resident_price,
      flag: h.is_anomaly, raw: h.service_name_raw, engine: 'meilisearch',
    }))
  } catch { rows = null }
  if (!rows) {
    const [d, pmap] = await Promise.all([get(`/search?q=${encodeURIComponent(q)}&limit=50`), partnerMap()])
    rows = (d.items || []).map((it) => {
      const p = pmap.get(it.partner_id)
      return {
        clinic: p?.name || '—', city: p?.city || '',
        res: fmt(resident(it.tariffs)), nonres: fmt(nonresident(it.tariffs)), resNum: resident(it.tariffs),
        flag: it.is_anomaly, raw: it.service_name_raw, engine: 'pg_trgm',
      }
    })
  }
  const nums = rows.map((r) => r.resNum).filter((v) => v != null).sort((a, b) => a - b)
  const best = nums[0] ?? null
  rows.forEach((r) => { r.best = r.resNum != null && r.resNum === best })
  const median = nums.length ? nums[Math.floor(nums.length / 2)] : null
  const saving = nums.length > 1 ? nums[nums.length - 1] - nums[0] : null
  return {
    query: q, engine: rows[0]?.engine || 'pg_trgm', rows,
    stats: { best: fmt(best), median: fmt(median), max: fmt(nums[nums.length - 1]), bestNum: best, maxNum: nums[nums.length - 1], saving: fmt(saving) },
  }
}

export async function semanticSearch(q) {
  const d = await get(`/search/semantic?q=${encodeURIComponent(q)}&limit=10`)
  return (d.results || []).map((r) => ({ id: r.service_id, name: r.name, category: r.category, similarity: r.similarity }))
}

// ---- verification queue ----------------------------------------------------

export async function listUnmatched() {
  const [d, pmap] = await Promise.all([get('/unmatched?limit=200'), partnerMap()])
  return (d.items || []).map((it) => ({
    id: it.item_id,
    raw: it.service_name_raw,
    clinic: pmap.get(it.partner_id)?.name || '—',
    res: fmt(resident(it.tariffs)),
    nonres: fmt(nonresident(it.tariffs)),
  }))
}

export async function matchItem(payload) {
  return post('/match', payload)
}

// ---- anomalies -------------------------------------------------------------

const ANOMALY_TYPE = (reason) =>
  /резидент/i.test(reason) ? 'Нерезидент < резидент' : /→/.test(reason) ? 'Скачок цены' : 'Выше медианы'

export async function listAnomalies() {
  const [d, pmap] = await Promise.all([get('/anomalies?limit=200'), partnerMap()])
  return (d.items || []).map((it) => {
    const p = pmap.get(it.partner_id)
    const reason = it.anomaly_reason || ''
    const pct = (reason.match(/(\d+)\s*%/) || [])[1]
    const jump = reason.match(/([\d\s.,]+)\s*→\s*([\d\s.,]+)/)
    const oldP = jump ? num(jump[1]) : null
    const newP = jump ? num(jump[2]) : null
    const overpay = oldP != null && newP != null ? Math.abs(newP - oldP) : null
    return {
      id: it.item_id,
      clinic: p?.name || '—', city: p?.city || '',
      service: it.service_name_raw,
      price: fmt(resident(it.tariffs)),
      priceNum: resident(it.tariffs),
      prev: fmt(oldP),
      overpay: fmt(overpay),
      overpayNum: overpay,
      deltaPct: pct ? Number(pct) : null,
      reason,
      type: ANOMALY_TYPE(reason),
    }
  })
}

// ---- upload ----------------------------------------------------------------

export async function uploadArchive(file) {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(`${BASE}/admin/imports`, { method: 'POST', body: fd })
  if (!r.ok) throw new Error(`${r.status} import`)
  const body = await r.json()
  const data = body && 'data' in body ? body.data : body
  const results = []
  for (const id of data.doc_ids || []) {
    try { results.push(await post(`/admin/pipeline/${id}`)) } catch { /* skip */ }
  }
  try { await post('/admin/reindex') } catch { /* meili optional */ }
  clearPartnerCache()
  return { documents: data.documents, results }
}
