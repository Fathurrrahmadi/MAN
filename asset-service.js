const express = require('express');
const mysql = require('mysql2');
const QRCode = require('qrcode');
const axios = require('axios');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
require('dotenv').config();

const app = express();
// app.use(express.json());

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise();

// ==========================================
// NOTIFICATION HELPER
// ==========================================
// notifikasi now lives only in transfer-db (database-per-service).
// asset-service logs notifications by calling transfer-service's
// GraphQL mutation instead of writing to a local table — same
// cross-service pattern transfer-service already uses to reach
// asset-service. Failures here are non-fatal: a notification
// hiccup should never block the underlying asset/maintenance write.
async function notify(tier, teks) {
    try {
        await axios.post('http://transfer:3003/graphql', {
            query: 'mutation($tier: Int!, $teks: String!) { addNotification(tier: $tier, teks: $teks) { message } }',
            variables: { tier, teks }
        });
    } catch (err) {
        console.error('Failed to send notification to transfer-service:', err.message);
    }
}

// ==========================================
// GRAPHQL SCHEMA
// ==========================================
const schema = buildSchema(`
    type Asset {
        id: ID!
        name: String!
        type: String
        sub_category: String
        current_ward: String
        qr_hash: String
        status: String
        created_at: String 
    }

    type QRImage {
        message: String!
        image: String!
    }

    type AssetResult {
        message: String!
    }

    type MaintenanceReport {
        id: ID!
        asset_id: ID!
        asset_name: String
        type: String
        report_date: String
        description: String
        reporter: String
        status: String
        created_at: String
        action_date: String
        vendor: String
        cost: Float
        duration_days: Int
        action_notes: String
    }

    type MaintenanceResult {
        message: String!
        id: ID
    }

    type WardUpdateResult {
        message: String!
    }

    type Query {
        """Fetch all assets."""
        assets: [Asset!]!

        """Validate and fetch a single asset by its QR hash."""
        assetByQR(hash: String!): Asset

        """Get all maintenance reports, newest first."""
        maintenanceReports: [MaintenanceReport!]!

        """Get maintenance history for a specific asset."""
        maintenanceByAsset(asset_id: ID!): [MaintenanceReport!]!

        """Generate a base64 QR code image for a given hash."""
        generateQR(hash: String!): QRImage!
    }

    type Mutation {
        """Add a new asset."""
        addAsset(
            name: String!
            type: String
            sub_category: String
            current_ward: String!
            qr_hash: String!
        ): AssetResult!

        """Update an asset's current ward and status."""
        updateAssetLocation(id: ID!, current_ward: String!, status: String!): AssetResult!

        """Update a ward's name, cascading to all assets in that ward."""
        updateWardName(id: ID!, ward_name: String!): WardUpdateResult!

        """Delete an asset. Blocked if In Use or In Transit."""
        deleteAsset(id: ID!): AssetResult!

        """Submit a new maintenance/damage report."""
        createMaintenanceReport(
            asset_id: ID!
            asset_name: String
            type: String
            report_date: String!
            description: String!
            reporter: String
        ): MaintenanceResult!

        """Log a follow-up action for a maintenance report."""
        addMaintenanceAction(
            report_id: ID!
            start_date: String
            estimated_end_date: String
            action_date: String
            vendor: String
            cost: Float
            duration_days: Int
            notes: String
            status: String
        ): MaintenanceResult!
    }
`);

