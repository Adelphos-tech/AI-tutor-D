# Gemini 2.5 Pro Preview TTS Integration

## Overview
This project now integrates Google's **Gemini 2.5 Pro Preview TTS** model, which provides the most natural-sounding AI voices with human-like intonation and expressiveness.

## Available Gemini Voices

### 🌀 Zephyr
- **Pitch**: Bright, higher pitch
- **Style**: Energetic, vibrant with playful pacing
- **Best for**: Engaging, enthusiastic teaching moments

### 🎯 Puck
- **Pitch**: Upbeat, middle pitch
- **Style**: Lively and conversational with crisp articulation
- **Best for**: Friendly, approachable tutoring

### 📘 Charon
- **Pitch**: Informative, lower pitch
- **Style**: Calm, authoritative with gentle emphasis
- **Best for**: Explaining complex concepts, narration

### 🛡️ Kore
- **Pitch**: Firm, middle pitch
- **Style**: Clear with steady pace and confident warmth
- **Best for**: Reassuring explanations, building confidence

### ⚡ Fenrir
- **Pitch**: Excitable, lower-middle pitch
- **Style**: Dramatic energy with immersive storytelling flair
- **Best for**: Making learning exciting and memorable

### 🌸 Leda
- **Pitch**: Gentle, soothing
- **Style**: Calm and reassuring
- **Best for**: Patient explanations, reducing anxiety

## Setup Instructions

### 1. Environment Configuration
Add the following to your `.env` file:

```bash
GEMINI_API_KEY="your_gemini_api_key_here"
GEMINI_SPEECH_MODEL="gemini-2.5-pro-preview-tts"
```

### 2. API Key Setup
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the key to your `.env` file

### 3. Enable Gemini API
Make sure you have access to the Gemini 2.5 Pro Preview TTS model in your Google Cloud project.

## Usage in Code

### Using Gemini Voices in the Voice Assistant Hook

```typescript
import { useGoogleVoiceAssistant } from '@/hooks/useGoogleVoiceAssistant'

const { speak } = useGoogleVoiceAssistant()

// Use a specific Gemini voice
await speak("Hello! Let's learn together.", { 
  voice: 'GEMINI_LEDA',
  rate: 0.95 
})
```

### Available Voice Names
- `GEMINI_ZEPHYR`
- `GEMINI_PUCK`
- `GEMINI_CHARON`
- `GEMINI_KORE`
- `GEMINI_FENRIR`
- `GEMINI_LEDA`

## API Endpoint

The TTS API endpoint (`/api/tts`) automatically handles both Google Cloud TTS and Gemini TTS:

```typescript
// Request
POST /api/tts
{
  "text": "Your text here",
  "voice": "PUCK",
  "engine": "gemini",
  "style": "Optional custom style instructions"
}

// Response
{
  "audio": "base64_encoded_audio",
  "contentType": "audio/mp3"
}
```

## Voice Selection UI

Users can select and test voices through the `VoiceSelector` component, which displays all available voices with:
- Voice preview/testing
- Description of each voice's characteristics
- Visual indication of Gemini vs Cloud TTS voices

## Technical Details

### Model Configuration
- **Model**: `gemini-2.5-pro-preview-tts`
- **Output Format**: MP3 audio
- **Response Modality**: Audio
- **Voice Presets**: Configured in `/src/lib/gemini.ts`

### Implementation Files
- `/src/lib/gemini.ts` - Core Gemini TTS functions and voice presets
- `/src/app/api/tts/route.ts` - API endpoint handling both engines
- `/src/hooks/useGoogleVoiceAssistant.ts` - Voice assistant hook with voice library
- `/src/components/VoiceSelector.tsx` - UI for voice selection

## Benefits of Gemini TTS

1. **Natural Intonation**: Human-like speech patterns and emotional expression
2. **Contextual Understanding**: Better interpretation of text context
3. **Expressive Range**: Wide variety of tones and speaking styles
4. **Low Latency**: Fast generation times
5. **Style Customization**: Ability to customize speaking style with instructions

## Troubleshooting

### Voice Not Playing
- Check that `GEMINI_API_KEY` is set correctly
- Verify you have access to the Gemini 2.5 Pro Preview TTS model
- Check browser console for errors

### Audio Quality Issues
- Ensure stable internet connection
- Try different voices to find the best match
- Adjust speaking rate if needed

### API Errors
- Verify API key has proper permissions
- Check API quota limits
- Review error logs in `/api/tts` endpoint

## Future Enhancements

- Multi-speaker dialogue support
- Custom voice style instructions
- Voice emotion controls
- Real-time voice streaming
- Voice cloning capabilities (when available)
