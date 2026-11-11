# Änderungsverlauf der Planungsdokumentation

## 2026-11-06 – Erste konsolidierte Baseline

- Planungsordner `docs/planning/` angelegt.
- Einstieg, Masterplan, Entscheidungsregister, offene Fragen und Fortschrittsübersicht erstellt.
- Verfügbare Beschlüsse zur Academy, Kurs-/Programmstatuslogik, Prüfungen, Examiner, Ergebnisfreigabe, Lernbibliothek, Reader, Notizen und Meldebutton zusammengeführt.
- Offene Punkte und ältere technische Prüfhypothesen ausdrücklich als offen bzw. erneut zu verifizieren gekennzeichnet.
- Bestehende technische Spezifikation `docs/EXAM_WORKSHOP_ARCHITECTURE_V3.8.md` bleibt eigenständig und unverändert.
- Keine Anwendungscode-, Backend-, API-, Datenmodell-, Berechtigungs- oder Produktionsdateien geändert.

## 2026-11-06 – Vollständige Portal-Redesign-Erweiterung

- Masterplan deutlich erweitert: Gesamtportal-Scope, Architekturgrenzen, Designrichtung, Phasen, Rollen-/Aufgabenorientierung, globaler Rahmen, Dashboard, Kommunikation, Anträge, Kalender, Personal, Berichte/Audit, Whitelist, Deployment, Login/Einstellungen, Academy und Cross-Module-Abhängigkeiten.
- `MODULE-INVENTORY.md` ergänzt: alle identifizierten Portalmodule mit Bestandswissen, Auditstatus und offenen Prüffeldern.
- Übergreifende Redesign-Beschlüsse aus den Gesprächen vom 05.–06.11.2026 in `DECISIONS.md` ergänzt.
- `OPEN-QUESTIONS.md` auf alle Portalmodule ausgeweitet; Vorschläge und nicht beschlossene UI-Ideen ausdrücklich gekennzeichnet.
- `README.md` und `PROGRESS.md` aktualisiert.
- Keine Anwendungslogik oder technischen Dateien geändert.


## 2026-11-06 – Vertiefte Rekonstruktion der Gesprächsentscheidungen

- Anlass: Die zuvor gemergte Gesamt-Redesign-Baseline hielt viele Themen zwar fest, verkürzte aber zahlreiche Abläufe, Begründungen, Randbedingungen und Sonderfälle.
- Neue `PORTAL-REDESIGN-DETAILS.md`: ausführliche übergreifende Leitlinien, Planungsablauf, UX-/Accessibility-Recherchepflicht, Modulkommentare, offene Konzeptbereiche und Cross-Module-Abhängigkeiten.
- Neue `ACADEMY-DETAILED-SPECIFICATION.md`: detaillierte Academy-Fachspezifikation zu Kursen, Programmen, Teilnahme, Versionierung, Historie, Wiederqualifizierung, Empfehlungen, Bibliothek, Reader, Notizen, Prüfungen, Examiner, Draft-Grading, Ergebnisfreigabe und kontextbezogener Meldung.
- Neue `RECONSTRUCTION-NOTES.md`: dokumentiert die verfügbare Erinnerungslage, die Grenzen einer wortgetreuen Rekonstruktion und Regeln zur zukünftigen Sicherung von Kommentaren und Randbedingungen.
- `DECISIONS.md` erweitert: Detailreferenzen und verbindliche Bedeutungsunterschiede ergänzt, insbesondere Veröffentlichung/Verfügbarkeit/Fortschritt, Claim/Öffnen, interner/freigegebener Ergebnisstand und historischer Abschluss/aktuelle Qualifikation.
- `MASTERPLAN.md`, `MODULE-INVENTORY.md`, `OPEN-QUESTIONS.md`, `PROGRESS.md` und `README.md` auf die neuen Detaildateien abgestimmt.
- Eine widersprüchliche Formulierung zu Materialversionen in den offenen Fragen korrigiert: fachlich ist die Bindung einer veröffentlichten Kursversion an eine konkrete Dokumentversion beschlossen; offen bleibt die technische Umsetzung.
- Ausschließlich Markdown-Dokumentation geändert. Kein Anwendungscode, kein Merge nach main und kein Deployment durch diese Revision.


