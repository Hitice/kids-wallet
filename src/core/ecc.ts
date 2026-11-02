import * as ecc from '@bitcoinerlab/secp256k1';
import { BIP32Factory } from 'bip32';
import { ECPairFactory } from 'ecpair';

/** secp256k1 backend (pure JavaScript, built on @noble/curves). */
export { ecc };
export const ECPair = ECPairFactory(ecc);
export const bip32 = BIP32Factory(ecc);
