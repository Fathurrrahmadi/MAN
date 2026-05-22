
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

// --- SWAGGER SETUP ---
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
app.use(cors());

console.log("Starting API Gateway...");

// Serve the Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Route requests to Auth Service  <-- NEW
app.use('/api/auth', createProxyMiddleware({
    target: 'http://127.0.0.1:3004',
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl
}));

app.use('/api/maintenance', createProxyMiddleware({
    target: 'http://127.0.0.1:3001',   // routes to asset-service
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl
}));

// Route requests to Asset Service
app.use('/api/assets', createProxyMiddleware({ 
    target: 'http://127.0.0.1:3001', 
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl 
}));

// Route requests to Ward Service
app.use('/api/wards', createProxyMiddleware({ 
    target: 'http://127.0.0.1:3002', 
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl
}));

// Route requests to Transfer Service
app.use('/api/transfers', createProxyMiddleware({ 
    target: 'http://127.0.0.1:3003', 
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl
}));

// Catch-all
app.get('/', (req, res) => res.send("API Gateway is running. Visit /api-docs for documentation."));

app.listen(3000, () => {
    console.log('🌐 API Gateway running on http://localhost:3000');
    console.log('📄 Swagger Docs available at http://localhost:3000/api-docs');
});