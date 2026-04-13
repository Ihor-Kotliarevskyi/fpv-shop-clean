# 🚁 FPV DRONE SHOP — Повна документація

> Node.js (Fastify) + Next.js 14 App Router + PostgreSQL

---

## 📁 Структура

```
fpv-shop/
├── database/schema.sql           ← Повна PostgreSQL схема (все)
├── backend/                      ← Fastify REST API
│   └── src/
│       ├── server.ts             ← Точка входу, реєстрація плагінів
│       ├── config/               ← Env + валідація через Zod
│       └── routes/
│           ├── products/         ← Каталог, варіанти, відгуки
│           ├── orders/           ← Замовлення, НП, рефанд
│           ├── cart/             ← Кошик (гість + merge)
│           ├── users/            ← Auth, профіль, wishlist, адреси
│           ├── admin/            ← Вся адмінпанель API
│           ├── payments/         ← WayForPay / LiqPay webhook
│           └── search/           ← Algolia + postgres FTS fallback
├── frontend/                     ← Next.js 14
│   └── src/
│       ├── app/
│       │   ├── page.tsx          ← Головна (hero, категорії, акції)
│       │   ├── product/[slug]/   ← Сторінка товару
│       │   ├── catalog/[cat]/    ← Каталог + фільтри + пагінація
│       │   ├── cart/             ← Кошик
│       │   ├── checkout/         ← Оформлення (НП, оплата)
│       │   ├── account/          ← Кабінет (профіль, замовлення, wishlist)
│       │   ├── admin/            ← Адмінпанель (захищена роллю)
│       │   └── auth/             ← Логін, реєстрація, пароль
│       ├── store/
│       │   ├── cart.store.ts     ← Zustand + persist
│       │   └── auth.store.ts     ← Zustand + persist
│       ├── lib/api.ts            ← Axios + interceptors (JWT refresh)
│       └── styles/globals.css    ← FPV dark theme (CSS vars)
├── supabase-alt/
│   └── supabase-setup.sql        ← RLS, Auth hook, Realtime (альтернатива)
├── .env.example
└── docker-compose.yml
```

---

## 🛠 Стек

| Рівень | Технологія | Роль |
|---|---|---|
| API | Fastify 4 | HTTP сервер |
| ORM | Prisma 5 | БД + міграції |
| БД | PostgreSQL 16 | Дані |
| Кеш | Redis | Сесії, кошик гостей |
| Пошук | Algolia | Повнотекстовий пошук |
| Frontend | Next.js 14 | SSR/SSG/ISR |
| Стилі | Tailwind CSS | UI |
| Стан | Zustand | Кошик, auth |
| Запити | TanStack Query | Server state |
| Анімації | Framer Motion | UI переходи |
| Форми | React Hook Form | Валідація |
| Оплата | WayForPay | Платежі |
| Доставка | Nova Poshta API | Відстеження, ТТН |
| ПРРО | Checkbox.ua | Фіскалізація |
| Email | Nodemailer/Resend | Сповіщення |
| CDN | Cloudflare | Захист, кеш |

---

## 🚀 Quickstart

```bash
# БД
psql -U postgres -c "CREATE DATABASE fpvshop;"
psql -U postgres fpvshop < database/schema.sql

# Backend
cd backend && cp .env.example .env
npm install && npm run dev
# → http://localhost:4000
# → Swagger: http://localhost:4000/docs

# Frontend
cd frontend && cp .env.example .env.local
npm install && npm run dev
# → http://localhost:3000

# Admin
# → http://localhost:3000/admin  (роль: admin / super_admin)
```

---

## 👤 Кабінет клієнта `/account`

| Розділ | Функціональність |
|---|---|
| Профіль | Ім'я, телефон, дата народження, аватар, пароль |
| Замовлення | Список, статус, відстеження НП, скасування, рефанд |
| Адреси | Збережені адреси НП (місто + відділення) |
| Обране | Wishlist, публічний URL для шерінгу |
| Порівняння | До 4 товарів одночасно |
| Сповіщення | Email / SMS налаштування |

---

## 🔧 Адмінпанель `/admin`

