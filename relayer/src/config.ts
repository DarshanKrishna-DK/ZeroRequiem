import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || process.env.RELAYER_PORT || "3001", 10),
  rpcUrl: process.env.RPC_URL || "https://bsc-testnet-dataseed.bnbchain.org",
  chainId: 97,

  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || "",
  entryPointAddress:
    process.env.ENTRY_POINT_ADDRESS ||
    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  paymasterAddress: process.env.PAYMASTER_ADDRESS || "",
  vaultAddress: process.env.VAULT_ADDRESS || "",
  factoryAddress: process.env.FACTORY_ADDRESS || "",
  registryAddress: process.env.REGISTRY_ADDRESS || "",
};
