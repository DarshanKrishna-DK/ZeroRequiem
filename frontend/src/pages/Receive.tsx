import { useState } from "react";
import { JsonRpcSigner, JsonRpcProvider, formatEther, Wallet, Contract, AbiCoder, keccak256, getBytes } from "ethers";
import * as ethers from "ethers";
import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import type { StealthKeys } from "../hooks/useStealth";
import { RELAYER_URL, EXPLORER_URL, FACTORY_ADDRESS, FACTORY_ABI, RPC_URL, VAULT_ADDRESS, VAULT_ABI, ENTRY_POINT_ADDRESS } from "../config/contracts";
import { useToast } from "../hooks/useToast";

interface Props {
  signer: JsonRpcSigner | null;
  address: string;
  stealthKeys: StealthKeys | null;
  onGenerateKeys: (signer: JsonRpcSigner) => Promise<StealthKeys | null>;
  onActivity: (entry: { type: "receive" | "withdraw"; amount?: string; txHash?: string; stealthAccount?: string }) => void;
}

interface Payment {
  receiver: string; amount: string; pkx: string; ciphertext: string;
  blockNumber: number; txHash: string; randomNumber: string;
  stealthPrivateKey: string; stealthAccountAddress: string;
}

function toHex(bytes: Uint8Array): string { return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""); }
function hexToBytes(hex: string): Uint8Array { const h = hex.startsWith("0x") ? hex.slice(2) : hex; const bytes = new Uint8Array(h.length / 2); for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(h.substring(i * 2, i * 2 + 2), 16); return bytes; }
function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array { const out = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i]; return out; }

const EC_N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
const SIMPLE_ACCOUNT_ABI = ["function execute(address dest, uint256 value, bytes calldata func)"];

