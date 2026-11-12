# RCPD – Aktueller Planungs- und Redesignstand

**Stand:** 12.11.2026 – Academy-Redesign wird eigenständig in geprüften PR-Schritten fortgeführt; aktuelle Reader-/Taxonomiekorrekturen #233/#235 gemergt. PDF-Infrastruktur bleibt zurückgestellt.

**Aktueller Basisstand:** `main` nach PR #235 (Merge-Commit `fb8b5e8bf3aca351de6f2cbc0dacc47ac5829aaf`).
**Aktueller Umsetzungsstand:** PR #149/#150 (persistente Examiner-Claims und Bewertungs-Drafts), PR #152 (Übergabe, administrative Neuzuweisung und Benachrichtigungen), PR #185 (serverseitige Reviewer-Whitelist-Prüfung), PR #187 (Sortierung nach tatsächlichem Bewertungsabschluss), PR #189 (Erhalt des zuletzt freigegebenen Ergebnisses während Korrekturen) und PR #190 (unveränderter ursprünglicher Bewertungsabschlusszeitpunkt und Prüfer bei Korrekturen) sind gemergt. Für PR #150/#152 sind TypeScript-Prüfung, Produktionsbuild, 453/453 Tests und PR-Vorlagenprüfung dokumentiert. Der optionale Render-Deploy-Hook wurde bei diesen PR-Läufen übersprungen; der tatsächliche Produktionsdeploymentstatus ist nicht verifiziert. Eine gemeinsame manuelle Browser-/Live-Firestore-Abnahme steht weiterhin aus.

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
- Die Academy-Informationsarchitektur und wesentlichen fachlichen/UX-Abläufe sind in `ACADEMY-DETAILED-SPECIFICATION.md` und `DECISIONS.md` bereits umfangreich ausgearbeitet. Sie werden nicht erneut von Grund auf konzipiert. Die funktionale Umsetzung ist weit fortgeschritten, aber wegen der offenen Examiner-Historien-/Action-Request-Arbeiten und der ausstehenden gemeinsamen Browser-/Live-Firestore-Abnahme noch nicht vollständig abgeschlossen.
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

1. Beschlossene Examiner-Restarbeiten abschließen: einsehbare Claim-/Übergabehistorie sowie wichtige Action Requests einschließlich Benachrichtigungen und Revisionsrückgabe.
2. Gemeinsame Academy-Abnahme der implementierten Funktionen in realen Browser-/Live-Firestore-Szenarien; CI-Ergebnisse ersetzen diese Prüfung nicht.
3. Die bestehende Academy-Spezifikation gegen den aktuellen Code abschließend auf echte Lücken, Regressionen, Datenschutz-/Berechtigungsfehler und inkonsistente Zustandsdarstellung prüfen. Bereits beschlossene UX-/Fachregeln nicht neu aufrollen.
4. Danach die visuelle Academy-Gestaltung ausarbeiten und prototypisch validieren: gemeinsame Portal-Designgrundlagen, Screen-Kompositionen der fünf vorhandenen Bereiche, Examiner-Ansichten, Reader-Werkzeuge, responsive Layouts und Accessibility.
5. Globale Portalgrundlagen und Abhängigkeiten so weit berücksichtigen, dass die Academy in das spätere Gesamtdesign passt; die vollständige Konzeption anderer Module erfolgt später in eigenen Abschnitten.
6. PDF-Infrastruktur bleibt zurückgestellt. Sie ist kein Blocker für das aktuelle Text-/Code-basierte Academy-Visual-Redesign.
7. Empfehlungen und sonstige noch offene fachliche Randregeln nur dann weiter konkretisieren, wenn sie für einen tatsächlich umgesetzten und jetzt zu gestaltenden Ablauf erforderlich sind. Keine Scope-Erweiterung aus bloßer Vollständigkeit.

## 6. Noch offene nächste Schritte

1. Examiner-Historienansicht und Action-Request-/Revisionsworkflow gemäß `ACADEMY-DETAILED-SPECIFICATION.md` und den Beschlüssen vom 11.11.2026 implementieren und testen.
2. Verbleibende technische/UX-Befunde aus dem Academy-Audit gezielt gegen die aktuelle Implementierung verifizieren. Nur nachgewiesene Fehler oder unvollständige Beschlüsse korrigieren.
3. Gemeinsame Browser-/Live-Firestore-Abnahme der Academy-Funktionen einschließlich Rollen, Benachrichtigungen, Direktnavigation, Reader, Prüfungen und Ergebnisprojektionen durchführen.
4. Visuelle Designphase beginnen: bestehende Academy-Struktur als verbindliche Grundlage nehmen; passende etablierte Websites/Designsysteme und Accessibility-Standards für konkrete UI-Entscheidungen recherchieren; Optionen mit Vor-/Nachteilen und RCPD-Begründung dokumentieren.
5. Designsystem und globalen Portalrahmen als gemeinsame Grundlage berücksichtigen; andere Module erst in ihren späteren Redesign-Abschnitten vollständig konzipieren.

Vor jeder Umsetzung sind passende Detail-Spezifikation, Entscheidungsregister, bestehende Berechtigungen, technische Architektur und UX-/Accessibility-Anforderungen abzugleichen. Bereits entschiedene Fragen werden nicht erneut gestellt oder stillschweigend geändert.

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
- Zum Zeitpunkt des Abschlusses von PR #144 waren automatische Freigabekonfiguration und `required_assessment`-Integration noch nicht umgesetzt. Die dynamische `required_assessment`-Verknüpfung folgt im nachstehenden PR #146; automatische Freigabekonfiguration bleibt eine spätere offene Erweiterung. Ohne explizite Einstellung gilt manuelle Erstfreigabe.



## 10.11.2026 – Dynamischer Academy-Nachweis für freigegebene Abschlussprüfungen (PR #146 abgeschlossen)

- Umsetzung auf Branch `feature/academy-final-exam-evidence`.
- `required_assessment` wird gegen das Prüfungsrepository aufgelöst: exakte Prüfungs-ID, Teilnehmer-UID, Kurskennung, Versuchstyp `final_exam`, passende unveränderliche Prüfungsversion, endgültiger Status `passed`, aktuelle Freigabe und konsistenter letzter Freigabehistorieneintrag; Punktzahl muss die Versions-Bestehensgrenze erreichen.
- Es wird kein persistentes Academy-Nachweisduplikat erzeugt. Kursstatus und Lehrgangsfortschritt werden bei den relevanten Leseansichten dynamisch projiziert. Nach Korrektur mit `pending_rerelease` oder nach erneut freigegebenem Nichtbestehen fällt ein zuvor dynamisch projizierter Abschluss beim nächsten Lesen auf „in Bearbeitung“ zurück.
- Bei fehlenden/ungültigen Prüfungsdaten oder Repositoryfehlern wird der Prüfungsnachweis nicht erfüllt (fail-closed).
- PR #146 wurde per Squash gemergt; Main-Commit: `534b9df2fa6f5a312d27abb7edcc7a82792ceb3b`. CI auf PR-Head erfolgreich: TypeScript-Prüfung, Produktionsbuild und 453/453 Tests; PR-Template-Validierung erfolgreich. Der Main-Push-Workflow einschließlich optionalem Render-Deploy-Hook war ebenfalls erfolgreich; dies ist kein Nachweis der tatsächlichen Laufzeitgesundheit. Keine Browser-/Live-Firestore-Prüfung; diese bleibt für den gemeinsamen Academy-Abnahmetest vorgesehen.


## 10.11.2026 – Persistente Examiner-Claims und serverseitige Bewertungs-Drafts (PR #149/#150 abgeschlossen)

- PR #149 `feat(examiner): add persistent review claims` wurde per Squash gemergt; Main-Basis vor PR #150: `81223bbf858bc0ba280379474d5e527536b7cc58`.
- Examiner-Claims sind serverseitig persistent. Claim, Freigabe und automatische Freigabe werden historisiert; die Bearbeitungsinhalte bleiben anderen Prüfern während eines fremden Claims verborgen.
- Die festgelegten Inaktivitätsregeln sind serverseitig abgebildet: 30 Minuten bis zur Warnung, weitere 10 Minuten bis zur automatischen Freigabe; bei Disconnect höchstens 30 Minuten Claim-Haltezeit.
- PR #150 `feat(examiner): persist per-question grading drafts` wurde per Squash gemergt; Main-Commit: `99d7694abaa0be0254ce10f910c103a8d0db3d2b`.
- Einzelne Freitext-Bewertungsschritte werden als Draft serverseitig gespeichert. Die konkrete unveränderliche Prüfungsversion, offene Freitextfrage, Punkteobergrenze und aktuelle Claim-Zuständigkeit werden vor jedem Speichern geprüft. Draft-Punkte und vertrauliche Antworten werden anderen Prüfern nicht offengelegt; Teilnehmerprojektionen erhalten keine internen Draft-Daten.
- Beim freiwilligen Freigeben kann der Prüfer gespeicherte Drafts behalten oder noch nicht gespeicherte lokale Eingaben verwerfen. Nach einem Disconnect ist ein ausdrücklicher neuer Claim erforderlich; vorher sind Draft-Speicherung und endgültige Bewertung gesperrt.
- Wiederholte Claim-Anfragen verlängern die Inaktivitätsfrist nicht. Ablaufprüfungen erfolgen zusätzlich unmittelbar vor Freigabe und endgültiger Bewertung, damit ein veralteter Claim nicht allein deshalb nutzbar bleibt, weil noch keine Queue-Abfrage den Status aktualisiert hat.
- GitHub-CI für PR #150: TypeScript-Prüfung und Produktionsbuild erfolgreich; **453/453 Tests bestanden**; PR-Vorlagenprüfung erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen. Kein bestätigter Produktionsdeploy und keine manuelle Browser-/Live-Firestore-Prüfung.
- Nächste Schritte: die verbleibenden beschlossenen Examiner-Elemente umsetzen, insbesondere die vollständige einsehbare Claim-/Übergabehistorie und die noch festgelegten wichtigen Aktionsanfragen samt Benachrichtigungen. Schwellenwerte für zusätzliche Vorgesetzten-Benachrichtigungen bei auffälligen automatischen Freigaben bleiben gemäß `OPEN-QUESTIONS.md` offen und werden nicht geraten. Browser-/Live-Firestore-Abnahme für Claims, Drafts, Übergabe, Benachrichtigungen und Direktnavigation steht ebenfalls aus.


## 10.11.2026 – Examiner-Übergabe, administrative Neuzuweisung und Benachrichtigungen (PR #152 abgeschlossen)

- PR #152 `feat(examiner): support review handoff and reassignment notifications` wurde per Squash gemergt; Main-Commit: `465c55ab92164e5f47e30b041ac80ef678c718ec`.
- Aktive Prüfer können einen eigenen Claim an einen anderen für den konkreten Kurs berechtigten und nicht gesperrten Prüfer übergeben. Admins und Colonels können einzelne bestehende Claims administrativ neu zuweisen; Sammel-Neuzuweisungen gibt es nicht.
- Ein Verantwortungswechsel ersetzt den serverseitigen Claim atomar. Der vorherige Prüfer verliert sofort Lese-/Schreibzugriff auf die vertraulichen Antworten und Schreibzugriff auf Drafts; gespeicherte Drafts bleiben für den neuen Verantwortlichen erhalten.
- Bei freiwilliger Übergabe kann der Prüfer explizit gespeicherte Drafts vorab sichern oder lokale, noch nicht gespeicherte Eingaben verwerfen. Diese Eingaben werden nicht stillschweigend übertragen.
- Die Claim-Historie protokolliert Übergabe, administrative Neuzuweisung, Warnungsbeginn, freiwillige Freigabe und automatische Freigabe samt Grund und Verantwortlichen. Benachrichtigungszustellung wird idempotent über persistente Historienmarker verfolgt.
- In-App-Benachrichtigungen informieren neuen und bisherigen Verantwortlichen über den Wechsel, den aktuellen Prüfer über die bevorstehende automatische Freigabe und den bisherigen Prüfer über die automatische Freigabe einschließlich Hinweis auf den zuletzt gespeicherten Draft-Stand. Benachrichtigungen enthalten einen Direktlink zum konkreten Examiner-Vorgang in der Academy.
- PR #152: TypeScript-Prüfung und Produktionsbuild erfolgreich; **453/453 Tests bestanden**; PR-Vorlagenprüfung erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen. Kein bestätigter Produktionsdeploy und keine manuelle Browser-/Live-Firestore-Prüfung.
- Noch offen: vollständige UI-Einsicht in die Claim-/Übergabehistorie sowie die beschlossenen wichtigen Aktionsanfragen und deren Benachrichtigungen. Zusätzliche Vorgesetzten-Benachrichtigungen für auffällige automatische Freigaben bleiben bis zur Klärung der offenen Schwellenwerte zurückgestellt.


