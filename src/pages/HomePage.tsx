import { Card, LinkButton, NetworkBadge, PageTitle } from '../components/ui';
import { nowSeconds } from '../core';
import { formatUtcDate, timeUntil } from '../lib/format';
import { vaultHref } from '../lib/router';
import { useSavedVaults } from '../lib/vaultStore';

export function HomePage() {
  const vaults = useSavedVaults();
  const now = nowSeconds();

  return (
    <div className="space-y-6">
      <PageTitle lead="Save bitcoin for a child. The parent key can spend at any time. The child key can spend only after the child turns 18.">
        Your vaults
      </PageTitle>

      <div className="flex flex-wrap gap-3">
        <LinkButton href="#/new">Create a vault</LinkButton>
        <LinkButton href="#/import" variant="secondary">
          Open a vault file
        </LinkButton>
      </div>

      {vaults.length === 0 ? (
        <Card title="No vaults on this device yet">
          <p className="text-stone-700">
            Create a vault to get a deposit address, or open a vault file you exported before. New here? Read the{' '}
            <a className="font-semibold text-teal-800 underline" href="#/learn">
              lessons
            </a>{' '}
            first.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {vaults.map(({ id, vault, descriptor }) => {
            const open = now > vault.unlockTime;
            return (
              <li key={id}>
                <a
                  href={vaultHref(vault.network, vault.address)}
                  className="block rounded-xl border border-stone-200 bg-white p-4 no-underline shadow-sm hover:border-teal-600"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold text-stone-900">{descriptor.label || 'Unnamed vault'}</span>
                    <NetworkBadge network={vault.network} />
                  </span>
                  <span className="mt-1 block text-stone-700">
                    {open
                      ? `Child path open since ${formatUtcDate(vault.unlockTime)}`
                      : `Opens for the child on ${formatUtcDate(vault.unlockTime)} (in ${timeUntil(vault.unlockTime, now)})`}
                  </span>
                  <span className="mt-1 block font-mono text-xs break-all text-stone-600">{vault.address}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <Card title="How it works">
        <ol className="list-decimal space-y-2 pl-5 text-stone-700">
          <li>You create two keys in this browser: one for the parent and one for the child. You write both recovery phrases on paper.</li>
          <li>The app builds a Bitcoin script from the two public keys and the child's 18th birthday, and shows its address.</li>
          <li>Anyone can send coins to that address. The parent can move them at any time with the parent key.</li>
          <li>From the 18th birthday on, the child key can move them too. The Bitcoin network enforces the date, not this app.</li>
        </ol>
      </Card>
    </div>
  );
}
