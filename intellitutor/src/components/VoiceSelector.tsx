'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Volume2, Play, Check } from 'lucide-react'
import { useGoogleVoiceAssistant as useVoiceAssistant } from '@/hooks/useGoogleVoiceAssistant'

interface VoiceSelectorProps {
  onVoiceSelect: (voiceName: string) => void
  currentVoice?: string
}

export default function VoiceSelector({ onVoiceSelect, currentVoice = 'GEMINI_PUCK' }: VoiceSelectorProps) {
  const { speak, isSpeaking, getAvailableVoices } = useVoiceAssistant()
  const [testingVoice, setTestingVoice] = useState<string | null>(null)

  const voices = getAvailableVoices()
  const testPhrase = "Hello! I'm your AI tutor. I'm here to help you learn and understand your textbook better."

  const handleTestVoice = async (voiceName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setTestingVoice(voiceName)
    try {
      await speak(testPhrase, { voice: voiceName })
    } catch (error) {
      console.error('Voice test error:', error)
    } finally {
      setTestingVoice(null)
    }
  }

  const handleSelectVoice = (voiceName: string) => {
    onVoiceSelect(voiceName)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Choose Your AI Teacher&apos;s Voice
        </CardTitle>
        <CardDescription>
          Select the voice that sounds best to you. All voices are powered by Gemini AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {voices.map((voice) => (
            <Card
              key={voice.name}
              className={`cursor-pointer transition-all hover:shadow-md ${
                currentVoice === voice.name ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleSelectVoice(voice.name)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium flex items-center gap-2">
                      {voice.label}
                      {currentVoice === voice.name && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {voice.description}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={(e) => handleTestVoice(voice.name, e)}
                  disabled={isSpeaking || testingVoice === voice.name}
                >
                  {testingVoice === voice.name ? (
                    <>
                      <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                      {isSpeaking ? 'Playing...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Test Voice
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h4 className="font-medium text-sm mb-2">💡 Voice Selection Guide:</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• <strong>Gemini Voices</strong> - Most natural & expressive (2-4s latency) - Best for teaching</li>
            <li>• <strong>⚡ Fast Voices</strong> - Quick response (0.5-1s latency) - Best for real-time conversation</li>
            <li>• <strong>Interruption Support</strong> - All voices can be interrupted mid-speech</li>
            <li>• <strong>Smart Caching</strong> - Repeated phrases play instantly</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
