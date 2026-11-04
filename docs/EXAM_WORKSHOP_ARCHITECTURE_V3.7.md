# Technische Architektur-Spezifikation: Admin-Prüfungswerkstatt (v3.7)

> **Repository:** `MDP0063/rcpd-new`  
> **Projekt:** California POST Officer Portal (`ca-post-officer-portal`)  
> **Status:** Überarbeitete Architektur-Spezifikation nach unabhängigem Review; weiterhin vor Implementierungsfreigabe.  
> **Änderungsumfang:** Konzeption und Dokumentation; keine Implementierung der Prüfungswerkstatt.  
> **Grundlage:** v3.5 sowie die verbindlichen Ergänzungen in v3.7.

## 1. Zweck, Geltungsbereich und Freigabe

Die Prüfungswerkstatt ist ein eigenständiger, ausschließlich für den Admin zugänglicher Bereich zur Erstellung, Bearbeitung, Vorschau und Veröffentlichung von Prüfungen. In der Academy können veröffentlichte Prüfungen anschließend Lehrgängen zugewiesen und von berechtigten Teilnehmern absolviert werden.

Diese Spezifikation beschreibt das Zielsystem. Sie ist keine Implementierungsfreigabe. Vor Beginn der Implementierung sind ein unabhängiges Review und die ausdrückliche Freigabe des Projektinhabers erforderlich.

### Verbindliche Projektgrenzen

- Keine kostenpflichtigen Dienste oder neuen kostenpflichtigen Infrastrukturkomponenten.
- Kein Firebase Storage und kein Render Disk.
- Bilder in Version 1 ausschließlich über externe HTTPS-Bild-URLs; keine Base64-Bilder in Firestore.
- Bestehende Projektregeln aus `AGENTS.md` und `CONTRIBUTOR_ROLES.md` gelten uneingeschränkt.
- Admin-Werkstatt und unredigierte Lösungsschlüssel sind ausschließlich dem Admin-Account zugänglich.
- Colonels und andere Rollen erhalten weder Zugriff auf die Werkstatt-Oberfläche noch auf deren APIs.

## 2. Architekturübersicht

Das System besteht aus drei logisch getrennten Ebenen:

1. **Master-Definition (`AcademyExamDoc`)** – bearbeitbarer Arbeitsstand, Status und aktuelle Lehrgangszuweisungen.
2. **Unveränderliche Veröffentlichungsversion (`AcademyExamVersionDoc`)** – vollständiger Snapshot der veröffentlichten Prüfungsinhalte einschließlich Lösungsschlüsseln und Bewertungsregeln.
3. **Prüfungsversuch (`ExamAttemptDoc`)** – konkreter Durchlauf eines Teilnehmers, dauerhaft an eine bestimmte Snapshot-Version und einen Lehrgangskontext gebunden.

`UserProgressDoc` bleibt eine aggregierte Fortschrittsansicht. Es ersetzt nicht die vollständige Versuchshistorie.

Ein Versuch muss immer auf eine konkrete `examVersionId` zeigen. Nachträgliche Änderungen am Master dürfen weder frühere Prüfungsfragen noch frühere Bewertungen oder den damaligen Lehrgangskontext verändern.

## 3. Datenmodelle

### 3.1 Master-Definition: `AcademyExamDoc`

Die Master-Definition liegt in `dbState.exams`.

Wesentliche Felder:

- `id`, `title`, `moduleCode`
- `assignedCourseCodes: string[]` – alleinige Quelle der Wahrheit für die aktuelle Lehrgangszuweisung
- `assessmentStage: 'test' | 'final_exam'`
- `status: 'draft' | 'published' | 'archived'`
- `currentPublishedVersionId?`, `latestVersionNumber`
- `minClearance`, `passingScore`, `timeLimitMinutes`
- `maxAttempts?: number | null`
- `userExtraAttempts?: Record<string, number>`
- `prerequisites?`, `manualUnlockUserUids?`
- `examFormat: 'structured_quiz' | 'interactive_code'`
- `isLegacyFormat?`
- `questionsPayload` als JSON-Arbeitsstand
- `interactiveWidgetCode` ausschließlich für vorhandene Legacy-Prüfungen
- `authorUid`, `updatedIso`

Regeln:

- `timeLimitMinutes === 0` bedeutet unbegrenzt; negative oder nicht endliche Werte sind ungültig.
- Für Abschlussprüfungen gilt standardmäßig ein Versuchslimit von 3.
- Für Übungstests sind Versuche unbegrenzt.
- `maxAttempts === null`, `undefined` oder `0` bedeutet unbegrenzt. Positive sichere Ganzzahlen bedeuten ein festes Kontingent.
- `userExtraAttempts` erweitert nur ein tatsächlich begrenztes Kontingent; es darf kein ungültiger oder negativer Wert gespeichert werden.

### 3.2 Unveränderlicher Snapshot: `AcademyExamVersionDoc`

Snapshots liegen in `exam_versions`, mit IDs wie `<examId>__v1`, `<examId>__v2`.

Sie enthalten mindestens:

- `id`, `examId`, `versionNumber`
- `publishedAtIso`, `publishedByUid`
- Titel, Lehrgangs-Metadaten und Prüfungsparameter
- `historicalAssignedCourseCodes` als reine historische Dokumentation
- vollständige `questionsSnapshot` einschließlich Lösungen und Bewertungsrubriken
- Prüfungsformat und Legacy-Metadaten

Snapshots sind append-only. Eine veröffentlichte Version wird niemals überschrieben oder gelöscht. Änderungen an Prüfungsinhalten erzeugen eine neue Version.

### 3.3 Fragemodell

Unterstützte Fragetypen:

- `single_choice`
- `multiple_choice`
- `true_false`
- `matching`
- `free_text`

Ein Bild ist eine optionale Medieneigenschaft einer Frage, kein eigener Fragetyp. `imageUrl` akzeptiert ausschließlich gültige externe HTTPS-URLs.

Ein Frageobjekt kann abhängig vom Typ enthalten:

- `id`, `type`, `question`, `points`, `explanation?`, `imageUrl?`
- `options?`, `correctIndices?`
- `matchingPairs?`
- `gradingRubric?`, `maxAnswerLength?`

