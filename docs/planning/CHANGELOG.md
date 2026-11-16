## 2026-11-12 – Academy-Arbeitsfreigabe, Fehlerkorrekturen und vollständiges Unterseiten-Redesign

- Die ausdrückliche Arbeits- und Merge-Ermächtigung des Projektinhabers wurde präzisiert und erweitert: ChatGPT darf innerhalb der gesamten Academy eigenständig recherchieren, konzipieren, implementieren, testen, dokumentieren, PRs erstellen/reviewen und geeignete PRs selbst mergen. Die Grenzen zu portalweiten Änderungen, direkten main-Commits, Branch Protection, Sicherheitsreviews und kostenpflichtigen Diensten sind in DECISIONS.md, AGENTS.md und CONTRIBUTOR_ROLES.md festgehalten.
- PR #246 (Taxonomie-Refresh nach Bearbeitungskonflikten), PR #247 (Versionshistorie nach Veröffentlichung) und PR #248 (Autosave-Debounce beim Verwerfen abbrechen) wurden nach erfolgreichen GitHub-Build-/TypeScript-/Test- und PR-Vorlagenprüfungen gemergt. Render-Deploy-Hooks wurden in diesen PR-Workflows übersprungen; manuelle Browser-/Live-Firestore-Abnahme bleibt offen.
- Neue Datei ACADEMY-SUBPAGE-REDESIGN.md: aktueller Codebestand und Recherche zu allen Academy-Unterseiten, seitenweise Redesign-Richtung, gemeinsame Katalog-/Detail-/Editor-/Prüfungsmuster, WCAG-/Responsive-Anforderungen und Umsetzungsreihenfolge.
- DESIGN-SYSTEM-CONCEPT.md und ACADEMY-UX-AUDIT.md verweisen auf die neue Ausarbeitung. README.md und PROGRESS.md wurden auf den aktuellen Merge- und Arbeitsstand aktualisiert.
- Keine Anwendungscodeänderung in diesem Dokumentations-PR; keine Änderung an fachlichen Academy-Regeln, Berechtigungen, Datenmodellen oder Portalmodulen.

# Änderungsverlauf der Planungsdokumentation

## 2026-11-11 – Ergebnisfreigabe und Bewertungsverlauf bei Korrekturen (PR #189/#190)

- PR #189 speichert vor einer Korrektur den zuletzt freigegebenen Ergebnisstand. Während `pending_rerelease` bleibt dieser Snapshot für Teilnehmende sichtbar; erst nach erneuter Freigabe wird die korrigierte Fassung sichtbar.
- PR #190 hält ursprünglichen Prüfer (`reviewedByUid`) und tatsächlichen Bewertungsabschlusszeitpunkt (`reviewedAtIso`) unverändert. Korrekturen werden separat in `reviewCorrections` dokumentiert und verschieben die Historienposition nicht.
- Regressionstests decken alten Ergebnisstand während der Korrektur, neuen Stand nach erneuter Freigabe sowie die Unveränderlichkeit der ursprünglichen Abschlussmetadaten ab.
- Für beide PRs waren TypeScript-Prüfung, Produktionsbuild, Tests und PR-Beschreibungsprüfung erfolgreich. Optionale Render-Deploy-Hooks wurden übersprungen; Live-Deployment ist nicht bestätigt.

## 2026-11-11 – Sortierung abgeschlossener manueller Bewertungen (PR #187)

- Die Liste abgeschlossener manueller Bewertungen wird jetzt nach dem tatsächlichen Bewertungsabschluss (reviewedAtIso) sortiert, nicht nach dem Zeitpunkt der Teilnehmerabgabe.
- Die ursprüngliche Abgabezeit bleibt unverändert; die Sortierung mutiert die Repository-Ergebnisliste nicht.
- Ein Regressionstest deckt auseinanderlaufende Abgabe- und Bewertungszeitpunkte ab.
- TypeScript-Prüfung, Produktionsbuild, Tests und PR-Beschreibungsprüfung waren erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen; Live-Deployment ist nicht bestätigt.

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


## 2026-11-11 – Academy-Einstiegskacheln und Illustrationsentwürfe

- Verbindliche Spezifikation für die fünf Academy-Einstiegskacheln, Responsivität, gemeinsame SVG-Stilregeln und alle fünf konkreten Motive ergänzt.
- Fünf lokale flächige SVG-Entwürfe ergänzt und in `AcademyCenter.tsx` eingebunden.
- Einstiegsansicht und reguläre Übersicht getrennt; die horizontale Hauptnavigation erscheint erst nach Auswahl eines Bereichs.
- Keine API-, Datenmodell-, Rollen- oder Berechtigungsänderungen beabsichtigt.


## 2026-11-11 – Academy-Einstiegskacheln: visuelle Verfeinerung

- Bibliotheksillustration auf drei kompakt gruppierte, leicht überlagerte geschlossene Bücher mit dezenter Neigung umgestellt.
- Alle fünf SVGs auf eine gemeinsame optische Motivgröße (Richtwert 70–78 % der 128×128-Zeichenfläche) skaliert und zentriert.
- Kacheln auf satte einfarbige Bereichsflächen umgestellt; weiche weiße Reflexion, dezente Schatten und leicht verstärkter Hover-Reflex ohne Farbverläufe oder Metallstruktur.
- Responsive Raster auf Smartphone 1, Tablet 2 und Desktop 3 Spalten abgestimmt; Innenabstände und Textabstände responsiv vereinheitlicht.
- Beschreibungstexte auf Weiß für ausreichenden Kontrast gesetzt; Hover-Bewegung respektiert reduzierte Bewegungseinstellungen.
- Umsetzung ausschließlich auf `feature/academy-entry-illustrations`; keine API-/Datenmodell-/Berechtigungsänderung, kein PR, Merge oder Deployment. Lint, Build, Tests und Browserprüfung stehen noch aus.

## 2026-11-11 – Academy-Header, Rücknavigation und Seitenübergänge

- Academy-Header typografisch vergrößert und mit dezenter Oberzeile sowie kleinem blauem Akzent versehen.
- Breadcrumb „Academy > aktueller Bereich“ ergänzt; „Academy“ führt innerhalb des Moduls zurück zur Kachel-Startseite.
- Abstand zwischen Header und Inhalt leicht vergrößert.
- Dezente Kachel-Druckreaktion und kurzer Fade-/Vertikalübergang zum Zielbereich ergänzt; `prefers-reduced-motion` deaktiviert die Bewegung.
- Die fünf Kacheldesigns, Illustrationen, Farben und Beschreibungen bleiben unverändert.


