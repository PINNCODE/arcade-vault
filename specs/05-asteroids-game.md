# SPEC 05 — Juego Asteroids (Rocas) integrado en la plataforma

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 04
> **Fecha:** 2026-09-28
> **Objetivo:** Portar el juego Asteroids de `references/started-games/02-asteroids/` a un componente React con canvas que se ejecute en `/games/rocas/play`, se integre con el HUD y el modal de puntuación de la plataforma, y permita guardar el score final en Supabase.

---

## Alcance

**Incluido:**

- Crear `src/components/games/AsteroidsGame.tsx` — componente React que encapsula el canvas 800×600, el game loop (`requestAnimationFrame`), y toda la lógica de juego portada desde `game.js` a TypeScript.
- Crear `app/games/rocas/play/page.tsx` — ruta específica para Rocas que reemplaza el placeholder del `[id]/play` genérico; utiliza el mismo layout de la plataforma (player-hud + crt-screen) pero conectado al canvas real.
- Integrar pausa, FIN y modal de game over con la UI existente de la plataforma.
- El HUD de la plataforma (`score`, `lives`, `level`) refleja el estado interno del juego en tiempo real.
- El modal de game over ya existente permite al usuario guardar la puntuación final con `useSession().saveScore`.

**Fuera de alcance:**

- Persistencia de scores en Supabase (la tabla y las queries son de un spec posterior de leaderboard).
- Versión mobile / controles táctiles.
- Sonido / audio.
- Nuevos power-ups o mecánicas no presentes en el juego de referencia.
- Cambios al juego genérico `app/games/[id]/play/page.tsx` — permanece intacto para los demás juegos.
- Controles de teclado configurables.

---

## Modelo de datos

No se introducen nuevas estructuras persistentes. Solo estado interno del componente:

```ts
// Estado expuesto mediante callbacks al padre (play page)
interface AsteroidsCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

// Props del componente
interface AsteroidsGameProps extends AsteroidsCallbacks {
  paused: boolean;
  onFin: () => void; // el botón FIN del HUD llama a esto → dispara game over
}
```

El componente no expone los objetos de juego (Ship, Asteroid, etc.) — son internos.

---

## Plan de implementación

### 1. Crear `src/components/games/AsteroidsGame.tsx`

Componente Client (`"use client"`) con un solo `<canvas ref={canvasRef} width={800} height={600} />`.

**Estructura interna:**