## 2026-11-06 – Upload-/Veröffentlichungsworkflow Lernbibliothek

- **BESCHLOSSEN:** Option B – Upload legt zunächst einen Entwurf an; Veröffentlichung erfolgt erst nach bewusster separater Aktion.
- Detail-Spezifikation erweitert: Sichtbarkeit von Entwürfen, Trennung von Upload-/Veröffentlichungsfeedback, neue Entwurfsfassungen, Erhalt historischer Kursreferenzen, Status- und Fehlerzustände.
- Entscheidungsregister ergänzt; offene Fragen von bereits beschlossenen Punkten getrennt.
- Technischer Ist-Stand in `PROGRESS.md` festgehalten: heutiger Direktveröffentlichungsweg, Bearbeiten durch Überschreiben, Löschen aus dem Array, bestehende Kurscode-Berechtigung, PDF-Validierung und 25-MB-Request-Parser.
- UX-/Security-Recherche mit GOV.UK, DWP Design System und OWASP verlinkt.
- Nur Planungsdokumentation geändert; keine Anwendungscodeänderung, kein Merge und kein Deployment.

- **BESCHLOSSEN am 06.11.2026:** Veröffentlichungsberechtigung Option A – dieselbe berechtigte Person darf den eigenen Entwurf selbst bewusst veröffentlichen; kein Vier-Augen-Prinzip.

- **BESCHLOSSEN am 06.11.2026:** Pflichtmetadaten Option A – Titel, Kategorie und Dokumenttyp verpflichtend; Beschreibung und erforderlicher Rang optional; Materialcode und Dokumentversionskennung automatisch; Lesezeit nach Möglichkeit automatisch, sonst optional/entfällt.

- **BESCHLOSSEN am 06.11.2026:** Kategorien und Dokumenttypen Option A – zwei getrennte, kontrollierte Auswahllisten. Kategorie beschreibt das fachliche Thema, Dokumenttyp die Art/Funktion des Dokuments. Konkrete Werte bleiben anhand des tatsächlichen Materialbestands offen.

- **BESCHLOSSEN am 06.11.2026:** Lernbibliothek-Berechtigungen Option B – Kursverantwortliche dürfen Entwürfe innerhalb ihrer Zuständigkeit anlegen/bearbeiten und selbst veröffentlichen; Rücknahme/Archivierung veröffentlichter Materialien bleiben Admin und Colonel vorbehalten.
- PDF-Upload-Sicherheitsleitplanken sowie den Ist-Befund zu 25-MB-JSON-Limit, Base64-Upload, einfacher Präfix-/Zeichenprüfung und Firestore-Blob-Chunks ergänzt. Die 15-MB-Rohdateigrenze wurde anschließend ausdrücklich beschlossen.


- **BESCHLOSSEN am 06.11.2026:** maximale PDF-Rohdateigröße 15 MB (vor Base64-Kodierung); Request-/Hostinggrenzen müssen zusätzlichen Übertragungs- und JSON-Overhead berücksichtigen.
- PDF-Prüf- und Fehlerzustände ausgearbeitet: Signatur- und Parserprüfung, Ablehnung leerer/beschädigter/abgeschnittener/unlesbarer/passwortgeschützter PDFs, Sicherheitsprüfung vor Veröffentlichung, Fail-closed bei Scan-Ausfall sowie konkrete Nutzerfehlermeldungen. Technische Parser-/Scanner-/Quarantäneauswahl und OCR bleiben offen.


- **BESCHLOSSEN am 06.11.2026 – PDF-Sicherheitsprüfung Option A:** Serverseitige Signatur-/Parserprüfung; Ablehnung leerer, beschädigter, abgeschnittener, unlesbarer und passwortgeschützter PDFs; Malwareprüfung vor Veröffentlichung; Fail-closed bei negativem Scan oder Prüfdienstausfall. Technische Parser-/Scanner-/Quarantänearchitektur bleibt offen.
- Nächster Taxonomie-Arbeitsschritt vorbereitet: belegte Academy-Materialbeispiele einer vorläufigen Themen- und Dokumenttypstruktur zugeordnet; keine Kategorienwerte als beschlossen ausgegeben, da ein vollständiges Materialinventar fehlt.


