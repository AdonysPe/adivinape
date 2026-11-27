// Renders trailer/index.html to an MP4: frame-by-frame capture in headless Chrome + the
// offline-rendered soundtrack, muxed with ffmpeg.
//
//   npm i --no-save puppeteer-core     (once)
//   node trailer/render.mjs                    → ~/Downloads/AdivinaPe-trailer/AdivinaPe-trailer.mp4 (60 fps)
//   node trailer/render.mjs --fps 30
//   node trailer/render.mjs --vertical         → ~/Downloads/AdivinaPe-trailer/AdivinaPe-trailer-vertical.mp4 (1080×1920)
//   node trailer/render.mjs --stills 2,9,20    → PNG stills at those seconds (for checking)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def };
const FPS = Number(opt('--fps', 60));
const STILLS = opt('--stills', null);
const VERT = args.includes('--vertical');
const [VW, VH] = VERT ? [1080, 1920] : [1920, 1080];
// Videos live outside the repo (they go to the cloud, not to git).
const OUT_DIR = join(homedir(), 'Downloads', 'AdivinaPe-trailer');
mkdirSync(OUT_DIR, { recursive: true });
const OUT = opt('--out', join(OUT_DIR, VERT ? 'AdivinaPe-trailer-vertical.mp4' : 'AdivinaPe-trailer.mp4'));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const require = createRequire(process.env.PUPPETEER_FROM ? pathToFileURL(join(process.env.PUPPETEER_FROM, 'x.js')) : import.meta.url);
const puppeteer = require('puppeteer-core');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(here, 'index.html')).href + '?render=1' + (VERT ? '&v=1' : ''), { waitUntil: 'networkidle0' });
// Keep the trailer copy of the catalogue honest: compare its totals with the real data.
const data = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'categories.json'), 'utf8'));
const count = (c) => (c.words?.length || 0) + (c.genres || []).reduce((b, g) => b + g.songs.length, 0);
const want = { categories: data.length, words: data.reduce((a, c) => a + count(c), 0), byId: Object.fromEntries(data.map((c) => [c.id, count(c)])) };
const got = await page.evaluate(() => window.DATA_TOTALS);
const stale = !got || got.categories !== want.categories || got.words !== want.words ||
  Object.keys(want.byId).some((id) => got.byId?.[id] !== want.byId[id]);
if (stale)
  throw new Error(`Trailer data is stale: expected ${want.categories} categories / ${want.words} cards, got ${got?.categories}/${got?.words}. Update CATS in trailer/index.html.`);
await page.evaluate(async () => { await window.READY; await document.fonts.load('900 40px Rubik'); await document.fonts.load('700 40px Rubik') });
const DUR = await page.evaluate(() => window.DURATION);

if (STILLS) {
  const dir = join(here, VERT ? 'stills/v' : 'stills'); mkdirSync(dir, { recursive: true });
  for (const s of STILLS.split(',').map(Number)) {
    await page.evaluate((t) => window.seek(t), s);
    await page.screenshot({ path: join(dir, `t${String(s).padStart(5, '0')}.png`) });
    console.log('still', s);
  }
  await browser.close();
  process.exit(0);
}

console.log('Rendering audio…');
const { b64, peak } = await page.evaluate(() => window.renderAudio());
const wav = join(OUT_DIR, VERT ? '.trailer-audio-v.wav' : '.trailer-audio.wav');
writeFileSync(wav, Buffer.from(b64, 'base64'));
console.log('audio peak', peak.toFixed(3));

const frames = Math.ceil(DUR * FPS);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', wav,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.seek(t), i / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 94, optimizeForSpeed: true });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 120 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await done;
await browser.close();
console.log('Done →', OUT);
