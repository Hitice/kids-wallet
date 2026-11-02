/**
 * Minimal client for the public mempool.space Esplora-style REST API.
 * Docs: https://mempool.space/docs/api/rest
 *
 * Responses are untrusted: every field is validated before use, and the
 * previous transactions fetched here are checked against their txid by the
 * core before they are signed.
 */
import { formatBtc, type UiNetworkName, type VaultUtxo } from '../core';

export const API_BASE: Record<UiNetworkName, string> = {
  signet: 'https://mempool.space/signet/api',
  testnet: 'https://mempool.space/testnet/api',
};

export const EXPLORER_BASE: Record<UiNetworkName, string> = {
  signet: 'https://mempool.space/signet',
  testnet: 'https://mempool.space/testnet',
};

const TIMEOUT_MS = 15_000;
const TXID_RE = /^[0-9a-f]{64}$/;
const HEX_RE = /^(?:[0-9a-f]{2})+$/;

export class ApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface UtxoStatus {
  confirmed: boolean;
  blockHeight?: number;
  blockTime?: number;
}

export interface ApiUtxo {
  txid: string;
  vout: number;
  value: bigint;
  status: UtxoStatus;
}

export interface RecommendedFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

function describeHttpError(status: number, body: string): string {
  if (status === 429) return 'The block explorer is rate limiting requests. Wait a minute and try again.';
  const detail = body.trim().slice(0, 300);
  return detail ? `The block explorer returned an error (${status}): ${detail}` : `The block explorer returned HTTP ${status}.`;
}

export class MempoolClient {
  readonly network: UiNetworkName;
  private readonly base: string;
  private readonly fetchFn: FetchLike;

  constructor(network: UiNetworkName, fetchFn: FetchLike = (input, init) => globalThis.fetch(input, init)) {
    if (!Object.hasOwn(API_BASE, network)) throw new ApiError(`No block explorer configured for ${String(network)}.`);
    this.network = network;
    this.base = API_BASE[network];
    this.fetchFn = fetchFn;
  }

  private async request(path: string, init?: RequestInit): Promise<string> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.base}${path}`, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(TIMEOUT_MS),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
        throw new ApiError('The block explorer did not answer in time. Check your connection and try again.');
      }
      throw new ApiError('Could not reach the block explorer. Check your connection and try again.');
    }
    const text = await res.text();
    if (!res.ok) throw new ApiError(describeHttpError(res.status, text), res.status);
    return text;
  }

  private async json(path: string): Promise<unknown> {
    const text = await this.request(path);
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiError('The block explorer sent a response that is not valid JSON.');
    }
  }

  /** GET /address/:address/utxo */
  async getUtxos(address: string): Promise<ApiUtxo[]> {
    const data = await this.json(`/address/${encodeURIComponent(address)}/utxo`);
    if (!Array.isArray(data)) throw new ApiError('Unexpected UTXO list from the block explorer.');
    return data.map((raw): ApiUtxo => {
      const u = raw as Record<string, unknown>;
      const status = (u.status ?? {}) as Record<string, unknown>;
      if (
        typeof u.txid !== 'string' ||
        !TXID_RE.test(u.txid) ||
        !Number.isInteger(u.vout) ||
        !Number.isSafeInteger(u.value) ||
        (u.value as number) <= 0 ||
        typeof status.confirmed !== 'boolean'
      ) {
        throw new ApiError('Unexpected UTXO entry from the block explorer.');
      }
      return {
        txid: u.txid,
        vout: u.vout as number,
        value: BigInt(u.value as number),
        status: {
          confirmed: status.confirmed,
          blockHeight: typeof status.block_height === 'number' ? status.block_height : undefined,
          blockTime: typeof status.block_time === 'number' ? status.block_time : undefined,
        },
      };
    });
  }

  /** GET /tx/:txid/hex */
  async getTxHex(txid: string): Promise<string> {
    if (!TXID_RE.test(txid)) throw new ApiError('Invalid transaction id.');
    const hex = (await this.request(`/tx/${txid}/hex`)).trim().toLowerCase();
    if (!HEX_RE.test(hex)) throw new ApiError('Unexpected transaction data from the block explorer.');
    return hex;
  }

  /** Confirmed UTXOs with their full previous transactions, ready for the PSBT builder. */
  async getSpendableUtxos(address: string): Promise<VaultUtxo[]> {
    const utxos = (await this.getUtxos(address)).filter((u) => u.status.confirmed);
    const hexByTxid = new Map<string, string>();
    for (const txid of new Set(utxos.map((u) => u.txid))) {
      hexByTxid.set(txid, await this.getTxHex(txid));
    }
    return utxos.map((u) => ({ txid: u.txid, vout: u.vout, value: u.value, txHex: hexByTxid.get(u.txid) }));
  }

  /** Median time past of the chain tip (GET /blocks/tip/hash, then GET /block/:hash). */
  async getTipMedianTime(): Promise<{ height: number; medianTime: number }> {
    const hash = (await this.request('/blocks/tip/hash')).trim();
    if (!TXID_RE.test(hash)) throw new ApiError('Unexpected block hash from the block explorer.');
    const block = (await this.json(`/block/${hash}`)) as Record<string, unknown>;
    if (!Number.isSafeInteger(block.height) || !Number.isSafeInteger(block.mediantime)) {
      throw new ApiError('Unexpected block data from the block explorer.');
    }
    return { height: block.height as number, medianTime: block.mediantime as number };
  }

  /** GET /v1/fees/recommended (sat/vB) */
  async getRecommendedFees(): Promise<RecommendedFees> {
    const f = (await this.json('/v1/fees/recommended')) as Record<string, unknown>;
    const keys = ['fastestFee', 'halfHourFee', 'hourFee', 'economyFee', 'minimumFee'] as const;
    for (const k of keys) {
      if (typeof f[k] !== 'number' || !Number.isFinite(f[k]) || (f[k] as number) < 0) {
        throw new ApiError('Unexpected fee data from the block explorer.');
      }
    }
    return f as unknown as RecommendedFees;
  }

  /** POST /tx with the raw transaction hex as the body. Returns the txid. */
  async broadcast(txHex: string, expectedTxid: string): Promise<string> {
    if (!HEX_RE.test(txHex)) throw new ApiError('Invalid transaction hex.');
    const txid = (
      await this.request('/tx', { method: 'POST', body: txHex, headers: { 'Content-Type': 'text/plain' } })
    ).trim();
    if (txid !== expectedTxid) {
      throw new ApiError(`The block explorer answered with an unexpected transaction id: ${txid.slice(0, 80)}`);
    }
    return txid;
  }
}

export function sumUtxos(utxos: { value: bigint }[]): bigint {
  return utxos.reduce((n, u) => n + u.value, 0n);
}

export function formatBalance(utxos: { value: bigint }[]): string {
  return formatBtc(sumUtxos(utxos));
}
