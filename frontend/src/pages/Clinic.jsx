import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { firstClinicDetail } from '../api.js'
import { Skeleton, SkeletonRows } from '../components/Skeleton.jsx'

const MAX_ROWS = 60 // a clinic can list thousands of services — cap the table

export default function Clinic() {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { firstClinicDetail().then(d => d && setDetail(d)).catch(() => {}).finally(() => setLoading(false)) }, [])

  const partner = detail?.partner
  const list = detail?.items || []
  const contacts = partner ? [
    ['Город', partner.city],
    ['Адрес', partner.address],
    ['Телефон', partner.contact_phone],
    ['E-mail', partner.contact_email],
    ['БИН', partner.bin],
  ].filter(([, v]) => v) : []

  return (
    <>
      <div className="phero">
        <div className="phero__head">
          <span className="phero__eyebrow">Витрина</span>
          <h1 className="phero__title" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            Клиника «{partner?.name || '—'}»
            <span className={'badge badge--' + (partner && !partner.is_active ? 'err' : 'ok')}><span className="d" />{partner && !partner.is_active ? 'Неактивна' : 'Активна'}</span>
          </h1>
          <p className="phero__sub">{partner?.city || 'прайс-лист'}</p>
        </div>
        <div className="phero__metrics">
          <div className="phero__metric">
            {loading ? <Skeleton w="2.6rem" h="2rem" r="8px" /> : <b className="num">{list.length.toLocaleString('ru-RU')}</b>}
            <span>услуг в прайсе</span>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <Link className="btn btn--outline" to="/search">К поиску</Link>
      </div>

      <div className="grid g-3">
        <div className="card span-2 rv">
          <div className="card__head"><h3>Полный прайс</h3><span className="sub">{loading ? '' : `${list.length.toLocaleString('ru-RU')} позиций`}</span></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Услуга</th><th className="num">Резидент</th><th className="num">Нерезидент</th></tr></thead>
              <tbody>
                {loading
                  ? <SkeletonRows n={8} cols={3} />
                  : list.length === 0
                    ? <tr><td colSpan={3}><div className="empty">Нет позиций.</div></td></tr>
                    : list.slice(0, MAX_ROWS).map((p, i) => (
                      <tr key={i} className={p.flag ? 'row-flag' : ''}>
                        <td className="t-main">{p.service}</td>
                        <td className="num price">{p.res}<i>₸</i></td>
                        <td className="num t-strike">{p.nonres}₸</td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!loading && list.length > MAX_ROWS && (
              <div className="hint" style={{ padding: '0.7rem 1rem' }}>Показаны первые {MAX_ROWS} из {list.length.toLocaleString('ru-RU')} позиций.</div>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card rv">
            <div className="card__head"><h3>Контакты</h3></div>
            <div className="card__body kv">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                  <div className="kv-row" key={i}><span className="k"><Skeleton w="3.4rem" /></span><span className="v"><Skeleton w="62%" /></span></div>
                ))
                : contacts.length
                  ? contacts.map(([k, v]) => (
                    <div className="kv-row" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
                  ))
                  : <div className="hint">Контактные данные в прайсе не указаны.</div>}
            </div>
          </div>
          <div className="card rv">
            <div className="card__head"><h3>Исходные документы</h3></div>
            <div className="card__body stack" style={{ gap: '0.7rem' }}>
              <Link to="/documents" className="row" style={{ justifyContent: 'space-between' }}>
                <span className="t-main">Все документы клиники</span><span className="tag">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
