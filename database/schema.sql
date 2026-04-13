-- ============================================================
-- FPV DRONE SHOP — ПОВНА СХЕМА POSTGRESQL
-- Версія: 1.0 | Підтримує: фізичні товари, варіанти, акції,
--   кошик, кабінет, відгуки, адмінку
-- ============================================================

-- Розширення
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- для full-text пошуку
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- для пошуку без акцентів

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE order_status AS ENUM (
  'pending',         -- очікує підтвердження
  'confirmed',       -- підтверджено
  'paid',            -- оплачено
  'processing',      -- в обробці
  'packed',          -- упаковано
  'shipped',         -- відправлено
  'in_transit',      -- в дорозі
  'delivered',       -- доставлено
  'cancelled',       -- скасовано
  'refund_requested',-- запит на повернення
  'refunded'         -- повернено
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'paid', 'failed', 'refunded', 'partial_refund'
);

CREATE TYPE payment_method AS ENUM (
  'wayforpay', 'liqpay', 'monobank', 'card', 'cod'  -- cod = cash on delivery
);

CREATE TYPE delivery_method AS ENUM (
  'nova_poshta_branch',   -- відділення НП
  'nova_poshta_address',  -- адресна НП
  'nova_poshta_locker',   -- поштомат НП
  'ukrposhta',
  'pickup'                -- самовивіз
);

CREATE TYPE user_role AS ENUM ('customer', 'manager', 'admin', 'super_admin');

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'free_shipping');

CREATE TYPE promo_status AS ENUM ('draft', 'active', 'scheduled', 'expired', 'paused');

CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE stock_movement_type AS ENUM (
  'purchase',    -- закупка
  'sale',        -- продаж
  'return',      -- повернення
  'adjustment',  -- коригування
  'write_off'    -- списання
);

-- ============================================================
-- USERS / AUTH
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  email_verified  BOOLEAN DEFAULT FALSE,
  phone           VARCHAR(20) UNIQUE,
  phone_verified  BOOLEAN DEFAULT FALSE,
  password_hash   VARCHAR(255),                   -- NULL для OAuth
  role            user_role DEFAULT 'customer',
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  avatar_url      TEXT,
  birth_date      DATE,
  gender          VARCHAR(10),
  locale          VARCHAR(10) DEFAULT 'uk',
  newsletter      BOOLEAN DEFAULT FALSE,
  sms_notify      BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_auth_providers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  provider     VARCHAR(50) NOT NULL,   -- 'google', 'facebook', 'apple'
  provider_id  VARCHAR(255) NOT NULL,
  access_token TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

CREATE TABLE user_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(255) UNIQUE NOT NULL,
  user_agent    TEXT,
  ip_address    INET,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- АДРЕСИ
-- ============================================================

CREATE TABLE user_addresses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  label          VARCHAR(50),           -- 'Дім', 'Робота'
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  phone          VARCHAR(20) NOT NULL,
  region         VARCHAR(100),
  city           VARCHAR(100) NOT NULL,
  city_ref       VARCHAR(50),           -- Nova Poshta cityRef
  address_line   TEXT,
  np_branch      VARCHAR(10),           -- номер відділення НП
  np_branch_ref  VARCHAR(50),           -- ref відділення НП
  zip_code       VARCHAR(10),
  is_default     BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- КАТАЛОГ / ТОВАРИ