Matching-Paare besitzen stabile IDs und Ziel-IDs. Die richtige Zuordnung bleibt im Snapshot serverseitig.

### 3.4 Versuchshistorie: `ExamAttemptDoc`

Jeder Versuch ist ein eigener Datensatz und enthält mindestens:

- `id`, `userId`, `userName`
- `examId`, `examVersionId`, `versionNumber`
- `attemptCourseCode` – der konkrete Lehrgang, unter dem der Versuch gestartet wurde
- `assignedCourseCodesAtStart` – Audit-Snapshot der damaligen Master-Zuweisungen
- `moduleCode` als Kompatibilitätsfeld; bei neuen Versuchen entspricht es `attemptCourseCode`
- `assessmentStage`, `attemptNumber`
- `startedAtIso`, `deadlineIso: string | null`, `lastHeartbeatAtIso`
- `submittedAtIso?`, `currentRevision`
- Status: `in_progress | passed | failed | pending_review | invalidated_by_admin`
- `submissionReason?`
- Gesamt-, automatisch und manuell erzielte Punkte
- `preliminaryScorePercent?`, `finalScorePercent?`
- Autosave-Antworten, Matching-Shuffle-Reihenfolge und Fragebewertungen
- Korrekturfeedback und Audit-Metadaten

Abgeschlossene Versuche werden niemals überschrieben oder gelöscht. Admin-Invalidierungen erhalten den Datensatz und schließen ihn lediglich von der Kontingentzählung aus.

## 4. Veröffentlichung und Append-Only-Garantie

### 4.1 Firestore

Die Veröffentlichung läuft über eine Firestore-Transaktion:

1. Master-Dokument lesen.
2. Nächste Versionsnummer aus dem aktuellen Master bestimmen.
3. Ziel-Snapshot-Dokument innerhalb derselben Transaktion lesen.
4. Existiert die Version bereits, Veröffentlichung abbrechen.
5. Snapshot mit `transaction.create()` anlegen.
6. Master-Zeiger und Versionsnummer in derselben Transaktion aktualisieren.

`transaction.create()` muss verhindern, dass eine vorhandene Version überschrieben wird. Die Diff-/Storage-Schicht darf für `exam_versions` keine Updates oder Deletes akzeptieren.

### 4.2 JSON-Backend: prozessweite Operations-Queue

Eine Sperre nur pro Prüfung reicht nicht aus, weil alle Datensätze in dieselbe JSON-Datei geschrieben werden. Sämtliche mutierenden Read-Modify-Write-Operationen müssen deshalb dieselbe prozessweite FIFO-Queue verwenden.

Verbindliches Queue-Muster:

```typescript
let jsonOperationQueue: Promise<void> = Promise.resolve();

export function withJsonDatabaseLock<T>(
  operation: () => Promise<T>
): Promise<T> {
  const task = jsonOperationQueue.then(operation);

  // Fehler an den konkreten Aufrufer weitergeben,
  // aber die Queue für nachfolgende Operationen freigeben.
  jsonOperationQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}
```

Die Sperre muss die vollständige fachliche Operation umfassen: aktuellen State lesen, validieren, mutieren und persistieren. Es genügt nicht, lediglich den abschließenden Dateischreibvorgang zu serialisieren.

Mindestens folgende Operationen müssen diese Sperre nutzen:

- Veröffentlichung und Versionsnummernvergabe
- Prüfungsstart und Kontingentprüfung
- Autosave und Abgabe
- manuelle Bewertung
- Admin-Overrides und Zusatzversuche
- Migrationen und sonstige Mutationen desselben States

Der State ist auf einem Arbeitsstand zu verändern. Ein fehlgeschlagener Persistenzvorgang darf keinen dauerhaft abweichenden In-Memory-State hinterlassen; nach fehlgeschlagener Persistenz muss der Arbeitsstand verworfen oder zuverlässig zurückgerollt werden.

### 4.3 Atomare JSON-Dateipersistenz

Innerhalb der Operationssperre wird der vollständige State in eine eindeutige temporäre Datei geschrieben und anschließend mit `rename` ersetzt.

- Temporärdateiname: `portal-db-v3.<timestamp>.<uuid>.tmp`
- Exklusive Erstellung der temporären Datei (`flag: 'wx'`)
- Kein `copyFile`-plus-`unlink`-Fallback
- Schlägt `rename` fehl, wird der Fehler gemeldet und die bisherige Datenbankdatei bleibt unangetastet.
- Temporärdateien werden bei Fehlern bestmöglich bereinigt.

Die Queue ist ein prozessweiter Lock, kein verteilter Lock. Sie schützt nicht mehrere unabhängige Node-Prozesse. Das JSON-Backend wird daher nicht als Multi-Instance-Storage behandelt; bei mehreren Serverinstanzen ist Firestore erforderlich.

## 5. Snapshot-Größenlimit

Vor Veröffentlichung wird das vollständig serialisierte Snapshot-Objekt einschließlich Metadaten, Fragen, Optionen, Rubriken und URLs geprüft:

```typescript
const serializedBytes = Buffer.byteLength(
  JSON.stringify(snapshotDoc),
  'utf8'
);

if (serializedBytes > 500_000) {
  throw new Error('SNAPSHOT_TOO_LARGE');
}
```

500.000 UTF-8-Bytes sind ein konservatives Anwendungs-Limit mit deutlichem Abstand zum Firestore-Dokumentlimit von 1 MiB. JSON-Serialisierungsgröße und tatsächliche Firestore-Dokumentgröße sind nicht identisch; deshalb darf nicht behauptet werden, ein Firestore-Größenfehler sei mathematisch ausgeschlossen. Ein Firestore-Größenfehler muss zusätzlich sauber behandelt werden.

## 6. Lehrgangszuweisung und Versuchskontext

`AcademyExamDoc.assignedCourseCodes` ist die alleinige Quelle der Wahrheit für aktuelle Zuweisungen. Admins dürfen veröffentlichte Prüfungen mehreren Lehrgängen zuweisen oder daraus entfernen, ohne eine neue Inhaltsversion zu veröffentlichen.

