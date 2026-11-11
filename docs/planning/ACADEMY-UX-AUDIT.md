# Academy – UX-/UI-Bestandsaufnahme und Recherche-Audit

**Stand:** 11.11.2026  
**Prüfgegenstand:** aktueller Repository-Stand `main`, Commit `eb3d75b24b4d90f1f923e57f5ec527b03ea02408`  
**Status:** Erste technische und konzeptionelle Bestandsaufnahme; kein freigegebenes Redesign-Konzept und keine UI-Entscheidung.  
**Arbeitsmodus:** Read-only-Audit. Es wurden keine Anwendungsdateien geändert.

> Dieses Dokument beginnt die vollständige Academy-Redesign-Arbeit. Es trennt verifizierte Codebeobachtungen von UX-Hypothesen und offenen Prüfaufträgen. Die vorhandenen Academy-Beschlüsse in `DECISIONS.md` und `ACADEMY-DETAILED-SPECIFICATION.md` bleiben verbindlich. Rechercheergebnisse sind Entscheidungsgrundlagen, keine automatische Übernahme fremder Muster.

## 1. Ziel und Abgrenzung

Die Academy wird als erster Bereich des umfassenden RCPD-Portal-Redesigns vollständig konzipiert. Das bedeutet nicht, dass sie ein isoliertes Design erhält: globale Navigation, visuelle Sprache, Komponenten, Typografie, Abstände, Zustände, responsive Verhalten und Accessibility müssen später mit den übrigen Modulen zusammenpassen.

Für die Academy werden insbesondere untersucht:

- Nutzeraufgaben und Rollen-/Berechtigungskontexte;
- Informationsarchitektur und Navigationshierarchie;
- Übersicht, Programme, Kurse und Teilnahmen;
- Lernbibliothek, Suche, Filter, Materialdetails und Reader;
- private Notizen und Lesezeichen;
- Prüfungen, Ergebnisse, Examiner und Korrekturabläufe;
- Verwaltungs- und Autorenabläufe;
- Lade-, Leer-, Fehler-, Sperr-, Veröffentlichungs- und Historienzustände;
- Desktop-, Tablet- und Mobile-Bedienung;
- Tastatur, Screenreader, Fokus, Kontrast und Touch-Ziele;
- Konsistenz mit dem globalen Portalrahmen und späteren Modulen.

**Nicht Teil dieses Audits:** neue fachliche Funktionen erfinden, bestehende Berechtigungen neu definieren, Datenmodelle oder Geschäftslogik ohne gesonderte Freigabe umbauen oder ein finales Farbschema/Layout vor der UX-Konzeption festlegen.

## 2. Methodik und Evidenzstatus

Jede Feststellung erhält in der weiteren Arbeit eine dieser Kennzeichnungen:

- **TECHNISCHER BEFUND:** direkt im angegebenen Repository-Stand nachgewiesen.
- **UX-/UI-HYPOTHESE:** aus Code oder Struktur abgeleiteter möglicher Usability-Nachteil; muss anhand von Nutzeraufgaben, visueller Prüfung und Recherche bewertet werden.
- **OFFENER PRÜFAUFTRAG:** benötigte Information oder Prüfung fehlt.
- **BESCHLOSSEN:** bereits ausdrücklich vom Projektinhaber festgelegt; wird nicht stillschweigend geändert.
- **VORSCHLAG:** mögliche Lösung, noch nicht beschlossen.

### Grenzen dieser ersten Prüfung

Die Prüfung erfolgte anhand von Repository-Dateien und offiziellen öffentlichen Produkt-/Accessibility-Dokumentationen. Es fand noch keine authentifizierte Live-Browserprüfung, kein visuelles Screenshot-Audit und kein vollständiger Tastatur-/Screenreader-Test statt. Insbesondere mobile Layouts, tatsächliche Datenmengen, Ladezeiten, Interaktionsverhalten und Live-Rollenansichten müssen später in der laufenden Anwendung geprüft werden. Aus Tailwind-Klassen allein wird kein abschließendes visuelles Urteil abgeleitet.

