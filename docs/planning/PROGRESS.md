# RCPD – Aktueller Planungs- und Redesignstand

**Stand:** 06.11.2026 – nach Priorisierung der ersten Materialausbaustufe auf Text/Markdown und Code; PDF-Infrastruktur ist zurückgestellt

**Basisstand von main:** PR #60 wurde mit Merge-Commit `4a67e4874333477f14935118e976b18ad6fa1fe9` gemergt.  
**Aktueller Umsetzungsbranch:** `feature/academy-versioned-text-code-materials` – Draft-PR #61, CI-Prüfung läuft.

## 0. Aktuelle Ausbaustufe der Lernbibliothek

- PDF-Funktionen sind bis zu einer späteren Ausbaustufe zurückgestellt. Keine neue PDF-Ablage, kein privates Zusatz-Repository, kein Parser-/Malware-Scan, keine externe Speicherverknüpfung und keine zusätzlichen laufenden Kosten in dieser Phase.
- Erste Inhaltsarten: Text/Markdown und codebasierte Inhalte. Code wird als Quelltext gespeichert/dargestellt; Codeausführung ist nicht Teil der ersten Ausbaustufe, sofern sie nicht separat beschlossen und sicherheitstechnisch geprüft wird.
- Kategorieverwaltung wurde mit PR #59, Dokumenttypverwaltung mit PR #60 gemergt. Beide Listen starten ohne voreingestellte Taxonomiewerte.
- Die neue versionierte Materialverwaltung entsteht im Branch `feature/academy-versioned-text-code-materials`: Materialstamm, Arbeitsentwurf und unveränderliche veröffentlichte Fassungen für Markdown und gespeicherten Quelltext; automatische Kennungen und getrennte Veröffentlichungsaktion.
- Kursveröffentlichungen prüfen serverseitig, dass jede Materialreferenz auf eine tatsächlich vorhandene, veröffentlichte und nicht archivierte konkrete Materialversion zeigt. Bestehende Legacy-Lehrmaterialien bleiben unangetastet und werden nicht automatisch migriert.
- Die aktuelle Ausbaustufe ergänzt zunächst die Admin-/Colonel-/Kursverantwortlichen-Verwaltung. Teilnehmer-Reader und Materialauswahl direkt im Kurseditor bleiben die anschließende Integration.

### Legacy-PDFs – technische Bestandsbehandlung (09.11.2026)

- Vorhandene Firestore-PDF-Blob-Dokumente werden nicht gelöscht, verschoben oder in ein anderes Speichersystem migriert.
- Der Firestore-Serverstart lädt nur noch Modulmetadaten und überspringt große PDF-Blob-Inhalte. Die Blob-Teilstücke werden erst beim berechtigten Abruf eines konkreten Handbuchs gelesen.
- Bei einer Änderung an einem Modul ohne PDF-Änderung bleiben nicht geladene Blob-Referenzen erhalten; dadurch werden bestehende PDFs nicht versehentlich gelöscht.
- Neue bzw. ausdrücklich bearbeitete PDF-Inhalte werden weiterhin in Firestore-Blob-Dokumente zerlegt. Ein gerade hochgeladenes PDF bleibt bis zu einem Serverneustart im laufenden Prozess; danach wird es nur noch bei konkretem Abruf geladen. Eine sofortige Freigabe nach dem Upload wurde wegen möglicher konkurrierender Portal-State-Schreibvorgänge bewusst nicht eingebaut.
- Die Browser-PDF-Zwischenspeicherung ist auf das aktuell ausgewählte Dokument begrenzt.
- Das ist ausschließlich eine Bestands-/Performanceoptimierung und keine Wiederaufnahme der geplanten PDF-Sicherheitsinfrastruktur. Die beschlossene Signatur-/Parser-/Malwareprüfung vor Veröffentlichung ist weiterhin offen; die bestehende einfache Data-URL-Prüfung ersetzt sie nicht.

