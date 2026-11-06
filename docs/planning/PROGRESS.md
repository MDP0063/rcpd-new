# RCPD – Aktueller Planungs- und Redesignstand

**Stand:** 06.11.2026  
**Basis-Commit von main:** `33ca7697b908de78c92cfd4576f22b4dde5cc89d`.  
**Dokumentationsbranch:** `docs/complete-redesign-plan`.

## 1. Gesamtstatus

- Das Redesign umfasst das gesamte Portal, nicht nur die Academy.
- Designrichtung B „Modernes Einsatz- und Verwaltungsportal“ ist beschlossen.
- Funktionale Planung, Bestandsaufnahme und Informationsarchitektur gehen dem finalen visuellen Design voraus.
- Bestehende technische Architektur, Datenmodelle, Geschäftslogik und Berechtigungen bleiben grundsätzlich unverändert.
- Die Academy ist bereits sehr detailliert konzipiert, aber noch nicht vollständig abgeschlossen.
- Weitere Portalmodule sind in `MODULE-INVENTORY.md` erfasst; für diese liegen noch nicht überall vollständige Konzepte vor.
- Diese Dokumentation konsolidiert verfügbares Projektgedächtnis und die jüngsten Gespräche. Sie ist eine umfangreiche Arbeitsgrundlage, aber kein Anspruch, bereits jedes einzelne Detail jedes Originalgesprächs wörtlich rekonstruiert zu haben.

## 2. Beschlossene übergreifende Leitlinien

- Rollen- und Aufgabenorientierung.
- Fachliche Vollständigkeit ohne visuelle Überladung.
- Kontextbezogene Informationen; Admin-Komplexität nicht unnötig in Teilnehmeransichten.
- Keine redundanten/unklaren Controls oder Statusanzeigen.
- Mobile UX eigenständig betrachten.
- UX-Empfehlungen aktuell recherchieren und anhand des RCPD-Ablaufs begründen.
- Claude als spätere kritische Review-Instanz; alle Beschlüsse in den Review-Kontext aufnehmen.
- Keine Änderungen an Architektur/Datenmodell/Geschäftslogik/Berechtigungen im bloßen UI-Redesign.
- Separate Branches; kein main-Merge/Deployment ohne ausdrückliche Freigabe.

## 3. Vollständiges Modul-Inventar

Siehe `MODULE-INVENTORY.md`. Inventarisiert sind:
- globale App-Shell, Navigation und Suche;
- Dashboard;
- Ankündigungen;
- Nachrichten;
- Benachrichtigungen;
- Anträge;
- Kalender;
- Personalverwaltung;
- Berichte;
- Audit-/Aktivitätsverlauf;
- Whitelist/Zugangsverwaltung;
- Deployment/Betrieb;
- Login/Kontozugang/Einstellungen;
- Academy;
- Prüfungswerkstatt/Examiner.

Die Module außerhalb der Academy sind zunächst Inventar-/Auditbereiche, keine vollständig beschlossenen neuen Konzepte.

## 4. Academy – bisher beschlossene Teilbereiche

- Academy-Grundkonzept und fünf Hauptbereiche (Option A).
- Programme, Kurse, Status, Versionierung, Teilnahme und Wiederqualifizierung (38 Beschlüsse).
- Teilnehmerprüfungen und Examiner-Prozess.
- Draft-Konzept C, Ergebnisfreigabe und Korrekturhistorie.
- Empfehlungen: Erstellung C, Deduplizierung B, Lebenszyklus C, Priorisierung B, Ausblenden B.
- Kursmeldungs-Lesestatus C.
- Lernbibliothek: Dokumentversionierung B; Archivierung/Löschung A; globale Suche A; Sortierung A; Filterdarstellung A.
- Reader: Navigation eingeklappt A; kontinuierliches vertikales Scrollen.
- Notizen/Lesezeichen: Versionsbindung A; Synchronisierung A; Erhalt bei Berechtigungsverlust A; Erhalt bei Quelldokumententfernung A (vorbehaltlich rechtlicher Löschpflichten).
- Kontextbezogener Meldebutton als spätere Integrationsanforderung; vollständiges Meldesystem wird später separat geplant.

Vollständige Details stehen in `DECISIONS.md`.

## 5. Noch offene Hauptarbeiten

1. Academy-Lernbibliothek: Upload-/Metadaten-/Freigabeworkflow und Reader-/Notiz-Randfälle abschließen.
2. Restliche Academy-Fragen und Cross-Module-Abhängigkeiten prüfen.
3. Alle übrigen Portalmodule anhand des tatsächlichen Bestands systematisch auditieren.
4. Rollen- und Aufgabenmatrix aus bestehenden Berechtigungen ableiten.
5. Globale Informationsarchitektur erst nach Modulkonzepten abstimmen.
6. Technische Machbarkeit und Abweichungen vom Architektur-Erhaltungsprinzip dokumentieren.
7. Designsystem und grafische Detailgestaltung erst anschließend beginnen.
8. Unabhängige kritische Review des Gesamtplans vorbereiten.

## 6. Nächster konkreter Schritt

Weiter mit der Lernbibliothek und dem Abgleich ihrer bereits beschlossenen Regeln. Danach systematisch die weiteren Module auditieren, ohne bereits beschlossene Fragen erneut aufzurollen oder offene Vorschläge als Entscheidungen zu behandeln.

## 7. Technische Ausführung und Tests dieser Dokumentationsrevision

- Es wurden ausschließlich Markdown-Planungsdokumente auf einem separaten Branch geändert/ergänzt.
- Keine Anwendungscode-, Datenmodell-, API-, Berechtigungs- oder Deployment-Dateien geändert.
- Kein Merge nach main und kein Deployment durch diese Revision.
- Geänderte Dateien werden nach dem Schreiben erneut aus GitHub abgerufen und inhaltlich auf Vorhandensein/Gliederung kontrolliert.
- Lint, Build, Tests und Browserprüfung wurden nicht ausgeführt; es handelt sich um reine Dokumentation.
