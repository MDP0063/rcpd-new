# RCPD – Gesamt-Masterplan des Portal-Redesigns

**Stand:** 06.11.2026  
**Planungsstatus:** Fortlaufende fachliche und UX-Konzeption. Die Academy ist detailliert, aber noch nicht vollständig abgeschlossen. Die übrigen Portalmodule sind inventarisiert, jedoch noch nicht jeweils vollständig konzipiert.  
**Wichtige Abgrenzung:** Dieses Dokument beschreibt Zielbild, Arbeitsrahmen und Planungsstand. Es behauptet nicht, dass alle beschriebenen Zielzustände bereits implementiert sind.

## 1. Projektziel und Geltungsbereich

RCPD ist ein fiktives Polizei-Intranet- und Ausbildungsportal für eine Roleplay-Community. Das Redesign umfasst **das gesamte Portal**, nicht nur die Academy. Es soll ein professionelles, konsistentes, gut bedienbares Einsatz-, Ausbildungs- und Verwaltungsportal entstehen.

Das Projekt umfasst unter anderem:
- Anmeldung und Kontozugang;
- globale Navigation und Portalrahmen;
- Dashboard/Startseite;
- Ankündigungen, Nachrichten und Benachrichtigungen;
- Anträge und administrative Vorgänge;
- Kalender und Termine;
- Personal-/Mitgliederverwaltung;
- Academy mit Kursen, Lernbibliothek und Prüfungen;
- Prüfungswerkstatt/Examiner;
- Berichte und Audit-/Aktivitätsverläufe;
- Whitelist bzw. Zugangs-/Freigabeverwaltung;
- Deployment-/Betriebsbereich und Einstellungen.

Diese Aufzählung ist ein Inventar der vorhandenen bzw. in den Gesprächen identifizierten Portalbereiche, keine Behauptung, dass jedes Modul bereits vollständig geprüft oder fachlich neu spezifiziert wurde. Siehe `MODULE-INVENTORY.md`.

## 2. Verbindliche Architektur- und Änderungsgrenzen

### 2.1 Redesign ohne ungeplante Systemumbauten

Für das Redesign wurde als Ausgangsrahmen ausdrücklich festgelegt:
- Fokus auf UI, UX, Informationsarchitektur, Navigation, Layout und Bedienlogik;
- bestehende technische Architektur, Datenmodelle/Datenbankstruktur, Geschäftslogik und Berechtigungen grundsätzlich unverändert lassen;
- vorhandene Funktionen und fachliche Regeln nicht versehentlich verändern;
- unnötige, doppelte, widersprüchliche oder unklare Bedienelemente identifizieren und begründet verbessern;
- technische Erweiterungen nur dann vorschlagen, wenn ein nachgewiesener fachlicher Bedarf besteht; Auswirkungen separat erklären und vorab abstimmen.

Die aktuelle Repository-Architektur ist in `AGENTS.md` beschrieben: React 19 + Vite + Tailwind im Frontend (`src/`), Express-Server in `server.ts` als einziger Schreiber und zentrale Stelle für Rechteprüfungen, JSON-Datei oder Firestore als Storage-Backend, Browserkommunikation über `/api/`. Render deployt automatisch bei Push/Merge nach `main`. Diese technische Beschreibung ist vom Redesign-Zielbild zu unterscheiden.

### 2.2 Sicherheit und Datenintegrität

- Serverseitige Berechtigungsprüfung bleibt maßgeblich; UI-Ausblendung ersetzt keine Autorisierung.
- Keine sensiblen oder internen Informationen durch neue UI-Projektionen offenlegen.
- Historische Daten, Abschlüsse, Ergebnisse und Audit-Ereignisse nicht still überschreiben oder verlieren.
- Fehlerzustände dürfen nicht als leere Datenzustände erscheinen.
- Nebenläufigkeit, Idempotenz, Validierung, Datenschutz und Löschpflichten bei fachlich betroffenen Flows berücksichtigen.
- Keine Daten oder Fortschritte erfinden, nur weil eine Oberfläche einen Status anzeigen möchte.

## 3. Designrichtung und Produktprinzipien

**BESCHLOSSEN: Designrichtung B – „Modernes Einsatz- und Verwaltungsportal“.**

Ziel ist eine moderne, ruhige, professionelle, institutionelle und operative Gestaltung. Sie soll nicht wie ein überladenes Command-Center, Spiel-Dashboard oder Neon-Admin-Template wirken.