## 2026-11-11 – Visuelle Gestaltungsgrundlagen und Arbeitsvereinbarung

- Neue Datei `DESIGN-SYSTEM-CONCEPT.md` als Arbeitskonzept für das visuelle Gesamtsystem und den ersten Academy-Gestaltungsabschnitt angelegt.
- Die neue Vereinbarung zur gestalterischen Verantwortung dokumentiert: eigenständige objektiv begründbare Detailentscheidungen; erneute Abstimmung bei subjektiven, prägenden Grundsatzentscheidungen; Schutz bereits erarbeiteter Funktionen, Beschlüsse und fertiger Oberflächen.
- Bestätigte Academy-Richtung und Schutz der fünfteiligen Kachel-Startseite festgehalten; globale Portalidentität, globale Navigation und Theme-Strategie ausdrücklich offen gelassen.
- Recherchequellen zu WCAG 2.2, USWDS Design Tokens/Farbe/Abständen/Typografie und Canvas Course Navigation im Konzept mit Übertragbarkeitshinweisen ergänzt.
- Masterplan, Portal-Redesign-Details, Entscheidungsregister, offene Fragen und Fortschritt aufeinander abgestimmt.
- Nur Planungsdokumentation geändert; keine Anwendungscode-/Style-/Komponenten-/API-/Datenmodell-/Berechtigungsänderung, kein Merge und kein Deployment.


## 2026-11-11 – Erster visueller Academy-Code-Prototyp

- Draft-PR #160 erstellt: erste visuelle Überarbeitung der internen Academy-Übersicht.
- Scoped Stylesheet `src/components/AcademyCenter.css` ergänzt und in `AcademyCenter.tsx` eingebunden.
- Bestehende Übersichtsinhalte, Navigation-Aktionen und fachliche Regeln erhalten; keine Änderung an der fertigen Kachel-Startseite.
- CI: TypeScript-Prüfung, Produktionsbuild und Tests erfolgreich; PR-Vorlagenprüfung erfolgreich.
- PR #160 anschließend am 11.11.2026 gemergt (Merge-Commit `691e679e5fb1f8e087647256f7211130ed6dcee7`). Kein bestätigtes Deployment; Browser-/Responsive-Abnahme noch offen.


## 2026-11-11 – Dezenter äußerer Academy-Hintergrund (PR #162 gemergt)

- Academy-only Hintergrund für die bislang weiße, variable Fläche des Hauptviewports ergänzt.
- Sanfte kühle Farbverläufe statt einer zweiten Wellenform; Übergang zur bestehenden inneren Academy-Fläche bleibt zurückhaltend.
- Bestehende Academy-Inhaltsbreite bleibt begrenzt; globale Portalgestaltung und andere Module sind nicht betroffen.
- Dark-Mode-Variante ergänzt.


## 2026-11-11 – Academy-Kursbereich (PR #164 gemergt)

- Teilnehmer-Kurskatalog mit klarer Überschrift, Suchfläche, Programm-Karten und kompakter Kursliste visuell überarbeitet.
- Veralteten Hinweis zur angeblich noch fehlenden Prüfungsnachweis-Verknüpfung im Kursdetail korrigiert.
- Keine Änderung an Kurs-/Programmstatus, Versionierung, Daten, APIs, Berechtigungen oder Verwaltungsfunktionen.


## 2026-11-11 – Academy-Kurs- und Lehrgangsdetails

- Detailansichten für Kurs und Programm visuell an den bereits überarbeiteten Kurskatalog angepasst.
- Vorhandene Nachweisbedingungen, Lernziele, Kapitel, Kursreferenzen und echte Fortschrittsdaten bleiben unverändert.


## 2026-11-11 – Academy-Kurs- und Lehrgangsdetails (PR #166 gemergt)

- Detailansichten für Kurse und Programme an den Kurskatalog angepasst.
- Vorhandene Lernziele, Kapitel, Nachweisbedingungen, Programmreferenzen und echte Fortschrittsdaten bleiben erhalten.


## 2026-11-11 – Academy-Lernbibliothek (PR #168 gemergt)

- Bibliothekskatalog mit klarer Such-/Sortier-/Filterzone und kompakten Materialeinträgen visuell überarbeitet.
- Readeroberfläche mit ruhiger Lesefläche und klarer Metadaten-/Aktionszone ergänzt.
- Legacy- und versionierte Materialien sowie alle Zugriffs-/Readerfunktionen unverändert gelassen.


## 2026-11-11 – Academy-Teilnehmer-Prüfungszentrum (PR #170 gemergt)

- Prüfungskatalog, Auswahlpanel, aktiver Prüfungsversuch und Ergebnisansicht visuell überarbeitet.
- Auswahlzustand der Prüfungen semantisch über aria-pressed ergänzt.
- Bestehende Status-, Zeit-, Autospeicher-, Bewertungs- und Freigabelogik unverändert.


## 2026-11-11 – Academy-Bereich Meine Notizen

- Notizen-/Lesezeichenliste, Privatsphäre-Hinweis und Editor visuell an die Academy-Designsprache angepasst.
- Private Daten, Quellenbezüge und bestehende Bearbeitungs-/Löschaktionen unverändert.


## 2026-11-11 – Academy-Bereich Meine Notizen (PR #172 gemergt)

- Privatsphäre-Hinweis, Notizen-/Lesezeichenliste und Editor visuell an die Academy-Designsprache angepasst.
- Notizdaten, Quellenbezüge, Zugriffsschutz und bestehende Aktionen unverändert.


## 2026-11-11 – Academy-Examiner-Bewertungsarbeitsplatz (PR #175 gemergt)

- Den Freitext-Bewertungsarbeitsplatz als geteilte Fläche mit einklappbarem Kontextpanel gestaltet.
- Vorhandene Vorgangsmetadaten werden übersichtlich gebündelt; Bewertung, Claim, Draft-Speicherung, Übergabe und Abschluss bleiben fachlich unverändert.


## 2026-11-11 – Academy-Ergebnisfreigabe und Korrekturarbeitsplatz (PR #177 gemergt)

- Ergebnisfreigabe-Einträge, Korrektureingaben, Begründung und Korrekturhistorie visuell klarer gegliedert.
- Ergebnisstatusfarben, Freigabeablauf, Berechtigungen und Auditdaten unverändert.


