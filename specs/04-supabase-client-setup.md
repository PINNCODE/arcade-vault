# SPEC 04 — Configuración del cliente Supabase (browser + SSR)

> **Estado:** Implementado
> **Depende de:** ninguno
> **Fecha:** 2026-09-28
> **Objetivo:** Instalar y configurar los clientes Supabase (browser y server) con middleware de refresco de sesión como infraestructura base para specs futuros de autenticación, base de datos y realtime.

---

## Alcance

**Incluido:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr` como dependencias de producción.
- Añadir variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a `.env.local` y `.env.example`.
- Crear `src/lib/supabase/client.ts` — helper `createBrowserClient` para Client Components.
- Crear `src/lib/supabase/server.ts` — helper `createServerClient` para Server Components, Server Actions y Route Handlers.
- Crear `middleware.ts` en la raíz del proyecto para refrescar automáticamente las cookies de sesión SSR en cada request.
- Verificar conectividad con un health-check manual en la consola de desarrollo.

**Fuera de alcance:**

- Creación del proyecto en el dashboard de Supabase (ya existe).
- Autenticación (login, registro, sesiones de usuario) — queda para un spec posterior.
- Definición de tablas o esquema de base de datos.
- Subscripciones realtime.
- Row Level Security (RLS).
- Tipos TypeScript generados desde el esquema de Supabase (`supabase gen types`).

---

## Modelo de datos

No se introducen nuevas estructuras de aplicación. Solo variables de entorno:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## Plan de implementación

1. **Instalar paquetes** — Ejecutar `npm install @supabase/supabase-js @supabase/ssr`. Verificar que aparecen en `dependencies` de `package.json`.

2. **Variables de entorno** — Añadir a `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```

   Añadir a `.env.example`:

   ```
   # Supabase — https://supabase.com/dashboard/project/_/settings/api
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```

   Verificar que `.env*` ya está en `.gitignore`.

3. **Browser client** — Crear `src/lib/supabase/client.ts`:

   ```ts
   import { createBrowserClient } from "@supabase/ssr";

   export function createClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     );
   }
   ```

4. **Server client** — Crear `src/lib/supabase/server.ts`:

   ```ts
   import { createServerClient } from "@supabase/ssr";
   import { cookies } from "next/headers";

   export async function createClient() {
     const cookieStore = await cookies();
     return createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       {
         cookies: {
           getAll() {
             return cookieStore.getAll();
           },
           setAll(cookiesToSet) {
             try {
               cookiesToSet.forEach(({ name, value, options }) =>
                 cookieStore.set(name, value, options)
               );
             } catch {
               /* Server Component — no se puede set cookies */
             }
           },
         },
       }
     );
   }
   ```

5. **Middleware** — Crear `middleware.ts` en la raíz del proyecto:

   ```ts
   import { createServerClient } from "@supabase/ssr";
   import { NextResponse, type NextRequest } from "next/server";

   export async function middleware(request: NextRequest) {
     let supabaseResponse = NextResponse.next({ request });

     createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       {
         cookies: {
           getAll() {
             return request.cookies.getAll();
           },
           setAll(cookiesToSet) {
             cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
             supabaseResponse = NextResponse.next({ request });
             cookiesToSet.forEach(({ name, value, options }) =>
               supabaseResponse.cookies.set(name, value, options)
             );
           },
         },
       }
     );

     return supabaseResponse;
   }

   export const config = {
     matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
   };
   ```

6. **Health-check manual** — Con `npm run dev` activo, abrir la consola del navegador y ejecutar:

   ```js
   import("/src/lib/supabase/client.js").then(async (m) => {
     const sb = m.createClient();
     const { data, error } = await sb.auth.getSession();
     console.log({ data, error });
   });
   ```

   Resultado esperado: `{ data: { session: null }, error: null }`. Si `error` no es null, la URL o anon key son incorrectas.

7. **Verificar build** — Ejecutar `npm run build` y confirmar que pasa sin errores TypeScript.

---

## Criterios de aceptación

- [x] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `dependencies` de `package.json`.
- [x] `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con valores reales.
- [x] `.env.example` documenta ambas variables.
- [x] `.env.local` no es commiteado (`.gitignore` ya cubre `.env*`).
- [x] `src/lib/supabase/client.ts` exporta `createClient()` usando `createBrowserClient`.
- [x] `src/lib/supabase/server.ts` exporta `createClient()` async usando `createServerClient` con `cookies()`.
- [x] `proxy.ts` existe en la raíz y refresca las cookies de sesión en cada request (Next.js 16 renombró `middleware.ts` → `proxy.ts`).
- [x] El health-check manual retorna `{ version, name, description }` de GoTrue v2.197.0 sin errores.
- [x] `npm run build` pasa sin errores TypeScript ni warnings.
- [x] Las rutas existentes (`/`, `/games`, `/about`) siguen funcionando sin regresión.

---

## Decisiones

- **`@supabase/ssr` en vez de `@supabase/auth-helpers-nextjs`** — `auth-helpers` está deprecado; `@supabase/ssr` es la librería oficial actual para Next.js App Router con soporte explícito de `cookies()`.
- **`createBrowserClient` y `createServerClient` como funciones, no instancias singleton** — evita problemas de estado compartido entre requests en SSR; cada llamada crea un cliente fresco con las cookies del request actual.
- **`NEXT_PUBLIC_` prefix en ambas variables** — la URL y la anon key son públicas por diseño (van al frontend); las claves privadas (`service_role`) nunca se usan en este spec.
- **Middleware incluido en este spec** — sin middleware, las cookies de sesión no se refrescan entre requests y la autenticación SSR falla silenciosamente; es inseparable del setup SSR.
- **Health-check en consola, no página `/supabase-test`** — evita crear deuda técnica (una ruta que hay que borrar después); la verificación de conectividad es suficiente con un one-liner en DevTools.
- **Sin tipos generados (`supabase gen types`)** — añade valor solo cuando hay tablas definidas; se hace en el spec de base de datos.

---

## Riesgos

| Riesgo                                                                                                 | Mitigación                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cookies()` de `next/headers` es async en Next.js 16 y lanza si se llama desde un contexto no-async    | El server client está definido como `async function createClient()` — siempre awaitar la llamada.                                                |
| El middleware no debe llamar a `supabase.auth.getUser()` sin usar el resultado, o se duplican requests | El middleware solo instancia el cliente para manejar cookies; la lógica de protección de rutas va en un spec posterior.                          |
| Variables de entorno no configuradas en Vercel                                                         | El build falla en tiempo de compilación si se usa `!` (non-null assertion); agregar las variables al proyecto de Vercel antes del primer deploy. |
