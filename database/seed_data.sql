-- Postman Clone Database Seed Data
-- Additional sample data for testing and development

-- Insert additional sample users
INSERT INTO users (username, email, password_hash, first_name, last_name, is_verified) VALUES
('john_doe', 'john.doe@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', TRUE),
('jane_smith', 'jane.smith@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Smith', TRUE),
('dev_user', 'dev@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dev', 'User', TRUE);

-- Insert additional workspaces
INSERT INTO workspaces (name, description, type, owner_id) VALUES
('Team Workspace', 'Shared workspace for team collaboration', 'team', 2),
('Private Workspace', 'Private workspace for sensitive APIs', 'private', 3),
('Public APIs', 'Public APIs testing workspace', 'personal', 1);

-- Assign roles to users in different workspaces
INSERT INTO user_workspace_roles (user_id, workspace_id, role_id) VALUES
-- Admin user in all workspaces
(1, 2, 2), -- admin role in team workspace
(1, 3, 3), -- editor role in private workspace
(1, 4, 1), -- owner role in public APIs workspace

-- John Doe in team workspace as editor
(2, 2, 3), -- editor role in team workspace

-- Jane Smith in team workspace as viewer
(3, 2, 4); -- viewer role in team workspace

-- Insert additional collections
INSERT INTO collections (name, description, workspace_id, created_by) VALUES
('REST API Tests', 'Collection for testing REST APIs', 2, 2),
('Authentication APIs', 'Authentication related API endpoints', 3, 3),
('Public APIs', 'Collection of public APIs for testing', 4, 1),
('E-commerce APIs', 'E-commerce platform APIs', 1, 1);

-- Insert additional environments
INSERT INTO environments (name, description, variables, workspace_id, created_by) VALUES
('Staging', 'Staging environment', '{"base_url": "https://staging-api.example.com", "api_key": "staging-key-456"}', 2, 2),
('Production', 'Production environment', '{"base_url": "https://api.example.com", "api_key": "prod-key-789"}', 3, 3),
('Local', 'Local development environment', '{"base_url": "http://localhost:8080", "api_key": "local-key-123"}', 4, 1);

-- Insert folders for better organization
INSERT INTO folders (name, collection_id) VALUES
('Authentication', 1),
('Users', 1),
('Products', 1),
('Orders', 1);

-- Insert additional requests
INSERT INTO requests (name, description, method, url, headers, body, workspace_id, collection_id, folder_id, created_by) VALUES
-- Authentication requests
('Login User', 'User login endpoint', 'POST', '{{base_url}}/auth/login', '{"Content-Type": "application/json"}', '{"email": "user@example.com", "password": "password"}', 2, 1, 1, 2),
('Register User', 'User registration endpoint', 'POST', '{{base_url}}/auth/register', '{"Content-Type": "application/json"}', '{"username": "newuser", "email": "newuser@example.com", "password": "password123"}', 2, 1, 1, 2),
('Logout User', 'User logout endpoint', 'POST', '{{base_url}}/auth/logout', '{"Authorization": "Bearer {{token}}"}', NULL, 2, 1, 1, 2),

-- User management requests
('Get User Profile', 'Get current user profile', 'GET', '{{base_url}}/users/profile', '{"Authorization": "Bearer {{token}}"}', NULL, 2, 1, 2, 2),
('Update User Profile', 'Update user profile', 'PUT', '{{base_url}}/users/profile', '{"Authorization": "Bearer {{token}}", "Content-Type": "application/json"}', '{"first_name": "John", "last_name": "Doe"}', 2, 1, 2, 2),
('Delete User', 'Delete user account', 'DELETE', '{{base_url}}/users/profile', '{"Authorization": "Bearer {{token}}"}', NULL, 2, 1, 2, 2),

-- Product requests
('Get Products', 'Get all products', 'GET', '{{base_url}}/products', '{"Authorization": "Bearer {{token}}"}', NULL, 2, 1, 3, 2),
('Create Product', 'Create a new product', 'POST', '{{base_url}}/products', '{"Authorization": "Bearer {{token}}", "Content-Type": "application/json"}', '{"name": "New Product", "price": 99.99, "description": "A new product"}', 2, 1, 3, 2),
('Update Product', 'Update product by ID', 'PUT', '{{base_url}}/products/{{product_id}}', '{"Authorization": "Bearer {{token}}", "Content-Type": "application/json"}', '{"name": "Updated Product", "price": 149.99}', 2, 1, 3, 2),
('Delete Product', 'Delete product by ID', 'DELETE', '{{base_url}}/products/{{product_id}}', '{"Authorization": "Bearer {{token}}"}', NULL, 2, 1, 3, 2),

-- Order requests
('Get Orders', 'Get all orders', 'GET', '{{base_url}}/orders', '{"Authorization": "Bearer {{token}}"}', NULL, 2, 1, 4, 2),
('Create Order', 'Create a new order', 'POST', '{{base_url}}/orders', '{"Authorization": "Bearer {{token}}", "Content-Type": "application/json"}', '{"product_id": 1, "quantity": 2, "total": 199.98}', 2, 1, 4, 2),

-- Public API requests
('Weather API', 'Get weather information', 'GET', 'https://api.openweathermap.org/data/2.5/weather?q=London&appid={{weather_api_key}}', NULL, NULL, 4, 4, NULL, 1),
('News API', 'Get latest news', 'GET', 'https://newsapi.org/v2/top-headlines?country=us&apiKey={{news_api_key}}', NULL, NULL, 4, 4, NULL, 1);

-- Insert some test scripts - COMMENTED OUT FOR NOW
-- INSERT INTO tests (request_id, name, test_script, created_by) VALUES
-- (2, 'Check Status Code', 'pm.test("Status code is 200", function () { pm.response.to.have.status(200); });', 2),
-- (2, 'Check Response Time', 'pm.test("Response time is less than 2000ms", function () { pm.expect(pm.response.responseTime).to.be.below(2000); });', 2),
-- (2, 'Check Response Body', 'pm.test("Response has token", function () { var jsonData = pm.response.json(); pm.expect(jsonData.token).to.exist; });', 2);

-- Insert pre-request scripts - COMMENTED OUT FOR NOW
-- INSERT INTO pre_request_scripts (request_id, script, created_by) VALUES
-- (2, 'console.log("Starting login request..."); pm.environment.set("timestamp", new Date().toISOString());', 2),
-- (4, 'console.log("Getting user profile for:", pm.environment.get("user_email"));', 2);

-- Insert some request history (simulated past executions)
INSERT INTO request_history (request_id, executed_by, status_code, response_headers, response_body, response_time_ms, executed_at) VALUES
(2, 2, 200, '{"Content-Type": "application/json", "Content-Length": "156"}', '{"success": true, "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "user": {"id": 1, "email": "user@example.com"}}', 1250, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 2, 401, '{"Content-Type": "application/json"}', '{"error": "Invalid credentials", "message": "Email or password is incorrect"}', 890, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(5, 2, 200, '{"Content-Type": "application/json"}', '{"id": 1, "username": "john_doe", "email": "john.doe@example.com", "first_name": "John", "last_name": "Doe"}', 650, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(7, 2, 200, '{"Content-Type": "application/json"}', '{"products": [{"id": 1, "name": "Product 1", "price": 99.99}, {"id": 2, "name": "Product 2", "price": 149.99}]}', 1100, DATE_SUB(NOW(), INTERVAL 15 MINUTE));

COMMIT;
