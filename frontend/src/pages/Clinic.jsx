import { Link } from 'react-router-dom'

const priceList = [
  { s: 'МРТ головного мозга', cat: 'Диагностика', res: '18 900', nonres: '22 000' },
  { s: 'УЗИ брюшной полости', cat: 'Диагностика', res: '7 200', nonres: '8 600' },
  { s: 'Общий анализ крови', cat: 'Лаборатория', res: '1 800', nonres: '2 200' },
  { s: 'Биохимический анализ крови', cat: 'Лаборатория', res: '6 200', nonres: '7 400' },
  { s: 'Консультация терапевта', cat: 'Консультация', res: '4 500', nonres: '5 500' },
  { s: 'Электрокардиография', cat: 'Диагностика', res: '3 200', nonres: '3 900' },
  { s: 'Рентгенография грудной клетки', cat: 'Диагностика', res: '7 400', nonres: '8 800' },
]

export default function Clinic() {
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Витрина · партнёр</span>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>Клиника «Сункар» <span className="badge badge--ok"><span className="d" />Активна</span></h1>
          <p>Алматы · прайс актуален на 04.06.2026 · 2 документа в архиве.</p>
        </div>
        <div className="actions"><Link className="btn btn--outline" to="/search">К поиску</Link></div>
      </div>

      <div className="grid g-3">
        <div className="card span-2 rv">
          <div className="card__head"><h3>Полный прайс</h3><span className="sub">312 позиций · показаны ключевые</span></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Услуга</th><th>Категория</th><th className="num">Резидент</th><th className="num">Нерезидент</th></tr></thead>
              <tbody>
                {priceList.map(p => (
                  <tr key={p.s}>
                    <td className="t-main"><Link to="/service" style={{ color: 'inherit' }}>{p.s}</Link></td>
                    <td><span className="tag">{p.cat}</span></td>
                    <td className="num price">{p.res}<i>₸</i></td>
                    <td className="num t-strike">{p.nonres}₸</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="card rv">
            <div className="card__head"><h3>Контакты</h3></div>
            <div className="card__body kv">
              <div className="kv-row"><span className="k">Город</span><span className="v">Алматы</span></div>
              <div className="kv-row"><span className="k">Адрес</span><span className="v">пр. Достык, 240</span></div>
              <div className="kv-row"><span className="k">Телефон</span><span className="v num">+7 727 350 12 00</span></div>
              <div className="kv-row"><span className="k">E-mail</span><span className="v">info@sunkar.kz</span></div>
              <div className="kv-row"><span className="k">БИН</span><span className="v num">051140004821</span></div>
            </div>
          </div>
          <div className="card rv">
            <div className="card__head"><h3>Исходные документы</h3></div>
            <div className="card__body stack" style={{ gap: '0.7rem' }}>
              <Link to="/documents" className="row" style={{ justifyContent: 'space-between' }}><span className="t-main">Клиника 1 2026.pdf</span><span className="tag">Скан</span></Link>
              <Link to="/documents" className="row" style={{ justifyContent: 'space-between' }}><span className="t-main">Клиника 1 прайс 2024.docx</span><span className="tag">DOCX</span></Link>
              <div className="hint">Сравнение версий доступно по услуге.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
