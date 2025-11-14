'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { useGoogleVoiceAssistant } from '@/hooks/useGoogleVoiceAssistant'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface RealTimeConversationProps {
  onMessage?: (message: Message) => void
  selectedVoice?: string
}

export default function RealTimeConversation({ onMessage, selectedVoice = 'GEMINI_PUCK' }: RealTimeConversationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversationActive, setConversationActive] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { 
    isListening, 
    isSpeaking, 
    transcript, 
    startListening, 
    stopListening, 
    speak, 
    stopSpeaking 
  } = useGoogleVoiceAssistant({
    onTranscript: handleUserSpeech,
    onError: (error) => console.error('Voice error:', error)
  })

  function handleUserSpeech(userText: string) {
    if (!userText.trim()) return

    // User spoke - interrupt assistant if speaking
    if (isSpeaking) {
      stopSpeaking()
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: userText,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMessage])
    onMessage?.(userMessage)

    // Process user input and generate response
    processUserInput(userText)
  }

  async function processUserInput(userText: string) {
    setIsProcessing(true)
    
    try {
      // Call your AI API to get response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userText,
          history: messages.slice(-10) // Send last 10 messages for context
        })
      })

      const data = await response.json()
      const assistantText = data.response || "I'm here to help you learn!"

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantText,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, assistantMessage])
      onMessage?.(assistantMessage)

      // Speak the response
      await speak(assistantText, { voice: selectedVoice })

      // Continue listening if conversation is active
      if (conversationActive && !isListening) {
        setTimeout(() => startListening(), 500)
      }
    } catch (error) {
      console.error('Processing error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  function toggleConversation() {
    if (conversationActive) {
      // Stop conversation
      setConversationActive(false)
      stopListening()
      stopSpeaking()
    } else {
      // Start conversation
      setConversationActive(true)
      startListening()
    }
  }

  function handleInterrupt() {
    // User wants to interrupt - stop speaking and start listening
    if (isSpeaking) {
      stopSpeaking()
    }
    if (!isListening && conversationActive) {
      startListening()
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Real-Time AI Tutor Conversation
        </CardTitle>
        <CardDescription>
          Have a natural conversation with your AI tutor. You can interrupt anytime!
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Conversation Display */}
        <div className="mb-4 h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Start a conversation by clicking the microphone button below</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">
                      {msg.role === 'user' ? 'You' : 'AI Tutor'}
                    </p>
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Live Transcript */}
        {transcript && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Listening...
            </p>
            <p className="text-gray-700 dark:text-gray-300">{transcript}</p>
          </div>
        )}

        {/* Status Indicators */}
        <div className="mb-4 flex gap-2 flex-wrap">
          {isListening && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
              <Mic className="w-4 h-4 animate-pulse" />
              Listening
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
              <Volume2 className="w-4 h-4 animate-pulse" />
              Speaking
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <Button
            onClick={toggleConversation}
            variant={conversationActive ? 'destructive' : 'default'}
            size="lg"
            className="flex-1"
          >
            {conversationActive ? (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                End Conversation
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Conversation
              </>
            )}
          </Button>

          {conversationActive && isSpeaking && (
            <Button
              onClick={handleInterrupt}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              <VolumeX className="w-5 h-5 mr-2" />
              Interrupt & Speak
            </Button>
          )}
        </div>

        {/* Tips */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h4 className="font-medium text-sm mb-2">💡 Conversation Tips:</h4>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>• <strong>Natural Flow</strong> - Speak naturally, the AI will respond automatically</li>
            <li>• <strong>Interrupt Anytime</strong> - Click &quot;Interrupt&quot; or just start speaking to stop the AI</li>
            <li>• <strong>Continuous Mode</strong> - The conversation continues until you end it</li>
            <li>• <strong>Context Aware</strong> - The AI remembers your recent conversation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
