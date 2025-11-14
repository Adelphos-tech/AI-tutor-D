// Manual test to process the uploaded file
const fs = require('fs');
const path = require('path');

async function testUpload() {
  const filePath = path.join(__dirname, 'uploads/1762850029428-Ai_Tutor_internal_doc_.pdf');
  
  console.log('📄 Testing file:', filePath);
  console.log('📊 File exists:', fs.existsSync(filePath));
  
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log('📏 File size:', stats.size, 'bytes');
    console.log('📅 Upload time:', stats.mtime);
    
    // Try to trigger upload via API
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
      filename: 'Ai_Tutor_internal_doc_.pdf',
      contentType: 'application/pdf'
    });
    
    console.log('\n🚀 Sending to API...');
    
    const fetch = require('node-fetch');
    const response = await fetch('http://127.0.0.1:3000/api/materials/upload', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const result = await response.json();
    console.log('📥 Response:', result);
    console.log('✅ Status:', response.status);
  }
}

testUpload().catch(console.error);
