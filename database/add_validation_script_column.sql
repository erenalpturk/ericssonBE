-- API Validation Script kolonu ekleme
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. validation_script kolonu ekle
ALTER TABLE public.courier_triggers 
ADD COLUMN validation_script TEXT;

-- 2. validation_script için yorum ekle
COMMENT ON COLUMN public.courier_triggers.validation_script IS 
'JavaScript validation script to check API response. Must return true/false. 
Available variables: response (response body), status (HTTP status), headers (response headers)
Example: return response.success === true && response.data !== null;';

-- 3. Örnek validation script'leri ile mevcut verileri güncelle
UPDATE public.courier_triggers 
SET validation_script = 'return response.success === true;'
WHERE validation_script IS NULL;

-- 4. Yeni örnek veriler ekle (validation script'li)
INSERT INTO public.courier_triggers (environment, trigger_type, payment_type, api_name, endpoint, method, body, validation_script, order_index, created_by) VALUES
('regresyon', 'courier', 'fiziksel', 'Kurye Durum Kontrolü', '/api/courier/status-check', 'POST', 
'{"customerOrder": "{{customerOrder}}", "tid": "{{tid}}", "iccid": "{{iccid}}"}', 
'return response.success === true && response.status === "active";', 
4, 'system'),

('regresyon', 'device', 'temlikli', 'Kredi Skorlama', '/api/device/credit-score', 'POST', 
'{"customerOrder": "{{customerOrder}}", "imei": "{{imei}}"}', 
'return response.success === true && response.creditScore >= 500;', 
4, 'system'),

('regresyon', 'device', 'pesin', 'Stok Kontrolü', '/api/device/stock-check', 'POST', 
'{"customerOrder": "{{customerOrder}}", "imei": "{{imei}}"}', 
'return response.success === true && response.stockAvailable === true;', 
3, 'system');

-- 5. Index ekle (performans için)
CREATE INDEX idx_courier_triggers_has_script ON public.courier_triggers(validation_script) 
WHERE validation_script IS NOT NULL; 