Beim Start übermittelt der Client den konkreten `attemptCourseCode`. Der Server normalisiert den Wert und validiert ihn gegen die aktuelle Master-Zuweisung. Nicht zugewiesene Lehrgänge werden abgelehnt.

Der Server speichert den validierten Lehrgang und die Zuweisungsliste zum Startzeitpunkt im Versuch. Der Snapshot-Wert `historicalAssignedCourseCodes` dient nur der historischen Dokumentation und steuert keine aktuellen Berechtigungen.

### Aktiver Versuch und Lehrgangswechsel

Existiert bereits ein aktiver Versuch desselben Nutzers für dieselbe Prüfung:

- gleicher `attemptCourseCode`: bestehenden Versuch idempotent zurückgeben
- anderer `attemptCourseCode`: keinen neuen Versuch anlegen, bestehenden Versuch nicht umhängen und mit `409 Conflict` (z. B. `ACTIVE_ATTEMPT_DIFFERENT_COURSE`) antworten

## 7. Prüfungsstart, Kontingente und Admin-Overrides

Prüfungsstarts müssen transaktionssicher beziehungsweise im JSON-Backend vollständig serialisiert sein.

- Aktive Versuche werden idempotent zurückgegeben.
- Begrenzte Kontingente zählen alle nicht invalidierten Versuche des Nutzers für die Prüfung.
- `null`, `undefined` und `0` bedeuten unbegrenzt; positive sichere Ganzzahlen bedeuten begrenzt.
- Ungültige Werte werden serverseitig abgelehnt.
- Übungstests erlauben unbegrenzt viele Versuche.
- Abschlussprüfungen haben standardmäßig drei Versuche; Admins können das Limit ändern oder unbegrenzt setzen.

Admin-Aktionen:

- `invalidate_attempt`: Versuch als `invalidated_by_admin` markieren, nicht löschen; Pflichtbegründung und Audit-Log.
- `grant_extra_attempt`: Zusatzkontingent für eine konkrete UID erhöhen; Pflichtbegründung und Audit-Log.
- Jede Aktion speichert Admin-UID, Zeitstempel und Begründung serverseitig.

## 8. Voraussetzungen für Abschlussprüfungen

Abschlussprüfungen können Voraussetzungen auf Basis anderer Tests besitzen:

- `completed`: Test wurde absolviert.
- `passed`: Test wurde mit der erforderlichen Mindestleistung bestanden.

Ein optionaler Mindestprozentsatz kann pro Voraussetzung festgelegt werden. Voraussetzungen werden serverseitig geprüft. Eine Admin-Freischaltung bleibt möglich und wird auditierbar gespeichert.

Unverifizierte historische `passed`-Ergebnisse aus dem alten clientseitig bewerteten `interactive_code`-Format erfüllen keine `passed`-Voraussetzung automatisch. `completed` kann weiterhin als Absolvierungsnachweis gelten. Ein Admin kann einen Legacy-Nachweis über einen dedizierten Verifikationsvorgang bestätigen; UID, Zeitstempel und Begründung werden protokolliert.

## 9. Bewertungslogik

Alle automatischen Bewertungen erfolgen serverseitig anhand des unveränderlichen Snapshots.

### Single Choice und True/False

Die Antwort wird gegen den serverseitigen Lösungsschlüssel geprüft. Ungültige Indizes oder manipulierte Payloads werden abgelehnt beziehungsweise ohne Zusatzpunkte behandelt.

### Multiple Choice mit Teilpunkten

`P = max(0, ((R - F) / N) * P_max)`

- `R`: korrekt ausgewählte Optionen
- `F`: falsch ausgewählte Optionen
- `N`: Gesamtzahl richtiger Optionen
- `P_max`: maximale Punktzahl der Frage

Doppelte und ungültige Indizes dürfen keine zusätzlichen Punkte erzeugen. Das Ergebnis liegt zwischen 0 und `P_max`.

### Matching mit Teilpunkten

`P = (K / N) * P_max`

- `K`: korrekt zugeordnete Paare
- `N`: Gesamtzahl der Paare
- `P_max`: maximale Punktzahl der Frage

Version 1 verwendet eine eindeutige Eins-zu-eins-Zuordnung. Jede Ziel-ID darf in einer Antwort nur einmal verwendet werden. Paar- und Ziel-IDs werden serverseitig gegen den Snapshot validiert.

### Freitext und gemischte Prüfungen

Freitext wird manuell anhand der Rubrik bewertet. Ausbilder dürfen nur Freitextaufgaben der ihnen zugewiesenen Lehrgänge korrigieren.

Bei gemischten Prüfungen mit noch offenen Freitexten:

- Status bleibt `pending_review`.
- Automatisch erzielte Punkte und ein vorläufiger Prozentsatz dürfen informativ angezeigt werden.
- `finalScorePercent` bleibt `null`.
- Es gibt noch keinen endgültigen Bestehensstatus.
- Erst nach vollständiger manueller Bewertung wird die Gesamtnote finalisiert.

## 10. Geheimnisschutz und Rollen

Die öffentliche Fragenprojektion darf niemals Lösungsschlüssel oder private Bewertungsdaten enthalten.

- `correctIndices`, korrekte Matching-Zuordnungen und interne Bewertungsdaten bleiben serverseitig.
- Die Prüflingsprojektion enthält nur die benötigten Fragen und Antwortmöglichkeiten.
- Matching-Ziele werden für den Teilnehmer zufällig angeordnet; die korrekte Zuordnung wird nicht an den Client gesendet.
- `toClientExam()` und alle neuen Endpunkte müssen diese Trennung erhalten.

### Admin

Ausschließlich Admin darf:

- Prüfungswerkstatt öffnen
- Entwürfe und unredigierte Master-Definitionen abrufen
- Lösungsschlüssel und Rubriken vollständig sehen
- veröffentlichen, archivieren, manuell freischalten und Overrides durchführen

Die Autorisierung erfolgt anhand der authentifizierten serverseitigen Sitzung, niemals anhand einer vom Client gelieferten UID oder Rolle.

### Ausbilder

Ausbilder mit `canGradeAssignedCourses` und passenden `assignedCourseCodes` dürfen Freitextaufgaben ihrer Lehrgänge korrigieren. Sie erhalten ausschließlich:

