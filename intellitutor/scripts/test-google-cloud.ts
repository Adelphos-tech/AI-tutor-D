import 'dotenv/config'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { SpeechClient } from '@google-cloud/speech'
import { existsSync } from 'fs'
import path from 'path'

async function testGoogleCloud() {
  console.log('🔍 Testing Google Cloud credentials...\n')

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json'
  const fullPath = path.resolve(process.cwd(), credentialsPath)
  
  console.log('📁 Credentials file:', fullPath)
  console.log('📄 File exists:', existsSync(fullPath), '\n')

  try {
    // Test Text-to-Speech
    console.log('🎤 Testing Text-to-Speech...')
    const ttsClient = new TextToSpeechClient({
      keyFilename: fullPath
    })

    const [ttsResponse] = await ttsClient.synthesizeSpeech({
      input: { text: 'Hello, this is a test.' },
      voice: { languageCode: 'en-US', name: 'en-US-Neural2-F' },
      audioConfig: { audioEncoding: 'MP3' },
    })

    console.log('✅ TTS working! Audio size:', ttsResponse.audioContent?.length, 'bytes\n')

    // Test Speech-to-Text (just check client initialization)
    console.log('🎧 Testing Speech-to-Text client...')
    const sttClient = new SpeechClient({
      keyFilename: fullPath
    })
    const projectId = await sttClient.getProjectId()
    console.log('✅ STT client initialized successfully! Project:', projectId, '\n')
    await sttClient.close()

    console.log('🎉 All Google Cloud services are working!')
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error:', message)
    console.error('\nFull error:', error)
  }
}

testGoogleCloud()