- **BESCHLOSSEN am 06.11.2026:** Endproduktorientiertes iteratives Entwicklungsmodell für das gesamte RCPD-Redesign ergänzt. Gesamtplanung und fachlich vollständige Abschnittsplanung werden verzahnt; jeder Abschnitt wird mit Blick auf das endgültige Gesamtsystem recherchiert, konzipiert, prototypisch validiert, technisch geprüft, implementiert und qualitätsgesichert. Keine Zieländerung, keine Funktionskürzungen, keine Abstriche bei Recherche, UX, Accessibility oder Qualität. Vermeidbare Doppelarbeit vermeiden, notwendige Verbesserungen aus Tests zulassen.
- Neues Dokument `DEVELOPMENT-MODEL.md`; Masterplan, Gesamtportalplanung, Fortschritt und Planungs-README verweisen auf das Modell. Nur Markdown-Dokumentation im Draft-Branch aktualisiert; keine Anwendungscodeänderung, kein Merge, kein Deployment.


## 10.11.2026 – Academy-Fehlerreview und Reader-Notizen

- Fortschrittsstand auf den aktuellen `main`-Commit `c92b57c` aktualisiert; veraltete Hinweise auf die bereits abgeschlossene Material-/Reader-Integration ersetzt.
- Abschluss des systematischen Academy-Fehlerreviews mit tatsächlichem Test-/Buildstatus dokumentiert.
- Den nächsten Implementierungsschritt für persönliche Notizen/Lesezeichen im Reader festgehalten, einschließlich vorhandenem Backend, neuem UI-Umfang und ausdrücklich offenen Anforderungen (Mehrfachquellen und stabile Anker).
- CI-Ergebnis für PR #132 ergänzt: TypeScript-Prüfung, Produktionsbuild und 435/435 Tests erfolgreich; Browser-/Live-Firestore-Prüfung bleibt ausstehend.

- Ergänzender Reader-Schutz: nicht gespeicherte Notizänderungen werden beim Wechsel der Materialfassung vor dem Zurücksetzen des alten Reader-Kontexts zum Speichern eingereiht. CI auf Commit `b9cf2268340a2d9b2f44de14e5726322a85f30c3` erfolgreich: Lint, TypeScript/Build und 435/435 Tests; optionaler Render-Deploy übersprungen.


## 10.11.2026 – Academy Reader-Notizen und Mehrfachquellen

- PR #132 (`feat(academy): integrate private notes and bookmarks in reader`) wurde nach erfolgreicher GitHub-CI (435/435 Tests, TypeScript und Produktionsbuild) und Codeprüfung gemergt. Der optionale Render-Deploy-Hook war übersprungen; der tatsächliche Render-Deploymentstatus wurde nicht verifiziert. Eine manuelle Browser-/Live-Firestore-Prüfung ist nicht erfolgt.
- Folgeabschnitt begonnen: mehrere konkrete Materialversionen pro privater Notiz. Legacy-Notizen bleiben über ihre bisherige Einzelreferenz lesbar; neue API-Projektionen normalisieren diese zu einer Quellenliste.
- Reader erhält Verknüpfen/Lösen zusätzlicher Quellen; die zentrale Notizenansicht zeigt die Quellenliste. Keine Änderung an Freigaberegeln für Quelldokumente, keine PDF-Infrastruktur und keine neuen externen Dienste.


