import { useState } from 'react'
import { Link } from 'react-router-dom'
import { catalog } from '../data.js'

const cats = ['Все', 'Лаборатория', 'Диагностика', 'Консультация']

export default function Catalog() {
  const [c, setC] = useState(0)
  const shown = c === 0 ? catalog : catalog.filter(s => s.cat === cats[c])
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Витрина</span>
          <h1>Справочник услуг</h1>
          <p>Эталонный каталог: к этим записям нормализуются все услуги из прайсов клиник.</p>
        </div>
        <div className="actions"><span className="badge badge--accent">{catalog.length} услуг</span></div>
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
              {shown.map(s => (
                <tr key={s.name}>
                  <td className="t-main"><Link to="/service" style={{ color: 'inherit' }}>{s.name}</Link></td>
                  <td><span className="tag">{s.cat}</span></td>
                  <td className="t-sub">{s.syn}</td>
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
