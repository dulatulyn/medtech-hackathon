import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import * as I from '../icons.jsx'
import { getStats } from '../api.js'
import { useAuth } from '../auth.jsx'

const initials = (name) => (name || '?').slice(0, 2).toUpperCase()

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
  const [stats, setStats] = useState(null)
  const [api, setApi] = useState('checking') // checking | live | demo
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const doLogout = async () => { await logout(); navigate('/login', { replace: true }) }

  useEffect(() => {
    getStats()
      .then(s => { setStats(s); setApi('live') })
      .catch(() => setApi('demo'))
  }, [])

  // live badge values from the backend (fall back to the static demo numbers)
  const badge = (to, fallback) => {
    if (!stats) return fallback
    if (to === '/verify' || to === '/match') return stats.items_unmatched
    if (to === '/anomalies') return stats.anomalies
    return fallback
  }
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
                  <l.Icon /><span>{l.t}</span>{badge(l.to, l.b) ? <span className="sb-badge">{badge(l.to, l.b)}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="sb-user"><span className="ava">{initials(user?.username)}</span><div><b>{user?.username || 'Оператор'}</b><span>{user?.email || ''}</span></div></div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button className="btn btn--icon btn--ghost sb-toggle" onClick={() => setOpen(o => !o)} aria-label="Меню"><I.Menu /></button>
            <div className="tb-search"><I.Search /><input id="globalSearch" placeholder="Найти услугу, клинику или документ…" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) navigate(`/search?q=${encodeURIComponent(e.target.value.trim())}`) }} /><kbd>/</kbd></div>
            <div className="tb-right">
              <span
                className="tb-chip"
                title={api === 'live' ? 'Фронтенд получает данные с бэкенда' : 'Бэкенд недоступен — показаны демо-данные'}
                style={{
                  background: api === 'live' ? 'rgba(22,163,74,.10)' : api === 'demo' ? 'rgba(120,120,120,.10)' : undefined,
                  color: api === 'live' ? 'var(--ok)' : undefined,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span className="dot" style={{ background: api === 'live' ? 'var(--ok)' : 'var(--gray)' }} />
                {api === 'live' ? `API подключено · ${stats.total_items} цен · ${stats.partners_active} клиник` : api === 'demo' ? 'Демо-данные (API офлайн)' : 'Проверка API…'}
              </span>
              <Link className="tb-chip tb-chip--verify" to="/verify"><span className="dot" />Верификация <b>{badge('/verify', 0)}</b></Link>
              <div className="tb-user">
                <button className="tb-ava" onClick={() => setMenu(m => !m)} aria-label="Профиль">{initials(user?.username)}</button>
                {menu && (
                  <>
                    <div className="tb-menu-scrim" onClick={() => setMenu(false)} />
                    <div className="tb-menu">
                      <div className="tb-menu__head"><b>{user?.username || 'Оператор'}</b><span>{user?.email || ''}</span></div>
                      <Link className="tb-menu__item" to="/upload" onClick={() => setMenu(false)}><I.Upload />Загрузить архив</Link>
                      <button className="tb-menu__item tb-menu__item--danger" onClick={doLogout}><I.Logout />Выйти</button>
                    </div>
                  </>
                )}
              </div>
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
