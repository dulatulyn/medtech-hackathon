import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import * as I from '../icons.jsx'

const NAV = [
  { group: 'Обзор', links: [{ t: 'Дашборд', to: '/dashboard', Icon: I.Dash }] },
  { group: 'Данные', links: [{ t: 'Загрузка архива', to: '/upload', Icon: I.Upload }, { t: 'Документы', to: '/documents', Icon: I.Docs }] },
  { group: 'Качество', links: [
    { t: 'Верификация', to: '/verify', Icon: I.Verify, b: 24 },
    { t: 'Несопоставленное', to: '/match', Icon: I.Match, b: 38 },
    { t: 'Аномалии', to: '/anomalies', Icon: I.Alert, b: 7 },
  ] },
  { group: 'Витрина', links: [
    { t: 'Поиск', to: '/search', Icon: I.Search },
    { t: 'Клиники', to: '/clinic', Icon: I.Clinic },
    { t: 'Справочник', to: '/catalog', Icon: I.Book },
  ] },
]

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const push = useCallback((msg) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2300)
  }, [])

  useEffect(() => {
    const h = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault(); document.getElementById('globalSearch')?.focus()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      <div className="app">
        <aside className={'sidebar' + (open ? ' open' : '')}>
          <div className="sb-brand"><span className="sb-mark" /><b>medarchive</b><span className="sb-role">Оператор</span></div>
          {NAV.map(g => (
            <div className="sb-group" key={g.group}>
              <span>{g.group}</span>
              {g.links.map(l => (
                <NavLink key={l.to} to={l.to} className="sb-link" onClick={() => setOpen(false)}>
                  <l.Icon /><span>{l.t}</span>{l.b ? <span className="sb-badge">{l.b}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="sb-user"><span className="ava">АО</span><div><b>Айгерим Оператор</b><span>Nomad Insurance</span></div></div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button className="btn btn--icon btn--ghost sb-toggle" onClick={() => setOpen(o => !o)} aria-label="Меню"><I.Menu /></button>
            <div className="tb-search"><I.Search /><input id="globalSearch" placeholder="Найти услугу, клинику или документ…" /><kbd>/</kbd></div>
            <div className="tb-right">
              <Link className="tb-chip" to="/verify"><span className="dot" />Верификация <b>24</b></Link>
              <Link className="tb-chip" to="/anomalies">Аномалии <b>7</b></Link>
              <Link className="btn btn--accent btn--sm" to="/upload"><I.Upload />Загрузить</Link>
            </div>
          </header>
          <main className="page"><Outlet /></main>
        </div>

        <div className={'scrim' + (open ? ' show' : '')} onClick={() => setOpen(false)} />
        <div className="toast-wrap">
          {toasts.map(t => <div className="toast" key={t.id}><I.Check /><span>{t.msg}</span></div>)}
        </div>
      </div>
    </ToastCtx.Provider>
  )
}
