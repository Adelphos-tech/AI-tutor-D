import 'dotenv/config'
import { PrismaClient } from '@/generated/prisma/client'
import { processDocument } from '@/lib/file-processor'
import { chunkText, upsertDocumentChunks } from '@/lib/pinecone'

const prisma = new PrismaClient()

async function main() {
  try {
    const materials = await prisma.material.findMany({
      where: { processingStatus: 'READY' }
    })

    console.log(`\n📚 Found ${materials.length} materials to vectorize\n`)

    for (const material of materials) {
      console.log(`\n🔄 Processing: ${material.title}`)
      
      try {
        // Get the document text
        const { text } = await processDocument(material.fileUrl, material.fileType)
        
        // Chunk the text
        const textChunks = chunkText(text, 1000, 200)
        console.log(`   Created ${textChunks.length} chunks`)
        
        // Create chunk objects with metadata
        const chunks = textChunks.map((chunkText, index) => ({
          id: `${material.id}-chunk-${index}`,
          text: chunkText,
          pageNumber: Math.floor(index / 3) + 1, // Rough estimate
          chapterNumber: 0
        }))
        
        // Upload to Pinecone
        console.log(`   Uploading to Pinecone...`)
        await upsertDocumentChunks(material.id, chunks)
        
        console.log(`   ✅ Success! Uploaded ${chunks.length} vectors`)
        
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.log(`   ❌ Failed: ${message}`)
      }
    }

    console.log('\n🎉 Done!')

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error:', message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
