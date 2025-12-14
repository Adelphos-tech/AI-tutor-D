import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MobileDebugAdvanced = () => {
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    // Collect comprehensive device and browser info
    const info = {
      // User Agent
      userAgent: navigator.userAgent,
      
      // Screen info
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      
      // Mobile detection
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isAndroid: /Android/.test(navigator.userAgent),
      
      // Browser info
      isChrome: /Chrome/.test(navigator.userAgent),
      isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
      isFirefox: /Firefox/.test(navigator.userAgent),
      
      // Touch support
      touchSupport: 'ontouchstart' in window,
      
      // Viewport meta
      viewportMeta: document.querySelector('meta[name="viewport"]')?.content || 'Not found',
      
      // CSS support
      cssSupport: {
        flexbox: CSS.supports('display', 'flex'),
        grid: CSS.supports('display', 'grid'),
        customProperties: CSS.supports('--test', 'value'),
      },
      
      // Current URL
      currentUrl: window.location.href,
      pathname: window.location.pathname,
      
      // Timestamp
      timestamp: new Date().toISOString(),
    };
    
    setDebugInfo(info);
    console.log('Mobile Debug Info:', info);
  }, []);

  const testNavigation = async (path, description) => {
    try {
      console.log(`Testing navigation to: ${path}`);
      navigate(path);
      setTestResults(prev => ({
        ...prev,
        [path]: { status: 'success', description, timestamp: new Date().toISOString() }
      }));
    } catch (error) {
      console.error(`Navigation test failed for ${path}:`, error);
      setTestResults(prev => ({
        ...prev,
        [path]: { status: 'error', error: error.message, description, timestamp: new Date().toISOString() }
      }));
    }
  };

  const testComponent = (componentName) => {
    try {
      console.log(`Testing component: ${componentName}`);
      // This will help us see if components are loading
      return { status: 'loaded', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error(`Component test failed for ${componentName}:`, error);
      return { status: 'error', error: error.message, timestamp: new Date().toISOString() };
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      padding: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ 
          color: '#111827', 
          marginBottom: '24px',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          🔍 Advanced Mobile Debug
        </h1>

        {/* Device Info */}
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#374151', marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
            📱 Device Information
          </h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div><strong>Mobile:</strong> {debugInfo.isMobile ? '✅ Yes' : '❌ No'}</div>
            <div><strong>iOS:</strong> {debugInfo.isIOS ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Android:</strong> {debugInfo.isAndroid ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Screen:</strong> {debugInfo.screenWidth}×{debugInfo.screenHeight}</div>
            <div><strong>Window:</strong> {debugInfo.windowWidth}×{debugInfo.windowHeight}</div>
            <div><strong>Pixel Ratio:</strong> {debugInfo.devicePixelRatio}</div>
            <div><strong>Touch:</strong> {debugInfo.touchSupport ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>

        {/* Browser Info */}
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#374151', marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
            🌐 Browser Information
          </h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div><strong>Chrome:</strong> {debugInfo.isChrome ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Safari:</strong> {debugInfo.isSafari ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Firefox:</strong> {debugInfo.isFirefox ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Viewport Meta:</strong> {debugInfo.viewportMeta}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', wordBreak: 'break-all' }}>
              <strong>User Agent:</strong> {debugInfo.userAgent}
            </div>
          </div>
        </div>

        {/* CSS Support */}
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#374151', marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
            🎨 CSS Support
          </h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div><strong>Flexbox:</strong> {debugInfo.cssSupport?.flexbox ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Grid:</strong> {debugInfo.cssSupport?.grid ? '✅ Yes' : '❌ No'}</div>
            <div><strong>CSS Variables:</strong> {debugInfo.cssSupport?.customProperties ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>

        {/* Navigation Tests */}
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#374151', marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
            🧪 Navigation Tests
          </h2>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => testNavigation('/', 'Home/Dashboard')}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Test Home (/)
            </button>
            <button
              onClick={() => testNavigation('/direct-test', 'Direct Test (No Layout)')}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Test Direct (/direct-test)
            </button>
            <button
              onClick={() => testNavigation('/upload', 'Upload Simple')}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Test Upload (/upload)
            </button>
          </div>

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <div>
              <h3 style={{ color: '#374151', marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
                Test Results:
              </h3>
              {Object.entries(testResults).map(([path, result]) => (
                <div key={path} style={{ 
                  padding: '8px', 
                  backgroundColor: result.status === 'success' ? '#d1fae5' : '#fee2e2',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  fontSize: '12px'
                }}>
                  <strong>{path}</strong>: {result.status === 'success' ? '✅' : '❌'} {result.description}
                  {result.error && <div style={{ color: '#dc2626' }}>Error: {result.error}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Status */}
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#374151', marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
            📍 Current Status
          </h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div><strong>URL:</strong> {debugInfo.currentUrl}</div>
            <div><strong>Path:</strong> {debugInfo.pathname}</div>
            <div><strong>Timestamp:</strong> {debugInfo.timestamp}</div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          backgroundColor: '#fef3c7',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #f59e0b'
        }}>
          <h3 style={{ color: '#92400e', marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
            📋 Instructions
          </h3>
          <p style={{ color: '#92400e', margin: 0, fontSize: '14px' }}>
            This page loads successfully if you can see this content. Use the test buttons above to check navigation. 
            Check the browser console (F12) for detailed logs. If this page shows but upload pages don't, 
            the issue is specific to those components.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileDebugAdvanced;
