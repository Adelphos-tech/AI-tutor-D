import 'dotenv/config'
import { searchRelevantChunks } from '@/lib/pinecone'
import { answerQuestion } from '@/lib/gemini'

async function main() {
  try {
    const materialId = 'cmhpvlh300001scmvblmytqbj'
    const question = 'What is this datasheet about?'
    
    console.log('🔍 Testing RAG system...\n')
    console.log('Question:', question)
    console.log('')
    
    // Search for relevant chunks
    console.log('1️⃣ Searching Pinecone...')
    const chunks = await searchRelevantChunks(question, materialId, 3)
    console.log(`   Found ${chunks.length} relevant chunks`)
    
    if (chunks.length > 0) {
      console.log('\n📄 Relevant content:')
      chunks.forEach((chunk, i) => {
        console.log(`\n   Chunk ${i + 1} (score: ${chunk.score.toFixed(3)}):`)
        console.log(`   ${chunk.text.substring(0, 150)}...`)
      })
    }
    
    // Generate answer
    console.log('\n2️⃣ Generating answer with Gemini...')
    const context = chunks.map(c => c.text).join('\n\n')
    const { answer } = await answerQuestion(question, context, [], true)
    
    console.log('\n💬 Answer:')
    console.log(answer)
    console.log('\n✅ RAG system working!')

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error:', message)
    console.error(error)
  }
}

main()
