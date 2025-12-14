import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const DocumentUploadTest = () => {
  const navigate = useNavigate();
  
  console.log('DocumentUploadTest rendering...');
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Upload Documents - Test</h1>
            <p className="text-gray-600">Simplified test version</p>
          </div>
        </div>

        {/* Simple content */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Test Upload Page</h2>
          <p className="text-gray-600 mb-4">
            This is a simplified test version to check if the page loads correctly.
          </p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500">Test upload area</p>
            <input
              type="file"
              multiple
              className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadTest;
