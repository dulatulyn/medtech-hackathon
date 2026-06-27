import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { searchRows, priceHistory } from '../data.js'
import { firstServiceDetail } from '../api.js'

export default function Service() {
  const [detail, setDetail] = useState(null)
  useEffect(() => { firstServiceDetail().then(d => d && setDetail(d)).catch(() => {}) }, [])

  const name = detail?.service?.name || 'МРТ головного мозга'
  const cat = detail?.service?.category || 'Диагностика'
  const rows = detail?.rows?.length ? detail.rows : searchRows
  const history = detail?.history?.length ? detail.history : priceHistory
  const max = Math.max(...history.map(p => p.price || 0), 1)
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Витрина · услуга</span>
          <h1>{name}</h1>
          <p>Категория: {cat}.</p>
        </div>
        <div className="actions"><Link className="btn btn--outline" to="/search">К поиску</Link></div>
      </div>

      <div className="grid g-4" style={{ marginBottom: '1.1rem' }}>
        <div className="metric rv"><div className="metric__top">Лучшая цена</div><div className="metric__val num" style={{ color: 'var(--ok)' }}>18 900<small>₸</small></div><div className="metric__foot">Сункар · Алматы</div></div>
        <div className="metric rv"><div className="metric__top">Медиана</div><div className="metric__val num">24 500<small>₸</small></div><div className="metric__foot">по 8 клиникам</div></div>
        <div className="metric rv"><div className="metric__top">Максимум</div><div className="metric__val num">31 200<small>₸</small></div><div className="metric__foot"><span className="delta delta--down">Арман +38%</span></div></div>
        <div className="metric rv"><div className="metric__top">Партнёров</div><div className="metric__val num">8</div><div className="metric__foot">оказывают услугу</div></div>
      </div>

      <div className="grid g-3">
        <div className="card span-2 rv">
          <div className="card__head"><h3>Клиники с этой услугой</h3></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Клиника</th><th>Город</th><th className="num">Резидент</th><th className="num">Нерезидент</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={(r.clinic || '') + i} className={r.best ? 'row-best' : (r.flag || r.flagPct) ? 'row-flag' : ''}>
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
          <div className="card__head"><h3>История цены</h3><span className="sub">Сункар, медиана</span></div>
          <div className="card__body">
            <div className="bars" style={{ height: 130 }}>
              {history.map((p, i) => (
                <div className={'b' + (i === history.length - 1 ? ' on' : '')} key={p.date + i}><i style={{ height: Math.round((p.price / max) * 100) + '%' }} /><span>{p.date}</span></div>
              ))}
            </div>
            <div className="kv" style={{ marginTop: '1rem' }}>
              <div className="kv-row"><span className="k">2024</span><span className="v price">16 500₸</span></div>
              <div className="kv-row"><span className="k">2025</span><span className="v price">17 800₸ <span className="delta delta--down" style={{ marginLeft: '0.3rem' }}>+8%</span></span></div>
              <div className="kv-row"><span className="k">2026</span><span className="v price">18 900₸ <span className="delta delta--down" style={{ marginLeft: '0.3rem' }}>+6%</span></span></div>
            </div>
            <div className="hint" style={{ marginTop: '0.7rem' }}>История версионируется бессрочно, старые цены не удаляются.</div>
          </div>
        </div>
      </div>
    </>
  )
}
