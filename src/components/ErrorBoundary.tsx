import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="login-wrap">
          <section className="login-card">
            <h2>Something went wrong</h2>
            <p className="helper-text">Try a hard refresh (Ctrl+Shift+R) or restart the dev server.</p>
            <p className="error">{this.state.error.message}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </section>
        </div>
      )
    }

    return this.props.children
  }
}