## 11.11.2026 – Start des vollständigen Academy-UX-/UI-Audits

- Der Projektinhaber hat bestätigt, dass die Academy als erster Teil des vollständigen Portal-Redesigns gründlich und recherchegestützt konzipiert wird. Das Gesamtportal bleibt das Ziel; globale Design- und Navigationsgrundlagen müssen deshalb von Beginn an berücksichtigt werden.
- Neue Planungsdatei `ACADEMY-UX-AUDIT.md`: erste read-only Bestandsaufnahme von `main` bei `eb3d75b24b4d90f1f923e57f5ec527b03ea02408`, erste technische Befunde, UX-Hypothesen, offene Prüfpunkte und Recherche etablierter Plattformen/Designsysteme.
- Erste Codebereiche geprüft: `src/App.tsx`, `src/components/AcademyCenter.tsx`, `AcademyLearningCenter.tsx`, `AcademyAuthoringCenter.tsx`, Materialverwaltung/Reader/Notizen sowie Prüfungs- und Examiner-Komponenten.
- Erste Recherche: Canvas, Open edX, Moodle, GOV.UK Design System, DWP Design System (interne Verwaltungsoberflächen), WAI-ARIA APG, WCAG 2.2 und Nielsen Norman Group. Quellen und RCPD-spezifische Prüfimplikationen sind im Audit dokumentiert.
- Vorläufige technische Prüfpunkte: lokaler Academy-Navigationsstate ohne URL-Abbildung; parallele neue und ältere Prüfungsdarstellungen; mögliche fehlende normale Einstiege zu Examiner-/Korrekturbereichen; Übersicht nutzt teilweise Legacy-Props, während neue Lernbereiche eigene API-Daten laden; Legacy- und versionierte Materialien werden in einer Bibliotheksliste zusammengeführt.
- Zusätzliche Prüfung: Rollenmatrix und granulare Kursrechte aus `src/types/portal.ts`, `server/rolePermissions.ts` und `server/academyApi.ts`; Dashboard-Verknüpfung von `ProfessionalDevelopmentModule`; Examiner-Einstiege über `App.tsx`-Benachrichtigungen; Such-/Filter-/Sortiermöglichkeiten der Prüfungswarteschlangen und Verwaltungslisten. Befunde zu doppelten Fortschrittsprojektionen, parallelen Prüfungsdarstellungen, nicht regulär erreichbaren Legacy-Zweigen und Listenbedienung wurden in Abschnitt 8 des Audits ergänzt.
- Diese Punkte sind noch keine freigegebenen UX-Entscheidungen. Die Live-Browser-, Responsive-, Tastatur- und Screenreader-Prüfung steht aus. Es wurden keine Anwendungsdateien verändert.
- Die Rollen-/Rechte- und Aufgabenprüfung wurde ergänzend begonnen und in Abschnitt 8 des Audits dokumentiert. Sie dient der Validierung der vorhandenen Academy-Spezifikation; sie eröffnet keine erneute Grundsatzkonzeption. Nächster Academy-Schritt ist die gezielte Schließung der bereits dokumentierten funktionalen Restarbeiten und danach das visuelle Redesign auf Basis der bestehenden Beschlüsse.


## 11.11.2026 – Klarstellung: Academy-Konzept ist bereits ausgearbeitet; nächster Schwerpunkt ist Visual Design

- Der Projektinhaber hat ausdrücklich klargestellt, dass die Academy-Struktur, die wesentlichen Nutzeraufgaben und die fachlichen/UX-Abläufe bereits in den früheren Audits und in `ACADEMY-DETAILED-SPECIFICATION.md`, `DECISIONS.md` und `PORTAL-REDESIGN-DETAILS.md` ausgearbeitet wurden. Diese Arbeit wird nicht erneut begonnen.
- Die fünf Hauptbereiche bleiben verbindlich: Übersicht, Kurse, Lernbibliothek, Prüfungen und Meine Notizen. Examiner bleibt rollen-/berechtigungsabhängig integriert und ist kein sechster allgemeiner Hauptbereich.
- Die neue Datei `ACADEMY-UX-AUDIT.md` ist deshalb ausdrücklich nur eine ergänzende Implementierungsprüfung und Vorbereitung des visuellen Redesigns. Ihre Codebeobachtungen sind Prüfhinweise gegen die bestehende Spezifikation, keine neue IA-Konzeption und keine Freigabe, bereits entschiedene Fragen erneut zu öffnen.
- Die funktionale Academy ist weit fortgeschritten, aber nicht vollständig abgeschlossen: Der Planungsstand nennt als konkrete Restarbeiten die vollständige UI-Einsicht in Claim-/Übergabehistorie sowie wichtige Action Requests einschließlich Benachrichtigungen und Revisionsrückgabe. Die Revisionsberechtigung Option A wurde am 11.11.2026 beschlossen (alle aktuell kursautorisierten Prüfer dürfen eine abgeschlossene Bewertung zurückgeben); die Implementierung ist noch nicht durch einen Code-PR belegt.
- Der gemeinsame Browser-/Live-Firestore-Abnahmetest für die neueren Academy-Funktionen bleibt offen. PR #189 bewahrt während `pending_rerelease` den zuletzt freigegebenen Teilnehmer-Snapshot; PR #190 stellt sicher, dass Korrekturen `reviewedAtIso` und `reviewedByUid` des ursprünglichen Abschlusses nicht überschreiben. PR #187 korrigiert zusätzlich die Sortierung abgeschlossener manueller Bewertungen auf das tatsächliche Bewertungsabschlussdatum (reviewedAtIso) und sichert die Reihenfolge mit einem Regressionstest ab. CI-Ergebnisse und manuelle Laufzeitabnahme dürfen nicht gleichgesetzt werden.
- Für das Visual Design verbleiben insbesondere Designsystem/Portalrahmen, konkrete Screen-Kompositionen der bestehenden fünf Bereiche und berechtigungsabhängigen Examiner-Ansichten, responsive Umsetzung, Reader-Toolbar-Anordnung, visuelle Zustände sowie prototypische Validierung. Jede größere Designentscheidung muss mit aktueller Recherche etablierter Produkte/Designsysteme und Accessibility-Standards begründet werden.
- Nicht erneut zu konzipieren sind die beschlossenen Academy-Regeln zu Kursen/Programmen, Statusdimensionen, Bibliotheksversionen, Reader-/Notizlogik, Prüfungsabläufen, Claims, Ergebnisfreigabe, Korrekturen und Berechtigungen. Änderungen sind nur bei nachgewiesenem Implementierungsfehler, unvollständiger Umsetzung oder ausdrücklich neuem Beschluss zulässig.


## 11.11.2026 – Academy-Einstiegskacheln und erste lokale SVG-Entwürfe

- Die freigegebene schlichte, flächige Motivrichtung wurde als fünf lokale SVG-Dateien unter `src/assets/academy/` umgesetzt.
- `AcademyCenter.tsx` trennt nun die reine Academy-Einstiegsansicht vom regulären Bereich Übersicht. Die Einstiegsansicht enthält fünf Kacheln; die horizontale Hauptnavigation wird erst nach Auswahl eines Bereichs angezeigt.
- Die fünf Kacheln führen zu den vorhandenen Academy-Bereichen. Bestehende Fachlogik, APIs, Datenmodelle und Berechtigungen wurden nicht absichtlich verändert.
- Die SVGs sind erste technische Entwürfe und müssen noch visuell auf Formtreue, einheitliche Gewichtung, Kachelwirkung und responsive Darstellung geprüft werden.
- Visuelle Nacharbeit auf dem bestehenden Feature-Branch: Bibliotheks-SVG auf drei kompakt gestaffelte/leicht überlagerte geschlossene Bücher korrigiert; Academy-Kacheln auf einfarbige Bereichsflächen mit weicher, zurückhaltender weißer Reflexion, dezenten Schatten und sanftem Hover-Verhalten umgestellt. Responsives Raster auf 1/2/3 Spalten (Smartphone/Tablet/Desktop) ausgerichtet. Die verbindliche Oberflächenentscheidung wurde in Spezifikation und Entscheidungsregister ergänzt.

- Weitere visuelle Nacharbeit: alle fünf SVG-Motive auf einen gemeinsamen optischen Füllbereich von ungefähr 70–78 % der 128×128-Zeichenfläche zentriert und skaliert; der Richtwert ist in Spezifikation und Entscheidungsregister festgehalten. Kacheltexte nutzen durchgehend Weiß für bessere Lesbarkeit; Hover-Bewegung berücksichtigt `prefers-reduced-motion`.
- Diese Änderungen sind noch nicht durch Lint, Build, Tests oder Browserprüfung verifiziert. Kein PR, Merge oder Deployment.

- Lint, Build, Tests und Browser-/Live-Abnahme sind für diesen Branch noch nicht ausgeführt. Vor Merge müssen die verpflichtenden Prüfungen aus `AGENTS.md` tatsächlich laufen; nicht ausgeführte Prüfungen dürfen nicht als bestanden markiert werden.

## 11.11.2026 – Browserprüfung der Academy-Einstiegsseite und Folgeanpassung

- Projektinhaber hat die nach PR #156 gemergte Kachelansicht im Browser geprüft: alle fünf Kacheln führen in den richtigen Bereich; Abstände und Bedienbarkeit sind auf den geprüften Gerätegrößen konsistent; die visuelle Kachelgestaltung wird ausdrücklich als gelungen bestätigt und bleibt unverändert.
- Beobachtete Funktionslücke: Nach Auswahl eines Bereichs gab es innerhalb der Academy keinen direkten Rückweg zur Kachel-Startseite. Bisher war dafür ein Wechsel zu einem anderen Portalmodul und zurück erforderlich.
- Folgeänderung beschlossen: Breadcrumb „Academy > aktueller Bereich“ im Academy-Header, wobei „Academy“ zur Kachel-Startseite zurückführt. Der Header wird typografisch aufgewertet und erhält einen zurückhaltenden blauen Akzent; der Abstand zum Inhalt wird leicht erhöht.
- Zusätzlich beschlossen: sehr kurze Druckreaktion beim Kachelklick und dezenter Fade-/Vertikalübergang beim Öffnen des Bereichs; Reduced-Motion-Einstellung wird berücksichtigt.
- Implementierung auf `feature/academy-header-navigation-transitions` abgeschlossen und als Draft-PR #157 eröffnet. GitHub-CI: TypeScript-Prüfung und Produktionsbuild erfolgreich, 453/453 Tests bestanden; PR-Vorlagenprüfung nach Ergänzung des Labels `enhancement` erfolgreich. Lokale npm-Skripte und Browserabnahme der neuen Header-/Breadcrumb-/Übergänge wurden nicht ausgeführt. PR ist nicht gemergt; Deployment nicht bestätigt.
- Code-Review-Nachprüfung: Alle zwölf `activeTab`-Varianten sind durch die Breadcrumb-Zuordnung abgedeckt (einschließlich `exam_reviews`, `exam_corrections`, `tests`, `final_exams`, `upload_textbook`, `add_code_test` und `instructor_grading`). Die externe Navigation über `reviewNavigationTarget` führt ebenfalls in den Prüfungsbereich. Keine API-, Rollen- oder Berechtigungsänderungen im Diff. Kleiner CSS-Robustheitsfund behoben: Animations-Endzustand verwendet `transform: none` statt `translateY(0)`, damit nach der Animation kein unnötiger Transform-Containing-Block bestehen bleibt. Folge-Commit CI erfolgreich: `bun run lint` (`tsc --noEmit`), `bun run build` und `bun run test`; 453/453 Tests bestanden. PR-Vorlagenprüfung ebenfalls erfolgreich. Browser-/visuelle Abnahme der neuen Ansicht bleibt offen; kein unabhängiges Fremd-Review vorhanden.

## 11.11.2026 – Gestaltung der internen Academy-Übersicht (PR #158)

