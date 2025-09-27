const { pool } = require('../db');

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0, search } = req.query;

        // Check if user is admin in any workspace
        const [adminCheck] = await pool.execute(`
            SELECT 1 
            FROM user_workspace_roles uwr
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ? AND r.name IN ('owner', 'admin')
        `, [userId]);

        if (adminCheck.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to view all users',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Build search query
        let searchCondition = '';
        let queryParams = [parseInt(limit), parseInt(offset)];

        if (search) {
            searchCondition = 'WHERE (u.username LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams = [searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limit), parseInt(offset)];
        }

        // Get users with workspace count
        const [users] = await pool.execute(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.avatar_url,
                u.is_verified,
                u.created_at,
                u.updated_at,
                COUNT(DISTINCT uwr.workspace_id) as workspace_count
            FROM users u
            LEFT JOIN user_workspace_roles uwr ON u.id = uwr.user_id
            ${searchCondition}
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `, queryParams);

        // Get total count for pagination
        const [countResult] = await pool.execute(`
            SELECT COUNT(*) as total
            FROM users u
            ${searchCondition}
        `, search ? [searchTerm, searchTerm, searchTerm, searchTerm] : []);

        res.json({
            success: true,
            data: {
                users: users.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    avatar_url: user.avatar_url,
                    is_verified: user.is_verified,
                    workspace_count: parseInt(user.workspace_count),
                    created_at: user.created_at,
                    updated_at: user.updated_at
                })),
                pagination: {
                    total: countResult[0].total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: (parseInt(offset) + parseInt(limit)) < countResult[0].total
                }
            }
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'USERS_FETCH_FAILED'
        });
    }
};

/**
 * Get specific user profile
 */
const getUserProfile = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;

        // Check if user is viewing their own profile or has admin access
        const [accessCheck] = await pool.execute(`
            SELECT 
                CASE 
                    WHEN ? = ? THEN 'self'
                    WHEN EXISTS (
                        SELECT 1 FROM user_workspace_roles uwr
                        JOIN roles r ON uwr.role_id = r.id
                        WHERE uwr.user_id = ? AND r.name IN ('owner', 'admin')
                    ) THEN 'admin'
                    ELSE 'denied'
                END as access_level
        `, [currentUserId, targetUserId, currentUserId]);

        const accessLevel = accessCheck[0].access_level;

        if (accessLevel === 'denied') {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to view this user profile',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Get user profile
        const [users] = await pool.execute(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.avatar_url,
                u.is_verified,
                u.created_at,
                u.updated_at
            FROM users u
            WHERE u.id = ?
        `, [targetUserId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = users[0];

        // Get user's workspaces
        const [workspaces] = await pool.execute(`
            SELECT 
                w.id,
                w.name,
                w.description,
                w.type,
                r.name as role,
                r.permissions,
                uwr.created_at as joined_at
            FROM user_workspace_roles uwr
            JOIN workspaces w ON uwr.workspace_id = w.id
            JOIN roles r ON uwr.role_id = r.id
            WHERE uwr.user_id = ?
            ORDER BY uwr.created_at DESC
        `, [targetUserId]);

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    avatar_url: user.avatar_url,
                    is_verified: user.is_verified,
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    workspaces: workspaces.map(workspace => ({
                        id: workspace.id,
                        name: workspace.name,
                        description: workspace.description,
                        type: workspace.type,
                        role: workspace.role,
                        permissions: JSON.parse(workspace.permissions),
                        joined_at: workspace.joined_at
                    }))
                }
            }
        });

    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'USER_PROFILE_FETCH_FAILED'
        });
    }
};

/**
 * Update user profile (admin only)
 */
