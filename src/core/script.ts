import { opcodes, script as bscript } from 'bitcoinjs-lib';
import { equalBytes } from './bytes';
import { VaultError } from './errors';
import { assertPublicKey, assertUnlockTime } from './validate';

export interface VaultParams {
  /** Compressed public key of the parent (33 bytes). Can spend at any time. */
  parentPubKey: Uint8Array;
  /** Compressed public key of the child (33 bytes). Can spend after unlockTime. */
  childPubKey: Uint8Array;
  /** Unix timestamp (seconds, >= 500000000) checked by OP_CHECKLOCKTIMEVERIFY. */
  unlockTime: number;
}

/**
 * Minimal CScriptNum encoding of a non-negative integer (little endian, with
 * an extra 0x00 byte when the top bit of the last byte is set). Lock times up
 * to 0xffffffff need at most 5 bytes, which CLTV accepts.
 */
export function encodeScriptNumber(n: number): Uint8Array {
  if (!Number.isSafeInteger(n) || n < 0) throw new VaultError('Invalid script number.');
  if (n === 0) return new Uint8Array(0);
  const bytes: number[] = [];
  let v = n;
  while (v > 0) {
    bytes.push(v % 256);
    v = Math.floor(v / 256);
  }
  if ((bytes[bytes.length - 1] & 0x80) !== 0) bytes.push(0x00);
  return Uint8Array.from(bytes);
}

/** Decodes a minimally encoded, non-negative CScriptNum of up to 5 bytes. */
export function decodeScriptNumber(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  if (bytes.length > 5) throw new VaultError('Script number is too long.');
  const last = bytes[bytes.length - 1];
  if ((last & 0x80) !== 0) throw new VaultError('Negative lock time.');
  if ((last & 0x7f) === 0 && (bytes.length === 1 || (bytes[bytes.length - 2] & 0x80) === 0)) {
    throw new VaultError('Lock time is not minimally encoded.');
  }
  let n = 0;
  for (let i = bytes.length - 1; i >= 0; i--) n = n * 256 + bytes[i];
  return n;
}

function assertParams(params: VaultParams): void {
  assertPublicKey(params.parentPubKey, 'parent public key');
  assertPublicKey(params.childPubKey, 'child public key');
  if (equalBytes(params.parentPubKey, params.childPubKey)) {
    throw new VaultError('The parent and child public keys must be different.');
  }
  assertUnlockTime(params.unlockTime);
}

/**
 * Builds the vault witness script:
 *
 *   OP_IF
 *     <parentPubKey> OP_CHECKSIG
 *   OP_ELSE
 *     <unlockTime> OP_CHECKLOCKTIMEVERIFY OP_DROP
 *     <childPubKey> OP_CHECKSIG
 *   OP_ENDIF
 */
export function buildVaultScript(params: VaultParams): Uint8Array {
  assertParams(params);
  return bscript.compile([
    opcodes.OP_IF,
    params.parentPubKey,
    opcodes.OP_CHECKSIG,
    opcodes.OP_ELSE,
    encodeScriptNumber(params.unlockTime),
    opcodes.OP_CHECKLOCKTIMEVERIFY,
    opcodes.OP_DROP,
    params.childPubKey,
    opcodes.OP_CHECKSIG,
    opcodes.OP_ENDIF,
  ]);
}

/**
 * Parses a witness script back into its parameters. Only scripts that match
 * the template exactly (and re-encode to the same bytes) are accepted.
 */
export function decodeVaultScript(witnessScript: Uint8Array): VaultParams {
  const chunks = bscript.decompile(witnessScript);
  const fail = (): never => {
    throw new VaultError('This script is not a Kids Wallet vault script.');
  };
  if (!chunks || chunks.length !== 10) return fail();
  const [ifOp, parent, cs1, elseOp, lock, cltv, drop, child, cs2, endif] = chunks;
  if (
    ifOp !== opcodes.OP_IF ||
    cs1 !== opcodes.OP_CHECKSIG ||
    elseOp !== opcodes.OP_ELSE ||
    cltv !== opcodes.OP_CHECKLOCKTIMEVERIFY ||
    drop !== opcodes.OP_DROP ||
    cs2 !== opcodes.OP_CHECKSIG ||
    endif !== opcodes.OP_ENDIF ||
    !(parent instanceof Uint8Array) ||
    !(child instanceof Uint8Array) ||
    !(lock instanceof Uint8Array)
  ) {
    return fail();
  }
  const params: VaultParams = {
    parentPubKey: Uint8Array.from(parent),
    childPubKey: Uint8Array.from(child),
    unlockTime: decodeScriptNumber(lock),
  };
  assertParams(params);
  if (!equalBytes(buildVaultScript(params), witnessScript)) return fail();
  return params;
}
