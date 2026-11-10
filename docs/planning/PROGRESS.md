# RCPD – Aktueller Planungs- und Redesignstand

**Stand:** 10.11.2026 – PR #132/#134/#135/#136/#137/#138/#141 und #142 sind gemergt. PDF-Infrastruktur bleibt zurückgestellt.

**Aktueller Basisstand:** `main` bei `7780cf2aa26c4b8160965d2f33de29219638823c` (Squash-Merge von PR #142).  
**Aktueller Umsetzungsstand:** PR #141 und PR #142 wurden nach erfolgreicher GitHub-CI gemergt. PR #142: TypeScript/Produktionsbuild erfolgreich, 451/451 Tests bestanden, PR-Vorlagenprüfung erfolgreich. Der Main-Workflow einschließlich Render-Deploy-Hook war ebenfalls erfolgreich. Eine manuelle Browserprüfung und eine unabhängige Live-Runtime-Prüfung wurden nicht durchgeführt.

## 0. Aktuelle Ausbaustufe der Lernbibliothek

- PDF-Funktionen sind bis zu einer späteren Ausbaustufe zurückgestellt. Keine neue PDF-Ablage, kein privates Zusatz-Repository, kein Parser-/Malware-Scan, keine externe Speicherverknüpfung und keine zusätzlichen laufenden Kosten in dieser Phase.
- Erste Inhaltsarten: Text/Markdown und codebasierte Inhalte. Code wird als Quelltext gespeichert/dargestellt; Codeausführung ist nicht Teil der ersten Ausbaustufe.
- Kategorieverwaltung (PR #59), Dokumenttypverwaltung (PR #60), versionierte Text-/Code-Materialverwaltung (PR #61) sowie Teilnehmer-Reader und konkrete Materialauswahl im Kurseditor (PR #62; Konsolidierung durch PR #63) sind in `main` integriert.
- Kursversionen referenzieren konkrete veröffentlichte Materialfassungen. Bestehende Legacy-Materialien wurden nicht automatisch migriert.
- Private Notizen und Lesezeichen sind direkt in den Material-Reader integriert; Mehrfachquellen pro Notiz sowie versionsgebundene Textanker für Markdown und Code sind umgesetzt (PR #132, #134 und #136).
- PDF-Seitenanker bleiben bis zur Wiederaufnahme der ausdrücklich zurückgestellten PDF-Infrastruktur offen.
- Die globale Teilnehmer-Suche nutzt gewichtete Relevanz aus den bereits vorhandenen freigegebenen Metadaten; ohne Suchbegriff bleibt die Ergebnisliste alphabetisch. Alternative Sortierungen nach Titel und tatsächlichem Veröffentlichungs-/Aktualisierungsdatum bleiben verfügbar.
- Kategorie und Dokumenttyp sind kompakte, zunächst eingeklappte Filter. Aktive Filter bleiben sichtbar und einzeln entfernbar. Filteroptionen stammen ausschließlich aus den aktuell zugänglichen Katalogeinträgen.
- Die Suche lädt/indexiert keinen Materialvolltext zusätzlich. PDF-Dateinamen bleiben bei Legacy-Materialien als bereits vorhandene Suchmetadaten nutzbar; OCR/Volltextindexierung bleibt eine gesonderte offene technische Frage.

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

## 0.2 Materialaktualisierung und betroffene Kurse – umgesetzt mit PR #142

Die fachlichen Beschlüsse vom 10.11.2026 sind in `DECISIONS.md` und `ACADEMY-DETAILED-SPECIFICATION.md` festgehalten. PR #142 hat die Umsetzung in `main` gebracht:

- Atomare Sperre veröffentlichter/verfügbarer Kurse, deren aktuelle Kursversion das neu veröffentlichte Material referenziert.
- Mehrere offene Materialprüfungen pro Kurs, ohne bereits offene Einträge zu überschreiben.
- Idempotente, wiederholbare In-App-Benachrichtigung an den vorhandenen Kursverantwortlichen; deterministische Notification-ID und persistierter Zustellstatus.
- Serverblock für neue Kursstarts, auch wenn ein bestehender Programmpin eine Kursversion vorgibt; bereits gestartete Teilnahmen bleiben lesbar.
- Archivierte Materialreferenzen setzen betroffene veröffentlichte Kurse ebenfalls offline und verlangen vor einer Reaktivierung eine neue Kursversion ohne die archivierte Referenz; neue Programmpins werden dadurch verhindert, laufende Teilnahmen behalten ihren Zugriff.
- Entscheidung „Kurs offline lassen“ setzt eine zusätzliche Versionsanforderung: vor Reaktivierung muss eine neue Kursversion die betroffenen Materialreferenzen aktualisieren oder entfernen; die neue Kursversion aktiviert den Kurs nicht automatisch.
- Kursverwaltung erhält explizite Aktionen zur Prüfung, Freigabe und späteren Reaktivierung. Nach Veröffentlichung der korrigierten Kursversion bleibt ein eigener Marker bis zur manuellen Reaktivierung bestehen; neue Materialfassungen in diesem Zeitraum lösen erneut eine Prüfung aus.

Die Repository-Transaktion hält Materialveröffentlichung und Kurssperre atomar. Die Portal-Benachrichtigung liegt in einem getrennten Store; deshalb wird die Zustellung über einen persistenten Review-Marker wiederholt und über eine deterministische ID dedupliziert. PR #142 ist gemergt; CI (TypeScript/Build und 451/451 Tests), PR-Vorlagenprüfung sowie Main-Workflow einschließlich Render-Deploy-Hook waren erfolgreich. Manuelle Browser-/Live-Runtime-Prüfung bleibt offen.

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

## 6. Noch offene nächste Schritte

1. Benachrichtigung betroffener Kursverantwortlicher bei neuen Materialfassungen und konkrete Auswirkungen auf laufende Kursentwürfe klären.
2. Rückzug/Archivierung veröffentlichter Materialien weiter spezifizieren: betroffene Kursversionen, konkrete Zustände und Benachrichtigungen sind noch offen.
3. Legacy-Materialien erst nach gesondertem Migrations-/Kompatibilitätsplan berücksichtigen.
4. PDF-Unterstützung einschließlich der bereits beschlossenen Sicherheitsanforderungen bleibt ausdrücklich zurückgestellt.
5. Weitere Academy-Arbeit nur aus den verbleibenden offenen Punkten in `OPEN-QUESTIONS.md` ableiten; keine neuen Funktionsannahmen ergänzen.

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
- Notizen/Lesezeichen, Autosave, Mehrfachquellen und stabile Textanker sind mit PR #132/#134/#136 umgesetzt. Die lokale Lesepositions-Wiederaufnahme ist mit PR #141 umgesetzt; geräte-/browserübergreifende Synchronisierung bleibt offen.


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


## 10.11.2026 – Abschluss des systematischen Academy-Fehlerreviews

- Die systematische Prüfung der tatsächlich implementierten Academy-Funktionen wurde auf dem aktuellen Stand abgeschlossen.
- Ergebnis laut letzter vollständiger CI-Prüfung: 435 Tests bestanden, 0 fehlgeschlagen; TypeScript-Prüfung und Produktionsbuild erfolgreich. Der optionale Render-Deploy-Schritt wurde nicht ausgeführt. Dies ist kein Nachweis eines manuellen Browser- oder Live-Firestore-Tests.
- Bestätigte sicherheits- und datenintegritätsrelevante Fehler wurden in den zwischenzeitlich integrierten Korrekturen behoben. Für die verbleibenden Punkte siehe den Gesprächs-/Reviewstand; offene Architektur- und Skalierungsfragen werden nicht als akute Academy-Blocker behandelt.
- Vor neuen Academy-Funktionen gilt weiterhin: reine bestätigte Bugfixes können nach grüner CI eigenständig gemergt werden; neue fachliche Abläufe und Architekturentscheidungen benötigen weiterhin Freigabe.

## 10.11.2026 – Reader-Integration persönlicher Notizen und Lesezeichen (PR #132 gemergt)

**Technischer Ist-Befund vor Umsetzung auf `main` (`c92b57c`):**
- `AcademyPrivateNoteDoc`, die private Repository-Collection, Owner-isolierte CRUD-Methoden und die serverseitigen Endpunkte `GET/POST/PUT/DELETE /api/academy/notes` sind bereits vorhanden.
- Der separate Bereich „Meine Notizen“ bietet Suche nach Titel/Inhalt/Tags sowie manuelle Bearbeitung und Löschung.
- `AcademyMaterialReader.tsx` zeigte die gepinnte Materialfassung und die Inhaltsübersicht, hatte aber noch keine direkten Notiz-/Lesezeichenwerkzeuge.
- Notizen sind bereits an `materialId` und `materialVersionId` gebunden; die Backend-Revision schützt vor konkurrierenden Änderungen.

**Umsetzung auf `feature/academy-reader-private-notes` (PR #132, Merge-Commit `b1060020b853e8e1ee5f9e426fedba4e224f0f71`):**
- Einklappbares Reader-Panel für persönliche Notizen und Lesezeichen.
- Eintragserstellung direkt aus der geöffneten, zugänglichen Materialfassung; Einträge werden nur für die exakte Materialversion geladen.
- Markdown-Notizinhalt mit sicherer Vorschau, Titel und Tags.
- Automatisches Speichern mit sichtbarem Status, serialisierten Schreibvorgängen und Behandlung von Revisionskonflikten.
- Beim Wechsel der Materialfassung reiht die Reader-Komponente einen noch nicht gespeicherten Entwurf vor dem Zurücksetzen des alten Kontexts zum Speichern ein; der Debounce-Timer allein wird nicht als Persistenzgarantie behandelt.
- Lesezeichen setzen/entfernen; bestehende Notiz- und Lesezeichen-Privatsphäre bleibt über die vorhandene serverseitige Owner-Isolation erhalten.
- Die vorhandene zentrale Notizenansicht bleibt als Such- und Verwaltungsübersicht bestehen.

**Abgrenzung / noch nicht durch diesen Schritt erfüllt:**
- Mehrere Quellen innerhalb eines einzelnen Notizobjekts sind im aktuellen Datenmodell noch nicht umgesetzt; derzeit bleibt eine Notiz an eine konkrete Materialfassung gebunden.
- Seiten-/Textstellenanker und Warnungen bei veralteten Ankern bleiben offen. Das passt zur bestehenden Spezifikationsnotiz, dass stabile Anker erst nach einer tragfähigen Strategie umgesetzt werden.
- Vollständige Offline-Bearbeitung ist weiterhin nicht zugesagt.
- PDF-Unterstützung und PDF-Sicherheitsinfrastruktur werden nicht wieder aufgenommen.
- GitHub Actions auf Commit `b9cf2268340a2d9b2f44de14e5726322a85f30c3`: `bun run lint`, `bun run build` und `bun run test` erfolgreich; 435 Tests bestanden, 0 fehlgeschlagen. Die PR-Vorlagenprüfung ist ebenfalls erfolgreich.
- Der optionale Render-Deploy-Schritt wurde übersprungen. Es fand kein Produktionsdeployment statt.
- Die CI-Prüfung auf dem finalen PR-Stand war erfolgreich (435/435 Tests, TypeScript und Produktionsbuild). Eine manuelle Browser-/App- und Live-Firestore-Prüfung wurde nicht durchgeführt. PR #132 wurde nach erfolgreicher CI und Codeprüfung gemergt; tatsächlicher Render-Deploymentstatus wurde nicht verifiziert.


## 10.11.2026 – Mehrere Quellen pro persönlicher Notiz (PR #134 gemergt)

**Fachliche Grundlage:** Abschnitt 12 der Academy-Detail-Spezifikation legt mehrere Quellen pro Notiz fest. Notizen bleiben privat, versionsgebunden und dürfen keinen Zugriff auf gesperrte Quellen vermitteln. Seiten-/Textstellenanker bleiben bis zu einer belastbaren Strategie zurückgestellt.

**Technische Umsetzung auf `feature/academy-multi-source-notes`:**
- Ergänzung eines optionalen `sources`-Arrays mit konkreten `materialId`-/`materialVersionId`-Paaren.
- Legacy-Felder bleiben für bestehende Notizen erhalten; fehlende Quellenlisten werden bei API-Ausgabe als einzelne bisherige Quelle projiziert.
- Servervalidierung begrenzt Quellenlisten, lehnt ungültige und doppelte Referenzen ab und lässt Lesezeichen weiterhin nur auf eine Quelle zeigen.
- Im Reader können bestehende persönliche Notizen mit der aktuell geöffneten Materialfassung verknüpft und zusätzliche Verknüpfungen wieder gelöst werden.
- Die zentrale Ansicht „Meine Notizen“ zeigt alle zugeordneten Quellen.
- Die eigentliche Materialfreigabe wird weiterhin ausschließlich durch die bestehenden Reader-/Materialzugriffs-APIs kontrolliert; eine private Quellenreferenz ist kein Zugriffsrecht.

**Prüfergebnis:** rückwärtskompatible Behandlung alter Datensätze, API-Revisionen bei parallelen Änderungen, Fehler-/Grenzfälle sowie CI geprüft. PR #134 wurde nach erfolgreicher GitHub-CI (436/436 Tests, TypeScript und Produktionsbuild) und Codeprüfung gemergt. Der optionale Render-Deploy-Schritt wurde übersprungen; Produktionsdeployment und manuelle Browser-/Live-Firestore-Prüfung wurden nicht verifiziert.

**In Umsetzung mit PR #135:** Quellstatus bei verlorener Berechtigung („nicht zugänglich“) und endgültiger Entfernung („nicht mehr verfügbar“). Für Markdown- und Code-Materialien ist die stabile Ankerstrategie mit PR #136 umgesetzt; PDF-Seitenanker bleiben bis zur Wiederaufnahme der PDF-Infrastruktur zurückgestellt.


## 10.11.2026 – Status privater Notizquellen (in Umsetzung)

- Der Quellenstatus wird bei Bedarf pro einzelner privater Notiz geladen; eine globale Prüfung aller Quellen beim Laden der Notizliste wird vermieden.
- Serverstatus: `available` bei existierender konkreter veröffentlichter Materialfassung und aktueller Rollenfreigabe; `restricted` bei existierender, aber rollenbedingt nicht zugänglicher Fassung; `unavailable` bei fehlendem Materialstamm oder fehlender/inkonsistenter Versionsreferenz.
- Archivierte Materialstämme bzw. historische Fassungen gelten nicht allein wegen der Archivierung als entfernt.
- Die Statusroute ist auf den Eigentümer der privaten Notiz beschränkt und liefert ausschließlich Quell-IDs und Status, niemals Materialinhalte.
- Frühere/beendete Kursteilnahme ist nicht ausschlaggebend, wenn der Nutzer die konkrete Fassung aktuell direkt lesen darf.
- GitHub-CI für PR #135: 436/436 Tests bestanden; TypeScript-Prüfung und Produktionsbuild erfolgreich. Die PR-Vorlagenprüfung wurde nach Ergänzung des erforderlichen `feature`-Labels ebenfalls erfolgreich wiederholt.
- Keine manuelle Browser-/Live-Firestore-Prüfung und kein Produktionsdeployment durchgeführt.


## 0.2 Textanker für private Notizen und Lesezeichen – PR #136 gemergt

- Beschlossene Strategie: Anker pro Materialquelle, exakte Materialversionsbindung, Auswahltext plus Kontext und Markdown-Überschriftenpfad bzw. Code-Zeilenbereich.
- Eindeutige Wiederfindung ist Voraussetzung für das Anspringen. Fehlende/mehrdeutige Treffer dürfen nicht automatisch auf eine ähnliche Position umgedeutet werden.
- Die erste Implementierung ergänzt das optionale Ankerdatenmodell, serverseitige Validierung, Auswahl im Reader, Speichern mit neu erstellten Notizen/Lesezeichen sowie die Prüfung und Navigation zu eindeutigen Treffern.
- Bestehende Notizen ohne Anker bleiben rückwärtskompatibel. Keine PDF-Funktionalität und keine Übertragung auf neue Materialversionen.
- Detailreview ergänzt: Markdown-Wiederfindung berücksichtigt zusätzlich den gespeicherten Überschriftenpfad; Anker-Schreibaktionen werden während ungespeicherter Notizänderungen blockiert.
- GitHub-CI für PR #136: 443/443 Tests bestanden; TypeScript-Prüfung und Produktionsbuild erfolgreich. PR-Vorlagenprüfung erfolgreich.
- Keine manuelle Browser-/Live-Firestore-Prüfung und kein verifiziertes Produktionsdeployment.


## 10.11.2026 – Lokale Wiederaufnahme der Academy-Reader-Leseposition (Draft-PR #141)

- Die beschlossene Speicherung/Wiederaufnahme der letzten Leseposition wird zunächst lokal im selben Browser/Gerät umgesetzt.
- Speicheridentität umfasst Teilnahme, Materialstamm und die exakte unveränderliche Materialversion. Eine Position wird nicht auf eine andere Teilnahme oder Materialfassung übertragen.
- Markdown speichert den relativen Dokumentfortschritt; Code-Materialien speichern die interne Scrollposition des Quelltextbereichs.
- Lokaler Speicher wird fail-soft behandelt: nicht verfügbare Browser-Speicherung verhindert nicht das Öffnen/Lesen.
- Keine API-, Backend-, Datenmodell- oder Berechtigungsänderung; keine externen Dienste oder laufenden Kosten.
- Geräte-/browserübergreifende Synchronisierung bleibt offen. PDF-Seitenpositionen bleiben wegen der zurückgestellten PDF-Infrastruktur unberührt.
- PR #141 wurde nach erfolgreicher CI (451/451 Tests, TypeScript und Produktionsbuild) per Squash gemergt. Der anschließende Main-Workflow einschließlich Render-Deploy-Hook war erfolgreich. Manuelle Browser-/Live-Runtime-Prüfung wurde nicht durchgeführt.


## 10.11.2026 – Ergebnisfreigabe und verpflichtender Prüfungsnachweis: Beschlussstand

- Der Standard für eine Prüfung ohne explizite Ergebnisfreigabe-Konfiguration ist verbindlich **manuelle Erstfreigabe**.
- Ein Pflichtnachweis `required_assessment` ist ausschließlich durch einen endgültig bewerteten, bestandenen und offiziell freigegebenen Versuch der Prüfungsart `final_exam` erfüllt.
- Nicht bewertete, manuell unvollständig bewertete, fehlgeschlagene oder nicht freigegebene Versuche zählen nicht.
- Korrekturen nach einer Freigabe müssen die bisherige Freigabe bis zur erneuten kontrollierten Freigabe unwirksam machen; Audit-Historie bleibt erhalten.
- Teilnehmer sehen bis zur Freigabe keinen Pass/Fail-Status und keine Ergebnisdetails.
- Umsetzung der ersten Ergebnisfreigabe-Stufe erfolgt auf Branch `feature/exam-result-release`, PR #144. Enthalten sind ein Admin-only Freigabeendpunkt und eine Admin-Freigabequeue, persistenter Freigabestatus samt Audit-Historie, neutrale Teilnehmerprojektion bis zur Freigabe sowie erneute Freigabepflicht nach Korrektur. Die Service-Tests wurden ergänzt; GitHub-CI und unabhängige PR-Prüfung stehen noch aus. Die automatische Freigabe-Konfiguration ist noch nicht umgesetzt; mangels vorhandener Einstellung gilt aktuell manuelle Erstfreigabe. Die `required_assessment`-Verknüpfung ist ebenfalls noch nicht implementiert. Browser-/Live-Firestore-Tests bleiben bis zum gemeinsamen Academy-Test zurückgestellt.


## 10.11.2026 – Ergebnisfreigabe-Stufe 1 abgeschlossen (PR #144)

- PR #144 `feat(exams): introduce controlled result release` wurde per Squash gemergt.
- Main-Commit: `bb309ba5fa1e0fb8bd458e63cbac6dd2f8032f9b`.
- Ergebnisfreigabe ist serverseitig transaktional und Admin-only. Eine Freigabe wird mit Actor, Zeit, Ergebnisstand und Historie gespeichert; doppelte Freigaben sind idempotent.
- Teilnehmer erhalten vor der offiziellen Freigabe nur eine neutrale Abgabe-/Freigabeinformation. Das gilt sowohl für die direkte Submit-Antwort als auch für die Ergebnisübersicht.
- Korrekturen bereits freigegebener manueller Bewertungen setzen `pending_rerelease`; der bisherige Freigabeverlauf bleibt erhalten und die neue Bewertung wird erst nach erneuter Admin-Freigabe sichtbar.
- Admin-Freigabequeue ist im bestehenden Korrekturzentrum ergänzt. Die Prüfungswerkstatt bleibt Admin-only; Colonels erhalten keine Ergebnisfreigabe-Berechtigung.
- CI auf PR-Head erfolgreich: TypeScript-Check und Produktionsbuild erfolgreich; **451/451 Tests bestanden**; PR-Template-Validierung erfolgreich.
- Der Main-Push-Workflow einschließlich optionalem Render-Deploy-Hook war erfolgreich. Dies bestätigt den CI-/Hook-Schritt, aber nicht die tatsächliche Laufzeitgesundheit der Anwendung.
- Keine manuelle Browser-/Live-Firestore-Prüfung durchgeführt; sie bleibt Teil des gemeinsamen Academy-Abnahmetests.
- Noch nicht implementiert: konfigurierbare automatische Ergebnisfreigabe sowie die serverseitige Verknüpfung von `required_assessment` mit einem aktuell freigegebenen `final_exam`-Versuch. Der aktuell fehlende Konfigurationswert führt weiterhin sicher zur manuellen Erstfreigabe.



## 10.11.2026 – Dynamischer Academy-Nachweis für freigegebene Abschlussprüfungen (PR in Arbeit)

- Umsetzung auf Branch `feature/academy-final-exam-evidence`.
- `required_assessment` wird gegen das Prüfungsrepository aufgelöst: exakte Prüfungs-ID, Teilnehmer-UID, Kurskennung, Versuchstyp `final_exam`, passende unveränderliche Prüfungsversion, endgültiger Status `passed`, aktuelle Freigabe und konsistenter letzter Freigabehistorieneintrag; Punktzahl muss die Versions-Bestehensgrenze erreichen.
- Es wird kein persistentes Academy-Nachweisduplikat erzeugt. Kursstatus und Lehrgangsfortschritt werden bei den relevanten Leseansichten dynamisch projiziert. Nach Korrektur mit `pending_rerelease` oder nach erneut freigegebenem Nichtbestehen fällt ein zuvor dynamisch projizierter Abschluss beim nächsten Lesen auf „in Bearbeitung“ zurück.
- Bei fehlenden/ungültigen Prüfungsdaten oder Repositoryfehlern wird der Prüfungsnachweis nicht erfüllt (fail-closed).
- CI und Code-Review stehen noch aus. Keine Browser-/Live-Firestore-Prüfung; diese bleibt für den gemeinsamen Academy-Abnahmetest vorgesehen.
