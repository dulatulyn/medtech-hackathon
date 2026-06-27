import { useState, useEffect } from 'react'
import { anomalies } from '../data.js'
import { useToast } from '../components/AppLayout.jsx'
import { listAnomalies } from '../api.js'

const filters = ['Все', 'Выше медианы', 'Скачок цены', 'Нерезидент < резидент']

export default function Anomalies() {
  const [items, setItems] = useState(anomalies)
  const [f, setF] = useState(0)
  const toast = useToast()

  useEffect(() => {
    listAnomalies().then(a => { if (a.length) setItems(a) }).catch(() => {})
  }, [])

  const shown = f === 0 ? items : items.filter(a => a.type === filters[f])
  const resolve = (id) => { toast('Аномалия обработана'); setItems(x => x.filter(i => i.id !== id)) }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Качество · детектор переплат</span>
          <h1>Аномалии цен</h1>
          <p>Позиции, отклоняющиеся от медианы рынка или прошлой версии прайса. Прямая экономия для страховой.</p>
        </div>
      </div>

      <div className="grid g-3" style={{ marginBottom: '1.1rem' }}>
        <div className="metric rv"><div className="metric__top">Потенциальная экономия</div><div className="metric__val num">2.4<small>млн ₸</small></div><div className="metric__foot"><span className="delta delta--up">7 позиций</span></div></div>
        <div className="metric rv"><div className="metric__top">Среднее отклонение</div><div className="metric__val num">+45<small>%</small></div><div className="metric__foot">к медиане рынка</div></div>
        <div className="metric rv"><div className="metric__top">Самая дорогая</div><div className="metric__val num">+14<small>к ₸</small></div><div className="metric__foot">Демеу · КТ ОГК</div></div>
      </div>

      <div className="toolbar">
        {filters.map((c, i) => (
          <button className={'chip' + (i === f ? ' on' : '')} key={c} onClick={() => setF(i)}>{c}</button>
        ))}
      </div>

      <div className="card rv">
        <div className="card__body card__body--flush">
          <table className="table">
            <thead><tr><th>Клиника</th><th>Услуга</th><th className="num">Цена</th><th className="num">Медиана</th><th className="num">Откл.</th><th className="num">Переплата</th><th>Тип</th><th></th></tr></thead>
            <tbody>
              {shown.map(a => (
                <tr key={a.id} className="row-flag">
                  <td><div className="t-main">{a.clinic}</div><div className="t-sub">{a.city}</div></td>
                  <td>{a.service}</td>
                  <td className="num price">{a.price}<i>₸</i></td>
                  <td className="num t-sub">{a.median}₸</td>
                  <td className="num"><span className="delta delta--down">+{a.deltaPct}%</span></td>
                  <td className="num price" style={{ color: 'var(--err)' }}>+{a.overpay}₸</td>
                  <td><span className="badge badge--warn"><span className="d" />{a.type}</span></td>
                  <td className="num"><button className="btn btn--outline btn--sm" onClick={() => resolve(a.id)}>Обработать</button></td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan="8"><div className="empty">Нет аномалий в этой категории.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
