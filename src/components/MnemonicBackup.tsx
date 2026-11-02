import { useId, useState } from 'react';
import { Field, inputClass } from './ui';

function randomIndex(n: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

/**
 * Shows a recovery phrase once and asks the user to confirm the backup by
 * typing one of the words. There is no copy button on purpose: the phrase
 * belongs on paper, not in the clipboard.
 */
export function MnemonicBackup({
  who,
  mnemonic,
  derivationPath,
  description,
  onDoneChange,
}: {
  who: 'parent' | 'child';
  mnemonic: string;
  derivationPath: string;
  description: string;
  onDoneChange: (done: boolean) => void;
}) {
  const words = mnemonic.split(' ');
  const [checkIndex] = useState(() => randomIndex(words.length));
  const [written, setWritten] = useState(false);
  const [answer, setAnswer] = useState('');
  const checkboxId = useId();
  const headingId = useId();

  const matches = answer.trim().toLowerCase() === words[checkIndex];
  const update = (nextWritten: boolean, nextAnswer: string) => {
    onDoneChange(nextWritten && nextAnswer.trim().toLowerCase() === words[checkIndex]);
  };

  return (
    <section aria-labelledby={headingId} className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 id={headingId} className="text-lg font-semibold">
        {who === 'parent' ? 'Parent recovery phrase' : 'Child recovery phrase'}
      </h2>
      <p className="text-stone-700">{description}</p>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label={`${who} recovery phrase, ${words.length} words`}>
        {words.map((w, i) => (
          <li key={i} className="flex items-baseline gap-2 rounded-lg bg-stone-100 px-3 py-2 font-mono">
            <span className="w-6 text-right text-sm text-stone-600">{i + 1}.</span>
            <span className="text-base font-semibold text-stone-900">{w}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-stone-600">
        Derivation path: <code className="font-mono">{derivationPath}</code> (BIP39 phrase, no passphrase).
      </p>
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          className="mt-1 h-5 w-5 accent-teal-700"
          checked={written}
          onChange={(e) => {
            setWritten(e.target.checked);
            update(e.target.checked, answer);
          }}
        />
        <label htmlFor={checkboxId} className="text-stone-900">
          I wrote all {words.length} words on paper, in order, and I will keep the paper in a safe place.
        </label>
      </div>
      <Field
        label={`Type word number ${checkIndex + 1} to check your copy`}
        error={answer.trim() && !matches ? 'That is not the right word. Check your paper.' : null}
      >
        {(props) => (
          <input
            {...props}
            className={`${inputClass} max-w-xs font-mono`}
            value={answer}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => {
              setAnswer(e.target.value);
              update(written, e.target.value);
            }}
          />
        )}
      </Field>
      {written && matches && <p className="font-medium text-emerald-800">Backup checked.</p>}
    </section>
  );
}
