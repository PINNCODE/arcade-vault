# Game Suggestions

Memoria del agente `@game-planner`. Registra cada juego sugerido y qué pasó con él.

## Preferencias del usuario

- Grabar **siempre** en este archivo cada vez que se hagan sugerencias de juegos.
- Orquestar las escrituras de forma atómica (un solo agente o el orquestador escribe; no agentes en paralelo sobre este archivo).

## Historial de sugerencias

Estados: `sugerido` | `recomendado` | `aceptado` | `rechazado` | `implementado`

| Fecha      | Slug       | Título              | Categoría | Puntaje | Estado       | Motivo                                                                              |
| ---------- | ---------- | ------------------- | --------- | ------- | ------------ | ----------------------------------------------------------------------------------- |
| 2026-09-29 | arkanoid   | ARKANOID            | ARCADE    | —       | implementado | Línea base (spec 08)                                                                |
| 2026-09-29 | rocas      | ROCAS               | SHOOTER   | —       | implementado | Línea base (spec 05)                                                                |
| 2026-09-29 | serpentina | SERPENTINA          | ARCADE    | —       | implementado | Línea base (spec 09)                                                                |
| 2026-09-29 | tetris     | TETRIS              | PUZZLE    | —       | implementado | Línea base (spec 07)                                                                |
| 2026-09-29 | paletas    | PALETAS             | VERSUS    | 31/35   | recomendado  | Pong vs CPU; primer juego en VERSUS (categoría vacía), esfuerzo muy bajo            |
| 2026-09-29 | invasores  | INVASORES           | SHOOTER   | 30/35   | sugerido     | Space Invaders; puntaje excelente, pero SHOOTER ya tiene ROCAS y VERSUS sigue vacía |
| 2026-09-29 | 2048       | 2048                | PUZZLE    | 26/35   | sugerido     | Puntaje claro, pero estética menos retro arcade y PUZZLE ya tiene TETRIS            |
| 2026-09-29 | cruce      | CRUCE (Rana)        | ARCADE    | 32/35   | recomendado  | Frogger; mecánica nueva, bajo esfuerzo, muy distinto del catálogo                   |
| 2026-09-29 | tanques    | TANQUES (Blindados) | VERSUS    | 32/35   | recomendado  | Combat; llena VERSUS, aprovecha lógica de ROCAS, duelo vs CPU                       |
| 2026-09-29 | ciempies   | CIEMPIÉS            | SHOOTER   | 31/35   | sugerido     | Centipede; segmentos que se dividen, refuerza SHOOTER con mecánica única            |
| 2026-09-29 | burbujas   | BURBUJAS            | PUZZLE    | 31/35   | sugerido     | Puzzle Bobble; segundo juego en PUZZLE, mecánica apuntar+encadenar                  |
| 2026-09-29 | misiles    | MISILES (Defensa)   | SHOOTER   | 31/35   | sugerido     | Missile Command; defender posición fija, distinto de ROCAS                          |
| 2026-09-29 | cerco      | CERCO               | ARCADE    | 30/35   | sugerido     | Qix; conquistar territorio, mecánica única en el catálogo, esfuerzo medio-alto      |
| 2026-09-29 | ciclos     | CICLOS              | VERSUS    | 30/35   | sugerido     | Tron light cycles vs CPU; reutiliza lógica de SERPENTINA                            |
