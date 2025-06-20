-- courier_triggers tablosunu cihaz tetikleme için genişletme
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. trigger_type kolonu ekle
ALTER TABLE public.courier_triggers 
ADD COLUMN trigger_type TEXT NOT NULL DEFAULT 'courier' CHECK (trigger_type IN ('courier', 'device'));

-- 2. sim_type kolonunu daha genel hale getir (payment_type için kullanılacak)
-- Mevcut verileri korumak için önce yeni kolon ekle
ALTER TABLE public.courier_triggers 
ADD COLUMN payment_type TEXT;

-- 3. Mevcut veriler için payment_type'ı sim_type'dan dönüştür
UPDATE public.courier_triggers 
SET payment_type = CASE 
    WHEN sim_type = 'fiziksel' THEN 'fiziksel'
    WHEN sim_type = 'esim' THEN 'esim'
    ELSE sim_type
END;

-- 4. payment_type'ı NOT NULL yap ve constraint ekle
ALTER TABLE public.courier_triggers 
ALTER COLUMN payment_type SET NOT NULL;

-- 5. sim_type kolonunu nullable yap (backward compatibility için)
ALTER TABLE public.courier_triggers 
ALTER COLUMN sim_type DROP NOT NULL;

-- 6. Cihaz tetikleme için yeni constraint
ALTER TABLE public.courier_triggers 
ADD CONSTRAINT check_payment_type CHECK (
    (trigger_type = 'courier' AND payment_type IN ('fiziksel', 'esim')) OR
    (trigger_type = 'device' AND payment_type IN ('temlikli', 'pesin'))
);

-- 7. Eski unique constraint'i kaldır ve yeni ekle
ALTER TABLE public.courier_triggers 
DROP CONSTRAINT IF EXISTS unique_env_sim_name_order;

ALTER TABLE public.courier_triggers 
ADD CONSTRAINT unique_env_type_payment_name_order 
UNIQUE(environment, trigger_type, payment_type, api_name, order_index);

-- 8. Yeni index'ler ekle
CREATE INDEX idx_courier_triggers_type_env_payment ON public.courier_triggers(trigger_type, environment, payment_type);
DROP INDEX IF EXISTS idx_courier_triggers_env_sim;

-- 9. Cihaz tetikleme için örnek veriler ekle
INSERT INTO public.courier_triggers (environment, trigger_type, payment_type, api_name, endpoint, method, body, order_index, created_by) VALUES
('regresyon', 'device', 'temlikli', 'Cihaz Aktivasyonu', '/api/device/activation', 'POST', '{"customerOrder": "{{customerOrder}}", "imei": "{{imei}}", "paymentType": "temlikli"}', 1, 'system'),
('regresyon', 'device', 'temlikli', 'Kredi Kontrolü', '/api/device/credit-check', 'POST', '{"customerOrder": "{{customerOrder}}", "imei": "{{imei}}"}', 2, 'system'),
('regresyon', 'device', 'temlikli', 'Taksit Planı', '/api/device/installment-plan', 'POST', '{"customerOrder": "{{customerOrder}}", "imei": "{{imei}}", "paymentType": "temlikli"}', 3, 'system'),
('regresyon', 'device', 'pesin', 'Cihaz Aktivasyonu', '/api/device/activation', 'POST', '{"customerOrder": "{{customerOrder}}", "imei": "{{imei}}", "paymentType": "pesin"}', 1, 'system'),
('regresyon', 'device', 'pesin', 'Ödeme İşlemi', '/api/device/payment', 'POST', '{"customerOrder": "{{customerOrder}}", "imei": "{{imei}}", "amount": "{{amount}}"}', 2, 'system'),
('regresyon', 'device', 'iade_reddi', 'İade Reddi İşlemi', '/api/device/refund/reject', 'POST', '{"customerOrder": "{{customerOrder}}", "action": "reject_refund", "reason": "customer_request"}', 1, 'system'),
('regresyon', 'device', 'iade_reddi', 'İade Reddi Bildirimi', '/api/device/refund/notify', 'POST', '{"customerOrder": "{{customerOrder}}", "status": "rejected", "notificationType": "email"}', 2, 'system'),
('fonksiyonel', 'device', 'temlikli', 'Cihaz Aktivasyonu', '/api/device/activation', 'POST', '{"customerOrder": "{{customerOrder}}", "imei": "{{imei}}", "paymentType": "temlikli"}', 1, 'system'),
('fonksiyonel', 'device', 'pesin', 'Cihaz Aktivasyonu', '/api/device/activation', 'POST', '{"customerOrder": "{{customerOrder}}", "imei": "{{imei}}", "paymentType": "pesin"}', 1, 'system'),
('fonksiyonel', 'device', 'iade_reddi', 'İade Reddi İşlemi', '/api/device/refund/reject', 'POST', '{"customerOrder": "{{customerOrder}}", "action": "reject_refund", "reason": "customer_request"}', 1, 'system');

-- 9. RLS policy'lerini güncelle (isteğe bağlı - mevcut policy'ler çalışmaya devam edecek)
-- Yeni policy eklemek isterseniz:
-- CREATE POLICY "Device triggers access" ON public.courier_triggers
--     FOR ALL USING (trigger_type = 'device' AND [your_auth_logic]); 