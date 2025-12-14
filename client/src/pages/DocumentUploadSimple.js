import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';

const DocumentUploadSimple = () => {
  console.log('DocumentUploadSimple: Starting render...');
  
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  
  console.log('DocumentUploadSimple: About to render JSX...');
  
  const handleFileSelect = (event) => {
    console.log('handleFileSelect called in DocumentUploadSimple', event);
    
    // Add null checks to prevent undefined errors
    if (!event || !event.target || !event.target.files) {
      console.warn('handleFileSelect: Invalid event or missing files');
      return;
    }
    
    try {
      const selectedFiles = Array.from(event.target.files);
      setFiles(selectedFiles);
      console.log('Files selected:', selectedFiles.length, selectedFiles);
    } catch (error) {
      console.error('Error in handleFileSelect (Simple):', error);
      setFiles([]);
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
            <h3 className="font-medium text-gray-900 mb-3">Selected Files:</h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index} className="text-sm text-gray-600">
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadSimple;
