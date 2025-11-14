// Cleanup script for failed materials
// Run this to clean up materials stuck in ERROR or PROCESSING state

// Use dynamic import since this is ESM
async function getPrisma() {
  const { prisma } = await import('./src/lib/prisma.ts')
  return prisma
}

async function cleanup() {
  const prisma = await getPrisma()
  
  try {
    console.log('🧹 Starting cleanup...')
    
    // Find all failed materials
    const failedMaterials = await prisma.material.findMany({
      where: {
        OR: [
          { processingStatus: 'ERROR' },
          { processingStatus: 'PROCESSING' }
        ]
      }
    })
    
    console.log(`📊 Found ${failedMaterials.length} failed materials`)
    
    for (const material of failedMaterials) {
      console.log(`\n🗑️  Cleaning material: ${material.id}`)
      console.log(`   Title: ${material.title}`)
      console.log(`   Status: ${material.processingStatus}`)
      
      // Delete chapters
      const deletedChapters = await prisma.chapter.deleteMany({
        where: { materialId: material.id }
      })
      console.log(`   ✅ Deleted ${deletedChapters.count} chapters`)
      
      // Delete concepts
      const deletedConcepts = await prisma.concept.deleteMany({
        where: { materialId: material.id }
      })
      console.log(`   ✅ Deleted ${deletedConcepts.count} concepts`)
      
      // Reset status to PROCESSING so it can be retried
      await prisma.material.update({
        where: { id: material.id },
        data: { processingStatus: 'PROCESSING' }
      })
      console.log(`   ✅ Reset status to PROCESSING`)
    }
    
    console.log(`\n✅ Cleanup complete!`)
    console.log(`\n💡 You can now retry uploading these materials`)
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanup()
