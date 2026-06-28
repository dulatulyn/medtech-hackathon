import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listCatalog } from '../api.js'

const cats = ['Все', 'Лаборатория', 'Диагностика', 'Консультация']

export default function Catalog() {
  const [c, setC] = useState(0)
  const [rows, setRows] = useState(null)
  useEffect(() => {
    listCatalog().then(setRows).catch(() => setRows([]))
  }, [])
  const all = rows || []
  const shown = c === 0 ? all : all.filter((s) => s.cat === cats[c])
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Витрина</span>
          <h1>Справочник услуг</h1>
          <p>Эталонный каталог: к этим записям нормализуются все услуги из прайсов клиник.</p>
        </div>
        <div className="actions"><span className="badge badge--accent">{all.length} услуг</span></div>
      </div>

      <div className="toolbar">
        {cats.map((x, i) => (
          <button className={'chip' + (i === c ? ' on' : '')} key={x} onClick={() => setC(i)}>{x}</button>
        ))}
      </div>

      <div className="card rv">
        <div className="card__body card__body--flush">
          <table className="table">
            <thead><tr><th>Услуга</th><th>Категория</th><th>Синонимы</th><th className="num">Партнёров</th><th className="num">Мин.</th><th className="num">Макс.</th></tr></thead>
            <tbody>
              {rows === null ? <tr><td colSpan="6"><div className="empty">Загрузка…</div></td></tr> :
                shown.length === 0 ? <tr><td colSpan="6"><div className="empty">Нет услуг в этой категории.</div></td></tr> :
                  shown.map((s) => (
                    <tr key={s.id}>
                      <td className="t-main"><Link to={`/service/${s.id}`} style={{ color: 'inherit' }}>{s.name}</Link></td>
                      <td><span className="tag">{s.cat}</span></td>
                      <td className="t-sub">{s.syn || '—'}</td>
                      <td className="num">{s.partners}</td>
                      <td className="num price" style={{ color: 'var(--ok)' }}>{s.min}<i>₸</i></td>
                      <td className="num price">{s.max}<i>₸</i></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