- Prüflingsidentität, soweit für die Korrektur erforderlich
- Freitextfrage, Punktzahl und eingereichten Text
- Freitext-Rubrik und erforderliche Korrekturhinweise

Sie erhalten keine Quiz- oder Matching-Lösungsschlüssel und keinen Zugriff auf die Prüfungswerkstatt.

Berechtigungsprüfung:

1. Primär anhand des beim Start validierten `attemptCourseCode`.
2. Für migrierte Altversuche ohne dieses Feld darf eng begrenzt `moduleCode` als einzelner historischer Lehrgangscode verwendet werden.
3. `assignedCourseCodesAtStart` darf nicht als Berechtigungsfallback verwendet werden, da dies Zugriff auf fremde Lehrgänge erweitern könnte.
4. Fehlt ein sicherer Lehrgangskontext, wird der Zugriff verweigert.

## 11. Zeitlimit, Autosave und Wiederaufnahme

### Zeitlimit

- `timeLimitMinutes === 0`: `deadlineIso = null`, keine Ablaufprüfung.
- `timeLimitMinutes > 0`: Deadline wird serverseitig beim Start gesetzt.
- Negative, nicht endliche oder ungültige Zeitwerte werden abgelehnt.

### Deadline und Request-Eingang

Der maßgebliche Zeitpunkt ist der serverseitige Eingang des Requests, nicht die Client-Uhr. Der Eingangszeitpunkt muss am API-Routenanfang erfasst werden, bevor der Request auf eine JSON-Queue oder Firestore-Transaktion wartet. Andernfalls könnte ein rechtzeitig eingegangener Request allein durch interne Wartezeit verspätet erscheinen.

Für Autosave und Submit gilt:

- Eingang bis einschließlich Deadline: reguläre Verarbeitung.
- Eingang nach Deadline: Payload nicht speichern und Versuch anhand des letzten rechtzeitig gespeicherten Autosave-Stands finalisieren.
- Verspätete Requests erhalten `409 Conflict`.
- Ein verspäteter Autosave darf weder Antworten noch Revision oder Heartbeat aktualisieren.
- Ein verspäteter Submit darf keine neuen Antworten in die Abgabe einbringen.

Bei Render Free erfolgt Lazy-Expiry beim nächsten Request; ein separater kostenpflichtiger Scheduler ist nicht vorgesehen.

### Autosave

- Regelmäßiger Autosave etwa alle 20 Sekunden, zusätzlich debounced bei Eingaben und sofort bei Fragenwechsel.
- `revision` muss eine positive sichere Ganzzahl sein.
- Revisionen dürfen nicht beliebig weit springen; maximaler Sprung: `currentRevision + 100`.
- Veraltete Revisionen werden ignoriert.
- Bei Wiederaufnahme liefert der Server Revision und letzten gespeicherten Antwortstand; der Client setzt mit der nächsten Revision fort.
- Request-Body maximal 64 KB; Freitext je Frage maximal 4.000 Zeichen.
- Client-Disconnects dürfen den serverseitig gespeicherten Stand nicht beschädigen.

## 12. Erklärungen und Ergebnisanzeige

| Prüfungsart | Prüfling | Ausbilder/Admin |
|---|---|---|
| Übungstest (`test`) | Erklärungen nach Abgabe im Ergebnisbericht | Vollständig entsprechend Berechtigung |
| Abschlussprüfung (`final_exam`) | Erklärungen dauerhaft verborgen, auch nach Bestehen | Admin in der Werkstatt; Ausbilder nur erforderliche Freitext-Korrekturhinweise |

Finalprüfungs-Lösungsschlüssel und Erklärungen dürfen nicht über History-, Ergebnis- oder allgemeine State-Endpunkte an Prüflinge gelangen.

## 13. Vorschau, Veröffentlichung und Academy-Zuweisung

Die Werkstatt unterstützt:

1. Entwurf erstellen und bearbeiten
2. Vorschau und simulierten Test durchführen
3. Entwurf speichern
4. Veröffentlichung als unveränderliche Version
5. Veröffentlichung einer neuen Version bei späteren Inhaltsänderungen

Vorschau-Simulationen erzeugen keine echten Prüfungsversuche und verändern weder Fortschritt noch Kontingente.

In der Academy können Admins veröffentlichte Prüfungen zu Lehrgängen hinzufügen. Die aktuelle Zuordnung wird über `assignedCourseCodes` der Master-Definition verwaltet. Die inhaltliche Version bleibt davon unabhängig.

## 14. Legacy-Migration

Bestehende Prüfungen und Fortschrittsreferenzen müssen erhalten bleiben.

- Bestehende IDs und Progress-Referenzen bleiben erhalten.
- Legacy-Fragen ohne Typ werden als `single_choice` interpretiert.
- Vorhandene aktive Prüfungen erhalten eine initiale Snapshot-Version, sofern noch keine existiert.
- Entwürfe erhalten keinen Snapshot.
- `interactive_code` bleibt für Altprüfungen lesbar, ist für Neuanlagen gesperrt.
- Nicht verifizierte Legacy-Bestehenswerte erfüllen keine `passed`-Voraussetzung.

Migrationen sind idempotent:

- Existierende Snapshots werden niemals neu erzeugt oder überschrieben.
- Existiert ein Snapshot, aber der Master-Zeiger fehlt, wird der Zeiger auf die höchste gültige vorhandene Version repariert.
- Migrationen müssen auch nach einem abgebrochenen Teilschritt sicher fortsetzbar sein.
- Ein Instanz-Flag verhindert doppelte parallele Migration innerhalb desselben Prozesses; Storage-Operationen bleiben zusätzlich gegen konkurrierende Schreibvorgänge geschützt.

## 15. API-Bereiche

Die konkreten Pfade können bei der Implementierung an bestehende Routing-Konventionen angepasst werden; die Autorisierungsgrenzen sind verbindlich.

