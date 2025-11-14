/**
 * Shared voice presets and configurations for TTS
 */

export const GEMINI_VOICE_PRESETS = {
  ZEPHYR: { preset: 'Zephyr', style: 'Read aloud in a vibrant, higher register with playful pacing.' },
  PUCK: { preset: 'Puck', style: 'Keep the delivery lively and conversational with crisp articulation.' },
  CHARON: { preset: 'Charon', style: 'Explain concepts calmly with authoritative pacing and gentle emphasis.' },
  KORE: { preset: 'Kore', style: 'Speak clearly with steady pace and confident warmth.' },
  FENRIR: { preset: 'Fenrir', style: 'Deliver lines with dramatic energy and immersive storytelling flair.' },
  LEDA: { preset: 'Leda', style: 'Speak with a gentle, soothing voice that is calm and reassuring.' }
} as const

export type GeminiVoiceName = keyof typeof GEMINI_VOICE_PRESETS

export interface VoiceOption {
  name: string
  label: string
  description: string
  engine: 'google-cloud' | 'gemini'
  style?: string
}

export const VOICE_LIBRARY: VoiceOption[] = [
  // Gemini voices - High quality, natural (2-4s latency)
  { 
    name: 'GEMINI_PUCK', 
    label: '🎯 Puck (Gemini)', 
    description: 'Upbeat, middle pitch - Friendly and conversational', 
    engine: 'gemini', 
    style: GEMINI_VOICE_PRESETS.PUCK.style 
  },
  { 
    name: 'GEMINI_CHARON', 
    label: '📘 Charon (Gemini)', 
    description: 'Informative, lower pitch - Calm and authoritative', 
    engine: 'gemini', 
    style: GEMINI_VOICE_PRESETS.CHARON.style 
  },
  { 
    name: 'GEMINI_KORE', 
    label: '🛡️ Kore (Gemini)', 
    description: 'Firm, middle pitch - Reassuring and confident', 
    engine: 'gemini', 
    style: GEMINI_VOICE_PRESETS.KORE.style 
  },
  { 
    name: 'GEMINI_FENRIR', 
    label: '⚡ Fenrir (Gemini)', 
    description: 'Excitable, lower-middle pitch - Dramatic and engaging', 
    engine: 'gemini', 
    style: GEMINI_VOICE_PRESETS.FENRIR.style 
  },
  { 
    name: 'GEMINI_LEDA', 
    label: '🌸 Leda (Gemini)', 
    description: 'Gentle, soothing - Calm and reassuring', 
    engine: 'gemini', 
    style: GEMINI_VOICE_PRESETS.LEDA.style 
  },
  { 
    name: 'GEMINI_ZEPHYR', 
    label: '🌀 Zephyr (Gemini)', 
    description: 'Bright, higher pitch - Energetic and expressive', 
    engine: 'gemini', 
    style: GEMINI_VOICE_PRESETS.ZEPHYR.style 
  },
  // Neural voices - Fast response for real-time conversation (0.5-1s latency)
  { 
    name: 'en-US-Neural2-F', 
    label: '⚡ Nova (Fast)', 
    description: 'Quick response, clear female voice - Best for conversation', 
    engine: 'google-cloud' 
  },
  { 
    name: 'en-US-Neural2-J', 
    label: '⚡ Atlas (Fast)', 
    description: 'Quick response, clear male voice - Best for conversation', 
    engine: 'google-cloud' 
  },
]

export function resolveVoice(voiceName?: string): VoiceOption {
  const defaultVoice = VOICE_LIBRARY[0]
  if (!voiceName) return defaultVoice
  return VOICE_LIBRARY.find(v => v.name === voiceName) || defaultVoice
}
