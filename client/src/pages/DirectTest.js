import React from 'react';

const DirectTest = () => {
  console.log('DirectTest: Component rendering...');
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#1f2937', marginBottom: '20px' }}>
        Direct Test Page - No Layout
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>
        This page bypasses the Layout component to test if the issue is with routing or Layout.
      </p>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#1f2937', marginBottom: '10px' }}>Test Content</h2>
        <p style={{ color: '#4b5563' }}>
          If you can see this content, then routing works and the issue is with the Layout component.
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export default DirectTest;
