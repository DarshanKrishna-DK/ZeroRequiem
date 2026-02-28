interface TopbarProps {
  address: string;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleSidebar: () => void;
}

export function Topbar({
  address,
  isConnecting,
  onConnect,
  onDisconnect,
  onToggleSidebar,
}: TopbarProps) {
  return (
    <header className="topbar">
      <button className="topbar-menu-btn" onClick={onToggleSidebar}>
        {"\u2630"}
      </button>

      <div className="topbar-right">
        {address ? (
          <div className="flex items-center gap-3">
            <div className="wallet-badge">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
            <button onClick={onDisconnect} className="topbar-disconnect">
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="btn-primary"
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
