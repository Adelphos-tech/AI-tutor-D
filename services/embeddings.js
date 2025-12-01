class EmbeddingService {
  constructor() {
    this.embedder = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2'; // Lightweight, fast embedding model
    this.pipeline = null;
  }

  async initialize() {
    if (!this.embedder) {
      try {
        console.log('Loading embedding model...');
        // Dynamic import for ES Module
        const { pipeline } = await import('@xenova/transformers');
        this.pipeline = pipeline;
        this.embedder = await pipeline('feature-extraction', this.modelName);
        console.log('Embedding model loaded successfully');
      } catch (error) {
        console.error('Failed to load embedding model:', error);
        // Don't throw error during server startup - just log it
        this.embedder = null;
      }
    }
    return this.embedder;
  }

  async generateEmbedding(text) {
    if (!this.embedder) {
      await this.initialize();
    }

    try {
      // Clean and prepare text
      const cleanText = text.replace(/\s+/g, ' ').trim();
      if (!cleanText) {
        throw new Error('Empty text provided for embedding');
      }

      // Generate embedding
      const output = await this.embedder(cleanText, {
        pooling: 'mean',
        normalize: true
      });

      // Convert to array format expected by Pinecone
      const embedding = Array.from(output.data);
      
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts) {
    if (!this.embedder) {
      await this.initialize();
    }

    const embeddings = [];
    for (const text of texts) {
      try {
        const embedding = await this.generateEmbedding(text);
        embeddings.push(embedding);
      } catch (error) {
        console.error(`Error embedding text: ${text.substring(0, 100)}...`, error);
        // Push null for failed embeddings to maintain array alignment
        embeddings.push(null);
      }
    }

    return embeddings;
  }

  // Chunk text into smaller pieces for better embedding
  chunkText(text, maxChunkSize = 500, overlap = 50) {
    const words = text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += maxChunkSize - overlap) {
      const chunk = words.slice(i, i + maxChunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push({
          text: chunk.trim(),
          startIndex: i,
          endIndex: Math.min(i + maxChunkSize, words.length)
        });
      }
    }

    return chunks;
  }
}

// Singleton instance
const embeddingService = new EmbeddingService();

module.exports = embeddingService;
