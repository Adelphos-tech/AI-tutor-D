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
    <div className="flex flex-col h-screen bg-surface-100 mobile-optimized">
      {/* Premium Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-surface-200 mobile-header sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <button
              onClick={() => navigate(`/document/${session.document_id}`)}
              className="h-9 w-9 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-primary-700" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-semibold text-primary-900 truncate">
                {session.session_name}
              </h1>
              <div className="flex items-center space-x-2 text-xs text-surface-500">
                <BookOpen className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{session.section_title}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                className="flex items-center space-x-2 px-3 py-2 bg-surface-100 hover:bg-surface-200 rounded-xl transition-colors"
              >
                <Globe className="h-4 w-4 text-primary-600" />
                <span className="text-xs sm:text-sm font-medium text-primary-700 hidden xs:inline">{selectedLanguage.flag} {selectedLanguage.name}</span>
                <span className="text-sm xs:hidden">{selectedLanguage.flag}</span>
              </button>
              
              {showLanguageSelector && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-soft-lg border border-surface-200 z-20 min-w-[160px] overflow-hidden">
                  {supportedLanguages.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => {
                        setSelectedLanguage(language);
                        setShowLanguageSelector(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-surface-50 transition-colors flex items-center space-x-2 ${
                        selectedLanguage.code === language.code ? 'bg-primary-50 text-primary-700' : 'text-primary-900'
                      }`}
                    >
                      <span className="text-lg">{language.flag}</span>
                      <span className="text-sm font-medium">{language.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="hidden sm:flex items-center">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                <div className="w-1.5 h-1.5 bg-success-500 rounded-full mr-1.5"></div>
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mobile-content space-y-4 sm:space-y-6 custom-scrollbar">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-10 sm:py-16">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-800 to-primary-900 flex items-center justify-center mx-auto mb-5 shadow-soft">
              <Bot className="h-8 w-8 text-accent-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-primary-900 mb-2">
              Welcome to your AI Tutor
            </h3>
            <p className="text-sm sm:text-base text-surface-600 mb-6 max-w-md mx-auto px-4">
              I'm here to help you learn about "{session.section_title}". 
              Ask me anything and I'll provide detailed explanations.
            </p>
            
            {/* Suggested Questions */}
            <div className="max-w-2xl mx-auto px-4">
              <p className="text-xs font-medium text-surface-500 mb-3 flex items-center justify-center">
                <HelpCircle className="h-3 w-3 mr-1.5" />
                Try asking:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedQuestions.slice(0, 4).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(question)}
                    className="text-left p-4 text-sm bg-white border border-surface-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 hover:shadow-soft transition-all duration-200"
                  >
                    <span className="text-primary-800">{question}</span>
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
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-primary-800 text-white'
                      : 'bg-gradient-to-br from-primary-800 to-primary-900'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4 text-accent-400" />
                  )}
                </div>
              </div>

              {/* Message */}
              <div
                className={`px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-primary-800 text-white rounded-tr-md'
                    : 'bg-white border border-surface-200 shadow-soft rounded-tl-md'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="text-sm">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none prose-headings:text-primary-900 prose-p:text-primary-800 prose-strong:text-primary-900">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                    {message.isStreaming && (
                      <div className="flex items-center mt-2">
                        <Loader2 className="h-3 w-3 animate-spin mr-1 text-primary-500" />
                        <span className="text-xs text-surface-500">Thinking...</span>
                      </div>
                    )}
                  </div>
                )}
                <p
                  className={`text-xs mt-2 ${
                    message.role === 'user'
                      ? 'text-primary-200'
                      : 'text-surface-400'
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
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-800 to-primary-900 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-accent-400" />
                </div>
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white border border-surface-200 shadow-soft">
                <div className="prose prose-sm max-w-none prose-headings:text-primary-900 prose-p:text-primary-800">
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                  {sending && (
                    <div className="flex items-center mt-2">
                      <Loader2 className="h-3 w-3 animate-spin mr-1 text-primary-500" />
                      <span className="text-xs text-surface-500">Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Premium Input */}
      <div className="bg-white/90 backdrop-blur-md border-t border-surface-200 p-4 safe-area-bottom">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about this section..."
              className="w-full px-4 py-3 rounded-xl border-2 border-surface-200 bg-surface-50 text-primary-900 placeholder:text-surface-400 focus:outline-none focus:border-primary-400 focus:bg-white resize-none transition-all duration-200"
              rows={1}
              disabled={sending}
              style={{
                minHeight: '48px',
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
            className="h-12 w-12 rounded-xl bg-primary-800 hover:bg-primary-900 disabled:bg-surface-300 text-white flex items-center justify-center transition-colors flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-3 text-xs text-surface-400">
          <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
          <span className="sm:hidden">Enter to send</span>
          <div className="flex items-center space-x-1">
            <Sparkles className="h-3 w-3 text-accent-500" />
            <span>Powered by AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSession;
