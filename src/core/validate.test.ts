import { describe, expect, it } from 'vitest';
import {
  assertFeeRate,
  assertUnlockTime,
  destinationScript,
  formatBtc,
  parseBtcAmount,
  parseBirthDate,
  parsePublicKey,
  unlockTimeFromBirthDate,
  validateBirthDateForNewVault,
} from './validate';
import { TEST_BIRTH_DATE, TEST_PARENT_PUBKEY_HEX, TEST_UNLOCK_TIME } from './test-fixtures';

const NOW = Date.UTC(2026, 10, 2, 12, 0, 0) / 1000; // 2026-11-02T12:00:00Z

describe('unlock time', () => {
  it('rejects values below 500000000 (block heights)', () => {
    expect(() => assertUnlockTime(499_999_999)).toThrow(/at least 500000000/);
    expect(() => assertUnlockTime(0)).toThrow();
    expect(() => assertUnlockTime(500_000_000)).not.toThrow();
  });

  it('rejects values that do not fit nLockTime and non-integers', () => {
    expect(() => assertUnlockTime(0x1_0000_0000)).toThrow(/too far/);
    expect(() => assertUnlockTime(1_900_000_000.5)).toThrow(/whole number/);
    expect(() => assertUnlockTime(Number.NaN)).toThrow();
  });

  it('rejects past dates for new vaults', () => {
    expect(() => assertUnlockTime(NOW - 1, { requireFuture: true, now: NOW })).toThrow(/future/);
    expect(() => assertUnlockTime(NOW, { requireFuture: true, now: NOW })).toThrow(/future/);
    expect(() => assertUnlockTime(NOW + 1, { requireFuture: true, now: NOW })).not.toThrow();
    // Existing vaults (for example an imported file) may already be unlocked.
    expect(() => assertUnlockTime(NOW - 1, { now: NOW })).not.toThrow();
  });
});

describe('birth date', () => {
  it('computes the 18th birthday at 00:00 UTC', () => {
    expect(unlockTimeFromBirthDate(TEST_BIRTH_DATE)).toBe(TEST_UNLOCK_TIME);
    expect(new Date(unlockTimeFromBirthDate('2015-03-10') * 1000).toISOString()).toBe('2033-03-10T00:00:00.000Z');
  });

  it('moves 29 February to 1 March when the 18th year is not a leap year', () => {
    expect(new Date(unlockTimeFromBirthDate('2016-02-29') * 1000).toISOString()).toBe('2034-03-01T00:00:00.000Z');
  });

  it('rejects malformed and impossible dates', () => {
    expect(() => parseBirthDate('15/06/2020')).toThrow(/YYYY-MM-DD/);
    expect(() => parseBirthDate('2019-02-29')).toThrow(/real calendar date/);
    expect(() => parseBirthDate('2020-13-01')).toThrow(/real calendar date/);
  });

  it('accepts a child who is born and younger than 18', () => {
    expect(validateBirthDateForNewVault(TEST_BIRTH_DATE, NOW)).toBe(TEST_UNLOCK_TIME);
    expect(validateBirthDateForNewVault('2026-11-02', NOW)).toBe(Date.UTC(2044, 10, 2) / 1000);
  });

  it('rejects a birth date in the future', () => {
    expect(() => validateBirthDateForNewVault('2026-11-04', NOW)).toThrow(/future/);
    expect(() => validateBirthDateForNewVault('2030-01-01', NOW)).toThrow(/future/);
  });

  it('rejects a child who is already 18', () => {
    expect(() => validateBirthDateForNewVault('2008-11-02', NOW)).toThrow(/already 18/);
    expect(() => validateBirthDateForNewVault('1990-01-01', NOW)).toThrow(/already 18/);
    expect(validateBirthDateForNewVault('2008-11-03', NOW)).toBe(Date.UTC(2026, 10, 3) / 1000);
  });
});

describe('public keys', () => {
  it('accepts a compressed key and normalizes case', () => {
    expect(parsePublicKey(` ${TEST_PARENT_PUBKEY_HEX.toUpperCase()} `)).toHaveLength(33);
  });

  it('rejects wrong length, prefix and points off the curve', () => {
    expect(() => parsePublicKey(TEST_PARENT_PUBKEY_HEX.slice(2))).toThrow(/66 hex/);
    expect(() => parsePublicKey(`04${TEST_PARENT_PUBKEY_HEX.slice(2)}`)).toThrow(/02 or 03/);
    expect(() => parsePublicKey(`02${'ff'.repeat(32)}`)).toThrow(/not a valid point/);
    expect(() => parsePublicKey('zz'.repeat(33))).toThrow(/66 hex/);
  });
});

describe('amounts, fee rates and addresses', () => {
  it('parses and formats BTC amounts as satoshis', () => {
    expect(parseBtcAmount('0.0001')).toBe(10_000n);
    expect(parseBtcAmount('1')).toBe(100_000_000n);
    expect(parseBtcAmount('0.00000001')).toBe(1n);
    expect(() => parseBtcAmount('0.000000001')).toThrow();
    expect(() => parseBtcAmount('0')).toThrow(/greater than zero/);
    expect(() => parseBtcAmount('-1')).toThrow();
    expect(formatBtc(123_456_789n)).toBe('1.23456789');
    expect(formatBtc(546n)).toBe('0.00000546');
  });

  it('bounds the fee rate', () => {
    expect(() => assertFeeRate(0.5)).toThrow();
    expect(() => assertFeeRate(1001)).toThrow();
    expect(() => assertFeeRate(Number.NaN)).toThrow();
    expect(() => assertFeeRate(2.5)).not.toThrow();
  });

  it('accepts addresses only for the vault network', () => {
    expect(destinationScript('tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl', 'signet')).toHaveLength(22);
    expect(() => destinationScript('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', 'testnet')).toThrow(/testnet/);
    expect(() => destinationScript('', 'testnet')).toThrow(/Enter/);
  });
});
