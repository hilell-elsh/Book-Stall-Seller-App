import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  // Tags the console.error so a report of "blank screen" can be traced to
  // which boundary actually caught something — there's no error-reporting
  // service in this app, the console is the only trace there'll ever be.
  label: string
}

interface State {
  error: Error | null
}

// The app's only React Error Boundary (closes a gap: with none anywhere,
// any uncaught error during render/effects/lifecycle — most notably a
// Firebase/Firestore init failure on an environment IndexedDB can't run on,
// e.g. file:// on mobile — unmounts the whole tree with zero feedback a
// non-technical seller could ever report. This can't recover the crashed
// subtree's state, only show something instead of nothing plus a retry.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label}]`, error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-paper p-4">
          <div className="w-full max-w-xs rounded-lg border border-line bg-surface p-5 text-center">
            <h1 className="text-base font-semibold text-danger-600">משהו השתבש</h1>
            <p className="mt-1 text-sm text-faint">
              אירעה שגיאה בלתי צפויה באפליקציה. אפשר לנסות לרענן את הדף.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 w-full rounded bg-accent-600 py-2 text-sm font-medium text-white"
            >
              רענון
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
