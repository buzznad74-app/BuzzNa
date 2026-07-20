import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Wifi, WifiOff, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info' | 'sync';
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full" id="toast-container">
      <AnimatePresence>
        {toasts.map(toast => {
          // Determine color profiles based on alert type
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          const isSync = toast.type === 'sync';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              layout
              className={`flex items-start justify-between p-4 rounded-xl shadow-lg border ${
                isError 
                  ? 'bg-red-50 border-red-200 text-red-900' 
                  : isSuccess 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : isSync
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-white border-zinc-200 text-zinc-900'
              }`}
              id={`toast-${toast.id}`}
            >
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0">
                  {isError && <AlertCircle className="w-5 h-5 text-red-600" />}
                  {isSuccess && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                  {isSync && <Wifi className="w-5 h-5 text-blue-600 animate-pulse" />}
                  {!isError && !isSuccess && !isSync && <WifiOff className="w-5 h-5 text-zinc-400" />}
                </div>
                <p className="text-sm font-medium leading-relaxed">{toast.text}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="ml-4 shrink-0 p-1.5 rounded-lg hover:bg-black/5 text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Close notification"
                id={`toast-close-${toast.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default Toast;