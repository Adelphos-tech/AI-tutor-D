import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LoadingFallback from './components/LoadingFallback';
import Dashboard from './pages/Dashboard';
import DocumentUpload from './pages/DocumentUpload';
import TestUpload from './pages/TestUpload';
import DocumentView from './pages/DocumentView';
import ChatSession from './pages/ChatSession';
import VoiceSession from './pages/VoiceSession';

function App() {
  console.log('App component rendering...');
  
  try {
    return (
      <Router>
        <Layout>
          <Suspense fallback={<LoadingFallback message="Loading application..." />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<DocumentUpload />} />
              <Route path="/test-upload" element={<TestUpload />} />
              <Route path="/document/:id" element={<DocumentView />} />
              <Route path="/chat/:sessionId" element={<ChatSession />} />
              <Route path="/voice/:sessionId" element={<VoiceSession />} />
              <Route path="*" element={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
                    <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                    <a href="/" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                      Go Home
                    </a>
                  </div>
                </div>
              } />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    );
  } catch (error) {
    console.error('App error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
          <p className="text-gray-600 mb-4">There was an error loading the application.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }
}

export default App;
