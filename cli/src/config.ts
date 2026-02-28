import * as dotenv from "dotenv";
import * as path from "path";
import { ZeroRequiemConfig, BSC_TESTNET, ENTRY_POINT_V06 } from "zerorequiem-sdk";
import { Wallet, JsonRpcProvider } from "ethers";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const DEPLOYED = {
  vault: "0xc02cE66D57b7dC05446c041864aCdCc23B94Ad48",
  registry: "0x867E1c09B0aa3C79A171de8d20CA0C14Dd21fcAb",
  factory: "0xaB885C2db018E3690269a91c9bDbdf53a5DC0614",
  paymaster: "0xe0fdDfa9f06c9E35eCDec67f2c7AFCB3Af0E439C",
  relayer: "https://zerorequiem-relayer.vercel.app",
};

export interface CLIOptions {
  privateKey?: string;
  rpcUrl?: string;
  relayerUrl?: string;
}

export function getConfig(opts: CLIOptions = {}): ZeroRequiemConfig {
  const rpcUrl = opts.rpcUrl || process.env.RPC_URL || BSC_TESTNET.rpcUrl;
  return {
    rpcUrl,
    chainId: BSC_TESTNET.chainId,
    vaultAddress: process.env.VAULT_ADDRESS || DEPLOYED.vault,
    registryAddress: process.env.REGISTRY_ADDRESS || DEPLOYED.registry,
    factoryAddress: process.env.FACTORY_ADDRESS || DEPLOYED.factory,
    entryPointAddress: process.env.ENTRY_POINT_ADDRESS || ENTRY_POINT_V06,
    paymasterAddress: process.env.PAYMASTER_ADDRESS || DEPLOYED.paymaster,
    relayerUrl: opts.relayerUrl || process.env.RELAYER_URL || DEPLOYED.relayer,
  };
}

export function getWallet(opts: CLIOptions): Wallet {
  const key = opts.privateKey || process.env.PRIVATE_KEY;
  if (!key) {
    console.error("Error: Private key required. Use --private-key or set PRIVATE_KEY env var.");
    process.exit(1);
  }
  const config = getConfig(opts);
  const provider = new JsonRpcProvider(config.rpcUrl);
  return new Wallet(key, provider);
}

export const EXPLORER = BSC_TESTNET.explorerUrl;
