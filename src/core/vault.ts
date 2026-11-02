import { payments } from 'bitcoinjs-lib';
import { equalBytes, fromHex, toHex } from './bytes';
import { VaultError } from './errors';
import { getNetwork, isNetworkName, type NetworkName } from './networks';
import { buildVaultScript, decodeVaultScript, type VaultParams } from './script';
import { parseBirthDate, parsePublicKey } from './validate';

export interface Vault extends VaultParams {
  network: NetworkName;
  witnessScript: Uint8Array;
  /** P2WSH output script: OP_0 <sha256(witnessScript)>. */
  scriptPubKey: Uint8Array;
  address: string;
}

/** Builds the vault (script, output script and address) for a network. */
export function createVault(params: VaultParams, network: NetworkName): Vault {
  const witnessScript = buildVaultScript(params);
  const p2wsh = payments.p2wsh({ redeem: { output: witnessScript }, network: getNetwork(network) });
  if (!p2wsh.address || !p2wsh.output) throw new VaultError('Could not derive the vault address.');
  return {
    parentPubKey: params.parentPubKey,
    childPubKey: params.childPubKey,
    unlockTime: params.unlockTime,
    network,
    witnessScript,
    scriptPubKey: p2wsh.output,
    address: p2wsh.address,
  };
}

/** Rebuilds a vault from its witness script. */
export function vaultFromWitnessScript(witnessScript: Uint8Array, network: NetworkName): Vault {
  return createVault(decodeVaultScript(witnessScript), network);
}

export const DESCRIPTOR_TYPE = 'kids-wallet-vault';
export const DESCRIPTOR_VERSION = 1;

/**
 * Public description of a vault. It holds no secrets: anyone with it can see
 * the balance, but nobody can spend without one of the two private keys.
 */
export interface VaultDescriptor {
  type: typeof DESCRIPTOR_TYPE;
  version: typeof DESCRIPTOR_VERSION;
  network: NetworkName;
  /** Optional label chosen by the parent, kept only in this browser and in exported files. */
  label?: string;
  /** Optional birth date (YYYY-MM-DD) the unlock time was computed from. */
  birthDate?: string;
  parentPubKey: string;
  childPubKey: string;
  unlockTime: number;
  /** ISO 8601 form of unlockTime, for people reading the file. */
  unlockDate: string;
  witnessScript: string;
  address: string;
  /** BIP32 paths used when the keys were generated in this app, for recovery. */
  parentDerivationPath?: string;
  childDerivationPath?: string;
}

export interface DescriptorMeta {
  label?: string;
  birthDate?: string;
  parentDerivationPath?: string;
  childDerivationPath?: string;
}

export function toDescriptor(vault: Vault, meta: DescriptorMeta = {}): VaultDescriptor {
  const d: VaultDescriptor = {
    type: DESCRIPTOR_TYPE,
    version: DESCRIPTOR_VERSION,
    network: vault.network,
    parentPubKey: toHex(vault.parentPubKey),
    childPubKey: toHex(vault.childPubKey),
    unlockTime: vault.unlockTime,
    unlockDate: new Date(vault.unlockTime * 1000).toISOString(),
    witnessScript: toHex(vault.witnessScript),
    address: vault.address,
  };
  if (meta.label) d.label = meta.label;
  if (meta.birthDate) d.birthDate = meta.birthDate;
  if (meta.parentDerivationPath) d.parentDerivationPath = meta.parentDerivationPath;
  if (meta.childDerivationPath) d.childDerivationPath = meta.childDerivationPath;
  return d;
}

const MAX_LABEL_LENGTH = 60;
const PATH_RE = /^m(\/\d+'?)+$/;

function optionalString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'string') throw new VaultError(`The field "${key}" must be text.`);
  return v;
}

/**
 * Validates an untrusted descriptor (for example an imported JSON file) and
 * rebuilds the vault from its keys and unlock time. The stored script and
 * address must match the rebuilt ones exactly.
 */
export function parseDescriptor(input: unknown): { vault: Vault; descriptor: VaultDescriptor } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new VaultError('The vault file is not a JSON object.');
  }
  const obj = input as Record<string, unknown>;
  if (obj.type !== DESCRIPTOR_TYPE) throw new VaultError('This file is not a Kids Wallet vault.');
  if (obj.version !== DESCRIPTOR_VERSION) {
    throw new VaultError(`Unsupported vault file version: ${String(obj.version)}.`);
  }
  if (!isNetworkName(obj.network)) throw new VaultError('The vault file has an unknown network.');
  if (typeof obj.unlockTime !== 'number') throw new VaultError('The vault file has no unlock time.');
  if (typeof obj.parentPubKey !== 'string' || typeof obj.childPubKey !== 'string') {
    throw new VaultError('The vault file is missing a public key.');
  }
  const vault = createVault(
    {
      parentPubKey: parsePublicKey(obj.parentPubKey, 'parent public key'),
      childPubKey: parsePublicKey(obj.childPubKey, 'child public key'),
      unlockTime: obj.unlockTime,
    },
    obj.network,
  );
  const witnessScript = optionalString(obj, 'witnessScript');
  if (witnessScript !== undefined && !equalBytes(fromHex(witnessScript, 'witness script'), vault.witnessScript)) {
    throw new VaultError('The witness script in the file does not match its keys and unlock time.');
  }
  const address = optionalString(obj, 'address');
  if (address !== undefined && address !== vault.address) {
    throw new VaultError('The address in the file does not match its keys and unlock time.');
  }
  const label = optionalString(obj, 'label');
  if (label !== undefined && label.length > MAX_LABEL_LENGTH) {
    throw new VaultError(`The label can have at most ${MAX_LABEL_LENGTH} characters.`);
  }
  const birthDate = optionalString(obj, 'birthDate');
  if (birthDate !== undefined) parseBirthDate(birthDate);
  const parentDerivationPath = optionalString(obj, 'parentDerivationPath');
  const childDerivationPath = optionalString(obj, 'childDerivationPath');
  for (const p of [parentDerivationPath, childDerivationPath]) {
    if (p !== undefined && !PATH_RE.test(p)) throw new VaultError('The vault file has an invalid derivation path.');
  }
  return {
    vault,
    descriptor: toDescriptor(vault, { label, birthDate, parentDerivationPath, childDerivationPath }),
  };
}

export function parseDescriptorJson(text: string): { vault: Vault; descriptor: VaultDescriptor } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new VaultError('The vault file is not valid JSON.');
  }
  return parseDescriptor(data);
}

export function descriptorToJson(descriptor: VaultDescriptor): string {
  return `${JSON.stringify(descriptor, null, 2)}\n`;
}
