# RCPD – ausführliche Gesamtportal- und UX-Planung

**Stand:** 06.11.2026  
**Status:** Konsolidierte, detaillierte Rekonstruktion der verfügbaren übergreifenden Projektentscheidungen, Nutzerhinweise, Kommentare und Audit-Aufträge.  
**Geltungsbereich:** gesamtes RCPD-Portal außerhalb der Academy-Detailregeln; für Academy gilt ergänzend `ACADEMY-DETAILED-SPECIFICATION.md`.

> Dieses Dokument unterscheidet ausdrücklich zwischen verbindlichen Entscheidungen, übergreifenden Leitlinien, vorläufigen Bestandsbeobachtungen, offenen Konzeptfragen und bloßen Prüfhypothesen. Es ist keine Erlaubnis, neue Funktionen zu implementieren oder fachliche Regeln aus dem Modulnamen abzuleiten.

## 1. Projektverständnis und Redesign-Ziel

### 1.1 Was RCPD ist

RCPD ist ein fiktives Polizei-Intranet-, Ausbildungs- und Verwaltungsportal für eine Roleplay-Community. Das Redesign soll ein zusammenhängendes, professionelles Einsatz-, Ausbildungs- und Verwaltungsportal ergeben. Die Anwendung ist nicht nur eine Academy und auch kein einzelnes Spiel- oder MDT-Frontend.

Der Umbau betrifft das gesamte Portal: Einstieg und Navigation, tägliche Arbeitsbereiche, Kommunikation, Anträge, Kalender, Personalverwaltung, Academy, Prüfungswerkstatt, Berichte, Audit und administrative Betriebsfunktionen.

### 1.2 Designrichtung B ist beschlossen

Die festgelegte Richtung ist **B – „Modernes Einsatz- und Verwaltungsportal“**.

Gemeint ist eine moderne, professionelle, ruhige, institutionell-operative Oberfläche. Das Portal soll kompetent und aufgabenorientiert wirken, ohne:
- spielerisch oder wie eine Gaming-Oberfläche gestaltet zu sein;
- durch Neonfarben oder dekorative Effekte überladen zu werden;
- wie ein unübersichtliches Command-Center mit möglichst vielen Statusanzeigen zu wirken;
- wie ein generisches Admin-Template zu funktionieren, das überall dieselben Karten, Tabellen und Widgets einsetzt.

Die Richtung legt die gestalterische Haltung fest, nicht das endgültige visuelle Design. Farben, Typografie, Abstände, Icons, konkrete Sidebar-/Header-Anordnung, Kartenstil und einzelne Komponenten werden erst nach Audit und Informationsarchitektur ausgearbeitet.

### 1.3 Das Ziel ist nicht „alles neu bauen“

Das Redesign ist grundsätzlich ein UI-/UX-, Layout-, Navigations- und Informationsarchitekturvorhaben.

Verbindlicher Ausgangspunkt:
- bestehende technische Architektur möglichst erhalten;
- Datenmodelle und Datenbankstruktur grundsätzlich erhalten;
- Geschäftslogik und fachliche Regeln nicht beiläufig verändern;
- vorhandene Berechtigungen nicht neu erfinden;
- bestehende Funktionen nicht aus Designgründen verlieren;
- redundante, verwirrende oder unnötige UI-Elemente dürfen nach einem nachvollziehbaren Audit vereinfacht, zusammengeführt oder neu angeordnet werden;
- technische Erweiterungen nur dann vorschlagen, wenn sie durch einen echten fachlichen Bedarf gerechtfertigt sind, und ihre Auswirkungen separat erklären.

Eine technische Möglichkeit ist kein Beweis dafür, dass eine neue Produktfunktion gewünscht ist.

## 2. Verbindliche Grundsätze für alle Module

### 2.1 Rollen- und Aufgabenorientierung

Die Oberfläche soll Nutzern helfen, ihre tatsächlichen Aufgaben zu erledigen. Sie soll nicht einfach die interne Komponenten- oder Datenbankstruktur abbilden.

Die Informationsmenge hängt von Rolle, bestehender Berechtigung und aktueller Aufgabe ab:
- Teilnehmer und normale Mitarbeiter sollen nicht mit administrativen Optionen belastet werden.
- Ausbilder und Prüfer benötigen die Aufgaben und Inhalte, die sie in ihrer fachlichen Verantwortung bearbeiten.
- Vorgesetzte benötigen die für Aufsicht, Freigabe und nachvollziehbare Steuerung erforderlichen Informationen.
- Administratoren benötigen administrative Funktionen, Konten- und Berechtigungsverwaltung und Korrekturmöglichkeiten, soweit diese im bestehenden System erlaubt sind.

Diese Einteilung ist eine Planungsorientierung, keine neue Rollen- oder Berechtigungsmatrix. Die echten Rollen und Berechtigungen sind aus dem bestehenden System abzuleiten.

**Wichtige Sicherheitsregel:** Ein nicht sichtbarer Button ist keine Berechtigungsprüfung. Serverseitige Autorisierung bleibt maßgeblich. Auch Listen, Suchergebnisse, Vorschauen, Benachrichtigungen und Kontextinformationen müssen Berechtigungen beachten.

