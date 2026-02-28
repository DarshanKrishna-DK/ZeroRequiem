import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const t = (s?: string) => (s || "").trim();
const cfg = {
  rpcUrl: t(process.env.RPC_URL) || "https://bsc-testnet-dataseed.bnbchain.org",
  relayerPrivateKey: t(process.env.RELAYER_PRIVATE_KEY),
  entryPointAddress: t(process.env.ENTRY_POINT_ADDRESS) || "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  paymasterAddress: t(process.env.PAYMASTER_ADDRESS),
  vaultAddress: t(process.env.VAULT_ADDRESS),
  factoryAddress: t(process.env.FACTORY_ADDRESS),
  registryAddress: t(process.env.REGISTRY_ADDRESS),
  chainId: 97,
};

import { ethers, Wallet, AbiCoder, keccak256, getBytes, Contract, JsonRpcProvider, formatEther } from "ethers";

const PAYMASTER_ABI = [
  "function getHash(tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature) userOp, uint48 validUntil, uint48 validAfter) view returns (bytes32)",
];

const ENTRY_POINT_ABI = [
  "function handleOps(tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature)[] ops, address payable beneficiary)",
];

const VAULT_ABI = [
  "function stealthBalances(address) view returns (uint256)",
  "event Announcement(address indexed receiver, uint256 amount, address indexed token, bytes32 pkx, bytes32 ciphertext)",
];

function getProvider() { return new JsonRpcProvider(cfg.rpcUrl); }
function getSigner() { return new Wallet(cfg.relayerPrivateKey, getProvider()); }

app.get("/health", (_req, res) => {
  res.json({ status: "ok", signer: "active" });
});

app.get("/", (_req, res) => {
  res.json({ name: "ZeroRequiem Relayer", status: "online" });
});

app.get("/api/config", (_req, res) => {
  const signer = getSigner();
  res.json({
    chainId: cfg.chainId,
    entryPoint: cfg.entryPointAddress,
    paymaster: cfg.paymasterAddress,
    vault: cfg.vaultAddress,
    factory: cfg.factoryAddress,
    registry: cfg.registryAddress,
    relayerSigner: signer.address,
  });
});

app.post("/api/sponsor", async (req, res) => {
  try {
    const { userOp } = req.body;
    if (!userOp) return res.status(400).json({ error: "Missing userOp" });

    const provider = getProvider();
    const signer = getSigner();

    const vault = new Contract(cfg.vaultAddress, VAULT_ABI, provider);
    const balance: bigint = await vault.stealthBalances(userOp.sender);
    if (balance === 0n) throw new Error("Stealth address has no vault balance");

    const now = Math.floor(Date.now() / 1000);
    const validAfter = now - 60;
    const validUntil = now + 600;

    const paymaster = new Contract(cfg.paymasterAddress, PAYMASTER_ABI, provider);
    const timeEncoded = AbiCoder.defaultAbiCoder().encode(["uint48", "uint48"], [validUntil, validAfter]);
    const dummyPmData = ethers.concat([cfg.paymasterAddress, timeEncoded, new Uint8Array(65)]);
    const opForHash = { ...userOp, paymasterAndData: dummyPmData };
    const hash: string = await paymaster.getHash(opForHash, validUntil, validAfter);
    const signature = await signer.signMessage(getBytes(hash));
    const paymasterAndData = ethers.hexlify(ethers.concat([cfg.paymasterAddress, timeEncoded, signature]));

    res.json({ paymasterAndData, validUntil, validAfter });
  } catch (err: any) {
    console.error("Sponsor error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/relay", async (req, res) => {
  try {
    const { userOp } = req.body;
    if (!userOp) return res.status(400).json({ error: "Missing userOp" });

    const signer = getSigner();
    const entryPoint = new Contract(cfg.entryPointAddress, ENTRY_POINT_ABI, signer);
    const opTuple = [
      userOp.sender, BigInt(userOp.nonce), userOp.initCode, userOp.callData,
      BigInt(userOp.callGasLimit), BigInt(userOp.verificationGasLimit),
      BigInt(userOp.preVerificationGas), BigInt(userOp.maxFeePerGas),
      BigInt(userOp.maxPriorityFeePerGas), userOp.paymasterAndData, userOp.signature,
    ];
    const tx = await entryPoint.handleOps([opTuple], signer.address, { gasLimit: 2_000_000n });
    const receipt = await tx.wait();
    res.json({ txHash: receipt.hash });
  } catch (err: any) {
    console.error("Relay error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/scan", async (req, res) => {
  try {
    const scanProvider = new JsonRpcProvider("https://bsc-testnet-rpc.publicnode.com");
    const currentBlock = await scanProvider.getBlockNumber();
    const lookback = 2000;
    const defaultFrom = Math.max(0, currentBlock - lookback);
    const fromBlock = parseInt((req.query.from as string) || String(defaultFrom), 10);
    const safeFrom = Math.max(fromBlock, currentBlock - lookback);

    const vault = new Contract(cfg.vaultAddress, VAULT_ABI, scanProvider);
    const events = await vault.queryFilter(vault.filters.Announcement(), safeFrom, currentBlock);
    const announcements = events.map((e: any) => ({
      receiver: e.args[0], amount: e.args[1].toString(), token: e.args[2],
      pkx: e.args[3], ciphertext: e.args[4], blockNumber: e.blockNumber, txHash: e.transactionHash,
    }));
    res.json({ announcements });
  } catch (err: any) {
    console.error("Scan error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/balance/:stealthAddress", async (req, res) => {
  try {
    const provider = getProvider();
    const vault = new Contract(cfg.vaultAddress, VAULT_ABI, provider);
    const balance = await vault.stealthBalances(req.params.stealthAddress);
    res.json({ balance: balance.toString() });
  } catch (err: any) {
    console.error("Balance error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default app;
