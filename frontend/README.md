## Prerequisites

- Node.js 20.x (Recommended)

## Installation

**Using Yarn (Recommended)**

```sh
yarn install
yarn dev
```

**Using Npm**

```sh
npm i
npm run dev
```

## Build

```sh
yarn build
# or
npm run build
```

## Design & UI

Für konsistente Screens nutzt das Frontend einen zentralen Tailwind-Styleguide:

- `TheroAI-Tailwind-Design-Guidelines.md` – Farben (Tokens), Typografie-Scale, Abstände, Komponenten-Patterns (Cards, Buttons, Tables), AI-Patterns, Loading/Empty/States.
- `docs/screens-inventory.md` – Übersicht der wichtigsten Screens, gruppiert nach Wellen für UI-Rollout.

Bitte bei neuen Views:

- Nur Theme-Tokens (`bg-background`, `text-muted-foreground`, `border-border`, `bg-card`, `bg-primary` etc.) verwenden.
- `rounded-2xl`, `shadow-sm` als Default für Cards/Container, `hover:shadow-md` für interaktive Kacheln.
- Tabellen-Header mit `text-xs font-medium text-muted-foreground uppercase tracking-wide`, Zeilen `text-sm h-11 hover:bg-muted`.
- Chat/AI-UI an den Patterns von Projects-Workspace und Knowledge-Views ausrichten.
