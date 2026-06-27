import { useState, useEffect, useCallback } from 'react'
import { verifyQueue } from '../data.js'
import { useToast } from '../components/AppLayout.jsx'
import { listUnmatched, matchItem } from '../api.js'
import { Skeleton } from '../components/Skeleton.jsx'

const css = `
.vrf { display: grid; grid-template-columns: 1.55fr 1fr; gap: 1.1rem; align-items: start; }
.vrf-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--ashadow); padding: clamp(1.4rem, 2.6vw, 2.1rem); }
.vrf-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.3rem; }
.vrf-step { font-size: 0.78rem; color: var(--gray-2); letter-spacing: 0.03em; }
.vrf-raw { font-size: clamp(1.7rem, 3.4vw, 2.5rem); font-weight: 600; letter-spacing: -0.035em; line-height: 1.04; color: var(--ink); }
.vrf-from { margin-top: 0.5rem; font-size: 0.92rem; color: var(--gray); }
.vrf-prices { display: flex; gap: 2.4rem; margin: 1.5rem 0; padding: 1.1rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.vrf-price span { display: block; font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gray-2); margin-bottom: 0.3rem; }
.vrf-price b { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.03em; }
.vrf-price b i { font-style: normal; color: var(--gray-2); font-weight: 400; font-size: 0.7em; margin-left: 1px; }
.vrf-assign { margin-top: 0.4rem; }
.vrf-assign > label { display: block; font-size: 0.8rem; color: var(--gray); margin-bottom: 0.5rem; }
.vrf-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 1.5rem; }
.vrf-actions .kbd { margin-left: 0.45rem; font-size: 0.72rem; opacity: 0.65; }
.vrf-side { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--ashadow); overflow: hidden; }
.vrf-side h3 { font-size: 0.92rem; font-weight: 600; padding: 1rem 1.2rem; border-bottom: 1px solid var(--line); }
.vrf-next { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; padding: 0.75rem 1.2rem; border-bottom: 1px solid var(--line); transition: background .2s var(--ease); }
.vrf-next:last-child { border-bottom: none; }
.vrf-next:hover { background: var(--surface-2); }
.vrf-next .t-main { font-size: 0.88rem; }
.vrf-next .t-sub { font-size: 0.76rem; }
.vrf-quick { all: unset; cursor: pointer; width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: var(--gray-2); flex: none; transition: background .2s var(--ease), color .2s var(--ease); }
.vrf-quick:hover { background: var(--ok-bg); color: var(--ok); }
@media (max-width: 980px) { .vrf { grid-template-columns: 1fr; } }
`

