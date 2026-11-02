import { useId, useState, type ReactNode } from 'react';
import {
  ArrowIcon,
  ChildWithChest,
  GlobeWithHearts,
  GrowingPlant,
  LockIcon,
  NoEntryIcon,
  OwlTutor,
} from '../components/illustrations';
import { Button, CopyButton, LinkButton } from '../components/ui';
import { rfcPath, STATUS_ITEMS, STATUS_LABEL, type Status } from '../content/status';
import { AGE_BANDS, ageBand, type AgeBandId, type Exchange } from '../content/tutor';

const REPO = 'https://github.com/Hitice/kids-wallet';
const RFCS_URL = `${REPO}/tree/main/docs/rfcs`;

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  className = '',
}: {
  id: string;
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-4 space-y-6 ${className}`}>
      <header className="space-y-2">
        {eyebrow && <p className="text-sm font-bold tracking-wide text-teal-800 uppercase">{eyebrow}</p>}
        <h2 id={`${id}-title`} className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          {title}
        </h2>
        {lead && <div className="max-w-prose text-lg leading-relaxed text-stone-800">{lead}</div>}
      </header>
      {children}
    </section>
  );
}

function ExternalLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} rel="noopener noreferrer" target="_blank" className={`font-semibold text-teal-800 underline underline-offset-4 ${className}`}>
      {children}
    </a>
  );
}

/* ---------------------------------------------------------------- hero */

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="grid items-center gap-8 sm:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        <p className="inline-flex rounded-full bg-teal-100 px-4 py-1.5 text-sm font-bold text-teal-900">
          Open source, in public design
        </p>
        <h1 id="hero-title" className="text-4xl leading-tight font-extrabold tracking-tight text-stone-900 sm:text-6xl">
          Bitcoin Is Everyone&apos;s Legacy
        </h1>
        <p className="max-w-prose text-xl leading-relaxed text-stone-800">
          Kids Wallet is a vault that parents, grandparents and friends can fill for a child, and that only the child
          can open, at 18. The app grows with the child, from cartoons to a hand-over ceremony. A tutor walks beside
          them the whole way.
        </p>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="#/new" className="px-6 text-lg">
            Try the demo vault
          </LinkButton>
          <a
            href={RFCS_URL}
            rel="noopener noreferrer"
            target="_blank"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-6 py-2 text-lg font-semibold text-stone-900 no-underline ring-1 ring-stone-300 ring-inset transition-colors hover:bg-stone-100"
          >
            Read the RFCs
          </a>
        </div>
        <p className="text-base text-stone-700">
          The demo runs on signet, where coins have no value. Keys are created in your browser and never leave it.
        </p>
      </div>
      <ChildWithChest className="mx-auto w-full max-w-xs sm:max-w-sm" title="A child kneeling next to an open treasure chest full of coins" />
    </section>
  );
}

/* ------------------------------------------------------------ age bands */

const BANDS: { band: AgeBandId; age: string; title: string; text: string; stage: 0 | 1 | 2 | 3 }[] = [
  {
    band: '6-9',
    age: '6 to 9',
    title: 'Cartoons and mini-games',
    text: 'A treasure chest that fills up, short stories, and games about saving and about secrets you never share.',
    stage: 0,
  },
  {
    band: '10-13',
    age: '10 to 13',
    title: 'Challenges',
    text: 'Weekly challenges, quizzes and honest answers to why. At 12, the first growth ceremony moves part of the key toward the child.',
    stage: 1,
  },
  {
    band: '14-17',
    age: '14 to 17',
    title: 'Real-world money',
    text: 'Budgets, a first job, scams, what a bank does and what self-custody means. At 16, the second ceremony.',
    stage: 2,
  },
  {
    band: '18',
    age: '18',
    title: 'Hand-over ceremony',
    text: 'The Bitcoin script opens the child path. The tutor walks through each step. The young adult takes full control.',
    stage: 3,
  },
];

function Grows() {
  return (
    <Section
      id="grows"
      eyebrow="Ages 6 to 18"
      title="How it grows with the child"
      lead="One vault, one tutor, twelve years. What the child sees changes with their age. The rules of the vault do not."
    >
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BANDS.map((b) => (
          <li key={b.band} className="flex flex-col rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-sm">
            <GrowingPlant stage={b.stage} className="mx-auto h-28 w-24" />
            <p className="mt-3 text-sm font-bold tracking-wide text-amber-800 uppercase">Age {b.age}</p>
            <h3 className="mt-1 text-xl font-bold text-stone-900">{b.title}</h3>
            <p className="mt-2 leading-relaxed text-stone-800">{b.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ---------------------------------------------------------- vault rules */

function Door({ tone, icon, title, children }: { tone: 'open' | 'wait'; icon: ReactNode; title: string; children: ReactNode }) {
  const colors = tone === 'open' ? 'border-emerald-400 bg-emerald-50 text-emerald-950' : 'border-amber-400 bg-amber-50 text-amber-950';
  return (
    <li className={`flex gap-3 rounded-2xl border-2 p-4 ${colors}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <span className="block text-lg font-bold">{title}</span>
        <span className="block leading-relaxed">{children}</span>
      </span>
    </li>
  );
}

