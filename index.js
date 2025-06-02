app.delete('/api/iccid/bulk-delete', async (req, res) => {
  const { iccids } = req.body;
  
  if (!Array.isArray(iccids) || iccids.length === 0) {
    return res.status(400).json({ error: 'Geçerli ICCID listesi gönderilmedi' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM iccid WHERE iccid = ANY($1) RETURNING *',
      [iccids]
    );
    
    res.json({ 
      message: `${result.rowCount} ICCID başarıyla silindi`,
      deletedIccids: result.rows 
    });
  } catch (error) {
    console.error('ICCID silme hatası:', error);
    res.status(500).json({ error: 'ICCID silinirken bir hata oluştu' });
  }
}); 