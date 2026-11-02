import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { EXPLORER_BASE, sumUtxos } from '../api/mempool';
import { Alert, Button, Card, CopyButton, LinkButton, Mono, NetworkBadge, PageTitle, Spinner } from '../components/ui';
import { descriptorToJson, formatBtc, isUiNetwork, nowSeconds, toHex } from '../core';
import { formatLocalDateTime, formatUtcDate, shortHex, timeUntil } from '../lib/format';
import { navigate, withdrawHref } from '../lib/router';
import { useTip, useUtxos } from '../lib/useChainData';
import { removeVault, useSavedVault, type SavedVault } from '../lib/vaultStore';

function downloadJson(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileSlug(label: string | undefined): string {
  const slug = (label ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || 'vault';
}

export function VaultNotFound() {
  return (
    <div className="space-y-4">
      <PageTitle>Vault not found</PageTitle>
      <p className="text-stone-700">This vault is not saved on this device. Open its vault file to see it again.</p>
      <div className="flex flex-wrap gap-3">
        <LinkButton href="#/import">Open a vault file</LinkButton>
        <LinkButton href="#/" variant="secondary">
          Your vaults
        </LinkButton>
      </div>
    </div>
  );
}

export function VaultPage({ network, address }: { network: string; address: string }) {
  const saved = useSavedVault(network, address);
  if (!saved || !isUiNetwork(saved.vault.network)) return <VaultNotFound />;
  return <VaultDetails saved={saved} />;
}

function VaultDetails({ saved }: { saved: SavedVault }) {
  const { vault, descriptor, id } = saved;
  const network = vault.network as 'signet' | 'testnet';
  const [utxos, reloadUtxos] = useUtxos(network, vault.address);
  const [tip] = useTip(network);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const now = nowSeconds();
  const explorer = EXPLORER_BASE[network];

  const medianTime = tip.status === 'ready' ? tip.data.medianTime : null;
  const childOpen = medianTime !== null ? medianTime > vault.unlockTime : now > vault.unlockTime;
  const parentKey = toHex(vault.parentPubKey);
  const childKey = toHex(vault.childPubKey);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <NetworkBadge network={network} />
        </div>
        <PageTitle>{descriptor.label || 'Unnamed vault'}</PageTitle>
      </div>

      {childOpen ? (
        <Alert tone="success" title="The child path is open">
          Since {formatUtcDate(vault.unlockTime)}, 00:00 UTC, both the parent key and the child key can spend. The child
          should move the coins to a wallet of their own: the parent key keeps working after 18.
        </Alert>
      ) : (
        <Alert tone="info" title={`Locked for the child until ${formatUtcDate(vault.unlockTime)}`}>
          {now > vault.unlockTime
            ? 'The date has passed. The network accepts the child path once the median time of the last 11 blocks passes it, usually one to two hours later.'
            : `That is in ${timeUntil(vault.unlockTime, now)}. Until then, only the parent key can spend.`}
        </Alert>
      )}

      <Card title="Balance">
        {utxos.status === 'loading' && <Spinner label="Loading balance from mempool.space" />}
        {utxos.status === 'error' && (
          <div className="space-y-3">
            <Alert tone="error">{utxos.error}</Alert>
            <Button variant="secondary" onClick={reloadUtxos}>
              Try again
            </Button>
          </div>
        )}
        {utxos.status === 'ready' && (
          <div className="space-y-4">
            <p className="text-3xl font-bold tracking-tight text-stone-900">
              {formatBtc(sumUtxos(utxos.data.filter((u) => u.status.confirmed)))}{' '}
              <span className="text-lg font-semibold text-stone-600">test BTC</span>
            </p>
            {utxos.data.some((u) => !u.status.confirmed) && (
              <p className="text-stone-700">
                Waiting for confirmation: {formatBtc(sumUtxos(utxos.data.filter((u) => !u.status.confirmed)))} test BTC
              </p>
            )}
            {utxos.data.length === 0 ? (
              <p className="text-stone-700">No coins yet. Send test coins to the deposit address below.</p>
            ) : (
              <details>
                <summary className="cursor-pointer font-semibold text-teal-800">
                  {utxos.data.length} {utxos.data.length === 1 ? 'coin' : 'coins'}
                </summary>
                <ul className="mt-3 space-y-2">
                  {utxos.data.map((u) => (
                    <li key={`${u.txid}:${u.vout}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-100 px-3 py-2">
                      <a
                        className="font-mono text-sm text-teal-800 underline"
                        href={`${explorer}/tx/${u.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {shortHex(u.txid)}:{u.vout}
                      </a>
                      <span className="text-sm">
                        {formatBtc(u.value)} {u.status.confirmed ? '' : '(unconfirmed)'}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="flex flex-wrap gap-3">
              <LinkButton href={withdrawHref(network, vault.address)}>Withdraw</LinkButton>
              <Button variant="secondary" onClick={reloadUtxos}>
                Refresh
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card title="Deposit address">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="self-center rounded-lg bg-white p-3 ring-1 ring-stone-200 sm:self-start">
            <QRCodeSVG
              value={`bitcoin:${vault.address}`}
              size={176}
              level="M"
              marginSize={2}
              title={`QR code for ${vault.address}`}
            />
          </div>
          <div className="min-w-0 space-y-3">
            <p className="text-stone-700">
              Send {network} coins only. Get free test coins from a {network} faucet. Every deposit adds to the vault.
            </p>
            <p className="rounded-lg bg-stone-100 p-3">
              <Mono className="text-base">{vault.address}</Mono>
            </p>
            <div className="flex flex-wrap gap-3">
              <CopyButton value={vault.address} label="Copy address" />
              <a
                className="inline-flex min-h-11 items-center font-semibold text-teal-800 underline"
                href={`${explorer}/address/${vault.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on mempool.space
              </a>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Vault file">
        <div className="space-y-3">
          <p className="text-stone-700">
            Keep a copy of this file with the recovery phrases. It has no secrets. Without it you would need to remember
            the exact unlock time to rebuild the address.
          </p>
          <Button
            variant="secondary"
            onClick={() => downloadJson(`kids-wallet-${fileSlug(descriptor.label)}-${network}.json`, descriptorToJson(descriptor))}
          >
            Export vault file
          </Button>
        </div>
      </Card>

      <Card title="How this vault works">
        <div className="space-y-3 text-stone-700">
          <p>The address is the hash of this script (P2WSH). The network checks it every time coins move.</p>
          <pre className="overflow-x-auto rounded-lg bg-stone-900 p-3 font-mono text-xs leading-relaxed text-stone-100 sm:text-sm">
{`OP_IF
  <parent key ${shortHex(parentKey, 6)}> OP_CHECKSIG
OP_ELSE
  <${vault.unlockTime}> OP_CHECKLOCKTIMEVERIFY OP_DROP
  <child key ${shortHex(childKey, 6)}> OP_CHECKSIG
OP_ENDIF`}
          </pre>
          <details>
            <summary className="cursor-pointer font-semibold text-teal-800">Technical details</summary>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-sm text-stone-600">Parent public key</dt>
                <dd><Mono>{parentKey}</Mono></dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Child public key</dt>
                <dd><Mono>{childKey}</Mono></dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Unlock time</dt>
                <dd>
                  <Mono>{vault.unlockTime}</Mono> ({new Date(vault.unlockTime * 1000).toISOString()}, your time{' '}
                  {formatLocalDateTime(vault.unlockTime)})
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Witness script</dt>
                <dd><Mono>{toHex(vault.witnessScript)}</Mono></dd>
              </div>
              {descriptor.parentDerivationPath && (
                <div>
                  <dt className="text-sm text-stone-600">Derivation path</dt>
                  <dd><Mono>{descriptor.parentDerivationPath}</Mono></dd>
                </div>
              )}
              {tip.status === 'ready' && (
                <div>
                  <dt className="text-sm text-stone-600">Network median time past</dt>
                  <dd>
                    <Mono>{tip.data.medianTime}</Mono> at block {tip.data.height}
                  </dd>
                </div>
              )}
            </dl>
          </details>
        </div>
      </Card>

      <Card title="Remove from this device">
        {confirmRemove ? (
          <div className="space-y-3">
            <p className="text-stone-700">
              This only removes the saved vault from this browser. The coins stay where they are. Make sure you have the
              vault file before you continue.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="danger"
                onClick={() => {
                  removeVault(id);
                  navigate('#/');
                }}
              >
                Remove vault
              </Button>
              <Button variant="secondary" onClick={() => setConfirmRemove(false)}>
                Keep vault
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmRemove(true)}>
            Remove from this device
          </Button>
        )}
      </Card>
    </div>
  );
}
