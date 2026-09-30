# Game Suggestions

Memoria del agente `@game-planner`. Registra cada juego sugerido y qué pasó con él.

## Preferencias del usuario

- Grabar **siempre** en este archivo cada vez que se hagan sugerencias de juegos.
- Orquestar las escrituras de forma atómica (un solo agente o el orquestador escribe; no agentes en paralelo sobre este archivo).

## Historial de sugerencias

Estados: `sugerido` | `recomendado` | `aceptado` | `rechazado` | `implementado`

| Fecha      | Slug     | Título   | Categoría | Puntaje | Estado       | Motivo               |
| ---------- | -------- | -------- | --------- | ------- | ------------ | -------------------- |
| 2026-09-29 | arkanoid | ARKANOID | ARCADE    | —       | implementado | Línea base (spec 08) |

<!-- arkanoid
Inspiración: Arkanoid / Breakout (Taito/Atari). El jugador mueve una paleta horizontal para rebotar una bola
y destruir bloques de colores dispuestos en filas. Power-ups caen de bloques especiales (ampliar paleta,
bola extra, disparo láser). Condición de victoria: eliminar todos los bloques del nivel. Condición de derrota:
perder todas las vidas (la bola cae por debajo de la paleta). Múltiples niveles con patrones de bloques
distintos. Categoría ARCADE. Componente ArkanoidGame.tsx.
-->

| 2026-09-29 | rocas | ROCAS | SHOOTER | — | implementado | Línea base (spec 05) |
<!-- rocas
Inspiración: Asteroids (Atari). El jugador pilota una nave con rotación libre y propulsión; dispara para
fragmentar asteroides grandes en medianos y luego en pequeños hasta destruirlos. La nave tiene inercia.
Los asteroides rebotan en los bordes del canvas (wrap-around). Condición de derrota: colisión con asteroide.
Sin condición de victoria formal (supervivencia infinita con dificultad creciente). Categoría SHOOTER.
Componente AsteroidsGame.tsx.
-->

| 2026-09-29 | serpentina | SERPENTINA | ARCADE | — | implementado | Línea base (spec 09) |
<!-- serpentina
Inspiración: Snake (Nokia). El jugador dirige una serpiente que crece al comer manzanas. Los controles son
las 4 direcciones ortogonales; no se puede invertir el sentido. Colisionar con la pared o con el propio
cuerpo termina la partida. Cada manzana comida suma puntos y alarga la serpiente un segmento. Dificultad
creciente: la velocidad aumenta con la longitud. Categoría ARCADE. Componente SnakeGame.tsx.
-->

| 2026-09-29 | tetris | TETRIS | PUZZLE | — | implementado | Línea base (spec 07) |
<!-- tetris
Inspiración: Tetris (Pajitnov). Piezas tetrominó caen desde arriba; el jugador las rota y desplaza
horizontalmente para completar líneas horizontales sin huecos. Las líneas completas se eliminan y suman
puntos (más puntos por varias líneas simultáneas). La velocidad de caída aumenta con el nivel. Condición
de derrota: las piezas alcanzan la parte superior del tablero. Categoría PUZZLE. Componente TetrisGame.tsx.
-->

| 2026-09-29 | paletas | PALETAS | VERSUS | 31/35 | recomendado | Pong vs CPU; primer juego en VERSUS (categoría vacía), esfuerzo muy bajo |
<!-- paletas
Inspiración: Pong (Atari). Paletas verticales a cada lado del canvas; el jugador controla la paleta
izquierda (arriba/abajo), la CPU controla la derecha con IA de seguimiento. La bola rebota en las paredes
superior e inferior y en las paletas. Punto al oponente cuando la bola sale por un lateral. Primero en
llegar a 7 puntos gana. Ángulo de rebote varía según dónde impacte la paleta. Categoría VERSUS.
Componente PaletasGame.tsx.
-->

| 2026-09-29 | invasores | INVASORES | SHOOTER | 30/35 | sugerido | Space Invaders; puntaje excelente, pero SHOOTER ya tiene ROCAS y VERSUS sigue vacía |
<!-- invasores
Inspiración: Space Invaders (Taito). Cuadrícula de aliens que avanza hacia abajo en filas mientras se
desplaza lateralmente. El jugador mueve una nave horizontal y dispara hacia arriba. Los aliens también
disparan hacia abajo. Escudos destructibles absorben disparos. Los aliens se aceleran al reducir su número.
Condición de victoria: eliminar todos los aliens. Condición de derrota: los aliens llegan al suelo o el
jugador pierde todas las vidas. Categoría SHOOTER. Componente InvasoresGame.tsx.
-->

| 2026-09-29 | 2048 | 2048 | PUZZLE | 26/35 | sugerido | Puntaje claro, pero estética menos retro arcade y PUZZLE ya tiene TETRIS |
<!-- 2048
Inspiración: 2048 (Cirulli). Tablero 4×4 de fichas numéricas. El jugador desliza todas las fichas en una
dirección (arriba/abajo/izquierda/derecha); fichas con el mismo valor se fusionan sumando sus valores.
Aparece una ficha nueva (2 o 4) en cada turno. Objetivo: alcanzar la ficha 2048. Condición de derrota:
el tablero llena sin movimientos posibles. Puntuación = suma de todas las fusiones. Categoría PUZZLE.
Componente Game2048.tsx.
-->

