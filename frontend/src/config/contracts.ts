export const CHAIN_ID = 97;
export const CHAIN_NAME = "BSC Testnet";
export const RPC_URL = "https://bsc-testnet-dataseed.bnbchain.org";
export const EXPLORER_URL = "https://testnet.bscscan.com";
export const RELAYER_URL = "http://localhost:3001";

export const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

// These will be populated after deployment - update with actual addresses
export let VAULT_ADDRESS = "";
export let REGISTRY_ADDRESS = "";
export let FACTORY_ADDRESS = "";
export let PAYMASTER_ADDRESS = "";

export async function loadContractConfig() {
  try {
    const res = await fetch(`${RELAYER_URL}/api/config`);
    const data = await res.json();
    VAULT_ADDRESS = data.vault;
    REGISTRY_ADDRESS = data.registry;
    FACTORY_ADDRESS = data.factory;
    PAYMASTER_ADDRESS = data.paymaster;
    return data;
  } catch {
    console.warn("Could not load config from relayer, using defaults");
    return null;
  }
}

export const VAULT_ABI = [
  "function sendToStealth(address receiver, bytes32 pkx, bytes32 ciphertext) payable",
  "function withdraw(address payable recipient, uint256 amount)",
  "function stealthBalances(address) view returns (uint256)",
  "event Announcement(address indexed receiver, uint256 amount, address indexed token, bytes32 pkx, bytes32 ciphertext)",
];

export const REGISTRY_ABI = [
  "function setStealthKeys(uint256 spendingPubKeyPrefix, uint256 spendingPubKey, uint256 viewingPubKeyPrefix, uint256 viewingPubKey)",
  "function stealthKeys(address) view returns (uint256, uint256, uint256, uint256)",
];

export const FACTORY_ABI = [
  "function getAddress(address owner, uint256 salt) view returns (address)",
  "function createAccount(address owner, uint256 salt) returns (address)",
];

export const BSC_TESTNET_PARAMS = {
  chainId: "0x61",
  chainName: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: [EXPLORER_URL],
};
