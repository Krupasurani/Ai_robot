# Integrations Page Redesign

## Übersicht

Die Integrations-/Connector-Seite wurde komplett neu gestaltet, um dem modernen Thero-UI-Design zu entsprechen.

## Neue Komponenten

### 1. **IntegrationListView** (`integration-list-view.tsx`)
- **Beschreibung**: Hauptansicht mit Tabellenlayout für alle konfigurierten Integrationen
- **Features**:
  - Suchfunktion für Apps
  - Tabelle mit Spalten: App, Crawl, Content Crawling, Documents, Search Results
  - Status-Badges (Synced, Job in Progress, Not Configured)
  - Visibility-Dropdown (On for all, Test group only, Off)
  - "Add app" Button öffnet den AddIntegrationDialog

### 2. **AddIntegrationDialog** (`add-integration-dialog.tsx`)
- **Beschreibung**: Dialog zum Hinzufügen neuer Integrationen
- **Features**:
  - Suchfunktion für verfügbare Apps
  - Scrollbare Liste aller Integrationen
  - Zeigt Icon, Name, Beschreibung und Kategorien
  - Klick auf Integration öffnet Setup-Ansicht

### 3. **IntegrationSetupView** (`integration-setup-view.tsx`)
- **Beschreibung**: Detaillierte Setup-Ansicht für eine Integration
- **Features**:
  - Schritt-für-Schritt Konfiguration (linke Seite)
  - Help Guide Sidebar (rechte Seite)
  - Best Practices und Dokumentations-Links
  - "Save" Button öffnet StartCrawlDialog

### 4. **StartCrawlDialog** (`start-crawl-dialog.tsx`)
- **Beschreibung**: Bestätigungsdialog zum Starten des Crawl-Prozesses
- **Features**:
  - "Start crawl" Button startet den Crawl
  - "Do this later" Button überspringt den Crawl

## Design-Prinzipien

- **Font**: Roboto (Google Font) für alle Texte
- **UI Framework**: shadcn/ui + Radix UI + Tailwind CSS
- **Farbschema**: Verwendet das bestehende Design-System
- **Responsive**: Mobile-first Design

## Best Practices für neue Datenquellen

1. Visibility initial auf "Visible to test group only" setzen
2. Test-Gruppe über "Manage test group" konfigurieren
3. Test-Gruppe verifiziert Suchergebnisse und Content-Genauigkeit
4. Nach Verifizierung Visibility auf "visible to everyone" setzen

## Status-Anzeigen

- **Synced**: ✓ Grünes Häkchen - Integration ist aktiv und synchronisiert
- **Job in Progress**: ⟳ Blaues Lade-Icon - Crawl läuft gerade
- **Not Configured**: ○ Graues Icon - Integration noch nicht konfiguriert

## Visibility-Optionen

- **On for all**: Suchergebnisse für alle Benutzer sichtbar
- **Test group only**: Nur für Test-Gruppe sichtbar
- **Off**: Keine Suchergebnisse anzeigen

## Integration

Die neue Ansicht ist in `connectors.tsx` integriert und ersetzt die alte Grid-Ansicht.

## Nächste Schritte

1. Backend-Integration für Crawl-Status
2. Echte Daten für Document-Counts
3. Test-Gruppen-Management implementieren
4. Visibility-Settings im Backend speichern
