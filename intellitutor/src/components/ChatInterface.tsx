'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Send, Loader2, BookOpen, User, Bot, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { useGoogleVoiceAssistant as useVoiceAssistant } from '@/hooks/useGoogleVoiceAssistant'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: number[]
  timestamp: Date
}

interface ChatInterfaceProps {
  materialId: string
  materialTitle: string
}

export default function ChatInterface({ materialId, materialTitle }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSupported
  } = useVoiceAssistant({
    onTranscript: (text) => {
      setInput(text)
      stopListening()
    },
    onError: (error) => {
      console.error('Voice error:', error)
    }
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId,
          question: userMessage.content,
          conversationHistory: messages.slice(-5) // Last 5 messages for context
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Auto-speak the response if enabled
      if (autoSpeak) {
        speak(data.answer)
      }
    } catch (error: unknown) {
      console.error('Chat error:', error)
      
      const fallbackMessage = 'Sorry, I encountered an error. Please try again.'
      const errorText = error instanceof Error ? error.message : fallbackMessage
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorText,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const suggestedQuestions = [
    'Summarize the main topics in this textbook',
    'What are the key concepts in Chapter 1?',
    'Explain the most important formula',
    'What should I focus on for studying?'
  ]

  return (
    <Card className="h-[calc(100vh-300px)] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Ask Questions About {materialTitle}
        </CardTitle>
        <CardDescription>
          Get instant answers grounded in your textbook with citations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Bot className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                Ask me anything about your textbook. I&apos;ll provide answers based on the content with page references.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-2xl">
                {suggestedQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="text-left h-auto py-3 px-4 whitespace-normal"
                    onClick={() => setInput(question)}
                  >
                    <span className="text-sm">{question}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                        <div className="flex items-center gap-2 flex-wrap">
                          <BookOpen className="w-4 h-4" />
                          <span className="text-sm font-medium">References:</span>
                          {message.citations.map((page, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              Page {page}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs mt-2 opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-4 space-y-3">
          {/* Voice Controls */}
          {isSupported && (
            <div className="flex items-center justify-between gap-2 pb-2 border-b">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="sm"
                  onClick={isListening ? stopListening : startListening}
                  disabled={loading}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4 mr-2" />
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Voice Input
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant={autoSpeak ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoSpeak(!autoSpeak)}
                >
                  {autoSpeak ? (
                    <>
                      <Volume2 className="w-4 h-4 mr-2" />
                      Auto-Speak On
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 mr-2" />
                      Auto-Speak Off
                    </>
                  )}
                </Button>
              </div>
              
              {isSpeaking && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={stopSpeaking}
                >
                  <VolumeX className="w-4 h-4 mr-2" />
                  Stop Speaking
                </Button>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={isListening ? transcript : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Ask a question about your textbook..."}
              disabled={loading || isListening}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-gray-500">
            {isSupported 
              ? "Use voice input or type your question. Enable auto-speak to hear responses."
              : "Answers are grounded in your textbook content"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function MessageSquare({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  )
}
