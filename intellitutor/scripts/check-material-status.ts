import 'dotenv/config'
import { PrismaClient } from '@/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { uploadDate: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        processingStatus: true,
        uploadDate: true,
        pageCount: true,
        _count: {
          select: {
            chapters: true,
            concepts: true
          }
        }
      }
    })

    console.log('\n📚 Recent Materials:\n')
    materials.forEach(m => {
      console.log(`📖 ${m.title}`)
      console.log(`   ID: ${m.id}`)
      console.log(`   Status: ${m.processingStatus}`)
      console.log(`   Pages: ${m.pageCount || 'Unknown'}`)
      console.log(`   Chapters: ${m._count.chapters}`)
      console.log(`   Concepts: ${m._count.concepts}`)
      console.log(`   Uploaded: ${m.uploadDate.toLocaleString()}`)
      console.log('')
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
