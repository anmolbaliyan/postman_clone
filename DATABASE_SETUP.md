# Database Setup Documentation

## Overview
This document explains how to set up the database for the Postman Clone application.

## Prerequisites
- MySQL server installed and running
- MySQL client (mysql command line tool)
- Access to MySQL with appropriate privileges

## Database Setup Steps

### Step 1: Create Database
Connect to MySQL and create the database:

```bash
mysql -u your_username -p
```

Then in MySQL:
```sql
CREATE DATABASE IF NOT EXISTS postman_clone_db;
USE postman_clone_db;
```

### Step 2: Create Tables
Run the schema file to create all tables:

```bash
mysql -u your_username -p postman_clone_db < database/schema.sql
```

This will create:
- ✅ Users table
- ✅ Roles table  
- ✅ Workspaces table
- ✅ User Workspace Roles table
- ✅ Collections table
- ✅ Folders table
- ✅ Environments table
- ✅ Requests table
- ✅ Request History table
- ✅ Performance indexes
- ✅ Default roles (owner, admin, editor, viewer)
- ✅ Sample user and workspace

### Step 3: Add Sample Data (Optional)
If you want sample data for testing:

```bash
mysql -u your_username -p postman_clone_db < database/seed_data.sql
```

This will add:
- ✅ Additional test users
- ✅ Sample workspaces
- ✅ Sample collections and environments
- ✅ Sample requests
- ✅ Request execution history

### Step 4: Configure Environment Variables
Make sure your `.env` file has the correct database credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=postman_clone_db
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key_here
```

## Verification

### Check Database Connection
After setup, your server should show:
```
Database connected successfully
Database pool initialized
```

### Test the API
Run the authentication test:
```bash
node test_auth.js
```

## Troubleshooting

### Common Issues

1. **"Database connected successfully" but API fails**
   - Check if tables exist: `SHOW TABLES;` in MySQL
   - Verify schema was run: `DESCRIBE users;`

2. **Connection refused**
   - Ensure MySQL server is running
   - Check credentials in `.env` file
   - Verify database exists

3. **Permission denied**
   - Check MySQL user privileges
   - Ensure user can CREATE, INSERT, SELECT, UPDATE, DELETE

4. **Tables not created**
   - Check for SQL syntax errors in schema.sql
   - Verify foreign key constraints

### Useful MySQL Commands

```sql
-- Show databases
SHOW DATABASES;

-- Use database
USE postman_clone_db;

-- Show tables
SHOW TABLES;

-- Check table structure
DESCRIBE users;

-- Check if data exists
SELECT COUNT(*) FROM users;

-- Check roles
SELECT * FROM roles;

-- Check user workspaces
SELECT u.username, w.name, r.name as role 
FROM users u
JOIN user_workspace_roles uwr ON u.id = uwr.user_id
JOIN workspaces w ON uwr.workspace_id = w.id
JOIN roles r ON uwr.role_id = r.id;
```

## Default Users (if seed data is loaded)

| Username | Email | Password | Role |
|----------|-------|----------|------|
| admin | admin@postman-clone.com | password123 | owner |
| john_doe | john.doe@example.com | password123 | editor |
| jane_smith | jane.smith@example.com | password123 | viewer |
| dev_user | dev@example.com | password123 | - |

## Database Schema Overview

```
users ←→ user_workspace_roles ←→ workspaces
  ↓              ↓                    ↓
requests    collections    environments
  ↓              ↓
request_history  folders
```

## Next Steps

After database setup:
1. ✅ Start server: `node server.js`
2. ✅ Test health: `curl http://localhost:3000/health`
3. ✅ Test registration: `node test_auth.js`
4. ✅ Proceed to Phase 4: Core API Endpoints

---

**Note**: Make sure to keep your database credentials secure and never commit them to version control.
