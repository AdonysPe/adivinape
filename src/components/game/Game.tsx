import { useEffect, useReducer, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import SetupModal from './SetupModal';
import Scoreboard from './Scoreboard';
import { SPIN_SECONDS } from './Wheel';
import { Idle, Playing, Podium, TurnDone, TurnSetup } from './Screens';
import {
  ALL_GENRE_IDS,
  ALL_IDS,
  DURATIONS,
  ROUND_OPTIONS,
  fillNames,
  initialState,
  quickSettings,
  reducer,
  type GameState,
  type Settings,
} from '../../lib/game';

const SETTINGS_KEY = 'adivinape:settings:v2'; // localStorage: last teams and rules
const START_KEY = 'adivinape:start'; // sessionStorage: "start a game as soon as /jugar loads"
const GAME_KEY = 'adivinape:game:v2'; // sessionStorage: the match in progress, survives a reload
export const PLAY_URL = '/jugar';

const store = {
  get(area: 'local' | 'session', key: string): string | null {
    try {
      return (area === 'local' ? localStorage : sessionStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(area: 'local' | 'session', key: string, value: string | null) {
    try {
      const s = area === 'local' ? localStorage : sessionStorage;
      if (value === null) s.removeItem(key);
      else s.setItem(key, value);
    } catch {
      /* storage unavailable (private mode, blocked): the game still works without it */
    }
  },
};

function loadSettings(): Partial<Settings> {
  const raw = store.get('local', SETTINGS_KEY);
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    const out: Partial<Settings> = {};
    if (Array.isArray(v.teams) && v.teams.length >= 2)
      out.teams = v.teams.slice(0, 6).map((t) => ({ name: String(t?.name ?? '').slice(0, 24) }));
    if (Array.isArray(v.sel)) {
      const sel = v.sel.filter((id) => ALL_IDS.includes(id));
      if (sel.length) out.sel = sel;
    }
    if (Array.isArray(v.musicGenres)) {
      const g = v.musicGenres.filter((id) => ALL_GENRE_IDS.includes(id));
      if (g.length) out.musicGenres = g;
    }
    if (v.mode === 'ruleta' || v.mode === 'mezcla') out.mode = v.mode;
    if (DURATIONS.includes(Number(v.dur))) out.dur = Number(v.dur);
    if (ROUND_OPTIONS.includes(Number(v.rounds))) out.rounds = Number(v.rounds);
    if (v.musicLevel === 'facil' || v.musicLevel === 'mixta' || v.musicLevel === 'dificil') out.musicLevel = v.musicLevel;
    return out;
  } catch {
    return {};
  }
}

const pickSettings = (s: Settings): Settings => ({
  teams: s.teams,
  sel: s.sel,
  mode: s.mode,
  dur: s.dur,
  rounds: s.rounds,
  musicGenres: s.musicGenres,
  musicLevel: s.musicLevel,
});

/** Fade the page out where cross-document view transitions aren't available, then go. */
function goTo(url: string) {
  const vt = 'startViewTransition' in document;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (vt || reduce) {
    window.location.assign(url);
    return;
  }
  document.documentElement.classList.add('is-leaving');
  setTimeout(() => window.location.assign(url), 260);
}

type Props = { variant?: 'landing' | 'play' };

export default function Game({ variant = 'landing' }: Props) {
  const play = variant === 'play';
  const [s, dispatch] = useReducer(reducer, undefined, () => initialState());
  const [ready, setReady] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Boot: restore settings; on /jugar also resume a match or start the one just set up.
  useEffect(() => {
    const saved = loadSettings();
    if (play) {
      const rawGame = store.get('session', GAME_KEY);
      let resumed = false;
      if (rawGame) {
        try {
          const g = JSON.parse(rawGame) as GameState;
          if (g && g.phase && g.phase !== 'idle' && Array.isArray(g.teams)) {
            dispatch({
              type: 'restore',
              state: {
                ...initialState(),
                ...g,
                phase: g.phase === 'spinning' ? 'ready' : g.phase,
              },
            });
            resumed = true;
          }
        } catch {
          /* corrupt save: ignore */
        }
      }
      if (!resumed) {
        if (store.get('session', START_KEY)) {
          store.set('session', START_KEY, null);
          dispatch({ type: 'startGame', over: saved });
        } else {
          dispatch({ type: 'startGame', over: saved });
          dispatch({ type: 'openModal' });
        }
      }
    } else {
      dispatch({ type: 'restore', state: initialState(saved) });
    }
    setReady(true);
  }, [play]);

  // Remember teams and rules for next time.
  useEffect(() => {
    if (!ready) return;
    store.set('local', SETTINGS_KEY, JSON.stringify(pickSettings(s)));
  }, [ready, s.teams, s.sel, s.mode, s.dur, s.rounds, s.musicGenres, s.musicLevel]);

  // On /jugar, keep the match in sessionStorage so a reload doesn't lose it.
  useEffect(() => {
    if (!ready || !play) return;
    store.set('session', GAME_KEY, s.phase === 'idle' ? null : JSON.stringify({ ...s, modal: false }));
  }, [ready, play, s]);

  // Landing: hand the configured game over to /jugar.
  const launch = (over?: Partial<Settings>) => {
    const cfg = { ...pickSettings(s), ...over };
    cfg.teams = fillNames(cfg.teams);
    store.set('local', SETTINGS_KEY, JSON.stringify(cfg));
    store.set('session', GAME_KEY, null);
    store.set('session', START_KEY, '1');
    dispatch({ type: 'closeModal' });
    goTo(PLAY_URL);
  };
  const onStart = play ? () => dispatch({ type: 'startGame' }) : () => launch();
  const quick = play ? () => dispatch({ type: 'startGame', over: quickSettings() }) : () => launch(quickSettings());
  const openModal = () => dispatch({ type: 'openModal' });

  // Buttons on the landing page (nav, hero, posters) reach the island through this event.
  useEffect(() => {
    if (play) return;
    const onOpen = (e: Event) => {
      const { sel, quick: q } = (e as CustomEvent<{ sel?: string[]; quick?: boolean }>).detail ?? {};
      if (q) launch(quickSettings());
      else dispatch({ type: 'openModal', sel });
    };
    window.addEventListener('adivina:open', onOpen);
    return () => window.removeEventListener('adivina:open', onOpen);
  });

  // Turn countdown.
  useEffect(() => {
    if (s.phase !== 'playing') return;
    const iv = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(iv);
  }, [s.phase]);

  // Safety net in case the wheel's animation-complete callback never fires.
  useEffect(() => {
    if (s.phase !== 'spinning') return;
    const t = setTimeout(() => dispatch({ type: 'spinDone' }), SPIN_SECONDS * 1000 + 250);
    return () => clearTimeout(t);
  }, [s.phase, s.rot]);

  // Keyboard: → / Space = ¡Acerté!, ← = Paso.
  useEffect(() => {
    if (s.phase !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        dispatch({ type: 'hit' });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        dispatch({ type: 'pass' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.phase]);

  const view =
    s.phase === 'idle' || !play
      ? 'idle'
      : s.phase === 'playing'
        ? 'playing'
        : s.phase === 'turnDone'
          ? 'done'
          : s.phase === 'final'
            ? 'final'
            : 'setup';
  const viewKey = view === 'setup' ? `setup-${s.round}-${s.turn}` : view === 'done' ? `done-${s.round}-${s.turn}` : view;

  // On /jugar, start each screen at the top (the game scrolls inside <main>, not the window).
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (play && ready) mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [viewKey]);

  // Keep the phone screen awake while a match is on (re-acquired when coming back to the tab).
  const inMatch = play && s.phase !== 'idle';
  useEffect(() => {
    if (!inMatch || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) l.release().catch(() => {});
        else lock = l;
      } catch {
        /* denied (battery saver, no permission): the game works anyway */
      }
    };
    request();
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, [inMatch]);

  // Fullscreen toggle, only where the browser supports it (Android, desktop; not iPhone Safari).
  const [fs, setFs] = useState({ supported: false, on: false });
  useEffect(() => {
    if (!play) return;
    const update = () =>
      setFs({
        supported: !!document.fullscreenEnabled,
        on: !!document.fullscreenElement,
      });
    update();
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, [play]);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  };

  const exit = () => {
    const midGame = s.phase !== 'idle' && s.phase !== 'final';
    if (midGame && !confirmExit) {
      setConfirmExit(true);
      return;
    }
    store.set('session', GAME_KEY, null);
    goTo('/');
  };

  const screens = (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        className={play && view === 'playing' ? 'min-h-0 flex-1' : undefined}
        initial={{ opacity: 0, y: 40, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        exit={{ opacity: 0, y: -30, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {view === 'idle' && <Idle onSetup={openModal} onQuick={quick} />}
        {view === 'setup' && <TurnSetup s={s} dispatch={dispatch} />}
        {view === 'playing' && <Playing s={s} dispatch={dispatch} />}
        {view === 'done' && <TurnDone s={s} dispatch={dispatch} />}
        {view === 'final' && <Podium s={s} dispatch={dispatch} onNewTeams={openModal} />}
      </motion.div>
    </AnimatePresence>
  );

  const modal = (
    <AnimatePresence>{s.modal && <SetupModal key="setup" s={s} dispatch={dispatch} onStart={onStart} />}</AnimatePresence>
  );

  if (!play) {
    return (
      <MotionConfig reducedMotion="user">
        <section
          id="jugar"
          ref={sectionRef}
          aria-label="Jugar"
          className="relative mt-16 scroll-mt-4 overflow-hidden border-y-6 border-t-yellow border-b-pink bg-panel px-4 pt-12 pb-16 sm:px-6 sm:pt-18 sm:pb-22"
        >
          <div className="relative mx-auto max-w-6xl">{screens}</div>
        </section>
        {modal}
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      {/* Exactly one screen tall; the notch and home bar are respected. */}
      <div className="flex h-dvh flex-col bg-panel pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        <header className="flex flex-none items-center justify-between gap-3 px-4 py-2.5 sm:px-8 sm:py-4 landscape-phone:py-1">
          <a
            href="/"
            className="brand flex-none font-display text-lg text-pink no-underline sm:text-xl"
            onClick={(e) => (e.preventDefault(), exit())}
          >
            ADIVINA<span className="text-yellow">PE!</span>
          </a>
          <AnimatePresence mode="wait" initial={false}>
            {confirmExit ? (
              <motion.div
                key="confirm"
                role="alertdialog"
                aria-label="¿Salir de la partida?"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-wrap items-center justify-end gap-2"
              >
                <span className="text-xs font-bold text-mist sm:text-sm">
                  ¿Salir?
                  <span className="hidden sm:inline"> Se pierde la partida.</span>
                </span>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirmExit(false)}
                  className="btn-chunky min-h-11 bg-yellow px-3 py-2 font-display text-xs text-ink"
                >
                  SEGUIR JUGANDO
                </button>
                <button
                  type="button"
                  onClick={exit}
                  className="btn-chunky min-h-11 border-2 border-pink bg-transparent px-3 py-2 font-display text-xs text-pink"
                >
                  SÍ, SALIR
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="tools"
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {fs.supported && (
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={fs.on ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    aria-pressed={fs.on}
                    className="btn-chunky flex h-11 w-11 items-center justify-center border-2 border-line bg-transparent text-mist"
                  >
                    <svg
                      aria-hidden="true"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {fs.on ? (
                        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                      ) : (
                        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                      )}
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={exit}
                  className="btn-chunky flex min-h-11 items-center gap-2 border-2 border-line bg-transparent px-3 py-2 font-display text-xs text-mist"
                >
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  SALIR
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
        <main
          ref={mainRef}
          className={`relative min-h-0 flex-1 overflow-x-hidden px-4 pt-1 sm:px-8 sm:pt-4 landscape-phone:pt-0 ${
            view === 'playing'
              ? 'overflow-y-hidden pb-[max(12px,env(safe-area-inset-bottom))]'
              : 'overflow-y-auto overscroll-contain pb-[max(24px,env(safe-area-inset-bottom))]'
          }`}
        >
          <div className={`relative mx-auto max-w-6xl ${view === 'playing' ? 'flex h-full flex-col' : ''}`}>
            {ready && s.phase !== 'idle' && <Scoreboard s={s} onSettings={openModal} />}
            {ready && screens}
          </div>
        </main>
      </div>
      {modal}
    </MotionConfig>
  );
}
