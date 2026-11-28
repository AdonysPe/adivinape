import categoriesData from '../data/categories.json';
import teamNamesData from '../data/team-names.json';
import presetsData from '../data/presets.json';

export type Song = { w: string; a?: string; d: 1 | 2 | 3 };
export type Genre = { id: string; name: string; color: string; songs: Song[] };
/** A word with help for whoever acts it out: `h` says who/what it is, `k` gives 2–3 key clues, `d` is the level 1–3. */
export type WordEntry = { w: string; h?: string; k?: string[]; d?: 1 | 2 | 3 };
export type Category = {
  id: string;
  short: string;
  name: string;
  tag: string;
  color: string;
  shadow: string;
  words: (string | WordEntry)[];
  /** Optional sub-genres (music): words then come from the chosen genres and level. */
  genres?: Genre[];
};
/**
 * A card to act out. Everything besides `w` is help for the actor:
 * `hint` (artist, or who/what it is), `keys` (short clues), `d` (difficulty 1–3).
 */
export type Card = { w: string; c: string; hint?: string; keys?: string[]; d?: 1 | 2 | 3 };
export type Team = { name: string };
export type Mode = 'ruleta' | 'mezcla';
export type Level = 'facil' | 'mixta' | 'dificil';
export type Phase = 'idle' | 'intro' | 'spinning' | 'ready' | 'playing' | 'turnDone' | 'final';

export const CATEGORIES = categoriesData as Category[];
export const TEAM_NAMES = teamNamesData as string[];
export const ALL_IDS = CATEGORIES.map((c) => c.id);
export const PRESETS = (presetsData as { label: string; ids: string[] }[]).map((p) => ({
  label: p.label,
  ids: p.ids[0] === '*' ? ALL_IDS : p.ids,
}));
export const TEAM_COLORS = ['#FF2E93', '#00E676', '#FFE600', '#00B8FF', '#FF7A00', '#B388FF'];
export const DURATIONS = [30, 60, 90];
export const ROUND_OPTIONS = [1, 3, 5];
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;
const byId = new Map(CATEGORIES.map((c) => [c.id, c]));
export const cat = (id: string): Category => byId.get(id) ?? CATEGORIES[0];

export const MUSIC_ID = 'musica';
export const MUSIC_GENRES: Genre[] = cat(MUSIC_ID).genres ?? [];
export const ALL_GENRE_IDS = MUSIC_GENRES.map((g) => g.id);
export const LEVELS: { id: Level; label: string; desc: string }[] = [
  { id: 'facil', label: 'Fácil', desc: 'Solo las que todos conocen' },
  { id: 'mixta', label: 'Mixta', desc: 'De todo un poco' },
  { id: 'dificil', label: 'Difícil', desc: 'Para expertos melómanos' },
];
const levelOk = (level: Level, d: number) => (level === 'facil' ? d === 1 : level === 'dificil' ? d >= 2 : true);

/** Level the deck aims for each round: 1 = easy, 2 = medium, 3+ = hard. */
export const roundTier = (round: number): 1 | 2 | 3 => (round <= 1 ? 1 : round === 2 ? 2 : 3);
export const LEVEL_NAMES = ['', 'FÁCIL', 'MEDIA', 'DIFÍCIL'] as const;
export const levelName = (round: number) => LEVEL_NAMES[roundTier(round)];

/** Order of levels a round draws from: its own first, then the nearest ones. Every card stays in the pool. */
const TIER_ORDER: Record<1 | 2 | 3, number[]> = { 1: [1, 2, 3], 2: [2, 1, 3], 3: [3, 2, 1] };
const rank = (c: Card, round: number) => TIER_ORDER[roundTier(round)].indexOf(c.d ?? 2);

/** Whole pool, shuffled, with the round's own level first and the rest behind as backup. */
function forRound(cards: Card[], round: number): Card[] {
  return shuffle(cards).sort((x, y) => rank(x, round) - rank(y, round));
}

