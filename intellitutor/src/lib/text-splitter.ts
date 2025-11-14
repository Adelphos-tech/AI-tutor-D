/**
 * Advanced text splitter for chunking documents
 * Implements recursive character splitting with overlap
 */

export interface TextChunk {
  text: string
  index: number
  startChar: number
  endChar: number
  metadata?: Record<string, any>
}

export interface SplitterOptions {
  chunkSize?: number
  chunkOverlap?: number  // Default: 300 (30% overlap for better context)
  separators?: string[]
  keepSeparator?: boolean
}

/**
 * Default separators in order of preference
 * Try to split on larger units first (paragraphs, sentences, etc.)
 */
const DEFAULT_SEPARATORS = [
  '\n\n\n',  // Multiple newlines (section breaks)
  '\n\n',    // Double newlines (paragraphs)
  '\n',      // Single newlines
  '. ',      // Sentences
  '! ',      // Exclamations
  '? ',      // Questions
  '; ',      // Semicolons
  ', ',      // Commas
  ' ',       // Words
  ''         // Characters (last resort)
]

/**
 * Split text into chunks recursively
 * Tries to split on natural boundaries (paragraphs, sentences, etc.)
 */
export function splitTextRecursive(
  text: string,
  options: SplitterOptions = {}
): TextChunk[] {
  const {
    chunkSize = 1000,
    chunkOverlap = 300,  // Increased from 200 to 300 for better context retrieval
    separators = DEFAULT_SEPARATORS,
    keepSeparator = true
  } = options
  
  // Validate options
  if (chunkOverlap >= chunkSize) {
    throw new Error('chunkOverlap must be less than chunkSize')
  }
  
  const chunks: TextChunk[] = []
  let currentPosition = 0
  
  // Helper function to split by separator
  function splitBySeparator(text: string, separator: string): string[] {
    if (separator === '') {
      return text.split('')
    }
    
    if (keepSeparator) {
      // Keep separator with the text
      const parts: string[] = []
      const splits = text.split(separator)
      
      for (let i = 0; i < splits.length - 1; i++) {
        parts.push(splits[i] + separator)
      }
      if (splits[splits.length - 1]) {
        parts.push(splits[splits.length - 1])
      }
      
      return parts.filter(p => p.length > 0)
    } else {
      return text.split(separator).filter(p => p.length > 0)
    }
  }
  
  // Recursive splitting function
  function splitRecursive(
    text: string,
    separators: string[],
    startPos: number
  ): void {
    if (text.length <= chunkSize) {
      // Text is small enough, add as chunk
      if (text.trim().length > 0) {
        chunks.push({
          text: text.trim(),
          index: chunks.length,
          startChar: startPos,
          endChar: startPos + text.length
        })
      }
      return
    }
    
    // Try each separator
    for (const separator of separators) {
      const splits = splitBySeparator(text, separator)
      
      if (splits.length > 1) {
        // Successfully split, process each part
        let currentChunk = ''
        let chunkStart = startPos
        
        for (const split of splits) {
          if (currentChunk.length + split.length <= chunkSize) {
            // Add to current chunk
            currentChunk += split
          } else {
            // Current chunk is full
            if (currentChunk.trim().length > 0) {
              chunks.push({
                text: currentChunk.trim(),
                index: chunks.length,
                startChar: chunkStart,
                endChar: chunkStart + currentChunk.length
              })
            }
            
            // Start new chunk with overlap
            if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
              const overlapText = currentChunk.slice(-chunkOverlap)
              currentChunk = overlapText + split
              chunkStart = chunkStart + currentChunk.length - overlapText.length - split.length
            } else {
              currentChunk = split
              chunkStart = chunkStart + currentChunk.length - split.length
            }
          }
        }
        
        // Add remaining chunk
        if (currentChunk.trim().length > 0) {
          if (currentChunk.length > chunkSize) {
            // Still too large, continue splitting
            splitRecursive(currentChunk, separators.slice(1), chunkStart)
          } else {
            chunks.push({
              text: currentChunk.trim(),
              index: chunks.length,
              startChar: chunkStart,
              endChar: chunkStart + currentChunk.length
            })
          }
        }
        
        return
      }
    }
    
    // No separator worked, force split by character
    for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
      const chunk = text.slice(i, i + chunkSize)
      if (chunk.trim().length > 0) {
        chunks.push({
          text: chunk.trim(),
          index: chunks.length,
          startChar: startPos + i,
          endChar: startPos + i + chunk.length
        })
      }
    }
  }
  
  // Start recursive splitting
  splitRecursive(text, separators, 0)
  
  return chunks
}

/**
 * Split text by page (for documents with page markers)
 */
export function splitByPages(
  text: string,
  pageMarkers: Array<{ page: number; startIndex: number; endIndex: number }>
): Array<TextChunk & { pageNumber: number }> {
  return pageMarkers.map((marker, index) => ({
    text: text.slice(marker.startIndex, marker.endIndex).trim(),
    index,
    startChar: marker.startIndex,
    endChar: marker.endIndex,
    pageNumber: marker.page
  }))
}

/**
 * Split text with semantic awareness
 * Tries to keep related content together
 */
export function splitTextSemantic(
  text: string,
  options: SplitterOptions = {}
): TextChunk[] {
  // Use recursive splitting with semantic separators
  const semanticSeparators = [
    '\n\n\n',           // Section breaks
    '\n\n',             // Paragraphs
    '\n# ',             // Markdown headers
    '\n## ',
    '\n### ',
    '\n',               // Lines
    '. ',               // Sentences
    '! ',
    '? ',
    ' ',                // Words
    ''                  // Characters
  ]
  
  return splitTextRecursive(text, {
    ...options,
    separators: semanticSeparators
  })
}

/**
 * Create chunks with metadata
 */
export function createChunksWithMetadata(
  text: string,
  metadata: Record<string, any>,
  options: SplitterOptions = {}
): Array<TextChunk & { metadata: Record<string, any> }> {
  const chunks = splitTextRecursive(text, options)
  
  return chunks.map(chunk => ({
    ...chunk,
    metadata: {
      ...metadata,
      chunkIndex: chunk.index,
      totalChunks: chunks.length
    }
  }))
}

/**
 * Estimate optimal chunk size based on text length
 */
export function estimateOptimalChunkSize(textLength: number): number {
  if (textLength < 5000) return 500
  if (textLength < 20000) return 1000
  if (textLength < 100000) return 1500
  return 2000
}

/**
 * Get chunk statistics
 */
export function getChunkStats(chunks: TextChunk[]): {
  totalChunks: number
  avgChunkSize: number
  minChunkSize: number
  maxChunkSize: number
  totalCharacters: number
} {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      avgChunkSize: 0,
      minChunkSize: 0,
      maxChunkSize: 0,
      totalCharacters: 0
    }
  }
  
  const sizes = chunks.map(c => c.text.length)
  const totalCharacters = sizes.reduce((sum, size) => sum + size, 0)
  
  return {
    totalChunks: chunks.length,
    avgChunkSize: Math.round(totalCharacters / chunks.length),
    minChunkSize: Math.min(...sizes),
    maxChunkSize: Math.max(...sizes),
    totalCharacters
  }
}
