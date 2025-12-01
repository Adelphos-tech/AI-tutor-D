import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { documentAPI } from '../services/api';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  ArrowLeft
} from 'lucide-react';

const DocumentUpload = () => {
  const navigate = useNavigate();
  const [uploadState, setUploadState] = useState({
    files: [],
    uploading: false,
    progress: {},
    completed: [],
    errors: []
  });

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(file => ({
        name: file.file.name,
        error: file.errors[0]?.message || 'File rejected'
      }));
      setUploadState(prev => ({
        ...prev,
        errors: [...prev.errors, ...errors]
      }));
    }

    // Add accepted files
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.name.split('.').pop().toLowerCase()
    }));

    setUploadState(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles]
    }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  const removeFile = (fileId) => {
    setUploadState(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== fileId)
    }));
  };

  const uploadFiles = async () => {
    if (uploadState.files.length === 0) return;

    setUploadState(prev => ({ ...prev, uploading: true, errors: [] }));

    for (const fileItem of uploadState.files) {
      try {
        const response = await documentAPI.uploadDocument(
          fileItem.file,
          (progress) => {
            setUploadState(prev => ({
              ...prev,
              progress: {
                ...prev.progress,
                [fileItem.id]: progress
              }
            }));
          }
        );

        // Show processing stage after upload completes
        if (response.processing) {
          setUploadState(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              [fileItem.id]: 100 // Show as processing
            }
          }));

          // Simulate processing progress (since it's async on server)
          let processingProgress = 100;
          const processingInterval = setInterval(() => {
            processingProgress = Math.min(processingProgress + 2, 100);
            setUploadState(prev => ({
              ...prev,
              progress: {
                ...prev.progress,
                [fileItem.id]: processingProgress
              }
            }));

            if (processingProgress >= 100) {
              clearInterval(processingInterval);
              // Mark as completed after processing simulation
              setTimeout(() => {
                setUploadState(prev => ({
                  ...prev,
                  completed: [...prev.completed, {
                    ...fileItem,
                    documentId: response.documentId
                  }]
                }));
              }, 1000);
            }
          }, 200);
        } else {
          setUploadState(prev => ({
            ...prev,
            completed: [...prev.completed, {
              ...fileItem,
              documentId: response.documentId
            }]
          }));
        }

      } catch (error) {
        setUploadState(prev => ({
          ...prev,
          errors: [...prev.errors, {
            name: fileItem.name,
            error: error.response?.data?.message || 'Upload failed'
          }]
        }));
      }
    }

    setUploadState(prev => ({ ...prev, uploading: false }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    const iconClass = "h-8 w-8";
    switch (type) {
      case 'pdf':
        return <FileText className={`${iconClass} text-red-500`} />;
      case 'docx':
        return <FileText className={`${iconClass} text-blue-500`} />;
      case 'xlsx':
        return <FileText className={`${iconClass} text-green-500`} />;
      case 'txt':
        return <FileText className={`${iconClass} text-gray-500`} />;
      default:
        return <FileText className={`${iconClass} text-gray-400`} />;
    }
  };

  const allUploaded = uploadState.completed.length === uploadState.files.length && uploadState.files.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/')}
          className="btn btn-ghost btn-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Documents</h1>
          <p className="mt-2 text-gray-600">
            Upload your educational materials to start learning with AI
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card">
        <div className="card-content">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg text-primary-600">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg text-gray-600 mb-2">
                  Drag & drop files here, or click to select files
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, DOCX, XLSX, and TXT files (max 50MB each)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File List */}
      {uploadState.files.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Selected Files</h2>
            <p className="card-description">
              {uploadState.files.length} file{uploadState.files.length !== 1 ? 's' : ''} ready for upload
            </p>
          </div>
          <div className="card-content">
            {/* Overall Progress */}
            {uploadState.uploading && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-blue-900">Upload Progress</h3>
                  <span className="text-sm text-blue-700">
                    {uploadState.completed.length} of {uploadState.files.length} completed
                  </span>
                </div>
                <div className="bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(uploadState.completed.length / uploadState.files.length) * 100}%` 
                    }}
                  />
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  {uploadState.completed.length === uploadState.files.length 
                    ? 'All files uploaded successfully!' 
                    : 'Uploading and processing your documents...'
                  }
                </p>
              </div>
            )}

            <div className="space-y-3">
              {uploadState.files.map((fileItem) => (
                <div
                  key={fileItem.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(fileItem.type)}
                    <div>
                      <p className="font-medium text-gray-900">{fileItem.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(fileItem.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Enhanced Progress Bar */}
                    {uploadState.uploading && uploadState.progress[fileItem.id] !== undefined && (
                      <div className="w-48">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-1">
                            <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                            <span className="text-xs font-medium text-gray-700">
                              {uploadState.progress[fileItem.id] < 100 ? 'Uploading...' : 'Processing...'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {uploadState.progress[fileItem.id]}%
                          </span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              uploadState.progress[fileItem.id] < 100 
                                ? 'bg-blue-500' 
                                : 'bg-green-500 animate-pulse'
                            }`}
                            style={{ width: `${uploadState.progress[fileItem.id]}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>
                            {uploadState.progress[fileItem.id] < 100 
                              ? `${Math.round((fileItem.size * uploadState.progress[fileItem.id]) / 100 / 1024)} KB uploaded`
                              : 'Generating embeddings...'
                            }
                          </span>
                          <span>{formatFileSize(fileItem.size)}</span>
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    {uploadState.completed.some(c => c.id === fileItem.id) && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}

                    {/* Remove Button */}
                    {!uploadState.uploading && (
                      <button
                        onClick={() => removeFile(fileItem.id)}
                        className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setUploadState({ files: [], uploading: false, progress: {}, completed: [], errors: [] })}
                disabled={uploadState.uploading}
                className="btn btn-outline"
              >
                Clear All
              </button>
              <button
                onClick={uploadFiles}
                disabled={uploadState.uploading || uploadState.files.length === 0}
                className="btn btn-primary"
              >
                {uploadState.uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {uploadState.errors.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title text-red-600">Upload Errors</h2>
          </div>
          <div className="card-content">
            <div className="space-y-2">
              {uploadState.errors.map((error, index) => (
                <div key={index} className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    <strong>{error.name}:</strong> {error.error}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {allUploaded && (
        <div className="card border-green-200 bg-green-50">
          <div className="card-content">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-medium text-green-800">Upload Complete!</h3>
                <p className="text-sm text-green-700 mt-1">
                  Your documents are being processed. You can start using them once processing is complete.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigate('/')}
                className="btn btn-primary"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Supported File Types</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-red-500" />
              <div>
                <p className="font-medium">PDF Documents</p>
                <p className="text-sm text-gray-500">Portable Document Format</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-500" />
              <div>
                <p className="font-medium">Word Documents</p>
                <p className="text-sm text-gray-500">Microsoft Word (.docx)</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium">Excel Spreadsheets</p>
                <p className="text-sm text-gray-500">Microsoft Excel (.xlsx)</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-gray-500" />
              <div>
                <p className="font-medium">Text Files</p>
                <p className="text-sm text-gray-500">Plain text (.txt)</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Processing:</strong> After upload, documents are automatically segmented into chapters/sections 
              and processed for AI tutoring. This may take a few minutes depending on document size.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;
