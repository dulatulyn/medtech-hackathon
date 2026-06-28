export const documents = [
  { file: 'Клиника 1 2026.pdf', clinic: 'Сункар', city: 'Алматы', format: 'Скан', date: '04.06.2026', status: 'ok', items: 312 },
  { file: 'Клиника 1 прайс 2024.docx', clinic: 'Сункар', city: 'Алматы', format: 'DOCX', date: '2024', status: 'ok', items: 298 },
  { file: 'Клиника 2 прайс 2025 год.PDF', clinic: 'Жетысу', city: 'Алматы', format: 'PDF', date: '2025', status: 'ok', items: 410 },
  { file: 'Клиника 2 прайс 2026.pdf', clinic: 'Жетысу', city: 'Алматы', format: 'PDF', date: '2026', status: 'ok', items: 425 },
  { file: 'Клиника 3 прайс 2026.PDF', clinic: 'Арман', city: 'Шымкент', format: 'Скан', date: '2026', status: 'warn', items: 280 },
  { file: 'Клиника 4 прайс 2026.pdf', clinic: 'Нур', city: 'Астана', format: 'PDF', date: '2026', status: 'pend', items: null },
  { file: 'Клиника 5 прайс 2025.pdf', clinic: 'Сенім', city: 'Караганда', format: 'PDF', date: '2025', status: 'ok', items: 190 },
  { file: 'Клиника 6 прайс 2026.xlsx', clinic: 'Аман', city: 'Алматы', format: 'XLSX', date: '2026', status: 'ok', items: 540 },
  { file: 'Клиника 7_Прайс 2026.xls', clinic: 'Береке', city: 'Астана', format: 'XLS', date: '2026', status: 'info', items: null },
  { file: 'Клиника 8 2026.xlsx', clinic: 'Демеу', city: 'Шымкент', format: 'XLSX', date: '2026', status: 'ok', items: 175 },
]

export const statusLabel = {
  ok: { c: 'ok', t: 'Готово' }, warn: { c: 'warn', t: 'На ревью' },
  info: { c: 'info', t: 'Обработка' }, pend: { c: 'pend', t: 'В очереди' }, err: { c: 'err', t: 'Ошибка' },
}

export const verifyQueue = [
  { id: 1, raw: 'МРТ головн. мозга', service: 'МРТ головного мозга', conf: 96, res: '31 200', nonres: '35 000', doc: 'Клиника 3 прайс 2026.PDF', clinic: 'Арман', warn: ['Цена +38% к медиане рынка'] },
  { id: 2, raw: 'Консульт. невропат.', service: 'Консультация невролога', conf: 64, res: '8 500', nonres: '10 000', doc: 'Клиника 3 прайс 2026.PDF', clinic: 'Арман', warn: ['Низкая уверенность сопоставления'] },
  { id: 3, raw: 'УЗИ орг. бр. полости', service: 'УЗИ брюшной полости', conf: 91, res: '9 800', nonres: '12 000', doc: 'Клиника 7_Прайс 2026.xls', clinic: 'Береке', warn: [] },
  { id: 4, raw: 'Биохим. ан. крови (10)', service: 'Биохимический анализ крови', conf: 88, res: '7 600', nonres: '9 100', doc: 'Клиника 4 прайс 2026.pdf', clinic: 'Нур', warn: ['Цена +41% к прошлой версии'] },
  { id: 5, raw: 'Рентген ОГК (1 пр.)', service: 'Рентгенография грудной клетки', conf: 93, res: '4 200', nonres: '5 000', doc: 'Клиника 5 прайс 2025.pdf', clinic: 'Сенім', warn: [] },
]

export const unmatched = [
  { id: 1, raw: 'Глюкоза кр. натощак', doc: 'Клиника 3 прайс 2026.PDF', clinic: 'Арман', sugg: [{ name: 'Глюкоза крови', conf: 82 }, { name: 'Глюкозотолерантный тест', conf: 54 }] },
  { id: 2, raw: 'Т4 свободный', doc: 'Клиника 6 прайс 2026.xlsx', clinic: 'Аман', sugg: [{ name: 'Тироксин свободный (Т4)', conf: 79 }, { name: 'ТТГ', conf: 41 }] },
  { id: 3, raw: 'Холтер ЭКГ 24ч', doc: 'Клиника 2 прайс 2026.pdf', clinic: 'Жетысу', sugg: [{ name: 'Суточное мониторирование ЭКГ', conf: 76 }] },
  { id: 4, raw: 'Маммогр. 2 пр.', doc: 'Клиника 8 2026.xlsx', clinic: 'Демеу', sugg: [{ name: 'Маммография', conf: 71 }] },
  { id: 5, raw: 'Соскоб на демодекс', doc: 'Клиника 5 прайс 2025.pdf', clinic: 'Сенім', sugg: [] },
]

