import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { catalog } from '../data.js'
import { listCatalog } from '../api.js'
import { Skeleton, SkeletonRows } from '../components/Skeleton.jsx'

const cats = ['Все', 'Лаборатория', 'Диагностика', 'Консультация']

export default function Catalog() {
  const [c, setC] = useState(0)
  const [rows, setRows] = useState(catalog)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    listCatalog().then(r => { if (r.length) setRows(r) }).catch(() => {}).finally(() => setLoading(false))
  }, [])
  const shown = c === 0 ? rows : rows.filter(s => s.cat === cats[c])

  // presentational derived metrics (no data-shape changes)
  const synCount = rows.reduce((n, s) => n + (s.syn ? s.syn.split(',').filter(t => t.trim()).length : 0), 0)
  const aliasCount = rows.length + synCount
  const catCount = new Set(rows.map(s => s.cat)).size

  return (
    <>
      <div className="phero">
        <div className="phero__head">
          <span className="phero__eyebrow">Витрина</span>
          <h1 className="phero__title">Справочник услуг</h1>
          <p className="phero__sub">Одна каноничная услуга — десятки названий из прайсов.</p>
        </div>
        <div className="phero__metrics">
          <div className="phero__metric"><b className="num">{loading ? <Skeleton w={56} h="2.2rem" /> : rows.length}</b><span>эталонных услуг</span></div>
          <div className="phero__metric"><b className="num">{loading ? <Skeleton w={56} h="2.2rem" /> : aliasCount}</b><span>сырых названий</span></div>
          <div className="phero__metric"><b className="num">{loading ? <Skeleton w={40} h="2.2rem" /> : catCount}</b><span>категории</span></div>
        </div>
      </div>

      <div className="toolbar">
        {cats.map((x, i) => (
          <button className={'chip' + (i === c ? ' on' : '')} key={x} onClick={() => setC(i)}>{x}</button>
        ))}
        <span className="hint" style={{ marginLeft: 'auto' }}>{loading ? <Skeleton w={96} h={14} r="999px" /> : `${shown.length} в категории`}</span>
      </div>

      <div className="card rv">
        <div className="card__head">
          <h3>Эталонные услуги</h3>
          <div className="actions"><span className="badge badge--accent">{loading ? <Skeleton w={64} h={14} r="999px" /> : `${rows.length} услуг`}</span></div>
        </div>
        <div className="card__body card__body--flush">
          <table className="table">
            <thead><tr><th>Каноничная услуга</th><th>Категория</th><th>Синонимы из прайсов</th><th className="num">Партнёров</th><th className="num">Мин.</th><th className="num">Макс.</th></tr></thead>
            <tbody>
              {loading
                ? <SkeletonRows n={6} cols={6} />
                : shown.map(s => (
                  <tr key={s.name} className="row-flag">
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
