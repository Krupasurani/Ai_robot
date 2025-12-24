### TheroAI Tailwind-Design-Guideline

Ziel: Konsistente, ruhige und produktive UI. Diese Guideline fasst Farben, Typografie-Scale und Abstände zusammen und richtet sich nach dem bestehenden Look & Feel (z. B. `Dashboard → Projects`).


### Design-Prinzipien
- **Tokens statt Hex**: Immer `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary` etc. verwenden – keine hart kodierten Farben.
- **shadcn/ui zuerst**: Vorhandene `@/components/ui/*` nutzen (Buttons, Cards, Inputs, Selects, Tooltips). [[memory:6455317]]
- **Grid + Gaps**: Layout über `grid`/`flex` mit klaren `gap`-Abständen.
- **Abgerundete Ecken**: Standard für Oberflächen `rounded-2xl`; Inputs etwas straffer (`rounded-lg`). [[memory:6455317]]
- **Sanfte Tiefe**: `shadow-sm` (Standard), `hover:shadow-md` für interaktive Elevation.
- **Zugänglichkeit**: Labels, `aria-label`, ausreichender Kontrast, Fokuszustände mit `ring-ring` und `outline` beibehalten.


### Farben (Light/Dark über Tokens)
Die Farbwerte sind in `frontend/src/global.css` als OKLCH-Variablen definiert und via Tailwind-Tokens gemappt. Beispiele:

| Rolle | Klasse | Light (OKLCH) | Dark (OKLCH) |
|---|---|---|---|
| Hintergrund | `bg-background` | `--background: oklch(1 0 0)` | `oklch(0.17 0 286.18)` |
| Vordergrund | `text-foreground` | `oklch(0.141 0.005 285.823)` | `oklch(0.985 0 0)` |
| Primär | `bg-primary` / `text-primary` | `oklch(0.623 0.214 259.815)` | `oklch(0.546 0.245 262.881)` |
| Primär Text | `text-primary-foreground` | `oklch(0.97 0.014 254.604)` | `oklch(0.379 0.146 265.522)` |
| Sekundär | `bg-secondary` / `text-secondary` | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` |
| Muted | `bg-muted` / `text-muted-foreground` | `oklch(0.967 0.001 286.375)` / `oklch(0.552 0.016 285.938)` | `oklch(0.274 0.006 286.033)` / `oklch(0.705 0.015 286.067)` |
| Akzent | `bg-accent` / `text-accent-foreground` | wie Sekundär | wie Sekundär |
| Zerstörerisch | `bg-destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| Ränder | `border-border` | `oklch(0.92 0.004 286.32)` | `oklch(1 0 0 / 10%)` |
| Eingaben | `bg-input` / `border-input` | `oklch(0.92 0.004 286.32)` | `oklch(1 0 0 / 15%)` |
| Fokus/Ring | `ring-ring` | `oklch(0.623 0.214 259.815)` | `oklch(0.488 0.243 264.376)` |
| Sidebar | `bg-sidebar` / `text-sidebar-foreground` | `oklch(0.985 0 0)` / `oklch(0.141 0.005 285.823)` | `oklch(0.17 0 286.18)` / `oklch(0.985 0 0)` |

Empfehlungen:
- **Texte**: Primärtext `text-foreground`, Sekundärtext `text-muted-foreground`.
- **Oberflächen**: `bg-card text-card-foreground` oder `bg-background` mit `border-border`.
- **Interaktion**: Fokus mit `focus-visible:ring-2 focus-visible:ring-ring` sichtbar machen.


### Typografie
- **Schriften** (siehe `src/global.css`):
  - Fließtext: Public Sans Variable (`@fontsource-variable/public-sans`)
  - Überschriften: Barlow (500–700) für Charakter und Lesbarkeit
  - Fallbacks: System Sans-Serif

- **Skalierung** (Richtwerte)
  - Display/Hero: `text-3xl md:text-4xl`, `leading-tight`, `font-semibold`
  - H1: `text-2xl md:text-3xl`, `leading-tight`, `font-semibold`
  - H2: `text-xl md:text-2xl`, `leading-snug`, `font-semibold`
  - H3: `text-lg md:text-xl`, `leading-snug`, `font-medium`
  - Body: `text-base`, `leading-6`
  - Secondary/Meta: `text-sm text-muted-foreground` bzw. `text-xs text-muted-foreground`

Hinweise:
- Überschriften ≥H2 i. d. R. `font-semibold`; Fließtext `font-normal` bis `font-medium`.
- Lange Zeilen vermeiden (max. ~70–85 Zeichen pro Zeile).


### Abstände (Spacing & Layout)
- **Seitenrahmen**: `p-4 md:p-6` (wie Projects-Seite). Container max-width je Kontext.
- **Sektionen**: `py-6 md:py-8` (Header, Filterzeilen, Footerblöcke).
- **Grid-Gaps**:
  - Seiten/Listen: `gap-4` bis `gap-6`
  - Karteninhalte/Zeilen: `gap-3` bis `gap-4`
