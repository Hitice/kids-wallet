import { PageTitle } from '../components/ui';
import { LESSONS } from '../content/lessons';

export function LearnPage() {
  return (
    <div className="space-y-6">
      <PageTitle lead="Six short lessons for children and parents. Read one at a time and talk about it together.">
        Learn
      </PageTitle>

      <nav aria-label="Lessons" className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <ol className="list-decimal space-y-1 pl-5">
          {LESSONS.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                className="min-h-9 text-left font-semibold text-teal-800 underline-offset-4 hover:underline"
                onClick={() => {
                  const el = document.getElementById(l.id);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  el?.focus({ preventScroll: true });
                }}
              >
                {l.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {LESSONS.map((l, i) => (
        <article
          key={l.id}
          id={l.id}
          tabIndex={-1}
          aria-labelledby={`${l.id}-title`}
          className="scroll-mt-4 space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:p-6"
        >
          <p className="text-sm font-semibold tracking-wide text-teal-800 uppercase">Lesson {i + 1}</p>
          <h2 id={`${l.id}-title`} className="text-xl font-bold text-stone-900">
            {l.title}
          </h2>
          {l.paragraphs.map((p, j) => (
            <p key={j} className="leading-relaxed text-stone-800">
              {p}
            </p>
          ))}
          <div className="rounded-lg bg-teal-50 p-3 text-teal-950">
            <p className="font-semibold">Try this</p>
            <p>{l.tryThis}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
