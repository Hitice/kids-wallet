import { describe, expect, it } from 'vitest';
import { ApiError, MempoolClient, type FetchLike } from './mempool';

const TXID = 'b2f4f46a3c472a2cb2078759bfe4806ceef5b1406d5432874865b3d2bb126209';

function mockFetch(routes: Record<string, { status?: number; body: string }>, calls: string[] = []): FetchLike {
  return async (url, init) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    const route = routes[url];
    if (!route) return new Response('not found', { status: 404 });
    return new Response(route.body, { status: route.status ?? 200 });
  };
}

describe('MempoolClient', () => {
  it('reads UTXOs from the signet endpoint and converts values to bigint', async () => {
    const calls: string[] = [];
    const client = new MempoolClient(
      'signet',
      mockFetch(
        {
          'https://mempool.space/signet/api/address/tb1qexample/utxo': {
            body: JSON.stringify([
              { txid: TXID, vout: 1, value: 10000, status: { confirmed: true, block_height: 5, block_time: 9 } },
              { txid: TXID, vout: 2, value: 500, status: { confirmed: false } },
            ]),
          },
        },
        calls,
      ),
    );
    const utxos = await client.getUtxos('tb1qexample');
    expect(calls).toEqual(['GET https://mempool.space/signet/api/address/tb1qexample/utxo']);
    expect(utxos).toEqual([
      { txid: TXID, vout: 1, value: 10000n, status: { confirmed: true, blockHeight: 5, blockTime: 9 } },
      { txid: TXID, vout: 2, value: 500n, status: { confirmed: false, blockHeight: undefined, blockTime: undefined } },
    ]);
  });

  it('rejects malformed responses', async () => {
    const client = new MempoolClient(
      'testnet',
      mockFetch({
        'https://mempool.space/testnet/api/address/a/utxo': {
          body: JSON.stringify([{ txid: 'nothex', vout: 0, value: 1, status: { confirmed: true } }]),
        },
        'https://mempool.space/testnet/api/address/b/utxo': { body: '<html>' },
      }),
    );
    await expect(client.getUtxos('a')).rejects.toThrow(ApiError);
    await expect(client.getUtxos('b')).rejects.toThrow(/not valid JSON/);
  });

  it('reports rate limits and node errors in plain words', async () => {
    const client = new MempoolClient(
      'signet',
      mockFetch({
        'https://mempool.space/signet/api/address/a/utxo': { status: 429, body: '' },
        'https://mempool.space/signet/api/tx': {
          status: 400,
          body: 'sendrawtransaction RPC error: {"code":-26,"message":"non-final"}',
        },
      }),
    );
    await expect(client.getUtxos('a')).rejects.toThrow(/rate limiting/);
    await expect(client.broadcast('0200', TXID)).rejects.toThrow(/non-final/);
  });

  it('broadcasts with POST /tx and checks the returned txid', async () => {
    const calls: string[] = [];
    const client = new MempoolClient(
      'signet',
      mockFetch({ 'https://mempool.space/signet/api/tx': { body: TXID } }, calls),
    );
    await expect(client.broadcast('0200', TXID)).resolves.toBe(TXID);
    expect(calls).toEqual(['POST https://mempool.space/signet/api/tx']);
    await expect(client.broadcast('0200', '00'.repeat(32))).rejects.toThrow(/unexpected transaction id/);
  });

  it('reads the tip median time past', async () => {
    const hash = '00000008daaad9516b521e28d78f2114719b61a1e709e17c60f134e8db98c172';
    const client = new MempoolClient(
      'signet',
      mockFetch({
        'https://mempool.space/signet/api/blocks/tip/hash': { body: hash },
        [`https://mempool.space/signet/api/block/${hash}`]: {
          body: JSON.stringify({ id: hash, height: 329073, mediantime: 1793592224, timestamp: 1793594615 }),
        },
      }),
    );
    await expect(client.getTipMedianTime()).resolves.toEqual({ height: 329073, medianTime: 1793592224 });
  });

  it('does not accept networks outside the UI list', () => {
    expect(() => new MempoolClient('mainnet' as never)).toThrow(/No block explorer/);
  });
});
