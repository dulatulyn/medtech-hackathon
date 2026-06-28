import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getServiceDetail, listServices, fmt } from '../api.js'

export default function Service() {
  const { id } = useParams()
  const [detail, setDetail] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      let sid = id
      if (!sid) {
        const svcs = await listServices().catch(() => [])
        sid = svcs[0]?.id
      }
      if (!sid) { setMissing(true); return }
      const d = await getServiceDetail(sid).catch(() => null)
      if (!cancelled) { if (d) setDetail(d); else setMissing(true) }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (missing) return <div className="card"><div className="empty">Услуга не найдена.</div></div>
  if (!detail) return <div className="card"><div className="empty">Загрузка…</div></div>

  const { service, metrics, rows, history } = detail
  const max = Math.max(...history.map((p) => p.price || 0), 1)
  const best = rows.find((r) => r.best)

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Витрина · услуга</span>
          <h1>{service.name}</h1>
          <p>Категория: {service.category || '—'}.{service.synonyms?.length ? ` Синонимы: ${service.synonyms.join(', ')}.` : ''}</p>
        </div>
        <div className="actions"><Link className="btn btn--outline" to="/search">К поиску</Link></div>
      </div>

      <div className="grid g-4" style={{ marginBottom: '1.1rem' }}>
        <div className="metric rv"><div className="metric__top">Лучшая цена</div><div className="metric__val num" style={{ color: 'var(--ok)' }}>{fmt(metrics.best)}<small>₸</small></div><div className="metric__foot">{best ? `${best.clinic} · ${best.city}` : '—'}</div></div>
        <div className="metric rv"><div className="metric__top">Медиана</div><div className="metric__val num">{fmt(metrics.median)}<small>₸</small></div><div className="metric__foot">по {metrics.partners} клиникам</div></div>
        <div className="metric rv"><div className="metric__top">Максимум</div><div className="metric__val num">{fmt(metrics.max)}<small>₸</small></div><div className="metric__foot">{metrics.best && metrics.max ? <span className="delta delta--down">+{Math.round((metrics.max / metrics.best - 1) * 100)}%</span> : '—'}</div></div>
        <div className="metric rv"><div className="metric__top">Партнёров</div><div className="metric__val num">{metrics.partners}</div><div className="metric__foot">оказывают услугу</div></div>
      </div>

      <div className="grid g-3">
        <div className="card span-2 rv">
          <div className="card__head"><h3>Клиники с этой услугой</h3></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Клиника</th><th>Город</th><th className="num">Резидент</th><th className="num">Нерезидент</th></tr></thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan="4"><div className="empty">Нет клиник с этой услугой.</div></td></tr> :
                  rows.map((r, i) => (
                    <tr key={(r.clinic || '') + i} className={r.best ? 'row-best' : r.flag ? 'row-flag' : ''}>
                      <td><div className="cell"><span className="logo">{r.clinic.slice(0, 2)}</span><span className="t-main">{r.clinic}</span></div></td>
                      <td className="t-sub">{r.city}</td>
                      <td className="num price">{r.res}<i>₸</i></td>
                      <td className="num t-strike">{r.nonres}₸</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card rv">
          <div className="card__head"><h3>История цены</h3><span className="sub">медиана по годам</span></div>
          <div className="card__body">
            {history.length === 0 ? <div className="empty">Одна версия прайса — истории пока нет.</div> : (
              <>
                <div className="bars" style={{ height: 130 }}>
                  {history.map((p, i) => (
                    <div className={'b' + (i === history.length - 1 ? ' on' : '')} key={p.date + i}><i style={{ height: Math.round((p.price / max) * 100) + '%' }} /><span>{p.date}</span></div>
                  ))}
                </div>
                <div className="kv" style={{ marginTop: '1rem' }}>
                  {history.map((p) => (
                    <div className="kv-row" key={p.date}><span className="k">{p.date}</span><span className="v price">{fmt(p.price)}₸</span></div>
                  ))}
                </div>
              </>
            )}
            <div className="hint" style={{ marginTop: '0.7rem' }}>История версионируется бессрочно, старые цены не удаляются.</div>
          </div>
        </div>
      </div>
    </>
  )
}
