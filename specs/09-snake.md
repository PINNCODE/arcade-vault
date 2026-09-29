# SPEC 09 — Integrar juego Snake a Arcade Vault

> **Status:** Implementado
> **Depends on:** SPEC 04, SPEC 06
> **Date:** 2026-09-29
> **Objective:** Construir un juego de Snake clásico con sprites de frutas como comida y publicarlo en `/games/snake`.

## Scope

**In:**

- Componente canvas `SnakeGame.tsx` con lógica completa del juego
- Comida renderizada con sprites de `public/games/snake-assets/fruits.png` via `SPRITE_ATLAS`
- Frutas aleatorias con distintos valores de puntos al comerlas
- Velocidad progresiva — la serpiente acelera cada 5 puntos
- Play page en `/games/snake`
- Envío de score a Supabase `scores` al finalizar la partida
- Registro del juego en `lib/games.ts`

**Out of scope (para specs futuros):**

- Controles táctiles / mobile
- Modos de dificultad configurables
- Power-ups o efectos especiales
- Multijugador

## Data model

### Estado interno del juego

```ts
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface Segment {
  col: number;
  row: number;
}

interface FruitItem {
  col: number;
  row: number;
  key: string; // nombre del sprite, e.g. "apple"
  points: number; // 1–5 según el índice en el atlas
}

interface GameState {
  snake: Segment[]; // head = [0]
  direction: Direction;
  nextDirection: Direction;
  fruit: FruitItem;
  score: number;
  speed: number; // ms entre ticks (empieza en 150, baja 5ms cada 5pts, mín 60ms)
  running: boolean;
  gameOver: boolean;
}
```

### Envío a Supabase al game over

```ts
{ game_id: 'snake', user_id, score, metadata: { fruitsEaten: number, maxLength: number } }
```

## Tabla de puntos por fruta

Las 22 frutas del atlas se distribuyen en 5 grupos de valor:

| Puntos | Frutas (ejemplos)                                  |
| ------ | -------------------------------------------------- |
| 1      | banana, orange, watermelon, melon, apple           |
| 2      | grape, strawberry, cherry, peach, berries, grapes2 |
| 3      | garlic, carrot, broccoli, tomato, pepper           |
| 4      | eggplant, mushroom, kiwi, lemon, pineapple         |
| 5      | peanut                                             |

La fruta que aparece es aleatoria; su valor se determina por el grupo al que pertenece.

## Grid y canvas

- Grid: **20 × 20** celdas
- Tamaño de celda: **24 px** → canvas **480 × 480 px**
- Sprite de fruta escalado a **22 × 22 px** centrado en la celda
- Serpiente: rectángulos redondeados con color de acento `green`

## Implementation plan

1. Crear `components/games/SnakeGame.tsx`
   - Monta un `<canvas>` de 480 × 480
   - Carga `fruits.png` como `HTMLImageElement` antes de iniciar el loop
   - Carga `SPRITE_ATLAS` via `import` del script o leyendo las coordenadas directamente (hardcodeado en el componente para no depender del `window.SPRITE_ATLAS` global)
   - Loop con `setInterval` (no RAF) para ticks a velocidad variable
   - Controles: `ArrowUp/Down/Left/Right` y `WASD`
   - Al game over llama `onGameOver(score, metadata)`
   - `useEffect` cleanup cancela el interval y remueve event listeners

2. Crear `app/games/snake/page.tsx` usando el layout `PlayPage` compartido

3. Registrar en `lib/games.ts`:

   ```ts
   { id: 'snake', name: 'Snake', slug: 'snake', category: 'ARCADE',
     accentColor: 'green', description: 'Come frutas, crece y no choques.' }
   ```

4. Verificar: iniciar dev server, jugar hasta game over, confirmar score en Supabase.

## Acceptance criteria

- [ ] `/games/snake` carga sin errores de consola.
- [ ] Las teclas de flecha y WASD mueven la serpiente.
- [ ] Al comer una fruta aparece una nueva fruta aleatoria con su sprite correcto.
- [ ] El score acumula los puntos correctos según la fruta comida.
- [ ] Chocar con la pared o con el propio cuerpo termina la partida.
- [ ] Al game over se envía el score a Supabase y aparece en el leaderboard.
- [ ] El juego aparece en la grilla de la home.
- [ ] La velocidad aumenta progresivamente al sumar puntos.

## Decisions

- **Canvas con `setInterval` en lugar de `requestAnimationFrame`:** el juego es por turnos discretos (tick = paso de la serpiente), no continuo. `setInterval` modela esto directamente y hace trivial cambiar la velocidad.
- **Coordenadas del sprite atlas hardcodeadas en el componente:** evita depender del global `window.SPRITE_ATLAS` y permite importar el atlas como módulo TypeScript con tipos.
- **Grid 20 × 20 @ 24 px:** canvas cuadrado de 480 px, proporcional y compatible con el layout actual de las play pages.
- **Color `green` como acento:** canónico para Snake.

## Risks

| Riesgo                                           | Mitigación                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Interval no cancelado al desmontar el componente | `useEffect` retorna cleanup que llama `clearInterval` y `removeEventListener`. |
| Fruta generada dentro del cuerpo de la serpiente | Al generar posición aleatoria, verificar que no coincida con ningún segmento.  |
| `fruits.png` no cargada antes del primer render  | Cargar la imagen en `useEffect` y no iniciar el loop hasta `img.onload`.       |

## What is **not** in this spec

- Controles táctiles / mobile
- Modos de dificultad
- Power-ups
- Multijugador
