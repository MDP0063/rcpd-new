# RCPD – Masterplan

**Stand:** 06.11.2026  
**Status:** Konsolidierte Planungsbaseline; einzelne Bereiche und Abhängigkeiten müssen im weiteren Verlauf noch gegen Originalentscheidungen validiert werden.

## 1. Projektziel und Rahmen

RCPD ist ein fiktives Polizei-Intranet- und Ausbildungsportal für eine Roleplay-Community. Ziel ist ein professionelles, zuverlässiges Portal für Ausbildung, interne Arbeitsabläufe und administrative Aufgaben. Es werden keine Live-Daten realer Polizeibehörden vorausgesetzt oder eingebunden.

Die Anwendung befindet sich laut Repository-Dokumentation in früher Alpha. Der tatsächliche Code ist nicht automatisch identisch mit dem hier beschriebenen Zielkonzept.

## 2. Verbindliche Arbeits- und Qualitätsleitlinien

- Sicherheit, Datenintegrität, Zuverlässigkeit und Erweiterbarkeit haben Vorrang.
- Bestehende Funktionen und Beschlüsse erhalten; kein unnötiges Redesign ohne konkreten Grund.
- Keine Scope-Erweiterung ohne vorherige fachliche Zustimmung.
- Technische Bugs und notwendige Qualitätskorrekturen dürfen im freigegebenen Aufgabenrahmen behoben werden.
- Technische Befunde, Vermutungen und fachliche Beschlüsse strikt unterscheiden.
- Keine Tests, Builds, Browser- oder E2E-Prüfungen als erfolgreich darstellen, wenn sie nicht ausgeführt wurden.
- Repository-Arbeit auf eigenem Branch; niemals direkt auf `main`; kein Merge und kein Deployment ohne ausdrückliche Zustimmung.
- Vor jedem Repository-Eingriff die Regeln in `AGENTS.md`, `CONTRIBUTOR_ROLES.md` und `DEVELOPMENT_PHILOSOPHY.md` vollständig lesen.
- Vor UX-, Layout-, Navigations- und Interaktionsempfehlungen aktuelle etablierte Muster und maßgebliche Accessibility-Standards recherchieren; Quellen und RCPD-spezifische Begründung nennen.

## 3. Designrichtung und UX-Grundsätze

**Beschlossen: Designrichtung B.** Modernes operatives und administratives Portal: professionell, ruhig, institutionell und technisch. Keine spielerische, neonartige oder dekorativ überladene Gestaltung.

Übergreifende Grundsätze:
- fachlich vollständig, aber visuell nicht überladen;
- Teilnehmeroberflächen nicht mit administrativen Möglichkeiten belasten;
- Informationen kontextbezogen und rollen-/situationsgerecht anzeigen;
- unnötige Menüpunkte, Statusanzeigen, Warnungen und Interaktionen vermeiden;
- responsive, verständliche und zugängliche Bedienung;
- Tastaturbedienbarkeit, sichtbarer Fokus, sinnvolle Fokusreihenfolge, Kontrast und Screenreader-Unterstützung berücksichtigen;
- technische Funktionen müssen nicht zwangsläufig einen eigenen sichtbaren Bereich erhalten.

## 4. Planungs- und Umsetzungsphasen

1. Vollständiges Modul-Inventar und UX-Audit.
2. Modulkonzepte und Informationsarchitektur.
3. Cross-Module-Abgleich und Abhängigkeiten.
4. Technische Machbarkeit und Architekturprüfung.
5. Designsystem und globale Navigation.
6. Modulweise visuelle Ausarbeitung und Umsetzung.
7. Qualitätssicherung, Optimierung und Konsistenzprüfung.

Zunächst werden die Modulkonzepte vollständig geplant. Danach folgen Cross-Module-Alignment, technische Machbarkeit, Designsystem und globales Layout. Examiner ist nur ein Teilbereich der Academy; die Academy-Gesamtplanung ist nicht abgeschlossen.

## 5. Module und fachliche Zielbilder

### 5.1 Academy

Die Academy ist sowohl operativer Ausbildungsarbeitsbereich als auch frei nutzbare Wissensbibliothek. Empfehlungen und Lernpfade unterstützen, sind aber keine pauschalen Zugangsvoraussetzungen.

Hauptbereiche (Option A, beschlossen):
1. Übersicht
2. Kurse
3. Lernbibliothek
4. Prüfungen
5. Meine Notizen

Der Examiner-Arbeitsbereich ist rollen- und berechtigungsabhängig integriert und kein sechster allgemeiner Hauptmenüpunkt.

