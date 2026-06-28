import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { search as apiSearch } from '../api.js'
import * as I from '../icons.jsx'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || 'анализ крови')
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({ best: '—', median: '—', max: '—', saving: '—' })
  const [engine, setEngine] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const term = q.trim()
    if (!term) { setRows([]); setLoading(false); return }
    setLoading(true)
    const t = setTimeout(() => {
      apiSearch(term).then((r) => {
        setRows(r.rows); setStats(r.stats); setEngine(r.engine)
      }).catch(() => setRows([])).finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const onChange = (v) => { setQ(v); setParams(v.trim() ? { q: v } : {}, { replace: true }) }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Витрина</span>
          <h1>Поиск услуги</h1>
          <p>Кто оказывает услугу и по какой цене — резидент и нерезидент, со сравнением между клиниками.</p>
        </div>
        {engine && <div className="actions"><span className="badge badge--accent">{engine === 'meilisearch' ? 'Meilisearch · опечатки' : 'PostgreSQL trigram'}</span></div>}
      </div>

      <div className="card rv" style={{ marginBottom: '1.1rem' }}>
        <div className="card__body">
          <div className="search-in"><I.Search /><input className="input" value={q} onChange={(e) => onChange(e.target.value)} placeholder="Например: МРТ, анализ крови, УЗИ…" /></div>
        </div>
      </div>

      <div className="grid g-3">
        <div className="card span-2 rv">
          <div className="card__head"><h3>{q}</h3><span className="sub">{rows.length} клиник</span></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Клиника</th><th>Город</th><th className="num">Резидент</th><th className="num">Нерезидент</th><th></th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="5"><div className="empty">Поиск…</div></td></tr> :
                  rows.length === 0 ? <tr><td colSpan="5"><div className="empty">Ничего не найдено по запросу «{q}».</div></td></tr> :
                    rows.map((r, i) => (
                      <tr key={(r.clinic || '') + i} className={r.best ? 'row-best' : r.flag ? 'row-flag' : ''}>
                        <td><div className="cell"><span className="logo">{r.clinic.slice(0, 2)}</span><div><div className="t-main">{r.clinic}</div>{r.best && <div className="t-sub" style={{ color: 'var(--ok)' }}>лучшая цена</div>}{r.flag && <div className="t-sub" style={{ color: 'var(--accent)' }}>аномалия цены</div>}</div></div></td>
                        <td className="t-sub">{r.city}</td>
                        <td className="num price">{r.res}<i>₸</i></td>
                        <td className="num t-strike">{r.nonres}₸</td>
                        <td className="num"><span className="t-sub">{r.raw}</span></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="card rv">
            <div className="card__head"><h3>Сравнение</h3></div>
            <div className="card__body kv">
              <div className="kv-row"><span className="k">Лучшая цена</span><span className="v price" style={{ color: 'var(--ok)' }}>{stats.best}₸</span></div>
              <div className="kv-row"><span className="k">Медиана</span><span className="v price">{stats.median}₸</span></div>
              <div className="kv-row"><span className="k">Максимум</span><span className="v price">{stats.max}₸</span></div>
              <div className="kv-row"><span className="k">Разброс</span><span className="v price">{stats.saving}₸</span></div>
            </div>
          </div>
          {rows.length > 1 && stats.saving !== '—' && (
            <div className="card rv">
              <div className="card__body">
                <div className="t-main" style={{ marginBottom: '0.4rem' }}>Совет страховой</div>
                <p className="hint">Направление пациента в «{rows.find((r) => r.best)?.clinic}» вместо самого дорогого варианта экономит <b style={{ color: 'var(--ink)' }}>{stats.saving} ₸</b> на одной услуге.</p>
                <Link className="btn btn--accent btn--sm" to="/anomalies" style={{ marginTop: '0.9rem', width: '100%' }}>Где ещё переплата</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