## 0.1 Umsetzungsstand der versionierten Text-/Code-Materialverwaltung

- Neues Datenmodell mit getrenntem Materialstamm, bearbeitbarem Entwurf und append-only Materialversionen.
- Materialkennung wird systemseitig im Format `MAT-YYYY-XXXXXXXXXXXX` erzeugt; konkrete Fassungen erhalten `materialId__vN`.
- Pflichtmetadaten Kategorie und Dokumenttyp werden als IDs gespeichert. Die Zuordnungen des Materialstamms werden zusammen mit dem Entwurf transaktional gehalten; jede veröffentlichte Fassung erhält zusätzlich unveränderliche Metadatenreferenzen. Dadurch bleiben alte Fassungen nachvollziehbar und verwendete Kategorien/Dokumenttypen vor endgültiger Löschung geschützt.
- Speichern eines Entwurfs verändert niemals den aktuellen Veröffentlichungszeiger. Veröffentlichung erzeugt einen unveränderlichen Snapshot und aktualisiert den Zeiger atomar. Eine geänderte Arbeitsrevision benötigt eine ausdrückliche neue Veröffentlichung.
- Kurszuständigkeit ist ein separates Feld, unabhängig von der generierten Materialkennung. Admin/Colonel verwalten global; Kursverantwortliche handeln innerhalb bestehender `canGradeAssignedCourses`-/`assignedCourseCodes`-Berechtigungen. Archivierung bleibt Admin/Colonel vorbehalten.
- Bei Veröffentlichung einer Kursversion werden alle `materialId`-/`materialVersionId`-Paare auf Existenz, Eigentümerzuordnung und Veröffentlichungsstatus geprüft.
- JSON-Speicherschema wurde auf Version 6 erweitert; bestehende v1-v5-Stores bleiben rückwärtskompatibel lesbar. Firestore nutzt eigene Repository-Collections.
- Diese Implementierung führt keine neue Dateiablage, keine externen Dienste und keine zusätzlichen Infrastrukturkosten ein. PDF bleibt zurückgestellt.

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
- Lernbibliothek: Dokumentversionierung B; Archivierung/Löschung A; globale Suche A; Sortierung A; Filterdarstellung A; Upload-/Veröffentlichungsworkflow B; Selbstveröffentlichung durch dieselbe berechtigte Person A; Pflichtmetadaten A (Titel, Kategorie, Dokumenttyp verpflichtend; Beschreibung/Rang optional; Kennungen automatisch); getrennte kontrollierte Kategorien-/Dokumenttyp-Listen A.
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

1. Academy-Lernbibliothek: konkrete Kategorien-/Dokumenttypwerte; automatische Kennungen/Lesezeit; technische Parser-/Scan-/OCR-Auswahl; Rücknahme/Archivierung und Benachrichtigungen abschließen.
2. Restliche Academy-Fragen und Cross-Module-Abhängigkeiten prüfen.
3. Alle übrigen Portalmodule anhand des tatsächlichen Bestands systematisch auditieren.
4. Rollen- und Aufgabenmatrix aus bestehenden Berechtigungen ableiten.
5. Globale Informationsarchitektur erst nach Modulkonzepten abstimmen.
6. Technische Machbarkeit und Abweichungen vom Architektur-Erhaltungsprinzip dokumentieren.
7. Designsystem und grafische Detailgestaltung erst anschließend beginnen.
8. Unabhängige kritische Review des Gesamtplans vorbereiten.

## 6. Nächste konkrete Schritte

