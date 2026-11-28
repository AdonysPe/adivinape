import { useEffect, useMemo, useRef, type CSSProperties, type Dispatch } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react';
import Wheel from './Wheel';
import { DESKTOP_QUERY, useMedia } from './useMedia';
import {
  TEAM_COLORS,
  cat,
  currentCard,
  isLastTurn,
  ranking,
  teamColor,
  teamLabel,
  verdict,
  wordPool,
  type Action,
  type Card,
  type GameState,
} from '../../lib/game';

type P = { s: GameState; dispatch: Dispatch<Action> };

const spring = { type: 'spring', stiffness: 320, damping: 18 } as const;
const big = 'btn-chunky min-h-16 px-7 py-4.5 font-display text-[22px] text-ink bg-yellow shadow-[6px_6px_0_var(--color-pink)]';
const ghost = 'btn-chunky min-h-16 border-3 border-cyan bg-transparent px-6 py-3.5 font-display text-[22px] text-cyan';

export function Idle({ onSetup, onQuick }: { onSetup: () => void; onQuick: () => void }) {
  const stickers = [
    {
      name: 'LOS CHÉVERES',
      color: '#FF2E93',
      shadow: '#FFE600',
      pos: 'left-2.5 top-5',
      rot: -6,
      delay: 0,
    },
    {
      name: 'LAS CAUSITAS',
      color: '#00E676',
      shadow: '#00B8FF',
      pos: 'right-0 top-32',
      rot: 4,
      delay: 0.15,
    },
    {
      name: 'LOS CUYES FURIOSOS',
      color: '#00B8FF',
      shadow: '#FF2E93',
      pos: 'left-10 top-62',
      rot: -2,
      delay: 0.3,
    },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-14">
      <div className="min-w-0 flex-[1_1_460px]">
        <h2 className="m-0 font-display text-[clamp(40px,6vw,76px)] leading-[0.92] text-pink">
          ¿QUIÉNES
          <br />
          <span className="text-yellow">JUEGAN</span>
          <br />
          <span className="text-green">HOY?</span>
        </h2>
        <p className="mt-5 max-w-md text-xl leading-snug font-bold text-mist">
          De 2 a 6 equipos. Ponles nombre o deja que te sugiramos uno bien chévere.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <button type="button" onClick={onSetup} className={big}>
            ARMAR EQUIPOS
          </button>
          <button type="button" onClick={onQuick} className={ghost}>
            JUEGO RÁPIDO
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="relative h-90 min-w-0 flex-[0_1_380px]">
        {stickers.map((st) => (
          <motion.div
            key={st.name}
            className={`absolute w-55 p-4.5 font-display text-[22px] text-ink ${st.pos}`}
            style={{
              background: st.color,
              boxShadow: `8px 8px 0 ${st.shadow}`,
            }}
            initial={{ opacity: 0, y: -80, rotate: st.rot - 20 }}
            whileInView={{ opacity: 1, y: 0, rotate: st.rot }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: st.delay }}
          >
            <div className="anim-wobble" style={{ animationDelay: `${st.delay * 4}s` }}>
              {st.name}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ReadyCard({ s, dispatch, sheet = false }: P & { sheet?: boolean }) {
  const mezcla = s.mode === 'mezcla';
  const c = cat(s.cat);
  const n = s.sel.length;
  const pool = wordPool(s.cat, s, s.round);
  const selWords = s.sel.reduce((a, id) => a + wordPool(id, s, s.round).length, 0);
  return (
    <div
      className={`text-ink ${!mezcla && c.id === 'navidad' ? 'snow' : ''} ${sheet ? 'p-5 shadow-[0_-8px_40px_rgba(0,0,0,.6),6px_6px_0_#fff]' : 'p-6.5 shadow-[10px_10px_0_#fff]'}`}
      style={{ backgroundColor: mezcla ? '#FFE600' : c.color, '--flake': '#8CCBFF' } as CSSProperties}
    >
      <p className="m-0 font-display text-[15px]">{mezcla ? 'MEZCLA TOTAL' : '¡TE TOCÓ!'}</p>
      <p className={`m-0 mt-1.5 font-display leading-[0.95] uppercase ${sheet ? 'text-[clamp(28px,9vw,40px)]' : 'text-[42px]'}`}>
        {mezcla ? `${n} ${n === 1 ? 'categoría' : 'categorías'}` : c.name}
      </p>
      <span className="mt-2 inline-block bg-ink px-2 py-0.5 font-display text-xs text-yellow">
        RONDA {s.round} · DIFICULTAD AL AZAR
      </span>
      <p className="mt-2 mb-0 text-[15px] font-bold sm:text-base">
        {mezcla
          ? `${selWords} palabras revueltas · ${s.dur} segundos`
          : `${pool.length} cartas · ej. ${pool
              .slice(0, 3)
              .map((x) => x.w)
              .join(', ')}`}
      </p>
      <button
        type="button"
        autoFocus
        onClick={() => dispatch({ type: 'startTurn' })}
        className={`btn-chunky anim-pulse mt-4 min-h-15 bg-ink px-7 py-4 font-display text-2xl text-yellow shadow-[5px_5px_0_var(--color-pink)] ${sheet ? 'w-full' : ''}`}
      >
        ¡EMPEZAR!
      </button>
    </div>
  );
}

export function TurnSetup({ s, dispatch }: P) {
  const desktop = useMedia(DESKTOP_QUERY);
  const color = teamColor(s.turn);
  const mezcla = s.mode === 'mezcla';
  const n = s.sel.length;
  const ready = s.phase === 'ready';
  const spin = () => {
    navigator.vibrate?.(20);
    dispatch({ type: 'spin', j: Math.floor(Math.random() * n) });
  };

  return (
    <div className="flex flex-col items-center gap-5 pb-40 lg:flex-row lg:justify-center lg:gap-16 lg:pb-0 landscape-phone:flex-row landscape-phone:gap-6 landscape-phone:pb-28">
      {/* Who plays: first on phones, beside the wheel on wide screens */}
      <div className="flex w-full min-w-0 flex-col gap-1 text-center lg:order-last lg:flex-[1_1_420px] lg:gap-5 lg:text-left landscape-phone:order-last landscape-phone:flex-1 landscape-phone:text-left">
        <p className="m-0 font-display text-sm text-mist sm:text-lg">LE TOCA A</p>
        <motion.p
          className="m-0 font-display text-[clamp(34px,10vw,72px)] leading-[0.92] uppercase [overflow-wrap:anywhere] [text-shadow:4px_4px_0_#000]"
          style={{ color }}
          initial={{ y: -60, scale: 1.6, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={spring}
        >
          {teamLabel(s.teams, s.turn)}
        </motion.p>
        <p className="m-0 mt-1 text-sm font-bold text-mist sm:text-[17px]">Elijan quién actúa. El resto del equipo adivina.</p>
        {desktop && (
          <div className="mt-2">
            <AnimatePresence mode="wait">
              {ready ? (
                <motion.div
                  key="ready"
                  initial={{ scale: 0.3, rotate: -14, opacity: 0 }}
                  animate={{ scale: 1, rotate: -1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                >
                  <ReadyCard s={s} dispatch={dispatch} />
                </motion.div>
              ) : (
                <motion.div
                  key="hint"
                  className="border-3 border-dashed border-line p-6.5 text-lg leading-snug font-bold text-mist"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  Gira la ruleta y la suerte elige la categoría de este turno.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {mezcla ? (
        <div
          aria-hidden="true"
          className="relative h-[min(440px,46dvh)] w-full min-w-0 lg:flex-[1_1_420px] landscape-phone:h-[70dvh]"
        >
          {s.sel.slice(0, 6).map((id, k, arr) => {
            const mid = (arr.length - 1) / 2;
            const cc = cat(id);
            return (
              <motion.div
                key={id}
                className="absolute top-1/2 left-1/2 flex h-[min(300px,40dvh)] w-[min(220px,52vw)] -translate-x-1/2 -translate-y-1/2 flex-col justify-between p-4 text-ink shadow-[6px_6px_0_#0B0B0F]"
                style={{ background: cc.color }}
                initial={{ opacity: 0, y: -260, rotate: -40, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  rotate: (k - mid) * 9,
                  x: (k - mid) * 26,
                  scale: 1,
                }}
                transition={{ ...spring, delay: k * 0.12 }}
              >
                <span className="font-display text-xs">{wordPool(id, s, s.round).length} CARTAS</span>
                <span className="font-display text-[clamp(20px,6vw,28px)] leading-[0.95] uppercase">{cc.name}</span>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-w-0 flex-col items-center lg:flex-[1_1_460px]">
          <Wheel sel={s.sel} rot={s.rot} spinning={s.phase === 'spinning'} onSpinEnd={() => dispatch({ type: 'spinDone' })} />
          <button
            type="button"
            onClick={spin}
            disabled={s.phase !== 'intro'}
            className="btn-chunky mt-6 min-h-15 w-full max-w-xs bg-yellow px-10 py-4 font-display text-[26px] text-ink shadow-[6px_6px_0_var(--color-pink)] lg:mt-10 lg:w-auto"
          >
            {s.phase === 'spinning' ? 'GIRANDO…' : ready ? '¡LISTO!' : '¡GIRA!'}
          </button>
        </div>
      )}

      {/* Phones: the category slides up as a bottom sheet, right under the thumb */}
      {/* Portaled so the screen's own enter animation (a transform) can't move a fixed sheet. */}
      {!desktop &&
        createPortal(
          <AnimatePresence>
            {ready && (
              <motion.div
                key="sheet"
                className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 mx-auto max-w-md landscape-phone:right-3 landscape-phone:left-auto landscape-phone:w-[46vw]"
                initial={{ y: '120%', rotate: 3 }}
                animate={{ y: 0, rotate: 0 }}
                exit={{ y: '120%' }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 22,
                  delay: 0.15,
                }}
              >
                <ReadyCard s={s} dispatch={dispatch} sheet />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/** One card on screen. Drag right = ¡Acerté!, left = Paso; each card owns its drag position. */
function SwipeCard({ card, color, onSwipe }: { card: Card; color: string; onSwipe: (dir: 1 | -1) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-16, 16]);
  const hitOpacity = useTransform(x, [20, 110], [0, 1]);
  const passOpacity = useTransform(x, [-110, -20], [1, 0]);

  return (
    <motion.div
      className={`absolute inset-0 flex cursor-grab touch-pan-y flex-col items-center justify-center overflow-hidden bg-yellow px-4 py-6 text-center text-ink active:cursor-grabbing sm:px-6 sm:py-10 landscape-phone:py-3 ${card.c === 'navidad' ? 'snow' : ''}`}
      style={{ x, rotate }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.7}
      onDragEnd={(_, info) => {
        if (info.offset.x > 110 || info.velocity.x > 700) onSwipe(1);
        else if (info.offset.x < -110 || info.velocity.x < -700) onSwipe(-1);
      }}
      variants={{
        enter: { scale: 0.85, opacity: 0, y: 30 },
        center: {
          scale: 1,
          opacity: 1,
          y: 0,
          transition: { type: 'spring', stiffness: 420, damping: 24 },
        },
        exit: (d: number) => ({
          x: d * 520,
          rotate: d * 24,
          opacity: 0,
          transition: { duration: 0.3, ease: 'easeIn' },
        }),
      }}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <motion.span
        aria-hidden="true"
        style={{ opacity: hitOpacity }}
        className="absolute top-4 left-4 -rotate-12 border-4 border-[#00A152] px-2 py-1 font-display text-lg text-[#00A152]"
      >
        ¡ACERTÉ!
      </motion.span>
      <motion.span
        aria-hidden="true"
        style={{ opacity: passOpacity }}
        className="absolute top-4 right-4 rotate-12 border-4 border-pink-deep px-2 py-1 font-display text-lg text-pink-deep"
      >
        PASO
      </motion.span>

      <p className="m-0 font-display text-sm text-pink-deep sm:text-lg">ACTÚA SIN HABLAR:</p>
      <p className="m-0 mt-2 font-display text-[clamp(32px,min(11vw,8dvh),88px)] leading-[0.95] uppercase [overflow-wrap:anywhere] sm:mt-3.5">
        {card.w}
      </p>
      {(card.hint || card.d || card.keys?.length) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-3 flex max-w-xl flex-col items-center gap-2 sm:mt-4 sm:gap-2.5"
        >
          <p className="m-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-base font-bold sm:text-lg">
            {card.keys?.length ? <span className="font-display text-xs tracking-wide text-pink-deep">PISTA:</span> : null}
            {card.hint && <span>{card.hint}</span>}
            {card.d && (
              <span className="bg-ink px-2 py-0.5 font-display text-sm text-yellow" aria-label={`Dificultad ${card.d} de 3`}>
                {'★'.repeat(card.d)}
                <span className="opacity-30">{'★'.repeat(3 - card.d)}</span>
              </span>
            )}
          </p>
          {card.keys?.length ? (
            <ul aria-label="Datos clave" className="m-0 flex list-none flex-wrap justify-center gap-1.5 p-0 sm:gap-2">
              {card.keys.map((k, i) => (
                <motion.li
                  key={k}
                  initial={{ opacity: 0, scale: 0.6, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 18,
                    delay: 0.25 + i * 0.07,
                  }}
                  className="bg-ink px-2 py-1 text-[13px] font-bold text-white sm:px-2.5 sm:text-sm"
                >
                  {k}
                </motion.li>
              ))}
            </ul>
          ) : null}
        </motion.div>
      )}
    </motion.div>
  );
}

export function Playing({ s, dispatch }: P) {
  const card = currentCard(s);
  const color = teamColor(s.turn);
  const low = s.timeLeft <= 10;
  const ring = 2 * Math.PI * 38;
  const cc = card ? cat(card.c) : null;
  const dir = useRef<1 | -1>(1);

  // Haptic countdown for the last seconds (the actor isn't watching the timer).
  useEffect(() => {
    if (s.timeLeft > 0 && s.timeLeft <= 3) navigator.vibrate?.(60);
  }, [s.timeLeft]);

  const act = (d: 1 | -1) => {
    dir.current = d;
    navigator.vibrate?.(d === 1 ? 35 : 12);
    dispatch({ type: d === 1 ? 'hit' : 'pass' });
  };

  return (
    <div className="mx-auto flex h-full max-w-225 flex-col gap-3 sm:gap-6 landscape-phone:grid landscape-phone:grid-cols-[1fr_minmax(160px,30%)] landscape-phone:grid-rows-[auto_1fr] landscape-phone:gap-3">
      <div className="flex items-center justify-between gap-3 landscape-phone:col-span-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-display text-base uppercase sm:text-[22px] landscape-phone:text-base" style={{ color }}>
            {teamLabel(s.teams, s.turn)}
          </span>
          <AnimatePresence mode="popLayout">
            {cc && (
              <motion.span
                key={cc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="self-start px-2 py-1 font-display text-xs text-ink uppercase sm:px-2.5 sm:py-1.5 sm:text-sm"
                style={{ background: cc.color }}
              >
                {cc.name}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-none items-center gap-3 sm:gap-5">
          <span aria-live="polite" className="font-display text-lg text-green sm:text-[22px]">
            ✓ {s.hits.length}
          </span>
          <div
            className="relative h-16 w-16 sm:h-22 sm:w-22 landscape-phone:h-12 landscape-phone:w-12"
            role="timer"
            aria-label={`${s.timeLeft} segundos`}
          >
            <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="44" cy="44" r="38" fill="none" stroke="#2A2A35" strokeWidth="10" />
              <circle
                cx="44"
                cy="44"
                r="38"
                fill="none"
                stroke={low ? '#FF2E93' : '#FFE600'}
                strokeWidth="10"
                strokeDasharray={ring}
                strokeDashoffset={ring * (1 - s.timeLeft / s.dur)}
                style={{
                  transition: 'stroke-dashoffset 1s linear, stroke .3s',
                }}
              />
            </svg>
            <span
              className={`absolute inset-0 flex items-center justify-center font-display text-xl sm:text-[26px] landscape-phone:text-base ${low ? 'anim-shake text-pink' : 'text-yellow'}`}
            >
              {s.timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* The card stack: team-colored layers behind, the live card on top */}
      <div className="relative min-h-[220px] flex-1 sm:min-h-80 landscape-phone:min-h-0">
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-x-4 translate-y-4 bg-cyan sm:translate-x-7 sm:translate-y-7"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-x-2 translate-y-2 sm:translate-x-3.5 sm:translate-y-3.5"
          style={{ background: color }}
        />
        <AnimatePresence initial={false} custom={dir.current}>
          {card && <SwipeCard key={`${s.pos}-${card.c}-${card.w}`} card={card} color={color} onSwipe={act} />}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-2 pt-2 sm:pt-4 landscape-phone:justify-center landscape-phone:pt-0">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 landscape-phone:grid-cols-1">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92, rotate: -3 }}
            onClick={() => act(-1)}
            className="flex min-h-18 cursor-pointer items-center justify-center gap-2 border-4 border-pink bg-transparent p-3 font-display text-2xl text-pink sm:min-h-20 sm:text-[28px] landscape-phone:min-h-14 landscape-phone:text-xl"
          >
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            PASO
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92, rotate: 3 }}
            onClick={() => act(1)}
            className="flex min-h-18 cursor-pointer items-center justify-center gap-2 bg-green p-3 font-display text-2xl text-ink shadow-[5px_5px_0_#fff] sm:min-h-20 sm:text-[28px] landscape-phone:min-h-14 landscape-phone:text-xl"
          >
            ¡ACERTÉ!
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </motion.button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-muted sm:text-sm landscape-phone:hidden">
            <span className="sm:hidden">Desliza la carta: → acertaste, ← paso</span>
            <span className="hidden sm:inline">Atajos: → o Espacio acertaste, ← paso</span>
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'endTurn' })}
            className="min-h-11 flex-none cursor-pointer border-0 bg-transparent px-1 text-sm font-bold text-mist underline"
          >
            Terminar turno
          </button>
        </div>
      </div>
    </div>
  );
}

export function TurnDone({ s, dispatch }: P) {
  const next = isLastTurn(s) ? 'VER EL PODIO' : `TURNO DE ${teamLabel(s.teams, (s.turn + 1) % s.teams.length).toUpperCase()}`;
  const chips = [...s.hits.map((c) => ({ ...c, ok: true })), ...s.passes.map((c) => ({ ...c, ok: false }))];
  return (
    <div className="mx-auto flex max-w-225 flex-col items-center gap-3 text-center sm:gap-4.5">
      <p className="m-0 font-display text-base text-yellow sm:text-xl">¡SE ACABÓ EL TIEMPO!</p>
      <p
        className="m-0 font-display text-[clamp(20px,6vw,28px)] uppercase [overflow-wrap:anywhere]"
        style={{ color: teamColor(s.turn) }}
      >
        {teamLabel(s.teams, s.turn)} SUMÓ
      </p>
      <motion.p
        className="m-0 font-shade text-[clamp(88px,26vw,180px)] leading-[0.9] text-green"
        initial={{ scale: 0.2, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 12,
          delay: 0.15,
        }}
      >
        {s.hits.length}
      </motion.p>
      <p className="m-0 font-display text-lg uppercase sm:text-2xl">{verdict(s.hits.length)}</p>
      <ul className="m-0 flex max-w-190 list-none flex-wrap justify-center gap-1.5 p-0 sm:gap-2">
        {chips.map((c, i) => (
          <motion.li
            key={`${c.c}-${c.w}-${i}`}
            initial={{ opacity: 0, y: 16, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 18,
              delay: 0.3 + i * 0.05,
            }}
            className={`font-display text-xs uppercase sm:text-sm ${c.ok ? 'bg-green px-2.5 py-1.5 text-ink sm:px-3 sm:py-2' : 'border-2 border-pink px-2 py-1 text-pink sm:px-2.5 sm:py-1.5'}`}
          >
            {c.ok ? '✓' : '✗'} {c.w}
          </motion.li>
        ))}
      </ul>
      {/* Stays under the thumb on phones even with a long list of words */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-2 w-[calc(100%+2.5rem)] bg-linear-to-t from-panel from-60% to-transparent px-5 pt-6 pb-[max(12px,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:w-auto sm:bg-none sm:p-0">
        <button type="button" autoFocus onClick={() => dispatch({ type: 'nextTurn' })} className={`${big} w-full sm:w-auto`}>
          {next}
        </button>
      </div>
    </div>
  );
}

export function Podium({ s, dispatch, onNewTeams }: P & { onNewTeams: () => void }) {
  const rank = ranking(s);
  const tie = rank.length > 1 && rank[0].score === rank[1].score;
  const winners = rank.filter((r) => r.score === rank[0].score);
  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: Math.random() * 100,
        w: 8 + Math.random() * 10,
        h: 12 + Math.random() * 14,
        color: TEAM_COLORS[i % TEAM_COLORS.length],
        dur: 3 + Math.random() * 3,
        delay: Math.random() * 4,
      })),
    [],
  );
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-6 -top-18 -bottom-22 overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="anim-fall absolute -top-5"
            style={{
              left: `${c.left}%`,
              width: c.w,
              height: c.h,
              background: c.color,
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}
      </div>
      <div className="relative mx-auto flex max-w-215 flex-col items-center gap-4.5 text-center">
        <svg className="anim-crown" aria-hidden="true" width="84" height="64" viewBox="0 0 84 64">
          <path
            d="M6 56L2 14l22 18L42 4l18 28 22-18-4 42z"
            fill="#FFE600"
            stroke="#0B0B0F"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="42" cy="40" r="6" fill="#FF2E93" />
        </svg>
        <p className="m-0 font-display text-base text-yellow sm:text-xl">
          {tie ? '¡EMPATE! COMPARTEN LA CORONA' : '¡Y LOS GANADORES SON!'}
        </p>
        <motion.p
          className="anim-flicker m-0 font-display text-[clamp(36px,11vw,104px)] leading-[0.9] uppercase [overflow-wrap:anywhere]"
          style={{
            color: rank[0]?.color,
            textShadow: `0 0 22px ${rank[0]?.color}, 6px 6px 0 #000`,
          }}
          initial={{ scale: 0.3, y: 60, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 12 }}
        >
          {winners.map((w) => w.name).join(' y ')}
        </motion.p>
        <ol className="m-0 mt-4 flex w-full list-none flex-col gap-3 p-0">
          {rank.map((r, i) => (
            <li key={r.k} className="flex items-center gap-3.5 text-left">
              <span className="w-7 flex-none font-display text-xl sm:w-10 sm:text-[26px]">{r.place}</span>
              <div className="relative h-14 min-w-0 flex-1 bg-[#22222C]">
                <motion.div
                  className="absolute inset-y-0 left-0 origin-left"
                  style={{ width: `${r.pct}%`, background: r.color }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: 1.2,
                    ease: [0.2, 0.8, 0.2, 1],
                    delay: 0.4 + i * 0.25,
                  }}
                />
                <span className="absolute top-1/2 left-2 max-w-[calc(100%-1rem)] -translate-y-1/2 truncate bg-white/90 px-2 py-0.5 font-display text-sm text-ink uppercase sm:left-3.5 sm:text-lg">
                  {r.name}
                </span>
              </div>
              <span className="w-10 flex-none text-right font-display text-2xl sm:w-15 sm:text-[28px]" style={{ color: r.color }}>
                {r.score}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
          <button type="button" onClick={() => dispatch({ type: 'startGame' })} className={big}>
            ¡REVANCHA!
          </button>
          <button type="button" onClick={onNewTeams} className={ghost}>
            NUEVOS EQUIPOS
          </button>
        </div>
      </div>
    </>
  );
}
