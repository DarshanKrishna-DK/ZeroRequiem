import { useState } from "react";
import {
  VAULT_ADDRESS,
  REGISTRY_ADDRESS,
  FACTORY_ADDRESS,
  ENTRY_POINT_ADDRESS,
  PAYMASTER_ADDRESS,
  EXPLORER_URL,
} from "../config/contracts";
import { useToast } from "../hooks/useToast";

function CodeBlock({ children, label }: { children: string; label?: string }) {
  const toast = useToast();
  return (
    <div className="relative group">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</span>
          <button
            className="btn-ghost text-xs mono opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ padding: "3px 10px" }}
            onClick={() => { navigator.clipboard.writeText(children); toast.success("Copied to clipboard"); }}
          >
            Copy
          </button>
        </div>
      )}
      <pre className="code-block">{children}</pre>
    </div>
  );
}

function SectionCard({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="card card-glow">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-bold text-base">{title}</h3>
        {badge && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function ContractRow({ label, addr }: { label: string; addr: string }) {
  const toast = useToast();
  const display = addr || "Not deployed";
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid var(--glass-border)" }}>
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        {addr ? (
          <a href={`${EXPLORER_URL}/address/${addr}`} target="_blank" rel="noopener noreferrer" className="mono text-xs" style={{ color: "var(--accent)" }}>{addr.slice(0, 8)}...{addr.slice(-6)}</a>
        ) : (
          <span className="mono text-xs" style={{ color: "var(--text-secondary)" }}>{display}</span>
        )}
        {addr && (
          <button className="btn-ghost text-xs" style={{ padding: "2px 8px" }} onClick={() => { navigator.clipboard.writeText(addr); toast.success("Address copied"); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}

const TABS = ["Overview", "Quick Start", "API Reference", "Self-Host"] as const;
type Tab = typeof TABS[number];

export function SDKDocs() {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-1">
          <span className="gradient-text">Developer</span> Documentation
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Everything you need to integrate ZeroRequiem stealth payments into your dApp or platform.
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(12,12,18,0.6)", border: "1px solid var(--glass-border)" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === t ? "rgba(240,185,11,0.1)" : "transparent",
              color: tab === t ? "var(--accent)" : "var(--text-secondary)",
              border: tab === t ? "1px solid rgba(240,185,11,0.15)" : "1px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Overview" && <OverviewTab />}
      {tab === "Quick Start" && <QuickStartTab />}
      {tab === "API Reference" && <APIReferenceTab />}
      {tab === "Self-Host" && <SelfHostTab />}
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* What is ZeroRequiem */}
      <SectionCard title="What is ZeroRequiem?">
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          ZeroRequiem is a privacy layer for BNB Smart Chain that lets users send and receive BNB
          without creating a traceable link between sender and recipient. It combines <strong style={{ color: "var(--text-primary)" }}>ECDH stealth addresses</strong> with <strong style={{ color: "var(--text-primary)" }}>ERC-4337 account abstraction</strong> to
          enable fully gasless, private transactions.
        </p>
      </SectionCard>

      {/* How It Works */}
      <SectionCard title="How It Works" badge="5 Steps">
        <div className="space-y-4">
          {[
            { step: "1", title: "Register", desc: "Recipient publishes stealth public keys (spending + viewing) to the on-chain registry. This is a one-time setup." },
            { step: "2", title: "Send", desc: "Sender looks up recipient's keys, generates a one-time stealth address using ECDH, and deposits BNB into the Privacy Vault." },
            { step: "3", title: "Announce", desc: "The vault emits an encrypted Announcement event containing the ephemeral public key and encrypted random number." },
            { step: "4", title: "Scan", desc: "Recipient decrypts announcements with their viewing key. Matching payments reveal the stealth private key for withdrawal." },
            { step: "5", title: "Withdraw", desc: "Recipient creates an ERC-4337 UserOperation. The Paymaster sponsors gas, so the stealth wallet never needs external funding." },
          ].map((s) => (
            <div key={s.step} className="flex gap-4">
              <div className="step-number flex-shrink-0">{s.step}</div>
              <div>
                <div className="text-sm font-bold mb-1">{s.title}</div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Architecture */}
      <SectionCard title="Architecture">
        <CodeBlock label="Transaction Flow">{`Sender (any wallet)
  |
  +-- 1. Deposit BNB -------> PrivacyVault (shared pool)
  |                              |
  |                         Announcement Event
  |                         (ephemeral key + ciphertext)
  |                              |
  |                              v
  |                    Recipient scans events
  |                    Decrypts with viewing key
  |                    Derives stealth private key
  |                              |
  |                              v
  |                    Stealth SimpleAccount (ERC-4337)
  |                    Signs UserOperation
  |                              |
  |                              v
  +--------------------> Relayer / Bundler
                              |
                         Signs paymasterAndData
                         Calls handleOps()
                              |
                              v
                         EntryPoint v0.6
                              |
                         Paymaster validates & pays gas
                         SimpleAccount deploys via CREATE2
                         Vault.withdraw() executes
                              |
                              v
                         BNB -> Any recipient address
                         (zero gas link to identity)`}</CodeBlock>
      </SectionCard>

      {/* Contracts */}
      <SectionCard title="Deployed Contracts" badge="BSC Testnet">
        <div>
          <ContractRow label="Privacy Vault" addr={VAULT_ADDRESS} />
          <ContractRow label="Stealth Key Registry" addr={REGISTRY_ADDRESS} />
          <ContractRow label="SimpleAccount Factory" addr={FACTORY_ADDRESS} />
          <ContractRow label="Verifying Paymaster" addr={PAYMASTER_ADDRESS} />
          <ContractRow label="EntryPoint v0.6" addr={ENTRY_POINT_ADDRESS} />
        </div>
      </SectionCard>
    </div>
  );
}

function QuickStartTab() {
  return (
    <div className="space-y-6">
      <SectionCard title="Installation" badge="npm">
        <CodeBlock label="Terminal">{`npm install zerorequiem-sdk`}</CodeBlock>
        <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
          Works in both Node.js and browsers. Uses <code className="mono text-xs" style={{ color: "var(--accent)" }}>@noble/secp256k1</code> for all cryptographic operations (no native dependencies).
        </p>
      </SectionCard>

      <SectionCard title="Initialize">
        <CodeBlock label="TypeScript">{`import { ZeroRequiem } from "zerorequiem-sdk";

const zr = new ZeroRequiem({
  rpcUrl: "https://bsc-testnet-dataseed.bnbchain.org",
  chainId: 97,
  vaultAddress: "${VAULT_ADDRESS || "0x..."}",
  registryAddress: "${REGISTRY_ADDRESS || "0x..."}",
  factoryAddress: "${FACTORY_ADDRESS || "0x..."}",
  entryPointAddress: "${ENTRY_POINT_ADDRESS}",
  paymasterAddress: "${PAYMASTER_ADDRESS || "0x..."}",
  relayerUrl: "http://localhost:3001",
});`}</CodeBlock>
      </SectionCard>

      <SectionCard title="Register Stealth Keys" badge="One-time">
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          The recipient signs a message to derive deterministic stealth keys, then publishes the public keys on-chain.
          This only needs to happen once per wallet.
        </p>
        <CodeBlock label="TypeScript">{`// Derive spending + viewing key pairs from wallet signature
const keys = await zr.generateKeys(signer);

// Publish public keys to on-chain registry
const txHash = await zr.registerKeys(signer, keys.registrationData);
console.log("Registered:", txHash);`}</CodeBlock>
      </SectionCard>

      <SectionCard title="Send BNB Privately">
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          The sender only needs the recipient's wallet address. The SDK automatically looks up their
          stealth keys from the registry, generates a one-time address, and deposits into the vault.
        </p>
        <CodeBlock label="TypeScript">{`const { txHash, stealthAccountAddr } = await zr.send(
  signer,
  "0xRecipientAddress",
  "0.01"  // amount in BNB
);

console.log("Sent to stealth:", stealthAccountAddr);
console.log("Tx:", txHash);`}</CodeBlock>
      </SectionCard>

      <SectionCard title="Scan for Incoming Payments">
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          The recipient scans on-chain Announcement events. The viewing key decrypts each event to check
          if it was addressed to them.
        </p>
        <CodeBlock label="TypeScript">{`const payments = await zr.scan(
  spendingPrivateKey,
  viewingPrivateKey,
  fromBlock  // optional: start block number
);

for (const p of payments) {
  console.log(\`Found \${p.amount} wei at block \${p.blockNumber}\`);
  console.log(\`Stealth key: \${p.stealthPrivateKey}\`);
}`}</CodeBlock>
      </SectionCard>

      <SectionCard title="Withdraw (Gasless)" badge="ERC-4337">
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          The stealth private key is used to sign an ERC-4337 UserOperation. The Paymaster sponsors gas,
          so the stealth wallet never needs to hold BNB for fees.
        </p>
        <CodeBlock label="TypeScript">{`const withdrawTx = await zr.withdraw(
  stealthPrivateKey,
  "0xMyRealWallet",
  "0.01"  // amount in BNB
);

console.log("Withdrawn:", withdrawTx);`}</CodeBlock>
      </SectionCard>

      <SectionCard title="Utility Methods">
        <CodeBlock label="TypeScript">{`// Check if someone has registered stealth keys
const registered = await zr.isRegistered("0xAddress");

// Check vault balance for a stealth account
const balance = await zr.getVaultBalance(stealthPrivateKey);
console.log(\`Vault balance: \${balance} BNB\`);

// Check how much gas budget the Paymaster has left
const deposit = await zr.getPaymasterDeposit();
console.log(\`Paymaster deposit: \${deposit} BNB\`);`}</CodeBlock>
      </SectionCard>
    </div>
  );
}

function APIReferenceTab() {
  const methods = [
    {
      name: "generateKeys",
      sig: "generateKeys(signer: Signer): Promise<GeneratedKeys>",
      desc: "Derives deterministic spending and viewing key pairs from a wallet signature. The same wallet always produces the same keys.",
      params: "signer - An ethers.js Signer instance (e.g. from MetaMask)",
      returns: "Object with spendingKeyPair, viewingKeyPair, and registrationData for on-chain publishing",
    },
    {
      name: "registerKeys",
      sig: "registerKeys(signer: Signer, keys: StealthKeyPairData): Promise<string>",
      desc: "Publishes stealth public keys to the on-chain StealthKeyRegistry contract.",
      params: "signer - Signer to send the tx; keys - The registrationData from generateKeys()",
      returns: "Transaction hash",
    },
    {
      name: "send",
      sig: 'send(signer: Signer, recipientAddress: string, amountBnb: string): Promise<{ txHash, stealthAccountAddr }>',
      desc: "Sends BNB privately. Looks up recipient's stealth keys, generates a one-time address, and deposits into the vault.",
      params: 'signer - Sender\'s signer; recipientAddress - Recipient\'s wallet; amountBnb - Amount as string (e.g. "0.01")',
      returns: "Transaction hash and the stealth account address",
    },
    {
      name: "scan",
      sig: "scan(spendingPrivKey: string, viewingPrivKey: string, fromBlock?: number): Promise<ScannedPayment[]>",
      desc: "Scans on-chain Announcement events for payments addressed to you.",
      params: "spendingPrivKey, viewingPrivKey - Stealth private keys; fromBlock - Optional start block",
      returns: "Array of payments with receiver, amount, stealthPrivateKey, txHash, blockNumber",
    },
    {
      name: "withdraw",
      sig: 'withdraw(stealthPrivKey: string, recipientAddress: string, amountBnb: string): Promise<string>',
      desc: "Gasless withdrawal via ERC-4337. Builds a UserOperation, gets Paymaster sponsorship from the relayer, signs, and submits.",
      params: "stealthPrivKey - From scan result; recipientAddress - Where to send BNB; amountBnb - Amount",
      returns: "Transaction hash",
    },
    {
      name: "getVaultBalance",
      sig: "getVaultBalance(stealthPrivKey: string): Promise<string>",
      desc: "Returns the vault balance for a stealth account in BNB.",
      params: "stealthPrivKey - The stealth private key",
      returns: "Balance as a string in BNB",
    },
    {
      name: "getPaymasterDeposit",
      sig: "getPaymasterDeposit(): Promise<string>",
      desc: "Returns remaining gas budget deposited in the EntryPoint by the Paymaster.",
      params: "None",
      returns: "Deposit balance as a string in BNB",
    },
    {
      name: "isRegistered",
      sig: "isRegistered(address: string): Promise<boolean>",
      desc: "Checks if an address has published stealth keys to the registry.",
      params: "address - The wallet address to check",
      returns: "true if registered, false otherwise",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="ZeroRequiem Class" badge="High-Level Facade">
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          The main SDK entry point. Wraps all stealth address, scanning, and ERC-4337 logic into a single class.
        </p>
        <CodeBlock label="Constructor">{`new ZeroRequiem(config: {
  rpcUrl: string;          // BNB Smart Chain RPC endpoint
  chainId: number;         // 97 for testnet, 56 for mainnet
  vaultAddress: string;    // PrivacyVault contract
  registryAddress: string; // StealthKeyRegistry contract
  factoryAddress: string;  // SimpleAccountFactory contract
  entryPointAddress: string; // ERC-4337 EntryPoint v0.6
  paymasterAddress: string;  // ZeroRequiemPaymaster contract
  relayerUrl: string;      // Relayer API base URL
})`}</CodeBlock>
      </SectionCard>

      {methods.map((m) => (
        <SectionCard key={m.name} title={m.name}>
          <div className="code-block mb-3 text-xs" style={{ padding: "12px 16px" }}>
            <span style={{ color: "#c792ea" }}>async </span>
            <span style={{ color: "#82aaff" }}>{m.sig.split("(")[0]}</span>
            <span style={{ color: "var(--text-secondary)" }}>({m.sig.split("(").slice(1).join("(")}</span>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{m.desc}</p>
          <div className="space-y-2">
            <div className="text-xs"><strong style={{ color: "var(--text-primary)" }}>Parameters:</strong> <span style={{ color: "var(--text-secondary)" }}>{m.params}</span></div>
            <div className="text-xs"><strong style={{ color: "var(--text-primary)" }}>Returns:</strong> <span style={{ color: "var(--text-secondary)" }}>{m.returns}</span></div>
          </div>
        </SectionCard>
      ))}

      <SectionCard title="Low-Level Exports">
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>For advanced use cases, the SDK also exports the building blocks:</p>
        <div className="space-y-2">
          {[
            { name: "StealthCore", desc: "Key generation, recipient lookup, stealth address computation, scanning" },
            { name: "StealthKeyPair", desc: "secp256k1 key pair with ECDH encrypt/decrypt and point multiplication" },
            { name: "RandomNumber", desc: "Cryptographically secure random scalar (browser-safe)" },
            { name: "UserOpBuilder", desc: "ERC-4337 UserOperation construction and signing" },
          ].map((c) => (
            <div key={c.name} className="flex items-start gap-3 py-2" style={{ borderBottom: "1px solid var(--glass-border)" }}>
              <code className="mono text-xs font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>{c.name}</code>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{c.desc}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Contract ABIs & Constants">
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>All contract ABIs and network constants are exported for direct use:</p>
        <CodeBlock label="TypeScript">{`import {
  VAULT_ABI,
  REGISTRY_ABI,
  FACTORY_ABI,
  ENTRY_POINT_ABI,
  SIMPLE_ACCOUNT_ABI,
  ENTRY_POINT_V06,
  BSC_TESTNET,
} from "zerorequiem-sdk";`}</CodeBlock>
      </SectionCard>
    </div>
  );
}

function SelfHostTab() {
  return (
    <div className="space-y-6">
      <SectionCard title="Prerequisites">
        <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li className="flex gap-2"><span style={{ color: "var(--accent)" }}>1.</span> Node.js 18+ and npm</li>
          <li className="flex gap-2"><span style={{ color: "var(--accent)" }}>2.</span> MetaMask browser extension</li>
          <li className="flex gap-2"><span style={{ color: "var(--accent)" }}>3.</span> Two wallets funded with BSC testnet BNB (tBNB)</li>
        </ul>
        <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: "rgba(240,185,11,0.04)", border: "1px solid rgba(240,185,11,0.1)", color: "var(--text-secondary)" }}>
          Get tBNB from <a href="https://www.bnbchain.org/en/testnet-faucet" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 600 }}>bnbchain.org/testnet-faucet</a>. You need ~0.2 tBNB per wallet.
        </div>
      </SectionCard>

      <SectionCard title="1. Clone & Configure" badge="Step 1">
        <CodeBlock label="Terminal">{`git clone https://github.com/ZeroRequiem/zerorequiem.git
cd zerorequiem
cp .env.example .env`}</CodeBlock>
        <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>Edit <code className="mono" style={{ color: "var(--accent)" }}>.env</code> with your private keys:</p>
        <CodeBlock label=".env">{`DEPLOYER_PRIVATE_KEY=0xYourDeployerKey
RELAYER_PRIVATE_KEY=0xYourRelayerKey
RELAYER_ADDRESS=0xYourRelayerPublicAddress
RPC_URL=https://bsc-testnet-dataseed.bnbchain.org
ENTRY_POINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
RELAYER_PORT=3001`}</CodeBlock>
      </SectionCard>

      <SectionCard title="2. Deploy Contracts" badge="Step 2">
        <CodeBlock label="Terminal">{`cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network bscTestnet`}</CodeBlock>
        <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
          The script outputs all contract addresses. Copy them into your <code className="mono" style={{ color: "var(--accent)" }}>.env</code> file.
          It also deposits 0.05 tBNB into the Paymaster's EntryPoint stake.
        </p>
      </SectionCard>

      <SectionCard title="3. Start Relayer" badge="Step 3">
        <CodeBlock label="Terminal">{`cd relayer
npm install
npx ts-node src/index.ts`}</CodeBlock>
        <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
          Runs on port 3001. Acts as both <strong style={{ color: "var(--text-primary)" }}>Paymaster signer</strong> (signs paymasterAndData) and <strong style={{ color: "var(--text-primary)" }}>Bundler</strong> (calls entryPoint.handleOps).
        </p>
      </SectionCard>

      <SectionCard title="4. Start Frontend" badge="Step 4">
        <CodeBlock label="Terminal">{`cd frontend
npm install
npm run dev`}</CodeBlock>
        <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
          Open <code className="mono" style={{ color: "var(--accent)" }}>http://localhost:5173</code> and connect MetaMask to BSC Testnet.
        </p>
      </SectionCard>

      <SectionCard title="User Workflow">
        <div className="space-y-3">
          {[
            { role: "Recipient", steps: "Connect wallet → Register Keys (one-time) → Scan for payments → One-click Withdraw" },
            { role: "Sender", steps: "Connect wallet → Go to Send → Enter recipient's wallet address + amount → Send Privately" },
          ].map((w) => (
            <div key={w.role} className="p-3 rounded-xl" style={{ background: "rgba(12,12,18,0.6)", border: "1px solid var(--glass-border)" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>{w.role}</div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{w.steps}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Network Details">
        <div className="space-y-2">
          {[
            { k: "Chain", v: "BNB Smart Chain Testnet" },
            { k: "Chain ID", v: "97" },
            { k: "RPC", v: "https://bsc-testnet-dataseed.bnbchain.org" },
            { k: "Explorer", v: "https://testnet.bscscan.com" },
          ].map((r) => (
            <div key={r.k} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--glass-border)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{r.k}</span>
              <span className="mono text-xs" style={{ color: "var(--accent)" }}>{r.v}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Troubleshooting">
        <div className="space-y-3 text-xs" style={{ color: "var(--text-secondary)" }}>
          {[
            { err: '"Stealth address has no vault balance"', fix: "The sender hasn't deposited to the vault yet, or the scan didn't find the matching payment." },
            { err: '"insufficient funds for gas"', fix: "The relayer wallet needs more tBNB. Fund it from the faucet." },
            { err: '"Sender not EntryPoint"', fix: "The Paymaster can only be called by the EntryPoint contract. Don't call it directly." },
            { err: "MetaMask not switching networks", fix: "Manually add BSC Testnet in MetaMask settings (Chain ID: 97)." },
          ].map((t, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(255,77,106,0.03)", border: "1px solid rgba(255,77,106,0.08)" }}>
              <code className="mono text-xs block mb-1" style={{ color: "var(--error)" }}>{t.err}</code>
              <p>{t.fix}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