- PR #134 (`feat(academy): support multiple sources per private note`) gemergt. Quellenlisten sind versionsgenaue Referenzen, Legacy-Notizen bleiben kompatibel, Lesezeichen bleiben Einzelquellen; Reader und zentrale Notizenansicht unterstützen das Verknüpfen/Lösen und Anzeigen mehrerer Quellen. GitHub-CI erfolgreich: 436/436 Tests, TypeScript und Produktionsbuild. Optionaler Render-Deploy übersprungen; kein verifiziertes Produktionsdeployment und keine manuelle Browser-/Live-Firestore-Prüfung.
- Nächster bereits beschlossener Schritt gemäß Academy-Spezifikation Abschnitt 12.4/12.5: erhaltene Notizen kennzeichnen Quellen nach Berechtigungsverlust als „nicht zugänglich“ und nach endgültiger Dokumententfernung als „nicht mehr verfügbar“. Quellenreferenzen dürfen keinen indirekten Zugriff auf Materialien eröffnen.


## 2026-11-10 – Status privater Notizquellen (PR #135)

- Die Academy-Spezifikation und das Entscheidungsregister präzisieren: Der Quellenstatus richtet sich nach dem aktuellen Zugriff auf die konkrete versionierte Materialfassung, nicht nach einer früheren Kursteilnahme.
- Eine bedarfsgesteuerte, owner-isolierte Statusabfrage pro privater Notiz vermeidet zusätzliche Datenbankabfragen für sämtliche Quellen beim initialen Laden der Notizliste.
- Quellenstatus liefert keine Materialinhalte und gewährt keine indirekten Leserechte.
- GitHub-CI erfolgreich: 436/436 Tests, TypeScript-Prüfung und Produktionsbuild bestanden; PR-Vorlagenprüfung nach Ergänzung des Labels `feature` erfolgreich.
- Keine manuelle Browser-/Live-Firestore-Prüfung und kein verifiziertes Produktionsdeployment.


## 2026-11-10 – Stabile Textanker für private Notizen (PR #136)

- Projektinhaber hat die vorgeschlagene Strategie bestätigt: Anker je Quelle, Markdown-/Code-spezifische Metadaten, nur eindeutige Wiederfindung, keine automatische Versionsübertragung.
- Implementierung ergänzt optionales Datenmodell, serverseitige Validierung, Reader-Auswahl und Navigation sowie Unit-Tests.
- Detailreview verhindert konkurrierende Anker-/Notizspeicherungen bei ungespeicherten Eingaben; Markdown-Wiederfindung prüft zusätzlich den Überschriftenpfad.
- GitHub-CI erfolgreich: 443/443 Tests, TypeScript-Prüfung und Produktionsbuild; PR-Vorlagenprüfung ebenfalls erfolgreich.
- Keine manuelle Browser-/Live-Firestore-Prüfung und kein verifiziertes Produktionsdeployment.
- PDF-Seitenanker bleiben ausdrücklich zurückgestellt.


## 2026-11-10 – Lokale Wiederaufnahme der Reader-Leseposition (Draft-PR #141)

- Beschlossene Reader-Funktion ergänzt: Markdown- und Code-Leseposition wird lokal nach Teilnahme und exakter Materialversion getrennt gespeichert und beim erneuten Öffnen wiederhergestellt.
- Browser-Speicherfehler bleiben fail-soft; Positionen werden nicht serverseitig synchronisiert.
- Geräte-/browserübergreifende Wiederaufnahme bleibt ausdrücklich offen; keine PDF-Seitenpositionen.
- Tests für Versions-/Teilnahmeisolation, beide Inhaltsarten und ungültige lokale Speicherwerte ergänzt.
- Draft-PR #141 basiert auf dem aktualisierten `main` nach PR #138; der ID-Fix ist nicht Teil dieses PR-Diffs. Kein Merge/Deployment; CI und manuelle Browserprüfung stehen aus.


## 2026-11-10 – CI-Korrektur und Status der Reader-Leseposition

- PR #138: GitHub-CI für TypeScript/Build und 448/448 Tests erfolgreich; PR-Vorlagenprüfung erfolgreich. Per Squash gemergt (Commit `738faab5d3e85b94df02f188c2fdd3236b73674d`). Der anschließende Main-Workflow einschließlich Render-Deploy-Hook war erfolgreich.
- PR #141: saubere Draft-Implementierung der lokalen Reader-Leseposition auf dem aktualisierten `main`; kein Build-/Testlauf sichtbar, keine lokale Testausführung und keine manuelle Browserprüfung behauptet.
- PR #141 enthält den ID-Fix nicht; keine doppelte Commit-Historie.


