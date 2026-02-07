import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const show = useCallback((content, type = 'default') => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ content, type });
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, 3000);
  }, []);

  // Global listener for critical errors
  useEffect(() => {
    const handleStorageError = () => {
      show("Storage Quota Exceeded! Data may not save.", "error");
    };
    window.addEventListener('maia:storage-error', handleStorageError);
    return () => window.removeEventListener('maia:storage-error', handleStorageError);
  }, [show]);

  const value = {
    show,
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4 pointer-events-none">
          <div className="px-4 py-2.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 text-zinc-200 text-sm shadow-2xl flex items-center gap-2 font-medium">
            {typeof toast.content === 'string' && toast.type !== 'default' && (
              <span className={`w-2 h-2 rounded-full ${
                toast.type === 'error' ? 'bg-red-500' :
                toast.type === 'info' ? 'bg-blue-500' : 'bg-emerald-500'
              }`}></span>
            )}
            {toast.content}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