Verbindliche Leitlinien:
1. Fachlich vollständig, aber visuell ruhig und nicht überladen.
2. Komplexität nach Rolle, Berechtigung, Situation und konkreter Aufgabe dosieren.
3. Teilnehmer- und normale Mitarbeiteransichten nicht mit administrativen Möglichkeiten belasten.
4. Informationen dort zeigen, wo sie für die aktuelle Aufgabe gebraucht werden.
5. Unnötige Menüpunkte, Statusanzeigen, Warnungen, Buttons und Interaktionen vermeiden.
6. Bestehende Funktionen nicht nur aus Designgründen entfernen; Redundanzen und unklare Abläufe aber gezielt auflösen.
7. Jede wichtige UX-Entscheidung mit konkretem Nutzerablauf, Nutzen, Nachteilen und technischer Machbarkeit begründen.
8. Mobile Nutzung als eigenständigen Nutzungskontext behandeln, nicht als bloß verkleinerte Desktopansicht.
9. Accessibility von Anfang an berücksichtigen: Tastaturbedienung, sichtbarer Fokus, sinnvolle Fokusreihenfolge, Kontrast, verständliche Labels, Screenreader und responsive Reflow.
10. Technische Funktionen benötigen nicht automatisch einen sichtbaren Menüpunkt oder eigenen Bereich; manches gehört in Hintergrundlogik oder kontextbezogene Aktionen.

Die Designrichtung ist beschlossen, nicht jedoch jedes konkrete Layout, jede Farbe, jedes Icon, jede Sidebar- oder Header-Anordnung. Diese Ausarbeitung folgt erst nach Audit und Informationsarchitektur.

## 4. Verbindlicher Planungsablauf

Das Redesign wird nicht sofort visuell umgesetzt. Der funktionale und konzeptionelle Plan wird zuerst vollständig erarbeitet.

### Phase 1 – Bestandsaufnahme und UX-Audit
- gesamtes Repository und vorhandene Dokumentation lesen;
- jedes Modul, jede Rolle, Berechtigung, Kernaufgabe und relevante Zustands-/Fehlerlage inventarisieren;
- bestehende Screens, Navigation, Aktionen und Abhängigkeiten erfassen;
- Desktop- und Mobile-Verhalten getrennt betrachten;
- tatsächliche Datenquellen und verfügbare Informationen identifizieren;
- Bestand, Problem, Ursache, Auswirkung und mögliche Verbesserung dokumentieren.

### Phase 2 – Funktionales Konzept und Informationsarchitektur
- Aufgaben und Informationshierarchie pro Rolle festlegen;
- Module, Unterbereiche und Übergänge planen;
- doppelte Daten-/Statusanzeigen und widersprüchliche Wege auflösen;
- Zustände, Berechtigungsgrenzen und Rückkehr-/Kontextverhalten berücksichtigen;
- jede fachliche Entscheidung explizit als beschlossen, offen, Vorschlag oder verworfen kennzeichnen.

### Phase 3 – Cross-Module-Abgleich
- gemeinsame Identitäten, Status, Benachrichtigungen, Such-/Filtermuster und Auditinformationen prüfen;
- Modulübergänge und Datenverantwortung klären;
- Doppelpflege und widersprüchliche Datenquellen verhindern;
- rollenübergreifende Prozesse durchgängig betrachten.

### Phase 4 – Technische Machbarkeit
- bestehende APIs, Datenmodelle, Komponenten und Rechteprüfungen gegen das Konzept prüfen;
- feststellen, was rein visuell umgesetzt werden kann;
- notwendige Backend-/Datenmodell-/API-Änderungen separat ausweisen;
- keine Architekturänderung stillschweigend in ein UI-Redesign aufnehmen.

### Phase 5 – Designsystem und globaler Portalrahmen
- erst nach ausreichender konzeptioneller Klarheit visuelle Sprache, Typografie, Abstände, Farben, Zustände, Komponenten und Interaktionsmuster definieren;
- globale Navigation, Header, Sidebar, mobile Navigation und rollenabhängige Einstiege konsistent gestalten;
- Light-/Dark-Mode und responsive Verhalten als zusammenhängendes System prüfen.

### Phase 6 – Modulweise Gestaltung und Umsetzung
- Module auf Basis der bestätigten Konzepte ausarbeiten;
- gemeinsame Komponenten und Muster wiederverwenden;
- keine neuen fachlichen Funktionen ohne Zustimmung ergänzen;
- in klar abgegrenzten Branches/PRs arbeiten.

