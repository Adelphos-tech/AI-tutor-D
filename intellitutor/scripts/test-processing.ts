import 'dotenv/config'
import { processDocument } from '@/lib/file-processor'

async function main() {
  try {
    console.log('Testing PDF processing...')
    const filePath = './uploads/1762532619202-Fine_Time_Measurement_for_the_Internet_of_Things_A.pdf'
    
    console.log('Processing file:', filePath)
    const result = await processDocument(filePath, 'application/pdf')
    
    console.log('✅ Success!')
    console.log('Page count:', result.pageCount)
    console.log('Text length:', result.text.length)
    console.log('First 500 chars:', result.text.substring(0, 500))
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

main()
