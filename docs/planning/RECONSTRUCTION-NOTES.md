# Rekonstruktions- und Quellenhinweise zur RCPD-Planung

**Stand:** 06.11.2026  
**Zweck:** Transparenz darüber, wie die ausführliche Planungsdokumentation aus Gesprächen und verfügbarem Projektgedächtnis rekonstruiert wurde und wie künftig mit Lücken umzugehen ist.

## 1. Was diese Dokumentation leisten soll

Die Planungsdateien sollen künftig die verlässliche, dauerhaft nachlesbare Arbeitsgrundlage für das RCPD-Redesign sein. Sie sollen nicht nur das Ergebnis einer Entscheidung in einem Satz enthalten, sondern – soweit verfügbar – auch:
- den fachlichen Zusammenhang;
- die vom Projektinhaber gemachten Bemerkungen und Einwände;
- die gewählte Option;
- die Bedeutung der Entscheidung;
- konkrete Abläufe und Zustandsübergänge;
- Randfälle und Ausnahmen;
- Auswirkungen auf Teilnehmer, Prüfer, Administratoren und andere Rollen;
- technische Abhängigkeiten;
- Gründe, warum eine naheliegende Alternative gerade nicht gewählt wurde;
- noch offene Fragen und bewusst vertagte Themen.

Die Dokumentation ist damit mehr als ein kurzes Feature-Backlog. Sie soll verhindern, dass bereits besprochene Details später erneut abgefragt, missverstanden oder in einer Implementierung verloren werden.

## 2. Verfügbare Quellen und Grenzen

Die Rekonstruktion vom 06.11.2026 basiert auf:
- dem in der aktuellen Arbeitssitzung verfügbaren gespeicherten Projektgedächtnis;
- den darin enthaltenen ausführlichen Zusammenfassungen früherer RCPD-Planungsgespräche;
- den sichtbaren Ausschnitten jüngster Gesprächskontexte;
- den bereits im Repository vorhandenen Planungsdateien;
- dem aktuellen Hauptstand der Planungsdokumentation nach Merge von PR #44.

**Wichtige Grenze:** In dieser Sitzung liegen nicht die vollständigen Wortprotokolle sämtlicher älterer, separater Chatverläufe vor. Die verfügbaren Erinnerungen enthalten viele konkrete Entscheidungen und Randbedingungen, aber nicht zwingend jede ursprüngliche Formulierung, jeden Zwischenschritt oder jeden verworfenen Vorschlag. Deshalb kann diese Datei keine wortgetreue Vollrekonstruktion aller jemals geschriebenen Nachrichten garantieren.

Die neuen Spezifikationen sind eine möglichst vollständige Rekonstruktion des tatsächlich verfügbaren Kontexts. Wo Details nicht sicher aus diesem Kontext hervorgehen, werden sie ausdrücklich als offen oder erneut zu prüfen markiert, statt durch plausible Vermutungen ergänzt zu werden.

## 3. Erfasste Themen und Gesprächsblöcke

### 3.1 Gesamtportal-Redesign (05.–06.11.2026)

Gesichert aus dem verfügbaren Kontext sind unter anderem:
- gesamtes Portal statt Academy-only;
- Designrichtung B „Modernes Einsatz- und Verwaltungsportal“;
- funktionale Bestandsaufnahme und UX-Audit vor finalem Visual Design;
- bestehende Architektur, Datenmodelle, Geschäftslogik und Rechte grundsätzlich erhalten;
- alle Module, Rollen, Workflows, Datenquellen sowie Desktop-/Mobile-Verhalten untersuchen;
- rollen- und aufgabenorientierte Oberflächen;
- mobile UX als eigenständiger Nutzungskontext;
- Reduktion unnötiger, doppelter oder verwirrender UI-Elemente ohne Verlust fachlicher Funktionen;
- aktuelle UX-/Accessibility-Recherche mit Quellen und RCPD-bezogener Begründung vor neuen Empfehlungen;
- Claude als unabhängige kritische Review-Instanz, ohne stillschweigende Änderung von Nutzerentscheidungen;
- separater Branch, keine eigenmächtige Änderung von main, kein unfreigegebener Merge oder Deployment;
- Nutzerwunsch, alle Entscheidungen künftig im Repository nachlesen zu können.

