/**
 * TEST-ONLY fixtures. These are the public BIP39 test mnemonics used across
 * the Bitcoin ecosystem. Everyone knows them: never send real coins to keys
 * derived from them. They are used here only on testnet, signet and regtest.
 */
import { Transaction } from 'bitcoinjs-lib';
import { keyFromMnemonic, publicKeyFromMnemonic } from './keys';
import { createVault, type Vault } from './vault';
import type { VaultUtxo } from './psbt';

export const TEST_PARENT_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
export const TEST_CHILD_MNEMONIC = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';
export const TEST_OTHER_MNEMONIC =
  'legal winner thank year wave sausage worth useful legal winner thank yellow';

/** 2020-06-15 birth date, so the 18th birthday is 2038-06-15T00:00:00Z. */
export const TEST_BIRTH_DATE = '2020-06-15';
export const TEST_UNLOCK_TIME = 2160172800;

/** Keys at m/84'/1'/0'/0/0 of the test mnemonics. */
export const TEST_PARENT_PUBKEY_HEX = '02e7ab2537b5d49e970309aae06e9e49f36ce1c9febbd44ec8e0d1cca0b4f9c319';
export const TEST_CHILD_PUBKEY_HEX = '02028e9de3ffe2238b2cbf8a60f1c99c076d6e89749018915f2f5af8c8da791c80';

export function testKeys(network: 'testnet' | 'regtest' = 'testnet') {
  return {
    parent: keyFromMnemonic(TEST_PARENT_MNEMONIC, network),
    child: keyFromMnemonic(TEST_CHILD_MNEMONIC, network),
    other: keyFromMnemonic(TEST_OTHER_MNEMONIC, network),
  };
}

export function testVault(unlockTime = TEST_UNLOCK_TIME, network: 'testnet' | 'regtest' = 'testnet'): Vault {
  return createVault(
    {
      parentPubKey: publicKeyFromMnemonic(TEST_PARENT_MNEMONIC, network),
      childPubKey: publicKeyFromMnemonic(TEST_CHILD_MNEMONIC, network),
      unlockTime,
    },
    network,
  );
}

/**
 * Builds a fake funding transaction that pays `values` to the vault and
 * returns the matching UTXOs (with the full transaction hex).
 */
export function fundVault(vault: Vault, values: bigint[], seed = 1): VaultUtxo[] {
  const tx = new Transaction();
  tx.version = 2;
  tx.addInput(new Uint8Array(32).fill(seed), 0);
  for (const v of values) tx.addOutput(vault.scriptPubKey, v);
  const txHex = tx.toHex();
  const txid = tx.getId();
  return values.map((value, vout) => ({ txid, vout, value, txHex }));
}