/** Every card a category can ever deal, ignoring filters (for counts and examples on the landing). */
export function fullPool(c: Category): Card[] {
  if (c.genres?.length) return c.genres.flatMap((g) => g.songs.map((s) => ({ w: s.w, c: c.id, hint: s.a, d: s.d })));
  return c.words.map((x) =>
    typeof x === 'string'
      ? { w: x, c: c.id, d: 2 }
      : { w: x.w, c: c.id, hint: x.h, keys: x.k, d: x.d ?? 2 },
  );
}

type MusicPrefs = { musicGenres: string[]; musicLevel: Level };

/** The cards a category deals with the music prefs and the current round's level applied. */
export function wordPool(id: string, prefs: MusicPrefs, round = 1): Card[] {
  const c = cat(id);
  if (!c.genres?.length) return forRound(fullPool(c), round);
  const genres = c.genres.filter((g) => prefs.musicGenres.includes(g.id));
  const chosen = genres.length ? genres : c.genres;
  const toCards = (filter: (s: Song) => boolean) =>
    chosen.flatMap((g) => g.songs.filter(filter).map((s) => ({ w: s.w, c: c.id, hint: s.a, d: s.d })));
  const cards = toCards((s) => levelOk(prefs.musicLevel, s.d));
  return forRound(cards.length ? cards : toCards(() => true), round); // never deal an empty deck
}

export const TOTAL_WORDS = CATEGORIES.reduce((a, c) => a + fullPool(c).length, 0);
export const teamColor = (i: number) => TEAM_COLORS[i % TEAM_COLORS.length];
export const teamLabel = (teams: Team[], i: number) => teams[i]?.name.trim() || `Equipo ${i + 1}`;

/** Lowercase, strip accents and trim, so "cuy" matches "Los Cuyes" and "chéveres" matches "cheveres". */
export const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function takenNames(teams: Team[], except: number) {
  return new Set(
    teams
      .filter((_, k) => k !== except)
      .map((t) => norm(t.name))
      .filter(Boolean),
  );
}

/** Name suggestions for team `k`: unused names that contain what was typed (or a rotating set when empty). */
export function suggestNames(teams: Team[], k: number, max = 5): string[] {
  const q = norm(teams[k]?.name ?? '');
  const taken = takenNames(teams, k);
  const pool = TEAM_NAMES.filter((n) => !taken.has(norm(n)));
  if (!pool.length) return [];
  if (!q) {
    const off = (k * max) % pool.length;
    return pool.slice(off).concat(pool.slice(0, off)).slice(0, max);
  }
  return pool.filter((n) => norm(n).includes(q) && norm(n) !== q).slice(0, max);
}

export function randomName(teams: Team[], k: number): string {
  const taken = takenNames(teams, k);
  const pool = TEAM_NAMES.filter((n) => !taken.has(norm(n)));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : `Equipo ${k + 1}`;
}

/** Trims names and gives every empty one a random, non-repeated name. */
export function fillNames(teams: Team[]): Team[] {
  const out = teams.map((t) => ({ name: t.name.trim() }));
  out.forEach((t, k) => {
    if (!t.name) t.name = randomName(out, k);
  });
  return out;
}

export const cardKey = (x: Card) => `${x.c}:${x.w}`;

/** Shuffled deck from the given categories and round, skipping cards already played this game until few remain. */
export function buildDeck(
  ids: string[],
  prefs: MusicPrefs,
  used: Record<string, true>,
  round = 1,
): { deck: Card[]; used: Record<string, true> } {
  const pool: Card[] = ids.flatMap((id) => wordPool(id, prefs, round));
  let fresh = pool.filter((x) => !used[cardKey(x)]);
  let nextUsed = used;
  if (fresh.length < 8) {
    nextUsed = { ...used };
    pool.forEach((x) => delete nextUsed[cardKey(x)]);
    fresh = pool;
  }
  // Lead with the round's level, keep the rest as backup (stable sort keeps the shuffle inside each level).
  return { deck: shuffle(fresh).sort((x, y) => rank(x, round) - rank(y, round)), used: nextUsed };
}

/** Rotation (deg) that lands segment `j` of `n` under the top pointer, at least `turns` full spins past `from`. */
export function wheelTarget(from: number, j: number, n: number, turns = 6) {
  const seg = 360 / n;
  return from - (from % 360) + 360 * turns + (360 - (j * seg + seg / 2));
}

