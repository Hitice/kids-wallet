import { useEffect, useState } from 'react';
import { EXPLORER_BASE } from '../api/mempool';
import { Alert, Button, Card, CopyButton, Field, inputClass, Mono, NetworkBadge, PageTitle, Spinner } from '../components/ui';
import {
  createSignedSpend,
  defaultDerivationPath,
  formatBtc,
  isUiNetwork,
  keyFromMnemonic,
  keyFromWif,
  MAX_FEE_RATE,
  MIN_FEE_RATE,
  nowSeconds,
  parseBtcAmount,
  VaultError,
  type SignedSpend,
  type SpendPath,
  type SpendPlan,
  type UiNetworkName,
} from '../core';
import { errorMessage, formatUtcDate } from '../lib/format';
import { vaultHref } from '../lib/router';
import { clientFor, useTip } from '../lib/useChainData';
import { useSavedVault, type SavedVault } from '../lib/vaultStore';
import { VaultNotFound } from './VaultPage';

type KeyMethod = 'mnemonic' | 'wif';

interface Result {
  signed: SignedSpend;
  plan: SpendPlan;
  destination: string;
}

export function WithdrawPage({ network, address }: { network: string; address: string }) {
  const saved = useSavedVault(network, address);
  if (!saved || !isUiNetwork(saved.vault.network)) return <VaultNotFound />;
  return <WithdrawForm saved={saved} />;
}

