# SPEC 06 — Leaderboard y tabla de juegos en Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-09-28
> **Objetivo:** Crear las tablas `games` y `scores` en Supabase, migrar los datos de `lib/data.ts` a la BD, exponer un leaderboard global y por juego en `/leaderboard`, y conectar el guardado de scores de Asteroids a Supabase.

---

## Alcance

**Incluido:**

- Crear tabla `games` en Supabase y migrar los datos de `lib/data.ts`.
- Eliminar `lib/data.ts` y reemplazar su uso con queries a Supabase en todos los componentes que lo importan.
- Crear tabla `scores` en Supabase (`game_id`, `player_name`, `score`, `created_at`).
- Habilitar RLS en ambas tablas: `games` read público, `scores` read + insert público.
- Crear `src/lib/supabase/queries.ts` con `getGames()`, `getGame(id)`, `getTopScores(gameId?, limit)`.
- Crear `src/lib/supabase/queries-client.ts` con `saveScore(gameId, playerName, score)` (browser client).
- Conectar el modal de game-over de `/games/rocas/play` para que `saveScore` llame a Supabase.
- Crear `app/leaderboard/page.tsx` con top 10 global y filtro por juego.
- Añadir enlace "Leaderboard" al navbar.
- Mostrar top 5 del juego en `app/games/[id]/page.tsx`.

**Fuera de alcance:**

- Autenticación de usuarios (scores anónimos con solo nombre).
- Paginación (top 10 fijo en el leaderboard global, top 5 en ficha del juego).
- Admin UI para añadir/editar juegos en Supabase.
- Realtime updates del leaderboard.
- Soft-delete o moderación de scores.
- Conectar scores de juegos distintos a Asteroids (solo Asteroids tiene play page funcional).

---

## Modelo de datos

```sql
-- Tabla games (migrada de lib/data.ts)
create table games (
  id          text primary key,         -- slug usado en URL (ej: "rocas")
  title       text    not null,
  description text    not null,
  genre       text,
  difficulty  text,
  year        integer,
  controls    jsonb,                    -- { move: string[], shoot: string[], ... }
  image_url   text,
  created_at  timestamptz default now()
);

-- Tabla scores
create table scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references games(id) on delete cascade,
  player_name text not null,
  score       integer not null check (score >= 0),
  created_at  timestamptz default now()
);

create index scores_game_id_score_idx on scores(game_id, score desc);
create index scores_score_idx         on scores(score desc);
```

**RLS:**

- `games`: política `select` para todos (anon). Sin insert/update/delete desde el cliente.
- `scores`: políticas `select` e `insert` para todos (anon). Sin update/delete.

**Tipos TypeScript** en `src/lib/supabase/types.ts`:

```ts
export interface Game {
  id: string;
  title: string;
  description: string;
  genre?: string;
  difficulty?: string;
  year?: number;
  controls?: Record<string, string[]>;
  image_url?: string;
}

export interface Score {
  id: string;
  game_id: string;
  player_name: string;
  score: number;
  created_at: string;
}
```

---

## Plan de implementación

### 1. Leer `lib/data.ts` y mapear el esquema

Leer el archivo para identificar todos los campos existentes. Comparar con la definición de la tabla `games` arriba y ajustar si hay campos adicionales antes de aplicar la migración.

### 2. Crear las tablas en Supabase

Aplicar la migración vía `mcp__supabase__apply_migration`:

```sql
create table games (
  id          text primary key,
  title       text not null,
  description text not null,
  genre       text,
  difficulty  text,
  year        integer,
  controls    jsonb,
  image_url   text,
  created_at  timestamptz default now()
);

create table scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references games(id) on delete cascade,
  player_name text not null,
  score       integer not null check (score >= 0),
  created_at  timestamptz default now()
);

create index scores_game_id_score_idx on scores(game_id, score desc);
create index scores_score_idx         on scores(score desc);

alter table games  enable row level security;
alter table scores enable row level security;

create policy "games_select_public"  on games  for select using (true);
create policy "scores_select_public" on scores for select using (true);
create policy "scores_insert_public" on scores for insert with check (true);
```

### 3. Seed de `games` con los datos de `lib/data.ts`

Leer todos los juegos de `lib/data.ts` y generar un INSERT por juego. Ejecutar vía `mcp__supabase__execute_sql`.

### 4. Crear `src/lib/supabase/types.ts`

Definir las interfaces `Game` y `Score` tal como se muestran en el modelo de datos.

### 5. Crear `src/lib/supabase/queries.ts` (server)

```ts
import { createClient } from "./server";
import type { Game, Score } from "./types";

export async function getGames(): Promise<Game[]>;
export async function getGame(id: string): Promise<Game | null>;
export async function getTopScores(
  gameId?: string,
  limit = 10
): Promise<(Score & { games: Pick<Game, "title"> })[]>;
```

Todas las funciones usan el server client (`createClient` de `./server`).

### 6. Crear `src/lib/supabase/queries-client.ts` (browser)

```ts
import { createClient } from "./client";

export async function saveScore(gameId: string, playerName: string, score: number): Promise<void>;
```

Usa el browser client. Se importa solo desde Client Components (`"use client"`).

### 7. Reemplazar `lib/data.ts` en todos los archivos que lo importan

Buscar todos los `import ... from "@/lib/data"`. Para cada archivo:

- Si es un Server Component: reemplazar por `await getGames()` o `await getGame(id)`.
- Si es un Client Component que solo necesita datos estáticos: convertirlo a Server Component o pasar los datos como props desde el padre.

### 8. Eliminar `lib/data.ts`

Una vez migrados todos los imports, borrar el archivo. Verificar que el build pasa.

### 9. Conectar `saveScore` en `/games/rocas/play/page.tsx`

Reemplazar el stub `useSession().saveScore(...)` con la llamada real:

```ts
import { saveScore } from "@/lib/supabase/queries-client";
// en el handler del modal:
await saveScore("rocas", playerName, finalScore);
```

### 10. Crear `app/leaderboard/page.tsx`

Server Component que:

- Llama `getTopScores(undefined, 10)` para el ranking global inicial.
- Renderiza una tabla con columnas: Posición, Jugador, Juego, Puntuación, Fecha.
- Incluye un selector de juego (dropdown o tabs) para filtrar. Al filtrar, la URL cambia con un search param `?game=id` y el Server Component recarga.

### 11. Actualizar `app/games/[id]/page.tsx`

Añadir una sección "Top 5" que llame `getTopScores(id, 5)` y renderice un mini-ranking debajo de la descripción del juego.

### 12. Añadir enlace al navbar

Localizar el componente de navegación y añadir `<Link href="/leaderboard">Leaderboard</Link>`.

### 13. Prueba manual del flujo completo

- Navegar a `/games` — los juegos cargan desde Supabase.
- Jugar Asteroids y guardar puntuación — verificar la fila en la tabla `scores` de Supabase.
- Navegar a `/leaderboard` — ver el top 10 global con nombre, juego, score y fecha.
- Usar el filtro por juego en `/leaderboard` — solo aparecen scores de ese juego.
- Navegar a `/games/rocas` — ver el mini-ranking con top 5.
- `npm run build` pasa sin errores TypeScript.

---

## Criterios de aceptación

- [x] Las tablas `games` y `scores` existen en Supabase con RLS habilitado.
- [x] `games` contiene todos los juegos que estaban en `lib/data.ts`.
- [x] `lib/data.ts` ya no existe en el repositorio.
- [x] `/games` y `/games/[id]` cargan los datos desde Supabase sin errores de runtime ni TypeScript.
- [x] Al terminar una partida en `/games/rocas/play` y guardar la puntuación con un nombre, el score aparece en la tabla `scores` de Supabase.
- [x] `/leaderboard` muestra el top 10 global con columnas: posición, jugador, juego, puntuación, fecha.
- [x] El filtro por juego en `/leaderboard` funciona y muestra solo los scores del juego seleccionado.
- [x] `/games/[id]` muestra el top 5 del juego en una sección "Top 5".
- [x] El navbar incluye un enlace funcional a `/leaderboard`.
- [x] `npm run build` pasa sin errores TypeScript.
- [x] Las rutas existentes (`/`, `/games`, `/about`, `/games/rocas/play`) no tienen regresiones.

---

## Decisiones

- **Tabla `games` reemplaza `lib/data.ts`** — mantener dos fuentes de verdad (archivo TS + BD) causa inconsistencias inevitables; Supabase se vuelve la única fuente y `lib/data.ts` se elimina.
- **Scores anónimos (solo nombre)** — autenticación queda para un spec posterior; un nombre es suficiente para dar identidad al score en el MVP.
- **Top 10 sin paginación** — suficiente para el MVP; paginación añade complejidad sin valor inmediato.
- **`saveScore` en cliente, lecturas en servidor** — las queries de lectura son Server Components (mejor para SEO y cache); el insert de score ocurre en el modal (Client Component), por lo que necesita el browser client en un archivo separado.
- **RLS permisivo (insert anónimo)** — score spam no es un riesgo aceptable para el MVP; se puede endurecer con autenticación o rate limiting en un spec posterior.
- **Leaderboard global + filtro por juego en una sola página `/leaderboard`** — más simple que rutas separadas; el filtro con search param permite URLs compartibles por juego.
- **Filtro por juego como search param (`?game=id`)** — mantiene el comportamiento de Server Component sin necesidad de estado cliente; la URL es compartible y refleja el filtro activo.

---

## Riesgos

| Riesgo                                                                  | Mitigación                                                                                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/data.ts` tiene campos no contemplados en el schema de `games`      | Leer el archivo en el paso 1 antes de aplicar la migración; ajustar la tabla si es necesario                                                                  |
| Un Server Component llama al browser client accidentalmente (SSR error) | Separar en dos archivos: `queries.ts` (server) y `queries-client.ts` (browser); el nombre lo hace explícito                                                   |
| RLS con insert anónimo permite spam de scores                           | Aceptado para el MVP; mitigación futura: autenticación o Edge Function con rate limiting                                                                      |
| `getTopScores` con JOIN a `games` puede ser lento en tablas grandes     | El índice `scores_game_id_score_idx` cubre las queries de filtro; suficiente para el volumen esperado del MVP                                                 |
| El Server Component de leaderboard tiene datos stale tras un insert     | Añadir `revalidatePath('/leaderboard')` en la Server Action o Route Handler de `saveScore` si se mueve allí en el futuro; por ahora el usuario puede recargar |
