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
        if (typeof res.data.token !== 'string') throw new Error('Token missing in response');
    });

    await runTest('POST /api/auth/login', async () => {
        const res = await axios.post(`${BASE_URL}/api/auth/login`, {
            identifier: 'test@example.com',
            password: 'password123'
        });
        if (res.status !== 200) throw new Error('Login failed');
    });

    // 2. Recommendation Engine Tests
    await runTest('POST /api/recommend (Valid Domain + Level)', async () => {
        const res = await axios.post(`${BASE_URL}/api/recommend`, {
            domain: 'AI',
            level: 'Beginner'
        });
        if (!Array.isArray(res.data.skills)) throw new Error('Skills array missing');
        if (res.data.skills.length === 0) throw new Error('Recommended skills empty');
    });

    await runTest('POST /api/recommend (Invalid Domain)', async () => {
        const res = await axios.post(`${BASE_URL}/api/recommend`, {
            domain: 'NonExistent',
            level: 'Beginner'
        });
        if (res.data.skills.length !== 0) throw new Error('Should return empty skills for invalid domain');
    });

    await runTest('POST /api/recommend (Missing Fields)', async () => {
        try {
            await axios.post(`${BASE_URL}/api/recommend`, { domain: 'AI' });
        } catch (error) {
            if (error.response.status === 400) return; // Expected
        }
        throw new Error('Should return 400 for missing fields');
    });

    // 3. Roadmap & Skills Data
    await runTest('GET /api/skills', async () => {
        const res = await axios.get(`${BASE_URL}/api/skills`);
        if (res.status !== 200) throw new Error('Failed to fetch skills');
    });

    await runTest('GET /api/recommend/options', async () => {
        const res = await axios.get(`${BASE_URL}/api/recommend/options`);
        if (!res.data.domains || !res.data.levels) throw new Error('Options missing');
    });

    // 4. Quiz Tests
    await runTest('GET /api/quiz/:skill', async () => {
        const res = await axios.get(`${BASE_URL}/api/quiz/Python`);
        if (!res.data.questions) throw new Error('Quiz questions missing');
    });

    await runTest('POST /api/submit-quiz (Valid Submission)', async () => {
        const res = await axios.post(`${BASE_URL}/api/submit-quiz`, {
            skill_name: 'Python',
            answers: [0, 1, 0, 1, 0], // Dummy answers
            user_id: 1
        });
        if (typeof res.data.passed !== 'boolean') throw new Error('Result "passed" status missing');
    });

    console.log(`\n📊 Test Summary: ${testsPassed} Passed, ${testsFailed} Failed`);
    process.exit(testsFailed > 0 ? 1 : 0);
};

testApi();
