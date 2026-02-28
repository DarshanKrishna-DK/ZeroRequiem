import type { ActivityEntry } from "../hooks/useActivity";
import { EXPLORER_URL } from "../config/contracts";

interface Props {
  entries: ActivityEntry[];
  onClear: () => void;
}

const TYPE_ICONS: Record<string, string> = { send: "\u2197", receive: "\u2199", withdraw: "\u21B3", register: "\u2618" };
const TYPE_COLORS: Record<string, string> = { send: "var(--error)", receive: "var(--success)", withdraw: "var(--accent)", register: "var(--accent)" };

export function Activity({ entries, onClear }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Activity <span className="gradient-text">History</span></h2>
        {entries.length > 0 && (
          <button onClick={onClear} className="btn-ghost text-xs" style={{ color: "var(--error)" }}>Clear History</button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-2xl mb-2 opacity-30">{"\u{1F4CB}"}</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No activity yet. Transactions will appear here after you send, receive, or withdraw.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="card" style={{ padding: "14px 18px" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="feature-icon" style={{ width: 36, height: 36, fontSize: 16 }}>{TYPE_ICONS[entry.type] || "\u2022"}</div>
                  <div>
                    <div className="text-sm font-bold capitalize">{entry.type}</div>
                    {entry.address && <div className="mono text-xs" style={{ color: "var(--text-secondary)" }}>{entry.address.slice(0, 10)}...{entry.address.slice(-6)}</div>}
                    {entry.txHash && (
                      <a href={`${EXPLORER_URL}/tx/${entry.txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--accent)" }}>
                        {entry.txHash.slice(0, 12)}... &rarr;
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {entry.amount && (
                    <div className="text-sm font-bold" style={{ color: TYPE_COLORS[entry.type] }}>
                      {entry.type === "send" ? "-" : "+"}{entry.amount} BNB
                    </div>
                  )}
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