## 2026-11-10 – Materialaktualisierung und vorsorgliche Kurssperre (PR #142 gemergt)

- Die verbindlichen Beschlüsse wurden um den Programmpin-Sonderfall, mehrere gleichzeitige Materialprüfungen und die Reaktivierungssperre bis zur Veröffentlichung einer angepassten Kursversion ergänzt.
- PR #142 in `main`: Materialveröffentlichung und Sperre betroffener veröffentlichter/verfügbarer Kurse erfolgen in einer Repository-Transaktion.
- Review-Einträge werden je Materialfassung gespeichert; Benachrichtigungen verwenden deterministische IDs und einen wiederholbaren Zustellmarker, damit ein Prozessabbruch zwischen den beiden Speichern keine verlorene oder doppelte Meldung erzeugt.
- Server blockiert neue Kursstarts bei offener Materialprüfung und bei archivierten Materialreferenzen, einschließlich noch nicht gestarteter, bereits gepinnter Programmkursversionen. Bestehende Teilnahmen behalten ihre Reader-Zugriffe.
- Die Kursverwaltung erhält Review-Entscheidungen und eine explizite Reaktivierungsaktion. Bei „offline lassen“ muss eine neue Kursversion die betroffenen Materialreferenzen aktualisieren oder entfernen; Veröffentlichung reaktiviert den Kurs nicht automatisch. Bis zur ausdrücklichen Aktivierung bleiben weitere Materialupdates prüfpflichtig. Archivierte Materialien setzen alle betroffenen veröffentlichten Kurse offline und müssen vor einer Reaktivierung aus einer neuen Kursversion entfernt werden.
- Tests für atomare Sperre, bestehende Teilnahmen, neue Starts, Programmpins, idempotente Review-Outbox, parallele Materialupdates und Reaktivierung nach aktualisierter Kursversion ergänzt. GitHub-CI: TypeScript/Produktionsbuild erfolgreich, 451/451 Tests bestanden; PR-Vorlagenprüfung und Main-Workflow einschließlich Render-Deploy-Hook erfolgreich. Manuelle Browser-/Live-Runtime-Prüfung wurde nicht durchgeführt.


## 2026-11-10 – Persistente Examiner-Claims und Bewertungs-Drafts (PR #149/#150)

- PR #149: serverseitige persistente Claims für manuelle Freitextbewertungen mit explizitem Claim/Release, Statusprojektion ohne vertrauliche Antwortinhalte für andere Prüfer, Inaktivitätswarnung und automatischer Freigabe.
- PR #150: einzelne Bewertungswerte werden serverseitig als Draft gespeichert; Prüfungsversion, Frage, Punkteobergrenze und aktuelle Claim-Zuständigkeit werden serverseitig geprüft. Drafts bleiben vor anderen Prüfern und Teilnehmern verborgen.
- Disconnect verlangt nach Wiederverbindung einen expliziten neuen Claim. Wiederholte Claim-Anfragen gelten nicht als tatsächliche Aktivität; Inaktivitäts- und Disconnect-Ablauf werden vor schreibenden Abschlussaktionen serverseitig geprüft.
- Tests decken Draft-Speicherung, Vertraulichkeit, Wiederaufnahme nach Disconnect, Claim-Historie, Ablauf vor Bewertung und das Löschen der Drafts nach endgültiger Bewertung ab.
- PR #150: GitHub-CI erfolgreich – TypeScript-Prüfung, Produktionsbuild, 453/453 Tests und PR-Vorlagenprüfung. Optionaler Render-Deploy-Hook übersprungen; Produktionsdeployment und manuelle Browser-/Live-Firestore-Prüfung nicht verifiziert.
- Squash-Merge PR #150: `99d7694abaa0be0254ce10f910c103a8d0db3d2b`.


## 2026-11-10 – Examiner-Übergabe, administrative Neuzuweisung und Benachrichtigungen (PR #152)

