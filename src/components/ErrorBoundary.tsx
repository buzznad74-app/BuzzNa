import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Download } from 'lucide-react';
import { db } from '../lib/db';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by boundary:', error, errorInfo);
    // Log to backend service for monitoring
    if (typeof fetch !== 'undefined') {
      fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        })
      }).catch(err => console.warn('Failed to log error to backend:', err));
    }
  }

  private handleForcedDump = async () => {
    try {
      const sales = await db.getAll('sales_transactions');
      const queue = await db.getAll('sync_queue');
      
      const payload = {
        dumpTimestamp: new Date().toISOString(),
        unsyncedQueueCount: queue.length,
        localSalesTransactions: sales,
        localSyncQueue: queue
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `buzzna_d74_crash_dump_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Failed to construct backup dump. Please contact support immediately at support@buzznad74.com or call +254790435584.');
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans" id="error-boundary-container">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-zinc-200 p-6 md:p-8 text-center">
            <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>

            <h1 className="text-lg font-extrabold text-zinc-950 mb-2 uppercase tracking-tight">Application Error</h1>
            <p className="text-xs text-zinc-600 mb-4 leading-relaxed">
              BuzzNa D74 encountered an unexpected rendering error. Your local sales ledger and till session remain secure in offline memory.
            </p>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-left font-mono text-[11px] text-zinc-700 overflow-auto max-h-32 mb-4">
              {this.state.error?.toString() || 'Unknown Runtime Exception'}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition-all cursor-pointer uppercase tracking-wide"
                style={{ minHeight: '44px' }}
                id="crash-reload"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>Soft Reload App</span>
              </button>

              <button
                onClick={this.handleForcedDump}
                className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs py-3 px-4 rounded-xl border border-zinc-200 transition-all cursor-pointer uppercase tracking-wide"
                style={{ minHeight: '44px' }}
                id="crash-dump"
              >
                <Download className="w-4 h-4" />
                <span>Download Forced Local Dump</span>
              </button>
            </div>

            <p className="mt-4 text-[10px] text-zinc-500">
              Need urgent support? Email <b className="text-zinc-800">support@buzznad74.com</b> or WhatsApp <b className="text-zinc-800">+254790435584</b>
            </p>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;