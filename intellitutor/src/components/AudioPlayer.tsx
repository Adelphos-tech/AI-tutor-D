'use client'

import { Button } from '@/components/ui/button'
import { Volume2, Pause } from 'lucide-react'
import { useGoogleVoiceAssistant as useVoiceAssistant } from '@/hooks/useGoogleVoiceAssistant'

interface AudioPlayerProps {
  text: string
  label?: string
}

export default function AudioPlayer({ text, label = "Read Aloud" }: AudioPlayerProps) {
  const { isSpeaking, speak, stopSpeaking, isSupported } = useVoiceAssistant()

  if (!isSupported) {
    return null
  }

  const handleToggle = () => {
    if (isSpeaking) {
      stopSpeaking()
    } else {
      speak(text)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      className="gap-2"
    >
      {isSpeaking ? (
        <>
          <Pause className="w-4 h-4" />
          Stop Reading
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4" />
          {label}
        </>
      )}
    </Button>
  )
}
