const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Tüm feedback'leri getir (kullanıcı sadece kendi feedback'lerini görür)
const getUserFeedbacks = async (req, res) => {
    try {
        const { user_sicil_no } = req.body;
        
        if (!user_sicil_no) {
            return res.status(400).json({
                success: false,
                error: 'Sicil no zorunludur'
            });
        }
        
        const { data, error } = await supabase
            .from('feedbacks')
            .select(`
                *,
                feedback_responses (
                    id,
                    message,
                    is_admin,
                    user_name,
                    created_at
                )
            `)
            .eq('user_sicil_no', user_sicil_no)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ 
            success: true, 
            data: data,
            count: data.length 
        });
    } catch (error) {
        console.error('Kullanıcı feedback\'leri getirilirken hata:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Yeni feedback oluştur
const createFeedback = async (req, res) => {
    try {
        const {
            user_sicil_no,
            user_name,
            user_email,
            type,
            title,
            description,
            priority = 'orta',
            category,
            module_name,
            browser_info,
            steps_to_reproduce,
            expected_result,
            actual_result
        } = req.body;

        // Zorunlu alanları kontrol et
        if (!user_sicil_no || !title || !description || !type) {
            return res.status(400).json({
                success: false,
                error: 'Sicil no, başlık, açıklama ve tip zorunludur'
            });
        }

        const { data, error } = await supabase
            .from('feedbacks')
            .insert([{
                user_sicil_no,
                user_name,
                user_email,
                type,
                title,
                description,
                priority,
                category,
                module_name,
                browser_info,
                steps_to_reproduce,
                expected_result,
                actual_result,
                status: 'beklemede'
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Feedback başarıyla oluşturuldu',
            data: data[0]
        });
    } catch (error) {
        console.error('Feedback oluşturulurken hata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Feedback'e yanıt ekle
const addFeedbackResponse = async (req, res) => {
    try {
        const {
            feedback_id,
            user_sicil_no,
            user_name,
            message,
            is_admin = false
        } = req.body;

        if (!feedback_id || !user_sicil_no || !message) {
            return res.status(400).json({
                success: false,
                error: 'Feedback ID, sicil no ve mesaj zorunludur'
            });
        }

        const { data, error } = await supabase
            .from('feedback_responses')
            .insert([{
                feedback_id,
                user_sicil_no,
                user_name,
                message,
                is_admin
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Yanıt başarıyla eklendi',
            data: data[0]
        });
    } catch (error) {
        console.error('Feedback yanıtı eklenirken hata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ADMIN: Tüm feedback'leri getir
const getAllFeedbacks = async (req, res) => {
    try {
        const { 
            status, 
            type, 
            priority, 
            page = 1, 
            limit = 50,
            search,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = req.query;

        let query = supabase
            .from('feedbacks')
            .select(`
                *,
                feedback_responses (
                    id,
                    message,
                    is_admin,
                    user_name,
                    created_at
                )
            `);

        // Filtreler
        if (status) query = query.eq('status', status);
        if (type) query = query.eq('type', type);
        if (priority) query = query.eq('priority', priority);
        
        // Arama
        if (search) {
            query = query.or(
                `title.ilike.%${search}%,description.ilike.%${search}%,user_name.ilike.%${search}%,user_sicil_no.ilike.%${search}%`
            );
        }

        // Sıralama
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        // Sayfalama
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Admin feedback\'leri getirilirken hata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ADMIN: Feedback durumunu güncelle
const updateFeedbackStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            admin_notes,
            admin_response,
            assigned_to,
            priority
        } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (admin_notes) updateData.admin_notes = admin_notes;
        if (admin_response) updateData.admin_response = admin_response;
        if (assigned_to) updateData.assigned_to = assigned_to;
        if (priority) updateData.priority = priority;

        // Çözüldü durumunda resolved_at tarihini ekle
        if (status === 'cozuldu' || status === 'eklendi') {
            updateData.resolved_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('feedbacks')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Feedback bulunamadı'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Feedback başarıyla güncellendi',
            data: data[0]
        });
    } catch (error) {
        console.error('Feedback durumu güncellenirken hata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ADMIN: Dashboard istatistikleri
const getDashboardStats = async (req, res) => {
    try {
        // Tüm feedback'leri al
        const { data: allFeedbacks, error: allError } = await supabase
            .from('feedbacks')
            .select('*');

        if (allError) throw allError;

        // Bu haftanın başlangıcını hesapla (Pazartesi)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const thisWeekStart = new Date(today.setDate(diff));
        thisWeekStart.setHours(0, 0, 0, 0);

        // İstatistikleri hesapla
        const stats = {
            total_feedbacks: allFeedbacks.length,
            pending_count: allFeedbacks.filter(f => f.status === 'beklemede').length,
            critical_count: allFeedbacks.filter(f => f.priority === 'kritik').length,
            this_week_count: allFeedbacks.filter(f => new Date(f.created_at) >= thisWeekStart).length,
            bug_count: allFeedbacks.filter(f => f.type === 'hata').length,
            suggestion_count: allFeedbacks.filter(f => f.type === 'oneri').length,
            resolved_count: allFeedbacks.filter(f => f.status === 'cozuldu' || f.status === 'eklendi').length,
            in_progress_count: allFeedbacks.filter(f => f.status === 'inceleniyor').length
        };

        // Son 7 gün için trend verileri
        const dailyTrend = {};
        for (let i = 6; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            dailyTrend[date] = { hata: 0, oneri: 0, total: 0 };
        }

        allFeedbacks.forEach(item => {
            const date = item.created_at.split('T')[0];
            if (dailyTrend[date]) {
                dailyTrend[date][item.type]++;
                dailyTrend[date].total++;
            }
        });

        res.status(200).json({
            success: true,
            data: {
                ...stats,
                trend: dailyTrend
            }
        });
    } catch (error) {
        console.error('Dashboard istatistikleri getirilirken hata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Kullanıcı istatistikleri
const getUserStats = async (req, res) => {
    try {
        const { user_sicil_no } = req.body;

        if (!user_sicil_no) {
            return res.status(400).json({
                success: false,
                error: 'Sicil no zorunludur'
            });
        }

        const { data, error } = await supabase
            .from('user_feedback_summary')
            .select('*')
            .eq('user_sicil_no', user_sicil_no);

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: data[0] || {
                user_sicil_no: user_sicil_no,
                total_feedbacks: 0,
                total_bugs: 0,
                total_suggestions: 0,
                pending_count: 0,
                resolved_count: 0,
                implemented_count: 0
            }
        });
    } catch (error) {
        console.error('Kullanıcı istatistikleri getirilirken hata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Feedback detayı getir
const getFeedbackById = async (req, res) => {
    try {
        const { id } = req.params;
        const { sicil_no } = req.body;

        let query = supabase
            .from('feedbacks')
            .select(`
                *,
                feedback_responses (
                    id,
                    message,
                    is_admin,
                    user_name,
                    created_at
                ),
                feedback_attachments (
                    id,
                    file_name,
                    file_url,
                    file_type,
                    file_size,
                    created_at
                )
            `)
            .eq('id', id);

        // Admin değilse sadece kendi feedback'lerini görebilir
        if (sicil_no) {
            query = query.eq('user_sicil_no', sicil_no);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Feedback bulunamadı'
            });
        }

        res.status(200).json({
            success: true,
            data: data[0]
        });
    } catch (error) {
        console.error('Feedback detayı getirilirken hata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    getUserFeedbacks,
    createFeedback,
    addFeedbackResponse,
    getAllFeedbacks,
    updateFeedbackStatus,
    getDashboardStats,
    getUserStats,
    getFeedbackById
}; 