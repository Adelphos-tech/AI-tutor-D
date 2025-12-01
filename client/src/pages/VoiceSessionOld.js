import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NaturalVoiceClient from '../services/naturalVoiceClient';
import * as chatAPI from '../services/api';
import { 
  ArrowLeft, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Bot, 
  User, 
  BookOpen,
  Loader2,
  Play,
  Pause,
  Square,
  Settings,
  Sparkles
} from 'lucide-react';

const VoiceSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [voiceStatus, setVoiceStatus] = useState('disconnected');
  
  const voiceClientRef = useRef(null);

  useEffect(() => {
    fetchSession();
    initializeNaturalVoiceClient();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getSession(sessionId);
      setSession(response.session);
      setConversationHistory(response.messages || []);
    } catch (err) {
      console.error('Error fetching session:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const initializeNaturalVoiceClient = async () => {
    try {
      console.log('🎙️ Initializing natural voice conversation...');
      setVoiceStatus('connecting');
      
      // Use Deepgram API key
      const deepgramApiKey = process.env.REACT_APP_DEEPGRAM_API_KEY || 'b25ae131afcc69d579e78effc9aefb1f29d11e56';
      
      const client = new NaturalVoiceClient(sessionId, deepgramApiKey);
      voiceClientRef.current = client;

      // Set up event handlers
      client.setOnTranscript((transcript, isFinal, confidence) => {
        if (isFinal) {
          setTranscript(transcript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(transcript);
        }
      });
      
      client.setOnResponse((response) => {
        setAiResponse(response);
        setConversationHistory(prev => [
          ...prev,
          { role: 'assistant', content: response, timestamp: new Date().toISOString() }
        ]);
      });
      
      client.setOnStatusChange((status) => {
        setVoiceStatus(status);
      });
      
      client.setOnError((error) => {
        console.error('❌ Natural voice error:', error);
        setVoiceStatus('error');
      });
      
      // Connect and start natural conversation
      const connected = await client.connect();
      if (connected) {
        console.log('✅ Natural voice conversation ready!');
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize natural voice client:', error);
      setVoiceStatus('error');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voiceClientRef.current) {
        voiceClientRef.current.disconnect();
      }
    };
  }, []);

  const getStatusMessage = () => {
    switch (voiceStatus) {
      case 'connecting': return '🔄 Connecting to voice conversation...';
      case 'connected': return '✅ Connected - Natural conversation ready';
      case 'listening': return '🎧 Listening - Speak naturally';
      case 'processing': return '🤖 Processing your message...';
      case 'speaking': return '🔊 Dr. Sarah Chen is responding...';
      case 'error': return '❌ Connection error - Retrying...';
      default: return '⏳ Initializing...';
    }
  };
      
      // Set up event handlers
      client.setOnTranscript((transcript, isFinal, confidence) => {
        if (isFinal) {
          setTranscript(transcript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(transcript);
        }
      });
      
      client.setOnAIResponse((response) => {
        setAiResponse(response);
        // Add to conversation history
        setConversationHistory(prev => {
          const currentTranscript = transcript || 'Voice input';
          return [
            ...prev,
            { role: 'user', content: currentTranscript, timestamp: new Date().toISOString() },
            { role: 'assistant', content: response, timestamp: new Date().toISOString() }
          ];
        });
      });
      
      client.setOnAudioResponse((isPlaying) => {
        setIsPlaying(isPlaying);
      });
      
      client.setOnError((error) => {
        console.error('Enhanced live voice error:', error);
        // Don't show alert for connection errors - fall back gracefully
        if (error.includes('Connection failed') || error.includes('WebSocket')) {
          console.log('WebSocket connection failed, falling back to traditional voice recording');
          setLiveVoiceStatus('fallback_mode');
          setUseLiveMode(false); // Switch to traditional mode
        }
      });
      
      client.setOnStatusChange((status) => {
        setLiveVoiceStatus(status);
      });
      
      // Connect to Deepgram
      await client.connect();
      
    } catch (error) {
      console.error('Error initializing enhanced live voice client:', error);
      console.log('Enhanced live voice failed, falling back to traditional voice recording');
      setLiveVoiceStatus('fallback_mode');
      setUseLiveMode(false); // Switch to traditional mode
      
      // Provide greeting in fallback mode
      setTimeout(() => {
        setAiResponse("Hello! I'm Dr. Sarah Chen, your AI academic tutor. I'm here to help you understand the material we're studying today. What would you like to explore or discuss?");
      }, 1000);
    }
  };

  const initializeLiveVoiceClient = async () => {
    try {
      setLiveVoiceStatus('connecting');
      
      const client = new LiveVoiceClient(sessionId);
      liveVoiceClientRef.current = client;
      
      // Set up event handlers
      client.setOnTranscript((transcript, isFinal, confidence) => {
        if (isFinal) {
          setTranscript(transcript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(transcript);
        }
      });
      
      client.setOnAIResponse((response) => {
        setAiResponse(response);
        // Add to conversation history (use current transcript state)
        setConversationHistory(prev => {
          const currentTranscript = transcript || 'Voice input';
          return [
            ...prev,
            { role: 'user', content: currentTranscript, timestamp: new Date().toISOString() },
            { role: 'assistant', content: response, timestamp: new Date().toISOString() }
          ];
        });
      });
      
      client.setOnAudioResponse((isPlaying) => {
        setIsPlaying(isPlaying);
      });
      
      client.setOnError((error) => {
        console.error('Live voice error:', error);
        alert('Voice error: ' + error);
      });
      
      client.setOnStatusChange((status) => {
        setLiveVoiceStatus(status);
      });
      
      // Connect to the service
      await client.connect();
      
    } catch (error) {
      console.error('Error initializing live voice client:', error);
      setLiveVoiceStatus('error');
      alert('Failed to connect to live voice service: ' + error.message);
    }
  };

  const startRecording = async () => {
    try {
      if (useLiveMode && liveVoiceClientRef.current) {
        // Use live voice client for real-time streaming
        await liveVoiceClientRef.current.startRecording();
        setIsRecording(true);
        setTranscript('');
        setInterimTranscript('');
        setAiResponse('');
      } else {
        // Use traditional recording method
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Determine the best supported audio format
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
        
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          await processAudio(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        setTranscript('');
        setInterimTranscript('');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (useLiveMode && liveVoiceClientRef.current) {
      // Use live voice client
      liveVoiceClientRef.current.stopRecording();
      setIsRecording(false);
    } else if (mediaRecorderRef.current && isRecording) {
      // Use traditional method
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    try {
      setIsProcessing(true);
      
      // Transcribe audio
      const transcriptionResponse = await voiceAPI.transcribeAudio(audioBlob);
      const userMessage = transcriptionResponse.transcript;
      
      if (!userMessage.trim()) {
        alert('No speech detected. Please try again.');
        return;
      }

      setTranscript(userMessage);

      // Send to voice chat API
      const chatResponse = await voiceAPI.voiceChat(sessionId, audioBlob);
      
      setAiResponse(chatResponse.aiResponse);
      
      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: chatResponse.aiResponse, timestamp: new Date().toISOString() }
      ]);

      // Play AI response audio
      if (chatResponse.audioResponse && !isMuted) {
        const audioData = atob(chatResponse.audioResponse);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playLastResponse = async () => {
    if (!aiResponse) return;
    
    try {
      setIsPlaying(true);
      const audioBlob = await voiceAPI.synthesizeSpeech(aiResponse, selectedVoice);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error playing response:', error);
    }
  };

  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Session not found</h3>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/document/${session.document_id}`)}
              className="btn btn-ghost btn-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Voice Session
              </h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <BookOpen className="h-4 w-4" />
                <span>{session.section_title}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn btn-ghost btn-sm"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`btn btn-sm ${isMuted ? 'btn-secondary' : 'btn-ghost'}`}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Voice Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Voice
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="input"
                >
                  {voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} ({voice.language})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Voice Visualization */}
        <div className="mb-8">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording
                ? 'bg-red-500 voice-recording shadow-lg shadow-red-500/50'
                : isProcessing
                ? 'bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50'
                : 'bg-primary-600 shadow-lg shadow-primary-500/50'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="h-12 w-12 text-white animate-spin" />
            ) : isRecording ? (
              <Mic className="h-12 w-12 text-white" />
            ) : (
              <Bot className="h-12 w-12 text-white" />
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isRecording
              ? 'Listening...'
              : isProcessing
              ? 'Processing...'
              : 'Ready to chat'}
          </h2>
          <p className="text-gray-600">
            {isRecording
              ? 'Speak now, I\'m listening to your question'
              : isProcessing
              ? 'Analyzing your question and preparing response'
              : 'Press and hold the microphone to ask a question'}
          </p>
        </div>

        {/* Transcript Display */}
        {(transcript || interimTranscript) && (
          <div className="w-full max-w-2xl mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-primary-600 mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 mb-1">You said:</p>
                  <p className="text-gray-900">
                    {transcript}
                    {interimTranscript && (
                      <span className="text-gray-500 italic">{interimTranscript}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Response Display */}
        {aiResponse && (
          <div className="w-full max-w-2xl mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
              <div className="flex items-start space-x-3">
                <Bot className="h-5 w-5 text-green-600 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-700">AI Tutor:</p>
                    <div className="flex space-x-2">
                      {!isPlaying ? (
                        <button
                          onClick={playLastResponse}
                          className="btn btn-ghost btn-sm"
                          title="Play response"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                      ) : (
                        <button
                          onClick={stopPlaying}
                          className="btn btn-ghost btn-sm"
                          title="Stop playing"
                        >
                          <Square className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-900">{aiResponse}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex space-x-4">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isProcessing}
            className={`btn btn-lg ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'btn-primary'
            } transition-all duration-200`}
          >
            {isRecording ? (
              <>
                <MicOff className="h-5 w-5 mr-2" />
                Release to Stop
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 mr-2" />
                Hold to Speak
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center max-w-md">
          <p className="text-sm text-gray-600">
            Hold the microphone button and speak your question. Release when done. 
            The AI will respond both with text and voice.
          </p>
          
          {/* Status Indicator */}
          {(liveVoiceStatus === 'fallback_mode' || liveVoiceStatus === 'traditional_mode') && (
            <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-xs text-green-800">
                🎙️ Using traditional voice recording (Reliable mode active)
              </p>
            </div>
          )}
          
          {liveVoiceStatus === 'connected_no_live_transcription' && (
            <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded-lg">
              <p className="text-xs text-blue-800">
                🔄 Hybrid mode: Live conversation with fallback transcription
              </p>
            </div>
          )}
          
          {liveVoiceStatus === 'text_only_mode' && (
            <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded-lg">
              <p className="text-xs text-blue-800">
                💬 Text-only mode (Voice features unavailable)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 max-h-48 overflow-y-auto custom-scrollbar">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Sparkles className="h-4 w-4 mr-2" />
              Conversation History
            </h3>
            <div className="space-y-2">
              {conversationHistory.slice(-6).map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-2 text-sm ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Bot className="h-4 w-4 text-green-600 mt-0.5" />
                  )}
                  <div
                    className={`max-w-xs p-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary-100 text-primary-900'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-xs">{message.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <User className="h-4 w-4 text-primary-600 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default VoiceSession;
