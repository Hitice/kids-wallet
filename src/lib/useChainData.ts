import { useCallback, useEffect, useState } from 'react';
import { ApiError, MempoolClient, type ApiUtxo } from '../api/mempool';
import { isUiNetwork, type NetworkName } from '../core';
import { errorMessage } from './format';

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T };

export function clientFor(network: NetworkName): MempoolClient {
  if (!isUiNetwork(network)) throw new ApiError('This network is not available in the app.');
  return new MempoolClient(network);
}

/**
 * Loads something from the block explorer, with a reload function and
 * stale-response protection. Pages are keyed by route, so a new network or
 * address mounts a fresh hook.
 */
function useLoad<T>(load: () => Promise<T>): [Loadable<T>, () => void] {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data });
      },
      (e: unknown) => {
        if (!cancelled) setState({ status: 'error', error: errorMessage(e) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [load, attempt]);
  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);
  return [state, reload];
}

export function useUtxos(network: NetworkName, address: string): [Loadable<ApiUtxo[]>, () => void] {
  const load = useCallback(() => clientFor(network).getUtxos(address), [network, address]);
  return useLoad(load);
}

export function useTip(network: NetworkName): [Loadable<{ height: number; medianTime: number }>, () => void] {
  const load = useCallback(() => clientFor(network).getTipMedianTime(), [network]);
  return useLoad(load);
}
