import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentAPI, chatAPI } from '../services/api';
import { 
  ArrowLeft, 
  BookOpen, 
  MessageCircle, 
  Mic, 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Users,
  Brain
} from 'lucide-react';

const DocumentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [sections, setSections] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    fetchDocumentData();
  }, [id, fetchDocumentData]);

  const fetchDocumentData = useCallback(async () => {
    try {
      setLoading(true);
      const [docResponse, sessionsResponse] = await Promise.all([
        documentAPI.getDocument(id),
        chatAPI.getDocumentSessions(id)
      ]);
      
      setDocument(docResponse.document);
      setSections(docResponse.sections || []);
      setSessions(sessionsResponse.sessions || []);
    } catch (err) {
      setError('Failed to fetch document data');
      console.error('Error fetching document:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const createChatSession = async (sectionId, sessionType = 'text') => {
    try {
      setCreatingSession(true);
      const section = sections.find(s => s.id === sectionId);
      const sessionName = `${sessionType === 'voice' ? 'Voice' : 'Text'} Session - ${section.section_title}`;
      
      const response = await chatAPI.createSession(id, sectionId, sessionName);
      
      if (sessionType === 'voice') {
        navigate(`/voice/${response.session.id}`);
      } else {
        navigate(`/chat/${response.session.id}`);
      }
    } catch (err) {
      console.error('Error creating session:', err);
      alert('Failed to create session');
    } finally {
      setCreatingSession(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  if (error || !document) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Document</h3>
        <p className="text-gray-500 mb-4">{error || 'Document not found'}</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/')}
          className="btn btn-ghost btn-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{document.original_name}</h1>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span>{document.file_type.toUpperCase()}</span>
            <span>•</span>
            <span>{sections.length} sections</span>
            <span>•</span>
            <span>Uploaded {formatDate(document.upload_date)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {document.processed ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Ready</span>
            </div>
          ) : (
            <div className="flex items-center text-yellow-600">
              <Clock className="h-4 w-4 mr-1 animate-spin" />
              <span className="text-sm font-medium">Processing</span>
            </div>
          )}
        </div>
      </div>

      {/* Document Preview */}
      {document.content_preview && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Document Preview</h2>
          </div>
          <div className="card-content">
            <p className="text-gray-700 leading-relaxed">{document.content_preview}</p>
          </div>
        </div>
      )}

      {!document.processed ? (
        <div className="card border-yellow-200 bg-yellow-50">
          <div className="card-content">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-yellow-600 animate-spin" />
              <div>
                <h3 className="font-medium text-yellow-800">Processing Document</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Your document is being processed and segmented. This may take a few minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Sections */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Document Sections</h2>
              <p className="card-description">
                Select a section to start a learning session
              </p>
            </div>
            <div className="card-content">
              {sections.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No sections found in this document</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                        selectedSection === section.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedSection(selectedSection === section.id ? null : section.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            Section {section.section_number}: {section.section_title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {section.word_count} words
                          </p>
                        </div>
                        
                        {selectedSection === section.id && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                createChatSession(section.id, 'text');
                              }}
                              disabled={creatingSession}
                              className="btn btn-sm btn-primary"
                            >
                              <MessageCircle className="h-4 w-4 mr-1" />
                              Text Chat
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                createChatSession(section.id, 'voice');
                              }}
                              disabled={creatingSession}
                              className="btn btn-sm btn-secondary"
                            >
                              <Mic className="h-4 w-4 mr-1" />
                              Voice Chat
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {selectedSection === section.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            Click on "Text Chat" for a text-based conversation or "Voice Chat" 
                            for a voice-enabled session with this section.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Sessions */}
          {sessions.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Recent Sessions</h2>
                <p className="card-description">
                  Continue your previous learning sessions
                </p>
              </div>
              <div className="card-content">
                <div className="space-y-3">
                  {sessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          {session.session_name?.includes('Voice') ? (
                            <Mic className="h-4 w-4 text-primary-600" />
                          ) : (
                            <MessageCircle className="h-4 w-4 text-primary-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{session.session_name}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{session.section_title}</span>
                            <span>•</span>
                            <span>{session.message_count} messages</span>
                            <span>•</span>
                            <span>{formatDate(session.last_activity)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Link
                          to={session.session_name?.includes('Voice') ? `/voice/${session.id}` : `/chat/${session.id}`}
                          className="btn btn-sm btn-outline"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Continue
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                
                {sessions.length > 5 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      Showing 5 of {sessions.length} sessions
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Learning Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-content">
                <div className="flex items-center space-x-3 mb-4">
                  <Brain className="h-8 w-8 text-primary-600" />
                  <h3 className="font-medium text-gray-900">AI Tutoring Features</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    PhD-level explanations
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Section-scoped knowledge
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Contextual Q&A with RAG
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Conversational memory
                  </li>
                </ul>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="h-8 w-8 text-green-600" />
                  <h3 className="font-medium text-gray-900">Interaction Modes</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <MessageCircle className="h-4 w-4 text-blue-500 mr-2" />
                    Text-based conversations
                  </li>
                  <li className="flex items-center">
                    <Mic className="h-4 w-4 text-green-500 mr-2" />
                    Voice interactions (STT/TTS)
                  </li>
                  <li className="flex items-center">
                    <BookOpen className="h-4 w-4 text-purple-500 mr-2" />
                    Section summaries
                  </li>
                  <li className="flex items-center">
                    <FileText className="h-4 w-4 text-orange-500 mr-2" />
                    Study question generation
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentView;