- Die Kursauswahl wurde gegen die geplante Übersichtsseite abgegrenzt: Programme und Kurse werden bereits im Kursbereich mit persönlichem Teilnahmestatus angezeigt; keine zweite Kurs-/Programmliste auf der Übersicht.
- Die bisherige interne Übersicht (Legacy-Prüfungszähler und Lernstandhinweis) wurde durch eine erklärende Seite ersetzt.
- Umgesetzt: direkter Rücksprung „Zurück zur Academy-Übersicht“, eigener Seitentitel „Willkommen in der Academy“, kurze Einführung, Erklärung der flexiblen Beziehung zwischen Lehrgängen, Kursen und Lernbibliothek sowie Einordnung von Prüfungen und privaten Notizen.
- Die Bereichsfarben werden nur als schmale Akzente verwendet. Es gibt keine zusätzlichen Bereichskacheln, Navigationslinks, persönlichen Statuskennzahlen oder Aufgabenlisten.
- Der globale Academy-Header und Breadcrumb werden auf der internen Übersicht nicht erneut angezeigt; die vorhandene horizontale Bereichsnavigation bleibt bestehen. Andere interne Bereiche sind von dieser gezielten Änderung nicht betroffen.
- Code und Dokumentation liegen gemeinsam auf dem Branch `docs/academy-overview-course-catalog-audit`, PR #158. GitHub Actions `build-and-verify` lief für den aktuellen Commit erfolgreich durch (TypeScript-Prüfung, Produktionsbuild und Tests); die PR-Beschreibungsprüfung ist ebenfalls erfolgreich. Die optionale Render-Deploy-Stufe wurde übersprungen. Browser-/Live-Abnahme und Screenshot stehen noch aus; kein Merge oder Deployment behauptet.


## 9. Visuelle Designgrundlagen und Start der Academy-Gestaltungsphase (11.11.2026)

**Arbeitsvereinbarung:** Der Projektinhaber hat ChatGPT die gestalterische Ausarbeitung des Portals übertragen, solange frühere Arbeit und Beschlüsse geschützt bleiben. Objektiv begründbare Detailentscheidungen (Lesbarkeit, Kontrast, Accessibility, Responsive-Verhalten, Konsistenz) darf ChatGPT eigenständig treffen. Prägende subjektive Grundsatzentscheidungen werden vor der Festlegung erneut abgestimmt. Diese Vereinbarung ist im Entscheidungsregister ergänzt.

**Bereits bestätigter visueller Ausgangspunkt für die Academy:**
- matte, dezente blaue Wellenform statt großflächigem Hintergrundbild;
- leicht getönter, ruhiger Hintergrund;
- einladender Kopfbereich und klar gegliederte Inhaltsflächen;
- gemeinsame Designsprache mit zurückhaltenden bereichsspezifischen Akzenten;
- die fünfteilige Kachel-Startseite bleibt unverändert und wird auf internen Seiten nicht dupliziert.

**Repository-Arbeit in diesem Schritt:**
- Neuer Entwurf `docs/planning/DESIGN-SYSTEM-CONCEPT.md` angelegt.
- Schutzgrenzen, bestätigte Academy-Richtung, bestehende Bereichsfarben, vorläufige Systemprinzipien, Komponenten-Prüfliste, offene subjektive Grundsatzentscheidungen, Vorgehen und aktuelle Referenzquellen dokumentiert.
- Die Recherche stützt sich u. a. auf WCAG 2.2, USWDS Design Tokens/Color/Spacing/Typesetting und Canvas Course Navigation. Die Übertragbarkeit auf RCPD ist im Konzept jeweils begrenzt und begründet.
- Ausschließlich Planungsdokumentation; keine Anwendungscode-, Style-, Komponenten-, API-, Datenmodell-, Berechtigungs- oder Deployment-Dateien geändert.
- Keine bestehenden Beschlüsse ersetzt. Der Entwurf markiert finale Portalidentität, globale Navigation und Theme-Strategie weiterhin als offen.
- Branch: `docs/portal-academy-design-foundations`. Kein Merge und kein Deployment.

**Nächste Schritte:**
1. Tatsächlichen Academy-Code und bestehende Styles für die internen Bereiche gegen PR #158 und die beschlossene IA prüfen.
2. Einen zusammenhängenden visuellen Prototyp der internen Academy-Übersicht entwickeln, ohne die Kachel-Startseite zu verändern.
3. Repräsentative Screens der übrigen vier Bereiche einbeziehen, damit das System nicht nur auf einer Seite funktioniert.
4. Desktop-/Tablet-/Mobile- und Accessibility-Verhalten prüfen; subjektive Grundsatzfragen vor Finalisierung abstimmen.
5. Erst nach Design-/Funktionsabgleich eine getrennte Implementierungsplanung vornehmen.

**Prüfstatus:** Das neue Markdown-Dokument wurde über GitHub angelegt. Ein vollständiger erneuter Abruf/Linkcheck aller aktualisierten Dokumente und ein lokaler Markdown-/Build-/Testlauf stehen noch aus. Da keine Anwendungscodeänderung vorgenommen wurde, wurden Lint, Build und Tests in diesem Dokumentationsschritt nicht ausgeführt.


### Technischer Sichtbefund zur Academy-Oberfläche (11.11.2026)

