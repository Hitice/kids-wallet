import * as ecc from '@bitcoinerlab/secp256k1';
import { BIP32Factory } from 'bip32';
import { initEccLib } from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';

/** secp256k1 backend (pure JavaScript, built on @noble/curves). */
export { ecc };

// bitcoinjs-lib needs the x-only point functions for Taproot (payments.p2tr).
initEccLib(ecc);
export const ECPair = ECPairFactory(ecc);
export const bip32 = BIP32Factory(ecc);
