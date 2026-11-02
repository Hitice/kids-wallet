import { useState } from 'react';
import { MnemonicBackup } from '../components/MnemonicBackup';
import { Alert, Button, Card, Field, inputClass, Mono, NetworkBadge, PageTitle } from '../components/ui';
import {
  createVault,
  defaultDerivationPath,
  generateMnemonic,
  parsePublicKey,
  publicKeyFromMnemonic,
  toDescriptor,
  toHex,
  UI_NETWORKS,
  unlockTimeFromBirthDate,
  validateBirthDateForNewVault,
  type UiNetworkName,
  type Vault,
} from '../core';
import { errorMessage, formatUtcDate } from '../lib/format';
import { navigate, vaultHref } from '../lib/router';
import { saveVault } from '../lib/vaultStore';

type Step = 'child' | 'keys' | 'backup' | 'review';
type KeyMode = 'generate' | 'paste';
type Who = 'parent' | 'child';

const STEPS: { id: Step; label: string }[] = [
  { id: 'child', label: 'Child' },
  { id: 'keys', label: 'Keys' },
  { id: 'backup', label: 'Backup' },
  { id: 'review', label: 'Review' },
];

const NETWORK_TEXT: Record<UiNetworkName, string> = {
  signet: 'Signet: a test network with steady blocks. Recommended.',
  testnet: 'Testnet: the older public test network. Blocks can be irregular.',
};

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function StepList({ current, hasBackup }: { current: Step; hasBackup: boolean }) {
  const steps = STEPS.filter((s) => s.id !== 'backup' || hasBackup);
  const index = steps.findIndex((s) => s.id === current);
  return (
    <ol className="flex flex-wrap gap-2 text-sm" aria-label="Steps">
      {steps.map((s, i) => (
        <li
          key={s.id}
          aria-current={s.id === current ? 'step' : undefined}
          className={`rounded-full px-3 py-1 font-medium ${
            s.id === current ? 'bg-teal-700 text-white' : i < index ? 'bg-teal-50 text-teal-900' : 'bg-stone-200 text-stone-700'
          }`}
        >
          {i + 1}. {s.label}
        </li>
      ))}
    </ol>
  );
}

function KeyChoice({
  who,
  mode,
  setMode,
  pubHex,
  setPubHex,
  error,
}: {
  who: Who;
  mode: KeyMode;
  setMode: (m: KeyMode) => void;
  pubHex: string;
  setPubHex: (v: string) => void;
  error: string | null;
}) {
  const name = `${who}-key-mode`;
  const title = who === 'parent' ? 'Parent key' : 'Child key';
  return (
    <fieldset className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
      <legend className="px-1 text-lg font-semibold">{title}</legend>
      <p className="text-stone-700">
        {who === 'parent'
          ? 'Spends the vault at any time. Keep it with the parent.'
          : 'Spends the vault only after the 18th birthday. Keep it sealed for the child until then.'}
      </p>
      <div className="space-y-2">
        <label className="flex items-start gap-3">
          <input
            type="radio"
            name={name}
            className="mt-1 h-5 w-5 accent-teal-700"
            checked={mode === 'generate'}
            onChange={() => setMode('generate')}
          />
          <span>Create a new recovery phrase in this browser</span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="radio"
            name={name}
            className="mt-1 h-5 w-5 accent-teal-700"
            checked={mode === 'paste'}
            onChange={() => setMode('paste')}
          />
          <span>Use an existing public key from another wallet</span>
        </label>
      </div>
      {mode === 'paste' && (
        <Field
          label={`${title}: compressed public key (hex)`}
          hint="66 characters starting with 02 or 03. You will need the matching private key to sign."
          error={error}
        >
          {(props) => (
            <textarea
              {...props}
              rows={2}
              className={`${inputClass} font-mono text-sm`}
              value={pubHex}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setPubHex(e.target.value)}
            />
          )}
        </Field>
      )}
    </fieldset>
  );
}

