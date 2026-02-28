export interface EncryptedPayload {
  ephemeralPublicKey: string;
  ciphertext: string;
}

export interface StealthPayment {
  receiver: string;
  amount: bigint;
  token: string;
  pkx: string;
  ciphertext: string;
  blockNumber: number;
  txHash: string;
}

export interface ScannedPayment extends StealthPayment {
  randomNumber: string;
  stealthPrivateKey: string;
}

export interface StealthKeyPairData {
  spendingPubKeyPrefix: number;
  spendingPubKey: string;
  viewingPubKeyPrefix: number;
  viewingPubKey: string;
}

export interface UserOperationStruct {
  sender: string;
  nonce: bigint;
  initCode: string;
  callData: string;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: string;
  signature: string;
}
