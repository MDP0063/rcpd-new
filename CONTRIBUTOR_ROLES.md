# KI-Mitwirkende und Zuständigkeiten

Dieses Dokument legt die empfohlenen Hauptaufgaben der am RCPD-Projekt beteiligten KI-Werkzeuge fest. Es ergänzt `AGENTS.md`; es ersetzt oder überschreibt keine dortigen Projekt-, Sicherheits- oder Git-Regeln. Die übergreifende Entwicklungsphilosophie ist verbindlich in `DEVELOPMENT_PHILOSOPHY.md` festgehalten.

**Verbindlich vor jeder Projektarbeit:** Lies zuerst `AGENTS.md`, anschließend dieses Dokument und danach `DEVELOPMENT_PHILOSOPHY.md` vollständig. Prüfe außerdem die für deine konkrete Aufgabe relevanten Projektdateien und Dokumentationen. Wenn du keinen Zugriff auf das Repository oder eine dieser Dateien hast, sage das ausdrücklich und bitte darum, die fehlenden Inhalte bereitzustellen. Behaupte niemals, du hättest Regeln gelesen, die dir nicht zugänglich waren.

## Rollenübersicht

| Beteiligter | Empfohlene Hauptaufgabe | Erwarteter Beitrag |
|---|---|---|
| **ChatGPT** | Academy-Umsetzung, UX/Design, Qualität und Sicherheit; zusätzlich unabhängige Reviews anderer Änderungen | Im ausdrücklich freigegebenen Academy-Geltungsbereich selbstständig Bestandsaufnahme, Recherche, Konzeption, Implementierung, Tests, PR-Erstellung, Review und Merge durchführen. Bei anderen Projektbereichen weiterhin Reviews und Qualitätssicherung übernehmen, aber keine eigenständige Umsetzung/Merge-Freigabe ableiten. Sicherheits-, Berechtigungs-, Datenschutz-, Datenintegritäts- und Regressionsthemen mit konkreten Datei-/Zeilenbezügen dokumentieren. |
| **Claude** | Architektur und anspruchsvolle Implementierung | Bestehende Architektur verstehen; komplexe Funktionen, Refactorings und technische Konzepte bearbeiten; Auswirkungen auf bestehende Komponenten berücksichtigen und Änderungen nachvollziehbar dokumentieren. |
| **Google AI Studio** | Prototypen, UI-Konzepte und Experimente | Ideen, Oberflächen und neue Interaktionen explorieren; Prototypen und begrenzte Implementierungen erstellen; Annahmen und offene technische Fragen kennzeichnen, bevor Ergebnisse in die Hauptanwendung übernommen werden. |
| **Google Antigravity** | Repository-weite Umsetzung und Integration | Klar abgegrenzte Aufgaben über mehrere Dateien hinweg umsetzen; Änderungen integrieren; verfügbare Lint-, Build- und Testläufe ausführen; Fehler beheben und Ergebnisse für einen Pull Request vorbereiten. |
| **Zweiter Account des Projektinhabers** | Organisatorische Unterstützung / zusätzlicher Zugang | Keine feste technische Zuständigkeit. Kann je nach Bedarf zur Koordination, Kommunikation oder als zusätzlicher Zugang dienen. Es wird keine bestimmte KI-Fähigkeit oder technische Aufgabe vorausgesetzt. |
| **Projektinhaber** | Priorisierung und endgültige Entscheidungen | Anforderungen und Prioritäten festlegen und fachliche Grundsatzentscheidungen treffen. Die Academy-Umsetzung und das Mergen geeigneter Academy-PRs sind ausdrücklich an ChatGPT delegiert; außerhalb dieses Bereichs bleibt die Merge-Entscheidung beim Projektinhaber. |

Diese Rollen sind Schwerpunktsetzungen, keine exklusiven Berechtigungen. Jede beteiligte KI soll auf entdeckte Fehler, Sicherheitsprobleme oder Widersprüche hinweisen – unabhängig von ihrer Hauptaufgabe.

## Verbindlicher Review- und Änderungsablauf