export function Receive({ signer, address, stealthKeys, onGenerateKeys, onActivity }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [withdrawingIdx, setWithdrawingIdx] = useState<number | null>(null);
  const [withdrawStep, setWithdrawStep] = useState(0);
  const toast = useToast();

  const handleScan = async () => {
    if (!stealthKeys) { if (signer) await onGenerateKeys(signer); return; }
    setIsScanning(true);
    const loadId = toast.loading("Scanning blockchain...");
    try {
      const res = await fetch(`${RELAYER_URL}/api/scan`);
      const data = await res.json();
      if (!data.announcements || data.announcements.length === 0) { setPayments([]); toast.removeToast(loadId); toast.info("No payments found"); setIsScanning(false); return; }

      const provider = new JsonRpcProvider(RPC_URL);
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const found: Payment[] = [];
      const spendingPubPoint = secp.Point.fromHex(stealthKeys.spendingPublicKey.startsWith("0x") ? stealthKeys.spendingPublicKey.slice(2) : stealthKeys.spendingPublicKey);
      const viewingPrivBytes = hexToBytes(stealthKeys.viewingPrivateKey);
      const { computeAddress } = await import("ethers");

      for (const ann of data.announcements) {
        const pkxClean = ann.pkx.startsWith("0x") ? ann.pkx.slice(2) : ann.pkx;
        let matched = false;
        for (const prefix of ["02", "03"]) {
          if (matched) break;
          try {
            const ephPubPoint = secp.Point.fromHex(prefix + pkxClean);
            const sharedRaw = secp.getSharedSecret(viewingPrivBytes, ephPubPoint.toRawBytes(false), true);
            const sharedSecret = sha256(sharedRaw);
            const cipherBytes = hexToBytes(ann.ciphertext);
            const rBytes = xorBytes(cipherBytes, sharedSecret);
            const rValue = BigInt(toHex(rBytes));
            if (rValue === 0n || rValue >= EC_N) continue;
            const stealthPoint = spendingPubPoint.multiply(rValue);
            const stealthEOA = computeAddress(toHex(stealthPoint.toRawBytes(false)));
            const fn = factory.getFunction("getAddress");
            const stealthAccountAddr = await fn(stealthEOA, 0);
            if (stealthAccountAddr.toLowerCase() === ann.receiver.toLowerCase()) {
              const spPriv = BigInt(stealthKeys.spendingPrivateKey);
              const stealthPriv = (spPriv * rValue) % EC_N;
              found.push({ receiver: ann.receiver, amount: ann.amount, pkx: ann.pkx, ciphertext: ann.ciphertext, blockNumber: ann.blockNumber, txHash: ann.txHash, randomNumber: toHex(rBytes), stealthPrivateKey: "0x" + stealthPriv.toString(16).padStart(64, "0"), stealthAccountAddress: stealthAccountAddr });
              matched = true;
            }
          } catch { continue; }
        }
      }
      toast.removeToast(loadId);
      setPayments(found);
      if (found.length > 0) { toast.success(`Found ${found.length} payment(s)!`); found.forEach(() => onActivity({ type: "receive" })); }
      else toast.info("No payments for you in recent blocks");
    } catch (err: any) { toast.removeToast(loadId); toast.error(err.message || "Scan failed"); }
    finally { setIsScanning(false); }
  };

  const handleWithdraw = async (p: Payment, idx: number) => {
    if (!address) return;
    setWithdrawingIdx(idx);
    setWithdrawStep(1);
    try {
      const provider = new JsonRpcProvider(RPC_URL);
      const stealthWallet = new Wallet(p.stealthPrivateKey);
      const stealthEOA = stealthWallet.address;
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const stealthAccountAddr = await factory.getFunction("getAddress")(stealthEOA, 0);
      const code = await provider.getCode(stealthAccountAddr);
      const isDeployed = code !== "0x";

      let initCode = "0x";
      if (!isDeployed) {
        const factoryIface = new ethers.Interface(FACTORY_ABI);
        initCode = ethers.concat([FACTORY_ADDRESS, factoryIface.encodeFunctionData("createAccount", [stealthEOA, 0])]);
      }

      const withdrawAmount = p.amount;
      const vaultIface = new ethers.Interface(VAULT_ABI);
      const accountIface = new ethers.Interface(SIMPLE_ACCOUNT_ABI);
      const callData = accountIface.encodeFunctionData("execute", [VAULT_ADDRESS, 0n, vaultIface.encodeFunctionData("withdraw", [address, BigInt(withdrawAmount)])]);

      const epABI = ["function getNonce(address sender, uint192 key) view returns (uint256)"];
      const ep = new Contract(ENTRY_POINT_ADDRESS, epABI, provider);
      let nonce = "0";
      try { nonce = (await ep.getNonce(stealthAccountAddr, 0)).toString(); } catch {}

      const feeData = await provider.getFeeData();
      const userOp = {
        sender: stealthAccountAddr, nonce, initCode, callData,
        callGasLimit: "200000", verificationGasLimit: isDeployed ? "500000" : "700000",
        preVerificationGas: "60000",
        maxFeePerGas: (feeData.maxFeePerGas ?? feeData.gasPrice ?? 5000000000n).toString(),
        maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas ?? 1500000000n).toString(),
        paymasterAndData: "0x", signature: "0x",
      };

      setWithdrawStep(2);
      const sponsorRes = await fetch(`${RELAYER_URL}/api/sponsor`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userOp }) });
      if (!sponsorRes.ok) throw new Error((await sponsorRes.json()).error || "Sponsorship failed");
      userOp.paymasterAndData = (await sponsorRes.json()).paymasterAndData;

      setWithdrawStep(3);
      const packed = AbiCoder.defaultAbiCoder().encode(["address","uint256","bytes32","bytes32","uint256","uint256","uint256","uint256","uint256","bytes32"],
        [userOp.sender, BigInt(userOp.nonce), keccak256(userOp.initCode), keccak256(userOp.callData), BigInt(userOp.callGasLimit), BigInt(userOp.verificationGasLimit), BigInt(userOp.preVerificationGas), BigInt(userOp.maxFeePerGas), BigInt(userOp.maxPriorityFeePerGas), keccak256(userOp.paymasterAndData)]);
      const userOpHash = keccak256(AbiCoder.defaultAbiCoder().encode(["bytes32","address","uint256"], [keccak256(packed), ENTRY_POINT_ADDRESS, 97]));
      userOp.signature = await stealthWallet.signMessage(getBytes(userOpHash));

      setWithdrawStep(4);
      const relayRes = await fetch(`${RELAYER_URL}/api/relay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userOp }) });
      if (!relayRes.ok) throw new Error((await relayRes.json()).error || "Relay failed");
      const { txHash } = await relayRes.json();

      setWithdrawStep(5);
      toast.success(`Withdrawn ${formatEther(withdrawAmount)} BNB!`);
      onActivity({ type: "withdraw", amount: formatEther(withdrawAmount), txHash, stealthAccount: stealthAccountAddr });
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
    } finally {
      setWithdrawingIdx(null);
      setWithdrawStep(0);
    }
  };

  const STEPS = ["Build", "Sponsor", "Sign", "Relay", "Done"];

  if (!address) {
    return (
      <div className="card text-center py-16 animate-fade-in">
        <div className="feature-icon mx-auto mb-4">{"\u2199"}</div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Connect your wallet to scan for payments</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Receive <span className="gradient-text">Payments</span></h2>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Scan on-chain announcements to find stealth payments addressed to you.</p>

      <div className="card card-glow">
        {!stealthKeys ? (
          <div className="text-center py-4">
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Generate your stealth keys first to scan for incoming payments.</p>
            <button onClick={() => signer && onGenerateKeys(signer)} className="btn-primary">Generate Keys</button>
          </div>
        ) : (
          <button onClick={handleScan} className="btn-primary w-full" disabled={isScanning}>{isScanning ? "Scanning blockchain..." : "Scan for Payments"}</button>
        )}
      </div>

      {payments.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Found {payments.length} payment{payments.length > 1 ? "s" : ""}</h3>
          {payments.map((p, i) => (
            <div key={i} className="card card-glow" style={{ borderColor: "rgba(0,196,140,0.12)" }}>
              <div className="flex justify-between items-center mb-4">
                <span className="status-badge status-success">Incoming</span>
                <span className="text-xl font-black" style={{ color: "var(--success)" }}>{formatEther(p.amount)} BNB</span>
              </div>
              <div className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                <p>Stealth Account: <span className="mono">{p.stealthAccountAddress.slice(0, 14)}...{p.stealthAccountAddress.slice(-8)}</span></p>
                <p>Block: {p.blockNumber} &middot; <a href={`${EXPLORER_URL}/tx/${p.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>View tx &rarr;</a></p>
              </div>

              {/* Inline Withdraw */}
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
                {withdrawingIdx === i ? (
                  <div>
                    <div className="progress-steps mb-3">
                      {STEPS.map((_, si) => (
                        <div key={si} className={`progress-step ${si + 1 < withdrawStep ? "progress-step-done" : si + 1 === withdrawStep ? "progress-step-active" : ""}`} />
                      ))}
                    </div>
                    <p className="text-xs text-center" style={{ color: "var(--accent)" }}>{STEPS[withdrawStep - 1]}...</p>
                  </div>
                ) : (
                  <button onClick={() => handleWithdraw(p, i)} className="btn-primary w-full" style={{ padding: "10px 20px", fontSize: 13 }} disabled={withdrawingIdx !== null}>
                    Withdraw to My Wallet
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {payments.length === 0 && !isScanning && stealthKeys && (
        <div className="card text-center py-10">
          <p className="text-2xl mb-2 opacity-30">{"\u{1F50D}"}</p>
          <p style={{ color: "var(--text-secondary)" }}>No payments found. Ask someone to send you BNB first!</p>
        </div>
      )}
    </div>
  );
}
