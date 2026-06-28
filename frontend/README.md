# MedArchive — Frontend

Веб-UI для **MedArchive** (Кейс 2, MedPartners): поиск по базе цен клиник-партнёров,
страницы партнёра и услуги, очередь верификации несопоставленных позиций, дашборд
качества импорта, загрузка архивов прайс-листов.

Фронт ходит в backend через REST API (`/api/v1`). Все страницы тянут живые данные из
API, а при недоступности бэкенда падают на мок-данные из `src/data.js` — UI остаётся
рабочим даже без поднятого backend.

## Стек

- **React 18** + **React Router 6** (SPA, клиентский роутинг)
- **Vite 5** — дев-сервер и сборка (`@vitejs/plugin-react`)
- Без UI-фреймворка: чистый CSS (`src/styles/`), шрифт Geist
- `fetch` напрямую (тонкий клиент в `src/api.js`), без axios/react-query

## Запуск

Нужен Node.js 18+.

```bash
cd frontend
npm install
npm run dev          # http://localhost:4321
```

Скрипты (`package.json`):

| Команда           | Что делает                                  |
|-------------------|---------------------------------------------|
| `npm run dev`     | дев-сервер Vite на `:4321` (HMR)            |
| `npm run build`   | прод-сборка в `dist/`                        |
| `npm run preview` | локальный предпросмотр собранного `dist/`   |

## Связь с backend

UI не знает реального адреса бэкенда — он стучится по относительному пути `/api/...`,
а Vite-прокси перекидывает запросы на backend.

- В `vite.config.js` настроен прокси: `'/api' → http://localhost:8010` (`changeOrigin: true`).
- Порт бэкенда по умолчанию — **8010** (8000 часто занят локально).
- Переопределить адрес бэкенда — переменной окружения `VITE_API_TARGET`:

```bash
VITE_API_TARGET=http://localhost:8010 npm run dev
# или другой хост/порт:
VITE_API_TARGET=http://192.168.0.10:8000 npm run dev
```

Дополнительно клиент в `src/api.js` берёт базовый путь из `import.meta.env.VITE_API_URL`
(по умолчанию `/api/v1`) — менять обычно не нужно.

Бэкенд оборачивает каждый успешный ответ в `{ "data": ... }`; клиент (`src/api.js`)
автоматически распаковывает `.data`. Полный контракт — `../docs/api-contract.md`.

## Структура `src/`

```
src/
├── main.jsx              Точка входа: монтирует App в <BrowserRouter>, грузит стили
├── App.jsx               Маршруты (React Router): / и страницы под общим layout
├── api.js                Тонкий API-клиент (fetch через /api, распаковка {data:...},
│                         маппинг ответов в готовые для страниц формы)
├── data.js               Мок-данные — фолбэк, когда backend недоступен
├── icons.jsx             SVG-иконки
├── components/
│   └── AppLayout.jsx     Общий каркас (сайдбар/навигация) для внутренних страниц
├── pages/
│   ├── Landing.jsx       Лендинг (маршрут /)
│   ├── Dashboard.jsx     Дашборд качества импорта (/admin/stats)
│   ├── Upload.jsx        Загрузка ZIP-архива прайсов
│   ├── Documents.jsx     Список документов и их статус парсинга
│   ├── Verify.jsx        Очередь верификации
│   ├── Match.jsx         Ручное сопоставление позиции со справочником
│   ├── Anomalies.jsx     Аномалии цен
│   ├── Search.jsx        Поиск по услугам/ценам
│   ├── Catalog.jsx       Каталог услуг справочника
│   ├── Clinic.jsx        Страница партнёра (клиники)
│   └── Service.jsx       Страница услуги (сравнение цен по партнёрам)
└── styles/
    ├── landing.css       Стили лендинга
    └── app.css           Стили внутренних страниц
```

Маршруты (`App.jsx`): `/` (лендинг) — отдельно; `/dashboard`, `/upload`, `/documents`,
`/verify`, `/match`, `/anomalies`, `/search`, `/catalog`, `/clinic`, `/service` —
под общим `AppLayout`.

## Поднять весь стек целиком

Backend + БД + фронт одной последовательностью — см. `../RUN.md`.
