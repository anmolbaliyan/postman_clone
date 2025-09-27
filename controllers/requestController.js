const { pool } = require('../db');

/**
 * Get all requests in a collection
 */
const getRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const collectionId = req.params.collectionId;

        // Check if user has access to the collection's workspace
        const [userAccess] = await pool.execute(`
            SELECT 1 
            FROM collections c
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            WHERE c.id = ? AND uwr.user_id = ?
        `, [collectionId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found or access denied',
                code: 'COLLECTION_NOT_FOUND'
            });
        }

        // Get requests with folder information
        const [requests] = await pool.execute(`
            SELECT 
                r.id,
                r.name,
                r.description,
                r.method,
                r.url,
                r.headers,
                r.body,
                r.query_params,
                r.path_params,
                r.collection_id,
                r.folder_id,
                r.workspace_id,
                r.created_by,
                r.created_at,
                r.updated_at,
                u.username as created_by_username,
                f.name as folder_name
            FROM requests r
            LEFT JOIN folders f ON r.folder_id = f.id
            JOIN users u ON r.created_by = u.id
            WHERE r.collection_id = ?
            ORDER BY r.created_at DESC
        `, [collectionId]);

        res.json({
            success: true,
            data: {
                requests: requests.map(request => ({
                    id: request.id,
                    name: request.name,
                    description: request.description,
                    method: request.method,
                    url: request.url,
                    headers: request.headers ? JSON.parse(request.headers) : null,
                    body: request.body,
                    query_params: request.query_params ? JSON.parse(request.query_params) : null,
                    path_params: request.path_params ? JSON.parse(request.path_params) : null,
                    collection_id: request.collection_id,
                    folder_id: request.folder_id,
                    folder_name: request.folder_name,
                    workspace_id: request.workspace_id,
                    created_by: request.created_by,
                    created_by_username: request.created_by_username,
                    created_at: request.created_at,
                    updated_at: request.updated_at
                }))
            }
        });

    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'REQUESTS_FETCH_FAILED'
        });
    }
};

/**
 * Get a specific request by ID
 */
const getRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = req.params.id;

        // Get request with access check
        const [requests] = await pool.execute(`
            SELECT 
                r.id,
                r.name,
                r.description,
                r.method,
                r.url,
                r.headers,
                r.body,
                r.query_params,
                r.path_params,
                r.collection_id,
                r.folder_id,
                r.workspace_id,
                r.created_by,
                r.created_at,
                r.updated_at,
                u.username as created_by_username,
                f.name as folder_name
            FROM requests r
            LEFT JOIN folders f ON r.folder_id = f.id
            JOIN users u ON r.created_by = u.id
            JOIN user_workspace_roles uwr ON r.workspace_id = uwr.workspace_id
            WHERE r.id = ? AND uwr.user_id = ?
        `, [requestId, userId]);

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Request not found or access denied',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        const request = requests[0];

        res.json({
            success: true,
            data: {
                request: {
                    id: request.id,
                    name: request.name,
                    description: request.description,
                    method: request.method,
                    url: request.url,
                    headers: request.headers ? JSON.parse(request.headers) : null,
                    body: request.body,
                    query_params: request.query_params ? JSON.parse(request.query_params) : null,
                    path_params: request.path_params ? JSON.parse(request.path_params) : null,
                    collection_id: request.collection_id,
                    folder_id: request.folder_id,
                    folder_name: request.folder_name,
                    workspace_id: request.workspace_id,
                    created_by: request.created_by,
                    created_by_username: request.created_by_username,
                    created_at: request.created_at,
                    updated_at: request.updated_at
                }
            }
        });

    } catch (error) {
        console.error('Get request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'REQUEST_FETCH_FAILED'
        });
    }
};

/**
 * Create a new request
 */
const createRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const collectionId = req.params.collectionId;
        const { 
            name, 
            description, 
            method, 
            url, 
            headers, 
            body, 
            query_params, 
            path_params, 
            folder_id 
        } = req.body;

        // Validate required fields
        if (!name || !method || !url) {
            return res.status(400).json({
                success: false,
                message: 'Name, method, and URL are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Validate HTTP method
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
        if (!validMethods.includes(method.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid HTTP method',
                code: 'INVALID_HTTP_METHOD'
            });
        }

        // Check if user has access to the collection's workspace
        const [collectionInfo] = await pool.execute(`
            SELECT c.workspace_id
            FROM collections c
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            WHERE c.id = ? AND uwr.user_id = ?
        `, [collectionId, userId]);

        if (collectionInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found or access denied',
                code: 'COLLECTION_NOT_FOUND'
            });
        }

        const workspaceId = collectionInfo[0].workspace_id;

        // If folder_id is provided, verify it belongs to the same collection
        if (folder_id) {
            const [folderCheck] = await pool.execute(
                'SELECT id FROM folders WHERE id = ? AND collection_id = ?',
                [folder_id, collectionId]
            );
            
            if (folderCheck.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid folder ID or folder does not belong to this collection',
                    code: 'INVALID_FOLDER_ID'
                });
            }
        }

        // Create request
        const [result] = await pool.execute(`
            INSERT INTO requests (
                name, description, method, url, headers, body, 
                query_params, path_params, collection_id, folder_id, 
                workspace_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name,
            description || null,
            method.toUpperCase(),
            url,
            headers ? JSON.stringify(headers) : null,
            body || null,
            query_params ? JSON.stringify(query_params) : null,
            path_params ? JSON.stringify(path_params) : null,
            collectionId,
            folder_id || null,
            workspaceId,
            userId
        ]);

        const requestId = result.insertId;

        // Get the created request
        const [newRequest] = await pool.execute(`
            SELECT 
                r.id,
                r.name,
                r.description,
                r.method,
                r.url,
                r.headers,
                r.body,
                r.query_params,
                r.path_params,
                r.collection_id,
                r.folder_id,
                r.workspace_id,
                r.created_by,
                r.created_at,
                r.updated_at,
                u.username as created_by_username,
                f.name as folder_name
            FROM requests r
            LEFT JOIN folders f ON r.folder_id = f.id
            JOIN users u ON r.created_by = u.id
            WHERE r.id = ?
        `, [requestId]);

        res.status(201).json({
            success: true,
            message: 'Request created successfully',
            data: {
                request: {
                    id: newRequest[0].id,
                    name: newRequest[0].name,
                    description: newRequest[0].description,
                    method: newRequest[0].method,
                    url: newRequest[0].url,
                    headers: newRequest[0].headers ? JSON.parse(newRequest[0].headers) : null,
                    body: newRequest[0].body,
                    query_params: newRequest[0].query_params ? JSON.parse(newRequest[0].query_params) : null,
                    path_params: newRequest[0].path_params ? JSON.parse(newRequest[0].path_params) : null,
                    collection_id: newRequest[0].collection_id,
                    folder_id: newRequest[0].folder_id,
                    folder_name: newRequest[0].folder_name,
                    workspace_id: newRequest[0].workspace_id,
                    created_by: newRequest[0].created_by,
                    created_by_username: newRequest[0].created_by_username,
                    created_at: newRequest[0].created_at,
                    updated_at: newRequest[0].updated_at
                }
            }
        });

    } catch (error) {
        console.error('Create request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'REQUEST_CREATE_FAILED'
        });
    }
};

/**
 * Update a request
 */
const updateRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = req.params.id;
        const { 
            name, 
            description, 
            method, 
            url, 
            headers, 
            body, 
            query_params, 
            path_params, 
            folder_id 
        } = req.body;

        // Check if user has access and permission to edit
        const [userAccess] = await pool.execute(`
            SELECT 
                r.id,
                r.collection_id,
                uwr.user_id,
                r.name as role
            FROM requests r
            JOIN user_workspace_roles uwr ON r.workspace_id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE r.id = ? AND uwr.user_id = ?
        `, [requestId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Request not found or access denied',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        const userRole = userAccess[0].role;
        if (!['owner', 'admin', 'editor'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to update request',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Validate HTTP method if provided
        if (method) {
            const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
            if (!validMethods.includes(method.toUpperCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid HTTP method',
                    code: 'INVALID_HTTP_METHOD'
                });
            }
        }

        // If folder_id is provided, verify it belongs to the same collection
        if (folder_id) {
            const [folderCheck] = await pool.execute(
                'SELECT id FROM folders WHERE id = ? AND collection_id = ?',
                [folder_id, userAccess[0].collection_id]
            );
            
            if (folderCheck.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid folder ID or folder does not belong to this collection',
                    code: 'INVALID_FOLDER_ID'
                });
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (name) updateFields.push('name = ?'), updateValues.push(name);
        if (description !== undefined) updateFields.push('description = ?'), updateValues.push(description);
        if (method) updateFields.push('method = ?'), updateValues.push(method.toUpperCase());
        if (url) updateFields.push('url = ?'), updateValues.push(url);
        if (headers !== undefined) updateFields.push('headers = ?'), updateValues.push(headers ? JSON.stringify(headers) : null);
        if (body !== undefined) updateFields.push('body = ?'), updateValues.push(body);
        if (query_params !== undefined) updateFields.push('query_params = ?'), updateValues.push(query_params ? JSON.stringify(query_params) : null);
        if (path_params !== undefined) updateFields.push('path_params = ?'), updateValues.push(path_params ? JSON.stringify(path_params) : null);
        if (folder_id !== undefined) updateFields.push('folder_id = ?'), updateValues.push(folder_id);

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(requestId);

        await pool.execute(
            `UPDATE requests SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Get updated request
        const [updatedRequest] = await pool.execute(`
            SELECT 
                r.id,
                r.name,
                r.description,
                r.method,
                r.url,
                r.headers,
                r.body,
                r.query_params,
                r.path_params,
                r.collection_id,
                r.folder_id,
                r.workspace_id,
                r.created_by,
                r.created_at,
                r.updated_at,
                u.username as created_by_username,
                f.name as folder_name
            FROM requests r
            LEFT JOIN folders f ON r.folder_id = f.id
            JOIN users u ON r.created_by = u.id
            WHERE r.id = ?
        `, [requestId]);

        res.json({
            success: true,
            message: 'Request updated successfully',
            data: {
                request: {
                    id: updatedRequest[0].id,
                    name: updatedRequest[0].name,
                    description: updatedRequest[0].description,
                    method: updatedRequest[0].method,
                    url: updatedRequest[0].url,
                    headers: updatedRequest[0].headers ? JSON.parse(updatedRequest[0].headers) : null,
                    body: updatedRequest[0].body,
                    query_params: updatedRequest[0].query_params ? JSON.parse(updatedRequest[0].query_params) : null,
                    path_params: updatedRequest[0].path_params ? JSON.parse(updatedRequest[0].path_params) : null,
                    collection_id: updatedRequest[0].collection_id,
                    folder_id: updatedRequest[0].folder_id,
                    folder_name: updatedRequest[0].folder_name,
                    workspace_id: updatedRequest[0].workspace_id,
                    created_by: updatedRequest[0].created_by,
                    created_by_username: updatedRequest[0].created_by_username,
                    created_at: updatedRequest[0].created_at,
                    updated_at: updatedRequest[0].updated_at
                }
            }
        });

    } catch (error) {
        console.error('Update request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'REQUEST_UPDATE_FAILED'
        });
    }
};

/**
 * Delete a request
 */
const deleteRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = req.params.id;

        // Check if user has permission to delete (admin or owner)
        const [userAccess] = await pool.execute(`
            SELECT 
                r.id,
                uwr.user_id,
                r.name as role
            FROM requests r
            JOIN user_workspace_roles uwr ON r.workspace_id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE r.id = ? AND uwr.user_id = ?
        `, [requestId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Request not found or access denied',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        const userRole = userAccess[0].role;
        if (!['owner', 'admin'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to delete request',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Delete request (cascade will handle related records)
        await pool.execute('DELETE FROM requests WHERE id = ?', [requestId]);

        res.json({
            success: true,
            message: 'Request deleted successfully'
        });

    } catch (error) {
        console.error('Delete request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'REQUEST_DELETE_FAILED'
        });
    }
};

module.exports = {
    getRequests,
    getRequest,
    createRequest,
    updateRequest,
    deleteRequest
};
