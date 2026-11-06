# RCPD – Modul-Inventar und UX-Audit-Register

**Stand:** 06.11.2026  
**Zweck:** Vollständige Landkarte der Portalbereiche als Grundlage für das Redesign. Diese Datei trennt bekannte Bestandsinformationen, vorläufige Auditbeobachtungen, bestätigte Entscheidungen und noch nicht konzipierte Bereiche.

## Statuslegende

- **Inventarisiert:** Bereich wurde als Teil des Portals identifiziert.
- **Teilweise geprüft:** Erste Repository-/Gesprächsprüfung liegt vor, aber kein vollständiges UX-Audit.
- **Konzeptionell beschlossen:** Fachliche Zielentscheidungen liegen vor.
- **Offen:** UX-/Funktionskonzept noch zu erarbeiten.
- **Technischer Befund – erneut prüfen:** ältere Beobachtung, vor Umsetzung am aktuellen Code/Commit verifizieren.

## 1. Globaler Rahmen

| Bereich | Bekannter Bestand / Gesprächsstand | Redesignstatus |
|---|---|---|
| App-Shell / globaler Rahmen | zentrale App-Struktur in `App.tsx`; bestehende globale Navigation und Styles | Teilweise geprüft; Informationsarchitektur offen |
| Sidebar / Header / Tabs | frühe Bestandsnotiz: Desktop-Sidebar und obere Schnellzugriffe; mobil horizontale Tabs | Vorläufige Beobachtung, aktuell verifizieren; Zielmodell offen |
| Command Palette | Ctrl+K wurde als mögliches Muster erwähnt | Nicht als neue Funktion beschlossen; Nutzen/Redundanz/A11y prüfen |
| Suche / Schnellzugriff | modulübergreifende Auffindbarkeit relevant | Umfang und Muster offen |
| Rollenorientierte Navigation | Sichtbarkeit muss bestehende Berechtigungen abbilden | Beschlossenes Prinzip; konkrete IA offen |
| Light/Dark Mode | bestehende CSS-/Theme-Overrides in früher Bestandsnotiz erwähnt | Technischen Bestand prüfen; konsistentes Designsystem offen |
| Responsive Verhalten | Desktop und Mobile sollen eigenständig geprüft werden | Audit erforderlich |

## 2. Dashboard / Startseite

**Status:** Inventarisiert, Zielkonzept offen.

Zu prüfen:
- rollenabhängige Startansichten und Prioritäten;
- Aufgaben/Handlungsbedarf vs. reine Kennzahlen;
- Verknüpfung zu Anträgen, Nachrichten, Academy, Prüfungen und Kalender;
- Vermeidung doppelter Fortschrittsdarstellungen mit Professional Development/Academy;
- autoritative Datenquelle für jeden angezeigten Status;
- tatsächliche Fristen und Prioritäten statt erfundener Dringlichkeit;
- Berechtigungsfilter und mobile Informationshierarchie.

**Vorläufige Auditnotiz:** Dashboard und Professional-Development-/Academy-Fortschritt könnten ähnliche Informationen zeigen. Eine einzige maßgebliche Fortschrittsquelle ist zu bestimmen; Dashboard darf nicht ein zweites, abweichendes Fortschrittsmodell erzeugen.

**Nicht beschlossen:** konkrete Widgets, Karten, Kennzahlen, Anordnung oder Personalisierungsfunktionen.

## 3. Ankündigungen

**Status:** Inventarisiert, UX-Konzept offen.

Zu prüfen:
- offizielle organisationsweite Meldung vs. persönliche Nachricht vs. Systemnotification;
- Zielgruppe, Sichtbarkeit, Veröffentlichungsstatus und Lesestatus;
- ungelesene Inhalte ohne falsche pauschale Markierung;
- Archivierung und Auffindbarkeit älterer Ankündigungen;
- Rollen-/Berechtigungsgrenzen und mobile Lesbarkeit.

Keine zusätzlichen Lesebestätigungen oder Eskalationsmechaniken ohne fachlichen Bedarf beschließen.

## 4. Nachrichten

**Status:** Inventarisiert, UX-Konzept offen.

Zu prüfen:
- Konversations-/Empfängerstruktur und Rollenrechte;
- Lesestatus, ungelesene Zähler, Direktnavigation;
- Trennung von Ankündigungen und automatischen Benachrichtigungen;
- Vertraulichkeit, Verlauf, Suche und mobile Bedienung;
- sinnvolle Rückkehr zum Nachrichtenkontext.

Keine neuen Kommunikationsfunktionen aus bloßen UI-Ideen ableiten.

## 5. Benachrichtigungen

**Status:** Teilweise geprüft.

**Vorläufiger technischer Hinweis:** Per-user Read-State ist in einer früheren Bestandsaufnahme als vorhanden notiert; vor Umsetzung aktuell verifizieren.

