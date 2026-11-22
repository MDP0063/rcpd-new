# RCPD – Aktueller Planungs- und Redesignstand

**Stand:** 22.11.2026 – PR #332 (zweistufige Revisionsanfragen), PR #334 (Einzel-Wiederqualifizierung), PR #336 (verknüpfte Lehrgänge), PR #337 (Backup-V2-Integrität), PR #338 (Gruppenanordnung), PR #340 (Wiederqualifizierungs-Auditkorrekturen), PR #343 (Teilnahme-Lebenszyklus), PR #344 (Lebenszyklus-Historienaudit), PR #345 (Fortschrittsdokumentation), PR #348 (Regressionstests für Wiederqualifizierungs-Berechtigungen) und PR #349 (lesbare Prüfungs-Korrekturhistorie) sind gemergt. Der systematische Academy-Funktions-/Fehleraudit und das vollständige Usability-Redesign laufen weiter. Die gemeinsame Browser-/Responsive-/Keyboard-/Screenreader-/Live-Firestore-Abnahme bleibt ausdrücklich offen. PDF-Infrastruktur bleibt zurückgestellt.

**Letzter verifizierter Implementierungsstand auf `main`:** `4bd0767b9747367068edddc0f70946354801ec75` (PR #349). Die fünf Academy-Bereiche und die zuvor integrierten Kurs-/Lehrgangs-, Bibliotheks-, Notiz-, Prüfungs- und Examiner-Funktionen bleiben Grundlage. Der zweistufige Revisionsworkflow ergänzt diese um Antrag durch aktuell kursberechtigte Prüfer, Entscheidung ausschließlich durch aktive Admins/Colonels, Wiederaufnahme desselben Versuchs in der Prüferliste sowie nachvollziehbare Historie und erneute Ergebnisfreigabe.

**Aktueller Umsetzungsstand:** PR #332 wurde auf aktuellem `main` aufgebaut, unabhängig auf Session-/Rollenprüfungen, Datenminimierung, transaktionale Zustandsübergänge, Ergebnis-Snapshots und Benachrichtigungszustellung geprüft und nach erfolgreicher CI gemergt. TypeScript/Lint, Produktionsbuild, Tests und PR-Vorlagenprüfung waren auf dem finalen PR-Head erfolgreich; auch der Post-Merge-Build auf `main` ist erfolgreich. Es wurde kein Produktionsdeployment behauptet. PR #277 wurde nicht gemergt und geschlossen; seine Nachfolgeimplementierung ist PR #295, der bereits in `main` integriert ist. Die zeitabhängigen Reader-/Autosave-Browserfälle bleiben Teil der späteren Gesamtabnahme.

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

## 0.3 Wiederqualifizierung und Teilnahme-Lebenszyklus – implementiert, Abnahme offen

- PR #334 wurde am 21.11.2026 in `main` gemergt. PR #336 ergänzt die Lehrgangsverknüpfung: Eine offene Wiederqualifizierung nimmt den betroffenen Pflichtkurs aus der Abschlusszählung aller Lehrgänge heraus, die denselben Kurs voraussetzen. Nach dem neuen Abschluss wird die Qualifikation wieder als erfüllt gewertet. Alle betroffenen Lehrgänge verweisen auf denselben zentralen Vorgang; die ursprüngliche Kursteilnahme bleibt unverändert.
- PR #336 behebt zusätzlich einen API-Vertragsfehler der Anordnung: Die Zielperson wird ausdrücklich über `participantUid` übermittelt, damit die globale Sitzungs-Identitätsprüfung weiterhin fremde `userUid`-Angaben blockiert.
- Post-Merge-Workflow für TypeScript/Lint, Produktionsbuild und 470/470 Tests war erfolgreich. Der optionale Render-Deploy-Hook wurde nicht verwendet; das Repository meldet Auto-Deploy über den `main`-Branch als aktiv. Ein unabhängiger Live-Health-/Browsercheck steht noch aus.
- Neue zentrale Vorgänge werden je Teilnehmer und Kurs/Qualifikation gespeichert und mit einer separaten neuen Kursteilnahme verknüpft. Jeder Vorgang referenziert zusätzlich exakt den ursprünglichen Abschluss, der die Wiederqualifizierung ausgelöst hat. Reguläre historische Teilnahmen und ihre Nachweise bleiben erhalten.
- Die Kursverwaltung kann berechtigten Verantwortlichen eine frühere Abschluss-Teilnahme auswählen lassen, eine Begründung verlangen und optional eine Frist setzen. Teilnehmer sehen eine verständliche Aufgabe mit Grund und Frist in der Kursübersicht; der Vorgang bleibt innerhalb der bestehenden Academy-Navigation.
- Die API prüft Kurszuständigkeit und früheren Abschluss serverseitig. Die Repository-Transaktion pinnt eine konkrete veröffentlichte Kursversion, verhindert offene Doppelanforderungen und verwendet einen deterministischen Koordinationsdatensatz gegen konkurrierende Anordnungen.
- Erforderliche Nachweise laufen über den vorhandenen Kursfortschritt. Bei Kursabschluss wird der zentrale Vorgang geschlossen; bei prüfungsabhängigem Abschluss wird der Status anhand des offiziell freigegebenen Prüfungsergebnisses beim Abruf synchronisiert.
- JSON-Speicherschema v8 ergänzt die neue Sammlung rückwärtskompatibel. Backup-/Restore- und Anonymisierungswege werden berücksichtigt.
- Repository-Tests decken getrennte Historie, exakte Verknüpfung zum früheren Abschluss, Folgeanordnung, neue Prüfungsnachweise, Wiederöffnung nach Korrektur, Anonymisierung und konkurrierende Anordnungen ab. Lint, Produktionsbuild und 470/470 Tests waren auf dem finalen PR-Stand erfolgreich. Eine unabhängige Live-/Browserabnahme ist nicht erfolgt.
- PR #338 integriert die Gruppenanordnung: Suche nach Name/Dienstnummer, Auswahl mehrerer Personen, gemeinsame Begründung/Frist, aber pro Person ein eigener Vorgang und Fortschritt. Die API prüft jede Auswahl erneut, überspringt nicht mehr berechtigte oder bereits offene Vorgänge und liefert eine getrennte Ergebnisübersicht. Maximale Gruppengröße: 100.
- PR #338 ist in `main` integriert. CI auf dem finalen PR-Stand und nach dem Merge erfolgreich: Lint, TypeScript-/Produktionsbuild und 472/472 Tests; PR-Vorlagenprüfung sowie Main-Workflow einschließlich Render-Deploy-Hook ebenfalls erfolgreich. Manuelle Browser-/Responsive-/Keyboard-/Screenreader-Abnahme steht noch aus.
- Nachprüfung des Wiederqualifizierungsablaufs: Ein berechtigter Kursverantwortlicher mit zugewiesenem Kurscode durfte die von ihm angeordnete Wiederqualifizierung zunächst nicht über die Teilnehmerdetail-API öffnen, weil die Detailroute nur Kurseigentümer/Admins als Manager erkannte. Die Berechtigungsprüfung wurde mit PR #340 für Wiederqualifizierungen an dieselbe bestehende Kurszuständigkeit gekoppelt; unbeteiligte scoped Verantwortliche bleiben ausgeschlossen. Ein HTTP-Regressionstest prüft beides.
- Zusätzlich wurde ein asynchroner UI-Rennfall abgesichert: Ergebnisse einer noch laufenden Gruppenanordnung dürfen nach einem Kurswechsel nicht die inzwischen geöffnete Kursansicht überschreiben. PR #340 bindet den Request an Kurs-ID und Detailgeneration und übernimmt spätere Kandidaten-/Ergebnisantworten nur bei weiterhin passendem Kontext.
- Folgeaudit: Während die Gruppenanordnung nach dem Speichern die Academy-Daten neu lädt, war die Schaltfläche bereits wieder freigegeben, obwohl die Teilnehmerauswahl noch bestand. Dadurch konnte ein zweiter Klick eine unnötige parallele Anordnung auslösen. Der aktuelle Fix hält den Speichervorgang bis zum Ende der Aktualisierung gesperrt, leert die Auswahl unmittelbar nach erfolgreicher Speicherung und schützt zusätzlich mit einer synchronen Ref-Sperre gegen sehr schnelle Doppelklicks. CI und manuelle Browserprüfung stehen noch aus.
- Die Ergebnisübersicht unterscheidet jetzt fehlgeschlagene Anordnungen von Warnhinweisen nach bereits erfolgreich gespeicherten Aufgaben. Ein fehlgeschlagener zusätzlicher Audit-Eintrag darf nicht gleichzeitig dieselbe Person als erfolgreich angeordnet und als fehlgeschlagen zählen. PR #340 trennt solche Warnungen von nicht angeordneten Personen; ein HTTP-Integrationstest deckt eine gemischte Gruppe aus bereits offener und neu berechtigter Person ab.
- PR #343 implementiert den Teilnahme-Lebenszyklus: Teilnehmer können dieselbe Teilnahme freiwillig beenden und fortsetzen; berechtigte Kursverantwortliche können sie mit Begründung beenden und wieder freigeben. Die Ereignisse bleiben append-only erhalten, Kursversion, bisherige Nachweise und Fortschritt werden nicht zurückgesetzt. Die Teilnehmeransicht blendet interne Begründungen und Bearbeiterkennungen aus; die eingeklappte Verwaltungsansicht zeigt berechtigten Verantwortlichen Teilnehmer, Bearbeiter, Zeitpunkte und Gründe. Der Bereich funktioniert auch dann, wenn der Kursverantwortliche selbst keine Teilnahme begonnen hat. Serverprüfungen, Datenschutzansichten, Legacy-Kompatibilität und Anonymisierung sind getestet.
- Zusätzliche Integrität: Ein freigegebener Prüfungserfolg muss nach der Anordnung bzw. nach der letzten Wiederöffnung liegen. Wird ein Prüfungsnachweis ungültig oder ein neuer Abschluss korrigiert, wird derselbe Vorgang wieder geöffnet; der nächste Nachweis muss danach liegen. Benachrichtigungen verwenden stabile IDs und werden beim Laden der Teilnehmeraufgaben erneut versucht. Abgeschlossene Wiederqualifizierungen bleiben in der Academy-Historie separat sichtbar.
- CI-Abnahme PR #334: `bun run lint`, `bun run build` und `bun run test` erfolgreich; 470/470 Tests bestanden. CI-Abnahme PR #338: dieselben Prüfungen erfolgreich; 472/472 Tests bestanden. Die manuelle Browser-/Responsive-/Keyboard-/Screenreader-/Live-Firestore-Abnahme bleibt offen.
- PR #340 ist in `main` integriert. CI auf dem finalen PR-Head erfolgreich: `bun run lint`, `bun run build` und `bun run test`; 472/472 Tests bestanden. Die PR-Vorlagenprüfung war erfolgreich. Der Post-Merge-Workflow läuft/steht noch aus; manuelle Browser-/Responsive-/Keyboard-/Screenreader-/Live-Firestore-Abnahme bleibt offen.
- PR #343 ist in `main` integriert. CI auf dem finalen PR-Head erfolgreich: Lint, TypeScript-/Produktionsbuild und 473/473 Tests; PR-Vorlagenprüfung erfolgreich. Auch der Post-Merge-Workflow auf `main` war erfolgreich und der optionale Render-Deploy-Hook wurde ausgelöst. Das bestätigt noch keinen Live-Health-/Browsercheck; die manuelle Browser-/Responsive-/Keyboard-/Screenreader-/Live-Firestore-Abnahme bleibt offen.
- PR #344 ergänzt den Folgeaudit: abgeschlossene Teilnahmen behalten ihren Beendigungs-/Wiederaufnahmeverlauf in einem eingeklappten Verwaltungsbereich. Die Domain-Validierung prüft zulässige Ereignisfolgen, Zeitreihenfolge, Akteursidentität, passende Enddaten und fehlerhafte Eventobjekte; Legacy-Wiederaufnahme ohne Eventhistorie bleibt möglich, wenn der alte Beendigungsstand valide ist. Freiwillige Bestätigungen werden vor und nach dem asynchronen Dialog an dieselbe Teilnahme/Kursansicht gebunden.
- CI PR #344: Lint, TypeScript-/Produktionsbuild und 474/474 Tests erfolgreich; PR-Vorlagenprüfung erfolgreich. Post-Merge-Workflow auf `main` läuft/steht noch aus. Es gibt weiterhin keinen behaupteten Live-Health-/Browsercheck; die gemeinsame Browser-/Responsive-/Keyboard-/Screenreader-/Live-Firestore-Abnahme bleibt offen.

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

1. Wiederqualifizierung einschließlich Gruppenanordnung (PR #334, #336, #338), Berechtigungs-/UI-Nachkorrekturen (#340) und Teilnahme-Lebenszyklus samt Historienvalidierung (#343, #344) ist in `main` integriert. Offen bleiben eine verlässlich retry-fähige Benachrichtigungszustellung, Kurs-/Lehrgangsarchivierung und die gemeinsame manuelle Browser-/Responsive-/Keyboard-/Screenreader-/Live-Firestore-Abnahme.
2. Die beschlossene persönliche Empfehlungsfunktion fehlt noch vollständig im aktuellen Code. Sie muss nach Abschnitt 8 der Academy-Spezifikation umgesetzt werden: manuelle und nachvollziehbar regelbasierte Empfehlungen, Deduplizierung, Priorisierung, Lebenszyklus, Ausblenden und Historie.
3. Die Kursmeldungslogik aus Abschnitt 9 ist noch nicht implementiert. Die Option-C-Lesestatusregeln sind beschlossen; Quelle, Erstellung/Berechtigung und Lebenszyklus der Meldungen müssen vor einer neuen Datenmodellentscheidung geklärt werden.
4. Den restlichen Funktions-/Fehleraudit für Kurse/Lehrgänge, Bibliothek/Materialverwaltung, private Notizen, Prüfungen und Examiner am aktuellen `main` abschließen. Bereits umgesetzte Funktionen nicht erneut bauen; nur nachgewiesene Lücken oder Fehler korrigieren.
5. Die visuelle Academy-Gestaltung und die noch offenen Responsive-/Accessibility-Details anhand der verbindlichen Redesign-Spezifikation vervollständigen.
6. Nach Abschluss aller Implementierungen die gemeinsame manuelle Browser-/Responsive-/Keyboard-/Screenreader-/Live-Firestore-Abnahme durchführen. Bis dahin werden diese Prüfungen nicht als erledigt ausgegeben.
7. PDF-Infrastruktur sowie die ausdrücklich zurückgestellte kontextbezogene Meldefunktion bleiben außerhalb dieser Ausbaustufe.

## 6. Noch offene nächste Schritte

1. Systematischen Audit der bereits implementierten Academy-Funktionen fortsetzen. Danach die Empfehlungsfunktion vorbereiten: Platzierung, automatische Auslöser/Abschlussnachweise und Ersteller-/Empfängerrechte müssen vor dem Datenmodell anhand der bestehenden IA, tatsächlichen Datenquellen und Rollen geklärt werden.
2. Kursmeldungen: zuerst Quelle und Erstellungs-/Rücknahmeregeln festlegen; danach den bereits beschlossenen Einzel-Lesestatus und die dezente Kennzeichnung an Kurs, Prüfungsergebnis und Material umsetzen.
3. Kurs-/Lehrgangs-, Bibliotheks-/Notiz- und Prüfungsabläufe weiter gegen die Detail-Spezifikation prüfen und nur verifizierte Fehler beheben.
4. Verbleibende UI-/Responsive-/Accessibility-Details im Rahmen der bestehenden Designfreigabe umsetzen.
5. Nach Implementierungsabschluss die vollständige manuelle Academy-Abnahme mit realen Rollen und Firestore-Daten vorbereiten.

Vor jeder Umsetzung sind passende Detail-Spezifikation, Entscheidungsregister, bestehende Berechtigungen, technische Architektur und UX-/Accessibility-Anforderungen abzugleichen. Bereits entschiedene Fragen werden nicht erneut gestellt oder stillschweigend geändert.

Die Empfehlungs- und Kursmeldungsfunktionen bleiben als explizite Restpunkte sichtbar, bis ihre noch fehlenden fachlichen Angaben geklärt und anschließend vollständig umgesetzt sind.

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

1. Die vollständige Academy-Spezifikation gegen den aktuellen Code abgleichen und echte Funktionslücken von bereits erledigten oder nur manuell zu prüfenden Punkten trennen.
2. Beschlossene, noch fehlende Funktionen in Kursen/Lehrgängen, Lernbibliothek/Materialverwaltung, privaten Notizen und Prüfungs-/Examiner-Abläufen gezielt umsetzen; keine unbeschlossenen Autorisierungs- oder Datenmodellentscheidungen vorwegnehmen.
3. Während der Umsetzung Regressionen, Rollen-/Datenschutzgrenzen und Datenintegrität mit gezielten Tests absichern.
4. Erst nach Abschluss der Implementierung die gemeinsame manuelle Browser-/Responsive-/Keyboard-/Screenreader-/Live-Firestore-Abnahme vorbereiten und durchführen.


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


### PR #237 – Katalogoptionen nach inaktiven Metadaten aktualisieren (12.11.2026)

- Wenn eine andere berechtigte Person die ausgewählte Kategorie oder den Dokumenttyp während der Bearbeitung archiviert, lehnt die serverseitige Draft-Validierung das Speichern mit `ACADEMY_MATERIAL_CATEGORY_NOT_ACTIVE` bzw. `ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_ACTIVE` ab.
- Die Materialverwaltung lädt bei diesen beiden Fehlercodes die Katalogdaten erneut, ohne Formulareingaben oder Entwurf zu verwerfen.
- PR #237 wurde am 12.11.2026 gemergt (Commit `d39bee057de5ea1e4e629a6be8406fc98ddbb23d`). TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen.

### PR #239 – Entfernte Kategorie-/Dokumenttypreferenzen behandeln (12.11.2026)

- Die Repository-Validierung unterscheidet neben NOT_ACTIVE auch `ACADEMY_MATERIAL_CATEGORY_NOT_FOUND` und `ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_FOUND`, etwa wenn ein noch nicht gespeichertes Material eine zwischenzeitlich gelöschte Taxonomieoption auswählt.
- Die Materialverwaltung zeigt für beide Fälle jetzt verständliche Meldungen und lädt die aktuellen Katalogdaten erneut. Während des Refreshs bleiben Formularaktionen gesperrt; vorhandene Eingaben bleiben erhalten.
- PR #239 wurde am 12.11.2026 gemergt (Commit `7f3fb3f1a30d0c8de7e6cf69ba16e987b10444a9`). TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Kein manueller Browser-/Live-Firestore-Test.

### Nächster Auditfokus

- Materialverwaltung: Veröffentlichungs-/Archivierungs-Revisionskonflikte, Versionen-Historie und Kursreferenzen in realen Abläufen.
- Private Notizen: Autosave, Konfliktauflösung, Reload, Textanker, Mehrfachquellen und Quellenstatus.
- Danach Kurse/Lehrgänge, Academy-Übersicht und Prüfungen gegen die verbindliche Spezifikation und tatsächliche Datenflüsse prüfen.
- Gemeinsame manuelle Browser-/Screenreader-/Live-Firestore-Abnahme bleibt ein separater Qualitäts-Gate; CI-Erfolg wird nicht als Produktionsabnahme ausgegeben.


### PR #241 – Fortschrittsdokumentation nach PR #239 (12.11.2026)

- Der Planungsindex wurde nach den Metadaten-Konfliktkorrekturen #237/#239 aktualisiert. PR #241 wurde am 12.11.2026 gemergt (Commit `30de33adc123edbe991e82bc65ffc8ce0605b316`). Nur `docs/planning/README.md` und `docs/planning/PROGRESS.md` wurden geändert.

### PR #243 – Teilfehler im Bibliothekskatalog und sichere Materialwechsel (12.11.2026)

- Wenn der Abruf versionierter Materialien fehlschlug, konnte die Lernbibliothek eine unvollständige Trefferzahl oder eine erfolgreiche Suche ohne Treffer darstellen. Jetzt wird die Trefferzahl als unvollständig gekennzeichnet; die leere Suchansicht wird bei Lade-/Katalogfehlern unterdrückt. Verfügbare Legacy-Materialien bleiben nutzbar; die Fehlerursache und Retry-Aktion bleiben auch in der Reader-Navigation sichtbar.
- Beim Wechsel zwischen versionierten Materialien wurde der vorherige Detailinhalt erst im nachgelagerten `useEffect` entfernt. Der Reader leert den Detailzustand jetzt synchron beim Wechsel. Zusätzlich sind geladene Inhalte an Material-ID sowie aktuelle Benutzer-/Rollenkennung gebunden; verspätete Antworten älterer Abrufgenerationen werden verworfen.
- Die Änderung verhindert, dass die vorherige Materialfassung oder deren private Notizen während eines Material-/Rollenwechsels im Detailbereich weitergerendert werden. Serverseitige Zugriffskontrollen und Datenmodell bleiben unverändert.
- PR #243 wurde am 12.11.2026 gemergt (Commit `5e146dafa4fc389b2ac46c607cda61871e798548`). TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Kein manueller Browser-/Screenreader-/Live-Firestore-Test.

### Nächster Auditfokus

- Materialverwaltung: Veröffentlichungs-/Archivierungs-Revisionskonflikte, Versionshistorie und Kursreferenzen.
- Reader-/Notiz-End-to-End-Verhalten: Autosave, Konfliktauflösung, Reload, Textanker, Mehrfachquellen und Quellenstatus.
- Danach Kurse/Lehrgänge, Academy-Übersicht und Prüfungen gegen die verbindliche Spezifikation und tatsächliche Datenflüsse prüfen.
- Gemeinsame manuelle Browser-/Screenreader-/Live-Firestore-Abnahme bleibt ein separater Qualitäts-Gate; CI-Erfolg wird nicht als Produktionsabnahme ausgegeben.


## 12.11.2026 – Academy-Autonomie, drei Fehlerkorrekturen und Unterseiten-Redesign

### Arbeits- und Merge-Berechtigung

- Der Projektinhaber hat ChatGPT am 12.11.2026 ausdrücklich zur eigenständigen Arbeit innerhalb der gesamten Academy autorisiert: Recherche, Bestandsaufnahme, UX-/Designüberarbeitung, Implementierung, Tests, Dokumentation, PR-Erstellung, Review und Merge.
- Die frühere Freigabe nur für das Academy-Redesign wurde damit erweitert. Der genaue Geltungsbereich (Academy-Komponenten, Academy-spezifische Libraries/Typen, API/Domain/Repository/Tests und Academy-Dokumentation), Ausschlüsse (portalweite/andere Module, direkte `main`-Commits, Force-Push, kostenpflichtige Dienste) und Merge-Gates sind in `DECISIONS.md`, `AGENTS.md` und `CONTRIBUTOR_ROLES.md` verbindlich dokumentiert.
- Academy-PRs dürfen ohne erneute Einzelbestätigung gemergt werden, wenn Diff/Scope, Sicherheit, Regressionen und erforderliche CI-Prüfungen bestanden sind. Kritische Auth-/Berechtigungs-/Datenmigrationsthemen und Auswirkungen außerhalb der Academy benötigen unabhängiges Review.

### Fehlerkorrekturen in main

| PR | Ergebnis | Merge-Commit |
|---|---|---|
| #246 | Taxonomielisten nach Bearbeitungskonflikten aktualisieren | `6552dc0f5ac527c5da87f900b6ef0b720e694969` |
| #247 | Veröffentlichte Materialversion sofort in der Versionshistorie anzeigen | `007ce82f99f55d7e9a3be67a056d24c5afa13d3e` |
| #248 | Ausstehenden Autosave beim bestätigten Verwerfen abbrechen | `39345ec1179ec41a2d03308aa102572783825150` |

- Für alle drei PRs waren GitHub Actions TypeScript-/Produktionsbuild-/Testjobs und PR-Vorlagenprüfungen erfolgreich. Die optionalen Render-Deploy-Hooks wurden übersprungen. Keine manuelle Browser-/Screenreader-/Live-Firestore-Abnahme und kein verifiziertes Render-Deployment durch diese Läufe.

### Neues Unterseiten-Redesign-Audit

- Der aktuelle Code der fünf Hauptbereiche und der tieferen Verwaltungs-/Reader-/Prüfungsansichten wurde erneut gegen die bestehende Spezifikation geprüft.
- Erste dokumentierte Ansatzpunkte: konsistente Seitenköpfe und Rückkehrnavigation; klare responsive Darstellung der fünf Hauptbereiche; weniger konkurrierende sekundäre Navigation; klare Trennung von Teilnehmer- und Verwaltungsaufgaben; einheitliche Katalog-/Detail-/Editor-Muster; lesefokussierter Reader; ruhiger persönlicher Notizbereich; fokussierte Prüfungs- und Examiner-Arbeitsflächen.
- Die fünf Academy-Kacheln, ihre Illustrationen/Farben, die horizontale Hauptnavigation, bestehende Funktionen und alle fachlichen Status-/Berechtigungs-/Datenschutzregeln bleiben erhalten.
- Recherchegrundlage und vollständige Seitenkonzepte stehen in `ACADEMY-SUBPAGE-REDESIGN.md`; die dortigen Designvorschläge sind keine neuen fachlichen Funktionen.
- Nächster Schritt: die Seitenkonzepte mit den tatsächlichen Komponenten/Interaktionen abgleichen, ein konsistentes wiederverwendbares Academy-Seitenmuster entwickeln und die Unterseiten schrittweise auf eigenen Branches umsetzen. Browser-/Screenreader-/Live-Firestore-Abnahme bleibt ein separates Qualitäts-Gate.

### PR #250 – Meine Notizen als fokussierter Arbeitsbereich (12.11.2026)

- PR #250 auf Branch `redesign/academy-notes-focused-editor` gliedert den Notizbereich in eine eigenständige Übersicht und einen fokussierten Editor statt Liste und Formular gleichzeitig anzuzeigen.
- Quellenverknüpfungen und deren Status bleiben während der Bearbeitung sichtbar. Neue Notizen/Lesezeichen entstehen weiterhin ausschließlich im Reader; keine neue Erstellungsfunktion.
- Speichern ist visuell die Primäraktion, Verwerfen sekundär und Löschen destruktiv gekennzeichnet. Leerbestand und Suchtrefferlosigkeit erhalten getrennte Texte.
- Ungespeicherte Änderungen und laufende Speicheraktionen lösen beim Verlassen über Academy-Hauptnavigation, Kachel-Rückweg oder Examiner-Deep-Link eine Bestätigung aus. Während eines laufenden Speichervorgangs sind Zurück/Verwerfen gesperrt.
- Keine Änderung an API, Datenmodell, Revision, Owner-Isolation, Berechtigungen oder Quellenbindung.
- PR #250 ist offen; TypeScript-/Produktionsbuild-/Test- und PR-Vorlagenprüfungen stehen für den aktuellen Head noch aus. Manuelle Browser-/Screenreader-Abnahme bleibt offen.

### PR #250 – Meine Notizen als fokussierter Arbeitsbereich (12.11.2026)

- PR #250 wurde am 12.11.2026 gemergt (Merge-Commit `1a4bb48841c017b7a2f8cc935660754c27523abc`).
- Notizenübersicht und Editor sind getrennte Ansichten; Quellenverknüpfungen bleiben im Editor sichtbar. Speichern, Verwerfen und Löschen haben eine klare visuelle Hierarchie.
- Ungespeicherte Änderungen und laufende Speicheraktionen schützen den Wechsel über Hauptnavigation, Kachel-Rückweg und Examiner-Deep-Link. Unveränderte Notizen lösen keinen unnötigen PUT aus.
- TypeScript, Produktionsbuild, vollständige Tests und PR-Vorlagenprüfung waren erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen. Manuelle Browser-/Tastatur-/Screenreader-/Dark-Mode-Abnahme bleibt offen.

### PR #251 – Lehrgang-Terminologie und Kursbereich (12.11.2026)

- Die deutschsprachige UI verwendet für die übergeordnete Ausbildungseinheit jetzt durchgehend „Lehrgang“ statt „Programm“ – im Teilnehmerkatalog, in Kurs-/Lehrgangsdetails, Fortschritt, Teilnahme, Verwaltung, Editoren, Fehlertexten und Bestätigungen.
- Die technische Program-Entität, API, Datenfelder, Typen und internen Variablennamen bleiben unverändert. Keine Datenmigration oder Änderung der Kurs-/Lehrgangslogik.
- PR #251 wurde am 12.11.2026 gemergt (Commit `611f701df54ecb302a4fcf84005544beee4485a1`). PR-Vorlagenprüfung und TypeScript-/Produktionsbuild-/Testworkflow waren erfolgreich (455/455 Tests, 0 Fehler); optionaler Render-Deploy-Hook übersprungen. Manuelle Browser-/Screenreader-Abnahme steht aus.


### PR #251 – Lehrgang-Terminologie und Übersichtstext (12.11.2026)

- PR #251 vereinheitlicht alle sichtbaren deutschen Bezeichnungen in Teilnehmer- und Verwaltungsoberflächen: „Lehrgang“ statt „Programm“, „Kurs“ für einzelne Lerneinheiten.
- Zusätzlich wurde die Beschreibung der Academy-Übersicht korrigiert. Die Kachel verspricht nun Orientierung über Aufbau und Zusammenhang der Academy-Bereiche, nicht persönliche Fortschritts-/Nächste-Schritte-Funktionen, die die Übersichtsseite nicht bereitstellt.
- Die technische `Program`-Entität, API, Felder, Typen, Variablen, persistierte IDs und alle Fachregeln bleiben unverändert.
- GitHub Actions für den aktuellen PR-Head: PR-Vorlagenprüfung erfolgreich; TypeScript/Produktionsbuild/Testworkflow erfolgreich; 455 Tests bestanden, 0 fehlgeschlagen. Optionaler Render-Deploy-Hook übersprungen. Keine manuelle Browser-/Screenreader-/Live-Firestore-Abnahme.
- PR #251 wurde am 12.11.2026 mit Commit `611f701df54ecb302a4fcf84005544beee4485a1` gemergt.


### PR #252 – Kursdetail-Kontext und klare Katalogzustände (12.11.2026)

- Die interne Academy-Übersicht verwendet unter der globalen Academy-h1 jetzt eine h2. Damit besitzt die Seite eine klare Hauptüberschrift statt zwei gleichrangiger h1.
- Im aktiven Kursdetail bleiben die Lernziele und Kapitel der tatsächlich gestarteten, versionierten Kursfassung sichtbar. Vorher wurden sie nur vor Kursbeginn angezeigt; nach Start waren sie nicht mehr erreichbar.
- Katalog-Leerzustände unterscheiden nun „keine veröffentlichten Lehrgänge/Kurse vorhanden“ von „keine Treffer für die Suche“.
- Ein vorhandener Kurs-/Lehrgangsversionseintrag ohne Zusammenfassung wird nicht mehr fälschlich als „keine veröffentlichte Version“ dargestellt; stattdessen wird die fehlende Kurzbeschreibung benannt.
- Keine API-, Datenmodell-, Status-, Berechtigungs- oder Nachweisänderung.
- PR #252 wurde am 12.11.2026 gemergt (Commit `a952a59360f3ef1c47c5517acf0b9dd78f1d9da0`). TypeScript, Produktionsbuild und 455/455 Tests waren erfolgreich; PR-Vorlagenprüfung erfolgreich; optionaler Render-Deploy-Hook übersprungen. Manuelle Browser-/Accessibility-Abnahme offen.


### PR #253 – Prüfungsstart absichern und interne Clearance verbergen (12.11.2026)

- PR #253 wurde am 12.11.2026 mit Commit `8df61a5d1e04df91126955aa76825c818b7bc00f` gemergt.
- Der erste Klick auf „Prüfung starten / fortsetzen“ legt keinen Versuch an. Er prüft zunächst, ob ein aktiver Versuch im selben Prüfung-/Kurskontext besteht und öffnet eine informierte Bestätigungsstufe.
- Ein neuer Versuch wird erst nach „Prüfung verbindlich starten“ angelegt. Ein aktiver Versuch wird über „Laufenden Versuch fortsetzen“ idempotent fortgesetzt; kein zusätzlicher Versuch wird verbraucht und die Deadline wird nicht zurückgesetzt.
- Die Bestätigung zeigt tatsächliche Zeitlimit- und Versuchslimitregeln. 0/null bei maxAttempts bedeutet unbegrenzt; 0 bei timeLimitMinutes bedeutet kein Zeitlimit.
- Numerische interne Clearance-Werte werden nicht mehr an Teilnehmer übertragen oder in der UI gezeigt. Die serverseitige Filterung bleibt erhalten.
- CI erfolgreich: TypeScript, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung; optionaler Render-Deploy-Hook übersprungen. Manuelle Browser-/Tastatur-/Screenreader-Abnahme bleibt offen.

### PR #255 – Examiner-Panel-Semantik und Fokusführung (12.11.2026)

- PR #255 wurde am 12.11.2026 mit Commit bcce59fb9f967299105313ce769fc6bc549e885e gemergt.
- Die Übergabe-/Neuzuweisungs- und Freigabepanels sind Inline-Regionen und werden nicht mehr fälschlich als modale Dialoge mit aria-modal angekündigt.
- Beim Öffnen wird der Fokus auf die Panelüberschrift gesetzt; beim Abbrechen kehrt er zum auslösenden Button zurück.
- Vorgangskontext in offenen Bewertungen und Korrekturhistorie in abgeschlossenen Bewertungen sind standardmäßig eingeklappt, bleiben aber direkt erreichbar.
- CI erfolgreich: TypeScript, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung; optionaler Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt offen.


### 12.11.2026 – Offene PRs abgeglichen und Entscheidungsdokumentation konsolidiert

- PR #257 ist gemergt: nicht erreichbare Legacy-Editorpfade wurden aus `AcademyCenter.tsx` entfernt; keine gespeicherten Datensätze oder Server-Endpunkte wurden gelöscht. CI: TypeScript, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich.
- PR #244 enthält einen sinnvollen Accessibility-/Validierungsfix der Materialverwaltung, ist jedoch 16 Commits hinter `main`. Die Änderung wird auf aktuellem `main` neu aufgesetzt; der alte PR wird nach erfolgreicher Übernahme geschlossen.
- PR #196 ist inhaltlich durch spätere Revisions-/Action-Request-Beschlüsse in `main` bereits abgedeckt und wird als redundant geschlossen.
- PR #197 enthält die bestätigte Arbeitsvereinbarung zur eigenständigen Entscheidungsfreiheit nach Recherche. Diese wurde selektiv in die aktuellen Planungsdokumente portiert; veraltete Zwischenstände aus dem alten Branch werden nicht übernommen.
- PR #155 enthält bestätigte Empfehlungs-Lifecycle-Entscheidungen, die in der aktuellen Spezifikation noch teilweise als offen geführt wurden. Die fehlenden Regeln wurden gezielt nachgeführt; Fristen/Erinnerungen bleiben offen. Der 137 Commits zurückliegende PR-Branch wird nicht als Ganzes gemergt.
- Der systematische Funktions-/Fehleraudit der implementierten Academy bleibt laufend. Statische Codebefunde, CI und manuelle Browser-/Live-Firestore-Abnahme werden getrennt dokumentiert.
- **Nächster Schwerpunkt:** offene Funktionsbefunde priorisiert schließen und parallel die restlichen Academy-Unterseiten auf Basis der bereits beschlossenen fünfteiligen IA, Kachelgestaltung und Navigationsregeln detailliert visuell überarbeiten. Keine erneute Grundsatzkonzeption beschlossener Bereiche.

### Dokumentationsabgleich – Revisions-Action-Request-Empfängerregel

- Die am 11.11.2026 bestätigte Zuständigkeit ist nun in DECISIONS.md, der Academy-Detail-Spezifikation und OPEN-QUESTIONS.md konsistent festgehalten.
- Aktuelle kursberechtigte Prüfer dürfen eine Revision auslösen; die resultierende Action Request geht ausschließlich an Admins und Colonels. Der ursprüngliche Prüfer bleibt historisch nachvollziehbar, erhält aber keinen Bearbeitungsvorrang.
- Keine Implementierung wird durch diese Dokumentationsänderung als abgeschlossen markiert. Revisionsrückgabe, Empfängerzustellung und Benachrichtigungen bleiben funktionale Restarbeiten.

## 12.11.2026 – Academy-PR-Bestand bereinigt und Dokumentation synchronisiert

### Gemergte Arbeiten
- **PR #246** – Taxonomie nach Edit-Konflikten neu laden.
- **PR #247** – Versionshistorie nach erfolgreicher Materialveröffentlichung lokal aktualisieren.
- **PR #248** – ausstehendes Debounce-Autosave beim bewussten Verwerfen/Neuladen privater Notizen abbrechen.
- **PR #255** – Examiner-Aktionspanels korrekt als Inline-Regionen auszeichnen, Fokus beim Öffnen/Abbrechen führen und sekundären Kontext bzw. Korrekturhistorie standardmäßig einklappen.
- **PR #256** – Dokumentation der Examiner-Accessibility-Änderung.
- **PR #257** – nicht erreichbare Legacy-Erstellungs-/Bewertungsansichten aus `AcademyCenter.tsx` und ungenutzte Frontend-Konstante entfernen; gespeicherte Daten und Server-Endpunkte bleiben bestehen.
- **PR #261** – Zuständigkeit für Revisions-Action-Requests in DECISIONS, Academy-Detail-Spezifikation, OPEN-QUESTIONS und PROGRESS dokumentiert. Merge-Commit `0d47a189bfeea62d101f78abc43445ade78d8981`.

### Geschlossene, nicht gemergte Alt-PRs – Inhalt erhalten oder bereits redundant
- **PR #155** – geschlossen, nicht gemergt. Der Branch war 139 Commits hinter `main` und 85 Commits voraus (divergiert). Die fachlich relevanten Empfehlungs-Lifecycle-Entscheidungen wurden bereits gezielt in den aktuellen Planungsstand portiert; der vollständige Alt-Branch wurde bewusst nicht übernommen. Konkrete Fristen/Erinnerungen bleiben offen.
- **PR #196** – geschlossen, nicht gemergt. Die Empfängerregel für Revisions-Action-Requests wurde auf aktuellem `main` neu dokumentiert und mit PR #261 gemergt. Der alte Branch war 53 Commits zurück.
- **PR #197** – geschlossen, nicht gemergt. Die Entscheidungsfreiheit und Recherchepflicht waren bereits in den aktuellen Planungsdokumenten verankert; der alte Branch war 53 Commits zurück.
- **PR #244** – geschlossen, nicht gemergt. Der Validierungs-/Accessibility-Fix (explizite Fehlerziele, korrekte Sprachfeldzuordnung, `aria-invalid`/`aria-describedby`, sichtbares Inhaltsfeld bei Inhaltsfehlern) war bereits vollständig im aktuellen `main` vorhanden.

### PR-Bestand nach Bereinigung
Am 12.11.2026 wurde die GitHub-API-Abfrage für offene Pull Requests wiederholt. Ergebnis: **keine offenen Pull Requests**. Die geschlossenen Alt-PRs sind nicht mit offenen Aufgaben gleichzusetzen; fachlich noch offene Punkte stehen weiterhin in OPEN-QUESTIONS.md. Es wurden keine PRs allein zur Reduktion der Anzahl gemergt.
## 13.11.2026 – PR-Bereinigung und erster technischer Academy-Funktionsaudit

### In main gemergte PRs

- **#263** – mobile Academy-Hauptnavigation (Merge 7026b4ec3e9728b94bfc89b98b0653336145a3d6).
- **#264** – Examiner-Teilnehmerakte mit Review-/Ergebnisfreigabehistorie (Merge fd1a563afa09d0e577759a81da7c1045b334461d).
- **#265** – Examiner-Arbeitslisten, Filter und getrennte Ladefehler (Merge 983a2e7a05d46c7f7084e3ea58699957f7418c12).
- **#266** – gemeinsame Academy-Unterseiten-Shell (Merge d268a6134b1b34acaf066735189493ac93dfbb89).
- **#268** – „Kursabschlussprüfung“ im Kursdetail (Merge c2224890821e8ebebf1fcea5a202dd65e2dfca0b).
- **#271** – begrenzte Markdown-Lesebreite im Reader (Merge 870ed83aa6c4b98bf49d9a28044e5b54373f2f98).
- **#273** – verbliebene Prüfungsansichten und Berechtigungsbeschriftungen auf „Kursabschlussprüfung“ vereinheitlicht; auf aktuellem main neu aufgebaut (Merge 41a012fe63d872ed810952375a742b3f2fc1d7dc).
- **#274** – private Notiz-Textanker serverseitig strikt validiert: Zitat-/Kontextlängen, Heading-Pfad, Code-Zeilen und erlaubte Quellfelder (Merge 43221243d16b9b460b6a9ab41274659c57b06012).
- **#275** – ein Lehrgangs-Pin darf eine spätere Kurs-Nichtverfügbarkeit nicht umgehen; bereits gestartete Teilnahmen behalten ihren Zugriff (Merge 0fde169d38ea611c6b68db1d239dacaf23b3c2eb).

Für diese PRs waren die jeweils aktuellen TypeScript-/Produktionsbuild-/Test-Workflows und PR-Vorlagenprüfungen erfolgreich. Die optionalen Render-Deploy-Hooks waren bei den überprüften PR-Läufen übersprungen; ein tatsächlicher Produktionsdeploymentstatus ist damit nicht bestätigt. Die manuelle Browser-/Screenreader-/Live-Firestore-Abnahme bleibt ein eigener Qualitäts-Gate.

### Geschlossene bzw. ersetzte PRs

- **#269** – durch #276 und anschließend #277 auf aktuellem main neu aufgebaut; alte PRs geschlossen, kein Codeverlust.
- **#270** – veralteter, nach den Merges überlappender Branch geschlossen; die verbleibenden reinen Terminologieänderungen wurden in #273 auf aktuellem main übernommen.
- **#272** – unnötiger Filter-Fix geschlossen. Die API setzt reviewClaim.isDisconnected ausschließlich bei einem getrennten Claim des aktuell angemeldeten Prüfers; die ursprüngliche Filterbedingung war korrekt. Die vorgeschlagene Änderung hätte eigene getrennte Claims ausgeblendet.
- **#276** – nach erneutem Main-Fortschritt durch #277 ersetzt; alter PR geschlossen.

### Noch offene PRs

- **Stand 22.11.2026: keine offenen Pull Requests.**
- **PR #332** wurde am 21.11.2026 gemergt. Der zweistufige Revisionsworkflow ist integriert; CI und unabhängiger Code-/Sicherheitsreview sind abgeschlossen. Die manuelle Rollen-/Browser-/Live-Firestore-Abnahme bleibt Teil des gemeinsamen Academy-Tests.
- **PR #277** wurde geschlossen, nicht gemergt. Die Nachfolgeimplementierung **PR #295** ist gemergt; die verbleibenden zeitabhängigen Reader-Speicherfälle sind keine offene PR, sondern ein QA-Punkt für die spätere Browserabnahme.

### Verifizierte Befunde aus dem laufenden Audit

- **Behoben mit #274:** API-Textanker für private Notizen wurden zuvor per TypeScript-Typ angenommen, aber nicht strukturell begrenzt. Überlange Zitate/Kontextfelder, ungültige Zeilenangaben und zusätzliche unbekannte Quellfelder konnten gespeichert werden. Die API validiert die Anchor-Struktur jetzt vor Persistenz; Regressionstests decken überlange und inkonsistente Anker ab.
- **Behoben mit #275:** ein bereits begonnener Lehrgang pinnt weiterhin eine exakte Kursversion. Dieser Pin durfte jedoch bei späterer Kurs-Nichtverfügbarkeit einen noch nicht begonnenen Pflichtkurs starten. Die Starttransaktion prüft nun auch für gepinnte Versionen Veröffentlichungsstatus und Verfügbarkeit; Materialprüfungsfehler behalten ihre bisherige spezifische Fehlerpriorität.
- **Noch in Prüfung mit #277:** die private Notiz-Speicherwarteschlange ist ein zeitabhängiger Client-Pfad. CI bestätigt Build und Servertests, aber nicht die tatsächliche Reihenfolge konkurrierender Browser-Requests. Kein Merge ohne gezielte Browserabnahme.
- **Noch in Prüfung mit #267:** Revisionsanfragen haben Auswirkungen auf vertrauliche Prüferdaten, Ergebnisfreigabe und Kursabschlussnachweise. Die bestehenden HTTP-/Service-Tests decken wesentliche Rollen- und Zustandsübergänge ab; unabhängiges Review und erneute Prüfung auf aktuellem Main stehen aus.

### Nächster Auditfokus

1. Private Notizen und Reader-End-to-End-Szenarien nach der Browserabnahme von #277 abschließen.
2. Revisionsworkflow #267 auf aktuellem Main konfliktfrei aktualisieren und unabhängiges Review organisieren.
3. Danach Materialverwaltung, Kurs-/Lehrgangslebenszyklus, Fortschrittsnachweise und Prüfungs-/Ergebnisprojektionen systematisch weiter prüfen.
4. Die gemeinsame Browser-/Screenreader-/Live-Firestore-Abnahme separat planen; CI-Erfolg nicht als Produktionsabnahme ausgeben.


### Nachtrag vom 13.11.2026 – Terminologie-Reststellen und Revisionsfreigabe

- **PR #279** wurde gemergt (Commit 77faa79b4bde3d0284f918095dfb7ec3d02abdfe). Die generische Bezeichnung „Kursabschlussprüfung“ wurde auch in den älteren, weiterhin eingebundenen Academy-Prüfungsansichten, der Command Palette, Personalverwaltung, Zugriffsanträgen und sichtbaren Rollen-/Berechtigungszusammenfassungen vereinheitlicht. Der konkrete Seed-Prüfungstitel und technische interne Bezeichnungen blieben unverändert.
- **PR #282** ersetzt die veralteten PRs #269/#276/#277/#280 und basiert auf main nach #281. TypeScript, Produktionsbuild, 455 Servertests und PR-Vorlagenprüfung sind erfolgreich. Er bleibt Draft, bis die Browserabnahme der zeitabhängigen Notiz-Save-Queue erfolgt.
- **PR #267 – Korrektur des Freigabestatus:** ausdrücklich beschlossen ist Option A: alle für den Kurs autorisierten Prüfer dürfen eine abgeschlossene Bewertung zur Revision zurückgeben und die Action Request auslösen. Eine zusätzliche verpflichtende Annahme-/Ablehnungsstufe durch Admins/Colonels ist nicht eindeutig vom Projektinhaber freigegeben und bleibt eine offene fachliche Entscheidung. PR #267 darf diesen Zusatz-Gate-Ablauf nicht als beschlossene Regel festschreiben. Zusätzlich bleibt unabhängiges Review für die Autorisierungs-/Datenzugriffsänderungen erforderlich.
- Aktuelle offene PRs: #267 (fachliche Klärung, Aktualisierung auf aktuellen main und unabhängiges Review) sowie #282 (manuelle Browserabnahme).


### Nachtrag – Refresh der privaten Notiz-Autosave-PR (13.11.2026)

- PR #280 wurde ohne Merge geschlossen und durch PR #282 ersetzt, weil die zwischenzeitliche Dokumentationsaktualisierung #281 den Main-Stand fortgeschrieben hatte.
- PR #282 enthält denselben fokussierten Komponenten-Diff wie #277/#280, basiert direkt auf main nach #281 und hat erfolgreiche TypeScript-/Produktionsbuild-/455-Servertest-/PR-Vorlagenprüfungen.
- Der PR bleibt bewusst Draft, bis die zeitabhängigen Browserfälle (Materialwechsel, Debounce, in-flight Save, Fehler/Retry, 409/Reload, Delete-Failure und Reader-Unmount/Remount) manuell verifiziert sind.

## 13.11.2026 – Revisionsworkflow fachlich freigegeben

- Der Projektinhaber hat Option 2 ausdrücklich bestätigt: verpflichtendes zweistufiges Admin-/Colonel-Gate. Eine offene Revisionsanfrage bleibt außerhalb der gemeinsamen Prüferliste; erst die begründete Annahme durch Admin oder Colonel gibt denselben Versuch für alle aktuell kursberechtigten Prüfer frei. Bei Ablehnung bleiben bisherige Bewertung, veröffentlichtes Ergebnis und Kursnachweis unverändert.
- Die Entscheidung ist in DECISIONS.md, der Academy-Detail-Spezifikation und OPEN-QUESTIONS.md festgehalten.
- Die technische Implementierung in PR #267 ist noch nicht mergebereit: Der Branch divergiert gegenüber main (129 Commits voraus, 13 Commits hinter main; gemeinsamer Ausgangspunkt dc1bf7e). Er muss kontrolliert aktualisiert werden; danach ist der vollständige CI-Lauf erneut erforderlich.
- Unabhängige Codeprüfung, manuelle Browser-/Tastatur-/Screenreader-Abnahme und Firestore-Produktionsprüfung stehen aus. Der optionale Render-Deploy-Schritt wurde nicht ausgelöst; kein Produktionsdeploy bestätigt.
- PR #284 (private Notizentwürfe beim Materialwechsel) bleibt bis zur manuellen Browserprüfung der Autosave-/Race-Szenarien Draft.


## 13.11.2026 – Fortsetzung des Academy-Unterseiten-Redesigns

- **PR #286 – Kursdetail: Versions- und Verfügbarkeitskontext** ist als fokussierter Draft auf aktuellem `main` angelegt: https://github.com/MDP0063/rcpd-new/pull/286.
- Die Detailansicht zeigt für nicht gestartete Kurse nun die ausgewählte veröffentlichte Version statt „Noch keine Teilnahme“ als Versionsmetadatum. Fehlende Kurzbeschreibung und fehlende Veröffentlichung werden getrennt benannt.
- Archivierte bzw. vorübergehend nicht verfügbare Kurse erhalten in der Detailansicht einen klaren Hinweis; die bereits vorhandene Startaktion wird deaktiviert, wenn der serverseitige Veröffentlichungs-/Verfügbarkeits-Gate den Start nicht zulässt. Bereits gestartete Teilnahmen bleiben unberührt.
- Die Änderung ist auf bestehende Daten und Regeln begrenzt; keine API-, Datenmodell-, Rollen- oder serverseitige Statusänderung.
- TypeScript-Check, Produktionsbuild und 455/455 Servertests sind auf Commit `9975db5` erfolgreich; PR-Vorlagenprüfung ebenfalls. Der optionale Render-Deploy-Hook wurde übersprungen. Gezielte Browser-/Responsive-/Accessibility-Prüfung steht noch aus; kein Merge und kein Deployment.

## 13.11.2026 – Rollenpräzise Prüfungsnavigation

- **PR #287** gruppiert die Prüfungs-Unter-Navigation sichtbar in „Teilnahme“ und rollenabhängige „Prüferaufgaben“. Die Prüfergruppe erscheint nur für berechtigte Rollen; auf schmalen Viewports werden die Gruppen gestapelt. Admins sehen „Korrekturen & Freigaben“, Colonels „Bewertungskorrekturen“.
- Technischer Grund: `ExamCorrectionCenter` lädt Ergebnisfreigaben nur mit `canReleaseResults={currentUser.role === 'admin'}`; Colonels besitzen weiterhin die vorhandene Korrekturfunktion, aber keine Ergebnisfreigabe.
- Keine Änderung an Berechtigungen, API, Datenmodell oder tatsächlichen Aktionen. TypeScript-Check, Produktionsbuild und 455/455 Servertests sind auf dem aktuellen Implementierungsstand `b6cc35c` erfolgreich; PR-Vorlagenprüfung ebenfalls. [Build-/Testworkflow](https://github.com/MDP0063/rcpd-new/actions/runs/43391193711). Der optionale Render-Deploy-Hook wurde übersprungen. Die Browserprüfung mit Admin- und Colonel-Rolle steht noch aus.
- Ergänzende Tastaturprüfung: Beide Gruppen der Prüfungs-Unter-Navigation besitzen nun eine explizite, im Hell- und Dunkelmodus sichtbare `:focus-visible`-Kontur; keine Änderung an Rollen oder Aktionen.

## 15.11.2026 – PR-Branch mit aktuellem main abgeglichen

- PR #287 wurde nach dem Merge von #286 konfliktfrei inhaltlich mit dem neuen `main` zusammengeführt. Die geänderten Navigationskomponenten und beide Dokumentationsstände bleiben erhalten.
- Der Synchronisations-Commit besitzt `main` und den bisherigen PR-Head als Eltern; keine Force-Push-/History-Rewrite-Aktion.
- Die CI wird auf dem zusammengeführten Branchstand erneut ausgeführt. Browser-/Screenreader-Abnahme bleibt für die spätere gemeinsame QA vorgesehen.

## 13.11.2026 – Lernbibliothek visuell verfeinert

- **PR #288** setzt die bestehende violette Bibliotheksidentität in Themenkarten, Metadaten, Fokuszuständen und primären Reader-Aktionen konsistenter um.
- Materialkarten erhalten kompaktere, vergleichbare Beschreibungsbereiche; der vollständige Inhalt bleibt im Reader. Reader und Katalog bleiben funktional getrennt.
- Mobile Such-/Sortierflächen und Materialaktionen werden auf volle Breite optimiert.
- Ausschließlich CSS-/Designänderungen; keine Änderung an Daten, Berechtigungen, Suche, Filter, Sortierung, Versionierung, Notizen oder PDF-Infrastruktur.
- TypeScript-Check, Produktionsbuild und 455/455 Servertests sind auf Implementierungs-Commit `4dca74f` erfolgreich; PR-Vorlagenprüfung ebenfalls. [Build-/Testworkflow](https://github.com/MDP0063/rcpd-new/actions/runs/43427744171). Die nachfolgenden Änderungen betreffen nur Dokumentation. Browser-/Accessibility-Prüfung steht noch aus. Kein Merge und kein Deployment.
- Ergänzende Accessibility-/Dark-Mode-Prüfung: Karten-Fokusindikatoren erhalten im Dark Mode eine helle, kontrastreiche Kontur. Die Materialeditor-Markdownvorschau hebt Blockquotes im Dark Mode jetzt ebenfalls ausreichend vom dunklen Hintergrund ab. CI für den finalen Branchstand wird nach diesen Korrekturen erneut geprüft; Browser-/Screenreader-Abnahme bleibt offen.

## 15.11.2026 – PR-Branch mit aktuellem main abgeglichen

- PR #288 wurde nach den Merges von #286 und #287 mit dem aktuellen `main` zusammengeführt. Die Bibliotheks-CSS-Ergänzungen und die Prüfungsnavigation wurden konfliktfrei kombiniert; die kollidierende Abschnittsnummer in der Unterseiten-Dokumentation wurde fortlaufend auf 14 gesetzt.
- Der Synchronisations-Commit bewahrt den bisherigen PR-Head und `main` als Eltern. Keine History-Rewrite- oder Force-Push-Aktion.
- Die CI wird auf dem kombinierten Stand erneut ausgeführt. Browser-/Responsive-/Screenreader-Abnahme bleibt für die spätere gemeinsame QA vorgesehen.

## 13.11.2026 – Materialverwaltung und Editor: visuelle Hierarchie

- Separater Arbeitsschritt in Branch `design/academy-material-editor-hierarchy`.
- Der bestehende Materialeditor erhält eine klarere visuelle Trennung seiner bereits vorhandenen Gruppen „Grunddaten und Zuordnung“ sowie „Inhalt und Darstellung“.
- Bearbeiten/Vorschau werden als zusammengehörige Ansichtsumschaltung gestaltet; Speichern, Veröffentlichen und Verwerfen bleiben als bestehende Aktionen erkennbar. Die Archivierung bleibt eine visuell getrennte administrative Aktion.
- Kategorie- und Dokumenttypverwaltung erhalten eine klarere Gewichtung zwischen Bearbeiten, Archivieren/Reaktivieren und endgültigem Löschen.
- Ausschließlich CSS/Präsentation; keine Änderung an Formularfeldern, Pflichtangaben, Rollen-/Kursrechten, Veröffentlichungs- oder Versionslogik, Taxonomie-Lebenszyklus oder Materialinhalten.
- Die gemeldete White-/Dark-Mode-/Materialinhalts-Sichtbarkeitsstörung ist ausdrücklich **nicht** Teil dieses Schritts und bleibt für eine separate Reproduktion/Ursachenanalyse vorgemerkt.
- CI auf PR-Head `682348df7e60f5864f00318307478545d053c273` erfolgreich: `bun run lint`, Produktionsbuild und `bun run test` bestanden ([Workflow](https://github.com/MDP0063/rcpd-new/actions/runs/43428990832)). Der optionale Render-Deploy-Hook wurde übersprungen; kein Deployment ausgelöst. Browser-/Responsive-/Keyboard-Abnahme steht weiterhin aus.
- Ergänzende Accessibility-Prüfung: Tastaturfokusmarkierungen in der Materialverwaltung sind im Dark Mode jetzt heller und klarer erkennbar. CI für den aktualisierten Branchstand wird erneut geprüft; Browser-/Screenreader-Abnahme bleibt offen.

## 15.11.2026 – PR-Branch mit aktuellem main abgeglichen

- PR #289 wurde nach den Merges von #286–#288 mit dem aktuellen `main` zusammengeführt. Die Editor-/Taxonomie-CSS-Änderungen und die Dokumentationsstände beider Branches sind erhalten.
- Der Synchronisations-Commit verwendet `main` und den vorherigen Feature-Head als Eltern; keine History-Rewrite-/Force-Push-Aktion.
- Die CI läuft auf dem synchronisierten Stand erneut. Browser-/Responsive-/Screenreader-Abnahme bleibt Teil der späteren gemeinsamen Academy-QA. 

## 15.11.2026 – PR-Bestand bereinigt und vollständiges Academy-Usability-Redesign gestartet

### In main gemergte Academy-PRs

Die vier zuvor offenen Design-/UX-PRs wurden nach Prüfung und kontrolliertem Main-Abgleich gemergt:

- **#286 – Kursdetail: Versions- und Verfügbarkeitskontext** – Merge-Commit `ca2fcb0c31d2d317c51a8c880ea639f0ecbbf896`. Build/Testworkflow [43390394174](https://github.com/MDP0063/rcpd-new/actions/runs/43390394174): TypeScript/Build und Tests erfolgreich; optionaler Render-Deploy-Hook übersprungen. PR-Vorlagenprüfung [43390460875](https://github.com/MDP0063/rcpd-new/actions/runs/43390460875) erfolgreich.
- **#287 – rollenpräzise Prüfungsnavigation** – Merge-Commit `df4f73a172ab29b056fffde78196dd3cac23ed2f`. Branch kontrolliert mit #286/main abgeglichen, Navigationsfokus verbessert; Build/Testworkflow [43658139881](https://github.com/MDP0063/rcpd-new/actions/runs/43658139881) und PR-Vorlagenprüfung [43658144891](https://github.com/MDP0063/rcpd-new/actions/runs/43658144891) erfolgreich. Optionaler Render-Deploy-Hook übersprungen.
- **#288 – Lernbibliothek visuell verfeinert** – Merge-Commit `d5b742363ff4cd0b4d7f8fb6b37eb5e7c576c8cf`. Branch kontrolliert mit dem aktualisierten main abgeglichen; Kartenfokus im Dark Mode und Blockquote-Kontrast in der Materialvorschau ergänzt. Build/Testworkflow [43658225571](https://github.com/MDP0063/rcpd-new/actions/runs/43658225571) und PR-Vorlagenprüfung [43658245646](https://github.com/MDP0063/rcpd-new/actions/runs/43658245646) erfolgreich. Optionaler Render-Deploy-Hook übersprungen.
- **#289 – Materialeditor und Taxonomie** – Merge-Commit `8f25d303165f466f9b295a265caa5a07566209d6`. Branch kontrolliert mit dem aktualisierten main abgeglichen; Fokuskontrast der Materialverwaltung im Dark Mode verbessert. Build/Testworkflow [43658405643](https://github.com/MDP0063/rcpd-new/actions/runs/43658405643) und PR-Vorlagenprüfung [43658405654](https://github.com/MDP0063/rcpd-new/actions/runs/43658405654) erfolgreich. Optionaler Render-Deploy-Hook übersprungen.

Alle vier Build/Testworkflows haben TypeScript/Produktionsbuild und Server-Tests erfolgreich abgeschlossen. Kein optionaler Render-Deploy-Hook wurde ausgeführt. Daraus wird kein erfolgreicher oder fehlgeschlagener Live-Produktionsdeploy abgeleitet. Browser-/Responsive-/Screenreader-/Live-Firestore-Abnahme steht weiterhin aus.

### Vollständiges Academy-Usability-Redesign

- Der Projektinhaber hat am 15.11.2026 ausdrücklich die vollständige eigenständige UX-/Bedienüberarbeitung aller Academy-Untermodule und Bedienelemente freigegeben.
- UI-Filter, Sortierung, Suche, Gruppierung und Ansichtssteuerungen dürfen auf vorhandenen, serverseitig autorisierten Daten und bestehenden Statuswerten basieren. Fachliche Status-/Rollen-/Datenregeln bleiben unverändert.
- Die fünfteilige Navigation, fünf Kachel-Einstiege, Illustrationen, Farben, direkte Kachel-Rückkehr und alle fachlichen Datenschutz-/Versionierungs-/Prüfungsbeschlüsse bleiben geschützt.
- Detaillierte Konzeption: ACADEMY-SUBPAGE-REDESIGN.md Abschnitt 16; DESIGN-SYSTEM-CONCEPT.md Abschnitt 15; ACADEMY-DETAILED-SPECIFICATION.md Ergänzung 15.11.2026; DECISIONS.md Beschluss 15.11.2026.
- Designschwerpunkt ist die Bedienbarkeit und Übersichtlichkeit, besonders Bibliothek/Reader. Bereichsidentität, fachlicher Status und ausführbare Aktion erhalten streng getrennte visuelle Semantik. Die größeren Bibliothekskacheln bleiben, werden aber wesentlich besser scan- und vergleichbar gemacht.
- Aktueller Redesign-Branch: `redesign/academy-usability-system`, ausgehend von main nach Merge #289 (`8f25d303165f466f9b295a265caa5a07566209d6`). Bisherige Änderungen in diesem Branch sind Dokumentations-/Planungsarbeit; noch keine UI-Codeänderung in diesem neuen Arbeitszweig.
- Nächster Implementierungsschwerpunkt: gemeinsame Status-/Control-/Focus-Basis und konsistente Markdown-Darstellung, danach Bibliothekskatalog und Reader.

### Weiterhin offene PRs

- **#267** – Revisionsworkflow Option 2. Bleibt Draft/nicht mergebar bis kontrollierte Aktualisierung auf aktuellen main, erneute vollständige CI und unabhängiges Review der Autorisierungs-/sensiblen Datenzugriffsänderungen abgeschlossen sind.
- **#284** – Private Notiz-Save-Queue. Bleibt Draft bis zur späteren Browserprüfung der zeitabhängigen Autosave-/Race-Szenarien. Servertests ersetzen diese Prüfung nicht.

### QA-Grenze

Die gemeinsame Browser-/Responsive-/Screenreader-/Live-Firestore-Abnahme findet bewusst später statt. CI-Erfolg und statischer Code-Review werden davon getrennt ausgewiesen. Keine manuelle Browserprüfung wird hier als erfolgt behauptet.

## 15.11.2026 – Erste Umsetzung des vollständigen Academy-Usability-Redesigns

Historischer Implementierungsbranch: `redesign/academy-usability-system`; seine erste Umsetzungs-PR #290 ist inzwischen gemergt (siehe Statuskorrektur unten).

### Lernbibliothek / Reader
- Erste Suchebene verbessert: klarere Beschriftung, explizite Suchlöschung und genaue Erklärung, welche Metadaten durchsucht werden. Der vollständige Materialtext wird derzeit bewusst nicht als durchsuchbar ausgegeben, weil der Katalog nur Metadatenindexwerte bereitstellt.
- Sortieroptionen fachlich korrekt benannt: Titel A–Z und Veröffentlichungs-/Aktualisierungszeit, dazu Relevanz mit Titel-A–Z-Fallback ohne Suchbegriff.
- Aktive Suche und aktive Filter erscheinen sichtbar und einzeln entfernbar; eine gemeinsame Rücksetzfunktion ist vorhanden.
- Keine-Treffer-Zustand benennt Suche und Filter statt fälschlich nur die Suche.
- Materialkarten bleiben größere eigenständige Kacheln, sind aber jetzt als gut vergleichbare vertikale Trefferliste mit stabiler Informationsreihenfolge, natürlicher Höhe und eindeutiger Aktion angelegt. Bereichsakzent und Primäraktion sind farblich getrennt.
- Reader-Navigation öffnet beim direkten Öffnen eines Materials nicht automatisch eine breite Seitenleiste. Sie kann explizit zugeschaltet werden. Wenn sie geöffnet ist, verwendet sie dieselbe Sortierreihenfolge, Suchanfrage und die aktiven Filter; Such-/Filterbedingungen sind dort löschbar.
- Rückkehr zur Bibliothek erhält Suche, Filter und Sortierung.
- Versionierter Reader nutzt eine Lesebreite bis 68ch.

### Gemeinsame Markdown-Darstellung
- Neue lokale `AcademyMarkdownRenderer.tsx` mit ReactMarkdown, GFM und `rehype-sanitize`; kein Raw-HTML-Durchlauf, Code bleibt Text und wird nicht ausgeführt, externe Bilder werden nicht gerendert.
- Renderer wird im versionierten Bibliotheksreader, im Kursmaterialreader, in der Materialeditorvorschau und in privaten Notizvorschauen verwendet.
- Überschriften mit Textanker-IDs im Kursreader bleiben als optionale Komponentenüberschreibung erhalten.
- Tabellenzellen, Inline-Code, Blockquotes, Links und Codeblöcke bekommen explizite Light-/Dark-Farben statt impliziter Theme-Vererbung.

### Kurse / Lehrgänge
- Globaler Suchbegriff hat eine sichtbare Löschaktion.
- Der Kurskatalog kann anhand der bestehenden Teilnahmezustände gefiltert werden: Nicht begonnen (kein persönlicher Teilnahme-Datensatz), In Bearbeitung, Abgeschlossen, Freiwillig beendet, Administrativ beendet.
- Sortierung nach Titel A–Z oder tatsächlichem Veröffentlichungszeitpunkt. Die Sortierung verwendet nur vorhandene `publishedIso`-Werte; fehlende/ungültige Zeitstempel werden als älteste behandelt.
- Der Teilnahmefilter beeinflusst ausschließlich die Kursliste, nicht die Lehrgänge. Er ändert keine fachlichen Zustände und erzeugt keine neuen Backendwerte.
- Petrol bleibt Kursbereichsidentität. Teilnahmezustände, Verfügbarkeits-/Archivhinweise und Buttons wurden neutralisiert, damit sie keine Erfolg-/Warn- oder Statusbedeutung vortäuschen.

### Prüfstatus
- Diese Änderungen wurden in PR #290 zusammengeführt und am 15.11.2026 in `main` integriert; siehe Merge-Commit `a223cd02bd5edd338390319abc7ee94d83f3cd10`.
- TypeScript, Produktionsbuild und Servertests waren im Build-/Testworkflow [43660044749](https://github.com/MDP0063/rcpd-new/actions/runs/43660044749) erfolgreich; PR-Vorlagenprüfung [43660044772](https://github.com/MDP0063/rcpd-new/actions/runs/43660044772) ebenfalls erfolgreich.
- Browser-, Responsive-, Tastatur-, Screenreader- und Live-Firestore-QA bleiben wie vereinbart offen und werden später gemeinsam durchgeführt.


## 15.11.2026 – Farbsemantik und Markdown-Navigation nach PR #290

### Verifizierter Ausgangsstand
- PR #290 „Academy: Bibliothek, Reader und Kurskatalog benutzerfreundlich überarbeiten“ ist in `main` integriert: Merge-Commit `a223cd02bd5edd338390319abc7ee94d83f3cd10`; PR-Head `5ece27d7f0bb8ae175cdaa085fa8528230586dbb`.
- Build-/Testworkflow [43660044749](https://github.com/MDP0063/rcpd-new/actions/runs/43660044749) und PR-Beschreibungsprüfung [43660044772](https://github.com/MDP0063/rcpd-new/actions/runs/43660044772) erfolgreich. TypeScript, Produktionsbuild und Servertests liefen erfolgreich; der optionale Render-Deploy-Hook wurde übersprungen.
- Browser-/Responsive-/Keyboard-/Screenreader-/Live-Firestore-Abnahme ist nicht erfolgt und bleibt Teil der späteren gemeinsamen QA.

### Aktuelle Korrekturen auf `redesign/academy-notes-color-semantics`
- Die gemeinsame Markdown-Darstellung öffnet nur absolute HTTP(S)-Links in einem neuen Tab. Relative Links und Textanker bleiben im aktuellen Tab, damit interne Navigation und Inhaltsverzeichnisse erwartbar funktionieren.
- Die Notizen-Bereichsfarbe Grün wird nicht mehr als Speicher-/Primäraktionsfarbe oder großflächige Zustandsanmutung verwendet. Speichern nutzt die neutrale Primäraktion; Flächen, Eingaben, Fokus und Trennlinien folgen einer neutralen Oberfläche. Der kleine grüne Bereichskicker bleibt als Identitätsakzent erhalten; destruktives Löschen bleibt separat rot.
- Keine neue fachliche Statusbedeutung, keine Berechtigungs-/API-/Datenmodelländerung, keine neue Abhängigkeit und keine Kosten.

### Prüfstatus und nächste Schritte
- Codeänderungen sind committed; CI und vollständige PR-Diffprüfung stehen für diesen Branch noch aus.
- Als nächstes folgen die konsolidierte Academy-Control-/Tokenbasis und der gezielte Audit der Notizen- und Prüfungsbedienung. Die Bibliothek bleibt Schwerpunkt; bestehende Suche, Filter, Sortierung, Materialversionen, private Textanker und Readerpositionen sind Regression-Schutzbereiche.
- Die branchbezogenen Angaben aus dem ersten Arbeitsprotokoll vor PR #290 sind historisch. PR #290 ist gemergt; der damalige Feature-Branch wurde durch den Merge ersetzt. Der aktuelle Arbeitszweig ist oben angegeben.

- **PR #292** ist erstellt; der finale Branchstand wartet auf den durch den PR-Synchronisationslauf ausgelösten TypeScript-/Build-/Servertest- und PR-Vorlagenworkflow. Kein Render-Deploy-Hook und keine Browserprüfung wurden ausgeführt.


## 15.11.2026 – Gemeinsames semantisches Academy-Interaktionssystem

### Ausgangsbefund
Der Farbaudit über alle Untermodule zeigte, dass Bereichsfarben wiederholt als Aktions-/Auswahlfarbe verwendet wurden: Petrol in Kursaktionen, Violett in Bibliotheks-/Materialverwaltung, Beerenton in Prüfungsaktionen und Grün in Notizen. Zusätzlich wurden neutrale Lebenszyklus-/Workflowzustände (archiviert, Entwurf, Bewertung/Freigabe ausstehend) teilweise wie Warn-/Erfolgszustände eingefärbt.

### Umsetzung auf `redesign/academy-control-system`
- Neue gemeinsame Token-Datei `src/components/AcademyDesignTokens.css`, eingebunden in `AcademyCenter.tsx`.
- Semantische Tokens für Text, Oberflächen, Auswahl, Rahmen, Fokus, Primär-/Sekundär-/destruktive Aktionen sowie echte Erfolgs-/Warn-/Fehler-/Infozustände.
- Theme-aware Bereichs-Vordergrundfarben für Dark Mode; die genehmigten fünf Bereichsfarben und Einstiegskacheln bleiben erhalten.
- Einheitliche `academy-action-primary`, `academy-action-secondary`, `academy-action-danger`-Varianten; mindestens 44px Zielhöhe für diese Aktionen sowie wichtige Unter-Navigation/Segmentsteuerungen und Eingabefelder.
- Globaler 3px-Tastaturfokus mit 3px Offset; gesättigte Einstiegskacheln behalten eine kontrastreiche helle Innenkontur.
- Kurskarten, Kursaktionen, Kursstatusflächen und Kursdetailbedienung neutralisiert; echte Kursidentität bleibt ein kleiner Petrol-Akzent.
- Bibliotheks-/Materialverwaltungsnavigation, Auswahlzustände, Such-/Formoberflächen und Reader-Controls neutralisiert; Violett bleibt ein kleiner Bibliotheksakzent.
- Prüfungsrunner: Primäraktion, ausgewählte Fragen/Antworten und Fortschrittsanzeige neutral; Berry bleibt Bereichsidentität. Ausstehende Bewertung/Freigabe ist neutral, bestanden/nicht bestanden bleiben echte Ergebnisfarben.
- Prüferaktionen erhalten einheitliche Primär-/Sekundär-/Destruktiv-Hierarchie; Übergabeinformationen sind neutral, Warnungen vor Inaktivitäts-/Verwerfungsfolgen bleiben amber.
- Im Prüfungsrunner ist „beantwortet“ jetzt nicht mehr grün (das könnte fälschlich „richtig“ bedeuten): die Frage-Navigation nutzt neutrale Auswahlflächen plus Häkchen und Screenreader-Text. Der Fortschrittsbalken ist neutral; die Zeitwarnung ist in Amber (≤5 Minuten) und Rot (≤1 Minute) abgestuft.
- Exam-Workshop-Lebenszyklusstatus (Entwurf/veröffentlicht/archiviert) neutral; Governance-Aktionen nach Wirkung unterschieden.
- Taxonomie: Archivieren/Reaktivieren neutral, endgültiges Löschen destruktiv.
- Materialeditor: neutrale Flächen, Felder und Auswahl; Archivierung neutral; Speichern primär.
- Kursauthoring: neutrale Arbeitsflächen; echte Blockaden/ungespeicherte Änderungen bleiben Warnhinweise.
- Notizen: gemeinsame Tokens; Speichern neutral primär, Löschen destruktiv, Bereichsgrün nur Identitätsakzent.

### Qualitätssicherung / offene Punkte
- Noch keine CI für diesen Branch; vollständige Diffprüfung und TypeScript-/Build-/Servertests stehen aus.
- Browser-/Responsive-/Screenreader-Abnahme bleibt später.
- Vor PR-Erstellung werden CSS-Duplikate, Kontrastwerte, alle verbliebenen Bereichsfarb-Verwendungen und Statussemantik nochmals geprüft.
- Nach Merge dieses Token-Grundschritts folgt eine gezielte Bibliotheks-/Reader-Bedienungsrunde; danach Prüfungs-/Notizen-/Verwaltungsdetails.


## 15.11.2026 – „Meine Notizen“: erste UX- und Konfliktverbesserungen

Arbeitsbranch: `redesign/academy-notes-workspace`, abgeleitet von `main` nach Merge #290.

- Notizliste: Suche mit Clear-Aktion, Filter nach vorhandener Eintragsart (alle / nur Notizen / nur Lesezeichen), Sortierung nach letzter Änderung bzw. Titel A–Z, Trefferzahl und einzeln entfern-/gesamt zurücksetzbare Suchbedingungen.
- Kartenstruktur: Titel, Eintragsart und Änderungsdatum in stabiler Hierarchie; kurze Textvorschau, neutrale Schlagwortchips sowie eingeklappter Quellenstatus. Kein zusätzlicher Erstellen-Button.
- Bookmark-Entfernung und Notizlöschung haben eigene Aktionsbeschriftungen und Bestätigungstexte.
- Quellenstatus zeigt keine technischen Material-/Versions-IDs mehr. Da die bestehende owner-isolierte API keine Titel/Materialkennungen zurückgibt, werden Quellen neutral als Materialfassung 1..n dargestellt.
- Editor: Speicherzustand sichtbar; bei HTTP 409 bleibt der eigene lokale Entwurf unverändert erhalten. Die aktuelle Fassung wird über die owner-isolierte Notizenliste nachgeladen und erst nach bewusster Bestätigung übernommen. Keine stille Revisionsanhebung.
- Bereichsgrün ist nicht mehr Farbe der allgemeinen Buttons oder Speicheraktion; Status und gewöhnliche Aktionen bleiben neutral, Löschen bleibt destruktiv.
- Datenschutz, Notiz-Eigentümer, Source-Status-API, private Quellenbindung und Datenmodell wurden nicht geändert.

**Noch offen:** TypeScript/Build/Servertests und PR-Vorlagenprüfung auf dem finalen PR-Head. Browser-/Responsive-/Keyboard-/Screenreader-/Live-Firestore-QA folgt der später vereinbarten gemeinsamen Academy-QA.


## 15.11.2026 – PR-Bereinigung und Examiner-Revisionsworkflow

- **PR #293** – gemeinsame Academy-Design-/Statussemantik – ist gemergt (Merge-Commit cb97e5f71fec93524920dfb835c3177f69347e9f). CI und PR-Vorlagenprüfung erfolgreich; Browser-QA bleibt offen.
- **PR #291** wurde als veraltet geschlossen und durch **PR #294** ersetzt. PR #294 wurde auf aktuellem main neu aufgebaut, CI/TypeScript/Build/Servertests/PR-Vorlagenprüfung waren erfolgreich und der PR wurde gemergt.
- **PR #284** wurde als veraltet geschlossen und durch **PR #295** ersetzt. PR #295 wurde auf aktuellem main neu aufgebaut, CI/TypeScript/Build/Servertests/PR-Vorlagenprüfung waren erfolgreich und der PR wurde gemergt. Die Reader-Unmount-/Netzwerkfehlergrenze bleibt ausdrücklich dokumentiert; keine private Browser-Draftpersistenz.
- **PR #267** bleibt Draft und darf nicht auf seinem veralteten Branch gemergt werden (129 Commits voraus, 23 hinter dem damaligen main). Die Revisionsimplementierung wurde auf feat/exam-review-revision-requests-current-main kontrolliert neu aufgebaut. Ein Empfängerberechtigungscheck wurde ergänzt: Revision-Benachrichtigungen werden bei Zustellung erneut gegen aktuellen Accountstatus und aktuelle Rolle/Kursberechtigung geprüft.
- Die Revisionsänderung betrifft sensible Prüfungsdaten und Admin-/Colonel-Autorisierung. Vor Merge sind aktuelle CI, vollständiges Diff-/Sicherheitsreview und eine unabhängige Prüfung erforderlich. Es wurde kein Produktionsdeploy ausgelöst.
- Browser-/Responsive-/Screenreader-/Live-Firestore-Abnahme für die Academy bleibt ein separater späterer Schritt.


## 15.11.2026 – Kurs- und Lehrgangsverwaltung: Katalogbedienung (PR #297)

- Gemeinsame Suche über Kennungen sowie Titel und Kurzbeschreibungen aus Entwürfen und veröffentlichten Fassungen.
- Veröffentlichungsfilter verwendet nur die vorhandenen Zustände Entwurf, Veröffentlicht und Archiviert; keine Status- oder Verfügbarkeitsänderung.
- Sortierung nach Kennung, Titel oder dem neuesten tatsächlichen Änderungszeitpunkt aus Entwurfs- und Master-Zeitstempel.
- Ergebniszahlen, getrennte Leerzustände und gemeinsames Zurücksetzen der Such-/Filterkriterien.
- Keine Backend-, Berechtigungs-, Datenmodell- oder Infrastrukturänderung.
- **PR #297 ist am 15.11.2026 gemergt** (Merge-Commit `e4a8103fca3d0e6baa12840f7d539bead666830e`). GitHub Actions: `bun run lint`, `bun run build`, `bun run test` mit 455/455 erfolgreich; PR-Vorlagenprüfung erfolgreich. Browser-/Responsive-/Keyboard-/Screenreader-QA bleibt offen.


## 15.11.2026 – Materialverwaltung: Katalogbedienung (PR #298)

- Materialliste erhält neben der bestehenden Suche Filter für Entwürfe, veröffentlichte Materialien ohne neueren Entwurf, veröffentlichte Materialien mit neuer Arbeitsfassung und archivierte Materialien. Die Unterscheidung wird aus dem bestehenden Revisionsvergleich abgeleitet; keine neuen Statuswerte.
- Sortierung nach letzter tatsächlicher Änderung, Titel oder Kennung; bei der Zeitreihenfolge wird der neueste gültige Zeitstempel aus Arbeitsentwurf und Master berücksichtigt.
- Such-/Filterkriterien sind gemeinsam zurücksetzbar; Trefferzahl und keine-Treffer-Zustand benennen Suche und Filter.
- Die vorhandene serverseitige Rollen-/Kursautorisierung und die Material-/Versionsdaten bleiben unverändert.
- Parallel wurde die Zeit-Sortierung im Kurs-/Lehrgangs-Authoring korrigiert: neuester Wert aus Arbeitsentwurf und Master.
- **PR #298 ist am 15.11.2026 gemergt** (Merge-Commit `871b1296be2d2eb71ecdcd222008f8e1768bf4f6`). GitHub Actions: `bun run lint`, `bun run build`, `bun run test` mit 455/455 erfolgreich; PR-Vorlagenprüfung erfolgreich. Browser-/Responsive-/Keyboard-/Screenreader-QA bleibt offen.


## 15.11.2026 – Taxonomieverwaltung: Kategorien und Dokumenttypen (PR #299)

- Kategorien- und Dokumenttypverwaltung mit Suche nach Name/Beschreibung, optionalem Filter Aktiv/Archiviert, alphabetischer Sortierung, Trefferzahl und gemeinsamem Zurücksetzen.
- Suchfelder verwenden sichtbare Labels und Hinweistexte statt Platzhalter als einzige Suchanleitung; Statusfilter bleiben optional.
- Such-/Formularfelder und Aktionen haben mindestens 44 px Zielhöhe.
- Es werden nur vorhandene Taxonomiestatus verwendet. Archivieren/Reaktivieren, stabile Kennungen, Revisionskonflikte, Schutz bestehender Zuordnungen und serverseitige Löschprüfung bleiben unverändert.
- **PR #299 ist am 15.11.2026 gemergt** (Merge-Commit `092113f384413c87be70a0269e29f26c38e1e39e`). GitHub Actions: `bun run lint`, `bun run build`, `bun run test` mit 455/455 erfolgreich; PR-Vorlagenprüfung erfolgreich. Browser-/Responsive-/Keyboard-/Screenreader-QA bleibt offen.


## 15.11.2026 – Kursdetail und Nachweisaktion (PR #300)

- Die Erfassung eines Fortschrittsnachweises hält die Aktion bis zum Abschluss des Detail-Refreshs gesperrt; der Handler weist zusätzliche Requests ab, solange bereits gespeichert wird. Bei fehlgeschlagenem Refresh wird die veraltete Nachweisaktion nicht erneut angeboten; stattdessen erscheint der vorhandene Wiederholungs-Ladeweg für die Teilnahme.
- Lehrgangsdetails zeigen bei fehlender Kurzbeschreibung und leeren Lernzielen einen verständlichen Zustand statt eines leeren Textbereichs.
- Kurs-Suche erhält einen sichtbaren Hinweissatz statt eines Platzhalters als alleinige Suchanleitung. Suchlösch-, Filter- und Zurücksetzungsaktionen haben mindestens 44 px Zielhöhe.
- Keine Änderung an Nachweisregeln, Statuslogik, API, Rollen oder Datenmodell.
- **PR #300 ist am 15.11.2026 gemergt** (Merge-Commit `122de078f8e6336cb475b063c47ef19fca76e06d`). GitHub Actions: `bun run lint`, `bun run build`, `bun run test` mit 455/455 erfolgreich; PR-Vorlagenprüfung erfolgreich. Browser-/Responsive-/Keyboard-/Screenreader-QA bleibt offen.


## 15.11.2026 – Lehrgangsdetail: fehlende Kursreferenzen (PR #301)

- Pflicht- und Empfehlungskurse zeigen bei fehlendem Katalogeintrag einen verständlichen Hinweis statt der internen Kurs-ID. Die interne Kurs-ID bleibt ausschließlich technischer Schlüssel/Lookup und wird nicht als sichtbarer Fallback ausgegeben.
- Ein fehlender Fortschrittsdatensatz in einer bereits begonnenen Lehrgangsteilnahme wird nicht fälschlich als „Noch nicht begonnen“ ausgegeben; der Zustand wird als nicht verfügbar gekennzeichnet.
- Die Aktion „Zum Kurs“ erscheint nur, wenn ein passender Katalogeintrag vorhanden ist. Keine künstliche Kurs-Master-Instanz und keine erfundenen Veröffentlichungs-/Verfügbarkeitswerte.
- **PR #301 ist am 15.11.2026 gemergt** (Merge-Commit `44dcc3e487ff8e4747e264a4710bb3737fff0037`). GitHub Actions: `bun run lint`, `bun run build`, `bun run test` mit 455/455 erfolgreich; PR-Vorlagenprüfung erfolgreich. Browser-/Responsive-/Keyboard-/Screenreader-QA bleibt offen.


## 15.11.2026 – Academy-Navigation: Fokus nach Bereichswechsel (PR #302)

- Nach Auswahl einer Startkachel erhält der aktive Button der Academy-Hauptnavigation den Fokus. Nach Rückkehr zur Kachelansicht erhält die zuletzt verwendete Einstiegskachel den Fokus zurück.
- Dieselbe Fokusweitergabe wird für externe Sprünge in den Prüfungsbereich verwendet; normale Wechsel innerhalb der bestehenden Hauptnavigation behalten den Fokus auf dem ausgelösten Navigationsbutton.
- Bei einem neuen Prüfungsziel innerhalb des bereits aktiven Prüfungsbereichs wird der Fokus nicht ungefragt erneut verschoben.
- Umsetzung folgt aktueller Accessibility-Guidance für dynamische Navigation und Fokusreihenfolge: Home Office Accessibility Standard (WCAG 2.4.3) und VA.gov SPA-Fokusmanagement.
- Quellen: https://design.homeoffice.gov.uk/accessibility/standard/operable ; https://design.va.gov/accessibility/focus-management
- **PR #302 ist am 15.11.2026 gemergt** (Merge-Commit `5b87d423fa74a196b4ee2bb777e0303e96b36e4a`). GitHub Actions: `bun run lint`, `bun run build`, `bun run test` mit 455/455 erfolgreich; PR-Vorlagenprüfung erfolgreich. Manuelle Tastatur-/Screenreader-Abnahme bleibt offen.
- Diese Statussynchronisierung ist eine reine Dokumentationsänderung und verändert keinen Laufzeitcode.

## 16.11.2026 – Detailansichten in Kursen und Lehrgängen: Fokusführung (in Arbeit)

- Beim Öffnen eines Kurses oder Lehrgangs soll der Fokus auf dessen Detailüberschrift gesetzt werden, damit Screenreader- und Tastaturnutzende den Ansichtswechsel unmittelbar mitbekommen.
- Bei Rückkehr zum Katalog soll der Fokus zum zuvor aktivierten „Kurs ansehen“-/„Lehrgang ansehen“-Button zurückkehren. Falls der ursprüngliche Trigger nicht mehr im DOM vorhanden ist, dient das Suchfeld als Fallback.
- Keine Änderung an Informationsarchitektur, Kurs-/Lehrgangsregeln, Such-/Filterzustand oder Berechtigungen.
- **PR #304 ist am 16.11.2026 gemergt** (Merge-Commit `2c6711c33d42ad40498138dfe97eec1ff317baf2`). GitHub Actions: TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt Teil der späteren gemeinsamen QA.

## 16.11.2026 – Private Notizen: Fokusführung im Editor (in Arbeit)

- Beim Öffnen einer privaten Notiz soll der Fokus auf das Titelfeld wechseln, damit der Editorwechsel unmittelbar nachvollziehbar ist.
- Beim Abbrechen oder erfolgreichen Speichern kehrt der Fokus zum ursprünglichen „Bearbeiten“-Button der Notiz zurück. Falls dieser nicht mehr vorhanden ist, dient die Notizensuche als Fallback.
- Konflikt-, Save-, Lösch- und Privatheitslogik werden nicht verändert; keine private lokale Browserpersistenz.
- **PR #305 ist am 16.11.2026 gemergt** (Merge-Commit `43b7e16505244563ac771c38d69abcb31693fd5f`). GitHub Actions: TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt Teil der späteren gemeinsamen QA.

## 16.11.2026 – Materialverwaltung: Fokusführung im Editor (PR #306 gemergt)

- Beim Öffnen eines bearbeitbaren vorhandenen Materials aus der Liste oder beim Anlegen eines neuen Materials soll der Fokus zum Titelfeld wechseln; bei archivierten, schreibgeschützten Materialien auf die Editorüberschrift.
- Bei Rückkehr zur Materialübersicht wird der Fokus auf den ursprünglichen Listeneintrag bzw. die Schaltfläche „Neues Material anlegen“ zurückgeführt; falls der Eintrag nicht mehr existiert, dient die Schaltfläche als Fallback.
- Ein internes erneutes Laden des aktuell bearbeiteten Materials verschiebt den Fokus nicht ungefragt.
- Keine Änderung an Materialversionen, Veröffentlichung, Berechtigungen oder Datenmodell.
- **PR #306 ist am 16.11.2026 gemergt** (Merge-Commit `941c1a296961f5b457914f146222f20bf7dd9aac`). GitHub Actions: TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt Teil der späteren gemeinsamen QA.

## 16.11.2026 – Taxonomieverwaltung: Fokusführung in Kategorie- und Dokumenttypformularen (PR #307 gemergt)

- Beim Öffnen eines Kategorie- oder Dokumenttypformulars wird das Namensfeld fokussiert.
- Bei Rückkehr zur Übersicht wird der Fokus zum ursprünglichen Bearbeiten-Button zurückgeführt; beim Neuanlegen zur jeweiligen Neuanlegen-Schaltfläche. Falls der ursprüngliche Eintrag nicht mehr vorhanden ist, dient die Neuanlegen-Schaltfläche als Fallback; nur wenn diese nicht verfügbar ist, wird die Suche fokussiert.
- Keine Änderung an Taxonomie-, Archivierungs-, Lösch- oder Zuordnungsregeln.
- **PR #307 gemergt** (Merge-Commit `58b7abd47155e443b6e0316cb95d75e51aa4b2a9`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt Teil der späteren gemeinsamen QA.

## 16.11.2026 – Kurs-/Lehrgangsverwaltung: Fokusführung im Autoreneditor (PR #308 gemergt)

- Beim Öffnen eines neuen oder bestehenden Kurs-/Lehrgangsentwurfs wird der Fokus auf die jeweilige Editorüberschrift gesetzt.
- Bei Rückkehr zur Verwaltung oder nach erfolgreicher Veröffentlichung wird der Fokus zum ursprünglichen Auslöser zurückgeführt (Neuanlegen- oder „Entwurf bearbeiten“-Schaltfläche). Falls dieser nicht mehr vorhanden ist, wird die Verwaltungsüberschrift, danach die Suche fokussiert.
- Validierungsfehler setzen den Fokus auf die fokussierbare Fehlersammlung, damit die konkreten Korrekturhinweise unmittelbar erreichbar sind.
- Keine Änderung an Kurs-/Lehrgangsregeln, Veröffentlichungsabläufen, Berechtigungen oder Datenmodell.
- **PR #308 gemergt** (Merge-Commit `12a3b74f4b5882230234e340aa030d40fc84e8a1`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt Teil der späteren gemeinsamen QA.

## 16.11.2026 – Lernbibliothek: Fokusführung zwischen Katalog und Reader (PR #310 gemergt)

- Beim Öffnen eines Legacy- oder versionierten Materials aus dem Bibliothekskatalog wird der Fokus auf den geladenen Reader-Titel gesetzt. Bei einem Ladefehler wird stattdessen die Fehlermeldung fokussiert.
- Bei „Zurück zur Bibliothek“ kehrt der Fokus zum ursprünglich betätigten Materialöffnen-Button zurück; falls dieser nicht mehr vorhanden ist, wird das Suchfeld fokussiert.
- Auch bei zugriffsbeschränkten Legacy-Materialien bleibt ein ausdrücklicher Rückweg zur Bibliothek verfügbar.
- Die Auswahl eines anderen Materials innerhalb der Reader-Seitenleiste bleibt im bestehenden Reader-Kontext und verschiebt den Fokus nicht ungefragt.
- Suchbegriff, Filter, Sortierung und vorhandene Reader-/Textankerlogik bleiben unverändert.
- Keine Änderung an Materialzugriff, Rollen, Versionierung, privaten Notizen, Datenmodell oder PDF-Infrastruktur.
- **PR #310 gemergt** (Merge-Commit `1c98c6a07efd585d41a7185f64ccd01de23a187c`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt Teil der späteren gemeinsamen QA.

## 16.11.2026 – Kursmaterial-Reader: Fokusführung beim Öffnen und Zurückkehren (PR #311 gemergt)

- Beim Öffnen eines Kursmaterials wird zunächst der Ladezustand, nach erfolgreichem Laden der Materialtitel fokussiert; bei einem Ladefehler die sichtbare Fehlermeldung.
- Der aktuell geöffnete Eintrag wird als nicht-interaktiver Zustand „Geöffnet“ angezeigt, statt den fokussierten Öffnen-Button nativ zu deaktivieren.
- „Zur Materialliste“ führt den Fokus zum ursprünglichen Materialöffnen-Button zurück; falls dieser nicht mehr existiert, wird die Materiallistenüberschrift fokussiert.
- Keine Änderung an Materialzugriff, Kursversion-Pinning, Readerposition, Textankern, Notizen oder Datenmodell.
- **PR #311 gemergt** (Merge-Commit `0a12f05214e72340888ca7ad75d5e0b327775502`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt Teil der späteren gemeinsamen QA.

## 16.11.2026 – Prüfungsrunner: Fokus bei Frage-, Abgabe- und Rückkehrwechseln (PR #312 gemergt)

- Beim Start/Fortsetzen eines Versuchs wird die aktuelle Frage fokussiert; beim Wechsel über Fragenübersicht, „Zurück“ oder „Nächste Frage“ wird die neue Frageüberschrift fokussiert.
- Nach erfolgreicher Abgabe (auch automatischer Abgabe bei Zeitablauf) wird der Ergebnistitel fokussiert.
- Bei Rückkehr zur Prüfungsübersicht wird deren Überschrift fokussiert.
- Scheitert der verbindliche Start nach der Bestätigungsansicht, kehrt der Fokus zum Startbutton zurück.
- Keine Änderung an Start-/Versuchs-/Zeitlimit-/Autosave-/Abgabe-/Bewertungslogik, Datenverträgen oder Berechtigungen.
- **PR #312 gemergt** (Merge-Commit `d7f32c0e3ad29707baf604ea111d22d400ad757f`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Prüfung mit echten Versuchen bleibt Teil der späteren QA.

## 16.11.2026 – Prüfungsbewertungen: Fokus beim Öffnen aus Teilnehmerkontext (PR #313 gemergt)

- Wird eine konkrete Bewertung aus einem Teilnehmer-/Prüfungskontext geöffnet, scrollt die Review-Queue nicht nur zum passenden Vorgang, sondern fokussiert auch dessen Überschrift.
- Die Änderung ist rein clientseitig; Review-Zuweisung, Berechtigungen, Notenentwürfe, Autosave, Freigabe und Datenzugriffe bleiben unverändert.
- **PR #313 gemergt** (Merge-Commit `4a416028431120d698667511460045f134afaa43`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Abnahme mit realen Reviewer-Rollen bleibt Teil der späteren QA.

## 16.11.2026 – Teilnehmerakte: Fokus beim Öffnen und Schließen (PR #314 gemergt)

- Beim Öffnen einer Teilnehmerakte wird deren Überschrift fokussiert, damit die dynamisch eingeblendete Historie direkt wahrgenommen wird.
- Beim Schließen der Akte kehrt der Fokus zum Teilnehmer-Suchfeld zurück.
- Keine Änderung an Teilnehmerhistorie, serverseitigen Sichtbarkeitsregeln, Reviewer-Berechtigungen oder Datenzugriff.
- **PR #314 gemergt** (Merge-Commit `a2c869b26da66e6b7458adc3b9ad589cfb206438`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Reviewer-Rollen-QA bleibt Teil der späteren Abnahme.

## 16.11.2026 – Prüfungsreview-Queue: Fokus nach Zuständigkeits- und Bewertungsaktionen (in Arbeit)

- Nach erfolgreichem Beanspruchen oder Freigeben eines Vorgangs wird dessen Überschrift fokussiert. Dasselbe gilt nach Übergabe/administrativer Neuzuweisung, sofern der Vorgang weiterhin in der gefilterten Queue sichtbar ist.
- Nach erfolgreichem Abschluss einer Bewertung oder wenn der betroffene Vorgang durch Filterung nicht mehr sichtbar ist, wird die Überschrift der Review-Queue fokussiert.
- Fokus wird erst nach dem abgeschlossenen Queue-Refresh gesetzt, damit kein bereits veralteter oder gleich wieder entfernter Auslöser fokussiert wird.
- Keine Änderung an Zuständigkeiten, Rollen, Berechtigungen, Autosave, Noten, Freigabe oder Datenzugriff.
- PR #315: `a11y/exam-review-queue-action-focus`; das passende `fix`-Label ist gesetzt. GitHub Actions laufen; manuelle Abnahme mit realen Reviewer-Rollen bleibt Teil der späteren QA.

## 17.11.2026 – Kurs-/Lehrgangsautoren: Fokus nach erfolgreicher Neuanlage (in Arbeit)

- Beim erstmaligen Speichern eines neuen Kurses wechselt der Editor von „Neuen Kurs anlegen“ in den regulären Kursentwurf. Der vorherige Fokus lag auf dem Submit-Button des Neuanlageformulars; nach dem Wechsel wurde bislang kein neuer Fokus gesetzt.
- Gleiches gilt für die Neuanlage eines Lehrgangs.
- Nach erfolgreicher Erstellung wird deshalb der Fokus explizit auf die Editorüberschrift gesetzt. Die bestehende Fokuslogik für das Öffnen/Schließen des Editors bleibt erhalten.
- Keine Änderung an Validierung, API-Aufrufen, Entwurfsstatus, Veröffentlichung oder fachlichen Kurs-/Lehrgangsregeln.
- **PR #318 ist am 17.11.2026 gemergt** (Merge-Commit `cce5ff444a82a93ad10332fea521293b9e7bc645`). GitHub Actions: TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Manuelle Tastatur-/Screenreader-Abnahme bleibt Teil der späteren QA.

## 17.11.2026 – Kurs-/Lehrgangsautoren: Fokus nach Entfernen dynamischer Einträge (PR #319 gemergt)

- Beim Entfernen eines Lernziels, Kapitels oder einer Kurszuordnung wird das betätigte Bedienelement aus dem DOM entfernt. Ohne Fokuswiederherstellung kann der Tastaturfokus auf das Dokument zurückfallen.
- Nach dem Entfernen wird deshalb der nächste Eintrag fokussiert, ersatzweise der vorherige. Wenn kein Eintrag verbleibt, wird das passende Hinzufügen-/Auswahlfeld fokussiert.
- Dies gilt für Kurslernziele, Kurskapitel, Kapitelmaterialien, Lehrgangslernziele und Kurszuordnungen.
- Keine Änderung an fachlichen Validierungs-, Zuordnungs-, Abschluss- oder Datenregeln.
- **PR #319 ist am 17.11.2026 gemergt** (Merge-Commit `1cecfa6b864bf92e9cd2cd34b52f64114b0652bc`). GitHub Actions: TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Manuelle Keyboard-/Screenreader-Abnahme später.

## 17.11.2026 – Prüfungsrunner: serverbestätigte Antworten und Fortschritt (in Arbeit)

- Der sichtbare beantwortete Fortschritt muss ausschließlich auf dem vom Server bestätigten Antwort-Snapshot beruhen, nicht auf lokalen Eingaben.
- Lokale Abweichungen gegenüber dem bestätigten Snapshot werden je Frage als ausstehend bzw. fehlgeschlagen angezeigt; bereits gespeicherte Antworten bleiben erkennbar.
- Autosave-Antworten werden mit dem gesendeten Snapshot verglichen. Bei einem abweichenden neueren Serverstand werden weitere automatische Saves blockiert, damit ein anderer Tab-/Serverstand nicht überschrieben wird.
- Die Änderung betrifft clientseitige Darstellung und Save-Queue-Verhalten; Server-Autosave, Abgabe, Bewertung und Datenverträge bleiben unverändert.
- **PR #320 bleibt Draft**, da dies eine Datenintegritätsänderung ist und gemäß `CONTRIBUTOR_ROLES.md` vor Merge eine unabhängige Prüfung durch eine andere beteiligte Instanz oder den Projektinhaber benötigt. Manuelle Prüfung mit echten Versuchen bleibt zusätzlich offen.


## 17.11.2026 – Prüfungsmodus und verbindliche Startbestätigung (in Arbeit)

- Der Start-/Fortsetzungsdialog des versionierten Prüfungsrunners wird als blockierender Dialog mit `role=dialog`, `aria-modal`, Fokusbindung, Escape-Abbruch und sichtbarer Rückkehraktion umgesetzt; Hintergrundinteraktionen sind während der Entscheidung überlagert.
- Während eines aktiven Versuchs wird die globale Portalnavigation gesperrt: Sidebar ist inert, mobile Schnellnavigation und Command Palette sind deaktiviert, Tastenkürzel öffnen keine globale Suche, und Navigationscallbacks blockieren Bereichswechsel.
- Beim Verlassen/Neuladen der Browserseite erscheint eine Browserwarnung. Das ist eine Schutzmaßnahme gegen versehentliches Verlassen, keine technisch garantierte Sperre gegen bewusstes Schließen oder einen Geräte-/Browserabbruch.
- Vorhandene serverseitige Autosaves und Zeitlimits bleiben maßgeblich. Der Versuch wird nicht durch bloßes Verlassen zurückgesetzt.
- **Fachlich offen:** Prüfungen mit `timeLimitMinutes = 0` haben keine serverseitige Deadline und können aktuell nach einer Unterbrechung später fortgesetzt werden. Ein verbindliches Ende bei Unterbrechung bzw. eine maximale Fortsetzungsfrist benötigt eine gesonderte fachliche Festlegung; keine willkürliche Frist wird eingeführt.
- Die ältere `AcademyExamDoc`-Übungstest-/Abschlussprüfungsfamilie bleibt getrennt. Die Planung verbietet eine Zusammenführung/Entfernung ohne eigene Daten-/Workflowanalyse (siehe ACADEMY-SUBPAGE-REDESIGN.md, Abschnitt Prüfungszentrum).
- Forschungsgrundlage für Tastatur-/Dialogverhalten: WCAG 2.2 SC 2.1.1 (Keyboard), 2.4.7 (Focus Visible), 2.4.11 (Focus Not Obscured – Minimum) und 2.2 (Enough Time): https://www.w3.org/TR/WCAG22/
- **PR #322 ist am 17.11.2026 gemergt** (Merge-Commit `aedc1f647fd53ce5e18747688c17f4c15d7a6801`). GitHub Actions: TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Manuelle Prüfung mit Tastatur, Screenreader, Mobilansicht und echten Prüfungsversuchen bleibt Teil der späteren QA.


## 17.11.2026 – Verbindliche Abgabebestätigung im Prüfungsrunner (in Arbeit)

- Beide manuellen Abgabeaktionen öffnen denselben Bestätigungsdialog. Eine direkte manuelle Abgabe ohne Bestätigung ist nicht mehr möglich.
- Der Dialog zeigt die Zahl beantworteter und unbeantworteter Fragen und weist ausdrücklich darauf hin, dass unbeantwortete Fragen ohne Antwort eingereicht werden und nach Abgabe keine Änderungen mehr möglich sind.
- Der endgültige Bestätigungsbutton löst weiterhin den vorhandenen serverseitigen Save-/Submit-Ablauf aus. Automatische Zeitablauf-Abgabe bleibt ohne zusätzliche Bestätigung, da die Deadline serverseitig verbindlich ist.
- Bei fehlgeschlagener Speicherung/Abgabe bleibt der Dialog mit Fehlermeldung offen; eine erneute Abgabe ist möglich. Abbruch per Escape oder „Weiter prüfen“ führt den Fokus zur auslösenden Abgabeaktion zurück.
- Keine Änderung an Bewertung, Punkteberechnung, Versuchsregeln oder Datenverträgen.
- **PR #323 ist am 17.11.2026 gemergt** (Merge-Commit `508d50bde6b256ba7d95da9cf0eb83fd7164a3c2`). GitHub Actions: TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Spätere Keyboard-/Screenreader-/Mobil-QA bleibt offen.


## 17.11.2026 – Fragenübersicht: responsive Disclosure und Markierungen (in Arbeit)

- Unter 1024 CSS-Pixeln wird die Fragenübersicht als native `details/summary`-Disclosure zunächst eingeklappt. Nach Auswahl einer Frage klappt sie auf kleinen Viewports wieder zu; die Frage bleibt im Fokus. Ab 1024 CSS-Pixeln bleibt die Übersicht als offene Seitenleiste sichtbar.
- Fragen können für die spätere Kontrolle markiert und entmarkiert werden. Die Übersicht zeigt Markierung und Beantwortungsstatus unabhängig voneinander und nicht ausschließlich über Farbe; Screenreader-Beschriftungen enthalten beide Zustände.
- Die Abgabebestätigung zeigt zusätzlich Anzahl und Nummern markierter Fragen. Markierungen sind Merkhilfen, keine Antworten.
- **Begrenzung:** Markierungen werden derzeit nur im Speicher der geöffneten Prüfungsansicht gehalten und nicht serverseitig persistiert. Sie gehen bei Neuladen/Neustart/erneuter Fortsetzung verloren; dies wird in der Oberfläche kenntlich gemacht. Keine Datenmodelländerung ohne gesonderten Beschluss.
- Forschungsgrundlage: WCAG 2.2 Keyboard (2.1.1), Focus Visible (2.4.7), Focus Not Obscured (2.4.11) und Target Size Minimum (2.5.8): https://www.w3.org/TR/WCAG22/
- **PR #324 ist am 17.11.2026 gemergt** (Merge-Commit `58a8c17af4ab73c9725f3fdea270ba20bc742e23`). GitHub Actions: TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung erfolgreich; Render-Deploy-Hook übersprungen. Manuelle 320/375/768/1024px-, Keyboard- und Screenreader-QA später.


## 17.11.2026 – Kursabschlussprüfung direkt aus Kursbedingungen öffnen (PR #325 gemergt)

- Bei einer offenen `required_assessment`-Abschlussbedingung führt eine kontextuelle Aktion direkt in das Prüfungszentrum.
- Die exakte Prüfungs-ID und der Kurscode werden übergeben. Der Prüfungsrunner wählt nur dann automatisch aus, wenn die Prüfung im aktuellen freigegebenen Teilnehmerkatalog enthalten und genau diesem Kurskontext zugeordnet ist.
- Nicht verfügbare oder falsch zugeordnete Prüfungen werden neutral erklärt; es wird keine nicht freigegebene Prüfung offengelegt und kein anderer Kurskontext stillschweigend verwendet.
- Bei automatischer Vorauswahl wird der erste gültige Kurskontext mitgesetzt, damit „Prüfung starten / fortsetzen“ direkt nutzbar bleibt.
- **PR #325 ist am 17.11.2026 gemergt** (Merge-Commit `30736b88a2f9cee8432ec8b8b5ddcf7e35a0255c`); TypeScript/Lint, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung waren erfolgreich. Render-Deploy-Hook übersprungen. Manuelle Kurs-/Prüfungsnavigation bleibt offen.


## 17.11.2026 – CI-Abhängigkeit csstype (PR #327 gemergt)

- GitHub Actions konnte die transitive Abhängigkeit `csstype-3.2.4.tgz` wiederholt nicht laden (npm-Registry HTTP 404).
- Gezielter Override auf veröffentlichte Version `3.2.3`; keine Laufzeitänderung.
- **PR #327 ist am 17.11.2026 gemergt**; der nachfolgende Build-/Testlauf von PR #329 auf dem resultierenden `main`-Stand war erfolgreich. Keine Laufzeitänderung.


## 17.11.2026 – Einheitliche Academy-Aktionsdialoge (PR #329 gemergt)

- Sämtliche in den Academy-Oberflächen gefundenen nativen `window.confirm`-/`window.prompt`-Aufrufe wurden durch einen gemeinsamen In-App-Dialog ersetzt.
- Betroffen sind Academy-Navigation, Lernfortschritt, private Notizen, Materialverwaltung, Kategorien, Dokumenttypen, Kurs-/Lehrgangsverwaltung und Prüfungswerkstatt.
- Eingaben wie Archivierungsgründe und die exakte Namensbestätigung erhalten Inline-Validierung; Escape bricht ab. Der native HTML-Dialog sperrt den Hintergrund und stellt einen Fokuskontext bereit.
- **PR #329 ist am 17.11.2026 gemergt** (Merge-Commit `c9d31aac2ca11c31caeee587ca0ef406c0959a12`). TypeScript/Lint, Produktionsbuild, Tests und PR-Vorlagenprüfung waren erfolgreich. Die manuelle Keyboard-/Screenreader-/Mobilabnahme bleibt Teil der Gesamtabnahme.


## 18.11.2026 – Prüfungsvoraussetzungen verständlich anzeigen (in Arbeit)

- Die Prüfungsdetailansicht und die verbindliche Start-/Fortsetzungsbestätigung zeigen die konkret konfigurierten Voraussetzungen statt nur eines pauschalen Hinweises.
- Für Vorprüfungen wird nur dann ein Titel angezeigt, wenn diese Prüfung im Teilnehmerkatalog sichtbar ist. Nicht sichtbare Prüfungen erhalten eine generische Bezeichnung, damit keine nicht freigegebenen Prüfungsnamen offengelegt werden.
- Der Modus „abgeschlossen“ oder „bestanden“ sowie eine konfigurierte Mindestpunktzahl werden verständlich formuliert.
- Die UI leitet daraus keinen individuellen Erfüllungsstatus ab. Der Server bleibt für die tatsächliche Startfreigabe autoritativ.
- Umsetzung auf aktuellem `main`, Branch `feat/exam-prerequisites-current-main`; CI/Review ausstehend.


## 17.11.2026 – Prüfungsrunner: serverbestätigter Antwortfortschritt (PR #330 gemergt)

- Der Fortschritt zählt nur Antworten aus dem bestätigten Server-Snapshot. Lokale Änderungen werden getrennt als ausstehend/fehlgeschlagen dargestellt.
- Autosave-Antworten werden mit dem gesendeten Snapshot verglichen. Bei einem abweichenden/neuerem Serverstand werden weitere automatische Saves blockiert, damit kein fremder Stand überschrieben wird.
- Bereits gespeicherte Antworten bleiben sichtbar, wenn eine spätere Änderung fehlschlägt; boolesches `false` ist eine gültige Antwort, leere Texte/Listen sind unbeantwortet.
- **PR #330 ist am 17.11.2026 gemergt** (Merge-Commit `a1c20706616332b26d7b4dfa6002cbf3fa0d76b1`). GitHub Actions: TypeScript/Lint, Produktionsbuild, Tests und PR-Vorlagenprüfung erfolgreich. Kein Render-Deploy-Hook durch PR-Merge.
- **Noch offen:** manuelle echte Versuche, parallele Tabs, Netzwerkunterbrechung und Fortsetzung; diese Szenarien gehören zur abschließenden Academy-Abnahme.


## 22.11.2026 – Wiederaufnahme nach PR #345

- Verifizierter aktueller `main`-Stand: `4823ee0bfadeb69d584e6c2cbf7e60add7077cf7` (PR #345). Keine offenen Pull Requests.
- Der zuvor als offen geführte Gruppenablauf ist seit PR #338 integriert; die Nachkorrekturen aus PR #340 sowie Teilnahme-Lebenszyklus und Historienvalidierung aus PR #343/#344 sind ebenfalls integriert. Die ältere Liste offener Arbeiten wurde entsprechend bereinigt.
- Wiederqualifizierung: technische CI-/Integrationsprüfungen sind erfolgreich; manuelle Browser-/Responsive-/Keyboard-/Screenreader-/Live-Firestore-Abnahme bleibt offen. Die Benachrichtigungszustellung hat einen wiederholbaren Versuch beim Laden der Teilnehmeraufgaben, aber keine unabhängig laufende, dauerhaft überwachte Hintergrund-Outbox. Diese Einschränkung bleibt offen und darf nicht als vollständig gelöst dargestellt werden.
- Nächste Entwicklungsarbeit: systematischer Fehler-/Funktionsaudit der bereits implementierten Academy-Module. Persönliche Empfehlungen sind noch nicht implementiert; vor dem Datenmodell müssen die in `OPEN-QUESTIONS.md` genannten Punkte (Platzierung, automatische Auslöser/Nachweise, Rechte) geklärt werden. Kursmeldungen bleiben wegen ungeklärter Quelle und Erstellungs-/Rücknahmerechte unangetastet.


### 22.11.2026 – Kleiner Verständlichkeitsfehler in der Gruppenanordnung behoben

- Im Verwaltungsformular war der erklärende Satz trotz Mehrfachauswahl noch im Singular formuliert. Das konnte den Eindruck erwecken, dass nur eine Person ausgewählt werden kann.
- Die Beschreibung nennt jetzt ausdrücklich mehrere mögliche Teilnehmer und erklärt, dass für jede Person eine eigene Teilnahme angelegt wird und frühere Abschlüsse erhalten bleiben.
- Dies ist eine reine Textkorrektur; Datenmodell, API-Vertrag, Berechtigungen und fachlicher Ablauf bleiben unverändert. Der breitere Funktions-/Fehleraudit läuft weiter.


## 22.11.2026 – Wiederqualifizierungs-Berechtigungen durch HTTP-Regressionstests abgesichert (PR #348)

- Der Kandidaten-Endpunkt ist für berechtigte Kursverantwortliche des konkreten Kurses zugänglich. Unbeteiligte Kursverantwortliche und normale Teilnehmer erhalten keinen Zugriff.
- Die Gruppenanordnung wird zusätzlich mit einem zugewiesenen Kursverantwortlichen statt nur mit einem Admin ausgeführt. So wird die beabsichtigte Kurszuständigkeit serverseitig gegen Rückfälle abgesichert.
- Die Kandidatenliste enthält nur Personen mit einem gültigen früheren Abschluss; Teilnehmer ohne abgeschlossenen Kursverlauf werden ausgeschlossen.
- PR #348 ist gemergt. CI auf dem PR-Stand und der Post-Merge-Workflow auf `main` waren erfolgreich: TypeScript-/Produktionsbuild, vollständige Testsuite und PR-Vorlagenprüfung. Der optionale Render-Deploy-Hook lief erfolgreich durch; daraus wird kein manueller Live-Abnahmestatus abgeleitet.
- Keine Laufzeitänderung in diesem PR; die bestehende Zugriffskontrolle wurde mit HTTP-Regressionstests abgesichert.


## 22.11.2026 – Prüfungs-Korrekturhistorie verständlicher darstellen (Audit-Folgearbeit)

- Der Codeaudit der Prüfungsbewertung hat bestätigt: Bewertungsentwürfe liegen im jeweiligen Versuchsdokument; die finale manuelle Bewertung aktualisiert Status, Punkte und Reviewer in einer Repository-Transaktion. Die Teilnehmer-Ergebnisprojektion basiert auf gespeicherten Versuchen; vor Freigabe werden keine internen Bewertungsdetails offengelegt. Die öffentliche Projektion von Kursabschlussprüfungen unterdrückt Einzelfragen. Korrekturen sind serverseitig auf Admins/Colonels beschränkt.
- Die Abfrage abgeschlossener manueller Bewertungen umfasst nur abgeschlossene Versuche mit manuell bewerteten Freitextfragen, schließt offene Revisionsanfragen aus und sortiert nach tatsächlichem Bewertungsabschluss (`reviewedAtIso`). Die technische Obergrenze von 1.000 Datensätzen bleibt ein dokumentierter Skalierungsprüfpunkt.
- **Bestätigter Verständlichkeitsmangel:** Die bisherige Korrekturhistorie zeigte interne Reviewer-UIDs und unbeschriftete Punktelisten. Das ist für eine Verwaltungsansicht zwar technisch nachvollziehbar, aber ohne Kenntnis interner Kennungen unnötig schwer zu lesen.
- PR #349 ist in `main` integriert. Die Korrekturhistorie zeigt Namen/Dienstnummern aus dem vorhandenen Personalbestand und ordnet vorherige/neue Punkte konkreten Fragen zu. Fehlt ein Profil, wird neutral „Name nicht verfügbar“ angezeigt. Keine API-, Datenmodell- oder Berechtigungsänderung.
- CI auf dem finalen PR-Head und Post-Merge-Workflow erfolgreich: TypeScript-/Produktionsbuild und 474/474 Tests; PR-Vorlagenprüfung erfolgreich. Der optionale Render-Deploy-Hook ist nicht gesetzt; der Workflow meldet automatischen Render-Deploy über den `main`-Branch. Manuelle Browser-/Screenreader-Abnahme bleibt Teil der gemeinsamen Academy-Abnahme.
