const express = require('express');
const mysql = require('mysql2');
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
// GRAPHQL SCHEMA
// ==========================================
const schema = buildSchema(`
    type Ward {
        id: ID!
        ward_name: String!
        asset_count: Int
    }

    type WardResult {
        message: String!
        id: ID
    }

    type Query {
        """Fetch all wards."""
        wards: [Ward!]!
    }

    type Mutation {
        """Create a new ward."""
        addWard(ward_name: String!): WardResult!

        """Delete a ward by ID."""
        deleteWard(id: ID!): WardResult!
    }
`);

// ==========================================
// RESOLVERS
// ==========================================
const rootValue = {
    // ----- QUERIES -----

    wards: async () => {
        const [rows] = await db.query('SELECT * FROM wards');
        return rows;
    },

    // ----- MUTATIONS -----

    addWard: async ({ ward_name }) => {
        if (!ward_name) throw new Error('ward_name is required');
        try {
            const [result] = await db.query(
                'INSERT INTO wards (ward_name, asset_count) VALUES (?, 0)',
                [ward_name]
            );
            return { message: 'Ward added', id: result.insertId };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') throw new Error('Ward already exists');
            throw err;
        }
    },

    deleteWard: async ({ id }) => {
        await db.query('DELETE FROM wards WHERE id = ?', [id]);
        return { message: 'Ward deleted' };
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

app.listen(3002, () => console.log('🏥 Ward Service (GraphQL) running on port 3002 → http://localhost:3002/graphql'));
