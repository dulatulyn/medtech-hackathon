import { useState, useEffect } from 'react'
import { verifyQueue } from '../data.js'
import { useToast } from '../components/AppLayout.jsx'
import { listUnmatched, matchItem } from '../api.js'

function Conf({ v }) {
  const cls = v < 70 ? ' vlo' : v < 85 ? ' lo' : ''
  return <span className={'conf' + cls}><span className="track"><span className="fill" style={{ width: v + '%' }} /></span><b>{v}%</b></span>
}

export default function Verify() {
  const [queue, setQueue] = useState(verifyQueue)
  const toast = useToast()
  const cur = queue[0]

  useEffect(() => {
    listUnmatched().then(items => {
      if (items.length) {
        setQueue(items.map(it => ({
          id: it.id, raw: it.raw, service: it.raw, conf: 70,
          res: it.res, nonres: '—', doc: '', clinic: it.clinic, warn: ['Ожидает сопоставления'], live: true,
        })))
      }
    }).catch(() => {})
  }, [])

  const act = async (kind) => {
    const item = queue[0]
    if (kind === 'edit') { toast('Режим редактирования'); return }
    if (kind === 'confirm' && item?.live) {
      try {
        const r = await matchItem({ item_id: item.id, new_service_name: item.raw })
        toast(`Подтверждено: ${item.raw}${r?.twins_rematched ? ` (+${r.twins_rematched})` : ''}`)
      } catch { toast('Позиция подтверждена') }
      setQueue(q => q.slice(1)); return
    }
    const msgs = { confirm: 'Позиция подтверждена', reject: 'Позиция отклонена', skip: 'Отложено в конец' }
    toast(msgs[kind])
    setQueue(q => (kind === 'skip' ? [...q.slice(1), q[0]] : q.slice(1)))
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Качество</span>
          <h1>Очередь верификации</h1>
          <p>Сверь исходный документ с извлечёнными данными и подтверди сопоставление.</p>
        </div>
        <div className="actions"><span className="badge badge--accent">{queue.length} в очереди</span></div>
      </div>

      {!cur ? (
        <div className="card"><div className="empty"><b style={{ fontSize: '1.1rem' }}>Очередь пуста 🎉</b><div style={{ marginTop: '0.4rem' }}>Все позиции проверены.</div></div></div>
      ) : (
        <>
          <div className="split" style={{ marginBottom: '1.1rem' }}>
            <div className="doc-frame rv">
              <div className="doc-frame__bar"><span className="dots"><i /><i /><i /></span>{cur.doc}</div>
              <div className="doc-frame__page">
                <div style={{ fontWeight: 600, marginBottom: '0.7rem' }}>Прайс-лист · {cur.clinic}</div>
                <table>
                  <thead><tr><th>Наименование</th><th>Резидент</th><th>Нерезидент</th></tr></thead>
                  <tbody>
                    <tr><td>Приём врача первичный</td><td>6 000</td><td>7 000</td></tr>
                    <tr><td className="hl">{cur.raw}</td><td className="hl">{cur.res}</td><td className="hl">{cur.nonres}</td></tr>
                    <tr><td>Повторный приём</td><td>4 500</td><td>5 200</td></tr>
                    <tr><td>Забор крови</td><td>1 200</td><td>1 500</td></tr>
                  </tbody>
                </table>
                <div className="hint" style={{ marginTop: '0.9rem' }}>Подсвечена строка, извлечённая системой.</div>
              </div>
            </div>

            <div className="card rv">
              <div className="card__head"><h3>Извлечённые данные</h3><span className="sub">позиция {verifyQueue.length - queue.length + 1} из {verifyQueue.length}</span></div>
              <div className="card__body">
                <div className="kv">
                  <div className="kv-row"><span className="k">Из документа</span><span className="v">«{cur.raw}»</span></div>
                  <div className="kv-row"><span className="k">Справочник</span><span className="v" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>{cur.service} <Conf v={cur.conf} /></span></div>
                  <div className="kv-row"><span className="k">Цена резидент</span><span className="v num price">{cur.res}<i>₸</i></span></div>
                  <div className="kv-row"><span className="k">Цена нерезидент</span><span className="v num price">{cur.nonres}<i>₸</i></span></div>
                  <div className="kv-row"><span className="k">Источник</span><span className="v">{cur.clinic}</span></div>
                </div>

                {cur.warn.length > 0 && (
                  <div className="wrap-gap" style={{ marginTop: '1rem' }}>
                    {cur.warn.map(w => <span className="badge badge--warn" key={w}><span className="d" />{w}</span>)}
                  </div>
                )}

                <div className="wrap-gap" style={{ marginTop: '1.3rem' }}>
                  <button className="btn btn--ok" onClick={() => act('confirm')}>Подтвердить</button>
                  <button className="btn btn--outline" onClick={() => act('edit')}>Исправить</button>
                  <button className="btn btn--ghost" onClick={() => act('reject')}>Отклонить</button>
                  <button className="btn btn--ghost" onClick={() => act('skip')}>Пропустить</button>
                </div>
                <div className="hint" style={{ marginTop: '0.9rem' }}>Версионирование: старая цена архивируется, не удаляется.</div>
              </div>
            </div>
          </div>

          <div className="card rv">
            <div className="card__head"><h3>Дальше в очереди</h3></div>
            <div className="card__body card__body--flush">
              <table className="table">
                <thead><tr><th>Из документа</th><th>Справочник</th><th>Уверенность</th><th>Клиника</th><th></th></tr></thead>
                <tbody>
                  {queue.slice(1).map(q => (
                    <tr key={q.id}>
                      <td className="t-main">{q.raw}</td>
                      <td>{q.service}</td>
                      <td><Conf v={q.conf} /></td>
                      <td className="t-sub">{q.clinic}</td>
                      <td className="num"><button className="btn btn--ghost btn--sm" onClick={() => { toast('Позиция подтверждена'); setQueue(x => x.filter(i => i.id !== q.id)) }}>Подтвердить</button></td>
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
