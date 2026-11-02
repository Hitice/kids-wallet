import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { fromHex, toHex } from './bytes';
import { buildVaultScript, decodeScriptNumber, decodeVaultScript, encodeScriptNumber } from './script';
import {
  TEST_CHILD_PUBKEY_HEX,
  TEST_PARENT_PUBKEY_HEX,
  TEST_UNLOCK_TIME,
  testVault,
} from './test-fixtures';
import { createVault, vaultFromWitnessScript } from './vault';

const parentPubKey = fromHex(TEST_PARENT_PUBKEY_HEX);
const childPubKey = fromHex(TEST_CHILD_PUBKEY_HEX);

describe('script numbers', () => {
  it.each([
    [500_000_000, '0065cd1d'],
    [1_900_000_000, '00b33f71'],
    [0x7fffffff, 'ffffff7f'],
    [0x80000000, '0000008000'],
    [TEST_UNLOCK_TIME, '009fc18000'],
    [0xffffffff, 'ffffffff00'],
  ])('encodes %i minimally', (n, hex) => {
    expect(toHex(encodeScriptNumber(n))).toBe(hex);
    expect(decodeScriptNumber(fromHex(hex))).toBe(n);
  });

  it('rejects non-minimal and negative encodings', () => {
    expect(() => decodeScriptNumber(fromHex('0065cd1d00'))).toThrow(/minimally/);
    expect(() => decodeScriptNumber(fromHex('0065cd9d'))).toThrow(/Negative/);
  });
});

describe('buildVaultScript', () => {
  it('matches the expected opcodes byte for byte (5-byte lock time)', () => {
    const expected =
      '63' + // OP_IF
      '21' + TEST_PARENT_PUBKEY_HEX + // push 33 bytes: parent key
      'ac' + // OP_CHECKSIG
      '67' + // OP_ELSE
      '05' + '009fc18000' + // push 5 bytes: 2160172800 (2038-06-15T00:00:00Z)
      'b1' + // OP_CHECKLOCKTIMEVERIFY
      '75' + // OP_DROP
      '21' + TEST_CHILD_PUBKEY_HEX + // push 33 bytes: child key
      'ac' + // OP_CHECKSIG
      '68'; // OP_ENDIF
    const script = buildVaultScript({ parentPubKey, childPubKey, unlockTime: TEST_UNLOCK_TIME });
    expect(toHex(script)).toBe(expected);
    expect(script.length).toBe(81);
  });

  it('matches the expected opcodes byte for byte (4-byte lock time)', () => {
    const script = buildVaultScript({ parentPubKey, childPubKey, unlockTime: 1_900_000_000 });
    expect(toHex(script)).toBe(
      `6321${TEST_PARENT_PUBKEY_HEX}ac670400b33f71b17521${TEST_CHILD_PUBKEY_HEX}ac68`,
    );
  });

  it('rejects equal keys, invalid keys and block-height lock times', () => {
    expect(() => buildVaultScript({ parentPubKey, childPubKey: parentPubKey, unlockTime: TEST_UNLOCK_TIME })).toThrow(
      /must be different/,
    );
    const offCurve = fromHex(`02${'ff'.repeat(32)}`);
    expect(() => buildVaultScript({ parentPubKey: offCurve, childPubKey, unlockTime: TEST_UNLOCK_TIME })).toThrow(
      /not a valid point/,
    );
    const uncompressed = new Uint8Array(65).fill(4);
    expect(() => buildVaultScript({ parentPubKey: uncompressed, childPubKey, unlockTime: TEST_UNLOCK_TIME })).toThrow(
      /compressed/,
    );
    expect(() => buildVaultScript({ parentPubKey, childPubKey, unlockTime: 499_999_999 })).toThrow(/at least 500000000/);
  });
});

describe('decodeVaultScript', () => {
  it('round trips decode(encode(x))', () => {
    for (const unlockTime of [500_000_000, 1_900_000_000, TEST_UNLOCK_TIME, 0xffffffff]) {
      const params = { parentPubKey, childPubKey, unlockTime };
      const decoded = decodeVaultScript(buildVaultScript(params));
      expect(toHex(decoded.parentPubKey)).toBe(TEST_PARENT_PUBKEY_HEX);
      expect(toHex(decoded.childPubKey)).toBe(TEST_CHILD_PUBKEY_HEX);
      expect(decoded.unlockTime).toBe(unlockTime);
    }
  });

  it('rejects scripts that differ from the template', () => {
    const good = toHex(buildVaultScript({ parentPubKey, childPubKey, unlockTime: TEST_UNLOCK_TIME }));
    const variants = [
      good.replace('b175', 'b161'), // OP_DROP replaced with OP_NOP
      `${good}51`, // extra OP_1
      good.replace(/^63/, '64'), // OP_NOTIF
      good.replace('05009fc18000', '06009fc1800000'), // non-minimal lock time
      good.replace('05009fc18000', '0400e1f505'), // 100000000: a block height range value
    ];
    for (const hex of variants) {
      expect(() => decodeVaultScript(fromHex(hex))).toThrow();
    }
  });
});

describe('address derivation', () => {
  it('derives the fixed testnet test vector deterministically', () => {
    const vault = testVault();
    expect(toHex(vault.witnessScript)).toBe(
      `6321${TEST_PARENT_PUBKEY_HEX}ac6705009fc18000b17521${TEST_CHILD_PUBKEY_HEX}ac68`,
    );
    const hash = createHash('sha256').update(vault.witnessScript).digest('hex');
    expect(toHex(vault.scriptPubKey)).toBe(`0020${hash}`);
    expect(toHex(vault.scriptPubKey)).toBe('00202d195e45a0021105ade0f2c465fa228cab70eccab25cb5a3fac17eb1931ef588');
    expect(vault.address).toBe('tb1q95v4u3dqqggstt0q7tzxt73z3j4hpmx2kfwttgl6c9ltryc77kyq9yecpt');
    expect(testVault().address).toBe(vault.address);
  });

  it('uses the same script on every network with the right address prefix', () => {
    const params = { parentPubKey, childPubKey, unlockTime: TEST_UNLOCK_TIME };
    expect(createVault(params, 'signet').address).toBe('tb1q95v4u3dqqggstt0q7tzxt73z3j4hpmx2kfwttgl6c9ltryc77kyq9yecpt');
    expect(createVault(params, 'regtest').address).toBe(
      'bcrt1q95v4u3dqqggstt0q7tzxt73z3j4hpmx2kfwttgl6c9ltryc77kyqgan753',
    );
    expect(createVault(params, 'mainnet').address).toBe('bc1q95v4u3dqqggstt0q7tzxt73z3j4hpmx2kfwttgl6c9ltryc77kyqjv0hmy');
  });

  it('rebuilds the same vault from its witness script', () => {
    const vault = testVault();
    const again = vaultFromWitnessScript(vault.witnessScript, 'testnet');
    expect(again.address).toBe(vault.address);
    expect(again.unlockTime).toBe(TEST_UNLOCK_TIME);
  });
});
