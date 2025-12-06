import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Add error boundary and logging
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('React app starting...');
console.log('API URL:', process.env.REACT_APP_API_URL || 'http://localhost:5001/api');
console.log('iOS Safari detected:', /iPad|iPhone|iPod/.test(navigator.userAgent));

// iOS Safari specific fixes
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  console.log('Applying iOS Safari fixes...');
  
  // Fix iOS Safari viewport issues
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
  }
  
  // Prevent iOS Safari from pausing JavaScript
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('iOS Safari: Page became visible, ensuring React is running...');
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = '<div style="padding:20px;"><h1>Error: Root element missing</h1><p>React cannot mount - root div not found</p></div>';
} else {
  console.log('✅ Root element found, creating React root...');
  
  try {
    const root = ReactDOM.createRoot(rootElement);
    console.log('✅ React root created, rendering app...');
    
    // Remove StrictMode for mobile compatibility
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      console.log('📱 Mobile detected - rendering without StrictMode for compatibility');
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      );
    } else {
      console.log('🖥️ Desktop detected - rendering with StrictMode');
      root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </React.StrictMode>
      );
    }
    
    console.log('✅ React app rendered successfully');
  } catch (error) {
    console.error('❌ React rendering failed:', error);
    rootElement.innerHTML = `
      <div style="padding:20px; background:#f8d7da; border:1px solid #f5c6cb; border-radius:4px; margin:20px;">
        <h1 style="color:#721c24;">React Rendering Error</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Stack:</strong> ${error.stack}</p>
        <button onclick="location.reload()" style="background:#dc3545; color:white; border:none; padding:10px 20px; border-radius:4px; margin-top:10px;">
          Reload Page
        </button>
      </div>
    `;
  }
}