### 2.2 Fachlich vollständig, visuell ruhig

Ziel ist nicht, möglichst wenig Information anzuzeigen, sondern die richtige Information in der richtigen Situation.

Daraus folgt:
- zentrale Informationen und nächste sinnvolle Handlungen sollen schnell erkennbar sein;
- seltene oder administrative Funktionen können in passende Detailbereiche oder kontextbezogene Aktionen verlagert werden;
- redundante Statusanzeigen und doppelte Wege sind zu vermeiden;
- Warnungen sollen nur bei realen Konsequenzen oder Handlungsbedarf erscheinen;
- ein Status darf nicht allein aus optischen Gründen erfunden oder vereinfacht werden;
- Nutzer sollen nicht mit Informationen überfrachtet werden, die sie für ihre Aufgabe weder benötigen noch sehen dürfen.

### 2.3 Kontext statt unnötiger globaler Komplexität

Informationen und Aktionen sollen dort liegen, wo sie fachlich gebraucht werden. Eine Funktion braucht nicht automatisch einen eigenen globalen Menüpunkt.

Beispiele für das Prinzip:
- Examiner ist innerhalb der Academy integriert und kein allgemeiner sechster Academy-Hauptpunkt.
- Persönliche Teilnahmehistorie wird aus dem Kurs-/Teilnahmekontext erreicht, nicht als völlig neuer globaler Bereich eingeführt.
- Ein späterer Meldebutton soll unmittelbar am betroffenen Academy-Inhalt liegen und den Kontext übernehmen.
- Administrative Korrektur- oder Freigabeoptionen gehören in berechtigte Arbeitsbereiche, nicht in Teilnehmeransichten.

### 2.4 Datenwahrheit und Statusklarheit

Über alle Module hinweg:
- Nur tatsächliche, gespeicherte und fachlich definierte Daten anzeigen.
- Keine Fristen, Dringlichkeiten, Prioritäten oder Fortschritte aus bloßen Vermutungen erzeugen.
- Ein geöffneter Tab ist keine tatsächliche Arbeitsaktivität.
- Eine geöffnete Datei ist kein Verständnisnachweis.
- Eine Eingabe im Browser ist nicht automatisch gespeichert.
- Ein interner Datenstand ist nicht automatisch freigegeben oder für Nutzer sichtbar.
- Ein API-/Ladefehler darf nicht wie ein leerer Zustand aussehen.
- Veröffentlichung, Verfügbarkeit, Berechtigung, persönlicher Fortschritt und historische Gültigkeit sind dort zu trennen, wo sie fachlich unterschiedliche Bedeutungen haben.
- Ein Erfolg darf erst angezeigt werden, wenn die maßgebliche Aktion serverseitig erfolgreich bestätigt wurde.

### 2.5 Historie und Datenintegrität

Bei fachlich relevanten Änderungen muss die Nachvollziehbarkeit erhalten bleiben. Bestehende Daten dürfen nicht durch UI-Änderungen still gelöscht oder verfälscht werden.

Insbesondere bei administrativen Aktionen, Ergebnisfreigaben, Korrekturen, Neuzuweisungen, Kontobewegungen und Qualifikationsentscheidungen ist zu prüfen:
- Was war der bisherige Zustand?
- Wer hat die Änderung ausgelöst?
- Wann erfolgte sie?
- Was ist das Ergebnis?
- Ist eine Begründung erforderlich?
- Welche Nutzer sehen die Änderung?
- Welche historischen Referenzen bleiben erhalten?

Ein Audit-Log darf allerdings nicht zu einer Sammlung unnötiger Klick- oder Verhaltensdaten werden. Datenschutz, Zweckbindung, Minimierung und angemessene Aufbewahrung gelten auch für historische Daten.

## 3. Architektur- und Arbeitsgrenzen

### 3.1 Read-only-Audit vor Implementierung

Die Bestandsaufnahme und konzeptionelle Planung erfolgen zunächst durch Lesen und Prüfen des aktuellen Repositories, vorhandener Dokumentation, Datenquellen, Rollen und Abläufe.

Während dieser Phase werden nicht nebenbei neue Features implementiert. Technische Erweiterungen werden als solche ausgewiesen, fachlich begründet und zur Entscheidung vorgelegt.

### 3.2 Änderungen in Branches und Deployments

- Repository-Änderungen erfolgen auf separaten Branches.
- Keine direkten Änderungen an `main`.
- Kein eigenmächtiger Merge.
- Kein Produktionsdeployment ohne ausdrückliche Freigabe.
- `main` ist mit Render-Autodeployment verbunden; ein Merge kann deshalb direkt eine Live-Veröffentlichung auslösen.

Die Erlaubnis, bereits bestätigte Entscheidungen in einem Branch umzusetzen, bedeutet keine pauschale Genehmigung für neue Funktionen oder nicht besprochene fachliche Regeln.

### 3.3 Bestehende Architektur und technische Ausnahmen

