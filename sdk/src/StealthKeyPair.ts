import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { computeAddress, hexlify } from "ethers";
import { RandomNumber } from "./RandomNumber";
import { EncryptedPayload } from "./types";

const EC_N = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
);

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

function hexToBytes(hex: string): Uint8Array {
  const h = stripHex(hex);
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i] ^ b[i];
  }
  return out;
}

export class StealthKeyPair {
  readonly privateKeyHex?: string;
  readonly publicKeyHex: string;

  constructor(key: string) {
    const cleaned = stripHex(key);

    if (cleaned.length === 64) {
      // Private key
      this.privateKeyHex = `0x${cleaned}`;
      const pubBytes = secp.getPublicKey(hexToBytes(cleaned), false);
      this.publicKeyHex = toHex(pubBytes);
    } else if (cleaned.length === 128 || cleaned.length === 130) {
      // Uncompressed public key (with or without 04 prefix)
      const raw = cleaned.length === 130 ? cleaned : `04${cleaned}`;
      this.publicKeyHex = `0x${raw}`;
    } else {
      throw new Error(`Invalid key length: ${cleaned.length}`);
    }
  }

  get address(): string {
    return computeAddress(this.publicKeyHex);
  }

  get publicKeyBytes(): Uint8Array {
    return hexToBytes(this.publicKeyHex);
  }

  /**
   * Compute ECDH shared secret between a private key and a public key,
   * then hash it with SHA-256 to produce a 32-byte secret.
   */
  private static getSharedSecret(
    privKey: Uint8Array,
    pubKey: Uint8Array
  ): Uint8Array {
    const rawShared = secp.getSharedSecret(privKey, pubKey, true);
    return sha256(rawShared);
  }

  /**
   * Encrypt a RandomNumber using this key pair's public key.
   * Generates an ephemeral key pair, computes ECDH shared secret,
   * and XORs the random number with the shared secret.
   */
  encrypt(rn: RandomNumber): EncryptedPayload {
    const ephemeral = new StealthKeyPair(
      toHex(secp.utils.randomPrivateKey())
    );
    if (!ephemeral.privateKeyHex) throw new Error("No ephemeral private key");

    const sharedSecret = StealthKeyPair.getSharedSecret(
      hexToBytes(ephemeral.privateKeyHex),
      this.publicKeyBytes
    );

    const cipher = xorBytes(rn.toByteArray(), sharedSecret);

    return {
      ephemeralPublicKey: ephemeral.publicKeyHex,
      ciphertext: toHex(cipher),
    };
  }

  /**
   * Decrypt a ciphertext to recover a RandomNumber using this pair's private key.
   */
  decrypt(payload: EncryptedPayload): RandomNumber {
    if (!this.privateKeyHex) throw new Error("Cannot decrypt without private key");

    const ephPub = hexToBytes(payload.ephemeralPublicKey);
    const sharedSecret = StealthKeyPair.getSharedSecret(
      hexToBytes(this.privateKeyHex),
      ephPub
    );

    const cipherBytes = hexToBytes(payload.ciphertext);
    const plaintext = xorBytes(cipherBytes, sharedSecret);

    return new RandomNumber(toHex(plaintext));
  }

  /**
   * Return a new KeyPair whose public key = this.publicKey * scalar (EC point multiplication).
   * Used for stealth address derivation: stealthPub = spendingPub * r
   */
  mulPublicKey(scalar: RandomNumber): StealthKeyPair {
    const pubPoint = secp.Point.fromHex(stripHex(this.publicKeyHex));
    const result = pubPoint.multiply(scalar.value);
    const uncompressed = result.toRawBytes(false);
    return new StealthKeyPair(toHex(uncompressed));
  }

  /**
   * Return a new KeyPair whose private key = (this.privateKey * scalar) mod n.
   * Used for stealth private key derivation: stealthPriv = spendingPriv * r mod n
   */
  mulPrivateKey(scalar: RandomNumber): StealthKeyPair {
    if (!this.privateKeyHex) throw new Error("No private key to multiply");
    const priv = BigInt(this.privateKeyHex);
    const product = (priv * scalar.value) % EC_N;
    const hex = product.toString(16).padStart(64, "0");
    return new StealthKeyPair(hex);
  }

  /**
   * Compress a public key to its prefix (02 or 03) and x-coordinate.
   */
  static compressPublicKey(publicKeyHex: string): {
    prefix: number;
    pubKeyXCoordinate: string;
  } {
    const pubBytes = hexToBytes(publicKeyHex);
    const compressed = secp.Point.fromHex(pubBytes).toRawBytes(true);
    const prefix = compressed[0];
    const xCoord = toHex(compressed.slice(1));
    return { prefix, pubKeyXCoordinate: xCoord };
  }

  /**
   * Reconstruct an uncompressed public key from its x-coordinate.
   * Tries prefix 02 first, falls back to 03.
   */
  static getUncompressedFromX(
    pkx: string,
    prefix?: number
  ): string {
    const xHex = stripHex(pkx);
    const prefixes = prefix ? [prefix] : [2, 3];

    for (const p of prefixes) {
      try {
        const compressedHex = `0${p}${xHex}`;
        const point = secp.Point.fromHex(compressedHex);
        return toHex(point.toRawBytes(false));
      } catch {
        continue;
      }
    }
    throw new Error("Could not recover public key from x-coordinate");
  }
}
