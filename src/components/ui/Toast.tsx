'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (title: string, description?: string, type?: ToastType) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((title: string, description?: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((title: string, description?: string) => {
    toast(title, description, 'success');
  }, [toast]);

  const error = useCallback((title: string, description?: string) => {
    toast(title, description, 'error');
  }, [toast]);

  const info = useCallback((title: string, description?: string) => {
    toast(title, description, 'info');
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => {
          const typeClass = `toast-${t.type}`;
          return (
            <div key={t.id} className={`toast ${typeClass}`}>
              <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center' }}>
                {t.type === 'success' && <CheckCircle2 size={16} style={{ color: 'var(--success-color)' }} />}
                {t.type === 'error' && <AlertCircle size={16} style={{ color: 'var(--error-color)' }} />}
                {t.type === 'info' && <Info size={16} style={{ color: 'var(--accent-color)' }} />}
              </div>
              <div className="toast-content">
                <div className="toast-title">{t.title}</div>
                {t.description && <div className="toast-desc">{t.description}</div>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                aria-label="Dismiss toast"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
