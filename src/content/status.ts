/**
 * Single source of truth for the project status. The landing page renders it
 * and the README must contain the Markdown table it produces
 * (src/content/status.test.ts checks both stay equal).
 */
export type Status = 'ready' | 'in-development' | 'open';

export const STATUS_LABEL: Record<Status, string> = {
  ready: 'Ready',
  'in-development': 'In development',
  open: 'Open for contribution',
};

export interface StatusItem {
  area: string;
  status: Status;
  note: string;
  /** RFC number, when one exists. */
  rfc?: string;
}

export const STATUS_ITEMS: readonly StatusItem[] = [
  {
    area: 'Vault v0: P2WSH, parent path and child path after 18',
    status: 'ready',
    note: 'Educational prototype that proved the core. Signet and testnet only. To be superseded by v1.',
    rfc: '0001',
  },
  {
    area: 'Web app: create, import, deposit, withdraw',
    status: 'ready',
    note: 'Keys stay in the browser. The only network peer is mempool.space.',
  },
  {
    area: 'Six lessons for children and parents',
    status: 'ready',
    note: 'Learn page in the app and the first English content pack.',
  },
  {
    area: 'Vault v1: Taproot with a guardian recovery leaf',
    status: 'in-development',
    note: 'Script builder, address derivation and control blocks in src/core/taproot.ts with tests. No spending code and no UI yet.',
    rfc: '0002',
  },
  {
    area: 'Install on tablet and phone (PWA)',
    status: 'in-development',
    note: 'Web manifest and offline shell. Native clients are a contribution track.',
    rfc: '0008',
  },
  {
    area: 'Threshold child key and growth ceremonies',
    status: 'open',
    note: 'FROST shares that shift toward the child at 12 and 16, then the hand-over at 18.',
    rfc: '0003',
  },
  {
    area: 'Device biometrics and passkeys',
    status: 'open',
    note: 'Unlock and authorize on the device. Never key material.',
    rfc: '0004',
  },
  {
    area: 'AI tutor by age band',
    status: 'open',
    note: 'Persona, prompts and a scripted demo exist. No model integration yet.',
    rfc: '0005',
  },
  {
    area: 'Content packs and translations',
    status: 'open',
    note: 'Format, schema and example pack exist. pt-BR is the first community track.',
    rfc: '0006',
  },
  {
    area: 'Charity fallback',
    status: 'open',
    note: 'Pre-signed transactions to a pre-committed list. Charities to be confirmed.',
    rfc: '0007',
  },
  {
    area: 'Flutter or native client on the same vault descriptor',
    status: 'open',
    note: 'Read the vault file, show the balance, sign on the device.',
  },
  {
    area: 'Mini-games for ages 6 to 9',
    status: 'open',
    note: 'Small games that teach saving and keys, shipped as content packs.',
    rfc: '0006',
  },
];

export function rfcPath(rfc: string): string {
  const slug: Record<string, string> = {
    '0001': '0001-vault-v0.md',
    '0002': '0002-vault-v1-taproot-guardians.md',
    '0003': '0003-threshold-child-key-and-growth-ceremonies.md',
    '0004': '0004-device-biometrics-and-passkeys.md',
    '0005': '0005-ai-tutor-by-age-band.md',
    '0006': '0006-content-packs-and-community.md',
    '0007': '0007-charity-fallback.md',
    '0008': '0008-platforms-pwa.md',
  };
  const file = slug[rfc];
  if (!file) throw new Error(`Unknown RFC ${rfc}`);
  return `docs/rfcs/${file}`;
}

/** The Markdown table that the README must contain verbatim. */
export function statusTableMarkdown(): string {
  const header = '| Area | Status | Notes | RFC |\n| --- | --- | --- | --- |';
  const rows = STATUS_ITEMS.map((item) => {
    const rfc = item.rfc ? `[${item.rfc}](${rfcPath(item.rfc)})` : '';
    return `| ${item.area} | ${STATUS_LABEL[item.status]} | ${item.note} | ${rfc} |`;
  });
  return [header, ...rows].join('\n');
}
