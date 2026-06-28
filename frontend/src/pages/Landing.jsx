import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function Acc({ q }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={'acc' + (open ? ' open' : '')} onClick={() => setOpen(o => !o)}>
      <button>{q}</button><span>{open ? '−' : '+'}</span>
    </div>
  )
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showOffer, setShowOffer] = useState(false)
  const [timer, setTimer] = useState('02:00:00')
  const videoRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    const els = rootRef.current.querySelectorAll('[data-reveal]')
    const io = new IntersectionObserver((es) => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    els.forEach(el => io.observe(el))
    const t = setTimeout(() => els.forEach(el => el.classList.add('in')), 2500)
    return () => { io.disconnect(); clearTimeout(t) }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      setShowOffer(window.scrollY > window.innerHeight * 0.85)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // video: decelerate then freeze on last frame
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.loop = false
    let raf
    const RAMP = 2.2
    const frame = () => {
      if (v.paused || v.ended) return
      const remain = v.duration - v.currentTime
      if (isFinite(remain) && remain < RAMP) v.playbackRate = Math.max(0.08, remain / RAMP)
      raf = requestAnimationFrame(frame)
    }
    const onPlay = () => { raf = requestAnimationFrame(frame) }
    v.addEventListener('play', onPlay)
    v.play().catch(() => {})
    return () => { v.removeEventListener('play', onPlay); cancelAnimationFrame(raf) }
  }, [])

  useEffect(() => {
    const end = Date.now() + 2 * 60 * 60 * 1000
    const p = n => String(n).padStart(2, '0')
    const id = setInterval(() => {
      const ms = Math.max(0, end - Date.now())
      setTimer(p(Math.floor(ms / 3.6e6)) + ':' + p(Math.floor((ms % 3.6e6) / 6e4)) + ':' + p(Math.floor((ms % 6e4) / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={rootRef}>
      <div className="topbar" style={{ height: 38 }}>
        <span>Medtech Hackathon · Terricon Valley · Кейс&nbsp;2</span>
        <Link to="/dashboard">Открыть демо&nbsp;›</Link>
      </div>

      <header className={'nav' + (scrolled ? ' scrolled' : '')}>
        <nav className="nav__links">
          <a href="#how">Как работает</a><a href="#price">Тарифы</a><a href="#reviews">Отзывы</a>
        </nav>
        <a href="#top" className="nav__brand">medarchive</a>
        <div className="nav__actions">
          <Link to="/login" className="nav__login">Войти</Link>
          <Link to="/dashboard" className="btn btn--white nav__cta">Загрузить архив</Link>
          <button className="grid-ic" onClick={() => setMenuOpen(true)} aria-label="Меню">
            {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
          </button>
        </div>
      </header>

      <div className={'menuwrap' + (menuOpen ? ' open' : '')}>
        <div className="menuwrap__bg" onClick={() => setMenuOpen(false)} />
        <aside className="menupanel">
          <div className="menupanel__top">
            <span className="menupanel__title">Меню</span>
            <div className="menupanel__act">
              <Link to="/login" className="menupanel__login">Войти</Link>
              <Link to="/dashboard" className="btn btn--dark">Загрузить архив</Link>
              <button className="grid-ic grid-ic--dark" onClick={() => setMenuOpen(false)} aria-label="Закрыть">
                {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
              </button>
            </div>
          </div>
          <span className="menupanel__eyebrow">Разделы</span>
          <nav className="menupanel__big" onClick={() => setMenuOpen(false)}>
            <a href="#how">Как работает</a><a href="#features">Форматы</a><a href="#price">Дашборд</a>
            <a href="#reviews">Отзывы</a><Link to="/dashboard">Демо</Link><a href="#">Документация</a>
          </nav>
          <div className="menupanel__cols">
            <div><h6>Сравнение</h6><a href="#">vs ручная сводка</a><a href="#">vs Excel-таблицы</a><a href="#">vs аутсорс</a></div>
            <div><h6>Команда</h6><a href="#">Блог</a><a href="#">Вакансии <i className="hot">нанимаем</i></a><a href="#">Контакты</a><a href="#">GitHub</a></div>
          </div>
          <div className="menupanel__promo">
            <div><b>Демо MedArchive</b><span>Запусти на 8 реальных прайсах</span><Link to="/dashboard" className="btn btn--dark">Открыть демо</Link></div>
            <span className="ph menupanel__promoimg" data-ph="превью" />
          </div>
        </aside>
      </div>

      <main id="top">
        <section className="hero">
          <video className="hero__video" ref={videoRef} autoPlay muted playsInline preload="auto" poster="/poster.jpg">
            <source src="/hero.mp4" type="video/mp4" />
          </video>
          <div className="hero__inner">
            <div className="hero__copy">
              <span className="hero__badge" data-reveal><i>✓</i> Кейс 2 · MedArchive</span>
              <h1 className="hero__h1" data-reveal>Все прайсы клиник<br />в одной живой базе</h1>
              <p className="hero__sub" data-reveal>Любой формат. Единый справочник.<br />Цены резидент и нерезидент с историей и сравнением.</p>
              <div className="hero__cta" data-reveal>
                <Link to="/dashboard" className="btn btn--white btn--lg">Загрузить архив</Link>
                <Link to="/dashboard" className="btn btn--glass btn--lg">Смотреть демо</Link>
              </div>
            </div>
            <div className="hero__stats" data-reveal>
              <div><b>Любой формат</b><span>PDF · скан · Excel · Word</span></div>
              <div><b>Быстро</b><span>до 60 секунд на документ</span></div>
              <div><b>Точно</b><span>72% автонормализация</span></div>
            </div>
          </div>
        </section>

        <section className="trust">
          <div className="wrap trust__inner" data-reveal>
            <div className="trust__avatars"><span className="ph ph--circle" /><span className="ph ph--circle" /><span className="ph ph--circle" /></div>
            <p>Собрано из реальных прайсов <b>8 клиник-партнёров</b></p>
          </div>
          <div className="wrap logos"><span className="ph logo-ph" /><span className="ph logo-ph" /><span className="ph logo-ph" /><span className="ph logo-ph" /></div>
        </section>

        <section className="section" id="how">
          <div className="wrap center">
            <h2 className="h2" data-reveal>Как это работает</h2>
            <p className="lead" data-reveal>Начинается с загрузки архива, дальше система делает всё сама.</p>
          </div>
          <div className="wrap hiw">
            {[1, 2, 3, 4].map(n => <article className="hiw__card" data-reveal key={n}><div className="ph hiw__img" data-ph="скрин" /><span className="hiw__no">{n}</span></article>)}
          </div>
          <div className="wrap hiw__cols">
            <div data-reveal><h3>Извлечение</h3><p>Свой парсер под каждый формат: текстовый PDF, скан через OCR, Excel, Word с правками.</p></div>
            <div data-reveal><h3>Нормализация</h3><p>Каждая услуга сводится к единому справочнику: точное совпадение, синонимы, семантика.</p></div>
            <div data-reveal><h3>Верификация</h3><p>Автопроверки, аномалии цен, очередь ручной разметки и версионирование истории.</p></div>
            <div data-reveal><h3>Поиск</h3><p>Кто оказывает услугу и по какой цене: резидент и нерезидент, с сравнением.</p></div>
          </div>
        </section>

        <section className="pinned" id="features">
          <article className="feat">
            <div className="ph feat__img" data-ph="документы / парсинг" />
            <div className="feat__copy">
              <h2 className="h2">Любой формат, один пайплайн</h2>
              <p>PDF, сканы с OCR, многолистовой Excel, Word с принятыми правками. Новый источник подключается без переписывания ядра.</p>
              <Acc q="Что с плохими сканами?" /><Acc q="Поддерживаются ли вложенные таблицы?" />
            </div>
          </article>
          <article className="feat feat--rev">
            <div className="ph feat__img" data-ph="справочник / матчинг" />
            <div className="feat__copy">
              <h2 className="h2">Единый справочник услуг</h2>
              <p>«ОАК», «Общий анализ крови», «анализ крови общ.» сводятся в одну услугу. Нечёткое и семантическое сопоставление с порогом уверенности.</p>
              <Acc q="Что с несопоставленными позициями?" /><Acc q="Можно ли править вручную?" />
            </div>
          </article>
        </section>

        <section className="split" id="price">
          <div className="ph split__screen" data-ph="дашборд оператора" />
          <div className="split__copy" data-reveal>
            <h2 className="h2">Дашборд оператора</h2>
            <ul className="ticks">
              <li>Очередь верификации спорных позиций</li>
              <li>История изменения цен по каждой услуге</li>
              <li>Детектор переплат: аномалии выше медианы</li>
              <li>Поиск резидент / нерезидент</li>
              <li>REST API и Swagger из коробки</li>
            </ul>
            <div className="split__price"><b>10 мин</b><span>вместо 3 дней ручной сводки</span></div>
            <Link to="/dashboard" className="btn btn--dark btn--lg">Открыть демо</Link>
          </div>
        </section>

        <section className="section value">
          <div className="wrap center"><h2 className="h2 h2--xl" data-reveal>Что занимало 3 дня,<br />теперь 10 минут</h2></div>
          <div className="wrap vtable" data-reveal>
            {[['Разбор любого формата', 'PDF · скан · Excel · Word'], ['Нормализация к справочнику', '72% автоматически'], ['Цены резидент / нерезидент', 'в одной карточке'], ['История изменения цен', 'версионирование, бессрочно'], ['Детектор аномалий', 'отклонение от медианы'], ['Поиск и сравнение клиник', 'полнотекстовый'], ['API и документация', 'OpenAPI / Swagger']].map(r => (
              <div className="vrow" key={r[0]}><span>{r[0]}</span><em>{r[1]}</em></div>
            ))}
          </div>
        </section>

        <section className="section" id="reviews">
          <div className="wrap"><h2 className="h2" data-reveal>Форматы, которые мы парсим</h2></div>
          <div className="rail">
            {[['PDF', 'Текстовый PDF', 'таблицы читаются напрямую'], ['Скан', 'Скан (OCR)', 'распознавание и очистка'], ['XLSX', 'Excel / XLS', 'все листы, плавающий заголовок'], ['DOCX', 'Word', 'с принятием tracked changes'], ['ZIP', 'Архив ZIP', 'пакетная обработка']].map(c => (
              <article className="rail__card" key={c[1]}><div className="ph rail__img" data-ph={c[0]} /><h4>{c[1]}</h4><p>{c[2]}</p></article>
            ))}
          </div>
        </section>

        <section className="section testi">
          <div className="wrap">
            <span className="rate" data-reveal>★ 4.6 / 5 · операторы страховой</span>
            <h2 className="h2" data-reveal>Меньше рутины, больше пойманных переплат</h2>
          </div>
          <div className="rail">
            {['Айгерим, оператор', 'Данияр, аналитик', 'Сауле, методолог'].map(n => (
              <article className="rail__card rail__card--lg" key={n}><div className="ph rail__img rail__img--tall" data-ph="видео-отзыв" /><h4>{n}</h4></article>
            ))}
          </div>
        </section>
      </main>

      <footer className="foot" id="cta">
        <div className="foot__card">
          <div className="foot__main">
            <div className="foot__brandcol">
              <span className="foot__brand">medarchive</span>
              <p>Не знаешь с чего начать? Подпишись, пришлём гайд по нормализации прайсов.</p>
              <div className="foot__signup"><input placeholder="Ваш e-mail" /><button className="btn btn--dark">Подписаться</button></div>
              <div className="foot__cards"><span className="ph foot__qr" data-ph="QR" /><span className="ph foot__vid" data-ph="видео команды" /></div>
            </div>
            <div className="foot__links">
              <div><h5>Продукт</h5><a href="#how">Как работает</a><a href="#features">Форматы</a><Link to="/dashboard">Дашборд</Link><Link to="/dashboard">API</Link></div>
              <div><h5>Команда</h5><a href="#">О нас</a><a href="#">Вакансии</a><a href="#">Контакты</a><a href="#">Блог</a></div>
              <div><h5>Кейс</h5><a href="#">Terricon Valley</a><a href="#">MedPartners</a><a href="#">ТЗ Кейс 2</a></div>
              <div><h5>Связь</h5><a href="#">Telegram</a><a href="#">GitHub</a><a href="#">Email</a></div>
            </div>
          </div>
          <div className="foot__bottom"><span>© 2026 MedArchive</span><span>Medtech Hackathon · Кейс 2</span></div>
        </div>
      </footer>

      <div className={'offerbar' + (showOffer ? ' show' : '')}>
        <div className="offerbar__left">
          <span className="ph offerbar__ic" />
          <div><b>Демо MedArchive</b><span>Запусти на реальных 8 прайсах · <i className="timer">{timer}</i></span></div>
        </div>
        <Link to="/dashboard" className="btn btn--dark">Открыть демо ›</Link>
      </div>
    </div>
  )
}
