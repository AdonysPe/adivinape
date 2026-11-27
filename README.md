# AdivinaPe

Charadas para jugar con amigos, en pareja o en familia: arma equipos, gira la ruleta y actúa.

## Stack

- **[Astro](https://astro.build)**: página estática y rapidísima. Las secciones de la landing son componentes `.astro` sin JavaScript.
- **React** (isla `client:load`): solo el juego (`src/components/game/`) se hidrata en el navegador.
- **Tailwind CSS v4**: colores y fuentes de marca en `@theme` (`src/styles/global.css`).
- **Motion** (`motion/react`): ruleta, cambio de palabra, modal, marcador y podio.
- **Animaciones al hacer scroll**: CSS puro con `animation-timeline: view()`. Los navegadores que no lo soportan simplemente muestran el contenido sin animación.

## Comandos

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # genera dist/
npm run preview   # sirve dist/
```

## Estructura

```
src/
  data/
    categories.json   ← categorías y palabras (edita aquí)
    team-names.json   ← nombres sugeridos para los equipos
    presets.json      ← combinaciones rápidas de categorías
  lib/game.ts         ← estado del juego (reducer puro), mazo, sugerencias, ranking
  components/
    *.astro           ← Nav, Hero, Marquees, Stats, Categories, HowTo
    game/             ← Game (isla), SetupModal, Wheel, Scoreboard, Screens
  layouts/Layout.astro
  pages/index.astro   ← landing
  pages/jugar.astro   ← solo el juego
```

### Agregar una categoría

Añade un objeto a `src/data/categories.json` con `id`, `short`, `name`, `tag`, `color`, `shadow` y `words`. Aparece sola en la ruleta, el modal, los afiches y los contadores.

### Pistas para quien actúa

Cada palabra puede ser un texto (`"Titanic"`) o un objeto con ayuda para quien no lo conozca, como en Celebridades y Personajes:

```json
{ "w": "Shakira", "h": "Cantante colombiana", "k": ["Hips Don't Lie", "Waka Waka", "Baile de caderas"] }
```

`h` es una línea corta de quién o qué es, y `k` son 2 o 3 datos clave. En la tarjeta salen como «PISTA: …» y etiquetas debajo de la palabra. Se pueden mezclar textos y objetos en la misma lista.

### Géneros y dificultad (Música)

Una categoría puede tener `genres` en lugar de `words`. Cada género lleva `songs` con `w` (lo que se actúa), `a` (artista o película: se muestra como pista a quien actúa) y `d` (dificultad 1, 2 o 3). En el modal, al elegir Música aparecen los géneros y el nivel: **Fácil** = solo `d: 1`, **Mixta** = todas, **Difícil** = `d: 2` y `d: 3`. Cualquier otra categoría puede usar `genres` igual.

## Páginas

- `/` es la landing. El modal arma la partida y, al darle «¡A JUGAR!», pasa a `/jugar` con una transición suave (View Transitions entre páginas, con un fundido de respaldo).
- `/jugar` muestra solo el juego, con un botón discreto para salir que pide confirmación. La partida se guarda en `sessionStorage`, así que recargar no la pierde. Si alguien entra directo, se abre el modal para armar la partida.

### Botones que abren el juego

Cualquier elemento con `data-open-game` abre el modal de equipos. Con `data-sel="peliculas,series"` preselecciona categorías y con `data-quick` arranca un juego rápido.

## Cómo se juega

1. **Arma**: de 2 a 6 equipos. Los nombres se autocompletan (sin importar tildes) o salen al azar con el dado.
2. **Elige**: combina categorías o usa un preset. Modo **Ruleta** (una categoría por turno) o **Mezcla total**. En Música, elige géneros y dificultad.
3. **Actúa**: 30, 60 o 90 segundos. Atajos: `→` o `Espacio` = ¡Acerté!, `←` = Paso.
4. **Gana**: tras 1, 3 o 5 rondas, podio con corona y confeti.

Los equipos y reglas se recuerdan en el navegador (`localStorage`) para la próxima partida.

## En el teléfono

`/jugar` está pensado primero para el celular:

- **Una sola pantalla**: el turno ocupa exactamente el alto del teléfono (`100dvh`), sin desplazarse; respeta el notch y la barra de inicio (`safe-area-inset`).
- **Deslizar la carta**: a la derecha = ¡Acerté!, a la izquierda = Paso. Los botones grandes quedan abajo, al alcance del pulgar.
- **Vibración**: al acertar, al pasar, al girar la ruleta y en los últimos 3 segundos.
- **Pantalla siempre encendida** durante la partida (Wake Lock) y botón de **pantalla completa** donde el navegador lo permite (Android y escritorio; Safari de iPhone no).
- **Ruleta adaptable**: se dimensiona con el ancho y el alto; la categoría elegida sube como panel inferior con ¡EMPEZAR!.
- **Marcador en una fila** que se desliza y centra al equipo de turno.
- **Acostado**: carta a la izquierda, botones a la derecha (variante `landscape-phone` en `global.css`).
- **Instalable**: `public/manifest.webmanifest` permite «Agregar a pantalla de inicio», con íconos PNG de 192 y 512 px (normal y *maskable* para Android) y `apple-touch-icon.png` de 180 px para iPhone. Todos salen de `favicon.svg`: si cambias el logo, regenéralos con el mismo diseño.

## Tráiler

`trailer/index.html` es un tráiler de ~33 s (animaciones + música sintetizada) y `trailer/render.mjs` lo convierte a MP4 con Chrome y ffmpeg. Los totales y la ruleta salen de `src/data/categories.json`: si cambian las categorías, actualiza `CATS` en el HTML. El render falla con un aviso si los números ya no coinciden.

```bash
npm i --no-save puppeteer-core   # una sola vez (no se guarda en package.json)
node trailer/render.mjs                    # 1920×1080, 60 fps → ~/Downloads/AdivinaPe-trailer/
node trailer/render.mjs --vertical         # 1080×1920 para Reels/TikTok/Shorts
node trailer/render.mjs --stills 2,9,20,30 # PNGs para revisar antes de renderizar
```

Los MP4 y los stills quedan fuera del repo (en `~/Downloads/AdivinaPe-trailer/` y `trailer/stills/`).

## Publicar

Es un sitio estático: `npm run build` y sube `dist/` a Vercel, Netlify o Cloudflare Pages. En Vercel basta con importar el repo; detecta Astro solo.
