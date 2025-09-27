const { verifyToken, extractTokenFromHeader } = require('../../utils/tokenUtils');
const { pool } = require('../../db');

/**
 * Authentication middleware to verify JWT tokens
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required',
                code: 'MISSING_TOKEN'
            });
        }

        // Verify the token
        const decoded = verifyToken(token);

        // Get user from database to ensure they still exist
        const [users] = await pool.execute(
            'SELECT id, username, email, is_verified, created_at FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Add user info to request object
        req.user = {
            id: users[0].id,
            username: users[0].username,
            email: users[0].email,
            isVerified: users[0].is_verified,
            createdAt: users[0].created_at
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message,
            code: 'INVALID_TOKEN'
        });
    }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (token) {
            const decoded = verifyToken(token);
            const [users] = await pool.execute(
                'SELECT id, username, email, is_verified, created_at FROM users WHERE id = ?',
                [decoded.userId]
            );

            if (users.length > 0) {
                req.user = {
                    id: users[0].id,
                    username: users[0].username,
                    email: users[0].email,
                    isVerified: users[0].is_verified,
                    createdAt: users[0].created_at
                };
            }
        }

        next();
    } catch (error) {
        // Continue without authentication if token is invalid
        next();
    }
};

/**
 * Middleware to check if user is verified
 */
const requireVerifiedUser = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED'
        });
    }

    if (!req.user.isVerified) {
        return res.status(403).json({
            success: false,
            message: 'Email verification required',
            code: 'EMAIL_NOT_VERIFIED'
        });
    }

    next();
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireVerifiedUser
};
