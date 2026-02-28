import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function ensureHexPrefix(key: string | undefined): string {
  if (!key) throw new Error("DEPLOYER_PRIVATE_KEY not set in .env");
  return key.startsWith("0x") ? key : `0x${key}`;
}

const DEPLOYER_KEY = ensureHexPrefix(process.env.DEPLOYER_PRIVATE_KEY);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    bscTestnet: {
      url: process.env.RPC_URL || "https://bsc-testnet-dataseed.bnbchain.org",
      chainId: 97,
      accounts: [DEPLOYER_KEY],
    },
  },
};

export default config;