- **Komponentenabstände**:
  - Buttons/Inputs: vertikal kompakt (`h-9`–`h-10`, `py-2`) mit `gap-2` für Icon+Text
  - Karten: `p-4`–`p-6`; Header `py-3`, Content `pb-3`


### Ecken, Ränder, Schatten
- **Radius**: Basis `--radius: 0.65rem`
  - Oberflächen: `rounded-2xl` (Primär-Container, Cards)
  - Inputs/Controls: `rounded-lg`
- **Ränder**: `border border-border` (optional `border-border/60` für dezentere Linien)
- **Schatten**: `shadow-sm` default, `hover:shadow-md` für interaktive Karten/Listen


### Komponenten-Richtlinien (shadcn/ui)
- **Card**
  - Klassen: `rounded-2xl border border-border/60 bg-card text-card-foreground`
  - Hover: `hover:shadow-md hover:border-primary/30 transition-shadow transition-colors`
- **Button**
  - Primär: `variant="default"` (setzt `bg-primary text-primary-foreground`)
  - Sekundär: `variant="secondary"` für unaufdringliche Aktionen
  - Icon-only: `variant="ghost" size="icon"` mit `aria-label`
  - Danger: `variant="destructive"`
- **Input/Select**
  - `bg-background border-input focus-visible:ring-2 focus-visible:ring-ring rounded-lg`
  - Platzhalter: `placeholder:text-muted-foreground`
- **Badge/Meta**
  - `variant="outline"` für Filters/Tags, Textgröße `text-[10px]`–`text-xs`
- **Tooltip**
  - Dezent: `text-sm`, `bg-popover`, `border-border`


### Beispielmuster
Header + Filterleiste (wie Projects):

```tsx
<div className="p-4 md:p-6">
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold">Titel</h1>
      <p className="text-sm text-muted-foreground mt-1">Kurzer Untertitel.</p>
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <Input placeholder="Suchen…" className="w-full sm:w-56" />
      {/* Selects/Buttons hier */}
    </div>
  </div>
  {/* Content */}
</div>
```

Kartenliste:

```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  <Card className="group rounded-2xl border border-border/60 hover:border-primary/30 hover:shadow-md transition-all">
    {/* CardHeader/CardContent nach Bedarf */}
  </Card>
</div>
```


### Dark Mode
- Dark-Varianten sind über dieselben Tokens gepflegt (`.dark` root). Keine separaten Hex-Werte verwenden.
- Fokus-/Hover-Zustände arbeiten identisch über `ring-ring`/`border`/`shadow`.


### Do & Don’t
- **Do**: Tokens (`bg-…`, `text-…`, `border-…`) konsequent nutzen.
- **Do**: Sekundäre Texte mit `text-muted-foreground` absetzen.
- **Do**: `grid`/`flex` mit `gap-*` statt margin-„Handarbeit“.
- **Don’t**: Hex-Farben, harte Pixel-Werte für Text, inkonsistente Abstände.


### Referenz
- Bestehende Beispiele: `Dashboard → Projects` Seite (z. B. `p-4 md:p-6`, `text-2xl`, `text-muted-foreground`, `grid gap-3`, Card-Hover mit `hover:shadow-md` und `hover:border-primary/30`).


### Kurz-Checkliste für neue Screens
- Layout: `p-4 md:p-6`, Grid mit `gap-4+`
- Farben nur über Tokens (s. Tabelle)
- Typo: H1 `text-2xl md:text-3xl`, Body `text-base`, Meta `text-sm`
- Oberflächen `rounded-2xl` + `shadow-sm`
- Sekundärtexte `text-muted-foreground`
- Fokus sichtbar: `focus-visible:ring-2 focus-visible:ring-ring`



### System UI Zustände

- **Loading**
  - Flächige Inhalte: Skeleton statt Spinner.
  - Skeleton-Elemente: `animate-pulse bg-muted/60 rounded-lg` in realistischer Struktur (Titelzeile, 2–3 Textzeilen, optionaler Avatar/Badge).
  - Kleine Inline-Aktionen: Spinner nur inline (z. B. Button mit `disabled` + Spinner-Icon).

  Beispiel:
  ```tsx
  <div className="space-y-3" aria-hidden="true">
    <div className="h-5 w-40 bg-muted/60 rounded-md animate-pulse" />
    <div className="h-4 w-3/5 bg-muted/60 rounded-md animate-pulse" />
    <div className="h-4 w-2/5 bg-muted/60 rounded-md animate-pulse" />
  </div>
  ```

- **Empty States**
  - Layout: `flex flex-col items-center justify-center text-center gap-2 text-muted-foreground p-8 rounded-2xl border border-dashed`
  - Bestandteile: kleines Icon/Illustration, Headline, kurzer Hinweis, Primäraktion.

  Beispiel:
  ```tsx
  <div className="flex flex-col items-center justify-center text-center gap-2 text-muted-foreground p-8 rounded-2xl border border-dashed">
    <div className="text-2xl">🗂️</div>
    <h3 className="text-lg text-foreground">Noch keine Einträge</h3>
    <p className="text-sm">Erstelle dein erstes Objekt oder passe Filter an.</p>
    <Button className="mt-1">Neu erstellen</Button>
  </div>
  ```

