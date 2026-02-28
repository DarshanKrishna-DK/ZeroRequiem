import { ethers } from "hardhat";

const ENTRY_POINT_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "BNB\n");

  const relayerAddress =
    process.env.RELAYER_ADDRESS || deployer.address;

  // 1. PrivacyVault
  console.log("Deploying PrivacyVault...");
  const PrivacyVault = await ethers.getContractFactory("PrivacyVault");
  const vault = await PrivacyVault.deploy();
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("  PrivacyVault:", vaultAddr);

  // 2. StealthKeyRegistry
  console.log("Deploying StealthKeyRegistry...");
  const StealthKeyRegistry = await ethers.getContractFactory("StealthKeyRegistry");
  const registry = await StealthKeyRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("  StealthKeyRegistry:", registryAddr);

  // 3. SimpleAccountFactory (uses existing EntryPoint on BSC testnet)
  console.log("Deploying SimpleAccountFactory...");
  const SimpleAccountFactory = await ethers.getContractFactory("SimpleAccountFactory");
  const factory = await SimpleAccountFactory.deploy(ENTRY_POINT_V06);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("  SimpleAccountFactory:", factoryAddr);

  // 4. ZeroRequiemPaymaster
  console.log("Deploying ZeroRequiemPaymaster...");
  const ZeroRequiemPaymaster = await ethers.getContractFactory("ZeroRequiemPaymaster");
  const paymaster = await ZeroRequiemPaymaster.deploy(ENTRY_POINT_V06, relayerAddress);
  await paymaster.waitForDeployment();
  const paymasterAddr = await paymaster.getAddress();
  console.log("  ZeroRequiemPaymaster:", paymasterAddr);

  // 5. Fund the paymaster on the EntryPoint
  console.log("\nFunding paymaster on EntryPoint...");
  const fundAmount = ethers.parseEther("0.05");
  const tx = await paymaster.deposit({ value: fundAmount });
  await tx.wait();
  console.log("  Deposited", ethers.formatEther(fundAmount), "BNB to paymaster stake");

  // Summary
  console.log("\n========== DEPLOYMENT SUMMARY ==========");
  console.log("Network:              BSC Testnet (chainId 97)");
  console.log("EntryPoint (v0.6):   ", ENTRY_POINT_V06);
  console.log("PrivacyVault:        ", vaultAddr);
  console.log("StealthKeyRegistry:  ", registryAddr);
  console.log("SimpleAccountFactory:", factoryAddr);
  console.log("ZeroRequiemPaymaster:", paymasterAddr);
  console.log("Verifying Signer:    ", relayerAddress);
  console.log("=========================================\n");

  console.log("Copy these addresses to your .env file:");
  console.log(`VAULT_ADDRESS=${vaultAddr}`);
  console.log(`REGISTRY_ADDRESS=${registryAddr}`);
  console.log(`FACTORY_ADDRESS=${factoryAddr}`);
  console.log(`PAYMASTER_ADDRESS=${paymasterAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
