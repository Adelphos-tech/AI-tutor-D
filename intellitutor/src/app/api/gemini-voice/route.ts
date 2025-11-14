/**
 * Gemini Voice API Route
 * Handles audio input and returns both text transcript and audio response
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

/**
 * Smart intent detection - determines if query needs document search
 */
function shouldSearchDocuments(text: string): boolean {
  const lowerText = text.toLowerCase().trim()
  
  // Skip search for simple greetings
  const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening']
  if (greetings.some(g => lowerText === g || lowerText.startsWith(g + ' '))) {
    return false
  }
  
  // Skip very short queries (likely greetings)
  if (lowerText.length < 10) {
    return false
  }
  
  // Search for questions
  const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'explain', 'tell me', 'describe']
  if (questionWords.some(q => lowerText.includes(q))) {
    return true
  }
  
  // Search for substantial queries
  return lowerText.length > 20
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { audio, materialId } = await request.json()

    if (!audio) {
      return NextResponse.json(
        { error: 'No audio provided' },
        { status: 400 }
      )
    }

    console.log('🎙️ Processing audio with Gemini...')
    console.time('⏱️ Total request time')

    // Use Gemini 2.0 Flash for multimodal (audio + text)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp'
    })

    // Step 1: Transcribe audio to text using Gemini (force English)
    console.time('🎤 Transcription')
    const transcriptResult = await model.generateContent([
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: audio
        }
      },
      `Listen to this audio and transcribe it to English text.
      
IMPORTANT RULES:
- If the speaker is speaking English, transcribe exactly what they say
- If the speaker is speaking any other language (Hindi, Spanish, etc.), TRANSLATE it to English
- Return ONLY the English text, nothing else
- Do not include any explanations or notes
- Do not mention what language was spoken

Example:
Audio: "हेलो" → Output: "Hello"
Audio: "Hello" → Output: "Hello"
Audio: "क्या हाल है?" → Output: "How are you?"

Now transcribe this audio:`
    ])

    const transcript = transcriptResult.response.text().trim()
    console.timeEnd('🎤 Transcription')
    console.log('📝 Transcript:', transcript)

    // Step 2: Smart intent detection
    const needsSearch = shouldSearchDocuments(transcript)
    
    let context = ''
    if (materialId && needsSearch) {
      console.log('🔍 Query requires document search')
      try {
        const searchResponse = await fetch(`${request.nextUrl.origin}/api/search-documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: transcript,
            materialId,
            topK: 3
          })
        })

        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          if (searchData.results && searchData.results.length > 0) {
            context = searchData.results
              .map((r: any) => `[Page ${r.page}] ${r.content}`)
              .join('\n\n')
            console.log('📚 Found relevant context from documents')
          }
        }
      } catch (error) {
        console.warn('⚠️ Document search failed:', error)
      }
    } else {
      console.log('💬 Simple conversation - skipping document search')
    }

    // Step 3: Generate response with context
    console.time('🧠 Response generation')
    const prompt = context
      ? `You are Alex, an expert AI tutor with a friendly, encouraging personality. You help students learn from their textbooks through natural conversation.

YOUR PERSONALITY:
- Warm and approachable, like a patient teacher
- Enthusiastic about helping students understand concepts
- Clear and structured in explanations
- Encouraging and supportive

RESPONSE GUIDELINES:
1. Answer based ONLY on the textbook context provided below
2. Structure your answer clearly (use simple language, not markdown)
3. If the context doesn't have the answer, politely say: "I don't see that information in your textbook. Could you ask about something else from the material?"
4. Keep responses conversational but concise (2-3 sentences for simple questions, more for complex ones)
5. Use examples from the textbook when available

TEXTBOOK CONTEXT:
${context}

STUDENT'S QUESTION: ${transcript}

Provide a clear, structured answer based on the textbook context above:`
      : `You are Alex, a friendly AI tutor. The student said: "${transcript}"

Respond naturally and warmly. If it's a greeting, greet them back enthusiastically. If it's a question not about their textbook, answer briefly and encourage them to ask about their study material.

Keep your response conversational and concise (1-2 sentences).`

    const responseResult = await model.generateContent(prompt)
    const responseText = responseResult.response.text()
    console.timeEnd('🧠 Response generation')
    console.log('💬 Generated response')

    // Step 4: Convert response to speech
    console.time('🔊 Text-to-speech')
    const ttsResponse = await fetch(`${request.nextUrl.origin}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: responseText,
        voice: 'en-US-Studio-O',
        engine: 'google'
      })
    })

    const ttsData = await ttsResponse.json()
    console.timeEnd('🔊 Text-to-speech')

    console.timeEnd('⏱️ Total request time')
    const totalTime = Date.now() - startTime
    console.log(`✅ Request completed in ${totalTime}ms`)

    return NextResponse.json({
      transcript,
      response: responseText,
      audioResponse: ttsData.audio,
      hasContext: !!context,
      timing: {
        total: totalTime,
        usedSearch: needsSearch
      }
    })

  } catch (error: any) {
    console.error('❌ Gemini voice error:', error)
    console.timeEnd('⏱️ Total request time')
    return NextResponse.json(
      { error: error.message || 'Failed to process audio' },
      { status: 500 }
    )
  }
}
