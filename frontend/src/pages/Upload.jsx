import { Link } from 'react-router-dom'
import { useToast } from '../components/AppLayout.jsx'

const dropCss = `
.drop { border: 1.5px dashed var(--line-2); border-radius: var(--r); background: radial-gradient(120% 80% at 50% 0%, #fff, var(--bg)); padding: 3rem 2rem; text-align: center; transition: border-color .3s var(--ease), background .3s var(--ease); }
.drop:hover { border-color: var(--accent); }
.drop .ic { width: 56px; height: 56px; margin: 0 auto 1rem; border-radius: 16px; background: var(--accent-weak); display: grid; place-items: center; }
.drop .ic svg { width: 26px; height: 26px; stroke: var(--accent); stroke-width: 1.6; fill: none; }
.drop h3 { font-size: 1.15rem; font-weight: 600; letter-spacing: -0.02em; }
.drop p { color: var(--gray); margin: 0.4rem 0 1.2rem; }
.fmt { display: inline-flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; margin-top: 1.3rem; }
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

export default function Upload() {
  const toast = useToast()
  return (
    <>
      <style>{dropCss}</style>
      <div className="page-head">
        <div>
          <span className="eyebrow">Данные</span>
          <h1>Загрузка архива</h1>
          <p>Загрузи ZIP с прайсами или отдельные файлы — система сама определит формат и поставит в очередь.</p>
        </div>
      </div>

      <div className="grid g-3" style={{ marginBottom: '1.1rem' }}>
        <div className="card span-2 rv">
          <div className="card__body">
            <div className="drop">
              <div className="ic"><svg viewBox="0 0 24 24"><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /><path d="M12 16V4" /><path d="M8 8l4-4 4 4" /></svg></div>
              <h3>Перетащи архив сюда</h3>
              <p>ZIP до 200 МБ · или отдельные PDF, сканы, Excel, Word</p>
              <button className="btn btn--accent" onClick={() => toast('Демо: выбор файлов')}>Выбрать файлы</button>
              <div className="fmt"><span className="tag">PDF</span><span className="tag">Скан + OCR</span><span className="tag">XLSX / XLS</span><span className="tag">DOCX</span><span className="tag">ZIP</span></div>
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
        <div className="card__head"><h3>Очередь обработки</h3><span className="sub">10 файлов в текущем архиве</span><div className="actions"><Link className="btn btn--ghost btn--sm" to="/documents">К документам</Link></div></div>
        <div className="card__body card__body--flush">
          <table className="table">
            <thead><tr><th>Файл</th><th>Формат</th><th>Размер</th><th>Статус</th><th style={{ width: 220 }}>Прогресс</th></tr></thead>
            <tbody>
              {queue.map(q => (
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
