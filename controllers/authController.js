const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { username, email, password, first_name, last_name } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'User exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, first_name, last_name]
        );

        const token = jwt.sign({ userId: result.insertId }, process.env.JWT_SECRET, { expiresIn: '7d' });

        const [workspaceResult] = await pool.execute(
            'INSERT INTO workspaces (name, description, type, owner_id) VALUES (?, ?, ?, ?)',
            [`${username}'s Workspace`, 'Default workspace', 'personal', result.insertId]
        );

        await pool.execute(
            'INSERT INTO user_workspace_roles (user_id, workspace_id, role_id) VALUES (?, ?, ?)',
            [result.insertId, workspaceResult.insertId, 1]
        );

        res.status(201).json({ success: true, message: 'User created', token });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid login' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ success: false, message: 'Invalid login' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ success: true, message: 'Login success', token, user: { id: user.id, username: user.username, email: user.email } });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
        res.json({ success: true, user: users[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const token = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Invalid token' });
    }
};

module.exports = { register, login, getProfile, refreshToken };