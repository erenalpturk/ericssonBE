-- Hızlı constraint düzeltme SQL'i
-- Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. Mevcut sim_type constraint'ini kaldır
ALTER TABLE public.courier_triggers 
DROP CONSTRAINT IF EXISTS courier_triggers_sim_type_check;

-- 2. sim_type kolonunu nullable yap
ALTER TABLE public.courier_triggers 
ALTER COLUMN sim_type DROP NOT NULL;

-- 3. Yeni flexible constraint ekle (sadece courier için zorunlu)
ALTER TABLE public.courier_triggers 
ADD CONSTRAINT check_sim_type_for_courier CHECK (
    (trigger_type = 'courier' AND sim_type IN ('fiziksel', 'esim')) OR
    (trigger_type = 'device' AND sim_type IS NULL) OR
    (trigger_type IS NULL) -- Backward compatibility
);

-- 5. Payment type constraint'i güncelle (İade reddi eklendi)
ALTER TABLE public.courier_triggers 
DROP CONSTRAINT IF EXISTS check_payment_type;

ALTER TABLE public.courier_triggers 
ADD CONSTRAINT check_payment_type_updated CHECK (
    (trigger_type = 'courier' AND payment_type IN ('fiziksel', 'esim')) OR
    (trigger_type = 'device' AND payment_type IN ('temlikli', 'pesin', 'iade_reddi'))
);

-- 4. Mevcut device kayıtları için sim_type'ı temizle
UPDATE public.courier_triggers 
SET sim_type = NULL 
WHERE trigger_type = 'device';

-- 6. İade Reddi örnek verilerini ekle (sadece customerOrder değişkeni)
INSERT INTO public.courier_triggers (environment, trigger_type, payment_type, api_name, endpoint, method, body, order_index, created_by) VALUES
('regresyon', 'device', 'iade_reddi', 'İade Reddi İşlemi', '/api/device/refund/reject', 'POST', '{"customerOrder": "{{customerOrder}}", "action": "reject_refund", "reason": "customer_request"}', 1, 'system'),
('regresyon', 'device', 'iade_reddi', 'İade Reddi Bildirimi', '/api/device/refund/notify', 'POST', '{"customerOrder": "{{customerOrder}}", "status": "rejected", "notificationType": "email"}', 2, 'system'),
('fonksiyonel', 'device', 'iade_reddi', 'İade Reddi İşlemi', '/api/device/refund/reject', 'POST', '{"customerOrder": "{{customerOrder}}", "action": "reject_refund", "reason": "customer_request"}', 1, 'system')
ON CONFLICT DO NOTHING; 