const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, sicil_no, full_name, role, created_at, updated_at, last_login')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: data
        });
    } catch (err) {
        console.error("Error in getAllUsers:", err);
        res.status(500).json({ 
            success: false,
            error: "Kullanıcılar yüklenirken hata oluştu" 
        });
    }
};

// Create new user
const createUser = async (req, res) => {
    try {
        const { sicil_no, full_name, role, password } = req.body;

        // Validate required fields
        if (!sicil_no || !full_name || !role || !password) {
            return res.status(400).json({
                success: false,
                error: "Tüm alanlar zorunludur"
            });
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('sicil_no', sicil_no)
            .single();

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: "Bu sicil numarası zaten kullanılıyor"
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const { data, error } = await supabase
            .from('users')
            .insert({
                sicil_no,
                full_name,
                role,
                password: hashedPassword
            })
            .select('id, sicil_no, full_name, role, created_at, updated_at, last_login')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: data,
            message: "Kullanıcı başarıyla oluşturuldu"
        });
    } catch (err) {
        console.error("Error in createUser:", err);
        res.status(500).json({ 
            success: false,
            error: "Kullanıcı oluşturulurken hata oluştu" 
        });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, role } = req.body;

        // Validate required fields
        if (!full_name || !role) {
            return res.status(400).json({
                success: false,
                error: "Ad soyad ve rol zorunludur"
            });
        }

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .single();

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: "Kullanıcı bulunamadı"
            });
        }

        const { data, error } = await supabase
            .from('users')
            .update({
                full_name,
                role,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('id, sicil_no, full_name, role, created_at, updated_at, last_login')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: data,
            message: "Kullanıcı başarıyla güncellendi"
        });
    } catch (err) {
        console.error("Error in updateUser:", err);
        res.status(500).json({ 
            success: false,
            error: "Kullanıcı güncellenirken hata oluştu" 
        });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, sicil_no')
            .eq('id', id)
            .single();

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: "Kullanıcı bulunamadı"
            });
        }

        // Prevent admin from deleting themselves
        if (req.user && req.user.id === id) {
            return res.status(400).json({
                success: false,
                error: "Kendi hesabınızı silemezsiniz"
            });
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: "Kullanıcı başarıyla silindi"
        });
    } catch (err) {
        console.error("Error in deleteUser:", err);
        res.status(500).json({ 
            success: false,
            error: "Kullanıcı silinirken hata oluştu" 
        });
    }
};

// Reset user password
const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, sicil_no')
            .eq('id', id)
            .single();

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: "Kullanıcı bulunamadı"
            });
        }

        // Generate new password (you can customize this logic)
        const newPassword = existingUser.sicil_no.toString(); // Default to sicil_no
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const { error } = await supabase
            .from('users')
            .update({
                password: hashedPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: "Şifre başarıyla sıfırlandı",
            newPassword: newPassword // In production, you might want to send this via email instead
        });
    } catch (err) {
        console.error("Error in resetUserPassword:", err);
        res.status(500).json({ 
            success: false,
            error: "Şifre sıfırlanırken hata oluştu" 
        });
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('users')
            .select('id, sicil_no, full_name, role, created_at, updated_at, last_login')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                error: "Kullanıcı bulunamadı"
            });
        }

        res.json({
            success: true,
            data: data
        });
    } catch (err) {
        console.error("Error in getUserById:", err);
        res.status(500).json({ 
            success: false,
            error: "Kullanıcı yüklenirken hata oluştu" 
        });
    }
};

// Get user statistics
const getUserStats = async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('role, last_login, created_at');

        if (error) throw error;

        const stats = {
            total_users: users.length,
            admin_count: users.filter(u => u.role === 'admin').length,
            support_count: users.filter(u => u.role === 'support').length,
            tester_count: users.filter(u => u.role === 'tester').length,
            active_users: users.filter(u => u.last_login).length,
            inactive_users: users.filter(u => !u.last_login).length,
            new_users_this_month: users.filter(u => {
                const created = new Date(u.created_at);
                const now = new Date();
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
            }).length
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error("Error in getUserStats:", err);
        res.status(500).json({ 
            success: false,
            error: "İstatistikler yüklenirken hata oluştu" 
        });
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    getUserById,
    getUserStats
};
