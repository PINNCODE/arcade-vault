# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

**Arcade Vault** — an online platform to play games and compete for high scores. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4.

## Commands

```bash
npm run dev       # Start dev server (next dev)
npm run build     # Production build
npm run lint      # Run ESLint
```

No test runner is configured yet.

## Spec-Driven Development

This project uses spec-driven design. All features start as a spec before any code is written.

- `/spec <feature>` — create a spec interactively (saves to `specs/NN-slug.md`)
- `/spec-impl <NN-slug>` — implement an **Approved** spec step by step

Workflow: `/spec` → review → change state to `Approved` → `/spec-impl`

Specs live in `specs/`. Branch naming: `spec-NN-slug`. Never implement a spec whose state is not `Approved`.

## Next.js Version Note

This project uses Next.js **16** — a version with breaking changes from what most training data covers. Before writing any Next.js-specific code, read `node_modules/next/dist/docs/` for the current API. The `layout.tsx` already uses `LayoutProps<"/">` (a new generic type), which is not standard in older versions.

## Stack

- **Next.js 16** App Router (`app/` directory)
- **React 19**
- **Tailwind CSS v4** (configured via `@tailwindcss/postcss`, no `tailwind.config.js`)
- **TypeScript 5**
- Fonts: Geist Sans + Geist Mono via `next/font/google`