| Bereich | Zweck | Zugriff |
|---|---|---|
| Admin Exams | Master-Definitionen und Entwürfe lesen/speichern | Admin |
| Publish | Unveränderlichen Snapshot erstellen und veröffentlichen | Admin |
| Unlock / Override | Manuelle Freischaltung, Invalidierung, Zusatzversuche | Admin |
| Legacy Verification | Historische Ergebnisse auditierbar verifizieren | Admin |
| Start | Voraussetzungen, Lehrgang, Kontingent und aktiven Versuch prüfen | Teilnehmer |
| Active / Autosave / Submit | Versuch fortsetzen, speichern und abgeben | Eigentümer des Versuchs |
| History | Eigene Versuchshistorie | Teilnehmer |
| Pending Grading | Offene Freitextkorrekturen der zugewiesenen Lehrgänge | Berechtigter Ausbilder |
| Submission / Grade | Freitextabgabe abrufen und bewerten | Berechtigter Ausbilder |

Jeder Endpunkt prüft die Berechtigung serverseitig. Teilnehmer dürfen nur ihre eigenen Versuche lesen und verändern. Admin-Werkstattdaten und Lösungsschlüssel werden nicht über allgemeine Portal-State-Endpunkte offengelegt.

### Vorgesehene konkrete Routen

| Endpunkt | Methode | Zugriff | Zweck |
|---|:---:|---|---|
| `/api/admin/exams` | GET | Admin | Alle Master-Definitionen einschließlich Entwürfen |
| `/api/admin/exams/:id` | GET | Admin | Unredigierte Master-Definition für die Werkstatt |
| `/api/academy/exams/:id` | PUT | Admin | Master-Definition und aktuelle Lehrgangszuweisung speichern |
| `/api/admin/exams/:id/publish` | POST | Admin | Snapshot atomar anlegen und veröffentlichen |
| `/api/admin/exams/:id/unlock-user` | POST | Admin | Teilnehmer manuell für eine Abschlussprüfung freischalten |
| `/api/admin/exams/attempts/:id/override` | POST | Admin | Versuch invalidieren oder Zusatzversuch gewähren |
| `/api/admin/exams/progress/:id/verify-legacy` | POST | Admin | Historischen Legacy-Nachweis auditierbar verifizieren |
| `/api/academy/exams/:id/start` | POST | Teilnehmer | Voraussetzungen, Lehrgang, Kontingent und aktiven Versuch prüfen |
| `/api/academy/exams/:id/attempts/active` | GET | Eigentümer des Versuchs | Laufenden Versuch wiederherstellen |
| `/api/academy/exams/:id/attempts/:attemptId/autosave` | PUT | Eigentümer des Versuchs | Antwortstand revisionsgesichert speichern |
| `/api/academy/exams/:id/attempts/:attemptId/submit` | POST | Eigentümer des Versuchs | Versuch abgeben und automatisch auswerten |
| `/api/academy/exams/:id/history` | GET | Teilnehmer | Eigene Versuchshistorie |
| `/api/academy/grading/pending` | GET | Berechtigter Ausbilder | Offene Freitextkorrekturen der zugewiesenen Lehrgänge |
| `/api/academy/grading/submissions/:attemptId` | GET | Berechtigter Ausbilder | Zulässige Freitextabgabe und Rubrik abrufen |
| `/api/academy/grading/submissions/:attemptId` | POST | Berechtigter Ausbilder | Freitext bewerten und Gesamtnote finalisieren |

Die Pfade sind die geplante Ausgangsstruktur. Vorhandene Routing-Konventionen dürfen bei der Implementierung berücksichtigt werden, solange Zweck, serverseitige Autorisierung und Datengrenzen unverändert bleiben.

## 16. Implementierungsphasen

1. **Phase 1:** Datenmodelle, serverseitige Bewertungs- und Validierungslogik einschließlich Matching.
2. **Phase 2:** Snapshot-Architektur, Firestore-Transaktionen, JSON-Operations-Queue und idempotente Migration.
3. **Phase 3:** Admin-Prüfungswerkstatt mit visueller Bearbeitung und Vorschau.
4. **Phase 4:** Prüfungs-Runner, serverseitiger Timer, Autosave und Wiederaufnahme.
5. **Phase 5:** Ausbilder-Korrekturkonsole und manuelle Freitextbewertung.
6. **Phase 6:** Admin-Overrides, Legacy-Verifikation, Berechtigungs- und End-to-End-Tests.

Jede Phase wird über einen eigenen nachvollziehbaren PR beziehungsweise klar abgegrenzte Änderungen umgesetzt. Sicherheitsrelevante serverseitige Logik erhält automatisierte Tests.

## 17. Verbindliche Prüfpunkte für die Implementierung

Die Implementierung muss insbesondere nachweisen:

- Append-only-Verhalten für veröffentlichte Versionen in beiden Storage-Backends
- vollständige Read-Modify-Write-Serialisierung im JSON-Backend
- keine In-Memory-/Persistenz-Divergenz nach fehlgeschlagenem Schreiben
- Transaktionssicherheit bei Veröffentlichung, Start und Kontingentprüfung
- korrekte Lehrgangsvalidierung und unveränderlicher Versuchskontext
- kein Überschreiben oder Löschen historischer Versuche
- keine Lösungsschlüssel in Client-Projektionen oder allgemeinen State-Endpunkten
- keine Berechtigungsausweitung über `assignedCourseCodesAtStart`
- Deadline-Prüfung anhand des am Routenanfang erfassten Request-Eingangs
- vollständige Größenprüfung des Snapshots und saubere Fehlerbehandlung
- idempotente Migration auch nach Teilabbrüchen
- Tests für Teilpunkte, Matching, Freitext, Voraussetzungen, Legacy und Admin-Overrides

Diese Prüfpunkte sind Implementierungsnachweise; die Spezifikation allein beweist nicht, dass die Garantien im Code bereits erfüllt sind.

## 18. Freigabestatus

v3.7 ist die konsolidierte konzeptionelle Grundlage. Sie genehmigt keine Codeänderungen an der Prüfungswerkstatt.

Vor Phase 1 erfolgt ein unabhängiges Review durch eine andere Instanz als den Hauptimplementierer. Danach entscheidet ausschließlich der Projektinhaber, ob und wann die Implementierung beginnen darf.


## 19. Verbindliche Klarstellungen aus dem unabhängigen Review (v3.7)

Dieser Abschnitt ergänzt und präzisiert v3.6. Bei Widersprüchen haben die folgenden Festlegungen Vorrang vor früheren, allgemeineren Formulierungen. Die Ergänzungen sind Teil der verbindlichen Spezifikation; sie genehmigen noch keine Implementierung.

