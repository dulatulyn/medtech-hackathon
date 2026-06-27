import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { searchRows } from '../data.js'
import { search as apiSearch } from '../api.js'
import * as I from '../icons.jsx'

const FALLBACK_STATS = { best: '18 900', median: '24 500', max: '31 200' }

export default function SearchPage() {
  const [q, setQ] = useState('анализ крови')
  const [rows, setRows] = useState(searchRows)
  const [stats, setStats] = useState(FALLBACK_STATS)

  useEffect(() => {
    const term = q.trim()
    if (!term) return
    const t = setTimeout(() => {
      apiSearch(term).then(r => {
        if (r.rows.length) { setRows(r.rows); setStats(r.stats) }
      }).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Витрина</span>
          <h1>Поиск услуги</h1>
          <p>Кто оказывает услугу и по какой цене — резидент и нерезидент, с сравнением между клиниками.</p>
        </div>
      </div>

      <div className="card rv" style={{ marginBottom: '1.1rem' }}>
        <div className="card__body">
          <div className="search-in"><I.Search /><input className="input" value={q} onChange={e => setQ(e.target.value)} /></div>
          <div className="chips" style={{ marginTop: '0.8rem' }} data-chips>
            <button className="chip on">Все города</button>
            <button className="chip">Алматы</button>
            <button className="chip">Астана</button>
            <button className="chip">Шымкент</button>
          </div>
        </div>
      </div>

      <div className="grid g-3">
        <div className="card span-2 rv">
          <div className="card__head"><h3>{q}</h3><span className="sub">{rows.length} клиник</span><div className="actions"><Link className="btn btn--ghost btn--sm" to="/service">История цен</Link></div></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Клиника</th><th>Город</th><th className="num">Резидент</th><th className="num">Нерезидент</th><th></th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={(r.clinic || '') + i} className={r.best ? 'row-best' : (r.flag || r.flagPct) ? 'row-flag' : ''}>
                    <td><div className="cell"><span className="logo">{r.clinic.slice(0, 2)}</span><div><div className="t-main">{r.clinic}</div>{r.best && <div className="t-sub" style={{ color: 'var(--ok)' }}>лучшая цена</div>}{(r.flag || r.flagPct) && <div className="t-sub" style={{ color: 'var(--accent)' }}>{r.flagPct ? `+${r.flagPct}% к медиане` : 'аномалия цены'}</div>}</div></div></td>
                    <td className="t-sub">{r.city}</td>
                    <td className="num price">{r.res}<i>₸</i></td>
                    <td className="num t-strike">{r.nonres}₸</td>
                    <td className="num"><Link className="btn btn--ghost btn--sm" to="/clinic">К клинике</Link></td>
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
              <div className="kv-row"><span className="k">Разброс</span><span className="v">по рынку</span></div>
            </div>
          </div>
          <div className="card rv">
            <div className="card__body">
              <div className="t-main" style={{ marginBottom: '0.4rem' }}>Совет страховой</div>
              <p className="hint">Направление пациента в «Сункар» вместо «Арман» экономит <b style={{ color: 'var(--ink)' }}>12 300 ₸</b> на одной услуге.</p>
              <Link className="btn btn--accent btn--sm" to="/anomalies" style={{ marginTop: '0.9rem', width: '100%' }}>Где ещё переплата</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
