# SPEC 10 — Controles táctiles y canvas responsive en todos los juegos

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-09-29
> **Objective:** Añadir controles táctiles (D-pad virtual / botones direccionales) y escalar el canvas al ancho de pantalla para que los cuatro juegos sean jugables en dispositivos móviles con pantalla táctil.

## Scope

**In:**

- Hook `useTouchDevice` que detecta si el dispositivo tiene pantalla táctil (`navigator.maxTouchPoints > 0`)
- Componente compartido `TouchControls` con D-pad (↑↓←→) y botón de fuego opcional
- Canvas responsive en los cuatro juegos: escala con CSS (`max-width: 100%; height: auto`) sin cambiar dimensiones lógicas
- Controles táctiles en **Rocas** (`AsteroidsGame.tsx`): D-pad + botón de fuego 🔥
- Controles táctiles en **Tetris** (`TetrisGame.tsx`): D-pad (↑ = rotar, ↓ = bajar rápido, ←→ = mover)
- Controles táctiles en **Snake** (`SnakeGame.tsx`): D-pad (↑↓←→)
- Controles táctiles en **Arkanoid** (`ArkanoidGame.tsx`): botones ← → (sin ↑↓, ya que el paddle es horizontal)
- Toggle de debug en cada play page para forzar la visibilidad de los controles táctiles en desktop (útil durante desarrollo y QA)
- Auto-detección: los controles se muestran automáticamente solo en dispositivos táctiles; en desktop quedan ocultos salvo que el toggle esté activo

**Out of scope (para specs futuros):**

- Joystick virtual circular (thumbstick)
- Gestos de swipe
- Redimensionado lógico del canvas (cambiar las dimensiones en píxeles del juego para pantallas muy pequeñas)
- Soporte landscape / portrait lock
- Vibración háptica al tocar botones
- Gamepad API

## Data model

No se introduce nueva persistencia. El hook y el componente son puramente en memoria (estado React local).

### `useTouchDevice` (hook)

```ts
// src/hooks/useTouchDevice.ts
export function useTouchDevice(): boolean;
// Devuelve true si navigator.maxTouchPoints > 0
// Evalúa en el cliente (hydration-safe: empieza en false, actualiza en useEffect)
```

### `TouchControls` (componente)

```tsx
// src/components/games/TouchControls.tsx
interface TouchControlsProps {
  onDirection: (dir: "up" | "down" | "left" | "right") => void;
  onFire?: () => void; // si se pasa, se renderiza el botón de fuego
  visible: boolean; // controlado desde el padre (useTouchDevice + toggle)
  layout?: "dpad" | "lr-only"; // "lr-only" para Arkanoid (solo ← →)
}
```

Los eventos `onDirection` y `onFire` se disparan en `onTouchStart` (respuesta inmediata) y se repiten mientras el dedo permanece presionado (`onTouchMove` no cambia la dirección si el dedo no abandona el botón). No simulan `KeyboardEvent` — llaman callbacks directamente; cada componente de juego los conecta a su lógica interna.

## Implementation plan

1. **`src/hooks/useTouchDevice.ts`** — crear el hook. Leer `navigator.maxTouchPoints` en `useEffect` para evitar errores de SSR.

2. **`src/components/games/TouchControls.tsx`** — crear el componente. Diseño:
   - Layout `dpad`: cuatro botones en cruz (↑ arriba al centro, ←↓→ en fila), opcionalmente botón de fuego a la derecha
   - Layout `lr-only`: solo dos botones en fila (← →)
   - Estilos con Tailwind v4; tamaño de botón mínimo 56 px (accesibilidad táctil)
   - `touch-action: manipulation` para evitar el doble-tap zoom del browser

3. **Canvas responsive** — en cada componente de juego, envolver el `<canvas>` en un `<div className="w-full max-w-[<canvas-width>px] mx-auto">` con `<canvas style={{ width: "100%", height: "auto" }}>`. Las dimensiones lógicas del canvas (`canvas.width` / `canvas.height`) no cambian.

