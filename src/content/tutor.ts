/**
 * Scripted tutor demo for the landing page. No model is called: every answer
 * is canned. The copyable demo prompts are the files in tutor/prompts/,
 * imported at build time so the page and the repository never drift.
 */
import prompt1013 from '../../tutor/prompts/10-13.md?raw';
import prompt1417 from '../../tutor/prompts/14-17.md?raw';
import prompt18 from '../../tutor/prompts/18-ceremony.md?raw';
import prompt69 from '../../tutor/prompts/6-9.md?raw';

export type AgeBandId = '6-9' | '10-13' | '14-17' | '18';

export interface Exchange {
  question: string;
  answer: string;
}

export interface AgeBand {
  id: AgeBandId;
  label: string;
  /** Short description of how the app and the tutor behave in this band. */
  summary: string;
  tone: string;
  /** File name under tutor/prompts/. */
  promptFile: string;
  prompt: string;
  exchanges: Exchange[];
}

export const AGE_BANDS: readonly AgeBand[] = [
  {
    id: '6-9',
    label: '6 to 9',
    summary: 'Cartoons, mini-games and a treasure chest that grows. Short answers, one idea at a time.',
    tone: 'Very short sentences, pictures in words, small numbers.',
    promptFile: '6-9.md',
    prompt: prompt69,
    exchanges: [
      {
        question: 'What is in my vault?',
        answer:
          'Your vault is like a treasure chest. Your family puts coins in it for you. The chest has a special lock that only opens on your 18th birthday. Want to see how many coins are inside?',
      },
      {
        question: 'Can I open it now?',
        answer:
          'Not yet. The lock knows the date. It will not open before your 18th birthday, not even for a grown-up. That is what makes it safe. What would you like to buy one day?',
      },
      {
        question: 'My friend wants my secret words.',
        answer:
          'Stop. Secret words are only for you. Never show them to anyone, not even a friend. Please tell your grown-up what your friend asked. You did the right thing by asking me first.',
      },
    ],
  },
  {
    id: '10-13',
    label: '10 to 13',
    summary: 'Weekly challenges, quizzes and honest answers to "why". Real numbers start to appear.',
    tone: 'Short paragraphs, cause and effect, simple arithmetic.',
    promptFile: '10-13.md',
    prompt: prompt1013,
    exchanges: [
      {
        question: 'Why can nobody take the coins out?',
        answer:
          'The vault is a small program on the Bitcoin network. It says: accept a payment signed by the child key only after a date, and never accept a payment from anyone else. Thousands of computers check that rule, so there is no one to ask for an exception. Challenge: how many weeks until your vault opens?',
      },
      {
        question: 'What if I lose my key?',
        answer:
          'Your key is not kept in one place. Pieces of it are kept by you, your family and a sealed backup, and the pieces move to you as you grow. Losing a tablet at 11 does not lose the coins. If every piece were lost, three guardians your family chose could, after a long wait, send the coins to a children\'s charity, never to themselves. Which rule is enforced by code and which by people? Try to say.',
      },
      {
        question: 'Is bitcoin going up?',
        answer:
          'I do not predict prices, and nobody can. The price moves a lot, up and down. What I can show you is how saving a little, many times, adds up over years. Shall we do the arithmetic for your own savings goal?',
      },
    ],
  },
  {
    id: '14-17',
    label: '14 to 17',
    summary: 'Real-world money: budgets, a first job, scams, what a bank does, what self-custody means.',
    tone: 'Direct, respectful, with trade-offs.',
    promptFile: '14-17.md',
    prompt: prompt1417,
    exchanges: [
      {
        question: 'What exactly happens at 18?',
        answer:
          'On your 18th birthday the script\'s child leaf becomes valid: the network will accept a transaction signed by your key. The app walks you through a ceremony, but the app is not what releases the coins. First move: send everything to a wallet only you control, because the guardian recovery leaf still exists on the vault. We can rehearse the steps on signet whenever you want.',
      },
      {
        question: 'Is my face my password?',
        answer:
          'No. Your face unlocks the device, like a door. It is never the key and it never leaves the phone. A face can be photographed and cannot be changed if leaked, and a camera reading is never exactly the same twice, while a key must be identical every time. The key is random, and your face only authorizes the device to use it.',
      },
      {
        question: 'Someone messaged me saying my vault is at risk and I must verify my phrase.',
        answer:
          'That is a scam, and a common one. Nobody who is honest ever asks for a recovery phrase, not me, not the app, not a guardian. Do not reply, do not click, and show the message to a trusted adult. Want to go through the three signs that gave it away?',
      },
    ],
  },
  {
    id: '18',
    label: '18 ceremony',
    summary: 'The hand-over. Adult register. The script releases the funds; the tutor explains each step.',
    tone: 'Calm, exact, one step at a time.',
    promptFile: '18-ceremony.md',
    prompt: prompt18,
    exchanges: [
      {
        question: 'I am ready. What is the first step?',
        answer:
          'Step 1 of 6: confirm it is you on this device with your passkey. This unlocks the device and authorizes the app to use your key share. It is not the key itself. Tell me when the device confirms.',
      },
      {
        question: 'Done. What can I do now that I could not do yesterday?',
        answer:
          'Since 00:00 UTC on your birthday the child leaf of the vault is valid, so the network accepts a transaction signed with your key. Nothing else changed: nobody gained a path and the guardians still have theirs. Step 3 is to move the coins to a wallet only you control. I will show the amount, the fee and the destination before you sign anything.',
      },
      {
        question: 'Should I keep it as bitcoin or sell it?',
        answer:
          'That is your decision and I will not advise on it. I can explain what each option means technically: keeping it in self-custody, moving it to a service, or exchanging it. Whichever you choose, the first step is the same: a wallet whose recovery phrase only you hold, written on paper, in two places.',
      },
    ],
  },
];

export function ageBand(id: AgeBandId): AgeBand {
  const band = AGE_BANDS.find((b) => b.id === id);
  if (!band) throw new Error(`Unknown age band ${id}`);
  return band;
}
