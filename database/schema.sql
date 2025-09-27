-- Postman Clone Database Schema
-- Created for Phase 1: Database Schema Design & Setup

-- Create database (uncomment if you need to create the database)
-- CREATE DATABASE IF NOT EXISTS postman_clone_db;
-- USE postman_clone_db;

-- Drop tables if they exist (for clean setup)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS request_history;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS folders;
-- DROP TABLE IF EXISTS tests;
-- DROP TABLE IF EXISTS pre_request_scripts;
DROP TABLE IF EXISTS environments;
DROP TABLE IF EXISTS collections;
DROP TABLE IF EXISTS user_workspace_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS workspaces;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    avatar_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Roles table
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Workspaces table
CREATE TABLE workspaces (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type ENUM('personal', 'team', 'private') DEFAULT 'personal',
    owner_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. User Workspace Roles (Many-to-Many relationship)
CREATE TABLE user_workspace_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    workspace_id INT NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_workspace_role (user_id, workspace_id, role_id)
);

-- 5. Collections table
CREATE TABLE collections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    workspace_id INT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Folders table (for organizing requests in collections)
CREATE TABLE folders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    collection_id INT NOT NULL,
    parent_folder_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- 7. Environments table
CREATE TABLE environments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    variables JSON,
    workspace_id INT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Requests table
CREATE TABLE requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    method ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS') NOT NULL,
    url TEXT NOT NULL,
    headers JSON,
    body TEXT,
    query_params JSON,
    path_params JSON,
    collection_id INT,
    folder_id INT NULL,
    workspace_id INT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Request History table
CREATE TABLE request_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    executed_by INT NOT NULL,
    status_code INT,
    response_headers JSON,
    response_body TEXT,
    response_time_ms INT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    FOREIGN KEY (executed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Tests table (for automated testing) - COMMENTED OUT FOR NOW
-- CREATE TABLE tests (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     request_id INT NOT NULL,
--     name VARCHAR(100) NOT NULL,
--     test_script TEXT,
--     created_by INT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
--     FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
-- );

-- 11. Pre-request Scripts table - COMMENTED OUT FOR NOW
-- CREATE TABLE pre_request_scripts (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     request_id INT NOT NULL,
--     script TEXT NOT NULL,
--     created_by INT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
--     FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
-- );

-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_type ON workspaces(type);
CREATE INDEX idx_collections_workspace ON collections(workspace_id);
CREATE INDEX idx_collections_created_by ON collections(created_by);
CREATE INDEX idx_folders_collection ON folders(collection_id);
CREATE INDEX idx_folders_parent ON folders(parent_folder_id);
CREATE INDEX idx_environments_workspace ON environments(workspace_id);
CREATE INDEX idx_requests_collection ON requests(collection_id);
CREATE INDEX idx_requests_folder ON requests(folder_id);
CREATE INDEX idx_requests_workspace ON requests(workspace_id);
CREATE INDEX idx_requests_method ON requests(method);
CREATE INDEX idx_request_history_request ON request_history(request_id);
CREATE INDEX idx_request_history_executed_at ON request_history(executed_at);
CREATE INDEX idx_request_history_executed_by ON request_history(executed_by);
-- CREATE INDEX idx_tests_request ON tests(request_id);
-- CREATE INDEX idx_pre_request_scripts_request ON pre_request_scripts(request_id);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('owner', 'Workspace owner with full permissions', '{"read": true, "write": true, "delete": true, "admin": true}'),
('admin', 'Administrator with most permissions', '{"read": true, "write": true, "delete": true, "admin": false}'),
('editor', 'Can read and write but not delete', '{"read": true, "write": true, "delete": false, "admin": false}'),
('viewer', 'Read-only access', '{"read": true, "write": false, "delete": false, "admin": false}');

-- Insert sample data (optional - for testing)
-- Sample user (password: 'password123' - hashed with bcrypt)
INSERT INTO users (username, email, password_hash, first_name, last_name, is_verified) VALUES
('admin', 'admin@postman-clone.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', TRUE);

-- Sample workspace
INSERT INTO workspaces (name, description, type, owner_id) VALUES
('My Workspace', 'Default workspace for testing', 'personal', 1);

-- Assign owner role to admin user
INSERT INTO user_workspace_roles (user_id, workspace_id, role_id) VALUES
(1, 1, 1);

-- Sample collection
INSERT INTO collections (name, description, workspace_id, created_by) VALUES
('Sample API Collection', 'A sample collection for testing APIs', 1, 1);

-- Sample environment
INSERT INTO environments (name, description, variables, workspace_id, created_by) VALUES
('Development', 'Development environment', '{"base_url": "http://localhost:3000", "api_key": "dev-key-123"}', 1, 1);

-- Sample request
INSERT INTO requests (name, description, method, url, headers, workspace_id, collection_id, created_by) VALUES
('Get Users', 'Get all users from the API', 'GET', '{{base_url}}/api/users', '{"Content-Type": "application/json"}', 1, 1, 1);

COMMIT;
