# GitHub & Render Free-Tier Deployment-Zentrale mit Vollständigem Datenbank-Backup-System

Dieser Plan erweitert das **CA-POST Officer & Academy Portal** um eine maßgeschneiderte **GitHub-zu-Render Auto-Deploy-Integration (Free Tier)** sowie ein **Ein-Klick-Datenbank-Backup- & Restore-System**, damit alle Accounts (`Admin1` sowie alle angelegten Beamten), Passwörter, Rollen, hochgeladenen PDF-Lehrbücher und Code-Prüfungen auch bei kostenlosen Render-Neustarts oder Updates jederzeit verlustfrei gesichert und wiederhergestellt werden können.

## User Review & Critical Decisions

> [!IMPORTANT]
> Die folgenden Architekturentscheidungen wurden auf Basis deiner Antworten festgelegt und bilden die Grundlage für die Umsetzung:

- **Bestätigte Entscheidung 1 (Deployment-Auslöser)**: **Automatischer Deploy direkt bei Git Push auf `main`** (`autoDeploy: true` im Render Free-Tier Blueprint). Sobald du Änderungen in dein bestehendes GitHub-Repository pushst, baut und aktualisiert Render die Live-Website automatisch.
- **Bestätigte Entscheidung 2 (Datensicherung im Render Free Tier)**: **Render Free Tier mit Datenbank-Backup & Restore im Admin-Panel**. Da der kostenlose Render-Tarif bei einem Server-Neustart oder Redeploy das lokale Dateisystem zurücksetzt, erhältst du als `Admin1` eine direkte **1-Klick-Backup-Export- und Import-Funktion** (als `.json`-Komplettsicherung inklusive aller Accounts, PDFs, Code-Tests und Bewerbungen).
- **Bestätigte Entscheidung 3 (Integrierte Admin-Werkzeuge)**:
  1. **Konfigurierbare GitHub-Repo-URL & Render-Live-Status-Anzeige**: Du kannst deine echte GitHub-Repository-URL und deine Render-URL direkt im Admin-Tab hinterlegen; alle Git-Befehle passen sich sofort automatisch an deine URL an.
  2. **Interaktive Schritt-für-Schritt-Anleitung mit maßgeschneiderten Git-Befehlen**: Abhakbare Checkliste für Erst-Push, Code-Updates und Render-Web-Service-Verknüpfung.
  3. **Ein-Klick-Export & -Import (Backup & Restore)**: Sowohl in der **Konten- & Rollenverwaltung** als auch im **GitHub & Render CI/CD-Tab** kannst du jederzeit den kompletten Systemzustand herunterladen oder per Datei-Upload sofort wiederherstellen.

---

## 1. Overview & Core Concept

