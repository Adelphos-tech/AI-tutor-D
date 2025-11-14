# Hybrid Document Ingestion - Implementation Guide

## 🎯 Goal

Implement the exact backend flow from `Database_ingestion` repository, adapted for your Next.js system.

## 📊 Architecture Comparison

### **Their System (n8n + Hybrid)**
```
Browser → Extract & Chunk → n8n Webhook → OpenAI Embeddings → Pinecone
```

### **Your System (Next.js + Hybrid)**
```
Browser → Extract & Chunk → Next.js API → Local Embeddings → Pinecone
```

## 🔄 Complete Flow

### **Phase 1: Client-Side (Browser)**

```javascript
// 1. User uploads document
const file = event.target.files[0]

// 2. Extract text based on file type
let text = ''
if (file.type === 'application/pdf') {
  text = await extractPDFText(file)  // Using PDF.js
} else if (file.type.includes('word')) {
  text = await extractDOCXText(file) // Using Mammoth
} else if (file.type === 'text/plain') {
  text = await file.text()
}

// 3. Chunk text (1000 chars, 200 overlap)
const chunks = chunkText(text, 1000, 200)

// 4. Create payload
const formData = new FormData()
formData.append('file', file)  // Original file
formData.append('jsonData', JSON.stringify({
  metadata: {
    filename: file.name,
    fileType: file.type,
    totalChunks: chunks.length,
    fileSize: file.size
  },
  chunks: chunks.map((chunk, i) => ({
    text: chunk,
    chunk_index: i
  })),
  fullText: text
}))

// 5. Send to API
const response = await fetch('/api/materials/upload', {
  method: 'POST',
  body: formData
})
```

### **Phase 2: Server-Side (Next.js API)**

```typescript
// /api/materials/upload/route.ts

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  
  // Get original file
  const file = formData.get('file') as File
  
  // Get pre-processed data
  const jsonData = formData.get('jsonData') as string
  const processedData = JSON.parse(jsonData)
  
  // Option A: Use pre-processed chunks (FAST)
  const chunks = processedData.chunks
  const metadata = processedData.metadata
  
  // Option B: Re-process server-side (SECURE)
  // const doc = await loadDocument(filePath)
  // const chunks = splitTextRecursive(doc.text)
  
  // Save to database
  const material = await prisma.material.create({
    data: {
      title: metadata.filename,
      fileName: metadata.filename,
      fileSize: metadata.fileSize,
      fileType: metadata.fileType,
      processingStatus: 'PROCESSING'
    }
  })
  
  // Background processing
  processDocumentAsync(material.id, chunks)
  
  return NextResponse.json({ id: material.id })
}

async function processDocumentAsync(
  materialId: string,
  chunks: Array<{ text: string; chunk_index: number }>
) {
  try {
    // Generate embeddings locally (NO API CALLS!)
    const texts = chunks.map(c => c.text)
    const embeddings = await generateLocalEmbeddingsBatch(texts)
    
    // Upsert to Pinecone
    const vectors = chunks.map((chunk, i) => ({
      id: `${materialId}-chunk-${chunk.chunk_index}`,
      values: embeddings[i],
      metadata: {
        materialId,
        text: chunk.text,
        chunkIndex: chunk.chunk_index
      }
    }))
    
    await index.upsert(vectors)
    
    // Update status
    await prisma.material.update({
      where: { id: materialId },
      data: { processingStatus: 'READY' }
    })
    
  } catch (error) {
    await prisma.material.update({
      where: { id: materialId },
      data: { processingStatus: 'ERROR' }
    })
  }
}
```

### **Phase 3: Retrieval (Q&A)**

```typescript
// /api/chat/route.ts

export async function POST(request: NextRequest) {
  const { materialId, question } = await request.json()
  
  // 1. Generate query embedding (locally)
  const queryEmbedding = await generateLocalEmbedding(question)
  
  // 2. Search Pinecone
  const results = await index.query({
    vector: queryEmbedding,
    topK: 5,
    filter: { materialId }
  })
  
  // 3. Build context from results
  const context = results.matches
    .map(m => m.metadata.text)
    .join('\n\n')
  
  // 4. Generate answer with Gemini
  const answer = await answerQuestion(question, context)
  
  return NextResponse.json({ answer })
}
```

## 🆕 Key Improvements Over n8n System

### **1. Local Embeddings (Your Advantage)**

**Their System:**
```
n8n → OpenAI API → $0.0001 per 1K tokens
100-page PDF = ~$0.50
```

**Your System:**
```
Next.js → Local Transformers.js → FREE
100-page PDF = $0.00
```

### **2. No Middleware**

**Their System:**
```
Browser → n8n → OpenAI → Pinecone
(3 hops, potential failures at each)
```

