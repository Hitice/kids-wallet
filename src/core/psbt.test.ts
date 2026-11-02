import { Psbt, script as bscript, Transaction } from 'bitcoinjs-lib';
import { describe, expect, it } from 'vitest';
import { equalBytes, toHex } from './bytes';
import { SEQUENCE_LOCKTIME_ENABLED, SEQUENCE_RBF } from './constants';
import { ECPair } from './ecc';
import {
  buildSpendPsbt,
  createSignedSpend,
  finalizeSpendPsbt,
  signSpendPsbt,
  verifyEcdsa,
  type SpendRequest,
} from './psbt';
import { fundVault, TEST_UNLOCK_TIME, testKeys, testVault } from './test-fixtures';

const keys = testKeys();
const vault = testVault();
const DEST = 'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl';
const BEFORE_UNLOCK = TEST_UNLOCK_TIME - 86_400;
const AFTER_UNLOCK = TEST_UNLOCK_TIME + 7_200;

function request(overrides: Partial<SpendRequest> = {}): SpendRequest {
  return {
    vault,
    path: 'parent',
    utxos: fundVault(vault, [100_000n]),
    destination: DEST,
    feeRate: 2,
    now: BEFORE_UNLOCK,
    ...overrides,
  };
}

/** Checks the DER signature in a witness against the BIP143 sighash of input i. */
function signatureVerifies(tx: Transaction, i: number, value: bigint, pubkey: Uint8Array): boolean {
  const { signature, hashType } = bscript.signature.decode(tx.ins[i].witness[0]);
  const hash = tx.hashForWitnessV0(i, vault.witnessScript, value, hashType);
  return hashType === Transaction.SIGHASH_ALL && ECPair.fromPublicKey(pubkey).verify(hash, signature);
}