1. PR der versionierten Text-/Code-Materialverwaltung fachlich und technisch prüfen; nach Merge den Stand auf `main` verifizieren.
2. Teilnehmer-Lernbibliothek und Reader an die neuen veröffentlichten Materialversionen anbinden; Zugriffsfilter und sichere Markdown-Darstellung prüfen.
3. Kurseditor um eine gezielte Materialauswahl ergänzen, die nur veröffentlichte Fassungen auswählbar macht und konkrete Versionskennungen speichert.
4. Suche/Filter über Materialcode, Titel, Kategorie und Dokumenttyp sowie erforderliche Metadaten-/Readerzustände integrieren, sobald die Daten zuverlässig verfügbar sind.
5. Benachrichtigung betroffener Kursverantwortlicher bei neuen Fassungen und weitere offene Rücknahme-/Archivierungsfälle klären.
6. Legacy-Materialien erst nach gesondertem Migrations-/Kompatibilitätsplan berücksichtigen; PDF-Unterstützung bleibt spätere Ausbaustufe.

Vor jeder Umsetzung sind passende Detail-Spezifikation, Entscheidungsregister, bestehende Berechtigungen, technische Architektur und UX-/Accessibility-Anforderungen abzugleichen.

## 7. Technische Ausführung und Tests

- Diese Revision ändert ausschließlich Markdown-Planungsdokumente.
- Neue Dateien: `PORTAL-REDESIGN-DETAILS.md`, `ACADEMY-DETAILED-SPECIFICATION.md`, `RECONSTRUCTION-NOTES.md`.
- Aktualisiert: Masterplan, Entscheidungsregister, Modul-Inventar, offene Fragen, Fortschritt, README und Changelog.
- Keine Anwendungslogik-, Backend-, API-, Datenmodell-, Berechtigungs- oder Deployment-Dateien geändert.
- Branch basiert auf dem aktuellen `main`-Stand nach Merge von PR #44; keine direkte Änderung an `main`.
- Kein Merge und kein Deployment durch diese Revision.
- Lint, Build, Tests, Browserprüfung und Markdown-Linkcheck wurden nicht ausgeführt.
- Nach dem Schreiben müssen alle geänderten Dateien aus GitHub erneut abgerufen und auf Inhalt, Gliederung, Links und Widersprüche geprüft werden.


## 8. Letzter Arbeitsfortschritt – Upload-/Veröffentlichungsworkflow

**BESCHLOSSEN am 06.11.2026:** Option B. Neue Uploads werden zunächst als Entwurf gespeichert; erst eine bewusste Veröffentlichungsaktion macht sie im regulären Bibliotheksbestand verfügbar.

Die Detail-Spezifikation hält nun fest:
- Upload und Veröffentlichung sind getrennte Aktionen und Statusmeldungen.
- Entwürfe sind Teilnehmern nicht zugänglich und erscheinen nicht in Teilnehmer-Suche/Empfehlungen.
- Veröffentlichte Kursversionen verweisen weiterhin auf konkrete veröffentlichte Dokumentversionen.
- Eine neue inhaltliche Fassung wird als neuer Entwurf vorbereitet und ersetzt die aktuelle Bibliotheksfassung erst nach Veröffentlichung.
- Bereits veröffentlichte Kursreferenzen und historische Nachweise ändern sich dadurch nicht.
- Ein Vier-Augen-Prinzip oder eine zwingende Freigabe durch eine zweite Person ist ausdrücklich noch nicht beschlossen.

**Technischer Bestandsabgleich (main, Commit `7c9aa79a3a48fe3d75a1e4fad926a752716ae62a`, 06.11.2026):**
- `src/components/AcademyCenter.tsx`: `handleCreateModule` legt derzeit unmittelbar ein Material an; die UI meldet „erfolgreich veröffentlicht“. Die Datei wird per `FileReader.readAsDataURL` als Base64-Data-URL vorbereitet.
- `src/types/portal.ts`: `TrainingModuleDoc` enthält derzeit keine expliziten Draft-/Publication-/Version-Felder.
- `server.ts`: `POST /api/academy/modules` fügt das Modul direkt in `dbState.modules` ein; `PUT` überschreibt vorhandene Materialfelder; `DELETE` entfernt den Eintrag aus dem Array.
- Die bestehende Berechtigungsprüfung nutzt `canActorEditCourseCode`: Admin und Colonel dürfen alle Kurscodes verwalten; weitere Rollen benötigen `canGradeAssignedCourses` und einen passenden zugewiesenen Kurscode. Create/Edit/Delete verwenden diese bestehende Kurscodeprüfung. Ein separater Veröffentlichungsrechtetyp ist derzeit nicht erkennbar.
- `server/validate.ts`: `isSafePdfDataUrl` prüft Data-URL-Präfix und Base64-Zeichen, aber in dieser Funktion keine PDF-Signatur oder strukturelle Integrität.
- `server.ts`: der generische JSON-Parser erlaubt für große API-Anfragen derzeit 25 MB Request-Body. Das ist keine explizite fachliche PDF-Größengrenze; Base64 vergrößert die Übertragungsgröße zusätzlich.
- Der bestehende Code ist ein technischer Ist-Befund, keine Freigabe zur Implementierung.