-- ============================================================

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  slug        VARCHAR(200) UNIQUE NOT NULL,
  name        VARCHAR(200) NOT NULL,
  name_ua     VARCHAR(200),
  description TEXT,
  icon        VARCHAR(100),
  image_url   TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  meta_title  VARCHAR(255),
  meta_desc   VARCHAR(500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Специфічні атрибути залежать від категорії
-- Категорії FPV: готові дрони, рами, FC, ESC, мотори, пропелери,
--   камери, VTX, приймачі, антени, акумулятори, зарядки, окуляри, пульти

CREATE TABLE brands (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        VARCHAR(100) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  logo_url    TEXT,
  website     TEXT,
  description TEXT,
  country     VARCHAR(50),
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ТОВАРИ — РОЗШИРЕНА СХЕМА ДЛЯ FPV
-- ============================================================

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     UUID REFERENCES categories(id),
  brand_id        UUID REFERENCES brands(id),

  -- Базова інформація
  slug            VARCHAR(300) UNIQUE NOT NULL,
  name            VARCHAR(300) NOT NULL,
  name_ua         VARCHAR(300),
  sku_base        VARCHAR(100) UNIQUE,        -- базовий артикул
  barcode         VARCHAR(50),

  -- Описи
  short_desc      TEXT,                       -- короткий опис (200 символів)
  description     TEXT,                       -- повний HTML/MD опис
  features        TEXT[],                     -- список ключових особливостей
  in_box          TEXT[],                     -- що в комплекті
  compatibility   TEXT[],                     -- сумісність

  -- Ціноутворення
  price           NUMERIC(10,2) NOT NULL,
  compare_price   NUMERIC(10,2),              -- перекреслена ціна
  cost_price      NUMERIC(10,2),              -- собівартість (тільки для адміна)
  currency        CHAR(3) DEFAULT 'UAH',

  -- Стан та статус
  is_active       BOOLEAN DEFAULT TRUE,
  is_featured     BOOLEAN DEFAULT FALSE,      -- "рекомендований"
  is_new          BOOLEAN DEFAULT FALSE,      -- "новинка"
  is_bestseller   BOOLEAN DEFAULT FALSE,      -- "хіт продажів"

  -- Медіа
  thumbnail_url   TEXT,                       -- головне фото
  images          JSONB DEFAULT '[]',         -- [{url, alt, sort_order}]
  video_url       TEXT,                       -- YouTube/Vimeo embed
  video_urls      TEXT[],                     -- додаткові відео

  -- 3D / AR
  model_3d_url    TEXT,                       -- .glb/.gltf для AR-огляду

  -- SEO
  meta_title      VARCHAR(255),
  meta_desc       VARCHAR(500),
  meta_keywords   VARCHAR(500),

  -- Рейтинг (денормалізований для швидкості)
  rating_avg      NUMERIC(3,2) DEFAULT 0,
  rating_count    INT DEFAULT 0,

  -- Статистика
  view_count      INT DEFAULT 0,
  order_count     INT DEFAULT 0,

  -- Технічні специфікації (JSONB — залежать від категорії, схема нижче)
  specs           JSONB DEFAULT '{}',

  -- Документи
  documents       JSONB DEFAULT '[]',         -- [{name, url, type}] — мануали, схеми

  -- Пошук
  search_vector   TSVECTOR,

  -- Теги та фільтри
  tags            TEXT[] DEFAULT '{}',

  -- Зв'язки
  related_ids     UUID[] DEFAULT '{}',        -- схожі товари
  accessory_ids   UUID[] DEFAULT '{}',        -- рекомендовані аксесуари

  -- Метаінфо
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- СХЕМИ SPECS ПО КАТЕГОРІЯХ (JSONB валідація + документація)
-- ============================================================
-- Нижче — приклади JSONB структур для кожної категорії FPV:

COMMENT ON COLUMN products.specs IS $$
Структури specs по категоріях:

=== Готовий дрон (Ready-to-Fly / Freestyle / Racing) ===
{
  "frame_size": "5inch",          // 3inch, 3.5inch, 5inch, 7inch, 10inch
  "prop_size": "5045",            // розмір пропелерів
  "weight_g": 280,                // вага без АКБ, грами
  "weight_with_battery_g": 490,
  "max_thrust_g": 2800,           // максимальна тяга
  "thrust_to_weight": 4.2,        // співвідношення тяга/вага
  "motors": "2306 2450KV",
  "esc": "45A BLHeli_32",
  "flight_controller": "F7 Stack",
  "camera": "Caddx Ratel 2",
  "vtx": "400mW 5.8GHz",
  "vtx_power_mw": 400,
  "receiver": "ELRS 2.4GHz",
  "battery_recommended": "4S 1300mAh",
  "battery_cell_count": "3S-4S",
  "flight_time_min": 5,
  "max_speed_kmh": 140,
  "max_range_m": 2000,
  "build_type": "RTF",            // RTF, BNF, PNF, Kit
  "configuration": "freestyle",   // freestyle, racing, long_range, cinema, micro
  "fc_firmware": "Betaflight",
  "fc_firmware_ver": "4.4",
  "frame_material": "carbon_fiber",
  "arm_thickness_mm": 4,
  "top_speed_kmh": 140,
  "digital_vtx": false,           // DJI/HDZero/Walksnail
  "digital_system": null
}

=== Рама (Frame) ===
{
  "size_inch": 5,
  "motor_mount_mm": 30.5,         // 16x16, 20x20, 25.5x25.5, 30.5x30.5
  "stack_mount_mm": 30.5,
  "arm_thickness_mm": 5,
  "top_plate_thickness_mm": 2,
  "bottom_plate_thickness_mm": 2,
  "material": "carbon_t700",      // carbon_t300, carbon_t700, carbon_t1000, nylon
  "weight_g": 85,
  "wheelbase_mm": 220,
  "prop_clearance": "true_x",     // true_x, stretched_x, deadcat
  "camera_angle_deg": 30,
  "camera_mount": "20x20",
  "standoff_height_mm": 25,
  "max_prop_size": "5inch",
  "layout": "true_x",
  "frame_type": "quad"            // quad, hex, octo, tricopter
}

=== Польотний контролер (FC) ===
{
  "mcu": "STM32H743",             // F405, F722, H743, H7A3
  "imu": "ICM42688P",             // MPU6000, ICM42688P, BMI270
  "imu_count": 2,                 // dual IMU
  "baro": "BMP280",
  "mount_pattern_mm": "30.5x30.5",
  "firmware": "Betaflight",
  "firmware_ver": "4.4",
  "uarts": 6,
  "motor_outputs": 8,
  "dshot": "DSHOT600",
  "i2c": true,
  "spi": true,
  "usb": "USB-C",
  "blackbox": "Flash 16MB",
  "osd": "AT7456E",               // built-in OSD chip
  "vtx_control": "SmartAudio",    // SmartAudio, IRC Tramp
  "telemetry": "CRSF",
  "voltage_range": "2-6S",
  "current_sensor": true,
  "current_sensor_max_a": 200,
  "pads": ["M1","M2","M3","M4","RX1","TX1","RX2","TX2","CURR","VBAT","5V","GND"],
  "weight_g": 8,
  "dimensions_mm": "36x36",
  "betaflight_target": "DIATONE_MAMBA_H743",
  "gyro_update_hz": 8000
}

=== ESC ===
{
  "configuration": "4in1",        // 4in1, single, 2in1
  "current_a": 45,                // continuous
  "burst_current_a": 55,
  "firmware": "BLHeli_32",        // BLHeli_S, BLHeli_32, AM32, KISS
  "dshot": "DSHOT600",
  "bidirectional_dshot": true,
  "rpm_filter": true,
  "voltage_range": "3-6S",
  "mount_pattern_mm": "30.5x30.5",
  "weight_g": 17,
  "dimensions_mm": "35x35",
  "telemetry": true,
  "motor_connector": "direct",    // direct, jst
  "capacitor_uf": 1000,
  "current_sensor": false
}

=== Мотор (Motor) ===
{
  "stator_size": "2306",          // 1104, 1404, 2004, 2205, 2207, 2306, 2810
  "kv": 2450,                     // KV (обертів/хв на вольт)
  "kv_options": [1700, 1950, 2450],
  "poles": 12,
  "shaft_d_mm": 3.175,
  "mount_pattern_mm": "16x16",    // 9x9, 12x12, 16x16, 19x19
  "prop_shaft": "M5",
  "max_throttle_w": 625,
  "max_thrust_g": 1100,
  "max_current_a": 35,
  "no_load_current_a": 1.2,
  "internal_resistance_mohm": 62,
  "efficiency_peak_pct": 84,
  "recommended_prop": "5045",
  "recommended_battery": "4S",
  "weight_g": 33.5,
  "height_mm": 28.9,
  "stator_height_mm": 6,
  "bearing": "2x high-speed",
  "wire_gauge": "24AWG",
  "wire_length_mm": 150,
  "connector": "none",            // none, JST-PH2, bullet2mm, bullet3.5mm
  "bell_material": "aluminum_7075",
  "rotor_magnet": "N52H"
}

=== Пропелер (Propeller) ===
{
  "size_inch": 5,
  "pitch": 4.5,                   // крок, дюйми
  "blades": 3,
  "material": "polycarbonate",    // polycarbonate, carbon_nylon, carbon_fiber, hq_prop
  "hub_d_mm": 5,
  "mount": "T-mount",             // T-mount, M5 nut, M5 bolt
  "pitch_direction": "CW_CCW",    // CW/CCW пара
  "weight_g_per_set": 5.6,        // вага одного комплекту (2 шт)
  "recommended_motor": "2306",
  "max_rpm": 22000,
  "color_options": ["black","orange","blue","green"]
}

=== FPV Камера ===
{
  "sensor": "STARVIS 2",          // CMOS тип
  "sensor_size": "1/2.8",
  "resolution": "1200TVL",        // або "4K" для цифрових
  "format": "NTSC_PAL",           // NTSC, PAL, NTSC/PAL
  "lens_mm": 2.1,
  "fov_deg": 155,
  "dynamic_range": "WDR",         // WDR, HDR, Standard
  "min_lux": 0.001,
  "aspect_ratio": "4:3",          // 4:3, 16:9
  "output": "analog",             // analog, digital_dji, digital_hdzero, digital_walksnail
  "latency_ms": 0,                // для аналогових 0
  "dimensions_mm": "19x19",
  "weight_g": 9,
  "voltage_range": "5-36V",
  "osd_support": true,
  "microphone": false
}

=== VTX (Відеопередавач) ===
{
  "power_mw_options": [25, 100, 200, 400, 800],
  "max_power_mw": 800,
  "frequency_bands": ["5.8GHz"],
  "channels": 48,
  "band_standards": ["RACEBAND","BOSCAM_A","BOSCAM_B","BOSCAM_E","FATSHARK"],
  "smart_audio_ver": "2.1",
  "protocol": "SmartAudio",      // SmartAudio, IRC Tramp
  "connector": "UFL",            // UFL, SMA, MMCX
  "voltage_range": "5-24V",
  "current_a": 0.5,
  "weight_g": 3.8,
  "dimensions_mm": "28x28",
  "pit_mode": true,
  "led_indicators": true,
  "digital": false
}

=== Приймач (Receiver) ===
{
  "protocol": "ELRS",             // ELRS, FrSky, Spektrum, TBS Crossfire
  "frequency": "2.4GHz",         // 2.4GHz, 900MHz
  "output_protocol": "CRSF",     // CRSF, SBUS, PPM, iBUS
  "latency_ms": 4,
  "range_km": 10,
  "antenna_type": "dipole",
  "pwm_outputs": 0,
  "failsafe": true,
  "telemetry": true,
  "voltage_range": "4-10V",
  "weight_g": 1.5,
  "dimensions_mm": "10x27"
}

=== Акумулятор LiPo ===
{
  "cell_count": 4,                // 1S-6S
  "capacity_mah": 1300,
  "voltage_nominal_v": 14.8,
  "voltage_max_v": 16.8,
  "voltage_storage_v": 15.2,
  "discharge_rating_c": 100,
  "burst_c": 200,
  "max_discharge_a": 130,
  "charge_rating_c": 5,
  "max_charge_a": 6.5,
  "chemistry": "LiPo",           // LiPo, LiHV, Li-Ion
  "lihv": true,                  // HV = 4.35V max замість 4.2V
  "connector": "XT60",           // XT30, XT60, XT90, AS150
  "balance_connector": "JST-XH",
  "weight_g": 154,
  "dimensions_mm": "75x35x26",
  "discharge_cycles": 200,
  "protection": "none",          // none, bms_basic, bms_full
  "brand_cells": "Samsung"       // бренд елементів всередині
}

=== Зарядний пристрій ===
{
  "channels": 1,
  "cell_count_range": "1-6S",
  "chemistry": ["LiPo","LiHV","Li-Ion","NiMH","NiCd","Pb"],
  "max_charge_current_a": 15,
  "max_discharge_current_a": 5,
  "max_charge_power_w": 300,
  "input_voltage": "AC/DC",      // AC, DC, AC/DC
  "input_dc_range": "11-30V",
  "input_ac": "100-240V",
  "balance_charging": true,
  "storage_mode": true,
  "parallel_charging": false,
  "usb_ports": 2,
  "display": "color_touch",      // none, led, lcd, color, color_touch
  "wifi_app": true,
  "bluetooth": false,
  "weight_g": 450,
  "dimensions_mm": "130x95x42"
}

=== FPV Окуляри (Goggles) ===
{
  "display_type": "OLED",        // LCD, OLED, MicroOLED
  "display_size_inch": 0.49,
  "resolution": "1280x960",
  "fov_deg": 46,
  "ipd_mm_range": "59-69",
  "diopter_range": "-8+2",
  "frequency_bands": ["5.8GHz"],
  "receiver_modules": 2,
  "diversity_rx": true,
  "dvr": true,
  "dvr_resolution": "1280x960",
  "dvr_format": "H.264",
  "hdmi_in": true,
  "head_tracker": false,
  "latency_ms": 7,
  "battery_capacity_mah": 1800,
  "battery_life_h": 2.5,
  "charging": "DC5521",          // DC5521, USB-C
  "fan": true,
  "weight_g": 210,
  "digital": false,
  "compatible_systems": ["Fatshark","Skyzone","RapidFire"]
}

=== Пульт керування (Radio Controller) ===
{
  "protocol": "ELRS",            // ELRS, FrSky, Spektrum, MULTI
  "frequency": "2.4GHz",
  "power_mw": 100,
  "channels": 16,
  "telemetry": true,
  "gimbal_type": "hall",         // potentiometer, hall
  "mode": "mode2",               // mode1, mode2, switchable
  "switches": 6,
  "display": "color_touch",
  "audio": true,
  "haptic": true,
  "usb_sim": true,               -- USB для симуляторів
  "battery_capacity_mah": 6000,
  "battery_type": "18650x4",
  "charging": "USB-C",
  "trainer_port": true,
  "wifi": true,
  "bluetooth": true,
  "lua_scripts": true,           // OpenTX/EdgeTX
  "weight_g": 850
}
$$;

-- ============================================================
-- ВАРІАНТИ ТОВАРУ (SKU)
-- ============================================================

CREATE TABLE product_variants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
  sku             VARCHAR(100) UNIQUE NOT NULL,
  barcode         VARCHAR(50),

  -- Атрибути варіанту
  attributes      JSONB NOT NULL DEFAULT '{}',
  -- Приклад: {"color": "black", "kv": "2450", "cell_count": "4S"}

  -- Ціна (може відрізнятись від базової)
  price           NUMERIC(10,2),              -- NULL = використовувати price продукту
  compare_price   NUMERIC(10,2),
  cost_price      NUMERIC(10,2),

  -- Склад
  stock_quantity  INT NOT NULL DEFAULT 0,
  reserved_qty    INT NOT NULL DEFAULT 0,     -- зарезервовано в незавершених замовленнях
  low_stock_alert INT DEFAULT 3,             -- попередження при залишку

  -- Зображення
  image_url       TEXT,                       -- фото конкретного варіанту

  -- Вага та габарити
  weight_g        NUMERIC(8,2),
  length_mm       NUMERIC(6,1),
  width_mm        NUMERIC(6,1),
  height_mm       NUMERIC(6,1),

  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_stock CHECK (stock_quantity >= 0),
  CONSTRAINT chk_reserved CHECK (reserved_qty >= 0 AND reserved_qty <= stock_quantity)
);

-- ============================================================
-- АТРИБУТИ ТА ФІЛЬТРИ
-- ============================================================

CREATE TABLE attribute_groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE attributes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID REFERENCES attribute_groups(id),
  category_id  UUID REFERENCES categories(id),   -- NULL = глобальний
  slug         VARCHAR(100) NOT NULL,
  name         VARCHAR(100) NOT NULL,
  type         VARCHAR(30) DEFAULT 'select',      -- select, multiselect, range, boolean, text
  unit         VARCHAR(20),                       -- 'mAh', 'g', 'MHz', 'mm'
  is_filterable BOOLEAN DEFAULT TRUE,
  is_variant   BOOLEAN DEFAULT FALSE,             -- чи є варіантом товару
  sort_order   INT DEFAULT 0,
  UNIQUE(category_id, slug)
);

