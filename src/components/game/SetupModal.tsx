import { useEffect, useRef, useState, type Dispatch, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ALL_GENRE_IDS,
  CATEGORIES,
  DURATIONS,
  LEVELS,
  MAX_TEAMS,
  MIN_TEAMS,
  MUSIC_GENRES,
  MUSIC_ID,
  PRESETS,
  ROUND_OPTIONS,
  fillNames,
  wordPool,
  randomName,
  suggestNames,
  teamColor,
  type Action,
  type GameState,
} from '../../lib/game';

type Props = { s: GameState; dispatch: Dispatch<Action>; onStart: () => void };

const Dice = ({ dots = 5 }: { dots?: 3 | 5 }) => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" />
    <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    {dots === 5 && (
      <>
        <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" />
        <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" />
      </>
    )}
  </svg>
);

const Cross = ({ size = 18 }: { size?: number }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
  >
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);

function Toggle({
  on,
  onClick,
  children,
  className = '',
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`btn-chunky min-h-12 border-3 border-white px-4.5 py-2.5 font-display text-base ${on ? 'bg-white text-ink' : 'bg-transparent text-white'} ${className}`}
    >
      {children}
    </button>
  );
}

export default function SetupModal({ s, dispatch, onStart }: Props) {
  const [focus, setFocus] = useState(-1);
  const [activeSug, setActiveSug] = useState(-1);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const close = () => dispatch({ type: 'closeModal' });

  // Lock page scroll, focus the first field, and give focus back on close.
  useEffect(() => {
    returnFocus.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus(), 350);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
      (returnFocus.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  // Escape closes; Tab stays inside the dialog.
  const onDialogKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const f = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input');
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const pickSug = (k: number, name: string) => {
    dispatch({ type: 'setTeamName', k, name });
    setActiveSug(-1);
    setFocus(-1);
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>, k: number, sugs: string[]) => {
    if (!sugs.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSug((i) => (i + 1) % sugs.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSug((i) => (i <= 0 ? sugs.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeSug >= 0) {
      e.preventDefault();
      pickSug(k, sugs[activeSug]);
    }
  };

  const selWords = s.sel.reduce((a, id) => a + wordPool(id, s).length, 0);
  const musicOn = s.sel.includes(MUSIC_ID);
  const genreCount = (gid: string) => wordPool(MUSIC_ID, { musicGenres: [gid], musicLevel: s.musicLevel }).length;
  const inGame = s.phase !== 'idle';
  const n = s.sel.length;
  const summary = [
    `${s.teams.length} equipos`,
    `${n} ${n === 1 ? 'categoría' : 'categorías'}`,
    s.mode === 'ruleta' ? 'ruleta' : 'mezcla total',
    ...(s.sel.includes(MUSIC_ID) ? [`música ${LEVELS.find((l) => l.id === s.musicLevel)?.label.toLowerCase()}`] : []),
    `${s.dur}s por turno`,
    `${s.rounds} ${s.rounds === 1 ? 'ronda' : 'rondas'}`,
  ].join(' · ');

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-[rgba(5,5,10,.82)] backdrop-blur-md sm:px-4 sm:py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
        onKeyDown={onDialogKey}
        initial={{ opacity: 0, y: 120, rotate: 4, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, rotate: -3, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        // Phones: a full-screen sheet. Wider screens: a floating card.
        className="flex min-h-dvh w-full max-w-4xl flex-col gap-7 bg-panel px-4 pb-0 sm:min-h-0 sm:gap-9 sm:border-4 sm:border-yellow sm:p-8 sm:shadow-[14px_14px_0_var(--color-pink)]"
      >
        <header className="sticky top-0 z-20 -mx-4 flex items-start justify-between gap-4 border-b-3 border-yellow bg-panel px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3 sm:static sm:m-0 sm:border-0 sm:p-0">
          <div>
            <h2 id="setup-title" className="m-0 font-display text-[clamp(26px,5vw,48px)] leading-[0.95] text-pink">
              ARMA LA <span className="text-yellow">JUGADA</span>
            </h2>
            <p className="mt-1.5 text-sm font-bold text-mist sm:mt-2 sm:text-base">
              Equipos, categorías y reglas. Todo en un solo lugar.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="btn-chunky flex h-12 w-12 flex-none items-center justify-center border-3 border-white bg-transparent text-white"
          >
            <Cross size={22} />
          </button>
        </header>

        {/* 1 · Teams */}
        <section className="flex flex-col gap-4" aria-labelledby="teams-h">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="teams-h" className="m-0 font-display text-[22px]">
              <span className="text-green">1 ·</span> EQUIPOS{' '}
              <span className="text-sm text-muted">
                ({s.teams.length}/{MAX_TEAMS})
              </span>
            </h3>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'setTeams', teams: fillNames(s.teams) });
                setFocus(-1);
              }}
              className="btn-chunky inline-flex min-h-11 items-center gap-2 bg-green px-3.5 py-2.5 font-display text-[13px] text-ink shadow-[4px_4px_0_#fff]"
            >
              <Dice dots={3} /> NOMBRES AL AZAR
            </button>
          </div>

          <AnimatePresence initial={false}>
            {s.teams.map((t, k) => {
              const color = teamColor(k);
              const sugs = focus === k ? suggestNames(s.teams, k) : [];
              const listId = `sugs-${k}`;
              return (
                <motion.div
                  key={k}
                  layout
                  initial={{ opacity: 0, x: -60, rotate: -3 }}
                  animate={{ opacity: 1, x: 0, rotate: 0 }}
                  exit={{ opacity: 0, x: 60, scale: 0.9 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 22,
                    delay: k * 0.05,
                  }}
                  className="border-l-6 bg-ink p-3.5"
                  style={{ borderColor: color }}
                >
                  <div className="flex items-end gap-3">
                    <motion.span
                      key={t.name.trim().charAt(0) || k}
                      initial={{ scale: 0.4, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      aria-hidden="true"
                      className="hidden h-12 w-12 flex-none items-center justify-center rounded-full font-display text-[22px] text-ink sm:flex"
                      style={{ background: color }}
                    >
                      {(t.name.trim() || String(k + 1)).charAt(0).toUpperCase()}
                    </motion.span>
                    <label className="flex min-w-0 flex-1 flex-col gap-1.5 font-display text-xs" style={{ color }}>
                      EQUIPO {k + 1}
                      <input
                        type="text"
                        value={t.name}
                        maxLength={24}
                        autoComplete="off"
                        placeholder="Escribe o elige una sugerencia"
                        role="combobox"
                        aria-expanded={sugs.length > 0}
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={sugs.length && activeSug >= 0 ? `${listId}-${activeSug}` : undefined}
                        onChange={(e) => {
                          dispatch({
                            type: 'setTeamName',
                            k,
                            name: e.target.value,
                          });
                          setFocus(k);
                          setActiveSug(-1);
                        }}
                        onFocus={() => {
                          setFocus(k);
                          setActiveSug(-1);
                        }}
                        onKeyDown={(e) => onInputKey(e, k, sugs)}
                        className="min-h-12 w-full border-3 border-line bg-field px-3 py-2.5 font-body text-lg font-bold text-white focus:border-current"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({
                          type: 'setTeamName',
                          k,
                          name: randomName(s.teams, k),
                        });
                        setFocus(-1);
                      }}
                      aria-label={`Nombre al azar para el equipo ${k + 1}`}
                      className="btn-chunky flex h-12 w-12 flex-none items-center justify-center border-3 bg-transparent"
                      style={{ borderColor: color, color }}
                    >
                      <Dice />
                    </button>
                    {s.teams.length > MIN_TEAMS && (
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({ type: 'removeTeam', k });
                          setFocus(-1);
                        }}
                        aria-label={`Quitar el equipo ${k + 1}`}
                        className="btn-chunky flex h-12 w-12 flex-none items-center justify-center border-3 border-line bg-transparent text-mist"
                      >
                        <Cross />
                      </button>
                    )}
                  </div>
                  {sugs.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 sm:ml-15">
                      <span className="text-[13px] font-bold text-muted">
                        {t.name.trim() ? '¿Quisiste decir?' : 'Sugerencias:'}
                      </span>
                      <ul
                        id={listId}
                        role="listbox"
                        aria-label="Sugerencias de nombre"
                        className="m-0 flex list-none flex-wrap gap-2 p-0"
                      >
                        {sugs.map((name, i) => (
                          <motion.li
                            key={name}
                            id={`${listId}-${i}`}
                            role="option"
                            aria-selected={i === activeSug}
                            initial={{ opacity: 0, y: 16, scale: 0.6 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 18,
                              delay: i * 0.05,
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickSug(k, name)}
                            className="btn-chunky flex min-h-11 cursor-pointer items-center border-2 px-3 py-2 text-sm font-bold"
                            style={{
                              borderColor: color,
                              background: i === activeSug ? color : '#1E1E28',
                              color: i === activeSug ? '#0B0B0F' : '#fff',
                            }}
                          >
                            {name}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {s.teams.length < MAX_TEAMS && (
            <motion.button
              layout
              type="button"
              onClick={() => {
                dispatch({ type: 'addTeam' });
                setFocus(s.teams.length);
                setTimeout(() => {
                  const inputs = dialogRef.current?.querySelectorAll<HTMLInputElement>('input');
                  inputs?.[inputs.length - 1]?.focus();
                }, 60);
              }}
              className="btn-chunky min-h-14 border-3 border-dashed border-yellow bg-transparent p-3.5 font-display text-base text-yellow"
            >
              + AGREGAR EQUIPO
            </motion.button>
          )}
        </section>

        {/* 2 · Categories */}
        <section className="flex flex-col gap-4" aria-labelledby="cats-h">
          <h3 id="cats-h" className="m-0 font-display text-[22px]">
            <span className="text-green">2 ·</span> CATEGORÍAS{' '}
            <span className="text-sm text-muted">
              ({n} elegidas · {selWords} palabras)
            </span>
          </h3>
          <div role="group" aria-label="Combinaciones rápidas" className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => dispatch({ type: 'setSel', sel: p.ids })}
                className="btn-chunky min-h-11 bg-white px-3.5 py-2.5 font-display text-[13px] text-ink uppercase shadow-[3px_3px_0_var(--color-pink)]"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Categorías" className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
            {CATEGORIES.map((c) => {
              const on = s.sel.includes(c.id);
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => dispatch({ type: 'toggleCat', id: c.id })}
                  animate={{ scale: on ? 1.03 : 1, rotate: on ? -1 : 0 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="flex min-h-16 cursor-pointer flex-col gap-1 border-3 p-3 text-left font-display text-sm uppercase"
                  style={{
                    borderColor: c.color,
                    background: on ? c.color : 'transparent',
                    color: on ? '#0B0B0F' : c.color,
                  }}
                >
                  <span>
                    {on ? '✓' : '+'} {c.short}
                  </span>
                  <span className="font-body text-xs font-bold normal-case">
                    {wordPool(c.id, s).length} {c.genres ? 'canciones y más' : 'palabras'}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Music: genres + difficulty, only while Música is selected */}
          <AnimatePresence initial={false}>
            {musicOn && (
              <motion.div
                key="music"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-4 border-3 border-yellow bg-ink p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p id="genres-h" className="m-0 flex items-center gap-2 font-display text-lg text-yellow">
                      <svg
                        aria-hidden="true"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                      MÚSICA: ¿QUÉ GÉNEROS?
                    </p>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'setGenres', ids: ALL_GENRE_IDS })}
                      className="btn-chunky min-h-11 border-2 border-yellow bg-transparent px-3 py-2 font-display text-xs text-yellow"
                    >
                      TODOS LOS GÉNEROS
                    </button>
                  </div>
                  <div role="group" aria-labelledby="genres-h" className="flex flex-wrap gap-2">
                    {MUSIC_GENRES.map((g, i) => {
                      const on = s.musicGenres.includes(g.id);
                      return (
                        <motion.button
                          key={g.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => dispatch({ type: 'toggleGenre', id: g.id })}
                          initial={{ opacity: 0, y: 12, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: on ? 1.04 : 1 }}
                          whileTap={{ scale: 0.92 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 20,
                            delay: i * 0.03,
                          }}
                          className="flex min-h-11 cursor-pointer items-center gap-2 border-2 px-3 py-2 text-sm font-bold"
                          style={{
                            borderColor: g.color,
                            background: on ? g.color : 'transparent',
                            color: on ? '#0B0B0F' : g.color,
                          }}
                        >
                          <span className="font-display text-xs">{on ? '✓' : '+'}</span>
                          {g.name}
                          <span className="text-xs opacity-80">({genreCount(g.id)})</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <p id="level-h" className="m-0 mt-1 font-display text-lg text-yellow">
                    DIFICULTAD
                  </p>
                  <div
                    role="group"
                    aria-labelledby="level-h"
                    className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2"
                  >
                    {LEVELS.map((l, i) => {
                      const on = s.musicLevel === l.id;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => dispatch({ type: 'setMusicLevel', level: l.id })}
                          className={`btn-chunky flex min-h-16 flex-col gap-1 border-3 border-white p-3 text-left ${on ? 'bg-white text-ink' : 'bg-transparent text-white'}`}
                        >
                          <span className="font-display text-base">
                            {'★'.repeat(i + 1)}
                            <span className="opacity-30">{'★'.repeat(2 - i)}</span> {l.label.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold">{l.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="m-0 text-sm font-bold text-mist">
                    {wordPool(MUSIC_ID, s).length} cartas de música en juego. Quien actúa ve el artista como pista.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div role="group" aria-label="Modo de juego" className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
            {(
              [
                {
                  id: 'ruleta',
                  label: 'RULETA',
                  desc: 'Cada turno la ruleta elige una de tus categorías.',
                },
                {
                  id: 'mezcla',
                  label: 'MEZCLA TOTAL',
                  desc: 'Palabras de todas tus categorías, revueltas en un solo mazo.',
                },
              ] as const
            ).map((m) => {
              const on = s.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => dispatch({ type: 'setMode', mode: m.id })}
                  className={`btn-chunky flex min-h-20 flex-col gap-1.5 border-3 border-cyan p-4 text-left ${on ? 'bg-cyan text-ink' : 'bg-transparent text-white'}`}
                >
                  <span className="font-display text-lg">{m.label}</span>
                  <span className="text-sm font-bold">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3 · Rules */}
        <div className="flex flex-wrap gap-8">
          <section className="flex flex-col gap-3" aria-labelledby="time-h">
            <h3 id="time-h" className="m-0 font-display text-[22px]">
              <span className="text-green">3 ·</span> TIEMPO
            </h3>
            <div role="group" aria-labelledby="time-h" className="flex gap-2">
              {DURATIONS.map((d) => (
                <Toggle key={d} on={s.dur === d} onClick={() => dispatch({ type: 'setDur', dur: d })}>
                  {d}s
                </Toggle>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-3" aria-labelledby="rounds-h">
            <h3 id="rounds-h" className="m-0 font-display text-[22px]">
              <span className="text-green">4 ·</span> RONDAS
            </h3>
            <div role="group" aria-labelledby="rounds-h" className="flex gap-2">
              {ROUND_OPTIONS.map((r) => (
                <Toggle key={r} on={s.rounds === r} onClick={() => dispatch({ type: 'setRounds', rounds: r })}>
                  {r}
                </Toggle>
              ))}
            </div>
          </section>
        </div>

        {/* Phones: always reachable at the bottom while scrolling the setup */}
        <footer className="sticky bottom-0 z-20 -mx-4 mt-auto flex flex-wrap items-center justify-between gap-3 border-t-3 border-yellow bg-panel px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] sm:static sm:m-0 sm:gap-4 sm:border-t-3 sm:border-dashed sm:border-line sm:px-0 sm:pt-6 sm:pb-0">
          <p className="m-0 max-w-md text-xs font-bold text-mist sm:text-base">
            {summary}.{inGame && ' Empezar reinicia el marcador.'}
          </p>
          <button
            type="button"
            onClick={onStart}
            className="btn-chunky anim-pulse min-h-15 w-full bg-pink px-8 py-3.5 font-display text-2xl text-white shadow-[5px_5px_0_var(--color-yellow)] sm:min-h-17 sm:w-auto sm:py-4.5 sm:text-[26px] sm:shadow-[6px_6px_0_var(--color-yellow)]"
          >
            ¡A JUGAR!
          </button>
        </footer>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
