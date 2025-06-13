const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const { v4: uuidv4 } = require("uuid");
const path = require("path");

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

    try {
        const { user_sicil_no, title, message } = req.body;
        const file = req.file;  // multer yükledi

        // 1️⃣ Validasyon
        if (!title || !message) {
            return res.status(400).json({ error: "Başlık ve mesaj zorunlu." });
        }
        if (!user_sicil_no && user_sicil_no !== "ALL") {
            return res.status(400).json({
                error: "user_sicil_no zorunlu, veya ALL olarak gönder."
            });
        }
        // 2️⃣ Fotoğraf varsa Storage'a yükle
        let imageUrl = null;
        if (file) {

            // unique dosya adı
            const ext = path.extname(file.originalname);
            const fileName = `${uuidv4()}${ext}`;
            const filePath = `notification-photos/${fileName}`;

            // upload
            const { data: uploadData, error: uploadErr } =
                await supabase
                    .storage
                    .from("notification-photos")
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype,
                        upsert: false
                    });

            if (uploadErr) {
                console.error("Upload HATASI:", uploadErr);
                return res.status(500).json({ error: uploadErr });
            }

            // public URL
            const { data: publicUrlData, error: urlErr } = supabase
                .storage
                .from("notification-photos")
                .getPublicUrl(filePath);

            if (urlErr) throw urlErr;

            imageUrl = publicUrlData?.publicUrl;
        }
        // 3️⃣ Bildirim objelerini hazırla
        let notifications = [];
        if (user_sicil_no === "ALL") {
            const { data: users, error: usersErr } =
                await supabase
                    .from("users")
                    .select("sicil_no")
                    .not("role", "eq", "admin");
            if (usersErr) throw usersErr;
            if (!users.length) {
                return res
                    .status(404)
                    .json({ error: "Bildirim gönderilecek kullanıcı bulunamadı." });
            }
            notifications = users.map(u => ({
                user_sicil_no: u.sicil_no,
                title,
                message,
                image_url: imageUrl,
                cdate: new Date().toISOString(),
                statu: "UNREAD"
            }));
        } else {
            notifications.push({
                user_sicil_no,
                title,
                message,
                image_url: imageUrl,
                cdate: new Date().toISOString(),
                statu: "UNREAD"
            });
        }

        // 4️⃣ Veritabanına kaydet
        const { data, error: insertErr } = await supabase
            .from("notifications")
            .insert(notifications)
            .select();
        if (insertErr) throw insertErr;

        // 5️⃣ Yanıt
        res.status(201).json({
            message:
                user_sicil_no === "ALL"
                    ? `${notifications.length} kullanıcıya bildirim gönderildi.`
                    : "Bildirim başarıyla oluşturuldu.",
            data
        });
    } catch (err) {
        console.error("createNotification error:", err);
        res.status(500).json({ error: "Sunucu hatası." });
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

const getAllUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('sicil_no, full_name, role')
            .order('full_name', { ascending: true });

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

// Bildirim geçmişini getir (Admin Panel için)
const getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Tüm bildirimleri getir
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                id,
                user_sicil_no,
                title,
                message,
                image_url,
                statu,
                cdate,
                udate
            `)
            .order('cdate', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        // Kullanıcı bilgilerini ekle
        const usersResponse = await supabase
            .from('users')
            .select('sicil_no, full_name, role');

        if (usersResponse.error) {
            console.warn('Kullanıcı bilgileri alınamadı:', usersResponse.error);
        }

        const users = usersResponse.data || [];
        
        // Bildirimleri kullanıcı bilgileriyle birleştir
        const enrichedData = data.map(notification => {
            let receiver = "Bilinmeyen Kullanıcı";
            
            if (notification.user_sicil_no === "ALL") {
                receiver = "Tüm Kullanıcılar";
            } else {
                const user = users.find(u => u.sicil_no.toString() === notification.user_sicil_no.toString());
                if (user) {
                    receiver = user.full_name;
                } else {
                    receiver = `Sicil No: ${notification.user_sicil_no}`;
                }
            }

            return {
                ...notification,
                receiver,
                sender: "Admin"
            };
        });

        // Toplam sayıyı al
        const { count: totalCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true });

        res.status(200).json({ 
            data: enrichedData, 
            total: totalCount || data.length,
            currentPage: parseInt(page),
            totalPages: Math.ceil((totalCount || data.length) / limit)
        });

    } catch (err) {
        console.error("getNotifications error:", err);
        res.status(500).json({ error: "Sunucu hatası" });
    }
};

// Bildirim sil
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Bildirim ID zorunludur" });
        }

        // Önce bildirimi bul
        const { data: notification, error: findError } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', id)
            .single();

        if (findError || !notification) {
            return res.status(404).json({ error: "Bildirim bulunamadı" });
        }

        // Eğer resim varsa storage'dan da sil
        if (notification.image_url) {
            try {
                // URL'den dosya yolunu çıkar
                const url = new URL(notification.image_url);
                const pathParts = url.pathname.split('/');
                const fileName = pathParts[pathParts.length - 1];
                const filePath = `notification-photos/${fileName}`;

                const { error: deleteStorageError } = await supabase
                    .storage
                    .from('notification-photos')
                    .remove([filePath]);

                if (deleteStorageError) {
                    console.warn('Resim silinemedi:', deleteStorageError);
                }
            } catch (urlError) {
                console.warn('Resim URL\'si parse edilemedi:', urlError);
            }
        }

        // Bildirimi sil
        const { error: deleteError } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        res.status(200).json({ message: "Bildirim başarıyla silindi" });

    } catch (err) {
        console.error("deleteNotification error:", err);
        res.status(500).json({ error: "Sunucu hatası" });
    }
};

// Bildirim düzenle
const updateNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, message } = req.body;

        if (!id) {
            return res.status(400).json({ error: "Bildirim ID zorunludur" });
        }

        if (!title || !message) {
            return res.status(400).json({ error: "Başlık ve mesaj zorunludur" });
        }

        const { data, error } = await supabase
            .from('notifications')
            .update({
                title,
                message,
                udate: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Bildirim bulunamadı" });
        }

        res.status(200).json({ 
            message: "Bildirim başarıyla güncellendi", 
            data: data[0] 
        });

    } catch (err) {
        console.error("updateNotification error:", err);
        res.status(500).json({ error: "Sunucu hatası" });
    }
};

module.exports = {
    updatePassword,
    getUser,
    createNotification,
    getUserNotifications,
    updateNotificationStatus,
    getAllUsers,
    getNotifications,
    deleteNotification,
    updateNotification
};