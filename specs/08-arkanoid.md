# SPEC 08 — Integrar juego Arkanoid a Arcade Vault

> **Status:** Aprobado
> **Depends on:** SPEC 04, SPEC 06
> **Date:** 2026-09-29
> **Objective:** Integrar el juego Arkanoid (canvas vanilla JS) como un componente React en `/games/arkanoid/play`, con envío de score a Supabase al terminar la partida.

## Scope

**In:**

- Componente React `ArkanoidGame.tsx` que monta un `<canvas>` 800×600 e inicializa el motor de juego
- Port de `game.js` y `levels.js` como módulos JS importados por el componente
- Spritesheet PNG y sonidos copiados a `public/games/arkanoid/`
- Play page en `/games/arkanoid/play`
- Envío de score a Supabase `scores` table en game over (y en victoria)
- Registro del juego en `lib/games.ts`

**Out of scope (para specs futuras):**

- Selector de nivel en el overlay de pausa (jump-to-level)
- Controles táctiles / mobile
- Power-ups adicionales al diseño original
- Multijugador

## Data model

Estado interno del juego (gestionado por `game.js`, no expuesto a React):

```js
gameState    // 'playing' | 'paused' | 'gameover' | 'win'
score        // number — 10 pts por bloque destruido
lives        // number — inicia en 3
currentLevel // 0-indexed sobre LEVELS (5 niveles)
paddle       // { x, y, w: 162, h: 14 }
ball         // { x, y, w: 16, h: 16, vx, vy }
blocks[]     // [{ x, y, w, h, color, alive }]
explosions[] // animaciones activas
```

Payload enviado a Supabase al terminar la partida:

```ts
{
  game_id: "arkanoid",   // string fijo
  user_id: string,       // del contexto de auth
  score: number,         // score final acumulado
  metadata: {
    levels_completed: number,  // cuántos niveles pasó
    outcome: "gameover" | "win"
  }
}
```

## Implementation plan

1. Copiar assets estáticos a `public/games/arkanoid/`:
   - `spritesheet-breakout.png`
   - `sounds/ball-bounce.mp3`
   - `sounds/break-sound.mp3`

2. Copiar `game.js` y `levels.js` del reference a `lib/games/arkanoid/` y adaptarlos para exportar una función `initGame(canvas, onGameOver)` en lugar de auto-ejecutarse.

3. Copiar `assets/spritesheet.js` a `lib/games/arkanoid/spritesheet.js` y ajustar las rutas de los assets para apuntar a `/games/arkanoid/`.

4. Crear `components/games/ArkanoidGame.tsx` — monta el canvas, llama `initGame`, y conecta el callback `onGameOver(score, outcome)` al flujo de envío de score de Arcade Vault.

5. Crear `app/games/arkanoid/play/page.tsx` usando el layout `PlayPage` compartido.

6. Registrar el juego en `lib/games.ts`:

   ```ts
   { id: "arkanoid", name: "Arkanoid", slug: "arkanoid", category: "ARCADE", accentColor: "cyan", description: "Rompe todos los bloques con la pelota antes de quedarte sin vidas." }
   ```

7. Verificar: iniciar dev server, jugar hasta game over, confirmar que el score aparece en Supabase.

## Acceptance criteria

- [ ] Navegar a `/games/arkanoid/play` carga el juego sin errores de consola.
- [ ] El paddle responde al mouse y a las teclas ← →.
- [ ] Pausa/reanuda con P o Escape.
- [ ] Perder las 3 vidas muestra el overlay de Game Over y envía el score a Supabase.
- [ ] Completar los 5 niveles muestra el overlay de victoria y envía el score a Supabase.
- [ ] El juego aparece en la cuadrícula de la home page.
- [ ] Los efectos de sonido (rebote y explosión) se reproducen correctamente.
- [ ] Las animaciones de explosión de bloques funcionan en todos los colores.

## Decisions

- **Slug `arkanoid`:** derivado directamente del directorio `04-arkanoid/`.
- **Categoría `ARCADE`:** juego de breakout clásico, sin elemento puzzle ni shooter.
- **Accent color `cyan`:** color dominante en los bloques del nivel 1 (parrilla completa) y coherente con la estética retro del juego.
- **Port directo de `game.js`:** el motor usa `requestAnimationFrame` y estado mutable — reescribirlo en React state generaría conflictos con el ciclo de render. Se envuelve en un componente React sin tocar la lógica interna.
- **Selector de nivel excluido:** la feature de jump-to-level del overlay de pausa es una conveniencia de desarrollo, no parte de la experiencia de juego competitivo en Arcade Vault.

## Risks

| Risk                                                  | Mitigation                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Game loop leaks al desmontar el componente            | Cancelar el handle de RAF y eliminar event listeners en el cleanup de `useEffect`.               |
| Rutas de assets rotas al mover `spritesheet.js`       | Actualizar las rutas hardcodeadas para apuntar a `/games/arkanoid/` en `public/`.                |
| Audio bloqueado por políticas de autoplay del browser | Iniciar el AudioContext en el primer evento de interacción del usuario (click/keydown).          |
| Canvas dimensions fijas 800×600 en pantallas pequeñas | Escalar el canvas con CSS (`max-width: 100%; height: auto`) sin cambiar las dimensiones lógicas. |

## What is **not** in this spec

- Selector de nivel en pausa
- Controles táctiles / mobile
- Power-ups adicionales
- Multijugador
