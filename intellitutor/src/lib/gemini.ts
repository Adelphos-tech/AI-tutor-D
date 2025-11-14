import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai'
import { GEMINI_VOICE_PRESETS } from './voice-presets'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Export genAI for reuse in other modules
export { genAI }

// Get the Gemini Pro model for text generation
export const getGeminiModel = () => {
  // Use gemini-2.0-flash-exp for latest generation
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
}

// Generate embeddings for text (for vector search)
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  const result = await model.embedContent(text)
  return result.embedding.values
}

// Generate summary using Gemini
export async function generateSummary(
  text: string,
  length: 'brief' | 'standard' | 'detailed' = 'standard'
): Promise<string> {
  const model = getGeminiModel()
  
  const lengthInstructions = {
    brief: 'in 1 concise paragraph (100-150 words)',
    standard: 'in 3 well-structured paragraphs (250-350 words)',
    detailed: 'in 5-7 comprehensive paragraphs (500-700 words)'
  }
  
  const prompt = `Summarize the following text ${lengthInstructions[length]}. Focus on the main topics, key arguments, and important conclusions:\n\n${text}`
  
  const result = await model.generateContent(prompt)
  return result.response.text()
}

// Extract key concepts from text
export async function extractKeyConcepts(text: string): Promise<Array<{
  term: string
  definition: string
  category: string
}>> {
  const model = getGeminiModel()
  
  const prompt = `Extract key concepts, definitions, formulas, and important terms from the following text. Return them as a JSON array with the format: [{"term": "...", "definition": "...", "category": "DEFINITION|FORMULA|DATE|NAME|EVENT|OTHER"}]. Only return the JSON array, no additional text.\n\nText:\n${text}`
  
  const result = await model.generateContent(prompt)
  const responseText = result.response.text()
  
  try {
    // Remove markdown code blocks if present
    const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(jsonText)
  } catch (error) {
    console.error('Error parsing concepts:', error)
    return []
  }
}

// Generate practice questions for a chapter
export async function generatePracticeQuestions(text: string, count: number = 5): Promise<Array<{
  question: string
  answer: string
  difficulty: string
}>> {
  const model = getGeminiModel()
  
  const prompt = `Generate ${count} practice questions based on the following text. Include a mix of easy, medium, and hard questions. Return them as a JSON array with the format: [{"question": "...", "answer": "...", "difficulty": "easy|medium|hard"}]. Only return the JSON array, no additional text.\n\nText:\n${text}`
  
  const result = await model.generateContent(prompt)
  const responseText = result.response.text()
  
  try {
    const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(jsonText)
  } catch (error) {
    console.error('Error parsing questions:', error)
    return []
  }
}

// Answer questions based on context (RAG)
export async function answerQuestion(
  question: string,
  context: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  usePhdPersona: boolean = false
): Promise<{ answer: string; citations: number[] }> {
  const model = getGeminiModel()
  
  // Alex - AI Tutor Persona
  const phdPersona = `You are Alex, a friendly and insightful AI tutor with deep expertise across all academic subjects.

[Your Teaching Style]
- Encouraging, patient, and conversational with natural speech patterns
- Include phrases like "hmm," "let's see," "good question," or "that's a great way to think about it"
- Speak confidently but remain humble with complex topics, guiding step-by-step
- Weave explanations into natural conversation without rigid lists

[How You Respond]
- Give clear, step-by-step explanations rather than just final answers
- Emphasize core concepts and "a-ha" moments to build understanding
- Provide context-aware responses that build on previous questions
- Proactively suggest related concepts or practice problems when appropriate
- Share learning strategies and memory aids (mnemonics, analogies)

[Your Approach]
- Break down complex problems into manageable steps
- Use real-world examples and analogies to clarify concepts
- Celebrate progress ("Great job working through that!")
- Ask clarifying questions when needed ("Are you asking about X or Y?")
- Build toward clear understanding ("Does that step make sense?")
- Reference concepts the student struggled with or mastered earlier

[Error Handling]
- Never say "I don't know" - instead ask clarifying questions
- Transform knowledge gaps into learning opportunities
- For unclear questions: "Let me make sure I understand - are you asking about...?"
- Always pursue the exact answer by breaking problems down

Remember: You're not just answering questions - you're building understanding and confidence. Be warm, natural, and genuinely invested in the student's learning journey.`

  const basicPersona = `You are an expert tutor. Answer the following question based ONLY on the provided context from the textbook. Always cite page numbers when referencing information. If the answer is not in the context, say "I couldn't find information about that in this textbook."`
  
  let prompt = usePhdPersona ? phdPersona : basicPersona
  prompt += `\n\n`
  
  if (conversationHistory && conversationHistory.length > 0) {
    prompt += `Previous conversation:\n`
    conversationHistory.forEach(msg => {
      prompt += `${msg.role}: ${msg.content}\n`
    })
    prompt += `\n`
  }
  
  prompt += `Context from textbook:\n${context}\n\nQuestion: ${question}\n\nAnswer (include page references, speak naturally and conversationally):`
  
  const result = await model.generateContent(prompt)
  const answer = result.response.text()
  
  // Extract page numbers from the answer
  const pageMatches = answer.match(/\b(?:page|p\.?)\s*(\d+)/gi) || []
  const citations = pageMatches.map(match => {
    const num = match.match(/\d+/)
    return num ? parseInt(num[0]) : 0
  }).filter(n => n > 0)
  
  return { answer, citations: [...new Set(citations)] }
}

