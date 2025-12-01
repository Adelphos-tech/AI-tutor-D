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
  HelpCircle
} from 'lucide-react';

const ChatSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchSession();
  }, [sessionId, fetchSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
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
                {session.session_name}
              </h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <BookOpen className="h-4 w-4" />
                <span>{session.section_title}</span>
                <span>•</span>
                <span>{session.original_name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to your AI Tutor!
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              I'm here to help you learn about "{session.section_title}". 
              Ask me anything about this section, and I'll provide detailed explanations.
            </p>
            
            {/* Suggested Questions */}
            <div className="max-w-2xl mx-auto">
              <p className="text-sm font-medium text-gray-700 mb-3">
                <HelpCircle className="h-4 w-4 inline mr-1" />
                Try asking:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(question)}
                    className="text-left p-3 text-sm bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
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
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about this section..."
              className="textarea resize-none"
              rows={1}
              disabled={sending}
              style={{
                minHeight: '40px',
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
            className="btn btn-primary btn-md"
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