const updateUserProfile = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;
        const { username, email, first_name, last_name, avatar_url, is_verified } = req.body;

        // Check if user has permission to update (admin or owner)
        const [permissionCheck] = await pool.execute(`
            SELECT 
                CASE 
                    WHEN ? = ? THEN 'self'
                    WHEN EXISTS (
                        SELECT 1 FROM user_workspace_roles uwr
                        JOIN roles r ON uwr.role_id = r.id
                        WHERE uwr.user_id = ? AND r.name IN ('owner', 'admin')
                    ) THEN 'admin'
                    ELSE 'denied'
                END as access_level
        `, [currentUserId, targetUserId, currentUserId]);

        const accessLevel = permissionCheck[0].access_level;

        if (accessLevel === 'denied') {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to update this user profile',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Check if target user exists
        const [targetUser] = await pool.execute(
            'SELECT id FROM users WHERE id = ?',
            [targetUserId]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (username) updateFields.push('username = ?'), updateValues.push(username);
        if (email) updateFields.push('email = ?'), updateValues.push(email);
        if (first_name !== undefined) updateFields.push('first_name = ?'), updateValues.push(first_name);
        if (last_name !== undefined) updateFields.push('last_name = ?'), updateValues.push(last_name);
        if (avatar_url !== undefined) updateFields.push('avatar_url = ?'), updateValues.push(avatar_url);
        
        // Only admins can change verification status
        if (is_verified !== undefined && accessLevel === 'admin') {
            updateFields.push('is_verified = ?'), updateValues.push(is_verified);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(targetUserId);

        await pool.execute(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Get updated user
        const [updatedUser] = await pool.execute(`
            SELECT id, username, email, first_name, last_name, avatar_url, is_verified, created_at, updated_at
            FROM users WHERE id = ?
        `, [targetUserId]);

        res.json({
            success: true,
            message: 'User profile updated successfully',
            data: {
                user: updatedUser[0]
            }
        });

    } catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'USER_UPDATE_FAILED'
        });
    }
};

/**
 * Delete user (admin only)
 */
const deleteUser = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;

        // Check if user has permission to delete (admin or owner)
        const [permissionCheck] = await pool.execute(`
            SELECT 
                CASE 
                    WHEN ? = ? THEN 'self'
                    WHEN EXISTS (
                        SELECT 1 FROM user_workspace_roles uwr
                        JOIN roles r ON uwr.role_id = r.id
                        WHERE uwr.user_id = ? AND r.name IN ('owner', 'admin')
                    ) THEN 'admin'
                    ELSE 'denied'
                END as access_level
        `, [currentUserId, targetUserId, currentUserId]);

        const accessLevel = permissionCheck[0].access_level;

        if (accessLevel === 'denied') {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to delete this user',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Prevent self-deletion
        if (accessLevel === 'self') {
            return res.status(403).json({
                success: false,
                message: 'Users cannot delete their own account',
                code: 'CANNOT_DELETE_SELF'
            });
        }

        // Check if target user exists
        const [targetUser] = await pool.execute(
            'SELECT id, username FROM users WHERE id = ?',
            [targetUserId]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Delete user (cascade will handle related records)
        await pool.execute('DELETE FROM users WHERE id = ?', [targetUserId]);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'USER_DELETE_FAILED'
        });
    }
};

/**
 * Search users by email or username
 */
const searchUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        const { query, limit = 10 } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters',
                code: 'INVALID_SEARCH_QUERY'
            });
        }

        // Search users by email or username
        const [users] = await pool.execute(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.avatar_url,
                u.is_verified
            FROM users u
            WHERE (u.email LIKE ? OR u.username LIKE ?)
            AND u.id != ?
            ORDER BY 
                CASE 
                    WHEN u.email = ? THEN 1
                    WHEN u.username = ? THEN 2
                    WHEN u.email LIKE ? THEN 3
                    WHEN u.username LIKE ? THEN 4
                    ELSE 5
                END
            LIMIT ?
        `, [
            `%${query}%`, `%${query}%`, userId,
            query, query, `${query}%`, `${query}%`,
            parseInt(limit)
        ]);

        res.json({
            success: true,
            data: {
                users: users.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    avatar_url: user.avatar_url,
                    is_verified: user.is_verified
                }))
            }
        });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'USER_SEARCH_FAILED'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserProfile,
    updateUserProfile,
    deleteUser,
    searchUsers
};