**Your System:**
```
Browser → Next.js → Pinecone
(2 hops, simpler, faster)
```

### **3. Better Security**

**Their System:**
- n8n webhook exposed
- API keys in n8n
- Multiple services to secure

**Your System:**
- Next.js API routes (built-in auth)
- API keys in .env (server-only)
- Single service to secure

## 📦 Implementation Steps

### **Step 1: Create Client-Side Extractor**

Create `src/lib/client-document-processor.ts`:

```typescript
// Browser-side document processing
export async function extractTextFromFile(file: File): Promise<string> {
  const type = file.type
  
  if (type === 'application/pdf') {
    return await extractPDFText(file)
  } else if (type.includes('word')) {
    return await extractDOCXText(file)
  } else if (type === 'text/plain') {
    return await file.text()
  }
  
  throw new Error('Unsupported file type')
}

async function extractPDFText(file: File): Promise<string> {
  // Use PDF.js in browser
  const pdfjsLib = await import('pdfjs-dist')
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
  
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item: any) => item.str).join(' ')
  }
  
  return text
}

export function chunkTextClient(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = []
  let start = 0
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start = end - overlap
    if (start >= text.length) break
  }
  
  return chunks
}
```

### **Step 2: Update Upload Component**

```typescript
// src/app/library/upload/page.tsx

async function handleUpload(file: File) {
  setStatus('Extracting text...')
  
  // Extract text in browser
  const text = await extractTextFromFile(file)
  
  setStatus('Chunking text...')
  
  // Chunk in browser
  const chunks = chunkTextClient(text, 1000, 200)
  
  setStatus(`Uploading ${chunks.length} chunks...`)
  
  // Send to server
  const formData = new FormData()
  formData.append('file', file)
  formData.append('jsonData', JSON.stringify({
    metadata: {
      filename: file.name,
      fileType: file.type,
      totalChunks: chunks.length,
      fileSize: file.size
    },
    chunks: chunks.map((chunk, i) => ({
      text: chunk,
      chunk_index: i
    })),
    fullText: text
  }))
  
  const response = await fetch('/api/materials/upload', {
    method: 'POST',
    body: formData
  })
  
  setStatus('Processing embeddings...')
  
  // Poll for completion
  const result = await response.json()
  pollStatus(result.id)
}
```

### **Step 3: Update API Route**

```typescript
// src/app/api/materials/upload/route.ts

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const jsonDataStr = formData.get('jsonData') as string
  
  // Parse pre-processed data
  const jsonData = JSON.parse(jsonDataStr)
  
  // Save material
  const material = await prisma.material.create({
    data: {
      title: jsonData.metadata.filename,
      fileName: jsonData.metadata.filename,
      fileSize: jsonData.metadata.fileSize,
      fileType: jsonData.metadata.fileType,
      processingStatus: 'PROCESSING',
      pageCount: Math.ceil(jsonData.chunks.length / 2) // Estimate
    }
  })
  
  // Process in background
  processChunksAsync(material.id, jsonData.chunks)
  
  return NextResponse.json({
    id: material.id,
    message: 'Processing started'
  })
}
```

## ✅ Benefits of This Approach

1. ✅ **Faster Upload** - Text extraction in browser (parallel)
2. ✅ **Better UX** - Real-time progress feedback
3. ✅ **Reduced Server Load** - Heavy processing offloaded to client
4. ✅ **Local Embeddings** - No API costs (better than n8n)
5. ✅ **Direct Pinecone** - No middleware (simpler than n8n)
6. ✅ **More Secure** - API keys never exposed to client

## 🎯 Final Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (Client)                     │
│                                                         │
│  1. Upload File                                        │
│  2. Extract Text (PDF.js, Mammoth)                     │
│  3. Chunk Text (1000 chars, 200 overlap)               │
│  4. Show Progress                                      │
│  5. Send to Server                                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                 NEXT.JS API (Server)                    │
│                                                         │
│  1. Receive File + Pre-processed Chunks                │
│  2. Save to Database                                   │
│  3. Generate Embeddings (LOCAL - Transformers.js)      │
│  4. Upsert to Pinecone                                 │
│  5. Update Status                                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  PINECONE (Vector DB)                   │
│                                                         │
│  - Store 384D embeddings                               │
│  - Metadata: text, materialId, chunkIndex              │
│  - Fast semantic search                                │
└─────────────────────────────────────────────────────────┘
```

## 📝 Next Steps

1. ✅ Install client-side libraries: `npm install pdfjs-dist mammoth`
2. ✅ Create `client-document-processor.ts`
3. ✅ Update upload component with progress UI
4. ✅ Modify API route to accept pre-processed chunks
5. ✅ Test with various file types
6. ✅ Deploy and monitor

**Your system will be better than the n8n version because you have local embeddings!** 🚀
