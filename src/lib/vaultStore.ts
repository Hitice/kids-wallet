import { useSyncExternalStore } from 'react';
import { isUiNetwork, parseDescriptor, VaultError, type Vault, type VaultDescriptor } from '../core';

/**
 * Saved vaults. Only public descriptors are stored (keys, unlock time,
 * script, address, optional label). Recovery phrases and private keys are
 * never written to storage.
 */
const STORAGE_KEY = 'kids-wallet:vaults:v1';

export interface SavedVault {
  id: string;
  vault: Vault;
  descriptor: VaultDescriptor;
}

let memory: VaultDescriptor[] | null = null;
let snapshot: SavedVault[] = [];
const listeners = new Set<() => void>();

export function vaultId(network: string, address: string): string {
  return `${network}:${address}`;
}

function readStorage(): VaultDescriptor[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? (data as VaultDescriptor[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(list: VaultDescriptor[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage can be unavailable (private mode, blocked site data). The vault
    // stays in memory for this session; the exported file is the real backup.
  }
}

function rebuild(list: VaultDescriptor[]): SavedVault[] {
  const out: SavedVault[] = [];
  for (const d of list) {
    try {
      const parsed = parseDescriptor(d);
      if (!isUiNetwork(parsed.vault.network)) continue;
      out.push({ id: vaultId(parsed.vault.network, parsed.vault.address), ...parsed });
    } catch {
      // Skip entries that no longer validate.
    }
  }
  return out;
}

function load(): void {
  if (memory === null) {
    memory = readStorage();
    snapshot = rebuild(memory);
  }
}

function commit(list: VaultDescriptor[]): void {
  memory = list;
  snapshot = rebuild(list);
  writeStorage(list);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      memory = null;
      load();
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): SavedVault[] {
  load();
  return snapshot;
}

export function useSavedVaults(): SavedVault[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Validates and saves a descriptor. Returns the saved vault id. */
export function saveVault(descriptor: unknown): SavedVault {
  load();
  const parsed = parseDescriptor(descriptor);
  if (!isUiNetwork(parsed.vault.network)) {
    throw new VaultError('This app only works with signet and testnet vaults.');
  }
  const id = vaultId(parsed.vault.network, parsed.vault.address);
  const rest = (memory ?? []).filter((d) => vaultId(d.network, d.address) !== id);
  commit([...rest, parsed.descriptor]);
  return { id, ...parsed };
}

export function removeVault(id: string): void {
  load();
  commit((memory ?? []).filter((d) => vaultId(d.network, d.address) !== id));
}

export function useSavedVault(network: string, address: string): SavedVault | undefined {
  const vaults = useSavedVaults();
  return vaults.find((v) => v.id === vaultId(network, address));
}
