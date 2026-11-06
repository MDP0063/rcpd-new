# RCPD – Aktueller Planungs- und Redesignstand

**Stand:** 06.11.2026 – nach Beschluss Upload Option B, Selbstveröffentlichung Option A, Pflichtmetadaten Option A, getrennte Kategorien-/Dokumenttyp-Listen Option A, Berechtigungen Option B und PDF-Grenze 15 MB  
**Basisstand von main:** Merge-Commit von PR #44: `8f8f3a4f17a05f10fcff6b770461a643a718eeb8`.  
**Aktueller Dokumentationsbranch:** `docs/deep-redesign-reconstruction`.

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

## 6. Nächster konkreter Schritt

Die Dokumentationsrevision in diesem Branch vollständig prüfen und als separaten Draft-PR zur Review vorlegen. Danach weiter mit den offenen Punkten der Lernbibliothek und anschließend Modul für Modul das restliche Portal auditieren. Vor jeder Rückfrage zuerst die neuen Detail-Spezifikationen und das Entscheidungsregister abgleichen.

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

**BESCHLOSSEN am 06.11.2026:** Zwei getrennte, kontrollierte Listen. Kategorie beschreibt das fachliche Thema; Dokumenttyp die Art/Funktion des Dokuments. Pro Material eine Hauptkategorie und ein Dokumenttyp. Keine automatische Freigabe von Mehrfach-Tags oder freien Eingaben. Die konkreten Werte bleiben anhand des realen Materialbestands zu definieren. Die sechs bisherigen Codewerte sind gemischt und dürfen nicht ungeprüft als Ziel-Taxonomie gelten.


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

**Nächster Punkt ausgearbeitet:** fachliche Validierungs- und Fehlerzustände für PDFs stehen in `ACADEMY-DETAILED-SPECIFICATION.md`. Beschädigte, abgeschnittene, leere, nicht lesbare und passwortgeschützte PDFs werden abgelehnt. Signatur- und Parserprüfung sowie erfolgreiche Malwareprüfung sind vor Veröffentlichung erforderlich. Bei Scanner-Ausfall bleibt das Material unveröffentlicht. Die konkrete Parser-/Scanner-/Quarantänearchitektur ist noch offen.