| Розділ | Можливості |
|---|---|
| **Дашборд** | Дохід/замовлення/клієнти за день, 30-денний графік, топ товари, алерти складу |
| **Товари** | CRUD, варіанти SKU, specs (JSON per категорія), медіа, публікація, масові дії, CSV імпорт/експорт |
| **Замовлення** | Фільтр за статусом/датою, зміна статусу, відправка НП + ТТН, рефанди |
| **Склад** | Залишки per SKU, коригування з причиною, закупки від постачальників |
| **Клієнти** | База, деталі, история, зміна ролі |
| **Акції** | Знижки (%, фіксована, безкоштовна доставка), промокоди (генерація партією) |
| **Відгуки** | Черга модерації, схвалення/відхилення, відповідь магазину |
| **Контент** | Банери, статичні сторінки, блог |
| **Аналітика** | Продажі по дням/тижнях, топ категорії, конверсія |
| **Налаштування** | Оплата, доставка, ПРРО, SMTP, SEO мета |

---

## 📦 Схема specs товарів (JSONB)

Кожна категорія має власну структуру в полі `specs`:

```
Дрон RTF: frame_size, build_type, motors, esc, fc_firmware, battery_recommended,
          flight_time_min, max_speed_kmh, digital_vtx, configuration
Рама:     size_inch, arm_thickness_mm, material, wheelbase_mm, motor_mount_mm
FC:       mcu (STM32H743), imu (ICM42688P), uarts, dshot, gyro_update_hz
ESC:      configuration (4in1), current_a, firmware (BLHeli_32/AM32), bidirectional_dshot
Мотор:    stator_size (2306), kv (2450), max_thrust_g, efficiency_peak_pct
Пропелер: size_inch, pitch, blades, material (PC/Carbon)
FPV Cam:  sensor, resolution, output (analog/digital_dji), fov_deg, latency_ms
VTX:      power_mw_options, frequency_bands, channels, smart_audio_ver
Приймач:  protocol (ELRS), frequency (2.4/900MHz), latency_ms, range_km
LiPo:     cell_count, capacity_mah, discharge_rating_c, chemistry, connector
Зарядка:  channels, max_charge_power_w, display, wifi_app
Окуляри:  display_type, resolution, fov_deg, dvr, latency_ms, digital
Пульт:    protocol, channels, gimbal_type, usb_sim, battery_capacity_mah
```
Повні структури зі всіма полями — `database/schema.sql` (розділ COMMENT ON COLUMN products.specs).

---

## 💳 Платіжний флоу

```
POST /orders → createOrder → reserveStock
     → createWayForPayInvoice → paymentUrl
         ↓ (redirect)
     WayForPay page
         ↓ (оплата)
     POST /webhooks/wayforpay
         → verifySignature
         → updateOrder(paid)
         → deductStock (тригер)
         → sendConfirmationEmail
         → createCheckboxReceipt (ПРРО)
         → notifyAdmin (WebSocket/Telegram bot)
```

---

## 🗄 Альтернативний варіант: Supabase

Замість власного Fastify backend + Railway PostgreSQL:
- **Supabase** — PostgreSQL + Auth + Storage + Realtime в одному місці
- **Вартість**: безкоштовно до 500MB БД + 1GB Storage
- **RLS policies**: доступ тільки до власних даних без додаткового коду
- **Supabase Auth**: замінює JWT + bcrypt + сесії
- **Supabase Storage**: для фото товарів замість Cloudflare R2

Налаштування: `supabase-alt/supabase-setup.sql`

---

## 🇺🇦 Юридика (Україна)

**ФОП 3-я група ЄП** — рекомендовано:
- 5% від доходу + ЄСВ ~1760 грн/міс
- КВЕД 47.91 (інтернет-торгівля)
- ПРРО обов'язково (Checkbox.ua — безкоштовно)
- Публічна оферта на сайті (`/pages/offer`)
- Політика конфіденційності (`/pages/privacy`)
- Умови повернення 14 днів (`/pages/returns`)

---

## 📬 Email шаблони (Nodemailer)

- Підтвердження реєстрації (email verify link)
- Підтвердження замовлення (номер, склад, сума)
- Замовлення оплачено
- Замовлення відправлено (ТТН НП)
- Відновлення паролю (посилання 24 год)
- Товар знову в наявності (wishlist notify)

---

## 🌐 Деплой

### Бюджетний ($15-30/міс)
```
Frontend  → Vercel (free tier)
Backend   → Railway ($5-10/міс)
Database  → Railway PostgreSQL ($5/міс)
Redis     → Upstash (free до 10k req/день)
Storage   → Supabase Storage (free 1GB)
CDN/DNS   → Cloudflare (free)
Domain    → NIC.UA (.com.ua ~500 грн/рік)
```

### VPS варіант (€10-15/міс)
```
Hetzner CX22 (2 vCPU, 4GB RAM): €5.5/міс
Docker Compose: nginx + backend + postgres + redis
SSL: Let's Encrypt (Certbot)
CDN: Cloudflare (free)
```
