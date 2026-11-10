# RCPD – Offene Fragen und Prüffelder

**Stand:** 10.11.2026  
**Wichtig:** Diese Liste ist kein Feature-Backlog und keine Genehmigung zur Umsetzung. Jeder Punkt ist auf tatsächliche Notwendigkeit zu prüfen. Keine Scope Creep. Die ausführlichen bereits festgelegten Regeln stehen in `PORTAL-REDESIGN-DETAILS.md` und `ACADEMY-DETAILED-SPECIFICATION.md`; hier bleiben nur echte offene Entscheidungen und Prüffelder.

## 1. Academy – verbleibende fachliche Klärungen

### Academy-Übersicht und Navigation
- Übergänge zwischen Übersicht, Kursen, Bibliothek, Prüfungen, Notizen und Examiner-Kontext.
- Lade-, Fehler-, Leer- und Berechtigungszustände.
- Rückkehr zum vorherigen Kontext und Erhalt von Suche/Filter/Scrollposition.

### Kurse und Programme
- Detailregeln für Zustandsübergänge, Versionsveröffentlichung und laufende Teilnahmen.
- Umgang mit geänderten Kurs-/Programmanforderungen für laufende Teilnehmer, soweit durch bestehende Beschlüsse noch nicht konkret abgedeckt.
- Konkrete Nachweisarten und Admin-Workflows nur dort festlegen, wo fachlich erforderlich.

