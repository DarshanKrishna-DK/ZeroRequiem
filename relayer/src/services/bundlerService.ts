import { Wallet, JsonRpcProvider, Contract } from "ethers";
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

const ENTRY_POINT_ABI = [
  "function handleOps(tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature)[] ops, address payable beneficiary)",
  "function getUserOpHash(tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature) userOp) view returns (bytes32)",
];

export class BundlerService {
  private signer: Wallet;
  private provider: JsonRpcProvider;
  private entryPoint: Contract;

  constructor() {
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.signer = new Wallet(config.relayerPrivateKey, this.provider);
    this.entryPoint = new Contract(
      config.entryPointAddress,
      ENTRY_POINT_ABI,
      this.signer
    );
  }

  /**
   * Submit a signed UserOperation to the EntryPoint via handleOps.
   * The relayer acts as the bundler, paying gas for the transaction.
   */
  async relayUserOp(userOp: UserOp): Promise<string> {
    const opTuple = [
      userOp.sender,
      BigInt(userOp.nonce),
      userOp.initCode,
      userOp.callData,
      BigInt(userOp.callGasLimit),
      BigInt(userOp.verificationGasLimit),
      BigInt(userOp.preVerificationGas),
      BigInt(userOp.maxFeePerGas),
      BigInt(userOp.maxPriorityFeePerGas),
      userOp.paymasterAndData,
      userOp.signature,
    ];

    const tx = await this.entryPoint.handleOps(
      [opTuple],
      this.signer.address,
      {
        gasLimit: 2_000_000n,
      }
    );

    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Get the UserOp hash from the EntryPoint for verification.
   */
  async getUserOpHash(userOp: UserOp): Promise<string> {
    return await this.entryPoint.getUserOpHash([
      userOp.sender,
      BigInt(userOp.nonce),
      userOp.initCode,
      userOp.callData,
      BigInt(userOp.callGasLimit),
      BigInt(userOp.verificationGasLimit),
      BigInt(userOp.preVerificationGas),
      BigInt(userOp.maxFeePerGas),
      BigInt(userOp.maxPriorityFeePerGas),
      userOp.paymasterAndData,
      userOp.signature,
    ]);
  }
}
