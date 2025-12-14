import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NaturalVoiceClient from '../services/naturalVoiceClient';
import { getSession } from '../services/api';
import { 
  ArrowLeft, 
  Mic, 
  MicOff,
  Bot, 
  User, 
  BookOpen,
  Loader2,
  Sparkles,
  Globe
} from 'lucide-react';

const VoiceSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  // Language support - Removed Tamil due to limited support
  const supportedLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸', voice: 'en-US', deepgram: 'en-US', sttSupported: true, ttsSupported: true },
    { code: 'ms', name: 'Malay', flag: '🇲🇾', voice: 'ms-MY', deepgram: 'ms', sttSupported: true, ttsSupported: true }, // STT: Native, TTS: Aura Luna
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', voice: 'zh-CN', deepgram: 'zh-CN', sttSupported: true, ttsSupported: true } // STT: Native, TTS: Aura Stella
  ];

  // State management
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [voiceStatus, setVoiceStatus] = useState('disconnected');
  const [selectedLanguage, setSelectedLanguage] = useState(supportedLanguages[0]); // Default to English
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  
  const voiceClientRef = useRef(null);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSession(sessionId);
      setSession(response.session);
      setConversationHistory(response.messages || []);
    } catch (err) {
      console.error('Error fetching session:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    fetchSession();
    // Don't auto-initialize voice client - let user start it manually
  }, [sessionId, fetchSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voiceClientRef.current) {
        voiceClientRef.current.disconnect();
      }
    };
  }, []);

  const initializeNaturalVoiceClient = async () => {
    // Prevent multiple initializations
    if (voiceClientRef.current) {
      console.log('⏭️ Voice client already initialized, skipping');
      return;
    }
    
    try {
      console.log('🎙️ Initializing natural voice conversation...');
      console.log('🌍 Selected language:', selectedLanguage);
      setVoiceStatus('connecting');
      
      // Use Deepgram API key
      const deepgramApiKey = process.env.REACT_APP_DEEPGRAM_API_KEY;
      
      const voiceOptions = {
        language: selectedLanguage.deepgram,
        languageCode: selectedLanguage.code,
        voiceLanguage: selectedLanguage.voice
      };
      console.log('🎙️ Voice client options:', voiceOptions);
      
      const client = new NaturalVoiceClient(sessionId, deepgramApiKey, voiceOptions);
      voiceClientRef.current = client;

      // Set up event handlers
      client.setOnTranscript((transcript, isFinal, confidence) => {
        if (isFinal) {
          setTranscript(transcript);
          setInterimTranscript('');
          // Don't add to history here - will be added by voice client
        } else {
          setInterimTranscript(transcript);
        }
      });
      
      client.setOnResponse((response) => {
        setAiResponse(response);
      });
      
      // Add conversation history callback
      client.setOnConversationUpdate = (history) => {
        setConversationHistory(history);
      };
      
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

  const getStatusColor = () => {
    switch (voiceStatus) {
      case 'connected':
      case 'listening': return 'text-green-600';
      case 'processing':
      case 'speaking': return 'text-blue-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const startVoiceConversation = async () => {
    try {
      setVoiceStatus('connecting');
      if (voiceClientRef.current) {
        voiceClientRef.current.disconnect();
      }
      await initializeNaturalVoiceClient();
    } catch (error) {
      console.error('Failed to start voice conversation:', error);
      setVoiceStatus('error');
    }
  };

  const stopVoiceConversation = () => {
    if (voiceClientRef.current) {
      voiceClientRef.current.disconnect();
      setVoiceStatus('disconnected');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 mobile-optimized">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto mobile-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <button
                onClick={() => navigate('/')}
                className="mobile-button p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center truncate">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                  <span className="truncate">{session?.title || 'Voice Session'}</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">Natural AI Conversation</p>
              </div>
            </div>
            
            {/* Language Selector */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                className="mobile-button flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span className="text-xs sm:text-sm font-medium hidden xs:inline">{selectedLanguage.flag} {selectedLanguage.name}</span>
                <span className="text-sm xs:hidden">{selectedLanguage.flag}</span>
              </button>
              
              {showLanguageSelector && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20 min-w-[160px] mobile-dropdown">
                  {supportedLanguages.map((language) => (
                    <button
                      key={language.code}
                      onClick={async () => {
                        console.log('🌍 Language changed to:', language);
                        setSelectedLanguage(language);
                        setShowLanguageSelector(false);
                        // Restart voice client if it's connected to apply new language
                        if (voiceStatus === 'connected' || voiceStatus === 'listening') {
                          console.log('🔄 Restarting voice client for new language');
                          await stopVoiceConversation();
                          // Small delay before restarting
                          setTimeout(() => {
                            startVoiceConversation();
                          }, 500);
                        }
                      }}
                      className={`mobile-button w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-2 ${
                        selectedLanguage.code === language.code ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      <span className="text-lg">{language.flag}</span>
                      <span className="text-sm font-medium">{language.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto mobile-content">
        
        {/* Voice Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center mb-4 space-y-2 sm:space-y-0 sm:space-x-3">
            <Mic className={`h-8 w-8 sm:h-10 sm:w-10 ${voiceStatus === 'listening' ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
            <div className="text-center sm:text-left">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Dr. Sarah Chen</h2>
              <p className={`text-sm ${getStatusColor()}`}>{getStatusMessage()}</p>
            </div>
          </div>
          
          {/* Control Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-4">
            {voiceStatus === 'disconnected' || voiceStatus === 'error' ? (
              <button
                onClick={startVoiceConversation}
                disabled={voiceStatus === 'connecting'}
                className={`mobile-button px-6 py-3 sm:py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm sm:text-base ${
                  voiceStatus === 'connecting'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                } text-white`}
              >
                {voiceStatus === 'connecting' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                <span className="font-medium">{voiceStatus === 'connecting' ? 'Connecting...' : 'Start Voice Conversation'}</span>
              </button>
            ) : (
              <button
                onClick={stopVoiceConversation}
                className="mobile-button bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-6 py-3 sm:py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm sm:text-base"
              >
                <MicOff className="h-4 w-4" />
                <span className="font-medium">Stop Voice Conversation</span>
              </button>
            )}
          </div>
          
          {voiceStatus === 'listening' && (
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                🎤 Speak naturally - I'm listening and will respond automatically
              </p>
              {(!selectedLanguage.sttSupported || !selectedLanguage.ttsSupported) && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-amber-800 text-xs">
                    {!selectedLanguage.sttSupported && !selectedLanguage.ttsSupported && (
                      <>⚠️ Speech recognition uses English. Voice responses in English. AI text responses in {selectedLanguage.name}.</>
                    )}
                    {selectedLanguage.sttSupported && !selectedLanguage.ttsSupported && (
                      <>⚠️ Speech recognition in {selectedLanguage.name}. Voice responses in English. AI text responses in {selectedLanguage.name}.</>
                    )}
                  </p>
                </div>
              )}
              {selectedLanguage.sttSupported && selectedLanguage.ttsSupported && selectedLanguage.code !== 'en' && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 text-xs">
                    ✅ Full {selectedLanguage.name} support: Speech recognition, voice responses, and AI text responses.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {voiceStatus === 'error' && (
            <div className="text-center mt-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm mb-2">
                  ❌ Connection failed. Please check your microphone permissions and try again.
                </p>
                <button
                  onClick={startVoiceConversation}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Transcript */}
        {(transcript || interimTranscript) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <User className="h-4 w-4 mr-2" />
              You said:
            </h3>
            <div className="space-y-2">
              {transcript && (
                <p className="text-gray-900 bg-blue-50 p-3 rounded-lg">
                  {transcript}
                </p>
              )}
              {interimTranscript && (
                <p className="text-gray-500 italic p-3 rounded-lg border-2 border-dashed border-gray-200">
                  {interimTranscript}
                </p>
              )}
            </div>
          </div>
        )}

        {/* AI Response */}
        {aiResponse && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Bot className="h-4 w-4 mr-2" />
              Dr. Sarah Chen:
            </h3>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {aiResponse}
              </p>
            </div>
          </div>
        )}

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <Sparkles className="h-4 w-4 mr-2" />
              Conversation History
            </h3>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {conversationHistory.slice(-6).map((message, index) => (
                <div
                  key={`${message.timestamp}-${index}`}
                  className={`p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-50 border-l-4 border-blue-400'
                      : 'bg-gray-50 border-l-4 border-gray-400'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 mt-0.5 text-blue-600" />
                    ) : (
                      <Bot className="h-4 w-4 mt-0.5 text-gray-600" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {message.role === 'user' ? 'You' : 'Dr. Sarah Chen'}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6">
            <h3 className="font-medium text-gray-900 mb-2">Natural Voice Conversation</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              This is a natural conversation experience. Simply speak when you want to ask a question or make a comment. 
              Dr. Sarah Chen will listen, process your message, and respond naturally with both text and voice.
              No buttons to press - just talk naturally like you're on a phone call!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceSession;
