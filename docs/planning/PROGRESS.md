# RCPD – Aktueller Planungs- und Redesignstand

**Stand:** 06.11.2026  
**Basisstand von main:** Merge-Commit von PR #44: `8f8f3a4f17a05f10fcff6b770461a643a718eeb8`.  
**Aktueller Dokumentationsbranch:** `docs/deep-redesign-reconstruction`.

## 1. Gesamtstatus

- Das Redesign umfasst das gesamte Portal, nicht nur die Academy.
- Designrichtung B „Modernes Einsatz- und Verwaltungsportal“ ist beschlossen.
- Funktionale Planung, Bestandsaufnahme und Informationsarchitektur gehen dem finalen visuellen Design voraus.
- Bestehende technische Architektur, Datenmodelle, Geschäftslogik und Berechtigungen bleiben grundsätzlich unverändert.
- Die vorherige Gesamt-Redesign-Erweiterung wurde in PR #44 in `main` gemergt. Sie war eine breite Baseline, aber noch zu stark zusammengefasst.
- Die aktuelle Revision ergänzt deshalb eigenständige ausführliche Spezifikationen für das Gesamtportal und die Academy und dokumentiert offen, welche Details aus den verfügbaren Erinnerungen stammen bzw. nicht wortgetreu rekonstruierbar sind.
- Die Academy ist in `ACADEMY-DETAILED-SPECIFICATION.md` deutlich ausführlicher beschrieben, aber fachlich noch nicht vollständig abgeschlossen und nicht automatisch umsetzungsreif.
- Die übrigen Module sind im Inventar erfasst und in `PORTAL-REDESIGN-DETAILS.md` detailliert mit Grundsätzen und Audit-Aufträgen beschrieben; konkrete Modulkonzepte fehlen weiterhin dort, wo sie im verfügbaren Kontext noch nicht entschieden wurden.

## 2. Dokumentationsstruktur

- `MASTERPLAN.md`: Zielbild, Arbeitsrahmen und Planungsphasen.
- `PORTAL-REDESIGN-DETAILS.md`: ausführliche Gesamtportal-Leitlinien, UX-Arbeitsweise, Modulkommentare, Cross-Module-Abhängigkeiten und Auditmethodik.
- `ACADEMY-DETAILED-SPECIFICATION.md`: detaillierte Regeln zu Programmen, Kursen, Bibliothek, Reader, Notizen, Prüfungen, Examiner und Ergebnisfreigaben.
- `DECISIONS.md`: Entscheidungsregister mit gewählten Optionen und verbindlichen Abgrenzungen.
- `MODULE-INVENTORY.md`: alle identifizierten Module und ihr Auditstatus.
- `OPEN-QUESTIONS.md`: nicht entschiedene Fragen und technische Prüffelder.
- `RECONSTRUCTION-NOTES.md`: Herkunft und Grenzen der verfügbaren Erinnerung sowie Regeln für zukünftige Dokumentation.
- `README.md` und `CHANGELOG.md`: Einstieg und Verlauf.

## 3. Academy – bisher beschlossene Teilbereiche

Die verfügbaren Erinnerungen enthalten:
- Academy-Grundkonzept und fünf Hauptbereiche (Option A).
- Programme, Kurse, Status, Versionierung, Teilnahme und Wiederqualifizierung (38 Beschlüsse).
- Teilnehmerprüfungen und Examiner-Prozess.
- Draft-Konzept C, Ergebnisfreigabe und Korrekturhistorie.
- Empfehlungen: Erstellung C, Deduplizierung B, Lebenszyklus C, Priorisierung B, Ausblenden B.
- Kursmeldungs-Lesestatus C.
- Lernbibliothek: Dokumentversionierung B; Archivierung/Löschung A; globale Suche A; Sortierung A; Filterdarstellung A.
- Reader: Navigation eingeklappt A; kontinuierliches vertikales Scrollen.
- Notizen/Lesezeichen: Versionsbindung A; Synchronisierung A; Erhalt bei Berechtigungsverlust A; Erhalt bei Quelldokumententfernung A, vorbehaltlich rechtlicher Löschpflichten.
- Kontextbezogener Meldebutton als spätere Integrationsanforderung; vollständiges Meldesystem wird später separat geplant.

Die Detailregeln, Abläufe und Sonderfälle sind in `ACADEMY-DETAILED-SPECIFICATION.md` beschrieben. `DECISIONS.md` enthält weiterhin den Überblick über verbindliche Optionen.

## 4. Gesamtportal – aktuelle Planungsbasis

- Rollen- und Aufgabenorientierung ist verbindlich; konkrete Rechte bleiben aus dem bestehenden System abzuleiten.
- Mobile UX ist eigenständiger Audit-/Designgegenstand.
- Redundante UI darf nur entfernt werden, wenn ihre fachliche Funktion erhalten bleibt.
- Keine unbestätigten Widgets, KPIs, Freigabestufen, Attribute oder Automationen hinzufügen.
- Vor jeder UX-/Layout-/Navigations-/Interaktionsempfehlung aktuelle etablierte Muster und relevante Accessibility-Standards recherchieren, Quellen nennen und die RCPD-spezifische Begründung dokumentieren.
- Claude-Review darf Entscheidungen kritisch hinterfragen, sie aber nicht eigenmächtig ersetzen.
- Weitere Module sind noch nicht vollständig fachlich konzipiert; die offenen Auditbereiche sind transparent markiert.

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

Die Dokumentationsrevision in diesem Branch vollständig prüfen und als separaten Draft-PR zur Review vorlegen. Danach weiter mit den offenen Punkten der Lernbibliothek und anschließend Modul für Modul das restliche Portal auditieren. Vor jeder Rückfrage zuerst die neuen Detail-Spezifikationen und das Entscheidungsregister abgleichen.

## 7. Technische Ausführung und Tests

- Diese Revision ändert ausschließlich Markdown-Planungsdokumente.
- Neue Dateien: `PORTAL-REDESIGN-DETAILS.md`, `ACADEMY-DETAILED-SPECIFICATION.md`, `RECONSTRUCTION-NOTES.md`.
- Aktualisiert: Masterplan, Entscheidungsregister, Modul-Inventar, offene Fragen, Fortschritt, README und Changelog.
- Keine Anwendungslogik-, Backend-, API-, Datenmodell-, Berechtigungs- oder Deployment-Dateien geändert.
- Branch basiert auf dem aktuellen `main`-Stand nach Merge von PR #44; keine direkte Änderung an `main`.
- Kein Merge und kein Deployment durch diese Revision.
- Lint, Build, Tests, Browserprüfung und Markdown-Linkcheck wurden nicht ausgeführt.
- Nach dem Schreiben müssen alle geänderten Dateien aus GitHub erneut abgerufen und auf Inhalt, Gliederung, Links und Widersprüche geprüft werden.
