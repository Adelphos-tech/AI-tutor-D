import 'dotenv/config'
import { processDocument } from '@/lib/file-processor'
import { PrismaClient } from '@/generated/prisma/client'

const prisma = new PrismaClient()

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error'

async function main() {
  try {
    const materials = await prisma.material.findMany({
      where: { processingStatus: 'ERROR' },
      orderBy: { uploadDate: 'desc' }
    })

    console.log(`\n📚 Found ${materials.length} materials in ERROR status\n`)

    for (const material of materials) {
      console.log(`\n🔄 Processing: ${material.title}`)
      console.log(`   File: ${material.fileUrl}`)
      
      try {
        const result = await processDocument(material.fileUrl, material.fileType)
        
        await prisma.material.update({
          where: { id: material.id },
          data: {
            pageCount: result.pageCount,
            processingStatus: 'READY'
          }
        })

        console.log(`   ✅ Success! ${result.pageCount} pages, ${result.text.length} chars`)
      } catch (error: unknown) {
        console.log(`   ❌ Failed: ${getErrorMessage(error)}`)
      }
    }

    console.log('\n🎉 Done!')

  } catch (error: unknown) {
    console.error('❌ Error:', getErrorMessage(error))
  } finally {
    await prisma.$disconnect()
  }
}

main()