- **Was das System leistet**: Es verbindet dein bereits erstelltes GitHub-Repository nahtlos mit einem kostenlosen Render.com Web Service und stattet dein exklusives Admin-Portal (`Admin1`) mit einer interaktiven Deployment-Steuerzentrale und einem Komplett-Backup-Tresor aus.
- **Zielgruppe / Rolle**: Ausschließlich sichtbar und bedienbar für den **Administrator (1. Rang — `Admin1`)**. Für alle anderen Rollen (`Colonel`, `Officer`, `Rookie`, `Trainee`) bleiben sämtliche GitHub-, Render- und Datenbank-Backup-Werkzeuge vollständig unsichtbar.
- **Kernmehrwert**: Du kannst das Portal dauerhaft kostenlos auf Render betreiben, deinen Code über GitHub verwalten und trotz der Free-Tier-Limitierungen von Render deine gesamte Nutzerdatenbank, Passwörter, Ränge, PDF-Lehrbücher und Code-Tests mit einem einzigen Klick sichern und wiederherstellen.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **GitHub-Repo & Render-URL hinterlegen**: Im Admin-Reiter **„GitHub & Render CI/CD“** trägst du die URL deines bestehenden GitHub-Repositories (z. B. `https://github.com/dein-name/dein-repo.git`) und optional deine Render-Service-URL ein.
  2. **Dynamischer Git-Befehls-Generator & Checkliste**: Das Portal generiert sofort die exakten Terminal-Befehle mit deiner echten Repository-URL (für das erstmalige Verbinden sowie für spätere Updates per `git push origin main`). Jeder erledigte Schritt kann in einer interaktiven Checkliste abgehakt werden.
  3. **Ein-Klick Datenbank-Backup (Export)**: Vor einem neuen Deployment oder nach dem Anlegen neuer Accounts/PDFs klickst du auf **„Komplettes Datenbank-Backup herunterladen (.json)“**. Die Datei enthält sämtliche Konten, Klartext-Passwörter, Rollen, Bewerbungen, hochgeladene PDF-Lehrbücher, Code-Prüfungen und Lernfortschritte.
  4. **Ein-Klick Datenbank-Wiederherstellung (Restore)**: Nach einem Render-Neustart wählst du deine gespeicherte `.json`-Backup-Datei aus und klickst auf **„Backup einspielen & sofort aktivieren“**. Alle Accounts, PDFs und Prüfungen sind in Echtzeit wieder exakt auf dem gesicherten Stand.
  5. **Render Live-Status & Endpunkt-Prüfung**: Eine Live-Status-Anzeige prüft in Echtzeit den Server-Zustand (`/api/health`), die geladene Datenbank-Statistik (Anzahl Accounts, PDFs, Prüfungen, Speichergröße) und die Game-Server-Whitelist-Schnittstelle.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Aufgeräumtes, behördliches kalifornisches POST-Portal im schlichten weißen Design mit präzisen anthrazitfarbenen Strukturelementen und hellblauen Akzenten.
  - *Color Palette & Mood*:
    - Primärer Hintergrund: Reines Weiß (`#FFFFFF` / `bg-white`) und kühles Alabaster-Grau (`#F8FAFC` / `bg-slate-50`).
    - Strukturelemente & Terminal-Blöcke: Tiefes Anthrazit (`#0F172A` / `bg-slate-900`) für Header, aktive Navigation und kopierbare Git-/YAML-Codeblöcke.
    - Akzentfarbe: Hellblau (`#0284C7` / `sky-600` und `#0EA5E9` / `sky-500`) für interaktive Schaltflächen, aktive Schritte und Status-Indikatoren.
    - Semantische Statusfarben: Smaragdgrün (`#059669` / `emerald-600`) für Online-Status und erfolgreiche Backups, Bernstein (`#D97706` / `amber-600`) für Hinweise zum Free-Tier-Speicher, Karmesinrot (`#DC2626` / `red-600`) für kritische Aktionen.
  - *Typography & Hierarchy*: Klare Sans-Serif-Typografie (`Plus Jakarta Sans`) für Formulare und Überschriften, kombiniert mit tabellarischer Monospace-Schrift (`JetBrains Mono` / `tabular-nums`) für Git-Befehle, Server-Latenzen, Zeitstempel, Dienstnummern und Dateigrößen.
  - *Component Styling & Layout*: Flache Karten mit präzisen `1px`-Rahmen (`border-slate-200`), keine verschachtelten Karten-in-Karten-Konstrukte und direkte Aktionsknöpfe im Kopfbereich.

- **Interactive Feedback & Motion**:
  - Sofortige Kopier-Bestätigung mit Häkchen-Indikator bei allen Git- und YAML-Blöcken.
  - Live-Vorschau beim Auswählen einer Backup-Datei (zeigt vor dem Einspielen exakt an, wie viele Accounts, PDF-Lehrbücher und Tests im Backup enthalten sind).
  - Bestätigungs-Banner nach erfolgreichem Backup-Export oder -Import ohne Seitenneuladen.

---

## 3. Key Product Decisions & Trade-Offs

- **Entscheidung 1: Render Free Tier (`plan: free`) mit Auto-Deploy statt kostenpflichtiger Cloud-Datenbank**
  - *Gewählter Ansatz*: Konfiguration der Render-Blueprint-Spezifikation auf `plan: free` mit `autoDeploy: true` auf dem `main`-Branch, kombiniert mit einem integrierten JSON-Komplett-Backup- & Restore-Mechanismus im Admin-Panel.
  - *Warum*: Ermöglicht den komplett kostenlosen Betrieb der eigenen Web-URL über Render, ohne dass externe Datenbank-Abos nötig sind. Durch das 1-Klick-Backup (inklusive eingebetteter PDF-Daten und Code-Tests) hat der Admin jederzeit die volle Souveränität über seine Daten.
  - *Betrachtete Alternativen*: Render Persistent Disk (erfordert mindestens den kostenpflichtigen Starter-Plan auf Render).

- **Entscheidung 2: Backup-Vorschau & Validierung vor dem Überschreiben**
  - *Gewählter Ansatz*: Beim Hochladen einer Backup-Datei prüft das System zuerst die Struktur, stellt sicher, dass mindestens ein gültiger Admin-Account erhalten bleibt, und zeigt eine Zusammenfassung der enthaltenen Datensätze (Accounts, PDFs, Prüfungen, Bewerbungen) an.
  - *Warum*: Verhindert versehentliches Einspielen beschädigter Dateien oder das ungewollte Aussperren des Administrators.

- **Entscheidung 3: Persistente Speicherung der GitHub- & Render-Konfiguration im Portal-State**
  - *Gewählter Ansatz*: Die vom Admin eingetragene GitHub-Repository-URL, die Render-Live-URL und der Fortschritt der Setup-Checkliste werden direkt im Datenbank-Objekt mitgespeichert (und sind damit ebenfalls Teil jedes Backups).
  - *Warum*: Der Admin muss seine Repository-URL nur einmal eintragen und erhält bei jedem zukünftigen Besuch sofort seine personalisierten Update-Befehle.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   CA-POST OFFICER PORTAL (REACT FRONTEND)                  │
