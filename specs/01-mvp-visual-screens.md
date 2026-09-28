# SPEC 01 — MVP Visual: todas las pantallas de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-09-28
> **Objetivo:** Implementar todas las pantallas visuales de Arcade Vault (Biblioteca, Detalle, Reproductor, Auth, Salón de la Fama y Nav) como componentes Next.js con datos mock, sin lógica de juego real.

---

## Alcance

**Incluido:**

- Componente `Nav` — barra de navegación con logo, links, contador de créditos, botón auth y menú hamburgesa móvil.
- Pantalla `Library` (`/`) — hero con título animado, barra de búsqueda, chips de categoría (TODOS / ARCADE / PUZZLE / SHOOTER / VERSUS) y grilla de `GameCard` con efecto tilt.
- Pantalla `GameDetail` (`/games/[id]`) — cover, tags, stats (partidas / mejor global / dificultad), botones "Jugar ahora" y "Volver", leaderboard lateral con 10 entradas seeded.
- Pantalla `GamePlayer` (`/games/[id]/play`) — HUD (jugador, puntuación, vidas, nivel), viewport CRT placeholder con animación de enemigos CSS, modal de fin de juego con guardado de puntuación en `localStorage`.
- Pantalla `Auth` (`/auth`) — tarjeta centrada con tabs Iniciar Sesión / Crear Cuenta, campo usuario, email condicional, contraseña, botón "Jugar como invitado" y botones sociales Google / GitHub (sin funcionalidad real).
- Pantalla `HallOfFame` (`/hall-of-fame`) — cabecera, tabs por juego, podio top-3, tabla completa con 12 entradas seeded y fila resaltada del usuario autenticado.
- Datos mock: array `GAMES` (8 juegos), array `CATS`, función `seededScores`, array `PLAYERS` — extraídos de `references/templates/data.jsx`.
- Estilos: adaptar `references/templates/styles.css` al sistema de diseño de Next.js / Tailwind v4 (variables CSS globales + clases utilitarias donde aplique).
- Navegación SPA dentro de Next.js App Router usando `useRouter` / `Link`; la URL refleja la pantalla activa.
- Estado de sesión de usuario en `localStorage` (`av_user`) y puntuaciones en `localStorage` (`av_scores`), gestionados con un custom hook `useSession`.

**Fuera de alcance (para specs futuros):**

- Lógica de juego real en ningún juego.
- Autenticación real (OAuth, base de datos, JWT).
- API backend o base de datos para puntuaciones.
- Sistema de créditos funcional.
- Modo multijugador.
- Soporte PWA u offline.
- Internacionalización más allá del español.

---

## Modelo de datos

```ts
// src/lib/data.ts — datos mock compartidos

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;       // clase CSS para el gradiente de portada
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;        // "DD/MM/YYYY"
}

export const GAMES: Game[] = [ /* 8 juegos del template */ ];
export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export function seededScores(seed: number, count?: number): ScoreRow[] { /* ... */ }
```

```ts
// src/hooks/useSession.ts
// Devuelve { user, login, signOut } — persiste en localStorage "av_user"
export interface SessionUser { name: string; }
```

```ts
// localStorage keys
// "av_user"   → SessionUser | null (JSON)
// "av_scores" → Array<{ game: string; score: number; name: string; at: number }> (JSON)
```

---

## Plan de implementación

1. **Datos mock** — Crear `src/lib/data.ts` con `GAMES`, `CATS`, `PLAYERS`, `seededScores` portados de `references/templates/data.jsx` a TypeScript. Test manual: importar y loguear en `page.tsx`.

2. **Estilos globales** — Añadir variables CSS (colores neon, fuentes, gradientes) de `references/templates/styles.css` a `app/globals.css`. Verificar que las clases `.neon-cyan`, `.neon-magenta`, `.pixel`, `.mono`, `.btn`, `.fade-in` funcionan en el navegador.

3. **Hook `useSession`** — Crear `src/hooks/useSession.ts` con lectura/escritura de `av_user` en `localStorage`. Exportar `user`, `login(u)` y `signOut()`.

4. **Componente `Nav`** — Crear `src/components/Nav.tsx` desde `references/templates/nav.jsx`. Usar `usePathname` de Next.js para clases `active`. Menú hamburguesa con estado local. Test manual: visible en todas las rutas.

5. **Layout raíz** — Actualizar `app/layout.tsx` para incluir `<Nav />` y `<main>` envolvente con clase `av-main`. El footer estático va aquí.

6. **Pantalla Biblioteca** — Crear `app/page.tsx` (ruta `/`) con el componente `Library` portado: hero con animación `flicker`, búsqueda, chips de categoría y grilla de `GameCard` con efecto tilt CSS. Navega a `/games/[id]` al seleccionar una tarjeta.

