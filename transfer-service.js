var express = require('express');
var mysql = require('mysql2');
var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');
var axios = require('axios');
require('dotenv').config();

var app = express();

var db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise();

var schema = buildSchema(`
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

    type Notif { 
        id: ID 
        tier: Int 
        teks: String 
    }

    type NotifResult {
        message: String!
        id: ID
    }

    type Query {
        activeTransfer(asset_id: ID!): Transfer
        transferHistory: [Transfer!]!
        notifikasiList: [Notif]
    }

    type Mutation {
        initiateTransfer(
            qr_hash: String!
            from_ward: String!
            to_ward: String!
        ): TransferResult!

        receiveTransfer(id: ID!): TransferResult!

        cancelTransfer(asset_id: ID!): TransferResult!

        """
        Log a notification. This is the single write path for the
        notifikasi table — other services (e.g. asset-service) call
        this over GraphQL instead of writing to notifikasi directly,
        since notifikasi now lives only in transfer-db.
        """
        addNotification(tier: Int!, teks: String!): NotifResult!
    }
`);

var rootValue = {
    activeTransfer: async function(args) {
        var asset_id = args.asset_id;
        var queryStr = "SELECT * FROM transfers WHERE asset_id = ? AND transfer_status = 'In Transit'";
        var result = await db.query(queryStr, [asset_id]);
        var rows = result[0];
        if (rows.length === 0) throw new Error('No active transfer found');
        return rows[0];
    },

    transferHistory: async function() {
        var result = await db.query('SELECT * FROM transfers ORDER BY requested_at DESC LIMIT 500');
        var rows = result[0];
        return rows;
    },

    initiateTransfer: async function(args) {
        var qr_hash = args.qr_hash;
        var from_ward = args.from_ward;
        var to_ward = args.to_ward;

        var q = '{ assetByQR(hash: "' + qr_hash + '") { id name status } }';
        var response = await axios.post('http://asset:3001/graphql', { query: q });

        if (response.data.errors) {
            var msg = response.data.errors[0].message;
            if (msg.indexOf('not found') !== -1) {
                throw new Error('Invalid QR Code. Asset not found.');
            } else {
                throw new Error(msg);
            }
        }

        var asset = response.data.data.assetByQR;

        if (asset.status !== 'Available') {
            throw new Error('Asset is currently not available for transfer');
        }

        var insertStr = "INSERT INTO transfers (asset_id, from_ward, to_ward, transfer_status) VALUES (?, ?, ?, 'In Transit')";
        var resultDb = await db.query(insertStr, [asset.id, from_ward, to_ward]);
        var result = resultDb[0];

        var mut = 'mutation { updateAssetLocation(id: "' + asset.id + '", current_ward: "' + from_ward + '", status: "In Transit") { message } }';
        await axios.post('http://asset:3001/graphql', { query: mut });

        var pesan = "Aset " + asset.name + " dipindah dari " + from_ward + " ke " + to_ward;
        await db.query("INSERT INTO notifikasi (tier, teks) VALUES (2, ?)", [pesan]);

        return { message: 'Transfer initiated successfully', transfer_id: result.insertId };
    },

    receiveTransfer: async function(args) {
        var id = args.id;
        var updateStr = "UPDATE transfers SET transfer_status = 'Completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?";
        await db.query(updateStr, [id]);

        var selectStr = 'SELECT * FROM transfers WHERE id = ?';
        var resultDb = await db.query(selectStr, [id]);
        var transfer = resultDb[0][0];

        var mut = 'mutation { updateAssetLocation(id: "' + transfer.asset_id + '", current_ward: "' + transfer.to_ward + '", status: "In Use") { message } }';
        await axios.post('http://asset:3001/graphql', { query: mut });

        var qAssets = '{ assets { id name } }';
        var resAssets = await axios.post('http://asset:3001/graphql', { query: qAssets });
        var allAssets = resAssets.data.data.assets;
        var assetName = "ID " + transfer.asset_id;
        for (var i = 0; i < allAssets.length; i++) {
            if (String(allAssets[i].id) === String(transfer.asset_id)) {
                assetName = allAssets[i].name;
                break;
            }
        }

        var pesan = "Aset " + assetName + " telah diterima di " + transfer.to_ward;
        await db.query("INSERT INTO notifikasi (tier, teks) VALUES (2, ?)", [pesan]);

        return { message: 'Asset successfully received and is now In Use.' };
    },

    cancelTransfer: async function(args) {
        var asset_id = args.asset_id;
        var selectStr = "SELECT * FROM transfers WHERE asset_id = ? AND transfer_status = 'In Transit'";
        var resultDb = await db.query(selectStr, [asset_id]);
        var rows = resultDb[0];

        if (rows.length === 0) throw new Error('No active transfer found to cancel.');

        var transfer = rows[0];

        await db.query('DELETE FROM transfers WHERE id = ?', [transfer.id]);

        var mut = 'mutation { updateAssetLocation(id: "' + transfer.asset_id + '", current_ward: "' + transfer.from_ward + '", status: "Available") { message } }';
        await axios.post('http://asset:3001/graphql', { query: mut });

        var qAssets = '{ assets { id name } }';
        var resAssets = await axios.post('http://asset:3001/graphql', { query: qAssets });
        var allAssets = resAssets.data.data.assets;
        var assetName = "ID " + transfer.asset_id;
        for (var j = 0; j < allAssets.length; j++) {
            if (String(allAssets[j].id) === String(transfer.asset_id)) {
                assetName = allAssets[j].name;
                break;
            }
        }

        var pesan = "Transfer aset " + assetName + " dibatalkan, kembali ke " + transfer.from_ward;
        await db.query("INSERT INTO notifikasi (tier, teks) VALUES (2, ?)", [pesan]);

        return { message: 'Transit cancelled successfully.' };
    },

    notifikasiList: async function() {
        var result = await db.query("SELECT * FROM notifikasi ORDER BY id DESC");
        var rows = result[0];
        return rows;
    },

    addNotification: async function(args) {
        var tier = args.tier;
        var teks = args.teks;
        var resultDb = await db.query("INSERT INTO notifikasi (tier, teks) VALUES (?, ?)", [tier, teks]);
        var result = resultDb[0];
        return { message: 'Notification logged', id: result.insertId };
    }
};

app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: rootValue,
    graphiql: true
}));

app.listen(3003, function() {
    console.log('🚚 Transfer Service (GraphQL) running on port 3003 → http://localhost:3003/graphql');
});