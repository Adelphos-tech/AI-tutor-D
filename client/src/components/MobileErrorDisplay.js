import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

const MobileErrorDisplay = () => {
  const [errors, setErrors] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Capture JavaScript errors
    const handleError = (event) => {
      const error = {
        id: Date.now(),
        message: event.error?.message || event.message || 'Unknown error',
        stack: event.error?.stack || 'No stack trace',
        filename: event.filename || 'Unknown file',
        lineno: event.lineno || 'Unknown line',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setErrors(prev => [...prev.slice(-5), error]); // Keep only last 5 errors
      setIsVisible(true);
    };

    // Capture unhandled promise rejections
    const handleRejection = (event) => {
      const error = {
        id: Date.now(),
        message: `Promise Rejection: ${event.reason?.message || event.reason || 'Unknown rejection'}`,
        stack: event.reason?.stack || 'No stack trace',
        filename: 'Promise',
        lineno: 'N/A',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setErrors(prev => [...prev.slice(-5), error]);
      setIsVisible(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (errors.length === 0) return null;

  return (
    <>
      {/* Error Indicator */}
      {!isVisible && errors.length > 0 && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg animate-pulse"
          style={{ zIndex: 9999 }}
        >
          <AlertTriangle className="h-5 w-5" />
        </button>
      )}

      {/* Error Panel */}
      {isVisible && (
        <div 
          className="fixed top-4 left-4 right-4 bg-red-50 border-2 border-red-200 rounded-lg shadow-xl max-h-96 overflow-hidden"
          style={{ zIndex: 9998 }}
        >
          <div className="bg-red-100 px-4 py-2 border-b border-red-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-900">JavaScript Errors ({errors.length})</h3>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-80 p-3">
            <div className="space-y-3">
              {errors.map((error) => (
                <div key={error.id} className="bg-white border border-red-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-red-600 font-medium">{error.timestamp}</span>
                    <span className="text-xs text-red-500">{error.filename}:{error.lineno}</span>
                  </div>
                  <p className="text-sm text-red-800 font-medium mb-2">{error.message}</p>
                  {error.stack && (
                    <details className="text-xs text-red-600">
                      <summary className="cursor-pointer hover:text-red-800">Stack Trace</summary>
                      <pre className="mt-2 whitespace-pre-wrap bg-red-50 p-2 rounded border">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-red-200 flex space-x-2">
              <button
                onClick={() => setErrors([])}
                className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded text-sm"
              >
                Clear Errors
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm flex items-center justify-center space-x-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reload</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileErrorDisplay;
