import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

class NaturalVoiceClient {
  constructor(sessionId, deepgramApiKey, options = {}) {
    this.sessionId = sessionId;
    this.deepgramApiKey = deepgramApiKey;
    this.language = options.language || 'en-US'; // Deepgram language code
    this.languageCode = options.languageCode || 'en'; // LLM language code
    this.voiceLanguage = options.voiceLanguage || 'en-US'; // TTS language code
    
    console.log('🎙️ NaturalVoiceClient initialized with:', {
      language: this.language,
      languageCode: this.languageCode,
      voiceLanguage: this.voiceLanguage
    });
    
    // Initialize Deepgram client
    this.deepgram = createClient(deepgramApiKey);
    this.connection = null;
    this.mediaRecorder = null;
    this.audioStream = null;
    this.isListening = false;
    this.isConnected = false;
    
    // Conversation state
    this.conversationHistory = [];
    this.currentAudio = null;
    this.isPlaying = false;
    
    // Event handlers
    this.onTranscript = null;
    this.onResponse = null;
    this.onStatusChange = null;
    this.onError = null;
  }

  async connect() {
    try {
      console.log('🎙️ Connecting to Deepgram for natural conversation...');
      this.onStatusChange?.('connecting');

      // Request microphone permission first
      console.log('🎤 Requesting microphone permission...');
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        console.log('✅ Microphone permission granted');
      } catch (micError) {
        console.error('❌ Microphone permission denied:', micError);
        this.onError?.('Microphone permission denied. Please allow microphone access and try again.');
        this.onStatusChange?.('error');
        return;
      }

      // Create live transcription connection optimized for low latency
      const deepgramConfig = {
        model: 'nova-2',
        language: this.language,
        smart_format: false, // Disable for speed
        interim_results: true,
        vad_events: true,
        endpointing: 200, // Faster endpoint detection
        no_delay: true, // Reduce processing delay
        punctuate: false, // Skip punctuation for speed
        profanity_filter: false // Skip filtering for speed
      };

      console.log(`🌍 Deepgram config for language: ${this.language}`, deepgramConfig);

      // Create the connection
      console.log('🔗 Creating Deepgram live connection...');
      this.connection = this.deepgram.listen.live(deepgramConfig);
      
      if (!this.connection) {
        throw new Error('Failed to create Deepgram connection');
      }
      
      console.log('✅ Deepgram connection created');

      // Set up event handlers
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('✅ Deepgram connection opened - ready for conversation');
        this.isConnected = true;
        this.onStatusChange?.('connected');
        // Start listening after a short delay to ensure connection is stable
        setTimeout(() => {
          this.startListening();
        }, 500);
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        this.handleTranscript(data);
      });

      this.connection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('❌ Deepgram error:', error);
        this.onError?.(`Connection error: ${error.message || 'Unknown error'}`);
        this.reconnect();
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('🔌 Deepgram connection closed');
        this.isConnected = false;
        this.onStatusChange?.('disconnected');
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Deepgram:', error);
      this.onError?.(`Failed to connect: ${error.message}`);
      return false;
    }
  }

  async startListening() {
    try {
      if (this.isListening) return;

      console.log('🎧 Starting continuous listening...');
      
      // Use already granted microphone access
      if (!this.audioStream) {
        console.error('❌ No audio stream available');
        this.onError?.('Microphone not available. Please refresh and allow microphone access.');
        return;
      }

      // Create MediaRecorder for streaming
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.isConnected && this.connection) {
          try {
            this.connection.send(event.data);
          } catch (error) {
            console.error('❌ Error sending audio data:', error);
          }
        }
      };

      this.mediaRecorder.start(100); // Send data every 100ms
      this.isListening = true;
      this.onStatusChange?.('listening');

      // Send initial greeting
      setTimeout(() => {
        this.sendGreeting();
      }, 1000);

    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      this.onError?.(`Microphone error: ${error.message}`);
    }
  }

  handleTranscript(data) {
    if (!data.channel?.alternatives?.[0]) return;

    const transcript = data.channel.alternatives[0].transcript;
    const isFinal = data.is_final;
    const confidence = data.channel.alternatives[0].confidence || 0;

    if (transcript.trim()) {
      console.log(`📝 Transcript (${isFinal ? 'final' : 'interim'}): "${transcript}"`);
      this.onTranscript?.(transcript, isFinal, confidence);

      // Stop AI speech immediately when user starts talking (even on interim transcripts)
      if (transcript.trim().length > 2 && this.isPlaying) {
        console.log('🛑 User started speaking - interrupting AI response');
        this.stopCurrentAudio();
      }

      // Process final transcripts for conversation
      if (isFinal && transcript.trim().length > 2) {
        // Small delay to ensure audio interruption is complete
        setTimeout(() => {
          this.processUserMessage(transcript.trim());
        }, 100);
      }
    }
  }

  async processUserMessage(message) {
    try {
      console.log('🤖 Processing user message:', message);
      console.log('🌍 Using language code:', this.languageCode);
      this.onStatusChange?.('processing');

      // Stop any current audio playback
      this.stopCurrentAudio();

      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Get AI response
      const response = await fetch(`/api/chat/sessions/${this.sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          conversationHistory: this.conversationHistory.slice(-6), // Last 6 messages for context
          language: this.languageCode
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      const aiResponse = result.aiResponse || result.response || 'I apologize, but I couldn\'t process that request.';

      console.log('🎯 AI Response:', aiResponse);

      // Add AI response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      });

      // Send response to UI
      this.onResponse?.(aiResponse);

      // Convert to speech and play (optional)
      try {
        await this.synthesizeAndPlay(aiResponse);
      } catch (error) {
        console.log('🔇 TTS unavailable, continuing in text-only mode');
        this.onStatusChange?.('listening'); // Return to listening state
      }

    } catch (error) {
      console.error('❌ Error processing message:', error);
      this.onError?.(`Processing error: ${error.message}`);
      this.onStatusChange?.('listening');
    }
  }

  async synthesizeAndPlay(text) {
    try {
      console.log('🔊 Synthesizing speech...');
      this.onStatusChange?.('speaking');

      // Clean text for speech
      const cleanText = this.cleanTextForSpeech(text);

      // Select voice based on language
      const voiceMap = {
        'en': 'aura-asteria-en',
        'ta': 'aura-asteria-en', // Fallback to English for now
        'ms': 'aura-asteria-en', // Fallback to English for now  
        'zh': 'aura-asteria-en'  // Fallback to English for now
      };
      
      const selectedVoice = voiceMap[this.languageCode] || 'aura-asteria-en';

      // Call TTS API
      const formData = new FormData();
      formData.append('text', cleanText);
      formData.append('voice', selectedVoice);
      formData.append('language', this.languageCode);

      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`TTS error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play audio
      this.currentAudio = new Audio(audioUrl);
      this.isPlaying = true;

      this.currentAudio.onplay = () => {
        console.log('🎵 Audio playback started');
      };

      this.currentAudio.onended = () => {
        console.log('✅ Audio playback finished');
        this.isPlaying = false;
        this.onStatusChange?.('listening');
        URL.revokeObjectURL(audioUrl);
      };

      this.currentAudio.onerror = (error) => {
        console.error('❌ Audio playback error:', error);
        this.isPlaying = false;
        this.onStatusChange?.('listening');
      };

      await this.currentAudio.play();

    } catch (error) {
      console.log('🔇 TTS service unavailable, continuing in text-only mode');
      this.onStatusChange?.('listening');
      // Don't throw error - just continue without voice
    }
  }

  cleanTextForSpeech(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
      .replace(/`(.*?)`/g, '$1') // Remove code markdown
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\n{2,}/g, '. ') // Replace multiple newlines with periods
      .replace(/\n/g, ' ') // Replace single newlines with spaces
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  stopCurrentAudio() {
    if (this.currentAudio && this.isPlaying) {
      console.log('⏹️ Stopping current audio');
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.isPlaying = false;
      
      // Update status to show interruption
      this.onStatusChange?.('listening');
    }
  }

  async sendGreeting() {
    const greeting = "Hello! I'm Dr. Sarah Chen, your AI academic tutor. I'm ready to help you explore and understand the material. What would you like to discuss?";
    this.onResponse?.(greeting);
    
    // Try to play greeting, but don't fail if TTS is unavailable
    try {
      await this.synthesizeAndPlay(greeting);
    } catch (error) {
      console.log('TTS unavailable for greeting, continuing with text-only mode');
    }
  }

  async reconnect() {
    console.log('🔄 Attempting to reconnect...');
    this.isConnected = false;
    this.isListening = false;
    
    // Clean up current connection
    if (this.connection) {
      try {
        this.connection.finish();
      } catch (error) {
        console.log('Connection already closed');
      }
      this.connection = null;
    }
    
    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Reconnect after delay
    setTimeout(() => {
      this.connect();
    }, 2000);
  }

  disconnect() {
    console.log('🔌 Disconnecting...');
    
    this.isListening = false;
    this.isConnected = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    if (this.connection) {
      this.connection.finish();
      this.connection = null;
    }

    this.stopCurrentAudio();
    this.onStatusChange?.('disconnected');
  }

  // Event handler setters
  setOnTranscript(handler) { this.onTranscript = handler; }
  setOnResponse(handler) { this.onResponse = handler; }
  setOnStatusChange(handler) { this.onStatusChange = handler; }
  setOnError(handler) { this.onError = handler; }
}

export default NaturalVoiceClient;
