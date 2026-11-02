import { Psbt, Transaction, type Signer } from 'bitcoinjs-lib';
import { encodeCompactSize, equalBytes, serializeWitness } from './bytes';
import { DUST_LIMIT_SATS, SEQUENCE_LOCKTIME_ENABLED, SEQUENCE_RBF } from './constants';
import { ECPair } from './ecc';
import { VaultError } from './errors';
import { getNetwork } from './networks';
import type { Vault } from './vault';
import { assertFeeRate, destinationScript, formatBtc, nowSeconds } from './validate';

/** "parent": spend at any time. "child": spend only after the unlock time. */
export type SpendPath = 'parent' | 'child';

export interface VaultUtxo {
  txid: string;
  vout: number;
  value: bigint;
  /**
   * Full previous transaction as hex. When present it is checked against
   * txid, vout and value and added to the PSBT as nonWitnessUtxo.
   */
  txHex?: string;
}

export interface SpendRequest {
  vault: Vault;
  path: SpendPath;
  utxos: VaultUtxo[];
  destination: string;
  /** sat/vB */
  feeRate: number;
  /** Amount to send in sats. Leave undefined to send the whole balance. */
  amount?: bigint;
  /**
   * Current time in Unix seconds, used to refuse the child path early. Pass
   * the network median-time-past when known; it is what consensus checks.
   */
  now?: number;
}

export interface SpendPlan {
  psbt: Psbt;
  path: SpendPath;
  inputs: VaultUtxo[];
  sendAmount: bigint;
  /** Change returned to the vault address (0n when there is no change output). */
  change: bigint;
  fee: bigint;
  /** Estimated virtual size used for the fee (an upper bound of the final size). */
  estimatedVsize: number;
  lockTime: number;
  sequence: number;
}

export interface SignedSpend {
  hex: string;
  txid: string;
  vsize: number;
  fee: bigint;
}

/** Path selector pushed before the witness script: 0x01 takes OP_IF, empty takes OP_ELSE. */
export function pathSelector(path: SpendPath): Uint8Array {
  return path === 'parent' ? Uint8Array.of(0x01) : new Uint8Array(0);
}

export function pathPublicKey(vault: Vault, path: SpendPath): Uint8Array {
  return path === 'parent' ? vault.parentPubKey : vault.childPubKey;
}

export function pathLockTime(vault: Vault, path: SpendPath): number {
  return path === 'child' ? vault.unlockTime : 0;
}

export function pathSequence(path: SpendPath): number {
  return path === 'child' ? SEQUENCE_LOCKTIME_ENABLED : SEQUENCE_RBF;
}

/** Largest DER signature (72 bytes) plus the sighash byte. */
const MAX_SIG_SIZE = 73;
/** outpoint (36) + empty scriptSig length (1) + sequence (4) */
const INPUT_BASE_SIZE = 41;

function witnessInputWeight(vault: Vault, path: SpendPath): number {
  const selector = pathSelector(path).length;
  const script = vault.witnessScript.length;
  return (
    1 + // number of witness items
    1 + MAX_SIG_SIZE +
    1 + selector +
    encodeCompactSize(script).length + script
  );
}

function outputSize(script: Uint8Array): number {
  return 8 + encodeCompactSize(script.length).length + script.length;
}

/** Upper bound of the virtual size of a vault spend. */
export function estimateVsize(vault: Vault, path: SpendPath, inputCount: number, outputScripts: Uint8Array[]): number {
  const base =
    4 + // version
    encodeCompactSize(inputCount).length +
    inputCount * INPUT_BASE_SIZE +
    encodeCompactSize(outputScripts.length).length +
    outputScripts.reduce((n, s) => n + outputSize(s), 0) +
    4; // lock time
  const witness = 2 + inputCount * witnessInputWeight(vault, path); // marker + flag
  return Math.ceil((base * 4 + witness) / 4);
}

function feeFor(vsize: number, feeRate: number): bigint {
  return BigInt(Math.ceil(vsize * feeRate));
}

function assertUtxos(utxos: VaultUtxo[]): void {
  if (utxos.length === 0) throw new VaultError('The vault has no coins to spend.');
  const seen = new Set<string>();
  for (const u of utxos) {
    if (!/^[0-9a-f]{64}$/.test(u.txid)) throw new VaultError('A coin has an invalid transaction id.');
    if (!Number.isInteger(u.vout) || u.vout < 0 || u.vout > 0xffffffff) {
      throw new VaultError('A coin has an invalid output index.');
    }
    if (typeof u.value !== 'bigint' || u.value <= 0n) throw new VaultError('A coin has an invalid value.');
    const key = `${u.txid}:${u.vout}`;
    if (seen.has(key)) throw new VaultError('The same coin appears twice.');
    seen.add(key);
  }
}

