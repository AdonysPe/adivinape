import { motion, useReducedMotion } from 'motion/react';
import { cat } from '../../lib/game';

type Props = {
  sel: string[];
  rot: number;
  spinning: boolean;
  onSpinEnd: () => void;
};

export const SPIN_SECONDS = 3.4;

export default function Wheel({ sel, rot, spinning, onSpinEnd }: Props) {
  const reduce = useReducedMotion();
  const n = sel.length;
  const seg = 360 / n;
  const background =
    n === 1
      ? cat(sel[0]).color
      : `conic-gradient(${sel.map((id, k) => `${cat(id).color} ${k * seg}deg ${(k + 1) * seg}deg`).join(', ')})`;
  const labelSize = n <= 3 ? 22 : n <= 6 ? 18 : 15;

  return (
    // Sized by the screen: never wider than the phone, never taller than what's left above the button.
    // Everything inside is laid out in container units (cqw) so it scales with the wheel.
    <div
      className="relative aspect-square [container-type:inline-size]"
      style={{ width: 'min(440px, 80vw, max(200px, calc(100dvh - 360px)))' }}
    >
      <svg
        aria-hidden="true"
        width="44"
        height="48"
        viewBox="0 0 44 48"
        className="absolute -top-5 left-1/2 z-10 -translate-x-1/2 drop-shadow-[0_4px_0_#000]"
      >
        <path d="M22 46L4 8h36z" fill="#fff" stroke="#0B0B0F" strokeWidth="4" strokeLinejoin="round" />
      </svg>
      <div aria-hidden="true" className="anim-hue absolute -inset-3.5 rounded-full border-8 border-dotted border-yellow" />
      <motion.div
        role="img"
        aria-label={`Ruleta con ${n} ${n === 1 ? 'categoría' : 'categorías'}`}
        className="absolute inset-0 rounded-full border-8 border-ink shadow-[0_0_0_6px_#fff,0_0_70px_rgba(255,46,147,.6)]"
        style={{ background }}
        initial={false}
        animate={{ rotate: rot }}
        transition={{
          duration: reduce ? 0 : SPIN_SECONDS,
          ease: [0.12, 0.75, 0.1, 1],
        }}
        onAnimationComplete={() => spinning && onSpinEnd()}
      >
        {sel.map((id, k) => {
          const angle = k * seg + seg / 2;
          // Labels on the left half turn the other way so they never read upside down.
          const flip = angle > 180 ? 90 : -90;
          return (
            <div key={id} className="absolute top-1/2 left-1/2 h-0 w-0" style={{ transform: `rotate(${angle}deg)` }}>
              <span
                className="absolute top-0 left-0 font-display whitespace-nowrap text-ink uppercase"
                style={{
                  // labelSize px on the full 440px wheel, proportionally smaller on phones
                  fontSize: `${((labelSize / 440) * 100).toFixed(2)}cqw`,
                  transform: `translate(-50%, -50%) translateY(-28.5cqw) rotate(${flip}deg)`,
                }}
              >
                {cat(id).short}
              </span>
            </div>
          );
        })}
        <div className="absolute top-1/2 left-1/2 h-[17cqw] w-[17cqw] -translate-x-1/2 -translate-y-1/2 rounded-full border-5 border-white bg-ink" />
      </motion.div>
    </div>
  );
}
