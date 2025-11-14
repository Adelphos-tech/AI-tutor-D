import { NextRequest, NextResponse } from 'next/server'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import path from 'path'
import { generateGeminiSpeech } from '@/lib/gemini'

// Initialize Google Cloud TTS client with credentials
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json'
const client = new TextToSpeechClient({
  keyFilename: path.resolve(process.cwd(), credentialsPath)
})

// Helper function to add natural pauses and breathing to text
function enhanceTextWithSSML(text: string): string {
  // Add SSML tags for natural speech
  let ssml = '<speak>'
  
  // Add breathing sounds at natural pause points
  ssml += text
    // Add pause after sentences
    .replace(/\. /g, '.<break time="400ms"/> ')
    // Add pause after questions
    .replace(/\? /g, '?<break time="500ms"/> ')
    // Add pause after commas
    .replace(/, /g, ',<break time="200ms"/> ')
    // Add emphasis on important words
    .replace(/\b(important|key|essential|critical|fundamental)\b/gi, '<emphasis level="strong">$1</emphasis>')
    // Add slight pause before "however", "therefore", etc.
    .replace(/\b(however|therefore|moreover|furthermore|additionally)\b/gi, '<break time="300ms"/>$1')
  
  // Add breathing sound at the beginning for naturalness
  ssml = '<speak><break time="200ms"/>' + ssml.substring(7)
  
  ssml += '</speak>'
  return ssml
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error'

export async function POST(request: NextRequest) {
  try {
    const {
      text,
      voice = 'en-US-Studio-O',
      speakingRate = 1.0,
      useSSML = true,
      engine = 'google-cloud',
      style,
      dialogue,
    } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    if (engine === 'gemini') {
      const { audio, contentType } = await generateGeminiSpeech({ text, voice, style, dialogue })
      return NextResponse.json({ audio, contentType })
    }

    // Limit text length for faster processing
    // Gemini TTS works best with shorter texts (under 1000 chars for low latency)
    const maxLength = engine === 'gemini' ? 1000 : 4500
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text

    // Studio and Journey voices don't support SSML
    const isStudioOrJourney = voice.includes('Studio') || voice.includes('Journey')
    const shouldUseSSML = useSSML && !isStudioOrJourney

    // Enhance text with SSML for natural speech (only for non-Studio voices)
    const enhancedText = shouldUseSSML ? enhanceTextWithSSML(truncatedText) : truncatedText

    // Construct the request
    const [response] = await client.synthesizeSpeech({
      input: shouldUseSSML ? { ssml: enhancedText } : { text: truncatedText },
      voice: {
        languageCode: 'en-US',
        name: voice,
        ssmlGender: voice.includes('M') || voice.includes('D') || voice.includes('J') ? 'MALE' : 'FEMALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speakingRate,
        pitch: 0,
        volumeGainDb: 2.0, // Slightly louder
        effectsProfileId: ['headphone-class-device'], // Optimized for headphones
      },
    })

    // Return audio as base64
    const audioContent = response.audioContent
    if (!audioContent) {
      throw new Error('No audio content generated')
    }

    return NextResponse.json({
      audio: Buffer.from(audioContent).toString('base64'),
      contentType: 'audio/mpeg'
    })

  } catch (error: unknown) {
    console.error('TTS error:', error)
    const message = getErrorMessage(error)
    return NextResponse.json(
      { error: `Failed to generate speech: ${message}` },
      { status: 500 }
    )
  }
}
