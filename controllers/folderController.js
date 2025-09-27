const { pool } = require('../db');

/**
 * Get all folders in a collection
 */
const getFolders = async (req, res) => {
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

        // Get folders with request counts
        const [folders] = await pool.execute(`
            SELECT 
                f.id,
                f.name,
                f.parent_folder_id,
                f.collection_id,
                f.created_at,
                f.updated_at,
                COUNT(r.id) as request_count
            FROM folders f
            LEFT JOIN requests r ON f.id = r.folder_id
            WHERE f.collection_id = ?
            GROUP BY f.id
            ORDER BY f.created_at ASC
        `, [collectionId]);

        res.json({
            success: true,
            data: {
                folders: folders.map(folder => ({
                    id: folder.id,
                    name: folder.name,
                    parent_folder_id: folder.parent_folder_id,
                    collection_id: folder.collection_id,
                    request_count: parseInt(folder.request_count),
                    created_at: folder.created_at,
                    updated_at: folder.updated_at
                }))
            }
        });

    } catch (error) {
        console.error('Get folders error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'FOLDERS_FETCH_FAILED'
        });
    }
};

/**
 * Get a specific folder by ID
 */
const getFolder = async (req, res) => {
    try {
        const userId = req.user.id;
        const folderId = req.params.id;

        // Get folder with access check
        const [folders] = await pool.execute(`
            SELECT 
                f.id,
                f.name,
                f.parent_folder_id,
                f.collection_id,
                f.created_at,
                f.updated_at
            FROM folders f
            JOIN collections c ON f.collection_id = c.id
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            WHERE f.id = ? AND uwr.user_id = ?
        `, [folderId, userId]);

        if (folders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found or access denied',
                code: 'FOLDER_NOT_FOUND'
            });
        }

        const folder = folders[0];

        // Get subfolders
        const [subfolders] = await pool.execute(`
            SELECT id, name, created_at
            FROM folders
            WHERE parent_folder_id = ?
            ORDER BY created_at ASC
        `, [folderId]);

        // Get requests in this folder
        const [requests] = await pool.execute(`
            SELECT id, name, method, url, created_at
            FROM requests
            WHERE folder_id = ?
            ORDER BY created_at ASC
        `, [folderId]);

        res.json({
            success: true,
            data: {
                folder: {
                    id: folder.id,
                    name: folder.name,
                    parent_folder_id: folder.parent_folder_id,
                    collection_id: folder.collection_id,
                    created_at: folder.created_at,
                    updated_at: folder.updated_at,
                    subfolders: subfolders,
                    requests: requests
                }
            }
        });

    } catch (error) {
        console.error('Get folder error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'FOLDER_FETCH_FAILED'
        });
    }
};

/**
 * Create a new folder
 */
const createFolder = async (req, res) => {
    try {
        const userId = req.user.id;
        const collectionId = req.params.collectionId;
        const { name, parent_folder_id } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Folder name is required',
                code: 'MISSING_FOLDER_NAME'
            });
        }

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

        // If parent_folder_id is provided, verify it belongs to the same collection
        if (parent_folder_id) {
            const [parentFolder] = await pool.execute(
                'SELECT id FROM folders WHERE id = ? AND collection_id = ?',
                [parent_folder_id, collectionId]
            );
            
            if (parentFolder.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid parent folder ID or folder does not belong to this collection',
                    code: 'INVALID_PARENT_FOLDER_ID'
                });
            }
        }

        // Create folder
        const [result] = await pool.execute(
            'INSERT INTO folders (name, parent_folder_id, collection_id) VALUES (?, ?, ?)',
            [name, parent_folder_id || null, collectionId]
        );

        const folderId = result.insertId;

        // Get the created folder
        const [newFolder] = await pool.execute(
            'SELECT id, name, parent_folder_id, collection_id, created_at, updated_at FROM folders WHERE id = ?',
            [folderId]
        );

        res.status(201).json({
            success: true,
            message: 'Folder created successfully',
            data: {
                folder: newFolder[0]
            }
        });

    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'FOLDER_CREATE_FAILED'
        });
    }
};

/**
 * Update a folder
 */
const updateFolder = async (req, res) => {
    try {
        const userId = req.user.id;
        const folderId = req.params.id;
        const { name, parent_folder_id } = req.body;

        // Check if user has access and permission to edit
        const [userAccess] = await pool.execute(`
            SELECT 
                f.id,
                f.collection_id,
                uwr.user_id,
                r.name as role
            FROM folders f
            JOIN collections c ON f.collection_id = c.id
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE f.id = ? AND uwr.user_id = ?
        `, [folderId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found or access denied',
                code: 'FOLDER_NOT_FOUND'
            });
        }

        const userRole = userAccess[0].role;
        if (!['owner', 'admin', 'editor'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to update folder',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // If parent_folder_id is provided, verify it belongs to the same collection
        if (parent_folder_id) {
            const [parentFolder] = await pool.execute(
                'SELECT id FROM folders WHERE id = ? AND collection_id = ?',
                [parent_folder_id, userAccess[0].collection_id]
            );
            
            if (parentFolder.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid parent folder ID or folder does not belong to this collection',
                    code: 'INVALID_PARENT_FOLDER_ID'
                });
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (name) updateFields.push('name = ?'), updateValues.push(name);
        if (parent_folder_id !== undefined) updateFields.push('parent_folder_id = ?'), updateValues.push(parent_folder_id);

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(folderId);

        await pool.execute(
            `UPDATE folders SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Get updated folder
        const [updatedFolder] = await pool.execute(
            'SELECT id, name, parent_folder_id, collection_id, created_at, updated_at FROM folders WHERE id = ?',
            [folderId]
        );

        res.json({
            success: true,
            message: 'Folder updated successfully',
            data: {
                folder: updatedFolder[0]
            }
        });

    } catch (error) {
        console.error('Update folder error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'FOLDER_UPDATE_FAILED'
        });
    }
};

/**
 * Delete a folder
 */
const deleteFolder = async (req, res) => {
    try {
        const userId = req.user.id;
        const folderId = req.params.id;

        // Check if user has permission to delete (admin or owner)
        const [userAccess] = await pool.execute(`
            SELECT 
                f.id,
                uwr.user_id,
                r.name as role
            FROM folders f
            JOIN collections c ON f.collection_id = c.id
            JOIN user_workspace_roles uwr ON c.workspace_id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE f.id = ? AND uwr.user_id = ?
        `, [folderId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found or access denied',
                code: 'FOLDER_NOT_FOUND'
            });
        }

        const userRole = userAccess[0].role;
        if (!['owner', 'admin'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to delete folder',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Check if folder has subfolders or requests
        const [subfolders] = await pool.execute(
            'SELECT COUNT(*) as count FROM folders WHERE parent_folder_id = ?',
            [folderId]
        );

        const [requests] = await pool.execute(
            'SELECT COUNT(*) as count FROM requests WHERE folder_id = ?',
            [folderId]
        );

        if (subfolders[0].count > 0 || requests[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete folder that contains subfolders or requests',
                code: 'FOLDER_NOT_EMPTY'
            });
        }

        // Delete folder
        await pool.execute('DELETE FROM folders WHERE id = ?', [folderId]);

        res.json({
            success: true,
            message: 'Folder deleted successfully'
        });

    } catch (error) {
        console.error('Delete folder error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'FOLDER_DELETE_FAILED'
        });
    }
};

module.exports = {
    getFolders,
    getFolder,
    createFolder,
    updateFolder,
    deleteFolder
};
