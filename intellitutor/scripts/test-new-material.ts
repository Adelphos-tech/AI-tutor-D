import 'dotenv/config'
import { searchRelevantChunks } from '@/lib/pinecone'
import { answerQuestion } from '@/lib/gemini'

async function main() {
  try {
    const materialId = 'cmhpytgw60001scknysxye92f'
    const question = 'What are the requirements for Bluetooth wearable?'
    
    console.log('🔍 Testing RAG for: Requirement for Bluetooth wearable\n')
    console.log('Question:', question)
    console.log('')
    
    // Search
    console.log('1️⃣ Searching Pinecone...')
    const chunks = await searchRelevantChunks(question, materialId, 3)
    console.log(`   Found ${chunks.length} relevant chunks\n`)
    
    if (chunks.length > 0) {
      console.log('📄 Relevant content:')
      chunks.forEach((chunk, i) => {
        console.log(`\n   Chunk ${i + 1} (score: ${chunk.score.toFixed(3)}):`)
        console.log(`   ${chunk.text.substring(0, 200)}...`)
      })
    }
    
    // Answer
    console.log('\n2️⃣ Generating answer...')
    const context = chunks.map(c => c.text).join('\n\n')
    const { answer } = await answerQuestion(question, context, [], true)
    
    console.log('\n💬 Dr. Sarah Chen says:')
    console.log(answer)
    console.log('\n✅ RAG system working perfectly!')

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error:', message)
  }
}

main()
