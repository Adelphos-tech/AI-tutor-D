import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, 
  Send, 
  Bot, 
  User, 
  Loader2,
  BookOpen,
  MessageCircle,
  Sparkles,
  HelpCircle,
  Globe
} from 'lucide-react';

const ChatSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  // Language support - Removed Tamil due to limited support
  const supportedLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸', sttSupported: true, ttsSupported: true },
    { code: 'ms', name: 'Malay', flag: '🇲🇾', sttSupported: true, ttsSupported: true },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', sttSupported: true, ttsSupported: true }
  ];
  
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(supportedLanguages[0]);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getSession(sessionId);
      setSession(response.session);
      setMessages(response.messages || []);
    } catch (err) {
      console.error('Error fetching session:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    fetchSession();
  }, [sessionId, fetchSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setSending(true);
    setIsStreaming(true);
    setStreamingMessage('');

    // Add user message to UI immediately
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      let fullResponse = '';
      let messageIndex = -1;
      
      // Add a placeholder AI message immediately
      const placeholderMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      };
      
      setMessages(prev => {
        const newMessages = [...prev, placeholderMessage];
        messageIndex = newMessages.length - 1;
        return newMessages;
      });
      
      // Use streaming API
      await chatAPI.streamMessage(
        sessionId,
        userMessage,
        selectedLanguage.code,
        (chunk) => {
          fullResponse += chunk;
          setStreamingMessage(fullResponse);
          
          // Update the placeholder message in real-time
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages[messageIndex]) {
              newMessages[messageIndex] = {
                ...newMessages[messageIndex],
                content: fullResponse
              };
            }
            return newMessages;
          });
          
          console.log('Streaming chunk:', chunk, 'Full response so far:', fullResponse);
        },
        () => {
          // On complete, finalize the message
          console.log('Streaming complete. Final response:', fullResponse);
          
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages[messageIndex]) {
              newMessages[messageIndex] = {
                ...newMessages[messageIndex],
                content: fullResponse,
                isStreaming: false
              };
            }
            return newMessages;
          });
          
          setStreamingMessage('');
          setIsStreaming(false);
          setSending(false);
        },
        (error) => {
          console.error('Streaming error:', error);
          
          // Remove the placeholder message on error
          setMessages(prev => prev.slice(0, -1));
          
          setIsStreaming(false);
          setSending(false);
          setStreamingMessage('');
          alert('Failed to send message. Please try again.');
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);
      setSending(false);
      setStreamingMessage('');
      alert('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const suggestedQuestions = [
    "Can you summarize the main points of this section?",
    "What are the key concepts I should understand?",
    "Can you explain this in simpler terms?",
    "What are some examples of this concept?",
    "How does this relate to other topics?",
    "Can you create some practice questions for me?"
  ];

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
        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Session not found</h3>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 mobile-optimized">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 mobile-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            <button
              onClick={() => navigate(`/document/${session.document_id}`)}
              className="mobile-button btn btn-ghost btn-sm flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Back</span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {session.session_name}
              </h1>
              <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-500">
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">{session.section_title}</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate hidden sm:inline">{session.original_name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Language Selector */}
            <div className="relative">
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
                      onClick={() => {
                        setSelectedLanguage(language);
                        setShowLanguageSelector(false);
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
            
            <div className="hidden sm:flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mobile-content space-y-4 sm:space-y-6 custom-scrollbar">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-8 sm:py-12">
            <Bot className="h-10 w-10 sm:h-12 sm:w-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              Welcome to your AI Tutor!
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto px-4">
              I'm here to help you learn about "{session.section_title}". 
              Ask me anything about this section, and I'll provide detailed explanations.
            </p>
            
            {/* Suggested Questions */}
            <div className="max-w-2xl mx-auto px-4">
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-3">
                <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                Try asking:
              </p>
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(question)}
                    className="mobile-button text-left p-3 sm:p-4 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  >
                    "{question}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-3xl ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 ${
                  message.role === 'user' ? 'ml-3' : 'mr-3'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
              </div>

              {/* Message */}
              <div
                className={`px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="text-sm">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                    {message.isStreaming && (
                      <div className="flex items-center mt-2">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        <span className="text-xs text-gray-500">Thinking...</span>
                      </div>
                    )}
                  </div>
                )}
                <p
                  className={`text-xs mt-2 ${
                    message.role === 'user'
                      ? 'text-primary-100'
                      : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Streaming Message */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="flex max-w-3xl">
              <div className="flex-shrink-0 mr-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
              </div>
              <div className="px-4 py-3 rounded-lg bg-white border border-gray-200">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                  {sending && (
                    <div className="flex items-center mt-2">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      <span className="text-xs text-gray-500">Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 mobile-header safe-area-bottom">
        <div className="flex space-x-2 sm:space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about this section..."
              className="mobile-input textarea resize-none text-base sm:text-sm"
              rows={1}
              disabled={sending}
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                height: 'auto',
                overflow: 'hidden'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || sending}
            className="mobile-button btn btn-primary flex-shrink-0 px-3 sm:px-4 py-3 sm:py-2"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
          <div className="flex items-center space-x-1">
            <Sparkles className="h-3 w-3" />
            <span>Powered by AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSession;
