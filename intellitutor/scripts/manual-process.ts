import 'dotenv/config'
import { processDocument } from '@/lib/file-processor'
import { PrismaClient } from '@/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const materialId = 'cmhpvlh300001scmvblmytqbj'
    
    const material = await prisma.material.findUnique({
      where: { id: materialId }
    })

    if (!material) {
      console.log('Material not found')
      return
    }

    console.log('📖 Material:', material.title)
    console.log('📁 File:', material.fileUrl)
    console.log('📄 Type:', material.fileType)
    console.log('')

    console.log('🔄 Processing...')
    const result = await processDocument(material.fileUrl, material.fileType)
    
    console.log('✅ Success!')
    console.log('Pages:', result.pageCount)
    console.log('Text length:', result.text.length)
    console.log('First 200 chars:', result.text.substring(0, 200))

    // Update material
    await prisma.material.update({
      where: { id: materialId },
      data: {
        pageCount: result.pageCount,
        processingStatus: 'READY'
      }
    })

    console.log('\n✅ Material updated to READY status')

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message)
      console.error('\nStack:', error.stack)
    } else {
      console.error('❌ Unknown error while processing material')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
