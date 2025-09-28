const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDatabase } = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.get('/health', (req, res) => {
    res.json({ success: true, message: 'API is running' });
});

app.use('/api/auth', require('./routes/authRoute'));
app.use('/api', require('./routes/workspaceRoutes'));
app.use('/api', require('./routes/collectionRoutes'));
app.use('/api', require('./routes/requestRoutes'));
app.use('/api', require('./routes/environmentRoutes'));
app.use('/api', require('./routes/requestHistoryRoutes'));
app.use('/api', require('./routes/roleRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api', require('./routes/folderRoutes'));

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
});

app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
});

const startServer = async () => {
    try {
        await initDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
