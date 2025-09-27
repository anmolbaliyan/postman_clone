const { pool } = require('../db');

/**
 * Get all environments in a workspace
 */
const getEnvironments = async (req, res) => {
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

        // Get environments
        const [environments] = await pool.execute(`
            SELECT 
                e.id,
                e.name,
                e.description,
                e.variables,
                e.workspace_id,
                e.created_by,
                e.created_at,
                e.updated_at,
                u.username as created_by_username
            FROM environments e
            JOIN users u ON e.created_by = u.id
            WHERE e.workspace_id = ?
            ORDER BY e.created_at DESC
        `, [workspaceId]);

        res.json({
            success: true,
            data: {
                environments: environments.map(environment => ({
                    id: environment.id,
                    name: environment.name,
                    description: environment.description,
                    variables: environment.variables ? JSON.parse(environment.variables) : {},
                    workspace_id: environment.workspace_id,
                    created_by: environment.created_by,
                    created_by_username: environment.created_by_username,
                    created_at: environment.created_at,
                    updated_at: environment.updated_at
                }))
            }
        });

    } catch (error) {
        console.error('Get environments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'ENVIRONMENTS_FETCH_FAILED'
        });
    }
};

/**
 * Get a specific environment by ID
 */
const getEnvironment = async (req, res) => {
    try {
        const userId = req.user.id;
        const environmentId = req.params.id;

        // Get environment with access check
        const [environments] = await pool.execute(`
            SELECT 
                e.id,
                e.name,
                e.description,
                e.variables,
                e.workspace_id,
                e.created_by,
                e.created_at,
                e.updated_at,
                u.username as created_by_username
            FROM environments e
            JOIN users u ON e.created_by = u.id
            JOIN user_workspace_roles uwr ON e.workspace_id = uwr.workspace_id
            WHERE e.id = ? AND uwr.user_id = ?
        `, [environmentId, userId]);

        if (environments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Environment not found or access denied',
                code: 'ENVIRONMENT_NOT_FOUND'
            });
        }

        const environment = environments[0];

        res.json({
            success: true,
            data: {
                environment: {
                    id: environment.id,
                    name: environment.name,
                    description: environment.description,
                    variables: environment.variables ? JSON.parse(environment.variables) : {},
                    workspace_id: environment.workspace_id,
                    created_by: environment.created_by,
                    created_by_username: environment.created_by_username,
                    created_at: environment.created_at,
                    updated_at: environment.updated_at
                }
            }
        });

    } catch (error) {
        console.error('Get environment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'ENVIRONMENT_FETCH_FAILED'
        });
    }
};

/**
 * Create a new environment
 */
const createEnvironment = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.workspaceId;
        const { name, description, variables = {} } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Environment name is required',
                code: 'MISSING_ENVIRONMENT_NAME'
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

        // Validate variables format
        if (typeof variables !== 'object' || Array.isArray(variables)) {
            return res.status(400).json({
                success: false,
                message: 'Variables must be a valid JSON object',
                code: 'INVALID_VARIABLES_FORMAT'
            });
        }

        // Create environment
        const [result] = await pool.execute(
            'INSERT INTO environments (name, description, variables, workspace_id, created_by) VALUES (?, ?, ?, ?, ?)',
            [name, description || null, JSON.stringify(variables), workspaceId, userId]
        );

        const environmentId = result.insertId;

        // Get the created environment
        const [newEnvironment] = await pool.execute(`
            SELECT 
                e.id,
                e.name,
                e.description,
                e.variables,
                e.workspace_id,
                e.created_by,
                e.created_at,
                e.updated_at,
                u.username as created_by_username
            FROM environments e
            JOIN users u ON e.created_by = u.id
            WHERE e.id = ?
        `, [environmentId]);

        res.status(201).json({
            success: true,
            message: 'Environment created successfully',
            data: {
                environment: {
                    id: newEnvironment[0].id,
                    name: newEnvironment[0].name,
                    description: newEnvironment[0].description,
                    variables: JSON.parse(newEnvironment[0].variables),
                    workspace_id: newEnvironment[0].workspace_id,
                    created_by: newEnvironment[0].created_by,
                    created_by_username: newEnvironment[0].created_by_username,
                    created_at: newEnvironment[0].created_at,
                    updated_at: newEnvironment[0].updated_at
                }
            }
        });

    } catch (error) {
        console.error('Create environment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'ENVIRONMENT_CREATE_FAILED'
        });
    }
};