- Prüfer können eigene aktive Claims an andere für den konkreten Kurs berechtigte Prüfer übergeben; Admins und Colonels können einzelne Claims administrativ neu zuweisen.
- Der Verantwortungswechsel entzieht dem bisherigen Prüfer sofort die Schreibrechte. Bereits gespeicherte Drafts bleiben erhalten; lokale ungespeicherte Eingaben werden nur nach ausdrücklicher Auswahl verworfen oder vor der Übergabe gespeichert.
- Claim-Historie ergänzt um Übergabe, administrative Neuzuweisung, Warnungsbeginn, Freigabegrund und Benachrichtigungszustellmarker.
- Idempotente In-App-Benachrichtigungen für bisherigen und neuen Verantwortlichen, bevorstehende automatische Freigabe und automatische Freigabe; Direktnavigation zum konkreten Examiner-Vorgang.
- PR #152: GitHub-CI erfolgreich – TypeScript-Prüfung, Produktionsbuild, 453/453 Tests und PR-Vorlagenprüfung. Optionaler Render-Deploy-Hook übersprungen; Produktionsdeployment und manuelle Browser-/Live-Firestore-Prüfung nicht verifiziert.
- Squash-Merge PR #152: `465c55ab92164e5f47e30b041ac80ef678c718ec`.


## 2026-11-11 – Start des Academy-UX-/UI-Audits

- Neue Datei `ACADEMY-UX-AUDIT.md` mit erster read-only Bestandsaufnahme am Main-Commit `eb3d75b24b4d90f1f923e57f5ec527b03ea02408`.
- Tatsächliche Academy-Struktur, Komponenten, globale Portalnavigation, erste UX-Hypothesen und offene technische/visuelle Prüfaufträge dokumentiert.
- Erste Recherche etablierter Produkte und Standards aufgenommen: Canvas, Open edX, Moodle, GOV.UK Design System, WAI-ARIA APG, WCAG 2.2 und Nielsen Norman Group.
- README und PROGRESS um den neuen Audit-Einstieg und den tatsächlichen Main-Basisstand ergänzt.
- Rollenmatrix, granulare Kursrechte, Dashboard-Fortschrittsprojektion und tatsächliche Einstiege zu Examiner-/Legacy-Bereichen zusätzlich untersucht; offene Cross-Module- und Erreichbarkeitsrisiken dokumentiert.
- DWP Design System als zusätzliche Referenz für interne Verwaltungsnavigation und deren Accessibility-Anforderungen aufgenommen.
- Prüfungswarteschlangen, Korrektur-/Freigabelisten, Teilnehmer-Prüfungskatalog und Materialverwaltung auf Such-/Filter-/Sortiermöglichkeiten sowie Volumenabhängigkeiten geprüft.
- Keine Anwendungslogik, UI-Komponenten, API, Datenmodelle, Berechtigungen oder Deployment-Konfiguration geändert. Keine UX-/UI-Entscheidung vorweggenommen.


## 2026-11-11 – Academy-Redesign-Scope klargestellt und Planungsstand abgeglichen

- Nach Hinweis des Projektinhabers klargestellt: Das umfangreiche Academy-Konzept und die Informationsarchitektur liegen bereits vor. Es wird keine erneute Grundsatz-UX-Konzeption begonnen.
- Die fünf beschlossenen Hauptbereiche und die Integration des Examiner-Bereichs bleiben unverändert. Die bestehenden Detailentscheidungen zu Kursen/Programmen, Bibliothek, Reader/Notizen, Prüfungen, Claims, Ergebnisfreigabe, Korrekturen und Berechtigungen bleiben maßgeblich.
- `ACADEMY-UX-AUDIT.md` neu eingeordnet: ergänzende Prüfung der Umsetzung gegen vorhandene Beschlüsse und Vorbereitung des visuellen Redesigns, kein Ersatz für die frühere Spezifikation.
- Veraltete Academy-Offenpunkte in `OPEN-QUESTIONS.md` mit dem tatsächlichen Stand aus PR #132–#152 abgeglichen. Bereits umgesetzte Draft-Grading-, Claim-, Übergabe- und Ergebnisfreigabefunktionen werden nicht mehr als offen geführt.
- Revisionsrückgabe-Berechtigung Option A in `DECISIONS.md` festgehalten. Die Umsetzung der Revision/Action Requests bleibt als funktionale Restarbeit gekennzeichnet.
- `PROGRESS.md` präzisiert den Status: Academy-Fachkonzept weitgehend beschlossen, Kernfunktionen weit fortgeschritten, Examiner-Restarbeiten und Browser-/Live-Firestore-Abnahme offen; visueller Designabschnitt folgt auf Basis der bestehenden Entscheidungen.

