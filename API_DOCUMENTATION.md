# Postman Clone API Documentation

## Overview
This is a comprehensive REST API for a Postman-like application with workspace management, request execution, and role-based access control.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints (except auth endpoints) require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format
All responses follow this format:
```json
{
  "success": true|false,
  "message": "Description of the result",
  "data": { ... },
  "code": "ERROR_CODE" // Only present on errors
}
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token"
    }
  }
}
```

### Login User
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

### Get User Profile
**GET** `/auth/profile`

### Update User Profile
**PUT** `/auth/profile`

### Logout
**POST** `/auth/logout`

---

## Workspace Management

### Get All Workspaces
**GET** `/workspaces`

**Response:**
```json
{
  "success": true,
  "data": {
    "workspaces": [
      {
        "id": 1,
        "name": "My Workspace",
        "description": "Personal workspace",
        "type": "personal",
        "owner_id": 1,
        "user_role": "owner",
        "permissions": { ... },
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Get Specific Workspace
**GET** `/workspaces/:id`

### Create Workspace
**POST** `/workspaces`

**Request Body:**
```json
{
  "name": "New Workspace",
  "description": "Team workspace",
  "type": "team"
}
```

### Update Workspace
**PUT** `/workspaces/:id`

### Delete Workspace
**DELETE** `/workspaces/:id`

### Get Workspace Members
**GET** `/workspaces/:id/members`

---

## Collection Management

### Get Collections in Workspace
**GET** `/workspaces/:workspaceId/collections`

### Create Collection
**POST** `/workspaces/:workspaceId/collections`

**Request Body:**
```json
{
  "name": "API Collection",
  "description": "Collection for API testing"
}
```

### Get Specific Collection
**GET** `/collections/:id`

### Update Collection
**PUT** `/collections/:id`

### Delete Collection
**DELETE** `/collections/:id`

---

## Request Management

### Get Requests in Collection
**GET** `/collections/:collectionId/requests`

### Create Request
**POST** `/collections/:collectionId/requests`

**Request Body:**
```json
{
  "name": "Get Users",
  "description": "Fetch all users",
  "method": "GET",
  "url": "https://api.example.com/users",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{token}}"
  },
  "query_params": {
    "limit": "10",
    "page": "1"
  },
  "folder_id": 1
}
```

### Get Specific Request
**GET** `/requests/:id`

### Update Request
**PUT** `/requests/:id`

### Delete Request
**DELETE** `/requests/:id`

---

## Request Execution

### Execute Request
**POST** `/requests/:id/execute`

**Request Body:**
```json
{
  "environment_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request executed successfully",
  "data": {
    "execution": {
      "id": 1,
      "request_id": 1,
      "status_code": 200,
      "response_headers": { ... },
      "response_body": { ... },
      "duration_ms": 150,
      "error": null,
      "executed_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Get Request History
**GET** `/requests/:id/history`

### Get Workspace History
**GET** `/workspaces/:id/history`

### Delete History Entry
**DELETE** `/history/:id`

---

## Environment Management

### Get Environments in Workspace
**GET** `/workspaces/:workspaceId/environments`

### Create Environment
**POST** `/workspaces/:workspaceId/environments`

**Request Body:**
```json
{
  "name": "Development",
  "description": "Development environment",
  "variables": {
    "base_url": "https://dev-api.example.com",
    "api_key": "dev-key-123",
    "timeout": "5000"
  }
}
```

### Get Specific Environment
**GET** `/environments/:id`

### Update Environment
**PUT** `/environments/:id`

### Delete Environment
**DELETE** `/environments/:id`

---

## Role Management

### Get Workspace Roles
**GET** `/workspaces/:id/roles`

**Response:**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "user_id": 1,
        "username": "johndoe",
        "email": "john@example.com",
        "role_name": "owner",
        "permissions": { ... },
        "joined_at": "2024-01-01T00:00:00Z"
      }
    ],
    "available_roles": [
      {
        "id": 1,
        "name": "owner",
        "permissions": { ... },
        "description": "Full access"
      }
    ]
  }
}
```

### Assign Role to User
**POST** `/workspaces/:id/roles`

**Request Body:**
```json
{
  "user_id": 2,
  "role_id": 2
}
```

### Update User Role
**PUT** `/workspaces/:id/roles/:userId`

### Remove User from Workspace
**DELETE** `/workspaces/:id/roles/:userId`

---

## User Management

### Get All Users (Admin Only)
**GET** `/users`

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)
- `search` (optional)

### Search Users
**GET** `/users/search`

**Query Parameters:**
- `query` (required, min 2 characters)
- `limit` (default: 10)

### Get User Profile
**GET** `/users/:id`

### Update User Profile
**PUT** `/users/:id`

### Delete User (Admin Only)
**DELETE** `/users/:id`

---

## Folder Management

### Get Folders in Collection
**GET** `/collections/:collectionId/folders`

### Create Folder
**POST** `/collections/:collectionId/folders`

**Request Body:**
```json
{
  "name": "Authentication",
  "parent_folder_id": 1
}
```

### Get Specific Folder
**GET** `/folders/:id`

### Update Folder
**PUT** `/folders/:id`

### Delete Folder
**DELETE** `/folders/:id`

---

## Error Codes

| Code | Description |
|------|-------------|
| `MISSING_REQUIRED_FIELDS` | Required fields are missing |
| `INVALID_EMAIL` | Email format is invalid |
| `WEAK_PASSWORD` | Password doesn't meet requirements |
| `USER_ALREADY_EXISTS` | User with email already exists |
| `INVALID_CREDENTIALS` | Login credentials are invalid |
| `TOKEN_EXPIRED` | JWT token has expired |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `WORKSPACE_NOT_FOUND` | Workspace doesn't exist or access denied |
| `COLLECTION_NOT_FOUND` | Collection doesn't exist or access denied |
| `REQUEST_NOT_FOUND` | Request doesn't exist or access denied |
| `ENVIRONMENT_NOT_FOUND` | Environment doesn't exist or access denied |
| `FOLDER_NOT_FOUND` | Folder doesn't exist or access denied |
| `USER_NOT_FOUND` | User doesn't exist |
| `ROLE_NOT_FOUND` | Role doesn't exist |
| `INVALID_HTTP_METHOD` | HTTP method is not supported |
| `INVALID_VARIABLES_FORMAT` | Environment variables format is invalid |
| `FOLDER_NOT_EMPTY` | Cannot delete folder with contents |
| `CANNOT_DELETE_SELF` | Users cannot delete their own account |
| `CANNOT_CHANGE_OWNER_ROLE` | Owner cannot change their own role |
| `CANNOT_REMOVE_OWNER` | Owner cannot remove themselves |

---

## Role Permissions

### Owner
- Full access to all workspace features
- Can manage all users and roles
- Can delete workspace
- Cannot change own role or remove self

### Admin
- Can manage users and roles
- Can create/edit/delete collections, requests, environments
- Cannot delete workspace or change owner role

### Editor
- Can create/edit collections, requests, environments
- Cannot manage users or roles
- Cannot delete workspace

### Viewer
- Read-only access to workspace content
- Cannot create, edit, or delete anything

---

## Environment Variables

Environment variables use `{{variable_name}}` syntax and are substituted during request execution:

```json
{
  "variables": {
    "base_url": "https://api.example.com",
    "api_key": "secret-key-123",
    "timeout": "5000"
  }
}
```

Usage in requests:
- URL: `{{base_url}}/users`
- Headers: `Authorization: Bearer {{api_key}}`
- Body: `{"timeout": {{timeout}}}`

---

## Rate Limiting

Currently no rate limiting is implemented, but it's recommended for production use.

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

---

## Pagination

List endpoints support pagination with `limit` and `offset` parameters:

```
GET /users?limit=20&offset=40
```

Response includes pagination metadata:
```json
{
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 40,
    "has_more": true
  }
}
```
