const { pool } = require('../db');

const getEnvironments = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.workspaceId;

        const [userAccess] = await pool.execute(
            'SELECT 1 FROM user_workspace_roles WHERE user_id = ? AND workspace_id = ?',
            [userId, workspaceId]
        );

        if (userAccess.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const [environments] = await pool.execute(`
            SELECT e.*, u.username as created_by_username
            FROM environments e
            JOIN users u ON e.created_by = u.id
            WHERE e.workspace_id = ?
        `, [workspaceId]);

        res.json({ success: true, environments });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const getEnvironment = async (req, res) => {
    try {
        const userId = req.user.id;
        const environmentId = req.params.id;

        const [environments] = await pool.execute(`
            SELECT e.*, u.username as created_by_username
            FROM environments e
            JOIN users u ON e.created_by = u.id
            JOIN user_workspace_roles uwr ON e.workspace_id = uwr.workspace_id
            WHERE e.id = ? AND uwr.user_id = ?
        `, [environmentId, userId]);

        if (environments.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        res.json({ success: true, environment: environments[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const createEnvironment = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.workspaceId;
        const { name, description, variables } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name required' });
        }

        const [userAccess] = await pool.execute(
            'SELECT 1 FROM user_workspace_roles WHERE user_id = ? AND workspace_id = ?',
            [userId, workspaceId]
        );

        if (userAccess.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const [result] = await pool.execute(
            'INSERT INTO environments (name, description, variables, workspace_id, created_by) VALUES (?, ?, ?, ?, ?)',
            [name, description, JSON.stringify(variables || {}), workspaceId, userId]
        );

        const [newEnvironment] = await pool.execute('SELECT * FROM environments WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, environment: newEnvironment[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const updateEnvironment = async (req, res) => {
    try {
        const userId = req.user.id;
        const environmentId = req.params.id;
        const { name, description, variables } = req.body;

        const [environments] = await pool.execute(`
            SELECT e.* FROM environments e
            JOIN user_workspace_roles uwr ON e.workspace_id = uwr.workspace_id
            WHERE e.id = ? AND uwr.user_id = ?
        `, [environmentId, userId]);

        if (environments.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        if (name) {
            await pool.execute('UPDATE environments SET name = ? WHERE id = ?', [name, environmentId]);
        }
        if (description) {
            await pool.execute('UPDATE environments SET description = ? WHERE id = ?', [description, environmentId]);
        }
        if (variables) {
            await pool.execute('UPDATE environments SET variables = ? WHERE id = ?', [JSON.stringify(variables), environmentId]);
        }

        const [updatedEnvironment] = await pool.execute('SELECT * FROM environments WHERE id = ?', [environmentId]);
        res.json({ success: true, environment: updatedEnvironment[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const deleteEnvironment = async (req, res) => {
    try {
        const userId = req.user.id;
        const environmentId = req.params.id;

        const [environments] = await pool.execute(`
            SELECT e.* FROM environments e
            JOIN user_workspace_roles uwr ON e.workspace_id = uwr.workspace_id
            WHERE e.id = ? AND uwr.user_id = ?
        `, [environmentId, userId]);

        if (environments.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        await pool.execute('DELETE FROM environments WHERE id = ?', [environmentId]);
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

module.exports = { getEnvironments, getEnvironment, createEnvironment, updateEnvironment, deleteEnvironment };