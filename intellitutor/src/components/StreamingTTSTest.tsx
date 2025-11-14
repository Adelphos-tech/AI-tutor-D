'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, Square, Loader2 } from 'lucide-react'

export default function StreamingTTSTest() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [chunksReceived, setChunksReceived] = useState(0)
  const [timeToFirstChunk, setTimeToFirstChunk] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioQueue, setAudioQueue] = useState<Blob[]>([])

  const testPhrases = [
    "Hello! This is a test of streaming text-to-speech.",
    "The quick brown fox jumps over the lazy dog. This sentence tests streaming latency.",
    "Streaming TTS allows audio to start playing before full generation is complete, reducing perceived latency significantly."
  ]

  async function testStreaming(text: string) {
    setIsPlaying(true)
    setChunksReceived(0)
    setTimeToFirstChunk(null)
    setError(null)
    setAudioQueue([])

    const startTime = Date.now()
    let firstChunkTime: number | null = null

    try {
      const response = await fetch('/api/tts-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'PUCK' })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const data = JSON.parse(line)

            if (data.chunk) {
              // Record time to first chunk
              if (firstChunkTime === null) {
                firstChunkTime = Date.now() - startTime
                setTimeToFirstChunk(firstChunkTime)
              }

              // Convert base64 to audio
              const audioData = Uint8Array.from(atob(data.chunk), c => c.charCodeAt(0))
              const blob = new Blob([audioData], { type: 'audio/wav' })
              
              setAudioQueue(prev => [...prev, blob])
              setChunksReceived(prev => prev + 1)

              // Play first chunk immediately
              if (chunksReceived === 0) {
                playAudio(blob)
              }
            } else if (data.done) {
              console.log('Streaming complete!')
              setIsPlaying(false)
            } else if (data.error) {
              throw new Error(data.error)
            }
          } catch (parseError) {
            console.error('Parse error:', parseError)
          }
        }
      }
    } catch (err) {
      console.error('Streaming error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsPlaying(false)
    }
  }

  function playAudio(blob: Blob) {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    
    audio.onended = () => {
      URL.revokeObjectURL(url)
    }
    
    audio.onerror = (e) => {
      console.error('Audio playback error:', e)
      setError('Failed to play audio')
    }
    
    audio.play().catch(err => {
      console.error('Play error:', err)
      setError('Failed to play audio: ' + err.message)
    })
  }

  function stopPlaying() {
    setIsPlaying(false)
    setChunksReceived(0)
    setTimeToFirstChunk(null)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎤 Streaming TTS Test
        </CardTitle>
        <CardDescription>
          Test the streaming text-to-speech implementation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Phrases */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Test Phrases:</h3>
          {testPhrases.map((phrase, idx) => (
            <Button
              key={idx}
              onClick={() => testStreaming(phrase)}
              disabled={isPlaying}
              variant="outline"
              className="w-full text-left justify-start h-auto py-3"
            >
              <Play className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{phrase}</span>
            </Button>
          ))}
        </div>

        {/* Status */}
        {isPlaying && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-medium">Streaming in progress...</span>
            </div>
            <div className="text-sm space-y-1">
              <p>📦 Chunks received: <strong>{chunksReceived}</strong></p>
              {timeToFirstChunk !== null && (
                <p>⚡ Time to first chunk: <strong>{timeToFirstChunk}ms</strong></p>
              )}
            </div>
            <Button
              onClick={stopPlaying}
              variant="destructive"
              size="sm"
              className="mt-2"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Results */}
        {!isPlaying && timeToFirstChunk !== null && (
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg space-y-2">
            <h3 className="font-medium text-green-800 dark:text-green-200">
              ✅ Test Complete
            </h3>
            <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <p>⚡ Time to first audio: <strong>{timeToFirstChunk}ms</strong></p>
              <p>📦 Total chunks: <strong>{chunksReceived}</strong></p>
              <p className="mt-2">
                {timeToFirstChunk < 1000 ? (
                  <span className="text-green-600 dark:text-green-400">
                    🎉 Excellent! Latency under 1 second
                  </span>
                ) : timeToFirstChunk < 2000 ? (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    👍 Good! Latency under 2 seconds
                  </span>
                ) : (
                  <span className="text-orange-600 dark:text-orange-400">
                    ⚠️ Latency over 2 seconds - check network/API
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h4 className="font-medium text-sm mb-2">💡 What to Look For:</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• <strong>Time to first chunk</strong> - Should be under 1 second</li>
            <li>• <strong>Audio starts quickly</strong> - Before full generation completes</li>
            <li>• <strong>Multiple chunks</strong> - Indicates streaming is working</li>
            <li>• <strong>No errors</strong> - Clean streaming without issues</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
