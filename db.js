const mysql = require('mysql2');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postman_clone_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Get promise-based pool
const promisePool = pool.promise();

// Test database connection
const testConnection = async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log('Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        return false;
    }
};

// Initialize database connection
const initDatabase = async () => {
    try {
        await testConnection();
        console.log('Database pool initialized');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🔄 Closing database connections...');
    pool.end((err) => {
        if (err) {
            console.error('Error closing database connections:', err);
        } else {
            console.log('Database connections closed');
        }
        process.exit(0);
    });
});

// Export pool and utility functions
module.exports = {
    pool: promisePool,
    testConnection,
    initDatabase
};
