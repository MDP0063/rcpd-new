# RCPD – Projektplanung

> Zentrale fachliche Planungs- und Entscheidungsdokumentation für `MDP0063/rcpd-new`. Sie enthält nicht nur kurze Beschlusslisten, sondern auch ausführliche Ablaufregeln, Randbedingungen, Audit-Aufträge und nachvollziehbare offene Punkte.

**Stand:** 12.11.2026  
**Letzter verifizierter `main`-Stand:** `ee5df95e5c83c1e1466f466249cc0b01dc30c008`  
**Letzte Fortschrittsaktualisierung:** Academy-Bibliothek: Accessibility und Lade-Wiederherstellung (PR #206/#207/#209/#219/#221), Reader-Textanker-Parität (PR #215), falscher Leerzustand bei Notiz-Ladefehlern (PR #216) und Dokumentationsabgleich vom 12.11.2026.
**Laufender Umsetzungs- und Abnahmestand:** siehe [PROGRESS.md](./PROGRESS.md).  
**Dokumentationsstatus:** Umfangreiche Rekonstruktion des verfügbaren Projektgedächtnisses und der jüngsten Gespräche. Die Academy liegt als detaillierte Spezifikation vor. Die übrigen Portalmodule sind vollständig inventarisiert und in ihren Leitlinien/Audit-Aufträgen beschrieben, aber fachlich noch nicht alle bis ins Detail konzipiert.

## Verbindliche Lesereihenfolge

1. [MASTERPLAN.md](./MASTERPLAN.md) – Gesamtziel, Umfang, Phasen und Leitlinien.
2. [PORTAL-REDESIGN-DETAILS.md](./PORTAL-REDESIGN-DETAILS.md) – ausführliche Gesamtportalplanung, UX-Regeln, Modulkommentare, Auditablauf und Cross-Module-Abhängigkeiten.
3. [ACADEMY-DETAILED-SPECIFICATION.md](./ACADEMY-DETAILED-SPECIFICATION.md) – ausführliche Academy-Fachregeln und konkrete Abläufe.
4. [DECISIONS.md](./DECISIONS.md) – verbindliches Entscheidungsregister und gewählte Optionen.
5. [MODULE-INVENTORY.md](./MODULE-INVENTORY.md) – alle Portalmodule und ihr tatsächlicher Audit-/Konzeptstatus.
6. [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md) – noch offene Entscheidungen, technische Prüffelder und nicht genehmigte Vorschläge.
7. [RECONSTRUCTION-NOTES.md](./RECONSTRUCTION-NOTES.md) – Herkunft, Umfang und Grenzen der Rekonstruktion sowie Regeln gegen erneuten Detailverlust.
8. [ACADEMY-UX-AUDIT.md](./ACADEMY-UX-AUDIT.md) – ergänzende Implementierungsprüfung und Vorbereitung des visuellen Academy-Redesigns. Die bestehende IA und Fach-/UX-Beschlüsse bleiben verbindlich.
9. [PROGRESS.md](./PROGRESS.md) – aktueller Arbeitsstand, nächste Schritte und Prüfstatus.
10. [CHANGELOG.md](./CHANGELOG.md) – Änderungen an der Planungsdokumentation.
11. [DESIGN-SYSTEM-CONCEPT.md](./DESIGN-SYSTEM-CONCEPT.md) – aktueller visueller Arbeitsentwurf, Designprinzipien, Schutzgrenzen und Quellen.

## Statuskennzeichnungen

- **BESCHLOSSEN** – vom Projektinhaber verbindlich entschieden.
- **OFFEN** – Entscheidung oder Klärung steht aus.
- **VORSCHLAG** – Empfehlung, noch nicht beschlossen.
- **PRÜFHYPOTHESE** – Vermutung oder ältere Beobachtung, noch zu verifizieren.
- **TECHNISCHER BEFUND** – im Repository zu einem angegebenen Branch-/Commit-Stand festgestellt.
- **ABGELÖST** – ausdrücklich durch eine spätere Entscheidung ersetzt; ursprünglicher Stand bleibt nachvollziehbar.

## Pflege- und Änderungsregeln

- Vor einer neuen Frage die Entscheidungen und Detail-Spezifikationen lesen; bereits beantwortete Fragen nicht erneut stellen, außer ein echter Widerspruch oder eine neue technische Abhängigkeit macht es nötig.
- Neue Beschlüsse zeitnah in `DECISIONS.md` festhalten und die ausführliche Bedeutung, Randfälle und Abläufe in der zuständigen Spezifikation ergänzen.
- Nutzerkommentare, Korrekturen, Begründungen und Einschränkungen nicht auf eine Optionsbuchstabe oder einen Ein-Satz-Beschluss reduzieren.
- Offene Fragen erst nach Klärung als beschlossen markieren; Empfehlungen niemals stillschweigend zu Entscheidungen machen.
- Änderungen an bestehenden Beschlüssen mit Datum, Begründung und Verweis auf den ersetzenden Beschluss dokumentieren.
- Technische Befunde immer mit Prüfdatum, Branch/Commit, konkreten Dateipfaden und Evidenz versehen. Veraltete Befunde ausdrücklich kennzeichnen.
- UX-, Layout-, Navigations- und Interaktionsentscheidungen vor einer Empfehlung aktuell recherchieren; Quellen und konkrete RCPD-Begründung nennen.
- Keine neuen Funktionen oder fachlichen Entscheidungen aus bloßen technischen Möglichkeiten ableiten.
- Keine Zugangsdaten, Tokens, privaten personenbezogenen Daten oder sonstigen Geheimnisse ablegen.

## Geltungsbereich

Diese Dokumentation hält den fachlichen Planungsstand fest. Sie ersetzt nicht:
- `AGENTS.md`, `CONTRIBUTOR_ROLES.md` oder `DEVELOPMENT_PHILOSOPHY.md`;
- freigegebene technische Architekturspezifikationen wie [Exam Workshop Architecture v3.8](../EXAM_WORKSHOP_ARCHITECTURE_V3.8.md);
- den tatsächlich implementierten Code oder dessen Tests.

Bei Konflikten gelten die verbindlichen Repository-Regeln und die ausdrücklich bestätigten Entscheidungen des Projektinhabers. Technische Spezifikationen beschreiben ihren jeweils ausgewiesenen Geltungs- und Freigabestatus. Die Rekonstruktionsgrenzen sind in `RECONSTRUCTION-NOTES.md` offengelegt.


## Ergänzung: verbindliches Entwicklungsmodell

Das ab 06.11.2026 beschlossene endproduktorientierte iterative Vorgehen ist in [DEVELOPMENT-MODEL.md](./DEVELOPMENT-MODEL.md) festgehalten. Dieses Dokument ist zusammen mit Masterplan und Detailplanung zu lesen. Es präzisiert, wie Gesamtplanung und vollständige Entwicklungsabschnitte ineinandergreifen, ohne Qualitäts- oder Funktionsumfang zu reduzieren.


## Ergänzung vom 11.11.2026 – Visuelle Gestaltungsphase

Der aktuelle visuelle Arbeitsentwurf ist in [DESIGN-SYSTEM-CONCEPT.md](./DESIGN-SYSTEM-CONCEPT.md) dokumentiert. Er ergänzt die bestehende Academy-Spezifikation und das Gesamtportal-Redesign, ohne frühere Beschlüsse zu ersetzen. Objektive UX-/Accessibility-Details werden eigenständig begründet; subjektive Grundsatzentscheidungen bleiben abstimmungspflichtig. Die Academy-Kachel-Startseite und die beschlossene Informationsarchitektur bleiben unverändert.
