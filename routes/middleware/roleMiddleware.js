const { pool } = require('../../db');

const requireRole = (requiredRole) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const workspaceId = req.params.id || req.params.workspaceId || req.body.workspace_id;

            if (!workspaceId) {
                return res.status(400).json({ success: false, message: 'Workspace ID required' });
            }

            const [userRoles] = await pool.execute(`
                SELECT r.name FROM user_workspace_roles uwr
                JOIN roles r ON uwr.role_id = r.id
                WHERE uwr.user_id = ? AND uwr.workspace_id = ?
            `, [userId, workspaceId]);

            if (userRoles.length === 0) {
                return res.status(403).json({ success: false, message: 'No access' });
            }

            const userRole = userRoles[0].name;
            const roleLevels = { owner: 4, admin: 3, editor: 2, viewer: 1 };

            if (roleLevels[userRole] < roleLevels[requiredRole]) {
                return res.status(403).json({ success: false, message: 'No permission' });
            }

            next();
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error' });
        }
    };
};

const requireReadPermission = requireRole('viewer');
const requireEditPermission = requireRole('editor');
const requireWorkspaceOwner = requireRole('owner');

module.exports = { requireRole, requireReadPermission, requireEditPermission, requireWorkspaceOwner };