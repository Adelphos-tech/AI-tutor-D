const axios = require('axios');
const FormData = require('form-data');

class PythonVoiceProxy {
  constructor() {
    this.pythonServiceUrl = process.env.PYTHON_VOICE_SERVICE_URL || 'http://localhost:8000';
    this.timeout = 30000; // 30 seconds timeout
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.pythonServiceUrl}/health`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('Python voice service health check failed:', error.message);
      throw new Error('Python voice service is not available');
    }
  }

  async transcribeAudio(audioBuffer, options = {}) {
    try {
      console.log('Proxying transcription to Python service...');
      
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm'
      });

      const response = await axios.post(
        `${this.pythonServiceUrl}/transcribe`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: this.timeout,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      return {
        transcript: response.data.transcript || '',
        confidence: response.data.confidence || 0,
        words: response.data.words || []
      };
    } catch (error) {
      console.error('Python transcription proxy error:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  async synthesizeSpeech(text, voice = 'aura-asteria-en') {
    try {
      console.log('Proxying speech synthesis to Python service...');
      
      const formData = new FormData();
      formData.append('text', text);
      formData.append('voice', voice);

      const response = await axios.post(
        `${this.pythonServiceUrl}/synthesize`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          responseType: 'arraybuffer',
          timeout: this.timeout
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Python synthesis proxy error:', error.message);
      throw new Error(`Speech synthesis failed: ${error.message}`);
    }
  }

  async voiceChat(audioBuffer, sessionId, context = '') {
    try {
      console.log('Proxying voice chat to Python service...');
      
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm'
      });
      formData.append('session_id', sessionId.toString());
      formData.append('context', context);

      const response = await axios.post(
        `${this.pythonServiceUrl}/voice-chat`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: this.timeout,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      return {
        userMessage: response.data.user_message,
        aiResponse: response.data.ai_response,
        confidence: response.data.confidence,
        audioSize: response.data.audio_size
      };
    } catch (error) {
      console.error('Python voice chat proxy error:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Voice chat failed: ${error.message}`);
    }
  }

  async getVoices() {
    try {
      const response = await axios.get(`${this.pythonServiceUrl}/voices`, {
        timeout: 5000
      });
      return response.data.voices || [];
    } catch (error) {
      console.error('Python get voices proxy error:', error.message);
      throw new Error(`Failed to get voices: ${error.message}`);
    }
  }
}

module.exports = new PythonVoiceProxy();
