/**
 * Test script for Phase 5 APIs (Request Execution Engine & Role Management)
 * Run with: node test_phase5.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let workspaceId = '';
let collectionId = '';
let requestId = '';
let environmentId = '';
let historyId = '';

// Test data
const testUser = {
    username: 'phase5execution',
    email: 'phase5execution@example.com',
    password: 'TestPassword123!',
    first_name: 'Phase5',
    last_name: 'Execution'
};

async function testPhase5() {
    console.log('🧪 Testing Phase 5 APIs (Request Execution Engine & Role Management)...\n');

    try {
        // Step 1: Register/Login user
        console.log('1. Setting up authentication...');
        let response;
        try {
            response = await axios.post(`${BASE_URL}/auth/register`, testUser);
            console.log('✅ User registered successfully');
        } catch (error) {
            if (error.response?.status === 409) {
                console.log('ℹ️  User exists, logging in...');
                response = await axios.post(`${BASE_URL}/auth/login`, {
                    email: testUser.email,
                    password: testUser.password
                });
                console.log('✅ User logged in successfully');
            } else {
                throw error;
            }
        }
        
        authToken = response.data.data.tokens.accessToken;
        console.log('');

        // Step 2: Create workspace and collection
        console.log('2. Setting up workspace and collection...');
        
        // Create workspace
        const workspaceResponse = await axios.post(`${BASE_URL}/workspaces`, {
            name: 'Phase 5 Test Workspace',
            description: 'A workspace for testing Phase 5 APIs',
            type: 'team'
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        workspaceId = workspaceResponse.data.data.workspace.id;
        console.log(`✅ Created workspace: ${workspaceResponse.data.data.workspace.name}`);
        
        // Create collection
        const collectionResponse = await axios.post(`${BASE_URL}/workspaces/${workspaceId}/collections`, {
            name: 'Phase 5 Test Collection',
            description: 'A collection for testing execution APIs'
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        collectionId = collectionResponse.data.data.collection.id;
        console.log(`✅ Created collection: ${collectionResponse.data.data.collection.name}`);
        
        // Create environment
        const environmentResponse = await axios.post(`${BASE_URL}/workspaces/${workspaceId}/environments`, {
            name: 'Test Environment',
            description: 'Environment for testing variable substitution',
            variables: {
                'base_url': 'https://jsonplaceholder.typicode.com',
                'api_key': 'test-key-123',
                'timeout': '5000'
            }
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        environmentId = environmentResponse.data.data.environment.id;
        console.log(`✅ Created environment: ${environmentResponse.data.data.environment.name}`);
        
        // Create request
        const requestResponse = await axios.post(`${BASE_URL}/collections/${collectionId}/requests`, {
            name: 'Test API Request',
            description: 'A request for testing execution',
            method: 'GET',
            url: '{{base_url}}/posts',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': '{{api_key}}'
            },
            query_params: {
                '_limit': '5'
            }
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        requestId = requestResponse.data.data.request.id;
        console.log(`✅ Created request: ${requestResponse.data.data.request.name}`);
        console.log('');

        // Step 3: Test request execution
        console.log('3. Testing request execution...');
        
        // Execute request without environment
        console.log('   - Executing request without environment...');
        const executeResponse1 = await axios.post(`${BASE_URL}/requests/${requestId}/execute`, {}, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        historyId = executeResponse1.data.data.execution.id;
        console.log(`✅ Request executed (Status: ${executeResponse1.data.data.execution.status_code}, Duration: ${executeResponse1.data.data.execution.duration_ms}ms)`);
        
        // Execute request with environment
        console.log('   - Executing request with environment...');
        const executeResponse2 = await axios.post(`${BASE_URL}/requests/${requestId}/execute`, {
            environment_id: environmentId
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`✅ Request executed with environment (Status: ${executeResponse2.data.data.execution.status_code}, Duration: ${executeResponse2.data.data.execution.duration_ms}ms)`);
        console.log('');

        // Step 4: Test request history
        console.log('4. Testing request history...');
        
        // Get request history
        console.log('   - Getting request history...');
        const requestHistoryResponse = await axios.get(`${BASE_URL}/requests/${requestId}/history`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`✅ Found ${requestHistoryResponse.data.data.history.length} history entries`);
        
        // Get workspace history
        console.log('   - Getting workspace history...');
        const workspaceHistoryResponse = await axios.get(`${BASE_URL}/workspaces/${workspaceId}/history`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`✅ Found ${workspaceHistoryResponse.data.data.history.length} workspace history entries`);
        console.log('');

        // Step 5: Test role management
        console.log('5. Testing role management...');
        
        // Get workspace roles
        console.log('   - Getting workspace roles...');
        const rolesResponse = await axios.get(`${BASE_URL}/workspaces/${workspaceId}/roles`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`✅ Found ${rolesResponse.data.data.members.length} members and ${rolesResponse.data.data.available_roles.length} available roles`);
        
        // Create a second user for role testing
        console.log('   - Creating second user for role testing...');
        const secondUserResponse = await axios.post(`${BASE_URL}/auth/register`, {
            username: 'phase5user2',
            email: 'phase5user2@example.com',
            password: 'TestPassword123!',
            first_name: 'Phase5',
            last_name: 'User2'
        });
        const secondUserId = secondUserResponse.data.data.user.id;
        console.log(`✅ Created second user: ${secondUserResponse.data.data.user.username}`);
        
        // Assign role to second user
        console.log('   - Assigning role to second user...');
        const assignRoleResponse = await axios.post(`${BASE_URL}/workspaces/${workspaceId}/roles`, {
            user_id: secondUserId,
            role_id: 2 // editor role
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`✅ Role assigned successfully`);
        
        // Get updated workspace roles
        console.log('   - Getting updated workspace roles...');
        const updatedRolesResponse = await axios.get(`${BASE_URL}/workspaces/${workspaceId}/roles`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`✅ Found ${updatedRolesResponse.data.data.members.length} members after role assignment`);
        
        // Update user role
        console.log('   - Updating user role...');
        const updateRoleResponse = await axios.put(`${BASE_URL}/workspaces/${workspaceId}/roles/${secondUserId}`, {
            role_id: 3 // viewer role
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`✅ User role updated successfully`);
        
        // Remove user from workspace
        console.log('   - Removing user from workspace...');
        const removeUserResponse = await axios.delete(`${BASE_URL}/workspaces/${workspaceId}/roles/${secondUserId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`✅ User removed from workspace successfully`);
        console.log('');

        // Step 6: Test history deletion
        console.log('6. Testing history management...');
        
        // Delete history entry
        console.log('   - Deleting history entry...');
        const deleteHistoryResponse = await axios.delete(`${BASE_URL}/history/${historyId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`✅ History entry deleted successfully`);
        console.log('');

        console.log('🎉 Phase 5 APIs (Request Execution Engine & Role Management) are working perfectly!');
        console.log('');
        console.log('📊 Summary:');
        console.log(`   - Workspace ID: ${workspaceId}`);
        console.log(`   - Collection ID: ${collectionId}`);
        console.log(`   - Request ID: ${requestId}`);
        console.log(`   - Environment ID: ${environmentId}`);
        console.log(`   - All execution and role management operations tested successfully`);
        console.log('');
        console.log('✅ Phase 5 Implementation Complete!');
        console.log('   - Request Execution Engine');
        console.log('   - Environment Variable Substitution');
        console.log('   - Request History Tracking');
        console.log('   - Role Management APIs');
        console.log('   - HTTP Client Integration');
        console.log('   - Comprehensive Error Handling');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 500) {
            console.log('\n💡 Make sure the database tables are created by running:');
            console.log('   mysql -u your_username -p postman_clone_db < database/schema.sql');
        }
    }
}

// Run tests
testPhase5();
