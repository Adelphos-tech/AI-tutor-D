import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // TODO: Get userId from session
    const userId = 'demo-user-id'

    const materials = await prisma.material.findMany({
      where: { userId },
      orderBy: { uploadDate: 'desc' },
      select: {
        id: true,
        title: true,
        author: true,
        uploadDate: true,
        processingStatus: true,
        pageCount: true,
        isFavorite: true,
        categories: true
      }
    })

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    )
  }
}
