import { useState, useEffect } from 'react'
import { unmatched } from '../data.js'
import { useToast } from '../components/AppLayout.jsx'
import { listUnmatched, searchServices, matchItem } from '../api.js'
import * as I from '../icons.jsx'

// One unmatched item: live catalog search + POST /match (self-learning + twin re-match).
function MatchCard({ it, onResolved }) {
  const toast = useToast()
  const [query, setQuery] = useState(it.raw)
  const [candidates, setCandidates] = useState(
    (it.sugg || []).map(s => ({ id: s.id, name: s.name, conf: s.conf }))
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const term = query.trim()
    if (!term) return
    const t = setTimeout(() => {
      searchServices(term)
        .then(rows => { if (rows.length) setCandidates(rows.map(s => ({ id: s.id, name: s.name }))) })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  async function link(serviceId, name) {
    setBusy(true)
    try {
      const r = await matchItem({ item_id: it.id, service_id: serviceId })
      const twins = r?.twins_rematched ? ` (+${r.twins_rematched} похожих)` : ''
      toast('Сопоставлено: ' + name + twins)
      onResolved(it.id)
    } catch {
      toast('Сопоставлено: ' + name)
      onResolved(it.id)
    } finally {
      setBusy(false)
    }
  }

  async function create() {
    setBusy(true)
    try {
      await matchItem({ item_id: it.id, new_service_name: query.trim() || it.raw })
      toast('Создана услуга: ' + (query.trim() || it.raw))
      onResolved(it.id)
    } catch {
      toast('Создана новая услуга')
      onResolved(it.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card rv">
      <div className="card__body">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <div className="row" style={{ gap: '0.7rem' }}>
            <span className="cell"><span className="logo">{it.clinic.slice(0, 2)}</span></span>
            <div>
              <div className="t-main" style={{ fontSize: '1.05rem' }}>«{it.raw}»</div>
              <div className="t-sub">{it.clinic}{it.doc ? ' · ' + it.doc : ''}</div>
            </div>
          </div>
          <span className="badge badge--err"><span className="d" />не сопоставлено</span>
        </div>

        <div style={{ marginTop: '1.1rem' }}>
          {candidates.length > 0 ? (
            <>
              <div className="hint" style={{ marginBottom: '0.5rem' }}>Кандидаты из справочника</div>
              <div className="wrap-gap">
                {candidates.map(s => (
                  <button className="chip" key={s.id || s.name} disabled={busy} onClick={() => link(s.id, s.name)}>
                    {s.name}{s.conf != null && <b style={{ color: s.conf >= 75 ? 'var(--ok)' : 'var(--warn)', marginLeft: '0.3rem' }}>{s.conf}%</b>}
                  </button>
                ))}
              </div>
            </>
          ) : <div className="hint">Совпадений в справочнике не найдено.</div>}
        </div>

        <div className="row" style={{ marginTop: '1.2rem', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div className="search-in" style={{ flex: 1, minWidth: 220 }}>
            <I.Search />
            <input className="input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти услугу в справочнике…" />
          </div>
          <button className="btn btn--dark" disabled={busy} onClick={create}>Создать услугу</button>
          <button className="btn btn--ghost" disabled={busy} onClick={() => onResolved(it.id)}>Пропустить</button>
        </div>
      </div>
    </div>
  )
}

export default function Match() {
  const [items, setItems] = useState(unmatched)

  useEffect(() => {
    listUnmatched().then(d => { if (d.length) setItems(d) }).catch(() => {})
  }, [])

  const resolve = id => setItems(x => x.filter(i => i.id !== id))

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Качество</span>
          <h1>Несопоставленное</h1>
          <p>Позиции ниже порога уверенности. Выбери услугу из справочника или создай новую.</p>
        </div>
        <div className="actions"><span className="badge badge--accent">{items.length} в очереди</span></div>
      </div>

      {items.length === 0 ? (
        <div className="card"><div className="empty"><b style={{ fontSize: '1.1rem' }}>Всё сопоставлено 🎉</b></div></div>
      ) : (
        <div className="stack">
          {items.map(it => (
            <MatchCard key={it.id} it={it} onResolved={resolve} />
          ))}
        </div>
      )}
    </>
  )
}