## 3. Verifizierter technischer Ist-Zustand

### 3.1 Academy-Hauptstruktur

**TECHNISCHER BEFUND:** `src/components/AcademyCenter.tsx` enthält die fünf beschlossenen Hauptbereiche:

1. Übersicht
2. Kurse
3. Lernbibliothek
4. Prüfungen
5. Meine Notizen

Die Hauptnavigation steht innerhalb der Academy-Komponente. Die Auswahl wird über lokalen React-State (`activeTab`) gesteuert. Die fünf Bereiche werden derzeit über eine `nav`-Landmarke und native Buttons umgeschaltet; der aktive Eintrag erhält `aria-current="page"`. Die Navigation hat in diesem Codeabschnitt keine eigene URL-/Routenabbildung. Die Elemente nutzen `flex-wrap`.

**Prüfaufträge:**
- Ist die Navigation für Nutzer eindeutig als Bereichsnavigation erkennbar?
- Soll ein Bereich als echte Seitennavigation mit URL, Browser-Zurück und Deep-Link funktionieren oder als Tab-Widget? Das ist eine Informationsarchitekturentscheidung, nicht bloß eine ARIA-Nachbesserung.
- Wie verhält sich die Navigation auf schmalen Viewports und bei 200–400 % Zoom?
- Bleibt der zuletzt relevante Kontext beim Wechsel zwischen Bereichen erhalten oder ist ein bewusster Reset fachlich erwünscht?
- Welche Überschriften, Fokusübergänge und Statusmeldungen brauchen Screenreader?

### 3.2 Übersicht

**TECHNISCHER BEFUND:** Die aktuelle Übersicht enthält vier Direkteinstiege (Programme/Kurse, Notizen, Lernbibliothek, Prüfungen), zeigt Material- und Prüfungsanzahlen sowie die Zahl bestandener Prüfungen aus dem vorhandenen Fortschrittsobjekt.

**UX-/UI-HYPOTHESEN:**
- Der Einstieg könnte eher ein Link-Hub als eine auf den individuellen Ausbildungsbedarf ausgerichtete Übersicht sein.
- Die sichtbaren Zähler stammen teilweise aus den älteren `modules`-/`exams`-Props und `userProgress`; neuere Kurs-/Programm- und Prüfungsbereiche laden Daten über eigene APIs. Die fachliche Übereinstimmung dieser Projektionen muss geprüft werden.
- Es ist zu prüfen, ob die Übersicht die tatsächlich nächste sinnvolle Handlung erkennen lässt, ohne ein künstliches Gesamtfortschrittsmaß oder redundante Dashboard-Kennzahlen zu erzeugen.

**Verbindliche Grenze:** Keine Fortschrittsanzeige darf aus bloßem Öffnen, Verfügbarkeit oder einer nicht belegten Aktivität abgeleitet werden. Dashboard und Academy müssen dieselben maßgeblichen Statusdefinitionen verwenden, aber nicht dieselbe Informationstiefe anzeigen.

### 3.3 Kurse und Programme

**TECHNISCHER BEFUND:** `AcademyLearningCenter.tsx` enthält einen gemeinsamen Katalog mit getrennten Abschnitten für Ausbildungsprogramme und alle Kurse. Es gibt eine gemeinsame Suche. Programmkarten zeigen unter anderem Version, Verfügbarkeitshinweis, Zusammenfassung, Teilnahmezustand und – soweit vorhanden – Fortschritt. Kurszeilen zeigen Version, Verfügbarkeit, Zusammenfassung und Teilnahmezustand. Kurs- und Programmdetails enthalten Lernziele, Abschlussbedingungen, Nachweise und weitere fachliche Informationen.