Zu prüfen:
- Ereignisse, die tatsächlich eine Notification auslösen;
- Deduplizierung, Gruppierung, Priorisierung und Read-State;
- direkte Verlinkung zum Vorgang;
- Abgrenzung zu Ankündigungen und Nachrichten;
- Dashboard-Zähler vs. Notification-Center;
- keine Notification für jede triviale Statusänderung.

**Verbindliche Academy-Sonderregel:** Kursmeldungen bleiben einzeln ungelesen; bloßes Öffnen eines Kurses/Meldungsmenüs setzt nicht alle Meldungen auf gelesen. Siehe `DECISIONS.md`.

## 6. Anträge / administrative Vorgänge

**Status:** Inventarisiert, vollständiges Audit offen.

Zu prüfen:
- vorhandene Antragstypen und Datenfelder;
- Einreichung, Rückfrage, Bearbeitung, Genehmigung/Ablehnung;
- Statusübergänge und nächste Handlung;
- Bearbeiter-/Verantwortlichkeitsanzeige;
- Historie und Benachrichtigungen;
- vertrauliche Inhalte und rollenabhängige Sichtbarkeit;
- Kalender-/Fristenverknüpfung nur auf Grundlage tatsächlicher Daten.

Keine neuen Freigabestufen, Antragstypen oder Rollen ohne Beschluss.

## 7. Kalender

**Status:** Inventarisiert, vollständiges Audit offen.

Zu prüfen:
- Termine, Fristen, Veranstaltungen und persönliche Erinnerungen unterscheiden;
- Datenquellen, Zeitzonen, Ganztagstermine und wiederkehrende Termine;
- Rollen-/Gruppensichtbarkeit und Bearbeitungsrechte;
- Verknüpfungen mit Anträgen, Ausbildung und Prüfungen;
- mobile Kalenderbedienung.

Keine Frist aus einem beliebigen Zeitstempel ableiten; keine Erinnerungsautomatik ohne Beschluss.

## 8. Personalverwaltung

**Status:** Inventarisiert, vollständiges Audit offen.

Zu prüfen:
- vorhandene Profil-/Stammdaten, Rang-/Dienstinformationen und Status;
- Suche, Filter, Detailansicht und administrative Aktionen;
- Kontoverwaltung, Zuordnung, Statusänderungen und Historie;
- wer welche Informationen lesen/bearbeiten darf;
- Abgrenzung zu Whitelist und Zugangsdaten;
- Auswirkungen von Profiländerungen auf historische Vorgänge.

Keine neuen Personalattribute, Hierarchien, Bewertungen oder Berechtigungen aus UX-Erwägungen erfinden.

## 9. Berichte / Auswertungen

**Status:** Inventarisiert, konkrete Inhalte offen.

Zu prüfen:
- welche verlässlichen Daten bereits vorhanden sind;
- tatsächliche Kennzahlen und deren Definition;
- Filter, Zeiträume, Rollen- und Gruppensichten;
- Exportmöglichkeiten nur soweit vorhanden/technisch freigegeben;
- Datenschutz, Datenminimierung und Interpretation.

Keine Kennzahl oder Leistungsbewertung ohne fachliche Definition und zuverlässige Daten.

## 10. Audit-Log / Aktivitätsverlauf

**Status:** Inventarisiert, Abgrenzung zu Berichten offen.

Zu prüfen:
- welche sicherheits-/fachlich relevanten Ereignisse protokolliert werden;
- Akteur, Zeit, Vorgang, Aktion, Ergebnis und Begründung soweit relevant;
- Zugriff auf vertrauliche Historien;
- Korrekturen, administrative Neuzuordnungen und Freigaben;
- Datenminimierung und Aufbewahrung.

Audit-Verlauf ist Nachweis relevanter Ereignisse, kein Sammelbecken für unnötige Klick-/Verhaltensdaten. Berichte und Audit-Log sind nicht gleichzusetzen.

## 11. Whitelist / Zugangs- und Freigabeverwaltung

**Status:** Inventarisiert, fachlicher Ablauf offen.

Zu prüfen:
- Zweck und Abgrenzung zu Personal-/Kontostatus;
- Statuswerte und reale Freigabeschritte;
- Verantwortlichkeit, Rückfragen, Historie;
- Rollen-/Berechtigungsgrenzen;
- Vermeidung doppelter Statusdarstellung.

Keine neue automatische Freigabe- oder Bewertungssystematik ohne ausdrücklichen Beschluss.

## 12. Deployment / Betriebsverwaltung

**Status:** Inventarisiert, vollständiges UX-/Sicherheitsaudit offen.

