const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- SWAGGER SETUP ---
try {
    const swaggerDocument = require('./swagger.json');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
    console.log("⚠️ swagger.json not found. Skipping /api-docs route.");
}

// ==========================================
// UNIFIED DATABASE CONNECTION
// ==========================================
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise();

// ==========================================
// AUTHENTICATION CONFIG & MIDDLEWARE
// ==========================================
const JWT_SECRET = process.env.JWT_SECRET || 'hospital_asset_jwt_secret_change_in_prod';
const SALT_ROUNDS = 10;

async function seedDefaultUsers() {
    try {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM users');
        if (rows[0].count === 0) {
            const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
            const staffHash = await bcrypt.hash('staff123', SALT_ROUNDS);
            await db.query(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin'), (?, ?, 'staff')",
                ['admin', adminHash, 'staff', staffHash]
            );
            console.log('🌱 Seeded default users: admin / staff');
        }
    } catch (err) {
        console.error('Seed error:', err.message);
    }
}
seedDefaultUsers();

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions.' });
        }
        next();
    };
}

// ==========================================
// 🔐 AUTH ROUTES
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const assignedRole = ['admin', 'staff', 'nurse'].includes(role) ? role : 'staff';
    try {
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(409).json({ error: 'Username already taken.' });

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        const [result] = await db.query(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, password_hash, assignedRole]
        );
        res.status(201).json({ message: 'User registered successfully.', user: { id: result.insertId, username, role: assignedRole } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid username or password.' });

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) return res.status(401).json({ error: 'Invalid username or password.' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ message: 'Login successful.', token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ valid: true, user: decoded });
    } catch (err) {
        res.status(401).json({ valid: false, error: 'Token is invalid or expired.' });
    }
});

