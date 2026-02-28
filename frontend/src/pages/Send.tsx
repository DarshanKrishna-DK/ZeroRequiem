import { useState } from "react";
import { Contract, JsonRpcSigner, JsonRpcProvider, parseEther, isAddress } from "ethers";
import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes } from "@noble/hashes/utils";
import {
  VAULT_ADDRESS, VAULT_ABI, REGISTRY_ADDRESS, REGISTRY_ABI,
  FACTORY_ABI, FACTORY_ADDRESS, EXPLORER_URL, RPC_URL,
} from "../config/contracts";
import { useToast } from "../hooks/useToast";

interface Props {
  signer: JsonRpcSigner | null;
  address: string;
  onActivity: (entry: { type: "send"; amount: string; address: string; txHash: string; stealthAccount: string }) => void;
}

const EC_N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

function toHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(h.substring(i * 2, i * 2 + 2), 16);
  return bytes;
}
function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

export function Send({ signer, address, onActivity }: Props) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [stealthAddr, setStealthAddr] = useState("");
  const toast = useToast();

  const addrValid = recipient === "" || isAddress(recipient);

  const handleSend = async () => {
    if (!signer || !recipient || !amount) return;
    if (!isAddress(recipient)) { toast.error("Invalid recipient address"); return; }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { toast.error("Invalid amount"); return; }

    setIsSending(true);
    setTxHash("");
    setStealthAddr("");
    const loadId = toast.loading("Preparing stealth transaction...");

    try {
      const provider = new JsonRpcProvider(RPC_URL);
      const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
      const [spPrefix, spKey, vwPrefix, vwKey] = await registry.stealthKeys(recipient);

      if (Number(spPrefix) === 0) { toast.removeToast(loadId); toast.error("Recipient has not registered stealth keys"); setIsSending(false); return; }

      const spKeyHex = BigInt(spKey).toString(16).padStart(64, "0");
      const vwKeyHex = BigInt(vwKey).toString(16).padStart(64, "0");
      const spCompressed = `0${Number(spPrefix)}${spKeyHex}`;
      const vwCompressed = `0${Number(vwPrefix)}${vwKeyHex}`;
      const spendingPoint = secp.Point.fromHex(spCompressed);
      const viewingPoint = secp.Point.fromHex(vwCompressed);

      let rValue: bigint;
      do { const buf = randomBytes(32); rValue = BigInt(toHex(buf)); } while (rValue >= EC_N || rValue === 0n);

      const rHex = rValue.toString(16).padStart(64, "0");
      const rBytes = hexToBytes(rHex);
      const stealthPoint = spendingPoint.multiply(rValue);
      const stealthPubUncompressed = stealthPoint.toRawBytes(false);
      const { computeAddress } = await import("ethers");
      const stealthAddress = computeAddress(toHex(stealthPubUncompressed));

      const ephPriv = secp.utils.randomPrivateKey();
      const sharedRaw = secp.getSharedSecret(ephPriv, viewingPoint.toRawBytes(false), true);
      const sharedSecret = sha256(sharedRaw);
      const ciphertext = xorBytes(rBytes, sharedSecret);
      const ephCompressed = secp.getPublicKey(ephPriv, true);
      const pkx = toHex(ephCompressed.slice(1));

      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const fn = factory.getFunction("getAddress");
      const stealthAccountAddr = await fn(stealthAddress, 0);

      const vault = new Contract(VAULT_ADDRESS, VAULT_ABI, signer);
      const tx = await vault.sendToStealth(stealthAccountAddr, pkx, toHex(ciphertext), { value: parseEther(amount) });
      const receipt = await tx.wait();

      toast.removeToast(loadId);
      toast.success(`Sent ${amount} BNB privately!`);
      setTxHash(receipt.hash);
      setStealthAddr(stealthAccountAddr);
      onActivity({ type: "send", amount, address: recipient, txHash: receipt.hash, stealthAccount: stealthAccountAddr });
    } catch (err: any) {
      toast.removeToast(loadId);
      toast.error(err.reason || err.message || "Send failed");
    } finally {
      setIsSending(false);
    }
  };

  if (!address) {
    return (
      <div className="card text-center py-16 animate-fade-in">
        <div className="feature-icon mx-auto mb-4">{"\u2197"}</div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Connect your wallet to send BNB privately</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Send <span className="gradient-text">Privately</span></h2>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Send BNB to a stealth address. The recipient must have registered stealth keys.</p>

      <div className="card card-glow space-y-5">
        <div>
          <label className="text-xs font-semibold block mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Recipient Address</label>
          <input type="text" className={`input-field mono ${!addrValid ? "input-error" : ""}`} placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          {!addrValid && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>Invalid Ethereum address</p>}
        </div>
        <div>
          <label className="text-xs font-semibold block mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Amount (BNB)</label>
          <input type="text" className="input-field" placeholder="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <button onClick={handleSend} className="btn-primary w-full" disabled={isSending || !recipient || !amount || !addrValid}>
          {isSending ? "Generating stealth address & sending..." : "Send Privately"}
        </button>
        <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>Funds are deposited into the Privacy Vault and assigned to a one-time stealth account.</p>
      </div>

      {txHash && (
        <div className="card animate-fade-in" style={{ borderColor: "rgba(0,196,140,0.2)", background: "rgba(0,196,140,0.03)" }}>
          <span className="status-badge status-success mb-3">Sent</span>
          <div className="space-y-2 mt-2">
            <div><span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Stealth Account</span><p className="mono text-xs mt-1 break-all" style={{ color: "var(--accent)" }}>{stealthAddr}</p></div>
            <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold" style={{ color: "var(--accent)" }}>View on BSCScan &rarr;</a>
          </div>
        </div>
      )}
    </div>
  );
}
