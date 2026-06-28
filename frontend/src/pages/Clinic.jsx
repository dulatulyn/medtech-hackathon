import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getClinicDetail, listPartners } from '../api.js'

export default function Clinic() {
  const { id } = useParams()
  const [detail, setDetail] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      let pid = id
      if (!pid) {
        const ps = await listPartners().catch(() => [])
        pid = ps[0]?.id
      }
      if (!pid) { setMissing(true); return }
      const d = await getClinicDetail(pid).catch(() => null)
      if (!cancelled) { if (d?.partner) setDetail(d); else setMissing(true) }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (missing) return <div className="card"><div className="empty">Клиника не найдена.</div></div>
  if (!detail) return <div className="card"><div className="empty">Загрузка…</div></div>

  const { partner, items, documents } = detail

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Витрина · партнёр</span>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>Клиника «{partner.name}» <span className={'badge badge--' + (partner.is_active ? 'ok' : 'err')}><span className="d" />{partner.is_active ? 'Активна' : 'Неактивна'}</span></h1>
          <p>{partner.city || '—'} · {items.length} услуг в прайсе.</p>
        </div>
        <div className="actions"><Link className="btn btn--outline" to="/search">К поиску</Link></div>
      </div>

      <div className="grid g-3">
        <div className="card span-2 rv">
          <div className="card__head"><h3>Полный прайс</h3><span className="sub">{items.length} позиций</span></div>
          <div className="card__body card__body--flush">
            <table className="table">
              <thead><tr><th>Услуга</th><th className="num">Резидент</th><th className="num">Нерезидент</th><th>Метод</th></tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan="4"><div className="empty">Прайс пуст.</div></td></tr> :
                  items.map((p, i) => (
                    <tr key={p.service + i} className={p.flag ? 'row-flag' : ''}>
                      <td className="t-main">{p.service_id ? <Link to={`/service/${p.service_id}`} style={{ color: 'inherit' }}>{p.service}</Link> : p.service}</td>
                      <td className="num price">{p.res}<i>₸</i></td>
                      <td className="num t-strike">{p.nonres}₸</td>
                      <td><span className="tag">{p.method}</span></td>
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
              <div className="kv-row"><span className="k">Город</span><span className="v">{partner.city || '—'}</span></div>
              <div className="kv-row"><span className="k">Адрес</span><span className="v">{partner.address || '—'}</span></div>
              <div className="kv-row"><span className="k">Телефон</span><span className="v num">{partner.contact_phone || '—'}</span></div>
              <div className="kv-row"><span className="k">E-mail</span><span className="v">{partner.contact_email || '—'}</span></div>
              <div className="kv-row"><span className="k">БИН</span><span className="v num">{partner.bin || '—'}</span></div>
            </div>
          </div>
          <div className="card rv">
            <div className="card__head"><h3>Исходные документы</h3></div>
            <div className="card__body stack" style={{ gap: '0.7rem' }}>
              {documents.length === 0 ? <div className="hint">Документов нет.</div> :
                documents.map((d) => (
                  <Link to="/documents" key={d.id} className="row" style={{ justifyContent: 'space-between' }}><span className="t-main">{d.file}</span><span className="tag">{d.format}</span></Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
