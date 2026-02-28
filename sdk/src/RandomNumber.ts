import { randomBytes } from "@noble/hashes/utils";

const EC_GROUP_ORDER = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
);

function bytesToHex(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export class RandomNumber {
  readonly value: bigint;
  readonly hex: string;

  constructor(randomNumberHex?: string) {
    if (randomNumberHex) {
      this.hex = randomNumberHex.startsWith("0x")
        ? randomNumberHex
        : `0x${randomNumberHex}`;
      this.value = BigInt(this.hex);
    } else {
      let candidate: bigint;
      do {
        const buf = randomBytes(32);
        candidate = BigInt(bytesToHex(buf));
      } while (candidate >= EC_GROUP_ORDER || candidate === 0n);
      this.value = candidate;
      this.hex = `0x${this.value.toString(16).padStart(64, "0")}`;
    }
  }

  toByteArray(): Uint8Array {
    const hex = this.value.toString(16).padStart(64, "0");
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
}
