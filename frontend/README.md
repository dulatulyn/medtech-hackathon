# Frontend — MedArchive UI

Веб-интерфейс для операторов и колл-центра: поиск «кто оказывает услугу X и почём»,
страница партнёра, очередь верификации нормализации, дашборд качества данных.

## Старт (React + Vite)

```bash
cd frontend
npm create vite@latest .      # выбрать React + TypeScript (первый раз)
npm install
npm run dev
```

Vite dev-сервер поднимется на `http://localhost:5173`. Бэкенд-API — `http://localhost:8000`
(см. корневой README). Для запросов к API используйте переменную `VITE_API_URL`.

## Договорённости

- Весь фронт-код живёт здесь, в `frontend/` — не в корне репозитория.
- Бэкенд отдаёт ответы в обёртке `{ "data": ... }`, авторизация — HttpOnly cookie (JWT).
- OpenAPI-схема бэка: `http://localhost:8000/openapi.json` — можно генерить типы.