### 19.1 Speichergrenze: dedizierter Exam-Store statt allgemeinem Portal-State

Der aktuelle Firestore-Store ist kein transaktionales Repository für einzelne Fachoperationen: Er hält den Portal-State im Speicher, plant verzögerte Änderungen über `stateDiff.ts` und schreibt sie gebündelt mit `BulkWriter`. Die dortige `flush()`-Implementierung fängt Schreibfehler intern ab und kann daher derzeit keine erfolgreiche dauerhafte Speicherung gegenüber einer API-Route bestätigen. Eine Firestore-Transaktion, die lediglich an `stateDiff` vorbei schreibt, wäre wirkungslos beziehungsweise würde zwei konkurrierende Wahrheitsquellen erzeugen.

**Verbindliche Architekturentscheidung:** Neue Prüfungsdaten werden deshalb über einen abgegrenzten `ExamRepository` verwaltet. Dieser ist die einzige Quelle der Wahrheit für:
- Prüfungs-Masterdefinitionen,
- unveränderliche Veröffentlichungsversionen,
- einzelne Prüfungsversuche,
- prüfungsbezogene Fortschrittsaggregate.

Die neuen Exam-Datensätze werden nicht gleichzeitig als beschreibbare Kopien im allgemeinen `dbState` geführt. Der allgemeine Portal-State darf daraus ausschließlich eine sichere, explizit projizierte Metadatenansicht erhalten.

Der `ExamRepository` besitzt zwei Backend-Adapter:

**Firestore-Adapter**
- Verwendet die vorhandene Firestore-Instanz beziehungsweise deren Konfiguration, aber eigene, gezielte Repository-Methoden.
- Veröffentlichung, Prüfungsstart, Kontingentprüfung und Versuchsanlage verwenden echte Firestore-Transaktionen, soweit mehrere Dokumente gemeinsam konsistent geändert werden müssen.
- Versionsdokumente werden create-only angelegt; vorhandene Versionen können nicht überschrieben oder gelöscht werden.
- Autosaves schreiben gezielt das betreffende Versuchsdokument. Sie lösen weder eine Änderung an `sync/state` noch einen allgemeinen Portal-State-Reload aus.
- Reads für aktive Versuche, Historie und Korrektur laden nur die jeweils benötigten Dokumente; sie laden und klonen nicht den gesamten Portal-State.

**JSON-Adapter**
- Verwendet eine eigene Exam-Datendatei im bestehenden `DATA_DIR`; es wird kein neuer Dienst und kein zusätzlicher kostenpflichtiger Speicher eingeführt.
- Alle fachlichen Read-Modify-Write-Operationen laufen durch eine gemeinsame prozessweite FIFO-Queue. Die Queue umfasst Lesen, Validieren, Mutieren und atomare Dateipersistenz – nicht nur den abschließenden Schreibvorgang.
- Die Queue bleibt nach einem fehlgeschlagenen Task verwendbar; der Fehler wird an den konkreten Aufrufer weitergegeben.
- Persistenz erfolgt über eine eindeutig benannte temporäre Datei und `rename`; kein Copy-plus-Unlink-Fallback.
- Der JSON-Adapter ist ein Single-Process-Backend. Er ist kein verteilter Lock und nicht für mehrere Node-Prozesse/Instanzen geeignet.

Der `ExamRepository` darf keine Exam-Daten parallel über `saveDatabase()`, `stateDiff.ts` oder eine zweite In-Memory-Wahrheitsquelle persistieren. Gemeinsame Hilfsfunktionen und die bestehende Firebase-Konfiguration dürfen wiederverwendet werden.

**Persistenzbestätigung:** Kritische Schreiboperationen (Veröffentlichung, Start, Abgabe, manuelle Bewertung und Admin-Override) dürfen erst dann als erfolgreich beantwortet werden, wenn der jeweilige Repository-Schreibvorgang erfolgreich bestätigt wurde. Bei Persistenzfehlern wird ein Fehlerstatus zurückgegeben; ein Erfolg darf nicht vorgetäuscht werden. Der JSON-Adapter bestätigt erst nach erfolgreichem Rename. Der Firestore-Adapter bestätigt erst nach erfolgreichem Abschluss der relevanten Transaktion beziehungsweise Schreiboperation. Fehler und Wiederholungen müssen beobachtbar sein; ein im Hintergrund verschluckter Fehler gilt nicht als Persistenzbestätigung.

### 19.2 Übergang von bestehenden Prüfungsdaten und alte Schreibwege

Die bestehende Academy besitzt ältere Routen, die nicht automatisch die Regeln des neuen Versuchssystems anwenden. Die Einführung des `ExamRepository` muss deshalb einen klaren Übergang enthalten.

| Bestehender Schreibweg | Verbindliche Behandlung |
|---|---|
| `POST /api/progress` für `structured_quiz`-Prüfungen | Darf nach Aktivierung des neuen Systems keine neuen strukturierten Prüfungsversuche oder Ergebnisse mehr annehmen. Neue Prüfungen laufen ausschließlich über Start, Autosave und Submit des neuen Systems. |
| `POST /api/progress` für `interactive_code` | Keine neuen Legacy-Versuche über den clientseitig gelieferten Score. Historische Datensätze bleiben erhalten und werden als Legacy behandelt; nicht verifizierte Ergebnisse erfüllen keine `passed`-Voraussetzung. |
| `POST /api/academy/exams` | Legacy-Anlage wird nach dem Migrations-/Cutover-Schritt deaktiviert. Neue und bearbeitete Prüfungen werden ausschließlich über Admin-Authoring-Endpunkte des neuen Systems verwaltet. |
| `DELETE /api/academy/exams/:examId` | Hard Delete wird deaktiviert. Prüfungen werden archiviert; Versionen und Versuche bleiben erhalten. |
| `POST /api/academy/instructor-grade` | Darf keine neuen Prüfungsversuche oder beliebigen Prüfungs-Progress-Datensätze schreiben. Die neue Freitextkorrektur läuft ausschließlich über die dedizierten Grading-Endpunkte mit serverseitiger Lehrgangsprüfung. Bestehende Nicht-Prüfungsfunktionen dürfen nur erhalten bleiben, wenn ihr `targetType` explizit begrenzt und geprüft ist. |

