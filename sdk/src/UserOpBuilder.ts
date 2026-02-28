import {
  ethers,
  AbiCoder,
  Wallet,
  JsonRpcProvider,
  Contract,
  keccak256,
  solidityPacked,
  getBytes,
  hexlify,
  concat,
} from "ethers";
import { UserOperationStruct } from "./types";

const DEFAULT_CALL_GAS_LIMIT = 200_000n;
const DEFAULT_VERIFICATION_GAS_LIMIT = 500_000n;
const DEFAULT_PRE_VERIFICATION_GAS = 60_000n;

const SIMPLE_ACCOUNT_ABI = [
  "function execute(address dest, uint256 value, bytes calldata func)",
];

const FACTORY_ABI = [
  "function createAccount(address owner, uint256 salt) returns (address)",
  "function getAddress(address owner, uint256 salt) view returns (address)",
];

const ENTRY_POINT_ABI = [
  "function handleOps(tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature)[] ops, address payable beneficiary)",
  "function getUserOpHash(tuple(address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature) userOp) view returns (bytes32)",
  "function getNonce(address sender, uint192 key) view returns (uint256)",
  "function getSenderAddress(bytes initCode)",
];

const VAULT_ABI = [
  "function withdraw(address payable recipient, uint256 amount)",
];

export class UserOpBuilder {
  /**
   * Build a UserOperation that withdraws BNB from PrivacyVault via a stealth SimpleAccount.
   */
  static async buildWithdrawOp(params: {
    stealthAccountAddress: string;
    stealthOwnerAddress: string;
    vaultAddress: string;
    recipientAddress: string;
    amount: bigint;
    entryPointAddress: string;
    factoryAddress: string;
    provider: JsonRpcProvider;
    salt?: bigint;
  }): Promise<UserOperationStruct> {
    const {
      stealthAccountAddress,
      stealthOwnerAddress,
      vaultAddress,
      recipientAddress,
      amount,
      entryPointAddress,
      factoryAddress,
      provider,
      salt = 0n,
    } = params;

    // Check if account already deployed
    const code = await provider.getCode(stealthAccountAddress);
    const isDeployed = code !== "0x";

    // Build initCode if not deployed
    let initCode = "0x";
    if (!isDeployed) {
      const factoryIface = new ethers.Interface(FACTORY_ABI);
      const createCalldata = factoryIface.encodeFunctionData("createAccount", [
        stealthOwnerAddress,
        salt,
      ]);
      initCode = concat([factoryAddress, createCalldata]);
    }

    // Build callData: SimpleAccount.execute(vault, 0, vault.withdraw(recipient, amount))
    const vaultIface = new ethers.Interface(VAULT_ABI);
    const withdrawCalldata = vaultIface.encodeFunctionData("withdraw", [
      recipientAddress,
      amount,
    ]);

    const accountIface = new ethers.Interface(SIMPLE_ACCOUNT_ABI);
    const callData = accountIface.encodeFunctionData("execute", [
      vaultAddress,
      0n,
      withdrawCalldata,
    ]);

    // Get nonce from EntryPoint
    const entryPoint = new Contract(entryPointAddress, ENTRY_POINT_ABI, provider);
    let nonce = 0n;
    try {
      nonce = await entryPoint.getNonce(stealthAccountAddress, 0n);
    } catch {
      // Account not deployed yet, nonce = 0
    }

    // Get gas prices
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas ?? feeData.gasPrice ?? 5_000_000_000n;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 1_500_000_000n;

    return {
      sender: stealthAccountAddress,
      nonce,
      initCode,
      callData,
      callGasLimit: DEFAULT_CALL_GAS_LIMIT,
      verificationGasLimit: isDeployed
        ? DEFAULT_VERIFICATION_GAS_LIMIT
        : DEFAULT_VERIFICATION_GAS_LIMIT + 200_000n,
      preVerificationGas: DEFAULT_PRE_VERIFICATION_GAS,
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData: "0x",
      signature: "0x",
    };
  }

  /**
   * Sign a UserOperation with the stealth private key.
   */
  static async signUserOp(
    op: UserOperationStruct,
    signer: Wallet,
    entryPointAddress: string,
    chainId: number
  ): Promise<string> {
    const packed = AbiCoder.defaultAbiCoder().encode(
      [
        "address",
        "uint256",
        "bytes32",
        "bytes32",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "bytes32",
      ],
      [
        op.sender,
        op.nonce,
        keccak256(op.initCode),
        keccak256(op.callData),
        op.callGasLimit,
        op.verificationGasLimit,
        op.preVerificationGas,
        op.maxFeePerGas,
        op.maxPriorityFeePerGas,
        keccak256(op.paymasterAndData),
      ]
    );

    const userOpHash = keccak256(
      AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "address", "uint256"],
        [keccak256(packed), entryPointAddress, chainId]
      )
    );

    const signature = await signer.signMessage(getBytes(userOpHash));
    return signature;
  }

  /**
   * Encode paymasterAndData from the paymaster address, time bounds, and signature.
   */
  static encodePaymasterAndData(
    paymasterAddress: string,
    validUntil: number,
    validAfter: number,
    signature: string
  ): string {
    const timeEncoded = AbiCoder.defaultAbiCoder().encode(
      ["uint48", "uint48"],
      [validUntil, validAfter]
    );
    return concat([paymasterAddress, timeEncoded, signature]);
  }
}
