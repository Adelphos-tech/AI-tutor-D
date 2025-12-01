import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

class DeepgramLiveClient {
  constructor(apiKey) {
    this.deepgramClient = createClient(apiKey);
    this.connection = null;
    this.isConnected = false;
    this.isListening = false;
    
    // Event handlers
    this.onTranscript = null;
    this.onError = null;
    this.onOpen = null;
    this.onClose = null;
    this.onMetadata = null;
  }

  async connect(options = {}) {
    try {
      console.log('Connecting to Deepgram live transcription...');
      
      // Default options for live transcription (optimized for interruption)
      const defaultOptions = {
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 500,  // Reduced for faster interruption detection
        vad_events: true,
        endpointing: 150,       // Reduced for more responsive interruption
        punctuate: true,
        ...options
      };

      // Create live transcription connection
      this.connection = this.deepgramClient.listen.live(defaultOptions);

      // Set up event handlers
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram connection opened');
        this.isConnected = true;
        this.onOpen?.();
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        console.log('Transcript received:', data);
        
        if (data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
          const transcript = data.channel.alternatives[0].transcript;
          const confidence = data.channel.alternatives[0].confidence;
          const isFinal = data.is_final;
          
          if (transcript && transcript.trim()) {
            this.onTranscript?.(transcript, isFinal, confidence);
          }
        }
      });

      this.connection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram error:', error);
        this.onError?.(error);
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed');
        this.isConnected = false;
        this.isListening = false;
        this.onClose?.();
      });

      this.connection.on(LiveTranscriptionEvents.Metadata, (data) => {
        console.log('Metadata received:', data);
        this.onMetadata?.(data);
      });

      return true;
    } catch (error) {
      console.error('Error connecting to Deepgram:', error);
      this.onError?.(error);
      return false;
    }
  }

  startListening() {
    if (!this.isConnected) {
      console.error('Not connected to Deepgram');
      return false;
    }

    this.isListening = true;
    console.log('Started listening for audio');
    return true;
  }

  stopListening() {
    this.isListening = false;
    console.log('Stopped listening for audio');
  }

  sendAudio(audioData) {
    if (this.connection && this.isConnected && this.isListening) {
      try {
        this.connection.send(audioData);
        return true;
      } catch (error) {
        console.error('Error sending audio data:', error);
        this.onError?.(error);
        return false;
      }
    } else {
      console.warn('Cannot send audio: not connected or not listening');
      return false;
    }
  }

  finishListening() {
    if (this.connection && this.isConnected) {
      try {
        this.connection.finish();
        console.log('Finished listening session');
      } catch (error) {
        console.error('Error finishing session:', error);
      }
    }
  }

  disconnect() {
    try {
      this.isListening = false;
      this.isConnected = false;
      
      if (this.connection) {
        this.connection.finish();
        this.connection = null;
      }
      
      console.log('Disconnected from Deepgram');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  // Event handler setters
  setOnTranscript(handler) {
    this.onTranscript = handler;
  }

  setOnError(handler) {
    this.onError = handler;
  }

  setOnOpen(handler) {
    this.onOpen = handler;
  }

  setOnClose(handler) {
    this.onClose = handler;
  }

  setOnMetadata(handler) {
    this.onMetadata = handler;
  }

  // Getters
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isListening: this.isListening
    };
  }
}

export default DeepgramLiveClient;