4. **`AsteroidsGame.tsx`** — añadir `TouchControls` con `layout="dpad"` y `onFire`. Conectar los callbacks a la misma lógica que las teclas correspondientes.

5. **`TetrisGame.tsx`** — añadir `TouchControls` con `layout="dpad"`. ↑ → rotar pieza, ↓ → soft-drop, ←→ → mover.

6. **`SnakeGame.tsx`** — añadir `TouchControls` con `layout="dpad"`. Conectar callbacks a `nextDirection`.

7. **`ArkanoidGame.tsx`** — añadir `TouchControls` con `layout="lr-only"`. Conectar ← y → al movimiento del paddle.

8. **Toggle de debug** — en cada play page (`app/games/*/play/page.tsx`) añadir un `<button>` pequeño (esquina superior derecha, solo visible en `process.env.NODE_ENV === 'development'` o controlado por un query param `?touch=1`) que fuerza `showControls = true` independiente del hook.

9. **Verificar**: abrir cada juego en Chrome DevTools con emulación de móvil (iPhone 14), confirmar que el D-pad aparece y el juego responde, y que en desktop los controles no se muestran.

## Acceptance criteria

- [ ] En un dispositivo táctil (o con DevTools mobile), el D-pad aparece automáticamente en Rocas, Tetris y Snake.
- [ ] En un dispositivo táctil, los botones ← → aparecen automáticamente en Arkanoid.
- [ ] El botón de fuego 🔥 aparece en Rocas junto al D-pad y dispara correctamente.
- [ ] Ningún canvas desborda la pantalla horizontalmente en viewport de 375 px de ancho.
- [ ] Las teclas de teclado y el mouse siguen funcionando igual en desktop (sin regresiones).
- [ ] Activar el toggle de debug en desktop muestra los controles táctiles y permite jugar con ellos.
- [ ] Ningún botón táctil tiene menos de 56 × 56 px de área de toque.
- [ ] El doble-tap sobre los botones no hace zoom en el browser móvil.

## Decisions

- **Callbacks directos en lugar de simular `KeyboardEvent`:** simular eventos de teclado es frágil (requiere `document.dispatchEvent` y depende de que el listener esté en el documento, no en el canvas). Pasar callbacks es más explícito y testeable.
- **`layout="lr-only"` para Arkanoid:** Arkanoid solo necesita movimiento horizontal; añadir ↑↓ sería confuso y ocuparía espacio innecesario.
- **CSS scaling en lugar de redimensionado lógico del canvas:** cambiar las dimensiones lógicas requeriría ajustar toda la física y coordenadas de cada juego. CSS scaling es suficiente para MVP y no rompe la lógica existente.
- **Auto-detección + toggle de debug:** la detección automática mejora la experiencia de usuario; el toggle permite QA en desktop sin necesitar un dispositivo físico.
- **`touch-action: manipulation` en los botones:** evita el delay de 300 ms del doble-tap y el zoom, sin bloquear el scroll del resto de la página.
- **Botón de fuego para Rocas solamente:** los otros juegos no tienen acción de "fuego"; Tetris usa ↑ para rotar (suficiente).

## Risks

| Riesgo                                                            | Mitigación                                                                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| SSR hydration mismatch en `useTouchDevice`                        | El hook inicia en `false` y actualiza en `useEffect`; el servidor y el primer render del cliente coinciden.            |
| Canvas con `width: 100%` distorsiona el aspect ratio              | Usar `height: auto` (no `height: 100%`) para mantener la proporción correcta.                                          |
| Botones táctiles tapan parte del canvas en pantallas muy pequeñas | Colocar los controles **debajo** del canvas (no superpuestos), dentro de un wrapper con scroll vertical si hace falta. |
| `onTouchStart` dispara también `onClick` en algunos browsers      | Llamar `event.preventDefault()` en los handlers de toque para evitar eventos sintéticos duplicados.                    |

## What is **not** in this spec

- Joystick virtual / thumbstick
- Gestos de swipe
- Redimensionado lógico del canvas (cambio de píxeles internos del juego)
- Soporte landscape / portrait lock
- Vibración háptica
- Gamepad API
