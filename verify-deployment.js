#!/usr/bin/env node

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://ai-tutor-d-production.up.railway.app';

console.log('🔍 Verifying AI Academic Tutor deployment...\n');

// Test functions
async function testEndpoint(url, description) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      console.log(`${success ? '✅' : '❌'} ${description}: ${res.statusCode}`);
      resolve(success);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${description}: Error - ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log(`❌ ${description}: Timeout`);
      req.destroy();
      resolve(false);
    });
  });
}

async function runTests() {
  const tests = [
    [PRODUCTION_URL, 'Main application'],
    [`${PRODUCTION_URL}/api/health`, 'Health check endpoint'],
    [`${PRODUCTION_URL}/upload`, 'Upload page'],
    [`${PRODUCTION_URL}/api/documents`, 'Documents API'],
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const [url, description] of tests) {
    const success = await testEndpoint(url, description);
    if (success) passed++;
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
  }
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Your deployment is working correctly.');
    console.log(`\n🌐 Access your app at: ${PRODUCTION_URL}`);
  } else {
    console.log('⚠️  Some tests failed. Check Railway logs for details.');
    console.log('💡 Common issues:');
    console.log('   - Environment variables not set');
    console.log('   - Build process failed');
    console.log('   - Database connection issues');
  }
}

runTests().catch(console.error);
