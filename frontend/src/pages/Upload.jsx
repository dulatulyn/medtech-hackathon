import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/AppLayout.jsx'
import { uploadArchive, listDocuments } from '../api.js'

const FMT = { xlsx: 'XLSX', xls: 'XLS', pdf: 'PDF', scan_pdf: 'Скан', docx: 'DOCX' }
const ST = { ok: ['ok', 'Готово', 100], warn: ['warn', 'Нужно ревью', 100], info: ['info', 'Обработка', 64], pend: ['pend', 'В очереди', 0], err: ['err', 'Ошибка', 100] }

const dropCss = `
.drop { position: relative; border: 1.6px dashed var(--line-2); border-radius: var(--r); background: radial-gradient(130% 90% at 50% 0%, #fff, var(--surface-2) 70%, var(--bg)); padding: 3.6rem 2rem 3.2rem; text-align: center; transition: border-color .3s var(--ease), background .3s var(--ease); }
.drop:hover { border-color: var(--accent); }
.drop .ic { width: 68px; height: 68px; margin: 0 auto 1.2rem; border-radius: 20px; background: var(--accent-weak); display: grid; place-items: center; }
.drop .ic svg { width: 30px; height: 30px; stroke: var(--accent); stroke-width: 1.6; fill: none; }
.drop h3 { font-size: 1.42rem; font-weight: 600; letter-spacing: -0.03em; }
.drop p { color: var(--gray); margin: 0.5rem 0 1.4rem; font-size: 0.95rem; }
.drop .hint-row { margin-top: 1rem; font-size: 0.78rem; color: var(--gray-2); }
.fmts-band { margin-top: 1.7rem; padding-top: 1.5rem; border-top: 1px solid var(--hair); }
.fmts-band .lbl { display: block; font-size: 0.64rem; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); margin-bottom: 1rem; }
.fmts { display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 0.7rem; }
.fmt-chip { display: flex; align-items: center; gap: 0.65rem; padding: 0.7rem 0.85rem; border-radius: 15px; background: var(--surface); border: 1px solid var(--hair); box-shadow: var(--ashadow-sm); text-align: left; transition: box-shadow .3s var(--ease), transform .3s var(--ease); }
.fmt-chip:hover { box-shadow: var(--ashadow); transform: translateY(-2px); }
.fmt-chip .ab { width: 38px; height: 38px; border-radius: 11px; flex: none; display: grid; place-items: center; background: var(--ink); color: #fff; font-size: 0.6rem; font-weight: 600; letter-spacing: 0.03em; }
.fmt-chip .tx b { font-size: 0.85rem; font-weight: 600; letter-spacing: -0.01em; display: block; line-height: 1.1; }
.fmt-chip .tx span { font-size: 0.72rem; color: var(--gray-2); }
`

const queue = [
  { f: 'Клиника 6 прайс 2026.xlsx', fmt: 'XLSX', size: '538 КБ', st: 'ok', t: 'Готово', p: 100 },
  { f: 'Клиника 2 прайс 2026.pdf', fmt: 'PDF', size: '809 КБ', st: 'ok', t: 'Готово', p: 100 },
  { f: 'Клиника 7_Прайс 2026.xls', fmt: 'XLS', size: '920 КБ', st: 'info', t: 'Обработка · OCR', p: 64 },
  { f: 'Клиника 3 прайс 2026.PDF', fmt: 'Скан', size: '1.2 МБ', st: 'warn', t: 'Нужно ревью', p: 100, warn: true },
  { f: 'Клиника 1 2026.pdf', fmt: 'Скан', size: '3.7 МБ', st: 'ok', t: 'Готово', p: 100 },
  { f: 'Клиника 4 прайс 2026.pdf', fmt: 'PDF', size: '1.2 МБ', st: 'pend', t: 'В очереди', p: 0 },
]

const steps = [
  ['Определение формата', 'текст / скан / таблица распознаются автоматически'],
  ['Извлечение', 'парсер под формат + OCR для сканов'],
  ['Нормализация', 'услуги сводятся к единому справочнику'],
  ['Очередь верификации', 'спорное уходит оператору'],
]

const formats = [
  ['PDF', 'PDF', 'текстовые прайсы'],
  ['OCR', 'Скан + OCR', 'фото и сканы'],
  ['XLS', 'Excel · XLSX / XLS', 'таблицы и выгрузки'],
  ['DOC', 'Word · DOCX', 'документы'],
  ['ZIP', 'ZIP-архив', 'пакетная загрузка'],
]

