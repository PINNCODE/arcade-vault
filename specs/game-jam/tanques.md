# SPEC — BLINDADOS

> **Status:** Borrador (Jam)
> **Tema:** TANQUES (Combat/Blindados)
> **Depends on:** SPEC 04, SPEC 06
> **Date:** 2026-09-29
> **Objective:** Implementar un duelo de tanques retro en el que el jugador usa rebotes de bala para eliminar a un enemigo CPU oculto tras cobertura en mapas de paredes fijas con lógica de puzzle táctico.

## Scope

**In:**

- Tanque del jugador con movimiento ortogonal (arriba/abajo/izquierda/derecha, sin rotación libre); el cañón apunta siempre en la dirección de movimiento actual
- Balas con física de rebote (ángulo de incidencia = ángulo de reflexión), máximo 3 rebotes por disparo antes de desaparecer
- Enemigo CPU con IA moderada: patrulla, busca cobertura y calcula disparos básicos con predicción de rebote
- Sistema de vida: 3 golpes eliminan a cualquier tanque (jugador o CPU)
- Puntuación: +150 por impacto directo, +250 por impacto con al menos un rebote
- 5 mapas de paredes fijas seleccionados al azar al inicio de cada partida; cada mapa crea escenarios de tiro distintos
- HUD: puntuación actual, vidas del jugador (iconos de tanque), contador de rebotes de la bala en vuelo
- Pantalla de game over con score final y botón para reiniciar
- Envío de score a Supabase al terminar la partida (game over o victoria)
- Renderizado en canvas HTML5 con estética retro pixel art (paleta de 4 colores por bando)
- Componente React `BlindadosGame.tsx` en `src/components/games/`
- Página play en `app/games/tanques/play/page.tsx`
- Registro del juego en la tabla `games` de Supabase con slug `tanques`, categoría `VERSUS`

**Out of scope (para futuros specs):**

- Modo multijugador local o en red (dos jugadores en el mismo teclado o en línea)
- Movimiento rotacional libre del cañón independiente del movimiento del tanque
- Laberintos generados proceduralmente
- Power-ups (velocidad, escudo, multi-bala)
- Animaciones de explosión elaboradas o efectos de partículas
- Mapas editables por el usuario
- Sonido / efectos de audio
- Tabla de récords por mapa individual

## Data model

### Estado interno del juego

```
GameState {
  phase: "playing" | "game_over" | "victory"
  score: number
  playerLives: number          // comienza en 3
  enemyLives: number           // comienza en 3
  currentMap: number           // índice 0-4 del mapa activo
  roundTime: number            // segundos transcurridos

  player: TankState {
    x: number
    y: number
    direction: "up" | "down" | "left" | "right"
    cooldown: number           // ticks restantes antes de poder disparar de nuevo
    isAlive: boolean
  }

  enemy: TankState {
    x: number
    y: number
    direction: "up" | "down" | "left" | "right"
    cooldown: number
    isAlive: boolean
    aiState: "patrol" | "chase" | "aim" | "retreat"
  }

  bullets: Bullet[] {
    x: number
    y: number
    vx: number
    vy: number
    owner: "player" | "enemy"
    bounces: number            // rebotes consumidos (máx 3)
  }

  walls: Wall[] {
    x: number
    y: number
    width: number
    height: number
  }
}
```

### Payload enviado a Supabase al game over

```ts
{
  game_id: "tanques",
  player_name: string,
  score: number,
  metadata: {
    outcome: "victory" | "defeat",
    directHits: number,
    bounceHits: number,
    roundTime: number,
    mapIndex: number
  }
}
```

## Implementation plan

1. Crear el archivo `src/components/games/BlindadosGame.tsx` con el componente React que contiene el canvas y el game loop (requestAnimationFrame)
2. Implementar el sistema de renderizado: dibujo de paredes, tanques (rectángulo + indicador de cañón) y balas con estética retro en paleta reducida
3. Definir los 5 mapas como arrays de objetos `Wall` con coordenadas fijas en un archivo de datos `src/lib/games/tanques/maps.ts`
4. Implementar el movimiento ortogonal del jugador con teclado (WASD o flechas) y disparo con barra espaciadora
5. Implementar la física de balas: movimiento rectilíneo, detección de colisión AABB con paredes y cálculo del vector reflejado, contador de rebotes, desaparición al llegar a 3 rebotes
6. Implementar detección de colisión bala-tanque y lógica de daño (descuento de vida, respawn breve del tanque golpeado si aún tiene vidas)
7. Implementar la IA del enemigo CPU: máquina de estados (patrol → aim → shoot → retreat) con predicción básica de ángulo de rebote para intentar alcanzar al jugador
8. Implementar el sistema de puntuación (+150 directo, +250 con rebote) y el HUD (score, vidas, bounces en vuelo)
9. Implementar las pantallas de inicio rápido, game over y victoria con score final
10. Conectar el envío de score a Supabase usando `submitScore` de `src/lib/supabase/queries-client.ts` al terminar la partida
11. Crear la página `app/games/tanques/play/page.tsx` que monta `BlindadosGame` con layout fullscreen
12. Registrar el juego en Supabase: insertar fila en la tabla `games` con `id="tanques"`, `title="BLINDADOS"`, `cat="VERSUS"`, descripción corta y larga, cover y color
13. Verificar que la ficha del juego aparece correctamente en `/games/tanques` con top scores y botón JUGAR

