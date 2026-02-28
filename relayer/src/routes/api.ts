import { Router, Request, Response } from "express";
import { JsonRpcProvider, Contract } from "ethers";
import { PaymasterService } from "../services/paymasterService";
import { BundlerService } from "../services/bundlerService";
import { config } from "../config";

const router = Router();
const paymasterService = new PaymasterService();
const bundlerService = new BundlerService();

const provider = new JsonRpcProvider(config.rpcUrl);

const VAULT_ABI = [
  "function stealthBalances(address) view returns (uint256)",
  "event Announcement(address indexed receiver, uint256 amount, address indexed token, bytes32 pkx, bytes32 ciphertext)",
];

/**
 * POST /api/sponsor
 * Client sends an unsigned UserOp. Relayer validates vault balance,
 * signs paymasterAndData, and returns it.
 */
router.post("/sponsor", async (req: Request, res: Response) => {
  try {
    const { userOp } = req.body;
    if (!userOp) {
      return res.status(400).json({ error: "Missing userOp" });
    }

    const result = await paymasterService.sponsorUserOp(userOp);
    return res.json({
      paymasterAndData: result.paymasterAndData,
      validUntil: result.validUntil,
      validAfter: result.validAfter,
    });
  } catch (err: any) {
    console.error("Sponsor error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/relay
 * Client sends a fully signed UserOp (with paymasterAndData).
 * Relayer submits it to EntryPoint via handleOps.
 */
router.post("/relay", async (req: Request, res: Response) => {
  try {
    const { userOp } = req.body;
    if (!userOp) {
      return res.status(400).json({ error: "Missing userOp" });
    }

    const txHash = await bundlerService.relayUserOp(userOp);
    return res.json({ txHash });
  } catch (err: any) {
    console.error("Relay error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/scan?from=<blockNumber>
 * Returns all Announcement events from PrivacyVault since the given block.
 */
router.get("/scan", async (req: Request, res: Response) => {
  try {
    const currentBlock = await provider.getBlockNumber();
    const lookback = 2000;
    const defaultFrom = Math.max(0, currentBlock - lookback);
    const fromBlock = parseInt((req.query.from as string) || String(defaultFrom), 10);
    const safeFrom = Math.max(fromBlock, currentBlock - lookback);

    const scanProvider = new JsonRpcProvider("https://bsc-testnet-rpc.publicnode.com");
    const vault = new Contract(config.vaultAddress, VAULT_ABI, scanProvider);

    const filter = vault.filters.Announcement();
    const events = await vault.queryFilter(filter, safeFrom, currentBlock);

    const announcements = events.map((e: any) => ({
      receiver: e.args[0],
      amount: e.args[1].toString(),
      token: e.args[2],
      pkx: e.args[3],
      ciphertext: e.args[4],
      blockNumber: e.blockNumber,
      txHash: e.transactionHash,
    }));

    return res.json({ announcements });
  } catch (err: any) {
    console.error("Scan error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/balance/:stealthAddress
 * Returns the vault balance for a stealth address.
 */
router.get("/balance/:stealthAddress", async (req: Request, res: Response) => {
  try {
    const vault = new Contract(config.vaultAddress, VAULT_ABI, provider);
    const balance = await vault.stealthBalances(req.params.stealthAddress);
    return res.json({ balance: balance.toString() });
  } catch (err: any) {
    console.error("Balance error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/config
 * Returns the deployed contract addresses for the frontend.
 */
router.get("/config", (_req: Request, res: Response) => {
  return res.json({
    chainId: config.chainId,
    entryPoint: config.entryPointAddress,
    paymaster: config.paymasterAddress,
    vault: config.vaultAddress,
    factory: config.factoryAddress,
    registry: config.registryAddress,
    relayerSigner: paymasterService.getSignerAddress(),
  });
});

export default router;