// ==========================================
// RESOLVERS
// ==========================================
const rootValue = {
    // ----- QUERIES -----

    assets: async () => {
        const [rows] = await db.query('SELECT * FROM assets');
        return rows;
    },

    assetByQR: async ({ hash }) => {
        const [rows] = await db.query('SELECT * FROM assets WHERE qr_hash = ?', [hash]);
        if (rows.length === 0) throw new Error('Asset not found');
        return rows[0];
    },

    generateQR: async ({ hash }) => {
        const image = await QRCode.toDataURL(hash);
        return { message: 'QR Code generated', image };
    },

    maintenanceReports: async () => {
        const [rows] = await db.query('SELECT * FROM maintenance_reports ORDER BY created_at DESC');
        return rows;
    },

    maintenanceByAsset: async ({ asset_id }) => {
        const [rows] = await db.query(
            `SELECT r.*,
                    a.action_date, a.vendor, a.cost, a.duration_days, a.notes AS action_notes
             FROM maintenance_reports r
             LEFT JOIN maintenance_actions a ON a.report_id = r.id
             WHERE r.asset_id = ?
             ORDER BY r.created_at DESC`,
            [asset_id]
        );
        return rows;
    },

    // ----- MUTATIONS -----

    addAsset: async ({ name, type, sub_category, current_ward, qr_hash }) => {
        await db.query(
            'INSERT INTO assets (name, type, sub_category, current_ward, qr_hash) VALUES (?, ?, ?, ?, ?)',
            [name, type, sub_category || '-', current_ward, qr_hash]
        );
        return { message: 'Asset added successfully' };
    },

    updateAssetLocation: async ({ id, current_ward, status }) => {
        await db.query(
            'UPDATE assets SET current_ward = ?, status = ? WHERE id = ?',
            [current_ward, status, id]
        );
        return { message: 'Asset location updated' };
    },

    updateWardName: async ({ id, ward_name }) => {
        const [oldData] = await db.query('SELECT ward_name FROM wards WHERE id = ?', [id]);
        if (oldData.length > 0) {
            const oldName = oldData[0].ward_name;
            await db.query('UPDATE wards SET ward_name = ? WHERE id = ?', [ward_name, id]);
            await db.query('UPDATE assets SET current_ward = ? WHERE current_ward = ?', [ward_name, oldName]);
        }
        return { message: 'Ward updated successfully' };
    },

    deleteAsset: async ({ id }) => {
        const [rows] = await db.query('SELECT status FROM assets WHERE id = ?', [id]);
        if (rows.length === 0) throw new Error('Asset not found');
        if (rows[0].status === 'In Use') throw new Error('Action Denied: Cannot delete an asset that is currently In Use.');
        if (rows[0].status === 'In Transit') throw new Error('Action Denied: Cannot delete an asset that is In Transit.');

        await db.query('DELETE FROM assets WHERE id = ?', [id]);
        return { message: 'Asset deleted successfully' };
    },

    createMaintenanceReport: async ({ asset_id, asset_name, type, report_date, description, reporter }) => {
        if (!asset_id || !description || !report_date) {
            throw new Error('asset_id, report_date, and description are required.');
        }

        // ─── KONVERSI TANGGAL DARI TIMESTAMP KE YYYY-MM-DD ───
        let finalReportDate = report_date;
        if (report_date && !isNaN(report_date)) {
            finalReportDate = new Date(Number(report_date)).toISOString().split('T')[0];
        }

        const [result] = await db.query(
            `INSERT INTO maintenance_reports (asset_id, asset_name, type, report_date, description, reporter)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [asset_id, asset_name || '', type || '', finalReportDate, description, reporter || '']
        );

        await notify(2, "Laporan kerusakan baru untuk " + (asset_name || "Aset") + " (#" + asset_id + ")");


        return { message: 'Report created', id: result.insertId };
    },

  addMaintenanceAction: async ({ report_id, start_date, estimated_end_date, action_date, vendor, cost, duration_days, notes, status }) => {
        let finalActionDate = action_date;
        if (action_date && !isNaN(action_date)) {
            finalActionDate = new Date(Number(action_date)).toISOString().split('T')[0];
        }
        await db.query(
            `INSERT INTO maintenance_actions (report_id, start_date, estimated_end_date, action_date, vendor, cost, duration_days, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                report_id,
                start_date || null,
                estimated_end_date || null,
                finalActionDate || null, // <-- Cukup ini saja yang dipakai untuk action_date
                vendor || '',
                cost || 0,
                duration_days || 0,
                notes || '',
                status || 'Diperbaiki'
            ]
        );
        await db.query(
            'UPDATE maintenance_reports SET status = ? WHERE id = ?',
            [status || 'Diperbaiki', report_id]
        );

        var [rep] = await db.query("SELECT asset_name FROM maintenance_reports WHERE id = ?", [report_id]);
        var nama = rep.length > 0 ? rep[0].asset_name : "Aset";

        await notify(2, "Pemeliharaan " + (nama || "Aset") + " (#" + report_id + ") menjadi: " + (status || "Diperbaiki"));

        
        return { message: 'Action logged and report updated.' };
        
    }
};

// ==========================================
// GRAPHQL ENDPOINT
// ==========================================
app.use('/graphql', graphqlHTTP({
    schema,
    rootValue,
    graphiql: true
}));

app.listen(3001, () => console.log('📦 Asset Service (GraphQL) running on port 3001 → http://localhost:3001/graphql'));