### 3.2 Academy-Grundkonzept und Bibliothek

Gesichert sind:
- Academy als Ausbildungsarbeitsbereich und unabhängige Wissensbibliothek;
- fünf Hauptbereiche Option A;
- klare Trennung von Programmen und eigenständigen Kursen;
- Bibliothek als kanonischer, nicht duplizierter Materialbestand;
- konkrete Kurs-/Materialversionierung;
- Upload extern erstellter Dokumente möglich, keine verpflichtende PDF-Vorlage beschlossen;
- globale Bibliothekssuche Option A;
- kompakte, zunächst eingeklappte Filter Option A;
- Reader-Navigation standardmäßig eingeklappt Option A;
- Inhaltsverzeichnis nur, sofern auslesbar, plus Seitenminiaturen und direkte Seitennavigation;
- kontinuierliches vertikales Scrollen;
- private, dokumentversionsgebundene Notizen und Lesezeichen;
- automatische geräteübergreifende Synchronisierung mit sichtbarem Speicherstatus;
- Erhalt persönlicher Notizen bei Berechtigungsverlust und grundsätzlich auch bei endgültiger Quellenentfernung, soweit gesetzliche Löschpflichten nicht entgegenstehen;
- Kontext-Meldebutton für Academy-Inhalte als spätere Integrationsanforderung, vollständiges Meldesystem noch separat zu planen.

### 3.3 Kurse, Programme und Qualifikationen

Die verfügbaren Erinnerungen enthalten 38 konkrete Beschlüsse zu:
- Trennung von Veröffentlichung, Verfügbarkeit/Zugriff und persönlichem Fortschritt;
- Verbergen, Archivieren, Reaktivieren und Versionieren;
- Verhalten neuer und laufender Teilnehmer bei neuen Kursversionen;
- Teilnahmebeginn, Fortschritt, Nachweisen, freiwilligen Inhalten;
- freiwilligem Abbruch, Wiederaufnahme und administrativer Beendigung;
- Berechtigungsverlust;
- Korrektur fehlerhafter Abschlüsse;
- Historie, Kontolöschung, Fehlzuordnungen und Duplikaten;
- stabilen Identitäten, Nebenläufigkeit und Datenintegrität;
- Mehrfachnutzung von Kursabschlüssen in Programmen;
- Versionierung von Programmen;
- Wiederqualifizierung und zentralen Qualifikationsnachweisen.

Die vollständige Detaildarstellung ist in `ACADEMY-DETAILED-SPECIFICATION.md`.

### 3.4 Empfehlungen und Academy-Benachrichtigungen

Gesichert sind:
- Empfehlungserstellung Option C (manuell plus regelbasiert automatisch);
- Deduplizierung Option B;
- Lebenszyklus Option C;
- Priorisierung Option B;
- persönliche Ausblendung Option B;
- Kursmeldungs-Lesestatus Option C;
- konkrete noch offene Regeln zu neuen unabhängigen Empfehlungen, Rückzug, Ablauf, Fristen und Erinnerungen.

### 3.5 Prüfungen, Examiner und Ergebnisfreigabe