Der dokumentierte technische Ausgangsrahmen lautet:
- React 19 und Vite im Frontend;
- Tailwind für Styling;
- Express-Server in `server.ts`;
- Server ist die zentrale Schreibstelle und maßgebliche Stelle für Rechteprüfungen;
- Storage-Backend nutzt je nach Umgebung JSON-Datei oder Firestore;
- Browserkommunikation über `/api/`;
- Render-Deployment bei Änderungen an `main`.

Diese Angaben sind gegen `AGENTS.md`, tatsächlichen Code und aktuelle Konfiguration zu verifizieren, wenn eine technische Entscheidung davon abhängt. Sie sind kein Freibrief zur Architekturänderung.

## 4. Verbindlicher Ablauf der Redesign-Arbeit

Die Reihenfolge wurde ausdrücklich festgelegt und soll nicht übersprungen werden.

### Phase 1 – vollständige Bestandsaufnahme und UX-Audit

Für jedes Modul:
1. tatsächlichen Zweck und Nutzeraufgaben feststellen;
2. vorhandene Rollen und Rechte identifizieren;
3. alle Einstiege und Navigationswege erfassen;
4. vorhandene Screens, Aktionen und Zustände untersuchen;
5. tatsächliche Datenquellen und Felder benennen;
6. Desktop- und Mobile-Verhalten getrennt prüfen;
7. Accessibility und Tastaturverhalten untersuchen;
8. Fehler-, Leer-, Lade-, Sperr- und Erfolgszustände prüfen;
9. Redundanzen und Widersprüche erfassen;
10. Abhängigkeiten zu anderen Modulen dokumentieren.

Erst danach wird ein UX-Problem als tatsächlicher Befund formuliert. Nicht verifizierte Vermutungen bleiben als Prüfhypothesen markiert.

### Phase 2 – funktionales Konzept und Informationsarchitektur

Für jeden Bereich werden Aufgaben, Inhalte, Zustände, Aktionen und Übergänge geplant. Dabei ist festzulegen:
- Was gehört in die Übersicht?
- Was gehört in eine Detailansicht?
- Was ist global, was ist kontextbezogen?
- Welche Aktionen sind primär und welche selten?
- Welche Information ist rollenabhängig?
- Wie bleibt der bisherige Arbeitskontext erhalten?
- Wie verhält sich die Ansicht bei Fehlern oder fehlenden Daten?

### Phase 3 – Cross-Module-Abgleich

Module dürfen nicht isoliert konzipiert werden. Gemeinsame Daten und Abläufe sind abzugleichen, damit es keine widersprüchlichen Wahrheiten oder doppelte Pflege gibt.

Zu prüfen sind insbesondere:
- Nutzeridentität, Rollen und Berechtigungen;
- Statusdefinitionen und Historien;
- Benachrichtigungen und Lesestatus;
- Such- und Filterverhalten;
- Dashboarddaten;
- Anträge, Personalstatus und Zuständigkeit;
- Kurs-/Prüfungs-/Ergebnisbezüge;
- Berichte und Audit;
- Whitelist und Kontozustand.

### Phase 4 – technische Machbarkeit

Erst wenn das fachliche Konzept ausreichend klar ist, wird geprüft:
- welche vorhandenen Komponenten und APIs bereits geeignet sind;
- welche Informationen bereits vorhanden sind;
- was rein visuell umorganisiert werden kann;
- welche Backend- oder Datenmodell-Erweiterungen nötig wären;
- welche Berechtigungs- oder Datenintegritätsrisiken entstehen;
- ob bestehende Tests die Regel abdecken.

Technische Erweiterungen werden getrennt von reinen UI-Anpassungen ausgewiesen.

### Phase 5 – Designsystem und globaler Portalrahmen

Erst nach hinreichender fachlicher und technischer Klarheit werden visuelle Details systematisch festgelegt:
- Farben und Kontraste;
- Typografie;
- Abstände und Größen;
- Buttons, Formulare, Listen, Tabellen, Dialoge und Statusdarstellungen;
- Fokus- und Tastaturverhalten;
- Light-/Dark-Mode;
- responsive Layoutregeln;
- globale Navigation, Header und Seitenrahmen.

Das Designsystem muss echte modulübergreifende Aufgaben unterstützen; es soll nicht vorab ein generisches Set an Komponenten erzwingen.

### Phase 6 – modulweise Gestaltung und Umsetzung

Module werden auf Basis bestätigter Konzepte schrittweise ausgearbeitet. Wiederverwendbare Muster sollen Konsistenz schaffen, ohne fachlich unterschiedliche Abläufe künstlich gleichzumachen.

### Phase 7 – Qualitätssicherung und unabhängiger Review

Zu prüfen sind:
- funktionale Regressionen;
- Berechtigungen und Datenprojektionen;
- Datenintegrität und Historie;
- Fehler- und Grenzfälle;
- Desktop, Tablet und Mobile;
- Accessibility;
- Konsistenz zwischen Modulen;
- tatsächliche Tests und Deployment-Auswirkungen.

### 4.1 Unabhängige Claude-Review

Eine spätere kritische Review durch Claude wurde als sinnvolle unabhängige Prüfinstanz vorgesehen.

