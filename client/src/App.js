import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DocumentUpload from './pages/DocumentUpload';
import DocumentView from './pages/DocumentView';
import ChatSession from './pages/ChatSession';
import VoiceSession from './pages/VoiceSession';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<DocumentUpload />} />
          <Route path="/document/:id" element={<DocumentView />} />
          <Route path="/chat/:sessionId" element={<ChatSession />} />
          <Route path="/voice/:sessionId" element={<VoiceSession />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