Prüfstand: `main` / Commit `7e19ccbfda3d28a37b7cadb4bac9b3daa9a4ae89` (Basis von PR #159).

- `src/components/AcademyCenter.tsx`, Zeilen 726–765: vorhandene fünfteilige Kachel-Startseite mit den bereits beschlossenen Bereichsfarben und lokalen SVG-Illustrationen. Sie wird ausdrücklich nicht geändert.
- Dieselbe Datei, Zeilen 682–707: interne horizontale Academy-Hauptnavigation mit Übersicht, Kurse, Lernbibliothek, Prüfungen und Meine Notizen. Sie bleibt die maßgebliche Bereichsnavigation.
- Dieselbe Datei, Zeilen 766–861: interne Übersicht mit Rückweg, Orientierungstitel, erklärendem Bereich zu flexiblen Lernwegen, drei Informationskarten zu Lehrgängen/Kursen/Lernbibliothek, Hinweisen zu Prüfungen und privaten Notizen sowie einem fachlichen Hinweis zum tatsächlichen Abschlussnachweis.
- `src/App.tsx`, Zeilen 2468–2479: AcademyCenter wird als bestehender Portalbereich eingebunden. Die globale Portalhülle liegt außerhalb der Academy-Komponente und bleibt in dieser Gestaltungsrunde unberührt.
- `src/index.css`, Zeilen 4–39: vorhandene globale Typografie-Basis mit Plus Jakarta Sans, globaler Zeilenhöhe und Überschriftenregeln; bestehende Light-/Dark-Styles werden vor Token- oder Theme-Änderungen vollständig geprüft.

Die Codeprüfung bestätigt die vorhandene Informationsarchitektur. Der erste neue interne-Übersichts-Mockup ist eine explorative Darstellung dieser Inhalte. Weitere generierte Varianten, die fälschlich die fünf Einstiegskacheln erneut auf einer internen Seite oder nicht belegte Fortschrittskennzahlen zeigen, werden ausdrücklich verworfen und sind keine Designvorschläge.


### Erster implementierter Academy-Übersichts-Prototyp (11.11.2026)

- Separater Code-Branch: `feat/academy-overview-visual-prototype`.
- PR #160 wurde am 11.11.2026 gemergt: https://github.com/MDP0063/rcpd-new/pull/160.
- `src/components/AcademyCenter.tsx`: bestehende interne Übersichtsstruktur und Texte beibehalten; scoped Klassen ergänzt und Stylesheet eingebunden.
- Neu: `src/components/AcademyCenter.css` mit leicht getöntem blauem Hintergrund, begrenzten matten Wellenakzenten, lesbarer Hierarchie, drei bestehenden Inhaltskarten mit Bereichsakzenten, zurückhaltenden Hinweisen und responsiver horizontaler Hauptnavigation. Light-/Dark-Mode und Tastaturfokus wurden berücksichtigt.
- Die fünfteilige Kachel-Startseite, globale Portalhülle, Inhalte, Statuslogik, Datenflüsse, Rechte und Funktionen wurden nicht geändert.
- CI für Code-Commit `69393c2` erfolgreich: TypeScript-Prüfung, Produktionsbuild und Tests; PR-Vorlagenprüfung nach Ergänzung des erforderlichen Labels ebenfalls erfolgreich (Run #893).
- Der optionale Render-Deploy-Hook wurde übersprungen. Kein Deployment, kein Merge.
- Noch offen: echte Browser-/Responsive-Abnahme und Screenshots. CI-Erfolg ersetzt keine visuelle Prüfung.
- PR #160 ist gemergt, aber die Gestaltung bleibt ein erster, noch nicht visuell abgenommener Prototyp und kein finales Academy- oder Portaldesign.


## 11.11.2026 – Äußerer Academy-Viewport-Hintergrund (PR #162 gemergt)

- Browserfeedback: Auf breiten Bildschirmen wirkt die variable weiße Fläche außerhalb des inneren Academy-Panels zu leer. Gewünscht ist ein passender, aber eigenständiger, insgesamt dezenter Hintergrund mit weichem Übergang.
- Umsetzung vorbereitet: nur bei geöffnetem Academy-Modul wird der verfügbare Hauptviewport flächig gestaltet; die innere Academy-Inhaltsbreite bleibt auf maximal 80rem begrenzt. Dadurch werden bestehende Inhaltsflächen nicht überbreit.
- Äußerer Hintergrund: sehr helle kühle Grundtönung mit zwei diffusen, niedrig kontrastierten Farbverläufen; ausdrücklich keine zweite Welle/Illustration. Dark-Mode-Variante vorhanden.
- Bestehende innere Wellenform, Kachel-Startseite, globale Portalhülle außerhalb der Academy, Inhalte, Daten, Funktionen und Rechte bleiben unverändert.
- Die konkrete Umsetzung wurde über PR #162 am 11.11.2026 gemergt (Merge-Commit `dddb79b9e488e53181a7b916c5c2171df3d225c7`). Browserabnahme auf dem breiten Desktop und einem schmalen Viewport steht nach Deployment weiterhin aus.


## 11.11.2026 – Kursbereich: erster visueller Ausbau (PR #164 gemergt)

- Ausgangscode geprüft: AcademyLearningCenter.tsx enthält bereits einen gemeinsamen Katalog mit getrennter Darstellung von Ausbildungsprogrammen und allen Kursen, gemeinsame Suche, persönliche Kursstatus sowie echte Programmfortschrittswerte. Die Detailansichten und Aktionen bleiben fachlich unverändert.
- Gestaltung umgesetzt: ruhige Kursbereichsüberschrift mit kleinem Petrol-Akzent, klarer Suchfläche, eigenständigen Programm-Karten und kompakter Kursliste. Der Bereichsakzent Petrol ergänzt die Academy-Grundsprache, ohne eine neue Navigationsebene einzuführen.
- Mobile Bedienung, Tastaturfokus, Dark Mode und Reduced Motion werden berücksichtigt. Es kommen keine externen Assets, Abhängigkeiten oder kostenpflichtigen Dienste hinzu.
- Korrektur eines veralteten UI-Hinweises: Im Kursdetail behauptete ein statischer Warntext, die Verknüpfung mit dem neuen Prüfungsnachweissystem sei noch nicht umgesetzt. Die vorhandene Teilnehmeransicht wertet assessmentProofs bereits aus und markiert den Nachweis dynamisch; der Warntext widersprach daher dem implementierten Stand. Er wurde durch eine sachlich korrekte Erläuterung der automatischen Berücksichtigung nach bestandener und offiziell freigegebener Abschlussprüfung ersetzt.
- Unverändert: Kurs-/Programmstatus, Versionierung, Nachweislogik, API-Aufrufe, Berechtigungen, Datenmodell, Reader, Notizen, Verwaltungsansicht und die Academy-Kachel-Startseite.
- PR #164 wurde am 11.11.2026 gemergt (Merge-Commit d3f00605bafa2207e2831ffebdc060229ad7995b). GitHub Actions: TypeScript-Prüfung, Produktionsbuild und Tests erfolgreich; PR-Vorlagenprüfung erfolgreich. Der optionale Render-Deploy-Hook im PR-Lauf wurde übersprungen; ein erfolgreiches Render-Deployment ist noch nicht bestätigt. Die Browserabnahme auf Desktop, Tablet und Smartphone steht aus.


## 11.11.2026 – Kurs- und Lehrgangsdetails: visueller Ausbau (PR #166 gemergt)

- Detailansichten für Kurse und Ausbildungsprogramme erhalten dieselbe Petrol-Akzentfarbe und Kartenoberflächen wie der Katalog.
- Zurücknavigation, Kennung/Version, Titel, Zusammenfassung, Nachweisbedingungen, Lernziele, Kapitel und Programmfortschritt werden visuell klarer gegliedert.
- Der vorhandene reale Programmfortschritt bleibt erhalten; keine zusätzliche Kennzahl oder neue fachliche Aktion.
- Keine Änderung an API, Datenmodell, Status-/Nachweislogik, Versionsbindung, Berechtigungen oder Reader-Verhalten.
- Browserabnahme nach Deployment steht noch aus.


PR #166 wurde am 11.11.2026 gemergt (Merge-Commit 668b621ffdf8ce8e02f556a00dcb067ef65fbb1f). TypeScript-Prüfung, Produktionsbuild, Tests und PR-Vorlagenprüfung waren erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen; die Browserabnahme der Kursübersicht und Detailansichten steht noch aus.


## 11.11.2026 – Lernbibliothek: visueller Ausbau (PR #168 gemergt)

- Ausgangsbestand geprüft: Der Katalog besitzt bereits Suche, Relevanz-/Alphabetisch-/Aktualisierungs-Sortierung, Kategorie- und Dokumenttypfilter sowie getrennte Auswahl- und Readeransicht.
- Versionierte Materialien und Legacy-Materialien verwenden unterschiedliche vorhandene Daten-/Renderpfade. Beide bleiben erhalten; die Bibliothek bleibt ein eigener Einstieg und wird nicht vom Reader verdrängt.
- Geplante/umgesetzte Gestaltung: zurückhaltender violetter Bereichsakzent, klare Such-/Sortier-/Filterzone, kompakte Materialeinträge und lesefokussierter Reader.
- Keine Änderung an PDF-Infrastruktur, Materialzugriff, Versionsbindung, Suche/Filterlogik, Datenmodell, API, Berechtigungen, Notizen oder Reader-Aktionen.
- TypeScript-Prüfung, Produktionsbuild, Tests und PR-Vorlagenprüfung erfolgreich; die Browserabnahme steht nach Deployment noch aus.


PR #168 wurde am 11.11.2026 gemergt (Merge-Commit 5e86ff7bf7a6ab24e4bc4ba28586f883d07de65c). TypeScript-Prüfung, Produktionsbuild, Tests und PR-Vorlagenprüfung waren erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen; die Browserabnahme des Bibliothekskatalogs und Readers steht noch aus.


## 11.11.2026 – Teilnehmer-Prüfungszentrum: visueller Ausbau (PR #170 gemergt)

- Bestehende Zustände geprüft: Prüfungskatalog mit Auswahl-/Startpanel, aktiver Prüfungsversuch mit serverzeitbasierter Deadline und Autospeicherstatus sowie Ergebnisansicht mit offizieller Freigabebehandlung.
- Gestaltung mit zurückhaltendem Beerenton als Bereichsakzent, klarer Katalog-/Detailhierarchie, gut erkennbarer Fragenübersicht und lesefokussierter Antwortfläche.
- Semantische Verbesserung: Auswahlknopf einer Prüfung erhält aria-pressed, damit die aktuelle Auswahl auch programmatisch erkennbar ist.
- Ergebnisfarben für bestanden, Bewertung offen und nicht bestanden bleiben fachlich getrennt. Keine Änderung an Prüfungsauswahl, Zeit-/Autospeicher-/Abgabelogik, Bewertung, Freigabe, APIs oder Berechtigungen.
- Die Legacy-Unteransichten Übungstests/Abschlussprüfungen und Examiner-Administration bleiben außerhalb dieses ersten visuellen Schritts.
- TypeScript-Prüfung, Produktionsbuild, Tests und PR-Vorlagenprüfung erfolgreich; die Browserabnahme steht nach Deployment noch aus.


PR #170 wurde am 11.11.2026 gemergt (Merge-Commit 2d55cf6878d3c86191e83ec585984c9c1e8de995). TypeScript-Prüfung, Produktionsbuild, Tests und PR-Vorlagenprüfung waren erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen; die Browserabnahme des Prüfungszentrums steht aus.


## 11.11.2026 – Meine Notizen: visueller Ausbau (PR #172 gemergt)

- Der bestehende Notizenbereich wurde geprüft: private Notizen und Lesezeichen mit Suche, Quellenanzeige, Bearbeiten/Löschen sowie separatem Editor sind vorhanden. Neue Notizen werden weiterhin im Reader angelegt.
- Gestaltung: ruhiger grüner Bereichsakzent, klarer Privatsphäre-Hinweis, gut scannbare Notizkarten und eigenständige Editorfläche.
- Keine Änderung an Privatheit, Datenmodell, Quellenbindungen, Sync, API oder Aktionen.
- Browserabnahme steht nach Deployment aus.


PR #172 wurde am 11.11.2026 gemergt (Merge-Commit 94e25ae18594fb9387684d2c9083652b304626cd). TypeScript-Prüfung, Produktionsbuild, Tests und PR-Vorlagenprüfung waren erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen; die Browserabnahme von Meine Notizen steht aus.


## 11.11.2026 – Konsolidierter Stand des Academy-Visual-Redesigns

### Visuell umgesetzt und gemergt
- **Übersicht:** erklärender interner Einstieg mit bestehender Informationsarchitektur (PR #158) und visuellem Prototyp (PR #160).
- **Äußerer Academy-Hintergrund:** dezente, eigenständige blau-graue Farbfläche um den begrenzten Inhaltsbereich (PR #162).
- **Kurse:** Programm-Karten, kompakte Kursliste und gestaltete Kurs-/Programmdetails (PR #164 und #166).
- **Lernbibliothek:** klar getrennter Katalog mit Suche/Sortierung/Filtern und lesefokussierter Readeroberfläche (PR #168).
- **Prüfungen:** Teilnehmer-Prüfungszentrum mit Katalog, Auswahlpanel, aktivem Versuch und Ergebnisansicht (PR #170).
- **Meine Notizen:** persönliche Notizen-/Lesezeichenliste, sichtbarer Privatsphäre-Hinweis und Editor (PR #172).

### Schutzgrenzen
- Die bestätigte fünfteilige Academy-Kachel-Startseite bleibt unverändert.
- Die horizontale Academy-Hauptnavigation und die fünf Bereiche bleiben unverändert.
- Kurs-/Programmstatus, Versionierung, Nachweise, Prüfungszeit/Autospeicher/Abgabe/Freigabe, private Notizen, Quellenbindungen, APIs und Berechtigungen wurden durch diese visuellen Schritte nicht fachlich umgebaut.
- Die globale Portalgestaltung, globale Navigation und spätere Portalidentität bleiben ausdrücklich offen.
- Examiner-Verwaltungsansichten und Legacy-Prüfungsunteransichten wurden nicht als Teilnehmeroberflächen umgestaltet; ihre fachliche Abgrenzung bleibt separat zu prüfen.

### Prüf- und Abnahmestatus
- Die GitHub-CI für die jeweiligen Code-PRs hat TypeScript-Prüfung, Produktionsbuild und Tests erfolgreich ausgeführt; die PR-Vorlagenprüfungen waren ebenfalls erfolgreich.
- Die optionalen Render-Deploy-Hooks in den PR-Läufen wurden übersprungen. Ein erfolgreiches Live-Deployment und die visuelle Browserabnahme des konsolidierten Stands sind noch nicht bestätigt.
- Nächster sinnvoller Schritt: Browserprüfung der fünf Academy-Bereiche auf großem Desktop, Tablet und Smartphone sowie bei Bedarf Light-/Dark-Mode. Danach werden nur konkret beobachtete Probleme angepasst.


## 11.11.2026 – Examiner-Bewertungsarbeitsplatz: visueller Ausbau (PR #175 gemergt)

- Der vorhandene Freitext-Bewertungsarbeitsplatz wird gemäß der beschlossenen Split-View-Vorgabe strukturiert: Bewertung links, einklappbarer Kontext rechts.
- Der Kontext verwendet ausschließlich bereits geladene Metadaten; vertrauliche Antwort- und Bewertungsinhalte bleiben weiterhin nur für den zuständigen Prüfer sichtbar.
- Responsive einspaltige Darstellung, natives Disclosure, sichtbare Tastaturfokusse und Dark Mode werden berücksichtigt.
- Keine Änderung an Claim, Disconnect, Übergabe, administrativer Neuzuweisung, Draft-Speicherung, Bewertung, Abschluss oder Berechtigungen.
- Examiner-Historie, Revision-Workflow und weitere offene Funktionen bleiben außerhalb dieses visuellen PRs.
- Browserabnahme steht nach Deployment aus.


PR #175 wurde am 11.11.2026 gemergt (Merge-Commit 8fe6cc17e5913003ee65b39e8f5383e6602ff821). TypeScript-Prüfung, Produktionsbuild, Tests und PR-Vorlagenprüfung waren erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen; die Browserabnahme des Examiner-Arbeitsplatzes steht aus.


## 11.11.2026 – Ergebnisfreigabe und Korrekturarbeitsplatz: visueller Ausbau (PR #177 gemergt)

- Ausstehende Ergebnisfreigaben als klar getrennte, kompakte Einträge gestaltet.
- Korrekturansicht mit deutlicher Trennung zwischen bisheriger Bewertung, neuer Punkteingabe, Begründung und Korrekturhistorie.
- Vorhandene Freigabehistorie und Korrekturauditdaten bleiben sichtbar; Ergebnisstatusfarben bleiben fachlich unverändert.
- Keine Änderung an Ergebnisfreigabe, erneuter Freigabe, Korrekturberechtigung, Auditdaten, API oder Teilnehmerdatenschutz.
- Responsive Darstellung, Dark Mode und Tastaturfokus berücksichtigt.
- Browserabnahme steht nach Deployment aus.


PR #177 wurde am 11.11.2026 gemergt (Merge-Commit a724f76265020eeff14c9a5c5822ee07d71ddad7). TypeScript-Prüfung, Produktionsbuild, Tests und PR-Vorlagenprüfung waren erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen; die Browserabnahme des Korrektur-/Freigabebereichs steht aus.


## 11.11.2026 – Kurs- und Programmverwaltung: visueller Ausbau (PR #179 gemergt)

- Verwaltungsübersicht für Kurse und Programme als getrennte, gut scannbare Listen gestaltet.
- Kurs- und Programmeditoren mit konsistenten Grunddaten-, Lernziel-, Kapitel-/Material- und Zuordnungsabschnitten.
- Vorhandene Kennungen, Status, Versionen, Revisionen, Materialprüfhinweise und Warnungen bleiben unverändert.
- Keine Änderung an Speichern, Veröffentlichen, Validierung, Versionsbindung, Abschlussbedingungen, Materialreferenzen oder Berechtigungen.
- Responsive Darstellung, Dark Mode und Tastaturfokus berücksichtigt.
- Browserabnahme steht nach Deployment aus.


PR #179 wurde am 11.11.2026 gemergt (Merge-Commit 82a73e3a0fe41a4a5bd56205bc74c26c97d72e04). TypeScript-Prüfung, Produktionsbuild, Tests und PR-Vorlagenprüfung waren erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen; die Browserabnahme der Kurs-/Programmverwaltung steht aus.


## 11.11.2026 – Versionierte Materialverwaltung: visueller Ausbau (PR #181 gemergt)

- Materialliste und Editor als zwei klar getrennte Arbeitszonen gestaltet; auf schmalen Viewports steht die Liste vor dem Editor.
- Aktive Materialauswahl, Materialkennung, Status, Revision und Versionshistorie besser erkennbar gemacht.
- Editorfelder und Aktionen in Metadaten, Zuständigkeit, Kategorie/Dokumenttyp, Zugriffsvoraussetzung und Inhalt gegliedert.
- aria-pressed ergänzt die programmatische Erkennbarkeit der aktiven Materialauswahl.
- Keine Änderung an Entwurfsspeicherung, Veröffentlichung, Archivierung, Versionierung, Validierung, Zugriffsschutz oder Datenmodell. PDF-Infrastruktur bleibt zurückgestellt.
- Browserabnahme steht nach Deployment aus.


## 11.11.2026 – Kategorien und Dokumenttypen: visueller Ausbau (PR #182 gemergt)

- Kategorie- und Dokumenttypverwaltung mit gemeinsamem, konsistentem Layout für Formular und durchsuchbare Bestandsliste gestaltet.
- Status, Bearbeiten, Aktivieren/Archivieren, Löschen und vorhandene Bestätigungsabläufe bleiben unverändert.
- Keine neuen Taxonomiefelder, Status, Berechtigungen oder API-Änderungen.
- Responsive Darstellung, Dark Mode und Tastaturfokus berücksichtigt.
- Browserabnahme steht nach Deployment aus.


PR #181 wurde am 11.11.2026 gemergt (Merge-Commit c7bcf07fae9633a23b4ef03c4424d1b3c4038c01). PR #182 wurde am 11.11.2026 gemergt (Merge-Commit 36de9a71ee99bff508fc92a8cda98491ffbf7d95). TypeScript-Prüfung, Produktionsbuild, Tests und PR-Vorlagenprüfungen waren erfolgreich. Die optionalen Render-Deploy-Hooks wurden übersprungen; die Browserabnahme beider Verwaltungsansichten steht aus.


## 11.11.2026 – Konsolidierter Stand des Academy-Designausbaus (Verwaltung und Examiner ergänzt)

### Zusätzlich visuell umgesetzt und gemergt
- **Examiner-Bewertungsarbeitsplatz:** geteilte Bewertungsfläche mit einklappbarem Kontextpanel (PR #175).
- **Ergebnisfreigaben und Korrekturen:** getrennte Darstellung von Freigabewarteschlange, bisheriger Bewertung, Korrektureingabe, Begründung und Historie (PR #177).
- **Kurs-/Programmverwaltung:** Verwaltungslisten und Editoren (PR #179).
- **Versionierte Materialverwaltung:** Materialliste, Auswahl, Metadaten, Editor und Versionshistorie (PR #181).
- **Bibliothekskategorien und Dokumenttypen:** gemeinsame Gestaltung der Taxonomie-Verwaltung (PR #182).

### Gesamtumfang des visuellen Academy-Ausbaus
- Teilnehmeroberflächen aller fünf Academy-Hauptbereiche: PR #158, #160, #162, #164, #166, #168, #170 und #172.
- Rollen-/berechtigungsabhängige Verwaltungs- und Examiner-Oberflächen: PR #175, #177, #179, #181 und #182.
- Relevante Fortschritts-/Design-Dokumentation wurde über PR #174, #176, #178, #180 und #183 nachgeführt.

### Schutzgrenzen
- Die fertige fünfteilige Kachel-Startseite bleibt unverändert.
- Die horizontale Academy-Hauptnavigation und die fünf Hauptbereiche bleiben unverändert.
- Keine der visuellen Erweiterungen hat Kurs-/Prüfungslogik, Datenmodelle, Statusdefinitionen, Versionierung, Ergebnisfreigabe, private Notizen, Berechtigungen oder APIs fachlich umgebaut.
- Die globale Portalidentität und globale Navigation bleiben offen.

### Noch nicht abgenommen
- Die optionalen Render-Deploy-Hooks der genannten PR-Läufe wurden übersprungen. Ein bestätigtes Live-Deployment aller letzten Änderungen liegt nicht vor.
- Gemeinsame Browserabnahme auf großem Desktop, Tablet und Smartphone sowie Light-/Dark-Mode steht noch aus.
- Legacy-Unteransichten für Übungstests/Abschlussprüfungen und weitere alte Prüfungswege wurden nicht stillschweigend vereinheitlicht. Sie bleiben Gegenstand des abschließenden Funktions-/Fehleraudits.
- Examiner-Historienansicht, Action-Request-/Revisionsworkflow und weitere fachlich offene Examiner-Punkte bleiben separate Aufgaben gemäß OPEN-QUESTIONS.md.

### Nächster Arbeitsschritt
Nach bestätigtem Deployment folgt die gemeinsame Browserabnahme. Anschließend wird die vom Projektinhaber gewünschte abschließende Bug-/Fehlerprüfung der tatsächlich implementierten Academy-Funktionen durchgeführt. Erst konkrete, nachgewiesene Probleme führen zu weiteren Codeänderungen.


## 11.11.2026 – Bugaudit: Whitelist-Prüfung im Examiner-Workflow (PR in Vorbereitung)

- **Bestätigter Befund:** Die Teilnehmer-/Prüferoberfläche sperrte den Status `pending`, die serverseitige Review-Queue und mehrere Claim-/Bewertungsrouten prüften dagegen nur Rollen-/Kursrechte. Die zentrale Session-Middleware blockiert `suspended` und `revoked`, nicht aber `pending`; die UI-Sperre allein war daher keine Sicherheitsgrenze.
- **Korrektur:** Die serverseitige Reviewer-Eignungsprüfung wird für Queue, Claim, Transfer, Reassignment, Freigabe, Aktivität, Disconnect, Draft und Bewertung einheitlich verwendet.
- **Regressionstests:** HTTP-Integrationstests für pending Reviewer und pending Supervisor sowie für alle relevanten Review-Aktionen und die Zuweisung an pending Reviewer ergänzt.
- Status: Codeänderung und Regressionstests in PR #185; CI und unabhängige Abnahme stehen aus.
- Weitere Exam-/Academy-Berechtigungs- und Datenflussprüfungen bleiben offen; dieser Befund ist nicht als vollständiger Sicherheitsaudit zu verstehen.


### PR #185 – Reviewer-Whitelist-Berechtigung serverseitig abgesichert (11.11.2026)

- PR #185 wurde nach erfolgreicher CI am 11.11.2026 gemergt (Merge-Commit `e7a8f1b0d0dfd6b7b0473e71ea7e6b84785939bd`).
- Reviewer-Queue und sämtliche manuellen Review-Aktionen prüfen jetzt serverseitig den Whitelist-Status. Pending Reviewer und Supervisor erhalten keinen Zugriff; pending Zielkonten können keine Prüfungszuweisung erhalten.
- HTTP-Regressionstests decken Queue, Claim, Draft, Grade, Transfer, Release, Activity, Disconnect, Reassignment und Zuweisungsziele ab.
- TypeScript/Lint, Produktionsbuild und gesamter Testsatz erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen; Live-Deployment ist nicht bestätigt.
- Der ursprüngliche Testlauf machte zusätzlich sichtbar, dass ein neu angelegtes Admin-Fixture den bestehenden Last-Admin-Test beeinflusste. Das Fixture wurde auf eine unterstützte Officer-Rolle geändert; der erneute vollständige CI-Lauf war erfolgreich.


## 11.11.2026 – Academy-Navigation: Rückweg und Bereichsakzente

- PR #192 hat die verbindlichen Regeln für einen eigenständigen Rückkehr-Button zur fünfteiligen Kachelstartseite, die Akzentfarbe in der horizontalen Bereichsnavigation und den semantisch zurückhaltenden Farbeinsatz in `DECISIONS.md` und `DESIGN-SYSTEM-CONCEPT.md` festgehalten.
- PR #193 ist gemergt: In allen internen Academy-Ansichten steht nun oberhalb der horizontalen Navigation ein eigenständiger Button „Zur Kachelansicht“ bereit. Der dateipfadartige Breadcrumb wurde als Rücknavigation entfernt.
- Die aktive Hauptnavigation übernimmt den Bereichsakzent: Übersicht Blau, Kurse Petrol, Lernbibliothek Violett, Prüfungen Beerenton, Meine Notizen Grün. Verschachtelte Ansichten werden dem richtigen Hauptbereich zugeordnet.
- Die fünfteilige Kachelstartseite und ihre Illustrationen blieben unverändert. Die Akzentfarbe wird nur für den aktiven Navigationszustand eingesetzt; Statusfarben und Prüfungswarnungen bleiben davon getrennt.
- TypeScript/Build, vollständige Tests und PR-Vorlagenprüfung waren erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen; Live-Deployment und manuelle Browserabnahme stehen noch aus.

### Nächster fachlicher Schritt: Examiner-Historie und Revision

- Die Claim-/Übergabehistorie ist serverseitig vorhanden, aber noch nicht in der Oberfläche verfügbar.
- Eine zentrale Teilnehmerakte, wie sie Abschnitt 15.7 vorsieht, ist in der aktuellen UI noch nicht vorhanden. Historie wird deshalb nicht redundant in Prüferwarteschlange und Korrekturcenter eingeführt.
- Als nächster zusammenhängender Funktionsblock ist die zentrale Teilnehmerakte bzw. deren Academy-Integration zu untersuchen und umzusetzen. Darauf aufbauend folgen berechtigungsgesteuerte Historienprojektion, Revisionsrückgabe mit Pflichtfeedback pro betroffenem Bewertungsschritt und passende Action-Request-Benachrichtigungen.
- Vor Revisionsimplementierung müssen Ergebnis-Snapshot, bestehende Bewertungs-Drafts, Claim-Übergänge und Repository-Validierungsregeln gemeinsam regressionsgesichert werden. Kein neuer Prüfungsversuch darf entstehen.


## 2026-11-12 – Academy-Unterbereiche: visuelle und bedienbezogene Überarbeitung

**Branch:** `feat/academy-submodules-ux-redesign`  
**Basis:** `main` bei `5697e5d1b5d7e3b1108137db53e71beec043d8e2`

Die bestehende Academy-Startseite und die beschlossene Informationsarchitektur wurden beibehalten. Die frühere Festlegung zum Kachelreflex in Abschnitt „Visuelles Academy-Einstiegsdesign – fünf Bereichskacheln“ der `ACADEMY-DETAILED-SPECIFICATION.md` wurde erneut geprüft und umgesetzt:
- weiche weiße Reflexion auf der einfarbigen Kacheloberfläche;
- im Ruhezustand dezent, bei Hover etwas stärker;
- keine Glanz-/Verlaufseffekte in den SVG-Illustrationen;
- reduzierte Bewegung bei `prefers-reduced-motion`.

Die internen Bereiche wurden visuell aufeinander abgestimmt, ohne fachliche Abläufe, Berechtigungen, APIs oder Datenmodelle zu ändern:
- **Kurse:** klare, bereichsbezogene Umschaltung zwischen Lernen und Verwaltung; Programmfortschritt im Katalog jetzt ausdrücklich als solcher beschriftet; vorhandene Kurs-/Programmdetails und Verwaltung bleiben erhalten.
- **Lernbibliothek:** Materialsuche, Sortierung und Filter bleiben unverändert; Verwaltungsumschaltung, Materialliste, Versionsverwaltung sowie Kategorie-/Dokumenttypverwaltung erhalten eine konsistentere violette Hierarchie und klarere Fokuszustände.
- **Prüfungen:** vorhandene Prüfungsübersicht, Versuchsauswahl, Ergebnis-/Freigabe- und Examiner-Abläufe bleiben erhalten; der ältere Prüfungslistenpfad wurde zusätzlich tastaturbedienbar gemacht, indem der klickbare Container ein natives Button-Element mit `aria-pressed` wurde. Begriffe „Kurskontext“ und „Maximale Versuche“ präzisieren die angezeigten Daten.
- **Meine Notizen:** bestehende private Notiz-/Lesezeichenfunktionen bleiben erhalten; Such-, Listen- und Editorflächen sowie mobile Aktionsanordnung wurden visuell vereinheitlicht.
- Dark Mode, sichtbare Tastaturfokusse und reduzierte Bewegung wurden in den ergänzten Styles berücksichtigt.

Die bestehenden spezialisierten Styles für Kurs-/Programmerstellung, Examiner-Bewertung und Ergebnis-Korrektur wurden nicht ersetzt, da sie bereits eigene responsive Layouts, Fokuszustände und Bereichsakzente besitzen.

**Recherchegrundlage:** WCAG 2.2 (W3C), insbesondere Fokus, Zielgrößen und Animation aus Interaktionen: https://www.w3.org/TR/WCAG22/ . Ergänzend Nielsen Norman Group, „Progressive Disclosure“: https://www.nngroup.com/articles/progressive-disclosure/ sowie die zehn Usability-Heuristiken: https://www.nngroup.com/articles/ten-usability-heuristics/ . Die Prinzipien wurden auf die vorhandenen Academy-Aufgaben angewandt; es wurden keine neuen Funktionen eingeführt.

**Prüfstatus:** statische Codeprüfung der geänderten Komponenten und Styles. Noch keine echte Browser-/Geräteprüfung, kein Live-Firestore-Test und kein Deployment. CI wird über den Draft-PR geprüft. Die fünf Kacheln und alle bestehenden fachlichen Funktionen müssen vor Merge zusätzlich visuell und responsiv abgenommen werden.

## 11.11.2026 – Zentrale Teilnehmer-Prüferhistorie (Implementierungsbranch)

- Branch `feature/academy-exam-participant-record`: zentrale Teilnehmerakte im Examiner-Bereich mit Suche über Name, Badge und Callsign.
- Neue geschützte API liefert nur Prüfungsvorgänge innerhalb der serverseitig geprüften Kurszuständigkeit des angemeldeten Prüfers.
- Vertrauliche Bewertungsantworten, Rubriken, Claim-Ereignisse und Korrekturdetails erscheinen nur für Admins/Colonels sowie Prüfer, die am konkreten Vorgang beteiligt waren. Andere berechtigte Prüfer erhalten nur Status und aktuelle Zuständigkeit.
- Teilnehmerakte sortiert nach tatsächlichem Bewertungsabschluss (neueste zuerst); bei offenen Bewertungen dient die Einreichung als Fallback. Fehlerzustand und fachlicher Leerzustand bleiben getrennt.
- Backend- und HTTP-Regressionstests für Kurs-Scope, Whitelist-Sperre und Vertraulichkeitsprojektion ergänzt.
- Der Branch ist noch nicht gemergt. Lint, Build, vollständige Tests und unabhängiges Review stehen aus; kein Deployment oder Browser-Test behauptet.
- Nächster Schritt nach dieser Basis: beschlossene Revisionsrückgabe und Action Requests, mit Erhalt desselben Prüfungsversuchs, gespeicherter Drafts und des zuletzt freigegebenen Ergebnisses.

### Academy-Audit: Examiner-Ansichten waren nicht vollständig erreichbar

- Im aktuellen `AcademyCenter.tsx` wurde `exam_reviews` nur über eingehende Benachrichtigungsnavigation aktiviert; für `exam_corrections` gab es keinen regulären `setActiveTab`-Einstieg. Die Unter-Navigation „Prüfungsbereiche“ wurde zudem bei beiden Ansichten ausgeblendet.
- Folge: Die Examiner-Warteschlange war ohne passenden Benachrichtigungslink nicht direkt erreichbar; Korrekturen und Ergebnisfreigaben waren aus der normalen Academy-Bedienung heraus nicht erreichbar.
- Korrektur auf Branch `fix/academy-exam-review-navigation`: Die bestehende Prüfungs-Unter-Navigation bleibt innerhalb des Bereichs „Prüfungen“ und zeigt nun rollenabhängig „Offene Bewertungen“ (Admins, Colonels und berechtigte Kursausbilder) sowie „Korrekturen & Freigaben“ (Admin/Colonel). Bestehende Berechtigungsprüfungen und Komponenten bleiben maßgeblich.
- Keine neue Academy-Hauptrubrik und keine neue fachliche Funktion. Der vorhandene Examiner-Bereich wird nur regulär erreichbar gemacht.
- CI/Review noch ausstehend; Browser-/Rollenprüfung bleibt Teil der späteren gemeinsamen Academy-Abnahme.

### Academy-Audit: Legacy-Materialroute – Berechtigungsprüfung korrigiert (Folge-PR)

- Bestätigter Befund: `PUT /api/academy/modules/:modId` prüfte bei scoped Kursausbildern nur den Ziel-Kurscode aus dem Request. Ein Ausbilder konnte dadurch ein ursprünglich fremdes Legacy-Material durch gleichzeitiges Umschreiben des Kurscodes in seinen Zuständigkeitsbereich übernehmen und weitere Felder ändern.
- Korrektur: Die serverseitige Route prüft nun sowohl den gespeicherten ursprünglichen Kurscode als auch den gewünschten Ziel-Kurscode. Admin-/Colonel-Verhalten bleibt über `canActorEditCourseCode` unverändert.
- Regressionstest: Ein Admin legt ein Material außerhalb des Scopes an; ein scoped Ausbilder versucht, es in seinen eigenen Kurscode zu verschieben. Erwartet wird 403; anschließend bestätigt eine Admin-Metadatenänderung, dass Kurscode und ursprünglicher Inhalt unverändert blieben.
- Die Korrektur betrifft ausschließlich den Legacy-Endpunkt und seine Tests. Versionierte Materialendpunkte und PDF-Bestand bleiben unverändert.
- Status: Implementierung auf Branch `fix/academy-legacy-module-scope-authorization`; CI und unabhängige Review stehen aus. Noch keine Live-Firestore-/Browserprüfung.

### Legacy-Academy-Beispielmaterialien stillgelegt

- Entscheidung: `mod_default_sop01` und `mod_default_pc102` waren ausschließlich alte Beispielinhalte und werden nicht in das versionierte Materialsystem migriert.
- Neue Portal-Datenbanken starten ohne diese alten Legacy-Module.
- Bereits gespeicherte Datensätze bleiben zunächst unverändert in der Datenbank, werden aber aus der aktiven Modul-/Bibliotheksprojektion und aus der öffentlichen Aktivitätsliste ausgeschlossen.
- Die Legacy-Update- und -Delete-Routen weisen Änderungen an diesen beiden IDs mit `409 LEGACY_EXAMPLE_MODULE_RETIRED` zurück. Damit bleiben historische Verweise bis zu einer späteren Dateninventur unangetastet.
- Die API-Regressionstests prüfen die Unsichtbarkeit sowie die blockierten Update-/Delete-Versuche; ein zusätzlicher Fresh-Database-Test prüft, dass die Beispielmaterialien nicht erneut angelegt werden.
- Keine Firestore-Produktivdaten wurden im Rahmen dieser Codeänderung gelesen oder verändert. Die endgültige Datenbereinigung bleibt nach einer gesonderten Referenzprüfung offen.
- **Status 12.11.2026:** PR #201 wurde nach erfolgreicher CI-Prüfung gemergt (Squash-Merge `59183857c41a31e1d352ffc57c9d21a9749997ea`). TypeScript-Prüfung, Produktionsbuild und vollständige Teststufe waren in GitHub Actions erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen; Produktionsbereitstellung und Browserabnahme sind daher nicht bestätigt.

## 12.11.2026 – Lernbibliothek-Redesign begonnen
- Nutzer hat das neue Bibliothekskonzept bestätigt und direkte Umsetzung freigegeben.
- Umfang: Nutzeransicht, Navigation, Materialkarten/Reader, Verwaltungsabläufe und vollständiges Redesign der Schaltflächen.
- Farbakzente bleiben grundsätzlich geeignet; entscheidend ist ihr kontextbezogener, zurückhaltender Einsatz. Normale Kategorien und Navigation dürfen nicht wie Warn-/Fehlersignale wirken.
- Recherche zu Buttons: klare Hierarchie (primär/sekundär/tertiär), kurze handlungsorientierte Labels, sparsame Anzahl, Links für Navigation statt Aktionsbuttons, sichtbare Fokus- und Zustände, destruktive Aktionen getrennt. Quellen: USWDS https://designsystem.digital.gov/components/buttons/ ; GOV.UK https://design-system.service.gov.uk/components/button/ ; KERN UX-Standard https://www.designsystem.gov.de/komponenten/button/ ; NN/g https://www.nngroup.com/articles/button-states-communicate-interaction/ ; WCAG 2.2 https://www.w3.org/TR/WCAG22/.
- Erster Implementierungsschritt auf Branch `redesign/academy-library-experience`: dynamische Themenbereich-Kacheln mit realen Kategorien/Materialanzahlen, größere Materialkarten, ruhige Verwaltungsnavigation und konsistentere Fokus-/Aktionsstile.
- Private Notizen sind im zentralen Reader für versionierte Materialien integriert; sie bleiben an die exakte Materialversion gebunden. Legacy-Materialien ohne Versions-ID erhalten keine künstliche Notizbindung.
- Verwaltung weiterentwickelt: Suchbereich, Materialliste und Editor werden klarer gruppiert; die Suche berücksichtigt auch Kategorien und Dokumenttypen, soweit diese in den geladenen Entwurfsmetadaten vorliegen.
- Bearbeitungsformular in „Grunddaten und Zuordnung“ sowie „Inhalt und Darstellung“ gegliedert. Markdown-/Code-Vorschau ergänzt; Markdown wird mit `rehype-sanitize` sicher gerendert, Code bleibt reine Anzeige und wird nicht ausgeführt.
- Aktionen hierarchisiert: Entwurf speichern als Hauptaktion, Veröffentlichung als bewusste Sekundäraktion, Änderungen verwerfen nur bei ungespeicherten Eingaben; Archivierung als getrennte, klar beschriebene destruktive Aktion.
- Kategorien-/Dokumenttypenverwaltung erhält konsistentere Formular-, Fokus- und Kartenstile. Reader-Navigation und Seitenleisten wurden vereinheitlicht; reine Zugriffsbeschränkungen sind nicht länger rot wie ein Fehler markiert.
- Farbakzent der Bibliothek bleibt das bereits beschlossene Violett `#6841B8`, wird aber nur dezent als Kategorie-/Orientierungshinweis genutzt; Aktionsbuttons bleiben neutral-sachlich. Dekorative Farbverläufe wurden entfernt.
- Noch offen: vollständige Zusammenführung der alten und versionierten Materialmodelle (ohne Datenmigration oder künstliche Versions-IDs), zusätzliche Regressionstests und Browser-/Mobile-/Dark-Mode-QA.
- Keine Datenmodell-, API-, Berechtigungs- oder Veröffentlichungslogik geändert.


### Nachprüfung der Materialverwaltung – 12.11.2026
- Die Materialsuche wurde erweitert, soweit es die bestehende Listenprojektion sicher hergibt: Materialkennung, Kurszuständigkeit, Entwurfstitel, veröffentlichter Titel, Kategorie/Dokumenttyp aus dem vorhandenen Entwurf und Verwaltungsstatus.
- Ein erster Versuch, auch Beschreibungen und veröffentlichte Kategorien/Dokumenttypen über `AcademyMaterialListItem` zu durchsuchen, scheiterte an der tatsächlichen Typdefinition: Diese Felder sind in der Listenprojektion nicht enthalten. Die nicht unterstützten Felder wurden entfernt; keine API-Projektion wurde nur für die Suche aufgebläht.
- CI des Zwischencommits `21d43e64cf844c31fac32fb814c8f9ac4fa6ad3e` schlug mit TypeScript-Fehlern wegen dieser nicht vorhandenen Felder fehl. Korrektur erfolgte im Folgecommit `ecda264998618704e2a24f591c42f69932a05e31`; erneute CI-Prüfung steht noch aus.
- Offene UX-Arbeit: Kategorien-/Dokumenttypenformulare sind noch neben den Listen eingebettet; Bearbeitungswechsel kann Eingaben ohne explizite Rückfrage verwerfen. Diese Verwaltungsstrecken müssen noch in klare Übersichts- und Bearbeitungsansichten überführt werden.
- **Korrektur des historischen Status:** PR #202 wurde am 12.11.2026 als Squash-Merge `d74ed44a345bdfb59f4cc6f25ecb4a6dded754bc` gemergt. TypeScript-Prüfung, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung waren erfolgreich; der optionale Render-Deploy-Hook wurde übersprungen. Keine manuelle Browser-/Live-Firestore-Abnahme.


### Bibliotheksverwaltung: getrennte Taxonomie-Arbeitsansichten – 12.11.2026
- Kategorien- und Dokumenttypenverwaltung zeigen jetzt entweder die jeweilige Übersicht oder den eigenständigen Editor, nicht mehr beide nebeneinander.
- Wechsel von „Neu“ zu „Bearbeiten“ bzw. zwischen Datensätzen fragt bei veränderten Formularwerten nach, bevor Eingaben verworfen werden. Abbrechen prüft ebenfalls auf ungespeicherte Änderungen. Nach erfolgreichem Speichern kehrt die Ansicht zur Liste zurück.
- Löschaktionen sind als destruktive Aktionen visuell von normalen Bearbeiten-/Archivieren-Aktionen getrennt. Normale Kategorien und Navigation behalten neutrale Flächen; der Bibliotheksakzent bleibt auf Orientierung und Fokus begrenzt.
- Die Materialverwaltungssuche berücksichtigt die Felder, die tatsächlich in der Listenprojektion vorhanden sind. Nicht verfügbare Versionsfelder wurden nicht in die API-Projektion hineinerfunden.
- Beim Öffnen eines Materials aus dem Katalog bleibt die Materialnavigation direkt sichtbar. Leser können zwischen Materialien wechseln oder zur Materialübersicht zurückkehren; Bezeichnungen der Rück-/Navigationsaktionen wurden vereinheitlicht.
- Keine Änderung an API, Datenmodell, Rollen-/Kursberechtigungen, Versionsbindung, Veröffentlichung oder Archivierung.
- PR #203 ergänzt die Rückkehraktion auch im Erstellmodus und schützt ungespeicherte Eingaben. Die GitHub-Build-/Verify- und PR-Vorlagenprüfungen waren erfolgreich; keine Browser-/Live-Firestore-Abnahme.


- Abschließende Stilbereinigung: Die zuvor mehrfach angehängten, teils widersprüchlichen Bibliotheks-CSS-Regeln wurden in einen konsistenten Abschnitt überführt. Er definiert Katalogkarten, Reader, Sidebar, Verwaltungsformulare, Buttonzustände, Dark Mode, mobile Darstellung und Reduced Motion gemeinsam. Der Bibliotheksakzent bleibt violett und wird nur für Orientierung/Fokus eingesetzt; normale Aktionen bleiben neutral, Löschen bleibt semantisch destruktiv.
- Katalogkarten blenden einen nicht vorhandenen Dokumenttyp aus, statt einen leeren Metadaten-Trenner darzustellen. Der Status während der Veröffentlichung wurde sprachlich korrigiert.
- GitHub Actions für Commit `b2d9ca875883e57d2d3a69004c61deff36a48732`: TypeScript/Produktionsbuild und vollständige Tests erfolgreich; PR-Template-Prüfung erfolgreich. Optionaler Render-Deploy-Hook übersprungen. Kein Browser- oder Live-Firestore-Test.


## 0.3 Fortführung des Academy-Redesigns (12.11.2026)

- Der Projektinhaber hat ChatGPT ausdrücklich autorisiert, das Academy-Redesign eigenständig fortzuführen, mehrere zusammenhängende Änderungen ohne Einzelabfrage umzusetzen und geeignete PRs nach bestandener Prüfung selbst zu mergen. Die bestehende Academy-Konzeption und alle bereits beschlossenen Anforderungen bleiben unverändert; Details stehen im Entscheidungsregister.
- **PR #203 – Taxonomie-Editor:** Rückkehraktion ist jetzt auch im Erstellmodus in Kategorie- und Dokumenttypverwaltung sichtbar. Die vorhandene Bestätigung schützt ungespeicherte Eingaben. Gemergt als `6ed0a161d761c44cdff2e97f377da5f0a35c83c4`. GitHub Build/Verify und PR-Vorlagenprüfung erfolgreich. Kein manueller Browser-/Live-Firestore-Test; Render-Deploymentstatus nicht separat verifiziert.
- **PR #204 – Reader-Fehlerbehandlung:** Bei fehlgeschlagenem Laden einer Materialfassung steht direkt im Fehlerzustand eine Wiederholungsaktion zur Verfügung. Keine Änderung an Materialversion, Kursbindung, Notizen oder Berechtigungen. Gemergt als `2c24449aacdfed00590a705901e5cf722e27c9a5`. TypeScript-Prüfung, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung erfolgreich. Optionaler Render-Deploy-Hook übersprungen; kein manueller Browser-/Live-Firestore-Test.
- **PR #205 – Arbeitsfreigabe dokumentiert:** Die eigenständige Fortführung und die Merge-Ausnahme für Academy-PRs nach bestandenen Prüfungen wurden im Entscheidungsregister und Fortschritt festgehalten. Keine Änderung am Anwendungscode.
- **Nächster Prüffokus:** Lernbibliothek als Ganzes (Katalog, Filter, Reader, Notizen, Materialverwaltung und Taxonomie) gegen die beschlossene Spezifikation prüfen; danach Kurse/Lehrgänge, Academy-Übersicht und Prüfungen. Bereits umgesetzte Funktionen werden auf reale Fehler, Daten-/Berechtigungskonflikte, Fehlerzustände, Accessibility und responsive Bedienbarkeit geprüft, bevor größere visuelle Schritte erfolgen.
- **Recherchegrundlage für Bedien- und Accessibility-Prüfungen:** WCAG 2.2 (insbesondere 3.3.1/3.3.2), W3C WAI Understanding Error Identification, GOV.UK WCAG guidance und Nielsen Norman Group zu Empty States. Externe Muster dienen als Qualitätsreferenz und überschreiben keine RCPD-Beschlüsse.
- **Validierungsgrenze:** GitHub Actions ist kein Ersatz für manuelle Browser- und Live-Firestore-Abnahme. Diese bleibt für die Academy als zusammenhängender End-to-End-Schritt offen.


### PR #206 – Trefferzahlen der Lernbibliothek als Statusmeldungen (12.11.2026)

- Bestätigter Accessibility-Befund: Die sichtbare Trefferzahl im Bibliothekskatalog und in der Materialnavigation wurde bei Such-/Filteränderungen dynamisch aktualisiert, war aber nicht als programmatisch erkennbare Statusmeldung ausgezeichnet.
- Korrektur: Beide vorhandenen Trefferzahlen verwenden jetzt `role="status"` und `aria-atomic="true"`. Die sichtbare Darstellung, Filterlogik und Datenprojektion bleiben unverändert.
- Recherchegrundlage: W3C WAI Technique ARIA22 beschreibt `role="status"` für dynamische Suchergebnis-Meldungen und empfiehlt bei Bedarf ein explizites `aria-atomic="true"`; das W3C-Suchbeispiel demonstriert die Ansage einer Ergebniszahl durch Screenreader.
- PR #206 wurde am 12.11.2026 nach erfolgreicher TypeScript-Prüfung, Produktionsbuild, vollständigem Testsatz und PR-Vorlagenprüfung gemergt (Squash-Merge `e328ecbd1f7133e7f58f39b090de6ecaef12935a`).
- Der optionale Render-Deploy-Hook wurde übersprungen. Kein manueller Browser-/Screenreader-/Live-Firestore-Test; die tatsächliche Ansage bleibt Teil der späteren Accessibility-Abnahme.


### PR #207 – Wiederholungsaktionen für öffentliche Bibliotheksabrufe (12.11.2026)

- Die öffentliche Lernbibliothek bietet bei vorübergehenden Ladefehlern eine direkte Wiederholungsaktion sowohl für den Materialkatalog als auch für ein einzelnes versioniertes Material.
- Wiederholung wird bei Netzwerkfehlern (Status 0), HTTP 429 und Serverfehlern ab 500 angeboten. Dauerhafte Zugriff-/Berechtigungs-/Nichtgefunden-Antworten werden nicht als vorübergehende Fehler ausgegeben und erhalten keinen Retry-Button.
- Fehlermeldung und Retry-Aktion sind semantisch getrennt; der interaktive Button liegt außerhalb der `role="alert"`-Meldung.
- PR #207 wurde am 12.11.2026 gemergt (Commit `f90a51b7d09e35b85d2238b10b54843be578c662`). TypeScript, Produktionsbuild, Tests und PR-Vorlagenprüfung waren laut GitHub Actions erfolgreich; Render-Deploy-Hook übersprungen. Kein Browser-/Live-Firestore-Test.

### PR #208 – Planungsindex und Fortschritt nach PR #206 (12.11.2026)

- Der verifizierte Main-Basisstand und die jüngste Fortschrittsaktualisierung wurden im Planungsindex nachgeführt.
- PR #208 wurde am 12.11.2026 gemergt (Commit `ed1644afc3f9e4eb37480dcec4dc6359e02cfed6`). Es wurden nur `docs/planning/README.md` und `docs/planning/PROGRESS.md` geändert.
- Die älteren Audit-Dokumente behalten ihre historischen Prüfstände; die Dokumentationspflege behauptet keine nachträgliche Vollprüfung dieser Befunde.

### PR #209 – Wiederholungsaktion für private Notizen (12.11.2026)

- Beim initialen Laden privater Notizen und Lesezeichen im Material-Reader kann ein temporärer Netzwerk-/Serverfehler jetzt direkt erneut versucht werden.
- Ein Retry wird nur für Netzwerkfehler, HTTP 429 und Serverfehler ab 500 angeboten. Fachliche Clientfehler wie 401/403/404 erhalten keine Wiederholungsaktion.
- Während eines temporären Notiz-Ladefehlers sind das Anlegen einer Notiz und das Setzen eines Lesezeichens gesperrt, damit keine Aktionen auf einer unvollständigen Liste aufbauen.
- PR #209 wurde am 12.11.2026 als Squash-Merge `af24d99b9593f7fcadb305f892d01d9cc687b718` gemergt. TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung waren erfolgreich; Render-Deploy-Hook übersprungen. Keine Browser-/Live-Firestore-Abnahme.

- **ABGELÖST durch PR #215 (12.11.2026):** Der direkte Bibliotheks-Reader übergibt jetzt `selectedAnchor` und `onJumpToAnchor` an `AcademyMaterialReaderNotes`; die bestehende versionsgebundene Ankerlogik wird in beiden Readern wiederverwendet.

- **Historischer nächster Prüffokus vor PR #215:** Reader-/Notiz-Parität zwischen Kursansicht und direkter Bibliotheksansicht. Dieser Punkt ist durch PR #215 erledigt; die gemeinsame Browser-/Screenreader-/Live-Firestore-Abnahme bleibt separat offen.


### PR #211 – Fehler-/Retry-Semantik in der Materialverwaltung (12.11.2026)

- Der `role="alert"`-Container in `AcademyMaterialManagementCenter.tsx` enthält nur noch die Fehlermeldung. Der interaktive Button „Erneut versuchen“ ist ein separates Element außerhalb der Alert-Live-Region.
- Bestehendes Retry-Verhalten, Datenabrufe, Berechtigungen, APIs und visuelle Darstellung wurden nicht verändert.
- PR #211 wurde am 12.11.2026 gemergt (Commit `3a177d6adf704851c57500cc17f606ed6121f49a`). TypeScript, Produktionsbuild, Tests und PR-Vorlagenprüfung waren laut GitHub Actions erfolgreich; Render-Deploy-Hook übersprungen. Kein manueller Browser-/Screenreader-/Live-Firestore-Test.

### PR #215 – Gemeinsame Textanker für beide Reader (12.11.2026)

- Die DOM-Helfer zum Erfassen und eindeutigen Wiederfinden von Textankern sind jetzt zentral in `src/lib/academyTextAnchors.ts` definiert und werden von Kurs-Reader und direktem Bibliotheks-Reader gemeinsam genutzt.
- Die direkte Bibliotheksansicht übergibt nun ausgewählte Markdown-/Code-Textstellen an `AcademyMaterialReaderNotes` und kann gespeicherte Anker in der aktuell geöffneten Materialfassung wiederfinden.
- Material-/Versionsbindung, private Notizrechte und serverseitige Materialzugriffsprüfung bleiben unverändert. Mehrknoten-Auswahl wird weiterhin abgelehnt; fehlende oder mehrdeutige Anker werden nicht automatisch angenähert.
- PR #215 wurde am 12.11.2026 gemergt (Commit `3bc3b50997a3a0d9499ae705239b5d277a7029d7`). TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung waren erfolgreich; Render-Deploy-Hook übersprungen. Kein manueller Browser-/Screenreader-/Live-Firestore-Test.

- **Nächster Prüffokus:** Materialverwaltung und Taxonomie vollständig auf Fehlerzustände, Daten-/Berechtigungsgrenzen und responsive Bedienbarkeit prüfen. Danach Kurse/Lehrgänge, Academy-Übersicht und Prüfungen. Die manuelle Reader-/Notiz-End-to-End-Abnahme bleibt separat offen.


### PR #210/#211/#212 – Dokumentations- und Alert-Konsolidierung (12.11.2026)

- PR #210 aktualisierte den Fortschritt nach dem öffentlichen Bibliotheks-Retry-Fix #207 (Merge `013ef2544d7b253bfc732643cc86b90b62b85573`).
- PR #211 trennte den interaktiven „Erneut versuchen“-Button semantisch vom `role="alert"`-Container in der Materialverwaltung (Merge `3a177d6adf704851c57500cc17f606ed6121f49a`). TypeScript, Produktionsbuild, Tests und PR-Vorlagenprüfung erfolgreich; Render-Hook übersprungen.
- PR #212 dokumentierte den privaten Notiz-Retry aus #209 (Merge `6d77c6385caf6a9f4c2b5a3253f8e750b79e56bc`).

### PR #219/#221 – Materialverwaltungszustände und Validierungssemantik (12.11.2026)

- PR #219 ergänzt in der Materialverwaltung eine persistente, nur für Screenreader sichtbare `role="status"`-Region für Ladezustand, Trefferzahl und leere Suchergebnisse. Die sichtbare Zählerposition bleibt bestehen; leerer Materialbestand und Suche ohne Treffer werden sprachlich unterschieden. Merge `53841115a7760b61aaef751cc4445b41bf72b4f7`; Build/TypeScript/Tests und PR-Vorlagenprüfung erfolgreich; Render-Hook übersprungen. Kein manueller Browser-/Screenreader-Test.
- PR #221 trennt die textliche Validierungsankündigung von den interaktiven Feldsprunglinks in der Materialverwaltung. Der vorhandene Fokus auf die Fehlerzusammenfassung bleibt erhalten; Validierung und Feldzuordnung bleiben unverändert. Merge `ee5df95e5c83c1e1466f466249cc0b01dc30c008`; TypeScript, Produktionsbuild, Tests und PR-Vorlagenprüfung erfolgreich; Render-Hook übersprungen. Kein manueller Screenreader-/Tastaturtest.
- PR #214 war ein nicht gemergter Vorläufer der Textanker-Paritätskorrektur und wurde nach Umsetzung durch #215 geschlossen.

### PR #216 – Notiz-Leerzustand nur nach erfolgreichem Abruf (12.11.2026)

- Vor dem Fix erschien nach einem fehlgeschlagenen privaten Notizabruf neben dem Fehler fälschlich „Für diese Materialfassung gibt es noch keine persönlichen Einträge.“ Eine leere lokale Liste war dabei kein Beleg für einen erfolgreichen leeren Serverabruf.
- Ein eigener `notesLoaded`-Status wird beim Start jedes Abrufs zurückgesetzt und nur bei erfolgreicher Antwort gesetzt. Die Leeransicht wird erst danach angezeigt.
- Keine Änderung an privaten Notizdaten, Eigentümerisolation, Revisionen, Materialversionsbindung, API oder Berechtigungen.

### Aktualisierter nächster Auditfokus

- Reader-/Notiz-Verhalten in Kurs-Reader und direktem Bibliotheks-Reader auf Parität, Textanker, Auswahlrücksetzung und Fehler-/Speicherzustände prüfen.
- Danach Materialverwaltung und Taxonomie auf konkrete Lade-, Speichern-, Versions- und Berechtigungsfehler prüfen; keine zusätzlichen Verwaltungsfunktionen ohne Beschluss.
- Anschließend Kurse/Lehrgänge, Academy-Übersicht und Prüfungen gegen Spezifikation und tatsächliche Datenflüsse prüfen.


### PR #222 – Fortschrittsdokumentation nach PR #221 (12.11.2026)

- Der Planungsindex wurde auf den Main-Stand nach PR #221 aktualisiert; die erledigte Textanker-Parität wurde als abgeschlossen markiert und veraltete offene Prüfpunkte wurden als historisch/abgelöst gekennzeichnet.
- PR #222 wurde am 12.11.2026 gemergt (Commit `566fbb79e378920ffb84f4ab21cc1fcf64703f79`). Nur `docs/planning/README.md` und `docs/planning/PROGRESS.md` wurden geändert.

### PR #224 – Materialverwaltungs-Leerzustand nur nach erfolgreichem Laden (12.11.2026)

- Wenn der Abruf von Materialien, Kategorien oder Dokumenttypen fehlschlug, konnte die Materialverwaltung trotz sichtbarem Fehler fälschlich „Noch keine Materialien angelegt.“ darstellen. Die Screenreader-Statusregion aus PR #219 konnte ebenfalls einen leeren Bestand melden.
- Ein eigener `catalogsLoaded`-Status wird zu Beginn jedes gemeinsamen Abrufs zurückgesetzt und erst gesetzt, wenn alle drei Datenquellen erfolgreich geladen wurden. Sichtbare Leeransicht und Treffer-/Leerstatus werden bis dahin unterdrückt; der bestehende Fehlerhinweis mit Retry bleibt maßgeblich.
- Keine Änderung an Suchlogik, Datenprojektion, API, Datenmodell, Berechtigungen oder Materialzugriff.
- PR #224 wurde am 12.11.2026 gemergt (Commit `c350f3cbf5f774323fdafb8e880cfff1ac97fdab`). TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Kein manueller Browser-/Screenreader-/Live-Firestore-Test.

### PR #225 – Kurs-Reader: Retry nur für vorübergehende Fehler (12.11.2026)

- Der Kurs-Material-Reader enthielt bisher den interaktiven Retry-Button innerhalb des `role="alert"`-Elements und zeigte ihn auch bei dauerhaften fachlichen Antworten (z. B. 403/404).
- Der Alert enthält nun ausschließlich die Fehlermeldung. Eine Wiederholungsaktion wird nur bei Netzwerkfehlern (Status 0), HTTP 429 und Serverfehlern ab 500 angeboten; unerwartete Fetch-Ausnahmen bleiben wiederholbar.
- Kurs-/Materialberechtigung, exakte Materialversionsbindung und Notizzuordnung bleiben unverändert.
- PR #225 wurde am 12.11.2026 gemergt (Commit `51114f3ba171855711a50a583a192908e43014f2`). TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Kein manueller Browser-/Screenreader-/Live-Firestore-Test.
- Recherchegrundlage für die Alert-Trennung: MDN ARIA Alert Role, https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role (interaktive Elemente wie Links/Buttons gehören nicht in eine Alert-Live-Region).

### Aktualisierter nächster Auditfokus

- Reader-/Notiz-End-to-End-Verhalten: Speichern, Wiederherstellen, Versionswechsel, Textanker und Quellenstatus in Kurs-Reader und direktem Bibliotheks-Reader.
- Materialverwaltung: Speichern, Veröffentlichung, Versionshistorie, Archivierung und Kursreferenzprüfungen einschließlich Konflikt-/Fehlerfällen.
- Danach Kurse/Lehrgänge, Academy-Übersicht und Prüfungen gegen die verbindliche Spezifikation und tatsächliche Datenflüsse prüfen.
- Gemeinsame manuelle Browser-/Screenreader-/Live-Firestore-Abnahme bleibt ein separater Qualitäts-Gate; CI-Erfolg wird nicht als Produktionsabnahme ausgegeben.


### PR #228 – Private Notizen: Speichern und Neuladen gegen Parallelaktionen absichern (12.11.2026)

- Nach einem fehlgeschlagenen Autosave konnten „Erneut speichern“ und „Aktuelle Fassung laden“ auch während eines laufenden Schreibversuchs gleichzeitig aktiv sein. Zusätzlich waren die Notizfelder während des Neuladens weiter bearbeitbar.
- Die Konfliktaktionen sind jetzt nur im tatsächlichen Fehlerzustand aktiv. Beim Neuladen werden Eingaben und Aktionen gesperrt; der Handler prüft den Fehlerzustand zusätzlich und leert defensiv die ausstehende Save-Queue.
- Autosave, Serverrevisionen, Eigentümerisolation und Versionsbindung bleiben unverändert.
- PR #228 wurde am 12.11.2026 gemergt (Commit `d2184996266a3b517e6ad7e29ece7de948acaba3`). TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Kein manueller Browser-/Live-Firestore-Test.

### PR #230 – Private Notizaktionen erst nach erfolgreichem Initialabruf (12.11.2026)

- Bei permanenten Ladefehlern wie 401/403/404 war `loadRetryable` korrekt `false`, aber `notesLoaded` blieb ebenfalls `false`. Die UI konnte dadurch Notiz-/Lesezeichenaktionen wieder aktivieren, obwohl die Ausgangsliste nie erfolgreich geladen wurde.
- „Notiz hinzufügen“ und „Lesezeichen setzen“ prüfen jetzt `notesLoaded` sowohl in der Button-Freigabe als auch in den Handlern; zusätzlich werden Lade- und Parallelaktionszustände geprüft.
- Die Alert-Live-Region für Speicherfehler enthält nur noch den Meldungstext; Retry-/Reload-Schaltflächen liegen außerhalb.
- PR #230 wurde am 12.11.2026 gemergt (Commit `801296b59d4c033461352a85cb901297171fcc1f`). TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Kein manueller Browser-/Screenreader-/Live-Firestore-Test.
- PR #229 war ein älterer Vorläufer auf dem Stand vor PR #228 und wurde zugunsten der konfliktfreien Neuauflage #230 geschlossen.

### Nächster Auditfokus

- Weitere Lade-/Fehleransagen in Reader und Taxonomie gegen die WAI-ARIA-Empfehlung für persistent gemountete Live-Regionen prüfen.
- Private Notizen: Browser-/Live-Firestore-Abnahme der Autosave-, Konflikt-, Reload-, Mehrfachquellen- und Quellenstatusabläufe.
- Materialverwaltung: Veröffentlichung, Versionshistorie, Archivierung und Kursreferenzprüfungen in realen Abläufen prüfen.
- Danach Kurse/Lehrgänge, Academy-Übersicht und Prüfungen gegen die verbindliche Spezifikation und tatsächliche Datenflüsse prüfen.


### PR #233 – Persistente Fehler-Live-Regionen in der Academy (12.11.2026)

- Lade- und Speicherfehler in Kurs-Reader, privaten Reader-Notizen, Materialverwaltung sowie Kategorie-/Dokumenttypverwaltung verwenden jetzt bereits vor dem Fehler vorhandene Alert-Textknoten. Die Fehlermeldung wird in diese Region eingesetzt, statt erst zusammen mit der Alert-Rolle in den DOM eingefügt zu werden.
- Retry-/Reload-Schaltflächen liegen weiterhin außerhalb der Alert-Live-Regionen. Formular- und Fehlertexte, Retry-Verhalten, Datenabrufe und Berechtigungen bleiben unverändert.
- PR #233 wurde am 12.11.2026 gemergt (Commit `6b48bb9af666660ce6b2813659b428b3e54898f5`). TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Kein manueller Screenreader-Test.
- Recherchegrundlage: W3C WAI Technique ARIA19 (https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA19) empfiehlt einen leeren Alert-Container bereits im DOM; MDN Live Regions (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) empfiehlt die Registrierung der Live-Region vor dem Inhaltsupdate.

### PR #235 – Taxonomie nach Archivierungs-/Reaktivierungskonflikten aktualisieren (12.11.2026)

- Bei Revisionskonflikten oder nicht mehr vorhandenen Einträgen während Archivierung/Reaktivierung zeigten die Taxonomie-Manager bisher eine Fehlermeldung, luden die Liste aber nicht neu. Ein erneuter Versuch konnte dadurch mit demselben veralteten Revisionsstand wieder scheitern.
- Kategorie- und Dokumenttypmanager laden nach fehlgeschlagener Archivierung/Reaktivierung jetzt den aktuellen Listenstand erneut. Die serverseitige Revisions- und Berechtigungsentscheidung bleibt unverändert.
- PR #235 wurde am 12.11.2026 gemergt (Commit `fb8b5e8bf3aca351de6f2cbc0dacc47ac5829aaf`). TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Kein manueller Browser-/Live-Firestore-Test.
- PR #234 war ein älterer Vorläufer auf dem vorherigen Stand und wurde zugunsten der konfliktfreien Neuauflage #235 geschlossen.

### Nächster Auditfokus

- Reader-/Notiz-End-to-End-Verhalten: Autosave, Konfliktauflösung, Reload, Textanker, Mehrfachquellen und Quellenstatus in Kurs-Reader und direktem Bibliotheks-Reader.
- Materialverwaltung: Speichern, Veröffentlichung, Versionshistorie, Archivierung und Kursreferenzprüfungen einschließlich Revisions-/Konfliktfällen.
- Danach Kurse/Lehrgänge, Academy-Übersicht und Prüfungen gegen die verbindliche Spezifikation und tatsächliche Datenflüsse prüfen.
- Gemeinsame manuelle Browser-/Screenreader-/Live-Firestore-Abnahme bleibt ein separater Qualitäts-Gate; CI-Erfolg wird nicht als Produktionsabnahme ausgegeben.