export const anomalies = [
  { id: 1, clinic: 'Арман', city: 'Шымкент', service: 'МРТ головного мозга', price: '31 200', median: '22 600', deltaPct: 38, overpay: '8 600', type: 'Выше медианы' },
  { id: 2, clinic: 'Демеу', city: 'Шымкент', service: 'КТ грудной клетки', price: '41 000', median: '27 000', deltaPct: 52, overpay: '14 000', type: 'Выше медианы' },
  { id: 3, clinic: 'Нур', city: 'Астана', service: 'Биохимический анализ крови', price: '11 000', median: '7 800', deltaPct: 41, overpay: '3 200', type: 'Скачок цены' },
  { id: 4, clinic: 'Береке', city: 'Астана', service: 'УЗИ брюшной полости', price: '12 800', median: '9 600', deltaPct: 33, overpay: '3 200', type: 'Выше медианы' },
  { id: 5, clinic: 'Жетысу', city: 'Алматы', service: 'Консультация терапевта', price: '9 000', median: '6 400', deltaPct: 41, overpay: '2 600', type: 'Нерезидент < резидент' },
  { id: 6, clinic: 'Аман', city: 'Алматы', service: 'ЭКГ', price: '5 800', median: '3 900', deltaPct: 49, overpay: '1 900', type: 'Выше медианы' },
  { id: 7, clinic: 'Сункар', city: 'Алматы', service: 'Рентгенография грудной клетки', price: '7 400', median: '4 600', deltaPct: 61, overpay: '2 800', type: 'Выше медианы' },
]

export const searchRows = [
  { clinic: 'Сункар', city: 'Алматы', res: '18 900', nonres: '22 000', best: true },
  { clinic: 'Сенім', city: 'Караганда', res: '20 400', nonres: '24 000', best: false },
  { clinic: 'Жетысу', city: 'Алматы', res: '24 500', nonres: '28 000', best: false },
  { clinic: 'Нур', city: 'Астана', res: '26 700', nonres: '30 500', best: false },
  { clinic: 'Арман', city: 'Шымкент', res: '31 200', nonres: '35 000', best: false, flagPct: 38 },
]

export const priceHistory = [
  { date: '2024', price: 16500 }, { date: '2025', price: 17800 }, { date: '2026', price: 18900 },
]

export const catalog = [
  { name: 'МРТ головного мозга', cat: 'Диагностика', syn: 'МРТ мозга, МРТ ГМ', partners: 8, min: '18 900', max: '31 200' },
  { name: 'Общий анализ крови', cat: 'Лаборатория', syn: 'ОАК, анализ крови общий', partners: 8, min: '1 800', max: '3 000' },
  { name: 'УЗИ брюшной полости', cat: 'Диагностика', syn: 'УЗИ ОБП, УЗИ живота', partners: 7, min: '7 200', max: '12 800' },
  { name: 'Консультация терапевта', cat: 'Консультация', syn: 'Приём терапевта', partners: 8, min: '4 500', max: '9 000' },
  { name: 'КТ грудной клетки', cat: 'Диагностика', syn: 'КТ ОГК, КТ лёгких', partners: 6, min: '24 000', max: '41 000' },
  { name: 'Биохимический анализ крови', cat: 'Лаборатория', syn: 'Биохимия, БАК', partners: 8, min: '6 200', max: '11 000' },
  { name: 'Электрокардиография', cat: 'Диагностика', syn: 'ЭКГ', partners: 8, min: '3 200', max: '5 800' },
  { name: 'Рентгенография грудной клетки', cat: 'Диагностика', syn: 'Рентген ОГК, флюорография', partners: 8, min: '4 200', max: '7 400' },
]

export const clinics = [
  { name: 'Сункар', city: 'Алматы', services: 312, docs: 2, active: true },
  { name: 'Жетысу', city: 'Алматы', services: 425, docs: 2, active: true },
  { name: 'Арман', city: 'Шымкент', services: 280, docs: 1, active: true },
  { name: 'Нур', city: 'Астана', services: 350, docs: 1, active: true },
  { name: 'Сенім', city: 'Караганда', services: 190, docs: 1, active: true },
  { name: 'Аман', city: 'Алматы', services: 540, docs: 1, active: true },
  { name: 'Береке', city: 'Астана', services: 320, docs: 1, active: false },
  { name: 'Демеу', city: 'Шымкент', services: 175, docs: 1, active: true },
]
