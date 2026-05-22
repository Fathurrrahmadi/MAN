require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function fixPass() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // Aplikasi yang langsung nge-hash, otomatis aman dari error Railway
        const hash = await bcrypt.hash('staff123', 10);
        await db.query(`UPDATE users SET password_hash = ? WHERE username IN ('Perawats1', 'Logistiks1')`, [hash]);

        console.log("✅ BERES! Password Perawats1 & Logistiks1 resmi jadi: staff123");
        process.exit();
    } catch (err) {
        console.error("❌ Gagal:", err.message);
        process.exit(1);
    }
}

fixPass();