Die Umschaltung muss serverseitig erfolgen; ein ausgeblendeter Button genügt nicht. Die Reihenfolge des Cutovers ist:
1. Bestehende Prüfungs- und Progress-Daten sichern und migrieren.
2. Neue ExamRepository-Lese- und Schreibwege aktivieren.
3. Alte Prüfungs-Schreibwege serverseitig sperren oder für zulässige Nicht-Prüfungsfälle eng begrenzen.
4. Client-Oberfläche auf die neuen Endpunkte umstellen.
5. Historische Datensätze weiterhin lesbar halten.

Während der Übergangsphase darf kein Datensatz gleichzeitig über den alten und den neuen Bewertungsweg verändert werden.

Bestehende `interactive_code`-Prüfungen bleiben als historische Datensätze erhalten. Sie werden nicht in das neue strukturierte Prüfungsformat umgewandelt und können nicht neu gestartet werden, solange ihre Bewertung ausschließlich auf einem vom Client gelieferten Ergebnis beruht. Ein Admin kann einen konkreten historischen Nachweis ausdrücklich verifizieren; diese Verifikation wird separat protokolliert.

### 19.3 Allgemeiner Portal-State und Client-Projektionen

`GET /api/portal/state` ist kein Prüfungsdaten-Endpunkt.

- Für Nicht-Admins enthält der State ausschließlich eine Feld-Whitelist veröffentlichter Prüfungsmetadaten, die für die Academy-Auswahl erforderlich sind (z. B. ID, Titel, zugewiesener Lehrgang, Prüfungsstufe und Verfügbarkeit).
- Fragen, Antwortoptionen, Lösungsschlüssel, Erklärungen, Rubriken, Entwürfe, manuelle Freischaltungen, UID-Listen und Zusatzversuchsdaten werden niemals über den allgemeinen State ausgegeben.
- Auch Admins erhalten unredigierte Masterdaten ausschließlich über die Admin-Exam-API, nicht durch eine pauschale Kopie des gesamten Masterobjekts im Portal-State.
- Client-Projektionen verwenden explizite Feld-Whitelists. `{ ...exam }` oder vergleichbare ungefilterte Objektkopien sind für Exam-Daten unzulässig.
- Fragen werden erst über den authentifizierten Start-/Active-Ablauf ausgeliefert. Die ausgelieferte Fragenprojektion ist je Fragetyp definiert und enthält keine Lösungsschlüssel.
- Historie, Ergebnisberichte und Korrektur-Endpunkte geben nur die Daten frei, die der jeweiligen Rolle und dem konkreten Versuch zustehen.

### 19.4 Autosave, Änderungssignale und Datenzugriff

Autosave darf keine allgemeine Portal-Synchronisierung auslösen.

- Ein Autosave schreibt ausschließlich den betreffenden Versuch über den `ExamRepository`.
- Autosave aktualisiert weder `sync/state` noch `meta/order` des allgemeinen Portal-Stores.
- Andere verbundene Browser erhalten wegen eines Autosaves keinen Anlass, den vollständigen Portal-State erneut zu laden.
- Versuchshistorie und aktive Versuche werden über gezielte Repository-Abfragen gelesen. Der vollständige Bestand an Versuchen und Snapshots darf nicht bei jedem allgemeinen API-Request in den Portal-State geklont werden.
- Die bestehende Autosave-Frequenz aus §11 (regelmäßig etwa 20 Sekunden, zusätzlich debounced bei Eingaben und sofort bei Fragenwechsel) bleibt der Ausgangspunkt. Schreibvorgänge müssen pro Versuch serialisiert und revisionsgeprüft sein; redundante identische Payloads dürfen keinen unnötigen Schreibvorgang auslösen.
- Die Anwendung darf keine Firebase-Kontingente oder Kostenfreiheit aus einer angenommenen Tagesquote ableiten. Vor einem produktiven Lastanstieg sind die tatsächlichen Projektlimits und Nutzungsdaten in der Firebase-Konsole zu prüfen. Es werden keine zusätzlichen kostenpflichtigen Dienste vorausgesetzt.

### 19.5 Fortschrittsaggregat, Voraussetzungen und Migration

Die Versuchshistorie im `ExamRepository` ist die maßgebliche Quelle für Prüfungsresultate. `UserProgressDoc` ist nur eine daraus abgeleitete Kompatibilitäts-/Übersichtsprojektion und darf keine Versuchshistorie ersetzen.

Für neue Prüfungen wird das Aggregat eindeutig nach Nutzer, Prüfung und Lehrgangskontext geführt. Der Schlüssel muss mindestens `userId`, `examId` und `attemptCourseCode` unterscheiden; Ergebnisse aus zwei Lehrgängen dürfen nicht zusammenfallen.

Festgelegte Aggregatregeln:
- `last`: Ergebnis des zuletzt abgeschlossenen Versuchs dieses Nutzers für diese Prüfung und diesen Lehrgang.
- `best`: bestes endgültiges Ergebnis unter den nicht invalidierten, abgeschlossenen Versuchen.
- `pending_review`: wird als eigener Status geführt; der Versuch zählt nicht als bestanden oder endgültig nicht bestanden. Ein vorläufiges automatisches Ergebnis bleibt separat.
- `invalidated_by_admin`: bleibt in der Historie sichtbar, wird aber weder für `best` noch für das aktuelle Bestehen oder die normale Versuchszählung berücksichtigt.
- `in_progress`: wird nicht als abgeschlossenes Ergebnis in `best` oder `last` aufgenommen.
- Das Aggregat wird serverseitig aus den Versuchen aktualisiert; der Client kann es nicht setzen.

