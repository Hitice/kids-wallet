/**
 * Vault v1 PREVIEW (RFC 0002): Taproot vault with two script leaves.
 *
 *   internal key  = BIP341 "nothing up my sleeve" point, so there is no key path
 *   leaf A (child)     <unlockTime> OP_CHECKLOCKTIMEVERIFY OP_DROP <child> OP_CHECKSIG
 *   leaf B (guardians) <delay> OP_CHECKSEQUENCEVERIFY OP_DROP
 *                      <g1> OP_CHECKSIG <g2> OP_CHECKSIGADD <g3> OP_CHECKSIGADD OP_2 OP_NUMEQUAL
 *
 * This module builds the scripts, the Taproot output and the control blocks.
 * It is not wired into the user interface and has no spending code yet. The
 * destination restriction of the guardian path (children's charities only) is
 * not expressible in Bitcoin script today; RFC 0007 covers the pre-signed
 * transactions and the governance around it.
 */
import { crypto, opcodes, payments, script as bscript } from 'bitcoinjs-lib';
import { concatBytes, encodeCompactSize, equalBytes, fromHex, toHex } from './bytes';
import { VaultError } from './errors';
import { coinType, getNetwork, type NetworkName } from './networks';
import { decodeScriptNumber, encodeScriptNumber } from './script';
import { assertPublicKey, assertUnlockTime } from './validate';

/**
 * BIP341 recommended unspendable internal key: lift_x of the SHA256 of the
 * generator point in uncompressed form. With it, every spend must use a leaf.
 */
export const NUMS_INTERNAL_KEY_HEX = '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0'; // gitleaks:allow (public BIP341 NUMS point)

/** OP_CHECKSEQUENCEVERIFY in block units accepts 1 to 65535 blocks. */
export const MAX_RECOVERY_DELAY_BLOCKS = 0xffff;

/** Default guardian delay: about six months of blocks. To be confirmed in RFC 0002. */
export const GUARDIAN_RECOVERY_DELAY_BLOCKS = 26_280;

export const GUARDIAN_THRESHOLD = 2;
export const GUARDIAN_COUNT = 3;

export interface TaprootVaultParams {
  /** Compressed public key of the child (33 bytes). Spends after unlockTime. */
  childPubKey: Uint8Array;
  /** Unix timestamp (seconds, >= 500000000) checked by OP_CHECKLOCKTIMEVERIFY. */
  unlockTime: number;
  /** Three compressed guardian public keys. Any two can spend after the delay. */
  guardianPubKeys: Uint8Array[];
  /** Relative lock in blocks for the guardian leaf (1 to 65535). */
  recoveryDelayBlocks?: number;
}

export interface TaprootVault {
  network: NetworkName;
  /** 32-byte x-only internal key (the NUMS point). */
  internalKey: Uint8Array;
  /** 32-byte x-only tweaked output key. */
  outputKey: Uint8Array;
  /** P2TR output script: OP_1 <outputKey>. */
  scriptPubKey: Uint8Array;
  address: string;
  childLeaf: Uint8Array;
  guardianLeaf: Uint8Array;
  childLeafHash: Uint8Array;
  guardianLeafHash: Uint8Array;
  /** Control blocks (33 + 32 bytes) that prove each leaf belongs to the output. */
  childControlBlock: Uint8Array;
  guardianControlBlock: Uint8Array;
  unlockTime: number;
  recoveryDelayBlocks: number;
  /** Guardian x-only keys in the order they appear in the leaf (sorted). */
  guardianKeys: Uint8Array[];
}

/** BIP86 path for Taproot keys: m/86'/coin'/0'/0/index. */
export function taprootDerivationPath(network: NetworkName, index = 0): string {
  if (!Number.isInteger(index) || index < 0 || index >= 0x8000_0000) throw new VaultError('Invalid key index.');
  return `m/86'/${coinType(network)}'/0'/0/${index}`;
}

