import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

// Mirrors the backend's UserRegister validation so users get instant feedback.
function validate({ username, email, password }) {
  if (!/^[a-zA-Z0-9_-]{3,50}$/.test(username)) return 'Логин: 3–50 символов, латиница/цифры/_/-'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Укажите корректный e-mail'
  if (password.length < 8) return 'Пароль: минимум 8 символов'
  if (!/[A-Z]/.test(password)) return 'Пароль должен содержать заглавную букву'
  if (!/[a-z]/.test(password)) return 'Пароль должен содержать строчную букву'
  if (!/\d/.test(password)) return 'Пароль должен содержать цифру'
  return ''
}

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const v = validate(form)
    if (v) { setErr(v); return }
    setErr(''); setBusy(true)
    try {
      await register(form.username.trim(), form.email.trim(), form.password)
      nav('/dashboard', { replace: true })
    } catch (e) {
      setErr(e.message && e.message !== '400' ? e.message : 'Не удалось зарегистрироваться (возможно, логин занят)')
    } finally { setBusy(false) }
  }

  return (
    <div className="auth">
      <div className="auth__brand">
        <Link to="/" className="auth__logo"><span className="sb-mark" /> medarchive</Link>
        <h2>Создайте аккаунт оператора</h2>
        <p>Один аккаунт для загрузки архивов, нормализации услуг и работы с очередью верификации.</p>
        <ul className="auth__list">
          <li>Доступ к дашборду качества обработки</li>
          <li>Ручное сопоставление и верификация позиций</li>
          <li>Поиск услуг и сравнение цен между клиниками</li>
        </ul>
      </div>
      <div className="auth__panel">
        <form className="auth__card" onSubmit={submit}>
          <h1>Регистрация</h1>
          <p className="auth__sub">Создайте учётную запись MedArchive.</p>
          {err && <div className="auth__err">{err}</div>}
          <label className="auth__field">
            <span>Логин</span>
            <input value={form.username} onChange={set('username')} autoComplete="username" placeholder="operator" required />
          </label>
          <label className="auth__field">
            <span>E-mail</span>
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@clinic.kz" required />
          </label>
          <label className="auth__field">
            <span>Пароль</span>
            <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" placeholder="Минимум 8 символов" required />
          </label>
          <button className="btn btn--accent auth__submit" disabled={busy}>{busy ? 'Создание…' : 'Создать аккаунт'}</button>
          <div className="auth__alt">Уже есть аккаунт? <Link to="/login">Войти</Link></div>
        </form>
      </div>
    </div>
  )
}
