import {
  ethers,
  Wallet,
  AbiCoder,
  keccak256,
  getBytes,
  Contract,
  JsonRpcProvider,
} from "ethers";
import { config } from "../config";

interface UserOp {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

const PAYMASTER_ABI = [
  "function getHash(tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature) userOp, uint48 validUntil, uint48 validAfter) view returns (bytes32)",
  "function senderNonce(address) view returns (uint256)",
];

const VAULT_ABI = [
  "function stealthBalances(address) view returns (uint256)",
];

export class PaymasterService {
  private signer: Wallet;
  private provider: JsonRpcProvider;

  constructor() {
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.signer = new Wallet(config.relayerPrivateKey, this.provider);
  }

  /**
   * Validate that a stealth address has funds in the vault, then sign the
   * paymaster portion of a UserOp.
   */
  async sponsorUserOp(userOp: UserOp): Promise<{
    paymasterAndData: string;
    validUntil: number;
    validAfter: number;
  }> {
    // Verify stealth account has vault balance
    const vault = new Contract(config.vaultAddress, VAULT_ABI, this.provider);
    const balance: bigint = await vault.stealthBalances(userOp.sender);
    if (balance === 0n) {
      throw new Error("Stealth address has no vault balance");
    }

    // Time window: valid for 10 minutes from now
    const now = Math.floor(Date.now() / 1000);
    const validAfter = now - 60;
    const validUntil = now + 600;

    // Build the paymaster hash using the on-chain getHash function
    const paymaster = new Contract(
      config.paymasterAddress,
      PAYMASTER_ABI,
      this.provider
    );

    // Construct temporary paymasterAndData with empty signature for hashing
    const timeEncoded = AbiCoder.defaultAbiCoder().encode(
      ["uint48", "uint48"],
      [validUntil, validAfter]
    );
    const dummyPaymasterAndData = ethers.concat([
      config.paymasterAddress,
      timeEncoded,
      new Uint8Array(65),
    ]);

    const opForHash = { ...userOp, paymasterAndData: dummyPaymasterAndData };
    const hash: string = await paymaster.getHash(
      opForHash,
      validUntil,
      validAfter
    );

    // Sign the hash as an Ethereum signed message
    const signature = await this.signer.signMessage(getBytes(hash));

    // Build final paymasterAndData
    const paymasterAndData = ethers.concat([
      config.paymasterAddress,
      timeEncoded,
      signature,
    ]);

    return {
      paymasterAndData: ethers.hexlify(paymasterAndData),
      validUntil,
      validAfter,
    };
  }

  getSignerAddress(): string {
    return this.signer.address;
  }
}
