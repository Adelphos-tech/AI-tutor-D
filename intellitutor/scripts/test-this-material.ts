import 'dotenv/config'
import { searchRelevantChunks } from '@/lib/pinecone'
import { answerQuestion } from '@/lib/gemini'

async function main() {
  try {
    const materialId = 'cmhp2ey2r0003scnybwvad1gi'
    const question = 'summarize this paper'
    
    console.log('🔍 Testing: Fine_Time_Measurement\n')
    console.log('Question:', question)
    console.log('')
    
    console.log('1️⃣ Searching Pinecone...')
    const chunks = await searchRelevantChunks(question, materialId, 5)
    console.log(`   Found ${chunks.length} relevant chunks\n`)
    
    if (chunks.length > 0) {
      console.log('📄 Top chunk:')
      console.log(`   ${chunks[0].text.substring(0, 200)}...\n`)
    }
    
    console.log('2️⃣ Generating answer...')
    const context = chunks.map(c => c.text).join('\n\n')
    const { answer } = await answerQuestion(question, context, [], true)
    
    console.log('\n💬 Answer:')
    console.log(answer)
    console.log('\n✅ Working!')

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error:', message)
  }
}

main()
