'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-sm px-4">
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <div
              key={toast.id}
              className={cn(
                "toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl transition-all border",
                toast.type === 'success' && 'bg-emerald-50 border-emerald-100 text-emerald-800 shadow-emerald-500/10',
                toast.type === 'error' && 'bg-red-50 border-red-100 text-red-800 shadow-red-500/10',
                toast.type === 'warning' && 'bg-amber-50 border-amber-100 text-amber-800 shadow-amber-500/10',
                toast.type === 'info' && 'bg-sky-50 border-sky-100 text-sky-800 shadow-sky-500/10'
              )}
            >
              <div className={cn(
                "flex-shrink-0 flex items-center justify-center",
                toast.type === 'success' && 'text-emerald-500',
                toast.type === 'error' && 'text-red-500',
                toast.type === 'warning' && 'text-amber-500',
                toast.type === 'info' && 'text-sky-500'
              )}>
                <Icon size={20} strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold tracking-tight">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
