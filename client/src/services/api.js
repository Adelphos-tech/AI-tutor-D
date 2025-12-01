import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Document API
export const documentAPI = {
  // Upload document
  uploadDocument: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('document', file);

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  },

  // Get all documents
  getDocuments: async () => {
    const response = await api.get('/documents');
    return response.data;
  },

  // Get document details
  getDocument: async (documentId) => {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  },

  // Get section content
  getSection: async (documentId, sectionId) => {
    const response = await api.get(`/documents/${documentId}/sections/${sectionId}`);
    return response.data;
  },

  // Delete document
  deleteDocument: async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },

  // Check processing status
  getProcessingStatus: async (documentId) => {
    const response = await api.get(`/documents/${documentId}/status`);
    return response.data;
  },
};

// Chat API
export const chatAPI = {
  // Create chat session
  createSession: async (documentId, sectionId, sessionName) => {
    const response = await api.post('/chat/sessions', {
      documentId,
      sectionId,
      sessionName,
    });
    return response.data;
  },

  // Get sessions for document
  getDocumentSessions: async (documentId) => {
    const response = await api.get(`/chat/sessions/document/${documentId}`);
    return response.data;
  },

  // Get session with messages
  getSession: async (sessionId) => {
    const response = await api.get(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  // Send message
  sendMessage: async (sessionId, message) => {
    const response = await api.post(`/chat/sessions/${sessionId}/messages`, {
      message,
    });
    return response.data;
  },

  // Stream message
  streamMessage: async (sessionId, message, onChunk, onComplete, onError) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete?.();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                onError?.(new Error(data.error));
                return;
              }
              if (data.content) {
                onChunk?.(data.content);
              }
              if (data.done) {
                onComplete?.();
                return;
              }
            } catch (e) {
              // Ignore malformed JSON
            }
          }
        }
      }
    } catch (error) {
      onError?.(error);
    }
  },

  // Delete session
  deleteSession: async (sessionId) => {
    const response = await api.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  // Generate section summary
  getSectionSummary: async (sectionId) => {
    const response = await api.get(`/chat/sections/${sectionId}/summary`);
    return response.data;
  },

  // Generate study questions
  getStudyQuestions: async (sectionId, count = 5) => {
    const response = await api.get(`/chat/sections/${sectionId}/questions?count=${count}`);
    return response.data;
  },
};

// Voice API
export const voiceAPI = {
  // Transcribe audio
  transcribeAudio: async (audioBlob) => {
    const formData = new FormData();
    
    // Determine file extension based on MIME type
    let filename = 'audio.webm';
    if (audioBlob.type.includes('mp4')) {
      filename = 'audio.mp4';
    } else if (audioBlob.type.includes('wav')) {
      filename = 'audio.wav';
    } else if (audioBlob.type.includes('webm')) {
      filename = 'audio.webm';
    }
    
    formData.append('audio', audioBlob, filename);

    const response = await api.post('/voice/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Synthesize speech
  synthesizeSpeech: async (text, voice = 'aura-asteria-en') => {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('voice', voice);
    
    const response = await api.post('/voice/synthesize', formData, {
      responseType: 'blob',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Voice chat
  voiceChat: async (sessionId, audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');

    const response = await api.post(`/voice/chat/${sessionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Get available voices
  getVoices: async () => {
    const response = await api.get('/voice/voices');
    return response.data;
  },
};

// WebSocket for real-time voice
export class VoiceWebSocket {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.ws = null;
    this.isConnected = false;
    this.onTranscript = null;
    this.onResponse = null;
    this.onError = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:5001/api/voice/realtime`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.ws.send(JSON.stringify({
          type: 'start_session',
          sessionId: this.sessionId,
        }));
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'session_started':
              console.log('Voice session started');
              break;
            case 'interim_transcript':
              this.onTranscript?.(data.transcript, false);
              break;
            case 'response':
              this.onResponse?.(data);
              break;
            case 'error':
              this.onError?.(new Error(data.message));
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError?.(error);
        reject(error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log('Voice WebSocket connection closed');
      };
    });
  }

  sendAudio(audioData) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'audio_data',
        audio: audioData,
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.send(JSON.stringify({
        type: 'end_session',
      }));
      this.ws.close();
    }
  }
}

// Export individual functions
export const getSession = async (sessionId) => {
  const response = await api.get(`/chat/sessions/${sessionId}`);
  return response.data;
};

export const sendMessage = async (sessionId, message) => {
  const response = await api.post(`/chat/sessions/${sessionId}/messages`, {
    message,
  });
  return response.data;
};

export default api;
