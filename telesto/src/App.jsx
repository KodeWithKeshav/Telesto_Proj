// App.jsx
import React from 'react';
import Geological3DGridTool from './components/Geological3DGridToolRefactored';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  console.log('App component rendering...');
  
  return (
    <div className="App">
      <ErrorBoundary>
        <Geological3DGridTool />
      </ErrorBoundary>
    </div>
  );
}

export default App;