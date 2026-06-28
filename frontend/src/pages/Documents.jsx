import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listDocuments, getDocumentDetail, STATUS_LABEL } from '../api.js'

const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'ok', label: 'Готово' },
  { key: 'warn', label: 'На ревью' },
  { key: 'info', label: 'Обработка' },
  { key: 'pend', label: 'В очереди' },
  { key: 'err', label: 'Ошибка' },
]

export default function Documents() {
  const [docs, setDocs] = useState(null)
  const [active, setActive] = useState('all')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    listDocuments().then((d) => {
      setDocs(d)
      if (d.length) setSelected(d[0].id)
    }).catch(() => setDocs([]))
  }, [])

  useEffect(() => {
    if (!selected) return
    setDetail(null)
    getDocumentDetail(selected).then(setDetail).catch(() => setDetail(null))
  }, [selected])

  const all = docs || []
  const counts = all.reduce((m, d) => ((m[d.status] = (m[d.status] || 0) + 1), m), {})
  const shown = active === 'all' ? all : all.filter((d) => d.status === active)

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Данные</span>
          <h1>Документы</h1>
          <p>Все прайс-документы партнёров. Исходники и сырые данные хранятся бессрочно.</p>
        </div>
        <div className="actions"><Link className="btn btn--accent" to="/upload">Загрузить ещё</Link></div>
      </div>

      <div className="toolbar">
        {FILTERS.map((c) => {
          const n = c.key === 'all' ? all.length : (counts[c.key] || 0)
          return <button className={'chip' + (c.key === active ? ' on' : '')} key={c.key} onClick={() => setActive(c.key)}>{c.label} · {n}</button>
        })}
      </div>

      <div className="card rv" style={{ marginBottom: '1.1rem' }}>
        <div className="card__body card__body--flush">
          <table className="table">
            <thead><tr><th>Файл</th><th>Клиника</th><th>Формат</th><th>Дата прайса</th><th>Статус</th><th className="num">Позиций</th></tr></thead>
            <tbody>
              {docs === null ? <tr><td colSpan="6"><div className="empty">Загрузка…</div></td></tr> :
                shown.length === 0 ? <tr><td colSpan="6"><div className="empty">Нет документов.</div></td></tr> :
                  shown.map((d) => (
                    <tr key={d.id} onClick={() => setSelected(d.id)} className={d.id === selected ? 'row-best' : ''} style={{ cursor: 'pointer' }}>
                      <td className="t-main">{d.file}</td>
                      <td>{d.clinic}{d.city ? ' · ' + d.city : ''}</td>
                      <td><span className="tag">{d.format}</span></td>
                      <td className="t-sub">{d.date}</td>
                      <td><span className={'badge badge--' + d.status}><span className="d" />{STATUS_LABEL[d.status]}</span></td>
                      <td className="num">{d.id === selected && detail ? detail.itemCount : '—'}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid g-3">
        <div className="card span-2 rv">
          <div className="card__head"><h3>{detail?.file || 'Документ'}</h3>{detail && <span className={'badge badge--' + detail.status}><span className="d" />{STATUS_LABEL[detail.status]}</span>}</div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Услуга (как в документе)</th><th>Резидент</th><th>Нерезидент</th><th>Сопоставление</th></tr></thead>
              <tbody>
                {!detail ? <tr><td colSpan="4"><div className="empty">Выберите документ…</div></td></tr> :
                  detail.rows.length === 0 ? <tr><td colSpan="4"><div className="empty">Нет извлечённых позиций.</div></td></tr> :
                    detail.rows.slice(0, 30).map((r, i) => (
                      <tr key={i} className={r.flag ? 'row-flag' : ''}>
                        <td className="t-main">{r.raw}</td>
                        <td className="num price">{r.res}<i>₸</i></td>
                        <td className="num price">{r.nonres}<i>₸</i></td>
                        <td><span className={'badge badge--' + r.match}><span className="d" />{r.service || r.matchLabel}{r.conf ? ` · ${Math.round(r.conf * 100)}%` : ''}</span></td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {detail && detail.rows.length > 30 && <div className="hint" style={{ padding: '0.8rem 1.25rem' }}>Показаны первые 30 из {detail.itemCount} позиций.</div>}
          </div>
        </div>
        <div className="stack">
          <div className="card rv">
            <div className="card__head"><h3>Метаданные</h3></div>
            <div className="card__body kv">
              <div className="kv-row"><span className="k">Партнёр</span><span className="v">{detail?.clinic || '—'}{detail?.city ? ' · ' + detail.city : ''}</span></div>
              <div className="kv-row"><span className="k">Формат</span><span className="v">{detail?.format || '—'}</span></div>
              <div className="kv-row"><span className="k">Извлечено</span><span className="v num">{detail ? detail.itemCount + ' позиций' : '—'}</span></div>
              <div className="kv-row"><span className="k">Дата прайса</span><span className="v">{detail?.date || '—'}</span></div>
            </div>
          </div>
          <div className="card rv">
            <div className="card__head"><h3>Лог обработки</h3></div>
            <div className="card__body">
              <p className="hint" style={{ whiteSpace: 'pre-wrap' }}>{detail?.parse_log || 'Лог пуст.'}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
