import { useState } from 'react'
import { unmatched } from '../data.js'
import { useToast } from '../components/AppLayout.jsx'
import * as I from '../icons.jsx'

export default function Match() {
  const [items, setItems] = useState(unmatched)
  const toast = useToast()

  const resolve = (id, msg) => { toast(msg); setItems(x => x.filter(i => i.id !== id)) }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Качество</span>
          <h1>Несопоставленное</h1>
          <p>Позиции ниже порога уверенности. Выбери услугу из справочника или создай новую.</p>
        </div>
        <div className="actions"><span className="badge badge--accent">{items.length} в очереди</span></div>
      </div>

      {items.length === 0 ? (
        <div className="card"><div className="empty"><b style={{ fontSize: '1.1rem' }}>Всё сопоставлено 🎉</b></div></div>
      ) : (
        <div className="stack">
          {items.map(it => (
            <div className="card rv" key={it.id}>
              <div className="card__body">
                <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div className="row" style={{ gap: '0.7rem' }}>
                    <span className="cell"><span className="logo">{it.clinic.slice(0, 2)}</span></span>
                    <div>
                      <div className="t-main" style={{ fontSize: '1.05rem' }}>«{it.raw}»</div>
                      <div className="t-sub">{it.clinic} · {it.doc}</div>
                    </div>
                  </div>
                  <span className="badge badge--err"><span className="d" />не сопоставлено</span>
                </div>

                <div style={{ marginTop: '1.1rem' }}>
                  {it.sugg.length > 0 ? (
                    <>
                      <div className="hint" style={{ marginBottom: '0.5rem' }}>Предложения системы</div>
                      <div className="wrap-gap">
                        {it.sugg.map(s => (
                          <button className="chip" key={s.name} onClick={() => resolve(it.id, 'Сопоставлено: ' + s.name)}>
                            {s.name} <b style={{ color: s.conf >= 75 ? 'var(--ok)' : 'var(--warn)', marginLeft: '0.3rem' }}>{s.conf}%</b>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : <div className="hint">Совпадений в справочнике не найдено.</div>}
                </div>

                <div className="row" style={{ marginTop: '1.2rem', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <div className="search-in" style={{ flex: 1, minWidth: 220 }}>
                    <I.Search />
                    <input className="input" placeholder="Найти услугу в справочнике…" />
                  </div>
                  <button className="btn btn--dark" onClick={() => resolve(it.id, 'Создана новая услуга')}>Создать услугу</button>
                  <button className="btn btn--ghost" onClick={() => resolve(it.id, 'Отложено')}>Пропустить</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
