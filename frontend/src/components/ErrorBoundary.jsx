import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <h1 className="font-serif text-3xl font-black text-white mb-3">Something went wrong</h1>
            <p className="text-stone-400 text-sm mb-6">An unexpected error occurred. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#84cc16] text-[#0c0a09] font-bold rounded-xl hover:bg-[#facc15] transition-all"
            >
              Refresh Page
            </button>
            {this.props.showDetails && (
              <pre className="mt-6 text-left text-xs text-red-400 bg-black/60 p-4 rounded-xl overflow-auto max-h-48">
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
