import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';

const DocumentUploadSimple = () => {
  console.log('DocumentUploadSimple: Starting render...');
  
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [error, setError] = useState(null);
  
  console.log('DocumentUploadSimple: About to render JSX...', 'Files count:', files.length);
  
  const handleFileSelect = (event) => {
    console.log('handleFileSelect called in DocumentUploadSimple', event);
    
    // Add null checks to prevent undefined errors
    if (!event || !event.target || !event.target.files) {
      console.warn('handleFileSelect: Invalid event or missing files');
      return;
    }
    
    try {
      const selectedFiles = Array.from(event.target.files);
      console.log('About to setFiles with:', selectedFiles.length, selectedFiles);
      setFiles(selectedFiles);
      setUploadComplete(false);
      setError(null);
      console.log('Files selected:', selectedFiles.length, selectedFiles);
    } catch (error) {
      console.error('Error in handleFileSelect (Simple):', error);
      setFiles([]);
    }
  };

  const pollProcessingStatus = async (docId) => {
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts = 2 minutes max
    
    const checkStatus = async () => {
      try {
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_BASE_URL}/documents/${docId}`);
        
        if (response.ok) {
          const doc = await response.json();
          console.log('Document status:', doc.processed);
          
          if (doc.document?.processed || doc.processed) {
            // Processing complete!
            console.log('✅ Document processing complete!');
            setProcessing(false);
            setProcessingComplete(true);
            
            // Redirect to dashboard after showing success
            setTimeout(() => {
              navigate('/', { state: { documentAdded: true } });
            }, 1500);
            return;
          }
        }
        
        // Continue polling if not complete and haven't exceeded max attempts
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 2000); // Check every 2 seconds
        } else {
          // Timeout - just redirect anyway
          console.log('⚠️ Processing timeout, redirecting...');
          setProcessing(false);
          navigate('/', { state: { documentAdded: true } });
        }
      } catch (error) {
        console.error('Error checking processing status:', error);
        // Continue polling despite errors
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 2000);
        } else {
          setProcessing(false);
          navigate('/', { state: { documentAdded: true } });
        }
      }
    };
    
    // Start checking after 3 seconds (give server time to start processing)
    setTimeout(checkStatus, 3000);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setError(null);
    console.log('Starting upload...');
    
    try {
      const formData = new FormData();
      formData.append('document', files[0]);
      
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Upload successful:', result);
      setUploadComplete(true);
      
      // If we got a document ID or processing info, track it
      if (result.documentId || result.processingId) {
        setProcessing(true);
        
        // Start polling for processing status
        pollProcessingStatus(result.documentId);
      } else {
        // No processing tracking available, redirect after short delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Documents (Simple)</h1>
          <p className="text-gray-600">Simplified version for debugging</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-600 mb-2">Select files to upload</p>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.txt"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        
        {files.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium text-gray-900 mb-3">Selected Files: ({files.length})</h3>
            <ul className="space-y-2">
              {files.map((file, index) => {
                console.log('Rendering file:', index, file.name, file.size);
                return (
                  <li key={index} className="text-sm text-gray-600">
                    {file.name} ({Math.round(file.size / 1024)} KB)
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        
        {/* Upload Button */}
        {files.length > 0 && !uploadComplete && (
          <div className="mt-6">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Document
                </span>
              )}
            </button>
          </div>
        )}

        {/* Processing Status */}
        {processing && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div>
                <p className="text-blue-800 font-medium">Processing your document...</p>
                <p className="text-blue-600 text-sm mt-1">This may take a minute. Please wait...</p>
              </div>
            </div>
          </div>
        )}

        {/* Processing Complete */}
        {processingComplete && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-green-800 font-medium">✅ Processing complete!</p>
                <p className="text-green-600 text-sm">Redirecting to dashboard...</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Success (fallback) */}
        {uploadComplete && !processing && !processingComplete && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-800 font-medium">Upload successful! Redirecting to dashboard...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}
        
        {/* Debug info */}
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <strong>Debug:</strong> Files array length: {files.length}
          {files.length > 0 && (
            <div>Files: {files.map(f => f.name).join(', ')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadSimple;