function checkPreviousTx(vault: Vault, u: VaultUtxo): Uint8Array | undefined {
  if (u.txHex === undefined) return undefined;
  let tx: Transaction;
  try {
    tx = Transaction.fromHex(u.txHex);
  } catch {
    throw new VaultError(`The previous transaction ${u.txid} could not be decoded.`);
  }
  if (tx.getId() !== u.txid) {
    throw new VaultError(`The previous transaction data does not match ${u.txid}.`);
  }
  const out = tx.outs[u.vout];
  if (!out || !equalBytes(out.script, vault.scriptPubKey) || out.value !== u.value) {
    throw new VaultError(`Output ${u.txid}:${u.vout} is not a vault coin of the stated value.`);
  }
  return tx.toBuffer();
}

interface Selection {
  inputs: VaultUtxo[];
  sendAmount: bigint;
  change: bigint;
  fee: bigint;
  estimatedVsize: number;
}

function select(req: SpendRequest, destScript: Uint8Array): Selection {
  const { vault, path, feeRate } = req;
  const total = (list: VaultUtxo[]) => list.reduce((n, u) => n + u.value, 0n);

  if (req.amount === undefined) {
    const inputs = [...req.utxos];
    const estimatedVsize = estimateVsize(vault, path, inputs.length, [destScript]);
    const fee = feeFor(estimatedVsize, feeRate);
    const sendAmount = total(inputs) - fee;
    if (sendAmount < DUST_LIMIT_SATS) {
      throw new VaultError(
        `The balance (${formatBtc(total(inputs))} BTC) is too small to pay a fee of ${fee} sats at this fee rate.`,
      );
    }
    return { inputs, sendAmount, change: 0n, fee, estimatedVsize };
  }

  const amount = req.amount;
  if (amount < DUST_LIMIT_SATS) {
    throw new VaultError(`The amount must be at least ${DUST_LIMIT_SATS} sats.`);
  }
  // Largest coins first; change goes back to the vault address.
  const sorted = [...req.utxos].sort((a, b) => (a.value === b.value ? 0 : a.value > b.value ? -1 : 1));
  const inputs: VaultUtxo[] = [];
  for (const u of sorted) {
    inputs.push(u);
    const sum = total(inputs);
    const vsizeWithChange = estimateVsize(vault, path, inputs.length, [destScript, vault.scriptPubKey]);
    const feeWithChange = feeFor(vsizeWithChange, feeRate);
    const change = sum - amount - feeWithChange;
    if (change >= DUST_LIMIT_SATS) {
      return { inputs, sendAmount: amount, change, fee: feeWithChange, estimatedVsize: vsizeWithChange };
    }
    const vsizeNoChange = estimateVsize(vault, path, inputs.length, [destScript]);
    const feeNoChange = feeFor(vsizeNoChange, feeRate);
    if (sum >= amount + feeNoChange) {
      // Leftover below the dust limit is added to the fee.
      return { inputs, sendAmount: amount, change: 0n, fee: sum - amount, estimatedVsize: vsizeNoChange };
    }
  }
  throw new VaultError(
    `Not enough funds: the vault holds ${formatBtc(total(sorted))} BTC, which does not cover the amount plus the fee.`,
  );
}

/**
 * Builds an unsigned PSBT that spends vault coins through one path.
 * Parent path: nLockTime 0, nSequence 0xfffffffd.
 * Child path: nLockTime = unlockTime, nSequence 0xfffffffe on every input;
 * refused while `now` is not past the unlock time.
 */
