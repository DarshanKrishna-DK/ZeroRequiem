import { type Toast as ToastItem } from "../hooks/useToast";

const ICONS: Record<string, string> = {
  success: "\u2713",
  error: "\u2717",
  info: "\u2139",
  loading: "\u25CB",
};

const COLORS: Record<string, string> = {
  success: "var(--success)",
  error: "var(--error)",
  info: "var(--accent)",
  loading: "var(--accent)",
};

export function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-item ${t.type === "loading" ? "toast-loading" : ""}`}
          style={{ borderLeftColor: COLORS[t.type] }}
          onClick={() => onRemove(t.id)}
        >
          <span className="toast-icon" style={{ color: COLORS[t.type] }}>
            {ICONS[t.type]}
          </span>
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
