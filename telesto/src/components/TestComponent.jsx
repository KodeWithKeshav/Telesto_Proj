import React from 'react';

const TestComponent = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <h1>Telesto Application Test</h1>
      <p>If you can see this, React is working correctly!</p>
      <div style={{ backgroundColor: '#333', padding: '10px', margin: '10px 0' }}>
        <h2>System Status:</h2>
        <ul>
          <li>✅ React is loaded</li>
          <li>✅ Component is rendering</li>
          <li>✅ Styling is applied</li>
        </ul>
      </div>
    </div>
  );
};

export default TestComponent;