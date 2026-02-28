import {
  JsonRpcProvider,
  Contract,
  Signer,
  Wallet,
  parseEther,
  formatEther,
} from "ethers";
import { StealthCore } from "./StealthCore";
import { StealthKeyPair } from "./StealthKeyPair";
import { UserOpBuilder } from "./UserOpBuilder";
import { ScannedPayment, StealthKeyPairData } from "./types";
import {
  ZeroRequiemConfig,
  VAULT_ABI,
  REGISTRY_ABI,
  ENTRY_POINT_ABI,
} from "./constants";

export interface GeneratedKeys {
  spendingKeyPair: StealthKeyPair;
  viewingKeyPair: StealthKeyPair;
  registrationData: StealthKeyPairData;
}

/**
 * High-level facade for the ZeroRequiem protocol.
 *
 * @example
 * ```ts
 * import { ZeroRequiem } from "zerorequiem-sdk";
 *
 * const zr = new ZeroRequiem({
 *   rpcUrl: "https://bsc-testnet-dataseed.bnbchain.org",
 *   chainId: 97,
 *   vaultAddress: "0x...",
 *   registryAddress: "0x...",
 *   factoryAddress: "0x...",
 *   entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
 *   paymasterAddress: "0x...",
 *   relayerUrl: "http://localhost:3001",
 * });
 *
 * const keys = await zr.generateKeys(signer);
 * await zr.registerKeys(signer, keys.registrationData);
 * await zr.send(signer, recipientAddress, "0.01");
 * ```
 */
export class ZeroRequiem {
  readonly config: ZeroRequiemConfig;
  readonly provider: JsonRpcProvider;

