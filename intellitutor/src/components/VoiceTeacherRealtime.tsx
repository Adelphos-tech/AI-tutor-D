/**
 * Voice Teacher Realtime
 * Ultra-low latency voice interface with FastAPI + Deepgram + Gemini
 * Target: <1 second end-to-end latency
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Zap, Activity } from 'lucide-react'
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice'

interface VoiceTeacherRealtimeProps {
  materialId: string
  materialTitle: string
}

interface Message {
  id: string
  type: 'user' | 'ai'
  text: string
  timestamp: Date
}

export default function VoiceTeacherRealtime({ materialId, materialTitle }: VoiceTeacherRealtimeProps) {
  const [isActive, setIsActive] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [liveTranscript, setLiveTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const shouldStartRecordingRef = useRef(false)

  const {
    isConnected,
    isRecording,
    isSpeaking,
    connect,
    disconnect,
    startRecording,
    stopRecording
  } = useRealtimeVoice({
    materialId,
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        // Add final transcript as user message
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'user',
          text,
          timestamp: new Date()
        }])
        setLiveTranscript('')
      } else {
        // Show interim transcript
        setLiveTranscript(text)
      }
    },
    onTextChunk: (text) => {
      // Accumulate AI response
      setAiResponse(prev => prev + text)
    },
    onStatus: (status) => {
      if (status === 'connected' && shouldStartRecordingRef.current) {
        // Start recording when backend is ready
        console.log('🎙️ Backend connected - starting continuous recording')
        shouldStartRecordingRef.current = false
        setTimeout(() => startRecording(), 100)
      }
      
      if (status === 'complete') {
        // Move AI response to messages
        if (aiResponse) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'ai',
            text: aiResponse,
            timestamp: new Date()
          }])
          setAiResponse('')
        }
      } else if (status === 'interrupted') {
        // Clear partial response
        setAiResponse('')
      }
    },
    onError: (error) => {
      console.error('Voice error:', error)
    }
  })
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveTranscript, aiResponse])
  
  const handleStart = async () => {
    console.log('🚀 Starting continuous session...')
    setIsActive(true)
    setMessages([])
    setLiveTranscript('')
    setAiResponse('')
    shouldStartRecordingRef.current = true
    await connect()
    // Recording will start automatically when status becomes 'connected'
  }
  
  const handleStop = () => {
    setIsActive(false)
    stopRecording()
    disconnect()
  }
  
  return (
    <Card className="h-[calc(100vh-300px)] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Voice Teacher Realtime
              <Badge variant="secondary" className="ml-2">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                Ultra-Low Latency
              </Badge>
            </CardTitle>
            <CardDescription>
              Deepgram Nova-3 + Gemini 2.5 Pro + Deepgram Aura-1 | Target: &lt;1s
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            {!isActive ? (
              <Button onClick={handleStart} size="lg" className="gap-2">
                <Zap className="w-5 h-5" />
                Start Continuous Session
              </Button>
            ) : (
              <Button onClick={handleStop} variant="destructive" size="lg" className="gap-2">
                <MicOff className="w-5 h-5" />
                End Session
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {!isActive && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 rounded-full flex items-center justify-center mb-6">
              <Zap className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Ultra-Low Latency Voice AI</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
              Experience real-time conversations with &lt;1 second latency using streaming STT, LLM, and TTS
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600 mb-2 mx-auto" />
                <p className="text-sm font-medium">Deepgram Nova-3</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Real-time STT streaming
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Zap className="w-6 h-6 text-yellow-600 mb-2 mx-auto" />
                <p className="text-sm font-medium">Gemini 2.5 Pro</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Streaming text generation
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Activity className="w-6 h-6 text-green-600 mb-2 mx-auto" />
                <p className="text-sm font-medium">Deepgram Aura-1</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Real-time TTS streaming
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Status Bar */}
            <div className="px-6 py-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!isConnected && (
                  <Badge variant="secondary">
                    <Activity className="w-3 h-3 mr-1 animate-pulse" />
                    Connecting...
                  </Badge>
                )}
                {isConnected && !isRecording && !isSpeaking && (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                    <Zap className="w-3 h-3 mr-1 text-green-600" />
                    Ready
                  </Badge>
                )}
                {isRecording && (
                  <Badge variant="destructive" className="animate-pulse">
                    <Mic className="w-3 h-3 mr-1" />
                    Listening...
                  </Badge>
                )}
                {isSpeaking && (
                  <Badge variant="default" className="animate-pulse">
                    <Activity className="w-3 h-3 mr-1" />
                    AI Speaking...
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {messages.length / 2} exchanges
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'ai' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[75%] rounded-lg p-4 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <p className="text-xs mt-2 opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>

                  {message.type === 'user' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Live Transcript */}
              {liveTranscript && (
                <div className="flex gap-3 justify-end">
                  <div className="max-w-[75%] rounded-lg p-4 bg-blue-500 text-white opacity-70">
                    <p className="whitespace-pre-wrap">{liveTranscript}</p>
                    <p className="text-xs mt-2">Speaking...</p>
                  </div>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-white animate-pulse" />
                  </div>
                </div>
              )}
              
              {/* AI Response (streaming) */}
              {aiResponse && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div className="max-w-[75%] rounded-lg p-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 opacity-70">
                    <p className="whitespace-pre-wrap">{aiResponse}</p>
                    <p className="text-xs mt-2">Generating...</p>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Connection Info */}
            <div className="px-6 py-3 border-t bg-white dark:bg-gray-900">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>Real-time streaming active</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
