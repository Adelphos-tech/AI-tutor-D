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
  Brain,
  Sparkles
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

  useEffect(() => {
    fetchDocumentData();
  }, [id, fetchDocumentData]);

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
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-surface-200"></div>
          <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-2 border-primary-600 border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-primary-900 mb-2">Error Loading Document</h3>
        <p className="text-surface-500 mb-6">{error || 'Document not found'}</p>
        <button onClick={() => navigate('/')} className="btn btn-primary px-6 py-3">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <button
          onClick={() => navigate('/')}
          className="h-10 w-10 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5 text-primary-700" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary-800 to-primary-900 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-accent-400" />
            </div>
            <span className="text-xs font-medium text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">Document</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-primary-900 tracking-tight truncate">{document.original_name}</h1>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-surface-500">
            <span className="font-medium text-primary-600">{document.file_type.toUpperCase()}</span>
            <span className="text-surface-300">•</span>
            <span>{sections.length} sections</span>
            <span className="text-surface-300">•</span>
            <span>Uploaded {formatDate(document.upload_date)}</span>
          </div>
        </div>
        <div className="flex-shrink-0">
          {document.processed ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-success-100 text-success-700">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Ready
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700">
              <Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Processing
            </span>
          )}
        </div>
      </div>

      {/* Document Preview */}
      {document.content_preview && (
        <div className="card-premium p-6">
          <h2 className="text-lg font-semibold text-primary-900 mb-3">Document Preview</h2>
          <p className="text-surface-600 leading-relaxed">{document.content_preview}</p>
        </div>
      )}

      {!document.processed ? (
        <div className="card-premium p-5 border-accent-200 bg-accent-50">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-accent-100 flex items-center justify-center flex-shrink-0">
              <Clock className="h-6 w-6 text-accent-600 animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-accent-800">Processing Document</h3>
              <p className="text-sm text-accent-700 mt-0.5">
                Your document is being processed and segmented. This may take a few minutes.
              </p>
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
                <div className="text-center py-12">
                  <div className="h-14 w-14 rounded-2xl bg-surface-200 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-7 w-7 text-surface-400" />
                  </div>
                  <p className="text-surface-500">No sections found in this document</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className={`p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                        selectedSection === section.id
                          ? 'bg-primary-50 border-2 border-primary-300 shadow-soft'
                          : 'bg-surface-50 border border-surface-200 hover:bg-white hover:border-surface-300 hover:shadow-soft'
                      }`}
                      onClick={() => setSelectedSection(selectedSection === section.id ? null : section.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-primary-900 mb-1">
                            Section {section.section_number}: {section.section_title}
                          </h3>
                          <p className="text-sm text-surface-500">
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
                        <div className="mt-3 pt-3 border-t border-primary-200">
                          <p className="text-sm text-primary-700">
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
                      className="group flex items-center justify-between p-4 bg-surface-50 border border-surface-200 rounded-xl hover:bg-white hover:shadow-soft transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center">
                          {session.session_name?.includes('Voice') ? (
                            <Mic className="h-5 w-5 text-primary-700" />
                          ) : (
                            <MessageCircle className="h-5 w-5 text-primary-700" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-primary-900">{session.session_name}</p>
                          <div className="flex items-center flex-wrap gap-x-2 text-xs text-surface-500 mt-0.5">
                            <span>{session.section_title}</span>
                            <span className="text-surface-300">•</span>
                            <span>{session.message_count} messages</span>
                          </div>
                        </div>
                      </div>
                      
                      <Link
                        to={session.session_name?.includes('Voice') ? `/voice/${session.id}` : `/chat/${session.id}`}
                        className="btn btn-sm btn-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Continue
                      </Link>
                    </div>
                  ))}
                </div>
                
                {sessions.length > 5 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-surface-400">
                      Showing 5 of {sessions.length} sessions
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Learning Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-premium p-5">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary-700" />
                </div>
                <h3 className="font-semibold text-primary-900">AI Tutoring Features</h3>
              </div>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center text-surface-600">
                  <CheckCircle className="h-4 w-4 text-success-500 mr-2.5 flex-shrink-0" />
                  PhD-level explanations
                </li>
                <li className="flex items-center text-surface-600">
                  <CheckCircle className="h-4 w-4 text-success-500 mr-2.5 flex-shrink-0" />
                  Section-scoped knowledge
                </li>
                <li className="flex items-center text-surface-600">
                  <CheckCircle className="h-4 w-4 text-success-500 mr-2.5 flex-shrink-0" />
                  Contextual Q&A with RAG
                </li>
                <li className="flex items-center text-surface-600">
                  <CheckCircle className="h-4 w-4 text-success-500 mr-2.5 flex-shrink-0" />
                  Conversational memory
                </li>
              </ul>
            </div>

            <div className="card-premium p-5">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-success-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-success-700" />
                </div>
                <h3 className="font-semibold text-primary-900">Interaction Modes</h3>
              </div>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center text-surface-600">
                  <MessageCircle className="h-4 w-4 text-primary-500 mr-2.5 flex-shrink-0" />
                  Text-based conversations
                </li>
                <li className="flex items-center text-surface-600">
                  <Mic className="h-4 w-4 text-success-500 mr-2.5 flex-shrink-0" />
                  Voice interactions (STT/TTS)
                </li>
                <li className="flex items-center text-surface-600">
                  <BookOpen className="h-4 w-4 text-accent-500 mr-2.5 flex-shrink-0" />
                  Section summaries
                </li>
                <li className="flex items-center text-surface-600">
                  <FileText className="h-4 w-4 text-accent-600 mr-2.5 flex-shrink-0" />
                  Study question generation
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentView;
