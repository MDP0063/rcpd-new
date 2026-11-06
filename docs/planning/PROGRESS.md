# RCPD – Aktueller Planungsstand

**Stand:** 06.11.2026  
**Repository-Basis:** `main` bei `ee688ba6515edb6bbba37997a10f67738677c305` (bei Erstellung dieser Baseline).  
**Dokumentationsbranch:** `docs/project-planning-baseline`.

## 1. Gesamtstatus

- RCPD-Redesign und fachliche Planung laufen.
- Academy ist noch nicht vollständig konzeptionell abgeschlossen.
- Lernbibliothek ist der aktuell bearbeitete Academy-Bereich.
- Andere Module müssen später anhand vollständiger Bestandsaufnahme und vorhandener Beschlüsse ausgearbeitet werden.
- Diese Dokumentation ist eine erste konsolidierte Baseline und muss schrittweise validiert/ergänzt werden.

## 2. Abgeschlossene Planungsbereiche / Beschlüsse

- Designrichtung und übergreifende UX-Leitlinien.
- Academy-Grundkonzept und fünf Hauptbereiche.
- Umfangreiche Kurs-/Programmstatus- und Versionierungsregeln (38 Beschlüsse).
- Teilnehmerprüfungen und Examiner-Arbeitsabläufe.
- Grundsätze der internen Bewertung und Ergebnisfreigabe; ein Freigabe-Default bleibt offen.
- Lernbibliothek: Dokumentversionierung Option B.
- Dokumentarchivierung und endgültige Löschung Option A.
- Persönliche Notizen/Lesezeichen: Versionsbindung A, automatische Synchronisierung A, Erhalt bei Berechtigungsverlust A, Erhalt bei endgültiger Quelldokumententfernung A (vorbehaltlich Löschpflichten).
- Globale Bibliothekssuche A, Relevanzsortierung A, kompakte Filter A.
- Reader: einklappbare Navigation A, kontinuierliches vertikales Scrollen A.
- Kontextbezogener Meldebutton als spätere Integrationsanforderung; vollständiges Meldesystem noch nicht konzipieren.

## 3. Zuletzt bestätigte Details der Lernbibliothek

### Dokumente
- Veröffentlichte Kursversionen referenzieren konkrete Dokumentversionen; keine unbemerkte Aktualisierung.
- Regulär archivieren oder fachlich zurückziehen; endgültige Löschung nur als administrativer Ausnahmevorgang.
- Upload- und Verwaltungsworkflow noch im Detail zu planen; externe PDF-Erstellung ist möglich, keine verpflichtende PDF-Vorlage.

### Suche
- Globale Suche über alle zugänglichen Dokumente.
- Standard nach Relevanz.
- Alternative Sortierung alphabetisch und nach tatsächlichem Aktualisierungsdatum.
- Filter zunächst eingeklappt; aktive Filter sichtbar und entfernbar.

### Reader
- Großzügige Lesefläche.
- Linkes Navigationspanel zunächst geschlossen.
- Inhaltsverzeichnis nur, sofern auslesbar; Seitenminiaturen und direkter Seitensprung.
- Kontinuierliches vertikales Scrollen.
- Bereits früher beschlossen: letzte Leseposition, Zoom, Suche, persönliche Bookmarks/Notizen und Rückkehr zur vorherigen Bibliotheksposition.

### Persönliche Notizen und Lesezeichen
- An konkrete Dokumentversion gebunden.
- Automatische serverseitige Speicherung und geräteübergreifende Synchronisierung.
- Privat.
- Bleiben bei Berechtigungsverlust erhalten; Quelle wird als nicht zugänglich markiert.
- Bleiben bei endgültiger Quelldokumententfernung grundsätzlich erhalten, soweit keine rechtliche Löschpflicht entgegensteht.

## 4. Nächster konkreter Arbeitsschritt

Vor einer weiteren Frage:
1. `DECISIONS.md` und `OPEN-QUESTIONS.md` vollständig abgleichen.
2. Vorherige Reader-/Bibliotheksbeschlüsse berücksichtigen.
3. Nur tatsächlich offene Punkte behandeln.
4. Bei UX-/Interaktionsfragen vor Empfehlung aktuelle Recherche durchführen.

## 5. Technische Ausführung und Tests

Diese Dokumentationsänderung betrifft nur Markdown-Dateien. Es wurden keine Anwendungscode-, Datenmodell-, API-, Berechtigungs- oder Deployment-Dateien geändert.

Repository-Zugriff erfolgte über GitHub-Repository-/Dateiwerkzeuge. Es wurde kein lokaler Build, Lintlauf oder Test ausgeführt. Die Dokumentation selbst wurde nicht durch automatisierte Markdown-Prüfungen validiert.