## 2026-11-11 – Academy-Kurs- und Programmverwaltung (PR #179 gemergt)

- Kurs-/Programmlisten und Editoren visuell an die Academy-Designsprache angepasst.
- Versionierung, Veröffentlichung, Validierung, Materialbindungen und Berechtigungen unverändert.


## 2026-11-11 – Academy-Versionierte Materialverwaltung (PR #181 gemergt)

- Materialkatalog, Auswahl, Metadaten, Editor und Versionshistorie visuell klarer gegliedert.
- Entwurfs-/Veröffentlichungs-/Archivierungsworkflow, Datenmodell, Zugriffsschutz und PDF-Aufschub unverändert.


## 2026-11-11 – Academy-Kategorien und Dokumenttypen (PR #182 gemergt)

- Verwaltungsoberflächen für Kategorien und Dokumenttypen mit konsistenter Formular-/Listenstruktur gestaltet.
- Bestehende Status-, Archivierungs-, Lösch- und Berechtigungsregeln unverändert.


## 2026-11-11 – Konsolidierter Academy-Designausbau

- Teilnehmerbereiche Übersicht, Kurse, Lernbibliothek, Prüfungen und Meine Notizen visuell ausgearbeitet.
- Rollen-/berechtigungsabhängige Examiner-, Ergebnisfreigabe-/Korrektur-, Kurs-/Programm- und Bibliotheksverwaltungsoberflächen ergänzt.
- Bestehende Kachel-Startseite, Daten-/Statuslogik, Berechtigungen, APIs und fachliche Abläufe unverändert.
- Live-Deployment und Browserabnahme stehen noch aus; Legacy-Prüfungsansichten und abschließender Bug-/Fehleraudit bleiben offen.


## 2026-11-11 – Sicherheitskorrektur: Reviewer-Whitelist-Guard (PR in Vorbereitung)

- Pending-Whitelist-Konten serverseitig von Review-Queue und sämtlichen manuellen Reviewer-Aktionen ausgeschlossen.
- Admin-Reassignment verlangt ebenfalls ein aktives Reviewer-Konto; pending Zielkonten können keine Prüfungszuweisung erhalten.
- HTTP-Integrationstests decken Queue, Claim, Draft, Grade, Transfer, Release, Activity, Disconnect und Reassignment ab.


## 2026-11-11 – Reviewer-Whitelist-Guard (PR #185)

- Pending Whitelist-Konten serverseitig von manueller Prüfungsbewertung und allen Reviewer-Claim-Aktionen ausgeschlossen.
- Pending Zuweisungsziele werden abgewiesen.
- HTTP-Regressionstests ergänzt; TypeScript/Lint, Build und vollständiger Testsatz in CI erfolgreich.
- PR #185 gemergt; Render-Deploy-Hook übersprungen, Live-Deployment nicht bestätigt.


## 2026-11-11 – Academy-Rücknavigation und Bereichsakzente (PR #192/#193)

- Verbindliche Regeln für einen separaten Rückkehr-Button zur Kachelansicht, die Bereichsfarbe in der horizontalen Navigation und den gezielten Akzenteinsatz dokumentiert.
- In allen internen Academy-Ansichten einen eigenständigen Rückweg zur Kachelansicht ergänzt; den Breadcrumb nicht länger als Rücknavigation verwendet.
- Aktive Hauptnavigation markiert Übersicht, Kurse, Lernbibliothek, Prüfungen und Meine Notizen mit dem jeweiligen Bereichsakzent. Verschachtelte Ansichten ordnen sich dem zugehörigen Bereich zu.
- Kachelstartseite, Statusfarben und fachliche Logik unverändert.
- PR #193: TypeScript/Build, Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Live-/Browserabnahme steht aus.


## 2026-11-12 – Academy-Unterbereiche und Kachelreflex

- Wiederherstellung des zuvor beschlossenen weichen weißen Kachelreflexes (dezent im Ruhezustand, stärker bei Hover; Illustrationen unverändert).
- Visuelle Vereinheitlichung der Bereiche Kurse, Lernbibliothek, Prüfungen und Meine Notizen einschließlich Dark Mode, responsiver Anordnung und Tastaturfokus.
- Ältere Prüfungslisten-Auswahl auf natives Button-Verhalten mit Tastaturbedienbarkeit umgestellt; keine fachliche Funktion entfernt.
- Keine Änderungen an Berechtigungen, APIs, Datenmodellen oder fachlichen Statuslogiken.
- Browser-/Responsive-Abnahme und Deployment stehen noch aus.

## 2026-11-11 – Zentrale Teilnehmer-Prüferhistorie (Implementierungsbranch)

- Examiner-Bereich erhält eine zentrale Teilnehmerakten-Suche und eine kompakte, nach Bewertungsabschluss sortierte Historienansicht.
- Neue API-Projektion begrenzt Datensätze serverseitig auf die Kurszuständigkeiten des angemeldeten Prüfers.
- Vollständige Bewertungsdetails bleiben auf beteiligte Prüfer und Admins/Colonels beschränkt; andere berechtigte Prüfer sehen ausschließlich Status und Zuständigkeit.
- Tests für Kurs-Scope, Whitelist-Sperre und Detailvertraulichkeit ergänzt.
- Noch nicht gemergt; CI, unabhängiges Review und Browser-/Live-Abnahme ausstehend.

## 2026-11-12 – Examiner-Unterbereiche in der Academy erreichbar gemacht (Folge-PR)

- Die vorhandene Prüfungs-Unter-Navigation ist jetzt auch bei geöffneten Examiner-Ansichten sichtbar.
- „Offene Bewertungen“ wird für Admins, Colonels und berechtigte Kursausbilder angeboten; „Korrekturen & Freigaben“ nur für Admins und Colonels.
- Die bestehende serverseitige Zugriffskontrolle und die vorhandenen Examiner-/Korrekturkomponenten bleiben unverändert. Es wird keine sechste Academy-Hauptrubrik eingeführt.
- Branch `fix/academy-exam-review-navigation`; CI/Review und spätere Browserprüfung stehen noch aus.

## 2026-11-12 – Legacy-Materialroute: Kursbereichsprüfung (Folge-PR)

