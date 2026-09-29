# SPEC 07 — Integrar juego Tetris a Arcade Vault

> **Status:** Implementado
> **Depends on:** SPEC 04, SPEC 06
> **Date:** 2026-09-28
> **Objective:** Adaptar el Tetris vanilla JS de la carpeta de referencia como componente React integrado al Arcade Vault, con envío de puntuación a Supabase al terminar la partida.

## Scope

**In:**

- Componente canvas `TetrisGame.tsx` que envuelve la lógica JS original
- Play page en `/games/tetris`
- Envío de score a Supabase tabla `scores` al game over
- Todas las mecánicas originales: 7 piezas estándar, rotación con wall kicks, soft/hard drop, ghost piece, vista previa de siguiente pieza, niveles, pausa
- HUD: SCORE, LINES, LEVEL, vista previa de siguiente pieza

**Out of scope (para futuros specs):**

- Controles táctiles/móviles
- Modo multijugador
- Hold piece (guardar pieza)
- Tabla de records local en el juego

## Data model

### Estado interno del juego (manejado en game.js portado)

```
board: number[][]          // matriz ROWS×COLS; 0=vacío, 1–7=índice de color
currentPiece: { type, shape: number[][], x, y }
nextPiece: { type, shape: number[][], x, y }
score: number
lines: number
level: number
paused: boolean
gameOver: boolean
animId: number             // RAF handle para cleanup
```

### Payload enviado a Supabase al game over

```ts
{
  game_id: "tetris",
  user_id: string,          // del contexto de autenticación
  score: number,
  metadata: {
    lines: number,
    level: number
  }
}
```

## Implementation plan

1. Crear `components/games/TetrisGame.tsx` — componente React que monta `<canvas id="tetris-board">` (300×600) y `<canvas id="tetris-next">` (120×120), e inicializa el motor del juego.
2. Portar `references/started-games/03-tetris/game.js` al componente como lógica interna (función `initTetris(boardCanvas, nextCanvas, onGameOver)`). Mantener el estado del juego mutable dentro de la función, sin React state.
3. Conectar el callback `onGameOver(score, lines, level)` al flujo de envío de score de Arcade Vault.
4. Limpiar RAF handle y event listeners en el `return` del `useEffect`.
5. Crear `app/games/tetris/page.tsx` usando el layout compartido `PlayPage`.
6. Registrar el juego en `lib/games.ts`: `{ id: "tetris", name: "Tetris", slug: "tetris", category: "PUZZLE", accent: "cyan", description: "..." }`.
7. Verificar: levantar dev server, jugar hasta game over, confirmar score en Supabase.

## Acceptance criteria

- [ ] Navegar a `/games/tetris` carga el juego sin errores de consola.
- [ ] Las 7 piezas (I, O, T, S, Z, J, L) aparecen con sus colores correctos.
- [ ] Controles funcionan: `←`/`→` mover, `↑`/`X` rotar, `↓` soft drop, `Espacio` hard drop, `P` pausa.
- [ ] La ghost piece se muestra semitransparente en la posición de aterrizaje.
- [ ] El nivel sube cada 10 líneas y la velocidad de caída aumenta.
- [ ] Limpiar 1/2/3/4 líneas otorga 100/300/500/800 × nivel respectivamente.
- [ ] Al game over se envía el score a Supabase y el juego aparece en el grid de la home.
- [ ] Al desmontar el componente no hay memory leaks (RAF cancelado, listeners removidos).

## Decisions

- **Portar game.js como función imperativa:** El game loop usa `requestAnimationFrame` y estado mutable — pelear contra el ciclo de re-render de React sería más costoso que aislar la lógica en una función que el `useEffect` invoca una sola vez.
- **Categoría PUZZLE:** Tetris es el prototipo del puzzle de caída de piezas; no es shooter ni arcade de reflejos puro.
- **Accent color cyan:** El color canónico de la pieza I (la más icónica del Tetris) es cyan; es coherente con la paleta existente del vault.
- **Canvas IDs con prefijo `tetris-`:** Evita colisiones si otro juego usa IDs genéricos como `board`.

## Risks

| Risk                                                        | Mitigation                                                                                            |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Game loop leaks al desmontar el componente                  | Guardar el `animId` en una `ref` y cancelar con `cancelAnimationFrame` en el cleanup del `useEffect`. |
| Event listeners del teclado capturan keys en toda la página | Adjuntar/remover listeners en el `useEffect`; considerar `tabIndex` en el canvas para scope.          |
| IDs de canvas colisionan con otros juegos                   | Usar IDs con prefijo `tetris-board` y `tetris-next`.                                                  |

## What is **not** in this spec

- Controles táctiles o mobile
- Modo multijugador o versus
- Hold piece
- Persistencia local de highscores en el propio juego