Programme, Kurse und Materialien sind getrennte, verknüpfte Konzepte:
- Programme haben ein Lernziel und erforderliche sowie empfohlene Kurse.
- Kurse sind eigenständige Fachmodule, können mehreren Programmen zugeordnet und standalone genutzt werden.
- Kursreihenfolgen dienen der Orientierung; keine pauschalen Sperren.
- Kapitel, Materialien und freiwillige Wissenstests sind optional je Kurs konfigurierbar.
- Abschlussbedingungen müssen ausdrücklich definiert und durch aussagekräftige Nachweise erfüllt werden.
- Öffnen oder Durchblättern ist kein Nachweis für Lesen, Verstehen oder Abschluss.
- Freiwillige Wissenstests verhindern keinen Kursabschluss, sofern sie nicht ausdrücklich als Pflichtprüfung festgelegt wurden.

### 5.2 Lernbibliothek und Reader

Die Lernbibliothek ist eine vollständige, eigenständige Wissenssammlung. Kurse referenzieren kanonisches Material statt es zu duplizieren.

Geplantes Zielbild:
- thematische Kategorien, vollständiges Archiv, Suche und Filter;
- zentrale globale Suche über alle zugänglichen Dokumente;
- Reader mit großzügiger Lesefläche;
- Dokumentversionierung und nachvollziehbare historische Fassungen;
- persönliche Lesezeichen und private Notizen;
- letzte Leseposition, Zoom, direkte Seitennavigation und – sofern auslesbar – Inhaltsverzeichnis;
- Volltextsuche und OCR nur, soweit technisch zuverlässig;
- responsive Bedienung und mobile Reader-Prüfung.

Dokumente werden extern erstellt (z. B. als PDF) und über eine Verwaltungsoberfläche hochgeladen. Eine verbindliche PDF-Designvorlage wurde nicht beschlossen. Metadaten, Entwurfs-/Freigabestatus und Dokumentverwaltung sind Teil der späteren Ausarbeitung.

### 5.3 Prüfungen und Examiner

Teilnehmerprüfungen und Examiner folgen den verbindlichen Detailentscheidungen in `DECISIONS.md`. Kerngrundsätze:
- Prüfungszugriff und Voraussetzungen serverseitig prüfen;
- nur für Teilnehmer vorgesehene Prüfungen anzeigen; interne Berechtigungsdetails schützen;
- tatsächliche Prüfungsregeln vor dem Start transparent machen;
- Server-Timer, Autosave, Wiederaufnahme und gespeicherte Zustände korrekt darstellen;
- Abgabe, Bewertung und Ergebnisfreigabe als getrennte Vorgänge behandeln;
- geschützte Fragen, Lösungen und interne Bewertungen nicht vorzeitig offenlegen;
- Examiner-Aufgaben einzeln, nachvollziehbar und mit persistentem Claim bearbeiten;
- Korrekturen und Revisionen historisieren.

Eine bestehende technische Spezifikation für die Admin-Prüfungswerkstatt liegt separat unter `docs/EXAM_WORKSHOP_ARCHITECTURE_V3.8.md`. Sie hat ihren eigenen Freigabestatus und darf nicht pauschal als implementiert behandelt werden.

### 5.4 Weitere Module

Das Gesamtportal umfasst neben der Academy weitere administrative und operative Bereiche (u. a. Bewerbungen, interne Kommunikation und administrative Anfragen). Deren vollständige Zielkonzepte sind in dieser Baseline noch nicht ausgearbeitet. Keine Details hinzuerfinden; in späteren Planungsabschnitten ergänzen.

## 6. Übergreifende Daten- und Statusprinzipien

- Veröffentlichung, Verfügbarkeit/Zugriffsberechtigung und persönlicher Fortschritt sind getrennte Ebenen.
- Historische Abschlüsse und Nachweise dürfen durch Archivierung, neue Versionen oder Berechtigungsänderungen nicht stillschweigend verschwinden.
- Kurs- und Programmversionen sind nachvollziehbar; laufende Teilnahmen wechseln nicht automatisch auf neue Versionen.
- Kursabschlüsse und Prüfungsergebnisse sind getrennte Sachverhalte.
- Interne Bewertungsstände und veröffentlichte Ergebnisse sind getrennt.
- Historische Ereignisse und Korrekturen werden nachvollziehbar protokolliert; keine stillen Überschreibungen.
- Berechtigungen werden serverseitig geprüft; private Notizen bleiben privat.
- Datenaufbewahrung und Löschung müssen Datenschutz und legitime Nachweispflichten berücksichtigen.

## 7. Dokumentationsgrenzen

Dieser Masterplan ist eine fachliche Zusammenfassung. Er ist weder ein vollständiges Datenmodell noch eine technische Implementierungsanweisung. Für konkrete Implementierungen sind aktuelle Repository-Regeln, Code, Tests, freigegebene technische Spezifikationen und die noch offenen Entscheidungen heranzuziehen.