- Die PUT-Route für Legacy-Material prüft jetzt die Berechtigung sowohl für den gespeicherten Quell-Kurscode als auch für den Ziel-Kurscode einer Änderung. Damit kann ein scoped Kursausbilder kein fremdes Material per Codewechsel übernehmen.
- Ein HTTP-Regressionstest deckt den Cross-Scope-Takeover ab und prüft, dass abgewiesene Änderungen keine Materialdaten verändern.
- Implementierung auf Branch `fix/academy-legacy-module-scope-authorization`; CI/Review noch ausstehend. Keine Browser-/Live-Firestore-Prüfung behauptet.


## 2026-11-12 – Academy-Lernbibliothek: Fehlerwiederherstellung und Fortschrittsabgleich (PR #202–#210)

- Historischen Status von PR #202 korrigiert: Das Lernbibliotheks-Redesign wurde am 12.11.2026 gemergt; TypeScript, Produktionsbuild, Tests und PR-Vorlagenprüfung waren erfolgreich. Der Render-Deploy-Hook wurde übersprungen; eine Browser-/Live-Firestore-Abnahme ist nicht belegt.
- PR #203/#204 ergänzten Rückkehr- und Reader-Wiederherstellungsaktionen; PR #205 dokumentierte die ausdrückliche Arbeitsfreigabe für die Academy.
- PR #206 ergänzte programmatisch erkennbare Statusmeldungen für dynamische Suchtrefferzahlen; PR #207 ergänzte gezielte Wiederholungsaktionen für temporäre Fehler beim Abruf des Bibliothekskatalogs und einzelner Materialien.
- PR #208/#210 aktualisierten den Planungsindex und den dokumentierten Fortschritt nach den Bibliotheksänderungen.
- PR #209 ergänzte eine Wiederholungsaktion für temporäre Fehler beim initialen Laden privater Notizen; Notiz- und Lesezeichenaktionen bleiben während eines wiederholbaren Ladefehlers gesperrt.
- Keine der genannten Änderungen veränderte die bestehenden Materialversionen, Veröffentlichungs-, Archivierungs-, Rollen-, Berechtigungs- oder Datenschutzregeln.
- GitHub Actions für die jeweiligen Anwendungs-PRs meldeten TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung als erfolgreich; optionale Render-Deploy-Hooks wurden übersprungen. Manuelle Browser-/Screenreader-/Live-Firestore-Abnahme bleibt offen.

## 2026-11-12 – PR #250 gemergt und Lehrgang-Terminologie vereinheitlicht

- PR #250 wurde mit Commit `1a4bb48841c017b7a2f8cc935660754c27523abc` gemergt: getrennte Notizenübersicht und fokussierter Editor, sichtbarer Quellenkontext, klare Aktionshierarchie und Schutz ungespeicherter Änderungen beim Verlassen.
- GitHub Actions: TypeScript-/Produktionsbuild-/Testworkflow und PR-Vorlagenprüfung erfolgreich; optionaler Render-Deploy-Hook übersprungen. Manuelle Browser-/Screenreader-/Live-Firestore-Abnahme bleibt offen.
- Neue verbindliche UI-Terminologie: übergeordnete Ausbildungseinheit heißt in sichtbaren Academy-Texten „Lehrgang“; technische Program-Entität/API bleibt unverändert.
- PR #251 vereinheitlicht die Terminologie in Teilnehmer- und Verwaltungsoberflächen und aktualisiert die Detail-Spezifikation sowie das Entscheidungsregister.

## 2026-11-12 – PR #251: Lehrgang-Terminologie und Übersichtsklarstellung

- Teilnehmer- und Verwaltungsoberflächen verwenden durchgehend „Lehrgang“ statt „Programm“; technische `Program`-Namen bleiben unverändert.
- Die Kurs-/Lehrgangsverwaltung und die Academy-Startkachel verwenden konsistente, verständliche Bezeichnungen.
- Die Übersichts-Kachel beschreibt nun den tatsächlichen Zweck der Übersicht (Aufbau/Beziehungen erklären), statt persönliche Fortschrittsfunktionen anzukündigen.
- Veraltete PR-#250-Statusangaben in den Planungsdokumenten wurden berichtigt.
- PR #251 am 12.11.2026 mit Commit `611f701df54ecb302a4fcf84005544beee4485a1` gemergt. CI erfolgreich: TypeScript/Produktionsbuild/Testworkflow, 455/455 Tests; PR-Vorlagenprüfung erfolgreich; optionaler Render-Deploy-Hook übersprungen. Manuelle Browser-/Accessibility-Abnahme offen.

## 2026-11-12 – PR #252: Kursdetail-Kontext und Katalogzustände

- Die Academy-Übersicht hat nur noch eine globale h1; die interne Überschrift ist eine h2.
- Lernziele und Kapitel bleiben nach Kursstart sichtbar und stammen weiterhin aus derselben gepinnten Kursversion.
- Suchergebnislosigkeit wird von einem tatsächlich leeren veröffentlichten Katalog unterschieden.
- Vorhandene Versionen ohne Kurzbeschreibung werden nicht mehr als fehlende Veröffentlichung missverstanden.
- Keine Änderungen an Daten, APIs, Berechtigungen, Status- oder Abschlusslogik. PR #252 am 12.11.2026 mit Commit `a952a59360f3ef1c47c5517acf0b9dd78f1d9da0` gemergt; CI erfolgreich (TypeScript, Produktionsbuild, 455/455 Tests, PR-Vorlagenprüfung). Manuelle Browser-/Accessibility-Abnahme offen.

## 2026-11-12 – PR #253: Informierte Prüfungsstartbestätigung und Clearance-Schutz

- Vor dem verbindlichen Start wird geprüft, ob ein aktiver Versuch im gewählten Prüfung-/Kurskontext existiert.
- Neue Versuche werden erst durch „Prüfung verbindlich starten“ angelegt. Laufende Versuche werden über „Laufenden Versuch fortsetzen“ idempotent fortgesetzt; dabei wird kein weiterer Versuch gezählt.
- Die Bestätigung zeigt das tatsächliche Zeitlimit, die Versuchslimitierung und die Fortsetzungsregeln. 0/null bei maxAttempts und 0 bei timeLimitMinutes werden als unbegrenzt/ohne Zeitlimit behandelt.
- Numerische minClearance-Werte werden nicht mehr im Teilnehmerkatalog oder in der UI offengelegt; die serverseitige Filterung bleibt erhalten.
- PR #253 wurde am 12.11.2026 mit Commit `8df61a5d1e04df91126955aa76825c818b7bc00f` gemergt. CI erfolgreich: TypeScript, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung; optionaler Render-Deploy-Hook übersprungen. Manuelle Browser-/Accessibility-Abnahme offen.

