import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentAPI } from '../services/api';
import { 
  BookOpen, 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Trash2,
  MessageCircle,
  Mic,
  RefreshCw
} from 'lucide-react';

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const response = await documentAPI.getDocuments();
      const docs = response.documents || [];
      setDocuments(docs);
    } catch (err) {
      setError('Failed to fetch documents');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    await fetchDocuments();
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentAPI.deleteDocument(documentId);
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getFileIcon = (fileType) => {
    switch (fileType.toLowerCase()) {
      case '.pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case '.docx':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case '.xlsx':
        return <FileText className="h-8 w-8 text-green-500" />;
      case '.txt':
        return <FileText className="h-8 w-8 text-gray-500" />;
      default:
        return <FileText className="h-8 w-8 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mobile-optimized">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Manage your documents and start learning sessions
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 sm:flex-none mobile-button btn btn-secondary px-4 py-3 sm:btn-lg disabled:opacity-50"
            title="Refresh document list"
          >
            <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            to="/upload"
            className="flex-1 sm:flex-none mobile-button btn btn-primary px-6 py-3 sm:btn-lg"
          >
            <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Upload Document
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Processed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.filter(doc => doc.processed).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Processing</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.filter(doc => !doc.processed).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Your Documents</h2>
          <p className="card-description">
            Click on a document to view its sections and start learning
          </p>
        </div>
        <div className="card-content">
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-500 mb-4">
                Upload your first document to get started with AI tutoring
              </p>
              <Link to="/upload" className="btn btn-primary">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getFileIcon(document.file_type)}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/document/${document.id}`}
                        className="text-lg font-medium text-gray-900 hover:text-primary-600 transition-colors"
                      >
                        {document.original_name}
                      </Link>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>{formatFileSize(document.file_size)}</span>
                        <span>•</span>
                        <span>{formatDate(document.upload_date)}</span>
                        <span>•</span>
                        <span>{document.total_chunks} sections</span>
                      </div>
                      {document.content_preview && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {document.content_preview}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Processing Status */}
                    {document.processed ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Ready</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-yellow-600">
                        <Clock className="h-4 w-4 mr-1 animate-spin" />
                        <span className="text-xs font-medium">Processing</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {document.processed && (
                      <div className="flex space-x-2">
                        <Link
                          to={`/document/${document.id}`}
                          className="btn btn-sm btn-outline"
                          title="View Document"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteDocument(document.id)}
                          className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50"
                          title="Delete Document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {documents.some(doc => doc.processed) && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Quick Actions</h2>
            <p className="card-description">
              Common actions for your processed documents
            </p>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <MessageCircle className="h-8 w-8 text-primary-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Text Chat</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Start a text-based conversation with your AI tutor about any document section.
                </p>
                <p className="text-xs text-gray-500">
                  Select a document and section to begin
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <Mic className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Voice Chat</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Have a natural voice conversation with your AI tutor using speech-to-text and text-to-speech.
                </p>
                <p className="text-xs text-gray-500">
                  Select a document and section to begin
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