### Phase 7 – Qualitätssicherung und unabhängige Reviews
- funktionale Regressionen, Berechtigungen, Datenintegrität, Accessibility, responsive Verhalten und Konsistenz prüfen;
- tatsächliche Tests dokumentieren;
- Claude kann als unabhängige kritische Review-Instanz eingesetzt werden; der Review-Prompt muss alle relevanten Beschlüsse enthalten und darf jede Entscheidung sachlich hinterfragen;
- Projektinhaber behält die endgültige Entscheidung und Merge-Freigabe.

## 5. Rollen- und Aufgabenorientierung

Die Oberfläche soll nicht primär die interne technische Modulstruktur abbilden, sondern Nutzern die für ihre Rolle relevanten Aufgaben zugänglich machen.

Zu prüfen und je Modul zu konkretisieren:
- Teilnehmer/Mitarbeiter: eigene Aufgaben, persönliche Informationen, relevante Meldungen und nächste Schritte;
- Ausbilder/Prüfer: zugewiesene oder beanspruchte Ausbildungs-/Prüfvorgänge, Bewertung und Rückmeldungen;
- Vorgesetzte: Übersicht und fachlich notwendige Steuerungs-/Freigabevorgänge;
- Administratoren: Konten, Berechtigungen, Konfiguration, Korrekturen und administrative Vorgänge;
- rollenübergreifende Sichtbarkeit: nur notwendige Status-/Verantwortlichkeitsinformationen; vertrauliche Inhalte und Notizen bleiben geschützt.

Diese Rollenübersicht ist eine Planungsorientierung, keine neue Berechtigungsmatrix. Die tatsächlichen Rollen und Rechte sind aus dem bestehenden System zu übernehmen und dürfen nicht durch UI-Konzeption neu erfunden werden.

## 6. Globaler Portalrahmen und Navigation

Das Portal braucht eine nachvollziehbare, konsistente Navigation, die über alle Module hinweg funktioniert. Das konkrete Modell ist **noch offen**.

Im Audit zu untersuchen:
- heutige Sidebar-/Header-/Tab-Struktur und doppelte Einstiege;
- welche Bereiche globale Hauptnavigation und welche kontextbezogene Unterbereiche sein sollten;
- rollenabhängige Sichtbarkeit ohne Informationslecks;
- mobile Navigation als eigenständiges Muster;
- einheitliche Breadcrumbs, Zurückwege und Erhalt des Arbeitskontexts;
- Such- und Schnellzugriffsmöglichkeiten;
- konsistente Lade-, Fehler-, Leer- und Berechtigungszustände.

Eine Command Palette (z. B. Ctrl/Cmd+K) wurde als mögliches bestehendes/zu prüfendes Muster angesprochen, ist aber **nicht als neue Funktion beschlossen**. Sie muss auf Nutzen, Zugänglichkeit, Rollenfilterung, Auffindbarkeit und Redundanz geprüft werden, bevor sie empfohlen wird.

## 7. Dashboard und Startseite

Das Dashboard soll rollen- und aufgabenorientiert sein, nicht bloß eine Sammlung aller Datenmodule. Die genaue Anordnung und die jeweiligen Widgets sind offen.

Prüfpunkte:
- relevante Aufgaben und Handlungsbedarf priorisieren;
- wichtige persönliche Informationen und Meldungen angemessen darstellen;
- keine redundanten Fortschrittsanzeigen aus Dashboard und Professional-Development-/Academy-Bereichen;
- eine autoritative Datenquelle für Fortschritt bestimmen;
- keine künstlichen Dringlichkeiten, Fristen oder Statuswerte anzeigen;
- Rolle und Berechtigung bestimmen Sichtbarkeit;
- Informationen nur in der notwendigen Tiefe zeigen; Details im zuständigen Modul.

## 8. Kommunikations- und Aufgabenbereiche

### Ankündigungen
- bestehende Funktion und tatsächliche Zielgruppe/Lesestatus erfassen;
- Abgrenzung zu individuellen Nachrichten und Benachrichtigungen prüfen;
- Sichtbarkeit, Aktualität und ungelesene Inhalte kontextgerecht behandeln;
- keine zusätzlichen Lesebestätigungen oder Statusanzeigen ohne fachlichen Bedarf.

### Nachrichten
- bestehende Konversationen, Empfänger, Rollen und Berechtigungen untersuchen;
- Trennung zwischen persönlicher Kommunikation, offiziellen Ankündigungen und systemischen Benachrichtigungen klar halten;
- Lesestatus, ungelesene Zähler, Kontextwechsel und mobile Bedienung prüfen;
- Vertraulichkeit und serverseitige Rechte unverändert gewährleisten.

