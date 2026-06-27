import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { searchRows } from '../data.js'
import { search as apiSearch } from '../api.js'
import { Skeleton, SkeletonRows } from '../components/Skeleton.jsx'
import * as I from '../icons.jsx'

const FALLBACK_STATS = { best: '18 900', median: '24 500', max: '31 200' }

// presentational helpers only
const toNum = (s) => Number(String(s).replace(/\s/g, '')) || 0
const fmtSum = (n) => n.toLocaleString('ru-RU')

export default function SearchPage() {
  const [q, setQ] = useState('анализ крови')
  const [rows, setRows] = useState(searchRows)
  const [stats, setStats] = useState(FALLBACK_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const term = q.trim()
    if (!term) return
    const t = setTimeout(() => {
      apiSearch(term).then(r => {
        if (r.rows.length) { setRows(r.rows); setStats(r.stats) }
      }).catch(() => {}).finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const bestN = toNum(stats.best)
  const medN = toNum(stats.median)
  const maxN = toNum(stats.max)
  const spread = Math.max(0, maxN - bestN)
  const flagged = rows.filter(r => r.flag || r.flagPct).length

  return (
    <>
      <div className="phero">
        <div className="phero__head">
          <span className="phero__eyebrow">Витрина</span>
          <h1 className="phero__title">Поиск услуги</h1>
          <p className="phero__sub">Цены по клиникам — резидент и нерезидент.</p>
        </div>
        <div className="phero__metrics">
          {loading ? (
            <>
              <div className="phero__metric"><Skeleton w="2.6rem" h="2.4rem" r="12px" /><span>клиник</span></div>
              <div className="phero__metric"><Skeleton w="6rem" h="2.4rem" r="12px" /><span>лучшая цена</span></div>
              <div className="phero__metric"><Skeleton w="6rem" h="2.4rem" r="12px" /><span>разброс</span></div>
            </>
          ) : (
            <>
              <div className="phero__metric"><b className="num">{rows.length}</b><span>клиник</span></div>
              <div className="phero__metric"><b className="num">{stats.best}<small>₸</small></b><span>лучшая цена</span></div>
              <div className="phero__metric"><b className="num">{fmtSum(spread)}<small>₸</small></b><span>разброс</span></div>
            </>
          )}
        </div>
      </div>

      <div className="card rv" style={{ marginBottom: '1.2rem' }}>
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
          <div className="card__head"><h3>{q}</h3>{loading ? <Skeleton w={140} h="0.82rem" r="999px" /> : <span className="sub">{rows.length} клиник · {flagged} аномалий</span>}<div className="actions"><Link className="btn btn--ghost btn--sm" to="/service">История цен</Link></div></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Клиника</th><th>Город</th><th className="num">Резидент</th><th className="num">Нерезидент</th><th></th></tr></thead>
              <tbody>
                {loading ? <SkeletonRows n={6} cols={5} /> : rows.map((r, i) => (
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
            <div className="card__body">
              {loading ? (
                <>
                  <div className="bars" style={{ height: '124px', marginBottom: '1rem' }}>
                    <div className="b"><Skeleton w={36} h="52%" r="7px 7px 0 0" /></div>
                    <div className="b"><Skeleton w={36} h="76%" r="7px 7px 0 0" /></div>
                    <div className="b"><Skeleton w={36} h="100%" r="7px 7px 0 0" /></div>
                  </div>
                  <div className="kv">
                    <div className="kv-row"><Skeleton w="42%" h="0.78rem" r="999px" /><Skeleton w="28%" h="0.78rem" r="999px" /></div>
                    <div className="kv-row"><Skeleton w="38%" h="0.78rem" r="999px" /><Skeleton w="30%" h="0.78rem" r="999px" /></div>
                    <div className="kv-row"><Skeleton w="40%" h="0.78rem" r="999px" /><Skeleton w="26%" h="0.78rem" r="999px" /></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bars" style={{ height: '124px', marginBottom: '1rem' }}>
                    <div className="b on"><i style={{ height: `${maxN ? Math.round(bestN / maxN * 100) : 0}%` }} /><span>мин</span></div>
                    <div className="b"><i style={{ height: `${maxN ? Math.round(medN / maxN * 100) : 0}%` }} /><span>медиана</span></div>
                    <div className="b"><i style={{ height: '100%' }} /><span>макс</span></div>
                  </div>
                  <div className="kv">
                    <div className="kv-row"><span className="k">Лучшая цена</span><span className="v price" style={{ color: 'var(--ok)' }}>{stats.best}<i>₸</i></span></div>
                    <div className="kv-row"><span className="k">Медиана</span><span className="v price">{stats.median}<i>₸</i></span></div>
                    <div className="kv-row"><span className="k">Максимум</span><span className="v price">{stats.max}<i>₸</i></span></div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="card rv">
            <div className="card__body">
              <div className="t-main" style={{ marginBottom: '0.4rem' }}>Совет страховой</div>
              {loading ? (
                <>
                  <Skeleton w="100%" h="0.82rem" r="999px" style={{ marginBottom: '0.5rem' }} />
                  <Skeleton w="70%" h="0.82rem" r="999px" />
                  <Skeleton w="100%" h="2.2rem" r="12px" style={{ marginTop: '0.9rem' }} />
                </>
              ) : (
                <>
                  <p className="hint">«Сункар» вместо «Арман» — экономия <b style={{ color: 'var(--ink)' }}>12 300 ₸</b> на услуге.</p>
                  <Link className="btn btn--accent btn--sm" to="/anomalies" style={{ marginTop: '0.9rem', width: '100%' }}>Где ещё переплата</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