CREATE TABLE attribute_values (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attribute_id UUID REFERENCES attributes(id) ON DELETE CASCADE,
  value        VARCHAR(200) NOT NULL,
  label        VARCHAR(200),
  sort_order   INT DEFAULT 0
);

-- ============================================================
-- ЗОБРАЖЕННЯ ТА МЕДІА
-- ============================================================

CREATE TABLE product_media (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  url         TEXT NOT NULL,
  thumb_url   TEXT,
  type        VARCHAR(20) DEFAULT 'image',    -- image, video, 360
  alt         VARCHAR(255),
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- АКЦІЇ ТА ЗНИЖКИ
-- ============================================================

CREATE TABLE promotions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug             VARCHAR(200) UNIQUE NOT NULL,
  name             VARCHAR(200) NOT NULL,
  description      TEXT,
  banner_url       TEXT,
  mobile_banner    TEXT,
  status           promo_status DEFAULT 'draft',
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ,

  -- Тип знижки
  discount_type    discount_type NOT NULL,
  discount_value   NUMERIC(10,2) NOT NULL,   -- % або грн
  min_order_amount NUMERIC(10,2),            -- мінімальна сума замовлення
  max_discount_amount NUMERIC(10,2),          -- максимальна сума знижки

  -- Обмеження
  usage_limit      INT,                      -- max кількість використань
  usage_per_user   INT DEFAULT 1,
  usage_count      INT DEFAULT 0,

  -- Умови
  requires_login   BOOLEAN DEFAULT FALSE,
  first_order_only BOOLEAN DEFAULT FALSE,

  -- SEO
  meta_title       VARCHAR(255),
  meta_desc        VARCHAR(500),

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE promotion_products (
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, product_id)
);

