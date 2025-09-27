const { pool } = require('../db');

/**
 * Get workspace roles and members
 */
const getWorkspaceRoles = async (req, res) => {
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

        // Get all roles and members in the workspace
        const [members] = await pool.execute(`
            SELECT 
                uwr.id as user_workspace_role_id,
                u.id as user_id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.avatar_url,
                r.id as role_id,
                r.name as role_name,
                r.permissions,
                uwr.created_at as joined_at
            FROM user_workspace_roles uwr
            JOIN users u ON uwr.user_id = u.id
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.workspace_id = ?
            ORDER BY uwr.created_at ASC
        `, [workspaceId]);

        // Get available roles
        const [availableRoles] = await pool.execute(`
            SELECT id, name, permissions, description
            FROM roles
            ORDER BY id ASC
        `);

        res.json({
            success: true,
            data: {
                members: members.map(member => ({
                    user_workspace_role_id: member.user_workspace_role_id,
                    user_id: member.user_id,
                    username: member.username,
                    email: member.email,
                    first_name: member.first_name,
                    last_name: member.last_name,
                    avatar_url: member.avatar_url,
                    role_id: member.role_id,
                    role_name: member.role_name,
                    permissions: JSON.parse(member.permissions),
                    joined_at: member.joined_at
                })),
                available_roles: availableRoles.map(role => ({
                    id: role.id,
                    name: role.name,
                    permissions: JSON.parse(role.permissions),
                    description: role.description
                }))
            }
        });

    } catch (error) {
        console.error('Get workspace roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'ROLES_FETCH_FAILED'
        });
    }
};

/**
 * Assign role to user in workspace
 */
const assignRole = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;
        const { user_id, role_id } = req.body;

        // Validate required fields
        if (!user_id || !role_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Role ID are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Check if current user has permission to assign roles (admin or owner)
        const [currentUserRole] = await pool.execute(`
            SELECT r.name as role
            FROM user_workspace_roles uwr
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND uwr.workspace_id = ?
        `, [userId, workspaceId]);

        if (currentUserRole.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Workspace not found or access denied',
                code: 'WORKSPACE_NOT_FOUND'
            });
        }

        const currentRole = currentUserRole[0].role;
        if (!['owner', 'admin'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to assign roles',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Check if target user exists
        const [targetUser] = await pool.execute(
            'SELECT id, username, email FROM users WHERE id = ?',
            [user_id]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Check if role exists
        const [role] = await pool.execute(
            'SELECT id, name FROM roles WHERE id = ?',
            [role_id]
        );

        if (role.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found',
                code: 'ROLE_NOT_FOUND'
            });
        }

        // Check if user is already in the workspace
        const [existingRole] = await pool.execute(
            'SELECT id FROM user_workspace_roles WHERE user_id = ? AND workspace_id = ?',
            [user_id, workspaceId]
        );

        if (existingRole.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'User is already a member of this workspace',
                code: 'USER_ALREADY_MEMBER'
            });
        }

        // Assign role to user
        const [result] = await pool.execute(
            'INSERT INTO user_workspace_roles (user_id, workspace_id, role_id) VALUES (?, ?, ?)',
            [user_id, workspaceId, role_id]
        );

        res.status(201).json({
            success: true,
            message: 'Role assigned successfully',
            data: {
                user_workspace_role_id: result.insertId,
                user: targetUser[0],
                role: role[0]
            }
        });

    } catch (error) {
        console.error('Assign role error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'ROLE_ASSIGN_FAILED'
        });
    }
};

/**
 * Update user role in workspace
 */
const updateUserRole = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;
        const targetUserId = req.params.userId;
        const { role_id } = req.body;

        // Validate required fields
        if (!role_id) {
            return res.status(400).json({
                success: false,
                message: 'Role ID is required',
                code: 'MISSING_ROLE_ID'
            });
        }

        // Check if current user has permission to update roles (admin or owner)
        const [currentUserRole] = await pool.execute(`
            SELECT r.name as role
            FROM user_workspace_roles uwr
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND uwr.workspace_id = ?
        `, [userId, workspaceId]);

        if (currentUserRole.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Workspace not found or access denied',
                code: 'WORKSPACE_NOT_FOUND'
            });
        }

        const currentRole = currentUserRole[0].role;
        if (!['owner', 'admin'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to update roles',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Check if target user is in the workspace
        const [targetUserRole] = await pool.execute(`
            SELECT uwr.id, r.name as current_role
            FROM user_workspace_roles uwr
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND uwr.workspace_id = ?
        `, [targetUserId, workspaceId]);

        if (targetUserRole.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User is not a member of this workspace',
                code: 'USER_NOT_MEMBER'
            });
        }

        // Check if role exists
        const [role] = await pool.execute(
            'SELECT id, name FROM roles WHERE id = ?',
            [role_id]
        );

        if (role.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found',
                code: 'ROLE_NOT_FOUND'
            });
        }

        // Prevent owner from changing their own role
        if (targetUserId == userId && currentRole === 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Workspace owner cannot change their own role',
                code: 'CANNOT_CHANGE_OWNER_ROLE'
            });
        }

        // Update user role
        await pool.execute(
            'UPDATE user_workspace_roles SET role_id = ? WHERE user_id = ? AND workspace_id = ?',
            [role_id, targetUserId, workspaceId]
        );

        res.json({
            success: true,
            message: 'User role updated successfully',
            data: {
                user_id: targetUserId,
                new_role: role[0]
            }
        });

    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'ROLE_UPDATE_FAILED'
        });
    }
};

/**
 * Remove user from workspace
 */
const removeUserFromWorkspace = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;
        const targetUserId = req.params.userId;

        // Check if current user has permission to remove users (admin or owner)
        const [currentUserRole] = await pool.execute(`
            SELECT r.name as role
            FROM user_workspace_roles uwr
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND uwr.workspace_id = ?
        `, [userId, workspaceId]);

        if (currentUserRole.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Workspace not found or access denied',
                code: 'WORKSPACE_NOT_FOUND'
            });
        }

        const currentRole = currentUserRole[0].role;
        if (!['owner', 'admin'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to remove users',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Check if target user is in the workspace
        const [targetUserRole] = await pool.execute(`
            SELECT uwr.id, r.name as role
            FROM user_workspace_roles uwr
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND uwr.workspace_id = ?
        `, [targetUserId, workspaceId]);

        if (targetUserRole.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User is not a member of this workspace',
                code: 'USER_NOT_MEMBER'
            });
        }

        // Prevent owner from removing themselves
        if (targetUserId == userId && currentRole === 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Workspace owner cannot remove themselves',
                code: 'CANNOT_REMOVE_OWNER'
            });
        }

        // Remove user from workspace
        await pool.execute(
            'DELETE FROM user_workspace_roles WHERE user_id = ? AND workspace_id = ?',
            [targetUserId, workspaceId]
        );

        res.json({
            success: true,
            message: 'User removed from workspace successfully'
        });

    } catch (error) {
        console.error('Remove user from workspace error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'USER_REMOVE_FAILED'
        });
    }
};

module.exports = {
    getWorkspaceRoles,
    assignRole,
    updateUserRole,
    removeUserFromWorkspace
};