function WithdrawForm({ saved }: { saved: SavedVault }) {
  const { vault, descriptor } = saved;
  const network = vault.network as UiNetworkName;
  const explorer = EXPLORER_BASE[network];
  const [tip, reloadTip] = useTip(network);

  const [path, setPath] = useState<SpendPath>('parent');
  const [destination, setDestination] = useState('');
  const [sendAll, setSendAll] = useState(true);
  const [amountText, setAmountText] = useState('');
  const [feeRateText, setFeeRateText] = useState('');
  const [suggestedFee, setSuggestedFee] = useState<number | null>(null);
  const [keyMethod, setKeyMethod] = useState<KeyMethod>('mnemonic');
  // The secret lives only in this component state and is cleared right after signing.
  const [secret, setSecret] = useState('');
  const storedPath = path === 'parent' ? descriptor.parentDerivationPath : descriptor.childDerivationPath;
  const [derivationPath, setDerivationPath] = useState(storedPath ?? defaultDerivationPath(network));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [checked, setChecked] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [sentTxid, setSentTxid] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    clientFor(network)
      .getRecommendedFees()
      .then((fees) => {
        if (cancelled) return;
        const rate = Math.min(MAX_FEE_RATE, Math.max(MIN_FEE_RATE, Math.ceil(fees.halfHourFee)));
        setSuggestedFee(rate);
        setFeeRateText((current) => current || String(rate));
      })
      .catch(() => {
        if (!cancelled) setFeeRateText((current) => current || '2');
      });
    return () => {
      cancelled = true;
    };
  }, [network]);

  const medianTime = tip.status === 'ready' ? tip.data.medianTime : null;
  const childLocked = path === 'child' && (medianTime === null || medianTime <= vault.unlockTime);
  const pastDateButNotMtp = nowSeconds() > vault.unlockTime;

  const choosePath = (p: SpendPath) => {
    setPath(p);
    setResult(null);
    setError(null);
    const stored = p === 'parent' ? descriptor.parentDerivationPath : descriptor.childDerivationPath;
    setDerivationPath(stored ?? defaultDerivationPath(network));
  };

  const buildAndSign = async () => {
    setError(null);
    setResult(null);
    setChecked(false);
    setBroadcastError(null);
    setSentTxid(null);
    setBusy(true);
    try {
      const feeRate = Number(feeRateText);
      const amount = sendAll ? undefined : parseBtcAmount(amountText);
      if (!secret.trim()) {
        throw new VaultError(keyMethod === 'mnemonic' ? 'Enter the recovery phrase.' : 'Enter the private key.');
      }
      const client = clientFor(network);
      // The median time past decides when the child path opens, so fetch it fresh.
      const [utxos, freshTip] = await Promise.all([client.getSpendableUtxos(vault.address), client.getTipMedianTime()]);
      const signer =
        keyMethod === 'mnemonic' ? keyFromMnemonic(secret, network, derivationPath) : keyFromWif(secret, network);
      const signed = createSignedSpend(
        { vault, path, utxos, destination: destination.trim(), feeRate, amount, now: freshTip.medianTime },
        signer,
      );
      setSecret('');
      setResult({ signed, plan: signed.plan, destination: destination.trim() });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const broadcast = async () => {
    if (!result) return;
    setBroadcasting(true);
    setBroadcastError(null);
    try {
      const txid = await clientFor(network).broadcast(result.signed.hex, result.signed.txid);
      setSentTxid(txid);
    } catch (e) {
      setBroadcastError(errorMessage(e));
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <NetworkBadge network={network} />
        <PageTitle lead="The transaction is built and signed in this browser. It is sent to the network only when you press Broadcast.">
          Withdraw from {descriptor.label || 'this vault'}
        </PageTitle>
        <a className="font-semibold text-teal-800 underline" href={vaultHref(network, vault.address)}>
          Back to the vault
        </a>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void buildAndSign();
        }}
      >
        <fieldset className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <legend className="px-1 text-lg font-semibold">Who is spending?</legend>
          <label className="flex items-start gap-3">
            <input
              type="radio"
              name="path"
              className="mt-1 h-5 w-5 accent-teal-700"
              checked={path === 'parent'}
              onChange={() => choosePath('parent')}
            />
            <span>
              <span className="block font-medium">Parent, now</span>
              <span className="block text-sm text-stone-600">Signed with the parent key. Works at any time.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="radio"
              name="path"
              className="mt-1 h-5 w-5 accent-teal-700"
              checked={path === 'child'}
              onChange={() => choosePath('child')}
            />
            <span>
              <span className="block font-medium">Child, after {formatUtcDate(vault.unlockTime)}</span>
              <span className="block text-sm text-stone-600">Signed with the child key. Works only after the unlock time.</span>
            </span>
          </label>
          {path === 'child' && tip.status === 'loading' && <Spinner label="Checking the network time" />}
          {path === 'child' && tip.status === 'error' && (
            <div className="space-y-2">
              <Alert tone="error">Could not read the network time: {tip.error}</Alert>
              <Button variant="secondary" onClick={reloadTip}>
                Try again
              </Button>
            </div>
          )}
          {childLocked && tip.status === 'ready' && (
            <Alert tone="warning" title="The child path is still locked">
              {pastDateButNotMtp
                ? `The unlock date has passed, but the network has not caught up yet. Bitcoin compares the lock with the median time of the last 11 blocks (now ${new Date(tip.data.medianTime * 1000).toISOString()}). Try again in an hour or two.`
                : `It opens on ${formatUtcDate(vault.unlockTime)} at 00:00 UTC, about one to two hours later by network time. Until then only the parent key can spend.`}
            </Alert>
          )}
        </fieldset>

        <Card>
          <div className="space-y-5">
            <Field label="Destination address" hint={`A ${network} address. Check it twice: Bitcoin payments cannot be reversed.`}>
              {(props) => (
                <input
                  {...props}
                  className={`${inputClass} font-mono text-sm`}
                  value={destination}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  onChange={(e) => setDestination(e.target.value)}
                />
              )}
            </Field>

            <div className="space-y-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-teal-700"
                  checked={sendAll}
                  onChange={(e) => setSendAll(e.target.checked)}
                />
                <span>Send the whole confirmed balance (minus the fee)</span>
              </label>
              {!sendAll && (
                <Field label="Amount (BTC)" hint="Any change goes back to the vault address and stays locked.">
                  {(props) => (
                    <input
                      {...props}
                      inputMode="decimal"
                      className={`${inputClass} max-w-xs font-mono`}
                      value={amountText}
                      placeholder="0.001"
                      autoComplete="off"
                      onChange={(e) => setAmountText(e.target.value)}
                    />
                  )}
                </Field>
              )}
            </div>

            <Field
              label="Fee rate (sat/vB)"
              hint={
                suggestedFee !== null
                  ? `Suggested now by mempool.space: ${suggestedFee} sat/vB.`
                  : `Between ${MIN_FEE_RATE} and ${MAX_FEE_RATE} sat/vB.`
              }
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  min={MIN_FEE_RATE}
                  max={MAX_FEE_RATE}
                  step="0.1"
                  inputMode="decimal"
                  className={`${inputClass} max-w-32`}
                  value={feeRateText}
                  required
                  onChange={(e) => setFeeRateText(e.target.value)}
                />
              )}
            </Field>
          </div>
        </Card>

        <fieldset className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <legend className="px-1 text-lg font-semibold">{path === 'parent' ? 'Parent key' : 'Child key'}</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="key-method"
                className="h-5 w-5 accent-teal-700"
                checked={keyMethod === 'mnemonic'}
                onChange={() => setKeyMethod('mnemonic')}
              />
              Recovery phrase
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="key-method"
                className="h-5 w-5 accent-teal-700"
                checked={keyMethod === 'wif'}
                onChange={() => setKeyMethod('wif')}
              />
              Private key (WIF)
            </label>
          </div>
          {keyMethod === 'mnemonic' ? (
            <>
              <Field
                label={`${path === 'parent' ? 'Parent' : 'Child'} recovery phrase`}
                hint="12 or 24 words separated by spaces. It is used once to sign and then cleared."
              >
                {(props) => (
                  <textarea
                    {...props}
                    rows={3}
                    className={`${inputClass} font-mono`}
                    value={secret}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => setSecret(e.target.value)}
                  />
                )}
              </Field>
              <details>
                <summary className="cursor-pointer font-semibold text-teal-800">Derivation path</summary>
                <div className="mt-3">
                  <Field label="BIP32 path" hint="Change it only if the key came from another wallet.">
                    {(props) => (
                      <input
                        {...props}
                        className={`${inputClass} max-w-xs font-mono`}
                        value={derivationPath}
                        spellCheck={false}
                        onChange={(e) => setDerivationPath(e.target.value)}
                      />
                    )}
                  </Field>
                </div>
              </details>
            </>
          ) : (
            <Field label="Private key in WIF format" hint="Used once to sign and then cleared.">
              {(props) => (
                <input
                  {...props}
                  type="password"
                  className={`${inputClass} font-mono`}
                  value={secret}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setSecret(e.target.value)}
                />
              )}
            </Field>
          )}
        </fieldset>

        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" disabled={busy || childLocked}>
          {busy ? 'Building...' : 'Build and sign'}
        </Button>
      </form>

      {result && (
        <Card title="Signed transaction">
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-stone-600">Sends</dt>
                <dd className="font-semibold">{formatBtc(result.plan.sendAmount)} BTC</dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Fee</dt>
                <dd>
                  {result.signed.fee.toString()} sats ({(Number(result.signed.fee) / result.signed.vsize).toFixed(1)} sat/vB,{' '}
                  {result.signed.vsize} vB)
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-stone-600">To</dt>
                <dd>
                  <Mono>{result.destination}</Mono>
                </dd>
              </div>
              {result.plan.change > 0n && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-stone-600">Change back to the vault</dt>
                  <dd>{formatBtc(result.plan.change)} BTC</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-stone-600">Lock time / sequence</dt>
                <dd>
                  <Mono>
                    {result.plan.lockTime} / 0x{result.plan.sequence.toString(16)}
                  </Mono>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Coins used</dt>
                <dd>{result.plan.inputs.length}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-stone-600">Transaction id</dt>
                <dd>
                  <Mono>{result.signed.txid}</Mono>
                </dd>
              </div>
            </dl>
            <Field label="Raw transaction (hex)">
              {(props) => (
                <textarea
                  {...props}
                  readOnly
                  rows={5}
                  className={`${inputClass} font-mono text-xs`}
                  value={result.signed.hex}
                />
              )}
            </Field>
            <CopyButton value={result.signed.hex} label="Copy raw transaction" />

            {sentTxid ? (
              <Alert tone="success" title="Broadcast done">
                The network accepted the transaction.{' '}
                <a className="font-semibold underline" href={`${explorer}/tx/${sentTxid}`} target="_blank" rel="noopener noreferrer">
                  Follow it on mempool.space
                </a>
                .
              </Alert>
            ) : (
              <div className="space-y-3 border-t border-stone-200 pt-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-teal-700"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                  />
                  <span>I checked the destination address and the amount. I understand this cannot be undone.</span>
                </label>
                {broadcastError && <Alert tone="error">{broadcastError}</Alert>}
                <Button disabled={!checked || broadcasting} onClick={() => void broadcast()}>
                  {broadcasting ? 'Broadcasting...' : 'Broadcast'}
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
