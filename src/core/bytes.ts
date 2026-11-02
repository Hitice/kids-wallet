import { VaultError } from './errors';

const HEX_RE = /^(?:[0-9a-fA-F]{2})*$/;

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

export function fromHex(hex: string, what = 'value'): Uint8Array {
  const clean = hex.trim();
  if (!HEX_RE.test(clean)) {
    throw new VaultError(`The ${what} is not valid hexadecimal.`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Bitcoin CompactSize (varint) encoding. */
export function encodeCompactSize(n: number): Uint8Array {
  if (!Number.isSafeInteger(n) || n < 0) throw new VaultError('Invalid length.');
  if (n < 0xfd) return Uint8Array.of(n);
  if (n <= 0xffff) return Uint8Array.of(0xfd, n & 0xff, n >>> 8);
  if (n <= 0xffffffff) {
    return Uint8Array.of(0xfe, n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, n >>> 24);
  }
  throw new VaultError('Length too large.');
}

/** Serializes a witness stack (item count, then each item with its length). */
export function serializeWitness(items: Uint8Array[]): Uint8Array {
  return concatBytes(
    encodeCompactSize(items.length),
    ...items.flatMap((item) => [encodeCompactSize(item.length), item]),
  );
}
