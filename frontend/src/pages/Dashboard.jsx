import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { documents, statusLabel, anomalies } from '../data.js'
import { getStats, listDocuments } from '../api.js'
import { Skeleton, SkeletonRows } from '../components/Skeleton.jsx'

function Badge({ s }) {
  const m = statusLabel[s]
  return <span className={'badge badge--' + m.c}><span className="d" />{m.t}</span>
}

function ReportStat({ label, value, suffix }) {
  return (
    <div className="qr-kpi">
      <b className="num">{value}{suffix ? <small>{suffix}</small> : null}</b>
      <span>{label}</span>
    </div>
  )
}

// Printable quality summary. Presentation only — values are passed in, window.print() emits the sheet.
function QualityReport({
  totalDocs, matchRate, verifyCount, unmatched, anomalyCount,
  totalItems, matchedItems, servicesCount, partnersActive,
  formatRows, statusRows, topAnomalies, onClose,
}) {
  const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
  const docsTotal = formatRows.reduce((s, [, n]) => s + n, 0) || totalDocs || 1

  return (
    <div className="qr-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="qr-sheet qr-print" role="dialog" aria-modal="true" aria-label="Отчёт о качестве">
        <div className="qr-bar qr-noprint">
          <span className="badge badge--accent">Печатная сводка</span>
          <div className="qr-bar__actions">
            <button type="button" className="btn btn--accent btn--sm" onClick={() => window.print()}>Печать</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Закрыть</button>
          </div>
        </div>

        <header className="qr-head">
          <span className="qr-eyebrow">MedArchive · Контроль качества</span>
          <h2 className="qr-title">Отчёт о качестве данных</h2>
          <p className="qr-meta">Сформирован {today} · срез по импортному конвейеру</p>
        </header>

        <div className="qr-kpis">
          <ReportStat label="всего документов" value={totalDocs} />
          <ReportStat label="автонормализация" value={matchRate} suffix="%" />
          <ReportStat label="в очереди верификации" value={verifyCount} />
          <ReportStat label="несопоставлено позиций" value={unmatched} />
          <ReportStat label="аномалий цен" value={anomalyCount} />
        </div>

        <section className="qr-section">
          <h3 className="qr-h3">Разбивка по форматам</h3>
          <div className="qr-bars2">
            {formatRows.map(([f, n]) => {
              const pct = Math.round((n / docsTotal) * 100)
              return (
                <div className="qr-fmt" key={f}>
                  <div className="qr-fmt__top"><span className="tag">{f}</span><b className="num">{n}</b></div>
                  <div className="qr-track"><i style={{ width: pct + '%' }} /></div>
                  <span className="qr-fmt__pct num">{pct}%</span>
                </div>
              )
            })}
          </div>
        </section>

        <div className="qr-cols">
          <section className="qr-section">
            <h3 className="qr-h3">Очереди обработки</h3>
            <table className="table qr-table">
              <tbody>
                <tr><td className="t-main">Очередь верификации</td><td className="num">{verifyCount} док.</td></tr>
                <tr><td className="t-main">Несопоставленные позиции</td><td className="num">{unmatched}</td></tr>
                <tr><td className="t-main">Сопоставлено автоматически</td><td className="num">{matchedItems} / {totalItems}</td></tr>
                {servicesCount != null ? <tr><td className="t-main">Каталог услуг</td><td className="num">{servicesCount}</td></tr> : null}
                {partnersActive != null ? <tr><td className="t-main">Активных клиник</td><td className="num">{partnersActive}</td></tr> : null}
              </tbody>
            </table>
          </section>

          <section className="qr-section">
            <h3 className="qr-h3">Документы по статусам</h3>
            <table className="table qr-table">
              <tbody>
                {statusRows.map(([s, n]) => {
                  const m = statusLabel[s] || { c: 'pend', t: s }
                  return (
                    <tr key={s}>
                      <td><span className={'badge badge--' + m.c}><span className="d" />{m.t}</span></td>
                      <td className="num">{n}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        </div>

        <section className="qr-section">
          <h3 className="qr-h3">Топ аномалий цен</h3>
          <table className="table qr-table">
            <thead>
              <tr><th>Клиника</th><th>Услуга</th><th className="num">Цена</th><th className="num">Медиана</th><th className="num">Δ</th><th className="num">Переплата</th></tr>
            </thead>
            <tbody>
              {topAnomalies.map(a => (
                <tr key={a.id}>
                  <td className="t-main">{a.clinic}{a.city ? <div className="t-sub">{a.city}</div> : null}</td>
                  <td>{a.service}{a.type ? <div className="t-sub">{a.type}</div> : null}</td>
                  <td className="num">{a.price} ₸</td>
                  <td className="num">{a.median} ₸</td>
                  <td className="num"><span className="delta delta--down">+{a.deltaPct}%</span></td>
                  <td className="num">+{a.overpay} ₸</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="qr-foot">MedArchive · автоматический контроль цен и нормализация прайс-листов · {today}</footer>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [docs, setDocs] = useState(documents)
  const [loading, setLoading] = useState(true)
  const [reportOpen, setReportOpen] = useState(false)
  useEffect(() => {
    Promise.all([
      getStats().then(s => setStats(s)).catch(() => {}),
      listDocuments().then(d => { if (d.length) setDocs(d) }).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const doneCount = stats?.documents_by_status?.done ?? 9
  const totalDocs = stats?.total_documents ?? 10
  const matchRate = stats ? Math.round(stats.match_rate_pct) : 72
  const unmatched = stats?.items_unmatched ?? 24
  const anomalyCount = stats?.anomalies ?? 7

  // presentational split of the normalization donut around the live match rate
  const reviewPct = Math.round((100 - matchRate) / 2)
  const notFoundPct = Math.max(0, 100 - matchRate - reviewPct)

  // ---- quality report (derived for display only; same data, no extra fetch) ----
  const totalItems = stats?.total_items ?? docs.reduce((s, d) => s + (d.items ?? 0), 0)
  const matchedItems = stats?.items_matched ?? Math.round((totalItems * matchRate) / 100)
  const servicesCount = stats?.services_count ?? null
  const partnersActive = stats?.partners_active ?? null
  const verifyCount = stats?.documents_by_status?.needs_review ?? docs.filter(d => d.status === 'warn').length
  const formatRows = Object.entries(
    docs.reduce((acc, d) => { const k = d.format || '—'; acc[k] = (acc[k] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])
  const statusRows = Object.entries(
    docs.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])
  const topAnomalies = [...anomalies].sort((a, b) => (b.deltaPct || 0) - (a.deltaPct || 0)).slice(0, 6)

  return (
    <>
      <div className="phero">
        <div className="phero__head">
          <span className="phero__eyebrow">Обзор</span>
          <h1 className="phero__title">Дашборд обработки</h1>
          <p className="phero__sub">Извлечение, нормализация и контроль цен в одном потоке.</p>
        </div>
        <div className="phero__metrics">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div className="phero__metric" key={i}>
                <Skeleton w="2.6rem" h="2.4rem" r="12px" />
                <Skeleton w={62} h={11} r="999px" />
              </div>
            ))
          ) : (
            <>
              <div className="phero__metric"><b className="num">{doneCount}<small>/{totalDocs}</small></b><span>документов</span></div>
              <div className="phero__metric"><b className="num">{matchRate}<small>%</small></b><span>автонорм.</span></div>
              <div className="phero__metric"><b className="num">{unmatched}</b><span>в очереди</span></div>
              <div className="phero__metric"><b className="num">{anomalyCount}</b><span>аномалий</span></div>
            </>
          )}
        </div>
      </div>

      <div className="toolbar">
        <span className="muted">Обновлён сегодня</span>
        <div className="wrap-gap" style={{ marginLeft: 'auto' }}>
          <button type="button" className="btn btn--outline" onClick={() => setReportOpen(true)}>Отчёт о качестве</button>
          <Link className="btn btn--accent" to="/upload">Загрузить архив</Link>
        </div>
      </div>

      <div className="grid g-3" style={{ marginBottom: '1.2rem' }}>
        <div className="card span-2 rv">
          <div className="card__head"><h3>Обработка за неделю</h3></div>
          <div className="card__body">
            {loading ? (
              <div className="bars">
                {[55, 75, 40, 90, 100, 50, 28].map((h, i) => (
                  <div className="b" key={i}><Skeleton w="100%" h={h + '%'} r="7px 7px 0 0" style={{ maxWidth: 36 }} /></div>
                ))}
              </div>
            ) : (
              <div className="bars">
                {[['Пн', 38], ['Вт', 55], ['Ср', 30], ['Чт', 72], ['Пт', 100], ['Сб', 46], ['Вс', 18]].map(([d, h]) => (
                  <div className={'b' + (h === 100 ? ' on' : '')} key={d}><i style={{ height: h + '%' }} /><span>{d}</span></div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="card rv">
          <div className="card__head"><h3>Нормализация</h3></div>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            {loading ? (
              <>
                <Skeleton w={138} h={138} r="50%" />
                <div className="legend">
                  <Skeleton w={92} h={11} r="999px" />
                  <Skeleton w={82} h={11} r="999px" />
                  <Skeleton w={104} h={11} r="999px" />
                </div>
              </>
            ) : (
              <>
                <div className="donut" style={{ background: `conic-gradient(var(--ink) 0 ${matchRate}%, var(--gray-3) ${matchRate}% ${matchRate + reviewPct}%, var(--line-2) ${matchRate + reviewPct}% 100%)` }}>
                  <div className="mid"><b className="num">{matchRate}<small>%</small></b><span>авто</span></div>
                </div>
                <div className="legend">
                  <span><i style={{ background: 'var(--ink)' }} />Авто {matchRate}%</span>
                  <span><i style={{ background: 'var(--gray-3)' }} />Ревью {reviewPct}%</span>
                  <span><i style={{ background: 'var(--line-2)' }} />Не найдено {notFoundPct}%</span>
                </div>
              </>
            )}
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
                {loading
                  ? <SkeletonRows n={5} cols={5} />
                  : docs.slice(0, 5).map(d => (
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
                {loading
                  ? <SkeletonRows n={4} cols={2} />
                  : anomalies.slice(0, 4).map(a => (
                    <tr key={a.id}><td><div className="t-main">{a.clinic} · {a.service}</div><div className="t-sub">+{a.deltaPct}% к медиане</div></td><td className="num"><span className="delta delta--down">+{a.overpay}₸</span></td></tr>
                  ))}
              </tbody>
            </table>
            <div style={{ padding: '0.9rem 1.25rem' }}><Link className="btn btn--outline btn--sm" to="/anomalies" style={{ width: '100%' }}>Все аномалии</Link></div>
          </div>
        </div>
      </div>

      {reportOpen && (
        <QualityReport
          totalDocs={totalDocs}
          matchRate={matchRate}
          verifyCount={verifyCount}
          unmatched={unmatched}
          anomalyCount={anomalyCount}
          totalItems={totalItems}
          matchedItems={matchedItems}
          servicesCount={servicesCount}
          partnersActive={partnersActive}
          formatRows={formatRows}
          statusRows={statusRows}
          topAnomalies={topAnomalies}
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  )
}