describe('parent path', () => {
  it('signs, validates and finalizes with <sig> <0x01> <witnessScript>', () => {
    const plan = buildSpendPsbt(request());
    expect(plan.psbt.locktime).toBe(0);
    expect(plan.psbt.txInputs[0].sequence).toBe(SEQUENCE_RBF);

    signSpendPsbt(plan.psbt, vault, 'parent', keys.parent);
    expect(plan.psbt.validateSignaturesOfInput(0, verifyEcdsa, vault.parentPubKey)).toBe(true);
    expect(() => plan.psbt.validateSignaturesOfInput(0, verifyEcdsa, vault.childPubKey)).toThrow();

    finalizeSpendPsbt(plan.psbt, vault, 'parent');
    const tx = plan.psbt.extractTransaction();
    const witness = tx.ins[0].witness;
    expect(witness).toHaveLength(3);
    expect(toHex(witness[1])).toBe('01');
    expect(equalBytes(witness[2], vault.witnessScript)).toBe(true);
    expect(witness[0].length).toBeGreaterThanOrEqual(70);
    expect(witness[0][witness[0].length - 1]).toBe(Transaction.SIGHASH_ALL);
    expect(signatureVerifies(tx, 0, 100_000n, vault.parentPubKey)).toBe(true);
    expect(signatureVerifies(tx, 0, 100_000n, vault.childPubKey)).toBe(false);
  });

  it('pays at least the requested fee rate and sends the rest', () => {
    const signed = createSignedSpend(request({ feeRate: 3 }), keys.parent);
    const tx = Transaction.fromHex(signed.hex);
    expect(signed.vsize).toBeLessThanOrEqual(signed.plan.estimatedVsize);
    expect(Number(signed.fee) / signed.vsize).toBeGreaterThanOrEqual(3);
    expect(tx.outs).toHaveLength(1);
    expect(tx.outs[0].value + signed.fee).toBe(100_000n);
    expect(signed.txid).toBe(tx.getId());
  });

  it('works before the unlock time and after it', () => {
    expect(() => createSignedSpend(request({ now: BEFORE_UNLOCK }), keys.parent)).not.toThrow();
    expect(() => createSignedSpend(request({ now: AFTER_UNLOCK }), keys.parent)).not.toThrow();
  });

  it('returns change to the vault address', () => {
    const utxos = fundVault(vault, [60_000n, 50_000n]);
    const signed = createSignedSpend(request({ utxos, amount: 70_000n }), keys.parent);
    const tx = Transaction.fromHex(signed.hex);
    expect(tx.ins).toHaveLength(2);
    expect(tx.outs).toHaveLength(2);
    expect(tx.outs[0].value).toBe(70_000n);
    expect(equalBytes(tx.outs[1].script, vault.scriptPubKey)).toBe(true);
    expect(tx.outs[0].value + tx.outs[1].value + signed.fee).toBe(110_000n);
    tx.ins.forEach((_, i) => expect(signatureVerifies(tx, i, i === 0 ? 60_000n : 50_000n, vault.parentPubKey)).toBe(true));
  });

  it('selects only the coins it needs', () => {
    const utxos = fundVault(vault, [10_000n, 90_000n]);
    const plan = buildSpendPsbt(request({ utxos, amount: 20_000n }));
    expect(plan.inputs.map((u) => u.value)).toEqual([90_000n]);
  });

  it('refuses amounts it cannot pay and dust outputs', () => {
    expect(() => buildSpendPsbt(request({ amount: 100_000n }))).toThrow(/Not enough funds/);
    expect(() => buildSpendPsbt(request({ amount: 100n }))).toThrow(/at least 546/);
    expect(() => buildSpendPsbt(request({ utxos: fundVault(vault, [600n]) }))).toThrow(/too small/);
    expect(() => buildSpendPsbt(request({ utxos: [] }))).toThrow(/no coins/);
    expect(() => buildSpendPsbt(request({ feeRate: 0 }))).toThrow(/fee rate/);
    expect(() => buildSpendPsbt(request({ destination: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu' }))).toThrow(
      /testnet address/,
    );
  });
});

describe('child path', () => {
  it('sets nLockTime to unlockTime and nSequence to 0xfffffffe', () => {
    const utxos = fundVault(vault, [40_000n, 40_000n]);
    const plan = buildSpendPsbt(request({ path: 'child', utxos, now: AFTER_UNLOCK }));
    expect(plan.psbt.locktime).toBe(TEST_UNLOCK_TIME);
    expect(plan.lockTime).toBe(TEST_UNLOCK_TIME);
    expect(plan.psbt.txInputs).toHaveLength(2);
    for (const input of plan.psbt.txInputs) expect(input.sequence).toBe(SEQUENCE_LOCKTIME_ENABLED);
    expect(SEQUENCE_LOCKTIME_ENABLED).toBe(0xfffffffe);
  });

  it('finalizes with <sig> <empty> <witnessScript> and the child signature verifies', () => {
    const signed = createSignedSpend(request({ path: 'child', now: AFTER_UNLOCK }), keys.child);
    const tx = Transaction.fromHex(signed.hex);
    expect(tx.locktime).toBe(TEST_UNLOCK_TIME);
    expect(tx.ins[0].sequence).toBe(0xfffffffe);
    const witness = tx.ins[0].witness;
    expect(witness).toHaveLength(3);
    expect(witness[1]).toHaveLength(0);
    expect(equalBytes(witness[2], vault.witnessScript)).toBe(true);
    expect(signatureVerifies(tx, 0, 100_000n, vault.childPubKey)).toBe(true);
    expect(signed.vsize).toBeLessThanOrEqual(signed.plan.estimatedVsize);
  });

  it('refuses to build before or at unlockTime', () => {
    expect(() => buildSpendPsbt(request({ path: 'child', now: BEFORE_UNLOCK }))).toThrow(/locked until 2038-06-15/);
    expect(() => buildSpendPsbt(request({ path: 'child', now: TEST_UNLOCK_TIME }))).toThrow(/locked until/);
    expect(() => buildSpendPsbt(request({ path: 'child', now: TEST_UNLOCK_TIME + 1 }))).not.toThrow();
  });
});

describe('wrong keys', () => {
  it('cannot sign the parent path with the child key or an unrelated key', () => {
    const plan = buildSpendPsbt(request());
    expect(() => signSpendPsbt(plan.psbt, vault, 'parent', keys.child)).toThrow(/not the parent key/);
    expect(() => signSpendPsbt(plan.psbt, vault, 'parent', keys.other)).toThrow(/not the parent key/);
    expect(plan.psbt.data.inputs[0].partialSig ?? []).toHaveLength(0);
  });

  it('cannot sign the child path with the parent key or an unrelated key', () => {
    const plan = buildSpendPsbt(request({ path: 'child', now: AFTER_UNLOCK }));
    expect(() => signSpendPsbt(plan.psbt, vault, 'child', keys.parent)).toThrow(/not the child key/);
    expect(() => signSpendPsbt(plan.psbt, vault, 'child', keys.other)).toThrow(/not the child key/);
  });

  it('bitcoinjs-lib itself refuses a key that is not in the script', () => {
    const plan = buildSpendPsbt(request());
    expect(() => plan.psbt.signInput(0, keys.other)).toThrow();
  });

  it('cannot finalize a path whose key did not sign', () => {
    const plan = buildSpendPsbt(request());
    signSpendPsbt(plan.psbt, vault, 'parent', keys.parent);
    expect(() => finalizeSpendPsbt(plan.psbt, vault, 'child')).toThrow(/no signature from the child key/);
  });

  it('refuses to sign a parent-path PSBT as the child path', () => {
    const plan = buildSpendPsbt(request());
    expect(() => signSpendPsbt(plan.psbt, vault, 'child', keys.child)).toThrow(/lock time/);
  });

  it('refuses a PSBT that spends another script', () => {
    const plan = buildSpendPsbt(request());
    const other = testVault(TEST_UNLOCK_TIME + 1);
    const psbt = Psbt.fromBase64(plan.psbt.toBase64());
    expect(() => signSpendPsbt(psbt, other, 'parent', keys.parent)).toThrow(/does not spend from this vault/);
  });
});

describe('previous transaction checks', () => {
  it('rejects a UTXO whose transaction data does not match', () => {
    const [utxo] = fundVault(vault, [100_000n]);
    const [other] = fundVault(vault, [100_000n], 2);
    expect(() => buildSpendPsbt(request({ utxos: [{ ...utxo, txHex: other.txHex }] }))).toThrow(/does not match/);
    expect(() => buildSpendPsbt(request({ utxos: [{ ...utxo, value: 99_999n }] }))).toThrow(/stated value/);
    const notVault = testVault(TEST_UNLOCK_TIME + 1);
    const [foreign] = fundVault(notVault, [100_000n]);
    expect(() => buildSpendPsbt(request({ utxos: [foreign] }))).toThrow(/not a vault coin/);
  });

  it('rejects duplicate coins', () => {
    const [utxo] = fundVault(vault, [100_000n]);
    expect(() => buildSpendPsbt(request({ utxos: [utxo, utxo] }))).toThrow(/twice/);
  });

  it('works without the previous transaction (witnessUtxo only)', () => {
    const [utxo] = fundVault(vault, [100_000n]);
    const signed = createSignedSpend(request({ utxos: [{ txid: utxo.txid, vout: 0, value: 100_000n }] }), keys.parent);
    expect(signed.txid).toMatch(/^[0-9a-f]{64}$/);
  });
});