7. **Pantalla Detalle** — Crear `app/games/[id]/page.tsx` con `GameDetail`: cover, tags, stats, botones y leaderboard lateral con `seededScores`. Navega a `/games/[id]/play` o de vuelta a `/`.

8. **Pantalla Reproductor** — Crear `app/games/[id]/play/page.tsx` con `GamePlayer`: HUD con score/vidas/nivel (contadores simulados vía `setInterval`), viewport CRT con elementos CSS animados, estados pausa/fin y modal de fin de juego con `onSaveScore` que escribe en `av_scores`.

9. **Pantalla Auth** — Crear `app/auth/page.tsx` con `Auth`: tarjeta centrada, tabs, formularios, botón invitado. Al confirmar llama `login(user)` del hook y redirige a `/`.

10. **Pantalla Salón de la Fama** — Crear `app/hall-of-fame/page.tsx` con `HallOfFame`: tabs por juego, podio top-3, tabla completa y fila del usuario autenticado en amarillo.

11. **Portada de cobertura CSS** — Añadir las clases `.cover-bricks`, `.cover-tetro`, `.cover-snake`, `.cover-glot`, `.cover-invaders`, `.cover-rocas`, `.cover-rana`, `.cover-duelo` (gradientes del template) a `globals.css`.

12. **Prueba end-to-end visual** — Navegar manualmente todas las rutas, probar búsqueda/filtros en Biblioteca, verificar modal de fin en Reproductor, verificar fila de usuario en Salón si se está autenticado.

---

## Criterios de aceptación

- [X] La ruta `/` muestra la Biblioteca con las 8 tarjetas de juego, búsqueda funcional y 5 chips de categoría.
- [X] Seleccionar una tarjeta navega a `/games/[id]` y muestra el nombre, descripción y leaderboard del juego correcto.
- [X] El botón "Jugar ahora" en el Detalle navega a `/games/[id]/play`.
- [X] El Reproductor muestra el HUD y el viewport CRT; el score sube automáticamente cuando no está en pausa.
- [X] El botón "Pausa" congela el score y muestra el overlay "EN PAUSA"; "Reanudar" lo quita.
- [X] El botón "Fin" abre el modal con la puntuación final y el campo de nombre.
- [X] Guardar puntuación escribe en `localStorage` bajo la clave `av_scores` y muestra "PUNTUACIÓN GUARDADA_".
- [X] La ruta `/auth` muestra la tarjeta Auth; al enviar el formulario navega a `/` y el Nav muestra el nombre del usuario.
- [X] "Jugar como invitado" redirige a `/` sin usuario autenticado.
- [X] El nombre del usuario autenticado aparece como botón en el Nav; al pulsarlo cierra la sesión.
- [X] La ruta `/hall-of-fame` muestra el podio, la tabla de 12 filas y, si el usuario está autenticado, su fila en amarillo.
- [X] Los tabs de juego en el Salón cambian el leaderboard mostrado.
- [X] El menú hamburguesa del Nav se abre y cierra en viewport móvil (< 768 px).
- [X] No hay errores en consola al navegar por todas las rutas.
- [X] El tema oscuro del template (fondo `#080810`, colores neon) se aplica en todas las pantallas.

---

## Decisiones

- **Sí:** Next.js App Router con ficheros `page.tsx` por ruta — sigue la convención del proyecto.
- **Sí:** Datos mock en `src/lib/data.ts` (TypeScript) — único source of truth, importable desde cualquier página.
- **Sí:** `localStorage` para sesión y puntuaciones — suficiente para MVP visual, coherente con el template original.
- **Sí:** `useSession` como custom hook — evita prop drilling de `user`/`login`/`signOut` por todo el árbol.
- **No:** Context API global — sobreingeniería para este alcance; el hook + prop drilling directo es suficiente.
- **No:** Zustand / Redux — fuera del alcance MVP.
- **No:** Implementar juegos reales — explícitamente excluido. El Reproductor usa `setInterval` para simular puntuación.
- **No:** Auth real — los formularios llaman directamente a `login(user)` sin validación de servidor.
- **Sí:** Adaptar estilos CSS del template a `globals.css` — Tailwind v4 se usa donde ayude, las clases propias del template se portan como CSS global para mantener fidelidad visual.

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| `localStorage` no disponible (SSR de Next.js) | Envolver accesos en `typeof window !== "undefined"` dentro del custom hook y componentes cliente (`"use client"`). |
| Clases CSS del template en conflicto con Tailwind v4 | Usar prefijo `av-` para las clases propias del proyecto (ya presente en el template) y revisar colisiones en el paso de estilos. |

---

## Lo que NO está en este spec

- Lógica de juego de ningún tipo.
- Autenticación real (OAuth, JWT, sesiones de servidor).
- Base de datos o API de puntuaciones.
- Sistema de créditos funcional.
- Modo multijugador o versus online.

Cada uno de esos, si llega, va en su propio spec.