Die verfügbaren Erinnerungen halten zahlreiche konkrete Abläufe fest, darunter:
- nur `test` und `final_exam`;
- Sichtbarkeit bei fehlenden Voraussetzungen;
- informierte Startbestätigung Option C;
- serverseitige Voraussetzungen, Timer, Autosave, Resume und Abgabe;
- Fragenstatus erst nach bestätigter Speicherung;
- Tastaturbedienung Option C mit gezielten Fokusverbesserungen;
- Examiner in Academy integriert;
- Claiming als bewusste Aktion getrennt vom Öffnen;
- serverpersistente Claims, 30-Minuten-Regel, 10-Minuten-Warnphase und Disconnect-Sonderfälle;
- sofortige Schreibsperre bei Claimverlust;
- freiwillige Freigabe, manuelle Übergabe und administrative Neuzuweisung;
- Revision ohne neuen Prüfungsversuch;
- Draft-Bewertung Option C mit notwendiger Backend-Erweiterung;
- getrennte Bewertungsfertigstellung und Ergebnisfreigabe;
- interne und veröffentlichte Ergebnissnapshots;
- manuelle erneute Freigabe nach Korrektur;
- Schutz nicht freigegebener Inhalte und differenzierte Sichtbarkeit der Historie.

### 3.6 Weitere globale Module

Die Gespräche haben die weiteren Portalbereiche als Auditumfang festgelegt, aber im verfügbaren Erinnerungskontext sind sie nicht mit derselben fachlichen Tiefe auskonzipiert wie die Academy. Für Dashboard, Nachrichten, Ankündigungen, Anträge, Kalender, Personalverwaltung, Berichte, Audit, Whitelist, Deployment, Login und Einstellungen liegen daher vor allem Prüffelder und Leitlinien vor.

Das ist keine Lücke, die mit erfundenen Produktentscheidungen gefüllt werden darf. Die Module müssen anhand des aktuellen Repositories und weiterer Gespräche konkret geprüft und konzipiert werden.

## 4. Statusregeln für zukünftige Ergänzungen

Jeder neue Eintrag in den Planungsdateien muss einem der folgenden Status zugeordnet werden:

- **BESCHLOSSEN:** vom Projektinhaber ausdrücklich gewählt oder bestätigt.
- **OFFEN:** eine Entscheidung fehlt, wurde vertagt oder benötigt eine Rückfrage.
- **VORSCHLAG:** fachliche/UX-Empfehlung, die noch nicht angenommen wurde.
- **PRÜFHYPOTHESE:** Vermutung oder frühere Beobachtung, die noch verifiziert werden muss.
- **TECHNISCHER BEFUND:** konkrete Prüfung eines bestimmten Branch-/Commit-Stands mit Dateipfaden/Evidenz.
- **ABGELÖST:** durch spätere ausdrückliche Entscheidung ersetzt; ursprünglicher Stand bleibt nachvollziehbar.

Eine Auswahl einer Option (A/B/C) ist verbindlich, wenn sie im verfügbaren Kontext ausdrücklich als gewählt bzw. beschlossen dokumentiert ist. Ein bloß diskutierter Vorschlag ist kein Beschluss.

## 5. Künftige Gesprächs- und Dokumentationsregel

Damit Details nicht erneut verloren gehen:

1. Vor jeder neuen Frage zuerst `DECISIONS.md`, die jeweilige Detail-Spezifikation, `OPEN-QUESTIONS.md` und `PROGRESS.md` abgleichen.
2. Bereits beantwortete Fragen nicht erneut stellen, außer ein echter Widerspruch oder eine bisher unbekannte technische Abhängigkeit macht es erforderlich.
3. Eine neue Entscheidung mit Kontext, gewählter Option, Konsequenzen, Sonderfällen und Datum dokumentieren.
4. Nutzerkommentare, Korrekturen und Einschränkungen nicht auf die bloße Option verkürzen.
5. Vorschläge und offene Punkte nicht als Entscheidungen darstellen.
6. Bei einer Änderung festhalten, welche frühere Regel ersetzt wurde und warum.
7. Technische Erkenntnisse mit Branch, Commit, Dateipfad und Prüfstatus festhalten.
8. Nach Änderungen die betroffenen Dokumente erneut abrufen und auf Vollständigkeit prüfen.
9. Claude-Review und andere externe Kritik getrennt von Nutzerentscheidungen protokollieren.
10. Vor jedem UX-/Accessibility-Vorschlag aktuelle Quellen recherchieren und die konkrete RCPD-Begründung dokumentieren.

