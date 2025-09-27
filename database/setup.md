# Database Setup Instructions

## Prerequisites
- MySQL server installed and running
- MySQL client (mysql command line tool)
- Node.js and npm installed

## Step 1: Create Database
First, create the database in MySQL:

```sql
CREATE DATABASE IF NOT EXISTS postman_clone_db;
USE postman_clone_db;
```

## Step 2: Run Schema Script
Execute the main schema file to create all tables:

```bash
# Option 1: Using MySQL command line
mysql -u your_username -p postman_clone_db < database/schema.sql

# Option 2: Using MySQL Workbench or phpMyAdmin
# Copy and paste the contents of database/schema.sql
```

## Step 3: Add Sample Data (Optional)
If you want sample data for testing:

```bash
mysql -u your_username -p postman_clone_db < database/seed_data.sql
```

## Step 4: Configure Environment Variables
1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=postman_clone_db
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key_here
```

## Step 5: Test Database Connection
Run the Node.js application to test the connection:

```bash
npm install
node server.js
```

## Verification
After setup, you should see:
- ✅ Database connected successfully
- 🚀 Database pool initialized

## Default Users (if seed data is loaded)
- **Admin User**: 
  - Username: `admin`
  - Email: `admin@postman-clone.com`
  - Password: `password123`

- **Test Users**:
  - Username: `john_doe`, Email: `john.doe@example.com`
  - Username: `jane_smith`, Email: `jane.smith@example.com`
  - Username: `dev_user`, Email: `dev@example.com`
  - Password for all: `password123`

## Troubleshooting

### Connection Issues
1. **Access Denied**: Check username/password in `.env`
2. **Database doesn't exist**: Run the CREATE DATABASE command first
3. **Port issues**: Ensure MySQL is running on port 3306

### Common Commands
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Start MySQL service
sudo systemctl start mysql

# Connect to MySQL
mysql -u root -p

# Show databases
SHOW DATABASES;

# Use database
USE postman_clone_db;

# Show tables
SHOW TABLES;
```