// Text-to-Speech using Gemini (Note: Gemini API doesn't have native TTS yet)
// We'll use Web Speech API as a fallback for now
export async function textToSpeech(text: string, _voice: string = 'default'): Promise<string> {
  void _voice
  // For now, we'll return the text and use browser's Web Speech API
  // In production, you'd integrate with Google Cloud Text-to-Speech API
  // which supports high-quality voices
  return text
}

// Speech-to-Text using Web Speech API (browser-based)
// For production, you'd use Google Cloud Speech-to-Text API
export function startSpeechRecognition(
  _onResult: (transcript: string) => void,
  _onError: (error: string) => void
): () => void {
  void _onResult
  void _onError
  // This will be implemented in the client-side component
  // using the Web Speech API
  return () => {}
}

const GEMINI_SPEECH_MODEL = process.env.GEMINI_SPEECH_MODEL || 'gemini-2.5-flash-preview-tts'

type GeminiDialogueLine = {
  speaker?: string
  text: string
  voice?: string
}

export async function generateGeminiSpeech({
  text,
  voice,
  style,
  dialogue,
}: {
  text: string
  voice?: string
  style?: string
  dialogue?: GeminiDialogueLine[]
}): Promise<{ audio: string; contentType: string }> {
  const targetVoice = voice?.toUpperCase() as keyof typeof GEMINI_VOICE_PRESETS | undefined
  const voicePreset = (targetVoice && GEMINI_VOICE_PRESETS[targetVoice])
    ? GEMINI_VOICE_PRESETS[targetVoice]
    : GEMINI_VOICE_PRESETS.PUCK

  const normalizedDialogue = dialogue?.length
    ? dialogue.map((line, idx) => {
        const label = line.speaker || `Speaker ${idx + 1}`
        const customVoice = line.voice ? ` (${line.voice})` : ''
        return `${label}${customVoice}: ${line.text}`
      }).join('\n')
    : text

  // Simplified instructions for faster processing
  const instructions = style ? `${normalizedDialogue}` : normalizedDialogue

  const model = genAI.getGenerativeModel({ model: GEMINI_SPEECH_MODEL })

  const speechGenerationConfig = {
    responseModalities: ['AUDIO'],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voicePreset.preset
        }
      }
    },
    // Enable faster processing
    temperature: 0.7,
    topP: 0.9,
    topK: 40
  } as Record<string, unknown>

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: instructions }]
      }
    ],
    generationConfig: speechGenerationConfig as GenerationConfig
  })

  const audioPart = result.response?.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.mimeType?.startsWith('audio/')
  )

  const audioData = audioPart?.inlineData?.data
  if (!audioData) {
    throw new Error('Gemini speech response did not contain audio data')
  }

  return {
    audio: audioData,
    contentType: audioPart.inlineData?.mimeType || 'audio/mpeg'
  }
}
