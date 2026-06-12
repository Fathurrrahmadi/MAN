const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
require('dotenv').config();

const app = express();
// app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'hospital_asset_jwt_secret_change_in_prod';
const SALT_ROUNDS = 10;

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise();

// ==========================================
// GRAPHQL SCHEMA
// ==========================================
const schema = buildSchema(`
    type User {
        id: ID!
        username: String!
        role: String!
        created_at: String
    }

    type AuthPayload {
        message: String!
        token: String
        user: User
    }

    type VerifyPayload {
        valid: Boolean!
        user: TokenUser
        error: String
    }

    type TokenUser {
        id: ID!
        username: String!
        role: String!
    }

    type MutationResult {
        message: String!
        user: User
    }

    type DeleteResult {
        message: String!
    }

    type Query {
        """Validate a JWT token. Pass the token in the Authorization header."""
        verifyToken: VerifyPayload!

        """List all users. Requires admin role."""
        users: [User!]!
    }

    type Mutation {
        """Register a new user account."""
        register(username: String!, password: String!, role: String): MutationResult!

        """Login and receive a JWT token."""
        login(username: String!, password: String!): AuthPayload!

        """Delete a user by ID. Requires admin role."""
        deleteUser(id: ID!): DeleteResult!
    }
`);

// ==========================================
// SEED DEFAULT ACCOUNTS ON STARTUP
// ==========================================
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

// ==========================================
// HELPER MIDDLEWARE
// ==========================================
function extractUser(req) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

// ==========================================
// RESOLVERS
// ==========================================
const rootValue = {
    // ----- QUERIES -----

    verifyToken: ({ }, { req }) => {
        const user = extractUser(req);
        if (!user) return { valid: false, error: 'Token is invalid or expired.' };
        return { valid: true, user };
    },

    users: async ({ }, { req }) => {
        const user = extractUser(req);
        if (!user) throw new Error('Authentication required.');
        if (user.role !== 'admin') throw new Error('Forbidden: Insufficient permissions.');

        const [rows] = await db.query('SELECT id, username, role, created_at FROM users');
        return rows;
    },

    // ----- MUTATIONS -----

    register: async ({ username, password, role }) => {
        if (!username || !password) throw new Error('Username and password are required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        const assignedRole = ['admin', 'staff', 'nurse'].includes(role) ? role : 'staff';

        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) throw new Error('Username already taken.');

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        const [result] = await db.query(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, password_hash, assignedRole]
        );

        return {
            message: 'User registered successfully.',
            user: { id: result.insertId, username, role: assignedRole }
        };
    },

    login: async ({ username, password }) => {
        if (!username || !password) throw new Error('Username and password are required.');

        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) throw new Error('Invalid username or password.');

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) throw new Error('Invalid username or password.');

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        return {
            message: 'Login successful.',
            token,
            user: { id: user.id, username: user.username, role: user.role }
        };
    },

    deleteUser: async ({ id }, { req }) => {
        const requestingUser = extractUser(req);
        if (!requestingUser) throw new Error('Authentication required.');
        if (requestingUser.role !== 'admin') throw new Error('Forbidden: Insufficient permissions.');
        if (parseInt(id) === requestingUser.id) throw new Error('You cannot delete your own account.');

        const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw new Error('User not found.');

        return { message: 'User deleted successfully.' };
    }
};

// ==========================================
// GRAPHQL ENDPOINT
// ==========================================
app.use('/graphql', graphqlHTTP((req) => ({
    schema,
    rootValue,
    graphiql: true,
    context: { req }
})));

app.listen(3004, () => console.log('🔐 Auth Service (GraphQL) running on port 3004 → http://localhost:3004/graphql'));
