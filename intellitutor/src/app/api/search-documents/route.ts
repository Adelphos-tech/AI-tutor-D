/**
 * API Route for Document Search
 * Searches Pinecone from server-side (avoids client-side Node.js module issues)
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchRelevantChunks } from '@/lib/pinecone'
import { searchCache } from '@/lib/search-cache'

export async function POST(request: NextRequest) {
  try {
    const { query, materialId, topK = 5 } = await request.json()

    if (!query || !materialId) {
      return NextResponse.json(
        { error: 'Missing query or materialId' },
        { status: 400 }
      )
    }

    // Check cache first
    const cached = searchCache.get(query, materialId)
    if (cached) {
      return NextResponse.json({
        results: cached,
        summary: `Found ${cached.length} relevant sections from the document.`,
        cached: true
      })
    }

    console.log(`🔍 Searching documents for: "${query}" in material ${materialId}`)
    console.time('⏱️ Search time')

    const results = await searchRelevantChunks(query, materialId, topK)

    console.timeEnd('⏱️ Search time')
    console.log(`✅ Found ${results.length} relevant chunks`)

    const formattedResults = results.map((result, index) => ({
      chunk: index + 1,
      content: result.text,
      page: result.pageNumber,
      relevance: result.score
    }))

    // Cache the results
    searchCache.set(query, materialId, formattedResults)

    return NextResponse.json({
      results: formattedResults,
      summary: `Found ${results.length} relevant sections from the document.`,
      cached: false
    })
  } catch (error) {
    console.error('❌ Document search failed:', error)
    return NextResponse.json(
      { error: 'Failed to search documents' },
      { status: 500 }
    )
  }
}
