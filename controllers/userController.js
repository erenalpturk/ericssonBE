const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const getUser = async (req, res) => {
    const { sicil_no } = req.body;
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('sicil_no', sicil_no);
    if (error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(200).json({ data: data });
    }
};

const updatePassword = async (req, res) => {
    const { sicil_no, password } = req.body;

    if (!sicil_no || !password) {
        return res.status(400).json({ error: "Sicil no and password are required" });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ password: password })
            .eq('sicil_no', sicil_no)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: `Sicil no ${sicil_no} not found` });
        }

        res.json({ message: `Sicil no ${sicil_no} password updated to ${password}` });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const createNotification = async (req, res) => {
    const { user_sicil_no, message, title } = req.body;
    if (!message || !title) {
        return res.status(400).json({ error: "Mesaj ve başlık zorunludur" });
    }

    if (!user_sicil_no && user_sicil_no !== 'ALL') {
        return res.status(400).json({ error: "Kullanıcı sicil no zorunludur veya herkese gönder seçeneğini işaretleyin" });
    }

    try {
        let notifications = [];

        if (user_sicil_no === 'ALL') {
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('sicil_no')
                .not('role', 'eq', 'admin');
                
            if (usersError) throw usersError;
            
            if (!users || users.length === 0) {
                return res.status(404).json({ error: "Bildirim gönderilecek kullanıcı bulunamadı" });
            }

            notifications = users.map(user => ({
                user_sicil_no: user.sicil_no,
                message,
                title, 
                cdate: new Date().toISOString(),
                statu: 'UNREAD'
            }));
        } else {
            notifications.push({
                user_sicil_no,
                message,
                title,
                cdate: new Date().toISOString(),
                statu: 'UNREAD'
            });
        }

        const { data, error } = await supabase
            .from('notifications')
            .insert(notifications)
            .select();

        if (error) throw error;

        res.status(201).json({ 
            message: user_sicil_no === 'ALL' 
                ? `${notifications.length} kullanıcıya bildirim gönderildi` 
                : "Bildirim başarıyla oluşturuldu", 
            data 
        });
    } catch (err) {
        console.error("Hata:", err);
        res.status(500).json({ error: "Sunucu hatası" });
    }
};

const getUserNotifications = async (req, res) => {
    const { sicil_no } = req.params;

    if (!sicil_no) {
        return res.status(400).json({ error: "Sicil no zorunludur" });
    }

    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_sicil_no', sicil_no)
            .order('cdate', { ascending: false });

        if (error) throw error;

        res.status(200).json({ data });
    } catch (err) {
        console.error("Hata:", err);
        res.status(500).json({ error: "Sunucu hatası" });
    }
};

const updateNotificationStatus = async (req, res) => {
    const { id, user_sicil_no } = req.params;
    const { statu } = req.body;

    if (!id || !user_sicil_no || !statu) {
        return res.status(400).json({ error: "ID, sicil no ve durum zorunludur" });
    }

    try {
        const { data, error } = await supabase
            .from('notifications')
            .update({ 
                statu: statu,
                udate: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_sicil_no', user_sicil_no)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Bildirim bulunamadı" });
        }

        res.status(200).json({ message: "Bildirim durumu güncellendi", data });
    } catch (err) {
        console.error("Hata:", err);
        res.status(500).json({ error: "Sunucu hatası" });
    }
};

module.exports = {
    updatePassword,
    getUser,
    createNotification,
    getUserNotifications,
    updateNotificationStatus
};