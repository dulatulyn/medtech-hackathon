// Thin API client for the MedArchive backend.
// Calls go through the Vite proxy (/api -> backend); unwraps the {data:...} envelope.
// Every function returns page-ready shapes and is safe to call from useEffect.

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

const STATUS = { done: 'ok', needs_review: 'warn', processing: 'info', pending: 'pend', error: 'err' }
const FORMAT = { xlsx: 'XLSX', xls: 'XLS', pdf: 'PDF', scan_pdf: 'Скан', docx: 'DOCX' }

const fmt = (n) => (n == null ? '—' : Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' '))
const tariff = (tariffs, type) => tariffs?.find((t) => t.tariff_type === type)?.amount ?? null
const resident = (tariffs) => tariff(tariffs, 'resident') ?? tariffs?.[0]?.amount ?? null
const nonresident = (tariffs) => tariff(tariffs, 'far_abroad') ?? tariff(tariffs, 'cis') ?? null

let _partnerCache = null
async function partnerMap() {
  if (_partnerCache) return _partnerCache
  const d = await get('/partners?limit=500')
  _partnerCache = new Map((d.items || []).map((p) => [p.id, p]))
  return _partnerCache
}

// ---- public API ------------------------------------------------------------

export async function getStats() {
  return get('/admin/stats')
}

export async function listDocuments() {
  const d = await get('/admin/documents')
  const pmap = await partnerMap()
  return (d.documents || []).map((x) => {
    const p = pmap.get(x.partner_id)
    return {
      id: x.id,
      file: x.file_name,
      clinic: p?.name || '—',
      city: p?.city || '',
      format: FORMAT[x.file_format] || x.file_format,
      date: x.effective_date || '—',
      status: STATUS[x.parse_status] || 'info',
      parse_log: x.parse_log,
    }
  })
}

export async function listCatalog() {
  const d = await get('/services?limit=200')
  const services = d.items || []
  const enriched = await Promise.all(
    services.map(async (s) => {
      let partners = 0
      let min = null
      let max = null
      try {
        const rows = await get(`/services/${s.id}/price-compare`)
        partners = rows.length
        const vals = rows.map((r) => r.tariffs?.resident ?? Object.values(r.tariffs || {})[0]).filter((v) => v != null)
        if (vals.length) {
          min = Math.min(...vals)
          max = Math.max(...vals)
        }
      } catch {
        /* leave zeros */
      }
      return { id: s.id, name: s.name, cat: s.category || '—', syn: '', partners, min: fmt(min), max: fmt(max) }
    })
  )
  return enriched
}

export async function search(q) {
  const d = await get(`/search?q=${encodeURIComponent(q)}&limit=50`)
  const pmap = await partnerMap()
  const rows = (d.items || []).map((it) => {
    const p = pmap.get(it.partner_id)
    return {
      clinic: p?.name || '—',
      city: p?.city || '',
      res: fmt(resident(it.tariffs)),
      nonres: fmt(nonresident(it.tariffs)),
      resNum: resident(it.tariffs),
      flag: it.is_anomaly,
      raw: it.service_name_raw,
    }
  })
  const nums = rows.map((r) => r.resNum).filter((v) => v != null).sort((a, b) => a - b)
  if (nums.length) {
    const best = nums[0]
    rows.forEach((r) => { r.best = r.resNum === best })
  }
  const median = nums.length ? nums[Math.floor(nums.length / 2)] : null
  return { query: d.query, rows, stats: { best: fmt(nums[0]), median: fmt(median), max: fmt(nums[nums.length - 1]) } }
}

export async function listUnmatched() {
  const d = await get('/unmatched?limit=200')
  const pmap = await partnerMap()
  return (d.items || []).map((it) => ({
    id: it.item_id,
    raw: it.service_name_raw,
    clinic: pmap.get(it.partner_id)?.name || '—',
    res: fmt(resident(it.tariffs)),
  }))
}

export async function listServices() {
  const d = await get('/services?limit=200')
  return d.items || []
}

export async function searchServices(q) {
  const d = await get(`/services?q=${encodeURIComponent(q)}&limit=5`)
  return d.items || []
}

export async function listAnomalies() {
  const d = await get('/anomalies?limit=200')
  const pmap = await partnerMap()
  return (d.items || []).map((it) => {
    const p = pmap.get(it.partner_id)
    const reason = it.anomaly_reason || ''
    const pct = (reason.match(/(\d+)\s*%/) || [])[1]
    return {
      id: it.item_id,
      clinic: p?.name || '—',
      city: p?.city || '',
      service: it.service_name_raw,
      price: fmt(resident(it.tariffs)),
      median: '—',
      overpay: '—',
      deltaPct: pct ? Number(pct) : '',
      reason,
      type: /резидент/i.test(reason) ? 'Нерезидент < резидент'
        : /→/.test(reason) ? 'Скачок цены' : 'Выше медианы',
    }
  })
}

// Detail pages pick a representative entity (routes carry no id param yet).
export async function firstServiceDetail() {
  const svcs = await listServices()
  if (!svcs.length) return null
  const s = svcs[0]
  const [history, compare] = await Promise.all([
    get(`/services/${s.id}/price-history`).catch(() => []),
    get(`/services/${s.id}/price-compare`).catch(() => []),
  ])
  const pmap = await partnerMap()
  return {
    service: s,
    history: history.map((h) => ({ date: String(h.effective_date || '').slice(0, 4) || '—', price: resident(h.tariffs) })),
    rows: compare.map((r) => {
      const p = pmap.get(r.partner_id)
      const res = r.tariffs?.resident ?? Object.values(r.tariffs || {})[0]
      const non = r.tariffs?.far_abroad ?? r.tariffs?.cis
      return { clinic: p?.name || '—', city: p?.city || '', res: fmt(res), nonres: fmt(non), resNum: res, flag: r.is_anomaly }
    }),
  }
}

export async function firstClinicDetail() {
  const d = await get('/partners?limit=1')
  const p = (d.items || [])[0]
  if (!p) return null
  const svc = await get(`/partners/${p.id}/services`).catch(() => ({ items: [] }))
  return {
    partner: p,
    items: (svc.items || []).map((it) => ({
      service: it.service_name_raw,
      res: fmt(resident(it.tariffs)),
      nonres: fmt(nonresident(it.tariffs)),
      flag: it.is_anomaly,
      method: it.match_method,
    })),
  }
}

// Upload a ZIP archive, then run parse->normalize->validate for each created doc.
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
  return { documents: data.documents, results }
}

export async function matchItem(payload) {
  return post('/match', payload)
}