Dafür gilt:
- Claude soll alle relevanten bisherigen Beschlüsse und offenen Punkte kennen.
- Claude darf jede Entscheidung sachlich hinterfragen und Alternativen vorschlagen.
- Kritik muss mit Gründen, Risiken und Auswirkungen dokumentiert werden.
- Bestehende Nutzerentscheidungen werden nicht stillschweigend überschrieben.
- Nur der Projektinhaber entscheidet, ob eine Entscheidung geändert wird.

Das Review ist Qualitätskontrolle, kein automatischer Änderungsgenehmiger.

## 5. UX- und Accessibility-Recherche als verbindliche Voraussetzung

Für künftige UX-, Layout-, Navigations- und Interaktionsempfehlungen wurde ausdrücklich festgelegt, vor einer Empfehlung erneut zu recherchieren.

Nicht ausreichend sind:
- nur allgemeine Intuition;
- alleinige Berufung auf frühere Recherche;
- unzitierte Behauptungen, ein Muster sei „modern“ oder „Best Practice“;
- Übernahme eines Musters, ohne dessen Nutzen und Nachteile für den tatsächlichen RCPD-Ablauf zu prüfen.

Erforderlich sind:
1. aktuelle etablierte Plattformmuster untersuchen;
2. maßgebliche UX- und Accessibility-Standards berücksichtigen;
3. geeignete Quellen angeben;
4. konkrete Empfehlung mit dem RCPD-Nutzerablauf begründen;
5. mögliche Nachteile und Grenzfälle nennen;
6. prüfen, ob die Empfehlung mit bestehenden Beschlüssen und technischen Grenzen kollidiert.

Die Recherchepflicht gilt insbesondere für Navigation, responsive Layouts, Formulare, Tabellen, Listen, Dialoge, Statusanzeigen, Benachrichtigungen und Tastaturbedienung.

## 6. Globaler Rahmen und Navigation

### 6.1 Was bereits bekannt bzw. vorläufig beobachtet wurde

In einer früheren Bestandsaufnahme wurden folgende Muster notiert:
- zentrale App-Struktur in `App.tsx`;
- Desktop-Sidebar und zusätzliche obere Schnellzugriffe;
- mobile horizontale Tabs;
- mögliche Ctrl/Cmd+K-Schnellzugriffspalette;
- große zentrale Module bzw. Komponenten;
- mögliche uneinheitliche Styles und Light-/Dark-CSS-Overrides.

Diese Angaben sind vorläufige Auditnotizen, keine bestätigte aktuelle Vollanalyse. Vor jeder technischen Empfehlung müssen tatsächliche Dateien, Komponenten und Verhalten am aktuellen Commit geprüft werden.

### 6.2 Was noch nicht beschlossen ist

Nicht endgültig entschieden sind:
- konkrete globale Hauptnavigation;
- endgültige Sidebar-/Header-/Tab-Hierarchie;
- mobile Navigationsform;
- Breadcrumb- und Zurück-Navigation;
- globale Suche oder Schnellzugriff;
- Command Palette bzw. Ctrl/Cmd+K als neue oder beizubehaltende Funktion;
- konkrete Sichtbarkeit nach Rollen;
- endgültige Theme- und Designsystemregeln.

### 6.3 Prüfkriterien

Das Audit soll untersuchen:
- welche Bereiche wirklich global sind;
- welche Funktionen nur in einem fachlichen Kontext gebraucht werden;
- ob gleiche Funktionen mehrfach als Schnellzugriff erscheinen;
- wie Nutzer zur vorherigen Aufgabe zurückkehren;
- ob Filter, Suchbegriff, Sortierung und Scrollposition bei Rückkehr erhalten bleiben sollten;
- wie mobile Nutzer dieselbe Aufgabe ohne überladene horizontale Navigationsleisten erledigen;
- ob Such-/Schnellzugriff nur vorhandene und berechtigte Ziele anbietet;
- ob ein zusätzliches Command-Pattern einen echten Vorteil bietet oder lediglich vorhandene Navigation dupliziert.

## 7. Dashboard und Startseite

Das Dashboard ist als rollen- und aufgabenorientierter Einstieg zu konzipieren, nicht als Sammelstelle für alle verfügbaren Datensätze und Kennzahlen.

### 7.1 Relevante Hinweise aus bisherigen Gesprächen

Es wurde auf mögliche doppelte Fortschrittsanzeigen zwischen Dashboard und Professional-Development-/Academy-Bereich hingewiesen.

Daher ist vor einem Dashboard-Konzept zu klären:
- welche Datenquelle fachlich maßgeblich ist;
- welches Modul den Fortschritt tatsächlich besitzt;
- ob das Dashboard nur eine abgeleitete Kurzansicht zeigt;
- wie widersprüchliche Statuswerte verhindert werden.

Das Dashboard soll keine zweite, unabhängig gepflegte Fortschrittslogik erhalten.

### 7.2 Noch offen

Nicht beschlossen sind:
- konkrete Widgets;
- Karten oder Diagramme;
- Kennzahlen;
- exakte Reihenfolge;
- Personalisierung;
- Rollenvarianten;
- wie viele Aufgaben oder Meldungen auf der Startseite erscheinen.

### 7.3 Prüfkriterien

