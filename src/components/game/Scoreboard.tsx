import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { teamColor, teamLabel, type GameState } from '../../lib/game';

type Props = { s: GameState; onSettings: () => void };

/** One scrollable row of team pills: compact on phones, the active team always centred in view. */
export default function Scoreboard({ s, onSettings }: Props) {
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [s.turn]);

  return (
    <div className="mb-3 flex items-center gap-2 sm:mb-10 sm:gap-4 landscape-phone:mb-1">
      <span className="flex-none font-display text-xs text-yellow sm:text-base" aria-label={`Ronda ${s.round} de ${s.rounds}`}>
        <span className="hidden sm:inline">RONDA </span>
        <span className="sm:hidden">R</span>
        {s.round}/{s.rounds}
      </span>
      <ul
        aria-label="Marcador"
        className="m-0 flex min-w-0 flex-1 list-none snap-x gap-2 overflow-x-auto p-0 px-1 py-2 [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:gap-2.5 sm:overflow-visible landscape-phone:flex-nowrap landscape-phone:justify-start landscape-phone:overflow-x-auto landscape-phone:py-1 [&::-webkit-scrollbar]:hidden"
      >
        {s.teams.map((_, k) => {
          const active = k === s.turn && s.phase !== 'final';
          const color = teamColor(k);
          return (
            <motion.li
              key={k}
              ref={active ? activeRef : undefined}
              layout
              animate={{ scale: active ? 1.08 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="flex flex-none snap-center items-center gap-2 border-2 px-2.5 py-1.5 sm:gap-2.5 sm:border-3 sm:px-3.5 sm:py-2"
              style={{
                borderColor: color,
                background: active ? color : 'transparent',
                color: active ? '#0B0B0F' : color,
              }}
              aria-current={active ? 'true' : undefined}
            >
              <span className="max-w-[9rem] truncate font-display text-[11px] uppercase sm:max-w-none sm:text-sm">
                {teamLabel(s.teams, k)}
              </span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={s.scores[k] ?? 0}
                  initial={{ y: -16, opacity: 0, scale: 1.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 16, opacity: 0 }}
                  className="font-display text-base sm:text-xl"
                >
                  {s.scores[k] ?? 0}
                </motion.span>
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
      {s.phase !== 'playing' && (
        <button
          type="button"
          onClick={onSettings}
          aria-label="Ajustes de la partida"
          className="btn-chunky inline-flex h-11 min-w-11 flex-none items-center justify-center gap-2 border-2 border-white bg-transparent px-2.5 font-display text-sm text-white sm:border-3 sm:px-3.5"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
            <circle cx="16" cy="6" r="2" />
            <circle cx="10" cy="12" r="2" />
            <circle cx="18" cy="18" r="2" />
          </svg>
          <span className="hidden sm:inline">AJUSTES</span>
        </button>
      )}
    </div>
  );
}
