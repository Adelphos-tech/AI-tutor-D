import 'dotenv/config'
import { Pinecone } from '@pinecone-database/pinecone'

async function main() {
  try {
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    })

    console.log('📊 Pinecone Indexes:\n')

    const indexes = await pc.listIndexes()
    
    for (const idx of indexes.indexes || []) {
      console.log(`📦 ${idx.name}`)
      try {
        const index = pc.index(idx.name)
        const stats = await index.describeIndexStats()
        console.log(`   Vectors: ${stats.totalRecordCount}`)
        console.log(`   Dimension: ${stats.dimension}`)
        console.log(`   Namespaces: ${Object.keys(stats.namespaces || {}).length}`)
        console.log('')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.log(`   (Unable to get stats: ${message})`)
        console.log('')
      }
    }

    console.log(`\nTotal: ${indexes.indexes?.length || 0}/5 indexes used`)

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error:', message)
  }
}

main()
