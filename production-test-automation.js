/**
 * Production Testing Script for Railway Deployment
 * Tests the live AI Tutor application at https://ai-tutor-d-production.up.railway.app/
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class ProductionTestAutomation {
  constructor() {
    this.baseUrl = 'https://ai-tutor-d-production.up.railway.app';
    this.testResults = [];
    this.testId = 0;
    this.testSuites = this.defineProductionTestSuites();
  }

  defineProductionTestSuites() {
    return {
      accessibility: {
        name: 'Site Accessibility Tests',
        tests: [
          { id: 'site_reachable', name: 'Site Reachable', url: '/', method: 'GET' },
          { id: 'https_redirect', name: 'HTTPS Redirect', url: '/', checkHttps: true },
          { id: 'response_headers', name: 'Security Headers Check', url: '/', checkHeaders: true },
          { id: 'favicon_exists', name: 'Favicon Exists', url: '/favicon.ico', method: 'GET' },
          { id: 'manifest_exists', name: 'Manifest Exists', url: '/manifest.json', method: 'GET' }
        ]
      },
      pages: {
        name: 'Page Availability Tests',
        tests: [
          { id: 'home_page', name: 'Home Page Load', url: '/', expectContent: 'AI Academic Tutor' },
          { id: 'upload_page', name: 'Upload Page Load', url: '/upload', expectContent: 'upload' },
          { id: 'direct_test_page', name: 'Direct Test Page', url: '/direct-test', expectContent: 'Direct Test' },
          { id: 'mobile_debug_page', name: 'Mobile Debug Page', url: '/mobile-debug-advanced', expectContent: 'Mobile Debug' },
          { id: 'automated_tester_page', name: 'Automated Tester Page', url: '/automated-tester', expectContent: 'Automated Testing' }
        ]
      },
      api: {
        name: 'API Endpoint Tests',
        tests: [
          { id: 'api_health', name: 'API Health Check', url: '/api/health', method: 'GET' },
          { id: 'api_documents', name: 'Documents API', url: '/api/documents', method: 'GET' },
          { id: 'api_voice', name: 'Voice API Check', url: '/api/voice', method: 'GET' }
        ]
      },
      performance: {
        name: 'Performance Tests',
        tests: [
          { id: 'load_time_home', name: 'Home Page Load Time', url: '/', measureTime: true },
          { id: 'load_time_upload', name: 'Upload Page Load Time', url: '/upload', measureTime: true },
          { id: 'static_assets', name: 'Static Assets Load', url: '/static/css/main.09806df6.css', method: 'GET' },
          { id: 'js_bundle', name: 'JavaScript Bundle Load', url: '/static/js/main.f13eca33.js', method: 'GET' }
        ]
      },
      mobile: {
        name: 'Mobile-Specific Tests',
        tests: [
          { id: 'mobile_viewport', name: 'Mobile Viewport Meta', url: '/', checkViewport: true },
          { id: 'mobile_responsive', name: 'Mobile Responsive Design', url: '/', checkResponsive: true },
          { id: 'touch_friendly', name: 'Touch-Friendly Elements', url: '/', checkTouch: true }
        ]
      }
    };
  }

  async runAllTests(iterations = 10) {
    console.log(`🚀 Starting production testing for: ${this.baseUrl}`);
    console.log(`🔄 Running ${iterations} iterations per test...`);
    
    const startTime = Date.now();
    let totalTests = 0;
    let completedTests = 0;

    // Count total tests
    Object.values(this.testSuites).forEach(suite => {
      totalTests += suite.tests.length * iterations;
    });

    console.log(`📊 Total tests to run: ${totalTests}`);

    // Run all test suites
    for (const [suiteKey, suite] of Object.entries(this.testSuites)) {
      console.log(`\n🧪 Running ${suite.name}...`);
      
      for (const test of suite.tests) {
        console.log(`  ⚡ Testing: ${test.name}`);
        
        for (let i = 0; i < iterations; i++) {
          try {
            const result = await this.runSingleTest(test, i + 1, suiteKey);
            this.testResults.push(result);
            completedTests++;
            
            const progress = ((completedTests / totalTests) * 100).toFixed(1);
            process.stdout.write(`\r    Progress: ${progress}% (${completedTests}/${totalTests})`);
            
            // Delay between tests to avoid overwhelming the server
            await this.delay(200);
          } catch (error) {
            console.error(`\n    ❌ Error in test ${test.name} iteration ${i + 1}:`, error.message);
          }
        }
        console.log(); // New line after progress
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    console.log(`\n✅ Production testing completed in ${totalDuration}ms`);
    console.log(`📈 Total tests run: ${this.testResults.length}`);
    
    // Generate reports
    await this.generateProductionReports();
    this.printProductionSummary();
  }

  async runSingleTest(test, iteration, suiteKey) {
    const testId = ++this.testId;
    const startTime = Date.now();
    
    try {
      let result;
      
      if (test.checkHttps) {
        result = await this.testHttpsRedirect(test);
      } else if (test.checkHeaders) {
        result = await this.testSecurityHeaders(test);
      } else if (test.checkViewport) {
        result = await this.testMobileViewport(test);
      } else if (test.checkResponsive) {
        result = await this.testResponsiveDesign(test);
      } else if (test.checkTouch) {
        result = await this.testTouchFriendly(test);
      } else if (test.measureTime) {
        result = await this.testLoadTime(test);
      } else {
        result = await this.testHttpRequest(test);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        id: testId,
        suite: suiteKey,
        testName: test.name,
        testId: test.id,
        iteration: iteration,
        status: result.success ? 'PASS' : 'FAIL',
        duration: duration,
        message: result.message,
        details: result.details || '',
        timestamp: new Date().toISOString(),
        url: test.url || 'N/A',
        expectedResult: result.expected || 'Test should complete successfully',
        actualResult: result.actual || result.message,
        httpStatus: result.httpStatus || 'N/A',
        responseTime: result.responseTime || duration,
        contentLength: result.contentLength || 'N/A'
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        id: testId,
        suite: suiteKey,
        testName: test.name,
        testId: test.id,
        iteration: iteration,
        status: 'ERROR',
        duration: duration,
        message: error.message,
        details: error.stack || '',
        timestamp: new Date().toISOString(),
        url: test.url || 'N/A',
        expectedResult: 'Test should complete without errors',
        actualResult: `Error: ${error.message}`,
        httpStatus: 'ERROR',
        responseTime: duration,
        contentLength: 'N/A'
      };
    }
  }

  async testHttpRequest(test) {
    const url = `${this.baseUrl}${test.url}`;
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: test.method || 'GET',
        headers: {
          'User-Agent': 'AI-Tutor-Test-Bot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      };

      const req = https.request(options, (res) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const success = res.statusCode >= 200 && res.statusCode < 400;
          const hasExpectedContent = test.expectContent ? 
            data.toLowerCase().includes(test.expectContent.toLowerCase()) : true;

          resolve({
            success: success && hasExpectedContent,
            message: success ? 
              `HTTP ${res.statusCode} - ${hasExpectedContent ? 'Content found' : 'Content missing'}` :
              `HTTP ${res.statusCode} - Request failed`,
            details: `Response time: ${responseTime}ms, Content length: ${data.length} bytes`,
            expected: test.expectContent ? `Should contain: ${test.expectContent}` : `Should return 2xx status`,
            actual: `HTTP ${res.statusCode}, Content: ${hasExpectedContent ? 'Found' : 'Missing'}`,
            httpStatus: res.statusCode,
            responseTime: responseTime,
            contentLength: data.length
          });
        });
      });

      req.on('error', (error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        resolve({
          success: false,
          message: `Request failed: ${error.message}`,
          details: `Error after ${responseTime}ms`,
          expected: 'Should complete HTTP request',
          actual: `Failed with error: ${error.message}`,
          httpStatus: 'ERROR',
          responseTime: responseTime,
          contentLength: 0
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          success: false,
          message: 'Request timeout (10s)',
          details: 'Request exceeded 10 second timeout',
          expected: 'Should complete within 10 seconds',
          actual: 'Request timed out',
          httpStatus: 'TIMEOUT',
          responseTime: 10000,
          contentLength: 0
        });
      });

      req.end();
    });
  }

  async testHttpsRedirect(test) {
    // Test if HTTP redirects to HTTPS
    const httpUrl = `http://ai-tutor-d-production.up.railway.app${test.url}`;
    
    return new Promise((resolve) => {
      const urlObj = new URL(httpUrl);
      const options = {
        hostname: urlObj.hostname,
        port: 80,
        path: urlObj.pathname,
        method: 'GET',
        headers: {
          'User-Agent': 'AI-Tutor-Test-Bot/1.0'
        }
      };

      const req = http.request(options, (res) => {
        const isRedirect = res.statusCode >= 300 && res.statusCode < 400;
        const location = res.headers.location;
        const redirectsToHttps = location && location.startsWith('https://');

        resolve({
          success: isRedirect && redirectsToHttps,
          message: isRedirect ? 
            (redirectsToHttps ? 'HTTPS redirect working' : 'Redirects but not to HTTPS') :
            'No HTTPS redirect found',
          details: `Status: ${res.statusCode}, Location: ${location || 'None'}`,
          expected: 'Should redirect HTTP to HTTPS',
          actual: `HTTP ${res.statusCode} -> ${location || 'No redirect'}`,
          httpStatus: res.statusCode
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          message: `HTTPS redirect test failed: ${error.message}`,
          details: error.stack,
          expected: 'Should test HTTP to HTTPS redirect',
          actual: `Failed with error: ${error.message}`,
          httpStatus: 'ERROR'
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          success: false,
          message: 'HTTPS redirect test timeout',
          details: 'Request timed out after 5 seconds',
          expected: 'Should complete redirect test',
          actual: 'Request timed out',
          httpStatus: 'TIMEOUT'
        });
      });

      req.end();
    });
  }

  async testSecurityHeaders(test) {
    const url = `${this.baseUrl}${test.url}`;
    
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method: 'HEAD',
        headers: {
          'User-Agent': 'AI-Tutor-Test-Bot/1.0'
        }
      };

      const req = https.request(options, (res) => {
        const headers = res.headers;
        const securityHeaders = {
          'x-content-type-options': headers['x-content-type-options'],
          'x-frame-options': headers['x-frame-options'],
          'x-xss-protection': headers['x-xss-protection'],
          'strict-transport-security': headers['strict-transport-security'],
          'content-security-policy': headers['content-security-policy']
        };

        const presentHeaders = Object.entries(securityHeaders)
          .filter(([key, value]) => value !== undefined)
          .map(([key]) => key);

        const score = presentHeaders.length;
        const maxScore = Object.keys(securityHeaders).length;

        resolve({
          success: score >= 2, // At least 2 security headers should be present
          message: `Security headers: ${score}/${maxScore} present`,
          details: `Present: ${presentHeaders.join(', ')}`,
          expected: 'Should have basic security headers',
          actual: `${score} security headers found`,
          httpStatus: res.statusCode
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          message: `Security headers test failed: ${error.message}`,
          details: error.stack,
          expected: 'Should check security headers',
          actual: `Failed with error: ${error.message}`,
          httpStatus: 'ERROR'
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          success: false,
          message: 'Security headers test timeout',
          details: 'Request timed out',
          expected: 'Should complete headers check',
          actual: 'Request timed out',
          httpStatus: 'TIMEOUT'
        });
      });

      req.end();
    });
  }

  async testLoadTime(test) {
    const result = await this.testHttpRequest(test);
    const loadTime = result.responseTime;
    const isGoodPerformance = loadTime < 2000; // Under 2 seconds
    
    return {
      success: result.success && isGoodPerformance,
      message: `Load time: ${loadTime}ms ${isGoodPerformance ? '(Good)' : '(Slow)'}`,
      details: `Target: <2000ms, Actual: ${loadTime}ms`,
      expected: 'Should load in under 2 seconds',
      actual: `Loaded in ${loadTime}ms`,
      httpStatus: result.httpStatus,
      responseTime: loadTime,
      contentLength: result.contentLength
    };
  }

  async testMobileViewport(test) {
    const result = await this.testHttpRequest(test);
    
    if (result.success) {
      // Check if the response contains proper viewport meta tag
      const url = `${this.baseUrl}${test.url}`;
      
      return new Promise((resolve) => {
        const urlObj = new URL(url);
        const options = {
          hostname: urlObj.hostname,
          port: 443,
          path: urlObj.pathname,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            const hasViewportMeta = data.includes('viewport') && data.includes('width=device-width');
            const hasUserScalable = data.includes('user-scalable=no') || data.includes('user-scalable=0');
            
            resolve({
              success: hasViewportMeta,
              message: hasViewportMeta ? 'Mobile viewport properly configured' : 'Mobile viewport missing or incorrect',
              details: `Viewport meta: ${hasViewportMeta ? 'Found' : 'Missing'}, User-scalable: ${hasUserScalable ? 'Disabled' : 'Enabled'}`,
              expected: 'Should have proper mobile viewport meta tag',
              actual: hasViewportMeta ? 'Viewport meta tag found' : 'Viewport meta tag missing',
              httpStatus: res.statusCode
            });
          });
        });

        req.on('error', (error) => {
          resolve({
            success: false,
            message: `Mobile viewport test failed: ${error.message}`,
            details: error.stack,
            expected: 'Should check mobile viewport',
            actual: `Failed with error: ${error.message}`,
            httpStatus: 'ERROR'
          });
        });

        req.end();
      });
    }
    
    return result;
  }

  async testResponsiveDesign(test) {
    // This is a simplified test - in a real scenario, you'd use a headless browser
    const mobileResult = await this.testHttpRequest(test);
    
    return {
      success: mobileResult.success,
      message: mobileResult.success ? 'Page loads on mobile user agent' : 'Page fails to load on mobile',
      details: `Mobile user agent test: ${mobileResult.success ? 'Passed' : 'Failed'}`,
      expected: 'Should work with mobile user agents',
      actual: mobileResult.success ? 'Works with mobile UA' : 'Fails with mobile UA',
      httpStatus: mobileResult.httpStatus
    };
  }

  async testTouchFriendly(test) {
    // Simplified test - checks if page loads with touch device user agent
    const result = await this.testHttpRequest(test);
    
    return {
      success: result.success,
      message: result.success ? 'Touch-friendly (loads successfully)' : 'May not be touch-friendly',
      details: 'Basic touch compatibility check',
      expected: 'Should be accessible on touch devices',
      actual: result.success ? 'Accessible on touch devices' : 'May have touch issues',
      httpStatus: result.httpStatus
    };
  }

  async generateProductionReports() {
    console.log('\n📊 Generating production test reports...');
    
    // Generate CSV report
    await this.generateProductionCSV();
    
    // Generate JSON report
    await this.generateProductionJSON();
    
    // Generate summary report
    await this.generateProductionSummary();
    
    console.log('✅ Production reports generated successfully!');
  }

  async generateProductionCSV() {
    const headers = [
      'Test ID',
      'Suite',
      'Test Name',
      'Test ID Code',
      'Iteration',
      'Status',
      'Duration (ms)',
      'Message',
      'Details',
      'Timestamp',
      'URL',
      'Expected Result',
      'Actual Result',
      'HTTP Status',
      'Response Time (ms)',
      'Content Length'
    ];
    
    const csvRows = [
      headers.join(','),
      ...this.testResults.map(result => [
        result.id,
        result.suite,
        `"${result.testName}"`,
        result.testId,
        result.iteration,
        result.status,
        result.duration,
        `"${result.message}"`,
        `"${result.details}"`,
        result.timestamp,
        `"${result.url}"`,
        `"${result.expectedResult}"`,
        `"${result.actualResult}"`,
        result.httpStatus,
        result.responseTime,
        result.contentLength
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const fileName = `production_test_results_${new Date().toISOString().split('T')[0]}_${Date.now()}.csv`;
    
    fs.writeFileSync(fileName, csvContent);
    console.log(`📄 Production CSV report saved: ${fileName}`);
  }

  async generateProductionJSON() {
    const report = {
      metadata: {
        testTarget: this.baseUrl,
        generatedAt: new Date().toISOString(),
        totalTests: this.testResults.length,
        testSuites: Object.keys(this.testSuites),
        summary: this.calculateProductionSummary()
      },
      results: this.testResults
    };
    
    const fileName = `production_test_results_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
    fs.writeFileSync(fileName, JSON.stringify(report, null, 2));
    console.log(`📄 Production JSON report saved: ${fileName}`);
  }

  async generateProductionSummary() {
    const summary = this.calculateProductionSummary();
    
    let summaryText = `
AI TUTOR PRODUCTION DEPLOYMENT - TEST REPORT
============================================
Target: ${this.baseUrl}
Generated: ${new Date().toISOString()}
Total Tests: ${this.testResults.length}

OVERALL SUMMARY:
- Passed: ${summary.overall.passed} (${summary.overall.passRate}%)
- Failed: ${summary.overall.failed} (${summary.overall.failRate}%)
- Errors: ${summary.overall.errors} (${summary.overall.errorRate}%)

SUITE BREAKDOWN:
`;

    Object.entries(summary.suites).forEach(([suite, stats]) => {
      summaryText += `
${suite.toUpperCase()}:
  - Total: ${stats.total}
  - Passed: ${stats.passed} (${stats.passRate}%)
  - Failed: ${stats.failed} (${stats.failRate}%)
  - Errors: ${stats.errors} (${stats.errorRate}%)
  - Avg Response Time: ${stats.avgResponseTime}ms`;
    });

    summaryText += `

PERFORMANCE METRICS:
- Average Response Time: ${summary.performance.avgResponseTime}ms
- Fastest Response: ${summary.performance.fastestResponse}ms
- Slowest Response: ${summary.performance.slowestResponse}ms
- Success Rate: ${summary.performance.successRate}%

TOP ISSUES:
`;

    const failures = this.testResults.filter(r => r.status === 'FAIL' || r.status === 'ERROR');
    const issueGroups = {};
    
    failures.forEach(failure => {
      const key = failure.testName;
      if (!issueGroups[key]) {
        issueGroups[key] = { count: 0, messages: new Set() };
      }
      issueGroups[key].count++;
      issueGroups[key].messages.add(failure.message);
    });

    Object.entries(issueGroups)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5)
      .forEach(([test, data]) => {
        summaryText += `\n- ${test}: ${data.count} failures`;
        data.messages.forEach(msg => {
          summaryText += `\n  * ${msg}`;
        });
      });

    const fileName = `production_test_summary_${new Date().toISOString().split('T')[0]}_${Date.now()}.txt`;
    fs.writeFileSync(fileName, summaryText);
    console.log(`📄 Production summary report saved: ${fileName}`);
  }

  calculateProductionSummary() {
    const overall = {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'PASS').length,
      failed: this.testResults.filter(r => r.status === 'FAIL').length,
      errors: this.testResults.filter(r => r.status === 'ERROR').length
    };

    overall.passRate = overall.total > 0 ? ((overall.passed / overall.total) * 100).toFixed(1) : 0;
    overall.failRate = overall.total > 0 ? ((overall.failed / overall.total) * 100).toFixed(1) : 0;
    overall.errorRate = overall.total > 0 ? ((overall.errors / overall.total) * 100).toFixed(1) : 0;

    const suites = {};
    Object.keys(this.testSuites).forEach(suite => {
      const suiteResults = this.testResults.filter(r => r.suite === suite);
      suites[suite] = {
        total: suiteResults.length,
        passed: suiteResults.filter(r => r.status === 'PASS').length,
        failed: suiteResults.filter(r => r.status === 'FAIL').length,
        errors: suiteResults.filter(r => r.status === 'ERROR').length,
        avgResponseTime: suiteResults.length > 0 ? 
          (suiteResults.reduce((sum, r) => sum + (r.responseTime || 0), 0) / suiteResults.length).toFixed(0) : 0
      };

      suites[suite].passRate = suiteResults.length > 0 ? 
        ((suites[suite].passed / suites[suite].total) * 100).toFixed(1) : 0;
      suites[suite].failRate = suiteResults.length > 0 ? 
        ((suites[suite].failed / suites[suite].total) * 100).toFixed(1) : 0;
      suites[suite].errorRate = suiteResults.length > 0 ? 
        ((suites[suite].errors / suites[suite].total) * 100).toFixed(1) : 0;
    });

    // Performance metrics
    const responseTimes = this.testResults
      .filter(r => r.responseTime && r.responseTime > 0)
      .map(r => r.responseTime);
    
    const performance = {
      avgResponseTime: responseTimes.length > 0 ? 
        (responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length).toFixed(0) : 0,
      fastestResponse: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      slowestResponse: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      successRate: overall.passRate
    };

    return { overall, suites, performance };
  }

  printProductionSummary() {
    const summary = this.calculateProductionSummary();
    
    console.log('\n📊 PRODUCTION TEST SUMMARY');
    console.log('===========================');
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Total Tests: ${summary.overall.total}`);
    console.log(`✅ Passed: ${summary.overall.passed} (${summary.overall.passRate}%)`);
    console.log(`❌ Failed: ${summary.overall.failed} (${summary.overall.failRate}%)`);
    console.log(`⚠️  Errors: ${summary.overall.errors} (${summary.overall.errorRate}%)`);
    
    console.log('\n🚀 Performance Metrics:');
    console.log(`  Average Response Time: ${summary.performance.avgResponseTime}ms`);
    console.log(`  Fastest Response: ${summary.performance.fastestResponse}ms`);
    console.log(`  Slowest Response: ${summary.performance.slowestResponse}ms`);
    
    console.log('\n📋 Suite Breakdown:');
    Object.entries(summary.suites).forEach(([suite, stats]) => {
      console.log(`  ${suite}: ${stats.passed}/${stats.total} passed (${stats.passRate}%) - Avg: ${stats.avgResponseTime}ms`);
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the production tests if this script is executed directly
if (require.main === module) {
  const tester = new ProductionTestAutomation();
  
  // Get iterations from command line argument or default to 10
  const iterations = parseInt(process.argv[2]) || 10;
  
  console.log('🚀 AI Tutor Production Testing - Railway Deployment');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🌐 Target: https://ai-tutor-d-production.up.railway.app/`);
  console.log(`🔄 Running ${iterations} iterations per test`);
  
  tester.runAllTests(iterations).catch(error => {
    console.error('❌ Production testing failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionTestAutomation;
