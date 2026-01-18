import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Clock, FileText, CheckCircle, Sparkles } from 'lucide-react';

const DocumentUploadSimple = () => {
  console.log('DocumentUploadSimple: Starting render...');
  
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState(null);
  const [processingElapsed, setProcessingElapsed] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState(null);
  
  console.log('DocumentUploadSimple: About to render JSX...', 'Files count:', files.length);
  
  // Processing timer effect
  useEffect(() => {
    let interval;
    if (processing && processingStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
        setProcessingElapsed(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [processing, processingStartTime]);
  
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

  // Format elapsed time
  const formatElapsedTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };
  
  // Calculate estimated progress percentage
  const getProgressPercentage = (attemptNum, maxAttempts) => {
    // Estimate progress based on polling attempts
    // First 5 attempts = 0-40% (content extraction)
    // Next 5 attempts = 40-70% (embeddings)
    // Next 5 attempts = 70-90% (database)
    // Final attempts = 90-95% (finalizing)
    if (attemptNum <= 5) {
      return Math.min(40, attemptNum * 8);
    } else if (attemptNum <= 10) {
      return 40 + ((attemptNum - 5) * 6);
    } else if (attemptNum <= 15) {
      return 70 + ((attemptNum - 10) * 4);
    } else {
      return Math.min(95, 90 + ((attemptNum - 15) * 0.5));
    }
  };

  const pollProcessingStatus = async (docId) => {
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts = 2 minutes max
    
    // Set processing stages based on time
    const updateProcessingStage = (attemptNum) => {
      if (attemptNum <= 2) {
        setProcessingStage('📄 Extracting content from document...');
      } else if (attemptNum <= 5) {
        setProcessingStage('📊 Analyzing document structure...');
      } else if (attemptNum <= 10) {
        setProcessingStage('🧠 Generating AI embeddings...');
      } else if (attemptNum <= 15) {
        setProcessingStage('💾 Saving to database...');
      } else {
        setProcessingStage('✨ Finalizing processing...');
      }
    };
    
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
              navigate('/');
            }, 1500);
            return;
          }
        }
        
        // Continue polling if not complete and haven't exceeded max attempts
        attempts++;
        updateProcessingStage(attempts);
        setProcessingProgress(getProgressPercentage(attempts, maxAttempts));
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 2000); // Check every 2 seconds
        } else {
          // Timeout - just redirect anyway
          console.log('⚠️ Processing timeout, redirecting...');
          setProcessing(false);
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking processing status:', error);
        // Continue polling despite errors
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 2000);
        } else {
          setProcessing(false);
          navigate('/');
        }
      }
    };
    
    // Start checking after 3 seconds (give server time to start processing)
    setTimeout(checkStatus, 3000);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    console.log('Starting upload...');
    
    try {
      const formData = new FormData();
      formData.append('document', files[0]);
      
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      
      // Use XMLHttpRequest to track upload progress
      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percentComplete);
            console.log(`Upload progress: ${percentComplete}%`);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              ok: true,
              json: () => Promise.resolve(JSON.parse(xhr.responseText))
            });
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.open('POST', `${API_BASE_URL}/documents/upload`);
        xhr.send(formData);
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
        setProcessingStartTime(Date.now());
        setProcessingElapsed(0);
        setProcessingStage('📄 Extracting content from document...');
        setProcessingProgress(0);
        
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Premium Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/')}
          className="h-10 w-10 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-primary-700" />
        </button>
        <div>
          <div className="flex items-center space-x-2 mb-0.5">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary-800 to-primary-900 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-accent-400" />
            </div>
            <span className="text-xs font-medium text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">Upload</span>
          </div>
          <h1 className="text-2xl font-semibold text-primary-900 tracking-tight">Upload Documents</h1>
          <p className="text-surface-500 text-sm">Add your study materials to get started</p>
        </div>
      </div>

      {/* Premium Upload Card */}
      <div className="card-premium p-8">
        <div className="border-2 border-dashed border-surface-300 rounded-2xl p-10 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-all duration-200 cursor-pointer">
          <div className="h-16 w-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-primary-600" />
          </div>
          <p className="text-lg font-medium text-primary-900 mb-1">Drop your files here</p>
          <p className="text-sm text-surface-500 mb-4">or click to browse</p>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.txt"
            onChange={handleFileSelect}
            className="block w-full max-w-xs mx-auto text-sm text-surface-600 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-800 file:text-white hover:file:bg-primary-900 file:cursor-pointer file:transition-colors"
          />
          <p className="text-xs text-surface-400 mt-4">Supports PDF, DOCX, XLSX, TXT</p>
        </div>
        
        {/* Selected Files */}
        {files.length > 0 && (
          <div className="mt-6 pt-6 border-t border-surface-200">
            <h3 className="font-semibold text-primary-900 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-primary-600" />
              Selected Files ({files.length})
            </h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index} className="flex items-center p-3 bg-surface-50 rounded-xl">
                  <div className="h-10 w-10 rounded-lg bg-white border border-surface-200 flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-900 truncate">{file.name}</p>
                    <p className="text-xs text-surface-500">{Math.round(file.size / 1024)} KB</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Upload Button */}
        {files.length > 0 && !uploadComplete && (
          <div className="mt-6">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full btn btn-primary py-4 text-base"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  Uploading... {uploadProgress}%
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Document
                </span>
              )}
            </button>
            
            {/* Premium Progress Bar */}
            {uploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-600">Uploading file...</span>
                  <span className="font-semibold text-primary-700">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-surface-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-primary-600 to-primary-700 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing Status */}
        {processing && (
          <div className="mt-6 p-5 bg-primary-50 border border-primary-200 rounded-2xl">
            <div className="flex items-start">
              <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center mr-4 flex-shrink-0">
                <div className="h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-primary-900 font-semibold">Processing your document...</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                      {processingProgress}%
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatElapsedTime(processingElapsed)}
                    </span>
                  </div>
                </div>
                <p className="text-primary-600 text-sm mt-2">{processingStage}</p>
                <div className="mt-4">
                  <div className="w-full bg-primary-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-primary-600 to-accent-500 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing Complete */}
        {processingComplete && (
          <div className="mt-6 p-5 bg-success-50 border border-success-200 rounded-2xl">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-xl bg-success-100 flex items-center justify-center mr-4">
                <CheckCircle className="h-5 w-5 text-success-600" />
              </div>
              <div>
                <p className="text-success-800 font-semibold">Processing complete!</p>
                <p className="text-success-600 text-sm">Redirecting to dashboard...</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Success (fallback) */}
        {uploadComplete && !processing && !processingComplete && (
          <div className="mt-6 p-5 bg-success-50 border border-success-200 rounded-2xl">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-xl bg-success-100 flex items-center justify-center mr-4">
                <CheckCircle className="h-5 w-5 text-success-600" />
              </div>
              <p className="text-success-800 font-semibold">Upload successful! Redirecting to dashboard...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-5 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center mr-4">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadSimple;
