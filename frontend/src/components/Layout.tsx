import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface LayoutProps {
  address: string;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  children: React.ReactNode;
}

export function Layout({
  address,
  isConnecting,
  onConnect,
  onDisconnect,
  children,
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-shell">
      <div className="bg-mesh" />
      <Sidebar collapsed={collapsed} />
      <div className={`main-area ${collapsed ? "main-area-expanded" : ""}`}>
        <Topbar
          address={address}
          isConnecting={isConnecting}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
