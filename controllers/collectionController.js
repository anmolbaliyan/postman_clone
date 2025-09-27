const { pool } = require('../db');

/**
 * Get all collections in a workspace
 */
const getCollections = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.workspaceId;

        // Check if user has access to the workspace
        const [userAccess] = await pool.execute(
            'SELECT 1 FROM user_workspace_roles WHERE user_id = ? AND workspace_id = ?',
            [userId, workspaceId]
        );

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Workspace not found or access denied',
                code: 'WORKSPACE_NOT_FOUND'
            });
        }

        // Get collections with request counts
        const [collections] = await pool.execute(`
            SELECT 
                c.id,
                c.name,
                c.description,
                c.workspace_id,
                c.created_by,
                c.created_at,
                c.updated_at,
                u.username as created_by_username,
                COUNT(r.id) as request_count
            FROM collections c
            LEFT JOIN requests r ON c.id = r.collection_id
            JOIN users u ON c.created_by = u.id
            WHERE c.workspace_id = ?
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `, [workspaceId]);

        res.json({
            success: true,
            data: {
                collections: collections.map(collection => ({
                    id: collection.id,
                    name: collection.name,
                    description: collection.description,
                    workspace_id: collection.workspace_id,
                    created_by: collection.created_by,
                    created_by_username: collection.created_by_username,
                    request_count: parseInt(collection.request_count),
                    created_at: collection.created_at,
                    updated_at: collection.updated_at
                }))
            }
        });

    } catch (error) {
        console.error('Get collections error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'COLLECTIONS_FETCH_FAILED'
        });
    }
};

/**
 * Get a specific collection by ID
 */
const getCollection = async (req, res) => {
    try {
        const userId = req.user.id;
        const collectionId = req.params.id;

        // Get collection with workspace access check
        const [collections] = await pool.execute(`
            SELECT 
                c.id,
                c.name,
                c.description,
                c.workspace_id,
                c.created_by,
                c.created_at,
                c.updated_at,
                u.username as created_by_username
            FROM collections c
            JOIN users u ON c.created_by = u.id
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            WHERE c.id = ? AND uwr.user_id = ?
        `, [collectionId, userId]);

        if (collections.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found or access denied',
                code: 'COLLECTION_NOT_FOUND'
            });
        }

        const collection = collections[0];

        // Get folders in this collection
        const [folders] = await pool.execute(`
            SELECT id, name, parent_folder_id, created_at
            FROM folders
            WHERE collection_id = ?
            ORDER BY created_at ASC
        `, [collectionId]);

        res.json({
            success: true,
            data: {
                collection: {
                    id: collection.id,
                    name: collection.name,
                    description: collection.description,
                    workspace_id: collection.workspace_id,
                    created_by: collection.created_by,
                    created_by_username: collection.created_by_username,
                    created_at: collection.created_at,
                    updated_at: collection.updated_at,
                    folders: folders
                }
            }
        });

    } catch (error) {
        console.error('Get collection error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'COLLECTION_FETCH_FAILED'
        });
    }
};

/**
 * Create a new collection
 */
const createCollection = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.workspaceId;
        const { name, description } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Collection name is required',
                code: 'MISSING_COLLECTION_NAME'
            });
        }

        // Check if user has access to the workspace
        const [userAccess] = await pool.execute(
            'SELECT 1 FROM user_workspace_roles WHERE user_id = ? AND workspace_id = ?',
            [userId, workspaceId]
        );

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Workspace not found or access denied',
                code: 'WORKSPACE_NOT_FOUND'
            });
        }

        // Create collection
        const [result] = await pool.execute(
            'INSERT INTO collections (name, description, workspace_id, created_by) VALUES (?, ?, ?, ?)',
            [name, description || null, workspaceId, userId]
        );

        const collectionId = result.insertId;

        // Get the created collection
        const [newCollection] = await pool.execute(`
            SELECT 
                c.id,
                c.name,
                c.description,
                c.workspace_id,
                c.created_by,
                c.created_at,
                c.updated_at,
                u.username as created_by_username
            FROM collections c
            JOIN users u ON c.created_by = u.id
            WHERE c.id = ?
        `, [collectionId]);

        res.status(201).json({
            success: true,
            message: 'Collection created successfully',
            data: {
                collection: newCollection[0]
            }
        });

    } catch (error) {
        console.error('Create collection error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'COLLECTION_CREATE_FAILED'
        });
    }
};

/**
 * Update a collection
 */
const updateCollection = async (req, res) => {
    try {
        const userId = req.user.id;
        const collectionId = req.params.id;
        const { name, description } = req.body;

        // Check if user has access to the collection and permission to edit
        const [userAccess] = await pool.execute(`
            SELECT 
                c.id,
                uwr.user_id,
                r.name as role
            FROM collections c
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE c.id = ? AND uwr.user_id = ?
        `, [collectionId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found or access denied',
                code: 'COLLECTION_NOT_FOUND'
            });
        }

        const userRole = userAccess[0].role;
        if (!['owner', 'admin', 'editor'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to update collection',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (name) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(collectionId);

        await pool.execute(
            `UPDATE collections SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Get updated collection
        const [updatedCollection] = await pool.execute(`
            SELECT 
                c.id,
                c.name,
                c.description,
                c.workspace_id,
                c.created_by,
                c.created_at,
                c.updated_at,
                u.username as created_by_username
            FROM collections c
            JOIN users u ON c.created_by = u.id
            WHERE c.id = ?
        `, [collectionId]);

        res.json({
            success: true,
            message: 'Collection updated successfully',
            data: {
                collection: updatedCollection[0]
            }
        });

    } catch (error) {
        console.error('Update collection error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'COLLECTION_UPDATE_FAILED'
        });
    }
};

/**
 * Delete a collection
 */
const deleteCollection = async (req, res) => {
    try {
        const userId = req.user.id;
        const collectionId = req.params.id;

        // Check if user has permission to delete (owner or admin)
        const [userAccess] = await pool.execute(`
            SELECT 
                c.id,
                uwr.user_id,
                r.name as role
            FROM collections c
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE c.id = ? AND uwr.user_id = ?
        `, [collectionId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found or access denied',
                code: 'COLLECTION_NOT_FOUND'
            });
        }

        const userRole = userAccess[0].role;
        if (!['owner', 'admin'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to delete collection',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Delete collection (cascade will handle related records)
        await pool.execute('DELETE FROM collections WHERE id = ?', [collectionId]);

        res.json({
            success: true,
            message: 'Collection deleted successfully'
        });

    } catch (error) {
        console.error('Delete collection error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'COLLECTION_DELETE_FAILED'
        });
    }
};

module.exports = {
    getCollections,
    getCollection,
    createCollection,
    updateCollection,
    deleteCollection
};
