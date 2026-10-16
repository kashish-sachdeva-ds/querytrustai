import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Deliberately avoid rendering or transmitting error details from the client.
  }

  private retry = () => {
    this.setState({ hasError: false })
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="app-recovery-screen" role="alert" aria-live="assertive">
          <div className="app-recovery-card">
            <div className="app-recovery-icon" aria-hidden="true"><AlertTriangle size={24} /></div>
            <p className="app-recovery-kicker">Recoverable interface error</p>
            <h1>We could not render this workspace.</h1>
            <p>None of your source data was changed. Try rendering the interface again.</p>
            <button type="button" className="btn btn-primary" onClick={this.retry}>
              <RefreshCw size={16} aria-hidden="true" /> Try again
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
