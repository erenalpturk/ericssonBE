const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get comprehensive system statistics
const getSystemStats = async (req, res) => {
    try {

        // 2. Aktivasyon İstatistikleri
        const { data: activations, count: totalActivations, error: activationsError } = await supabase
            .from('activationstable')
            .select('user, created_at, activationtype, status, prod_ofr_id', { count: 'exact' });
        
        if (activationsError) throw activationsError;

        // Kullanıcı isimlerini al
        const userIds = Array.from(new Set(activations.map(a => a.user)));
        const { data: usersInfo, error: usersInfoError } = await supabase
            .from('users')
            .select('sicil_no, full_name')
            .in('sicil_no', userIds);
        
        if (usersInfoError) throw usersInfoError;
        const nameMap = Object.fromEntries(usersInfo.map(u => [u.sicil_no, u.full_name]));

        const activationStats = {
            total_activations: totalActivations,
            by_user: {},
            by_type: {},
            by_status: {},
            by_product: {},
            by_day: {},
            by_user_day: {},
            by_prod_type: {}
        };

        // Aktivasyonları işle
        activations.forEach(activation => {
            const fullName = nameMap[activation.user] || `Kullanıcı ${activation.user}`;
            // Tarih formatını daha güvenli hale getir
            const activationDate = new Date(activation.created_at);
            const day = activationDate.toISOString().slice(0, 10);

            // Kullanıcı bazında - hem sicil_no hem de full_name ile say
            const userKey = `${fullName} (${activation.user})`;
            activationStats.by_user[userKey] = (activationStats.by_user[userKey] || 0) + 1;

            // Tip bazında
            activationStats.by_type[activation.activationtype] = (activationStats.by_type[activation.activationtype] || 0) + 1;

            // Durum bazında
            activationStats.by_status[activation.status] = (activationStats.by_status[activation.status] || 0) + 1;

            // Ürün bazında
            activationStats.by_product[activation.prod_ofr_id] = (activationStats.by_product[activation.prod_ofr_id] || 0) + 1;

            // Gün bazında
            activationStats.by_day[day] = (activationStats.by_day[day] || 0) + 1;

            // Kullanıcı-Gün bazında
            if (!activationStats.by_user_day[day]) activationStats.by_user_day[day] = {};
            activationStats.by_user_day[day][userKey] = (activationStats.by_user_day[day][userKey] || 0) + 1;

            // Ürün-Tip bazında
            if (!activationStats.by_prod_type[activation.prod_ofr_id]) {
                activationStats.by_prod_type[activation.prod_ofr_id] = {};
            }
            if (!activationStats.by_prod_type[activation.prod_ofr_id][activation.activationtype]) {
                activationStats.by_prod_type[activation.prod_ofr_id][activation.activationtype] = { count: 0, users: new Set() };
            }
            activationStats.by_prod_type[activation.prod_ofr_id][activation.activationtype].count++;
            activationStats.by_prod_type[activation.prod_ofr_id][activation.activationtype].users.add(userKey);
        });

        // Set'leri array'e çevir
        for (const prodId in activationStats.by_prod_type) {
            for (const type in activationStats.by_prod_type[prodId]) {
                activationStats.by_prod_type[prodId][type].users = Array.from(activationStats.by_prod_type[prodId][type].users);
            }
        }


        // 4. Feedback İstatistikleri
        const { count: totalFeedbacks, error: totalFeedbacksError } = await supabase
            .from('feedbacks')
            .select('*', { count: 'exact', head: true });
        if (totalFeedbacksError) throw totalFeedbacksError;

        // Bu ay feedback'ler için tarih hesaplama
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const { count: feedbacksThisMonth, error: feedbacksThisMonthError } = await supabase
            .from('feedbacks')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfMonth.toISOString());
        if (feedbacksThisMonthError) throw feedbacksThisMonthError;

        // Feedback tip, durum ve öncelik dağılımları için veri çek
        const { data: feedbacks, error: feedbacksError } = await supabase
            .from('feedbacks')
            .select('type, status, priority, created_at');
        
        if (feedbacksError) throw feedbacksError;

        const feedbackStats = {
            total_feedbacks: totalFeedbacks,
            by_type: {},
            by_status: {},
            by_priority: {},
            this_month: feedbacksThisMonth
        };

        feedbacks.forEach(feedback => {
            feedbackStats.by_type[feedback.type] = (feedbackStats.by_type[feedback.type] || 0) + 1;
            feedbackStats.by_status[feedback.status] = (feedbackStats.by_status[feedback.status] || 0) + 1;
            feedbackStats.by_priority[feedback.priority] = (feedbackStats.by_priority[feedback.priority] || 0) + 1;
        });

        // 5. Parametre İstatistikleri
        const { count: totalParameters, error: totalParametersError } = await supabase
            .from('gnl_parm')
            .select('*', { count: 'exact', head: true });
        if (totalParametersError) throw totalParametersError;

        const { count: activeParameters, error: activeParametersError } = await supabase
            .from('gnl_parm')
            .select('*', { count: 'exact', head: true })
            .eq('is_actv', true);
        if (activeParametersError) throw activeParametersError;

        const { count: inactiveParameters, error: inactiveParametersError } = await supabase
            .from('gnl_parm')
            .select('*', { count: 'exact', head: true })
            .eq('is_actv', false);
        if (inactiveParametersError) throw inactiveParametersError;

        // Parametre tip dağılımları için veri çek
        const { data: parameters, error: parametersError } = await supabase
            .from('gnl_parm')
            .select('gnl_parm_type_id, is_actv');
        
        if (parametersError) throw parametersError;

        const paramStats = {
            total_parameters: totalParameters,
            active_parameters: activeParameters,
            inactive_parameters: inactiveParameters,
            by_type: {}
        };

        parameters.forEach(param => {
            paramStats.by_type[param.gnl_parm_type_id] = (paramStats.by_type[param.gnl_parm_type_id] || 0) + 1;
        });

        // 6. Son 30 günlük trend hesaplama - direkt veritabanından
        const last30Days = [];
        const trendDate = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(trendDate);
            date.setDate(date.getDate() - i);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
            
            const dateStr = date.toISOString().slice(0, 10);
            
            // Bu gün için aktivasyon sayısını veritabanından çek
            try {
                const { count: dayActivations, error: dayError } = await supabase
                    .from('activationstable')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', startOfDay.toISOString())
                    .lt('created_at', endOfDay.toISOString());
                
                if (dayError) {
                    console.error(`Error getting activations for ${dateStr}:`, dayError);
                    last30Days.push({
                        date: dateStr,
                        activations: 0
                    });
                } else {
                    last30Days.push({
                        date: dateStr,
                        activations: dayActivations || 0
                    });
                }
            } catch (err) {
                console.error(`Exception getting activations for ${dateStr}:`, err);
                last30Days.push({
                    date: dateStr,
                    activations: 0
                });
            }
        }

        // Debug: Trend verilerini logla
        console.log('Trend Debug:', {
            last30Days: last30Days,
            totalActivationsInTrend: last30Days.reduce((sum, day) => sum + day.activations, 0)
        });

        // 7. Ortalama hesaplamaları
        const avgDailyLast30Days = last30Days.reduce((sum, day) => sum + day.activations, 0) / 30;
        const avgWeeklyLast30Days = avgDailyLast30Days * 7;

        // 8. En çok kullanılan aktivasyon tipleri
        const topActivationTypes = Object.entries(activationStats.by_type)
            .sort(([,a], [,b]) => b - a)
            .map(([type, count]) => ({ type, count }));

        res.json({
            success: true,
            data: {
                activations: {
                    ...activationStats,
                    average_daily_last_30_days: avgDailyLast30Days,
                    average_weekly_last_30_days: avgWeeklyLast30Days,
                    last_30_days_trend: last30Days,
                    top_activation_types: topActivationTypes
                },
                feedback: feedbackStats,
                parameters: paramStats,
                generated_at: new Date().toISOString()
            }
        });

    } catch (err) {
        console.error("Error in getSystemStats:", err);
        res.status(500).json({ 
            success: false,
            error: "İstatistikler yüklenirken hata oluştu" 
        });
    }
};

