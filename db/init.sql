-- =============================================================
-- Veasna Shop — full schema aligned with API_CONTRACT.md
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) DEFAULT '',
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  parent_id   INT REFERENCES categories(id) ON DELETE SET NULL,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(180) UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  image       TEXT DEFAULT '',
  sort_order  INT DEFAULT 0,
  feature_menu BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id             SERIAL PRIMARY KEY,
  category_id    INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name           VARCHAR(250) NOT NULL,
  slug           VARCHAR(280) UNIQUE NOT NULL,
  description    TEXT DEFAULT '',
  base_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(10,2),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  rating         NUMERIC(2,1) DEFAULT 0,
  review_count   INT DEFAULT 0,
  tag            VARCHAR(120),
  image          TEXT DEFAULT '',
  color          VARCHAR(20),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id               SERIAL PRIMARY KEY,
  product_id       INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku              VARCHAR(140) UNIQUE NOT NULL,
  variant_type     VARCHAR(50) NOT NULL DEFAULT 'size',
  variant_name     VARCHAR(200) NOT NULL,
  price_adjustment NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity   INT NOT NULL DEFAULT 0,
  color            VARCHAR(20) DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_pairings (
  id                SERIAL PRIMARY KEY,
  product_id        INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  pairing_product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, pairing_product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id                 SERIAL PRIMARY KEY,
  user_id            INT REFERENCES users(id) ON DELETE SET NULL,
  order_number       VARCHAR(64) UNIQUE NOT NULL,
  total_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal           NUMERIC(10,2) DEFAULT 0,
  wrap_fee           NUMERIC(10,2) DEFAULT 0,
  shipping_cost      NUMERIC(10,2) DEFAULT 0,
  tax                NUMERIC(10,2) DEFAULT 0,
  discount           NUMERIC(10,2) DEFAULT 0,
  promo_code         VARCHAR(60),
  fulfillment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method     VARCHAR(255) DEFAULT '',
  payment_last4      VARCHAR(10) DEFAULT '',
  shipping_method    VARCHAR(150) DEFAULT 'Eco-Standard — Carbon Neutral',
  billing_name       VARCHAR(255) DEFAULT '',
  billing_email      VARCHAR(255) DEFAULT '',
  billing_phone      VARCHAR(50)  DEFAULT '',
  shipping_line1     VARCHAR(255) DEFAULT '',
  shipping_line2     VARCHAR(255) DEFAULT '',
  shipping_city      VARCHAR(100) DEFAULT '',
  shipping_state     VARCHAR(100) DEFAULT '',
  shipping_zip       VARCHAR(20)  DEFAULT '',
  shipping_country   VARCHAR(50)  DEFAULT 'US',
  tracking_carrier   VARCHAR(120) DEFAULT '',
  tracking_number    VARCHAR(120) DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id INT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity   INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  name       VARCHAR(250) DEFAULT '',
  image      TEXT DEFAULT '',
  variant_label VARCHAR(250) DEFAULT '',
  sku        VARCHAR(140) DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stripe_transactions (
  id                       SERIAL PRIMARY KEY,
  order_id                 INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stripe_session_id        VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  amount                   NUMERIC(10,2) NOT NULL DEFAULT 0,
  status                   VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wishlists (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS addresses (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      VARCHAR(100) DEFAULT '',
  line1      VARCHAR(255) NOT NULL,
  line2      VARCHAR(255) DEFAULT '',
  city       VARCHAR(100) NOT NULL,
  state      VARCHAR(100) NOT NULL,
  zip        VARCHAR(20)  NOT NULL,
  country    VARCHAR(50)  NOT NULL DEFAULT 'US',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ritual_profiles (
  id                   SERIAL PRIMARY KEY,
  user_id              INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skin_type            VARCHAR(60) DEFAULT '',
  scent_preferences    TEXT DEFAULT '',
  material_preferences TEXT DEFAULT '',
  size_preference      VARCHAR(30) DEFAULT '',
  lifestyle_notes      TEXT DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletters (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  subscribed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug       ON products(slug);
CREATE INDEX IF NOT EXISTS idx_variants_product    ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stripe_tx_session   ON stripe_transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_user         ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_categories_parent   ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user      ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user      ON addresses(user_id);
