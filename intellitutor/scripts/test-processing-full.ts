import 'dotenv/config'
import { processDocument } from '@/lib/file-processor'
import { generateSummary, extractKeyConcepts, generatePracticeQuestions } from '@/lib/gemini'
import { PrismaClient } from '@/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Testing full processing pipeline...\n')

    // Get the most recent material
    const material = await prisma.material.findFirst({
      where: { processingStatus: 'ERROR' },
      orderBy: { uploadDate: 'desc' }
    })

    if (!material) {
      console.log('No materials in ERROR status')
      return
    }

    console.log(`📖 Processing: ${material.title}`)
    console.log(`📁 File: ${material.fileUrl}\n`)

    // Step 1: Extract text
    console.log('1️⃣ Extracting text from PDF...')
    const { text, pageCount } = await processDocument(material.fileUrl, material.fileType)
    console.log(`✅ Extracted ${text.length} characters from ${pageCount} pages\n`)

    // Step 2: Generate summary
    console.log('2️⃣ Generating summary...')
    const summary = await generateSummary(text.substring(0, 50000), 'brief')
    console.log(`✅ Summary generated (${summary.length} chars)\n`)
    console.log('Summary preview:', summary.substring(0, 200), '...\n')

    // Step 3: Generate concepts and questions
    console.log('3️⃣ Generating concepts and questions...')
    const textSample = text.substring(0, 30000)
    const [concepts, questions] = await Promise.all([
      extractKeyConcepts(textSample),
      generatePracticeQuestions(textSample, 5)
    ])
    console.log(`✅ Generated ${concepts.length} concepts and ${questions.length} questions\n`)

    console.log('🎉 All steps completed successfully!')
    console.log('\n💡 The processing pipeline works. The issue might be with async execution.')

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('\n❌ Error:', message)
    console.error('\nFull error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
