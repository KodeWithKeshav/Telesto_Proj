import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
          <h1 style={{ color: '#ff6b6b' }}>Something went wrong!</h1>
          <div style={{ backgroundColor: '#2a2a2a', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
            <h2>Error Details:</h2>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {this.state.error && this.state.error.toString()}
            </pre>
            <h3>Component Stack:</h3>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>
              {this.state.errorInfo.componentStack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;