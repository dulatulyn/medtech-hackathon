import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const dest = loc.state?.from || '/dashboard'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      await login(username.trim(), password)
      nav(dest, { replace: true })
    } catch (e) {
      setErr(e.status === 401 ? 'Неверный логин или пароль' : (e.message || 'Не удалось войти'))
    } finally { setBusy(false) }
  }

  return (
    <div className="auth">
      <div className="auth__brand">
        <Link to="/" className="auth__logo"><span className="sb-mark" /> medarchive</Link>
        <h2>База цен клиник-партнёров</h2>
        <p>Загружайте архивы прайсов, нормализуйте услуги к справочнику и находите, кто и по какой цене оказывает услугу.</p>
        <ul className="auth__list">
          <li>Автоматический разбор PDF / Excel / Word / сканов</li>
          <li>Нормализация к единому справочнику услуг</li>
          <li>Поиск, аномалии цен и очередь верификации</li>
        </ul>
      </div>
      <div className="auth__panel">
        <form className="auth__card" onSubmit={submit}>
          <h1>Вход</h1>
          <p className="auth__sub">Войдите в консоль оператора MedArchive.</p>
          {err && <div className="auth__err">{err}</div>}
          <label className="auth__field">
            <span>Логин</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="operator" required />
          </label>
          <label className="auth__field">
            <span>Пароль</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" required />
          </label>
          <button className="btn btn--accent auth__submit" disabled={busy}>{busy ? 'Вход…' : 'Войти'}</button>
          <div className="auth__alt">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></div>
        </form>
      </div>
    </div>
  )
}
