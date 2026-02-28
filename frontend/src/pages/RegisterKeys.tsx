import { useState } from "react";
import { Contract, JsonRpcSigner } from "ethers";
import type { StealthKeys } from "../hooks/useStealth";
import {
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  EXPLORER_URL,
} from "../config/contracts";

interface Props {
  signer: JsonRpcSigner | null;
  address: string;
  stealthKeys: StealthKeys | null;
  onGenerateKeys: (signer: JsonRpcSigner) => Promise<StealthKeys | null>;
  isGenerating: boolean;
}

export function RegisterKeys({
  signer,
  address,
  stealthKeys,
  onGenerateKeys,
  isGenerating,
}: Props) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!signer) return;
    setError("");
    await onGenerateKeys(signer);
  };

  const handleRegister = async () => {
    if (!signer || !stealthKeys || !REGISTRY_ADDRESS) return;
    setIsRegistering(true);
    setError("");
    try {
      const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
      const tx = await registry.setStealthKeys(
        stealthKeys.spendingPubKeyPrefix,
        stealthKeys.spendingPubKeyX,
        stealthKeys.viewingPubKeyPrefix,
        stealthKeys.viewingPubKeyX
      );
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  if (!address) {
    return (
      <div className="card text-center py-16 animate-fade-in">
        <div className="feature-icon mx-auto">
          <span style={{ fontSize: 20 }}>{"\u{1F511}"}</span>
        </div>
        <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Connect your wallet to register stealth keys
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-2xl font-bold mb-1">
          Register <span className="gradient-text">Stealth Keys</span>
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Generate and publish your stealth meta-address so others can send you
          private payments.
        </p>
      </div>

      {/* Step 1 */}
      <div className="card card-glow animate-fade-in-delay-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="step-number">1</div>
          <h3 className="font-bold">Generate Keys</h3>
        </div>
        <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
          Sign a message to deterministically derive your spending and viewing
          key pairs. This signature never leaves your device.
        </p>
        <button
          onClick={handleGenerate}
          className="btn-primary"
          disabled={isGenerating}
        >
          {isGenerating
            ? "Awaiting signature..."
            : stealthKeys
            ? "Regenerate Keys"
            : "Generate Stealth Keys"}
        </button>
      </div>

      {/* Keys display */}
      {stealthKeys && (
        <>
          <div className="card card-glow animate-fade-in-delay-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="feature-icon" style={{ width: 36, height: 36, marginBottom: 0 }}>
                <span style={{ fontSize: 16 }}>{"\u2713"}</span>
              </div>
              <h3 className="font-bold">Your Stealth Keys</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  className="text-xs font-semibold block mb-2 uppercase tracking-wider"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Spending Public Key
                  <span
                    className="ml-2 px-2 py-0.5 rounded text-xs"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                  >
                    prefix: {stealthKeys.spendingPubKeyPrefix}
                  </span>
                </label>
                <div
                  className="mono text-xs break-all p-3 rounded-xl leading-relaxed"
                  style={{
                    background: "rgba(12, 12, 18, 0.8)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {stealthKeys.spendingPubKeyX}
                </div>
              </div>
              <div>
                <label
                  className="text-xs font-semibold block mb-2 uppercase tracking-wider"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Viewing Public Key
                  <span
                    className="ml-2 px-2 py-0.5 rounded text-xs"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                  >
                    prefix: {stealthKeys.viewingPubKeyPrefix}
                  </span>
                </label>
                <div
                  className="mono text-xs break-all p-3 rounded-xl leading-relaxed"
                  style={{
                    background: "rgba(12, 12, 18, 0.8)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {stealthKeys.viewingPubKeyX}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="card card-glow animate-fade-in-delay-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="step-number">2</div>
              <h3 className="font-bold">Register On-Chain</h3>
            </div>
            <p
              className="text-sm mb-5"
              style={{ color: "var(--text-secondary)" }}
            >
              Publish your stealth public keys to the on-chain registry so
              senders can look them up by your address.
            </p>
            <button
              onClick={handleRegister}
              className="btn-primary"
              disabled={isRegistering}
            >
              {isRegistering ? "Confirming transaction..." : "Register Keys"}
            </button>
          </div>
        </>
      )}

      {/* Success */}
      {txHash && (
        <div
          className="card animate-fade-in"
          style={{
            borderColor: "rgba(0, 196, 140, 0.2)",
            background: "rgba(0, 196, 140, 0.03)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="status-badge status-success">Registered</span>
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold"
              style={{ color: "var(--accent)" }}
            >
              View on BSCScan &rarr;
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="card animate-fade-in"
          style={{
            borderColor: "rgba(255, 77, 106, 0.2)",
            background: "rgba(255, 77, 106, 0.03)",
          }}
        >
          <span className="status-badge status-error">Error</span>
          <p className="mt-3 text-sm" style={{ color: "var(--error)" }}>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