- Handlungsbedarf gegenüber reiner Information unterscheiden.
- Nur echte Fristen und fachlich belegte Dringlichkeit anzeigen.
- Keine künstlichen Prioritäten oder Fortschritte erzeugen.
- Details im zuständigen Modul belassen, wenn eine Dashboard-Kurzansicht reicht.
- Sichtbarkeit nach tatsächlichen Berechtigungen steuern.
- Mobile Informationshierarchie eigenständig planen.

## 8. Kommunikation: Ankündigungen, Nachrichten und Benachrichtigungen

Diese Bereiche müssen fachlich getrennt bleiben, auch wenn sie im globalen Portalrahmen gemeinsam auffindbar sein könnten.

### 8.1 Ankündigungen

Ankündigungen sind für offizielle bzw. organisationsbezogene Informationen zu prüfen. Noch offen sind tatsächliche Zielgruppen, Veröffentlichungsregeln, Archivierung, Lesestatus und Suchumfang.

Es wurde ausdrücklich darauf hingewiesen, nicht ohne Bedarf zusätzliche Lesebestätigungen oder Eskalationsmechaniken einzuführen.

### 8.2 Nachrichten

Nachrichten sind persönliche Kommunikation. Das Audit muss Konversationen, Empfänger, Verlauf, Lesestatus, Vertraulichkeit und bestehende Rollenrechte feststellen.

Persönliche Nachrichten sollen nicht mit offiziellen Ankündigungen oder systemischen Benachrichtigungen vermischt werden.

Noch nicht beschlossen sind zusätzliche Chatfunktionen, neue Empfängerregeln, erweiterte Suche oder neue Kommunikationsmechaniken.

### 8.3 Systembenachrichtigungen

Benachrichtigungen informieren über relevante Ereignisse oder notwendige Handlungen. Sie sollen nicht jede triviale Änderung melden.

Frühere Bestandsnotizen sagen, dass ein per-user Read-State bereits vorhanden ist; das ist vor einer Umsetzung am aktuellen Code erneut zu verifizieren.

Zu prüfen:
- welche realen Ereignisse eine Benachrichtigung erzeugen;
- ob gleiche Ereignisse dedupliziert werden;
- ob der Link direkt zum betroffenen Vorgang führt;
- wie Lesestatus und ungelesene Zähler funktionieren;
- ob Dashboard-Hinweise und Notification-Center doppelte Meldungen erzeugen;
- wie Vertraulichkeit und Rollenrechte über den Benachrichtigungstext gewahrt bleiben.

Die Academy besitzt zusätzliche, bereits beschlossene Sonderregeln für Kursmeldungen, Empfehlungen und Ergebnisfreigaben. Sie stehen in `ACADEMY-DETAILED-SPECIFICATION.md`.

## 9. Anträge und administrative Vorgänge

Der Antragsbereich ist als tatsächlicher Prozess zu untersuchen, nicht bloß als Liste von Formularen.

Zu erfassen sind:
- vorhandene Antragstypen;
- Formulare und tatsächlich gespeicherte Felder;
- Einreichung;
- Rückfragen bzw. Nachforderungen;
- Bearbeitung;
- Genehmigung oder Ablehnung;
- zuständige Bearbeiter;
- Statusübergänge;
- Verlauf und Begründungen;
- Benachrichtigungen;
- Rollen- und Vertraulichkeitsgrenzen.

Die Oberfläche soll den aktuellen Status und die nächste erforderliche Handlung verständlich machen. Es dürfen keine zusätzlichen Genehmigungsstufen, Antragstypen oder Rollen erfunden werden.

Verknüpfungen mit dem Kalender dürfen nur auf echten, fachlich definierten Terminen oder Fristen beruhen. Ein beliebiger Zeitstempel ist keine Frist.

## 10. Kalender und Termine

Zu prüfen sind:
- tatsächliche Terminarten;
- persönliche und organisationsweite Termine;
- verbindliche Fristen gegenüber bloßen Ereignissen;
- Ganztagstermine;
- Zeitzonen;
- Wiederholungen;
- Sichtbarkeit je Rolle/Gruppe;
- Bearbeitungsrechte;
- Quellen und Verknüpfungen zu Anträgen, Ausbildung oder Prüfungen;
- mobile Kalenderbedienung.

Es ist nicht beschlossen, neue Erinnerungsautomatik, wiederkehrende Termine oder zusätzliche Kalenderansichten einzuführen. Solche Möglichkeiten müssen aus dem tatsächlichen Bestand und einem belegten Bedarf abgeleitet werden.

## 11. Personalverwaltung

Das Personalmodul ist als administrative Daten- und Arbeitsoberfläche zu auditieren.

Zu erheben:
- vorhandene Stammdaten;
- Rang-/Dienstinformationen;
- Statuswerte;
- Kontozuordnung;
- administrative Änderungen;
- Suche und Filter;
- Detailansicht;
- Änderungs- bzw. Audit-Historie;
- Sicht- und Änderungsrechte der Rollen;
- Abhängigkeiten zu Whitelist, Academy, Examiner und Anträgen.

Besonders wichtig ist die Trennung fachlich unterschiedlicher Status:
- Personal-/Dienststatus;
- Kontostatus;
- Zugangs-/Whiteliststatus;
- Academy-/Qualifikationsstatus.

