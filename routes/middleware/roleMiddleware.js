const { pool } = require('../../db');

/**
 * Middleware to check if user has required role in a workspace
 * @param {string} requiredRole - The role name required (owner, admin, editor, viewer)
 */
const requireRole = (requiredRole) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const workspaceId = req.params.workspaceId || req.body.workspace_id;

            if (!workspaceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Workspace ID is required',
                    code: 'MISSING_WORKSPACE_ID'
                });
            }

            // Get user's role in the workspace
            const [userRoles] = await pool.execute(`
                SELECT r.name, r.permissions 
                FROM user_workspace_roles uwr
                JOIN roles r ON uwr.role_id = r.id
                WHERE uwr.user_id = ? AND uwr.workspace_id = ?
            `, [userId, workspaceId]);

            if (userRoles.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this workspace',
                    code: 'NO_WORKSPACE_ACCESS'
                });
            }

            const userRole = userRoles[0];
            const permissions = JSON.parse(userRole.permissions);

            // Check if user has the required role or higher
            const roleHierarchy = {
                'owner': 4,
                'admin': 3,
                'editor': 2,
                'viewer': 1
            };

            const requiredRoleLevel = roleHierarchy[requiredRole];
            const userRoleLevel = roleHierarchy[userRole.name];

            if (userRoleLevel < requiredRoleLevel) {
                return res.status(403).json({
                    success: false,
                    message: `Insufficient permissions. Required: ${requiredRole}, Current: ${userRole.name}`,
                    code: 'INSUFFICIENT_PERMISSIONS'
                });
            }

            // Add role info to request object
            req.userRole = {
                name: userRole.name,
                permissions: permissions
            };

            next();
        } catch (error) {
            console.error('Role middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                code: 'ROLE_CHECK_FAILED'
            });
        }
    };
};

/**
 * Middleware to check if user has specific permission
 * @param {string} permission - The permission to check (read, write, delete, admin)
 */
const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.userRole) {
                return res.status(500).json({
                    success: false,
                    message: 'Role middleware must be used before permission middleware',
                    code: 'MISSING_ROLE_INFO'
                });
            }

            const userPermissions = req.userRole.permissions;

            if (!userPermissions[permission]) {
                return res.status(403).json({
                    success: false,
                    message: `Permission denied. Required permission: ${permission}`,
                    code: 'PERMISSION_DENIED'
                });
            }

            next();
        } catch (error) {
            console.error('Permission middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                code: 'PERMISSION_CHECK_FAILED'
            });
        }
    };
};

/**
 * Middleware to check if user is workspace owner
 */
const requireWorkspaceOwner = requireRole('owner');

/**
 * Middleware to check if user is workspace admin or owner
 */
const requireWorkspaceAdmin = requireRole('admin');

/**
 * Middleware to check if user can edit (editor, admin, or owner)
 */
const requireEditPermission = requireRole('editor');

/**
 * Middleware to check if user can read (any role)
 */
const requireReadPermission = requireRole('viewer');

module.exports = {
    requireRole,
    requirePermission,
    requireWorkspaceOwner,
    requireWorkspaceAdmin,
    requireEditPermission,
    requireReadPermission
};
