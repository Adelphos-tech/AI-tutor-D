/**
 * Local embeddings using Transformers.js
 * No API calls - runs entirely in Node.js
 */

import { getEmbeddingModel } from './embedding-singleton'

/**
 * Get the embedding pipeline (uses singleton)
 */
async function getEmbeddingPipeline() {
  return getEmbeddingModel()
}

/**
 * Generate embeddings locally (no API calls)
 * @param text - Text to embed
 * @returns 384-dimensional embedding vector
 */
export async function generateLocalEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await getEmbeddingPipeline()
    
    // Generate embedding
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true
    })
    
    // Convert to array
    const embedding = Array.from(output.data) as number[]
    
    return embedding
  } catch (error) {
    console.error('Local embedding error:', error)
    throw new Error('Failed to generate local embedding')
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateLocalEmbedding multiple times
 */
export async function generateLocalEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  try {
    const extractor = await getEmbeddingPipeline()
    
    // Process in batches of 32 for memory efficiency
    const batchSize = 32
    const allEmbeddings: number[][] = []
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      
      const outputs = await Promise.all(
        batch.map(text => 
          extractor(text, {
            pooling: 'mean',
            normalize: true
          })
        )
      )
      
      const embeddings = outputs.map(output => Array.from(output.data) as number[])
      allEmbeddings.push(...embeddings)
    }
    
    return allEmbeddings
  } catch (error) {
    console.error('Batch embedding error:', error)
    throw new Error('Failed to generate batch embeddings')
  }
}

/**
 * Get embedding dimension
 * all-MiniLM-L6-v2 produces 384-dimensional embeddings
 */
export const EMBEDDING_DIMENSION = 384

/**
 * Warm up the model (optional - call on server start)
 * This loads the model into memory so first embedding is faster
 */
export async function warmupEmbeddingModel() {
  console.log('🔥 Warming up embedding model...')
  await generateLocalEmbedding('test')
  console.log('✅ Embedding model ready')
}
