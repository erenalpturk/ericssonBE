const { createClient } = require('@supabase/supabase-js');

// Supabase client oluştur
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Tüm kontakları getir
const getAllContacts = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Contacts fetch error:', error);
            return res.status(500).json({
                success: false,
                message: 'Kontaklar getirilirken hata oluştu',
                error: error.message
            });
        }

        res.json({
            success: true,
            data: data || [],
            count: data?.length || 0
        });

    } catch (err) {
        console.error('Get all contacts error:', err);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: err.message
        });
    }
};

// Yeni kontak oluştur
const createContact = async (req, res) => {
    try {
        const { user_name, system_info, contact_info, contact_type, support_test } = req.body;
        console.log(req.headers, 'req.headers')
        // User bilgisini header'dan al
        const userHeader = req.headers['x-user-data'];
        if (!userHeader) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı bilgisi bulunamadı'
            });
        }
        const user = JSON.parse(userHeader);

        // Gerekli alanlar kontrolü
        if (!user_name || !user_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'User adı zorunludur'
            });
        }

        if (!system_info || !system_info.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Sistem bilgisi zorunludur'
            });
        }

        if (!contact_info || !contact_info.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Kontak bilgisi zorunludur'
            });
        }

        if (!contact_type || !['defect', 'mail'].includes(contact_type)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir kontak tipi seçin (defect veya mail)'
            });
        }

        // Defect seçiliyse support_test alanı zorunlu
        if (contact_type === 'defect' && (!support_test || !support_test.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Defect tipi için Support/Test bilgisi zorunludur'
            });
        }

        const contactData = {
            user_name: user_name.trim(),
            system_info: system_info.trim(),
            contact_info: contact_info.trim(),
            contact_type: contact_type,
            support_test: contact_type === 'defect' ? support_test.trim() : null,
            created_by: user.sicil_no
        };

        const { data, error } = await supabase
            .from('contacts')
            .insert([contactData])
            .select()
            .single();

        if (error) {
            console.error('Contact creation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Kontak oluşturulurken hata oluştu',
                error: error.message
            });
        }

        res.status(201).json({
            success: true,
            message: 'Kontak başarıyla oluşturuldu',
            data: data
        });

    } catch (err) {
        console.error('Create contact error:', err);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: err.message
        });
    }
};

// Kontak güncelle
const updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_name, system_info, contact_info, contact_type, support_test } = req.body;
        
        // User bilgisini header'dan al
        const userHeader = req.headers['x-user-data'];
        if (!userHeader) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı bilgisi bulunamadı'
            });
        }

        // Gerekli alanlar kontrolü
        if (!user_name || !user_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'User adı zorunludur'
            });
        }

        if (!system_info || !system_info.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Sistem bilgisi zorunludur'
            });
        }

        if (!contact_info || !contact_info.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Kontak bilgisi zorunludur'
            });
        }

        if (!contact_type || !['defect', 'mail'].includes(contact_type)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir kontak tipi seçin (defect veya mail)'
            });
        }

        // Defect seçiliyse support_test alanı zorunlu
        if (contact_type === 'defect' && (!support_test || !support_test.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Defect tipi için Support/Test bilgisi zorunludur'
            });
        }

        const updateData = {
            user_name: user_name.trim(),
            system_info: system_info.trim(),
            contact_info: contact_info.trim(),
            contact_type: contact_type,
            support_test: contact_type === 'defect' ? support_test.trim() : null,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('contacts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Contact update error:', error);
            return res.status(500).json({
                success: false,
                message: 'Kontak güncellenirken hata oluştu',
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Kontak bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Kontak başarıyla güncellendi',
            data: data
        });

    } catch (err) {
        console.error('Update contact error:', err);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: err.message
        });
    }
};

// Kontak sil
const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        
        // User bilgisini header'dan al
        const userHeader = req.headers['x-user-data'];
        if (!userHeader) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı bilgisi bulunamadı'
            });
        }

        // Kontak var mı kontrol et
        const { data: contact, error: fetchError } = await supabase
            .from('contacts')
            .select('id')
            .eq('id', id)
            .single();

        if (fetchError || !contact) {
            return res.status(404).json({
                success: false,
                message: 'Kontak bulunamadı'
            });
        }

        // Kontağı sil
        const { error: deleteError } = await supabase
            .from('contacts')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Contact delete error:', deleteError);
            return res.status(500).json({
                success: false,
                message: 'Kontak silinirken hata oluştu',
                error: deleteError.message
            });
        }

        res.json({
            success: true,
            message: 'Kontak başarıyla silindi'
        });

    } catch (err) {
        console.error('Delete contact error:', err);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: err.message
        });
    }
};

module.exports = {
    getAllContacts,
    createContact,
    updateContact,
    deleteContact
}; 