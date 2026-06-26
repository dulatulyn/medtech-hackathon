import { useState } from 'react'
import { Link } from 'react-router-dom'
import { documents, statusLabel } from '../data.js'

const chips = ['Все · 10', 'Готово · 7', 'На ревью · 1', 'Обработка · 1', 'В очереди · 1']

const detailRows = [
  { raw: 'МРТ головн. мозга', res: '31 200', nonres: '35 000', match: 'ok', label: 'МРТ головного мозга' },
  { raw: 'ОАК (5 параметров)', res: '2 400', nonres: '3 000', match: 'ok', label: 'Общий анализ крови' },
  { raw: 'Консульт. невропат.', res: '8 500', nonres: '10 000', match: 'warn', label: 'уверенность 64%', flag: true },
  { raw: 'Глюкоза кр. натощак', res: '1 900', nonres: '2 300', match: 'err', label: 'не сопоставлено', flag: true },
]

export default function Documents() {
  const [active, setActive] = useState(0)
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
        {chips.map((c, i) => (
          <button className={'chip' + (i === active ? ' on' : '')} key={c} onClick={() => setActive(i)}>{c}</button>
        ))}
      </div>

      <div className="card rv" style={{ marginBottom: '1.1rem' }}>
        <div className="card__body card__body--flush">
          <table className="table">
            <thead><tr><th>Файл</th><th>Клиника</th><th>Формат</th><th>Дата прайса</th><th>Статус</th><th className="num">Позиций</th></tr></thead>
            <tbody>
              {documents.map(d => {
                const m = statusLabel[d.status]
                return (
                  <tr key={d.file}>
                    <td className="t-main">{d.file}</td>
                    <td>{d.clinic} · {d.city}</td>
                    <td><span className="tag">{d.format}</span></td>
                    <td className="t-sub">{d.date}</td>
                    <td><span className={'badge badge--' + m.c}><span className="d" />{m.t}</span></td>
                    <td className="num">{d.items ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid g-3">
        <div className="card span-2 rv">
          <div className="card__head"><h3>Клиника 3 прайс 2026.PDF</h3><span className="badge badge--warn"><span className="d" />На ревью</span><div className="actions"><button className="btn btn--outline btn--sm">Переобработать</button></div></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Услуга (как в документе)</th><th>Резидент</th><th>Нерезидент</th><th>Сопоставление</th></tr></thead>
              <tbody>
                {detailRows.map(r => (
                  <tr key={r.raw} className={r.flag ? 'row-flag' : ''}>
                    <td className="t-main">{r.raw}</td>
                    <td className="num price">{r.res}<i>₸</i></td>
                    <td className="num price">{r.nonres}<i>₸</i></td>
                    <td><span className={'badge badge--' + r.match}><span className="d" />{r.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="stack">
          <div className="card rv">
            <div className="card__head"><h3>Метаданные</h3></div>
            <div className="card__body kv">
              <div className="kv-row"><span className="k">Партнёр</span><span className="v">Арман · Шымкент</span></div>
              <div className="kv-row"><span className="k">Формат</span><span className="v">scan_pdf · OCR</span></div>
              <div className="kv-row"><span className="k">Извлечено</span><span className="v num">280 позиций</span></div>
              <div className="kv-row"><span className="k">Дата прайса</span><span className="v">01.01.2026</span></div>
            </div>
          </div>
          <div className="card rv">
            <div className="card__head"><h3>Лог обработки</h3></div>
            <div className="card__body stack" style={{ gap: '0.6rem' }}>
              <div className="row" style={{ gap: '0.5rem' }}><span className="badge badge--ok"><span className="d" /></span><span className="hint">OCR: 280 строк распознано</span></div>
              <div className="row" style={{ gap: '0.5rem' }}><span className="badge badge--warn"><span className="d" /></span><span className="hint">12 позиций ниже порога уверенности</span></div>
              <div className="row" style={{ gap: '0.5rem' }}><span className="badge badge--warn"><span className="d" /></span><span className="hint">МРТ мозга: +38% к медиане</span></div>
              <div className="row" style={{ gap: '0.5rem' }}><span className="badge badge--err"><span className="d" /></span><span className="hint">4 позиции не сопоставлены</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
