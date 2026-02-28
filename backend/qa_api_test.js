const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

const testApi = async () => {
    console.log('🚀 Starting API Tests...\n');

    let testsPassed = 0;
    let testsFailed = 0;

    const runTest = async (name, operation) => {
        try {
            await operation();
            console.log(`✅ [PASS] ${name}`);
            testsPassed++;
        } catch (error) {
            console.error(`❌ [FAIL] ${name}`);
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Data: ${JSON.stringify(error.response.data)}`);
            } else {
                console.error(`   Error: ${error.message}`);
            }
            testsFailed++;
        }
    };

    // 1. Auth Tests (Mock)
    await runTest('POST /api/auth/signup', async () => {
        const res = await axios.post(`${BASE_URL}/api/auth/signup`, {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            phone: '1234567890'
        });
        if (!res.data.token) throw new Error('Token missing');
    });

    await runTest('POST /api/auth/login', async () => {
        const res = await axios.post(`${BASE_URL}/api/auth/login`, {
            identifier: 'test@example.com',
            password: 'password123'
        });
        if (res.status !== 200) throw new Error('Login failed');
    });

    // 2. Recommendation Engine Tests
    await runTest('POST /api/recommend (Valid)', async () => {
        const res = await axios.post(`${BASE_URL}/api/recommend`, {
            domain: 'AI',
            level: 'Beginner'
        });
        if (!res.data.skills || res.data.skills.length === 0) throw new Error('Empty recommendations');
    });

    // 3. Data Integrity
    await runTest('GET /api/recommend/options', async () => {
        const res = await axios.get(`${BASE_URL}/api/recommend/options`);
        if (!res.data.domains) throw new Error('Domains missing');
    });

    await runTest('GET /api/quiz/Python', async () => {
        const res = await axios.get(`${BASE_URL}/api/quiz/Python`);
        if (!res.data.questions) throw new Error('Questions missing');
    });

    console.log(`\n📊 Test Summary: ${testsPassed} Passed, ${testsFailed} Failed`);
    process.exit(testsFailed > 0 ? 1 : 0);
};

testApi();
