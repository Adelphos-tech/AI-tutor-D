/**
 * Embedding Model Singleton
 * Load once at server startup, reuse for all requests
 */

import { pipeline, env } from '@xenova/transformers'

// Configure transformers
env.allowRemoteModels = true
env.allowLocalModels = true
env.cacheDir = './models'

let embeddingPipeline: any = null
let isLoading = false
let loadPromise: Promise<any> | null = null

/**
 * Get or initialize the embedding pipeline
 * Ensures model is loaded only once
 */
export async function getEmbeddingModel() {
  // Return cached model if available
  if (embeddingPipeline) {
    return embeddingPipeline
  }

  // Wait for ongoing load if in progress
  if (isLoading && loadPromise) {
    return loadPromise
  }

  // Start loading
  isLoading = true
  loadPromise = (async () => {
    try {
      console.log('🔧 Loading embedding model (one-time initialization)...')
      const startTime = Date.now()
      
      embeddingPipeline = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      )
      
      const loadTime = Date.now() - startTime
      console.log(`✅ Embedding model loaded and cached (${loadTime}ms)`)
      
      return embeddingPipeline
    } catch (error) {
      console.error('❌ Failed to load embedding model:', error)
      isLoading = false
      loadPromise = null
      throw error
    }
  })()

  return loadPromise
}

/**
 * Pre-warm the model on server startup
 */
export async function warmupEmbeddingModel() {
  try {
    const model = await getEmbeddingModel()
    // Run a test embedding to ensure everything works
    await model('test', { pooling: 'mean', normalize: true })
    console.log('🔥 Embedding model warmed up and ready')
  } catch (error) {
    console.error('⚠️ Failed to warm up embedding model:', error)
  }
}
