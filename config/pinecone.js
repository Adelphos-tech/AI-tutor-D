const { Pinecone } = require('@pinecone-database/pinecone');

let pinecone;
let index;

async function initializePinecone() {
  try {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    // Get the index
    index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    
    console.log('Pinecone initialized successfully');
    return { pinecone, index };
  } catch (error) {
    console.error('Pinecone initialization error:', error);
    throw error;
  }
}

function getPineconeIndex() {
  if (!index) {
    throw new Error('Pinecone not initialized. Call initializePinecone() first.');
  }
  return index;
}

module.exports = {
  initializePinecone,
  getPineconeIndex
};
