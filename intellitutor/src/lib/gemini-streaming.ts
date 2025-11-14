import { genAI } from './gemini'
import { GEMINI_VOICE_PRESETS } from './voice-presets'
import { convertPCMtoWAV } from './audio-utils'

const GEMINI_SPEECH_MODEL = process.env.GEMINI_SPEECH_MODEL || 'gemini-2.5-flash-preview-tts'

interface StreamingSpeechOptions {
  text: string
  voice?: string
  onChunk?: (audioChunk: Uint8Array) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

/**
 * Generate speech using Gemini TTS with streaming support
 * This allows audio to start playing before full generation is complete
 */
export async function generateStreamingSpeech({
  text,
  voice = 'PUCK',
  onChunk,
  onComplete,
  onError
}: StreamingSpeechOptions): Promise<void> {
  try {
    const voiceKey = voice as keyof typeof GEMINI_VOICE_PRESETS
    const voicePreset = GEMINI_VOICE_PRESETS[voiceKey] || GEMINI_VOICE_PRESETS.PUCK
    const voiceName = voicePreset.preset

    const model = genAI.getGenerativeModel({ model: GEMINI_SPEECH_MODEL })

    const result = await model.generateContentStream({
      contents: [
        {
          role: 'user',
          parts: [{ text }]
        }
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName
            }
          }
        },
        temperature: 0.7,
        topP: 0.9,
        topK: 40
      } as any
    })

    // Process chunks as they arrive
    for await (const chunk of result.stream) {
      const audioPart = chunk.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData?.mimeType?.startsWith('audio/')
      )

      if (audioPart?.inlineData?.data) {
        // Convert base64 to Uint8Array
        const audioData = Uint8Array.from(atob(audioPart.inlineData.data), c => c.charCodeAt(0))
        
        // Convert PCM to WAV if needed
        const mimeType = audioPart.inlineData.mimeType
        const wavData = mimeType.includes('pcm') || mimeType.includes('L16')
          ? convertPCMtoWAV(audioData, mimeType)
          : audioData

        // Send chunk to callback
        onChunk?.(wavData)
      }
    }

    onComplete?.()
  } catch (error) {
    console.error('Streaming TTS error:', error)
    onError?.(error instanceof Error ? error : new Error('Unknown error'))
  }
}

// Removed duplicate functions - now using shared audio-utils

/**
 * Multi-speaker streaming TTS
 * Allows different voices for different speakers in a dialogue
 */
export async function generateMultiSpeakerSpeech({
  speakers,
  onChunk,
  onComplete,
  onError
}: {
  speakers: Array<{ speaker: string; voice: string; text: string }>
  onChunk?: (audioChunk: Uint8Array) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}): Promise<void> {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_SPEECH_MODEL })

    // Format dialogue text
    const dialogueText = speakers
      .map(s => `${s.speaker}: ${s.text}`)
      .join('\n')

    // Build speaker voice configs
    const speakerVoiceConfigs = speakers.map(s => {
      const voiceKey = s.voice as keyof typeof GEMINI_VOICE_PRESETS
      const voicePreset = GEMINI_VOICE_PRESETS[voiceKey] || GEMINI_VOICE_PRESETS.PUCK
      return {
        speaker: s.speaker,
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voicePreset.preset
          }
        }
      }
    })

    const result = await model.generateContentStream({
      contents: [
        {
          role: 'user',
          parts: [{ text: `Read aloud in a warm, welcoming tone\n${dialogueText}` }]
        }
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs
          }
        },
        temperature: 1
      } as any
    })

    // Process chunks as they arrive
    for await (const chunk of result.stream) {
      const audioPart = chunk.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData?.mimeType?.startsWith('audio/')
      )

      if (audioPart?.inlineData?.data) {
        const audioData = Uint8Array.from(atob(audioPart.inlineData.data), c => c.charCodeAt(0))
        const mimeType = audioPart.inlineData.mimeType
        const wavData = mimeType.includes('pcm') || mimeType.includes('L16')
          ? convertPCMtoWAV(audioData, mimeType)
          : audioData

        onChunk?.(wavData)
      }
    }

    onComplete?.()
  } catch (error) {
    console.error('Multi-speaker TTS error:', error)
    onError?.(error instanceof Error ? error : new Error('Unknown error'))
  }
}
