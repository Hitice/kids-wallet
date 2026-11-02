/**
 * Original inline SVG illustrations for the landing page. Simple shapes,
 * friendly characters, no photos. All are decorative (aria-hidden) unless a
 * title is passed, in which case the SVG is exposed as an image.
 */
import { useId, type ReactNode } from 'react';

interface Props {
  className?: string;
  title?: string;
}

function Svg({ viewBox, className, title, children }: Props & { viewBox: string; children: ReactNode }) {
  const id = useId();
  return (
    <svg
      viewBox={viewBox}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? id : undefined}
      focusable="false"
    >
      {title && <title id={id}>{title}</title>}
      {children}
    </svg>
  );
}

/** A child kneeling next to an open treasure chest with a lock, coins inside. */
export function ChildWithChest(props: Props) {
  return (
    <Svg viewBox="0 0 240 240" {...props}>
      <circle cx="120" cy="120" r="112" fill="#fde68a" />
      {/* ground */}
      <ellipse cx="120" cy="200" rx="92" ry="14" fill="#fcd34d" />
      {/* chest body */}
      <rect x="112" y="128" width="98" height="66" rx="10" fill="#b45309" />
      <rect x="112" y="150" width="98" height="8" fill="#92400e" />
      {/* lid, open */}
      <path d="M112 128 L132 92 Q161 78 210 92 L210 128 Z" fill="#d97706" />
      <path d="M118 124 L135 98 Q161 88 204 98 L204 124 Z" fill="#f59e0b" />
      {/* coins */}
      <circle cx="140" cy="122" r="9" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
      <circle cx="160" cy="118" r="9" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
      <circle cx="180" cy="122" r="9" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
      <circle cx="150" cy="130" r="9" fill="#fcd34d" stroke="#b45309" strokeWidth="2" />
      <circle cx="170" cy="130" r="9" fill="#fcd34d" stroke="#b45309" strokeWidth="2" />
      {/* lock */}
      <rect x="150" y="158" width="22" height="20" rx="4" fill="#0f766e" />
      <path d="M155 158 v-6 a6 6 0 0 1 12 0 v6" fill="none" stroke="#0f766e" strokeWidth="3" />
      <circle cx="161" cy="167" r="3" fill="#fde68a" />
      {/* child body */}
      <path d="M40 198 Q40 150 76 146 Q110 150 110 198 Z" fill="#0f766e" />
      {/* arm reaching to chest */}
      <path d="M96 160 Q118 150 130 140" fill="none" stroke="#f3c9a5" strokeWidth="12" strokeLinecap="round" />
      {/* other arm */}
      <path d="M56 162 Q46 176 50 190" fill="none" stroke="#f3c9a5" strokeWidth="12" strokeLinecap="round" />
      {/* head */}
      <circle cx="76" cy="112" r="34" fill="#f3c9a5" />
      {/* hair */}
      <path d="M42 108 Q44 70 80 76 Q112 80 110 108 Q96 92 76 96 Q58 94 42 108 Z" fill="#5b3a1e" />
      {/* eyes */}
      <circle cx="64" cy="114" r="4" fill="#1c1917" />
      <circle cx="88" cy="114" r="4" fill="#1c1917" />
      <circle cx="65.5" cy="112.5" r="1.3" fill="#fff" />
      <circle cx="89.5" cy="112.5" r="1.3" fill="#fff" />
      {/* smile */}
      <path d="M64 128 Q76 138 88 128" fill="none" stroke="#9a3412" strokeWidth="3" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="56" cy="124" r="4" fill="#fca5a5" opacity="0.7" />
      <circle cx="96" cy="124" r="4" fill="#fca5a5" opacity="0.7" />
    </Svg>
  );
}

