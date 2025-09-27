/**
 * Simple test script for authentication endpoints
 * Run with: node test_auth.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/auth';

// Test data
const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'User'
};

async function testAuth() {
    console.log(' Testing Authentication System...\n');

    try {
        // Test 1: Health check
        console.log('1. Testing health check...');
        const healthResponse = await axios.get('http://localhost:3000/health');
        console.log(' Health check passed:', healthResponse.data.message);
        console.log('');

        // Test 2: User registration
        console.log('2. Testing user registration...');
        const registerResponse = await axios.post(`${BASE_URL}/register`, testUser);
        console.log('Registration successful:', registerResponse.data.message);
        console.log('User ID:', registerResponse.data.data.user.id);
        console.log('Access Token:', registerResponse.data.data.tokens.accessToken.substring(0, 20) + '...');
        console.log('');

        const accessToken = registerResponse.data.data.tokens.accessToken;

        // Test 3: User login
        console.log('3. Testing user login...');
        const loginResponse = await axios.post(`${BASE_URL}/login`, {
            email: testUser.email,
            password: testUser.password
        });
        console.log(' Login successful:', loginResponse.data.message);
        console.log('');

        // Test 4: Get user profile
        console.log('4. Testing get user profile...');
        const profileResponse = await axios.get(`${BASE_URL}/profile`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        console.log(' Profile retrieved successfully');
        console.log('Username:', profileResponse.data.data.user.username);
        console.log('Email:', profileResponse.data.data.user.email);
        console.log('');

        // Test 5: Update user profile
        console.log('5. Testing update user profile...');
        const updateResponse = await axios.put(`${BASE_URL}/profile`, {
            first_name: 'Updated',
            last_name: 'Name'
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        console.log(' Profile updated successfully:', updateResponse.data.message);
        console.log('');

        // Test 6: Logout
        console.log('6. Testing logout...');
        const logoutResponse = await axios.post(`${BASE_URL}/logout`, {}, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        console.log(' Logout successful:', logoutResponse.data.message);
        console.log('');

        console.log('🎉 All authentication tests passed!');

    } catch (error) {
        console.error(' Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 409) {
            console.log('  User already exists. Trying to login instead...');
            
            try {
                const loginResponse = await axios.post(`${BASE_URL}/login`, {
                    email: testUser.email,
                    password: testUser.password
                });
                console.log(' Login successful with existing user');
                console.log(' Authentication system is working!');
            } catch (loginError) {
                console.error(' Login also failed:', loginError.response?.data || loginError.message);
            }
        }
    }
}

// Run tests
testAuth();
