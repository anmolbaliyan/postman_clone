const { pool } = require('../db');

const getWorkspaces = async (req, res) => {
    try {
        const userId = req.user.id;
        const [workspaces] = await pool.execute(`
            SELECT w.*, r.name as user_role
            FROM workspaces w
            JOIN user_workspace_roles uwr ON w.id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ?
        `, [userId]);

        res.json({ success: true, workspaces });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const getWorkspace = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;
        const [workspaces] = await pool.execute(`
            SELECT w.*, r.name as user_role
            FROM workspaces w
            JOIN user_workspace_roles uwr ON w.id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND w.id = ?
        `, [userId, workspaceId]);

        if (workspaces.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        res.json({ success: true, workspace: workspaces[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const createWorkspace = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description, type = 'personal' } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO workspaces (name, description, type, owner_id) VALUES (?, ?, ?, ?)',
            [name, description, type, userId]
        );

        await pool.execute(
            'INSERT INTO user_workspace_roles (user_id, workspace_id, role_id) VALUES (?, ?, 1)',
            [userId, result.insertId]
        );

        const [newWorkspace] = await pool.execute('SELECT * FROM workspaces WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, workspace: newWorkspace[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const updateWorkspace = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;
        const { name, description } = req.body;

        const [userRoles] = await pool.execute(`
            SELECT r.name FROM user_workspace_roles uwr
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND uwr.workspace_id = ?
        `, [userId, workspaceId]);

        if (userRoles.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        if (!['owner', 'admin'].includes(userRoles[0].name)) {
            return res.status(403).json({ success: false, message: 'No permission' });
        }

        if (name) {
            await pool.execute('UPDATE workspaces SET name = ? WHERE id = ?', [name, workspaceId]);
        }
        if (description) {
            await pool.execute('UPDATE workspaces SET description = ? WHERE id = ?', [description, workspaceId]);
        }

        const [updatedWorkspace] = await pool.execute('SELECT * FROM workspaces WHERE id = ?', [workspaceId]);
        res.json({ success: true, workspace: updatedWorkspace[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const deleteWorkspace = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;

        const [workspaces] = await pool.execute('SELECT owner_id FROM workspaces WHERE id = ?', [workspaceId]);
        if (workspaces.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        if (workspaces[0].owner_id !== userId) {
            return res.status(403).json({ success: false, message: 'Only owner can delete' });
        }

        await pool.execute('DELETE FROM workspaces WHERE id = ?', [workspaceId]);
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const getWorkspaceMembers = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;

        const [userAccess] = await pool.execute(
            'SELECT 1 FROM user_workspace_roles WHERE user_id = ? AND workspace_id = ?',
            [userId, workspaceId]
        );

        if (userAccess.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const [members] = await pool.execute(`
            SELECT u.*, r.name as role
            FROM user_workspace_roles uwr
            JOIN users u ON uwr.user_id = u.id
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.workspace_id = ?
        `, [workspaceId]);

        res.json({ success: true, members });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

module.exports = { getWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, getWorkspaceMembers };