// Get user-specific statistics
const getUserStats = async (req, res) => {
    try {
        const { userId } = req.params;

        // Kullanıcının aktivasyonları
        const { data: userActivations, error: activationsError } = await supabase
            .from('activationstable')
            .select('*')
            .eq('user', userId);
        
        if (activationsError) throw activationsError;

        // Kullanıcının ICCID'leri
        const { data: userIccids, error: iccidsError } = await supabase
            .from('iccidTable')
            .select('*')
            .eq('used_by', userId);
        
        if (iccidsError) throw iccidsError;

        // Kullanıcının feedback'leri
        const { data: userFeedbacks, error: feedbacksError } = await supabase
            .from('feedback')
            .select('*')
            .eq('user_id', userId);
        
        if (feedbacksError) throw feedbacksError;

        const userStats = {
            activations: {
                total: userActivations.length,
                by_type: {},
                by_status: {},
                by_product: {},
                this_month: userActivations.filter(a => {
                    const created = new Date(a.created_at);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                }).length
            },
            iccids: {
                total: userIccids.length,
                available: userIccids.filter(i => i.stock === 'available').length,
                reserved: userIccids.filter(i => i.stock === 'reserved').length,
                sold: userIccids.filter(i => i.stock === 'sold').length
            },
            feedback: {
                total: userFeedbacks.length,
                by_type: {},
                by_status: {},
                by_priority: {}
            }
        };

        // Aktivasyon istatistikleri
        userActivations.forEach(activation => {
            userStats.activations.by_type[activation.activationtype] = (userStats.activations.by_type[activation.activationtype] || 0) + 1;
            userStats.activations.by_status[activation.status] = (userStats.activations.by_status[activation.status] || 0) + 1;
            userStats.activations.by_product[activation.prod_ofr_id] = (userStats.activations.by_product[activation.prod_ofr_id] || 0) + 1;
        });

        // Feedback istatistikleri
        userFeedbacks.forEach(feedback => {
            userStats.feedback.by_type[feedback.type] = (userStats.feedback.by_type[feedback.type] || 0) + 1;
            userStats.feedback.by_status[feedback.status] = (userStats.feedback.by_status[feedback.status] || 0) + 1;
            userStats.feedback.by_priority[feedback.priority] = (userStats.feedback.by_priority[feedback.priority] || 0) + 1;
        });

        res.json({
            success: true,
            data: userStats
        });

    } catch (err) {
        console.error("Error in getUserStats:", err);
        res.status(500).json({ 
            success: false,
            error: "Kullanıcı istatistikleri yüklenirken hata oluştu" 
        });
    }
};