/**
 * Update an environment
 */
const updateEnvironment = async (req, res) => {
    try {
        const userId = req.user.id;
        const environmentId = req.params.id;
        const { name, description, variables } = req.body;

        // Check if user has access and permission to edit
        const [userAccess] = await pool.execute(`
            SELECT 
                e.id,
                uwr.user_id,
                r.name as role
            FROM environments e
            JOIN user_workspace_roles uwr ON e.workspace_id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE e.id = ? AND uwr.user_id = ?
        `, [environmentId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Environment not found or access denied',
                code: 'ENVIRONMENT_NOT_FOUND'
            });
        }

        const userRole = userAccess[0].role;
        if (!['owner', 'admin', 'editor'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to update environment',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Validate variables format if provided
        if (variables !== undefined) {
            if (typeof variables !== 'object' || Array.isArray(variables)) {
                return res.status(400).json({
                    success: false,
                    message: 'Variables must be a valid JSON object',
                    code: 'INVALID_VARIABLES_FORMAT'
                });
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (name) updateFields.push('name = ?'), updateValues.push(name);
        if (description !== undefined) updateFields.push('description = ?'), updateValues.push(description);
        if (variables !== undefined) updateFields.push('variables = ?'), updateValues.push(JSON.stringify(variables));

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(environmentId);

        await pool.execute(
            `UPDATE environments SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Get updated environment
        const [updatedEnvironment] = await pool.execute(`
            SELECT 
                e.id,
                e.name,
                e.description,
                e.variables,
                e.workspace_id,
                e.created_by,
                e.created_at,
                e.updated_at,
                u.username as created_by_username
            FROM environments e
            JOIN users u ON e.created_by = u.id
            WHERE e.id = ?
        `, [environmentId]);

        res.json({
            success: true,
            message: 'Environment updated successfully',
            data: {
                environment: {
                    id: updatedEnvironment[0].id,
                    name: updatedEnvironment[0].name,
                    description: updatedEnvironment[0].description,
                    variables: JSON.parse(updatedEnvironment[0].variables),
                    workspace_id: updatedEnvironment[0].workspace_id,
                    created_by: updatedEnvironment[0].created_by,
                    created_by_username: updatedEnvironment[0].created_by_username,
                    created_at: updatedEnvironment[0].created_at,
                    updated_at: updatedEnvironment[0].updated_at
                }
            }
        });

    } catch (error) {
        console.error('Update environment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'ENVIRONMENT_UPDATE_FAILED'
        });
    }
};

/**
 * Delete an environment
 */
const deleteEnvironment = async (req, res) => {
    try {
        const userId = req.user.id;
        const environmentId = req.params.id;

        // Check if user has permission to delete (admin or owner)
        const [userAccess] = await pool.execute(`
            SELECT 
                e.id,
                uwr.user_id,
                r.name as role
            FROM environments e
            JOIN user_workspace_roles uwr ON e.workspace_id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE e.id = ? AND uwr.user_id = ?
        `, [environmentId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Environment not found or access denied',
                code: 'ENVIRONMENT_NOT_FOUND'
            });
        }

        const userRole = userAccess[0].role;
        if (!['owner', 'admin'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to delete environment',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Delete environment
        await pool.execute('DELETE FROM environments WHERE id = ?', [environmentId]);

        res.json({
            success: true,
            message: 'Environment deleted successfully'
        });

    } catch (error) {
        console.error('Delete environment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'ENVIRONMENT_DELETE_FAILED'
        });
    }
};

module.exports = {
    getEnvironments,
    getEnvironment,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment
};
