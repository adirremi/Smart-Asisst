import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { ConfigErrorScreen } from '@/lib/ConfigErrorScreen'
import { supabaseConfigError } from '@/lib/supabase'
import '@/index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <ConfigErrorScreen
          message={`שגיאה בטעינת האפליקציה: ${this.state.error.message}`}
        />
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  supabaseConfigError ? (
    <ConfigErrorScreen message={supabaseConfigError} />
  ) : (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
)
