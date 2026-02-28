import { useState } from "react";
import { Wallet, JsonRpcProvider, AbiCoder, keccak256, getBytes, Contract, formatEther } from "ethers";
import * as ethers from "ethers";
import type { StealthKeys } from "../hooks/useStealth";
import { JsonRpcSigner } from "ethers";
import { VAULT_ADDRESS, VAULT_ABI, FACTORY_ADDRESS, FACTORY_ABI, RELAYER_URL, EXPLORER_URL, RPC_URL, ENTRY_POINT_ADDRESS } from "../config/contracts";
import { useToast } from "../hooks/useToast";

interface Props {
  signer: JsonRpcSigner | null;
  address: string;
  stealthKeys: StealthKeys | null;
  onGenerateKeys: (signer: JsonRpcSigner) => Promise<StealthKeys | null>;
  onActivity: (entry: { type: "withdraw"; amount: string; txHash: string; stealthAccount: string }) => void;
}

const SIMPLE_ACCOUNT_ABI = ["function execute(address dest, uint256 value, bytes calldata func)"];
const STEPS = ["Building UserOp", "Sponsoring gas", "Signing", "Relaying", "Confirmed"];

export function Withdraw({ signer, address, stealthKeys, onGenerateKeys, onActivity }: Props) {
  const [stealthPrivKey, setStealthPrivKey] = useState("");
  const [recipientAddr, setRecipientAddr] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [step, setStep] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [vaultBalance, setVaultBalance] = useState("");
  const toast = useToast();

  const checkBalance = async () => {
    if (!stealthPrivKey) return;
    try {
      const provider = new JsonRpcProvider(RPC_URL);
      const stealthWallet = new Wallet(stealthPrivKey);
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const stealthAccountAddr = await factory.getFunction("getAddress")(stealthWallet.address, 0);
      const vault = new Contract(VAULT_ADDRESS, VAULT_ABI, provider);
      const bal = await vault.stealthBalances(stealthAccountAddr);
      setVaultBalance(formatEther(bal));
    } catch {}
  };

  const handleWithdraw = async () => {
    if (!stealthPrivKey || !recipientAddr || !withdrawAmount) return;
    setIsWithdrawing(true);
    setTxHash("");
    setStep(1);
    try {
      const provider = new JsonRpcProvider(RPC_URL);
      const stealthWallet = new Wallet(stealthPrivKey);
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

      const vaultIface = new ethers.Interface(VAULT_ABI);
      const accountIface = new ethers.Interface(SIMPLE_ACCOUNT_ABI);
      const callData = accountIface.encodeFunctionData("execute", [VAULT_ADDRESS, 0n, vaultIface.encodeFunctionData("withdraw", [recipientAddr, ethers.parseEther(withdrawAmount)])]);

      const epABI = ["function getNonce(address sender, uint192 key) view returns (uint256)"];
      const ep = new Contract(ENTRY_POINT_ADDRESS, epABI, provider);
      let nonce = "0";
      try { nonce = (await ep.getNonce(stealthAccountAddr, 0)).toString(); } catch {}

      const feeData = await provider.getFeeData();
      const userOp = { sender: stealthAccountAddr, nonce, initCode, callData, callGasLimit: "200000", verificationGasLimit: isDeployed ? "500000" : "700000", preVerificationGas: "60000", maxFeePerGas: (feeData.maxFeePerGas ?? feeData.gasPrice ?? 5000000000n).toString(), maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas ?? 1500000000n).toString(), paymasterAndData: "0x", signature: "0x" };

      setStep(2);
      const sponsorRes = await fetch(`${RELAYER_URL}/api/sponsor`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userOp }) });
      if (!sponsorRes.ok) throw new Error((await sponsorRes.json()).error || "Sponsorship failed");
      userOp.paymasterAndData = (await sponsorRes.json()).paymasterAndData;

      setStep(3);
      const packed = AbiCoder.defaultAbiCoder().encode(["address","uint256","bytes32","bytes32","uint256","uint256","uint256","uint256","uint256","bytes32"],
        [userOp.sender, BigInt(userOp.nonce), keccak256(userOp.initCode), keccak256(userOp.callData), BigInt(userOp.callGasLimit), BigInt(userOp.verificationGasLimit), BigInt(userOp.preVerificationGas), BigInt(userOp.maxFeePerGas), BigInt(userOp.maxPriorityFeePerGas), keccak256(userOp.paymasterAndData)]);
      const userOpHash = keccak256(AbiCoder.defaultAbiCoder().encode(["bytes32","address","uint256"], [keccak256(packed), ENTRY_POINT_ADDRESS, 97]));
      userOp.signature = await stealthWallet.signMessage(getBytes(userOpHash));

      setStep(4);
      const relayRes = await fetch(`${RELAYER_URL}/api/relay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userOp }) });
      if (!relayRes.ok) throw new Error((await relayRes.json()).error || "Relay failed");
      const relayData = await relayRes.json();

      setStep(5);
      setTxHash(relayData.txHash);
      toast.success(`Withdrawn ${withdrawAmount} BNB successfully!`);
      onActivity({ type: "withdraw", amount: withdrawAmount, txHash: relayData.txHash, stealthAccount: stealthAccountAddr });
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
    } finally {
      setIsWithdrawing(false);
      setTimeout(() => setStep(0), 3000);
    }
  };

  if (!address) {
    return (
      <div className="card text-center py-16 animate-fade-in">
        <div className="feature-icon mx-auto mb-4">{"\u21B3"}</div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Connect your wallet to withdraw</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Withdraw <span className="gradient-text">Gasless</span></h2>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Withdraw BNB from your stealth account via ERC-4337. Gas is paid by the Paymaster.</p>

      <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(240,185,11,0.06), rgba(240,185,11,0.02))", border: "1px solid rgba(240,185,11,0.1)" }}>
        <span className="text-lg">{"\u26A1"}</span>
        <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Gas is sponsored by the ZeroRequiem Paymaster. Your stealth wallet pays zero gas.</span>
      </div>

      {/* Progress */}
      {step > 0 && (
        <div className="card" style={{ padding: "16px 20px" }}>
          <div className="progress-steps mb-2">
            {STEPS.map((_, i) => (<div key={i} className={`progress-step ${i + 1 < step ? "progress-step-done" : i + 1 === step ? "progress-step-active" : ""}`} />))}
          </div>
          <p className="text-xs text-center font-semibold" style={{ color: step === 5 ? "var(--success)" : "var(--accent)" }}>{STEPS[step - 1]}</p>
        </div>
      )}

      <div className="card card-glow space-y-5">
        <div>
          <label className="text-xs font-semibold block mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Stealth Private Key</label>
          <input type="password" className="input-field mono" placeholder="0x..." value={stealthPrivKey} onChange={(e) => setStealthPrivKey(e.target.value)} onBlur={checkBalance} />
          {stealthPrivKey && <p className="mono text-xs mt-2" style={{ color: "var(--text-secondary)" }}>{(() => { try { return `EOA: ${new Wallet(stealthPrivKey).address}`; } catch { return "Invalid key"; } })()}</p>}
        </div>

        {vaultBalance && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "rgba(0,196,140,0.04)", border: "1px solid rgba(0,196,140,0.12)" }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Vault Balance</span>
            <span className="text-lg font-black" style={{ color: "var(--success)" }}>{vaultBalance} BNB</span>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold block mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Recipient Address</label>
          <input type="text" className="input-field mono" placeholder="0x..." value={recipientAddr} onChange={(e) => setRecipientAddr(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-2 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Amount (BNB)</label>
          <input type="text" className="input-field" placeholder="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
        </div>
        <button onClick={handleWithdraw} className="btn-primary w-full" disabled={isWithdrawing || !stealthPrivKey || !recipientAddr || !withdrawAmount}>
          {isWithdrawing ? "Processing..." : "Withdraw via Paymaster"}
        </button>
      </div>

      {txHash && (
        <div className="card animate-fade-in" style={{ borderColor: "rgba(0,196,140,0.2)", background: "rgba(0,196,140,0.03)" }}>
          <span className="status-badge status-success mb-3">Withdrawn</span>
          <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold mt-2" style={{ color: "var(--accent)" }}>View on BSCScan &rarr;</a>
        </div>
      )}
    </div>
  );
}
