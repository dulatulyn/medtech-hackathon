import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { documents, statusLabel, anomalies } from '../data.js'
import { getStats, listDocuments } from '../api.js'

function Badge({ s }) {
  const m = statusLabel[s]
  return <span className={'badge badge--' + m.c}><span className="d" />{m.t}</span>
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [docs, setDocs] = useState(documents)
  useEffect(() => {
    getStats().then(s => setStats(s)).catch(() => {})
    listDocuments().then(d => { if (d.length) setDocs(d) }).catch(() => {})
  }, [])

  const doneCount = stats?.documents_by_status?.done ?? 9
  const totalDocs = stats?.total_documents ?? 10
  const matchRate = stats ? Math.round(stats.match_rate_pct) : 72
  const unmatched = stats?.items_unmatched ?? 24
  const anomalyCount = stats?.anomalies ?? 7

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Обзор</span>
          <h1>Дашборд обработки</h1>
          <p>Сводка по архиву прайсов клиник-партнёров Nomad Insurance.</p>
        </div>
        <div className="actions">
          <Link className="btn btn--outline" to="/documents">Отчёт о качестве</Link>
          <Link className="btn btn--accent" to="/upload">Загрузить архив</Link>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: '1.1rem' }}>
        <div className="metric rv"><div className="metric__top">Документов обработано</div><div className="metric__val num">{doneCount}<small>/ {totalDocs}</small></div><div className="metric__foot"><span className="delta delta--up">{stats?.total_items ?? 0} позиций</span> извлечено</div></div>
        <div className="metric rv"><div className="metric__top">Автонормализация</div><div className="metric__val num">{matchRate}<small>%</small></div><div className="metric__foot"><span className="delta delta--up">цель 70%</span> {matchRate >= 70 ? 'выполнена' : 'в работе'}</div></div>
        <div className="metric rv"><div className="metric__top">В очереди верификации</div><div className="metric__val num">{unmatched}</div><div className="metric__foot"><span className="delta delta--warn">{unmatched} несопоставлено</span></div></div>
        <div className="metric rv"><div className="metric__top">Аномалии цен</div><div className="metric__val num">{anomalyCount}</div><div className="metric__foot"><span className="delta delta--up">детектор</span> к проверке</div></div>
      </div>

      <div className="grid g-3" style={{ marginBottom: '1.1rem' }}>
        <div className="card span-2 rv">
          <div className="card__head"><h3>Обработка за неделю</h3><span className="sub">позиций извлечено в день</span></div>
          <div className="card__body">
            <div className="bars">
              {[['Пн', 38], ['Вт', 55], ['Ср', 30], ['Чт', 72], ['Пт', 100], ['Сб', 46], ['Вс', 18]].map(([d, h]) => (
                <div className={'b' + (h === 100 ? ' on' : '')} key={d}><i style={{ height: h + '%' }} /><span>{d}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="card rv">
          <div className="card__head"><h3>Нормализация</h3></div>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="donut" style={{ background: 'conic-gradient(var(--ok) 0 72%, var(--warn) 72% 86%, var(--err) 86% 100%)' }}>
              <div className="mid"><b className="num">72%</b><span>авто</span></div>
            </div>
            <div className="legend">
              <span><i style={{ background: 'var(--ok)' }} />Авто 72%</span>
              <span><i style={{ background: 'var(--warn)' }} />Ревью 14%</span>
              <span><i style={{ background: 'var(--err)' }} />Не найдено 14%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid g-3">
        <div className="card span-2 rv">
          <div className="card__head"><h3>Последние документы</h3><div className="actions"><Link className="btn btn--ghost btn--sm" to="/documents">Все</Link></div></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Файл</th><th>Клиника</th><th>Формат</th><th>Статус</th><th className="num">Позиций</th></tr></thead>
              <tbody>
                {docs.slice(0, 5).map(d => (
                  <tr key={d.id || d.file}><td className="t-main">{d.file}</td><td>{d.clinic}</td><td><span className="tag">{d.format}</span></td><td><Badge s={d.status} /></td><td className="num">{d.items ?? '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card rv">
          <div className="card__head"><h3>Топ переплат</h3><span className="badge badge--accent">детектор</span></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <tbody>
                {anomalies.slice(0, 4).map(a => (
                  <tr key={a.id}><td><div className="t-main">{a.clinic} · {a.service}</div><div className="t-sub">+{a.deltaPct}% к медиане</div></td><td className="num"><span className="delta delta--down">+{a.overpay}₸</span></td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '0.9rem 1.25rem' }}><Link className="btn btn--outline btn--sm" to="/anomalies" style={{ width: '100%' }}>Все аномалии</Link></div>
          </div>
        </div>
      </div>
    </>
  )
}
