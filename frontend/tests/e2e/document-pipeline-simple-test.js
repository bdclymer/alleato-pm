// Simple test to verify document pipeline functionality
const BASE_URL = 'http://localhost:3000';

async function testDocumentPipeline() {
  console.log('Testing Document Pipeline Management Page...\n');

  // Test 1: Check if page redirects to auth
  console.log('1. Testing page access without auth');
  try {
    const pageRes = await fetch(`${BASE_URL}/admin/documents/pipeline`, {
      redirect: 'manual'
    });
    
    if (pageRes.status === 307 && pageRes.headers.get('location') === '/auth/login') {
      console.log('   ✅ Page correctly redirects to login when not authenticated');
    } else {
      console.log('   ❌ Unexpected response:', pageRes.status, pageRes.headers.get('location'));
    }
  } catch (error) {
    console.log('   ❌ ERROR:', error.message);
  }

  // Test 2: Test API endpoints
  console.log('\n2. Testing API endpoints');
  
  // Status endpoint
  console.log('   a) GET /api/documents/status');
  try {
    const statusRes = await fetch(`${BASE_URL}/api/documents/status`);
    console.log(`      Status: ${statusRes.status}`);
    if (statusRes.ok) {
      const data = await statusRes.json();
      console.log(`      ✅ Got ${data.documents?.length || 0} documents`);
    } else {
      const text = await statusRes.text();
      console.log(`      ❌ Error: ${text.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log('      ❌ ERROR:', error.message);
  }

  // Trigger GET endpoint
  console.log('   b) GET /api/documents/trigger-pipeline');
  try {
    const triggerRes = await fetch(`${BASE_URL}/api/documents/trigger-pipeline`);
    console.log(`      Status: ${triggerRes.status}`);
    if (triggerRes.ok) {
      const data = await triggerRes.json();
      console.log(`      ✅ Phase counts:`, data.phaseCounts);
    } else {
      const text = await triggerRes.text();
      console.log(`      ❌ Error: ${text.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log('      ❌ ERROR:', error.message);
  }

  console.log('\n3. Summary');
  console.log('   - Admin pages require authentication (working correctly)');
  console.log('   - API endpoints need to handle auth or be moved to non-admin routes');
  console.log('   - UI mocking in tests would allow testing without real backend');
}

testDocumentPipeline().catch(console.error);