CREATE TABLE promotion_categories (
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, category_id)
);

-- Промокоди
CREATE TABLE promo_codes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id     UUID REFERENCES promotions(id) ON DELETE CASCADE,
  code             VARCHAR(50) UNIQUE NOT NULL,
  discount_type    discount_type NOT NULL,
  discount_value   NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2),
  max_discount_amount NUMERIC(10,2),
  usage_limit      INT,
  usage_per_user   INT DEFAULT 1,
  usage_count      INT DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Групові ціни (оптові, для членів клубу тощо)
CREATE TABLE price_tiers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(100) NOT NULL,
  discount_pct    NUMERIC(5,2) NOT NULL,
  min_order_count INT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_price_tiers (
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  tier_id     UUID REFERENCES price_tiers(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tier_id)
);

-- ============================================================
-- КОШИК
-- ============================================================

CREATE TABLE carts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id   VARCHAR(100),                  -- для гостей
  promo_code   VARCHAR(50),
  notes        TEXT,
  expires_at   TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_cart_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE TABLE cart_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id     UUID REFERENCES carts(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id),
  variant_id  UUID REFERENCES product_variants(id),
  quantity    INT NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL,         -- ціна на момент додавання
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, variant_id),
  CONSTRAINT chk_qty CHECK (quantity > 0)
);

