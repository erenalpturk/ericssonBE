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
module.exports = {
    updatePassword,
    getUser
};