## 2026-11-11 – Academy-Einstiegskacheln: Farb-, Oberflächen- und Illustrationsentscheidungen abgeglichen

- Die frühere Festlegung auf helle, matte Kachelflächen wurde als überholt markiert und durch kräftigere, satte, harmonische und jeweils einfarbige Kachelgrundflächen ersetzt.
- Neue verbindliche Oberflächenrichtung: sehr glatt und leicht glänzend, mit weicher weißer Lichtreflexion, dezenter Schattierung und weichen Schatten. Keine sichtbaren Farbverläufe, keine gebürstete Metallstruktur, kein Chrom-/Spiegellook.
- Die Reflexion darf beim Hover etwas deutlicher werden; minimale Anhebung und weiche Schatten sind als Richtung vorgesehen. Exakte Intensität und Bewegungswerte bleiben bis zum Prototyp offen. Fokusdarstellung und reduzierte Bewegung sind zu berücksichtigen.
- Die Kacheln sind leicht breitformatig, aber keine Banner; das genaue Seitenverhältnis bleibt prototypabhängig.
- Frühere Outline-/Lucide-Icon-Festlegungen wurden als überholt gekennzeichnet. Verbindlich bleiben fünf individuelle, ruhige geometrische SVG-Illustrationen; diese bleiben selbst matt und zurückhaltend und werden auf die kräftigeren Kachelfarben abgestimmt.
- Widersprüche zwischen älteren und neueren Festlegungen in DECISIONS.md und ACADEMY-DETAILED-SPECIFICATION.md bereinigt. Fachliche Bereiche, Navigation, Kachel-Inhalte, responsive Spaltenlogik, Abstände und Eckenradius wurden nicht verändert.
- Ausschließlich Planungsdokumentation aktualisiert; keine Anwendungsdateien, Tests, Berechtigungen oder Deployment-Einstellungen geändert. Änderungen bleiben auf dem bestehenden Draft-PR #155 und sind nicht gemergt/deployed.

## 2026-11-11 – Academy-Farbpalette und Bereichszuordnung bestätigt

- Nutzer hat den vorgeschlagenen Farbentwurf und die vorgeschlagene Zuordnung ausdrücklich bestätigt.
- Beschlossene Ausgangspalette: Übersicht Blau `#2864D9`; Kurse Türkis `#087F8C`; Lernbibliothek Violett `#6841B8`; Prüfungen Beere `#A33370`; Meine Notizen Grün `#287A45`.
- Die Farben dienen ausschließlich der Bereichsorientierung, nicht der Darstellung von Status.
- Die Ausgangswerte werden im visuellen Prototyp mit der beschlossenen glänzenden Oberfläche, weißen Reflexion, Textkontrasten, Fokuszuständen und responsiven Größen geprüft. Kleinere technische Feinjustierung ist möglich, Farbfamilien und Zuordnung bleiben dabei erhalten.
- Ausschließlich Planungsdokumentation aktualisiert; keine App-Implementierung, Tests oder Deployment-Änderungen vorgenommen.

## 2026-11-11 – Farbkonzept der Academy-SVG-Illustrationen bestätigt

