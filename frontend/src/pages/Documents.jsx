import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { documents, statusLabel } from '../data.js'
import { listDocuments, getDocument } from '../api.js'
import { Skeleton, SkeletonRows } from '../components/Skeleton.jsx'

const MAX_ROWS = 60 // documents can hold thousands of items — cap the drill-in table

export default function Documents() {
  const [active, setActive] = useState(0)
  const [docs, setDocs] = useState(documents)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [detail, setDetail] = useState(null)
  const [dLoading, setDLoading] = useState(false)

  useEffect(() => {
    listDocuments().then(d => {
      if (d.length) {
        setDocs(d)
        // default-select a document that has something to show (prefer one on review)
        const pick = d.find(x => x.status === 'warn') || d.find(x => x.status === 'ok') || d[0]
        if (pick) setSel(pick.id)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!sel) return
    setDLoading(true)
    getDocument(sel).then(setDetail).catch(() => setDetail(null)).finally(() => setDLoading(false))
  }, [sel])

  const total = docs.length
  const ready = docs.filter(d => d.status === 'ok').length
  const extracted = docs.reduce((s, d) => s + (d.items || 0), 0)

  const chips = useMemo(() => {
    const by = s => docs.filter(d => d.status === s).length
    return [
      { t: `Все · ${total}`, f: null },
      { t: `Готово · ${ready}`, f: 'ok' },
      { t: `На ревью · ${by('warn')}`, f: 'warn' },
      { t: `Обработка · ${by('info')}`, f: 'info' },
      { t: `В очереди · ${by('pend')}`, f: 'pend' },
    ]
  }, [docs, total, ready])

  const filter = chips[active]?.f
  const visible = filter ? docs.filter(d => d.status === filter) : docs

  return (
    <>
      <div className="phero">
        <div className="phero__head">
          <span className="phero__eyebrow">Данные</span>
          <h1 className="phero__title">Документы</h1>
          <p className="phero__sub">Прайс-документы партнёров — кликни строку, чтобы увидеть извлечённые позиции и лог обработки.</p>
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
            <button className={'chip' + (i === active ? ' on' : '')} key={c.t} onClick={() => setActive(i)}>{c.t}</button>
          ))}
        </div>
        <Link className="btn btn--accent" to="/upload" style={{ marginLeft: 'auto' }}>Загрузить ещё</Link>
      </div>

      <div className="card rv" style={{ marginBottom: '1.2rem' }}>
        <div className="card__head">
          <h3>Все документы</h3>
          <span className="sub">{loading ? <Skeleton w={70} h={12} /> : `${visible.length} файлов`}</span>
        </div>
        <div className="card__body card__body--flush">
          <table className="table">
            <thead><tr><th>Файл</th><th>Клиника</th><th>Формат</th><th>Дата прайса</th><th>Статус</th><th className="num">Позиций</th></tr></thead>
            <tbody>
              {loading
                ? <SkeletonRows n={8} cols={6} />
                : visible.map(d => {
                  const m = statusLabel[d.status]
                  return (
                    <tr key={d.id || d.file} className={'row-click' + (d.id === sel ? ' row-on' : '')} onClick={() => d.id && setSel(d.id)}>
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
            <h3>{detail?.file || 'Выберите документ'}</h3>
            {detail && <span className={'badge badge--' + detail.status}><span className="d" />{statusLabel[detail.status]?.t}</span>}
            {detail && <span className="sub">{detail.clinic} · {detail.city}</span>}
          </div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Услуга (как в документе)</th><th>Резидент</th><th>Нерезидент</th><th>Сопоставление</th></tr></thead>
              <tbody>
                {dLoading
                  ? <SkeletonRows n={6} cols={4} />
                  : !detail ? (
                    <tr><td colSpan={4}><div className="empty">Кликните документ в таблице выше.</div></td></tr>
                  ) : detail.rows.length === 0 ? (
                    <tr><td colSpan={4}><div className="empty">Позиции ещё не извлечены.</div></td></tr>
                  ) : detail.rows.slice(0, MAX_ROWS).map((r, i) => (
                    <tr key={i} className={r.flag ? 'row-flag' : ''}>
                      <td className="t-main">{r.raw}</td>
                      <td className="num price">{r.res}<i>₸</i></td>
                      <td className="num price">{r.nonres}<i>₸</i></td>
                      <td><span className={'badge badge--' + r.match}><span className="d" />{r.label}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {detail && detail.rows.length > MAX_ROWS && (
              <div className="hint" style={{ padding: '0.7rem 1rem' }}>Показаны первые {MAX_ROWS} из {detail.rows.length} позиций.</div>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card rv">
            <div className="card__head"><h3>Метаданные</h3></div>
            <div className="card__body kv">
              {dLoading || !detail
                ? Array.from({ length: 4 }).map((_, i) => (
                  <div className="kv-row" key={i}><Skeleton w={90} h={12} /><Skeleton w={120} h={12} /></div>
                ))
                : (
                  <>
                    <div className="kv-row"><span className="k">Партнёр</span><span className="v">{detail.meta.partner}</span></div>
                    <div className="kv-row"><span className="k">Формат</span><span className="v">{detail.meta.format}</span></div>
                    <div className="kv-row"><span className="k">Извлечено</span><span className="v num">{detail.meta.extracted} позиций</span></div>
                    <div className="kv-row"><span className="k">Дата прайса</span><span className="v">{detail.meta.date}</span></div>
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
              <div className="kv-row"><span className="k">Текущая версия</span><span className="v num">{detail?.meta.date?.slice(0, 4) || '2026'}</span></div>
              <div className="kv-row"><span className="k">Предыдущие</span><span className="v">в архиве</span></div>
              <div className="kv-row"><span className="k">Срок хранения</span><span className="v">бессрочно</span></div>
            </div>
          </div>

          <div className="card rv">
            <div className="card__head"><h3>Лог обработки</h3></div>
            <div className="card__body stack" style={{ gap: '0.6rem' }}>
              {dLoading || !detail
                ? Array.from({ length: 4 }).map((_, i) => (
                  <div className="row" key={i} style={{ gap: '0.5rem' }}><Skeleton w={14} h={14} r="50%" /><Skeleton w="70%" h={12} /></div>
                ))
                : detail.log.map((l, i) => (
                  <div className="row" key={i} style={{ gap: '0.5rem' }}><span className={'badge badge--' + l.lvl}><span className="d" /></span><span className="hint">{l.text}</span></div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