-- ============================================================
-- СПИСОК БАЖАНЬ (WISHLIST)
-- ============================================================

CREATE TABLE wishlists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) DEFAULT 'Обране',
  is_public   BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(64) UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wishlist_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id),
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wishlist_id, product_id)
);

-- ============================================================
-- ПОРІВНЯННЯ ТОВАРІВ
-- ============================================================

CREATE TABLE compare_lists (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE compare_items (
  compare_id UUID REFERENCES compare_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(compare_id, product_id)
);

-- ============================================================
-- ЗАМОВЛЕННЯ
-- ============================================================

CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number      VARCHAR(20) UNIQUE NOT NULL, -- ORD-2024-000001
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_email       VARCHAR(255),                -- для гостей

  -- Статуси
  status            order_status DEFAULT 'pending',
  payment_status    payment_status DEFAULT 'pending',
  payment_method    payment_method,

  -- Суми
  subtotal          NUMERIC(10,2) NOT NULL,
  discount_amount   NUMERIC(10,2) DEFAULT 0,
  shipping_amount   NUMERIC(10,2) DEFAULT 0,
  total             NUMERIC(10,2) NOT NULL,
  currency          CHAR(3) DEFAULT 'UAH',

  -- Промокод
  promo_code        VARCHAR(50),
  promo_discount    NUMERIC(10,2) DEFAULT 0,

  -- Доставка
  delivery_method   delivery_method,
  np_city           VARCHAR(100),
  np_city_ref       VARCHAR(50),
  np_branch         VARCHAR(10),
  np_branch_ref     VARCHAR(50),
  delivery_address  TEXT,
  delivery_region   VARCHAR(100),

  -- Отримувач
  recipient_name    VARCHAR(200) NOT NULL,
  recipient_phone   VARCHAR(20) NOT NULL,
  recipient_email   VARCHAR(255),

  -- Нова пошта
  np_ttn            VARCHAR(30),                 -- ТТН номер
  np_status         VARCHAR(100),               -- статус з НП API

  -- Оплата
  payment_id        VARCHAR(255),               -- id транзакції в платіжній системі
  paid_at           TIMESTAMPTZ,
  payment_data      JSONB DEFAULT '{}',         -- raw відповідь платіжки

  -- Підтвердження
  confirmed_at      TIMESTAMPTZ,
  packed_at         TIMESTAMPTZ,
  shipped_at        TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,

  -- Повернення
  refund_requested_at TIMESTAMPTZ,
  refund_reason     TEXT,
  refund_amount     NUMERIC(10,2),
  refunded_at       TIMESTAMPTZ,

  -- РРО / Чек
  receipt_id        VARCHAR(255),               -- id чека в Checkbox/Вчасно
  receipt_url       TEXT,

  -- Нотатки
  customer_notes    TEXT,
  admin_notes       TEXT,

  ip_address        INET,
  user_agent        TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id       UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  -- Snapshot товару на момент замовлення
  product_name     VARCHAR(300) NOT NULL,
  product_sku      VARCHAR(100),
  product_image    TEXT,
  variant_attrs    JSONB DEFAULT '{}',

  -- Ціни
  unit_price       NUMERIC(10,2) NOT NULL,
  discount_price   NUMERIC(10,2),
  quantity         INT NOT NULL,
  subtotal         NUMERIC(10,2) NOT NULL,

  -- Повернення
  returned_qty     INT DEFAULT 0,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Лог статусів замовлення
CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
  status      order_status NOT NULL,
  comment     TEXT,
  created_by  UUID REFERENCES users(id),         -- адмін або система
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ВІДГУКИ ТА РЕЙТИНГИ
-- ============================================================

CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,

  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         VARCHAR(200),
  body          TEXT NOT NULL,

  -- Плюси / мінуси
  pros          TEXT[],
  cons          TEXT[],

  -- Фото від покупця
  photos        TEXT[] DEFAULT '{}',

  -- Параметри (специфічні для категорії)
  params        JSONB DEFAULT '{}',
  -- Приклад: {"quality": 5, "ease_of_use": 4, "value": 4}

  status        review_status DEFAULT 'pending',
  is_verified   BOOLEAN DEFAULT FALSE,          -- підтверджений покупець
  is_featured   BOOLEAN DEFAULT FALSE,          -- виділений відгук

  -- Реакції
  helpful_count   INT DEFAULT 0,
  unhelpful_count INT DEFAULT 0,

  admin_reply     TEXT,
  admin_reply_at  TIMESTAMPTZ,

  moderated_by    UUID REFERENCES users(id),
  moderated_at    TIMESTAMPTZ,

  ip_address      INET,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE review_reactions (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  review_id  UUID REFERENCES reviews(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, review_id)
);

-- ============================================================
-- ПИТАННЯ ТА ВІДПОВІДІ (Q&A)
-- ============================================================

CREATE TABLE product_questions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  question    TEXT NOT NULL,
  is_public   BOOLEAN DEFAULT TRUE,
  is_answered BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_answers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES product_questions(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  is_official BOOLEAN DEFAULT FALSE,            -- відповідь магазину
  answer      TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- СПОВІЩЕННЯ ПРО НАЯВНІСТЬ (Back in Stock)
-- ============================================================

CREATE TABLE stock_notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL,
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id),
  notified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, variant_id)
);