## 2026-11-12 – PR #255: Examiner-Panel-Semantik und Fokusführung

- Übergabe-/Neuzuweisungs- und Freigabepanels in offenen Bewertungen sind korrekt als beschriftete Inline-Regionen statt als nicht-modale Dialoge ausgezeichnet.
- Fokus geht beim Öffnen auf die jeweilige Überschrift und beim Abbrechen zum auslösenden Button zurück.
- Vorgangskontext und Korrekturhistorie sind standardmäßig eingeklappt und über native Disclosure-Elemente erreichbar.
- PR #255 am 12.11.2026 mit Commit bcce59fb9f967299105313ce769fc6bc549e885e gemergt. CI erfolgreich: TypeScript, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung; optionaler Render-Deploy-Hook übersprungen. Manuelle Browser-/Screenreader-Abnahme offen.


## 2026-11-12 – Offene PRs fachlich abgeglichen und Entscheidungen nachgeführt

- Die offenen Dokumentations-PRs #155, #196 und #197 wurden mit dem aktuellen Stand von `main` abgeglichen. Bereits in späteren Änderungen enthaltene Revisionszuständigkeit aus #196 wird nicht doppelt übernommen; der veraltete PR wird geschlossen.
- Die noch fehlenden, zuvor bestätigten Empfehlungsregeln aus #155 wurden gezielt in DECISIONS.md und ACADEMY-DETAILED-SPECIFICATION.md nachgeführt. Nur Fristen/Erinnerungen bleiben offen.
- Die in #197 dokumentierte Entscheidungsfreiheit wurde auf den aktuellen Dokumentationsstand portiert: eigenständige objektive UX-/Accessibility-Entscheidungen sowie kritischere Entscheidungen nach gründlicher Recherche und dokumentierter Abwägung; subjektive globale Identitätsentscheidungen bleiben zustimmungspflichtig.
- Die Materialformular-Validierungsverbesserung aus #244 wird auf aktuellem `main` neu aufgesetzt, statt den 16 Commits zurückliegenden Branch zu mergen.
- PR #257 (Entfernung nicht erreichbarer Legacy-Editorpfade) ist bereits gemergt; CI erfolgreich, manuelle Browserabnahme bleibt gesondert.

## 2026-11-12 – Academy-PR-Bestand bereinigt

- PR #246, #247, #248, #255, #256, #257 und #261 wurden gemergt. PR #261 enthält die verbindliche Empfängerregel für Revisions-Action-Requests; Merge-Commit: `0d47a189bfeea62d101f78abc43445ade78d8981`.
- PR #155 wurde geschlossen, weil seine relevanten Empfehlungsentscheidungen bereits selektiv auf dem aktuellen `main` dokumentiert waren; der stark divergierte Alt-Branch wurde nicht als Ganzes übernommen.
- PR #196 wurde durch die aktuelle, gemergte Dokumentationsübernahme in #261 ersetzt.
- PR #197 wurde geschlossen, weil Entscheidungsfreiheit und Recherchepflicht bereits im aktuellen Planungsstand verankert waren.
- PR #244 wurde geschlossen, weil sein Validierungs-/Accessibility-Fix bereits im aktuellen `main` enthalten war.
- Abschließende GitHub-API-Abfrage am 12.11.2026: keine offenen PRs. Noch offene fachliche und technische Arbeiten verbleiben in OPEN-QUESTIONS.md/PROGRESS.md und sind nicht durch das Schließen der Alt-PRs erledigt.

- Ergänzende Accessibility-Korrektur in PR #287: sichtbare Tastatur-Fokusmarkierung für die beiden Gruppen der Prüfungs-Unter-Navigation ergänzt.

