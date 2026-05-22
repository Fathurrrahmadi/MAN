/**
 * BACKEND PATCH FILE — HAMS v2
 * Copy-paste these snippets into the corresponding service files.
 * All routes go BEFORE the app.listen() call.
 */

// ============================================================
// PATCH 1: ward-service.js
// Add POST /api/wards  (create a new ward)
// ============================================================

app.post('/api/wards', async (req, res) => {
    const { ward_name } = req.body;
    if (!ward_name) return res.status(400).json({ error: 'ward_name is required' });
    try {
        const [result] = await db.query(
            'INSERT INTO wards (ward_name, asset_count) VALUES (?, 0)',
            [ward_name]
        );
        res.status(201).json({ message: 'Ward added', id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ward already exists' });
        res.status(500).json({ error: err.message });
    }
});

// Optional: DELETE /api/wards/:id
app.delete('/api/wards/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM wards WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ward deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================================================
// PATCH 2: transfer-service.js
// Add GET /api/transfers/history  (full transfer log)
// ============================================================

app.get('/api/transfers/history', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM transfers ORDER BY requested_at DESC LIMIT 500'
        );
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================================================
// PATCH 3: asset-service.js
// Add maintenance report routes
// Requires: maintenance_reports & maintenance_actions tables (see patches.sql)
// ============================================================

// GET all maintenance reports
app.get('/api/maintenance', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM maintenance_reports ORDER BY created_at DESC'
        );
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST a new damage report
app.post('/api/maintenance', async (req, res) => {
    const { asset_id, asset_name, type, report_date, description, reporter } = req.body;
    if (!asset_id || !description || !report_date) {
        return res.status(400).json({ error: 'asset_id, report_date, and description are required.' });
    }
    try {
        const [result] = await db.query(
            `INSERT INTO maintenance_reports (asset_id, asset_name, type, report_date, description, reporter)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [asset_id, asset_name || '', type || '', report_date, description, reporter || '']
        );
        res.status(201).json({ message: 'Report created', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST a follow-up action for a report
app.post('/api/maintenance/:id/action', async (req, res) => {
    const { action_date, vendor, cost, duration_days, notes, status } = req.body;
    const reportId = req.params.id;
    try {
        await db.query(
            `INSERT INTO maintenance_actions (report_id, action_date, vendor, cost, duration_days, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [reportId, action_date, vendor || '', cost || 0, duration_days || 0, notes || '', status || 'Diperbaiki']
        );
        // Update report status
        await db.query(
            'UPDATE maintenance_reports SET status = ? WHERE id = ?',
            [status || 'Diperbaiki', reportId]
        );
        res.json({ message: 'Action logged and report updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET maintenance history for a specific asset
app.get('/api/maintenance/asset/:asset_id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT r.*, 
                    a.action_date, a.vendor, a.cost, a.duration_days, a.notes AS action_notes
             FROM maintenance_reports r
             LEFT JOIN maintenance_actions a ON a.report_id = r.id
             WHERE r.asset_id = ?
             ORDER BY r.created_at DESC`,
            [req.params.asset_id]
        );
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================================================
// PATCH 4: gateway.js
// Add /api/maintenance proxy route (add BEFORE the catch-all)
// ============================================================

/*
app.use('/api/maintenance', createProxyMiddleware({
    target: 'http://127.0.0.1:3001',   // routes to asset-service
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl
}));
*/

// NOTE: Place this BEFORE the /api/assets proxy rule in gateway.js
// because Express matches routes in order.
