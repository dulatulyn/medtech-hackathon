import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStats, listDocuments, listAnomalies, deriveNormalization, deriveStatusBars, STATUS_LABEL } from '../api.js'

function Badge({ s }) {
  return <span className={'badge badge--' + s}><span className="d" />{STATUS_LABEL[s] || s}</span>
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [docs, setDocs] = useState([])
  const [anoms, setAnoms] = useState([])

  useEffect(() => {
    getStats().then(setStats).catch(() => {})
    listDocuments().then(setDocs).catch(() => {})
    listAnomalies().then(setAnoms).catch(() => {})
  }, [])

  const doneCount = stats?.documents_by_status?.done ?? 0
  const totalDocs = stats?.total_documents ?? 0
  const matchRate = stats ? Math.round(stats.match_rate_pct) : 0
  const unmatched = stats?.items_unmatched ?? 0
  const anomalyCount = stats?.anomalies ?? 0
  const totalItems = stats?.total_items ?? 0

  const norm = deriveNormalization(stats)
  const bars = deriveStatusBars(stats)
  const barMax = Math.max(1, ...bars.map((b) => b.n))
  const donut = `conic-gradient(var(--ok) 0 ${norm.autoPct}%, var(--warn) ${norm.autoPct}% ${norm.autoPct + norm.manualPct}%, var(--err) ${norm.autoPct + norm.manualPct}% 100%)`
  const topOverpay = [...anoms].sort((a, b) => (b.deltaPct || 0) - (a.deltaPct || 0)).slice(0, 4)

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
        <div className="metric rv"><div className="metric__top">Документов обработано</div><div className="metric__val num">{doneCount}<small>/ {totalDocs}</small></div><div className="metric__foot"><span className="delta delta--up">{totalItems} позиций</span> извлечено</div></div>
        <div className="metric rv"><div className="metric__top">Автонормализация</div><div className="metric__val num">{matchRate}<small>%</small></div><div className="metric__foot"><span className="delta delta--up">цель 70%</span> {matchRate >= 70 ? 'выполнена' : 'в работе'}</div></div>
        <div className="metric rv"><div className="metric__top">В очереди верификации</div><div className="metric__val num">{unmatched}</div><div className="metric__foot"><span className="delta delta--warn">{unmatched} несопоставлено</span></div></div>
        <div className="metric rv"><div className="metric__top">Аномалии цен</div><div className="metric__val num">{anomalyCount}</div><div className="metric__foot"><span className="delta delta--up">детектор</span> к проверке</div></div>
      </div>

      <div className="grid g-3" style={{ marginBottom: '1.1rem' }}>
        <div className="card span-2 rv">
          <div className="card__head"><h3>Документы по статусу</h3><span className="sub">распределение обработки</span></div>
          <div className="card__body">
            {bars.length === 0 ? <div className="empty">Нет документов.</div> : (
              <div className="bars">
                {bars.map((b) => (
                  <div className={'b' + (b.key === 'done' ? ' on' : '')} key={b.key}>
                    <i style={{ height: Math.round((b.n / barMax) * 100) + '%' }} />
                    <span>{b.label} · {b.n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="card rv">
          <div className="card__head"><h3>Нормализация</h3></div>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="donut" style={{ background: donut }}>
              <div className="mid"><b className="num">{norm.autoPct}%</b><span>авто</span></div>
            </div>
            <div className="legend">
              <span><i style={{ background: 'var(--ok)' }} />Авто {norm.autoPct}%</span>
              <span><i style={{ background: 'var(--warn)' }} />Ручная {norm.manualPct}%</span>
              <span><i style={{ background: 'var(--err)' }} />Не найдено {norm.nonePct}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid g-3">
        <div className="card span-2 rv">
          <div className="card__head"><h3>Последние документы</h3><div className="actions"><Link className="btn btn--ghost btn--sm" to="/documents">Все</Link></div></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Файл</th><th>Клиника</th><th>Формат</th><th>Статус</th></tr></thead>
              <tbody>
                {docs.length === 0 ? <tr><td colSpan="4"><div className="empty">Загрузка…</div></td></tr> :
                  docs.slice(0, 5).map((d) => (
                    <tr key={d.id}><td className="t-main">{d.file}</td><td>{d.clinic}</td><td><span className="tag">{d.format}</span></td><td><Badge s={d.status} /></td></tr>
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
                {topOverpay.length === 0 ? <tr><td><div className="empty">Аномалий нет.</div></td></tr> :
                  topOverpay.map((a) => (
                    <tr key={a.id}><td><div className="t-main">{a.clinic} · {a.service}</div><div className="t-sub">{a.deltaPct ? `+${a.deltaPct}% · ${a.type}` : a.type}</div></td><td className="num"><span className="delta delta--down">{a.overpay !== '—' ? `+${a.overpay}₸` : `+${a.deltaPct || ''}%`}</span></td></tr>
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
