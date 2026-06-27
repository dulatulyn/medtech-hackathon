import { useState, useEffect, useMemo } from 'react'
import { unmatched } from '../data.js'
import { useToast } from '../components/AppLayout.jsx'
import { listUnmatched, matchItem } from '../api.js'
import { Skeleton } from '../components/Skeleton.jsx'

const css = `
.mg { display: flex; flex-direction: column; gap: 1rem; }
.mg-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--ashadow); padding: 1.3rem 1.4rem; }
.mg-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.mg-name { font-size: 1.2rem; font-weight: 600; letter-spacing: -0.02em; }
.mg-meta { margin-top: 0.3rem; font-size: 0.82rem; color: var(--gray); }
.mg-vars { display: flex; gap: 0.45rem; flex-wrap: wrap; margin: 1rem 0 0; }
.mg-var { font-size: 0.78rem; color: var(--gray); background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; padding: 0.22rem 0.55rem; }
.mg-act { display: flex; gap: 0.6rem; margin-top: 1.1rem; align-items: center; flex-wrap: wrap; }
.mg-act .input { flex: 1; min-width: 220px; }
.mg-pill { font-size: 0.74rem; font-weight: 500; color: var(--accent); background: var(--accent-weak); padding: 0.22rem 0.6rem; border-radius: var(--pill); white-space: nowrap; }
`

const normKey = s => (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim().replace(/\s+/g, ' ')

function buildGroups(items) {
  const map = new Map()
  for (const it of items) {
    const k = normKey(it.raw) || it.raw
    if (!map.has(k)) map.set(k, { key: k, items: [], variants: new Map(), clinics: new Set() })
    const g = map.get(k)
    g.items.push(it)
    g.variants.set(it.raw, (g.variants.get(it.raw) || 0) + 1)
    if (it.clinic) g.clinics.add(it.clinic)
  }
  return [...map.values()].map(g => {
    let canon = '', bestN = -1
    for (const [v, n] of g.variants) if (n > bestN || (n === bestN && v.length > canon.length)) { canon = v; bestN = n }
    return { key: g.key, canon, count: g.items.length, clinics: g.clinics.size, variants: [...g.variants.keys()], items: g.items }
  }).sort((a, b) => b.count - a.count)
}

async function pool(arr, fn, conc = 6) {
  const q = [...arr]
  await Promise.all(Array.from({ length: Math.min(conc, q.length) }, async () => {
    while (q.length) await fn(q.shift())
  }))
}

export default function Match() {
  const [items, setItems] = useState(unmatched)
  const [loading, setLoading] = useState(true)
  const [names, setNames] = useState({})
  const [busy, setBusy] = useState({})
  const [shown, setShown] = useState(40)
  const toast = useToast()

  useEffect(() => {
    listUnmatched().then(d => { if (d.length) setItems(d) }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const groups = useMemo(() => buildGroups(items), [items])
  const dups = groups.filter(g => g.count > 1)
  const singles = groups.length - dups.length
  const clinics = useMemo(() => new Set(items.map(i => i.clinic)).size, [items])

  async function confirmGroup(g) {
    const name = (names[g.key] ?? g.canon).trim() || g.canon
    setBusy(b => ({ ...b, [g.key]: true }))
    const ids = new Set(g.items.map(i => i.id))
    try {
      await pool(g.items, it => matchItem({ item_id: it.id, new_service_name: name }).catch(() => {}), 6)
      toast(`Сопоставлено ${g.count} позиций → «${name}»`)
    } catch { toast('Сопоставлено') }
    setItems(x => x.filter(i => !ids.has(i.id)))
  }

  return (
    <>
      <style>{css}</style>
      <div className="phero">
        <div className="phero__head">
          <span className="phero__eyebrow">Качество · справочник</span>
          <h1 className="phero__title">Несопоставленное</h1>
          <p className="phero__sub">Дубли сгруппированы — подтверди группу разом и наполни справочник.</p>
        </div>
        <div className="phero__metrics">
          {loading ? (
            <div className="phero__metric"><Skeleton w="3rem" h="2rem" r="10px" /><span>позиций</span></div>
          ) : (
            <>
              <div className="phero__metric"><b className="num">{items.length}</b><span>позиций</span></div>
              <div className="phero__metric"><b className="num">{dups.length}</b><span>групп дублей</span></div>
              <div className="phero__metric"><b className="num">{clinics}</b><span>клиник</span></div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mg">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="mg-card" key={i}>
              <Skeleton w="45%" h="1.4rem" r="8px" />
              <div style={{ marginTop: '0.8rem' }}><Skeleton w="30%" h="0.8rem" r="6px" /></div>
              <div style={{ marginTop: '1.1rem' }}><Skeleton w="100%" h="2.6rem" r="12px" /></div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card"><div className="empty"><b style={{ fontSize: '1.1rem' }}>Всё сопоставлено 🎉</b></div></div>
      ) : (
        <>
          <div className="toolbar" style={{ marginBottom: '1rem' }}>
            <span className="mg-pill">дедупликация</span>
            <span className="hint">{dups.length} групп дублей · {singles} уникальных · одна группа = одна каноничная услуга</span>
          </div>

          <div className="mg">
            {dups.slice(0, shown).map(g => (
              <div className="mg-card rv" key={g.key}>
                <div className="mg-top">
                  <div>
                    <div className="mg-name">{g.canon}</div>
                    <div className="mg-meta">{g.count} позиций · {g.clinics} клиник · {g.variants.length} написани{g.variants.length === 1 ? 'е' : 'й'}</div>
                  </div>
                  <span className="badge badge--accent">×{g.count}</span>
                </div>

                {g.variants.length > 1 && (
                  <div className="mg-vars">
                    {g.variants.slice(0, 6).map(v => <span className="mg-var" key={v}>«{v}»</span>)}
                    {g.variants.length > 6 && <span className="mg-var">+{g.variants.length - 6}</span>}
                  </div>
                )}

                <div className="mg-act">
                  <input
                    className="input"
                    value={names[g.key] ?? g.canon}
                    onChange={e => setNames(n => ({ ...n, [g.key]: e.target.value }))}
                    placeholder="Каноничное название услуги"
                  />
                  <button className="btn btn--ok" disabled={busy[g.key]} onClick={() => confirmGroup(g)}>
                    {busy[g.key] ? 'Сопоставляю…' : `Сопоставить ${g.count}`}
                  </button>
                  <button className="btn btn--ghost" disabled={busy[g.key]} onClick={() => setItems(x => x.filter(i => !g.items.some(gi => gi.id === i.id)))}>Пропустить</button>
                </div>
              </div>
            ))}
          </div>

          {dups.length > shown && (
            <div style={{ textAlign: 'center', marginTop: '1.3rem' }}>
              <button className="btn btn--outline" onClick={() => setShown(s => s + 40)}>Показать ещё ({dups.length - shown})</button>
            </div>
          )}

          {dups.length === 0 && (
            <div className="card"><div className="empty">Групп дублей нет — оставшиеся {singles} позиций уникальны, разметь их по одной в <b>Верификации</b>.</div></div>
          )}
        </>
      )}
    </>
  )
}