app.get('/api/auth/users', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, username, role, created_at FROM users');
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/auth/users/:id', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found.' });
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 🏥 WARD ROUTES
// ==========================================
app.get('/api/wards', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM wards');
        res.json({ message: "Ward inventory fetched", data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/wards', async (req, res) => {
    const { ward_name } = req.body;
    if (!ward_name) return res.status(400).json({ error: 'ward_name is required' });
    try {
        const [result] = await db.query('INSERT INTO wards (ward_name, asset_count) VALUES (?, 0)', [ward_name]);
        res.status(201).json({ message: 'Ward added', id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ward already exists' });
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/wards/:id', async function(req, res) {
    const newName = req.body.ward_name;
    try {
        const [oldData] = await db.query("SELECT ward_name FROM wards WHERE id = ?", [req.params.id]);
        if (oldData.length > 0) {
            const oldName = oldData[0].ward_name;
            await db.query("UPDATE wards SET ward_name = ? WHERE id = ?", [newName, req.params.id]);
            await db.query("UPDATE assets SET current_ward = ? WHERE current_ward = ?", [newName, oldName]);
        }
        res.json({ message: "Ruangan berhasil diupdate" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/wards/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM wards WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ward deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 📦 ASSET ROUTES
// ==========================================
app.get('/api/assets', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM assets');
        res.json({ message: "Assets fetched", data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/assets', async (req, res) => {
    const { name, type, sub_category, current_ward, qr_hash } = req.body;
    try {
        await db.query(
            'INSERT INTO assets (name, type, sub_category, current_ward, qr_hash) VALUES (?, ?, ?, ?, ?)',
            [name, type, sub_category || '-', current_ward, qr_hash]
        );
        res.json({ message: 'Asset added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/assets/qr/:hash', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM assets WHERE qr_hash = ?', [req.params.hash]);
        if (rows.length === 0) return res.status(404).json({ error: "Asset not found" });
        res.json({ message: "Asset valid", data: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/assets/qr/generate/:hash', async (req, res) => {
    try {
        const hash = req.params.hash;
        const qrImageBase64 = await QRCode.toDataURL(hash);
        res.json({ message: "QR Code generated", image: qrImageBase64 });
    } catch (err) {
        console.error("Failed to generate QR", err);
        res.status(500).json({ error: "Failed to generate QR code" });
    }
});

app.put('/api/assets/:id/location', async (req, res) => {
    try {
        const { current_ward, status } = req.body;
        await db.query('UPDATE assets SET current_ward = ?, status = ? WHERE id = ?', [current_ward, status, req.params.id]);
        res.json({ message: "Asset location updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/assets/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT status FROM assets WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Asset not found" });
        if (rows[0].status === 'In Use') return res.status(400).json({ error: "Action Denied: Cannot delete an asset that is currently In Use." });
        if (rows[0].status === 'In Transit') return res.status(400).json({ error: "Action Denied: Cannot delete an asset that is In Transit." });

        await db.query('DELETE FROM assets WHERE id = ?', [req.params.id]);
        res.json({ message: "Asset deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 🛠️ MAINTENANCE ROUTES
// ==========================================
app.get('/api/maintenance', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM maintenance_reports ORDER BY created_at DESC');
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/maintenance', async (req, res) => {
    const { asset_id, asset_name, type, report_date, description, reporter } = req.body;
    if (!asset_id || !description || !report_date) return res.status(400).json({ error: 'asset_id, report_date, and description are required.' });
    
    try {
        const [result] = await db.query(
            `INSERT INTO maintenance_reports (asset_id, asset_name, type, report_date, description, reporter) VALUES (?, ?, ?, ?, ?, ?)`,
            [asset_id, asset_name || '', type || '', report_date, description, reporter || '']
        );
        res.status(201).json({ message: 'Report created', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/maintenance/:id/action', async (req, res) => {
    const { action_date, vendor, cost, duration_days, notes, status, start_date, estimated_end_date } = req.body;
    const reportId = req.params.id;
    try {
        await db.query(
            `INSERT INTO maintenance_actions (report_id, start_date, estimated_end_date, action_date, vendor, cost, duration_days, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [reportId, start_date || null, estimated_end_date || null, action_date || null, vendor || '', cost || 0, duration_days || 0, notes || '', status || 'Diperbaiki']
        );
        await db.query('UPDATE maintenance_reports SET status = ? WHERE id = ?', [status || 'Diperbaiki', reportId]);
        res.json({ message: 'Action logged and report updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/maintenance/asset/:asset_id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT r.*, a.action_date, a.vendor, a.cost, a.duration_days, a.notes AS action_notes 
             FROM maintenance_reports r 
             LEFT JOIN maintenance_actions a ON a.report_id = r.id 
             WHERE r.asset_id = ? ORDER BY r.created_at DESC`,
            [req.params.asset_id]
        );
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 🚚 TRANSFER ROUTES
// ==========================================
app.post('/api/transfers', async (req, res) => {
    const { qr_hash, from_ward, to_ward } = req.body;
    try {
        // Direct DB check instead of inter-service Axios call
        const [assetCheck] = await db.query('SELECT * FROM assets WHERE qr_hash = ?', [qr_hash]);
        if (assetCheck.length === 0) return res.status(404).json({ error: "Invalid QR Code. Asset not found." });
        
        const asset = assetCheck[0];
        if (asset.status !== 'Available') return res.status(400).json({ error: "Asset is currently not available for transfer" });

        // Log transfer
        const [result] = await db.query(
            "INSERT INTO transfers (asset_id, from_ward, to_ward, transfer_status) VALUES (?, ?, ?, 'In Transit')",
            [asset.id, from_ward, to_ward]
        );

        // Update Asset Location directly
        await db.query('UPDATE assets SET current_ward = ?, status = ? WHERE id = ?', [from_ward, 'In Transit', asset.id]);

        res.status(201).json({ message: "Transfer initiated successfully", transfer_id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/transfers/receive/:id', async (req, res) => {
    try {
        await db.query("UPDATE transfers SET transfer_status = 'Completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
        
        const [rows] = await db.query("SELECT * FROM transfers WHERE id = ?", [req.params.id]);
        const transfer = rows[0];

        // Update Asset Location directly
        await db.query('UPDATE assets SET current_ward = ?, status = ? WHERE id = ?', [transfer.to_ward, 'In Use', transfer.asset_id]);

        res.json({ message: "Asset successfully received and is now In Use." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/transfers/active/:asset_id', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM transfers WHERE asset_id = ? AND transfer_status = 'In Transit'", [req.params.asset_id]);
        if (rows.length === 0) return res.status(404).json({ error: "No active transfer found" });
        res.json({ data: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/transfers/history', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM transfers ORDER BY requested_at DESC LIMIT 500');
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/transfers/cancel/:asset_id', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM transfers WHERE asset_id = ? AND transfer_status = 'In Transit'", [req.params.asset_id]);
        if (rows.length === 0) return res.status(404).json({ error: "No active transfer found to cancel." });
        
        const transfer = rows[0];
        await db.query("DELETE FROM transfers WHERE id = ?", [transfer.id]);

        // Revert asset status directly
        await db.query('UPDATE assets SET current_ward = ?, status = ? WHERE id = ?', [transfer.from_ward, 'Available', transfer.asset_id]);

        res.json({ message: "Transit cancelled successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// SERVER START
// ==========================================
app.get('/', (req, res) => res.send("🚀 Unified Hospital Asset API is running. Visit /api-docs for documentation."));

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Hospital Asset Tracking API running on http://localhost:${PORT}`);
        console.log(`📄 Swagger Docs available at http://localhost:${PORT}/api-docs`);
    });
}
module.exports = app;