**TECHNISCHER BEFUND:** Für Admins und Colonels schaltet `AcademyCenter.tsx` innerhalb des Kursbereichs zwischen „Lernen“ und „Kurse und Programme verwalten“ um. Die eigentliche Verwaltung liegt in `AcademyAuthoringCenter.tsx`.

**Prüfaufträge:**
- Reicht die gemeinsame Katalogstruktur aus, um Programme und eigenständige Kurse verständlich zu unterscheiden?
- Sind Suche, Sortierung und Filter für wachsende Kataloge ausreichend und rollen-/zugriffssicher?
- Sind veröffentlichte, verfügbare, zugängliche und persönlich begonnene Zustände visuell und sprachlich klar getrennt?
- Ist der Wechsel von Katalog zu Detail und zurück nachvollziehbar, ohne Auswahl oder Kontext unbeabsichtigt zu verlieren?
- Wie werden Pflicht- und Empfehlungskurse im Programmdetail am besten unterscheidbar, ohne einen künstlich linearen Lernpfad zu erzeugen?
- Sind Abschlussbedingungen, Nachweise und Fortschritt für Lernende verständlich, ohne interne technische Begriffe offenzulegen?

### 3.4 Lernbibliothek und Reader

**TECHNISCHER BEFUND:** Die Lernbibliothek kombiniert derzeit Legacy-Materialeinträge aus `modules` mit dem neuen versionierten Materialkatalog. Die Oberfläche bietet Suche, Relevanz-/Titel-/Aktualitätssortierung, Kategorie- und Dokumenttypfilter sowie getrennte Readerpfade. Neue versionierte Materialien werden über eine eigene API geladen. Es gibt einen separaten Materialverwaltungsbereich.

**TECHNISCHER BEFUND:** Der Reader für Kursmaterialien ist als eigene Komponente vorhanden. Er unterstützt Markdown und Codeanzeige (Code wird nicht ausgeführt), eine Inhaltsübersicht, Wiederherstellung der Leseposition sowie private Reader-Notizen/Lesezeichen und Textanker.

**Prüfaufträge:**
- Sind Legacy- und versionierte Materialien für Nutzer als ein kohärenter Katalog verständlich, ohne Versions-/Statusunterschiede zu verschleiern?
- Gibt es doppelte Einträge, unterschiedliche Metadatenqualität oder unklare Herkunfts-/Versionsanzeigen?
- Ist die Suche im leeren Zustand und mit aktiven Filtern verständlich? Werden aktive Filter gut erkennbar und einzeln entfernbar?
- Wie gut funktionieren Katalog → Reader → zurück zum Katalog auf Desktop und Mobile?
- Ist die Inhaltsübersicht bei langen Dokumenten hilfreich, ohne den Lesebereich unnötig einzuengen?
- Sind private Notizen, Lesezeichen, Quellenbindung und Textanker für Nutzer unterscheidbar und nachvollziehbar?
- Wie werden nicht mehr zugängliche, archivierte oder nicht mehr verfügbare Quellen angezeigt, ohne private Notizinhalte offenzulegen?

**Verbindliche Grenze:** PDF-Infrastruktur bleibt zurückgestellt. Bestehende Legacy-PDFs sind gesondert als Bestand zu behandeln; aus der Recherche folgt keine Freigabe für neue PDF-Infrastruktur.

### 3.5 Prüfungen und Examiner

**TECHNISCHER BEFUND:** `AcademyCenter.tsx` rendert im Bereich `exam_center` den neuen `ExamParticipantRunner`. Daneben existiert weiterhin eine separate ältere Prüfungsdarstellung für `tests` und `final_exams`, die auf den übergebenen `exams`-/`userProgress`-Daten und älteren Handlern basiert. Die Prüfungs-Unter-Navigation ist nur in bestimmten aktiven Zuständen sichtbar.