/** Drops the parity byte of a compressed public key (BIP340 x-only form). */
export function toXOnly(pubKey: Uint8Array, label = 'public key'): Uint8Array {
  assertPublicKey(pubKey, label);
  return Uint8Array.from(pubKey.subarray(1, 33));
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

export function assertRecoveryDelay(blocks: number): void {
  if (!Number.isInteger(blocks) || blocks < 1 || blocks > MAX_RECOVERY_DELAY_BLOCKS) {
    throw new VaultError(`The recovery delay must be between 1 and ${MAX_RECOVERY_DELAY_BLOCKS} blocks.`);
  }
}

/** Leaf A: the child key, valid only after unlockTime (same rule as the v0 child path). */
export function buildChildLeaf(childXOnly: Uint8Array, unlockTime: number): Uint8Array {
  if (childXOnly.length !== 32) throw new VaultError('The child key must be a 32-byte x-only key.');
  assertUnlockTime(unlockTime);
  return bscript.compile([
    encodeScriptNumber(unlockTime),
    opcodes.OP_CHECKLOCKTIMEVERIFY,
    opcodes.OP_DROP,
    childXOnly,
    opcodes.OP_CHECKSIG,
  ]);
}

/**
 * Leaf B: 2-of-3 guardians with OP_CHECKSIGADD (BIP342), after a relative
 * delay. Keys are sorted so the same three guardians always give the same
 * script. The witness carries one signature or an empty item per key, in the
 * reverse order of the keys in the script.
 */
export function buildGuardianRecoveryLeaf(guardianXOnly: Uint8Array[], recoveryDelayBlocks: number): Uint8Array {
  if (guardianXOnly.length !== GUARDIAN_COUNT) throw new VaultError(`Exactly ${GUARDIAN_COUNT} guardian keys are required.`);
  for (const k of guardianXOnly) {
    if (k.length !== 32) throw new VaultError('Each guardian key must be a 32-byte x-only key.');
  }
  assertRecoveryDelay(recoveryDelayBlocks);
  const sorted = [...guardianXOnly].sort(compareBytes);
  for (let i = 1; i < sorted.length; i++) {
    if (equalBytes(sorted[i - 1], sorted[i])) throw new VaultError('The guardian keys must be different from each other.');
  }
  const [g1, g2, g3] = sorted;
  return bscript.compile([
    encodeScriptNumber(recoveryDelayBlocks),
    opcodes.OP_CHECKSEQUENCEVERIFY,
    opcodes.OP_DROP,
    g1,
    opcodes.OP_CHECKSIG,
    g2,
    opcodes.OP_CHECKSIGADD,
    g3,
    opcodes.OP_CHECKSIGADD,
    opcodes.OP_2,
    opcodes.OP_NUMEQUAL,
  ]);
}

export interface GuardianLeafParams {
  recoveryDelayBlocks: number;
  guardianKeys: Uint8Array[];
}

/** Parses a guardian leaf back into its delay and sorted keys; rejects anything else. */
export function decodeGuardianRecoveryLeaf(leaf: Uint8Array): GuardianLeafParams {
  const chunks = bscript.decompile(leaf);
  const fail = (): never => {
    throw new VaultError('This script is not a Kids Wallet guardian leaf.');
  };
  if (!chunks || chunks.length !== 11) return fail();
  const [delay, csv, drop, g1, cs, g2, add1, g3, add2, two, eq] = chunks;
  if (
    csv !== opcodes.OP_CHECKSEQUENCEVERIFY ||
    drop !== opcodes.OP_DROP ||
    cs !== opcodes.OP_CHECKSIG ||
    add1 !== opcodes.OP_CHECKSIGADD ||
    add2 !== opcodes.OP_CHECKSIGADD ||
    two !== opcodes.OP_2 ||
    eq !== opcodes.OP_NUMEQUAL ||
    !(delay instanceof Uint8Array) ||
    !(g1 instanceof Uint8Array) ||
    !(g2 instanceof Uint8Array) ||
    !(g3 instanceof Uint8Array)
  ) {
    return fail();
  }
  const params = {
    recoveryDelayBlocks: decodeScriptNumber(delay),
    guardianKeys: [g1, g2, g3].map((k) => Uint8Array.from(k)),
  };
  if (!equalBytes(buildGuardianRecoveryLeaf(params.guardianKeys, params.recoveryDelayBlocks), leaf)) return fail();
  return params;
}

function controlBlock(internalPubkey: Uint8Array, scriptTree: [{ output: Uint8Array }, { output: Uint8Array }], leaf: Uint8Array, network: NetworkName): Uint8Array {
  const p = payments.p2tr({ internalPubkey, scriptTree, redeem: { output: leaf }, network: getNetwork(network) });
  const witness = p.witness;
  if (!witness || witness.length === 0) throw new VaultError('Could not build the Taproot control block.');
  return Uint8Array.from(witness[witness.length - 1]);
}

/** Builds the v1 Taproot vault: scripts, output key, address and control blocks. */
export function createTaprootVault(params: TaprootVaultParams, network: NetworkName): TaprootVault {
  const recoveryDelayBlocks = params.recoveryDelayBlocks ?? GUARDIAN_RECOVERY_DELAY_BLOCKS;
  const childXOnly = toXOnly(params.childPubKey, 'child public key');
  if (params.guardianPubKeys.length !== GUARDIAN_COUNT) {
    throw new VaultError(`Exactly ${GUARDIAN_COUNT} guardian keys are required.`);
  }
  const guardianXOnly = params.guardianPubKeys.map((k, i) => toXOnly(k, `guardian ${i + 1} public key`));
  for (const g of guardianXOnly) {
    if (equalBytes(g, childXOnly)) throw new VaultError('A guardian key must be different from the child key.');
  }
  const childLeaf = buildChildLeaf(childXOnly, params.unlockTime);
  const guardianLeaf = buildGuardianRecoveryLeaf(guardianXOnly, recoveryDelayBlocks);
  const internalKey = fromHex(NUMS_INTERNAL_KEY_HEX);
  const scriptTree: [{ output: Uint8Array }, { output: Uint8Array }] = [{ output: childLeaf }, { output: guardianLeaf }];
  const p2tr = payments.p2tr({ internalPubkey: internalKey, scriptTree, network: getNetwork(network) });
  if (!p2tr.address || !p2tr.output || !p2tr.pubkey) throw new VaultError('Could not derive the Taproot address.');
  return {
    network,
    internalKey,
    outputKey: Uint8Array.from(p2tr.pubkey),
    scriptPubKey: Uint8Array.from(p2tr.output),
    address: p2tr.address,
    childLeaf,
    guardianLeaf,
    childLeafHash: tapleafHash(childLeaf),
    guardianLeafHash: tapleafHash(guardianLeaf),
    childControlBlock: controlBlock(internalKey, scriptTree, childLeaf, network),
    guardianControlBlock: controlBlock(internalKey, scriptTree, guardianLeaf, network),
    unlockTime: params.unlockTime,
    recoveryDelayBlocks,
    guardianKeys: decodeGuardianRecoveryLeaf(guardianLeaf).guardianKeys,
  };
}

/** BIP342 tapscript leaf version. */
export const LEAF_VERSION_TAPSCRIPT = 0xc0;

/** BIP341 tapleaf hash: tagged_hash("TapLeaf", version || compact_size(len) || script). */
export function tapleafHash(leaf: Uint8Array): Uint8Array {
  return Uint8Array.from(
    crypto.taggedHash('TapLeaf', concatBytes(Uint8Array.of(LEAF_VERSION_TAPSCRIPT), encodeCompactSize(leaf.length), leaf)),
  );
}

/** Human-readable summary used by tests and documentation. */
export function describeTaprootVault(vault: TaprootVault): Record<string, string | number> {
  return {
    network: vault.network,
    address: vault.address,
    internalKey: toHex(vault.internalKey),
    outputKey: toHex(vault.outputKey),
    childLeaf: toHex(vault.childLeaf),
    guardianLeaf: toHex(vault.guardianLeaf),
    unlockTime: vault.unlockTime,
    recoveryDelayBlocks: vault.recoveryDelayBlocks,
  };
}
