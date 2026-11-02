import { address as btcAddress } from 'bitcoinjs-lib';
import { fromHex } from './bytes';
import {
  LOCKTIME_THRESHOLD,
  MAX_FEE_RATE,
  MAX_LOCKTIME,
  MIN_FEE_RATE,
  UNLOCK_AGE_YEARS,
} from './constants';
import { ecc } from './ecc';
import { VaultError } from './errors';
import { getNetwork, type NetworkName } from './networks';

/** Largest offset of any time zone from UTC (UTC+14), in seconds. */
const MAX_TZ_AHEAD_SECONDS = 14 * 3600;

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Validates a compressed secp256k1 public key (33 bytes, prefix 02 or 03, a
 * point on the curve). Uncompressed keys are rejected because SegWit v0
 * policy only relays scripts with compressed keys.
 */
export function assertPublicKey(key: Uint8Array, label = 'public key'): void {
  if (key.length !== 33 || (key[0] !== 0x02 && key[0] !== 0x03)) {
    throw new VaultError(
      `The ${label} must be a compressed public key: 66 hex characters starting with 02 or 03.`,
    );
  }
  if (!ecc.isPoint(key)) {
    throw new VaultError(`The ${label} is not a valid point on the secp256k1 curve.`);
  }
}

export function parsePublicKey(hex: string, label = 'public key'): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{66}$/.test(clean)) {
    throw new VaultError(
      `The ${label} must be a compressed public key: 66 hex characters starting with 02 or 03.`,
    );
  }
  const key = fromHex(clean, label);
  assertPublicKey(key, label);
  return key;
}

export interface UnlockTimeOptions {
  /** Require the unlock time to be later than `now` (true for new vaults). */
  requireFuture?: boolean;
  /** Current Unix time in seconds. */
  now?: number;
}

/**
 * Validates the CLTV unlock time. It must be a Unix timestamp
 * (>= 500000000, so OP_CHECKLOCKTIMEVERIFY compares it with time and not
 * with block height) and fit in nLockTime (uint32).
 */
export function assertUnlockTime(unlockTime: number, options: UnlockTimeOptions = {}): void {
  if (!Number.isSafeInteger(unlockTime)) {
    throw new VaultError('The unlock time must be a whole number of seconds.');
  }
  if (unlockTime < LOCKTIME_THRESHOLD) {
    throw new VaultError(
      `The unlock time must be a Unix timestamp of at least ${LOCKTIME_THRESHOLD}. Smaller values are read as block heights.`,
    );
  }
  if (unlockTime > MAX_LOCKTIME) {
    throw new VaultError('The unlock time is too far in the future for a Bitcoin lock time.');
  }
  if (options.requireFuture) {
    const now = options.now ?? nowSeconds();
    if (unlockTime <= now) {
      throw new VaultError('The unlock date must be in the future for a new vault.');
    }
  }
}

export interface BirthDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export function parseBirthDate(value: string): BirthDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) throw new VaultError('Enter the birth date as YYYY-MM-DD.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const t = new Date(Date.UTC(year, month - 1, day));
  if (t.getUTCFullYear() !== year || t.getUTCMonth() !== month - 1 || t.getUTCDate() !== day) {
    throw new VaultError('The birth date is not a real calendar date.');
  }
  return { year, month, day };
}

/**
 * Unix timestamp of the 18th birthday at 00:00 UTC. A child born on
 * 29 February reaches 18 on 1 March when the 18th year is not a leap year
 * (Date.UTC rolls the day over).
 */
export function unlockTimeFromBirthDate(value: string): number {
  const { year, month, day } = parseBirthDate(value);
  return Math.floor(Date.UTC(year + UNLOCK_AGE_YEARS, month - 1, day) / 1000);
}

/**
 * Validates a birth date for a new vault: the child is already born and is
 * not yet 18. Returns the unlock time. Dates are taken as UTC calendar days;
 * a margin of 14 hours accepts a birth "today" in any time zone.
 */
export function validateBirthDateForNewVault(value: string, now: number = nowSeconds()): number {
  const { year, month, day } = parseBirthDate(value);
  const birth = Math.floor(Date.UTC(year, month - 1, day) / 1000);
  if (birth > now + MAX_TZ_AHEAD_SECONDS) {
    throw new VaultError('The birth date is in the future. Create the vault after the child is born.');
  }
  const unlockTime = unlockTimeFromBirthDate(value);
  if (unlockTime <= now) {
    throw new VaultError('The child is already 18 or older, so the vault would open right away.');
  }
  assertUnlockTime(unlockTime, { requireFuture: true, now });
  return unlockTime;
}

export function assertFeeRate(feeRate: number): void {
  if (!Number.isFinite(feeRate) || feeRate < MIN_FEE_RATE || feeRate > MAX_FEE_RATE) {
    throw new VaultError(`The fee rate must be between ${MIN_FEE_RATE} and ${MAX_FEE_RATE} sat/vB.`);
  }
}

/** Returns the output script for an address, or throws if it is not valid on the network. */
export function destinationScript(addr: string, network: NetworkName): Uint8Array {
  const clean = addr.trim();
  if (clean.length === 0) throw new VaultError('Enter a destination address.');
  try {
    return btcAddress.toOutputScript(clean, getNetwork(network));
  } catch {
    throw new VaultError(`The destination is not a valid ${network} address.`);
  }
}

/** Parses an amount in BTC ("0.001") into satoshis. */
export function parseBtcAmount(value: string): bigint {
  const clean = value.trim();
  const match = /^(\d{1,8})(?:\.(\d{0,8}))?$/.exec(clean);
  if (!match) throw new VaultError('Enter the amount in BTC with at most 8 decimal places.');
  const whole = BigInt(match[1]);
  const frac = BigInt((match[2] ?? '').padEnd(8, '0'));
  const sats = whole * 100_000_000n + frac;
  if (sats <= 0n) throw new VaultError('The amount must be greater than zero.');
  return sats;
}

/** Formats satoshis as BTC with 8 decimal places. */
export function formatBtc(sats: bigint): string {
  const negative = sats < 0n;
  const abs = negative ? -sats : sats;
  const whole = abs / 100_000_000n;
  const frac = (abs % 100_000_000n).toString().padStart(8, '0');
  return `${negative ? '-' : ''}${whole.toString()}.${frac}`;
}