### Benachrichtigungen
- vorhandene Benachrichtigungslogik und per-user Read-State berücksichtigen;
- Benachrichtigungen nicht mit Ankündigungen oder Nachrichten vermischen;
- nur sinnvolle Ereignisse melden, keine Notification für jede triviale Änderung;
- direkte Verknüpfung zum relevanten Vorgang, soweit verfügbar;
- Lesestatus nicht durch bloßes Öffnen eines übergeordneten Bereichs fälschlich pauschal setzen;
- Benachrichtigungszähler und Dashboard-Hinweise auf Redundanz prüfen.

### Anträge und administrative Vorgänge
- vorhandene Antragstypen, Status, Bearbeiter und Freigabeschritte inventarisieren;
- Status und nächste erforderliche Handlung verständlich darstellen;
- Einreichung, Rückfrage, Bearbeitung, Entscheidung und Historie als nachvollziehbaren Ablauf abbilden;
- keine neuen Genehmigungsstufen oder Rollen erfinden;
- vertrauliche Antragsinhalte nur autorisierten Personen zeigen.

### Kalender
- tatsächliche Termine, Fristen und Verantwortlichkeiten unterscheiden;
- keine Frist aus bloßen Zeitstempeln ableiten;
- persönliche und organisationsweite Termine kontextgerecht darstellen;
- Kalenderzugriff und Änderungen anhand bestehender Rechte prüfen.

## 9. Personalverwaltung und Organisationsdaten

Das Personalmodul ist ein zentraler administrativer Bereich. Die Bestandsaufnahme muss klären:
- welche Stammdaten, Dienst-/Ranginformationen und Status tatsächlich gespeichert sind;
- welche Rollen diese Informationen lesen oder bearbeiten dürfen;
- welche Aktionen (Profiländerung, Statusänderung, Kontoverwaltung, Zuordnung) existieren;
- wie historische Änderungen und Verantwortlichkeiten nachvollziehbar bleiben;
- wie Suche, Filter, Detailansicht und administrative Aktionen organisiert sind;
- welche Informationen für normale Nutzer sichtbar sein dürfen.

Es werden keine zusätzlichen Personalattribute, Hierarchien, Rechte oder automatischen Bewertungen allein aus UX-Erwägungen eingeführt.

## 10. Berichte, Audit und Nachvollziehbarkeit

Berichte und Audit-/Aktivitätsverläufe sind fachlich zu unterscheiden:
- Berichte dienen der Auswertung und Übersicht anhand vorhandener, verlässlicher Daten.
- Audit-Verläufe dokumentieren relevante Aktionen und Änderungen nachvollziehbar.
- Ein Audit-Log ist kein Ersatz für fachliche Berichte und darf nicht unnötige personenbezogene Klickdaten sammeln.
- Korrekturen sollen ursprüngliche Entscheidung, verantwortliche Person, Zeitpunkt, Änderung und Begründung nachvollziehbar halten, soweit fachlich/technisch vorhanden.
- Berechtigung und Datenminimierung sind zwingend zu beachten.

Konkrete Berichtstypen, Kennzahlen, Filter und Exportmöglichkeiten sind noch nicht abschließend beschlossen.

## 11. Whitelist, Deployment und Einstellungen

### Whitelist / Zugangsverwaltung
- vorhandenen Zweck, Statuswerte, Prüf-/Freigabeschritte und Rechte inventarisieren;
- nur tatsächliche Zustände und nächste Aktionen anzeigen;
- keine Vermischung mit allgemeinen Personalstatus, sofern das fachlich unterschiedliche Vorgänge sind;
- keine neue automatische Freigabe- oder Bewertungslogik ohne Beschluss.

### Deployment / Betrieb
- vorhandene Admin-/Betriebsfunktionen und deren Zugriff untersuchen;
- sensible Betriebsinformationen nur für berechtigte Rollen;
- operative Statusanzeigen nicht mit allgemeinen Portalbenachrichtigungen vermischen;
- keine zusätzlichen produktiven Eingriffsmöglichkeiten allein durch Redesign schaffen.

