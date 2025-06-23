const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Tüm tetikleme API'lerini getir
const getAllTriggers = async (req, res) => {
    try {
        const { environment, sim_type, payment_type, trigger_type } = req.query;
        
        let query = supabase.from('courier_triggers').select('*');

        if (environment) {
            query = query.eq('environment', environment);
        }

        // Backward compatibility için sim_type'ı desteklemeye devam et
        if (sim_type) {
            query = query.eq('payment_type', sim_type);
        }

        if (payment_type) {
            query = query.eq('payment_type', payment_type);
        }

        if (trigger_type) {
            query = query.eq('trigger_type', trigger_type);
        }

        query = query.order('order_index', { ascending: true }).order('created_at', { ascending: true });

        const { data: triggers, error } = await query;

        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            data: triggers || []
        });
    } catch (error) {
        console.error('Tetikleme API\'leri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Tetikleme API\'leri getirilemedi'
        });
    }
};

// Yeni tetikleme API'si ekle
const createTrigger = async (req, res) => {
    try {
        const {
            environment,
            sim_type,
            payment_type,
            trigger_type = 'courier',
            api_name,
            endpoint,
            method = 'POST',
            body,
            headers,
            validation_script,
            order_index = 0,
            active = true
        } = req.body;

        // Backward compatibility: sim_type varsa payment_type olarak kullan
        const finalPaymentType = payment_type || sim_type;

        // Validation
        if (!environment || !finalPaymentType || !api_name || !endpoint) {
            return res.status(400).json({
                success: false,
                message: 'Environment, payment_type, api_name ve endpoint alanları zorunludur'
            });
        }

        const insertData = {
            environment,
            payment_type: finalPaymentType,
            trigger_type,
            api_name,
            endpoint,
            method,
            body,
            headers,
            validation_script,
            order_index,
            active,
            created_by: req.user?.username || 'admin',
            updated_at: new Date().toISOString()
        };

        // Sadece courier tipinde sim_type ekle
        if (trigger_type === 'courier') {
            insertData.sim_type = finalPaymentType;
        }

        const { data, error } = await supabase
            .from('courier_triggers')
            .insert([insertData])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            
            if (error.code === '23505') { // Unique constraint violation
                return res.status(400).json({
                    success: false,
                    message: 'Bu kombinasyon için aynı isimde API zaten var'
                });
            }
            
            throw error;
        }

        res.status(201).json({
            success: true,
            message: 'Tetikleme API\'si başarıyla eklendi',
            data: data[0]
        });
    } catch (error) {
        console.error('Tetikleme API\'si ekleme hatası:', error);

        res.status(500).json({
            success: false,
            message: 'Tetikleme API\'si eklenemedi'
        });
    }
};

// Tetikleme API'sini güncelle
const updateTrigger = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            environment,
            sim_type,
            payment_type,
            trigger_type,
            api_name,
            endpoint,
            method,
            body,
            headers,
            validation_script,
            order_index,
            active
        } = req.body;

        // Backward compatibility: sim_type varsa payment_type olarak kullan
        const finalPaymentType = payment_type || sim_type;

        const updateData = {
            environment,
            payment_type: finalPaymentType,
            trigger_type,
            api_name,
            endpoint,
            method,
            body,
            headers,
            validation_script,
            order_index,
            active,
            updated_at: new Date().toISOString()
        };

        // Sadece courier tipinde sim_type ekle
        if (trigger_type === 'courier') {
            updateData.sim_type = finalPaymentType;
        }

        const { data, error } = await supabase
            .from('courier_triggers')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tetikleme API\'si bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Tetikleme API\'si başarıyla güncellendi'
        });
    } catch (error) {
        console.error('Tetikleme API\'si güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Tetikleme API\'si güncellenemedi'
        });
    }
};

// Tetikleme API'sini sil
const deleteTrigger = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('courier_triggers')
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tetikleme API\'si bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Tetikleme API\'si başarıyla silindi'
        });
    } catch (error) {
        console.error('Tetikleme API\'si silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Tetikleme API\'si silinemedi'
        });
    }
};

// API sırasını güncelle
const updateTriggerOrder = async (req, res) => {
    try {
        const { triggers } = req.body; // [{ id, order_index }, ...]

        // Supabase'de transaction yok, tek tek update yapacağız
        const promises = triggers.map(trigger => {
            return supabase
                .from('courier_triggers')
                .update({ 
                    order_index: trigger.order_index,
                    updated_at: new Date().toISOString()
                })
                .eq('id', trigger.id);
        });

        const results = await Promise.all(promises);
        
        // Herhangi bir hata var mı kontrol et
        const hasError = results.some(result => result.error);
        if (hasError) {
            throw new Error('Bazı kayıtlar güncellenemedi');
        }

        res.json({
            success: true,
            message: 'API sıralaması başarıyla güncellendi'
        });
    } catch (error) {
        console.error('API sıralama güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'API sıralaması güncellenemedi'
        });
    }
};

