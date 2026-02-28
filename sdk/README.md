# zerorequiem-sdk

Privacy-preserving stealth address SDK for BNB Smart Chain with ERC-4337 gas abstraction.

## Installation

```bash
npm install zerorequiem-sdk
```

## Quick Start

```typescript
import { ZeroRequiem } from "zerorequiem-sdk";

const zr = new ZeroRequiem({
  rpcUrl: "https://bsc-testnet-dataseed.bnbchain.org",
  chainId: 97,
  vaultAddress: "0x...",
  registryAddress: "0x...",
  factoryAddress: "0x...",
  entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  paymasterAddress: "0x...",
  relayerUrl: "http://localhost:3001",
});

// 1. Generate stealth keys (from wallet signature)
const keys = await zr.generateKeys(signer);

// 2. Register keys on-chain
await zr.registerKeys(signer, keys.registrationData);

// 3. Send BNB privately
const { txHash, stealthAccountAddr } = await zr.send(signer, recipientAddress, "0.01");

// 4. Scan for incoming payments
const payments = await zr.scan(spendingPrivateKey, viewingPrivateKey);

// 5. Withdraw (gasless via Paymaster)
const withdrawTx = await zr.withdraw(stealthPrivateKey, myWalletAddress, "0.01");
```

## How It Works

ZeroRequiem uses ECDH-based stealth addresses to break the on-chain link between sender and recipient:

1. **Registration** -- Users publish their stealth public keys (spending + viewing) to an on-chain registry.
2. **Sending** -- The sender generates a one-time stealth address from the recipient's public keys, deposits BNB into a shared Privacy Vault, and emits an encrypted announcement.
3. **Scanning** -- The recipient decrypts announcements using their viewing key to find payments addressed to them.
4. **Withdrawal** -- The recipient constructs an ERC-4337 UserOperation. A Verifying Paymaster sponsors gas, so the stealth wallet never needs external funding.

## API Reference

### `ZeroRequiem` (High-Level Facade)

| Method | Description |
|--------|-------------|
| `generateKeys(signer)` | Derive deterministic stealth keys from a wallet signature |
| `registerKeys(signer, keys)` | Publish stealth public keys to the on-chain registry |
| `send(signer, recipient, amountBnb)` | Send BNB to a stealth address via the Privacy Vault |
| `scan(spendingPrivKey, viewingPrivKey, fromBlock?)` | Scan for incoming stealth payments |
| `withdraw(stealthPrivKey, recipient, amountBnb)` | Gasless withdrawal via ERC-4337 Paymaster |
| `getVaultBalance(stealthPrivKey)` | Check vault balance for a stealth account |
| `getPaymasterDeposit()` | Check remaining gas budget on the Paymaster |
| `isRegistered(address)` | Check if an address has registered stealth keys |

### Low-Level Classes

For advanced use cases, the SDK also exports the building blocks:

| Class | Purpose |
|-------|---------|
| `StealthCore` | Key generation, recipient lookup, send preparation, scanning |
| `StealthKeyPair` | secp256k1 ECDH key pair with encrypt/decrypt |
| `RandomNumber` | Cryptographically secure random scalar generation |
| `UserOpBuilder` | ERC-4337 UserOperation construction and signing |

### Constants

The SDK exports contract ABIs and network constants:

```typescript
import {
  VAULT_ABI,
  REGISTRY_ABI,
  FACTORY_ABI,
  ENTRY_POINT_ABI,
  ENTRY_POINT_V06,
  BSC_TESTNET,
} from "zerorequiem-sdk";
```

## Integration Example

### React / Next.js

```typescript
import { ZeroRequiem } from "zerorequiem-sdk";
import { BrowserProvider } from "ethers";

const zr = new ZeroRequiem({ /* config */ });

async function sendPrivately(recipientAddress: string, amount: string) {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const { txHash } = await zr.send(signer, recipientAddress, amount);
  console.log("Sent:", txHash);
}
```

### Node.js Backend

```typescript
import { ZeroRequiem, StealthCore } from "zerorequiem-sdk";
import { Wallet } from "ethers";

const zr = new ZeroRequiem({ /* config */ });

// Scan for payments on behalf of a user (using their viewing key)
const payments = await zr.scan(spendingPrivKey, viewingPrivKey, fromBlock);
```

## License

MIT
