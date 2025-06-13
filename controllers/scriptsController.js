const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function: Kullanıcı rolünü kontrol et
const checkUserRole = async (sicil_no) => {
    const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('sicil_no', sicil_no)
        .single();
    
    if (error) {
        throw new Error('Kullanıcı bulunamadı');
    }
    
    return data.role;
};

// Tüm scriptleri getir
const getAllScripts = async (req, res) => {
    try {
        const { category, project_name, user_name, page = 1, limit = 50 } = req.query;
        
        let query = supabase
            .from('scripts')
            .select('*')
            .eq('is_active', true);

        // Filtreleme
        if (category) {
            query = query.eq('category', category);
        }
        if (project_name && project_name !== '') {
            query = query.eq('project_name', project_name);
        }
        if (user_name) {
            query = query.ilike('user_name', `%${user_name}%`);
        }

        // Sayfalama
        const offset = (page - 1) * limit;
        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.status(200).json({
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count
            }
        });
    } catch (err) {
        console.error('getAllScripts error:', err);
        res.status(500).json({ error: 'Scriptler getirilemedi' });
    }
};

// Proje listesi getir
const getProjects = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('scripts')
            .select('project_name')
            .eq('category', 'project')
            .eq('is_active', true)
            .not('project_name', 'is', null);

        if (error) throw error;

        // Unique proje isimleri
        const uniqueProjects = [...new Set(data.map(item => item.project_name))].sort();

        res.status(200).json({ data: uniqueProjects });
    } catch (err) {
        console.error('getProjects error:', err);
        res.status(500).json({ error: 'Proje listesi getirilemedi' });
    }
};

// Yeni script oluştur
const createScript = async (req, res) => {
    try {
        const { user_sicil_no, user_name, script_name, description, usage_area, category, project_name } = req.body;

        // Validasyon
        if (!user_sicil_no || !user_name || !script_name || !description || !usage_area || !category) {
            return res.status(400).json({ 
                error: 'Kullanıcı bilgileri, script adı, açıklama, kullanım alanı ve kategori zorunludur' 
            });
        }

        // Kategori kontrolü
        if (!['general', 'project'].includes(category)) {
            return res.status(400).json({ 
                error: 'Kategori general veya project olmalıdır' 
            });
        }

        // Project kategorisi için project_name kontrolü
        if (category === 'project' && !project_name) {
            return res.status(400).json({ 
                error: 'Proje kategorisi için proje adı zorunludur' 
            });
        }

        // General kategorisi için project_name boş olmalı
        if (category === 'general' && project_name) {
            return res.status(400).json({ 
                error: 'Genel kategori için proje adı belirtilmemelidir' 
            });
        }

        // Kullanıcı var mı kontrol et (TÜM ROLLER script oluşturabilir)
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name, role')
            .eq('sicil_no', user_sicil_no)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        // Script adı benzersizlik kontrolü
        const { data: existingScript } = await supabase
            .from('scripts')
            .select('id')
            .eq('script_name', script_name)
            .eq('is_active', true)
            .single();

        if (existingScript) {
            return res.status(400).json({ 
                error: 'Bu script adı zaten kullanılıyor' 
            });
        }

        // Script oluştur (TÜM KULLANICILAR oluşturabilir - admin dahil)
        const scriptData = {
            user_name: user_name || userData.full_name,
            script_name,
            description,
            usage_area,
            category,
            project_name: category === 'project' ? project_name : null,
            created_by: `${user_sicil_no}@company.com` // Email formatında created_by
        };

        const { data, error } = await supabase
            .from('scripts')
            .insert([scriptData])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: 'Script başarıyla oluşturuldu',
            data
        });

    } catch (err) {
        console.error('createScript error:', err);
        res.status(500).json({ error: 'Script oluşturulamadı' });
    }
};