Voraussetzungen werden primär aus den neuen, nicht invalidierten Versuchen ermittelt. Für historische Ergebnisse gilt:
- Ein Legacy-Progress-Datensatz wird nicht künstlich als vollständiger neuer Versuch mit erfundenen Antworten oder Zeitstempeln migriert.
- Historische Progress-Datensätze bleiben als Legacy-Nachweise erhalten und werden ausdrücklich als solche gekennzeichnet.
- Ein historisches `completed` kann eine reine Abschlussvoraussetzung erfüllen, sofern der Datensatz einen nachvollziehbaren Abschluss ausweist.
- Ein historisches `passed` erfüllt eine Bestehensvoraussetzung nur nach expliziter Admin-Verifikation.
- Ein vorhandener Legacy-`attempts`-Zähler wird bei der Migration als verbrauchtes historisches Kontingent berücksichtigt, soweit er eine positive sichere Ganzzahl ist. Die Migration darf den Zähler nicht stillschweigend auf null setzen. Nicht rekonstruierbare Versuchseinzelheiten werden als Legacy-Lücke dokumentiert, nicht erfunden.
- Bestehende aktive Prüfungen ohne Statusfeld werden bei erfolgreicher Migration als `published` übernommen; Entwürfe werden nur dann als `draft` behandelt, wenn ihr Entwurfsstatus tatsächlich belegt ist.

### 19.6 Vollständige Antwortschemas, Bewertung und Veröffentlichungsvalidierung

Die Antworten werden als typisierte, serverseitig validierte Werte gespeichert:

| Fragetyp | Antwortformat | Prüfung |
|---|---|---|
| `single_choice` | einzelne Options-ID (`string`) oder `null` | ID muss zu den Optionen dieser Frage gehören |
| `multiple_choice` | Array eindeutiger Options-IDs (`string[]`) | Jede ID muss gültig und darf nur einmal enthalten sein |
| `true_false` | `boolean` oder `null` | Nur echte Boolean-Werte akzeptieren |
| `matching` | Zuordnungsliste aus `{ pairId, targetId }` | Pair- und Target-IDs müssen existieren; jede Pair-ID und Target-ID höchstens einmal |
| `free_text` | `string` | Länge und zulässiger Zeichensatz werden serverseitig begrenzt; bestehendes Maximum 4.000 Zeichen |

Optionen und Zuordnungsziele erhalten stabile, innerhalb der jeweiligen Frage eindeutige IDs. Numerische Array-Indizes sind kein dauerhaftes Antwortformat, weil sich die Reihenfolge in einer späteren Version ändern kann.

Bewertungsregeln:
- Fragenpunkte müssen endliche Zahlen größer als 0 sein.
- Punkte werden intern mit ausreichender Dezimalpräzision beziehungsweise als ganzzahlige kleinste Einheit gespeichert; Rundung erfolgt nicht vor der Bestehensentscheidung.
- Der Vergleich mit `passingScore` erfolgt anhand des ungerundeten Gesamtprozentsatzes. Erst die Anzeige wird auf eine ganze Prozentzahl gerundet.
- Unbeantwortete Fragen erhalten null Punkte und gelten nicht als richtig.
- Ungültige, doppelte oder fremde Antwort-IDs erzeugen keine Zusatzpunkte; strukturell manipulierte Payloads können serverseitig abgelehnt werden.
- Die Multiple-Choice- und Matching-Teilpunktformeln aus §9 bleiben unverändert. Das Ergebnis jeder Frage wird auf den Bereich von 0 bis zu ihren maximalen Punkten begrenzt.
- `N = 0` ist für Multiple Choice oder Matching ungültig und muss bereits bei der Veröffentlichungsvalidierung verhindert werden.

Vor Veröffentlichung muss der Server mindestens Folgendes validieren:
- Prüfung enthält mindestens eine Frage.
- Jede Frage besitzt eine eindeutige, nicht leere ID und einen unterstützten Typ.
- Jede Frage hat eine endliche Punktzahl größer als 0.
- Single Choice besitzt mindestens zwei gültige Optionen und genau eine gültige richtige Option.
- Multiple Choice besitzt mindestens zwei Optionen und mindestens eine richtige Option.
- True/False besitzt einen echten Boolean-Lösungsschlüssel.
- Matching besitzt mindestens zwei Paare; Pair-IDs und Target-IDs sind eindeutig und jede richtige Zuordnung ist vollständig.
- Freitext besitzt eine gültige Rubrik oder eine ausdrücklich definierte manuelle Bewertungsanweisung.
- Bild-URLs sind gültige HTTPS-URLs.
- Zeitlimit, Bestehensgrenze, Versuchslimit, Voraussetzungen und Lehrgangszuweisungen sind gültig.
- Die vollständige Snapshot-Größe wird nach §5 geprüft.

### 19.7 Phase-1-Grenze und Implementierungsreihenfolge

Phase 1 bleibt bewusst unabhängig von HTTP-Routen, Firestore und UI. Sie implementiert reine Typen, Validatoren, Projektionen und Bewertungsfunktionen mit automatisierten Tests.

Reihenfolge:
1. Typisierte Antwort- und Fragemodelle sowie zentrale Konstanten.
2. Schema- und Veröffentlichungsvalidator.
3. Sichere öffentliche Fragenprojektion einschließlich Matching-Shuffle-Projektion.
4. Einzel- und Gesamtbewertung einschließlich Teilpunkten, Präzision und Bestehensgrenze.
5. Status-/Aggregatfunktionen, Versuchszählung und Voraussetzungen.
6. Legacy-Mapping und Tests für historische Daten.

Phase 2 implementiert den in §19.1 beschriebenen ExamRepository und die Migration. Die alten Schreibwege aus §19.2 müssen vor Aktivierung der neuen Prüfungsdurchführung abgesichert werden. Phase 3 bis 5 bauen erst auf dem Repository und den abgesicherten API-Grenzen auf.

### 19.8 Review-Fazit und Freigabestatus

Die v3.7-Spezifikation berücksichtigt die sechs kritischen Review-Punkte K1–K6. Das ist eine konzeptionelle Entscheidung, kein Nachweis, dass der bestehende Code diese Architektur bereits erfüllt.

Vor der Implementierung ist noch eine gezielte Prüfung der v3.7-Klarstellungen möglich. Phase 1 kann nach ausdrücklicher Freigabe des Projektinhabers beginnen. Phase 2 und die folgenden Integrationsphasen dürfen erst beginnen, wenn die neue ExamRepository-Grenze, die Abschaltung/Begrenzung der alten Schreibwege und die sichere State-Projektion umgesetzt und getestet werden.