├─────────────────────────────────────┬──────────────────────────────────────┤
│   AdminPersonnelConsole (Admin1)    │    DeploymentPipelineHub (Admin1)    │
│  ┌───────────────────────────────┐  │  ┌────────────────────────────────┐  │
│  │ • Echtzeit Konten & Passwörter│  │  │ • GitHub Repo & Render URL Box │  │
│  │ • Online/Offline Heartbeat    │  │  │ • Dynamische Git-Befehle       │  │
│  │ • Schnell-Backup Export/Import│  │  │ • Interaktive Setup-Checkliste │  │
│  └───────────────┬───────────────┘  │  │ • Live Render Health & DB-Stat │  │
│                  │                  │  └────────────────┬───────────────┘  │
└──────────────────┼──────────────────┴───────────────────┼──────────────────┘
                   │                                      │
                   ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS BACKEND API (/api/admin/...)                   │
├──────────────────────────┬───────────────────────────┬─────────────────────┤
│ GET /api/admin/backup    │ POST /api/admin/restore   │ PUT /api/admin/     │
│ • Erzeugt Komplett-JSON  │ • Validiert Backup-Schema │     deployment-cfg  │
│   inkl. Accounts, PDFs,  │ • Stellt Accounts, PDFs,  │ • Speichert GitHub  │
│   Tests & Fortschritt    │   Tests & Status wieder   │   Repo URL, Render  │
│                          │   her & schützt Admin1    │   URL & Checkliste  │
└──────────────────────────┴─────────────┬─────────────┴─────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│         PERSISTENTE PORTAL-DATENBANK & RENDER FREE-TIER PIPELINE           │
│  • Lokaler JSON-Speicher (25 MB Payload-Limit für Base64-PDF-Lehrbücher)   │
│  • Render Blueprint (plan: free, autoDeploy: true, branch: main)           │
│  • GitHub Actions CI-Prüfung (TypeScript Build & Render Health-Check)      │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - Erweiterung des Portal-Datenbank-Zustands (`PortalDatabaseState`) um ein `deploymentConfig`-Objekt:
    - `githubRepoUrl`: Vom Admin hinterlegte GitHub-Repository-URL (Standard-Platzhalter bis zur Eingabe, sofort editierbar).
    - `renderServiceUrl`: Öffentliche Render-URL des Web-Services.
    - `completedSteps`: Array erledigter Setup-Schritte der interaktiven Deployment-Checkliste.
    - `lastBackupExportIso` & `lastBackupRestoreIso`: Zeitstempel der letzten Datensicherung und Wiederherstellung.
  - **Vollständiges Backup-Paket (`PortalBackupSnapshot`)**:
    - Beinhaltet Metadaten (`exportedAtIso`, `exportedBy`, `portalVersion`, Zähler für Accounts, Module, Prüfungen) sowie das komplette `database`-Objekt (`accounts`, `applications`, `modules` inkl. PDF-Daten, `exams` inkl. HTML/JS-Code, `progress`, `deploymentConfig`).

- **Interactive Component & State Mapping**:
  - **GitHub & Render Konfigurations-Editor (`DeploymentPipelineHub`)**:
    - Eingabefelder für `GitHub Repository URL` und `Render Live URL` mit Speichern-Handler (`PUT /api/admin/deployment-config`).
    - Aktualisiert in Echtzeit die angezeigten `git remote add origin ...`- und `git push`-Kommandos.
  - **Interaktive 4-Schritte-Deployment-Anleitung**:
    - Klickbare Schritte (*1. Projekt-Code ins bestehende GitHub-Repo pushen*, *2. Auf Render.com neuen Web Service mit GitHub verbinden*, *3. Build- & Start-Befehle für Free Tier bestätigen*, *4. Datenbank-Backup nach Änderungen herunterladen*), deren Status persistent gespeichert wird.
  - **Datenbank-Backup & Restore Tresor (`DeploymentPipelineHub` & `AdminPersonnelConsole`)**:
    - **Export-Button**: Ruft `GET /api/admin/backup` auf und lädt automatisch eine Datei `ca-post-portal-backup-YYYY-MM-DD.json` herunter.
    - **Import-Dropzone / Datei-Wähler**: Liest die gewählte `.json`-Datei clientseitig ein, zeigt eine Vorschau der enthaltenen Daten (Anzahl Accounts, PDFs, Prüfungen, Zeitstempel des Backups) und spielt sie per Klick auf **„Jetzt wiederherstellen“** über `POST /api/admin/restore` in Echtzeit ein.
  - **Live Render Status & Datenbank-Diagnose**:
    - Zeigt den Live-Zustand von `/api/health`, die aktuelle Datenbank-Größe in KB/MB, die Anzahl gespeicherter Accounts, PDF-Lehrbücher und Prüfungen sowie einen Direkt-Test-Button für den Server-Healthcheck.