### Lernbibliothek und Materialien
- **In `main` umgesetzt:** Materialstamm, Arbeitsentwurf und unveränderliche veröffentlichte Versionen; automatische Material-/Versionskennung; Pflichtmetadaten-IDs; Markdown und gespeicherter Code als Inhaltsformate.
- **In `main` umgesetzt:** Kurszuständigkeit wird unabhängig vom Materialcode gespeichert und serverseitig gegen bestehende `canGradeAssignedCourses`-/`assignedCourseCodes`-Berechtigungen geprüft. Kursverantwortliche dürfen innerhalb des zugewiesenen Bereichs Entwürfe erstellen/bearbeiten und selbst veröffentlichen; Archivierung bleibt Admin/Colonel vorbehalten.
- **In `main` umgesetzt:** Kategorie-/Dokumenttyp-Zuordnungen werden gemeinsam mit Materialentwürfen aktualisiert. Veröffentlichte Versionen erhalten eigene unveränderliche Zuordnungsreferenzen. Dadurch schützt der Referenzcheck sowohl aktuelle Materialien als auch historische Fassungen vor vorzeitiger Taxonomie-Löschung.
- **In `main` umgesetzt:** Kursveröffentlichung prüft serverseitig, ob jede exakte Materialversion existiert, zum Material gehört, veröffentlicht und nicht archiviert ist.
- **Mit PR #62 in `main` umgesetzt:** Teilnehmer-Reader mit serverseitiger Prüfung der Kursteilnahme, exakter Kurs-/Materialversionsbindung, rollenabhängigem Zugriff, sicherer Markdown-Darstellung und Codeanzeige ohne Ausführung.
- **Mit PR #62 in `main` umgesetzt:** Materialauswahl im Kurseditor. Kapitel wählen veröffentlichte Fassungen und speichern die konkrete Versions-ID unveränderlich.
- **In `main` umgesetzt:** private Reader-Notizen/Lesezeichen mit Autosave (PR #132), Mehrfachquellen (PR #134) und versionsgebundene Textanker für Markdown/Code (PR #136).
- **Mit PR #141 in `main` umgesetzt:** lokale Wiederaufnahme der letzten Leseposition, isoliert nach Teilnahme und exakter Materialversion. Geräte-/browserübergreifende Synchronisierung bleibt ausdrücklich offen.
- **Mit PR #137 in `main` umgesetzt:** globale Teilnehmer-Suche, Relevanzsortierung sowie Kategorie-/Dokumenttypfilter; zusätzliche Volltext-/OCR-Suche bleibt zurückgestellt/offen.
- **Mit PR #142 in `main` umgesetzt:** Atomare Sperre betroffener Kurse bei neuer Materialfassung, getrennte Review-Einträge, idempotente In-App-Benachrichtigungen, Review-Entscheidung und serverseitige Sperre auch für noch nicht gestartete Programmpins. Die Offline-Entscheidung verlangt vor Reaktivierung eine neue Kursversion mit aktualisierten/entfernten betroffenen Materialreferenzen; archivierte Materialien setzen betroffene veröffentlichte Kurse ebenfalls offline, bis die archivierte Referenz entfernt ist. CI (TypeScript/Build und 451/451 Tests), PR-Vorlagenprüfung und Main-Workflow einschließlich Render-Deploy-Hook waren erfolgreich; manuelle Browser-/Live-Runtime-Prüfung bleibt offen.
- Bestehende Legacy-Materialien bleiben unberührt, bis ein gesonderter Migrations-/Kompatibilitätsplan beschlossen und umgesetzt ist.

**Zurückgestellt – PDF und dateibasierte Materialien (nicht Teil der aktuellen Ausbaustufe):**
- Separate dauerhafte Dateiablage, privates Speicher-Repository, PDF-Upload/-Abruf und externe Speicherverknüpfungen.
- PDF-Signatur-/Parserprüfung, Malware-/CDR-Scan, Quarantäne, Ressourcenlimits und PDF-spezifische Fehlerzustände.
- OCR und PDF-Volltextindexierung.
- Die bereits beschlossenen PDF-Anforderungen (max. 15 MB Rohdatei, echte strukturelle Prüfung, Malwareprüfung vor Veröffentlichung und Fail-closed) bleiben für die spätere Wiederaufnahme dokumentiert, sind jetzt aber keine Umsetzungsvoraussetzung.

- **Fachlich beschlossen:** Jede veröffentlichte Kursversion referenziert eine konkrete Dokumentversion (Option B). Das Datenmodell enthält bereits die Referenzfelder `materialId` und `materialVersionId`; die vollständige Materialverwaltung muss die referenzierten Versionen serverseitig auf Existenz, Veröffentlichung und Berechtigung prüfen.

### Reader, Notizen und Lesezeichen
- Konkrete Toolbar- und Werkzeuganordnung erst in der Designphase.
- **Für Markdown und Code mit PR #136 umgesetzt:** versionsgebundene Textanker je Quelle, eindeutige Wiederfindung und Warnung bei fehlenden/mehrdeutigen Treffern.
- **Mit PR #141 in `main` umgesetzt:** lokale Leseposition wird je Teilnahme und exakter Materialversion gespeichert und beim erneuten Öffnen wiederhergestellt; keine serverseitige oder geräteübergreifende Synchronisierung.
- PDF-Seiten-/Textstellenreferenzen bei Layoutänderungen bleiben offen und zurückgestellt, bis PDF-Infrastruktur wieder aufgenommen wird.
- Sync-Konflikte und fehlgeschlagene Speicherung korrekt anzeigen; keine stillen Datenverluste.
- Auswirkungen von Kontoentfernung und gesetzlichen Löschpflichten auf persönliche Notizen konkret datenschutzrechtlich/technisch prüfen.
- Geräte-/Browserunterstützung und mobile Reader-Qualität prüfen.

### Prüfungen und Examiner
- Sonderfälle und Fehlerzustände bei Prüfungsstart, Autosave, Resume, Abgabe, Bewertung und Ergebnisfreigabe.
- Draft-Speicherung einzelner Bewertungsänderungen (genehmigtes Konzept benötigt Backend-Erweiterung).
- Claim-/Inaktivitäts-/Disconnect-Grenzfälle.
- Historienanzeige und lesbare Zuordnung von Korrekturen zu Fragen/Bewertungsschritten.
- Berechtigungen und Ergebnisprojektionen anhand aktueller API/Serverlogik prüfen.
- Sortierung nach tatsächlichem Bewertungsabschlussdatum gegen vorhandene Datenfelder prüfen.

### Ergebnisfreigabe
- **Entscheidung erforderlich:** Standard für erstmalige Freigabe, wenn für eine Prüfung keine Einstellung hinterlegt ist. Vor Implementierung prüfen, ob bestehendes Modell bereits einen klaren Default liefert; andernfalls Projektinhaber fragen.
- Datenmodell/Migration, atomare Veröffentlichung, Fehler-/Rollback-Verhalten, Idempotenz, Nebenläufigkeit und Benachrichtigungsreihenfolge technisch verifizieren.

### Empfehlungen und Meldungen
- Lebenszyklus: Rückzug, Ablauf, nicht verfügbare oder obsolet gewordene Empfehlungen; eigenständige neue Empfehlung definieren, soweit notwendig.
- Fristen/Erinnerungen und Historie vs. Benachrichtigungshistorie nur bei tatsächlichem Bedarf konkretisieren.
- Spätere kontextbezogene Meldefunktion als eigenes Vorhaben planen; Academy-Integrationspunkte berücksichtigen, aber noch keine Mechanik vorziehen.

## 2. Cross-Module-Abhängigkeiten

Vor Abschluss der Academy und vor späterer Modulimplementierung validieren:
- Programme ↔ Kurse: Abschlussregeln, Mehrfachzuordnung, Versionierung.
- Kurse ↔ Bibliothek: Materialreferenzen, Dokumentversionen, Aktualisierung, Zugriffsrechte.
- Bibliothek ↔ Notizen: Dokumentversionen, Seitenreferenzen, Löschung.
- Kurse ↔ Prüfungen: Voraussetzungen, Freischaltung, Kursabschluss.
- Prüfungen ↔ Ergebnisse: interner und veröffentlichter Bewertungsstand.
- Ergebnisse ↔ Empfehlungen: interne Korrektur vor Freigabe darf keine neue Teilnehmerempfehlung auslösen.
- Empfehlungen ↔ Benachrichtigungen: Zusammenführung, Lesestatus und Ausblenden.
- Examiner ↔ Personalverwaltung: Verantwortlichkeiten und Berechtigungen.
- Academy ↔ Dashboard: gleiche zugrunde liegende Daten, angemessene unterschiedliche Informationstiefe.

## 3. Weitere Module – Inventar vorhanden, Detailaudit offen

Die Portalbereiche sind im ergänzenden `MODULE-INVENTORY.md` systematisch erfasst. Das Inventar ersetzt noch kein vollständiges UX-/Funktionsaudit. Vor jeder Ausarbeitung sind vorhandene Funktionen, Daten, Rollen, Abläufe und Originalentscheidungen konkret zu prüfen. Keine Features aus Modulnamen ableiten.

## 4. Technische Prüffelder (nicht als aktuelle Befunde missverstehen)

Die folgenden Punkte stammen aus früheren Prüfnotizen und müssen am aktuellen Branch/Commit neu verifiziert werden:
- Grading Engine speichert vollständiges Review atomar und besitzt keine separaten Grader-Drafts.
- Teilnehmer-Ergebnisprojektion basiert auf gespeicherten Attempts.
- Korrekturen sind auf Admins/Colonels beschränkt.
- Korrektur-Audit teilweise vorhanden; UI könnte User-ID und Punktlisten statt lesbarer Fragezuordnung zeigen.
- History-Sortierung möglicherweise nach `submittedAtIso` statt tatsächlichem Bewertungsabschluss.
- Completed-Manual-Review-Abfrage möglicherweise nur manuelle Freitextfälle.
- Public Projection für Final Exams unterdrückt geschützte Fragendetails.
- Keine Pagination/Infinite Loading; mögliche Begrenzung um 1.000 Einträge.
- Zu prüfende Dateien aus früheren Notizen: `server/examReviewService.ts`, `server/examSubmitService.ts`, `server/examAttemptService.ts`, `src/components/ExamParticipantRunner.tsx`, `server.ts`, `server/examRepository.ts`, `server/examRepositoryRules.ts`, `src/components/ExamCorrectionCenter.tsx` sowie passende Tests.

**Keiner dieser Punkte gilt ohne erneute Prüfung als bestätigter aktueller Codebefund.**

## 5. UX-/Accessibility-Recherche

Vor jeder neuen UX-, Layout-, Navigations- oder Interaktionsentscheidung:
1. aktuelle etablierte Plattformmuster und maßgebliche Standards recherchieren;
2. Quellen nennen;
3. Empfehlung anhand des konkreten RCPD-Arbeitsablaufs begründen;
4. bereits beschlossene Entscheidungen nicht erneut öffnen, außer ein echter Widerspruch oder eine technische Abhängigkeit macht es nötig.

## 6. Nächster Planungsabschnitt

Zum Stand 06.11.2026 wird die Lernbibliothek weiter konsolidiert. Die zuletzt beschlossenen Punkte waren:
- globale Bibliothekssuche;
- Relevanz als Standardsortierung, optional alphabetisch oder nach tatsächlicher Aktualisierung;
- kompakte, zunächst eingeklappte Filter;
- Reader-Navigation eingeklappt mit Inhaltsverzeichnis (falls auslesbar), Seitenminiaturen und direkter Seitennavigation;
- kontinuierliches vertikales Scrollen als Standard.

Vor der nächsten Frage ist der vollständige Beschlussstand abzugleichen, damit keine bereits beantwortete Grundsatzfrage erneut gestellt wird.

## 7. Gesamtes Portal – offene Redesign-Fragen

Diese Punkte gelten zusätzlich zu den Academy-Fragen oben. Sie sind Prüfaufträge, keine bereits beschlossenen Funktionen.

### Globaler Rahmen
- vollständige Rollen-/Aufgabenmatrix aus den tatsächlichen Bestandsrechten ableiten;
- globale Hauptnavigation, Sidebar/Header/Tabs und mobile Navigation festlegen;
- Such-/Schnellzugriffskonzept prüfen; Command Palette/Ctrl+K bleibt Vorschlag;
- Breadcrumbs, Zurückwege und Erhalt von Kontext (Filter, Suche, Scrollposition);
- Light-/Dark-Mode und bestehende Theme-Implementierung prüfen;
- globale Lade-, Fehler-, Leer- und Berechtigungszustände konsistent definieren;
- Designsystem erst nach Informationsarchitektur und Machbarkeitsprüfung.

### Dashboard
- konkrete rollenabhängige Inhalte und Reihenfolge;
- Dashboard-Aufgaben vs. Kennzahlen;
- Fortschrittsredundanz mit Academy/Professional Development und Festlegung einer autoritativen Quelle;
- nur tatsächlich vorhandene Fristen, Prioritäten und Daten verwenden;
- Widgets und Personalisierung sind nicht beschlossen.

### Kommunikation
- Ankündigungen, persönliche Nachrichten und Systembenachrichtigungen klar abgrenzen;
- tatsächliche Read-States und Notification-Ereignisse verifizieren;
- ungelesene Zähler, Deduplizierung und direkte Links ohne doppelte Anzeigen;
- Zielgruppen, Archivierung, Suche und mobile Bedienung anhand vorhandener Funktionen prüfen.

### Anträge und Kalender
- vorhandene Antragstypen, Statusübergänge, Bearbeiter und Genehmigungsschritte erfassen;
- Einreichung, Rückfrage, Bearbeitung, Entscheidung und Historie als durchgängigen Ablauf;
- Kalendertermine, Fristen, Zeitzonen, Wiederholungen und Datenquellen prüfen;
- keine neuen Antragstypen, Freigabestufen oder Erinnerungen ohne Beschluss.

### Personalverwaltung
- vorhandene Stammdaten, Rang-/Dienstinformationen und Statusfelder;
- Sicht- und Änderungsrechte je Rolle;
- Kontoverwaltung, Zuordnung, Statusänderungen und Historie;
- Abgrenzung von Personalstatus, Kontostatus und Whitelist;
- keine neuen Attribute, Hierarchien oder Bewertungen ohne Beschluss.

### Berichte und Audit
- verfügbare Datenquellen und fachliche Definition jeder Kennzahl;
- Berichte als Auswertung und Audit-Log als Nachweis konkreter relevanter Ereignisse trennen;
- Filter, Zeiträume, Rollenrechte, Datenschutz und Aufbewahrung;
- neue Exporte und Kennzahlen sind nicht beschlossen.

### Whitelist, Deployment, Login und Einstellungen
- Whitelist-Zweck, Status und Freigabeabläufe sowie Abgrenzung zu Konto/Personal;
- tatsächliche Betriebsaktionen und deren Rechte; keine zusätzlichen produktiven Eingriffe durch das Redesign;
- Login-/Session-/Fehler-/Wiederherstellungszustände und Sicherheitslogik;
- persönliche vs. administrative Einstellungen und Theme-/Dark-Mode-Bestand.

## 8. Cross-Module-Abhängigkeiten – gesamtes Portal

- Dashboard ↔ Academy/Professional Development: eine autoritative Fortschrittsquelle.
- Navigation ↔ Rollen/Berechtigungen: Sichtbarkeit ist keine Autorisierung.
- Ankündigungen ↔ Nachrichten ↔ Benachrichtigungen: Zwecktrennung und konsistente Read-States.
- Anträge ↔ Personalverwaltung: Zuständigkeit, Freigabe und Historie.
- Kalender ↔ Anträge/Ausbildung: Fristen nur aus verlässlichen Quelldaten.
- Programme ↔ Kurse ↔ Bibliothek: Kursversionen, konkrete Materialversionen, Zugriffsrechte.
- Kurse ↔ Prüfungen ↔ Ergebnisse: Voraussetzungen, Abschluss, interner und veröffentlichter Bewertungsstand.
- Ergebnisse ↔ Empfehlungen ↔ Benachrichtigungen: keine Folgeempfehlung vor Ergebnisfreigabe; Deduplizierung und Lesestatus.
- Examiner ↔ Personalverwaltung: Prüferrollen und Verantwortlichkeit.
- Berichte ↔ Audit: Auswertung vs. Ereignisnachweis.
- Whitelist ↔ Personal/Konto: fachlich unterschiedliche Status nicht vermischen.
- Login/Einstellungen ↔ gesamtes Portal: Session, Darstellung und Rollen.

## 9. Audit-Dokumentation pro Modul

Vor einer Empfehlung ist für jeden Bereich zu dokumentieren:
1. tatsächlicher Zweck und Nutzeraufgabe;
2. vorhandene Rollen und Rechte;
3. aktuelle Einstiege, Screens und Abläufe;
4. vorhandene Aktionen und Zustände;
5. Datenquellen und verfügbare Felder;
6. Desktop- und Mobile-Verhalten;
7. Accessibility und Fehlerzustände;
8. Redundanzen und Inkonsistenzen;
9. Abhängigkeiten zu anderen Modulen;
10. Problem, Evidenz, Auswirkung, Empfehlung und Status.

Frühere Hinweise zu App.tsx, Sidebar/Header, mobilen Tabs, Ctrl+K und Theme-CSS sind vorläufig und am aktuellen Code erneut zu verifizieren.


## 10. Ergänzende offene Punkte nach der ausführlichen Rekonstruktion

### Gesamtportal
- Modulweise Bestandsaudits mit konkreten Komponenten, Rollen, Datenquellen und Abläufen sind noch durchzuführen; Inventarisierung allein ist kein abgeschlossenes UX-Audit.
- Für jedes Modul muss geprüft werden, welche Zustände bereits im Datenmodell existieren und welche nur scheinbar aus der UI abgeleitet werden.
- Die tatsächliche Rollen-/Aufgabenmatrix muss aus dem bestehenden Berechtigungsmodell ermittelt werden.
- Globale Navigation, mobile Navigation, Such-/Schnellzugriff, Breadcrumbs und Kontextwiederherstellung sind weiterhin offen.
- Die mögliche Command Palette/Ctrl+K darf erst nach Nutzwert-, Redundanz-, Accessibility- und Rollenprüfung empfohlen werden.
- Dashboard-Widgets und Fortschrittsdarstellungen bleiben offen, bis eine autoritative Quelle für jeden Fortschritt feststeht.
- Für Kommunikation, Anträge, Kalender, Personal, Berichte/Audit, Whitelist, Betrieb und Login/Einstellungen sind noch vollständige fachliche Ablaufkonzepte auszuarbeiten.
- UX-/Accessibility-Empfehlungen benötigen vor ihrer Vorstellung aktuelle Recherche und Quellen mit konkreter RCPD-Begründung.

### Academy
- **Beschlossen:** Upload zunächst als Entwurf, danach bewusste Veröffentlichung (Option B). Nicht veröffentlichte Entwürfe sind für Teilnehmer unsichtbar.
- **Beschlossen:** maximale PDF-Rohdateigröße 15 MB; serverseitige Validierung und erfolgreiche Sicherheitsprüfung sind vor Veröffentlichung erforderlich.
- **Beschlossen – PDF-Sicherheitsprüfung Option A:** Signatur-/Parserprüfung, Ablehnung beschädigter und passwortgeschützter Dateien, Malwareprüfung vor Veröffentlichung und Fail-closed bei Prüf-/Scanner-Ausfall.
- Offen bleiben die Rollen-/Freigaberegeln,  Pflichtmetadaten/Materialcodes, Uploadgrenzen, serverseitige PDF-Prüfung, OCR sowie Rückzug/Benachrichtigung. Ein verpflichtendes PDF-Template ist ausdrücklich nicht beschlossen.
- Rollen und Berechtigungen für Materialupload und Veröffentlichung müssen aus dem bestehenden System und dem späteren Konzept abgeleitet werden.
- Der technische Nachweis einer fest gepinnten Dokumentversion je veröffentlichter Kursversion muss geprüft werden.
- Reader-Seiten-/Textstellenreferenzen bei veränderten PDF-Layouts müssen auf Robustheit geprüft werden.
- Empfehlungsregeln für unabhängige neue Empfehlungen, veraltete/entzogene Inhalte, Fristen und Erinnerungen sind offen.
- Die Draft-Grading-Erweiterung ist fachlich beschlossen, aber backendseitig zu spezifizieren und gegen den aktuellen Code zu prüfen.
- Der Default der erstmaligen Ergebnisfreigabe ist beschlossen: Ohne explizite Konfiguration gilt manuelle Erstfreigabe.
- Der spätere Kontext-Meldebutton ist als Integrationspunkt vorzusehen; der vollständige Meldeprozess ist ein separates Planungsvorhaben.

### Dokumentationsqualität
- Die verfügbaren Erinnerungen sind keine vollständigen Wortprotokolle aller älteren Chats. Neue Details aus später wieder verfügbaren Originalgesprächen müssen ergänzt werden, statt sie durch Vermutungen zu ersetzen.
- Bei jedem neuen Gesprächsschritt ist vor einer Rückfrage das Entscheidungsregister und die passende Detail-Spezifikation zu prüfen.


### Nächster Abschlussabschnitt Lernbibliothek
- Konkrete kontrollierte Kategorien- und Dokumenttypwerte anhand des tatsächlichen Materialbestands festlegen.
- Materialcode-/Versionskennung und automatische Lesezeit mit realen Daten/technischer Machbarkeit abgleichen.
- Technische PDF-Parser-, Scan-/Quarantäne- und Hostinglösung festlegen; OCR/Volltextindexierung separat entscheiden.
- Manuelle Browserprüfung der Materialprüfungs- und Kursreaktivierungsaktionen.
- Danach abschließender Academy-Konsistenzcheck (Kurs ↔ Bibliothek ↔ Reader/Notizen ↔ Empfehlungen/Prüfungen) und formale Markierung der Academy-Planung als abgeschlossen; keine automatische Implementierungsfreigabe.


### Ergebnisfreigabe und Kursabschlussnachweis – Umsetzung nach Beschluss vom 10.11.2026
- Erstfreigabe: manuell, sofern keine explizite Prüfungskonfiguration einen anderen Modus festlegt.
- Freigabeoberfläche und Rollenprüfung müssen in die bestehende Admin-/Examiner-Berechtigungsstruktur passen; die Prüfungswerkstatt bleibt Admin-only. Keine neue Rolle oder Berechtigung aus Bequemlichkeit ergänzen.
- Korrekturen nach Freigabe müssen atomar den Status „erneute Freigabe erforderlich“ setzen und die frühere Freigabe historisch erhalten.
- Automatische Freigabe darf nur nach vollständig abgeschlossener Bewertung erfolgen und nur bei ausdrücklich konfiguriertem Modus. Der fehlende Konfigurationswert bleibt manuell.
- Kursabschlussnachweis muss Prüfung, Versuch, Teilnehmer, `final_exam`, Ergebnisstatus, Freigabestatus und Kursversionskontext serverseitig verifizieren. Auswahlregel bei mehreren Versuchen muss deterministisch und gegen veraltete/ungültige Versuche abgesichert sein.
- Prüfungs- und Academy-Repositories sind getrennte Speichertransaktionen. Die Integrationslösung muss Race Conditions und Teilfehler so behandeln, dass ein nicht freigegebenes oder korrigiertes Ergebnis niemals fälschlich einen Kursabschluss erzeugt.
- Browser-/Live-Firestore-Prüfung bleibt bis zum gemeinsamen Academy-Abnahmetest zurückgestellt; CI-Tests müssen alle Freigabe-, Korrektur-, Datenschutz- und Nachweisfälle abdecken.


### Ergebnisfreigabe und Kursabschlussnachweis – verbleibende Punkte
- Die manuelle Erstfreigabe ohne explizite Konfiguration ist umgesetzt (PR #144). Eine explizite automatische Freigabekonfiguration ist derzeit im Datenmodell/Workshop nicht vorhanden und bleibt eine spätere offene Erweiterung; bis dahin darf kein automatischer Modus angenommen werden.
- Die dynamische serverseitige `required_assessment`-Verifikation ist mit PR #146 umgesetzt und gemergt: nur aktuell freigegebene bestandene `final_exam`-Versuche mit passender Teilnehmer- und Kurskennung zählen. Es wird kein persistentes Academy-Duplikat des Prüfungsnachweises erzeugt. CI und Diff-Review waren erfolgreich; die Browser-/Live-Firestore-Abnahme bleibt offen.
- Noch zu prüfen: CI, unabhängiger Diff-Review und die anschließende Produktions-/Browserprüfung. Die manuelle Browser-/Live-Firestore-Prüfung bleibt bis zum gemeinsamen Academy-Abnahmetest zurückgestellt.
