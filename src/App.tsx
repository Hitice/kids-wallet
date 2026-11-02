import { useEffect, useRef } from 'react';
import { parseRoute, useHash, type Route } from './lib/router';
import { CreateVaultPage } from './pages/CreateVaultPage';
import { HomePage } from './pages/HomePage';
import { ImportVaultPage } from './pages/ImportVaultPage';
import { LearnPage } from './pages/LearnPage';
import { VaultPage } from './pages/VaultPage';
import { WithdrawPage } from './pages/WithdrawPage';

function routeKey(route: Route): string {
  return 'address' in route ? `${route.name}:${route.network}:${route.address}` : route.name;
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomePage />;
    case 'create':
      return <CreateVaultPage />;
    case 'import':
      return <ImportVaultPage />;
    case 'learn':
      return <LearnPage />;
    case 'vault':
      return <VaultPage network={route.network} address={route.address} />;
    case 'withdraw':
      return <WithdrawPage network={route.network} address={route.address} />;
    default:
      return (
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <a className="font-semibold text-teal-800 underline" href="#/">
            Go to your vaults
          </a>
        </div>
      );
  }
}

const NAV = [
  { href: '#/', label: 'Vaults', match: ['home', 'create', 'import', 'vault', 'withdraw'] },
  { href: '#/learn', label: 'Learn', match: ['learn'] },
];

export function App() {
  const hash = useHash();
  const route = parseRoute(hash);
  const key = routeKey(route);
  const mainRef = useRef<HTMLElement>(null);

  // Move focus to the new page so keyboard and screen reader users start at its top.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus();
  }, [key]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">
        Educational test app. Signet and testnet only: these coins have no value.
      </div>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <a href="#/" className="flex items-center gap-2 no-underline">
            <img src="./favicon.svg" alt="" width={32} height={32} />
            <span>
              <span className="block text-lg leading-tight font-bold text-stone-900">Kids Wallet</span>
              <span className="block text-xs text-stone-600">Bitcoin Is Everyone's Legacy</span>
            </span>
          </a>
          <nav aria-label="Main">
            <ul className="flex gap-1">
              {NAV.map((item) => {
                const active = item.match.includes(route.name);
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`inline-flex min-h-11 items-center rounded-lg px-3 font-semibold no-underline ${
                        active ? 'bg-teal-50 text-teal-900' : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 outline-none sm:py-8">
        <Page key={key} route={route} />
      </main>
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl space-y-1 px-4 py-4 text-sm text-stone-600">
          <p>
            Unaudited and for learning only. Keys are created and used inside this page and are never sent anywhere. The
            only network requests go to the public mempool.space API.
          </p>
          <p>
            <a className="underline" href="https://github.com/Hitice/kids-wallet" rel="noopener noreferrer" target="_blank">
              Source code on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