Diese Status dürfen nicht zu einem einzigen mehrdeutigen „Status“ verschmolzen werden.

Es werden keine zusätzlichen Personalattribute, Rangstufen, Hierarchien, Leistungsbewertungen oder Berechtigungen allein aus UX-Gründen eingeführt.

## 12. Berichte und Audit-/Aktivitätsverlauf

### 12.1 Berichte

Berichte dienen der Auswertung verlässlicher Daten. Vor einer Kennzahl müssen fachliche Definition, Datenquelle und Gültigkeitsbereich geklärt sein.

Noch nicht beschlossen sind:
- neue Berichtstypen;
- neue Leistungskennzahlen;
- zusätzliche Exportfunktionen;
- aggregierte Nutzer- oder Team-Bewertungen;
- neue Filter oder Auswertungsdimensionen.

### 12.2 Audit-/Aktivitätsverlauf

Ein Audit-Verlauf dokumentiert relevante fachliche oder sicherheitsbezogene Ereignisse und ist kein Ersatz für Berichte.

Zu prüfen:
- welche Ereignisse tatsächlich gespeichert werden;
- ob Akteur, Zeitpunkt, betroffener Vorgang, Aktion, Ergebnis und Begründung nachvollziehbar sind;
- wer welche Historie sehen darf;
- wie Korrekturen und administrative Neuzuweisungen behandelt werden;
- welche Aufbewahrungs- und Löschregeln gelten.

Ein Audit-Log soll keine unnötigen Klick- oder Verhaltensdaten sammeln. Zweckbindung, Minimierung und Datenschutz bleiben maßgeblich.

## 13. Whitelist und Zugangs-/Freigabeverwaltung

Der fachliche Zweck der Whitelist und ihr Ablauf müssen aus dem Bestand ermittelt werden.

Zu prüfen:
- echte Statuswerte;
- Einreichung bzw. Aufnahme;
- Prüf- und Freigabeschritte;
- Rückfragen;
- Verantwortlichkeit;
- Historie;
- Rollenrechte;
- Verknüpfung mit Konto und Personal.

Whiteliststatus ist nicht automatisch gleichbedeutend mit Personalstatus oder Kontostatus. Fachlich unterschiedliche Prozesse müssen erkennbar getrennt bleiben.

Eine neue automatische Freigabe- oder Bewertungssystematik ist nicht beschlossen.

## 14. Deployment und Betriebsverwaltung

Der Betriebsbereich ist sicherheitsrelevant und muss separat auditiert werden.

Zu prüfen:
- welche operativen Informationen angezeigt werden;
- welche Aktionen tatsächlich möglich sind;
- welche Rollen diese sehen bzw. ausführen dürfen;
- welche Aktionen produktive Auswirkungen haben;
- welche Schutzmaßnahmen und Bestätigungen existieren;
- wie sensible Konfigurationen und Geheimnisse verborgen bleiben.

Informationsanzeigen und tatsächliche Eingriffsmöglichkeiten müssen unterscheidbar sein. Das Redesign darf keine zusätzlichen produktiven Eingriffsmöglichkeiten schaffen oder bestehende Schutzmechanismen abschwächen.

## 15. Login, Kontozugang und Einstellungen

Zu prüfen sind:
- Login und Session-Verhalten;
- Fehler- und Wiederherstellungszustände;
- Kontoeinstellungen;
- administrative Kontoverwaltung;
- Passwort-/Sitzungssicherheit;
- verständliche, aber nicht informationsleckende Fehlermeldungen;
- persönliche Darstellungseinstellungen;
- Light-/Dark-Mode;
- Verhalten bei Deaktivierung oder Kontolöschung;
- Auswirkungen auf Historien und personenbezogene Daten.

Persönliche Einstellungen und administrative Kontoverwaltung dürfen nicht unklar vermischt werden. Bestehende Sicherheits- und Sessionregeln bleiben erhalten, solange keine separat freigegebene technische Änderung beschlossen wird.

## 16. Cross-Module-Abhängigkeiten

Die folgenden Beziehungen müssen beim späteren fachlichen Abgleich explizit geprüft werden:

| Verbindung | Zu klärende fachliche Beziehung |
|---|---|
| Dashboard ↔ Academy/Professional Development | eine maßgebliche Fortschrittsquelle; Dashboard zeigt höchstens eine abgeleitete Übersicht |
| Navigation ↔ Rollen/Berechtigungen | vorhandene Rechte bestimmen Sichtbarkeit; UI ersetzt keine serverseitige Autorisierung |
| Ankündigungen ↔ Nachrichten ↔ Benachrichtigungen | klare Zwecktrennung, passende Read-States und keine doppelte Meldung |
| Anträge ↔ Personalverwaltung | Zuständigkeit, Freigaben, Status und Historie |
| Kalender ↔ Anträge/Ausbildung | echte Fristen und Termine aus verlässlichen Quelldaten |
| Personal ↔ Konto ↔ Whitelist | Personalstatus, Kontozugang und Whiteliststatus auseinanderhalten |
| Academy ↔ Dashboard | identische zugrunde liegende Daten, angemessene Informationstiefe |
| Programme ↔ Kurse ↔ Bibliothek | Kursversionen, konkrete Materialversionen, Historie und Zugriff |
| Kurse ↔ Prüfungen ↔ Ergebnisse | Voraussetzungen, Teilnahme, Bewertung und Freigabe voneinander unterscheiden |
| Ergebnisse ↔ Empfehlungen ↔ Benachrichtigungen | interne Korrektur darf nicht vor Ergebnisfreigabe Folgeaktionen auslösen |
| Examiner ↔ Personalverwaltung | tatsächliche Prüferrollen und Verantwortlichkeit |
| Berichte ↔ Audit | Auswertung und Ereignisnachweis nicht vermischen |
| Login/Einstellungen ↔ alle Module | Kontostatus, Session, Darstellung und Rechte |

