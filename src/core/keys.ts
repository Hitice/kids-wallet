import * as bip39 from 'bip39';
import type { ECPairInterface } from 'ecpair';
import { bip32, ECPair } from './ecc';
import { VaultError } from './errors';
import { defaultDerivationPath, getNetwork, type NetworkName } from './networks';

const PATH_RE = /^m(\/\d+'?)+$/;

/** 12-word BIP39 mnemonic (128 bits of entropy from crypto.getRandomValues). */
export function generateMnemonic(): string {
  return bip39.generateMnemonic(128);
}

export function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().split(/\s+/).join(' ');
}

export function isValidMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(normalizeMnemonic(mnemonic));
}

export function assertDerivationPath(path: string): void {
  if (!PATH_RE.test(path.trim())) {
    throw new VaultError("The derivation path must look like m/84'/1'/0'/0/0.");
  }
}

/**
 * Derives the signing key at a BIP32 path from a BIP39 mnemonic (no BIP39
 * passphrase). The default path is m/84'/1'/0'/0/0 on test networks.
 */
export function keyFromMnemonic(
  mnemonic: string,
  network: NetworkName,
  path: string = defaultDerivationPath(network),
): ECPairInterface {
  const words = normalizeMnemonic(mnemonic);
  if (!bip39.validateMnemonic(words)) {
    throw new VaultError('The recovery phrase is not valid. Check every word and the word order.');
  }
  assertDerivationPath(path);
  const net = getNetwork(network);
  const seed = Uint8Array.from(bip39.mnemonicToSeedSync(words));
  const node = bip32.fromSeed(seed, net).derivePath(path.trim());
  seed.fill(0);
  if (!node.privateKey) throw new VaultError('Could not derive a private key.');
  return ECPair.fromPrivateKey(node.privateKey, { network: net });
}

export function publicKeyFromMnemonic(
  mnemonic: string,
  network: NetworkName,
  path: string = defaultDerivationPath(network),
): Uint8Array {
  return keyFromMnemonic(mnemonic, network, path).publicKey;
}

/** Imports a private key in WIF form (compressed keys only). */
export function keyFromWif(wif: string, network: NetworkName): ECPairInterface {
  let key: ECPairInterface;
  try {
    key = ECPair.fromWIF(wif.trim(), getNetwork(network));
  } catch {
    throw new VaultError(`The private key is not a valid ${network} WIF key.`);
  }
  if (!key.compressed) throw new VaultError('Only compressed private keys are supported.');
  return key;
}
