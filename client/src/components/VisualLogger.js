import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Info } from 'lucide-react';

const VisualLogger = () => {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Override console methods to capture logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (type, message) => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [...prev.slice(-20), { // Keep only last 20 logs
        id: Date.now() + Math.random(),
        type,
        message: typeof message === 'object' ? JSON.stringify(message) : String(message),
        timestamp
      }]);
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args.join(' '));
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args.join(' '));
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args.join(' '));
    };

    // Add initial system info
    addLog('log', `Visual Logger Started - ${navigator.userAgent}`);
    addLog('log', `Viewport: ${window.innerWidth}x${window.innerHeight}`);
    addLog('log', `Mobile: ${/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)}`);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTextColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-700';
      case 'warn': return 'text-yellow-700';
      default: return 'text-gray-700';
    }
  };

  if (!isVisible && logs.length === 0) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg"
        style={{ zIndex: 9999 }}
      >
        {isVisible ? <X className="h-5 w-5" /> : <Info className="h-5 w-5" />}
      </button>

      {/* Log Panel */}
      {isVisible && (
        <div 
          className="fixed bottom-16 right-4 left-4 bg-white border border-gray-300 rounded-lg shadow-xl max-h-96 overflow-hidden"
          style={{ zIndex: 9998 }}
        >
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Visual Console</h3>
            <button
              onClick={() => setLogs([])}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
            >
              Clear
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-80 p-2">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm p-2">No logs yet...</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-2 p-2 bg-gray-50 rounded text-xs">
                    {getIcon(log.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-gray-500">{log.timestamp}</span>
                        <span className={`font-medium ${getTextColor(log.type)}`}>
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <p className={`break-words ${getTextColor(log.type)}`}>
                        {log.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default VisualLogger;
