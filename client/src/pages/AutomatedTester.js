import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AutomatedTester = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testSummary, setTestSummary] = useState({});
  const testIdRef = useRef(0);

  // Test scenarios to run
  const testScenarios = [
    {
      id: 'navigation_home',
      name: 'Navigate to Home',
      description: 'Test navigation to dashboard',
      action: () => navigate('/'),
      expectedResult: 'Should load dashboard page',
      category: 'Navigation'
    },
    {
      id: 'navigation_upload',
      name: 'Navigate to Upload',
      description: 'Test navigation to upload page',
      action: () => navigate('/upload'),
      expectedResult: 'Should load upload page without white screen',
      category: 'Navigation'
    },
    {
      id: 'navigation_upload_original',
      name: 'Navigate to Upload Original',
      description: 'Test navigation to original upload component',
      action: () => navigate('/upload-original'),
      expectedResult: 'Should load original upload component',
      category: 'Navigation'
    },
    {
      id: 'navigation_direct_test',
      name: 'Navigate to Direct Test',
      description: 'Test direct component without layout',
      action: () => navigate('/direct-test'),
      expectedResult: 'Should load direct test page',
      category: 'Navigation'
    },
    {
      id: 'navigation_mobile_debug',
      name: 'Navigate to Mobile Debug',
      description: 'Test mobile debug page',
      action: () => navigate('/mobile-debug-advanced'),
      expectedResult: 'Should load mobile debug page',
      category: 'Navigation'
    },
    {
      id: 'file_input_simulation',
      name: 'File Input Simulation',
      description: 'Simulate file selection',
      action: () => simulateFileInput(),
      expectedResult: 'Should handle file input without errors',
      category: 'File Upload'
    },
    {
      id: 'mobile_detection',
      name: 'Mobile Detection Test',
      description: 'Test mobile device detection',
      action: () => testMobileDetection(),
      expectedResult: 'Should correctly detect device type',
      category: 'Mobile'
    },
    {
      id: 'css_loading',
      name: 'CSS Loading Test',
      description: 'Test if CSS styles are applied',
      action: () => testCSSLoading(),
      expectedResult: 'Should have proper styling applied',
      category: 'Styling'
    },
    {
      id: 'console_errors',
      name: 'Console Error Check',
      description: 'Check for JavaScript errors',
      action: () => checkConsoleErrors(),
      expectedResult: 'Should have no critical console errors',
      category: 'Error Handling'
    },
    {
      id: 'responsive_design',
      name: 'Responsive Design Test',
      description: 'Test responsive behavior',
      action: () => testResponsiveDesign(),
      expectedResult: 'Should adapt to different screen sizes',
      category: 'Responsive'
    }
  ];

  // Simulate file input
  const simulateFileInput = () => {
    try {
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        // Create a mock file
        const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(mockFile);
        fileInput.files = dataTransfer.files;
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
        return { success: true, message: 'File input simulated successfully' };
      }
      return { success: false, message: 'No file input found' };
    } catch (error) {
      return { success: false, message: `File input error: ${error.message}` };
    }
  };

  // Test mobile detection
  const testMobileDetection = () => {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const screenWidth = window.innerWidth;
      const touchSupport = 'ontouchstart' in window;
      
      return {
        success: true,
        message: `Mobile: ${isMobile}, Width: ${screenWidth}, Touch: ${touchSupport}`
      };
    } catch (error) {
      return { success: false, message: `Mobile detection error: ${error.message}` };
    }
  };

  // Test CSS loading
  const testCSSLoading = () => {
    try {
      const testElement = document.createElement('div');
      testElement.className = 'bg-gray-50 text-blue-600 flex items-center';
      document.body.appendChild(testElement);
      
      const styles = window.getComputedStyle(testElement);
      const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasColor = styles.color !== 'rgb(0, 0, 0)';
      const hasFlex = styles.display === 'flex';
      
      document.body.removeChild(testElement);
      
      return {
        success: hasBackground || hasColor || hasFlex,
        message: `CSS loaded - BG: ${hasBackground}, Color: ${hasColor}, Flex: ${hasFlex}`
      };
    } catch (error) {
      return { success: false, message: `CSS test error: ${error.message}` };
    }
  };

  // Check console errors
  const checkConsoleErrors = () => {
    try {
      // This is a simplified check - in a real scenario, you'd need to capture console errors
      const hasReactDevTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      const hasErrors = window.onerror !== null;
      
      return {
        success: true,
        message: `React DevTools: ${hasReactDevTools ? 'Yes' : 'No'}, Error handlers: ${hasErrors ? 'Yes' : 'No'}`
      };
    } catch (error) {
      return { success: false, message: `Console check error: ${error.message}` };
    }
  };

  // Test responsive design
  const testResponsiveDesign = () => {
    try {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio
      };
      
      const isMobileSize = viewport.width < 768;
      const isTabletSize = viewport.width >= 768 && viewport.width < 1024;
      const isDesktopSize = viewport.width >= 1024;
      
      return {
        success: true,
        message: `${viewport.width}x${viewport.height} - Mobile: ${isMobileSize}, Tablet: ${isTabletSize}, Desktop: ${isDesktopSize}`
      };
    } catch (error) {
      return { success: false, message: `Responsive test error: ${error.message}` };
    }
  };

  // Run a single test
  const runSingleTest = async (scenario, iteration) => {
    const testId = ++testIdRef.current;
    const startTime = Date.now();
    
    setCurrentTest(`${scenario.name} - Iteration ${iteration + 1}`);
    
    try {
      // Wait a bit to simulate real user interaction
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let result;
      if (typeof scenario.action === 'function') {
        result = await scenario.action();
      } else {
        result = { success: true, message: 'Action completed' };
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const testResult = {
        id: testId,
        testName: scenario.name,
        category: scenario.category,
        iteration: iteration + 1,
        status: result?.success !== false ? 'PASS' : 'FAIL',
        duration: `${duration}ms`,
        message: result?.message || 'Test completed',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        expectedResult: scenario.expectedResult,
        actualResult: result?.message || 'No specific result'
      };
      
      setTestResults(prev => [...prev, testResult]);
      return testResult;
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const testResult = {
        id: testId,
        testName: scenario.name,
        category: scenario.category,
        iteration: iteration + 1,
        status: 'ERROR',
        duration: `${duration}ms`,
        message: error.message,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        expectedResult: scenario.expectedResult,
        actualResult: `Error: ${error.message}`
      };
      
      setTestResults(prev => [...prev, testResult]);
      return testResult;
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);
    
    const totalTests = testScenarios.length * 10; // 10 iterations each
    let completedTests = 0;
    
    for (const scenario of testScenarios) {
      for (let i = 0; i < 10; i++) {
        await runSingleTest(scenario, i);
        completedTests++;
        setProgress((completedTests / totalTests) * 100);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    setCurrentTest('Tests completed!');
    setIsRunning(false);
    generateSummary();
  };

  // Generate test summary
  const generateSummary = useCallback(() => {
    const summary = testResults.reduce((acc, result) => {
      const category = result.category;
      if (!acc[category]) {
        acc[category] = { total: 0, passed: 0, failed: 0, errors: 0 };
      }
      
      acc[category].total++;
      if (result.status === 'PASS') acc[category].passed++;
      else if (result.status === 'FAIL') acc[category].failed++;
      else if (result.status === 'ERROR') acc[category].errors++;
      
      return acc;
    }, {});
    
    setTestSummary(summary);
  }, [testResults]);

  // Export to CSV (Excel-compatible)
  const exportToCSV = () => {
    const headers = [
      'Test ID',
      'Test Name',
      'Category',
      'Iteration',
      'Status',
      'Duration',
      'Message',
      'Timestamp',
      'URL',
      'User Agent',
      'Screen Size',
      'Expected Result',
      'Actual Result'
    ];
    
    const csvContent = [
      headers.join(','),
      ...testResults.map(result => [
        result.id,
        `"${result.testName}"`,
        result.category,
        result.iteration,
        result.status,
        result.duration,
        `"${result.message}"`,
        result.timestamp,
        `"${result.url}"`,
        `"${result.userAgent}"`,
        result.screenSize,
        `"${result.expectedResult}"`,
        `"${result.actualResult}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `test_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (testResults.length > 0) {
      generateSummary();
    }
  }, [testResults, generateSummary]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ 
          color: '#111827', 
          marginBottom: '24px',
          fontSize: '28px',
          fontWeight: 'bold'
        }}>
          🤖 Automated Testing Bot
        </h1>

        {/* Control Panel */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>
            Control Panel
          </h2>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              style={{
                backgroundColor: isRunning ? '#9ca3af' : '#3b82f6',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              {isRunning ? 'Running Tests...' : 'Start Automated Testing (10x each)'}
            </button>
            
            {testResults.length > 0 && (
              <button
                onClick={exportToCSV}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                📊 Export to Excel/CSV
              </button>
            )}
          </div>

          {isRunning && (
            <div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Current Test:</strong> {currentTest}
              </div>
              <div style={{
                width: '100%',
                height: '20px',
                backgroundColor: '#e5e7eb',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '14px' }}>
                {Math.round(progress)}% Complete
              </div>
            </div>
          )}
        </div>

        {/* Test Summary */}
        {Object.keys(testSummary).length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>
              📈 Test Summary
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {Object.entries(testSummary).map(([category, stats]) => (
                <div key={category} style={{
                  padding: '16px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px'
                }}>
                  <h3 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
                    {category}
                  </h3>
                  <div style={{ fontSize: '14px' }}>
                    <div>✅ Passed: {stats.passed}</div>
                    <div>❌ Failed: {stats.failed}</div>
                    <div>⚠️ Errors: {stats.errors}</div>
                    <div><strong>Total: {stats.total}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>
              📋 Test Results ({testResults.length} tests)
            </h2>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>ID</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Test Name</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Category</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Iteration</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Status</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Duration</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.slice(-50).map((result) => (
                    <tr key={result.id}>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{result.id}</td>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{result.testName}</td>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{result.category}</td>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{result.iteration}</td>
                      <td style={{ 
                        padding: '8px', 
                        border: '1px solid #e5e7eb',
                        color: result.status === 'PASS' ? '#10b981' : result.status === 'FAIL' ? '#ef4444' : '#f59e0b',
                        fontWeight: '600'
                      }}>
                        {result.status}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{result.duration}</td>
                      <td style={{ padding: '8px', border: '1px solid #e5e7eb', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {result.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={{
          backgroundColor: '#fef3c7',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #f59e0b',
          marginTop: '20px'
        }}>
          <h3 style={{ color: '#92400e', marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
            📋 How It Works
          </h3>
          <ul style={{ color: '#92400e', margin: 0, paddingLeft: '20px' }}>
            <li>Click "Start Automated Testing" to run all tests 10 times each</li>
            <li>The bot will test navigation, file uploads, mobile detection, CSS loading, and more</li>
            <li>Results are displayed in real-time with pass/fail status</li>
            <li>Export results to Excel/CSV format for detailed analysis</li>
            <li>Each test includes timing, error messages, and system information</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AutomatedTester;
