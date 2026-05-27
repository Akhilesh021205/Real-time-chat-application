import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let bgColor = "bg-[#161b22] border-white/10 text-white";
          let Icon = Info;
          let iconColor = "text-blue-400";

          if (toast.type === "success") {
            bgColor = "bg-[#0f1b15] border-emerald-500/20 text-emerald-100";
            Icon = CheckCircle;
            iconColor = "text-emerald-400";
          } else if (toast.type === "error") {
            bgColor = "bg-[#201015] border-rose-500/20 text-rose-100";
            Icon = AlertCircle;
            iconColor = "text-rose-400";
          }

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 p-4 rounded-xl border shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${bgColor} backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in duration-200 pointer-events-auto`}
              role="alert"
            >
              <Icon size={18} className={`${iconColor} shrink-0 mt-0.5`} />
              <div className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white/40 hover:text-white shrink-0 transition-colors"
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
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
