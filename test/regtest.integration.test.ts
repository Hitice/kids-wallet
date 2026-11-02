/**
 * Optional end-to-end test against a local bitcoind in regtest mode.
 * Skipped unless BITCOIND_RPC_URL is set, for example:
 *
 *   bitcoind -regtest -daemon -rpcuser=kids -rpcpassword=wallet -fallbackfee=0.0002
 *   BITCOIND_RPC_URL=http://kids:wallet@127.0.0.1:18443 npm test
 *
 * No wallet is needed on the node: the test mines to a P2WPKH address of a
 * public test mnemonic and funds the vaults from that coinbase itself.
 * It refuses to run on any chain other than regtest.
 */
import { payments, Psbt, Transaction } from 'bitcoinjs-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { getNetwork } from '../src/core/networks';
import { createSignedSpend, type VaultUtxo } from '../src/core/psbt';
import { fundVault, TEST_UNLOCK_TIME, testKeys, testVault } from '../src/core/test-fixtures';
import type { Vault } from '../src/core/vault';

const RPC_URL = process.env.BITCOIND_RPC_URL;

interface RpcTarget {
  url: string;
  auth?: string;
}

function rpcTarget(raw: string): RpcTarget {
  const u = new URL(raw);
  const auth = u.username ? Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString('base64') : undefined;
  u.username = '';
  u.password = '';
  return { url: u.toString(), auth };
}

async function rpc<T>(target: RpcTarget, method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(target.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(target.auth ? { Authorization: `Basic ${target.auth}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '1.0', id: method, method, params }),
  });
  const body = (await res.json()) as { result: T; error: { message: string } | null };
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

describe.skipIf(!RPC_URL)('regtest integration (bitcoind)', () => {
  const target = rpcTarget(RPC_URL ?? 'http://127.0.0.1:18443');
  const network = getNetwork('regtest');
  const keys = testKeys('regtest');
  const funder = payments.p2wpkh({ pubkey: keys.other.publicKey, network });
  const minerAddress = funder.address as string;

  let unlockedVault: Vault; // unlock time already in the past (by median time past)
  let lockedVault: Vault; // unlock time 2038-06-15
  let unlockedUtxos: VaultUtxo[];
  let lockedUtxos: VaultUtxo[];
  let medianTime: number;

  const mine = (n: number) => rpc<string[]>(target, 'generatetoaddress', [n, minerAddress]);
  const accept = async (hex: string) =>
    (await rpc<{ allowed: boolean; 'reject-reason'?: string }[]>(target, 'testmempoolaccept', [[hex]]))[0];

  async function fund(vault: Vault, values: bigint[], coinbaseBlock: string): Promise<VaultUtxo[]> {
    const block = await rpc<{ tx: string[] }>(target, 'getblock', [coinbaseBlock, 1]);
    const coinbaseHex = await rpc<string>(target, 'getrawtransaction', [block.tx[0], false, coinbaseBlock]);
    const coinbase = Transaction.fromHex(coinbaseHex);
    const value = coinbase.outs[0].value;
    const psbt = new Psbt({ network });
    psbt.addInput({ hash: block.tx[0], index: 0, witnessUtxo: { script: funder.output as Uint8Array, value } });
    for (const v of values) psbt.addOutput({ script: vault.scriptPubKey, value: v });
    const fee = 10_000n;
    psbt.addOutput({ script: funder.output as Uint8Array, value: value - values.reduce((a, b) => a + b, 0n) - fee });
    psbt.signInput(0, keys.other);
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    await rpc<string>(target, 'sendrawtransaction', [tx.toHex()]);
    await mine(1);
    const txid = tx.getId();
    return values.map((v, vout) => ({ txid, vout, value: v, txHex: tx.toHex() }));
  }

  beforeAll(async () => {
    const info = await rpc<{ chain: string; mediantime: number }>(target, 'getblockchaininfo');
    if (info.chain !== 'regtest') throw new Error(`Refusing to run on chain "${info.chain}": regtest only.`);
    const hashes = await mine(102);
    const tip = await rpc<{ chain: string; mediantime: number }>(target, 'getblockchaininfo');
    medianTime = tip.mediantime;
    unlockedVault = testVault(medianTime - 86_400, 'regtest');
    lockedVault = testVault(TEST_UNLOCK_TIME, 'regtest');
    unlockedUtxos = await fund(unlockedVault, [100_000_000n, 50_000_000n], hashes[0]);
    lockedUtxos = await fund(lockedVault, [100_000_000n, 50_000_000n], hashes[1]);
  }, 120_000);

  it('the fixture helper and the node agree on the vault output script', () => {
    const [local] = fundVault(lockedVault, [1n]);
    expect(Transaction.fromHex(local.txHex as string).outs[0].script).toEqual(lockedVault.scriptPubKey);
  });

  it('rejects a child-path spend before the unlock time (non-final)', async () => {
    // Bypass the local check on purpose to show that consensus enforces the lock.
    const spend = createSignedSpend(
      { vault: lockedVault, path: 'child', utxos: [lockedUtxos[0]], destination: minerAddress, feeRate: 2, now: TEST_UNLOCK_TIME + 1 },
      keys.child,
    );
    const result = await accept(spend.hex);
    expect(result.allowed).toBe(false);
    expect(result['reject-reason']).toMatch(/non-final/);
  });

  it('accepts and mines a parent-path spend before the unlock time', async () => {
    const spend = createSignedSpend(
      { vault: lockedVault, path: 'parent', utxos: [lockedUtxos[1]], destination: minerAddress, feeRate: 2, now: medianTime },
      keys.parent,
    );
    expect((await accept(spend.hex)).allowed).toBe(true);
    expect(await rpc<string>(target, 'sendrawtransaction', [spend.hex])).toBe(spend.txid);
    const [blockHash] = await mine(1);
    const block = await rpc<{ tx: string[] }>(target, 'getblock', [blockHash, 1]);
    expect(block.tx).toContain(spend.txid);
  });

  it('accepts and mines a child-path spend once median time past is beyond the unlock time', async () => {
    const spend = createSignedSpend(
      { vault: unlockedVault, path: 'child', utxos: [unlockedUtxos[0]], destination: minerAddress, feeRate: 2, now: medianTime },
      keys.child,
    );
    expect((await accept(spend.hex)).allowed).toBe(true);
    expect(await rpc<string>(target, 'sendrawtransaction', [spend.hex])).toBe(spend.txid);
    const [blockHash] = await mine(1);
    const block = await rpc<{ tx: string[] }>(target, 'getblock', [blockHash, 1]);
    expect(block.tx).toContain(spend.txid);
  });

  it('still accepts the parent path after the unlock time', async () => {
    const spend = createSignedSpend(
      { vault: unlockedVault, path: 'parent', utxos: [unlockedUtxos[1]], destination: minerAddress, feeRate: 2, amount: 10_000_000n, now: medianTime },
      keys.parent,
    );
    expect((await accept(spend.hex)).allowed).toBe(true);
  });
});
