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


## 2026-11-10 – Lokale Wiederaufnahme der Reader-Leseposition (Draft-PR #140)

- Beschlossene Reader-Funktion ergänzt: Markdown- und Code-Leseposition wird lokal nach Teilnahme und exakter Materialversion getrennt gespeichert und beim erneuten Öffnen wiederhergestellt.
- Browser-Speicherfehler bleiben fail-soft; Positionen werden nicht serverseitig synchronisiert.
- Geräte-/browserübergreifende Wiederaufnahme bleibt ausdrücklich offen; keine PDF-Seitenpositionen.
- Tests für Versions-/Teilnahmeisolation, beide Inhaltsarten und ungültige lokale Speicherwerte ergänzt.
- Draft-PR #140 zielt auf `main` und enthält vorübergehend denselben ID-Fix-Commit wie PR #138; PR #138 sollte zuerst gemergt werden, um doppelte Commit-Historie zu vermeiden. Kein Merge/Deployment; CI und manuelle Browserprüfung stehen aus.
