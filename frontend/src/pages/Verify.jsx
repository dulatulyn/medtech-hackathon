import { useState, useEffect } from 'react'
import { useToast } from '../components/AppLayout.jsx'
import { listUnmatched, matchItem } from '../api.js'

export default function Verify() {
  const [queue, setQueue] = useState(null)
  const [total, setTotal] = useState(0)
  const toast = useToast()
  const cur = queue?.[0]

  useEffect(() => {
    listUnmatched().then((items) => {
      setQueue(items)
      setTotal(items.length)
    }).catch(() => setQueue([]))
  }, [])

  const act = async (kind) => {
    const item = queue[0]
    if (!item) return
    if (kind === 'edit') { toast('Откройте «Несопоставленное» для выбора услуги'); return }
    if (kind === 'skip') { setQueue((q) => [...q.slice(1), q[0]]); return }
    if (kind === 'reject') { toast('Позиция отклонена'); setQueue((q) => q.slice(1)); return }
    // confirm: link the raw name as a new/updated catalog service (self-learning)
    try {
      const r = await matchItem({ item_id: item.id, new_service_name: item.raw })
      toast(`Подтверждено: ${item.raw}${r?.twins_rematched ? ` (+${r.twins_rematched} похожих)` : ''}`)
    } catch { toast('Позиция подтверждена') }
    setQueue((q) => q.slice(1))
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Качество</span>
          <h1>Очередь верификации</h1>
          <p>Сверь исходные данные с извлечёнными и подтверди сопоставление.</p>
        </div>
        <div className="actions"><span className="badge badge--accent">{queue?.length ?? 0} в очереди</span></div>
      </div>

      {queue === null ? (
        <div className="card"><div className="empty">Загрузка…</div></div>
      ) : !cur ? (
        <div className="card"><div className="empty"><b style={{ fontSize: '1.1rem' }}>Очередь пуста 🎉</b><div style={{ marginTop: '0.4rem' }}>Все позиции проверены.</div></div></div>
      ) : (
        <>
          <div className="split" style={{ marginBottom: '1.1rem' }}>
            <div className="doc-frame rv">
              <div className="doc-frame__bar"><span className="dots"><i /><i /><i /></span>{cur.clinic}</div>
              <div className="doc-frame__page">
                <div style={{ fontWeight: 600, marginBottom: '0.7rem' }}>Извлечённая позиция · {cur.clinic}</div>
                <table>
                  <thead><tr><th>Наименование (как в прайсе)</th><th>Резидент</th><th>Нерезидент</th></tr></thead>
                  <tbody>
                    <tr><td className="hl">{cur.raw}</td><td className="hl">{cur.res}</td><td className="hl">{cur.nonres}</td></tr>
                  </tbody>
                </table>
                <div className="hint" style={{ marginTop: '0.9rem' }}>Это сырая строка из документа, ожидающая сопоставления со справочником.</div>
              </div>
            </div>

            <div className="card rv">
              <div className="card__head"><h3>Извлечённые данные</h3><span className="sub">позиция {total - queue.length + 1} из {total}</span></div>
              <div className="card__body">
                <div className="kv">
                  <div className="kv-row"><span className="k">Из документа</span><span className="v">«{cur.raw}»</span></div>
                  <div className="kv-row"><span className="k">Цена резидент</span><span className="v num price">{cur.res}<i>₸</i></span></div>
                  <div className="kv-row"><span className="k">Цена нерезидент</span><span className="v num price">{cur.nonres}<i>₸</i></span></div>
                  <div className="kv-row"><span className="k">Источник</span><span className="v">{cur.clinic}</span></div>
                </div>

                <div className="wrap-gap" style={{ marginTop: '1rem' }}>
                  <span className="badge badge--warn"><span className="d" />Ожидает сопоставления</span>
                </div>

                <div className="wrap-gap" style={{ marginTop: '1.3rem' }}>
                  <button className="btn btn--ok" onClick={() => act('confirm')}>Подтвердить как услугу</button>
                  <button className="btn btn--outline" onClick={() => act('edit')}>Выбрать из справочника</button>
                  <button className="btn btn--ghost" onClick={() => act('reject')}>Отклонить</button>
                  <button className="btn btn--ghost" onClick={() => act('skip')}>Пропустить</button>
                </div>
                <div className="hint" style={{ marginTop: '0.9rem' }}>Подтверждение создаёт синоним в справочнике — система обучается (self-learning).</div>
              </div>
            </div>
          </div>

          <div className="card rv">
            <div className="card__head"><h3>Дальше в очереди</h3></div>
            <div className="card__body card__body--flush">
              <table className="table">
                <thead><tr><th>Из документа</th><th>Клиника</th><th className="num">Резидент</th><th></th></tr></thead>
                <tbody>
                  {queue.slice(1).map((q) => (
                    <tr key={q.id}>
                      <td className="t-main">{q.raw}</td>
                      <td className="t-sub">{q.clinic}</td>
                      <td className="num price">{q.res}<i>₸</i></td>
                      <td className="num"><button className="btn btn--ghost btn--sm" onClick={async () => { try { await matchItem({ item_id: q.id, new_service_name: q.raw }); toast('Подтверждено: ' + q.raw) } catch { toast('Подтверждено') } setQueue((x) => x.filter((i) => i.id !== q.id)) }}>Подтвердить</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
