import { createContext, useContext, useCallback, useState } from "react";

export type ToastType = "success" | "error" | "info" | "loading";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => string;
  removeToast: (id: string) => void;
  success: (message: string) => string;
  error: (message: string) => string;
  info: (message: string) => string;
  loading: (message: string) => string;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function useToastState(): ToastContextValue {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message, duration }]);
      if (type !== "loading" && duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (msg: string) => addToast("success", msg),
    [addToast]
  );
  const error = useCallback(
    (msg: string) => addToast("error", msg, 6000),
    [addToast]
  );
  const info = useCallback(
    (msg: string) => addToast("info", msg),
    [addToast]
  );
  const loading = useCallback(
    (msg: string) => addToast("loading", msg, 0),
    [addToast]
  );

  return { toasts, addToast, removeToast, success, error, info, loading };
}