function WhyParentsCannot() {
  return (
    <Section
      id="why"
      eyebrow="Security is the premise"
      title="Why parents cannot touch it"
      lead={
        <p>
          The vault is a small Bitcoin program. It has exactly two doors, and neither belongs to the parents, to the
          company behind the app, or to the AI tutor. Anyone can put coins in. Nobody can take them out before the
          18th birthday, except the guardians in an emergency, and only toward a children&apos;s charity.
        </p>
      }
    >
      <figure className="rounded-3xl border-2 border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <figcaption className="sr-only">
          Diagram: parents, grandparents and friends deposit into the vault. The vault has two doors: the child key after
          the 18th birthday, and two of three guardians after a long wait, only to the charity list. There is no door for
          parents, the company or the AI tutor.
        </figcaption>
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center" aria-hidden="true">
          <div className="flex-1 rounded-2xl bg-sky-50 p-4 text-sky-950 ring-2 ring-sky-300">
            <p className="text-sm font-bold tracking-wide uppercase">Coins in</p>
            <p className="mt-1 text-lg font-bold">Parents, grandparents, friends. Anyone.</p>
            <p className="mt-1">A deposit needs no key.</p>
          </div>
          <ArrowIcon className="h-8 w-12 shrink-0 rotate-90 self-center text-stone-500 sm:rotate-0" />
          <div className="flex-1 rounded-2xl bg-stone-900 p-4 text-amber-50">
            <p className="text-sm font-bold tracking-wide text-amber-300 uppercase">The vault</p>
            <p className="mt-1 text-lg font-bold">A Bitcoin script with two doors</p>
            <p className="mt-1 text-stone-200">Checked by thousands of nodes. No company holds it.</p>
          </div>
          <ArrowIcon className="h-8 w-12 shrink-0 rotate-90 self-center text-stone-500 sm:rotate-0" />
          <ul className="flex flex-1 flex-col gap-3">
            <Door tone="open" icon={<LockIcon open className="h-7 w-7 text-emerald-700" />} title="Door 1: the child">
              Opens with the child&apos;s key, only after the 18th birthday.
            </Door>
            <Door tone="wait" icon={<LockIcon className="h-7 w-7 text-amber-700" />} title="Door 2: the guardians">
              Two of three guardians, after a long wait, only to the charity list.
            </Door>
          </ul>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-rose-950 ring-2 ring-rose-300">
          <NoEntryIcon className="h-7 w-7 shrink-0 text-rose-700" />
          <p>
            <span className="font-bold">No door for parents, for the company, or for the AI tutor.</span> There is no
            admin key, no reset button and no support ticket that moves coins.
          </p>
        </div>
      </figure>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
          <h3 className="text-lg font-bold text-stone-900">Your face is not the key</h3>
          <p className="mt-2 leading-relaxed text-stone-800">
            Biometrics unlock the device and authorize an action, like a door. They are never key material and never
            leave the device. A face or fingerprint is not secret and cannot be changed if leaked, and a camera reading is
            never bit-identical twice, while a key must be. Biometric data of a minor is also sensitive data under LGPD and
            GDPR, one more reason it stays on the device.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
          <h3 className="text-lg font-bold text-stone-900">About the demo you can try today</h3>
          <p className="mt-2 leading-relaxed text-stone-800">
            The demo vault is v0, the educational prototype that proved the core: a P2WSH script with a parent path and a
            child path after 18. v1, in development, is a Taproot vault with no parent path at all. Both are described in the{' '}
            <ExternalLink href={RFCS_URL}>RFCs</ExternalLink>.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------ key lost */

function KeyLost() {
  return (
    <Section
      id="lost"
      eyebrow="Guardians and charities"
      title="What happens if the key is lost"
      lead="A seven-year-old breaks a tablet. A family moves house and a paper is gone. The design assumes both will happen."
    >
      <div className="grid items-start gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4 text-lg leading-relaxed text-stone-800">
          <p>
            <span className="font-bold text-stone-900">The child&apos;s key is not one key.</span> It is a threshold key
            (FROST, Schnorr) split between the child&apos;s device, the family and a sealed backup. At the growth ceremonies, for
            example at 12 and 16, the shares shift toward the child. A broken tablet at age 7 does not lose the funds: the
            remaining shares rebuild the key on a new device.
          </p>
          <p>
            <span className="font-bold text-stone-900">If every share is lost,</span> the second door exists. Three
            independent guardians hold it: a Kids Wallet foundation key, a guardian chosen by the family who is not a
            parent, and a notary or trustee. Any two of them can move the coins, only after a long delay, and by policy
            only to a pre-committed list of children&apos;s charities. Never to themselves, never to the parents.
          </p>
        </div>
        <GlobeWithHearts className="mx-auto w-40 sm:w-48" title="A globe with hearts around it" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 text-emerald-950">
          <h3 className="text-lg font-bold">Enforced by the Bitcoin script</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
            <li>The child path opens only after the 18th birthday.</li>
            <li>The guardian path needs two of the three guardian keys.</li>
            <li>The guardian path waits a fixed number of blocks before it can be used.</li>
            <li>There is no other path. Parents, the company and the tutor have no key in the script.</li>
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-amber-950">
          <h3 className="text-lg font-bold">Enforced by governance and pre-signed transactions</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
            <li>
              Bitcoin has no covenants yet, so the script cannot restrict where the guardian path sends the coins. Instead,
              for every deposit, transactions to the charities are pre-signed by the foundation key and shared, and the
              guardians publish the rules they follow.
            </li>
            <li>Who the guardians are, how they are chosen and how they are replaced.</li>
            <li>
              The charity list, to be confirmed. UNICEF, which runs a cryptocurrency fund, is a candidate. The other four
              will be chosen with the community among global children&apos;s organizations that accept bitcoin directly.
            </li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- tutor */

interface ChatLine {
  who: 'child' | 'tutor';
  text: string;
}

function TutorDemo() {
  const [bandId, setBandId] = useState<AgeBandId>('6-9');
  const [log, setLog] = useState<ChatLine[]>([]);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const band = ageBand(bandId);
  const groupId = useId();

  const choose = (id: AgeBandId) => {
    setBandId(id);
    setLog([]);
    setAsked(new Set());
  };

  const ask = (e: Exchange) => {
    setLog((l) => [...l, { who: 'child', text: e.question }, { who: 'tutor', text: e.answer }]);
    setAsked((s) => new Set(s).add(e.question));
  };

  const remaining = band.exchanges.filter((e) => !asked.has(e.question));

  return (
    <Section
      id="tutor"
      eyebrow="Scripted demo"
      title="Meet the tutor"
      lead="A scripted demo. Nothing here calls a model: the answers are written in advance to show the tone for each age. The real tutor never holds keys and never sees secrets."
    >
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3 lg:w-56">
          <OwlTutor className="w-40 lg:w-52" title="An owl with big round eyes, the tutor" />
          <p className="text-center text-stone-700">
            This is Pip. <span className="font-semibold">{band.tone}</span>
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <p id={groupId} className="mb-2 font-bold text-stone-900">
              Who is Pip talking to?
            </p>
            <div role="group" aria-labelledby={groupId} className="flex flex-wrap gap-2">
              {AGE_BANDS.map((b) => {
                const active = b.id === bandId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => choose(b.id)}
                    className={`min-h-11 rounded-full px-4 text-base font-semibold transition-colors ${
                      active ? 'bg-violet-700 text-white' : 'bg-white text-stone-900 ring-1 ring-stone-300 ring-inset hover:bg-violet-50'
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-violet-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-stone-600">{band.summary}</p>
            <ol aria-live="polite" aria-label="Conversation" className="mt-3 space-y-3">
              {log.length === 0 && (
                <li className="rounded-2xl bg-violet-50 px-4 py-3 text-violet-950">
                  <span className="block text-xs font-bold tracking-wide uppercase">Pip</span>
                  {bandId === '18'
                    ? 'Hello. Are you ready to begin the hand-over? Pick a question below and we go step by step.'
                    : 'Hello! Pick a question below and I will answer it the way I would for your age.'}
                </li>
              )}
              {log.map((line, i) => (
                <li
                  key={i}
                  className={
                    line.who === 'child'
                      ? 'ml-8 rounded-2xl bg-amber-100 px-4 py-3 text-amber-950'
                      : 'mr-8 rounded-2xl bg-violet-50 px-4 py-3 text-violet-950'
                  }
                >
                  <span className="block text-xs font-bold tracking-wide uppercase">{line.who === 'child' ? 'Child' : 'Pip'}</span>
                  {line.text}
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              {remaining.map((e) => (
                <Button key={e.question} variant="secondary" onClick={() => ask(e)} className="text-left">
                  {e.question}
                </Button>
              ))}
              {remaining.length === 0 && (
                <Button variant="secondary" onClick={() => choose(bandId)}>
                  Start again
                </Button>
              )}
            </div>
          </div>

          <details className="rounded-2xl border-2 border-stone-200 bg-white p-4">
            <summary className="cursor-pointer text-lg font-bold text-stone-900">
              Role-play Pip in any AI assistant: the demo prompt for ages {band.label}
            </summary>
            <p className="mt-2 text-stone-700">
              Copy this prompt and paste it into any AI assistant. It comes from{' '}
              <ExternalLink href={`${REPO}/blob/main/tutor/prompts/${band.promptFile}`}>tutor/prompts/{band.promptFile}</ExternalLink>{' '}
              and follows <ExternalLink href={`${REPO}/blob/main/tutor/persona.md`}>tutor/persona.md</ExternalLink>.
            </p>
            <div className="mt-3">
              <CopyButton value={band.prompt} label="Copy the demo prompt" />
            </div>
            <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-stone-50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-stone-800 ring-1 ring-stone-200">
              {band.prompt}
            </pre>
          </details>
        </div>
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- status */

const STATUS_TONE: Record<Status, string> = {
  ready: 'bg-emerald-100 text-emerald-950 ring-emerald-300',
  'in-development': 'bg-sky-100 text-sky-950 ring-sky-300',
  open: 'bg-amber-100 text-amber-950 ring-amber-300',
};

function StatusTable() {
  return (
    <Section
      id="status"
      eyebrow="Where things stand"
      title="Status"
      lead={
        <p>
          The same table is in the README. Ready means it runs today on signet and testnet. In development means code or
          documents exist but are not complete. Open means the RFC is written and the work is yours to take.
        </p>
      }
    >
      {/* Phones: one card per area. From the sm breakpoint up: the table. */}
      <ul className="space-y-3 sm:hidden">
        {STATUS_ITEMS.map((item) => (
          <li key={item.area} className="rounded-2xl border-2 border-stone-200 bg-white p-4">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-bold ring-1 ${STATUS_TONE[item.status]}`}>
              {STATUS_LABEL[item.status]}
            </span>
            <h3 className="mt-2 text-lg font-bold text-stone-900">{item.area}</h3>
            <p className="mt-1 text-stone-800">{item.note}</p>
            {item.rfc && (
              <p className="mt-2">
                <ExternalLink href={`${REPO}/blob/main/${rfcPath(item.rfc)}`}>RFC {item.rfc}</ExternalLink>
              </p>
            )}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl border-2 border-stone-200 bg-white shadow-sm sm:block">
        <table className="w-full min-w-[40rem] text-left">
          <thead className="bg-stone-100 text-sm tracking-wide text-stone-700 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                Area
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                Notes
              </th>
              <th scope="col" className="px-4 py-3">
                RFC
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {STATUS_ITEMS.map((item) => (
              <tr key={item.area} className="align-top">
                <th scope="row" className="px-4 py-3 font-semibold text-stone-900">
                  {item.area}
                </th>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-bold whitespace-nowrap ring-1 ${STATUS_TONE[item.status]}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-800">{item.note}</td>
                <td className="px-4 py-3">
                  {item.rfc ? <ExternalLink href={`${REPO}/blob/main/${rfcPath(item.rfc)}`}>{item.rfc}</ExternalLink> : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------- contribute */

const TRACKS: { title: string; text: string }[] = [
  { title: 'Flutter or native client', text: 'Read the same vault descriptor, show the balance, sign on the device.' },
  { title: 'pt-BR and other language packs', text: 'Translate the lessons as content packs. Brazilian Portuguese goes first.' },
  { title: 'Mini-games for ages 6 to 9', text: 'Small games about saving and about secrets, shipped as content packs.' },
  { title: 'Taproot v1 implementation', text: 'Spending code for both leaves, a migration from v0, and signet tests.' },
  { title: 'FROST growth ceremonies', text: 'Threshold key shares that shift toward the child at 12, 16 and 18.' },
  { title: 'Passkey unlock', text: 'WebAuthn and platform biometrics to unlock the device, never as key material.' },
  { title: 'Tutor safety evals', text: 'Test suites that prove the tutor never asks for secrets and always escalates.' },
  { title: 'Charity integration', text: 'Confirm the charity list and build the pre-signed transaction flow.' },
];

function Contribute() {
  return (
    <Section
      id="contribute"
      eyebrow="Join in"
      title="Contribute"
      lead={
        <p>
          Everything is public: the code, the RFCs, the open questions. Pick a track, open an issue with its template, and
          start. <ExternalLink href={`${REPO}/blob/main/CONTRIBUTING.md`}>CONTRIBUTING.md</ExternalLink> has the details.
        </p>
      }
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {TRACKS.map((t) => (
          <li key={t.title} className="rounded-2xl border-2 border-teal-200 bg-white p-4">
            <h3 className="text-lg font-bold text-stone-900">{t.title}</h3>
            <p className="mt-1 text-stone-800">{t.text}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <a
          href={`${REPO}/issues/new/choose`}
          rel="noopener noreferrer"
          target="_blank"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-6 py-2 text-lg font-semibold text-white no-underline transition-colors hover:bg-teal-800"
        >
          Open an issue
        </a>
        <LinkButton href="#/learn" variant="secondary" className="px-6 text-lg">
          Read the lessons
        </LinkButton>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------- page */

export function LandingPage() {
  return (
    <div className="space-y-16 sm:space-y-24">
      <Hero />
      <nav aria-label="Sections" className="-mt-6 flex flex-wrap gap-2 text-sm sm:-mt-12">
        {[
          ['#grows', 'Grows with the child'],
          ['#why', 'Why parents cannot touch it'],
          ['#lost', 'If the key is lost'],
          ['#tutor', 'The tutor'],
          ['#status', 'Status'],
          ['#contribute', 'Contribute'],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            onClick={(e) => {
              // Hash routing owns the URL fragment: scroll to the section without changing the route.
              e.preventDefault();
              const el = document.getElementById(href.slice(1));
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              const heading = el?.querySelector<HTMLElement>('h2');
              heading?.setAttribute('tabindex', '-1');
              heading?.focus({ preventScroll: true });
            }}
            className="inline-flex min-h-9 items-center rounded-full bg-white px-3 font-semibold text-teal-900 no-underline ring-1 ring-teal-200 hover:bg-teal-50"
          >
            {label}
          </a>
        ))}
      </nav>
      <Grows />
      <WhyParentsCannot />
      <KeyLost />
      <TutorDemo />
      <StatusTable />
      <Contribute />
    </div>
  );
}
