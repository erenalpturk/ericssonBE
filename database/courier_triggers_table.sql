-- Kurye Tetikleme API'leri için Supabase tablo
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

CREATE TABLE public.courier_triggers (
    id BIGSERIAL PRIMARY KEY,
    environment TEXT NOT NULL CHECK (environment IN ('fonksiyonel', 'regresyon', 'hotfix')),
    sim_type TEXT NOT NULL CHECK (sim_type IN ('fiziksel', 'esim')),
    api_name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'POST' CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    body TEXT, -- JSON string
    headers TEXT, -- JSON string for custom headers
    order_index INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    -- Unique constraint to prevent duplicate combinations
    CONSTRAINT unique_env_sim_name_order UNIQUE(environment, sim_type, api_name, order_index)
);

-- Index for faster queries
CREATE INDEX idx_courier_triggers_env_sim ON public.courier_triggers(environment, sim_type);
CREATE INDEX idx_courier_triggers_active ON public.courier_triggers(active);
CREATE INDEX idx_courier_triggers_order ON public.courier_triggers(order_index);

-- RLS (Row Level Security) ayarları
ALTER TABLE public.courier_triggers ENABLE ROW LEVEL SECURITY;

-- Admin kullanıcılar için policy (isteğe bağlı)
-- CREATE POLICY "Admin can manage courier triggers" ON public.courier_triggers
--     FOR ALL USING (auth.role() = 'admin');

-- Tüm kullanıcılar okuyabilir, sadece adminler yazabilir
CREATE POLICY "Anyone can read courier triggers" ON public.courier_triggers
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage courier triggers" ON public.courier_triggers
    FOR ALL USING (false); -- Bu policy'yi kendi auth mantığınıza göre güncelleyin

-- Example data
INSERT INTO public.courier_triggers (environment, sim_type, api_name, endpoint, method, body, order_index, created_by) VALUES
('regresyon', 'fiziksel', 'Kurye Atandı', '/api/courier/assigned', 'POST', '{"customerOrder": "{{customerOrder}}", "tid": "{{tid}}", "iccid": "{{iccid}}"}', 1, 'system'),
('regresyon', 'fiziksel', 'Randevu Onaylandı', '/api/courier/appointment-confirmed', 'POST', '{"customerOrder": "{{customerOrder}}", "tid": "{{tid}}", "iccid": "{{iccid}}"}', 2, 'system'),
('regresyon', 'fiziksel', 'Kurye Yola Çıktı', '/api/courier/on-route', 'POST', '{"customerOrder": "{{customerOrder}}", "tid": "{{tid}}", "iccid": "{{iccid}}"}', 3, 'system'),
('regresyon', 'esim', 'Kurye Atandı', '/api/courier/assigned', 'POST', '{"customerOrder": "{{customerOrder}}", "tid": "{{tid}}"}', 1, 'system'),
('regresyon', 'esim', 'Randevu Onaylandı', '/api/courier/appointment-confirmed', 'POST', '{"customerOrder": "{{customerOrder}}", "tid": "{{tid}}"}', 2, 'system'); 