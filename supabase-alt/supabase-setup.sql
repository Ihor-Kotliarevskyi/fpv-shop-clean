-- ============================================================
-- SUPABASE АЛЬТЕРНАТИВА
-- Цей файл містить Supabase-специфічні налаштування
-- Основна схема: ../database/schema.sql (спільна)
-- ============================================================

-- ── Row Level Security (RLS) ──────────────────────────────

-- Users: бачать тільки свій профіль
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid()::text = id::text);
CREATE POLICY "users_admin" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','super_admin'))
  );

-- Orders: власні замовлення
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_own" ON orders
  FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "orders_admin" ON orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','manager','super_admin'))
  );

-- Cart: власний кошик
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_own" ON carts
  FOR ALL USING (user_id::text = auth.uid()::text OR session_id IS NOT NULL);

-- Products: читання для всіх, запис тільки адміни
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "products_admin" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','manager','super_admin'))
  );

-- Reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_read" ON reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "reviews_own" ON reviews FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- ── Supabase Storage buckets ──────────────────────────────

-- Треба виконати через Supabase Dashboard або API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('blog', 'blog', true);

-- ── Supabase Auth hooks ───────────────────────────────────

-- Автоматично створювати запис у users при реєстрації через Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ── Supabase Realtime ─────────────────────────────────────
-- Увімкнути realtime для замовлень (адмін отримує сповіщення)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
