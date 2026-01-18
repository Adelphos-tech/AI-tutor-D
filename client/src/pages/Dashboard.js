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
  RefreshCw,
  Sparkles,
  ArrowRight
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
    const document = documents.find(doc => doc.id === documentId);
    
    let confirmMessage = 'Are you sure you want to delete this document?';
    if (document && !document.processed) {
      confirmMessage = '⚠️ This document is still processing. Are you sure you want to delete it?\n\nDeleting a processing document will cancel the upload and remove all data.';
    }
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await documentAPI.deleteDocument(documentId);
      setDocuments(documents.filter(doc => doc.id !== documentId));
      console.log(`✅ Document ${documentId} deleted successfully`);
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document. Please try again.');
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
        return <FileText className="h-6 w-6 text-red-500" />;
      case '.docx':
        return <FileText className="h-6 w-6 text-primary-600" />;
      case '.xlsx':
        return <FileText className="h-6 w-6 text-success-600" />;
      case '.txt':
        return <FileText className="h-6 w-6 text-surface-500" />;
      default:
        return <FileText className="h-6 w-6 text-surface-400" />;
    }
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

  return (
    <div className="space-y-6 sm:space-y-8 mobile-optimized">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-800 to-primary-900 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-accent-400" />
            </div>
            <span className="text-xs font-medium text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-primary-900 tracking-tight">Welcome back</h1>
          <p className="mt-1 text-surface-600">
            Manage your documents and start learning sessions
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 sm:flex-none mobile-button btn btn-secondary px-4 py-3 disabled:opacity-50"
            title="Refresh document list"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            to="/upload"
            className="flex-1 sm:flex-none mobile-button btn btn-primary px-5 py-3"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Link>
        </div>
      </div>

      {/* Premium Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="card-premium p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-500 mb-1">Total Documents</p>
              <p className="text-3xl font-semibold text-primary-900">{documents.length}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary-100 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary-700" />
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-500 mb-1">Processed</p>
              <p className="text-3xl font-semibold text-success-700">
                {documents.filter(doc => doc.processed).length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-success-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-500 mb-1">Processing</p>
              <p className="text-3xl font-semibold text-accent-600">
                {documents.filter(doc => !doc.processed).length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-accent-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-accent-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center mr-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-sm font-medium text-red-800">{error}</p>
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
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-surface-200 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 mb-2">No documents yet</h3>
              <p className="text-surface-500 mb-6 max-w-sm mx-auto">
                Upload your first document to get started with AI tutoring
              </p>
              <Link to="/upload" className="btn btn-primary px-6 py-3">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="group flex items-center justify-between p-4 bg-surface-50 border border-surface-200 rounded-xl hover:bg-white hover:shadow-soft hover:border-surface-300 transition-all duration-200"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="h-12 w-12 rounded-xl bg-white border border-surface-200 flex items-center justify-center flex-shrink-0">
                      {getFileIcon(document.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/document/${document.id}`}
                        className="text-base font-semibold text-primary-900 hover:text-primary-700 transition-colors flex items-center group/link"
                      >
                        <span className="truncate">{document.original_name}</span>
                        <ArrowRight className="h-4 w-4 ml-1 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                      </Link>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-sm text-surface-500">
                        <span>{formatFileSize(document.file_size)}</span>
                        <span className="text-surface-300">•</span>
                        <span>{formatDate(document.upload_date)}</span>
                        <span className="text-surface-300">•</span>
                        <span>{document.total_chunks} sections</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 ml-4">
                    {/* Processing Status Badge */}
                    {document.processed ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-accent-100 text-accent-700">
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Processing
                      </span>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {document.processed && (
                        <Link
                          to={`/document/${document.id}`}
                          className="btn btn-sm btn-ghost"
                          title="View Document"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Link>
                      )}
                      <button
                        onClick={() => handleDeleteDocument(document.id)}
                        className="btn btn-sm btn-ghost text-red-500 hover:bg-red-50"
                        title={document.processed ? "Delete Document" : "Delete Processing Document"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
              <div className="group p-5 bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-2xl hover:shadow-soft transition-all duration-200">
                <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <MessageCircle className="h-6 w-6 text-primary-700" />
                </div>
                <h3 className="font-semibold text-primary-900 mb-2">Text Chat</h3>
                <p className="text-sm text-surface-600 mb-3">
                  Start a text-based conversation with your AI tutor about any document section.
                </p>
                <p className="text-xs text-surface-400 flex items-center">
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Select a document to begin
                </p>
              </div>

              <div className="group p-5 bg-gradient-to-br from-success-50 to-white border border-success-100 rounded-2xl hover:shadow-soft transition-all duration-200">
                <div className="h-12 w-12 rounded-xl bg-success-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Mic className="h-6 w-6 text-success-700" />
                </div>
                <h3 className="font-semibold text-primary-900 mb-2">Voice Chat</h3>
                <p className="text-sm text-surface-600 mb-3">
                  Have a natural voice conversation with your AI tutor using speech-to-text.
                </p>
                <p className="text-xs text-surface-400 flex items-center">
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Select a document to begin
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