## 17. Auditprotokoll für jedes Modul

Für jede spätere Modulprüfung soll ein eigener nachvollziehbarer Abschnitt entstehen, idealerweise mit:
1. Zweck des Moduls;
2. Nutzergruppen und vorhandenen Rollen;
3. bestehenden Berechtigungen;
4. Einstiegspunkten;
5. Hauptabläufen;
6. Aktionen und deren tatsächlichen Auswirkungen;
7. Zuständen und Statusübergängen;
8. Datenquellen und tatsächlich verfügbaren Feldern;
9. Lade-, Leer-, Fehler- und Sperrzuständen;
10. Desktop-Verhalten;
11. Mobile-Verhalten;
12. Tastatur- und Screenreader-Bedienung;
13. Redundanzen und Inkonsistenzen;
14. Abhängigkeiten zu anderen Modulen;
15. beobachtetem Problem samt Code-/UI-Evidenz;
16. konkreter Empfehlung;
17. Alternativen, Nachteilen und Risiken;
18. Status: beschlossen, offen, Vorschlag, verworfen oder technischer Befund.

Eine Empfehlung darf erst erfolgen, wenn der aktuelle Bestand ausreichend verstanden ist.

## 18. Vorläufige technische Beobachtungen aus älteren Prüfungen

Folgendes wurde früher notiert, ist aber nicht als aktueller verifizierter Befund zu behandeln:
- zentrale App-Struktur in `App.tsx`;
- möglicherweise große zentrale Dateien/Komponenten;
- mögliche Unstimmigkeiten zwischen globalen Styles und Light-/Dark-Mode-Overrides;
- Desktop-Sidebar mit zusätzlichen oberen Schnellzugriffen;
- mobile horizontale Tabs;
- mögliche Ctrl+K-Palette;
- mögliche doppelte Fortschrittsdarstellung Dashboard/Professional Development.

Vor technischen Entscheidungen müssen diese Beobachtungen am aktuellen Branch/Commit mit genauen Dateipfaden und tatsächlichem Verhalten neu geprüft werden.

## 19. Ausdrücklich nicht beschlossen

Die folgenden Punkte dürfen nicht als bereits genehmigte Funktionen dargestellt oder implementiert werden:
- endgültige globale Navigation;
- Command Palette als neue Funktion;
- konkrete Dashboard-Widgets und Kennzahlen;
- personalisierte Dashboard-Konfiguration;
- neue Kommunikationsmechaniken;
- zusätzliche Antragstypen oder Freigabestufen;
- neue Kalendererinnerungen;
- neue Personalattribute, Rangstufen oder Bewertungen;
- zusätzliche Berichte und Exporte;
- neue Whitelist-Automatik;
- zusätzliche Deployment-Eingriffsmöglichkeiten;
- neue Kontosicherheits- oder Sessionregeln;
- jede sonstige Funktion, die nur aus einem Modulnamen oder technischen Vorschlag abgeleitet wurde.

---

## 20. Pflege dieses Dokuments

Neue Erkenntnisse werden mit Datum und Status ergänzt. Eine technische Beobachtung darf nicht nachträglich als Nutzerentscheidung dargestellt werden. Eine spätere Änderung eines Beschlusses erhält einen eigenen Eintrag mit Begründung und Verweis auf den ersetzten Stand.

Wenn aus dem verfügbaren Kontext nur eine unvollständige Erinnerung vorhanden ist, wird das ausdrücklich vermerkt. Fehlende Details werden als offen dokumentiert und nicht durch plausible, aber unbestätigte Annahmen ersetzt.


## 12. Verbindliche Arbeitsweise: endproduktorientierte Abschnittsentwicklung (06.11.2026)

Für das gesamte Redesign gilt ab jetzt das detaillierte Modell in [`DEVELOPMENT-MODEL.md`](./DEVELOPMENT-MODEL.md). Die bisherige gründliche Recherche und Konzeption wird ausdrücklich beibehalten. Neu ist die organisatorische Verzahnung von Gesamtplanung und fachlich vollständigen Entwicklungsabschnitten: Wir planen nicht mehr zwangsläufig das gesamte Portal bis in jedes Detail, bevor irgendein Bereich umgesetzt wird. Stattdessen werden Abschnitte vollständig und mit Blick auf das endgültige Gesamtsystem geplant, recherchiert, prototypisch validiert, technisch geprüft, implementiert und getestet.

