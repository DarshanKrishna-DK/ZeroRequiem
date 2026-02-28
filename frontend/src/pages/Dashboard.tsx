import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { JsonRpcSigner, JsonRpcProvider, formatEther } from "ethers";
import { Contract } from "ethers";
import type { StealthKeys } from "../hooks/useStealth";
import type { ActivityEntry } from "../hooks/useActivity";
import {
  RELAYER_URL,
  REGISTRY_ABI,
  REGISTRY_ADDRESS,
  RPC_URL,
  ENTRY_POINT_ADDRESS,
  PAYMASTER_ADDRESS,
} from "../config/contracts";

interface Props {
  address: string;
  signer: JsonRpcSigner | null;
  stealthKeys: StealthKeys | null;
  activity: ActivityEntry[];
  onGenerateKeys: (signer: JsonRpcSigner) => Promise<StealthKeys | null>;
}

export function Dashboard({
  address,
  signer,
  stealthKeys,
  activity,
  onGenerateKeys,
}: Props) {
  const [balance, setBalance] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [relayerOk, setRelayerOk] = useState<boolean | null>(null);
  const [paymasterDeposit, setPaymasterDeposit] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    const provider = new JsonRpcProvider(RPC_URL);

    provider.getBalance(address).then((b) => setBalance(formatEther(b))).catch(() => {});

    if (REGISTRY_ADDRESS) {
      const reg = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
      reg.stealthKeys(address).then(([p]: [bigint]) => {
        setIsRegistered(Number(p) !== 0);
      }).catch(() => setIsRegistered(false));
    }

    fetch(`${RELAYER_URL}/health`).then((r) => setRelayerOk(r.ok)).catch(() => setRelayerOk(false));

    if (ENTRY_POINT_ADDRESS && PAYMASTER_ADDRESS) {
      const ep = new Contract(ENTRY_POINT_ADDRESS, ["function balanceOf(address) view returns (uint256)"], provider);
      ep.balanceOf(PAYMASTER_ADDRESS).then((b: bigint) => setPaymasterDeposit(formatEther(b))).catch(() => {});
    }
  }, [address]);

  if (!address) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", paddingTop: 48, marginBottom: 48 }}>
          <div className="glow-ring" style={{ width: 80, height: 80, borderRadius: 20, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(240,185,11,0.06)", border: "1px solid rgba(240,185,11,0.12)" }}>
            <img src="/ZeroRequiem_Logo.png" alt="" style={{ width: 52, height: 52, borderRadius: 12 }} />
          </div>
          <h1 className="text-4xl font-black mb-3"><span className="gradient-text">ZeroRequiem</span></h1>
          <p className="text-base mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Privacy-preserving BNB transfers with gasless withdrawals on BNB Smart Chain.
          </p>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
            Send BNB to anyone without creating a traceable link between sender and recipient.
            Stealth addresses hide who you pay. A Paymaster covers gas so your fresh wallet stays anonymous.
          </p>
        </div>

        {/* How it works */}
        <div className="card card-glow mb-6 animate-fade-in anim-delay-1">
          <h3 className="font-bold text-base mb-4">How It Works</h3>
          <div className="space-y-4">
            {[
              { n: "1", title: "Register", desc: "Publish your stealth public keys on-chain. One-time setup, takes 30 seconds.", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
              )},
              { n: "2", title: "Send", desc: "Enter a recipient's wallet address and amount. BNB goes into a shared Privacy Vault targeting a one-time stealth address.", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              )},
              { n: "3", title: "Scan & Withdraw", desc: "Recipient scans encrypted announcements with their viewing key. One click to withdraw -- gas is paid by the Paymaster.", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 100 4h4v-4h-4z"/></svg>
              )},
            ].map((s) => (
              <div key={s.n} className="flex gap-4 items-start">
                <div className="step-number flex-shrink-0">{s.n}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: "var(--accent)" }}>{s.icon}</span>
                    <span className="text-sm font-bold">{s.title}</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[
            { title: "Stealth Addresses", desc: "ECDH-derived one-time addresses. No on-chain link to your identity.", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            )},
            { title: "Gasless Withdrawals", desc: "ERC-4337 Paymaster sponsors gas. Your stealth wallet never needs funding.", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            )},
            { title: "Privacy Vault", desc: "Shared deposit pool breaks the sender-recipient link for all users.", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            )},
            { title: "Public SDK", desc: "Integrate stealth payments into any dApp with a single npm package.", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            )},
          ].map((f) => (
            <div key={f.title} className="card card-glow animate-fade-in anim-delay-2">
              <div className="feature-icon mb-3" style={{ color: "var(--accent)" }}>{f.icon}</div>
              <h4 className="text-sm font-bold mb-1">{f.title}</h4>
              <p className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Tech badges */}
        <div className="card animate-fade-in anim-delay-3 mb-6" style={{ textAlign: "center" }}>
          <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Built With</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["BNB Chain", "ERC-4337", "secp256k1 ECDH", "Solidity", "React", "TypeScript"].map((t) => (
              <span key={t} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "rgba(240,185,11,0.06)", border: "1px solid rgba(240,185,11,0.1)", color: "var(--accent)" }}>{t}</span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }} className="animate-fade-in anim-delay-4">
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>Connect your wallet to get started</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, background: "rgba(240,185,11,0.04)", border: "1px solid rgba(240,185,11,0.08)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Requires MetaMask on BSC Testnet (Chain ID: 97)</span>
          </div>
        </div>
      </div>
    );
  }

  const recentActivity = activity.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Wallet */}
        <div className="card card-glow anim-delay-1 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="feature-icon">{"\u{1F4B0}"}</div>
            <div>
              <div className="text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Wallet</div>
              <div className="mono text-sm">{address.slice(0, 8)}...{address.slice(-6)}</div>
            </div>
          </div>
          <div className="text-2xl font-black" style={{ color: "var(--accent)" }}>
            {balance !== null ? `${parseFloat(balance).toFixed(4)} BNB` : "..."}
          </div>
        </div>

        {/* Stealth Keys */}
        <div className="card card-glow anim-delay-2 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="feature-icon">{"\u{1F511}"}</div>
            <div>
              <div className="text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Stealth Keys</div>
              <div className="text-sm font-semibold">
                {stealthKeys ? (
                  <span style={{ color: "var(--success)" }}>Generated</span>
                ) : (
                  <span style={{ color: "var(--warning)" }}>Not generated</span>
                )}
              </div>
            </div>
          </div>
          {isRegistered !== null && (
            <div className="text-sm">
              Registry: {isRegistered ? (
                <span className="status-badge status-success" style={{ fontSize: 10, padding: "3px 10px" }}>Registered</span>
              ) : (
                <Link to="/register" style={{ color: "var(--accent)", fontWeight: 600 }}>Register now &rarr;</Link>
              )}
            </div>
          )}
          {!stealthKeys && signer && (
            <button onClick={() => onGenerateKeys(signer)} className="btn-primary mt-3" style={{ padding: "8px 16px", fontSize: 12 }}>
              Generate Keys
            </button>
          )}
        </div>

        {/* Relayer */}
        <div className="card card-glow anim-delay-3 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="feature-icon">{"\u26A1"}</div>
            <div>
              <div className="text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Relayer</div>
              <div className="text-sm font-semibold">
                {relayerOk === null ? "..." : relayerOk ? (
                  <span style={{ color: "var(--success)" }}>Online</span>
                ) : (
                  <span style={{ color: "var(--error)" }}>Offline</span>
                )}
              </div>
            </div>
          </div>
          {paymasterDeposit && (
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Paymaster deposit: <span className="font-bold" style={{ color: "var(--accent)" }}>{parseFloat(paymasterDeposit).toFixed(5)} BNB</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card card-glow anim-delay-4 animate-fade-in">
          <div className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>Quick Actions</div>
          <div className="flex flex-wrap gap-2">
            <Link to="/send" className="btn-primary" style={{ padding: "8px 16px", fontSize: 12 }}>Send BNB</Link>
            <Link to="/receive" className="btn-secondary" style={{ padding: "8px 16px", fontSize: 12 }}>Scan Payments</Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Recent Activity</h3>
          {recentActivity.length > 0 && (
            <Link to="/activity" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>View all &rarr;</Link>
          )}
        </div>
        {recentActivity.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No activity yet. Start by sending or receiving BNB.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((entry) => (
              <div key={entry.id} className="card" style={{ padding: "14px 18px" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-base">
                      {entry.type === "send" ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      ) : entry.type === "receive" ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>
                      ) : entry.type === "withdraw" ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 100 4h4v-4h-4z"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                      )}
                    </span>
                    <div>
                      <div className="text-sm font-semibold capitalize">{entry.type}</div>
                      <div className="text-xs mono" style={{ color: "var(--text-secondary)" }}>
                        {entry.txHash ? `${entry.txHash.slice(0, 10)}...` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {entry.amount && <div className="text-sm font-bold" style={{ color: entry.type === "send" ? "var(--error)" : "var(--success)" }}>{entry.amount} BNB</div>}
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