export type Settings = {
  teams: Team[];
  sel: string[];
  mode: Mode;
  dur: number;
  rounds: number;
  musicGenres: string[];
  musicLevel: Level;
};

export type GameState = Settings & {
  modal: boolean;
  phase: Phase;
  turn: number;
  round: number;
  scores: number[];
  rot: number;
  cat: string;
  deck: Card[];
  pos: number;
  hits: Card[];
  passes: Card[];
  timeLeft: number;
  used: Record<string, true>;
};

export const defaultSettings: Settings = {
  teams: [{ name: '' }, { name: '' }],
  sel: ALL_IDS,
  mode: 'ruleta',
  dur: 60,
  rounds: 3,
  musicGenres: ALL_GENRE_IDS,
  musicLevel: 'mixta',
};

export const quickSettings = (): Partial<Settings> => ({
  teams: [{ name: '' }, { name: '' }],
  sel: ALL_IDS,
  mode: 'ruleta',
  dur: 60,
  rounds: 3,
  musicGenres: ALL_GENRE_IDS,
  musicLevel: 'mixta',
});

export const initialState = (s: Partial<Settings> = {}): GameState => ({
  ...defaultSettings,
  ...s,
  modal: false,
  phase: 'idle',
  turn: 0,
  round: 1,
  scores: [],
  rot: 0,
  cat: (s.sel ?? ALL_IDS)[0],
  deck: [],
  pos: 0,
  hits: [],
  passes: [],
  timeLeft: s.dur ?? 60,
  used: {},
});

export type Action =
  | { type: 'openModal'; sel?: string[] }
  | { type: 'closeModal' }
  | { type: 'setTeamName'; k: number; name: string }
  | { type: 'setTeams'; teams: Team[] }
  | { type: 'addTeam' }
  | { type: 'removeTeam'; k: number }
  | { type: 'toggleCat'; id: string }
  | { type: 'setSel'; sel: string[] }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setDur'; dur: number }
  | { type: 'setRounds'; rounds: number }
  | { type: 'toggleGenre'; id: string }
  | { type: 'setGenres'; ids: string[] }
  | { type: 'setMusicLevel'; level: Level }
  | { type: 'restore'; state: GameState }
  | { type: 'startGame'; over?: Partial<Settings> }
  | { type: 'spin'; j: number }
  | { type: 'spinDone' }
  | { type: 'startTurn' }
  | { type: 'tick' }
  | { type: 'hit' }
  | { type: 'pass' }
  | { type: 'endTurn' }
  | { type: 'nextTurn' };

/** Turns start at 'ready' when there's nothing to spin for (mix mode or a single category). */
const firstPhase = (s: Settings): Phase => (s.mode === 'mezcla' || s.sel.length === 1 ? 'ready' : 'intro');
const turnCats = (s: GameState) => (s.mode === 'mezcla' ? s.sel : [s.cat]);
export const isLastTurn = (s: GameState) => s.turn === s.teams.length - 1 && s.round >= s.rounds;
export const currentCard = (s: GameState): Card | null => (s.deck.length ? s.deck[s.pos % s.deck.length] : null);

function advance(s: GameState, field: 'hits' | 'passes'): GameState {
  if (s.phase !== 'playing') return s;
  const card = currentCard(s);
  if (!card) return s;
  let used = { ...s.used, [cardKey(card)]: true as const };
  let deck = s.deck;
  let pos = s.pos + 1;
  if (pos >= deck.length) {
    const built = buildDeck(turnCats(s), s, used, s.round);
    deck = built.deck;
    used = built.used;
    pos = 0;
  }
  return { ...s, [field]: [...s[field], card], deck, pos, used };
}