1. **Aufgabe verstehen:** Lies `AGENTS.md`, dieses Dokument und `DEVELOPMENT_PHILOSOPHY.md` sowie die für die Aufgabe relevanten Dateien. Prüfe den aktuellen Stand des Ziel-Branches, bevor du Änderungen planst.
2. **Isoliert arbeiten:** Verwende einen eigenen, thematisch passenden Branch. Arbeite niemals direkt auf `main` und überschreibe keine fremden, noch nicht integrierten Änderungen.
3. **Änderungen nachvollziehbar halten:** Ein Branch soll ein zusammenhängendes Thema behandeln. Dokumentiere wichtige Annahmen, geänderte Bereiche, Risiken und bekannte Einschränkungen.
4. **Prüfungen ehrlich ausführen:** Befolge die Test-, Lint- und Build-Vorgaben aus `AGENTS.md`. Kennzeichne nicht ausgeführte Prüfungen ausdrücklich. Erfinde keine erfolgreichen Testergebnisse.
5. **Pull Request erstellen:** Verwende die aktuelle Vorlage unter `.github/PULL_REQUEST_TEMPLATE.md` und fülle alle erforderlichen Abschnitte wahrheitsgemäß aus.
6. **Unabhängig reviewen:** Die Person oder KI, die eine Änderung implementiert hat, soll nicht die einzige Instanz sein, die sie freigibt. ChatGPT übernimmt grundsätzlich das unabhängige Review. Hat ChatGPT selbst die Änderung implementiert, muss eine andere beteiligte Instanz oder der Projektinhaber sie unabhängig prüfen.
7. **Merge-Regel mit Academy-Ausnahme:** Außerhalb der Academy entscheidet der Projektinhaber über den Merge; ChatGPT erhält dort durch seine Review-Rolle keine Merge-Berechtigung. Für Academy-Änderungen besteht eine ausdrückliche, vom Projektinhaber am 12.11.2026 bestätigte Ermächtigung: ChatGPT darf Academy-PRs eigenständig mergen, sofern Scope, Code/Diff, Sicherheit, Regressionen und erforderliche GitHub-Checks geprüft sind und keine blockierenden Findings oder ungelösten Konflikte bestehen. Direkte Commits auf `main`, Force-Pushes und das Umgehen von Branch Protection bleiben verboten. Bei Authentifizierungs-/Autorisierungsänderungen, sensiblen Datenzugriffen, Migrationen oder Änderungen mit Auswirkungen außerhalb der Academy ist ein zusätzliches unabhängiges Review erforderlich; die Ermächtigung ersetzt keine technischen Schutzmaßnahmen.

## Mindestumfang eines unabhängigen Reviews

Ein Review soll – soweit für die Änderung relevant – mindestens prüfen:

- **Sicherheit:** Anmeldung, Sitzungen, Rollen und Berechtigungen, serverseitige Vertrauensgrenzen, API-Endpunkte, Eingabevalidierung, XSS/Injection, CSRF, sensible Daten, Passwörter, Tokens und Secrets.
- **Korrektheit:** Fehlerfälle, Randbedingungen, Datenkonsistenz, asynchrone Abläufe und mögliche Seiteneffekte.
- **Architektur:** Übereinstimmung mit dem bestehenden Aufbau, unnötige Duplikate, Kopplung und Auswirkungen auf andere Module.
- **Regressionen:** Ob bestehende Funktionen oder Daten durch die Änderung beeinträchtigt werden könnten.
- **Tests:** Ob relevante Tests vorhanden sind und ob die angegebenen Prüfungen tatsächlich ausgeführt wurden.

Findings sollen nach Möglichkeit mit Schweregrad (**kritisch**, **hoch**, **mittel**, **niedrig**) sowie konkretem Datei- und Zeilenbezug angegeben werden. Vermutungen sind als solche zu kennzeichnen. Ein Review darf keine vollständige Sicherheit garantieren.

## Besonderheit: Werkzeuge ohne automatisches Einlesen

Nicht jede Entwicklungsumgebung liest Repository-Anweisungen automatisch ein. Insbesondere bei Google AI Studio oder anderen browserbasierten beziehungsweise promptgesteuerten Arbeitsabläufen darf nicht angenommen werden, dass `AGENTS.md`, `CONTRIBUTOR_ROLES.md` oder `DEVELOPMENT_PHILOSOPHY.md` automatisch geladen wurden.

Wenn die Umgebung die Dateien nicht selbstständig einliest, müssen sie vor Beginn der Arbeit ausdrücklich als Projektkontext oder Anweisung bereitgestellt werden. Kann das nicht gewährleistet werden, muss die KI den Projektinhaber darauf hinweisen und darf nicht behaupten, die Regeln vollständig berücksichtigt zu haben.

## Umgang mit Konflikten

- `AGENTS.md` enthält die zentralen technischen und sicherheitsbezogenen Projektregeln.
- Dieses Dokument ergänzt diese Regeln um Zuständigkeiten und Zusammenarbeit.
- `DEVELOPMENT_PHILOSOPHY.md` enthält die übergreifenden Qualitäts- und Entwicklungsgrundsätze.
- Bei Widersprüchen gelten die verbindlichen Sicherheits- und Git-Regeln aus `AGENTS.md`; melde den Widerspruch, statt eigenmächtig eine Regel zu wählen.
- Anforderungen des Projektinhabers haben Vorrang vor den hier vorgeschlagenen Aufgabenschwerpunkten, sofern sie nicht den verbindlichen Sicherheits- und Repository-Regeln widersprechen.
