import { Buffer } from 'buffer';

// bip39 calls the Node.js global `Buffer` when it turns a recovery phrase into
// a seed. Browsers do not have it, so the `buffer` package provides it.
// bitcoinjs-lib v7, bip32 v5 and ecpair v3 use Uint8Array and need nothing.
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer as unknown as typeof globalThis.Buffer;
}