## Acceptance criteria

- [ ] El tanque del jugador se mueve en las 4 direcciones ortogonales sin diagonales, el cañón apunta siempre en la última dirección de movimiento
- [ ] Al disparar, la bala viaja en línea recta y rebota correctamente en todas las paredes (ángulo de reflexión visualmente correcto)
- [ ] Una bala desaparece tras 3 rebotes o al impactar un tanque
- [ ] Un impacto directo suma +150 al score; un impacto precedido de al menos un rebote suma +250
- [ ] El jugador y el enemigo tienen 3 vidas cada uno; perder la última vida termina la partida
- [ ] El enemigo CPU dispara de forma razonablemente coherente (no dispara solo hacia las paredes sin chance de alcanzar al jugador) y no se queda inmóvil más de 2 segundos
- [ ] Al game over o victoria se muestra la pantalla con el score y se envía el payload a Supabase sin errores de consola
- [ ] El score aparece en la tabla `scores` de Supabase correctamente asociado a `game_id="tanques"`
- [ ] El juego es jugable en pantallas de 375 px de ancho (móvil) y de 1280 px (escritorio)
- [ ] El juego aparece en la biblioteca de juegos de Arcade Vault bajo la categoría VERSUS

## Decisions

- **Movimiento ortogonal sin rotación libre:** diferencia clara de ROCAS y simplifica el cálculo de rebotes a reflexiones en ejes X/Y; también evoca la estética del arcade original Combat (Atari 2600)
- **Máximo 3 rebotes por bala:** limita la complejidad de la IA y mantiene la partida legible; más rebotes harían imposible predecir las trayectorias visualmente
- **5 mapas fijos en lugar de generación procedural:** permite diseñar puzzles de tiro con intención; los mapas se pueden equilibrar manualmente para que siempre exista al menos una línea de disparo con rebote viable
- **IA con predicción básica de rebote (un rebote):** la CPU calcula el ángulo necesario para golpear al jugador con exactamente un rebote en la pared más cercana; si no hay solución limpia, dispara en línea recta, lo que la hace predecible pero competente
- **Categoría VERSUS:** la mecánica de duelo 1v1 (jugador vs CPU) encaja en VERSUS, no en SHOOTER; SHOOTER implica hordas o supervivencia, VERSUS implica un oponente simétrico

## Risks

| Risk                                                                                 | Mitigation                                                                                                                                                                      |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los rebotes producen trayectorias que atraviesan esquinas de paredes (bug de tunnel) | Usar detección de colisión discreta con paso máximo de 1px por frame para balas; nunca avanzar más de la mitad del grosor de la pared por tick                                  |
| La IA es demasiado fácil o imposiblemente precisa con rebotes                        | Añadir un margen de error aleatorio (±5-10°) al ángulo calculado por la CPU; ajustable con una constante `AI_AIM_ERROR`                                                         |
| El canvas no escala correctamente en móvil                                           | Definir dimensiones lógicas fijas (p. ej. 480×480) y aplicar CSS `object-fit: contain` o `scale()` para adaptar al viewport sin distorsionar la lógica de colisiones            |
| El envío de score falla si el jugador cierra la pestaña antes del game over          | El score se envía únicamente al llegar a la pantalla de game over/victoria, que requiere que la partida concluya normalmente; documentar esta limitación como esperada          |
| Los 5 mapas fijos pueden resultar repetitivos a corto plazo                          | Diseñar los mapas con densidad de paredes variable (abierto, medio, cerrado) para maximizar la variedad percibida; dejar la puerta abierta a añadir más mapas en un spec futuro |

## What is **not** in this spec

- Modo dos jugadores (teclado compartido o red)
- Rotación libre del cañón independiente del movimiento
- Generación procedural de mapas o laberintos
- Power-ups de cualquier tipo (velocidad, escudo, multi-disparo, vida extra)
- Efectos de sonido o música de fondo
- Animaciones de explosión con partículas
- Sistema de niveles progresivos (dificultad creciente)
- Editor de mapas
- Récords separados por mapa
- Balas teledirigidas o con más de 3 rebotes configurables por el usuario
