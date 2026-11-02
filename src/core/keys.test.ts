import { payments } from 'bitcoinjs-lib';
import { describe, expect, it } from 'vitest';
import { toHex } from './bytes';
import {
  generateMnemonic,
  isValidMnemonic,
  keyFromMnemonic,
  keyFromWif,
  publicKeyFromMnemonic,
} from './keys';
import { defaultDerivationPath, getNetwork } from './networks';
import {
  TEST_CHILD_MNEMONIC,
  TEST_CHILD_PUBKEY_HEX,
  TEST_PARENT_MNEMONIC,
  TEST_PARENT_PUBKEY_HEX,
} from './test-fixtures';

describe('keys', () => {
  it('documents the derivation paths', () => {
    expect(defaultDerivationPath('testnet')).toBe("m/84'/1'/0'/0/0");
    expect(defaultDerivationPath('signet')).toBe("m/84'/1'/0'/0/0");
    expect(defaultDerivationPath('mainnet')).toBe("m/84'/0'/0'/0/0");
  });

  it('matches the BIP84 published test vector', () => {
    // BIP84: m/84'/0'/0'/0/0 of the "abandon ... about" mnemonic.
    const pub = publicKeyFromMnemonic(TEST_PARENT_MNEMONIC, 'mainnet');
    expect(toHex(pub)).toBe('0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c');
    expect(payments.p2wpkh({ pubkey: pub }).address).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
  });

  it("derives the test-network keys at m/84'/1'/0'/0/0", () => {
    const parent = publicKeyFromMnemonic(TEST_PARENT_MNEMONIC, 'testnet');
    expect(toHex(parent)).toBe(TEST_PARENT_PUBKEY_HEX);
    expect(payments.p2wpkh({ pubkey: parent, network: getNetwork('testnet') }).address).toBe(
      'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl',
    );
    expect(toHex(publicKeyFromMnemonic(TEST_CHILD_MNEMONIC, 'signet'))).toBe(TEST_CHILD_PUBKEY_HEX);
  });

  it('generates valid 12-word mnemonics', () => {
    const a = generateMnemonic();
    const b = generateMnemonic();
    expect(a.split(' ')).toHaveLength(12);
    expect(isValidMnemonic(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('normalizes spacing and case, and rejects bad phrases', () => {
    const messy = `  ${TEST_PARENT_MNEMONIC.toUpperCase().replaceAll(' ', '   ')} `;
    expect(toHex(publicKeyFromMnemonic(messy, 'testnet'))).toBe(TEST_PARENT_PUBKEY_HEX);
    const badChecksum = TEST_PARENT_MNEMONIC.replace(/about$/, 'abandon');
    expect(isValidMnemonic(badChecksum)).toBe(false);
    expect(() => keyFromMnemonic(badChecksum, 'testnet')).toThrow(/not valid/);
    expect(() => keyFromMnemonic(TEST_PARENT_MNEMONIC, 'testnet', 'm/84/x')).toThrow(/derivation path/);
  });

  it('imports WIF keys for the right network only', () => {
    const key = keyFromMnemonic(TEST_PARENT_MNEMONIC, 'testnet');
    const wif = key.toWIF();
    expect(toHex(keyFromWif(wif, 'signet').publicKey)).toBe(TEST_PARENT_PUBKEY_HEX);
    expect(() => keyFromWif(wif, 'mainnet')).toThrow(/WIF/);
  });
});