export function buildSpendPsbt(req: SpendRequest): SpendPlan {
  const { vault, path } = req;
  if (path !== 'parent' && path !== 'child') throw new VaultError('Unknown spending path.');
  assertFeeRate(req.feeRate);
  assertUtxos(req.utxos);
  if (path === 'child') {
    const now = req.now ?? nowSeconds();
    if (now <= vault.unlockTime) {
      throw new VaultError(
        `The child path is locked until ${new Date(vault.unlockTime * 1000).toISOString()}. ` +
          'Only the parent key can spend before then.',
      );
    }
  }
  const destScript = destinationScript(req.destination, vault.network);
  const sel = select(req, destScript);
  const lockTime = pathLockTime(vault, path);
  const sequence = pathSequence(path);

  const psbt = new Psbt({ network: getNetwork(vault.network) });
  psbt.setVersion(2);
  psbt.setLocktime(lockTime);
  for (const u of sel.inputs) {
    const nonWitnessUtxo = checkPreviousTx(vault, u);
    psbt.addInput({
      hash: u.txid,
      index: u.vout,
      sequence,
      witnessUtxo: { script: vault.scriptPubKey, value: u.value },
      witnessScript: vault.witnessScript,
      ...(nonWitnessUtxo ? { nonWitnessUtxo } : {}),
    });
  }
  psbt.addOutput({ script: destScript, value: sel.sendAmount });
  if (sel.change > 0n) psbt.addOutput({ script: vault.scriptPubKey, value: sel.change });

  return {
    psbt,
    path,
    inputs: sel.inputs,
    sendAmount: sel.sendAmount,
    change: sel.change,
    fee: sel.fee,
    estimatedVsize: sel.estimatedVsize,
    lockTime,
    sequence,
  };
}

/** Checks a secp256k1 ECDSA signature (used to validate PSBT signatures). */
export function verifyEcdsa(pubkey: Uint8Array, msghash: Uint8Array, signature: Uint8Array): boolean {
  return ECPair.fromPublicKey(pubkey).verify(msghash, signature);
}

function assertPsbtMatchesPath(psbt: Psbt, vault: Vault, path: SpendPath): void {
  if (psbt.locktime !== pathLockTime(vault, path)) {
    throw new VaultError('The transaction lock time does not match the chosen path.');
  }
  psbt.txInputs.forEach((input, i) => {
    if (input.sequence !== pathSequence(path)) {
      throw new VaultError(`Input ${i} has the wrong sequence for the chosen path.`);
    }
    const ws = psbt.data.inputs[i].witnessScript;
    if (!ws || !equalBytes(ws, vault.witnessScript)) {
      throw new VaultError(`Input ${i} does not spend from this vault.`);
    }
  });
}

/**
 * Signs every input with the key of the chosen path. A key that is not the
 * path key is refused, including the other vault key: bitcoinjs-lib alone
 * would accept the child key on a parent-path transaction because that key
 * appears in the script.
 */
export function signSpendPsbt(psbt: Psbt, vault: Vault, path: SpendPath, signer: Signer): void {
  const expected = pathPublicKey(vault, path);
  if (!equalBytes(signer.publicKey, expected)) {
    throw new VaultError(
      path === 'parent'
        ? 'This key is not the parent key of this vault.'
        : 'This key is not the child key of this vault.',
    );
  }
  assertPsbtMatchesPath(psbt, vault, path);
  for (let i = 0; i < psbt.inputCount; i++) {
    psbt.signInput(i, signer);
    if (!psbt.validateSignaturesOfInput(i, verifyEcdsa, expected)) {
      throw new VaultError(`The signature for input ${i} is not valid.`);
    }
  }
}

/**
 * Finalizes every input with the witness stack of the path:
 * parent: <sig> <0x01> <witnessScript>; child: <sig> <empty> <witnessScript>.
 */
export function finalizeSpendPsbt(psbt: Psbt, vault: Vault, path: SpendPath): void {
  const expected = pathPublicKey(vault, path);
  for (let i = 0; i < psbt.inputCount; i++) {
    psbt.finalizeInput(i, (_index: number, input: Psbt['data']['inputs'][number]) => {
      const sig = input.partialSig?.find((p) => equalBytes(p.pubkey, expected));
      if (!sig) throw new VaultError(`Input ${i} has no signature from the ${path} key.`);
      return {
        finalScriptSig: undefined,
        finalScriptWitness: serializeWitness([sig.signature, pathSelector(path), vault.witnessScript]),
      };
    });
  }
}

export function extractSignedSpend(psbt: Psbt): SignedSpend {
  const tx = psbt.extractTransaction();
  const inputTotal = psbt.data.inputs.reduce((n, inp) => n + (inp.witnessUtxo?.value ?? 0n), 0n);
  const outputTotal = tx.outs.reduce((n, o) => n + o.value, 0n);
  return { hex: tx.toHex(), txid: tx.getId(), vsize: tx.virtualSize(), fee: inputTotal - outputTotal };
}

/** Builds, signs and finalizes a spend in one call. */
export function createSignedSpend(req: SpendRequest, signer: Signer): SignedSpend & { plan: SpendPlan } {
  const plan = buildSpendPsbt(req);
  signSpendPsbt(plan.psbt, req.vault, req.path, signer);
  finalizeSpendPsbt(plan.psbt, req.vault, req.path);
  return { ...extractSignedSpend(plan.psbt), plan };
}