- `useRef` para `canvas` y para todas las variables de juego (`shipRef`, `bulletsRef`, `asteroidsRef`, `particlesRef`, `powerUpsRef`, `scoreRef`, `livesRef`, `levelRef`, `stateRef`, `rafRef`, `lastTimeRef`).
- Las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` se portan tal cual desde `game.js` a TypeScript, dentro del archivo del componente (no se exportan). Las funciones de utilidad (`wrap`, `dist`, `rand`, `randInt`) son funciones locales.
- El canvas context `ctx` se obtiene en el `useEffect` de montaje y se guarda en un `ref`.
- El game loop (`loop(ts)`) corre con `requestAnimationFrame`. Si `paused === true` (prop), `loop` llama a `draw()` pero no a `update()`.
- Cuando `state` cambia a `'gameover'`, el loop llama `onGameOver(score)` una vez (flag `gameOverFiredRef`) y se detiene (`cancelAnimationFrame`).
- Cuando cambia `score`, `lives` o `level`, el componente llama los callbacks correspondientes (comparando con los valores del frame anterior para no saturar renders del padre).
- El `useEffect` limpia: `cancelAnimationFrame(rafRef.current)` + `removeEventListener` de teclado al desmontar.
- Input: `keydown`/`keyup` se registran en `window` dentro del `useEffect`.
- `paused` se lee desde un `ref` interno (`pausedRef`) para no requerir reiniciar el loop al cambiar.

**Efecto de prop `paused`:**

```tsx
useEffect(() => {
  pausedRef.current = paused;
}, [paused]);
```

**Manejo de `onFin`:** cuando el padre llama `handleFin` (botón FIN), setea `over = true` → el play page muestra el modal, pero el juego también debe parar. El juego debe recibir una prop `active: boolean` que detiene el loop. Alternativa más simple: cuando el usuario hace clic en FIN, la play page fuerza `onGameOver(currentScore)` sin pasarlo por el componente. Ver decisiones.

### 2. Crear `app/games/rocas/play/page.tsx`

Copia el layout de `app/games/[id]/play/page.tsx` pero:

- Importa `AsteroidsGame` desde `@/components/games/AsteroidsGame`.
- Elimina el bloque `useEffect` con `setInterval` (score simulado).
- El `score`, `lives`, `level` del `useState` se actualizan desde los callbacks del componente.
- La `crt-screen` contiene `<AsteroidsGame paused={paused} onScoreChange={...} onLivesChange={...} onLevelChange={...} onGameOver={handleGameOver} />` en lugar de `.game-arena` con los `.enemy` placeholders.
- El botón FIN llama `handleFin()` → setea `over = true` y usa el score actual del state como puntuación final.
- El botón PAUSA sigue funcionando: toglea `paused` → la prop llega al componente.
- El modal de game over es idéntico al del genérico: campo de nombre + botón GUARDAR PUNTUACIÓN que llama `saveScore({ game: "rocas", score, name })`.
- `game` se obtiene con `GAMES.find(g => g.id === "rocas")` (sin leer params).

### 3. Ajustar estilos del canvas dentro del CRT

El canvas es 800×600. Dentro del `.crt-screen` el juego debe escalar para caber: añadir en `globals.css` (o como style inline en la play page):

```css
.crt-screen canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
```

El canvas mantiene sus dimensiones internas de 800×600; CSS lo escala visualmente.

### 4. Prueba manual del flujo completo

- Navegar a `/games/rocas/play`.
- Verificar que el canvas carga y los asteroides se mueven.
- Disparar (Space), destruir asteroides, ver que el score del HUD aumenta.
- Recoger un power-up triple, verificar disparo triple.
- Dejar que la nave muera 3 veces → aparece modal de game over.
- Escribir nombre y pulsar GUARDAR — `saveScore` se llama (consola confirma).
- Pulsar PAUSA → el juego congela; REANUDAR → sigue.
- Pulsar FIN → modal aparece con el score actual.
- Pulsar JUGAR DE NUEVO → el componente se desmonta y remonta (o se llama `initGame()` internamente).

---

## Criterios de aceptación

- [ ] `/games/rocas/play` carga sin errores TypeScript en consola.
- [ ] El canvas de 800×600 aparece dentro del `.crt-screen` sin desbordarse.
- [ ] La nave responde a ArrowLeft, ArrowRight, ArrowUp (thrust) y Space (disparo).
- [ ] Los asteroides se mueven, rotan y se dividen al ser disparados.
- [ ] El score en el HUD de la plataforma (`<div className="hud-stat">Puntuación</div>`) refleja el score del juego en tiempo real.
- [ ] Las vidas en el HUD decrementan cuando la nave muere.
- [ ] El nivel en el HUD incrementa cuando se limpia la pantalla de asteroides.
- [ ] Al perder todas las vidas, el game-over modal de la plataforma aparece con el score final correcto.
- [ ] El botón PAUSA congela la simulación (asteroides dejan de moverse).
- [ ] El botón FIN muestra el modal con el score actual.
- [ ] El botón JUGAR DE NUEVO reinicia el juego al estado inicial (score 0, nivel 1, 3 vidas).
- [ ] El power-up triple-shot aparece, se puede recoger y activa el disparo triple durante 5 s.
- [ ] La ruta genérica `app/games/[id]/play` sigue funcionando para otros juegos (sin regresión).
- [ ] `npm run build` pasa sin errores TypeScript.

---

## Decisiones

- **Segmento estático `app/games/rocas/play/` en vez de modificar el `[id]/play` genérico** — el genérico es un placeholder para todos los juegos no implementados; modificarlo rompería esa convención. Un segmento estático tiene prioridad en App Router y deja el genérico intacto.
- **Lógica de juego en `src/components/games/AsteroidsGame.tsx`, no inlined en la play page** — la play page es layout/UI; la lógica del canvas merece su propio archivo. Además, facilita reutilizar el componente si se añade un modo de práctica.
- **Clases de juego dentro del componente, no importadas desde un módulo separado** — el juego es autónomo y sus 420 líneas no necesitan ser compartidas; extraerlas a módulos separados añade abstracción sin ganancia ahora.
- **`useRef` para el estado del juego, no `useState`** — el game loop corre a 60 fps; `setState` en cada frame causaría re-renders masivos. Los refs guardan el estado mutable interno; solo `onScoreChange` / `onLivesChange` / `onLevelChange` (llamados cuando el valor cambia, no en cada frame) disparan re-renders del padre.
- **Botón FIN fuerza game over en la play page, sin pasar por el componente** — el juego no necesita saber que el usuario quiere salir; la play page simplemente setea `over = true` con el score actual del state. Más simple que añadir una prop `forceEnd`.
- **Canvas escalado con CSS, dimensiones internas fijas en 800×600** — preserva la lógica de colisión y wrapping sin tocarla; el escalado CSS es suficiente para displays modernos.
- **Sin tocar `lib/data.ts`** — el juego `rocas` ya existe con `id: "rocas"`, title, descripción y stats. No requiere cambios.

---

## Riesgos

| Riesgo                                                                                            | Mitigación                                                                                                            |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| El game loop sigue corriendo si el componente se desmonta sin cancelar el RAF                     | El `useEffect` de cleanup llama `cancelAnimationFrame(rafRef.current)`                                                |
| `keydown`/`keyup` en `window` interfieren con los controles de la UI (p.ej. Space activa botones) | Añadir `e.preventDefault()` en el handler solo cuando el canvas tiene el foco, o para los códigos usados por el juego |
| El canvas queda en blanco si `getContext('2d')` devuelve null (SSR)                               | El `useEffect` solo corre en cliente; guard `if (!ctx) return` en el loop                                             |
| Prop `paused` leída con closure stale en el loop                                                  | `pausedRef.current = paused` en un `useEffect([paused])` separado; el loop lee `pausedRef.current`                    |
| El botón JUGAR DE NUEVO en el modal necesita reiniciar el juego sin desmontar el componente       | Exponer una ref con función `restart()` desde el componente, o simplemente desmontar/remontar con una key prop        |
