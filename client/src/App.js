import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LoadingFallback from './components/LoadingFallback';
import VisualLogger from './components/VisualLogger';
import MobileErrorDisplay from './components/MobileErrorDisplay';
import Dashboard from './pages/Dashboard';
import DocumentUpload from './pages/DocumentUpload';
import DocumentUploadSimple from './pages/DocumentUploadSimple';
import DocumentUploadTest from './pages/DocumentUploadTest';
import DirectTest from './pages/DirectTest';
import MobileDebugAdvanced from './pages/MobileDebugAdvanced';
import AutomatedTester from './pages/AutomatedTester';
import TestUpload from './pages/TestUpload';
import MobileDebug from './pages/MobileDebug';
import DocumentView from './pages/DocumentView';
import ChatSession from './pages/ChatSession';
import VoiceSession from './pages/VoiceSession';

function App() {
  console.log('App component rendering...');
  
  return (
    <Router>
      <Routes>
        {/* Direct test routes - bypass Layout */}
        <Route path="/direct-test" element={<DirectTest />} />
        <Route path="/mobile-debug-advanced" element={<MobileDebugAdvanced />} />
        <Route path="/automated-tester" element={<AutomatedTester />} />
        
        {/* All other routes use Layout */}
        <Route path="/*" element={
          <Layout>
            <Suspense fallback={<LoadingFallback message="Loading application..." />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/upload" element={<DocumentUploadSimple />} />
                <Route path="/upload-original" element={<DocumentUpload />} />
                <Route path="/upload-test" element={<DocumentUploadTest />} />
                <Route path="/test-upload" element={<TestUpload />} />
                <Route path="/mobile-debug" element={<MobileDebug />} />
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
        } />
      </Routes>
      <VisualLogger />
      <MobileErrorDisplay />
    </Router>
  );
}

export default App;