**TECHNISCHER BEFUND:** `ExamReviewCenter` und `ExamCorrectionCenter` sind eigenständige Komponenten. Der Wechsel zu `exam_reviews` wird im untersuchten Code durch ein eingehendes `reviewNavigationTarget` ausgelöst. Im Hauptbereich der Academy ist kein normaler sichtbarer Navigationspunkt für Examiner-Bewertungen erkennbar; für `exam_corrections` wurde im untersuchten `AcademyCenter.tsx` kein entsprechender `setActiveTab`-Einstieg gefunden. Das muss gegen sämtliche App-/Notification-Einstiege und tatsächliche Rollenansichten gegengeprüft werden.

**UX-/UI-HYPOTHESEN:**
- Es könnten zwei parallele Einstiege bzw. Katalogdarstellungen für Prüfungen existieren, die für Nutzer nicht klar unterscheidbar sind.
- Der Examiner-Arbeitsbereich könnte für berechtigte Prüfer zu stark von Benachrichtigungs-Deep-Links abhängen und als eigenständige Aufgabe schwer auffindbar sein.
- Die Trennung zwischen Teilnehmer-Prüfungsübersicht, Bewertung, Korrektur und Ergebnisfreigabe muss aus den realen Rollen-/Rechteabläufen erklärt werden; eine zusätzliche allgemeine Hauptnavigation wäre nicht automatisch richtig.

**Prüfaufträge:**
- Alle Prüfungswege und Datenquellen vom Einstieg bis zum Ergebnis-/Feedbackzustand vollständig nachverfolgen.
- Doppelte oder veraltete Prüfungsoberflächen und Legacy-Handler auf tatsächliche Erreichbarkeit prüfen.
- Berechtigte Prüfer, Admins, Colonels und Teilnehmer getrennt durch ihre realen Aufgaben führen.
- Interne Bewertung, Ergebnisfreigabe, Korrekturhistorie und Teilnehmerfeedback klar unterscheiden.
- Deep-Links, Rückkehr zum vorherigen Kontext und Fehler-/Konfliktzustände testen.

**Verbindliche Grenze:** Die Prüfungswerkstatt bleibt Admin-only. Bestehende Rollen und Rechte werden nicht aus UI-Bequemlichkeit erweitert.

### 3.6 Verwaltung und Autorenschaft

**TECHNISCHER BEFUND:** Kurs-/Programmverwaltung, Materialverwaltung, Kategorieverwaltung und Dokumenttypverwaltung liegen in spezialisierten Komponenten. Einige administrative Unterbereiche werden innerhalb der bestehenden Hauptbereiche über Umschalter erreicht.

**Prüfaufträge:**
- Sind administrative Aufgaben sinnvoll nach Objekt und Arbeitsablauf gruppiert?
- Werden Entwurf, veröffentlichte Fassung, neue Arbeitsrevision, Archivierung und Verfügbarkeit eindeutig unterschieden?
- Können Kursverantwortliche ihre tatsächlich zugewiesenen Aufgaben erkennen, ohne globale Verwaltungsoptionen zu sehen?
- Werden gefährliche oder irreversible Aktionen angemessen erklärt und bestätigt?
- Bleiben Status-, Fehler- und Speicherzustände eindeutig?

## 4. Globaler Portalrahmen – für die Academy mit zu berücksichtigen

**TECHNISCHER BEFUND:** `src/App.tsx` stellt die globale Navigation bereit. Desktop nutzt eine linke Sidebar; auf kleineren Viewports gibt es eine horizontal scrollbare Schnellnavigation. Der obere Header enthält zusätzliche Schnellzugriffe unter anderem auf Kalender und Nachrichten sowie Benachrichtigungen. Die Academy wird als globaler Portalbereich in diese Shell eingebettet.