// Script güncelle
const updateScript = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_sicil_no, script_name, description, usage_area, category, project_name } = req.body;

        if (!user_sicil_no) {
            return res.status(400).json({ error: 'Kullanıcı sicil numarası zorunludur' });
        }

        // Mevcut script'i getir
        const { data: existingScript, error: fetchError } = await supabase
            .from('scripts')
            .select('*')
            .eq('id', id)
            .eq('is_active', true)
            .single();

        if (fetchError || !existingScript) {
            return res.status(404).json({ error: 'Script bulunamadı' });
        }

        // Kullanıcı rolünü kontrol et
        const userRole = await checkUserRole(user_sicil_no);
        const isOwner = existingScript.created_by === `${user_sicil_no}@company.com`;

        // Yetki kontrolü: 
        // 1. Her kullanıcı yalnızca kendi scriptlerini düzenleyebilir
        // 2. Yalnızca admin başkalarının scriptlerini de düzenleyebilir
        if (!isOwner && userRole !== 'admin') {
            return res.status(403).json({ 
                error: 'Bu scripti düzenleme yetkiniz yok. Sadece kendi scriptlerinizi düzenleyebilirsiniz.' 
            });
        }

        // Güncelleme verilerini hazırla
        const updateData = {};
        
        if (script_name && script_name !== existingScript.script_name) {
            // Script adı benzersizlik kontrolü
            const { data: duplicateScript } = await supabase
                .from('scripts')
                .select('id')
                .eq('script_name', script_name)
                .eq('is_active', true)
                .neq('id', id)
                .single();

            if (duplicateScript) {
                return res.status(400).json({ 
                    error: 'Bu script adı zaten kullanılıyor' 
                });
            }
            updateData.script_name = script_name;
        }

        if (description) updateData.description = description;
        if (usage_area) updateData.usage_area = usage_area;
        
        if (category && ['general', 'project'].includes(category)) {
            updateData.category = category;
            
            if (category === 'project' && project_name) {
                updateData.project_name = project_name;
            } else if (category === 'general') {
                updateData.project_name = null;
            }
        }

        // Güncelleme yapılacak veri var mı kontrol et
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Güncellenecek veri bulunamadı' });
        }

        // Script'i güncelle
        const { data, error } = await supabase
            .from('scripts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({
            message: 'Script başarıyla güncellendi',
            data
        });

    } catch (err) {
        console.error('updateScript error:', err);
        res.status(500).json({ error: 'Script güncellenemedi' });
    }
};

// Script sil (soft delete)
const deleteScript = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_sicil_no } = req.body;

        if (!user_sicil_no) {
            return res.status(400).json({ error: 'Kullanıcı sicil numarası zorunludur' });
        }

        // Mevcut script'i getir
        const { data: existingScript, error: fetchError } = await supabase
            .from('scripts')
            .select('*')
            .eq('id', id)
            .eq('is_active', true)
            .single();

        if (fetchError || !existingScript) {
            return res.status(404).json({ error: 'Script bulunamadı' });
        }

        // Kullanıcı rolünü kontrol et
        const userRole = await checkUserRole(user_sicil_no);
        const isOwner = existingScript.created_by === `${user_sicil_no}@company.com`;

        // Yetki kontrolü: 
        // 1. Her kullanıcı yalnızca kendi scriptlerini silebilir
        // 2. Yalnızca admin başkalarının scriptlerini de silebilir
        if (!isOwner && userRole !== 'admin') {
            return res.status(403).json({ 
                error: 'Bu scripti silme yetkiniz yok. Sadece kendi scriptlerinizi silebilirsiniz.' 
            });
        }

        // Soft delete (is_active = false)
        const { data, error } = await supabase
            .from('scripts')
            .update({ is_active: false })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({
            message: 'Script başarıyla silindi',
            data
        });

    } catch (err) {
        console.error('deleteScript error:', err);
        res.status(500).json({ error: 'Script silinemedi' });
    }
};

// Kullanıcının scriptlerini getir
const getUserScripts = async (req, res) => {
    try {
        const { user_sicil_no } = req.params;
        const { page = 1, limit = 20 } = req.query;

        if (!user_sicil_no) {
            return res.status(400).json({ error: 'Kullanıcı sicil numarası zorunludur' });
        }

        const offset = (page - 1) * limit;

        const { data, error, count } = await supabase
            .from('scripts')
            .select('*', { count: 'exact' })
            .eq('created_by', `${user_sicil_no}@company.com`)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.status(200).json({
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count
            }
        });

    } catch (err) {
        console.error('getUserScripts error:', err);
        res.status(500).json({ error: 'Kullanıcı scriptleri getirilemedi' });
    }
};

// Script arama
const searchScripts = async (req, res) => {
    try {
        const { q, category, project_name, page = 1, limit = 20 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Arama terimi en az 2 karakter olmalıdır' });
        }

        let query = supabase
            .from('scripts')
            .select('*', { count: 'exact' })
            .eq('is_active', true);

        // Text search
        query = query.or(`script_name.ilike.%${q}%,description.ilike.%${q}%,usage_area.ilike.%${q}%,user_name.ilike.%${q}%`);

        // Filtreleme
        if (category) {
            query = query.eq('category', category);
        }
        if (project_name && project_name !== '') {
            query = query.eq('project_name', project_name);
        }

        // Sayfalama
        const offset = (page - 1) * limit;
        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.status(200).json({
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count
            },
            searchTerm: q
        });

    } catch (err) {
        console.error('searchScripts error:', err);
        res.status(500).json({ error: 'Arama yapılamadı' });
    }
};

module.exports = {
    getAllScripts,
    getProjects,
    createScript,
    updateScript,
    deleteScript,
    getUserScripts,
    searchScripts
};
