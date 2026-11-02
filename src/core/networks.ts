import { networks, type Network } from 'bitcoinjs-lib';
import { VaultError } from './errors';

/**
 * Networks known to the core. Mainnet is supported here for completeness,
 * but the UI only offers UI_NETWORKS. The project is educational and unaudited.
 */
export type NetworkName = 'mainnet' | 'testnet' | 'signet' | 'regtest';

export const ALL_NETWORKS: readonly NetworkName[] = ['mainnet', 'testnet', 'signet', 'regtest'];

/** The only networks the user interface can reach. */
export const UI_NETWORKS = ['signet', 'testnet'] as const;
export type UiNetworkName = (typeof UI_NETWORKS)[number];

export function isNetworkName(value: unknown): value is NetworkName {
  return typeof value === 'string' && (ALL_NETWORKS as readonly string[]).includes(value);
}

export function isUiNetwork(value: unknown): value is UiNetworkName {
  return typeof value === 'string' && (UI_NETWORKS as readonly string[]).includes(value);
}

/**
 * bitcoinjs-lib parameters for a network. Signet uses the same address
 * prefixes and key versions as testnet (bech32 "tb").
 */
export function getNetwork(name: NetworkName): Network {
  switch (name) {
    case 'mainnet':
      return networks.bitcoin;
    case 'testnet':
    case 'signet':
      return networks.testnet;
    case 'regtest':
      return networks.regtest;
    default:
      throw new VaultError(`Unknown network: ${String(name)}`);
  }
}

/** BIP44 coin type: 0 for mainnet, 1 for every test network. */
export function coinType(name: NetworkName): 0 | 1 {
  return name === 'mainnet' ? 0 : 1;
}

/**
 * Default BIP32 derivation path for vault keys: m/84'/coin'/0'/0/0.
 * The key is used inside a P2WSH script, not as a P2WPKH address; the BIP84
 * path is reused only so the key can be found again with common tooling.
 */
export function defaultDerivationPath(name: NetworkName): string {
  return `m/84'/${coinType(name)}'/0'/0/0`;
}