**Prüfaufträge:**
- Welche Aufgaben gehören in globale Navigation und welche in die lokale Academy-Navigation?
- Sind globale Schnellzugriffe und Sidebar-Einträge redundant oder für häufige Aufgaben bewusst ergänzend?
- Ist die horizontale mobile Schnellnavigation auffindbar, vollständig und mit Touch/Keyboard bedienbar?
- Wie bleibt die Academy auf Mobilgeräten klar als Teil des RCPD-Portals erkennbar?
- Welche gemeinsamen Komponenten und Designregeln müssen portalweit gelten, bevor die Academy visuell finalisiert wird?

## 5. Erste Recherche etablierter Produkte und Standards

Die Recherche dient dem Vergleich von Lösungsprinzipien. Es wird kein Produkt 1:1 kopiert; die RCPD-Fachregeln und tatsächlichen Nutzeraufgaben bleiben maßgeblich.

### 5.1 Canvas LMS (Instructure)

Die offizielle Canvas-Dokumentation beschreibt eine dauerhaft verfügbare globale Navigation und eine davon getrennte Kursnavigation. Die globale Navigation führt zu Funktionen, die kurssübergreifend gelten; die Kursnavigation führt zu den Bereichen eines konkreten Kurses. Canvas unterstützt zudem unterschiedliche Dashboarddarstellungen (Karten-, Listen- und Aktivitätsansicht).

**Relevanz für RCPD:** guter Vergleich für die Trennung zwischen Portal-Shell und lokaler Academy-/Kursnavigation. Zu prüfen ist, welche Informationen tatsächlich global und welche nur im jeweiligen Ausbildungsbereich gebraucht werden.

