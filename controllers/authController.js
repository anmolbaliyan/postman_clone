const { pool } = require('../db');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/passwordUtils');
const { generateToken, generateRefreshToken, generateTokenPayload } = require('../utils/tokenUtils');

/**
 * Register a new user
 */
const register = async (req, res) => {
    try {
        const { username, email, password, first_name, last_name } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Password does not meet requirements',
                errors: passwordValidation.errors,
                code: 'WEAK_PASSWORD'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
                code: 'INVALID_EMAIL'
            });
        }

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'User with this email or username already exists',
                code: 'USER_EXISTS'
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, first_name || null, last_name || null]
        );

        const userId = result.insertId;

        // Get the created user
        const [newUser] = await pool.execute(
            'SELECT id, username, email, first_name, last_name, is_verified, created_at FROM users WHERE id = ?',
            [userId]
        );

        // Generate tokens
        const tokenPayload = generateTokenPayload(newUser[0]);
        const accessToken = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Create default workspace for the user
        const [workspaceResult] = await pool.execute(
            'INSERT INTO workspaces (name, description, type, owner_id) VALUES (?, ?, ?, ?)',
            [`${username}'s Workspace`, 'Default workspace', 'personal', userId]
        );

        // Assign owner role to the user in their workspace
        await pool.execute(
            'INSERT INTO user_workspace_roles (user_id, workspace_id, role_id) VALUES (?, ?, ?)',
            [userId, workspaceResult.insertId, 1] // role_id 1 = owner
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: newUser[0].id,
                    username: newUser[0].username,
                    email: newUser[0].email,
                    first_name: newUser[0].first_name,
                    last_name: newUser[0].last_name,
                    is_verified: newUser[0].is_verified,
                    created_at: newUser[0].created_at
                },
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during registration',
            code: 'REGISTRATION_FAILED'
        });
    }
};

/**
 * Login user
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Find user by email
        const [users] = await pool.execute(
            'SELECT id, username, email, password_hash, first_name, last_name, is_verified, created_at FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const user = users[0];

        // Compare password
        const isPasswordValid = await comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Generate tokens
        const tokenPayload = generateTokenPayload(user);
        const accessToken = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    is_verified: user.is_verified,
                    created_at: user.created_at
                },
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login',
            code: 'LOGIN_FAILED'
        });
    }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await pool.execute(
            'SELECT id, username, email, first_name, last_name, avatar_url, is_verified, created_at, updated_at FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = users[0];

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
                    updated_at: user.updated_at
                }
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'PROFILE_FETCH_FAILED'
        });
    }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, first_name, last_name, avatar_url } = req.body;

        // Check if username is being changed and if it's already taken
        if (username) {
            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [username, userId]
            );

            if (existingUsers.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Username already taken',
                    code: 'USERNAME_TAKEN'
                });
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (username) {
            updateFields.push('username = ?');
            updateValues.push(username);
        }
        if (first_name !== undefined) {
            updateFields.push('first_name = ?');
            updateValues.push(first_name);
        }
        if (last_name !== undefined) {
            updateFields.push('last_name = ?');
            updateValues.push(last_name);
        }
        if (avatar_url !== undefined) {
            updateFields.push('avatar_url = ?');
            updateValues.push(avatar_url);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(userId);

        await pool.execute(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Get updated user
        const [users] = await pool.execute(
            'SELECT id, username, email, first_name, last_name, avatar_url, is_verified, created_at, updated_at FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: users[0]
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'PROFILE_UPDATE_FAILED'
        });
    }
};

/**
 * Logout user (for future implementation with token blacklisting)
 */
const logout = async (req, res) => {
    try {
        // For now, we'll just return success
        // In a production app, you might want to blacklist the token
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'LOGOUT_FAILED'
        });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    logout
};
