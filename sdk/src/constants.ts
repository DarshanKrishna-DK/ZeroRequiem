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

export const ENTRY_POINT_ABI = [
  "function handleOps(tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature)[] ops, address payable beneficiary)",
  "function getNonce(address sender, uint192 key) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

export const SIMPLE_ACCOUNT_ABI = [
  "function execute(address dest, uint256 value, bytes calldata func)",
];

export const ENTRY_POINT_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

export const BSC_TESTNET = {
  chainId: 97,
  name: "BNB Smart Chain Testnet",
  rpcUrl: "https://bsc-testnet-dataseed.bnbchain.org",
  explorerUrl: "https://testnet.bscscan.com",
};

export interface ZeroRequiemConfig {
  rpcUrl: string;
  chainId: number;
  vaultAddress: string;
  registryAddress: string;
  factoryAddress: string;
  entryPointAddress: string;
  paymasterAddress: string;
  relayerUrl: string;
}