-- ============================================================
-- РУХ СКЛАДУ
-- ============================================================

CREATE TABLE stock_movements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id   UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  type         stock_movement_type NOT NULL,
  quantity     INT NOT NULL,                    -- позитивне = прихід, від'ємне = витрата
  qty_before   INT NOT NULL,
  qty_after    INT NOT NULL,
  reference_id UUID,                            -- order_id або shipment_id
  note         TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ПОСТАЧАЛЬНИКИ / ЗАКУПКИ
-- ============================================================

CREATE TABLE suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL,
  country     VARCHAR(100),
  website     TEXT,
  contact     VARCHAR(200),
  email       VARCHAR(255),
  phone       VARCHAR(30),
  notes       TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id     UUID REFERENCES suppliers(id),
  order_number    VARCHAR(50) UNIQUE,
  status          VARCHAR(30) DEFAULT 'draft',  -- draft, ordered, in_transit, received
  total_amount    NUMERIC(10,2),
  currency        CHAR(3) DEFAULT 'USD',
  expected_date   DATE,
  received_date   DATE,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  variant_id        UUID REFERENCES product_variants(id),
  quantity          INT NOT NULL,
  unit_cost         NUMERIC(10,2) NOT NULL,
  received_qty      INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- КОНТЕНТ / CMS
