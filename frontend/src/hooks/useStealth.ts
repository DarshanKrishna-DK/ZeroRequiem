import { useState, useCallback, useEffect } from "react";
import { JsonRpcSigner } from "ethers";
import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { saveStealthKeys, loadStealthKeys } from "../lib/storage";

const SIGNING_MESSAGE =
  "Sign this message to access your ZeroRequiem stealth account.\n\nOnly sign this message for a trusted client!\n\nChain ID: 97";

function toHex(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export interface StealthKeys {
  spendingPrivateKey: string;
  spendingPublicKey: string;
  viewingPrivateKey: string;
  viewingPublicKey: string;
  spendingPubKeyPrefix: number;
  spendingPubKeyX: string;
  viewingPubKeyPrefix: number;
  viewingPubKeyX: string;
}

export function useStealth() {
  const [keys, setKeys] = useState<StealthKeys | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const restoreKeys = useCallback((address: string) => {
    const saved = loadStealthKeys(address);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StealthKeys;
        setKeys(parsed);
        return parsed;
      } catch {}
    }
    return null;
  }, []);

  const generateKeys = useCallback(
    async (signer: JsonRpcSigner) => {
      setIsGenerating(true);
      try {
        const signature = await signer.signMessage(SIGNING_MESSAGE);
        const sigBytes = hexToBytes(signature);

        const portion1 = sigBytes.slice(0, 32);
        const portion2 = sigBytes.slice(32, 64);

        const spendingPrivKey = sha256(portion1);
        const viewingPrivKey = sha256(portion2);

        const spendingPub = secp.getPublicKey(spendingPrivKey, false);
        const viewingPub = secp.getPublicKey(viewingPrivKey, false);

        const spendingCompressed = secp.getPublicKey(spendingPrivKey, true);
        const viewingCompressed = secp.getPublicKey(viewingPrivKey, true);

        const stealthKeys: StealthKeys = {
          spendingPrivateKey: toHex(spendingPrivKey),
          spendingPublicKey: toHex(spendingPub),
          viewingPrivateKey: toHex(viewingPrivKey),
          viewingPublicKey: toHex(viewingPub),
          spendingPubKeyPrefix: spendingCompressed[0],
          spendingPubKeyX: toHex(spendingCompressed.slice(1)),
          viewingPubKeyPrefix: viewingCompressed[0],
          viewingPubKeyX: toHex(viewingCompressed.slice(1)),
        };

        setKeys(stealthKeys);

        const address = await signer.getAddress();
        saveStealthKeys(address, JSON.stringify(stealthKeys));

        return stealthKeys;
      } catch (err) {
        console.error("Key generation error:", err);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { keys, isGenerating, generateKeys, restoreKeys, setKeys };
}
