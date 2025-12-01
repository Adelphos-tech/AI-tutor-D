import DeepgramLiveClient from './deepgramLiveClient';
import { voiceAPI } from './api';

class EnhancedLiveVoiceClient {
  constructor(sessionId, deepgramApiKey) {
    this.sessionId = sessionId;
    this.deepgramApiKey = deepgramApiKey;
    this.conversationHistory = [];
    
    // Audio playback management for interruption
    this.currentAudio = null;
    this.isPlaying = false;
    this.lastInterruptTime = 0;
    this.pendingAudio = null;
    this.finalTranscript = null;
    
    // Event handlers
    this.onTranscript = null;
    this.onAIResponse = null;
    this.onAudioResponse = null;
    this.onError = null;
    this.onStatusChange = null;
    
    // Initialize Deepgram client first, then setup handlers
    this.deepgramClient = new DeepgramLiveClient(deepgramApiKey);
    this.setupDeepgramHandlers();
  }

  setupDeepgramHandlers() {
    this.deepgramClient.setOnOpen(() => {
      console.log('Deepgram connection established');
      this.onStatusChange?.('deepgram_connected');
    });

    this.deepgramClient.setOnTranscript((transcript, isFinal, confidence) => {
      console.log(`Transcript: ${transcript} Final: ${isFinal}`);
      this.onTranscript?.(transcript, isFinal, confidence);
      
      // Mark that we received live transcription
      if (transcript.trim()) {
        this.receivedLiveTranscript = true;
      }
      
      // Interrupt current audio if user starts speaking (improved sensitivity)
      if (transcript.trim() && this.isPlaying) {
        const now = Date.now();
        // Debounce interruptions to prevent multiple rapid interruptions
        if (now - this.lastInterruptTime > 500) {
          console.log('User speaking detected - interrupting current audio');
          this.stopCurrentAudio();
          this.lastInterruptTime = now;
        }
      }
      
      // Store final transcripts but don't process immediately (wait for recording to stop)
      if (isFinal && transcript.trim()) {
        this.finalTranscript = transcript.trim();
        console.log('Final transcript stored:', this.finalTranscript);
      }
    });

    this.deepgramClient.setOnError((error) => {
      console.error('Deepgram error:', error);
      this.onError?.(`Deepgram error: ${error.message || error}`);
    });

    this.deepgramClient.setOnClose(() => {
      console.log('Deepgram connection closed');
      this.onStatusChange?.('deepgram_disconnected');
    });
  }

  async connect() {
    try {
      console.log('Connecting enhanced live voice client...');
      this.onStatusChange?.('connecting');
      
      // Connect to Deepgram with optimized settings for interruption
      const connected = await this.deepgramClient.connect({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 500,  // Faster interruption detection
        vad_events: true,
        endpointing: 150,       // More responsive to voice activity
        punctuate: true
      });

      if (connected) {
        this.onStatusChange?.('connected');
        
        // Send initial greeting from Dr. Sarah Chen (text only, no audio due to autoplay restrictions)
        setTimeout(() => {
          const greeting = "Hello! I'm Dr. Sarah Chen, your AI academic tutor. I'm here to help you understand the material we're studying today. What would you like to explore or discuss?";
          this.onAIResponse?.(greeting);
          // Don't auto-play audio on connection due to browser autoplay restrictions
          // Audio will play after first user interaction
        }, 1000);
        
        return true;
      } else {
        throw new Error('Failed to connect to Deepgram');
      }
    } catch (error) {
      console.error('Connection error:', error);
      console.log('Deepgram WebSocket connection failed, but continuing with enhanced features');
      
      // Mark as connected even if Deepgram WebSocket fails - we can still do AI processing and TTS
      this.onStatusChange?.('connected_no_live_transcription');
      
      // Send greeting even without live transcription
      setTimeout(() => {
        const greeting = "Hello! I'm Dr. Sarah Chen, your AI academic tutor. I'm here to help you understand the material we're studying today. What would you like to explore or discuss?";
        this.onAIResponse?.(greeting);
        this.synthesizeAndPlaySpeech(greeting);
      }, 1000);
      
      return true; // Continue with enhanced features even without live transcription
    }
  }

  async enableAudioAfterInteraction() {
    // Play any pending audio after user interaction
    await this.playPendingAudio();
  }

