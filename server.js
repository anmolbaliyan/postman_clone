const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDatabase } = require('./db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Postman Clone API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/auth', require('./routes/authRoute'));
app.use('/api', require('./routes/workspaceRoutes'));
app.use('/api', require('./routes/collectionRoutes'));
app.use('/api', require('./routes/requestRoutes'));
app.use('/api', require('./routes/environmentRoutes'));
app.use('/api', require('./routes/requestHistoryRoutes'));
app.use('/api', require('./routes/roleRoutes'));
app.use('/api', require('./routes/userworkspaceroleRoute'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api', require('./routes/folderRoutes'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        code: 'ENDPOINT_NOT_FOUND'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        code: error.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Start server
const startServer = async () => {
    try {
        // Initialize database connection
        await initDatabase();
        
        // Start the server
        app.listen(PORT, () => {
            console.log(` Server running on port ${PORT}`);
            console.log(` API Documentation: http://localhost:${PORT}/health`);
            console.log(` Auth endpoints: http://localhost:${PORT}/api/auth`);
            console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error(' Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Start the server
startServer();