| 2026-09-29 | cruce | CRUCE (Rana) | ARCADE | 32/35 | recomendado | Frogger; mecánica nueva, bajo esfuerzo, muy distinto del catálogo |
<!-- cruce
Inspiración: Frogger (Konami). El jugador mueve una rana de la parte inferior a la superior del canvas
saltando en cuadrículas. En la sección de carretera debe esquivar coches que avanzan horizontalmente a
distintas velocidades. En la sección de río debe saltar sobre troncos y tortugas que también se mueven.
Caer al agua o ser atropellado quita una vida. Llegar a una de las 5 casas meta completa una ronda y
aumenta la dificultad. Categoría ARCADE. Componente CruceGame.tsx.
-->

| 2026-09-29 | tanques | TANQUES (Blindados) | VERSUS | 32/35 | recomendado | Combat; llena VERSUS, aprovecha lógica de ROCAS, duelo vs CPU |
<!-- tanques
Inspiración: Combat (Atari 2600). Duelo 1v1 jugador vs CPU en escenario de paredes fijas. El tanque se
mueve en 4 direcciones ortogonales; el cañón apunta en la última dirección de movimiento. Las balas
rebotan en las paredes (máx. 3 rebotes). +150 pts por impacto directo, +250 por impacto con al menos
un rebote. 3 vidas por bando; el que pierde las 3 primero pierde. 5 mapas de paredes fijas seleccionados
al azar. IA CPU: patrulla, busca cobertura y predice ángulo de rebote (±5-10° de error). Categoría VERSUS.
Componente BlindadosGame.tsx. Spec completo en specs/game-jam/tanques-mvp.md.
-->

| 2026-09-29 | ciempies | CIEMPIÉS | SHOOTER | 31/35 | sugerido | Centipede; segmentos que se dividen, refuerza SHOOTER con mecánica única |
<!-- ciempies
Inspiración: Centipede (Atari). Un ciempiés formado por segmentos desciende en zigzag desde la parte
superior. El jugador dispara desde la parte inferior; cada impacto en un segmento lo destruye y convierte
el punto de impacto en un hongo, dividiendo el ciempiés en dos partes independientes. Las arañas y pulgas
son enemigos secundarios. Condición de victoria: eliminar todos los segmentos de todos los ciempiés del
nivel. Dificultad creciente por nivel. Categoría SHOOTER. Componente CiempiesGame.tsx.
-->

| 2026-09-29 | burbujas | BURBUJAS | PUZZLE | 31/35 | sugerido | Puzzle Bobble; segundo juego en PUZZLE, mecánica apuntar+encadenar |
<!-- burbujas
Inspiración: Puzzle Bobble / Bust-a-Move (Taito). Burbujas de colores apiladas en la parte superior.
El jugador apunta con un lanzador en la parte inferior y dispara burbujas hacia arriba; al conectar 3 o
más del mismo color, el grupo explota y suma puntos. Las burbujas que cuelguen sin soporte también caen.
El jugador pierde si las burbujas llegan a la línea inferior. Apuntar con ratón o flechas izquierda/derecha;
disparar con espacio. Categoría PUZZLE. Componente BurbujaGame.tsx.
-->

| 2026-09-29 | misiles | MISILES (Defensa) | SHOOTER | 31/35 | sugerido | Missile Command; defender posición fija, distinto de ROCAS |
<!-- misiles
Inspiración: Missile Command (Atari). Misiles enemigos caen desde la parte superior hacia 6 ciudades y
3 bases de misiles en la parte inferior. El jugador hace clic (o usa flechas + espacio) para lanzar misiles
interceptores que explotan en el punto señalado, destruyendo los misiles enemigos dentro del radio de
explosión. Perder las 3 bases limita la capacidad de defensa. Ronda completa cuando todos los misiles
enemigos son destruidos o impactan. Ciudades destruidas no se recuperan entre rondas. Dificultad creciente.
Categoría SHOOTER. Componente MisilesGame.tsx.
-->

| 2026-09-29 | cerco | CERCO | ARCADE | 30/35 | sugerido | Qix; conquistar territorio, mecánica única en el catálogo, esfuerzo medio-alto |
<!-- cerco
Inspiración: Qix (Taito). El jugador traza líneas desde el borde del canvas hacia el interior para
"cercar" y conquistar regiones del área de juego. Un enemigo (Qix) se mueve libremente en el área no
conquistada. Si el enemigo toca la línea mientras se está trazando, el jugador pierde una vida. Dos tipos
de trazado: lento (más puntos) y rápido (menos puntos). Objetivo: conquistar el 75% o más del área total.
Sparx (enemigos secundarios) patrullan el borde conquistado. Esfuerzo de implementación medio-alto.
Categoría ARCADE. Componente CercoGame.tsx.
-->

| 2026-09-29 | ciclos | CICLOS | VERSUS | 30/35 | sugerido | Tron light cycles vs CPU; reutiliza lógica de SERPENTINA |
<!-- ciclos
Inspiración: Tron Light Cycles (Bally Midway). Dos motos dejan un rastro permanente de luz al moverse.
El jugador controla una moto (flechas), la CPU controla la otra con IA de evitación. Chocar contra
cualquier rastro (propio, del rival o la pared) termina la partida o la ronda. Objetivo: sobrevivir más
tiempo que el oponente. Reutiliza la lógica de movimiento de SERPENTINA (grid ortogonal, sin retroceso).
Puntuación por tiempo de supervivencia y por forzar colisión del rival. Categoría VERSUS.
Componente CiclosGame.tsx.
-->