  async startRecording() {
    try {
      // Enable audio playback after user interaction
      await this.enableAudioAfterInteraction();
      
      if (this.isRecording) {
        console.log('Already recording');
        return;
      }

      console.log('Starting recording...');
      this.onStatusChange?.('recording');

      // Get microphone access with optimized settings
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          volume: 1.0 // Ensure full volume
        }
      });

      // Start Deepgram listening if connected, otherwise use traditional recording
      try {
        await this.deepgramClient.startListening();
      } catch (error) {
        console.log('Live transcription not available, using traditional recording mode');
        // Continue with recording even if live transcription fails
      }

      // Create MediaRecorder for real-time streaming
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      };

      this.mediaRecorder = new MediaRecorder(this.audioStream, options);
      
      // Reset state for new recording
      this.audioChunks = [];
      this.receivedLiveTranscript = false;
      this.shouldProcessAudio = true;
      this.finalTranscript = null; // Clear any previous transcript
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Store chunk for potential fallback transcription
          this.audioChunks.push(event.data);
          
          // Try to send to live transcription if available
          try {
            this.deepgramClient.sendAudio(event.data);
          } catch (error) {
            console.log('Live transcription not available, will use fallback');
          }
        }
      };

      this.mediaRecorder.onstart = () => {
        console.log('MediaRecorder started');
        this.isRecording = true;
      };

      this.mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped');
        this.isRecording = false;
        
        try {
          this.deepgramClient.stopListening();
        } catch (error) {
          // Deepgram not connected, always use fallback
        }
        
        // Use fallback transcription only if we should process audio and didn't receive live transcription
        if (this.shouldProcessAudio && this.audioChunks.length > 0 && !this.receivedLiveTranscript) {
          console.log('No live transcription received, using fallback transcription');
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          await this.fallbackTranscription(audioBlob);
        } else if (this.receivedLiveTranscript) {
          console.log('Live transcription was received, skipping fallback');
        } else if (!this.shouldProcessAudio) {
          console.log('Audio processing disabled, skipping transcription');
        }
      };

      // Start recording with small time slices for real-time streaming
      this.mediaRecorder.start(100); // 100ms chunks

    } catch (error) {
      console.error('Error starting recording:', error);
      this.onError?.('Failed to start recording: ' + error.message);
      this.onStatusChange?.('error');
    }
  }

  stopRecording() {
    try {
      console.log('Stopping recording...');
      
      // Set flag to process audio normally (user completed recording)
      this.shouldProcessAudio = true;
      
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
      }

      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }

      this.deepgramClient.stopListening();
      this.isRecording = false;
      this.onStatusChange?.('stopped');
      
      // Process stored transcript when user releases button
      if (this.finalTranscript) {
        console.log('Processing stored transcript:', this.finalTranscript);
        this.processUserMessage(this.finalTranscript);
        this.finalTranscript = null; // Clear after processing
      }
      
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }

  cancelRecording() {
    try {
      console.log('Cancelling recording...');
      
      // Set flag to NOT process audio (user cancelled recording)
      this.shouldProcessAudio = false;
      
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
      }

      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }

      try {
        this.deepgramClient.stopListening();
      } catch (error) {
        // Ignore errors when stopping
      }
      
      this.isRecording = false;
      this.onStatusChange?.('cancelled');
      
      // Clear stored transcript when cancelling
      this.finalTranscript = null;
      
    } catch (error) {
      console.error('Error cancelling recording:', error);
    }
  }

  async processUserMessage(message) {
    try {
      console.log('Processing user message:', message);
      this.onStatusChange?.('processing');
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Generate AI response using existing API
      const aiResponse = await this.generateAIResponse(message);
      console.log('Generated AI response:', aiResponse);
      
      // Add AI response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      });

      // Notify about AI response
      this.onAIResponse?.(aiResponse);

      // Generate and play speech
      await this.synthesizeAndPlaySpeech(aiResponse);
      
    } catch (error) {
      console.error('Error processing user message:', error);
      this.onError?.('Failed to process your message: ' + error.message);
    }
  }

  async generateAIResponse(userMessage) {
    try {
      // Use existing chat streaming API
      const response = await fetch(`/api/chat/sessions/${this.sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      return data.aiResponse || data.response || "I'm sorry, I couldn't generate a response right now.";
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      return "I'm having trouble processing that right now. Could you please try again?";
    }
  }

  cleanTextForSpeech(text) {
    // Remove special characters and formatting that sound robotic
    let cleanText = text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
      .replace(/\*(.*?)\*/g, '$1')     // Remove italic *text*
      .replace(/`(.*?)`/g, '$1')       // Remove code `text`
      .replace(/#{1,6}\s/g, '')        // Remove headers # ## ###
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links [text](url)
      
      // Remove special symbols that sound robotic
      .replace(/[•·▪▫◦‣⁃]/g, '')       // Remove bullet points
      .replace(/[→←↑↓]/g, '')          // Remove arrows
      .replace(/[✓✗✘✔]/g, '')         // Remove checkmarks
      .replace(/[©®™]/g, '')           // Remove copyright symbols
      .replace(/[§¶]/g, '')            // Remove section symbols
      
      // Replace abbreviations with full words for natural speech
      .replace(/\be\.g\./g, 'for example')
      .replace(/\bi\.e\./g, 'that is')
      .replace(/\betc\./g, 'and so on')
      .replace(/\bvs\./g, 'versus')
      .replace(/\bDr\./g, 'Doctor')
      .replace(/\bProf\./g, 'Professor')
      
      // Add natural pauses with commas and periods
      .replace(/(\w+):\s*/g, '$1. ')   // Replace colons with periods for pauses
      .replace(/;\s*/g, ', ')          // Replace semicolons with commas
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .trim();
    
    // Add natural speech patterns and pauses
    cleanText = cleanText
      // Add pauses after introductory phrases
      .replace(/^(Well|Now|So|Actually|Basically|Essentially|Fundamentally),?\s*/i, '$1, ')
      .replace(/^(Let me|Allow me to|I'd like to|I want to),?\s*/i, '$1 ')
      
      // Add natural transitions
      .replace(/\b(However|Moreover|Furthermore|Additionally|Nevertheless),?\s*/g, '$1, ')
      .replace(/\b(First|Second|Third|Finally|Lastly),?\s*/g, '$1, ')
      
      // Ensure proper sentence endings
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2');
    
    return cleanText;
  }

  stopCurrentAudio() {
    if (this.currentAudio && this.isPlaying) {
      console.log('Stopping current audio playback');
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.isPlaying = false;
      this.onAudioResponse?.(false);
      this.onStatusChange?.('ready');
    }
  }

  async playPendingAudio() {
    if (this.pendingAudio && !this.isPlaying) {
      console.log('Playing pending audio after user interaction');
      this.currentAudio = this.pendingAudio;
      this.pendingAudio = null;
      try {
        await this.currentAudio.play();
      } catch (error) {
        console.error('Error playing pending audio:', error);
      }
    }
  }

  async fallbackTranscription(audioBlob) {
    try {
      console.log('Using fallback transcription via API');
      this.onStatusChange?.('transcribing');
      
      // Use the voice API for transcription
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }
      
      const result = await response.json();
      const transcript = result.transcript || result.text || '';
      
      if (transcript.trim()) {
        console.log('Fallback transcription result:', transcript);
        this.onTranscript?.(transcript, true, 1.0);
        this.processUserMessage(transcript.trim());
      } else {
        console.log('No transcript received from fallback - audio may be too quiet');
        this.onError?.('No speech detected. Please speak louder and try again.');
        this.onStatusChange?.('ready');
      }
      
    } catch (error) {
      console.error('Fallback transcription error:', error);
      this.onError?.('Failed to transcribe audio. Please try again.');
      this.onStatusChange?.('ready');
    }
  }

  async synthesizeAndPlaySpeech(text) {
    try {
      // Stop any currently playing audio
      this.stopCurrentAudio();
      
      // Clean and naturalize text for speech
      const cleanText = this.cleanTextForSpeech(text);
      console.log('Original text:', text.substring(0, 100) + '...');
      console.log('Cleaned text for speech:', cleanText.substring(0, 100) + '...');
      
      this.onStatusChange?.('synthesizing');
      
      if (!cleanText || cleanText.trim() === '') {
        console.log('No text to synthesize after cleaning');
        this.onStatusChange?.('ready');
        return;
      }
      
      // Use Node.js voice service with proxy to Python
      console.log('Calling Node.js voice proxy for TTS...');
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          voice: 'aura-asteria-en'
        })
      });
      
      if (!response.ok) {
        throw new Error(`TTS service error: ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      console.log('Audio blob received:', audioBlob);
      
      // Create and setup audio with interruption tracking
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;
      
      audio.onplay = () => {
        console.log('Audio started playing');
        this.isPlaying = true;
        this.onAudioResponse?.(true);
        this.onStatusChange?.('playing');
      };
      
      audio.onended = () => {
        console.log('Audio finished playing');
        this.isPlaying = false;
        this.currentAudio = null;
        this.onAudioResponse?.(false);
        this.onStatusChange?.('ready');
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onpause = () => {
        console.log('Audio paused/stopped');
        this.isPlaying = false;
        this.onAudioResponse?.(false);
        this.onStatusChange?.('ready');
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        this.isPlaying = false;
        this.currentAudio = null;
        this.onError?.('Failed to play audio response');
        this.onStatusChange?.('ready');
      };
      
      console.log('Starting audio playback...');
      try {
        await audio.play();
      } catch (playError) {
        if (playError.name === 'NotAllowedError') {
          console.log('Audio autoplay blocked - user interaction required');
          // Store the audio for later playback when user interacts
          this.pendingAudio = audio;
          this.onStatusChange?.('ready');
          // Don't throw error for autoplay restrictions
          return;
        } else {
          throw playError;
        }
      }
      
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      this.onError?.('Failed to generate speech: ' + error.message);
      this.onStatusChange?.('ready');
    }
  }

  sendTextMessage(message) {
    if (message && message.trim()) {
      this.processUserMessage(message.trim());
    }
  }

  disconnect() {
    try {
      console.log('Disconnecting enhanced live voice client...');
      
      this.stopRecording();
      this.deepgramClient.disconnect();
      
      this.onStatusChange?.('disconnected');
      
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  // Event handler setters
  setOnTranscript(handler) {
    this.onTranscript = handler;
  }

  setOnAIResponse(handler) {
    this.onAIResponse = handler;
  }

  setOnAudioResponse(handler) {
    this.onAudioResponse = handler;
  }

  setOnError(handler) {
    this.onError = handler;
  }

  setOnStatusChange(handler) {
    this.onStatusChange = handler;
  }

  // Getters
  getConnectionStatus() {
    return this.deepgramClient.getConnectionStatus();
  }

  getConversationHistory() {
    return this.conversationHistory;
  }
}

export default EnhancedLiveVoiceClient;