export default function Upload() {
  const toast = useToast()
  const fileRef = useRef(null)
  const [rows, setRows] = useState(queue)
  const [busy, setBusy] = useState(false)

  const refresh = () =>
    listDocuments()
      .then(docs => {
        if (docs.length) {
          const [, , ] = []
          setRows(docs.slice(0, 20).map(d => {
            const st = ST[d.status] || ST.info
            return { f: d.file, fmt: FMT[d.format] || d.format, size: '—', st: st[0], t: d.parse_log || st[1], p: st[2], warn: d.status === 'warn' }
          }))
        }
      })
      .catch(() => {})

  useEffect(() => { refresh() }, [])

  async function onPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    toast('Загрузка: ' + file.name)
    try {
      const r = await uploadArchive(file)
      const matched = r.results.reduce((s, x) => s + (x.matched || 0), 0)
      toast(`Импортировано ${r.documents} док., сопоставлено ${matched} позиций`)
      await refresh()
    } catch {
      toast('Ошибка загрузки (нужен ZIP)')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const total = rows.length
  const ready = rows.filter(r => r.st === 'ok').length
  const review = rows.filter(r => r.warn || r.st === 'warn').length
  const autonorm = total ? Math.round((ready / total) * 100) : 0

  return (
    <>
      <style>{dropCss}</style>

      <div className="phero">
        <div className="phero__head">
          <span className="phero__eyebrow">Данные</span>
          <h1 className="phero__title">Загрузка архива</h1>
          <p className="phero__sub">Перетащи ZIP с прайсами или отдельные файлы — система сама определит формат, распознаёт сканы и ставит всё в очередь обработки.</p>
        </div>
        <div className="phero__metrics">
          <div className="phero__metric"><b className="num">{total}</b><span>файлов</span></div>
          <div className="phero__metric"><b className="num">{autonorm}<small>%</small></b><span>авто-норм.</span></div>
          <div className="phero__metric"><b className="num">{review}</b><span>на ревью</span></div>
        </div>
      </div>

      <div className="grid g-3" style={{ marginBottom: '1.2rem' }}>
        <div className="card span-2 rv">
          <div className="card__body">
            <div className="drop">
              <div className="ic"><svg viewBox="0 0 24 24"><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /><path d="M12 16V4" /><path d="M8 8l4-4 4 4" /></svg></div>
              <h3>Перетащи архив или файлы сюда</h3>
              <p>ZIP до 200 МБ · или отдельные PDF, сканы, Excel, Word</p>
              <input ref={fileRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={onPick} />
              <button className="btn btn--accent" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'Обработка…' : 'Выбрать ZIP-архив'}</button>
              <div className="hint-row">Любой из форматов ниже распознаётся автоматически</div>
              <div className="fmts-band">
                <span className="lbl">Поддерживаемые форматы</span>
                <div className="fmts">
                  {formats.map(([ab, title, sub]) => (
                    <div className="fmt-chip" key={ab}>
                      <span className="ab">{ab}</span>
                      <span className="tx"><b>{title}</b><span>{sub}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card rv">
          <div className="card__head"><h3>Как это работает</h3></div>
          <div className="card__body stack" style={{ gap: '1rem' }}>
            {steps.map((s, i) => (
              <div className="row" key={i} style={{ alignItems: 'flex-start', gap: '0.7rem' }}>
                <span className="badge badge--accent">{i + 1}</span>
                <div><b>{s[0]}</b><div className="hint">{s[1]}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card rv">
        <div className="card__head"><h3>Очередь обработки</h3><span className="sub">{rows.length} файлов</span><div className="actions"><Link className="btn btn--ghost btn--sm" to="/documents">К документам</Link></div></div>
        <div className="card__body card__body--flush">
          <table className="table">
            <thead><tr><th>Файл</th><th>Формат</th><th>Размер</th><th>Статус</th><th style={{ width: 220 }}>Прогресс</th></tr></thead>
            <tbody>
              {rows.map(q => (
                <tr key={q.f}>
                  <td className="t-main">{q.f}</td>
                  <td><span className="tag">{q.fmt}</span></td>
                  <td className="t-sub">{q.size}</td>
                  <td><span className={'badge badge--' + q.st}><span className="d" />{q.t}</span></td>
                  <td><div className="progress"><i style={{ width: q.p + '%', background: q.warn ? 'var(--warn)' : undefined }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
