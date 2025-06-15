const { createClient } = require('@supabase/supabase-js');

// Supabase client oluştur
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Tüm projeleri getir
const getAllProjects = async (req, res) => {
    try {
        const { status = 'active' } = req.query;

        let query = supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Projects fetch error:', error);
            return res.status(500).json({
                success: false,
                message: 'Projeler getirilirken hata oluştu',
                error: error.message
            });
        }

        res.json({
            success: true,
            data: data || [],
            count: data?.length || 0
        });

    } catch (err) {
        console.error('Get all projects error:', err);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: err.message
        });
    }
};

// Aktif proje isimlerini getir (dropdown için)
const getProjectNames = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('project_name')
            .eq('status', 'active')
            .order('project_name', { ascending: true });

        if (error) {
            console.error('Project names fetch error:', error);
            return res.status(500).json({
                success: false,
                message: 'Proje isimleri getirilirken hata oluştu',
                error: error.message
            });
        }

        const projectNames = data?.map(project => project.project_name) || [];

        res.json({
            success: true,
            data: projectNames
        });

    } catch (err) {
        console.error('Get project names error:', err);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: err.message
        });
    }
};

// Yeni proje oluştur (sadece admin)
const createProject = async (req, res) => {
    try {
        const { project_name, description, project_code } = req.body;
        
        // User bilgisini header'dan al
        const userHeader = req.headers['x-user-data'];
        if (!userHeader) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı bilgisi bulunamadı'
            });
        }

        const user = JSON.parse(userHeader);

        // Admin kontrolü
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bu işlem için admin yetkisi gerekli'
            });
        }

        // Gerekli alanlar kontrolü
        if (!project_name || !project_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Proje adı zorunludur'
            });
        }

        const projectData = {
            project_name: project_name.trim(),
            description: description?.trim() || null,
            project_code: project_code?.trim() || null,
            created_by: user.sicil_no,
            status: 'active'
        };

        const { data, error } = await supabase
            .from('projects')
            .insert([projectData])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(400).json({
                    success: false,
                    message: 'Bu proje adı zaten mevcut'
                });
            }
            
            console.error('Project creation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Proje oluşturulurken hata oluştu',
                error: error.message
            });
        }

        res.status(201).json({
            success: true,
            message: 'Proje başarıyla oluşturuldu',
            data: data
        });

    } catch (err) {
        console.error('Create project error:', err);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: err.message
        });
    }
};

// Proje güncelle (sadece admin)
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { project_name, description, project_code, status } = req.body;
        
        // User bilgisini header'dan al
        const userHeader = req.headers['x-user-data'];
        if (!userHeader) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı bilgisi bulunamadı'
            });
        }

        const user = JSON.parse(userHeader);

        // Admin kontrolü
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bu işlem için admin yetkisi gerekli'
            });
        }

        // Gerekli alanlar kontrolü
        if (!project_name || !project_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Proje adı zorunludur'
            });
        }

        const updateData = {
            project_name: project_name.trim(),
            description: description?.trim() || null,
            project_code: project_code?.trim() || null,
            status: status || 'active',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(400).json({
                    success: false,
                    message: 'Bu proje adı zaten mevcut'
                });
            }
            
            console.error('Project update error:', error);
            return res.status(500).json({
                success: false,
                message: 'Proje güncellenirken hata oluştu',
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Proje bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Proje başarıyla güncellendi',
            data: data
        });

    } catch (err) {
        console.error('Update project error:', err);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: err.message
        });
    }
};

// Proje sil (sadece admin)
const deleteProject = async (req, res) => {
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

        const user = JSON.parse(userHeader);

        // Admin kontrolü
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bu işlem için admin yetkisi gerekli'
            });
        }

        // Proje var mı kontrol et
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('project_name')
            .eq('id', id)
            .single();

        if (fetchError || !project) {
            return res.status(404).json({
                success: false,
                message: 'Proje bulunamadı'
            });
        }

        // Bu projeye ait scriptler var mı kontrol et
        const { data: scripts, error: scriptsError } = await supabase
            .from('scripts')
            .select('id')
            .eq('project_name', project.project_name);

        if (scriptsError) {
            console.error('Scripts check error:', scriptsError);
            return res.status(500).json({
                success: false,
                message: 'Proje silinirken hata oluştu'
            });
        }

        if (scripts && scripts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Bu projeye ait scriptler bulunduğu için proje silinemiyor. Önce scriptleri silin.'
            });
        }

        // Projeyi sil
        const { error: deleteError } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Project delete error:', deleteError);
            return res.status(500).json({
                success: false,
                message: 'Proje silinirken hata oluştu',
                error: deleteError.message
            });
        }

        res.json({
            success: true,
            message: 'Proje başarıyla silindi'
        });

    } catch (err) {
        console.error('Delete project error:', err);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: err.message
        });
    }
};

module.exports = {
    getAllProjects,
    getProjectNames,
    createProject,
    updateProject,
    deleteProject
}; 