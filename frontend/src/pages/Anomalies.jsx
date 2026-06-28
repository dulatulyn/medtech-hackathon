import { useState, useEffect } from 'react'
import { anomalies } from '../data.js'
import { useToast } from '../components/AppLayout.jsx'
import { listAnomalies } from '../api.js'
import { Skeleton, SkeletonRows } from '../components/Skeleton.jsx'

const filters = ['Все', 'Выше медианы', 'Скачок цены', 'Нерезидент < резидент']

function MetricSkeleton() {
  return (
    <div className="metric rv">
      <div className="metric__top"><Skeleton w={132} h={12} /></div>
      <div className="metric__val"><Skeleton w="55%" h="2.2rem" r="12px" /></div>
      <div className="metric__foot"><Skeleton w={88} h={12} /></div>
    </div>
  )
}

export default function Anomalies() {
  const [items, setItems] = useState(anomalies)
  const [loading, setLoading] = useState(true)
  const [f, setF] = useState(0)
  const toast = useToast()

  useEffect(() => {
    listAnomalies().then(a => { if (a.length) setItems(a) }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const shown = f === 0 ? items : items.filter(a => a.type === filters[f])
  const resolve = (id) => { toast('Аномалия обработана'); setItems(x => x.filter(i => i.id !== id)) }

  return (
    <>
      <div className="phero">
        <div className="phero__head">
          <span className="phero__eyebrow">Качество</span>
          <h1 className="phero__title">Аномалии цен</h1>
          <p className="phero__sub">Позиции, отклоняющиеся от медианы рынка.</p>
        </div>
        <div className="phero__metrics">
          <div className="phero__metric"><b className="num">2.4<small>млн ₸</small></b><span>экономия</span></div>
          <div className="phero__metric"><b className="num">{loading ? <Skeleton w={46} h="2rem" r="10px" /> : shown.length}</b><span>позиций</span></div>
          <div className="phero__metric"><b className="num">+45<small>%</small></b><span>откл.</span></div>
        </div>
      </div>

      <div className="grid g-3" style={{ marginBottom: '1.2rem' }}>
        {loading ? (
          <><MetricSkeleton /><MetricSkeleton /><MetricSkeleton /></>
        ) : (
          <>
            <div className="metric rv"><div className="metric__top">Потенциальная экономия</div><div className="metric__val num">2.4<small>млн ₸</small></div><div className="metric__foot"><span className="delta delta--up">{shown.length} позиций</span></div></div>
            <div className="metric rv"><div className="metric__top">Среднее отклонение</div><div className="metric__val num">+45<small>%</small></div><div className="metric__foot">к медиане</div></div>
            <div className="metric rv"><div className="metric__top">Самая дорогая</div><div className="metric__val num">+14<small>к ₸</small></div><div className="metric__foot">Демеу · КТ ОГК</div></div>
          </>
        )}
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
              {loading ? (
                <SkeletonRows n={6} cols={8} />
              ) : (
                <>
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
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
