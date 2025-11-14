'use client'

import { useRef, useCallback, useState, useEffect } from 'react'

interface UseRealtimeVoiceOptions {
  materialId?: string
  onTranscript?: (text: string, isFinal: boolean) => void
  onTextChunk?: (text: string) => void
  onStatus?: (status: string) => void
  onError?: (error: string) => void
}

interface UseRealtimeVoiceState {
  isConnected: boolean
  isRecording: boolean
  isSpeaking: boolean
  connect: () => Promise<void>
  disconnect: () => void
  startRecording: () => Promise<void>
  stopRecording: () => void
}

const RMS_SOUND_THRESHOLD = 2.5

function getRmsLevel(samples: Uint8Array): number {
  if (samples.length === 0) {
    return 0
  }
  let sumSquares = 0
  for (let i = 0; i < samples.length; i++) {
    const centered = samples[i] - 128
    const normalized = centered / 128
    sumSquares += normalized * normalized
  }
  return Math.sqrt(sumSquares / samples.length) * 100
}

export function useRealtimeVoice({
  materialId,
  onTranscript,
  onTextChunk,
  onStatus,
  onError
}: UseRealtimeVoiceOptions): UseRealtimeVoiceState {
  // State
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false)

  // Refs
  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSoundTimeRef = useRef<number>(0)
  const shouldBeRecordingRef = useRef<boolean>(false)
  const chunkQueueRef = useRef<Blob[]>([])
  const isFlushingRef = useRef<boolean>(false)
  const utteranceActiveRef = useRef<boolean>(false)
  const audioChunksRef = useRef<Uint8Array[]>([])
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  
  const flushQueuedAudio = useCallback(() => {
    if (!chunkQueueRef.current.length) {
      utteranceActiveRef.current = false
      return
    }
    
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || isFlushingRef.current) {
      chunkQueueRef.current = []
      utteranceActiveRef.current = false
      return
    }
    
    const blob = new Blob(chunkQueueRef.current, { type: 'audio/webm;codecs=opus' })
    chunkQueueRef.current = []
    isFlushingRef.current = true
    
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64Data = (reader.result as string)?.split(',')[1]
      if (base64Data && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'audio',
          data: base64Data
        }))
        wsRef.current.send(JSON.stringify({
          type: 'audio_end'
        }))
        console.log(`📤 Sent audio batch: ${base64Data.length} chars`)
      }
      lastSoundTimeRef.current = 0
      utteranceActiveRef.current = false
      isFlushingRef.current = false
    }
    reader.onerror = () => {
      console.error('❌ Failed to read buffered audio blob')
      utteranceActiveRef.current = false
      isFlushingRef.current = false
    }
    reader.readAsDataURL(blob)
  }, [])

  // Connect to WebSocket
  const connect = useCallback(async (): Promise<void> => {
    try {
      console.log('🔌 Connecting to voice backend...')
      
      const wsUrl = materialId 
        ? `ws://localhost:8000/ws?material_id=${materialId}`
        : 'ws://localhost:8000/ws'
      
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('✅ Connected to voice backend')
        if (materialId) {
          console.log('📤 Material ID in URL:', materialId)
        }
        setIsConnected(true)
      }
      
      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data)
          
          switch (message.type) {
            case 'status':
              console.log('📊 Status:', message.data)
              onStatus?.(message.data)
              
              // When speaking starts, clear previous chunks
              if (message.data === 'speaking') {
                audioChunksRef.current = []
                if (currentAudioRef.current) {
                  currentAudioRef.current.pause()
                  currentAudioRef.current = null
                }
              }
              
              // When complete, play accumulated audio
              if (message.data === 'complete' && audioChunksRef.current.length > 0) {
                console.log(`🔊 Playing complete audio (${audioChunksRef.current.length} chunks)`)
                try {
                  // Calculate total size
                  const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0)
                  const completeAudio = new Uint8Array(totalSize)
                  let offset = 0
                  
                  // Combine all chunks
                  for (const chunk of audioChunksRef.current) {
                    completeAudio.set(chunk, offset)
                    offset += chunk.length
                  }
                  
                  // Create and play audio
                  const audioBlob = new Blob([completeAudio], { type: 'audio/mpeg' })
                  const audioUrl = URL.createObjectURL(audioBlob)
                  const audio = new Audio(audioUrl)
                  currentAudioRef.current = audio
                  audio.play().catch(e => console.error('❌ Audio playback error:', e))
                  
                  // Clean up after playing
                  audio.onended = () => {
                    URL.revokeObjectURL(audioUrl)
                    audioChunksRef.current = []
                  }
                } catch (e) {
                  console.error('❌ Audio processing error:', e)
                }
              }
              break
              
            case 'transcript':
              const { text, is_final } = message.data as { text: string; is_final: boolean }
              console.log(`📝 Transcript: ${text} (${is_final ? 'final' : 'interim'})`)
              onTranscript?.(text, is_final)
              break
              
            case 'text':
              console.log('💬 Text chunk:', message.data)
              onTextChunk?.(message.data as string)
              break
              
            case 'audio':
              console.log('🔊 Audio chunk received')
              // Decode base64 audio and accumulate chunks
              const audioBase64 = message.data as string
              const audioData = atob(audioBase64)
              const audioArray = new Uint8Array(audioData.length)
              for (let i = 0; i < audioData.length; i++) {
                audioArray[i] = audioData.charCodeAt(i)
              }
              audioChunksRef.current.push(audioArray)
              break
              
            case 'error':
              console.error('❌ Backend error:', message.data)
              onError?.(message.data as string)
              break
          }
        } catch (error) {
          console.error('❌ Message parse error:', error)
        }
      }
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        onError?.('WebSocket connection error')
      }
      
      ws.onclose = () => {
        console.log('🔌 Disconnected from voice backend')
        setIsConnected(false)
        setIsRecording(false)
        setIsSpeaking(false)
      }
      
      wsRef.current = ws
      
    } catch (error: any) {
      console.error('❌ Connection error:', error)
      onError?.(error.message)
    }
  }, [materialId, onError, onStatus, onTextChunk, onTranscript])

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      console.log('🎙️ Starting recording...')
      shouldBeRecordingRef.current = true
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      mediaStreamRef.current = stream
      
      // Setup audio analyzer
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      
      // Configure analyzer
      analyser.fftSize = 1024
      const bufferLength = analyser.fftSize
      const dataArray = new Uint8Array(bufferLength)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      dataArrayRef.current = dataArray
      
      // Use ScriptProcessorNode for real-time PCM streaming
      const bufferSize = 4096
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)
      
      processor.onaudioprocess = (e) => {
        if (!shouldBeRecordingRef.current || wsRef.current?.readyState !== WebSocket.OPEN) {
          return
        }
        
        const audioData = e.inputBuffer.getChannelData(0)
        
        // Convert Float32 to Int16 PCM
        const int16 = new Int16Array(audioData.length)
        for (let i = 0; i < audioData.length; i++) {
          const s = Math.max(-1, Math.min(1, audioData[i]))
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        
        // Send binary PCM data immediately
        wsRef.current.send(int16.buffer)
        console.log(`📤 Sent ${int16.length} PCM samples`)
      }
      
      // Connect audio pipeline
      source.connect(processor)
      processor.connect(audioContext.destination)
      setIsRecording(true)
      console.log('✅ Recording started')
      
    } catch (error: any) {
      console.error('❌ Recording failed:', error)
      onError?.(error.message)
    }
  }, [flushQueuedAudio, onError])

  // Stop recording
  const stopRecording = useCallback((): void => {
    console.log('⏹️ Stopping recording...')
    console.trace('📍 Stop recording called from:')
    
    shouldBeRecordingRef.current = false
    flushQueuedAudio()
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      mediaStreamRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    
    chunkQueueRef.current = []
    utteranceActiveRef.current = false
    
    setIsRecording(false)
    setIsSpeaking(false)
    console.log('✅ Recording stopped')
  }, [flushQueuedAudio])

  // Disconnect
  const disconnect = useCallback((): void => {
    stopRecording()
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    audioChunksRef.current = []
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
  }, [stopRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [stopRecording])

  return {
    isConnected,
    isRecording,
    isSpeaking,
    connect,
    disconnect,
    startRecording,
    stopRecording
  }
}
