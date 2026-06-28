import { useState, useEffect } from 'react'
import { useToast } from '../components/AppLayout.jsx'
import { listAnomalies } from '../api.js'

const filters = ['Все', 'Выше медианы', 'Скачок цены', 'Нерезидент < резидент']

export default function Anomalies() {
  const [items, setItems] = useState(null)
  const [f, setF] = useState(0)
  const toast = useToast()

  useEffect(() => {
    listAnomalies().then(setItems).catch(() => setItems([]))
  }, [])

  const all = items || []
  const shown = f === 0 ? all : all.filter((a) => a.type === filters[f])
  const resolve = (id) => { toast('Аномалия отмечена обработанной'); setItems((x) => x.filter((i) => i.id !== id)) }

  const deltas = all.map((a) => a.deltaPct).filter((v) => v != null)
  const avgDelta = deltas.length ? Math.round(deltas.reduce((s, v) => s + v, 0) / deltas.length) : 0
  const maxDelta = deltas.length ? Math.max(...deltas) : 0
  const maxItem = all.reduce((m, a) => ((a.deltaPct || 0) > (m?.deltaPct || 0) ? a : m), null)

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Качество · детектор переплат</span>
          <h1>Аномалии цен</h1>
          <p>Позиции, отклоняющиеся от прошлой версии прайса более чем на 50%. Прямая экономия для страховой.</p>
        </div>
      </div>

      <div className="grid g-3" style={{ marginBottom: '1.1rem' }}>
        <div className="metric rv"><div className="metric__top">Найдено аномалий</div><div className="metric__val num">{all.length}</div><div className="metric__foot"><span className="delta delta--up">детектор &gt;50%</span></div></div>
        <div className="metric rv"><div className="metric__top">Среднее отклонение</div><div className="metric__val num">+{avgDelta}<small>%</small></div><div className="metric__foot">к прошлой версии</div></div>
        <div className="metric rv"><div className="metric__top">Макс. отклонение</div><div className="metric__val num">+{maxDelta}<small>%</small></div><div className="metric__foot">{maxItem ? `${maxItem.clinic} · ${maxItem.service}` : '—'}</div></div>
      </div>

      <div className="toolbar">
        {filters.map((c, i) => (
          <button className={'chip' + (i === f ? ' on' : '')} key={c} onClick={() => setF(i)}>{c}</button>
        ))}
      </div>

      <div className="card rv">
        <div className="card__body card__body--flush">
          <table className="table">
            <thead><tr><th>Клиника</th><th>Услуга</th><th className="num">Цена</th><th className="num">Была</th><th className="num">Откл.</th><th className="num">Скачок</th><th>Тип</th><th></th></tr></thead>
            <tbody>
              {items === null ? <tr><td colSpan="8"><div className="empty">Загрузка…</div></td></tr> :
                shown.length === 0 ? <tr><td colSpan="8"><div className="empty">Нет аномалий в этой категории.</div></td></tr> :
                  shown.map((a) => (
                    <tr key={a.id} className="row-flag">
                      <td><div className="t-main">{a.clinic}</div><div className="t-sub">{a.city}</div></td>
                      <td>{a.service}</td>
                      <td className="num price">{a.price}<i>₸</i></td>
                      <td className="num t-sub">{a.prev}₸</td>
                      <td className="num">{a.deltaPct != null ? <span className="delta delta--down">+{a.deltaPct}%</span> : '—'}</td>
                      <td className="num price" style={{ color: 'var(--err)' }}>{a.overpay !== '—' ? `+${a.overpay}₸` : '—'}</td>
                      <td><span className="badge badge--warn"><span className="d" />{a.type}</span></td>
                      <td className="num"><button className="btn btn--outline btn--sm" onClick={() => resolve(a.id)}>Обработать</button></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