export function CreateVaultPage() {
  const [step, setStep] = useState<Step>('child');
  const [label, setLabel] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [network, setNetwork] = useState<UiNetworkName>('signet');
  const [birthError, setBirthError] = useState<string | null>(null);

  const [modes, setModes] = useState<Record<Who, KeyMode>>({ parent: 'generate', child: 'generate' });
  const [pasted, setPasted] = useState<Record<Who, string>>({ parent: '', child: '' });
  const [keyErrors, setKeyErrors] = useState<Record<Who, string | null>>({ parent: null, child: null });
  const [formError, setFormError] = useState<string | null>(null);

  // Recovery phrases live only in this component's memory and are dropped on save.
  const [mnemonics, setMnemonics] = useState<Partial<Record<Who, string>>>({});
  const [backedUp, setBackedUp] = useState<Record<Who, boolean>>({ parent: false, child: false });
  const [vault, setVault] = useState<Vault | null>(null);

  const path = defaultDerivationPath(network);
  const hasBackup = modes.parent === 'generate' || modes.child === 'generate';
  const previewUnlock = (() => {
    try {
      return birthDate ? unlockTimeFromBirthDate(birthDate) : null;
    } catch {
      return null;
    }
  })();

  const continueFromChild = () => {
    try {
      validateBirthDateForNewVault(birthDate);
      setBirthError(null);
      setStep('keys');
    } catch (e) {
      setBirthError(errorMessage(e));
    }
  };

  const setMode = (who: Who, mode: KeyMode) => {
    setModes((m) => ({ ...m, [who]: mode }));
    if (mode === 'paste') setMnemonics((m) => ({ ...m, [who]: undefined }));
    setBackedUp((b) => ({ ...b, [who]: false }));
  };

  const continueFromKeys = () => {
    setFormError(null);
    const errors: Record<Who, string | null> = { parent: null, child: null };
    const next: Partial<Record<Who, string>> = { ...mnemonics };
    const pubkeys: Partial<Record<Who, Uint8Array>> = {};
    for (const who of ['parent', 'child'] as const) {
      try {
        if (modes[who] === 'paste') {
          pubkeys[who] = parsePublicKey(pasted[who], `${who} public key`);
        } else {
          next[who] ??= generateMnemonic();
          pubkeys[who] = publicKeyFromMnemonic(next[who], network, path);
        }
      } catch (e) {
        errors[who] = errorMessage(e);
      }
    }
    setKeyErrors(errors);
    if (errors.parent || errors.child || !pubkeys.parent || !pubkeys.child) return;
    try {
      const unlockTime = validateBirthDateForNewVault(birthDate);
      setVault(createVault({ parentPubKey: pubkeys.parent, childPubKey: pubkeys.child, unlockTime }, network));
      setMnemonics(next);
      if (hasBackup) goToBackup();
      else setStep('review');
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  // The backup checks start over each time the backup step is shown.
  const goToBackup = () => {
    setBackedUp({ parent: false, child: false });
    setStep('backup');
  };

  const backupDone = (modes.parent !== 'generate' || backedUp.parent) && (modes.child !== 'generate' || backedUp.child);

  const save = () => {
    if (!vault) return;
    try {
      const descriptor = toDescriptor(vault, {
        label: label.trim() || undefined,
        birthDate,
        parentDerivationPath: modes.parent === 'generate' ? path : undefined,
        childDerivationPath: modes.child === 'generate' ? path : undefined,
      });
      saveVault(descriptor);
      setMnemonics({});
      navigate(vaultHref(vault.network, vault.address));
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle lead="Everything happens in this browser. Nothing is sent to a server.">Create a vault</PageTitle>
      <StepList current={step} hasBackup={hasBackup} />

      {step === 'child' && (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            continueFromChild();
          }}
        >
          <Card>
            <div className="space-y-5">
              <Field label="Child's name or nickname (optional)" hint="Only stored on this device and in the vault file you export.">
                {(props) => (
                  <input
                    {...props}
                    className={inputClass}
                    value={label}
                    maxLength={60}
                    autoComplete="off"
                    onChange={(e) => setLabel(e.target.value)}
                  />
                )}
              </Field>
              <Field
                label="Child's date of birth"
                hint="The child key can spend from the 18th birthday at 00:00 UTC."
                error={birthError}
              >
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    required
                    max={todayLocal()}
                    className={`${inputClass} max-w-xs`}
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                )}
              </Field>
              {previewUnlock !== null && (
                <p className="text-stone-700">
                  The child path opens on <strong>{formatUtcDate(previewUnlock)}</strong> (Unix time{' '}
                  <Mono>{previewUnlock}</Mono>).
                </p>
              )}
              <fieldset className="space-y-2">
                <legend className="font-medium">Network</legend>
                {UI_NETWORKS.map((n) => (
                  <label key={n} className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="network"
                      className="mt-1 h-5 w-5 accent-teal-700"
                      checked={network === n}
                      onChange={() => setNetwork(n)}
                    />
                    <span>{NETWORK_TEXT[n]}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          </Card>
          <div className="flex flex-wrap gap-3">
            <Button type="submit">Continue</Button>
            <a href="#/vaults" className="inline-flex min-h-11 items-center px-2 font-semibold text-teal-800 underline">
              Cancel
            </a>
          </div>
        </form>
      )}

      {step === 'keys' && (
        <div className="space-y-5">
          <KeyChoice
            who="parent"
            mode={modes.parent}
            setMode={(m) => setMode('parent', m)}
            pubHex={pasted.parent}
            setPubHex={(v) => setPasted((p) => ({ ...p, parent: v }))}
            error={keyErrors.parent}
          />
          <KeyChoice
            who="child"
            mode={modes.child}
            setMode={(m) => setMode('child', m)}
            pubHex={pasted.child}
            setPubHex={(v) => setPasted((p) => ({ ...p, child: v }))}
            error={keyErrors.child}
          />
          {formError && <Alert tone="error">{formError}</Alert>}
          <div className="flex flex-wrap gap-3">
            <Button onClick={continueFromKeys}>Continue</Button>
            <Button variant="secondary" onClick={() => setStep('child')}>
              Back
            </Button>
          </div>
        </div>
      )}

      {step === 'backup' && (
        <div className="space-y-5">
          <Alert tone="warning" title="Write the words on paper now">
            This app does not store recovery phrases and will not show them again. Make sure nobody is watching your
            screen and do not take a photo or screenshot. Losing a phrase means losing access to that path.
          </Alert>
          {(['parent', 'child'] as const).map((who) => {
            const m = mnemonics[who];
            if (!m) return null;
            return (
              <MnemonicBackup
                key={`${who}-${m.slice(0, 12)}`}
                who={who}
                mnemonic={m}
                derivationPath={path}
                description={
                  who === 'parent'
                    ? 'Whoever has these words can spend the vault at any time.'
                    : 'Seal this copy for the child. From the 18th birthday on, these words can spend the vault.'
                }
                onDoneChange={(done) => setBackedUp((b) => ({ ...b, [who]: done }))}
              />
            );
          })}
          <div className="flex flex-wrap gap-3">
            <Button disabled={!backupDone} onClick={() => setStep('review')}>
              Continue
            </Button>
            <Button variant="secondary" onClick={() => setStep('keys')}>
              Back
            </Button>
          </div>
          {!backupDone && <p className="text-sm text-stone-600">Confirm each backup above to continue.</p>}
        </div>
      )}

      {step === 'review' && vault && (
        <div className="space-y-5">
          <Card title="Review the vault">
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-stone-600">Name</dt>
                <dd>{label.trim() || 'Unnamed vault'}</dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Network</dt>
                <dd>
                  <NetworkBadge network={vault.network} />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Child path opens</dt>
                <dd>
                  {formatUtcDate(vault.unlockTime)}, 00:00 UTC (Unix time <Mono>{vault.unlockTime}</Mono>)
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Parent public key</dt>
                <dd>
                  <Mono>{toHex(vault.parentPubKey)}</Mono>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Child public key</dt>
                <dd>
                  <Mono>{toHex(vault.childPubKey)}</Mono>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Vault address</dt>
                <dd>
                  <Mono>{vault.address}</Mono>
                </dd>
              </div>
            </dl>
          </Card>
          <Alert tone="info">
            After saving, export the vault file and keep it with the recovery phrases. The file has no secrets, but it
            holds the unlock time, which you need to find the coins again.
          </Alert>
          {formError && <Alert tone="error">{formError}</Alert>}
          <div className="flex flex-wrap gap-3">
            <Button onClick={save}>Save vault</Button>
            <Button variant="secondary" onClick={() => (hasBackup ? goToBackup() : setStep('keys'))}>
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