- Nutzer hat Variante B bestätigt: neutrale, matte Grundpalette mit einem dezenten Akzent aus der jeweiligen Bereichsfarbfamilie.
- Die fünf Akzente beziehen sich auf die bereits beschlossene Zuordnung: Übersicht Blau, Kurse Türkis, Lernbibliothek Violett, Prüfungen Beere, Meine Notizen Grün.
- Gemeinsame dunkle Konturen/Details, zurückhaltende neutrale Füllflächen und höchstens drei bis vier bewusst eingesetzte Farben je Illustration als Gestaltungsrichtlinie festgehalten.
- Exakte Neutralfarben und Akzentabstufungen bleiben für die visuelle Ausarbeitung offen. SVGs bleiben matt und ohne künstliche Glanz-/3D-Effekte.
- Ausschließlich Planungsdokumentation aktualisiert; keine App-Implementierung, Tests oder Deployment-Änderungen vorgenommen.

## 2026-11-11 – Dezente Überlagerung der Academy-SVG-Motive bestätigt

- Nutzer hat Variante B bestätigt: Die Bestandteile der fünf Gegenstandsmotive dürfen sich leicht überlagern bzw. versetzt voreinander liegen; die räumliche Wirkung entsteht aus dem Motiv selbst, nicht aus zusätzlichen Dekorationsformen.
- Als verbindliche Einschränkung ergänzt: Die SVGs müssen mit den kräftigen Kachelflächen, der weichen weißen Reflexion, Text-Hierarchie und dem späteren portalweiten Designsystem harmonieren und dürfen nicht mit diesen Elementen konkurrieren.
- Überlagerung bleibt sparsam, matt und auf kleine Kachelgrößen lesbar; die konkrete Stärke wird im realen Kachelprototyp einschließlich Kontrast und responsiver Darstellung validiert.
- Nur Planungsdokumentation auf dem bestehenden Draft-PR #155 aktualisiert; keine App-Implementierung, Tests, Merge oder Deployment.


## 2026-11-11 – Frontale Perspektive der Academy-SVG-Illustrationen bestätigt

- Nutzer hat Variante A bestätigt: Alle fünf Academy-Illustrationen werden grundsätzlich frontal und gerade ausgerichtet dargestellt; isometrische oder schräge 3D-Perspektiven werden nicht verwendet.
- Die dezente räumliche Wirkung entsteht weiterhin ausschließlich durch wenige, gegenstandsbezogen überlagerte bzw. versetzte Bestandteile.
- Einheitliche Blickrichtung, Ausrichtung, Geometrie und Proportionen werden als gemeinsame Set-Regeln festgehalten.
- Die Illustrationen bleiben matt und zurückhaltend, damit sie mit den kräftigen, leicht glänzenden Kacheloberflächen, deren Reflexion sowie Titel und Beschreibung harmonieren. Die endgültige Wirkung wird im responsiven Kachelprototyp validiert.
- Ausschließlich Planungsdokumentation auf dem bestehenden Draft-PR #155 aktualisiert; keine App-Implementierung, Tests, Merge oder Deployment.


## 2026-11-11 – Flächenbetonte Gestaltung mit Konturen für Academy-SVGs bestätigt

- Nutzer hat Variante B bestätigt: Die fünf Illustrationen werden überwiegend aus matten, neutralen Füllflächen aufgebaut und durch klare dunkle Konturen sowie wenige Details definiert.
- Die jeweilige Bereichsfarbe bleibt ein zurückhaltender Akzent; die kräftige Kachelgrundfarbe wird nicht großflächig in den SVGs wiederholt.
- Einheitliche Konturwirkung und Geometrie sowie höchstens drei bis vier bewusst eingesetzte Farben pro Illustration wurden als gemeinsame Set-Regeln festgehalten.
- Keine SVG-Glanzreflexe, künstlichen Schatten oder 3D-Effekte. Kontrast, Lesbarkeit und Harmonie mit den kräftigen Kacheloberflächen werden im responsiven Kachelprototyp geprüft.
- Die Entscheidung ergänzt die bereits beschlossene frontale Perspektive und dezente Überlagerung. Ausschließlich Planungsdokumentation auf dem bestehenden Draft-PR #155 aktualisiert; keine App-Implementierung, Tests, Merge oder Deployment.
