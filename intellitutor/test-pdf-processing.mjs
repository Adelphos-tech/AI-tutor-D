// Test PDF processing directly
import { readFile } from 'fs/promises';
import pdfjsLib from 'pdfjs-dist';

async function testPDF() {
  try {
    console.log('📄 Testing PDF processing...');
    
    const pdfPath = './uploads/1762850815725-Ai_Tutor_internal_doc_.pdf';
    console.log('📂 Reading file:', pdfPath);
    
    const dataBuffer = await readFile(pdfPath);
    console.log('✅ File read:', dataBuffer.length, 'bytes');
    
    console.log('📖 Loading PDF document...');
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(dataBuffer),
      useSystemFonts: true,
    });
    
    const pdfDocument = await loadingTask.promise;
    console.log('✅ PDF loaded:', pdfDocument.numPages, 'pages');
    
    // Extract first page
    console.log('📝 Extracting text from page 1...');
    const page = await pdfDocument.getPage(1);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str)
      .join(' ');
    
    console.log('✅ Text extracted:', pageText.substring(0, 200) + '...');
    console.log('\n🎉 PDF processing works!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPDF();
