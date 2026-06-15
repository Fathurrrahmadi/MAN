const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());
// app.use(express.json());

console.log("Starting API Gateway (GraphQL)...");

/**
 * GraphQL Gateway Strategy:
 * Each microservice exposes its own /graphql endpoint.
 * The gateway proxies /graphql/assets, /graphql/wards, /graphql/transfers, /graphql/auth
 * to the respective service's /graphql endpoint.
 *
 * Alternatively, for a unified single /graphql endpoint you can use
 * @graphql-tools/stitch — see README notes below.
 */

// Proxy GraphQL requests to Auth Service
app.use('/graphql/auth', createProxyMiddleware({
    target: 'http://auth:3004',
    changeOrigin: true,
    pathRewrite: () => '/graphql'
}));

// Proxy GraphQL requests to Asset Service (also handles /maintenance)
app.use('/graphql/assets', createProxyMiddleware({
    target: 'http://asset:3001',
    changeOrigin: true,
    pathRewrite: () => '/graphql'
}));

// Proxy GraphQL requests to Ward Service
app.use('/graphql/wards', createProxyMiddleware({
    target: 'http://ward:3002',
    changeOrigin: true,
    pathRewrite: () => '/graphql'
}));

// Proxy GraphQL requests to Transfer Service
app.use('/graphql/transfers', createProxyMiddleware({
    target: 'http://transfer:3003',
    changeOrigin: true,
    pathRewrite: () => '/graphql'
}));

// Health check
app.get('/', (req, res) =>
    res.send(
        'API Gateway (GraphQL) is running.\n\n' +
        'Endpoints:\n' +
        '  POST /graphql/auth       → Auth Service\n' +
        '  POST /graphql/assets     → Asset Service\n' +
        '  POST /graphql/wards      → Ward Service\n' +
        '  POST /graphql/transfers  → Transfer Service\n\n' +
        'Each endpoint also serves GET for the GraphiQL playground.'
    )
);

app.listen(3000, () => {
    console.log('🌐 API Gateway running on http://localhost:3000');
    console.log('   Auth     → http://localhost:3000/graphql/auth');
    console.log('   Assets   → http://localhost:3000/graphql/assets');
    console.log('   Wards    → http://localhost:3000/graphql/wards');
    console.log('   Transfers→ http://localhost:3000/graphql/transfers');
});