Quellen:
- [Canvas – Global Navigation Menu](https://community.instructure.com/en/kb/articles/662861-unknown)
- [Canvas – Dashboard](https://community.instructure.com/en/kb/articles/664620-how-do-i-use-the-dashboard)
- [Canvas – Course Navigation Menu](https://community.instructure.com/en/kb/articles/664370-how-do-i-use-the-course-navigation-menu)

### 5.2 Open edX

Die aktuelle Open-edX-Learner-Dokumentation trennt auf dem Dashboard Kurs- und Programmübersichten. Die Kursübersicht bietet Statusfilter wie „In progress“, „Not Started“ und „Done“ sowie Sortierung nach Einschreibedatum oder Titel. Programme zeigen aggregierte Kursinformationen und verbleibende Bestandteile.

**Relevanz für RCPD:** hilfreicher Vergleich für getrennte Kurs-/Programmorientierung, Filter und Sortierung. RCPD darf diese Statuswerte jedoch nicht ungeprüft übernehmen: Veröffentlichung, Verfügbarkeit/Zugriff und persönlicher Fortschritt sind bei uns ausdrücklich getrennte Dimensionen.

Quelle:
- [Open edX – About the Course Dashboard](https://docs.openedx.org/en/latest/learners/concepts/open_edx_platform/what_is_course_dashboard.html)

### 5.3 Moodle LMS

Die Moodle-Dokumentation beschreibt im Kursüberblick Filter für alle/aktuelle/künftige/laufende, markierte oder ausgeblendete Kurse sowie Sortierung und verschiedene Darstellungsformen (Karten, Zusammenfassung, Liste). Die Dokumentation erklärt auch, dass Statuszuordnung an tatsächliche Kursdaten und Abschlussbedingungen gebunden ist.

**Relevanz für RCPD:** guter Vergleich für Katalogfilter, persönliche Favoriten und unterschiedliche Dichteansichten. Besonders wichtig ist die fachliche Vorsicht: ein angezeigter Fortschritt oder Status ist nur sinnvoll, wenn seine Berechnungsgrundlage eindeutig und korrekt ist.

Quelle:
- [MoodleDocs – Course overview](https://docs.moodle.org/402/en/Course_overview)

### 5.4 GOV.UK Design System – Navigation, Tabs und Task Lists

Das GOV.UK Design System empfiehlt Service-Navigation für wiederholt genutzte Dienste mit mehreren Aufgaben und ohne zwingend lineare Gesamtreihenfolge. Bei klaren End-to-End-Abläufen verweist es stattdessen auf Task Lists. Die Tabs-Guidance warnt davor, Tabs als allgemeine Seitennavigation einzusetzen: Tabs verbergen Inhalte, können übersehen werden und sind für mobile Nutzung sorgfältig zu prüfen. Die Guidance empfiehlt klare Labels, sinnvolle Reihenfolge und vermeidet mehrzeilig umbrechende Tabs.

**Relevanz für RCPD:** Die Academy besitzt sowohl frei kombinierbare Bereiche (z. B. Bibliothek) als auch strukturierte Programme mit Anforderungen. Deshalb darf nicht automatisch ein einziges Navigationsmuster überall eingesetzt werden. Programme können einen aufgabenorientierten Überblick benötigen, während Bibliothek und allgemeine Academy-Bereiche eigenständige Navigation benötigen.

Quellen:
- [GOV.UK – Navigate a service](https://design-system.service.gov.uk/patterns/navigate-a-service/)
- [GOV.UK – Tabs](https://design-system.service.gov.uk/components/tabs/)
- [GOV.UK – Task list](https://design-system.service.gov.uk/components/task-list/)

### 5.5 W3C WAI-ARIA Authoring Practices und WCAG 2.2

Die WAI-ARIA Authoring Practices definieren für echte Tabs Rollen wie `tablist`, `tab` und `tabpanel` sowie ein festgelegtes Tastaturverhalten. Eine Navigation mit Buttons ist nicht automatisch ein Tabs-Widget; Semantik und Interaktionsmodell müssen zur tatsächlichen Funktion passen.

WCAG 2.2 liefert unter anderem folgende relevante Prüfmaßstäbe:
- **1.4.10 Reflow (AA):** bei 320 CSS-Pixeln Breite darf vertikal scrollender Inhalt grundsätzlich keine zweidimensionale Scrollpflicht erzeugen, außer bei fachlich notwendigem zweidimensionalem Inhalt.
- **2.5.8 Target Size (Minimum, AA):** Pointer-Ziele sollen mindestens 24 × 24 CSS-Pixel groß sein oder die Abstands-Ausnahme erfüllen.
- **2.4.11 Focus Not Obscured (Minimum, AA):** ein fokussiertes Element darf nicht vollständig durch vom Autor erzeugte Inhalte verdeckt werden.
- zusätzlich zu prüfen: Tastaturbedienbarkeit, sichtbarer Fokus, Kontrast, verständliche Labels, semantische Beziehungen und Statusmeldungen.

Quellen:
- [WAI-ARIA APG – Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [WCAG 2.2 – Understanding Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [WCAG 2.2 – Understanding Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [WCAG 2.2 – Understanding Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)

### 5.6 Nielsen Norman Group – Usability-Heuristiken

Die zehn Usability-Heuristiken umfassen unter anderem Sichtbarkeit des Systemstatus, Sprache aus der realen Nutzerwelt, Nutzerkontrolle, Konsistenz, Fehlervermeidung, Wiedererkennen statt Erinnern, Effizienz, visuelle Zurückhaltung und verständliche Fehlerbehandlung.

**Relevanz für RCPD:** Diese Kriterien werden als Audit-Linse für Navigation, Statuskommunikation, Formulare, Rückkehrwege, Bestätigungen und Fehlerzustände genutzt – nicht als Ersatz für konkrete Nutzeraufgaben oder Accessibility-Standards.

Quelle:
- [Nielsen Norman Group – Jakob’s Ten Usability Heuristics (PDF)](https://media.nngroup.com/media/articles/attachments/Heuristic_Summary1_A4_compressed.pdf)

## 6. Erste Vergleichssynthese – noch keine Designentscheidung

Aus der ersten Recherche ergeben sich folgende zu prüfende Leitfragen:

1. **Globale und lokale Navigation:** Canvas und GOV.UK unterscheiden übergreifende Service-/Portalnavigation von kontextbezogener Navigation. Für RCPD muss diese Grenze zwischen globaler Portal-Shell, Academy-Hauptbereichen, Kursdetail und Reader klar definiert werden.
2. **Navigation oder Tabs:** Die fünf Academy-Bereiche sind eigenständige Zielbereiche. Wir müssen begründet entscheiden, ob sie als URL-fähige lokale Seitennavigation oder als echtes Tabs-Widget funktionieren sollen. Eine bloße visuelle Tab-Leiste ohne passendes Interaktions-/Semantikmodell ist kein ausreichendes Konzept.
3. **Programme und Kurse:** Open edX und Moodle zeigen, dass Programme, Kurse, Statusfilter und Sortierung getrennt behandelt werden können. RCPD muss dabei die beschlossene Trennung von Veröffentlichung, Verfügbarkeit und persönlichem Fortschritt erhalten.
4. **Aufgabenorientierte Programme:** GOV.UK Task Lists sind für mehrere frei wählbare Aufgaben innerhalb eines längeren Vorgangs gedacht. Ob und wo dieses Muster für RCPD-Programme sinnvoll ist, muss pro Programm-/Kursablauf geprüft werden; es darf keinen unbeabsichtigten linearen Zwang erzeugen.
5. **Mobile zuerst mitdenken:** Mehrzeilige oder horizontal scrollbare Navigationsleisten, Reader-Nebenleisten und breite Verwaltungsansichten müssen in realen Viewports getestet werden.
6. **Accessibility als Qualitätskriterium:** Semantik, Tastatur, Fokus, Reflow, Touch-Zielgrößen und Statusmeldungen werden bei jedem Teilbereich geprüft und nicht erst am Ende kosmetisch ergänzt.

## 7. Nächste Auditabschnitte

Die nächste Bestandsaufnahme wird die folgenden Punkte vollständig und evidenzbasiert abarbeiten:

1. **Nutzer- und Rollenmatrix:** reale Rollen und Berechtigungen aus Code/Serverregeln; typische Aufgaben je Rolle; keine neuen Rechte.
2. **Aufgaben- und Journey-Inventar:** Teilnehmer vom Einstieg bis Kurs-/Prüfungsabschluss; Prüfer von Aufgabenliste bis Bewertung/Übergabe; Admin/Colonel bei Verwaltung, Korrektur und Freigabe.
3. **Navigationsaudit:** globaler Einstieg, Academy-Hauptbereiche, Unterbereiche, Deep-Links, Browser-Zurück, Kontextbewahrung, mobile Navigation.
4. **Daten-/Statusaudit:** alle in der UI dargestellten Status, Zähler und Fortschritte samt autoritativer Datenquelle.
5. **Komponenten-/Interaktionsaudit:** Kataloge, Karten/Listen, Filter, Reader, Formulare, Dialoge, Tabellen, Feedback und Fehlerzustände.
6. **Responsive-/Accessibility-Audit:** Live-Ansichten bei relevanten Breiten, Tastatur, Screenreader-Semantik, Fokus, Kontrast und Touch-Zielgrößen.
7. **Vergleichsrecherche vertiefen:** konkrete Screens/Flows von Canvas, Moodle, Open edX und geeigneten professionellen Verwaltungs-/Serviceportalen vergleichen; Nutzen und Nachteile pro RCPD-Aufgabe dokumentieren.
8. **Konzept und Entscheidungsreview:** erst danach konkrete IA-/UX-Optionen, UI-Richtung, Alternativen, Auswirkungen und Empfehlungen ausarbeiten.

**Erst nach diesen Schritten** werden wir die Academy-UX verbindlich ausarbeiten und anschließend die visuelle Gestaltung mit den portalweiten Designgrundlagen abstimmen. Bis dahin bleiben konkrete Layouts, Farben, Karten-/Listenentscheidungen und Navigationsvarianten offen.