// Get user-specific activation statistics with date filtering
const getUserActivations = async (req, res) => {
    try {
        const { period = 'all' } = req.query; // all, 30days, 7days
        
        // Tarih filtresi hesaplama
        let dateFilter = {};
        const now = new Date();
        
        if (period === '30days') {
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            dateFilter = {
                gte: thirtyDaysAgo.toISOString()
            };
        } else if (period === '7days') {
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            dateFilter = {
                gte: sevenDaysAgo.toISOString()
            };
        } else if (period === 'all') {
            // Tüm zamanlar için son 9999 gün (yaklaşık 27 yıl)
            const manyDaysAgo = new Date(now);
            manyDaysAgo.setDate(manyDaysAgo.getDate() - 365);
            dateFilter = {
                gte: manyDaysAgo.toISOString()
            };
        }

        // Debug: Tarih filtresi bilgisi
        console.log('Date Filter Debug:', {
            period: period,
            dateFilter: dateFilter,
            hasFilter: Object.keys(dateFilter).length > 0
        });

        // Aktivasyonları çek (tarih filtresi ile)
        let query = supabase
            .from('activationstable')
            .select('user, created_at, activationtype, status, prod_ofr_id', { count: 'exact' })
            .limit(10000); // Büyük veri setleri için limit artır
        
        if (Object.keys(dateFilter).length > 0) {
            query = query.gte('created_at', dateFilter.gte);
            console.log('Applied date filter:', {
                period: period,
                filterDate: dateFilter.gte,
                daysAgo: period === 'all' ? 365 : (period === '30days' ? 30 : 7)
            });
        } else {
            console.log('No date filter applied - getting all records');
        }
        
        const { data: activations, count: totalActivations, error: activationsError } = await query;
        if (activationsError) {
            console.error('Activations query error:', activationsError);
            throw activationsError;
        }
        
        console.log('Query result:', {
            totalActivations: totalActivations,
            activationsDataLength: activations ? activations.length : 0,
            period: period,
            limitApplied: 10000,
            isDataTruncated: activations && activations.length >= 10000
        });

        // Veri kesilme kontrolü
        const isDataTruncated = activations && activations.length >= 10000;
        if (isDataTruncated) {
            console.warn('WARNING: Data may be truncated due to limit. Consider using pagination for large datasets.');
        }

        // Kullanıcı isimlerini al
        const userIds = Array.from(new Set(activations.map(a => a.user)));
        const { data: usersInfo, error: usersInfoError } = await supabase
            .from('users')
            .select('sicil_no, full_name, role')
            .in('sicil_no', userIds);
        
        if (usersInfoError) throw usersInfoError;
        const nameMap = Object.fromEntries(usersInfo.map(u => [u.sicil_no, u.full_name]));
        const roleMap = Object.fromEntries(usersInfo.map(u => [u.sicil_no, u.role]));

        // Kullanıcı bazında aktivasyon istatistikleri
        const userActivations = {};
        
        // Önce kullanıcı bazında toplam aktivasyon sayılarını count ile çek
        for (const userId of userIds) {
            const fullName = nameMap[userId] || `Kullanıcı ${userId}`;
            const role = roleMap[userId] || 'user';
            
            // Bu kullanıcı için toplam aktivasyon sayısını count ile çek
            let userQuery = supabase
                .from('activationstable')
                .select('*', { count: 'exact', head: true })
                .eq('user', userId);
            
            if (Object.keys(dateFilter).length > 0) {
                userQuery = userQuery.gte('created_at', dateFilter.gte);
            }
            
            const { count: userTotalActivations, error: userCountError } = await userQuery;
            if (userCountError) {
                console.error(`Error getting count for user ${userId}:`, userCountError);
            }
            
            userActivations[userId] = {
                sicil_no: userId,
                full_name: fullName,
                role: role,
                total_activations: userTotalActivations || 0,
                by_type: {},
                by_status: {},
                by_product: {},
                by_day: {},
                last_activation: null,
                first_activation: null
            };
        }
        
        // Şimdi detaylı istatistikler için dönen verileri işle
        activations.forEach(activation => {
            const userId = activation.user;
            const userStats = userActivations[userId];
            
            if (userStats) {
                // Tip bazında
                userStats.by_type[activation.activationtype] = (userStats.by_type[activation.activationtype] || 0) + 1;
                
                // Durum bazında
                userStats.by_status[activation.status] = (userStats.by_status[activation.status] || 0) + 1;
                
                // Ürün bazında
                userStats.by_product[activation.prod_ofr_id] = (userStats.by_product[activation.prod_ofr_id] || 0) + 1;
                
                // Gün bazında
                const day = new Date(activation.created_at).toISOString().slice(0, 10);
                userStats.by_day[day] = (userStats.by_day[day] || 0) + 1;
                
                // İlk ve son aktivasyon tarihleri
                const activationDate = new Date(activation.created_at);
                if (!userStats.first_activation || activationDate < new Date(userStats.first_activation)) {
                    userStats.first_activation = activation.created_at;
                }
                if (!userStats.last_activation || activationDate > new Date(userStats.last_activation)) {
                    userStats.last_activation = activation.created_at;
                }
            }
        });

        // Kullanıcıları aktivasyon sayısına göre sırala
        const sortedUsers = Object.values(userActivations)
            .sort((a, b) => b.total_activations - a.total_activations);

        // Toplam istatistikler
        const totalStats = {
            total_users: sortedUsers.length,
            total_activations: totalActivations,
            average_activations_per_user: sortedUsers.length > 0 ? (totalActivations / sortedUsers.length).toFixed(2) : 0,
            most_active_user: sortedUsers.length > 0 ? {
                name: sortedUsers[0].full_name,
                activations: sortedUsers[0].total_activations
            } : null
        };

        // Debug bilgisi
        console.log('User Activations Debug:', {
            period: period,
            totalActivations: totalActivations,
            activationsDataLength: activations.length,
            uniqueUsers: userIds.length,
            sortedUsersLength: sortedUsers.length,
            totalStats: totalStats,
            userCounts: sortedUsers.map(u => ({
                sicil_no: u.sicil_no,
                full_name: u.full_name,
                total_activations: u.total_activations
            }))
        });

        res.json({
            success: true,
            data: {
                period: period,
                total_stats: totalStats,
                users: sortedUsers,
                generated_at: new Date().toISOString(),
                warning: isDataTruncated ? 'Veri limiti nedeniyle kesilmiş olabilir. Büyük veri setleri için sayfalama kullanılması önerilir.' : null
            }
        });

    } catch (err) {
        console.error("Error in getUserActivations:", err);
        res.status(500).json({ 
            success: false,
            error: "Kullanıcı aktivasyon istatistikleri yüklenirken hata oluştu" 
        });
    }
};

module.exports = {
    getSystemStats,
    getUserStats,
    getUserActivations
};