**Keine Ziel- oder Qualitätsabsenkung:** Es werden keine Funktionen oder relevanten Sonderfälle gestrichen, keine Recherche- oder Accessibility-Schritte übersprungen und keine unfertigen Provisorien aus Zeitgründen als Endlösung akzeptiert. Ein Abschnitt wird nur organisatorisch begrenzt, nicht fachlich künstlich amputiert. Zusammengehörige Funktionen und Abhängigkeiten müssen gemeinsam betrachtet werden.

**Endproduktorientierung:** Globale Navigation, Rollen-/Aufgabenlogik, Designsystem, gemeinsame Komponenten, Datenverantwortung und Modulübergänge werden frühzeitig so weit geplant, dass die erste Umsetzung nicht in eine Sackgasse führt. Bereits erarbeitete Konzepte und Komponenten werden wiederverwendet. Überarbeitung bleibt erlaubt und erwünscht, wenn Tests oder belastbare Erkenntnisse tatsächliche Verbesserungen nahelegen.

**Academy im aktuellen Ablauf:** Die Academy ist weit fortgeschritten. Wir schließen ihre offenen fachlichen Punkte und prüfen die Konsistenz, ohne technische Implementierungsdetails zu erfinden, die erst nach Architektur-/Machbarkeitsprüfung entschieden werden können. Gleichzeitig werden globale Grundlagen und Abhängigkeiten des Gesamtportals weiter ausgearbeitet. Die Academy wird nicht als isoliertes Produkt behandelt und ihr Abschluss bedeutet nicht, dass die übrigen Module warten müssen.

## 21. Ergänzung: visuelle Gestaltungsverantwortung und Academy-Startabschnitt (11.11.2026)

Die am 11.11.2026 getroffene Arbeitsvereinbarung überträgt ChatGPT die eigenständige visuelle Ausarbeitung, nicht jedoch die Befugnis, frühere Arbeit oder fachliche Beschlüsse zu ersetzen.

- Objektiv begründbare Details werden auf Basis aktueller UX-/Accessibility-Standards, tatsächlicher RCPD-Aufgaben und technischer Machbarkeit entschieden.
- Prägende subjektive Grundsatzentscheidungen werden vor der Festlegung erneut mit dem Projektinhaber abgestimmt.
- Bestehende Funktionen, Rechte, Datenflüsse, Statusdefinitionen, freigegebene Informationsarchitektur und fertige Oberflächen sind zu schützen.
- Die Academy ist der erste visuelle Arbeitsabschnitt mit der bestätigten matten, dezenten blauen Wellenform, leicht getöntem Hintergrund, klaren Inhaltsflächen und gemeinsamen, bereichsspezifisch akzentuierten Gestaltungsmustern.
- Die fertige fünfteilige Academy-Kachel-Startseite bleibt unverändert. Die internen Bereiche nutzen die bestehende horizontale Hauptnavigation; die fünf Einstiege werden nicht erneut als Kacheln dargestellt.
- Die globale visuelle Identität, globale Navigation und Theme-Strategie des Portals bleiben offen und werden nicht allein aus der Academy abgeleitet.

Die ausführliche Arbeitsgrundlage einschließlich Referenzen und Qualitäts-Gates ist [DESIGN-SYSTEM-CONCEPT.md](./DESIGN-SYSTEM-CONCEPT.md). Diese Ergänzung ersetzt keine der bestehenden fachlichen Modulregeln oder den Auditablauf.


## 22. Erweiterte Entscheidungsfreiheit und Recherchepflicht (12.11.2026)

Die Entscheidungsfreiheit von ChatGPT wurde über objektive Design-/UX-Details hinaus erweitert. Kritischere fachliche und technische Fragen dürfen eigenständig entschieden werden, wenn vorher gründlich recherchiert, relevante Standards und etablierte Vergleichslösungen geprüft sowie Alternativen, Risiken, Abhängigkeiten und Auswirkungen nachvollziehbar abgewogen wurden. Bloße Intuition reicht nicht.

Kritischere Entscheidungen werden dem Projektinhaber im Nachgang in einem strukturierten Ergebnisblock präsentiert: Fragestellung, Recherche und Quellen, Optionen, Vor-/Nachteile, Risiken, begründete Empfehlung und getroffene Entscheidung, Auswirkungen sowie gezielte Änderungsmöglichkeiten. Bei größeren Design-/UX-Schritten werden Zwischenstände gebündelt präsentiert.

Objektive UX-/Accessibility-/Konsistenzdetails bleiben innerhalb bestehender Leitplanken eigenständig entscheidbar. Prägende subjektive Grundsatzentscheidungen zur globalen visuellen Identität, grundlegenden Stil-/Formensprache und globalen Portalstruktur bleiben vorher zustimmungspflichtig. Keine dieser Freiheiten erlaubt, frühere Nutzerentscheidungen, Sicherheitsgrenzen, Datenintegrität, Kostenlimit oder bestehende Architektur stillschweigend zu gefährden. Die Repository-Dokumentation bleibt die maßgebliche Grundlage für Chat-Übergaben; ChatGPT Memory ist ergänzend und nicht synchron garantierbar.