### Login und Einstellungen
- Login, Session, Fehler- und Wiederherstellungszustände verständlich und sicher gestalten;
- Einstellungen nach persönlicher und administrativer Zuständigkeit trennen;
- keine Sicherheitsregeln oder Session-Logik durch UI-Änderungen abschwächen;
- Dark Mode und persönliche Darstellungseinstellungen in das spätere Designsystem integrieren, sofern im Bestand vorhanden bzw. beschlossen.

## 12. Academy – Zielbild und verbindliche Teilkonzepte

Die Academy ist zugleich operativer Ausbildungsarbeitsbereich und freie Wissensbibliothek. Empfehlungen und Lernpfade unterstützen, sind aber keine pauschalen Zugangsvoraussetzungen.

### 12.1 Hauptnavigation – Option A beschlossen
1. Übersicht
2. Kurse
3. Lernbibliothek
4. Prüfungen
5. Meine Notizen

Examiner ist rollen-/berechtigungsabhängig integriert, kein sechster allgemeiner Hauptmenüpunkt. Die grafische Navigation wird später festgelegt.

### 12.2 Kurse und Programme
- Programme haben Lernziele und erforderliche sowie empfohlene Kurse.
- Kurse sind eigenständige Fachmodule, können mehreren Programmen zugeordnet und standalone genutzt werden.
- Reihenfolge ist Orientierung, keine pauschale Sperre.
- Kapitel, Materialien und freiwillige Wissenschecks sind optional.
- Abschlussbedingungen und Nachweise müssen ausdrücklich definiert sein.
- Freiwillige Tests sind keine Abschlussbedingung.
- Kurs-/Programmversionierung, Teilnahme, Abbruch, Wiederaufnahme, Archivierung, Korrektur und Wiederqualifizierung sind detailliert in `DECISIONS.md` geregelt (38 Beschlüsse).

### 12.3 Lernbibliothek und Dokumente
- vollständige unabhängige Wissenssammlung; Kurse referenzieren kanonisches Material statt Kopien;
- Dokumentversionierung Option B: veröffentlichte Kursversionen referenzieren konkrete Dokumentversionen; Bibliotheksaktualisierung verändert alte Kursreferenzen nicht still;
- regulär archivieren oder fachlich zurückziehen, endgültige Löschung nur als Ausnahme unter Beachtung von Datenschutz/Aufbewahrung;
- externe Dokumenterstellung (z. B. PDF) und Upload; keine verbindliche PDF-Vorlage beschlossen;
- globale Suche Option A; Relevanz als Standardsortierung Option A; kompakte eingeklappte Filter Option A;
- Reader mit großzügiger Lesefläche, eingeklappter Navigation, optionalem Inhaltsverzeichnis, Seitenminiaturen und direktem Seitensprung;
- kontinuierliches vertikales Scrollen als Standard;
- Notizen/Lesezeichen privat, versionsgebunden, serverseitig synchronisiert; Details in `DECISIONS.md`.

### 12.4 Prüfungen und Examiner
- nur Prüfungstypen `test` und `final_exam`;
- Berechtigungen und Voraussetzungen serverseitig prüfen; interne Clearance-/Berechtigungsdetails schützen;
- informierte Startbestätigung und nachvollziehbare Regeln;
- Fragenstatus nur nach bestätigter Speicherung; Server-Timer, Autosave, Resume und Abgabezustand korrekt darstellen;
- Abgabe, Bewertung und Ergebnisfreigabe getrennt;
- geschützte finale Fragen/Antworten/Lösungen nur nach Freigabe;
- Examiner mit gemeinsamer Aufgabenliste, persistentem Claim, nachvollziehbarem Transfer/Release, Draft-Konzept C und Revision-/Korrekturhistorie;
- Tastaturbedienung Option C mit sichtbarem Fokus und gezielten Fokusverbesserungen;
- Ergebnisfreigabe je Prüfung konfigurierbar; spätere Korrektur immer erneut manuell freigeben; Default bei fehlender Konfiguration noch offen.
- Vollständige fachliche Details siehe `DECISIONS.md` und technische Spezifikation `docs/EXAM_WORKSHOP_ARCHITECTURE_V3.8.md` (separater Status).

### 12.5 Academy-Empfehlungen und Meldungen
- manuelle und automatische Empfehlungen mit nachvollziehbarem Grund;
- Deduplizierung, Priorisierung, Lebenszyklus und Ausblenden gemäß `DECISIONS.md`;
- Kursmeldungen einzeln ungelesen; erst Öffnen des jeweiligen Inhalts markiert gelesen;
- kontextbezogener Meldebutton an geeigneten Inhalten ist als spätere Integrationsanforderung beschlossen;
- vollständige Melde-, Prüf-, Bearbeitungs- und Administrationsmechanik wird später als eigener Bereich konzipiert und jetzt nicht vorgezogen.