  constructor(config: ZeroRequiemConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl);
  }

  /**
   * Generate stealth spending and viewing key pairs from a wallet signature.
   * The same wallet always produces the same keys (deterministic).
   */
  async generateKeys(signer: Signer): Promise<GeneratedKeys> {
    const { spendingKeyPair, viewingKeyPair } =
      await StealthCore.generatePrivateKeys(signer, this.config.chainId);

    const { prefix: spPrefix, pubKeyXCoordinate: spX } =
      StealthKeyPair.compressPublicKey(spendingKeyPair.publicKeyHex);
    const { prefix: vwPrefix, pubKeyXCoordinate: vwX } =
      StealthKeyPair.compressPublicKey(viewingKeyPair.publicKeyHex);

    return {
      spendingKeyPair,
      viewingKeyPair,
      registrationData: {
        spendingPubKeyPrefix: spPrefix,
        spendingPubKey: spX,
        viewingPubKeyPrefix: vwPrefix,
        viewingPubKey: vwX,
      },
    };
  }

  /**
   * Register stealth public keys on-chain so senders can look them up.
   * @returns Transaction hash
   */
  async registerKeys(
    signer: Signer,
    keys: StealthKeyPairData
  ): Promise<string> {
    const registry = new Contract(
      this.config.registryAddress,
      REGISTRY_ABI,
      signer
    );
    const tx = await registry.setStealthKeys(
      keys.spendingPubKeyPrefix,
      keys.spendingPubKey,
      keys.viewingPubKeyPrefix,
      keys.viewingPubKey
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Send BNB privately to a recipient who has registered stealth keys.
   * @param amountBnb Amount in BNB (e.g. "0.01")
   * @returns Transaction hash and the one-time stealth account address
   */
  async send(
    signer: Signer,
    recipientAddress: string,
    amountBnb: string
  ): Promise<{ txHash: string; stealthAccountAddr: string }> {
    const recipientKeys = await StealthCore.lookupRecipient(
      recipientAddress,
      this.config.registryAddress,
      this.provider
    );

    const { stealthAddress, ephemeralPubKeyX, ciphertext } =
      StealthCore.prepareSend(recipientKeys);

    const stealthAccountAddr = await StealthCore.getStealthAccountAddress(
      this.config.factoryAddress,
      stealthAddress,
      0n,
      this.provider
    );

    const vault = new Contract(this.config.vaultAddress, VAULT_ABI, signer);
    const tx = await vault.sendToStealth(
      stealthAccountAddr,
      ephemeralPubKeyX,
      ciphertext,
      { value: parseEther(amountBnb) }
    );
    const receipt = await tx.wait();

    return { txHash: receipt.hash, stealthAccountAddr };
  }

  /**
   * Scan on-chain events and find payments addressed to you.
   */
  async scan(
    spendingPrivateKey: string,
    viewingPrivateKey: string,
    fromBlock?: number
  ): Promise<ScannedPayment[]> {
    return StealthCore.scan(
      this.config.vaultAddress,
      spendingPrivateKey,
      viewingPrivateKey,
      this.provider,
      fromBlock
    );
  }

  /**
   * Withdraw BNB from a stealth account via ERC-4337 (gasless).
   * Gas is sponsored by the Paymaster through the relayer.
   * @param amountBnb Amount in BNB (e.g. "0.01")
   * @returns Transaction hash
   */
  async withdraw(
    stealthPrivateKey: string,
    recipientAddress: string,
    amountBnb: string
  ): Promise<string> {
    const stealthWallet = new Wallet(stealthPrivateKey);
    const stealthEOA = stealthWallet.address;

    const stealthAccountAddr = await StealthCore.getStealthAccountAddress(
      this.config.factoryAddress,
      stealthEOA,
      0n,
      this.provider
    );

    const userOp = await UserOpBuilder.buildWithdrawOp({
      stealthAccountAddress: stealthAccountAddr,
      stealthOwnerAddress: stealthEOA,
      vaultAddress: this.config.vaultAddress,
      recipientAddress,
      amount: parseEther(amountBnb),
      entryPointAddress: this.config.entryPointAddress,
      factoryAddress: this.config.factoryAddress,
      provider: this.provider,
    });

    const opForRelay = {
      sender: userOp.sender,
      nonce: userOp.nonce.toString(),
      initCode: userOp.initCode,
      callData: userOp.callData,
      callGasLimit: userOp.callGasLimit.toString(),
      verificationGasLimit: userOp.verificationGasLimit.toString(),
      preVerificationGas: userOp.preVerificationGas.toString(),
      maxFeePerGas: userOp.maxFeePerGas.toString(),
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString(),
      paymasterAndData: "0x",
      signature: "0x",
    };

    const sponsorRes = await fetch(`${this.config.relayerUrl}/api/sponsor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userOp: opForRelay }),
    });

    if (!sponsorRes.ok) {
      const errBody = await sponsorRes.json() as Record<string, string>;
      throw new Error(errBody.error || "Paymaster sponsorship failed");
    }

    const sponsorData = await sponsorRes.json() as { paymasterAndData: string };
    const { paymasterAndData } = sponsorData;
    opForRelay.paymasterAndData = paymasterAndData;
    userOp.paymasterAndData = paymasterAndData;

    const signature = await UserOpBuilder.signUserOp(
      userOp,
      stealthWallet,
      this.config.entryPointAddress,
      this.config.chainId
    );
    opForRelay.signature = signature;

    const relayRes = await fetch(`${this.config.relayerUrl}/api/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userOp: opForRelay }),
    });

    if (!relayRes.ok) {
      const errBody = await relayRes.json() as Record<string, string>;
      throw new Error(errBody.error || "Relay failed");
    }

    const relayData = await relayRes.json() as { txHash: string };
    const { txHash } = relayData;
    return txHash;
  }

  /**
   * Check the vault balance for a stealth account.
   * @returns Balance in BNB as a string
   */
  async getVaultBalance(stealthPrivateKey: string): Promise<string> {
    const stealthWallet = new Wallet(stealthPrivateKey);
    const stealthAccountAddr = await StealthCore.getStealthAccountAddress(
      this.config.factoryAddress,
      stealthWallet.address,
      0n,
      this.provider
    );
    const vault = new Contract(
      this.config.vaultAddress,
      VAULT_ABI,
      this.provider
    );
    const balance = await vault.stealthBalances(stealthAccountAddr);
    return formatEther(balance);
  }

  /**
   * Check the Paymaster's remaining gas deposit on the EntryPoint.
   * @returns Deposit balance in BNB as a string
   */
  async getPaymasterDeposit(): Promise<string> {
    const ep = new Contract(
      this.config.entryPointAddress,
      ENTRY_POINT_ABI,
      this.provider
    );
    const balance = await ep.balanceOf(this.config.paymasterAddress);
    return formatEther(balance);
  }

  /**
   * Check if an address has registered stealth keys.
   */
  async isRegistered(address: string): Promise<boolean> {
    try {
      const keys = await StealthCore.lookupRecipient(
        address,
        this.config.registryAddress,
        this.provider
      );
      return keys.spendingPubKeyPrefix !== 0;
    } catch {
      return false;
    }
  }
}
