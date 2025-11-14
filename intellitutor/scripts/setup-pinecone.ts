import 'dotenv/config'
import { Pinecone } from '@pinecone-database/pinecone'

async function main() {
  try {
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    })

    console.log('🔍 Checking Pinecone indexes...\n')

    const indexes = await pc.listIndexes()
    console.log('Available indexes:', indexes.indexes?.map(i => i.name))

    const indexName = process.env.PINECONE_INDEX_NAME || 'intellitutor-vectors'
    const indexExists = indexes.indexes?.some(i => i.name === indexName)

    if (!indexExists) {
      console.log(`\n❌ Index "${indexName}" does not exist`)
      console.log('\n📝 Creating index...')
      
      await pc.createIndex({
        name: indexName,
        dimension: 768, // text-embedding-004 dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      })

      console.log('✅ Index created successfully!')
      console.log('⏳ Waiting for index to be ready (this may take 1-2 minutes)...')
      
      // Wait for index to be ready
      let ready = false
      while (!ready) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        const status = await pc.describeIndex(indexName)
        ready = status.status?.ready || false
        console.log('   Status:', status.status?.state)
      }

      console.log('✅ Index is ready!')
    } else {
      console.log(`\n✅ Index "${indexName}" already exists`)
      const index = pc.index(indexName)
      const stats = await index.describeIndexStats()
      console.log('   Total vectors:', stats.totalRecordCount)
      console.log('   Dimension:', stats.dimension)
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error:', message)
  }
}

main()
