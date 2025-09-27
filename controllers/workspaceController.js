const { pool } = require('../db');

/**
 * Get all workspaces for the authenticated user
 */
const getWorkspaces = async (req, res) => {
    try {
        const userId = req.user.id;

        const [workspaces] = await pool.execute(`
            SELECT 
                w.id,
                w.name,
                w.description,
                w.type,
                w.owner_id,
                w.created_at,
                w.updated_at,
                r.name as user_role,
                r.permissions
            FROM workspaces w
            JOIN user_workspace_roles uwr ON w.id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ?
            ORDER BY w.created_at DESC
        `, [userId]);

        res.json({
            success: true,
            data: {
                workspaces: workspaces.map(workspace => ({
                    id: workspace.id,
                    name: workspace.name,
                    description: workspace.description,
                    type: workspace.type,
                    owner_id: workspace.owner_id,
                    user_role: workspace.user_role,
                    permissions: JSON.parse(workspace.permissions),
                    created_at: workspace.created_at,
                    updated_at: workspace.updated_at
                }))
            }
        });

    } catch (error) {
        console.error('Get workspaces error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'WORKSPACES_FETCH_FAILED'
        });
    }
};

/**
 * Get a specific workspace by ID
 */
const getWorkspace = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;

        const [workspaces] = await pool.execute(`
            SELECT 
                w.id,
                w.name,
                w.description,
                w.type,
                w.owner_id,
                w.created_at,
                w.updated_at,
                r.name as user_role,
                r.permissions
            FROM workspaces w
            JOIN user_workspace_roles uwr ON w.id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND w.id = ?
        `, [userId, workspaceId]);

        if (workspaces.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Workspace not found or access denied',
                code: 'WORKSPACE_NOT_FOUND'
            });
        }

        const workspace = workspaces[0];

        res.json({
            success: true,
            data: {
                workspace: {
                    id: workspace.id,
                    name: workspace.name,
                    description: workspace.description,
                    type: workspace.type,
                    owner_id: workspace.owner_id,
                    user_role: workspace.user_role,
                    permissions: JSON.parse(workspace.permissions),
                    created_at: workspace.created_at,
                    updated_at: workspace.updated_at
                }
            }
        });

    } catch (error) {
        console.error('Get workspace error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'WORKSPACE_FETCH_FAILED'
        });
    }
};

/**
 * Create a new workspace
 */
const createWorkspace = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description, type = 'personal' } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Workspace name is required',
                code: 'MISSING_WORKSPACE_NAME'
            });
        }

        // Validate workspace type
        const validTypes = ['personal', 'team', 'private'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid workspace type',
                code: 'INVALID_WORKSPACE_TYPE'
            });
        }

        // Create workspace
        const [result] = await pool.execute(
            'INSERT INTO workspaces (name, description, type, owner_id) VALUES (?, ?, ?, ?)',
            [name, description || null, type, userId]
        );

        const workspaceId = result.insertId;

        // Assign owner role to the creator
        await pool.execute(
            'INSERT INTO user_workspace_roles (user_id, workspace_id, role_id) VALUES (?, ?, ?)',
            [userId, workspaceId, 1] // role_id 1 = owner
        );

        // Get the created workspace
        const [newWorkspace] = await pool.execute(
            'SELECT id, name, description, type, owner_id, created_at, updated_at FROM workspaces WHERE id = ?',
            [workspaceId]
        );

        res.status(201).json({
            success: true,
            message: 'Workspace created successfully',
            data: {
                workspace: newWorkspace[0]
            }
        });

    } catch (error) {
        console.error('Create workspace error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'WORKSPACE_CREATE_FAILED'
        });
    }
};

/**
 * Update a workspace
 */
const updateWorkspace = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;
        const { name, description, type } = req.body;

        // Check if user has permission to update (must be owner or admin)
        const [userRoles] = await pool.execute(`
            SELECT r.name 
            FROM user_workspace_roles uwr
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND uwr.workspace_id = ?
        `, [userId, workspaceId]);

        if (userRoles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Workspace not found or access denied',
                code: 'WORKSPACE_NOT_FOUND'
            });
        }

        const userRole = userRoles[0].name;
        if (!['owner', 'admin'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to update workspace',
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
        if (type) {
            // Validate workspace type
            const validTypes = ['personal', 'team', 'private'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid workspace type',
                    code: 'INVALID_WORKSPACE_TYPE'
                });
            }
            updateFields.push('type = ?');
            updateValues.push(type);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(workspaceId);

        await pool.execute(
            `UPDATE workspaces SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Get updated workspace
        const [updatedWorkspace] = await pool.execute(
            'SELECT id, name, description, type, owner_id, created_at, updated_at FROM workspaces WHERE id = ?',
            [workspaceId]
        );

        res.json({
            success: true,
            message: 'Workspace updated successfully',
            data: {
                workspace: updatedWorkspace[0]
            }
        });

    } catch (error) {
        console.error('Update workspace error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'WORKSPACE_UPDATE_FAILED'
        });
    }
};

/**
 * Delete a workspace
 */
const deleteWorkspace = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;

        // Check if user is the owner
        const [workspaces] = await pool.execute(
            'SELECT owner_id FROM workspaces WHERE id = ?',
            [workspaceId]
        );

        if (workspaces.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Workspace not found',
                code: 'WORKSPACE_NOT_FOUND'
            });
        }

        if (workspaces[0].owner_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only workspace owner can delete the workspace',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Delete workspace (cascade will handle related records)
        await pool.execute('DELETE FROM workspaces WHERE id = ?', [workspaceId]);

        res.json({
            success: true,
            message: 'Workspace deleted successfully'
        });

    } catch (error) {
        console.error('Delete workspace error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'WORKSPACE_DELETE_FAILED'
        });
    }
};

/**
 * Get workspace members
 */
const getWorkspaceMembers = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;

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

        // Get all members of the workspace
        const [members] = await pool.execute(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.avatar_url,
                r.name as role,
                r.permissions,
                uwr.created_at as joined_at
            FROM user_workspace_roles uwr
            JOIN users u ON uwr.user_id = u.id
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.workspace_id = ?
            ORDER BY uwr.created_at ASC
        `, [workspaceId]);

        res.json({
            success: true,
            data: {
                members: members.map(member => ({
                    id: member.id,
                    username: member.username,
                    email: member.email,
                    first_name: member.first_name,
                    last_name: member.last_name,
                    avatar_url: member.avatar_url,
                    role: member.role,
                    permissions: JSON.parse(member.permissions),
                    joined_at: member.joined_at
                }))
            }
        });

    } catch (error) {
        console.error('Get workspace members error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'MEMBERS_FETCH_FAILED'
        });
    }
};

module.exports = {
    getWorkspaces,
    getWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceMembers
};
