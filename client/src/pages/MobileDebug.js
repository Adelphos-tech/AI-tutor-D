import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Monitor, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const MobileDebug = () => {
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Collect comprehensive mobile debug info
    const collectDebugInfo = () => {
      const info = {
        // Device Info
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        
        // Screen Info
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
        
        // Viewport Info
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        devicePixelRatio: window.devicePixelRatio,
        
        // Browser Features
        localStorage: typeof Storage !== 'undefined',
        sessionStorage: typeof Storage !== 'undefined',
        indexedDB: typeof indexedDB !== 'undefined',
        webGL: !!window.WebGLRenderingContext,
        
        // Mobile Detection
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isAndroid: /Android/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        isChrome: /Chrome/.test(navigator.userAgent),
        
        // Touch Support
        touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        
        // Current URL and Location
        currentURL: window.location.href,
        pathname: window.location.pathname,
        hash: window.location.hash,
        search: window.location.search,
        
        // Performance
        loadTime: performance.now(),
        
        // React Environment
        reactVersion: React.version,
        nodeEnv: process.env.NODE_ENV,
        apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5001/api'
      };
      
      setDebugInfo(info);
      return info;
    };

    const runTests = async () => {
      const info = collectDebugInfo();
      const tests = [];
      
      // Test 1: Basic React Rendering
      tests.push({
        name: 'React Rendering',
        status: 'pass',
        details: 'React component rendered successfully'
      });
      
      // Test 2: Mobile Detection
      tests.push({
        name: 'Mobile Detection',
        status: info.isMobile ? 'pass' : 'warning',
        details: info.isMobile ? 'Mobile device detected' : 'Desktop device detected'
      });
      
      // Test 3: Viewport Size
      tests.push({
        name: 'Viewport Size',
        status: info.innerWidth > 0 && info.innerHeight > 0 ? 'pass' : 'fail',
        details: `${info.innerWidth}x${info.innerHeight}`
      });
      
      // Test 4: Touch Support
      tests.push({
        name: 'Touch Support',
        status: info.touchSupport ? 'pass' : 'warning',
        details: info.touchSupport ? 'Touch events supported' : 'No touch support'
      });
      
      // Test 5: Local Storage
      tests.push({
        name: 'Local Storage',
        status: info.localStorage ? 'pass' : 'fail',
        details: info.localStorage ? 'Available' : 'Not available'
      });
      
      // Test 6: Network Status
      tests.push({
        name: 'Network',
        status: info.onLine ? 'pass' : 'fail',
        details: info.onLine ? 'Online' : 'Offline'
      });
      
      // Test 7: API Connectivity
      try {
        const response = await fetch(info.apiUrl + '/health');
        tests.push({
          name: 'API Connection',
          status: response.ok ? 'pass' : 'fail',
          details: `${response.status} - ${response.statusText}`
        });
      } catch (error) {
        tests.push({
          name: 'API Connection',
          status: 'fail',
          details: error.message
        });
      }
      
      // Test 8: CSS Loading
      const styles = window.getComputedStyle(document.body);
      tests.push({
        name: 'CSS Loading',
        status: styles.fontFamily ? 'pass' : 'fail',
        details: `Font: ${styles.fontFamily}`
      });
      
      setTestResults(tests);
      setIsLoading(false);
    };

    runTests();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <RefreshCw className="h-4 w-4 text-gray-500" />;
    }
  };

  const testUploadPage = () => {
    console.log('Testing upload page...');
    navigate('/upload');
  };

  const testMainApp = () => {
    console.log('Testing main app...');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center mb-4">
            <Smartphone className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mobile Debug Console</h1>
              <p className="text-gray-600">Comprehensive mobile debugging for white screen issue</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testMainApp}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
            >
              Test Main App
            </button>
            <button
              onClick={testUploadPage}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm"
            >
              Test Upload Page
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
            >
              Reload Debug
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Tests</h2>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
              <p>Running tests...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    {getStatusIcon(test.status)}
                    <span className="ml-2 font-medium">{test.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{test.details}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Device Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Device</h3>
              <p><strong>Mobile:</strong> {debugInfo.isMobile ? 'Yes' : 'No'}</p>
              <p><strong>iOS:</strong> {debugInfo.isIOS ? 'Yes' : 'No'}</p>
              <p><strong>Android:</strong> {debugInfo.isAndroid ? 'Yes' : 'No'}</p>
              <p><strong>Touch:</strong> {debugInfo.touchSupport ? 'Yes' : 'No'}</p>
              <p><strong>Platform:</strong> {debugInfo.platform}</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Browser</h3>
              <p><strong>Safari:</strong> {debugInfo.isSafari ? 'Yes' : 'No'}</p>
              <p><strong>Chrome:</strong> {debugInfo.isChrome ? 'Yes' : 'No'}</p>
              <p><strong>Language:</strong> {debugInfo.language}</p>
              <p><strong>Online:</strong> {debugInfo.onLine ? 'Yes' : 'No'}</p>
              <p><strong>Cookies:</strong> {debugInfo.cookieEnabled ? 'Yes' : 'No'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Screen</h3>
              <p><strong>Screen:</strong> {debugInfo.screenWidth}x{debugInfo.screenHeight}</p>
              <p><strong>Viewport:</strong> {debugInfo.innerWidth}x{debugInfo.innerHeight}</p>
              <p><strong>Pixel Ratio:</strong> {debugInfo.devicePixelRatio}</p>
              <p><strong>Color Depth:</strong> {debugInfo.colorDepth}</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Environment</h3>
              <p><strong>React:</strong> {debugInfo.reactVersion}</p>
              <p><strong>Node Env:</strong> {debugInfo.nodeEnv}</p>
              <p><strong>API URL:</strong> {debugInfo.apiUrl}</p>
              <p><strong>Load Time:</strong> {Math.round(debugInfo.loadTime)}ms</p>
            </div>
          </div>
        </div>

        {/* User Agent */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">User Agent</h2>
          <p className="text-sm text-gray-600 break-all">{debugInfo.userAgent}</p>
        </div>

        {/* Console Logs */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Console Instructions</h2>
          <div className="bg-gray-100 p-4 rounded text-sm">
            <p className="mb-2"><strong>To check for errors:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open browser developer tools (F12 or long-press and inspect)</li>
              <li>Go to Console tab</li>
              <li>Look for red error messages</li>
              <li>Try navigating to /upload and check for new errors</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDebug;
