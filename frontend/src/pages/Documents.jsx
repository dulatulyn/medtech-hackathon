import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { documents, statusLabel } from '../data.js'
import { listDocuments } from '../api.js'
import { Skeleton, SkeletonRows } from '../components/Skeleton.jsx'

const chips = ['Все · 10', 'Готово · 7', 'На ревью · 1', 'Обработка · 1', 'В очереди · 1']

const detailRows = [
  { raw: 'МРТ головн. мозга', res: '31 200', nonres: '35 000', match: 'ok', label: 'МРТ головного мозга' },
  { raw: 'ОАК (5 параметров)', res: '2 400', nonres: '3 000', match: 'ok', label: 'Общий анализ крови' },
  { raw: 'Консульт. невропат.', res: '8 500', nonres: '10 000', match: 'warn', label: 'уверенность 64%', flag: true },
  { raw: 'Глюкоза кр. натощак', res: '1 900', nonres: '2 300', match: 'err', label: 'не сопоставлено', flag: true },
]

export default function Documents() {
  const [active, setActive] = useState(0)
  const [docs, setDocs] = useState(documents)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    listDocuments().then(d => { if (d.length) setDocs(d) }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const total = docs.length
  const ready = docs.filter(d => d.status === 'ok').length
  const extracted = docs.reduce((s, d) => s + (d.items || 0), 0)

  return (
    <>
      <div className="phero">
        <div className="phero__head">
          <span className="phero__eyebrow">Данные</span>
          <h1 className="phero__title">Документы</h1>
          <p className="phero__sub">Прайс-документы партнёров.</p>
        </div>
        <div className="phero__metrics">
          <div className="phero__metric"><b className="num">{loading ? <Skeleton w={56} h="2rem" r="10px" /> : total}</b><span>документов</span></div>
          <div className="phero__metric"><b className="num">{loading ? <Skeleton w={84} h="2rem" r="10px" /> : extracted.toLocaleString('ru-RU')}</b><span>позиций извлечено</span></div>
          <div className="phero__metric"><b className="num">{loading ? <Skeleton w={56} h="2rem" r="10px" /> : ready}</b><span>готово</span></div>
        </div>
      </div>

      <div className="toolbar">
        <div className="chips">
          {chips.map((c, i) => (
            <button className={'chip' + (i === active ? ' on' : '')} key={c} onClick={() => setActive(i)}>{c}</button>
          ))}
        </div>
        <Link className="btn btn--accent" to="/upload" style={{ marginLeft: 'auto' }}>Загрузить ещё</Link>
      </div>

      <div className="card rv" style={{ marginBottom: '1.2rem' }}>
        <div className="card__head">
          <h3>Все документы</h3>
          <span className="sub">{loading ? <Skeleton w={70} h={12} /> : `${total} файлов`}</span>
        </div>
        <div className="card__body card__body--flush">
          <table className="table">
            <thead><tr><th>Файл</th><th>Клиника</th><th>Формат</th><th>Дата прайса</th><th>Статус</th><th className="num">Позиций</th></tr></thead>
            <tbody>
              {loading
                ? <SkeletonRows n={8} cols={6} />
                : docs.map(d => {
                  const m = statusLabel[d.status]
                  return (
                    <tr key={d.id || d.file}>
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
          <div className="card__head">
            <h3>Клиника 3 прайс 2026.PDF</h3>
            <span className="badge badge--warn"><span className="d" />На ревью</span>
            <span className="sub">Арман · Шымкент</span>
            <div className="actions"><button className="btn btn--outline btn--sm">Переобработать</button></div>
          </div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Услуга (как в документе)</th><th>Резидент</th><th>Нерезидент</th><th>Сопоставление</th></tr></thead>
              <tbody>
                {loading
                  ? <SkeletonRows n={4} cols={4} />
                  : detailRows.map(r => (
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
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                  <div className="kv-row" key={i}><Skeleton w={90} h={12} /><Skeleton w={120} h={12} /></div>
                ))
                : (
                  <>
                    <div className="kv-row"><span className="k">Партнёр</span><span className="v">Арман · Шымкент</span></div>
                    <div className="kv-row"><span className="k">Формат</span><span className="v">scan_pdf · OCR</span></div>
                    <div className="kv-row"><span className="k">Извлечено</span><span className="v num">280 позиций</span></div>
                    <div className="kv-row"><span className="k">Дата прайса</span><span className="v">01.01.2026</span></div>
                  </>
                )}
            </div>
          </div>

          <div className="card rv">
            <div className="card__head">
              <h3>Версионность</h3>
              <span className="badge badge--info"><span className="d" />Активная</span>
            </div>
            <div className="card__body kv">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                  <div className="kv-row" key={i}><Skeleton w={100} h={12} /><Skeleton w={90} h={12} /></div>
                ))
                : (
                  <>
                    <div className="kv-row"><span className="k">Текущая версия</span><span className="v num">2026</span></div>
                    <div className="kv-row"><span className="k">Предыдущие</span><span className="v">в архиве</span></div>
                    <div className="kv-row"><span className="k">Срок хранения</span><span className="v">бессрочно</span></div>
                  </>
                )}
            </div>
          </div>

          <div className="card rv">
            <div className="card__head"><h3>Лог обработки</h3></div>
            <div className="card__body stack" style={{ gap: '0.6rem' }}>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                  <div className="row" key={i} style={{ gap: '0.5rem' }}><Skeleton w={14} h={14} r="50%" /><Skeleton w="70%" h={12} /></div>
                ))
                : (
                  <>
                    <div className="row" style={{ gap: '0.5rem' }}><span className="badge badge--ok"><span className="d" /></span><span className="hint">OCR: 280 строк распознано</span></div>
                    <div className="row" style={{ gap: '0.5rem' }}><span className="badge badge--warn"><span className="d" /></span><span className="hint">12 позиций ниже порога уверенности</span></div>
                    <div className="row" style={{ gap: '0.5rem' }}><span className="badge badge--warn"><span className="d" /></span><span className="hint">МРТ мозга: +38% к медиане</span></div>
                    <div className="row" style={{ gap: '0.5rem' }}><span className="badge badge--err"><span className="d" /></span><span className="hint">4 позиции не сопоставлены</span></div>
                  </>
                )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
