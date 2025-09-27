const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for a user
 * @param {Object} payload - User data to include in token
 * @param {string} expiresIn - Token expiration time (default: 7d)
 * @returns {string} - JWT token
 */
const generateToken = (payload, expiresIn = '7d') => {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        
        const token = jwt.sign(payload, secret, { 
            expiresIn,
            issuer: 'postman-clone-api',
            audience: 'postman-clone-client'
        });
        
        return token;
    } catch (error) {
        throw new Error(`Token generation failed: ${error.message}`);
    }
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        
        const decoded = jwt.verify(token, secret, {
            issuer: 'postman-clone-api',
            audience: 'postman-clone-client'
        });
        
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        } else {
            throw new Error(`Token verification failed: ${error.message}`);
        }
    }
};

/**
 * Generate a refresh token
 * @param {Object} payload - User data to include in token
 * @returns {string} - Refresh token
 */
const generateRefreshToken = (payload) => {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        
        const refreshToken = jwt.sign(payload, secret, { 
            expiresIn: '30d',
            issuer: 'postman-clone-api',
            audience: 'postman-clone-client'
        });
        
        return refreshToken;
    } catch (error) {
        throw new Error(`Refresh token generation failed: ${error.message}`);
    }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader) {
        return null;
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    
    return parts[1];
};

/**
 * Generate token payload for a user
 * @param {Object} user - User object from database
 * @returns {Object} - Token payload
 */
const generateTokenPayload = (user) => {
    return {
        userId: user.id,
        username: user.username,
        email: user.email,
        isVerified: user.is_verified || false
    };
};

module.exports = {
    generateToken,
    verifyToken,
    generateRefreshToken,
    extractTokenFromHeader,
    generateTokenPayload
};