- 13.11.2026: Lernbibliothek-Designverfeinerung (PR #288): violette Bereichsidentität in Katalogkarten, Metadaten, Fokus- und Primäraktionen konsistent umgesetzt; Kartenbeschreibungen kompakt gehalten, Reader neutral und lesefokussiert; mobile Such-/Sortierflächen und Aktionen verbessert. Keine Funktions-, Daten- oder Berechtigungsänderung.
- Ergänzende Prüfung in PR #288: Dark-Mode-Fokusindikatoren der Bibliothekskarten und Blockquote-Kontrast in der Materialeditorvorschau korrigiert; keine Funktions- oder Datenänderung.

## 13.11.2026 – Materialeditor und Taxonomie

- Visuelle Hierarchie des bestehenden Materialeditors und der Kategorie-/Dokumenttypverwaltung nachgeschärft.
- Inhaltliche und technische Abläufe bleiben unverändert; keine Berechtigungs-, Datenmodell- oder API-Änderungen.
- White-/Dark-Mode-/Materialinhalts-Sichtbarkeitsfehler wird separat untersucht, nicht durch diese CSS-Verfeinerung überdeckt.
- Ergänzende Prüfung in PR #289: Dark-Mode-Fokusindikator der Materialverwaltung kontrastreicher gestaltet; keine Funktions-, Daten- oder Berechtigungsänderung.

## 2026-11-15 – Academy-Unterseiten: Kursdetail, Prüfungsnavigation, Lernbibliothek und Materialverwaltung

- **PR #286:** Kursdetail zeigt die tatsächliche veröffentlichte Kursversion sowie die unterschiedlichen Zustände Beschreibung fehlt / Veröffentlichung fehlt / archiviert / derzeit nicht verfügbar verständlich an. Startaktion bleibt an bestehende Veröffentlichungs- und Verfügbarkeitsregeln gebunden. Merge: `ca2fcb0c31d2d317c51a8c880ea639f0ecbbf896`.
- **PR #287:** Prüfungsnavigation trennt Teilnehmerwege und Prüferaufgaben; Admin-/Colonel-Beschriftungen passen zu den vorhandenen Rechten. Sichtbare Tastatur-Fokusmarkierung ergänzt. Merge: `df4f73a172ab29b056fffde78196dd3cac23ed2f`.
- **PR #288:** Bibliotheksbereichsakzent und Kartenhierarchie konsolidiert; Dark-Mode-Fokus der Themen-/Materialkarten und Blockquote-Kontrast der Materialvorschau verbessert. Merge: `d5b742363ff4cd0b4d7f8fb6b37eb5e7c576c8cf`.
- **PR #289:** Materialeditor-Gruppen, Bearbeiten-/Vorschau-Umschaltung, Aktionshierarchie und Taxonomieaktionen überarbeitet; Dark-Mode-Fokus der Materialverwaltung verbessert. Merge: `8f25d303165f466f9b295a265caa5a07566209d6`.
- Für alle vier PRs waren TypeScript/Produktionsbuild, Servertests und PR-Vorlagenprüfungen erfolgreich. Die optionalen Render-Deploy-Hooks wurden übersprungen. Manuelle Browser-/Responsive-/Screenreader-/Live-Firestore-Abnahme bleibt offen.

## 2026-11-15 – Vollständiges Academy-Usability-Redesign gestartet

- Die Academy-Redesign-Freigabe umfasst nun ausdrücklich alle Unterbereiche, tieferen Arbeitsansichten und Bedienelemente.
- UI-Filter, Suche, Sortierung und Gruppierung dürfen anhand bestehender, zugänglicher Daten und fachlich bereits definierter Zustände verbessert werden; keine neuen Geschäfts-/Status-/Berechtigungsregeln.
- Die fünf Academy-Einstiegskacheln und die fünfteilige Hauptnavigation, bestehende Bereichsfarben, Illustrationen, Datenschutz-, Versions-, Veröffentlichungs- und Prüfungsregeln bleiben geschützt.
- Ausführliche Zielkonzeption, Farb-/Statussemantik, Bedienmuster, Responsive-/Accessibility-Regeln, Risiken und Umsetzungskosten sind in den zugehörigen Academy-Planungsdokumenten festgehalten.

## 2026-11-15 – Academy-Usability-Redesign: Bibliothek, Reader und Kurskatalog

- Bibliothekssuche, Sortierbenennungen, sichtbare aktive Kriterien, Filterrücksetzung und keine-Treffer-Meldung verbessert.
- Größere Materialkacheln als kompakte vertikale Trefferliste neu strukturiert; Materialnavigation im Reader ist optional und hält die Ergebnisreihenfolge/Suche/Filter konsistent.
- Eine gemeinsame sichere Markdown-Darstellung für Bibliotheksreader, Kursmaterialreader, Materialeditorvorschau und private Notizvorschau eingeführt. Hell-/Dunkelkontraste für Tabellen, Inline-Code, Blockquotes und Links sind explizit.
- Kurskatalog um UI-Filter für die vorhandenen Teilnahmezustände und Sortierung nach Titel bzw. veröffentlichtem Datum ergänzt.
- Bereichspetrol der Kurse von Statusmarkern und Aktionen getrennt; Archiviert/nicht verfügbar wird neutral beschrieben.
- PR #290 ist am 15.11.2026 in `main` integriert (Merge-Commit `a223cd02bd5edd338390319abc7ee94d83f3cd10`); Build-/Testworkflow und PR-Vorlagenprüfung waren erfolgreich. Manuelle Browser-/Accessibility-QA bleibt offen.


## 15.11.2026 – Academy-Farbsemantik und Markdown-Navigation
- Interne Markdown-Links und Textanker bleiben im selben Tab; nur externe HTTP(S)-Links öffnen einen neuen Tab.
- Die Notizen-Bereichsfarbe Grün wird auf einen zurückhaltenden Identitätsakzent begrenzt. Speicheraktion, Eingabefokus und Flächen erhalten neutrale Aktions-/Oberflächenfarben; die destruktive Löschaktion bleibt als solche unterscheidbar.


## 15.11.2026 – Gemeinsame Academy-Interaktionsbasis
- Gemeinsame semantische Design-Tokens und Aktionsvarianten eingeführt; Bereichsfarben sind von Aktionen, Auswahl, Fokus und Lebenszyklusstatus getrennt.
- Kurs-, Bibliotheks-, Materialverwaltungs-, Authoring- und Prüfungsbedienelemente auf neutrale Primär-/Sekundär-/Destruktivaktionen umgestellt.
- Archivierte Materialien, Entwürfe und ausstehende Bewertungen werden neutral statt irreführend amber/grün dargestellt.
- Prüfungsrunner: beantwortete Fragen sind mit Häkchen und Screenreader-Text erkennbar, nicht nur grün; Fortschritt neutral; Zeitwarnung abgestuft (Amber bei fünf Minuten, Rot bei einer Minute).


## 2026-11-15 – Private Notizen: bessere Suche, Filter und sichere Konfliktbehandlung

- Notizenübersicht nach Eintragsart filterbar und nach letzter Änderung oder Titel sortierbar; Suche kann einzeln gelöscht werden und aktive Bedingungen werden sichtbar angezeigt.
- Notiz-/Bookmark-Karten erhalten eine besser lesbare Informationshierarchie mit neutralen Typmarkierungen, gekürzter Inhaltsvorschau und Schlagwörtern.
- Material-/Versions-IDs werden nicht mehr als Quellenbezeichnung angezeigt, wenn die bestehende API nur IDs und Status liefert.
- Notizeditor erhält sichtbare Save-/Conflict-Rückmeldung. Bei 409 wird die aktuelle owner-private Fassung geladen, während lokale Eingaben erhalten bleiben; Übernahme nur nach expliziter Bestätigung.
- Notiz löschen und Lesezeichen entfernen werden getrennt benannt. Keine neuen Berechtigungen, API-Verträge oder Datenmodelle.
- Umsetzung auf `redesign/academy-notes-workspace`; CI und manuelle Browser-QA stehen noch aus.


## 2026-11-15 – Kurs- und Lehrgangsverwaltung: Katalogbedienung

- Gemeinsame Suche über Kurs-/Lehrgangstitel, Kennungen und Kurzbeschreibungen ergänzt.
- Veröffentlichungsfilter verwendet nur die vorhandenen Zustände Entwurf, Veröffentlicht und Archiviert; keine Status- oder Verfügbarkeitsänderung.
- Sortierung nach Kennung, Titel oder vorhandenem Änderungszeitpunkt ergänzt; ungültige Zeitstempel landen am Ende.
- Ergebniszahlen, getrennte Leerzustände und gemeinsames Zurücksetzen der Such-/Filterkriterien ergänzt.
- Keine Backend-, Berechtigungs-, Datenmodell- oder Infrastrukturänderung.


## 2026-11-15 – Kurs- und Lehrgangsverwaltung: Katalogbedienung (PR #297)

- Gemeinsame Suche über Kennungen sowie Titel und Kurzbeschreibungen aus Entwürfen und veröffentlichten Fassungen.
- Veröffentlichungsfilter nur über die vorhandenen Zustände Entwurf, Veröffentlicht und Archiviert.
- Sortierung nach Kennung, Titel oder dem neuesten tatsächlichen Änderungszeitpunkt aus Entwurfs- und Master-Zeitstempel.
- Ergebniszahlen, getrennte Leerzustände und gemeinsames Zurücksetzen.
- PR #297 gemergt; `bun run lint`, `bun run build`, `bun run test` (455/455) und PR-Vorlagenprüfung erfolgreich.

## 2026-11-15 – Materialverwaltung: Katalogbedienung

- Veröffentlichungsfilter für Entwürfe, veröffentlichte Materialien, veröffentlichte Materialien mit neuem Entwurf und archivierte Materialien.
- Sortierung nach tatsächlicher letzter Änderung (neuesten Zeitstempel aus Entwurf und Master), Titel oder Kennung.
- Suche/Filter-Rücksetzung und aussagekräftiger keine-Treffer-Zustand.
- Zeit-Sortierung im Kurs-/Lehrgangs-Authoring ebenfalls auf den neuesten Entwurfs-/Master-Zeitstempel korrigiert.
- Keine API-, Rollen-, Berechtigungs- oder Datenmodelländerung.


## 2026-11-15 – Materialverwaltung: Katalogbedienung (PR #298)

- Materialliste mit Veröffentlichungs-/Entwurfsfilter, alphabetischer Titel-/Kennungssortierung und Sortierung nach neuestem tatsächlichen Zeitstempel aus Entwurf und Master.
- Veröffentlicht mit neuer Arbeitsfassung bleibt ein aus bestehenden Revisionsdaten abgeleiteter Filterzustand, kein neuer Geschäftsstatus.
- Suche/Filter-Rücksetzung und differenzierte keine-Treffer-Meldung.
- Kurs-/Lehrgangs-Authoring verwendet für „Zuletzt geändert“ ebenfalls den neuesten Wert aus Entwurf und Master.
- PR #298 gemergt; `bun run lint`, `bun run build`, `bun run test` (455/455) und PR-Vorlagenprüfung erfolgreich.

## 2026-11-15 – Taxonomieverwaltung: Kategorien und Dokumenttypen

- Suche nach Name/Beschreibung ohne Platzhalter als einzige Suchanleitung; sichtbare Labels und Hinweistexte.
- Optionale Statusfilter für Aktiv/Archiviert, alphabetische Sortierung, Trefferzahl und gemeinsames Zurücksetzen.
- Keine Änderung an Taxonomie-API, Statuswerten, Revisionen oder Schutz bestehender Materialzuordnungen.
- Such-/Formularfelder und Aktionen auf mindestens 44 px Zielhöhe vereinheitlicht.


## 2026-11-15 – Taxonomieverwaltung: Kategorien und Dokumenttypen (PR #299)

- Suche nach Name/Beschreibung, Filter Aktiv/Archiviert, alphabetische Sortierung, Trefferzahl und Rücksetzung.
- Such-/Formularfelder und Aktionen auf mindestens 44 px Zielhöhe.
- PR #299 gemergt; `bun run lint`, `bun run build`, `bun run test` (455/455) und PR-Vorlagenprüfung erfolgreich.

## 2026-11-15 – Kursdetail und Nachweisaktion

- Nachweiserfassung bleibt bis zum Abschluss des Detail-Refreshs gesperrt; ein zusätzlicher Handler-Guard weist Requests während eines laufenden Speichervorgangs ab.
- Bei fehlgeschlagenem Refresh wird die alte Aktion nicht erneut angeboten; stattdessen wird der vorhandene Teilnahme-Neuladepfad angezeigt.
- Lehrgangsdetails erhalten verständliche Fallbacks für fehlende Kurzbeschreibung und leere Lernziele.
- Kurs-Suchhinweis sichtbar; Suchlösch-/Filteraktionen auf mindestens 44 px Zielhöhe.
- Keine Änderung an API, Rollen, Berechtigungen, Nachweisregeln oder Datenmodell.


## 2026-11-15 – Kursdetail und Nachweisaktion (PR #300)

- Nachweiserfassung bleibt bis zum Abschluss des Detail-Refreshs gesperrt; ein zusätzlicher Handler-Guard weist Requests während eines laufenden Speichervorgangs ab.
- Bei fehlgeschlagenem Refresh wird die alte Aktion nicht erneut angeboten; stattdessen wird der vorhandene Teilnahme-Neuladepfad angezeigt.
- Lehrgangsdetails erhalten verständliche Fallbacks für fehlende Kurzbeschreibung und leere Lernziele.
- Kurs-Suchhinweis sichtbar; Suchlösch-/Filteraktionen auf mindestens 44 px Zielhöhe.
- PR #300 gemergt; `bun run lint`, `bun run build`, `bun run test` (455/455) und PR-Vorlagenprüfung erfolgreich.

## 2026-11-15 – Lehrgangsdetail: fehlende Kursreferenzen

- Fehlende Kursreferenzen zeigen keine internen IDs mehr.
- Interne Kurs-IDs bleiben auf technische Schlüssel-/Lookup-Verwendung beschränkt und werden nicht als sichtbarer Fallback ausgegeben.
- Fehlende Fortschrittsdatensätze in bestehenden Lehrgangsteilnahmen werden nicht als „Noch nicht begonnen“ fehlinterpretiert.
- „Zum Kurs“ wird nur bei vorhandenem Katalogeintrag angeboten; keine künstlichen Masterdaten oder erfundenen Statuswerte.


## 2026-11-15 – Lehrgangsdetail: fehlende Kursreferenzen (PR #301)

- Fehlende Kursreferenzen zeigen keine internen IDs; fehlender Fortschritt in einer bestehenden Teilnahme wird nicht als „Noch nicht begonnen“ fehlinterpretiert.
- „Zum Kurs“ wird nur bei vorhandenem Katalogeintrag angeboten; keine künstlichen Masterdaten oder erfundenen Statuswerte.
- PR #301 gemergt; `bun run lint`, `bun run build`, `bun run test` (455/455) und PR-Vorlagenprüfung erfolgreich.

## 2026-11-15 – Academy-Navigation: Fokus nach Bereichswechsel

- Nach Auswahl einer Startkachel Fokus auf den aktiven Hauptnavigationsbutton setzen; bei Rückkehr zur Kachelansicht Fokus auf die zuletzt verwendete Einstiegskachel zurückführen.
- Externe Navigation in den Prüfungsbereich berücksichtigt dieselbe Fokusweitergabe.
- Ein neues Prüfungsziel im bereits aktiven Prüfungsbereich löst keine ungefragte Fokusverschiebung aus.
- Quellen: Home Office Accessibility Standard (Fokusreihenfolge/dynamische Controls) und VA.gov SPA-Fokusmanagement.
- Keine Änderung an Navigation, Berechtigungen oder Seitenstruktur.


## 2026-11-15 – Academy-Navigation: Fokus nach Bereichswechsel (PR #302)

- Nach Auswahl einer Startkachel Fokus auf den aktiven Hauptnavigationsbutton setzen; bei Rückkehr zur Kachelansicht Fokus auf die zuletzt verwendete Einstiegskachel zurückführen.
- Externe Navigation in den Prüfungsbereich berücksichtigt dieselbe Fokusweitergabe; ein neues Prüfungsziel im bereits aktiven Prüfungsbereich löst keine ungefragte Fokusverschiebung aus.
- Quellen: Home Office Accessibility Standard (Fokusreihenfolge/dynamische Controls) und VA.gov SPA-Fokusmanagement.
- PR #302 gemergt; `bun run lint`, `bun run build`, `bun run test` (455/455) und PR-Vorlagenprüfung erfolgreich.


## 2026-11-16 – Kurs-/Lehrgangsdetail: Fokus nach dynamischem Ansichtswechsel

- Beim Öffnen einer Kurs- oder Lehrgangsdetailansicht Fokus auf die Detailüberschrift setzen.
- Bei Rückkehr zum Katalog den Fokus zum ursprünglichen Aktionsbutton wiederherstellen; falls dieser nicht mehr vorhanden ist, auf das Katalog-Suchfeld ausweichen.
- Keine Änderung an Navigation, Inhalten, Kursregeln, Berechtigungen oder Datenmodell.
- **PR #304 gemergt** (Merge-Commit `2c6711c33d42ad40498138dfe97eec1ff317baf2`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt offen.


## 2026-11-16 – Private Notizen: Fokusführung im Editor

- Beim Öffnen einer privaten Notiz Fokus auf das Titelfeld setzen.
- Nach Abbruch oder erfolgreichem Speichern Fokus zum ursprünglichen „Bearbeiten“-Button zurückführen; Suchfeld als Fallback, falls der Auslöser nicht mehr existiert.
- Keine Änderung an privater Datenspeicherung, Konfliktbehandlung, Berechtigungen oder Datenmodell.
- **PR #305 gemergt** (Merge-Commit `43b7e16505244563ac771c38d69abcb31693fd5f`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt offen.


## 2026-11-16 – Materialverwaltung: Fokusführung im Editor

- Beim Öffnen eines bearbeitbaren Materials oder Anlegen eines neuen Materials Fokus auf das Titelfeld setzen; bei archivierten, schreibgeschützten Materialien auf die Editorüberschrift.
- Bei Rückkehr zur Übersicht Fokus zum ursprünglichen Materialeintrag bzw. zur Schaltfläche „Neues Material anlegen“ zurückführen; Fallback auf „Neues Material anlegen“.
- Interne Reloads des aktuell bearbeiteten Materials verschieben den Fokus nicht.
- Keine Änderung an Materialversionen, Veröffentlichung, Berechtigungen oder Datenmodell.
- **PR #306 gemergt** (Merge-Commit `941c1a296961f5b457914f146222f20bf7dd9aac`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt offen.


## 2026-11-16 – Taxonomieverwaltung: Fokusführung in Formularen

- Beim Öffnen eines Kategorie- oder Dokumenttypformulars Fokus auf das Namensfeld setzen.
- Nach Abbruch oder erfolgreichem Speichern Fokus zum ursprünglichen Bearbeiten-Button bzw. zur Neuanlegen-Schaltfläche zurückführen.
- Fallback auf Neuanlegen, falls der ursprüngliche Eintrag nicht mehr existiert; Suche nur als letzter Fallback.
- Keine Änderung an Taxonomie-, Archivierungs-, Lösch- oder Zuordnungsregeln.
- **PR #307 gemergt** (Merge-Commit `58b7abd47155e443b6e0316cb95d75e51aa4b2a9`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt offen.


## 2026-11-16 – Kurs-/Lehrgangsverwaltung: Fokusführung im Autoreneditor

- Beim Öffnen eines neuen oder bestehenden Kurs-/Lehrgangsentwurfs Fokus auf die Editorüberschrift setzen.
- Bei Rückkehr zur Verwaltung oder nach erfolgreicher Veröffentlichung Fokus zum ursprünglichen Auslöser zurückführen; Verwaltungsüberschrift und Suche als Fallback.
- Bei Validierungsfehlern Fokus auf die Fehlersammlung setzen.
- Keine Änderung an Kurs-/Lehrgangsregeln, Veröffentlichung, Berechtigungen oder Datenmodell.
- **PR #308 gemergt** (Merge-Commit `12a3b74f4b5882230234e340aa030d40fc84e8a1`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt offen.


## 2026-11-16 – Lernbibliothek: Fokusführung zwischen Katalog und Reader

- Beim Öffnen eines Legacy- oder versionierten Materials Fokus auf den geladenen Reader-Titel setzen; bei Ladefehlern die Fehlermeldung fokussieren.
- Bei Rückkehr zum Katalog Fokus zum ursprünglichen Materialöffnen-Button zurückführen; Suchfeld als Fallback, falls der Button nicht mehr existiert.
- Wechsel zwischen Materialien innerhalb der Reader-Seitenleiste erhält den bestehenden Fokuskontext.
- Keine Änderung an Zugriff, Rollen, Versionierung, privaten Notizen, Datenmodell oder PDF-Infrastruktur.
- Arbeitsbranch: `a11y/library-reader-focus-restoration`; CI/Review ausstehend, manuelle Tastatur-/Screenreader-Abnahme später.

- Zugriffsbeschränkte Legacy-Materialien behalten ebenfalls einen expliziten Rückweg zur Bibliothek.