- **Alerts (Error/Info/Success)**
  - Fehler: `bg-destructive/5 text-destructive border border-destructive/40 rounded-lg p-3`
  - Info/Hint: `bg-accent/10 text-foreground border border-accent/30 rounded-lg p-3`
  - Nutze `@/components/ui/alert` wo möglich; ansonsten obige Token-Tints statt harte Farben.

  Beispiel:
  ```tsx
  <div className="bg-destructive/5 text-destructive border border-destructive/40 rounded-lg p-3">
    Speichern fehlgeschlagen. Bitte später erneut versuchen.
  </div>
  ```


### Tabellen & Daten-Views

- **Grundlayout**
  - Typo: `text-sm leading-5`
  - Zeilenhöhe: z. B. `h-11` pro Row, vertikal zentriert
  - Zebra (optional): `odd:bg-muted/40 even:bg-background`

- **Header**
  - `text-xs font-medium text-muted-foreground uppercase tracking-wide`
  - Klar abgegrenzt: Border unten `border-b border-border`

- **Interaktion**
  - Hover: `hover:bg-muted cursor-pointer`
  - Selektiert: `bg-accent border-l-2 border-primary`

Beispiel mit shadcn Table:
```tsx
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "@/components/ui/table";

<Table className="text-sm">
  <TableHeader className="border-b border-border">
    <TableRow>
      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</TableHead>
      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</TableHead>
      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Updated</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="h-11 odd:bg-muted/40 hover:bg-muted cursor-pointer">
      <TableCell>Alpha</TableCell>
      <TableCell><Badge variant="outline">Active</Badge></TableCell>
      <TableCell className="text-muted-foreground">Heute</TableCell>
    </TableRow>
  </TableBody>
</Table>
```


### AI Interaction Patterns

- **Chat/Assistant Panel**
  - Layout: Chatbereich als eigene Spalte: `w-full md:w-[360px] max-w-md border-l bg-background`
  - Bubbles:
    - User: `bg-primary text-primary-foreground`
    - Assistant: `bg-muted text-foreground`
    - System/Meta: `text-xs text-muted-foreground`
  - Bubble-Konturen: `rounded-2xl p-3 max-w-[75%]`

  Beispiel (vereinfacht):
  ```tsx
  <div className="space-y-3">
    <div className="rounded-2xl p-3 max-w-[75%] bg-muted text-foreground">Antwort der AI …</div>
    <div className="rounded-2xl p-3 max-w-[75%] bg-primary text-primary-foreground ml-auto">User Nachricht …</div>
    <div className="text-xs text-muted-foreground">AI is thinking…</div>
  </div>
  ```

- **Inline-AI-Aktionen**
  - Kleine Ghost-Buttons neben Inputs/Textareas:
    - `variant="ghost" size="icon" text-muted-foreground hover:text-primary`
  - Wann: Neben sekundären Aktionen (z. B. „Formulierung vorschlagen“), keine Primäraktionen ersetzen.

- **Diff/Vorschläge**
  - Entfernt: `bg-destructive/5 line-through`
  - Hinzugefügt: `bg-accent/10`

  Beispiel:
  ```tsx
  <div className="text-sm">
    <span className="bg-destructive/5 line-through">Alte Formulierung</span>
    <span className="bg-accent/10 rounded px-1 ml-1">Neue vorgeschlagene Formulierung</span>
  </div>
  ```


### Dichte-Varianten (Default vs. Compact)

- **Default**: `h-10 py-2 gap-3 text-base`
- **Compact**: `h-8 py-1.5 gap-2 text-sm`

Empfehlungen:
- Tabellen, Log-Views, dichte Übersichten → eher „compact“
- Onboarding, leerere Seiten, Präsentationsflächen → „default“


### Icons & Bildsprache

- Iconset: Lucide (konsistent, ruhig)
- Größen:
  - Buttons: `w-4 h-4`
  - Cards/Leadin: `w-5 h-5`
- Farbe: Standard `text-muted-foreground`, bei Hover/Fokus `text-primary` für interaktive Elemente
- Bildsprache: dezent, einfarbig/monochrom; keine bunten, lauten Illustrationen


### Cheat Sheet (One-Pager)

- **Layout**: `p-4 md:p-6`, Grid/Lists mit `gap-4+`
- **Typo**: H1 `text-2xl md:text-3xl`, Body `text-base`, Meta `text-sm`
- **Cards**: `rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30`
- **Inputs**: `border-input focus-visible:ring-2 focus-visible:ring-ring rounded-lg`
- **Tokens**: nur `bg-*/text-*/border-*` (keine harten Farben)
- **Loading**: Skeleton (`animate-pulse bg-muted/60`), Spinner nur inline
- **Empty**: zentriert, Icon + Headline + kurzer Text + Primäraktion
- **Tables**: `text-sm leading-5`, Header `text-xs uppercase tracking-wide`, Hover `hover:bg-muted`
- **AI**: Chat-Bubbles (User=primary, Assistant=muted), Inline-Ghost-Buttons, Diff (removed=destructive/5, added=accent/10)

