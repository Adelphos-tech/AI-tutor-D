/**
 * Gemini Live API Client
 * Real-time bidirectional audio streaming with WebSocket
 */

export interface GeminiLiveConfig {
  apiKey: string
  model?: string
  systemInstruction?: string
  tools?: any[]
}

export interface AudioChunk {
  data: ArrayBuffer
  timestamp: number
}

export type GeminiLiveEventType = 
  | 'connected'
  | 'setupComplete'
  | 'transcript'
  | 'audioChunk'
  | 'turnComplete'
  | 'toolCall'
  | 'error'
  | 'disconnected'

export interface GeminiLiveEvent {
  type: GeminiLiveEventType
  data?: any
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null
  private config: GeminiLiveConfig
  private eventHandlers: Map<GeminiLiveEventType, Set<(data: any) => void>> = new Map()
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3

  constructor(config: GeminiLiveConfig) {
    this.config = {
      model: 'models/gemini-2.0-flash-exp',
      ...config
    }
  }

  /**
   * Connect to Gemini Live API
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.config.apiKey}`
        
        this.ws = new WebSocket(url)
        
        this.ws.onopen = () => {
          console.log('🔌 Connected to Gemini Live API')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.emit('connected', {})
          
          // Send setup message
          this.sendSetup()
          resolve()
        }

        this.ws.onmessage = async (event) => {
          // Handle both text and binary messages
          if (typeof event.data === 'string') {
            this.handleMessage(event.data)
          } else if (event.data instanceof Blob) {
            // Convert Blob to text
            const text = await event.data.text()
            this.handleMessage(text)
          } else {
            console.warn('⚠️ Unknown message type:', typeof event.data)
          }
        }

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error)
          this.emit('error', { error: 'WebSocket connection error' })
          reject(error)
        }

        this.ws.onclose = (event) => {
          console.log('🔌 Disconnected from Gemini Live API', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          })
          this.isConnected = false
          this.emit('disconnected', {})
          
          // Auto-reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts})`)
            setTimeout(() => this.connect(), 1000 * this.reconnectAttempts)
          }
        }
      } catch (error) {
        console.error('❌ Failed to connect:', error)
        reject(error)
      }
    })
  }

  /**
   * Send setup configuration
   */
  private sendSetup(): void {
    const setupMessage: any = {
      setup: {
        model: this.config.model,
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: 'Puck' // Natural, friendly voice
              }
            }
          }
        }
      }
    }

    if (this.config.systemInstruction) {
      setupMessage.setup.system_instruction = {
        parts: [{ text: this.config.systemInstruction }]
      }
    }

    if (this.config.tools && this.config.tools.length > 0) {
      setupMessage.setup.tools = this.config.tools
    }

    this.send(setupMessage)
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: string): void {
    try {
      // Skip empty messages
      if (!data || data.trim().length === 0) {
        return
      }

      const message = JSON.parse(data)
      console.log('📨 Received message:', message)

      // Setup complete
      if (message.setupComplete) {
        console.log('✅ Gemini Live setup complete')
        this.emit('setupComplete', {})
        return
      }

      // Server content (transcript or audio)
      if (message.serverContent) {
        const content = message.serverContent

        // Handle turn complete
        if (content.turnComplete) {
          console.log('✅ Turn complete')
          this.emit('turnComplete', {})
          return
        }

        // Handle model turn (AI response)
        if (content.modelTurn) {
          const parts = content.modelTurn.parts || []
          console.log('🎯 Model turn parts:', parts.length, parts)

          parts.forEach((part: any) => {
            // Text transcript
            if (part.text) {
              console.log('📝 Transcript:', part.text)
              this.emit('transcript', { text: part.text })
            }

            // Audio chunk (base64 encoded)
            if (part.inlineData) {
              console.log('🔊 Audio chunk received:', part.inlineData.mimeType)
              if (part.inlineData.mimeType === 'audio/pcm') {
                const audioData = this.base64ToArrayBuffer(part.inlineData.data)
                console.log('🔊 Playing audio chunk:', audioData.byteLength, 'bytes')
                this.emit('audioChunk', { data: audioData })
              }
            }
          })
        }

        // Handle tool calls
        if (content.toolCall) {
          console.log('🔧 Tool call:', content.toolCall)
          this.emit('toolCall', content.toolCall)
        }
      }

      // Handle errors
      if (message.error) {
        console.error('❌ Gemini error:', message.error)
        this.emit('error', message.error)
      }

    } catch (error) {
      console.error('❌ Failed to parse message:', error)
      console.error('Raw data:', data?.substring(0, 200)) // Show first 200 chars
    }
  }

  /**
   * Send audio chunk to Gemini
   */
  sendAudio(audioData: ArrayBuffer): void {
    if (!this.isConnected || !this.ws) {
      console.warn('⚠️ Not connected, cannot send audio')
      return
    }

    const base64Audio = this.arrayBufferToBase64(audioData)
    
    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm',
            data: base64Audio
          }
        ]
      }
    }

    this.send(message)
  }

  /**
   * Send tool response
   */
  sendToolResponse(toolCallId: string, response: any): void {
    const message = {
      toolResponse: {
        functionResponses: [
          {
            id: toolCallId,
            response
          }
        ]
      }
    }

    this.send(message)
  }

  /**
   * Send message to WebSocket
   */
  private send(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not ready')
      return
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * Register event handler
   */
  on(event: GeminiLiveEventType, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  /**
   * Unregister event handler
   */
  off(event: GeminiLiveEventType, handler: (data: any) => void): void {
    this.eventHandlers.get(event)?.delete(handler)
  }

  /**
   * Emit event to handlers
   */
  private emit(event: GeminiLiveEventType, data: any): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`❌ Error in ${event} handler:`, error)
      }
    })
  }

  /**
   * Disconnect from Gemini Live
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}
