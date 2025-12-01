class LiveVoiceClient {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.ws = null;
    this.isConnected = false;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioStream = null;
    
    // Event handlers
    this.onTranscript = null;
    this.onAIResponse = null;
    this.onAudioResponse = null;
    this.onError = null;
    this.onStatusChange = null;
  }

  async connect() {
    try {
      const wsUrl = `ws://localhost:8000/live-voice/${this.sessionId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Live voice WebSocket connected');
        this.isConnected = true;
        this.onStatusChange?.('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Live voice WebSocket disconnected');
        this.isConnected = false;
        this.onStatusChange?.('disconnected');
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError?.('WebSocket connection error');
      };

      // Wait for connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.onStatusChange?.('connected');
          resolve();
        };

        this.ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        };
      });

    } catch (error) {
      console.error('Error connecting to live voice service:', error);
      throw error;
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case 'deepgram_connected':
        console.log('Deepgram connected:', data.message);
        this.onStatusChange?.('deepgram_ready');
        break;

      case 'transcript':
        console.log('Transcript received:', data.transcript, 'Final:', data.is_final);
        this.onTranscript?.(data.transcript, data.is_final, data.confidence);
        break;

      case 'ai_response':
        console.log('AI response received:', data.message);
        this.onAIResponse?.(data.message);
        break;

      case 'audio_response':
        console.log('Audio response received');
        this.playAudioResponse(data.audio, data.format, data.sample_rate);
        break;

      case 'recording_started':
        console.log('Recording started');
        this.onStatusChange?.('recording');
        break;

      case 'recording_stopped':
        console.log('Recording stopped');
        this.onStatusChange?.('processing');
        break;

      case 'error':
        console.error('Server error:', data.message);
        this.onError?.(data.message);
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  async startRecording() {
    try {
      if (this.isRecording) {
        console.log('Already recording');
        return;
      }

      // Get microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Create MediaRecorder for real-time audio streaming
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      };

      this.mediaRecorder = new MediaRecorder(this.audioStream, options);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.isConnected) {
          // Send audio data to WebSocket
          this.ws.send(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        console.log('MediaRecorder started');
        this.isRecording = true;
        this.sendMessage({ type: 'start_recording' });
      };

      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        this.isRecording = false;
        this.sendMessage({ type: 'stop_recording' });
      };

      // Start recording with small time slices for real-time streaming
      this.mediaRecorder.start(100); // 100ms chunks

    } catch (error) {
      console.error('Error starting recording:', error);
      this.onError?.('Failed to start recording: ' + error.message);
    }
  }

  stopRecording() {
    try {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
      }

      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }

      this.isRecording = false;
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }

  sendTextMessage(message) {
    if (this.isConnected) {
      this.sendMessage({
        type: 'text_message',
        message: message
      });
    }
  }

  sendMessage(message) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  async playAudioResponse(audioBase64, format, sampleRate) {
    try {
      // Decode base64 audio
      const audioData = atob(audioBase64);
      const audioBuffer = new ArrayBuffer(audioData.length);
      const audioView = new Uint8Array(audioBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        audioView[i] = audioData.charCodeAt(i);
      }

      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // For linear16 format, we need to create a proper WAV header
      const wavBuffer = this.createWavBuffer(audioView, sampleRate);
      
      // Decode and play
      const decodedAudio = await audioContext.decodeAudioData(wavBuffer);
      const source = audioContext.createBufferSource();
      source.buffer = decodedAudio;
      source.connect(audioContext.destination);
      source.start();

      this.onAudioResponse?.(true);

      source.onended = () => {
        this.onAudioResponse?.(false);
      };

    } catch (error) {
      console.error('Error playing audio response:', error);
      this.onError?.('Failed to play audio response');
    }
  }

  createWavBuffer(audioData, sampleRate) {
    const length = audioData.length;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Copy audio data
    const audioView = new Uint8Array(buffer, 44);
    audioView.set(audioData);

    return buffer;
  }

  disconnect() {
    try {
      this.stopRecording();
      
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      this.isConnected = false;
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
}

export default LiveVoiceClient;
