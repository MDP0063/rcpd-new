# RCPD – Projektplanung

> Zentrale fachliche Planungs- und Entscheidungsdokumentation für `MDP0063/rcpd-new`.

**Stand:** 06.11.2026  
**Dokumentationsstatus:** Erweiterte Gesamt-Redesign-Baseline. Fachliche Entscheidungen sind von Vorschlägen und technischen Prüfhypothesen getrennt. Nicht alle Module sind bereits konzipiert; offene Bereiche sind ausdrücklich markiert.

## Verbindliche Lesereihenfolge

1. [MASTERPLAN.md](./MASTERPLAN.md) – Projektziele, Leitlinien und Modulkonzept.
2. [DECISIONS.md](./DECISIONS.md) – verbindliche fachliche Entscheidungen.
3. [MODULE-INVENTORY.md](./MODULE-INVENTORY.md) – alle Portalmodule und Auditstatus.
4. [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md) – tatsächlich offene Punkte und Prüffelder.
5. [PROGRESS.md](./PROGRESS.md) – aktueller Arbeitsstand und nächster Schritt.
6. [CHANGELOG.md](./CHANGELOG.md) – Änderungen an dieser Dokumentation.

## Statuskennzeichnungen

- **BESCHLOSSEN** – vom Projektinhaber verbindlich entschieden.
- **OFFEN** – Entscheidung oder Klärung steht aus.
- **VORSCHLAG** – Empfehlung, noch nicht beschlossen.
- **TECHNISCHER BEFUND** – im Repository zu einem angegebenen Stand festgestellt; kein fachlicher Beschluss.
- **ABGELÖST** – ausdrücklich durch eine spätere Entscheidung ersetzt.

## Pflege- und Änderungsregeln

- Neue Beschlüsse zeitnah in `DECISIONS.md` ergänzen und den Fortschritt in `PROGRESS.md` aktualisieren.
- Offene Fragen erst nach Klärung als beschlossen markieren; Empfehlungen niemals stillschweigend zu Entscheidungen machen.
- Änderungen an bestehenden Beschlüssen mit Datum, Begründung und Verweis auf den ersetzenden Beschluss dokumentieren.
- Technische Befunde immer mit Prüfdatum, Branch/Commit und betroffenen Dateien versehen. Veraltete Befunde als solche kennzeichnen.
- Bei Widersprüchen Originalentscheidung bzw. Projektinhaber konsultieren; nicht eigenmächtig interpretieren.
- UX-, Layout-, Navigations- und Interaktionsentscheidungen vor einer Empfehlung aktuell recherchieren und Quellen sowie konkrete RCPD-Begründung dokumentieren.
- Keine neuen Funktionen oder fachlichen Entscheidungen aus bloßen technischen Möglichkeiten ableiten.
- Keine Zugangsdaten, Tokens, privaten personenbezogenen Daten oder sonstigen Geheimnisse ablegen.

## Geltungsbereich

Diese Dokumentation hält den fachlichen Planungsstand fest. Sie ersetzt nicht:
- `AGENTS.md`, `CONTRIBUTOR_ROLES.md` oder `DEVELOPMENT_PHILOSOPHY.md`;
- freigegebene technische Architekturspezifikationen wie [Exam Workshop Architecture v3.8](../EXAM_WORKSHOP_ARCHITECTURE_V3.8.md);
- den tatsächlich implementierten Code oder dessen Tests.

Bei Konflikten gelten die verbindlichen Repository-Regeln und die ausdrücklich bestätigten Entscheidungen des Projektinhabers. Technische Spezifikationen beschreiben ihren jeweils ausgewiesenen Geltungs- und Freigabestatus.
