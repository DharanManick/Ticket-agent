import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error boundary:", error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090E] flex items-center justify-center p-6 text-gray-200" id="uncaught-exception-boundary">
          <div className="max-w-md w-full bg-[#11141D] border border-red-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient decoration overlay */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20 text-red-400" id="error-boundary-shield-icon">
                <ShieldAlert className="h-8 w-8" />
              </div>
              
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Compliance Portal Intercept</h2>
                <p className="text-xs text-gray-450 mt-1.5 leading-relaxed text-gray-400">
                  An uncaught exception occurred in the React execution stack. To protect your session data, the application context has safely halted.
                </p>
              </div>

              {this.state.error && (
                <div className="w-full bg-[#0A0C11] border border-[#222735] rounded-lg p-3 text-left" id="error-boundary-trace-log">
                  <p className="text-[10px] uppercase font-bold text-gray-500 font-mono tracking-wider">Exception Trace</p>
                  <p className="text-xs font-mono text-red-300 mt-1 break-all max-h-24 overflow-y-auto">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="w-full pt-2 flex flex-col space-y-2">
                <button
                  id="error-boundary-reload-btn"
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono tracking-wider uppercase rounded-lg shadow-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reload Session</span>
                </button>
                
                <button
                  id="error-boundary-reset-btn"
                  type="button"
                  onClick={this.handleReset}
                  className="w-full py-2 bg-[#1A1E29] hover:bg-[#252B3A] text-red-400 border border-red-500/20 text-xs font-bold font-mono tracking-wider uppercase rounded-lg transition-all cursor-pointer"
                >
                  Clear Cached Settings & Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
