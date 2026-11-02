import { useSyncExternalStore } from 'react';

/** Hash routes: nothing about the user ever reaches a server, not even the path. */
export type Route =
  | { name: 'home' }
  | { name: 'vaults' }
  | { name: 'create' }
  | { name: 'import' }
  | { name: 'learn' }
  | { name: 'vault'; network: string; address: string }
  | { name: 'withdraw'; network: string; address: string }
  | { name: 'notFound' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { name: 'home' };
  if (parts.length === 1 && parts[0] === 'vaults') return { name: 'vaults' };
  if (parts.length === 1 && parts[0] === 'new') return { name: 'create' };
  if (parts.length === 1 && parts[0] === 'import') return { name: 'import' };
  if (parts.length === 1 && parts[0] === 'learn') return { name: 'learn' };
  if (parts[0] === 'vault' && parts.length === 3) return { name: 'vault', network: parts[1], address: parts[2] };
  if (parts[0] === 'vault' && parts.length === 4 && parts[3] === 'withdraw') {
    return { name: 'withdraw', network: parts[1], address: parts[2] };
  }
  return { name: 'notFound' };
}

export function vaultHref(network: string, address: string): string {
  return `#/vault/${encodeURIComponent(network)}/${encodeURIComponent(address)}`;
}

export function withdrawHref(network: string, address: string): string {
  return `${vaultHref(network, address)}/withdraw`;
}

export function navigate(href: string): void {
  window.location.hash = href.replace(/^#/, '');
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}