export default function Verify() {
  const [queue, setQueue] = useState(verifyQueue)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(0)
  const [assign, setAssign] = useState('')
  const toast = useToast()
  const cur = queue[0]
  const total = done + queue.length

  useEffect(() => {
    listUnmatched().then(items => {
      if (items.length) {
        setQueue(items.map(it => ({ id: it.id, raw: it.raw, res: it.res, nonres: it.nonres || '—', clinic: it.clinic, doc: it.doc || '', live: true })))
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const drop = (rotate) => { setAssign(''); setQueue(q => rotate ? [...q.slice(1), q[0]] : q.slice(1)) }

  const act = useCallback(async (kind) => {
    const item = queue[0]
    if (!item) return
    if (kind === 'skip') { toast('Отложено в конец'); drop(true); return }
    if (kind === 'reject') { toast('Позиция отклонена'); setDone(d => d + 1); drop(false); return }
    const name = assign.trim() || item.raw
    if (item.live) {
      try {
        const r = await matchItem({ item_id: item.id, new_service_name: name })
        toast(`Сопоставлено: ${name}${r?.twins_rematched ? ` · +${r.twins_rematched} похожих` : ''}`)
      } catch { toast('Позиция подтверждена') }
    } else toast('Позиция подтверждена')
    setDone(d => d + 1); drop(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, assign, toast])

  useEffect(() => {
    const h = (e) => {
      const inInput = document.activeElement?.tagName === 'INPUT'
      if (e.key === 'Enter') { e.preventDefault(); act('confirm') }
      else if (!inInput && (e.key === 'ArrowRight')) { e.preventDefault(); act('skip') }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [act])

  return (
    <>
      <style>{css}</style>
      <div className="phero">
        <div className="phero__head">
          <span className="phero__eyebrow">Качество</span>
          <h1 className="phero__title">Верификация</h1>
          <p className="phero__sub">Одна позиция за раз — подтверди или сопоставь со справочником.</p>
        </div>
        <div className="phero__metrics">
          {loading ? (
            <div className="phero__metric"><Skeleton w="3rem" h="2rem" r="10px" /><span>в очереди</span></div>
          ) : (
            <>
              <div className="phero__metric"><b className="num">{queue.length}</b><span>в очереди</span></div>
              <div className="phero__metric"><b className="num">{done}</b><span>обработано</span></div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="vrf">
          <div className="vrf-card">
            <Skeleton w="40%" h="0.8rem" r="999px" />
            <div style={{ marginTop: '1rem' }}><Skeleton w="70%" h="2.3rem" r="10px" /></div>
            <div style={{ marginTop: '1.5rem' }}><Skeleton w="100%" h="4rem" r="12px" /></div>
            <div style={{ marginTop: '1.5rem' }}><Skeleton w="100%" h="2.6rem" r="12px" /></div>
            <div className="vrf-actions"><Skeleton w={150} h="2.5rem" r="999px" /><Skeleton w={120} h="2.5rem" r="999px" /></div>
          </div>
          <div className="vrf-side"><h3>Дальше в очереди</h3>{Array.from({ length: 6 }).map((_, i) => <div className="vrf-next" key={i}><Skeleton w="60%" h="1rem" r="8px" /><Skeleton w={28} h={28} r="8px" /></div>)}</div>
        </div>
      ) : !cur ? (
        <div className="card"><div className="empty"><b style={{ fontSize: '1.2rem' }}>Очередь пуста 🎉</b><div style={{ marginTop: '0.4rem' }}>Все позиции обработаны.</div></div></div>
      ) : (
        <div className="vrf">
          <div className="vrf-card rv">
            <div className="vrf-top">
              <span className="vrf-step">Позиция {done + 1} из {total}</span>
              <span className="badge badge--warn"><span className="d" />не сопоставлено</span>
            </div>

            <div className="vrf-raw">«{cur.raw}»</div>
            <div className="vrf-from">из прайса · <b style={{ color: 'var(--ink-2)' }}>{cur.clinic}</b>{cur.doc ? ` · ${cur.doc}` : ''}</div>

            <div className="vrf-prices">
              <div className="vrf-price"><span>Резидент</span><b className="num">{cur.res || '—'}<i>₸</i></b></div>
              <div className="vrf-price"><span>Нерезидент</span><b className="num">{cur.nonres}{cur.nonres !== '—' && <i>₸</i>}</b></div>
            </div>

            <div className="vrf-assign">
              <label>Сопоставить со справочником</label>
              <div className="search-in">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
                <input className="input" placeholder={`Найти услугу или оставить «${cur.raw}»`} value={assign} onChange={e => setAssign(e.target.value)} />
              </div>
            </div>

            <div className="vrf-actions">
              <button className="btn btn--ok" onClick={() => act('confirm')}>{assign.trim() ? `Сопоставить` : `Подтвердить`}<span className="kbd">⏎</span></button>
              <button className="btn btn--outline" onClick={() => act('skip')}>Пропустить<span className="kbd">→</span></button>
              <button className="btn btn--ghost" onClick={() => act('reject')}>Отклонить</button>
            </div>
          </div>

          <div className="vrf-side rv">
            <h3>Дальше в очереди · {Math.max(queue.length - 1, 0)}</h3>
            {queue.slice(1, 9).map(q => (
              <div className="vrf-next" key={q.id}>
                <div><div className="t-main">{q.raw}</div><div className="t-sub">{q.clinic}{q.res ? ` · ${q.res}₸` : ''}</div></div>
                <button className="vrf-quick" title="Подтвердить" onClick={() => { toast('Подтверждено'); setDone(d => d + 1); setQueue(x => x.filter(i => i.id !== q.id)) }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 6.5" /></svg>
                </button>
              </div>
            ))}
            {queue.length <= 1 && <div className="vrf-next" style={{ color: 'var(--gray-2)' }}>Больше позиций нет</div>}
          </div>
        </div>
      )}
    </>
  )
}
