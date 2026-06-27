import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { firstClinicDetail } from '../api.js'

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
  const [detail, setDetail] = useState(null)
  useEffect(() => { firstClinicDetail().then(d => d && setDetail(d)).catch(() => {}) }, [])

  const partner = detail?.partner
  const list = detail?.items?.length
    ? detail.items.map(it => ({ s: it.service, cat: '', res: it.res, nonres: it.nonres, flag: it.flag }))
    : priceList

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Витрина · партнёр</span>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>Клиника «{partner?.name || 'Сункар'}» <span className={'badge badge--' + (partner && !partner.is_active ? 'err' : 'ok')}><span className="d" />{partner && !partner.is_active ? 'Неактивна' : 'Активна'}</span></h1>
          <p>{partner?.city || 'Алматы'} · {list.length} услуг в прайсе.</p>
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
                {list.map((p, i) => (
                  <tr key={p.s + i} className={p.flag ? 'row-flag' : ''}>
                    <td className="t-main"><Link to="/service" style={{ color: 'inherit' }}>{p.s}</Link></td>
                    <td>{p.cat ? <span className="tag">{p.cat}</span> : null}</td>
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
