# SPEC 03 — Integración Resend en formulario de contacto

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-09-28
> **Objetivo:** Conectar el formulario de contacto de `/about` con la API de Resend para enviar emails reales usando una Server Action, manteniendo la UX pixel-art existente.

---

## Alcance

**Incluido:**

- Instalar el paquete `resend` como dependencia de producción.
- Crear `.env.local` con `RESEND_API_KEY=` (vacío; el usuario lo rellena con su API key).
- Crear `.env.example` documentando la variable `RESEND_API_KEY`.
- Crear `app/about/actions.ts` con la Server Action `sendContactEmail` que llama a la API de Resend.
- Actualizar `app/about/page.tsx` para invocar la Server Action, manejar estados `loading` y `error`, y mostrar el terminal-error pixel en caso de fallo.
- El email enviado llega a `ing.trujilloge@gmail.com`.
- El remitente (`from:`) es `onboarding@resend.dev` (funciona sin dominio verificado).

**Fuera de alcance:**

- Verificación de dominio propio en Resend.
- Rate limiting o protección anti-spam en el servidor (no hay backend propio).
- Guardado de mensajes en base de datos.
- Notificación por email al remitente (autorespuesta).
- Cambios en la UI del formulario más allá de los estados loading/error/success.

---

## Modelo de datos

No se introducen nuevas estructuras persistentes. La Server Action recibe y reenvía tres strings:

```ts
interface ContactPayload {
  name: string;
  email: string;
  msg: string;
}

type SendResult =
  | { ok: true }
  | { ok: false; message: string };
```

---

## Plan de implementación

1. **Instalar `resend`** — Ejecutar `npm install resend`. Verificar que aparece en `package.json` como dependencia de producción.

2. **Archivos de entorno** — Crear `.env.local` con el contenido:
   ```
   RESEND_API_KEY=
   ```
   Crear `.env.example` con:
   ```
   # Resend — https://resend.com/api-keys
   RESEND_API_KEY=your_api_key_here
   ```
   Verificar que `.env*` ya está en `.gitignore` (ya existe la regla).

3. **Server Action `sendContactEmail`** — Crear `app/about/actions.ts`:
   - Importar `Resend` de `"resend"`.
   - Instanciar `new Resend(process.env.RESEND_API_KEY)`.
   - Función `sendContactEmail(payload: ContactPayload): Promise<SendResult>` marcada con `"use server"`.
   - Llama a `resend.emails.send({ from, to, subject, html })`.
   - `from`: `"Arcade Vault <onboarding@resend.dev>"`
   - `to`: `["ing.trujilloge@gmail.com"]`
   - `subject`: `"[Arcade Vault] Nuevo mensaje de ${payload.name}"`
   - `html`: bloque básico con nombre, email y mensaje.
   - Retorna `{ ok: true }` si la llamada a Resend tiene éxito, `{ ok: false, message: string }` si hay error.

4. **Actualizar `app/about/page.tsx`** — Integrar la Server Action en el formulario:
   - Importar `sendContactEmail` desde `"./actions"`.
   - Añadir estado `loading: boolean` (inicialmente `false`).
   - Añadir estado `error: string | null` (inicialmente `null`).
   - Modificar `onSubmit`: marcar `loading = true`, llamar `sendContactEmail`, si `ok` → `setSent(form.name)`, si error → `setError(result.message)` y `setLoading(false)`.
   - El botón muestra `"ENVIANDO…"` y queda deshabilitado mientras `loading` es `true`.
   - Si `error !== null`, mostrar bloque `terminal-error` (mismo estilo que `terminal-success`, borde `var(--magenta)`, texto de error en magenta) con botón `REINTENTAR` que limpia el error y vuelve al formulario.

5. **Prueba end-to-end** — Con `RESEND_API_KEY` configurada: rellenar el formulario, enviar, verificar que el email llega a `ing.trujilloge@gmail.com`. Probar también con `RESEND_API_KEY` vacía para verificar que el terminal-error aparece correctamente.

---

## Criterios de aceptación

- [ ] `resend` aparece en `dependencies` de `package.json`.
- [ ] `.env.local` existe con la clave `RESEND_API_KEY` (puede estar vacía).
- [ ] `.env.example` documenta `RESEND_API_KEY`.
- [ ] `app/about/actions.ts` exporta una Server Action `sendContactEmail` marcada con `"use server"`.
- [ ] Enviar el formulario con todos los campos rellenos y API key válida llega un email a `ing.trujilloge@gmail.com`.
- [ ] Mientras el envío está en curso, el botón muestra `"ENVIANDO…"` y está deshabilitado.
- [ ] Si la llamada a Resend falla, aparece el terminal-error (estilo pixel, borde magenta) con opción de reintentar.
- [ ] Si la llamada a Resend tiene éxito, aparece el terminal-success existente (sin cambios visuales).
- [ ] `npm run build` pasa sin errores TypeScript.
- [ ] `.env.local` no es commiteado (`.gitignore` ya cubre `.env*`).

---

## Decisiones

- **Server Action en vez de API Route** — menos archivos, integración más directa con el formulario React existente.
- **`from: onboarding@resend.dev`** — evita requerir dominio verificado en Resend para desarrollo y staging.
- **`to: ing.trujilloge@gmail.com` hardcodeado en la action** — dirección única y estable; no se necesita variable de entorno adicional.
- **Terminal-error pixel** — mantiene coherencia visual con el terminal-success del SPEC 02.
- **No autorespuesta al remitente** — fuera de alcance; añadiría complejidad sin valor inmediato.

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| `RESEND_API_KEY` no configurada en Vercel/producción | El terminal-error aparece; instrucciones en `.env.example`. |
| Resend rechaza `onboarding@resend.dev` como `from` en producción | La cuenta de Resend requiere verificar el dominio para producción real; cambiar `from` a un dominio verificado en ese momento. |
| Server Actions requieren Next.js App Router con `"use server"` en cada función | Ya se cumple en este proyecto (Next.js 16, App Router). |
