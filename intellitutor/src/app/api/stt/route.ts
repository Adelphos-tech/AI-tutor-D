import { NextRequest, NextResponse } from 'next/server'
import { SpeechClient } from '@google-cloud/speech'
import path from 'path'

// Initialize Google Cloud Speech client with credentials
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json'
const client = new SpeechClient({
  keyFilename: path.resolve(process.cwd(), credentialsPath)
})

const getErrorDetails = (error: unknown) => ({
  message: error instanceof Error ? error.message : 'Failed to transcribe audio'
})

export async function POST(request: NextRequest) {
  try {
    const { audio } = await request.json()

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio data is required' },
        { status: 400 }
      )
    }

    // Remove data URL prefix if present
    const audioContent = audio.replace(/^data:audio\/\w+;base64,/, '')

    // Use LINEAR16 encoding for better compatibility
    const [response] = await client.recognize({
      audio: {
        content: audioContent,
      },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        model: 'default',
      },
    })

    const transcription = response.results
      ?.map(result => result.alternatives?.[0]?.transcript)
      .join('\n') || ''

    if (!transcription) {
      return NextResponse.json(
        { error: 'No speech detected' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      transcript: transcription,
      confidence: response.results?.[0]?.alternatives?.[0]?.confidence || 0
    })

  } catch (error: unknown) {
    console.error('STT error:', error)
    const { message } = getErrorDetails(error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