-- ============================================================

CREATE TABLE pages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        VARCHAR(200) UNIQUE NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  meta_title  VARCHAR(255),
  meta_desc   VARCHAR(500),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE banners (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL,
  position    VARCHAR(50),                      -- 'hero', 'sidebar', 'category_top'
  image_url   TEXT NOT NULL,
  mobile_url  TEXT,
  link        TEXT,
  alt         VARCHAR(255),
  is_active   BOOLEAN DEFAULT TRUE,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blog_posts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug         VARCHAR(300) UNIQUE NOT NULL,
  title        VARCHAR(300) NOT NULL,
  excerpt      TEXT,
  body         TEXT NOT NULL,
  cover_url    TEXT,
  author_id    UUID REFERENCES users(id),
  category     VARCHAR(100),
  tags         TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  view_count   INT DEFAULT 0,
  meta_title   VARCHAR(255),
  meta_desc    VARCHAR(500),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- НАЛАШТУВАННЯ / КОНФІГУРАЦІЯ
-- ============================================================

CREATE TABLE settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB NOT NULL,
  group_name VARCHAR(50) DEFAULT 'general',
  label      VARCHAR(200),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Початкові налаштування
INSERT INTO settings (key, value, group_name, label) VALUES
  ('site_name',         '"FPV DRONE SHOP"',    'general',  'Назва магазину'),
  ('site_email',        '"info@fpvshop.ua"',   'general',  'Email магазину'),
  ('site_phone',        '"+380991234567"',     'general',  'Телефон магазину'),
  ('currency',          '"UAH"',               'general',  'Валюта'),
  ('free_shipping_from','"2000"',              'shipping', 'Безкоштовна доставка від (грн)'),
  ('wayforpay_enabled', 'true',               'payments', 'WayForPay активний'),
  ('liqpay_enabled',    'false',              'payments', 'LiqPay активний'),
  ('reviews_auto_approve','false',            'reviews',  'Автоматичне схвалення відгуків'),
  ('prro_enabled',      'true',              'fiscal',   'ПРРО активний'),
  ('smtp_host',         '"smtp.gmail.com"',   'email',    'SMTP Host');

-- ============================================================
-- ПОВІДОМЛЕННЯ / NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,           -- 'order_status', 'back_in_stock', 'promo'
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',
  is_read     BOOLEAN DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- АНАЛІТИКА / ПОДІЇ
-- ============================================================

CREATE TABLE analytics_events (
  id          BIGSERIAL PRIMARY KEY,
  session_id  VARCHAR(100),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type  VARCHAR(50) NOT NULL,           -- 'view', 'add_to_cart', 'purchase', 'search'
  entity_type VARCHAR(50),                   -- 'product', 'category', 'search'
  entity_id   UUID,
  data        JSONB DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE analytics_events_2024 PARTITION OF analytics_events
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE analytics_events_2025 PARTITION OF analytics_events
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE analytics_events_2026 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- ============================================================
-- ІНДЕКСИ
-- ============================================================

-- Products
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active ON products(is_active, published_at DESC);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_rating ON products(rating_avg DESC);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_specs ON products USING GIN(specs);
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- Variants
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_stock ON product_variants(stock_quantity) WHERE stock_quantity > 0;

-- Orders
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Cart
CREATE INDEX idx_cart_user ON carts(user_id);
CREATE INDEX idx_cart_session ON carts(session_id);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);

-- Reviews
CREATE INDEX idx_reviews_product ON reviews(product_id, status);
CREATE INDEX idx_reviews_user ON reviews(user_id);

-- Analytics
CREATE INDEX idx_analytics_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_entity ON analytics_events(entity_type, entity_id);

-- ============================================================
-- ФУНКЦІЇ ТА ТРИГЕРИ
-- ============================================================

-- Автооновлення updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cart_updated BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Оновлення search_vector
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('ukrainian',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.name_ua, '') || ' ' ||
    COALESCE(NEW.sku_base, '') || ' ' ||
    COALESCE(NEW.short_desc, '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_search BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Генерація номера замовлення
CREATE SEQUENCE order_number_seq;
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'FPV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(nextval('order_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_number BEFORE INSERT ON orders
  FOR EACH ROW WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- Оновлення рейтингу товару
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET
    rating_avg = (SELECT AVG(rating) FROM reviews WHERE product_id = NEW.product_id AND status = 'approved'),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id AND status = 'approved')
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_rating AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Резервування складу при створенні замовлення
CREATE OR REPLACE FUNCTION reserve_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE product_variants
  SET reserved_qty = reserved_qty + NEW.quantity
  WHERE id = NEW.variant_id
    AND (stock_quantity - reserved_qty) >= NEW.quantity;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Недостатньо товару на складі для variant_id=%', NEW.variant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Списання складу при оплаті замовлення
CREATE OR REPLACE FUNCTION deduct_stock_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    UPDATE product_variants pv
    SET stock_quantity = pv.stock_quantity - oi.quantity,
        reserved_qty   = pv.reserved_qty - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.variant_id = pv.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deduct_stock AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION deduct_stock_on_payment();

-- ============================================================
-- VIEWS (зручні запити)
-- ============================================================

CREATE VIEW v_products_catalog AS
SELECT
  p.id, p.slug, p.name, p.name_ua,
  p.price, p.compare_price,
  p.thumbnail_url, p.rating_avg, p.rating_count,
  p.is_featured, p.is_new, p.is_bestseller,
  p.is_active, p.specs, p.tags,
  c.name AS category_name, c.slug AS category_slug,
  b.name AS brand_name, b.slug AS brand_slug,
  COALESCE(SUM(v.stock_quantity), 0) AS total_stock,
  COUNT(DISTINCT v.id) AS variant_count
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN brands b ON b.id = p.brand_id
LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_active = true
WHERE p.is_active = true
GROUP BY p.id, c.id, b.id;

CREATE VIEW v_low_stock_variants AS
SELECT
  v.id, v.sku, v.stock_quantity, v.low_stock_alert,
  v.attributes, p.name AS product_name, p.id AS product_id
FROM product_variants v
JOIN products p ON p.id = v.product_id
WHERE v.stock_quantity <= v.low_stock_alert AND v.is_active = true;

CREATE VIEW v_order_stats AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS order_count,
  SUM(total) AS revenue,
  AVG(total) AS avg_order_value
FROM orders
WHERE status NOT IN ('cancelled', 'refunded')
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;