## 13. Cross-Module-Abhängigkeiten

Vor Abschluss des Gesamtkonzepts sind insbesondere folgende Verbindungen zu validieren:
- Dashboard ↔ Academy/Professional Development: eine autoritative Fortschrittsquelle, keine doppelten Statusmodelle.
- Navigation ↔ Rollen/Berechtigungen: UI-Sichtbarkeit und Serverautorisierung getrennt.
- Ankündigungen ↔ Nachrichten ↔ Benachrichtigungen: klare Zwecktrennung und korrekte Read-States.
- Anträge ↔ Personalverwaltung: Zuständigkeit, Freigabe und Historie.
- Kalender ↔ Anträge/Ausbildung: Fristen nur aus verlässlichen Quelldaten.
- Academy Programme ↔ Kurse: Kursversionen, Abschlussregeln und Mehrfachzuordnung.
- Kurse ↔ Bibliothek: konkrete Materialversionen und Zugriffsrechte.
- Bibliothek ↔ Notizen: Versionen, Seitenreferenzen, Löschung und private Daten.
- Kurse ↔ Prüfungen: Voraussetzungen, Freischaltung und Abschlussbedingungen.
- Prüfungen ↔ Ergebnisse: interner Bewertungsstand und veröffentlichter Stand.
- Ergebnisse ↔ Empfehlungen: interne Korrektur vor Freigabe löst keine Teilnehmerempfehlung aus.
- Empfehlungen ↔ Benachrichtigungen: Deduplizierung, Lesestatus, Ausblenden.
- Examiner ↔ Personalverwaltung: Prüferrollen, Verantwortlichkeit und Berechtigungen.
- Berichte ↔ Audit: Auswertung vs. Ereignisnachweis.
- Whitelist ↔ Personal/Konto: fachlich unterschiedliche Status nicht vermischen.
- Login/Einstellungen ↔ gesamtes Portal: Session, Darstellung und Rollen.

## 14. Offene und bewusst nicht festgelegte Punkte

Nicht als beschlossen behandeln:
- endgültige globale Navigation, Sidebar/Header, mobile Navigation und Untermenüs;
- Command Palette als neue Funktion;
- konkrete Dashboard-Widgets und Reihenfolge;
- visuelle Farbpalette, Typografie, Icons und Komponenten-Details;
- endgültige Modulreihenfolge nach vollständigem Audit;
- konkrete Berichte/Kennzahlen/Exports;
- neue Felder oder Rollen in der Personalverwaltung;
- zusätzliche Genehmigungsstufen in Anträgen;
- konkrete Kalender- und Whitelist-Detailabläufe, soweit noch nicht aus dem Bestand geklärt;
- vollständige Mechanik des späteren Meldesystems;
- technische Erweiterungen an Datenmodell, Backend, APIs und Berechtigungen;
- fehlender Default der erstmaligen Ergebnisfreigabe.

Die offenen Fragen werden in `OPEN-QUESTIONS.md` geführt. Vorschläge werden erst nach ausdrücklicher Annahme zu Beschlüssen.

## 15. Dokumentations- und Review-Regeln

- `README.md` ist der Einstieg.
- `MASTERPLAN.md` beschreibt Gesamtziel und Planungsablauf.
- `DECISIONS.md` enthält verbindliche fachliche Beschlüsse.
- `MODULE-INVENTORY.md` hält Module, Bestandswissen und Auditstatus getrennt fest.
- `OPEN-QUESTIONS.md` führt offene Punkte.
- `PROGRESS.md` beschreibt den aktuellen Stand.
- `CHANGELOG.md` protokolliert Änderungen.

Jede Entscheidung erhält Status, Datum/Zeitraum, Option (falls relevant), Begründung und Abhängigkeiten. Assistant-Vorschläge oder vorläufige Codebeobachtungen dürfen nicht als Nutzerbeschlüsse ausgegeben werden.

Vor jeder UX-Empfehlung: aktuelle etablierte Plattformmuster und maßgebliche Accessibility-Standards recherchieren, Quellen nennen und die Empfehlung anhand des konkreten RCPD-Ablaufs begründen. Der Nutzer möchte Claude später als kritische unabhängige Review-Instanz einsetzen; dafür müssen sämtliche relevanten Entscheidungen und offenen Fragen vollständig übergeben werden.

