# SPEC 02 — Home Page y About

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-28
> **Objetivo:** Implementar la landing page (Home) y la página About+Contact de Arcade Vault, mover Library de `/` a `/games`, y actualizar el Nav con los nuevos links.

---

## Alcance

**Incluido:**

- Ruta `/` → reemplaza Library con la pantalla `Home` (landing page).
- Ruta `/games` → nueva ubicación de Library (portada del SPEC 01, sin cambios funcionales).
- Ruta `/about` → pantalla `About` con sección misión y formulario de contacto visual.
- Actualización del Nav: links `HOME · JUEGOS · SALÓN · ABOUT` + actualización de la ruta de Library de `/` a `/games`.
- Estilos nuevos portados de `references/home-about/styles.css` hacia `app/globals.css`: clases `.home-*`, `.about-*`, `.feature-*`, `.mini-*`, `.stats-*`, `.activity-*`, `.pricing-*`, `.home-silos`, `.home-stats`, `.home-final`, `.reveal`, `.contact-*`, `.highlight-*`, `.about-divider`, `.terminal-success`, `.term-*`.
- Todos los links internos dentro de Home y About usan `useRouter` / `<Link>` de Next.js (no `navigate` prop del template).

**Fuera de alcance:**

- Formulario de contacto con envío real (queda visual: valida campos vacíos con shake, muestra terminal de éxito al enviar — igual que el template, sin llamadas a servidor).
- Internacionalización.
- SEO/metadata avanzada.
- Animación `useReveal` con IntersectionObserver — se implementa igual que en el template.
- Cambios en GameDetail (`/games/[id]`) o GamePlayer (`/games/[id]/play`) más allá del ajuste de enlace "Volver" si era a `/`.

---

## Modelo de datos

No se introducen nuevas estructuras. Home reutiliza `GAMES` de `src/lib/data.ts` para la sección "Juegos disponibles ahora" (primeros 6 juegos). About no necesita datos externos.

---

## Plan de implementación

1. **Mover Library a `/games`** — Crear `app/games/page.tsx` copiando el contenido actual de `app/page.tsx` (componente Library). Verificar que la ruta `/games` muestra la biblioteca completa.

2. **Actualizar GameDetail y GamePlayer** — Si el botón "Volver" de `app/games/[id]/page.tsx` apunta a `/`, cambiarlo a `/games`. Verificar que la navegación Detalle → Biblioteca sigue funcionando.

3. **Actualizar Nav** — Modificar `src/components/Nav.tsx` para cambiar el link de Biblioteca de `/` a `/games` y añadir los links `HOME` (`/`) y `ABOUT` (`/about`). Mantener el orden: `HOME · JUEGOS · SALÓN · ABOUT`. Actualizar la lógica `active` con `usePathname`.

4. **Estilos Home/About** — Añadir a `app/globals.css` los bloques CSS de `references/home-about/styles.css` correspondientes a: `.home-*`, `.about-*`, `.feature-*`, `.mini-*`, `.stats-*`, `.activity-*`, `.pricing-*`, `.home-silos`, `.home-stats`, `.home-final`, `.reveal`, `.contact-*`, `.highlight-*`, `.about-divider`, `.terminal-success`, `.term-*`, `.gp`, `.gp-*`, `.dp`, `.dp-*`. No duplicar estilos ya presentes del SPEC 01.

5. **Componente `FloatingSilhouettes`** — Crear `src/components/FloatingSilhouettes.tsx` portando las siluetas SVG del template (8 figuras pixel-art animadas con `.home-silos .silo`).

6. **Componente `FeatureIcon`** — Crear `src/components/FeatureIcon.tsx` portando los 4 iconos pixel SVG (`GAMEPAD`, `FREE`, `TROPHY`, `ROCKET`).

7. **Pantalla Home** — Reemplazar `app/page.tsx` con el componente `Home` portado de `references/home-about/home.jsx`:
   - Hero: eyebrow, título 3 líneas, subtítulo, CTAs ("EXPLORAR JUEGOS" → `/games`, "CREAR CUENTA" → `/auth`), siluetas flotantes, scroll hint.
   - Sección "¿Por qué Arcade Vault?" (4 feature cards con `FeatureIcon`).
   - Sección "Juegos disponibles ahora" (6 `MiniCard` de `GAMES`, link a `/games/[id]`), botón "VER TODOS" → `/games`.
   - Sección Stats (3 bloques: `12+`, `MILES`, `GLOBAL`).
   - Sección "Actividad en vivo" (últimas puntuaciones ticker + top 5 jugadores, datos hardcoded), link "VER SALÓN" → `/hall-of-fame`.
   - Sección Precios (1 plan free + FAQ 3 preguntas).
   - CTA final ("INSERTAR MONEDA" → `/games`).
   - Hook `useReveal` para animación de scroll con IntersectionObserver.

