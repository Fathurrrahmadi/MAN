const express = require('express');
const mysql = require('mysql2');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const axios = require('axios');
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
    type Transfer {
        id: ID!
        asset_id: ID!
        from_ward: String
        to_ward: String
        transfer_status: String
        requested_at: String
        completed_at: String
    }

    type TransferResult {
        message: String!
        transfer_id: ID
    }

    type Query {
        """Get the active (In Transit) transfer for a specific asset."""
        activeTransfer(asset_id: ID!): Transfer

        """Get the full transfer history, newest first (limit 500)."""
        transferHistory: [Transfer!]!
    }

    type Mutation {
        """
        Initiate a new transfer. Validates the QR hash via the Asset Service
        and marks the asset as In Transit.
        """
        initiateTransfer(
            qr_hash: String!
            from_ward: String!
            to_ward: String!
        ): TransferResult!

        """
        Mark a transfer as received. Updates the asset to In Use
        at the destination ward.
        """
        receiveTransfer(id: ID!): TransferResult!

        """
        Cancel an active transfer and revert the asset to Available
        at its origin ward.
        """
        cancelTransfer(asset_id: ID!): TransferResult!
    }
`);

// ==========================================
// RESOLVERS
// ==========================================
const rootValue = {
    // ----- QUERIES -----

    activeTransfer: async ({ asset_id }) => {
        const [rows] = await db.query(
            "SELECT * FROM transfers WHERE asset_id = ? AND transfer_status = 'In Transit'",
            [asset_id]
        );
        if (rows.length === 0) throw new Error('No active transfer found');
        return rows[0];
    },

    transferHistory: async () => {
        const [rows] = await db.query(
            'SELECT * FROM transfers ORDER BY requested_at DESC LIMIT 500'
        );
        return rows;
    },

    // ----- MUTATIONS -----

    initiateTransfer: async ({ qr_hash, from_ward, to_ward }) => {
        // Validate QR via Asset Service GraphQL
        const response = await axios.post('http://localhost:3001/graphql', {
            query: `{ assetByQR(hash: "${qr_hash}") { id status } }`
        });

        if (response.data.errors) {
            const msg = response.data.errors[0].message;
            throw new Error(msg.includes('not found') ? 'Invalid QR Code. Asset not found.' : msg);
        }

        const asset = response.data.data.assetByQR;

        if (asset.status !== 'Available') {
            throw new Error('Asset is currently not available for transfer');
        }

        const [result] = await db.query(
            "INSERT INTO transfers (asset_id, from_ward, to_ward, transfer_status) VALUES (?, ?, ?, 'In Transit')",
            [asset.id, from_ward, to_ward]
        );

        await axios.post('http://localhost:3001/graphql', {
            query: `mutation { updateAssetLocation(id: "${asset.id}", current_ward: "${from_ward}", status: "In Transit") { message } }`
        });

        return { message: 'Transfer initiated successfully', transfer_id: result.insertId };
    },

    receiveTransfer: async ({ id }) => {
        // Mark transfer complete
        await db.query(
            "UPDATE transfers SET transfer_status = 'Completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
            [id]
        );

        // Fetch transfer details
        const [rows] = await db.query('SELECT * FROM transfers WHERE id = ?', [id]);
        const transfer = rows[0];

        // Update asset location and status via Asset Service GraphQL
        await axios.post('http://localhost:3001/graphql', {
            query: `
                mutation {
                    updateAssetLocation(id: "${transfer.asset_id}", current_ward: "${transfer.to_ward}", status: "In Use") {
                        message
                    }
                }
            `
        });

        return { message: 'Asset successfully received and is now In Use.' };
    },

    cancelTransfer: async ({ asset_id }) => {
        const [rows] = await db.query(
            "SELECT * FROM transfers WHERE asset_id = ? AND transfer_status = 'In Transit'",
            [asset_id]
        );

        if (rows.length === 0) throw new Error('No active transfer found to cancel.');

        const transfer = rows[0];

        // Delete the transfer record
        await db.query('DELETE FROM transfers WHERE id = ?', [transfer.id]);

        // Revert asset to Available at origin ward via Asset Service GraphQL
        await axios.post('http://localhost:3001/graphql', {
            query: `
                mutation {
                    updateAssetLocation(id: "${transfer.asset_id}", current_ward: "${transfer.from_ward}", status: "Available") {
                        message
                    }
                }
            `
        });

        return { message: 'Transit cancelled successfully.' };
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

app.listen(3003, () => console.log('🚚 Transfer Service (GraphQL) running on port 3003 → http://localhost:3003/graphql'));
