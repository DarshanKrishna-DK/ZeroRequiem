import { sha256 } from "@noble/hashes/sha256";
import {
  ethers,
  Signer,
  Contract,
  JsonRpcProvider,
  keccak256,
  getBytes,
} from "ethers";
import { StealthKeyPair } from "./StealthKeyPair";
import { RandomNumber } from "./RandomNumber";
import {
  StealthPayment,
  ScannedPayment,
  StealthKeyPairData,
} from "./types";

const SIGNING_MESSAGE =
  "Sign this message to access your ZeroRequiem stealth account.\n\nOnly sign this message for a trusted client!";

function toHex(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function stripHex(h: string): string {
  return h.startsWith("0x") ? h.slice(2) : h;
}

// ABI fragments for contracts we interact with
const REGISTRY_ABI = [
  "function stealthKeys(address) view returns (uint256,uint256,uint256,uint256)",
  "function setStealthKeys(uint256,uint256,uint256,uint256)",
];

const VAULT_ABI = [
  "function sendToStealth(address,bytes32,bytes32) payable",
  "event Announcement(address indexed receiver, uint256 amount, address indexed token, bytes32 pkx, bytes32 ciphertext)",
];

const FACTORY_ABI = [
  "function getAddress(address owner, uint256 salt) view returns (address)",
  "function createAccount(address owner, uint256 salt) returns (address)",
];

export class StealthCore {
  /**
   * Derive spending and viewing private keys from a wallet signature.
   * The user signs a fixed message; the 65-byte signature is split in half
   * and each half is hashed to produce a deterministic key pair.
   */
  static async generatePrivateKeys(
    signer: Signer,
    chainId?: number
  ): Promise<{
    spendingKeyPair: StealthKeyPair;
    viewingKeyPair: StealthKeyPair;
  }> {
    let message = SIGNING_MESSAGE;
    if (chainId && chainId !== 1) {
      message += `\n\nChain ID: ${chainId}`;
    }

    const signature = await signer.signMessage(message);
    const sigBytes = getBytes(signature);

    const portion1 = sigBytes.slice(0, 32);
    const portion2 = sigBytes.slice(32, 64);

    const spendingPrivKey = sha256(portion1);
    const viewingPrivKey = sha256(portion2);

    return {
      spendingKeyPair: new StealthKeyPair(toHex(spendingPrivKey)),
      viewingKeyPair: new StealthKeyPair(toHex(viewingPrivKey)),
    };
  }

  /**
   * Look up a recipient's stealth public keys from the registry contract.
   */
  static async lookupRecipient(
    recipientAddress: string,
    registryAddress: string,
    provider: JsonRpcProvider
  ): Promise<StealthKeyPairData> {
    const registry = new Contract(registryAddress, REGISTRY_ABI, provider);
    const [spPrefix, spKey, vwPrefix, vwKey] = await registry.stealthKeys(
      recipientAddress
    );

    return {
      spendingPubKeyPrefix: Number(spPrefix),
      spendingPubKey: `0x${BigInt(spKey).toString(16).padStart(64, "0")}`,
      viewingPubKeyPrefix: Number(vwPrefix),
      viewingPubKey: `0x${BigInt(vwKey).toString(16).padStart(64, "0")}`,
    };
  }

  /**
   * Prepare a stealth send: generate random number, compute stealth address,
   * encrypt the random number with the recipient's viewing key.
   */
  static prepareSend(recipientKeys: StealthKeyPairData): {
    stealthAddress: string;
    stealthPubKey: string;
    ephemeralPubKeyX: string;
    ciphertext: string;
    randomNumber: RandomNumber;
  } {
    // Reconstruct the recipient's full public keys from compressed form
    const spendingPubHex = StealthKeyPair.getUncompressedFromX(
      recipientKeys.spendingPubKey,
      recipientKeys.spendingPubKeyPrefix
    );
    const viewingPubHex = StealthKeyPair.getUncompressedFromX(
      recipientKeys.viewingPubKey,
      recipientKeys.viewingPubKeyPrefix
    );

    const spendingKeyPair = new StealthKeyPair(spendingPubHex);
    const viewingKeyPair = new StealthKeyPair(viewingPubHex);

    // Generate random scalar
    const randomNumber = new RandomNumber();

    // Encrypt the random number with viewing public key
    const encrypted = viewingKeyPair.encrypt(randomNumber);

    // Compute stealth address = address(spendingPub * r)
    const stealthKeyPair = spendingKeyPair.mulPublicKey(randomNumber);

    // Compress ephemeral public key for on-chain storage
    const { pubKeyXCoordinate } = StealthKeyPair.compressPublicKey(
      encrypted.ephemeralPublicKey
    );

    return {
      stealthAddress: stealthKeyPair.address,
      stealthPubKey: stealthKeyPair.publicKeyHex,
      ephemeralPubKeyX: pubKeyXCoordinate,
      ciphertext: encrypted.ciphertext,
      randomNumber,
    };
  }

  /**
   * Get the counterfactual SimpleAccount address for a stealth EOA.
   */
  static async getStealthAccountAddress(
    factoryAddress: string,
    stealthEOA: string,
    salt: bigint,
    provider: JsonRpcProvider
  ): Promise<string> {
    const factory = new Contract(factoryAddress, FACTORY_ABI, provider);
    const fn = factory.getFunction("getAddress");
    return await fn(stealthEOA, salt);
  }

  /**
   * Scan on-chain Announcement events and find those addressed to the user.
   */
  static async scan(
    vaultAddress: string,
    spendingPrivateKey: string,
    viewingPrivateKey: string,
    provider: JsonRpcProvider,
    fromBlock: number = 0
  ): Promise<ScannedPayment[]> {
    const vault = new Contract(vaultAddress, VAULT_ABI, provider);

    const filter = vault.filters.Announcement();
    const events = await vault.queryFilter(filter, fromBlock, "latest");

    const viewingKeyPair = new StealthKeyPair(viewingPrivateKey);
    const spendingKeyPair = new StealthKeyPair(spendingPrivateKey);
    const results: ScannedPayment[] = [];

    for (const event of events) {
      const log = event as ethers.EventLog;
      if (!log.args) continue;

      const [receiver, amount, token, pkx, ciphertext] = log.args;
      let matched = false;

      for (const prefix of [2, 3]) {
        if (matched) break;
        try {
          const ephPubHex = StealthKeyPair.getUncompressedFromX(
            pkx as string,
            prefix
          );

          const rn = viewingKeyPair.decrypt({
            ephemeralPublicKey: ephPubHex,
            ciphertext: ciphertext as string,
          });

          const computedKeyPair = spendingKeyPair.mulPublicKey(rn);

          if (
            computedKeyPair.address.toLowerCase() ===
            (receiver as string).toLowerCase()
          ) {
            results.push({
              receiver: receiver as string,
              amount: BigInt(amount),
              token: token as string,
              pkx: pkx as string,
              ciphertext: ciphertext as string,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
              randomNumber: rn.hex,
              stealthPrivateKey: StealthCore.computeStealthPrivateKey(
                spendingKeyPair.privateKeyHex!,
                rn
              ),
            });
            matched = true;
          }
        } catch {
          continue;
        }
      }
    }

    return results;
  }

  /**
   * Compute the stealth private key: (spendingPrivKey * randomNumber) mod n
   */
  static computeStealthPrivateKey(
    spendingPrivateKey: string,
    randomNumber: RandomNumber
  ): string {
    const spendingKeyPair = new StealthKeyPair(spendingPrivateKey);
    const stealthKeyPair = spendingKeyPair.mulPrivateKey(randomNumber);
    return stealthKeyPair.privateKeyHex!;
  }
}
