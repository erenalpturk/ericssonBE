const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get all parameters
const getAllParams = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('gnl_parm')
            .select(`
                *,
                gnl_parm_type:gnl_parm_type_id (
                    gnl_parm_type_id,
                    value
                )
            `)
            .order('id', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: data
        });
    } catch (err) {
        console.error("Error in getAllParams:", err);
        res.status(500).json({ 
            success: false,
            error: "Parametreler yüklenirken hata oluştu" 
        });
    }
};

// Get parameter types
const getParameterTypes = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('gnl_parm_type')
            .select('*')
            .order('gnl_parm_type_id', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            data: data
        });
        
    } catch (err) {
        console.error("Error in getParameterTypes:", err);
        res.status(500).json({ 
            success: false,
            error: "Parametre tipleri yüklenirken hata oluştu" 
        });
    }
};

// Create new parameter
const createParameter = async (req, res) => {
    try {
        const { name, value, gnl_parm_type_id, userId, is_actv, extra_field1 } = req.body;

        // Validate required fields
        if (!name || !value) {
            return res.status(400).json({
                success: false,
                error: "Parametre adı ve değeri zorunludur"
            });
        }

        // Check if parameter name already exists
        const { data: existingParam } = await supabase
            .from('gnl_parm')
            .select('id')
            .eq('name', name)
            .single();

        if (existingParam) {
            return res.status(400).json({
                success: false,
                error: "Bu parametre adı zaten kullanılıyor"
            });
        }

        // Check if parameter value already exists
        const { data: existingValue } = await supabase
            .from('gnl_parm')
            .select('id')
            .eq('value', value)
            .single();

        if (existingValue) {
            return res.status(400).json({
                success: false,
                error: "Bu parametre değeri zaten kullanılıyor"
            });
        }

        const { data, error } = await supabase
            .from('gnl_parm')
            .insert({
                name,
                value,
                gnl_parm_type_id: gnl_parm_type_id || null,
                userId: userId || null,
                is_actv: is_actv !== undefined ? is_actv : true,
                extra_field1: extra_field1 || null
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: data,
            message: "Parametre başarıyla oluşturuldu"
        });
    } catch (err) {
        console.error("Error in createParameter:", err);
        res.status(500).json({ 
            success: false,
            error: "Parametre oluşturulurken hata oluştu" 
        });
    }
};

// Update parameter
const updateParameter = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, value, gnl_parm_type_id, userId, is_actv, extra_field1 } = req.body;

        // Validate required fields
        if (!name || !value) {
            return res.status(400).json({
                success: false,
                error: "Parametre adı ve değeri zorunludur"
            });
        }

        // Check if parameter exists
        const { data: existingParam } = await supabase
            .from('gnl_parm')
            .select('id')
            .eq('id', id)
            .single();

        if (!existingParam) {
            return res.status(404).json({
                success: false,
                error: "Parametre bulunamadı"
            });
        }

        // Check if parameter name already exists (excluding current parameter)
        const { data: existingName } = await supabase
            .from('gnl_parm')
            .select('id')
            .eq('name', name)
            .neq('id', id)
            .single();

        if (existingName) {
            return res.status(400).json({
                success: false,
                error: "Bu parametre adı zaten kullanılıyor"
            });
        }

        // Check if parameter value already exists (excluding current parameter)
        const { data: existingValue } = await supabase
            .from('gnl_parm')
            .select('id')
            .eq('value', value)
            .neq('id', id)
            .single();

        if (existingValue) {
            return res.status(400).json({
                success: false,
                error: "Bu parametre değeri zaten kullanılıyor"
            });
        }

        const { data, error } = await supabase
            .from('gnl_parm')
            .update({
                name,
                value,
                gnl_parm_type_id: gnl_parm_type_id || null,
                userId: userId || null,
                is_actv: is_actv !== undefined ? is_actv : true,
                extra_field1: extra_field1 || null
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: data,
            message: "Parametre başarıyla güncellendi"
        });
    } catch (err) {
        console.error("Error in updateParameter:", err);
        res.status(500).json({ 
            success: false,
            error: "Parametre güncellenirken hata oluştu" 
        });
    }
};

// Delete parameter
const deleteParameter = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if parameter exists
        const { data: existingParam } = await supabase
            .from('gnl_parm')
            .select('id')
            .eq('id', id)
            .single();

        if (!existingParam) {
            return res.status(404).json({
                success: false,
                error: "Parametre bulunamadı"
            });
        }

        const { error } = await supabase
            .from('gnl_parm')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: "Parametre başarıyla silindi"
        });
    } catch (err) {
        console.error("Error in deleteParameter:", err);
        res.status(500).json({ 
            success: false,
            error: "Parametre silinirken hata oluştu" 
        });
    }
};

// Get parameter by ID
const getParameterById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('gnl_parm')
            .select(`
                *,
                gnl_parm_type:gnl_parm_type_id (
                    gnl_parm_type_id,
                    type_name
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                error: "Parametre bulunamadı"
            });
        }

        res.json({
            success: true,
            data: data
        });
    } catch (err) {
        console.error("Error in getParameterById:", err);
        res.status(500).json({ 
            success: false,
            error: "Parametre yüklenirken hata oluştu" 
        });
    }
};

module.exports = {
    getAllParams,
    getParameterTypes,
    createParameter,
    updateParameter,
    deleteParameter,
    getParameterById
};


