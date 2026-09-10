import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './ui/States'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** Last line of defense — a render error must not blank the whole desktop app. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Render error:', error, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
            <ErrorState
              message={this.state.error.message || 'The app hit an unexpected error.'}
              onRetry={() => this.setState({ error: null })}
            />
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