function endTurn(s: GameState): GameState {
  if (s.phase !== 'playing') return s;
  const scores = s.scores.slice();
  scores[s.turn] = (scores[s.turn] ?? 0) + s.hits.length;
  return { ...s, scores, phase: 'turnDone', timeLeft: 0 };
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'openModal':
      if (s.phase === 'playing') return s;
      return { ...s, modal: true, sel: a.sel ?? s.sel };
    case 'closeModal':
      return { ...s, modal: false };
    case 'setTeamName': {
      const teams = s.teams.slice();
      teams[a.k] = { name: a.name.slice(0, 24) };
      return { ...s, teams };
    }
    case 'setTeams':
      return { ...s, teams: a.teams };
    case 'addTeam':
      return s.teams.length >= MAX_TEAMS ? s : { ...s, teams: [...s.teams, { name: '' }] };
    case 'removeTeam':
      return s.teams.length <= MIN_TEAMS ? s : { ...s, teams: s.teams.filter((_, k) => k !== a.k) };
    case 'toggleCat': {
      const on = s.sel.includes(a.id);
      if (on && s.sel.length === 1) return s; // always keep at least one
      const sel = on ? s.sel.filter((x) => x !== a.id) : ALL_IDS.filter((id) => id === a.id || s.sel.includes(id));
      return { ...s, sel };
    }
    case 'setSel':
      return { ...s, sel: a.sel.length ? a.sel : s.sel };
    case 'setMode':
      return { ...s, mode: a.mode };
    case 'setDur':
      return { ...s, dur: a.dur };
    case 'setRounds':
      return { ...s, rounds: a.rounds };
    case 'toggleGenre': {
      const on = s.musicGenres.includes(a.id);
      if (on && s.musicGenres.length === 1) return s; // always keep at least one
      const musicGenres = on
        ? s.musicGenres.filter((x) => x !== a.id)
        : ALL_GENRE_IDS.filter((id) => id === a.id || s.musicGenres.includes(id));
      return { ...s, musicGenres };
    }
    case 'setGenres':
      return { ...s, musicGenres: a.ids.length ? a.ids : s.musicGenres };
    case 'setMusicLevel':
      return { ...s, musicLevel: a.level };
    case 'restore':
      return { ...a.state, modal: false };
    case 'startGame': {
      const cfg = { ...s, ...a.over };
      const teams = fillNames(cfg.teams);
      return {
        ...cfg,
        teams,
        modal: false,
        phase: firstPhase(cfg),
        turn: 0,
        round: 1,
        scores: teams.map(() => 0),
        cat: cfg.sel[0],
        hits: [],
        passes: [],
        deck: [],
        pos: 0,
      };
    }
    case 'spin':
      if (s.phase !== 'intro') return s;
      return { ...s, phase: 'spinning', rot: wheelTarget(s.rot, a.j, s.sel.length), cat: s.sel[a.j] };
    case 'spinDone':
      return s.phase === 'spinning' ? { ...s, phase: 'ready' } : s;
    case 'startTurn': {
      if (s.phase !== 'ready') return s;
      const { deck, used } = buildDeck(turnCats(s), s, s.used, s.round);
      return { ...s, phase: 'playing', deck, used, pos: 0, hits: [], passes: [], timeLeft: s.dur };
    }
    case 'tick':
      if (s.phase !== 'playing') return s;
      return s.timeLeft <= 1 ? endTurn(s) : { ...s, timeLeft: s.timeLeft - 1 };
    case 'hit':
      return advance(s, 'hits');
    case 'pass':
      return advance(s, 'passes');
    case 'endTurn':
      return endTurn(s);
    case 'nextTurn': {
      if (s.phase !== 'turnDone') return s;
      if (isLastTurn(s)) return { ...s, phase: 'final' };
      let turn = s.turn + 1;
      let round = s.round;
      if (turn >= s.teams.length) {
        turn = 0;
        round += 1;
      }
      return { ...s, turn, round, hits: [], passes: [], cat: s.sel.length === 1 ? s.sel[0] : s.cat, phase: firstPhase(s) };
    }
  }
}

export function ranking(s: GameState) {
  const max = Math.max(1, ...s.scores);
  return s.teams
    .map((_, k) => ({ k, name: teamLabel(s.teams, k), score: s.scores[k] ?? 0, color: teamColor(k) }))
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, place: i + 1, pct: Math.max(8, Math.round((r.score / max) * 100)) }));
}

export function verdict(hits: number) {
  if (hits >= 12) return '¡Son unos cracks, causa!';
  if (hits >= 7) return '¡Bacán! Nada mal.';
  if (hits >= 3) return 'Bien, pero hay que calentar.';
  return '¡Qué roche! A la próxima.';
}
