const { pool } = require('../db');

const getCollections = async (req, res) => {
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

        const [collections] = await pool.execute(`
            SELECT c.*, u.username as created_by_username
            FROM collections c
            JOIN users u ON c.created_by = u.id
            WHERE c.workspace_id = ?
        `, [workspaceId]);

        res.json({ success: true, collections });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const getCollection = async (req, res) => {
    try {
        const userId = req.user.id;
        const collectionId = req.params.id;

        const [collections] = await pool.execute(`
            SELECT c.*, u.username as created_by_username
            FROM collections c
            JOIN users u ON c.created_by = u.id
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            WHERE c.id = ? AND uwr.user_id = ?
        `, [collectionId, userId]);

        if (collections.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        res.json({ success: true, collection: collections[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const createCollection = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.workspaceId;
        const { name, description } = req.body;

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
            'INSERT INTO collections (name, description, workspace_id, created_by) VALUES (?, ?, ?, ?)',
            [name, description, workspaceId, userId]
        );

        const [newCollection] = await pool.execute('SELECT * FROM collections WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, collection: newCollection[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const updateCollection = async (req, res) => {
    try {
        const userId = req.user.id;
        const collectionId = req.params.id;
        const { name, description } = req.body;

        const [collections] = await pool.execute(`
            SELECT c.* FROM collections c
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            WHERE c.id = ? AND uwr.user_id = ?
        `, [collectionId, userId]);

        if (collections.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        if (name) {
            await pool.execute('UPDATE collections SET name = ? WHERE id = ?', [name, collectionId]);
        }
        if (description) {
            await pool.execute('UPDATE collections SET description = ? WHERE id = ?', [description, collectionId]);
        }

        const [updatedCollection] = await pool.execute('SELECT * FROM collections WHERE id = ?', [collectionId]);
        res.json({ success: true, collection: updatedCollection[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const deleteCollection = async (req, res) => {
    try {
        const userId = req.user.id;
        const collectionId = req.params.id;

        const [collections] = await pool.execute(`
            SELECT c.* FROM collections c
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            WHERE c.id = ? AND uwr.user_id = ?
        `, [collectionId, userId]);

        if (collections.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        await pool.execute('DELETE FROM collections WHERE id = ?', [collectionId]);
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

module.exports = { getCollections, getCollection, createCollection, updateCollection, deleteCollection };