**Weiterer Beschluss am 06.11.2026:** Veröffentlichungsberechtigung Option A. Dieselbe Person darf ihren Entwurf mit der dafür erforderlichen bestehenden Berechtigung selbst bewusst veröffentlichen; kein Vier-Augen-Prinzip. Admin und Colonel behalten übergreifende Verwaltungsbefugnis, weitere Rollen handeln innerhalb ihrer zugewiesenen Berechtigungen.

**UX-/Security-Recherche vom 06.11.2026:**
- [GOV.UK Design System – File upload](https://design-system.service.gov.uk/components/file-upload/): konkrete Fehlermeldungen für falschen Dateityp, zu große, leere, passwortgeschützte oder nicht hochladbare Dateien; Uploadkomponente und Fehlerzustände.
- [DWP Design System – File upload](https://design-system.dwp.gov.uk/contribute/file-upload): Nutzer sollen hochgeladene Dateien sehen, kontrollieren und Fehler ohne Neustart beheben können; Upload und anschließendes Einreichen/Veröffentlichen müssen unterscheidbar sein.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): mehrschichtige serverseitige Prüfung, Dateisignatur und Inhalt, Größenlimits, Authentifizierung/Berechtigung und sichere Speicherung.


## 9. Pflichtmetadaten der Lernbibliothek – Option A

**BESCHLOSSEN am 06.11.2026:** Titel, Kategorie und Dokumenttyp sind verpflichtend. Beschreibung und erforderlicher Rang bleiben optional. Materialcode und konkrete Dokumentversionskennung werden automatisch vergeben. Die Lesezeit wird möglichst automatisch ermittelt; falls dies nicht verlässlich möglich ist, bleibt sie optional oder wird weggelassen.

Die konkreten kontrollierten Werte für Kategorien und Dokumenttypen sind noch offen. Kategorie bezeichnet das fachliche Thema; Dokumenttyp die Art/Funktion des Dokuments. Keine freie, unkontrollierte Werteliste ohne Prüfung.

**Nächster Konzeptpunkt:** kontrollierte Kategorien und Dokumenttypen so festlegen, dass sie zu den tatsächlichen RCPD-Materialien passen und Suche/Filter unterstützen.


## 10. Kategorien und Dokumenttypen – Option A

**BESCHLOSSEN am 06.11.2026:** Zwei getrennte, kontrollierte Listen. Kategorie beschreibt das fachliche Thema; Dokumenttyp die Art/Funktion des Dokuments. Pro Material eine Hauptkategorie und ein Dokumenttyp. Keine automatische Freigabe von Mehrfach-Tags oder freien Eingaben. Die konkreten Werte bleiben anhand des realen Materialbestands zu definieren.

**Nächster Arbeitsstand:** Ein begründeter Startvorschlag mit fünf möglichen Themenkategorien und fünf Dokumenttypen ist in der Academy-Spezifikation ausgearbeitet. Die Liste ist ausdrücklich noch nicht beschlossen, weil bislang nur Beispiele aus früheren Planungsdiskussionen, aber kein vollständiges Inventar realer hochgeladener Bibliotheksdokumente vorliegt. Die sechs bisherigen Codewerte sind gemischt und dürfen nicht ungeprüft als Ziel-Taxonomie gelten.


### Technischer Rollenbefund für die nächste Entscheidung (main, 06.11.2026)

- `server.ts` verwendet für das bisherige Anlegen, Bearbeiten und Löschen von Academy-Materialien die gemeinsame Prüfung `canActorEditCourseCode`.
- Admin und Colonel bestehen diese Prüfung global.
- Andere Rollen benötigen eine aktivierte Berechtigung `canGradeAssignedCourses` und einen passenden Eintrag in `assignedCourseCodes` (oder den Platzhalter `*`).
- Die Standardberechtigungen in `server/rolePermissions.ts` geben diese Kursverwaltungs-/Bewertungsberechtigung für gewöhnliche Rollen zunächst nicht frei; sie kann über die granularen Berechtigungen gezielt gesetzt werden.
- Das ist ein technischer Ist-Befund, keine Entscheidung, dass dieselbe Berechtigung künftig automatisch auch Rücknahme und Archivierung veröffentlichter Materialien erlauben soll.
- Mit automatisch vergebenen Materialcodes muss die künftige Berechtigungsprüfung außerdem auf einer stabilen Kurs-/Zuständigkeitszuordnung beruhen und darf nicht versehentlich den generierten Materialcode als Kurscode behandeln.


## Lernbibliothek – Berechtigungen Option B und PDF-Uploadprüfung

**BESCHLOSSEN am 06.11.2026 – Option B:** Kursverantwortliche mit passender bestehender Zuständigkeit dürfen Entwürfe anlegen/bearbeiten und selbst ausdrücklich veröffentlichen. Zurückziehen und Archivieren veröffentlichter Materialien bleiben Admin und Colonel vorbehalten. Materialcode und Kurszuständigkeit müssen getrennt behandelt werden.

**Technischer Ist-Stand auf main:**
- `server.ts`: allgemeiner JSON-Request-Parser mit 25 MB; PDF wird aktuell als Base64-Data-URL im JSON übertragen.
- `server/validate.ts`: `isSafePdfDataUrl` prüft derzeit nur Präfix und Base64-Zeichen, keine PDF-Signatur und keine strukturelle Lesbarkeit.
- `src/components/AcademyCenter.tsx`: Datei wird clientseitig per `FileReader.readAsDataURL` eingelesen; im gezeigten Handler keine vorgelagerte Dateigrößenprüfung.
- `server/stateDiff.ts`: Firestore-PDF-Feld wird in Blob-Teile zu 700.000 Zeichen zerlegt, um das 1-MiB-Dokumentlimit zu umgehen.

**BESCHLOSSEN am 06.11.2026:** maximal 15 MB Rohdateigröße pro PDF. Base64-/JSON-Overhead muss bei Requestgrenzen berücksichtigt werden; technische Hostinggrenzen sind vor Implementierung zu verifizieren.

**Beschlossen – PDF-Sicherheitsprüfung Option A:** Signatur- und Parserprüfung, Ablehnung leerer/beschädigter/abgeschnittener/unlesbarer/passwortgeschützter PDFs, erfolgreiche Malwareprüfung vor Veröffentlichung und Fail-closed bei negativem Scan oder Prüfdienstausfall. Konkrete Fehlermeldungstexte/-darstellung und technische Parser-/Scanner-/Quarantänearchitektur bleiben offen.


## 11. PDF-Sicherheitsprüfung – Option A beschlossen (06.11.2026)

- Echte PDF-Signatur und strukturelle Lesbarkeit mit Parser serverseitig prüfen.
- Leere, beschädigte, abgeschnittene, unlesbare sowie passwortgeschützte/verschlüsselte PDFs ablehnen.
- Malwareprüfung muss vor Veröffentlichung erfolgreich sein; bis dahin bleibt die Datei privat.
- Bei negativem Scan oder nicht verfügbarem/fehlerhaftem Prüfdienst bleibt das Material unveröffentlicht (Fail-closed).
- Parser und Scanner benötigen isolierte Verarbeitung und Ressourcenlimits. Konkrete Produkt-/Hostingarchitektur ist nicht entschieden und bleibt technische Prüfarbeit.
- Konkrete nutzerseitige Fehlermeldungstexte und Darstellung werden noch im UX-Detail abgeschlossen.

**Nächster fachlicher Punkt:** Kategorien und Dokumenttypen. Ein auf belegten Beispielen beruhender Vorschlag steht in der Academy-Spezifikation; mangels vollständigem Materialinventar ist er noch nicht als verbindliche Liste zu übernehmen.


## 12. Verbindliches Entwicklungsmodell und aktualisierte nächste Schritte (06.11.2026)

**BESCHLOSSEN:** Das Redesign wird endproduktorientiert und iterativ in fachlich vollständigen Abschnitten entwickelt. Das Ziel eines bestmöglichen, professionellen und funktional vollständigen Gesamtdesigns bleibt unverändert. Die Abschnittsaufteilung ist ausschließlich eine bessere Organisation der Arbeit und darf nicht zur Kürzung von Funktionen, Recherche, UX, Accessibility, Sonderfällen oder Qualitätssicherung führen. Jeder Abschnitt muss bereits in das geplante endgültige Gesamtsystem passen. Vermeidbare Doppelarbeit wird durch frühe Klärung gemeinsamer Grundlagen und Wiederverwendung verhindert; notwendige Verbesserungen aufgrund von Prototypen und Tests bleiben ausdrücklich möglich. Einzelheiten: `DEVELOPMENT-MODEL.md`.

**Was sich gegenüber der bisherigen linearen Arbeitsweise ändert:** Gesamtplanung und Abschnittsplanung laufen verzahnt. Wir müssen nicht das gesamte Portal bis ins letzte Detail theoretisch abschließen, bevor eine erste vollständige Einheit prototypisch validiert oder implementiert werden kann. Vor einer Abschnittsumsetzung müssen aber fachlicher Umfang, Rollen, relevante Zustände, Abhängigkeiten, Recherche, UX, Accessibility, technische Machbarkeit und Abnahmekriterien ausreichend geklärt sein.

**Aktueller nächster Arbeitsplan:**
1. Den laufenden Academy-Planungsabschnitt gezielt abschließen: offene Bibliotheksentscheidungen und technische Prüffelder sauber voneinander trennen, danach Academy-weite Konsistenzprüfung. Keine Vorabfestlegung technischer Details, die erst durch Architekturprüfung belastbar werden.
2. Nicht erst nach der Academy mit dem Gesamtportal beginnen: globale Rollen-/Aufgabenmatrix, Navigation/Informationsarchitektur, gemeinsame Muster und technische Abhängigkeiten frühzeitig mituntersuchen.
3. Designsystem und globalen Portalrahmen auf Grundlage der tatsächlichen Modulanforderungen und aktueller Recherche entwickeln.
4. Die Academy als möglichen ersten vollständigen Abschnitt prototypisch ausarbeiten und validieren; Umsetzung erst nach dem Qualitäts-Gate und unter Einbindung in die globalen Grundlagen.
5. Weitere Module abschnittsweise mit demselben Qualitätsanspruch konzipieren, validieren, implementieren und testen.

**Status-/Branchhinweis:** Diese Aktualisierung liegt auf `docs/academy-library-upload-workflow` in Draft-PR #46 gegen `main`. PR #46 ist laut letzter Prüfung offen, nicht gemergt und weiterhin Draft. Die vorhandene Progress-Datei enthält ältere Verweise auf `docs/deep-redesign-reconstruction`; diese sind historischer Kontext und dürfen nicht als aktueller Branchstatus gelesen werden. Keine Änderung an `main`, kein Merge, kein Deployment.

## 06.11.2026 – Lernbibliothek: Reader und Kursintegration (PR #62)

- PR #61 ist gemergt (Merge-Commit `9c48dc28a156220adfb8add3a1d55c4f911804e7`).
- PR #62 ergänzt die Kurseditor-Auswahl konkreter veröffentlichter Materialversionen und einen Teilnehmer-Reader innerhalb einer bestehenden Kursteilnahme.
- Der Reader lädt Inhalte ausschließlich über eine serverseitig geprüfte Route, die die exakte Materialversion in der gepinnten Kursversion verifiziert. Rollenbeschränkungen werden serverseitig geprüft.
- Markdown wird mit `react-markdown`, `remark-gfm` und `rehype-sanitize` ohne Raw-HTML-Durchleitung dargestellt. Code bleibt Quelltext und wird nicht ausgeführt.
- PR #63 konsolidiert die nach dem Merge gefundenen Materialreferenz-, Reader-Darstellungs-, Datenschutz- und Versionshistorienfehler. TypeScript-Prüfung, Produktionsbuild und 333 Tests liefen erfolgreich; eine manuelle Browserprüfung wurde nicht durchgeführt.
- Notizen/Lesezeichen, Autosave und geräteübergreifende Leseposition bleiben ein eigener Folgeabschnitt.


## Vorübergehende Sperre neuer PDF-Uploads

- Neue PDF-Dateien können aktuell weder über die Academy-Oberfläche noch über die Legacy-Modul-API angelegt oder an bestehende Module angehängt werden.
- Bereits gespeicherte PDFs bleiben unverändert in Firestore und können über den bestehenden authentifizierten PDF-Abruf weiterhin gelesen werden.
- Normale Markdown-/Textmaterialien und externe Dokumentlinks bleiben verfügbar.
- Die Sperre ist vorübergehend und wird erst nach Umsetzung und Prüfung der vereinbarten PDF-Sicherheitsanforderungen aufgehoben (Dateisignatur, strukturelle Prüfung, Größenbegrenzung und geeignete Schadsoftwareprüfung).


## 09.11.2026 – Systematischer Bug- und Fehlerreview der implementierten Academy

**Arbeitsmodus BESCHLOSSEN:** Vor neuen Features werden die bereits implementierten Academy-Funktionen systematisch auf Logikfehler, Datenintegrität, Berechtigungen/Datenschutz, Fehlerbehandlung und unnötige Lade-/Speicherlast geprüft. Bestätigte reine Bugfixes dürfen nach grüner CI selbstständig gemergt werden. Änderungen an fachlichen Abläufen, neue Funktionen und offene Architekturentscheidungen werden weiterhin nicht ohne gesonderte Freigabe umgesetzt.

### Integrierte Fehler- und Sicherheitskorrekturen

- **PR #74 – Live-Sync und Prüfungs-Autosave:** Reconnect nach Listenerfehlern mit begrenztem Backoff; begrenzte Autosave-Warteschlange (ein aktiver plus ein letzter Folge-Save); veraltete Versuche werden nicht weitergeschrieben; auf Idle warten vor Abgabe/Unmount. CI beim Merge: 353 Tests bestanden.
- **PR #75 – Lazy Loading bestehender PDFs:** Chunk-Blobs werden nicht mehr vollständig beim Serverstart geladen; nur angeforderte, berechtigte PDFs werden aus Firestore-Chunks zusammengesetzt; Browsercache auf das aktuell ausgewählte PDF begrenzt; Backups laden PDF-Inhalte weiterhin vollständig. Keine Löschung bestehender Blobdaten.
- **PR #76 – Neue PDF-Uploads vorübergehend gesperrt:** Neue PDF-Dateien können weder über die Academy-Oberfläche noch über die Legacy-Modul-API angelegt oder angehängt werden. Bestehende PDFs bleiben lesbar und Metadatenänderungen dürfen sie nicht entfernen. Die Sperre bleibt bis zur Umsetzung der vereinbarten PDF-Sicherheitsprüfung bestehen.
- **PR #77 – Kursveröffentlichung:** Veröffentlichung erfordert mindestens eine ausdrücklich verpflichtende Abschlussbedingung; Entwürfe bleiben speicherbar.
- **PR #78 und #80 – Datenschutz in Teilnehmerantworten:** Interne Korrekturgründe, Actor-UIDs, Eigentümer-/Ersteller-/Veröffentlicher-UIDs und Archivierungsmetadaten werden aus Teilnehmeransichten entfernt. Manageransichten behalten erforderliche Auditdaten.
- **Commit `6a9cd560` – Kategorien und Dokumenttypen:** Interne Erstellungs-/Änderungs-UIDs und Zeitstempel werden aus den gemeinsamen Teilnehmerlisten entfernt.
- **Commit `b8370758` – Abschlusskorrekturen:** Eine administrative Korrektur auf „abgeschlossen“ darf die erforderlichen Nachweise nicht umgehen; Statuskorrekturen bleiben an die Nachweisdaten gebunden.
- **Commit `033b8a7d` – Programmveröffentlichung:** Kursreferenzen müssen beim Veröffentlichen auf vorhandene, veröffentlichte und verfügbare Kursversionen zeigen; fehlerhafte Entwürfe bleiben erhalten und unveröffentlicht.
- **Commit `e34e2c1e` – Nachweisdatenschutz und Programmfortschritt:** Teilnehmer erhalten keine UID der nachweiserfassenden Person; stattdessen nur die für die Anzeige nötige Kennzeichnung „eigener Nachweis“. Programme ohne Pflichtkurse werden nicht fälschlich als 100 % abgeschlossen angezeigt.
- **Commit `581cb20a` – Asynchrone Academy-Ladevorgänge:** Veraltete Kurs-/Programmdetailantworten werden verworfen; Listen-/Detailrequests laufen mit begrenzter Parallelität.
- **PR #86 – Bereichswechsel während laufender Aktionen:** Erfolgreiche Kurs-/Programmstarts oder Nachweiserfassungen dürfen nach Navigation nicht mehr den Ladevorgang eines anderen Academy-Bereichs (insbesondere privater Notizen) verdrängen. Aktualisierungen erfolgen nur, wenn der Lernbereich noch aktiv und die Komponente gemountet ist. CI: 363 Tests bestanden, TypeScript und Produktionsbuild erfolgreich.

### Noch offene technische Prüfpunkte – keine Freigabe zur Feature-Umsetzung

1. PDF-Sicherheitsprüfung bleibt offen: echte Dateisignatur, Parser-/Strukturprüfung, 15-MB-Rohdateigrenze, Malwareprüfung, isolierte Verarbeitung und Fail-closed-Verhalten. Bis dahin bleiben neue PDF-Uploads gesperrt.
2. Die Kursabschlussbedingung `required_assessment` ist noch nicht mit dem Prüfungsnachweissystem verbunden; die Oberfläche kennzeichnet dies derzeit ausdrücklich. Keine automatische Abschlusswirkung ohne echte Prüfungsnachweise.
3. Für PR #86 existiert noch kein dedizierter React-Integrationstest des Navigations-Race-Falls; die vollständige CI deckt TypeScript, vorhandene Tests und Produktionsbuild ab. Ein manueller Browser-/Live-Firestore-Test wurde nicht durchgeführt.
4. Die verbleibende Prüfung soll weitere bereits implementierte Academy-Bereiche abdecken: Lernbibliothek/Reader und Versionsbindung, private Notizen, Kurs-/Programmfortschritt, Rollen-/Zugriffsgrenzen, Prüfungsablauf/Review sowie Fehler- und Grenzfälle. Nur bestätigte Fehler werden geändert; fachliche Lücken und noch nicht beschlossene Funktionen werden getrennt dokumentiert.