Zu prüfen:
- welche administrativen Betriebsaktionen und Statusanzeigen existieren;
- wer diese sehen/ausführen darf;
- Trennung von rein informativen Anzeigen und tatsächlichen Eingriffen;
- Bestätigungen und Schutz vor Fehlbedienung;
- sensible Konfigurationen und Geheimnisse.

Keine zusätzlichen produktiven Eingriffsmöglichkeiten durch ein Redesign schaffen.

## 13. Login / Kontozugang / Einstellungen

**Status:** Inventarisiert, vollständiges Audit offen.

Zu prüfen:
- Login, Session, Fehler- und Wiederherstellungszustände;
- Kontoeinstellungen vs. administrative Kontoverwaltung;
- Passwort-/Sitzungssicherheit und verständliche Fehlermeldungen;
- Darstellungseinstellungen, Dark Mode und responsive Bedienung;
- Auswirkungen von Kontolöschung/Deaktivierung auf Historien.

Sicherheitsregeln und Session-Logik bleiben unverändert, sofern keine gesonderte technische Freigabe erfolgt.

## 14. Academy

**Status:** Detailliert konzipiert, aber Gesamtplanung noch nicht abgeschlossen.

Unterbereiche:
- Academy-Übersicht;
- Programme und Kurse;
- Lernbibliothek, Dokumentverwaltung und Reader;
- persönliche Notizen und Lesezeichen;
- Teilnehmerprüfungen;
- Examiner/Grading Workspace;
- Empfehlungen und Kursmeldungen;
- Ergebnisfreigabe und Historien.

Die verbindlichen Detailentscheidungen stehen in `DECISIONS.md`. Die wichtigsten noch offenen Punkte stehen in `OPEN-QUESTIONS.md`.

## 15. Prüfungswerkstatt / Examiner

**Status:** Fachlich sehr detailliert konzipiert; technische Spezifikation separat vorhanden.

- Examiner ist in Academy integriert und rollen-/berechtigungsabhängig.
- Die Admin-Prüfungswerkstatt hat eine eigene technische Spezifikation: `docs/EXAM_WORKSHOP_ARCHITECTURE_V3.8.md`.
- Spezifikation, aktueller Code und fachlicher Beschlussstatus müssen getrennt betrachtet werden.
- Draft-Speicherung einzelner Bewertungen ist als Konzept beschlossen, benötigt laut bisheriger Prüfung aber Backend-Erweiterung.
- Ergebnisfreigabe-Default bleibt offen.

## 16. Übergreifende UX-Audit-Matrix

Für jedes Modul ist mindestens zu dokumentieren:

| Prüffeld | Leitfrage |
|---|---|
| Zweck | Welche konkrete Nutzeraufgabe löst der Bereich? |
| Rollen | Wer nutzt ihn tatsächlich und mit welchen bestehenden Rechten? |
| Einstieg | Woher kommen Nutzer in den Bereich? |
| Informationshierarchie | Was muss sofort sichtbar sein, was nur bei Bedarf? |
| Aktionen | Welche primären/sekundären Aktionen gibt es? |
| Zustände | Loading, Empty, Error, Locked, Pending, Completed, Archived etc. – nur wenn fachlich vorhanden |
| Daten | Welche Felder/Datenquellen existieren tatsächlich? |
| Abhängigkeiten | Welche anderen Module/Workflows sind betroffen? |
| Desktop | Bedienbarkeit bei breiter Arbeitsfläche |
| Mobile | Eigenständige, sinnvolle mobile Bedienung |
| Accessibility | Tastatur, Fokus, Labels, Kontrast, Screenreader, Reflow |
| Sicherheit | Werden vertrauliche Daten oder Aktionen korrekt geschützt? |
| Redundanz | Gibt es doppelte Daten, Zähler, Wege oder widersprüchliche Status? |
| Vorschlag | Welche Änderung hilft konkret und warum? |
| Status | Bestand, Befund, Vorschlag, offen, beschlossen oder verworfen |

## 17. Frühe globale Bestandsnotizen – nicht als endgültige Befunde behandeln

In einer vorläufigen Repository-/UX-Bestandsaufnahme wurden notiert:
- zentrale App-Struktur in `App.tsx`;
- große zentrale Dateien/Komponenten;
- mögliche uneinheitliche Styles und Light-/Dark-CSS-Overrides;
- Desktop-Sidebar plus obere Schnellzugriffe;
- mobile horizontale Tabs;
- mögliche Ctrl+K-Schnellzugriffspalette;
- einige große Module und uneinheitliche Navigationsmuster.

Diese Notizen sind Ausgangspunkte für erneute Prüfung, keine aktuelle vollständige technische Analyse und keine Beschlüsse. Jede Beobachtung muss vor einer Implementierung mit aktuellem Code und konkreten Dateipfaden verifiziert werden.