// Specific environment ve sim_type için aktif API'leri getir (eski format - backward compatibility)
const getActiveTriggers = async (req, res) => {
    try {
        const { environment, sim_type } = req.params;

        const { data: triggers, error } = await supabase
            .from('courier_triggers')
            .select('*')
            .eq('environment', environment)
            .eq('payment_type', sim_type) // payment_type'ı kullan
            .eq('trigger_type', 'courier') // Sadece courier tipi
            .eq('active', true)
            .order('order_index', { ascending: true });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: triggers || []
        });
    } catch (error) {
        console.error('Aktif tetikleme API\'leri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Aktif tetikleme API\'leri getirilemedi'
        });
    }
};

// Yeni format: trigger_type ile aktif API'leri getir
const getActiveTriggersByType = async (req, res) => {
    try {
        const { trigger_type, environment, payment_type } = req.params;

        const { data: triggers, error } = await supabase
            .from('courier_triggers')
            .select('*')
            .eq('trigger_type', trigger_type)
            .eq('environment', environment)
            .eq('payment_type', payment_type)
            .eq('active', true)
            .order('order_index', { ascending: true });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: triggers || []
        });
    } catch (error) {
        console.error('Aktif tetikleme API\'leri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Aktif tetikleme API\'leri getirilemedi'
        });
    }
};

// CORS bypass proxy for courier triggers
const proxyRequest = async (req, res) => {
    try {
        const { endpoint, method = 'POST', headers = {}, body } = req.body;
        
        if (!endpoint) {
            return res.status(400).json({
                success: false,
                message: 'Endpoint gereklidir'
            });
        }

        // Base URL belirleme - environment'a göre
        let baseUrl;
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (isProduction) {
            baseUrl = 'https://omnitesttools.vercel.app';
        } else {
            // Local development için localhost:3000 kullan
            baseUrl = 'http://localhost:3000';
        }

        // Full URL oluştur
        const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

        console.log(`Proxy request: ${method} ${fullUrl}`);
        console.log('Headers:', headers);
        console.log('Body:', body);

        // Proxy request config
        const config = {
            method: method.toLowerCase(),
            url: fullUrl,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Omni-Courier-System/1.0',
                ...headers
            },
            timeout: 60000, // 60 saniye timeout
            validateStatus: () => true // Tüm status kodlarını kabul et
        };

        // Body varsa ekle
        if (body && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
            config.data = body;
        }

        // İsteği gönder
        const response = await axios(config);

        // Response'u frontend'e gönder
        // 200-299 arası başarılı kabul edilir (boş response dahil)
        const isSuccess = response.status >= 200 && response.status < 300;
        
        // Frontend'e her zaman 200 status kodu ile başarılı/başarısız bilgisini gönder
        res.status(200).json({
            success: isSuccess,
            originalStatus: response.status, // Gerçek status kodu
            status: response.status,
            statusText: response.statusText,
            data: response.data || null, // Boş data null olarak set et
            headers: response.headers,
            isEmpty: !response.data || response.data === '' // Boş response flag'i
        });

    } catch (error) {
        console.error('Proxy request error:', error);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Hedef sunucuya bağlanılamadı',
                error: 'Bağlantı reddedildi'
            });
        }

        if (error.code === 'ETIMEDOUT') {
            return res.status(408).json({
                success: false,
                message: 'İstek zaman aşımına uğradı',
                error: 'Timeout'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Proxy isteği başarısız',
            error: error.message
        });
    }
};

// Script validation fonksiyonu
const validateWithScript = (script, response, status, headers) => {
    try {
        if (!script || script.trim() === '') {
            return true; // Script yoksa her zaman geçerli kabul et
        }

        // VM2 güvenli JavaScript çalıştırma ortamı yerine basit eval kullanıyoruz
        // Production'da VM2 kullanmak daha güvenli olur
        const scriptFunction = new Function('response', 'status', 'headers', script);
        const result = scriptFunction(response, status, headers);
        
        return Boolean(result);
    } catch (error) {
        console.error('Script validation error:', error);
        // Script hatası durumunda false döndür (güvenli taraf)
        return false;
    }
};

module.exports = {
    getAllTriggers,
    createTrigger,
    updateTrigger,
    deleteTrigger,
    updateTriggerOrder,
    getActiveTriggers,
    getActiveTriggersByType,
    proxyRequest,
    validateWithScript
}; 