const { pool } = require('../db');

const getRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const collectionId = req.params.collectionId;

        const [userAccess] = await pool.execute(`
            SELECT 1 FROM collections c
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            WHERE c.id = ? AND uwr.user_id = ?
        `, [collectionId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const [requests] = await pool.execute(`
            SELECT r.*, u.username as created_by_username
            FROM requests r
            JOIN users u ON r.created_by = u.id
            WHERE r.collection_id = ?
        `, [collectionId]);

        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const getRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = req.params.id;

        const [requests] = await pool.execute(`
            SELECT r.*, u.username as created_by_username
            FROM requests r
            JOIN users u ON r.created_by = u.id
            JOIN user_workspace_roles uwr ON r.workspace_id = uwr.workspace_id
            WHERE r.id = ? AND uwr.user_id = ?
        `, [requestId, userId]);

        if (requests.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        res.json({ success: true, request: requests[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const createRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const collectionId = req.params.collectionId;
        const { name, description, method, url, headers, body, query_params, path_params, folder_id } = req.body;

        if (!name || !method || !url) {
            return res.status(400).json({ success: false, message: 'Name, method, and URL required' });
        }

        const [userAccess] = await pool.execute(`
            SELECT c.workspace_id FROM collections c
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            WHERE c.id = ? AND uwr.user_id = ?
        `, [collectionId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const [result] = await pool.execute(
            'INSERT INTO requests (name, description, method, url, headers, body, query_params, path_params, collection_id, folder_id, workspace_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, method, url, JSON.stringify(headers || {}), body, JSON.stringify(query_params || {}), JSON.stringify(path_params || {}), collectionId, folder_id, userAccess[0].workspace_id, userId]
        );

        const [newRequest] = await pool.execute('SELECT * FROM requests WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, request: newRequest[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const updateRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = req.params.id;
        const { name, description, method, url, headers, body, query_params, path_params } = req.body;

        const [requests] = await pool.execute(`
            SELECT r.* FROM requests r
            JOIN user_workspace_roles uwr ON r.workspace_id = uwr.workspace_id
            WHERE r.id = ? AND uwr.user_id = ?
        `, [requestId, userId]);

        if (requests.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        if (name) {
            await pool.execute('UPDATE requests SET name = ? WHERE id = ?', [name, requestId]);
        }
        if (description) {
            await pool.execute('UPDATE requests SET description = ? WHERE id = ?', [description, requestId]);
        }
        if (method) {
            await pool.execute('UPDATE requests SET method = ? WHERE id = ?', [method, requestId]);
        }
        if (url) {
            await pool.execute('UPDATE requests SET url = ? WHERE id = ?', [url, requestId]);
        }
        if (headers) {
            await pool.execute('UPDATE requests SET headers = ? WHERE id = ?', [JSON.stringify(headers), requestId]);
        }
        if (body) {
            await pool.execute('UPDATE requests SET body = ? WHERE id = ?', [body, requestId]);
        }
        if (query_params) {
            await pool.execute('UPDATE requests SET query_params = ? WHERE id = ?', [JSON.stringify(query_params), requestId]);
        }
        if (path_params) {
            await pool.execute('UPDATE requests SET path_params = ? WHERE id = ?', [JSON.stringify(path_params), requestId]);
        }

        const [updatedRequest] = await pool.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
        res.json({ success: true, request: updatedRequest[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

const deleteRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = req.params.id;

        const [requests] = await pool.execute(`
            SELECT r.* FROM requests r
            JOIN user_workspace_roles uwr ON r.workspace_id = uwr.workspace_id
            WHERE r.id = ? AND uwr.user_id = ?
        `, [requestId, userId]);

        if (requests.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        await pool.execute('DELETE FROM requests WHERE id = ?', [requestId]);
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};

module.exports = { getRequests, getRequest, createRequest, updateRequest, deleteRequest };