/** A round owl tutor with big eyes, perched on a branch. */
export function OwlTutor(props: Props) {
  return (
    <Svg viewBox="0 0 200 200" {...props}>
      <circle cx="100" cy="100" r="94" fill="#ddd6fe" />
      {/* branch */}
      <path d="M20 168 Q100 158 180 168" fill="none" stroke="#92400e" strokeWidth="10" strokeLinecap="round" />
      {/* ear tufts */}
      <path d="M58 60 L50 30 L78 50 Z" fill="#6d28d9" />
      <path d="M142 60 L150 30 L122 50 Z" fill="#6d28d9" />
      {/* body */}
      <ellipse cx="100" cy="110" rx="56" ry="62" fill="#7c3aed" />
      {/* belly */}
      <ellipse cx="100" cy="126" rx="34" ry="36" fill="#ede9fe" />
      <path d="M84 118 q8 8 16 0 q8 8 16 0" fill="none" stroke="#c4b5fd" strokeWidth="3" />
      <path d="M80 134 q10 8 20 0 q10 8 20 0" fill="none" stroke="#c4b5fd" strokeWidth="3" />
      {/* wings */}
      <path d="M46 100 Q30 130 50 156 Q60 130 60 100 Z" fill="#5b21b6" />
      <path d="M154 100 Q170 130 150 156 Q140 130 140 100 Z" fill="#5b21b6" />
      {/* eyes */}
      <circle cx="78" cy="88" r="20" fill="#fff" />
      <circle cx="122" cy="88" r="20" fill="#fff" />
      <circle cx="80" cy="90" r="9" fill="#1c1917" />
      <circle cx="120" cy="90" r="9" fill="#1c1917" />
      <circle cx="83" cy="86" r="3" fill="#fff" />
      <circle cx="123" cy="86" r="3" fill="#fff" />
      {/* beak */}
      <path d="M92 104 L108 104 L100 116 Z" fill="#f59e0b" />
      {/* feet */}
      <path d="M84 166 l-6 8 M84 166 l0 9 M84 166 l6 8" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
      <path d="M116 166 l-6 8 M116 166 l0 9 M116 166 l6 8" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}

/** A plant in a pot at four growth stages: sprout, plant, young tree, tree. */
export function GrowingPlant({ stage, ...props }: Props & { stage: 0 | 1 | 2 | 3 }) {
  return (
    <Svg viewBox="0 0 120 140" {...props}>
      {/* pot */}
      <path d="M34 100 L86 100 L80 134 L40 134 Z" fill="#c2410c" />
      <rect x="30" y="92" width="60" height="12" rx="3" fill="#ea580c" />
      {/* soil */}
      <ellipse cx="60" cy="96" rx="26" ry="4" fill="#5b3a1e" />
      {stage === 0 && (
        <g>
          <path d="M60 94 V76" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="50" cy="76" rx="10" ry="5" fill="#4ade80" transform="rotate(-25 50 76)" />
          <ellipse cx="70" cy="74" rx="10" ry="5" fill="#22c55e" transform="rotate(25 70 74)" />
        </g>
      )}
      {stage === 1 && (
        <g>
          <path d="M60 94 V52" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="47" cy="80" rx="13" ry="6" fill="#4ade80" transform="rotate(-25 47 80)" />
          <ellipse cx="73" cy="72" rx="13" ry="6" fill="#22c55e" transform="rotate(25 73 72)" />
          <ellipse cx="48" cy="60" rx="12" ry="6" fill="#22c55e" transform="rotate(-30 48 60)" />
          <ellipse cx="60" cy="48" rx="6" ry="9" fill="#4ade80" />
        </g>
      )}
      {stage === 2 && (
        <g>
          <path d="M60 94 V40" stroke="#92400e" strokeWidth="6" strokeLinecap="round" />
          <path d="M60 70 Q44 62 40 50" stroke="#92400e" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M60 62 Q76 56 82 44" stroke="#92400e" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="38" cy="46" r="14" fill="#22c55e" />
          <circle cx="84" cy="40" r="14" fill="#16a34a" />
          <circle cx="60" cy="30" r="18" fill="#4ade80" />
        </g>
      )}
      {stage === 3 && (
        <g>
          <path d="M60 94 V36" stroke="#92400e" strokeWidth="8" strokeLinecap="round" />
          <path d="M60 66 Q40 60 32 44" stroke="#92400e" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M60 60 Q80 54 90 40" stroke="#92400e" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="60" cy="30" r="28" fill="#16a34a" />
          <circle cx="32" cy="42" r="18" fill="#22c55e" />
          <circle cx="90" cy="40" r="18" fill="#22c55e" />
          <circle cx="48" cy="22" r="14" fill="#4ade80" />
          <circle cx="74" cy="20" r="14" fill="#4ade80" />
          <circle cx="44" cy="40" r="4" fill="#fbbf24" />
          <circle cx="78" cy="34" r="4" fill="#fbbf24" />
          <circle cx="62" cy="48" r="4" fill="#fbbf24" />
        </g>
      )}
    </Svg>
  );
}

const HEART = 'M0 -6 C-6 -14 -16 -8 -14 0 C-12 6 -4 10 0 14 C4 10 12 6 14 0 C16 -8 6 -14 0 -6 Z';

/** A globe with three hearts around it, for the children's charities. */
export function GlobeWithHearts(props: Props) {
  return (
    <Svg viewBox="0 0 200 200" {...props}>
      <circle cx="100" cy="104" r="66" fill="#7dd3fc" />
      {/* land */}
      <path d="M62 78 Q78 60 96 70 Q104 84 92 96 Q74 102 64 94 Z" fill="#4ade80" />
      <path d="M108 60 Q130 54 144 70 Q150 86 136 92 Q120 90 112 78 Z" fill="#4ade80" />
      <path d="M78 116 Q98 108 112 122 Q118 142 102 152 Q84 150 76 134 Z" fill="#22c55e" />
      <path d="M126 112 Q146 108 154 124 Q150 142 134 140 Q124 128 126 112 Z" fill="#22c55e" />
      {/* meridian hint */}
      <path d="M100 38 Q134 104 100 170" fill="none" stroke="#bae6fd" strokeWidth="3" />
      <path d="M34 104 H166" stroke="#bae6fd" strokeWidth="3" />
      {/* hearts */}
      <path d={HEART} transform="translate(44 44) scale(1.2)" fill="#f43f5e" />
      <path d={HEART} transform="translate(162 56) scale(1)" fill="#fb7185" />
      <path d={HEART} transform="translate(150 164) scale(0.9)" fill="#f43f5e" />
    </Svg>
  );
}

/** Arrow used in the HTML vault diagram. Rotates on narrow screens through a class. */
export function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 24" className={className} aria-hidden="true" focusable="false">
      <path d="M2 12 H38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 4 L40 12 L30 20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A small padlock, used as a door icon. */
export function LockIcon({ className = '', open = false }: { className?: string; open?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect x="7" y="14" width="18" height="13" rx="3" fill="currentColor" />
      {open ? (
        <path d="M11 14 v-4 a5 5 0 0 1 10 0 v1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d="M11 14 v-3 a5 5 0 0 1 10 0 v3" fill="none" stroke="currentColor" strokeWidth="3" />
      )}
      <circle cx="16" cy="20.5" r="2" fill="#fff" />
    </svg>
  );
}

/** A crossed circle for "no door". */
export function NoEntryIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <path d="M8 8 L24 24" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
