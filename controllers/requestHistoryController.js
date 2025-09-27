const { pool } = require('../db');
const axios = require('axios');

/**
 * Execute a request and save the history
 */
const executeRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = req.params.id;
        const { environment_id } = req.body;

        // Get request details with access check
        const [requests] = await pool.execute(`
            SELECT 
                r.id,
                r.name,
                r.method,
                r.url,
                r.headers,
                r.body,
                r.query_params,
                r.path_params,
                r.workspace_id,
                uwr.user_id
            FROM requests r
            JOIN user_workspace_roles uwr ON r.workspace_id = uwr.workspace_id
            WHERE r.id = ? AND uwr.user_id = ?
        `, [requestId, userId]);

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Request not found or access denied',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        const request = requests[0];
        let environmentVariables = {};

        // Get environment variables if environment_id is provided
        if (environment_id) {
            const [environments] = await pool.execute(`
                SELECT variables
                FROM environments e
                JOIN user_workspace_roles uwr ON e.workspace_id = uwr.workspace_id
                WHERE e.id = ? AND uwr.user_id = ?
            `, [environment_id, userId]);

            if (environments.length > 0) {
                environmentVariables = JSON.parse(environments[0].variables);
            }
        }

        // Prepare request data
        let url = request.url;
        let headers = request.headers ? JSON.parse(request.headers) : {};
        let body = request.body;
        let queryParams = request.query_params ? JSON.parse(request.query_params) : {};

        // Substitute environment variables
        url = substituteVariables(url, environmentVariables);
        body = substituteVariables(body, environmentVariables);
        
        // Substitute variables in headers
        const processedHeaders = {};
        for (const [key, value] of Object.entries(headers)) {
            processedHeaders[key] = substituteVariables(value, environmentVariables);
        }

        // Build query string
        const queryString = new URLSearchParams(queryParams).toString();
        if (queryString) {
            url += (url.includes('?') ? '&' : '?') + queryString;
        }

        // Execute the HTTP request
        const startTime = Date.now();
        let response;
        let error = null;

        try {
            const axiosConfig = {
                method: request.method.toLowerCase(),
                url: url,
                headers: processedHeaders,
                timeout: 30000, // 30 seconds timeout
                validateStatus: () => true // Accept all status codes
            };

            if (body && ['post', 'put', 'patch'].includes(request.method.toLowerCase())) {
                axiosConfig.data = body;
            }

            response = await axios(axiosConfig);
        } catch (err) {
            error = {
                message: err.message,
                code: err.code,
                type: 'NETWORK_ERROR'
            };
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Save request history
        const [historyResult] = await pool.execute(`
            INSERT INTO request_history (
                request_id, user_id, status_code, response_headers, 
                response_body, duration_ms, error_message, executed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            requestId,
            userId,
            response ? response.status : null,
            response ? JSON.stringify(response.headers) : null,
            response ? JSON.stringify(response.data) : null,
            duration,
            error ? JSON.stringify(error) : null
        ]);

        const historyId = historyResult.insertId;

        // Prepare response
        const executionResult = {
            id: historyId,
            request_id: requestId,
            status_code: response ? response.status : null,
            response_headers: response ? response.headers : null,
            response_body: response ? response.data : null,
            duration_ms: duration,
            error: error,
            executed_at: new Date().toISOString()
        };

        res.json({
            success: true,
            message: 'Request executed successfully',
            data: {
                execution: executionResult
            }
        });

    } catch (error) {
        console.error('Execute request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'REQUEST_EXECUTION_FAILED'
        });
    }
};

/**
 * Get request execution history
 */
const getRequestHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = req.params.id;
        const { limit = 50, offset = 0 } = req.query;

        // Check if user has access to the request
        const [userAccess] = await pool.execute(`
            SELECT 1 
            FROM requests r
            JOIN user_workspace_roles uwr ON r.workspace_id = uwr.workspace_id
            WHERE r.id = ? AND uwr.user_id = ?
        `, [requestId, userId]);

        if (userAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Request not found or access denied',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        // Get execution history
        const [history] = await pool.execute(`
            SELECT 
                id,
                request_id,
                user_id,
                status_code,
                response_headers,
                response_body,
                duration_ms,
                error_message,
                executed_at
            FROM request_history
            WHERE request_id = ?
            ORDER BY executed_at DESC
            LIMIT ? OFFSET ?
        `, [requestId, parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            data: {
                history: history.map(entry => ({
                    id: entry.id,
                    request_id: entry.request_id,
                    user_id: entry.user_id,
                    status_code: entry.status_code,
                    response_headers: entry.response_headers ? JSON.parse(entry.response_headers) : null,
                    response_body: entry.response_body ? JSON.parse(entry.response_body) : null,
                    duration_ms: entry.duration_ms,
                    error_message: entry.error_message ? JSON.parse(entry.error_message) : null,
                    executed_at: entry.executed_at
                }))
            }
        });

    } catch (error) {
        console.error('Get request history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'HISTORY_FETCH_FAILED'
        });
    }
};

/**
 * Get workspace execution history
 */
const getWorkspaceHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.params.id;
        const { limit = 50, offset = 0 } = req.query;

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

        // Get workspace execution history
        const [history] = await pool.execute(`
            SELECT 
                rh.id,
                rh.request_id,
                rh.user_id,
                rh.status_code,
                rh.response_headers,
                rh.response_body,
                rh.duration_ms,
                rh.error_message,
                rh.executed_at,
                r.name as request_name,
                u.username as executed_by
            FROM request_history rh
            JOIN requests r ON rh.request_id = r.id
            JOIN users u ON rh.user_id = u.id
            WHERE r.workspace_id = ?
            ORDER BY rh.executed_at DESC
            LIMIT ? OFFSET ?
        `, [workspaceId, parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            data: {
                history: history.map(entry => ({
                    id: entry.id,
                    request_id: entry.request_id,
                    request_name: entry.request_name,
                    user_id: entry.user_id,
                    executed_by: entry.executed_by,
                    status_code: entry.status_code,
                    response_headers: entry.response_headers ? JSON.parse(entry.response_headers) : null,
                    response_body: entry.response_body ? JSON.parse(entry.response_body) : null,
                    duration_ms: entry.duration_ms,
                    error_message: entry.error_message ? JSON.parse(entry.error_message) : null,
                    executed_at: entry.executed_at
                }))
            }
        });

    } catch (error) {
        console.error('Get workspace history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'WORKSPACE_HISTORY_FETCH_FAILED'
        });
    }
};

/**
 * Delete specific history entry
 */
const deleteHistoryEntry = async (req, res) => {
    try {
        const userId = req.user.id;
        const historyId = req.params.id;

        // Check if user has permission to delete (must be the executor or admin/owner)
        const [historyAccess] = await pool.execute(`
            SELECT 
                rh.id,
                rh.user_id,
                uwr.user_id as workspace_user,
                r.name as role
            FROM request_history rh
            JOIN requests r ON rh.request_id = r.id
            JOIN user_workspace_roles uwr ON r.workspace_id = uwr.workspace_id
            JOIN roles r ON uwr.role_id = r.id
            WHERE rh.id = ? AND uwr.user_id = ?
        `, [historyId, userId]);

        if (historyAccess.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'History entry not found or access denied',
                code: 'HISTORY_NOT_FOUND'
            });
        }

        const entry = historyAccess[0];
        const userRole = entry.role;
        
        // Allow deletion if user is the executor or has admin/owner role
        if (entry.user_id !== userId && !['owner', 'admin'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to delete history entry',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Delete history entry
        await pool.execute('DELETE FROM request_history WHERE id = ?', [historyId]);

        res.json({
            success: true,
            message: 'History entry deleted successfully'
        });

    } catch (error) {
        console.error('Delete history entry error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'HISTORY_DELETE_FAILED'
        });
    }
};

/**
 * Helper function to substitute environment variables
 */
const substituteVariables = (text, variables) => {
    if (!text || typeof text !== 'string') return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
        return variables[variableName] || match;
    });
};

module.exports = {
    executeRequest,
    getRequestHistory,
    getWorkspaceHistory,
    deleteHistoryEntry
};
