import { useState } from 'react';
import { Alert, Button, Card, Field, inputClass, PageTitle } from '../components/ui';
import { isUiNetwork, parseDescriptorJson, VaultError } from '../core';
import { errorMessage } from '../lib/format';
import { navigate, vaultHref } from '../lib/router';
import { saveVault } from '../lib/vaultStore';

const MAX_FILE_BYTES = 64 * 1024;

export function ImportVaultPage() {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const importText = (json: string) => {
    try {
      const { descriptor, vault } = parseDescriptorJson(json);
      if (!isUiNetwork(vault.network)) {
        throw new VaultError('This app only works with signet and testnet vaults.');
      }
      saveVault(descriptor);
      navigate(vaultHref(vault.network, vault.address));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError('This file is too large to be a vault file.');
      return;
    }
    const content = await file.text();
    setText(content);
    importText(content);
  };

  return (
    <div className="space-y-6">
      <PageTitle lead="A vault file holds public data only: the two public keys, the unlock time, the script and the address. It cannot spend coins.">
        Open a vault file
      </PageTitle>
      <Card>
        <div className="space-y-5">
          <Field label="Vault file (.json)">
            {(props) => (
              <input
                {...props}
                type="file"
                accept="application/json,.json"
                className="block w-full text-base file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-stone-200 file:px-4 file:font-semibold file:text-stone-900"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            )}
          </Field>
          <Field label="Or paste the file contents" hint="The app checks that the address and script match the keys and the unlock time.">
            {(props) => (
              <textarea
                {...props}
                rows={8}
                className={`${inputClass} font-mono text-sm`}
                value={text}
                spellCheck={false}
                onChange={(e) => setText(e.target.value)}
              />
            )}
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-wrap gap-3">
            <Button disabled={!text.trim()} onClick={() => importText(text)}>
              Open vault
            </Button>
            <a href="#/" className="inline-flex min-h-11 items-center px-2 font-semibold text-teal-800 underline">
              Cancel
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
