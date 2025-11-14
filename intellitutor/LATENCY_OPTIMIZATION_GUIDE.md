# Latency Optimization Guide for Real-Time Conversation

## Current Latency Issues Identified

### 1. **Gemini TTS Latency** (2-4 seconds)
**Problem**: Gemini TTS generates the entire audio before returning
- API call: ~1-2 seconds
- Audio generation: ~1-2 seconds  
- Network transfer: ~0.5 seconds
- **Total**: 2-4 seconds

### 2. **No Streaming Support**
**Problem**: Must wait for complete audio before playback starts

### 3. **STT Delays**
**Problem**: Web Speech API waits for silence before finalizing

## Solutions Implemented

### ✅ **Interruption Support**
- `stopSpeaking()` now aborts API requests mid-flight
- Cleans up audio immediately when interrupted
- No error messages on intentional interruption

### ✅ **Audio Caching**
- 5-minute cache for repeated phrases
- Instant playback for cached audio (0ms latency)
- Smart cache management (keeps 20 most recent)

### ✅ **Continuous STT Mode**
- `continuous: true` - keeps listening
- `interimResults: true` - shows partial transcripts
- Faster feedback to user

### ✅ **Optimized Text Length**
- Max 1000 characters for Gemini TTS
- Shorter texts = faster generation

## Recommended Solutions for Better Latency

### 🚀 **Option 1: Use Google Cloud TTS (Fastest)**
**Latency**: ~500ms - 1 second

```typescript
// Already implemented in your codebase
// Switch engine from 'gemini' to 'google-cloud'
const voiceOptions = {
  name: 'en-US-Neural2-F',
  engine: 'google-cloud'
}
```

**Pros**:
- Much faster than Gemini TTS
- Reliable and stable
- Good voice quality

**Cons**:
- Slightly less natural than Gemini voices
- Requires Google Cloud credentials

### 🚀 **Option 2: Text Chunking**
Split long responses into smaller chunks and play them sequentially

```typescript
function chunkText(text: string, maxLength = 200): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const chunks: string[] = []
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += sentence
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim())
  return chunks
}

// Play chunks sequentially
async function speakInChunks(text: string) {
  const chunks = chunkText(text)
  for (const chunk of chunks) {
    await speak(chunk)
  }
}
```

### 🚀 **Option 3: Preload Common Responses**
Cache frequently used phrases on app load

```typescript
const COMMON_PHRASES = [
  "Let me explain that concept.",
  "That's a great question!",
  "Let's break this down step by step.",
  "Would you like me to elaborate?",
]

// Preload on component mount
useEffect(() => {
  COMMON_PHRASES.forEach(phrase => {
    speak(phrase, { voice: selectedVoice })
      .then(() => stopSpeaking()) // Generate but don't play
  })
}, [])
```

### 🚀 **Option 4: Parallel Processing**
Start TTS generation while AI is still thinking

```typescript
async function processWithParallelTTS(userInput: string) {
  // Start AI response generation
  const aiPromise = fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: userInput })
  })
  
  // As soon as we get first chunk of response, start TTS
  const response = await aiPromise
  const reader = response.body?.getReader()
  
  let fullText = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const chunk = new TextDecoder().decode(value)
    fullText += chunk
    
    // Start speaking as soon as we have a complete sentence
    if (chunk.includes('.') || chunk.includes('!') || chunk.includes('?')) {
      speak(fullText)
      fullText = ''
    }
  }
}
```

## Performance Comparison

| Method | First Response | Cached Response | Interruption |
|--------|---------------|-----------------|--------------|
| **Gemini TTS** | 2-4s | Instant | ✅ Yes |
| **Google Cloud TTS** | 0.5-1s | Instant | ✅ Yes |
| **Chunked TTS** | 0.5-1s | Instant | ✅ Yes |
| **Preloaded** | Instant | Instant | ✅ Yes |

## Recommended Configuration for Real-Time Conversation

```typescript
// Use faster Google Cloud TTS for conversation
const conversationVoices = [
  { name: 'en-US-Neural2-F', label: 'Neural Female', engine: 'google-cloud' },
  { name: 'en-US-Neural2-J', label: 'Neural Male', engine: 'google-cloud' },
]

// Keep Gemini for high-quality narration/teaching
const teachingVoices = [
  { name: 'GEMINI_PUCK', label: 'Puck', engine: 'gemini' },
  { name: 'GEMINI_CHARON', label: 'Charon', engine: 'gemini' },
]
```

## Testing Latency

Add this to your component to measure actual latency:

```typescript
async function measureLatency(text: string) {
  const start = performance.now()
  
  await speak(text)
  
  const end = performance.now()
  console.log(`TTS Latency: ${(end - start).toFixed(0)}ms`)
}
```

## Next Steps

1. **Immediate**: Switch to Google Cloud TTS for conversation mode
2. **Short-term**: Implement text chunking for long responses
3. **Long-term**: Implement streaming TTS when Gemini supports it

## Real-Time Conversation Component

The `RealTimeConversation` component has been created with:
- ✅ Automatic interruption support
- ✅ Continuous listening mode
- ✅ Visual feedback for all states
- ✅ Context-aware conversation
- ✅ Interrupt button for manual control

Use it in your app:

```typescript
import RealTimeConversation from '@/components/RealTimeConversation'

<RealTimeConversation 
  selectedVoice="GEMINI_PUCK"
  onMessage={(msg) => console.log(msg)}
/>
```