8. **Componente `MiniCard`** — Crear `src/components/MiniCard.tsx` portando el mini card de juego (cover 1:1, título, categoría).

9. **Pantalla About** — Crear `app/about/page.tsx` portando `references/home-about/about.jsx`:
   - Hero: kicker, título, párrafo misión, 3 highlight cards con `HighlightIcon`.
   - Divider de píxeles animados.
   - Sección contacto: columna intro (kicker, título, subtítulo, 3 tips con LED) + formulario (nombre, email, mensaje).
   - Formulario: validación de campos vacíos con clase `shake`, al enviar muestra terminal-success visual. No hay llamada a servidor.
   - Hook `useReveal` reutilizado.

10. **Componente `HighlightIcon`** — Crear `src/components/HighlightIcon.tsx` portando los 3 iconos pixel SVG (`HEART`, `BROWSER`, `PLANT`).

11. **Prueba end-to-end visual** — Navegar `/` (Home), verificar secciones y CTAs. Navegar `/games` (Library, sin regresión). Navegar `/about`, probar formulario con campos vacíos (shake) y envío correcto (terminal). Verificar links del Nav activos en cada ruta. Verificar responsivo en viewport < 768 px.

---

## Criterios de aceptación

- [X] La ruta `/` muestra la landing page Home con hero, 4 feature cards, 6 mini cards de juegos, stats, actividad, precios y CTA final.
- [X] El botón "EXPLORAR JUEGOS" en el hero navega a `/games`.
- [X] El botón "CREAR CUENTA" en el hero navega a `/auth`.
- [X] Las 6 MiniCard de juegos navegan a `/games/[id]` al hacer clic.
- [x] El botón "VER TODOS LOS JUEGOS" navega a `/games`.
- [X] El link "VER SALÓN" en la sección de actividad navega a `/hall-of-fame`.
- [X] Los elementos con clase `.reveal` arrancan invisible y se animan al entrar en el viewport.
- [X] Las siluetas flotantes (`FloatingSilhouettes`) están animadas y visibles en el hero.
- [X] La ruta `/games` muestra la Biblioteca igual que antes del spec (sin regresión en búsqueda, chips y cards).
- [X] El Nav muestra los links `HOME · JUEGOS · SALÓN · ABOUT` y la clase `active` refleja la ruta actual.
- [X] La ruta `/about` muestra hero, 3 highlights, divider animado y formulario de contacto.
- [ ] Enviar el formulario con campos vacíos aplica la clase `shake` al formulario y no avanza.
- [ ] Enviar el formulario con todos los campos rellenos muestra el terminal-success visual.
- [X] No hay errores en consola al navegar por todas las rutas.
- [X] El diseño es responsivo en viewport < 768 px.

---

## Decisiones

- **Sí:** `/` → Home, `/games` → Library — permite que la landing page sea la entrada principal del sitio, más alineado con la referencia y con la navegación esperada del usuario.
- **Sí:** About incluida en el mismo spec — los archivos de referencia van juntos y comparten CSS; separarlos sería split innecesario.
- **Sí:** Nav actualizado en este spec — sin el Nav actualizado las nuevas rutas serían inaccesibles desde la UI.
- **Sí:** Formulario de contacto visual sin backend — consistente con el enfoque del SPEC 01 (todo mock/local).
- **No:** Gamepad interactivo del reference (`.gp`, `.dp`) implementado como sección standalone — los estilos se incluyen en `globals.css` por completitud, pero no se añade una sección nueva en Home con ese componente a menos que ya esté en `home.jsx` (no está).
- **No:** Datos de actividad en tiempo real — se usan los datos hardcoded del template (7 scores, 5 top jugadores).

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Mover Library de `/` a `/games` puede romper links internos hardcodeados en SPEC 01 (GameDetail "Volver", GamePlayer "Volver") | Revisar explícitamente esos botones en el paso 2 del plan. |
| Duplicación de estilos `.reveal` si ya existe en `globals.css` del SPEC 01 | Verificar antes de añadir; usar comentario de bloque para delimitación. |
| `useReveal` (IntersectionObserver) debe ser `"use client"` en Next.js App Router | Marcar `app/page.tsx` y `app/about/page.tsx` como `"use client"` o extraer el hook a un componente cliente. |
