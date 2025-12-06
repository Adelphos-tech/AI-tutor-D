import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft } from 'lucide-react';

const TestUpload = () => {
  const navigate = useNavigate();
  
  console.log('TestUpload component rendering...');
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </button>
          </div>
          
          <div className="text-center">
            <Upload className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Upload Page</h1>
            <p className="text-gray-600 mb-6">
              This is a simple test version of the upload page to verify routing works.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-green-800 mb-2">✅ Success!</h2>
              <p className="text-green-700">
                If you can see this page, the routing is working correctly.
                The white screen issue might be related to the DocumentUpload component itself.
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => navigate('/upload')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Try Full Upload Page
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Reload This Page
              </button>
            </div>
            
            <div className="mt-6 text-left bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Debug Info:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Current URL: {window.location.href}</li>
                <li>• User Agent: {navigator.userAgent}</li>
                <li>• Screen Size: {window.screen.width}x{window.screen.height}</li>
                <li>• Viewport: {window.innerWidth}x{window.innerHeight}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestUpload;
