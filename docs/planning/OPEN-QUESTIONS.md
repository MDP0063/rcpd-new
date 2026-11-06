# RCPD – Offene Fragen und Prüffelder

**Stand:** 06.11.2026  
**Wichtig:** Diese Liste ist kein Feature-Backlog und keine Genehmigung zur Umsetzung. Jeder Punkt ist auf tatsächliche Notwendigkeit zu prüfen. Keine Scope Creep.

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
- Verwaltungsworkflow für Upload, Metadaten, Entwurf, Freigabe und Versionserstellung.
- Verlässliche Materialcodes, Kategorien, Tags und Datumsfelder.
- Volltextindexierung und OCR-Fähigkeit für gescannte PDFs; Qualität und Grenzen prüfen.
- Behandlung defekter, nicht lesbarer, passwortgeschützter oder nicht unterstützter Dateien.
- Konkrete Regeln für Rücknahme/Zurückziehen, Benachrichtigung und betroffene Kursreferenzen nur soweit erforderlich.
- Ob ein Kurs eine konkrete Dokumentversion referenziert oder eine kontrolliert gepflegte Referenz auf eine genehmigte Version verwendet, ist im Detail der technischen Spezifikation zu validieren; fachlich gilt: keine unbemerkte Änderung veröffentlichter Kursinhalte.

### Reader, Notizen und Lesezeichen
- Konkrete Toolbar- und Werkzeuganordnung erst in der Designphase.
- Seiten-/Textstellenreferenzen bei PDF-Layoutänderungen und Warnung bei nicht mehr eindeutig zuordenbaren Positionen.
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

## 3. Weitere Module – noch zu inventarisieren

Die Gesamtplanung umfasst weitere Portalbereiche. Für diese Baseline liegen keine ausreichend vollständigen fachlichen Spezifikationen vor. Vor jeder Ausarbeitung zunächst vorhandene Projektfunktionen, Dokumente und Originalentscheidungen inventarisieren. Keine Features aus Modulnamen ableiten.

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
