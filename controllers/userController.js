const { pool } = require('../db');

const getAllUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0, search } = req.query;

        const [adminCheck] = await pool.execute(`
            SELECT 1 FROM user_workspace_roles uwr
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND r.name IN ('owner', 'admin')
        `, [userId]);

        if (adminCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Admin required' });
        }

        let query = 'SELECT u.* FROM users u';
        let params = [];

        if (search) {
            query += ' WHERE (u.username LIKE ? OR u.email LIKE ?)';
            params = [`%${search}%`, `%${search}%`];
        }

        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [users] = await pool.execute(query, params);
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;

        if (currentUserId != targetUserId) {
            const [adminCheck] = await pool.execute(`
                SELECT 1 FROM user_workspace_roles uwr
                JOIN roles r ON uwr.role_id = r.id
                WHERE uwr.user_id = ? AND r.name IN ('owner', 'admin')
            `, [currentUserId]);

            if (adminCheck.length === 0) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [targetUserId]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const [workspaces] = await pool.execute(`
            SELECT w.*, r.name as role
            FROM user_workspace_roles uwr
            JOIN workspaces w ON uwr.workspace_id = w.id
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ?
        `, [targetUserId]);

        res.json({ success: true, user: users[0], workspaces });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;
        const { username, email, first_name, last_name, avatar_url } = req.body;

        if (currentUserId != targetUserId) {
            const [adminCheck] = await pool.execute(`
                SELECT 1 FROM user_workspace_roles uwr
                JOIN roles r ON uwr.role_id = r.id
                WHERE uwr.user_id = ? AND r.name IN ('owner', 'admin')
            `, [currentUserId]);

            if (adminCheck.length === 0) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        const [targetUser] = await pool.execute('SELECT id FROM users WHERE id = ?', [targetUserId]);
        if (targetUser.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        if (username) {
            await pool.execute('UPDATE users SET username = ? WHERE id = ?', [username, targetUserId]);
        }
        if (email) {
            await pool.execute('UPDATE users SET email = ? WHERE id = ?', [email, targetUserId]);
        }
        if (first_name) {
            await pool.execute('UPDATE users SET first_name = ? WHERE id = ?', [first_name, targetUserId]);
        }
        if (last_name) {
            await pool.execute('UPDATE users SET last_name = ? WHERE id = ?', [last_name, targetUserId]);
        }
        if (avatar_url) {
            await pool.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatar_url, targetUserId]);
        }

        const [updatedUser] = await pool.execute('SELECT * FROM users WHERE id = ?', [targetUserId]);
        res.json({ success: true, user: updatedUser[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;

        if (currentUserId == targetUserId) {
            return res.status(403).json({ success: false, message: 'Cannot delete yourself' });
        }

        const [adminCheck] = await pool.execute(`
            SELECT 1 FROM user_workspace_roles uwr
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND r.name IN ('owner', 'admin')
        `, [currentUserId]);

        if (adminCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Admin required' });
        }

        const [targetUser] = await pool.execute('SELECT id FROM users WHERE id = ?', [targetUserId]);
        if (targetUser.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        await pool.execute('DELETE FROM users WHERE id = ?', [targetUserId]);
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const searchUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        const { query, limit = 10 } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({ success: false, message: 'Query too short' });
        }

        const [users] = await pool.execute(`
            SELECT id, username, email, first_name, last_name, avatar_url, is_verified
            FROM users
            WHERE (email LIKE ? OR username LIKE ?) AND id != ?
            LIMIT ?
        `, [`%${query}%`, `%${query}%`, userId, parseInt(limit)]);

        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

module.exports = { getAllUsers, getUserProfile, updateUserProfile, deleteUser, searchUsers };