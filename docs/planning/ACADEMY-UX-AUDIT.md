# Academy – Ergänzende Implementierungsprüfung und Vorbereitung des visuellen Redesigns

**Stand:** 11.11.2026  
**Prüfgegenstand:** ergänzender Auditstand vom 11.11.2026; der nachfolgende Academy-Unterseiten-Audit vom 12.11.2026 ist die aktuellere Redesign-Grundlage.  
**Status:** Ergänzendes Audit zur Vorbereitung der visuellen Gestaltung. Die bestehende Academy-Informationsarchitektur und die fachlichen/UX-Beschlüsse werden nicht neu aufgerollt.  
**Arbeitsmodus:** Read-only-Audit. Es wurden keine Anwendungsdateien geändert.

> **Wichtige Einordnung (11.11.2026):** Dieses ergänzende Dokument ersetzt ausdrücklich nicht das bereits umfangreiche Academy-Audit und die ausgearbeitete UX-/Fachspezifikation. Maßgeblich bleiben `ACADEMY-DETAILED-SPECIFICATION.md`, `DECISIONS.md`, `OPEN-QUESTIONS.md`, `PROGRESS.md`, `MASTERPLAN.md` und `PORTAL-REDESIGN-DETAILS.md`. Die fünf Academy-Hauptbereiche, die grundlegenden Nutzeraufgaben, die fachlichen Abläufe und zahlreiche Interaktionsregeln sind bereits beschlossen. Sie werden nicht erneut von Grund auf konzipiert. Die folgenden Codebeobachtungen dienen nur dazu, die vorhandene Umsetzung gegen diese Beschlüsse zu prüfen und echte Lücken/Fehler zu erkennen. Recherche dient der begründeten visuellen Ausgestaltung, nicht dazu, bestehende Beschlüsse durch fremde Produktmuster zu ersetzen.

## 0. Verbindlicher Umfang und bereits erledigte Konzeptarbeit

### Was bereits feststeht und nicht erneut entschieden wird

Die vorhandenen Planungsdokumente enthalten bereits die ausführliche Academy-Konzeption. Insbesondere:

- Die Academy hat fünf gleichberechtigte Hauptbereiche: **Übersicht, Kurse, Lernbibliothek, Prüfungen und Meine Notizen**.
- Examiner ist kein sechster allgemeiner Hauptbereich, sondern wird rollen-/berechtigungsabhängig in die Academy integriert.
- Programme/Lehrgänge und eigenständige Kurse sind getrennte Ebenen; Programme enthalten erforderliche und empfohlene Kurse, ohne pauschal eine lineare Sperrreihenfolge zu erzwingen.
- Veröffentlichung, Verfügbarkeit/Zugriff und persönlicher Fortschritt sind getrennte Statusdimensionen.
- Die Lernbibliothek ist ein eigenständiger, kanonischer Materialbestand. Kursversionen referenzieren exakte veröffentlichte Dokumentversionen.
- Suche, Relevanzsortierung, kompakte Filter, Dokumentversionierung, Reader-Grundverhalten, vertikales Scrollen, private versionsgebundene Notizen/Lesezeichen, Mehrfachquellen und stabile Markdown-/Code-Textanker sind bereits spezifiziert.
- Prüfungsstart, Voraussetzungen, Timer, Autosave, Resume, Abgabe, Tastaturverhalten, interne Bewertung, Ergebnisfreigabe, Korrekturen, Examiner-Claims, Übergaben, automatische Freigabe und Revision sind fachlich ausführlich geregelt.
- Berechtigungsgrenzen und Vertraulichkeit sind verbindlich; insbesondere bleibt die Prüfungswerkstatt Admin-only.

Die ausführlichen Abläufe und Randbedingungen stehen in der Academy-Spezifikation. Diese Punkte sind keine offenen UI-Fragen.

### Was dieses ergänzende Audit leisten soll

1. Prüfen, ob der aktuelle Code die bestehenden Beschlüsse vollständig und korrekt abbildet.
2. Nur echte Implementierungslücken, Regressionen, widersprüchliche Datenprojektionen oder Accessibility-/Bedienfehler markieren.
3. Die bereits beschlossene Academy-Struktur und Nutzerwege als Ausgangspunkt der visuellen Gestaltung verwenden.
4. Für konkrete visuelle Entscheidungen etablierte Produkte, professionelle Designsysteme und Accessibility-Standards recherchieren und die Übertragbarkeit auf RCPD begründen.
5. Die Academy von Beginn an mit den späteren portalweiten Designgrundlagen abstimmen, ohne alle anderen Module jetzt vollständig neu zu konzipieren.

**Nicht Ziel:** erneute Grundsatzdiskussion über die Academy-IA, neue fachliche Funktionen erfinden, bestehende Status-/Berechtigungsregeln vereinfachen oder nur aus optischen Gründen Geschäftslogik und Datenmodelle ändern.

### Bereits umgesetzte Kernbereiche laut aktuellem Planungsstand

Die Planungs- und Fortschrittsdokumentation weist unter anderem folgende umgesetzte Bereiche aus: versionierte Text-/Code-Materialverwaltung, Kurs-/Materialversionsbindung, Reader und Kursmaterialauswahl, private Reader-Notizen/Lesezeichen mit Mehrfachquellen und Textankern, globale Bibliothekssuche und Filter, Materialaktualisierungs-/Kursprüfungsworkflow, manuelle Ergebnis-Erstfreigabe, dynamischer Kursabschlussnachweis, persistente Examiner-Claims, serverseitige Bewertungs-Drafts, Übergabe und administrative Neuzuweisung samt Benachrichtigungen.

Das bedeutet nicht, dass bereits jede Funktion live im Browser/Firestore abgenommen wurde. CI-/Code-Nachweise und manuelle Laufzeitabnahme sind getrennt zu behandeln.

### Noch bekannte funktionale Restarbeiten – nicht mit Visual Design verwechseln

- Vollständige einsehbare Claim-/Übergabehistorie in der Oberfläche.
- Die bereits beschlossenen wichtigen Action Requests samt Benachrichtigungen und der Rückgabe abgeschlossener Bewertungen zur Revision.
- Die zugehörigen Rechte-, Historien- und Sichtbarkeitsprüfungen nach den bestehenden Spezifikationen.
- Gemeinsame Browser-/Live-Firestore-Abnahme der Academy, einschließlich der neueren Reader-, Prüfungs- und Examiner-Funktionen.

Für die Revisionsberechtigung wurde am 11.11.2026 zusätzlich **Option A** bestätigt: Jede aktuell für den konkreten Kurs autorisierte prüfende Person darf eine abgeschlossene Bewertung zur Revision zurückgeben und die zugehörige Action Request auslösen. Die Revision bleibt derselbe Prüfungsversuch; gespeicherte Drafts und frühere Bewertungshistorie bleiben erhalten. Der ursprüngliche Prüfer hat keinen Vorrang. Diese Entscheidung ist in `DECISIONS.md` dokumentiert; ihre Umsetzung ist noch nicht durch einen Code-PR belegt.

### Was für das visuelle Redesign tatsächlich noch auszuarbeiten ist

- visuelle Sprache und Design-Tokens des Portals: Farben, Kontrast, Typografie, Abstände, Größen, Flächen, Linien, Icons und Zustandsdarstellung;
- gemeinsame Komponenten und deren Varianten für Navigation, Buttons, Formulare, Listen, Tabellen, Karten, Dialoge, Status, Feedback und Fehlermeldungen;
- konkrete Desktop-/Tablet-/Mobile-Komposition der fünf bestehenden Academy-Bereiche und der berechtigungsabhängigen Examiner-Ansichten;
- visuelle Hierarchie und Dichte der bestehenden Inhalte und Aktionen, ohne Informationen oder Funktionen zu verlieren;
- konkrete Toolbar-/Werkzeuganordnung im Reader (bereits ausdrücklich als visuell offen dokumentiert);
- responsive Navigation, Fokusführung, Tastatur- und Screenreader-Verhalten sowie Light-/Dark-Mode im gemeinsamen Portalrahmen;
- prototypische Prüfung anhand der bereits definierten Nutzeraufgaben.

Die genaue Gestaltung wird nicht aus dem Bauch heraus entschieden. Für jede größere Layout-/Komponentenentscheidung werden passende etablierte Produkte und Designsysteme verglichen, Vorteile/Nachteile dokumentiert und die RCPD-spezifische Begründung festgehalten.

---
## 1. Ziel und Abgrenzung

Die Academy ist der erste vollständig auszuarbeitende visuelle Redesign-Abschnitt des Gesamtportals. Ihre Informationsarchitektur und wesentlichen fachlichen/UX-Abläufe sind bereits dokumentiert und beschlossen. Die Arbeit hier konzentriert sich deshalb auf den Abgleich der Implementierung mit diesen Beschlüssen sowie auf die visuelle Gestaltung der vorhandenen Funktionen. Globale Navigation, visuelle Sprache, Komponenten, Typografie, Abstände, Zustände, Responsive-Verhalten und Accessibility müssen dabei von Anfang an mit dem späteren Gesamtportal zusammenpassen.

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

### Grenzen dieser ergänzenden Prüfung

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


## 8. Ergänzende Befunde aus Rollen-, Dashboard- und Einstiegspfaden

### 8.1 Bestehende Rollen- und Rechtebasis

**TECHNISCHER BEFUND:** `OfficerRole` kennt die Rollen Admin, Colonel, Officer, Rookie und Trainee. `ROLE_HIERARCHY` legt unter anderem fest:

| Rolle | Academy-Bearbeitung | Abschlussprüfungen | Benutzerverwaltung | Technische Pipeline |
|---|---:|---:|---:|---:|
| Admin | Ja | Ja | Ja | Ja |
| Colonel | Ja | Ja | Nein | Nein |
| Officer | Nein | Ja | Nein | Nein |
| Rookie | Nein | Ja | Nein | Nein |
| Trainee | Nein | Nein | Nein | Nein |

Zusätzlich existieren granulare Kursrechte über `canGradeAssignedCourses` und `assignedCourseCodes`. Die Academy-UI leitet daraus unter anderem `canEditAcademy` ab. Der Material-API-Zugriff prüft die Kurskennung serverseitig; Archivierung bleibt Admin/Colonel vorbehalten. Kurs-/Programmentwürfe werden über die vorhandene Admin-/Colonel-Eigentümerlogik verwaltet.

**Prüfaufträge:**
- Die Matrix muss für jede Academy-Funktion einzeln mit den serverseitigen Prüfungen abgeglichen werden; eine globale Rolle allein beschreibt nicht alle Kurszuständigkeiten.
- Für jede Ansicht muss klar sein, ob sie Teilnehmer-, Kursverantwortlichen-, Prüfer-, Aufsichts- oder Admin-Aufgaben unterstützt.
- Keine neue Rolle, kein neues Recht und keine implizite Gleichsetzung von „Academy bearbeiten“, „Material verwalten“, „Prüfen“ und „Prüfungswerkstatt öffnen“ einführen.

Quellen im Repository: `src/types/portal.ts`, `server/rolePermissions.ts`, `server/academyApi.ts`, `src/components/AcademyCenter.tsx`. Die Admin-only-Prüfungswerkstatt bleibt zusätzlich durch ihre bestehende Berechtigungsarchitektur begrenzt.

### 8.2 Academy und Dashboard – doppelte Fortschrittsprojektionen

**TECHNISCHER BEFUND:** Das Dashboard rendert in `src/App.tsx` die Komponente `ProfessionalDevelopmentModule` und übergibt ihr `modules`, `exams` und `userProgress`. Die Komponente erstellt daraus eine gemeinsame Diagramm-/Statusprojektion für Legacy-Lehrmaterialien und Prüfungen sowie Zusammenfassungswerte. Die Academy-Übersicht verwendet dieselben Legacy-Props für Material-/Prüfungszähler und bestandene Prüfungen. Die neueren Kurs-/Programmoberflächen in `AcademyLearningCenter.tsx` laden dagegen Kurs-, Programm- und Teilnahmeinformationen über die neue Academy-API.

**UX-/Datenintegritätsrisiko:** Es gibt damit mindestens zwei fachliche Daten-/Statusprojektionen: den bisherigen Professional-Development-/Legacy-Fortschritt und den neuen versionierten Kurs-/Programmfortschritt. Das kann zu doppelten, unvollständigen oder unterschiedlich interpretierten Fortschrittsanzeigen führen, falls die Datenquellen nicht ausdrücklich zusammengeführt bzw. abgegrenzt werden.

**Verbindliche Leitlinie:** Dashboard und Academy verwenden dieselben maßgeblichen Statusdefinitionen und eine autoritative Datenbasis. Das Dashboard bleibt kompakter; die Academy darf den detaillierten Ausbildungsfortschritt darstellen. Es darf kein künstlicher Gesamtfortschrittsindex entstehen.

**Prüfaufträge:**
- Alle Felder und Statuswerte der Legacy-Fortschrittsdaten den neuen Kurs-/Programm-/Prüfungsnachweisen gegenüberstellen.
- Prüfen, welche Legacy-Anzeigen noch fachlich gültig sind und welche nur aus Kompatibilitätsgründen bestehen.
- Zähler und Diagramme mit realen Datenfällen vergleichen: nicht begonnen, begonnen, freiwillig beendet, administrativ beendet, abgeschlossen, bestanden, nicht bestanden, korrigiert und Ergebnis noch nicht freigegeben.
- Festlegen, welche Ansicht welche Informationstiefe braucht, ohne dieselbe Kennzahl mehrfach oder widersprüchlich darzustellen.

### 8.3 Erreichbarkeit alter und rollenabhängiger Academy-Unterbereiche

**TECHNISCHER BEFUND:** Im untersuchten `AcademyCenter.tsx` wird `exam_reviews` durch ein eingehendes `reviewNavigationTarget` aktiviert; `App.tsx` setzt dieses Ziel beim Öffnen einer Benachrichtigung mit `linkTarget.type === 'exam_review'`. Für `exam_corrections` wurde in dieser Komponente kein entsprechender normaler `setActiveTab`-Einstieg gefunden. Auch die älteren Zustände `instructor_grading`, `upload_textbook` und `add_code_test` besitzen im untersuchten Komponenten-Code keine erkennbare reguläre Navigationsaktion, die sie aktiviert.

**Prüfauftrag:** Repo-weit und im Live-Rollentest klären, ob diese Zweige bewusst Legacy-/Kompatibilitätscode sind, ob andere Deep-Links existieren oder ob berechtigte Aufgabenbereiche derzeit keinen normalen Einstieg besitzen. Bis zur Klärung weder löschen noch neue Menüeinträge erfinden.

### 8.4 Zwei Prüfungsdarstellungen

**TECHNISCHER BEFUND:** `activeTab === 'exam_center'` rendert `ExamParticipantRunner`; `tests` und `final_exams` rendern daneben eine ältere Liste und einen älteren Prüfungsablauf auf Basis der `exams`- und `userProgress`-Props. Der neue Runner lädt seinen Prüfungskatalog über eigene API-Endpunkte.

**Prüfauftrag:** Vollständige Ende-zu-Ende-Prüfung, ob diese Darstellungen dieselben Prüfungen bzw. Ergebnisse abbilden, ob eine der Oberflächen Legacy ist und welche davon für Teilnehmer tatsächlich maßgeblich ist. Die Nutzerführung darf nicht zwei scheinbar gleichwertige Prüfungswege anbieten, die unterschiedliche Status- oder Ergebnisquellen haben.



### 5.7 DWP Design System – interne Verwaltungsoberflächen

Das britische Department for Work and Pensions stellt ein eigenes Designsystem für interne Services bereit. Seine Side-Navigation ist ausdrücklich als sekundäre Navigation für zusammengehörige Seiten innerhalb eines internen Dienstes vorgesehen, nicht als Hauptnavigation des gesamten Dienstes. Die Accessibility-Guidance beschreibt eine mobile, per Button ein-/ausklappbare Navigation und nennt unter anderem Link Purpose, konsistente Navigation sowie Name/Role/Value als relevante WCAG-Prüfpunkte.

**Relevanz für RCPD:** ein besonders passender Vergleich für die spätere Abgrenzung zwischen globaler Portalnavigation und lokaler Academy-Unterstruktur. Die Quelle spricht gegen die vorschnelle Annahme, eine einzelne Sidebar müsse alle Navigationsebenen lösen. Das konkrete Muster muss dennoch anhand unserer fünf Academy-Bereiche, Kurs-/Reader-Kontexte und mobilen Nutzung getestet werden.

Quellen:
- [DWP Design System – Side navigation](https://design-system.dwp.gov.uk/components/side-navigation) (Seitenstand: 17. Januar 2024)
- [DWP Design System – Side navigation accessibility](https://design-system.dwp.gov.uk/components/side-navigation/accessibility) (Seitenstand: 17. Januar 2024)


### 8.5 Prüfungswarteschlangen und Verwaltungslisten

**TECHNISCHER BEFUND:** `ExamReviewCenter` lädt offene Freitextbewertungen und aktualisiert sie automatisch im 60-Sekunden-Intervall. Die Komponente zeigt Claims, Zuständigkeit, Bewertungsentwürfe, Übergabe und Freigabe. Im untersuchten Komponenten-State sind keine Such-, Filter- oder Sortierzustände erkennbar; die geladene Review-Liste wird direkt gerendert. `ExamCorrectionCenter` zeigt ausstehende Ergebnisfreigaben und abgeschlossene manuelle Bewertungen einschließlich Korrekturhistorie. Auch dort sind im untersuchten UI keine Such-/Filter-/Sortierzustände erkennbar. Der Teilnehmer-Runner zeigt den verfügbaren Prüfungskatalog als Liste mit Detailbereich und Ergebnisverlauf.

**Prüfaufträge:**
- Reale und erwartete Warteschlangengrößen ermitteln, bevor Filter/Sortierung empfohlen werden.
- Bei größeren Listen prüfen: Auffindbarkeit, Priorisierung nach tatsächlicher fachlicher Dringlichkeit, Status-/Verantwortlichkeitsanzeige und mobile Lesbarkeit.
- Keine künstlichen Prioritätswerte oder Dringlichkeiten einführen, wenn sie nicht durch reale Daten und Beschlüsse gedeckt sind.
- Prüfen, ob Aktualisierung im 60-Sekunden-Takt, Ladefeedback und lokale Eingaben bei Aktualisierung verständlich und störungsfrei zusammenspielen.
- Die Teilnehmerprüfung auf Auffindbarkeit und Verständlichkeit bei vielen veröffentlichten Prüfungen prüfen; Such-/Filterbedarf anhand realer Kataloggröße belegen.

### 8.6 Verwaltungslisten und Materialpflege

**TECHNISCHER BEFUND:** Die versionierte Materialverwaltung hat eine Suchfunktion und getrennte Materialliste/Editor-/Versionsdarstellung. In der untersuchten Komponente sind keine eigenständigen Sortier- oder Filterzustände für die Verwaltungsliste erkennbar. Die Kurs-/Programmverwaltung trennt Listen von Editoren und stellt Veröffentlichung, Version und Materialprüfungszustände dar.

**Prüfaufträge:**
- Typische Material-/Kurs-/Programmanzahlen und tatsächliche Verwaltungsaufgaben ermitteln.
- Prüfen, ob Suche allein ausreicht oder ob Filter/Sortierung fachlich sinnvoll sind.
- Materialstamm, Arbeitsentwurf, aktuelle veröffentlichte Version und Historie so darstellen, dass ihre unterschiedlichen Bedeutungen ohne technisches Vorwissen verständlich bleiben.

## 11.11.2026 – Manuelle Browserprüfung der Einstiegsseite

**MANUELLER BEFUND DES PROJEKTINHABERS:** Alle fünf Kacheln öffnen den richtigen Academy-Bereich. Die Abstände und die Bedienbarkeit bleiben auf den geprüften Gerätegrößen konsistent. Die Kachelgestaltung wird als optisch abgeschlossen bewertet und soll nicht verändert werden.

**MANUELLER BEFUND:** Nach dem Öffnen eines Bereichs ist die Kachel-Startseite innerhalb der Academy nicht mehr direkt erreichbar; bisher war ein Modulwechsel außerhalb der Academy und zurück erforderlich.

**BESCHLOSSENE Korrektur:** Breadcrumb „Academy > aktueller Bereich“ im Academy-Header; „Academy“ führt zur Kachel-Startseite zurück. Header typografisch vergrößern, kleinen blauen Akzent ergänzen und Abstand zum Inhalt leicht erhöhen. Kurze, dezente Kachel-Druckreaktion und Seitenübergang von ca. 180 ms; Reduced Motion berücksichtigen. Kachelinhalte und Kachelgestaltung bleiben unverändert.

**ABNAHMESTATUS:** Die manuelle Prüfung bezieht sich auf PR #156 vor dieser Folgeänderung. Die neue Breadcrumb und Animation müssen nach dem nächsten Deployment erneut im Browser geprüft werden.


## Ergänzende Prüfung der Academy-Übersicht und Kursauswahl (11.11.2026)

### Geprüfte Implementierung

Geprüfte Dateien auf `main`:
- `src/components/AcademyCenter.tsx`
- `src/components/AcademyLearningCenter.tsx`
- `src/components/ProfessionalDevelopmentModule.tsx`

### Kurse und Programme

**TECHNISCHER BEFUND:** Der Kursbereich enthält bereits einen gemeinsamen Katalog mit getrennten Abschnitten „Ausbildungsprogramme“ und „Alle Kurse“. Programmkarten zeigen bei vorhandener Teilnahme deren Status und berechneten Fortschritt. Kurszeilen zeigen den persönlichen Teilnahmestatus (unter anderem „Nicht begonnen“, „In Bearbeitung“, „Abgeschlossen“, „Freiwillig beendet“ oder „Administrativ beendet“). Eine gemeinsame Suche filtert Programme und Kurse.

**Einschränkung:** Begonnene Kurse werden nicht in einer separaten persönlichen Liste dargestellt, sondern bleiben in „Alle Kurse“ mit ihrem Status einsortiert. Der Katalog besitzt aktuell keine eigenen Statusfilter für „Begonnen“, „Nicht begonnen“ oder „Abgeschlossen“. Die Implementierung belegt daher die Anzeige des Status pro Katalogeintrag, aber keine eigenständige „Meine Kurse“-Ansicht und keine vollständige Historienansicht archivierter Kursteilnahmen.

**UX-FOLGERUNG:** Die Academy-Übersicht sollte keine zweite Liste begonnener Kurse und keine Kopie der Programmkarten aufbauen. Programme und Kurse haben im Kursbereich bereits ihren fachlichen Arbeitsort. Ob dort später eine gezielte Statusfilterung oder eine eigene Ansicht „Meine Kurse“ fehlt, ist eine separate Verbesserung des Kursbereichs und kein Grund, diese Funktion auf der Übersicht zu duplizieren.

### Aktuelle Academy-Übersicht

**TECHNISCHER BEFUND:** Der derzeitige JSX-Zweig `activeTab === 'overview'` in `AcademyCenter.tsx` ist sehr klein. Er zeigt „Dein dokumentierter Lernstand“, eine Anzahl bestandener Prüfungen und den Hinweis, dass das bloße Öffnen eines Materials keinen Abschlussnachweis darstellt. Die Prüfungsanzahl wird aus dem älteren `userProgress`-Prop berechnet.

**Korrektur zum früheren Audittext in Abschnitt 3.2:** Die dort beschriebene Übersicht als vierfacher Direkteinstieg mit Material-/Prüfungszählern entspricht nicht mehr dem aktuell geprüften JSX-Zweig. Die fünf Bereichskacheln liegen auf der separaten Academy-Kachelstartseite; sie sind nicht Teil des internen Übersichtsinhalts. Die alte Formulierung darf daher nicht als Beschreibung des aktuellen Stands verwendet werden.

### Abgrenzung zum Portal-Dashboard

**TECHNISCHER BEFUND:** Das Portal-Dashboard rendert `ProfessionalDevelopmentModule`. Diese Komponente baut aus den älteren `modules`-, `exams`- und `userProgress`-Daten eine Fortschrittsdarstellung mit Modul-/Prüfungsdiagramm, Kennzahlen und einem gewichteten Gesamtentwicklungsindex. Die interne Academy-Übersicht verwendet ebenfalls einen Wert aus `userProgress` (bestandene Prüfungen).

**UX-/DATENRISIKO:** Derzeit wird damit zumindest die Zahl bestandener Prüfungen auf zwei Ebenen aus derselben älteren Datenfamilie dargestellt. Zusätzlich bestehen getrennte Projektionen zwischen dem Legacy-Dashboard und dem neuen versionierten Kurs-/Programmfortschritt aus `AcademyLearningCenter.tsx`. Diese Abweichungen müssen bei einer späteren Daten-/Funktionsabnahme berücksichtigt werden. Der bestehende Gesamtentwicklungsindex im Dashboard ist außerdem nicht mit dem beschlossenen Verzicht auf einen künstlichen Academy-Gesamtfortschrittsindex zu verwechseln; für die Academy-Übersicht wird ein solcher Index ausdrücklich nicht empfohlen.

### Konsequenz für die Gestaltung der Academy-Übersicht

Für die weitere Gestaltung gelten als **Designleitlinien / noch keine vollständige Layoutfreigabe**:
- keine erneute Kursliste und keine doppelte Programmauswahl;
- keine Kopie der Portal-Dashboard-Aufgaben, Kennzahlen oder Fortschrittsgrafiken;
- keine Wiederholung der fünf großen Einstiegskacheln;
- stattdessen primär eine kurze, leicht verständliche Erklärung des Academy-Zwecks und eine nicht-lineare Erklärung des Zusammenspiels von Lehrgängen, Kursen, Lernbibliothek, Prüfungen und privaten Notizen;
- die vorhandene horizontale Academy-Navigation bleibt der Wechsel zwischen den fünf Bereichen;
- farbige Bereichsfarben dürfen sparsam als Orientierung/Akzent eingesetzt werden, nicht als zweite Kachel-Navigation;
- konkrete dynamische persönliche Inhalte erst dann ergänzen, wenn sie eine nachweislich eigene Aufgabe erfüllen und ihre Datenquelle fachlich autoritativ ist.

Die Kursauswahl und die Übersicht wurden hier statisch am Quellcode geprüft. Eine Browser-/Live-Datenabnahme und eine Prüfung archivierter/entfernter Kursteilnahmen sind damit nicht behauptet.

### Umsetzung der Academy-Übersicht (11.11.2026)

Der interne Übersichtsbereich wurde in PR #158 gestalterisch umgesetzt:
- eigener Seitentitel „Willkommen in der Academy“ und direkter Rücksprung zur Kachelstartseite;
- kompakte Einführung zum Zweck der Academy;
- Erklärung des flexiblen Zusammenspiels von Lehrgängen, Kursen und Lernbibliothek;
- zurückhaltende Einordnung von Prüfungen und privaten Notizen;
- farbige Bereichsakzente statt einer zweiten Kachel-/Navigationsreihe;
- keine persönliche Kursliste, keine Kennzahlen-/Aufgaben-Duplikate und keine Dashboard-Projektion.

Die horizontale Bereichsnavigation bleibt unverändert. Auf der internen Übersicht wird der bisherige globale Academy-Header/Breadcrumb nicht wiederholt. Die Änderung ist im PR-Diff enthalten. GitHub Actions `build-and-verify` (TypeScript-Prüfung, Produktionsbuild und Tests) sowie die PR-Beschreibungsprüfung sind erfolgreich. Browser-/Live-Abnahme und Screenshot stehen noch aus.

## 9. Nachprüfung am 12.11.2026 – Examiner-Erreichbarkeit

**BESTÄTIGTER TECHNISCHER BEFUND:** In `AcademyCenter.tsx` wurde `exam_reviews` ausschließlich durch ein eingehendes `reviewNavigationTarget` (Benachrichtigungslink) aktiviert. Für `exam_corrections` existierte kein regulärer `setActiveTab`-Einstieg. Außerdem wurde die Unter-Navigation „Prüfungsbereiche“ nur für `exam_center`, `tests` und `final_exams` gerendert, nicht für `exam_reviews` oder `exam_corrections`.

**AUSWIRKUNG:** Ohne passenden Benachrichtigungslink war die offene Bewertungswarteschlange nicht direkt auffindbar; Korrekturen und Ergebnisfreigaben hatten keinen regulären sichtbaren Einstieg innerhalb der Academy.

**KORREKTUR IN ARBEIT:** Branch `fix/academy-exam-review-navigation` erweitert die vorhandene Prüfungs-Unter-Navigation um rollenabhängige Einstiege. „Offene Bewertungen“ wird bei bestehender `canEditAcademy`-Berechtigung gezeigt; „Korrekturen & Freigaben“ nur für Admin und Colonel. Die Hauptnavigation und die fünf Academy-Bereiche bleiben unverändert. CI und Browser-/Rollenprüfung stehen noch aus.

## 10. Gesamtprüfung der Academy-Unterseiten am 12.11.2026

**Prüfgrundlage:** main nach PR #248; Komponenten und Styles der Academy-Hülle, Kurse/Lehrgänge, Lernbibliothek/Reader/Verwaltung, Prüfungen/Examiner und Meine Notizen wurden erneut geprüft.

Die vollständige, seitenweise Bestandsaufnahme, Recherche, Redesign-Richtung, gemeinsame Seitenmuster, responsive-/Accessibility-Anforderungen und Umsetzungsreihenfolge stehen in [ACADEMY-SUBPAGE-REDESIGN.md](./ACADEMY-SUBPAGE-REDESIGN.md). Dieses Dokument ergänzt das frühere Audit; es ersetzt keine fachlichen Beschlüsse.

### Neue technische/UX-Befunde aus dem Codeabgleich

- Die gemeinsame Academy-Navigation wird aktuell als fünfspaltiges CSS-Raster umgesetzt. Die Desktop-Hierarchie ist nachvollziehbar; die Lesbarkeit und Erreichbarkeit aller fünf Punkte auf schmalen Viewports muss anhand realer Browsergrößen überprüft werden.
- Die Kursansicht zeigt Lehrgänge als eigenständige Karten und Kurse als kompakte Liste. Die gemeinsame Suche filtert beide Gruppen. Kurs-/Programm-Details enthalten bereits die fachlich relevanten Lernziele, Kapitel, Materialbindungen, Pflicht-/Empfehlungskurse, Nachweise und echten Teilnahmefortschritt. Die Überarbeitung soll diese Trennung visuell stärken, nicht neue Status-/Filterlogik erfinden.
- Die Lernbibliothek besitzt nach PR #202 eine eigenständige Katalog-/Reader-Trennung, Themenbereiche, Suche, Sortierung, optionale Filter und private Reader-Notizen. Weitere Änderungen sollen gezielt konsolidieren und keine Regression der gemergten Arbeit verursachen.
- Die Prüfungsnavigation enthält mehrere Teilnehmer- und rollenabhängige Ansichten. Der Code enthält sowohl den neueren Prüfungsablauf als auch ältere Übungstest-/Abschlussprüfungsansichten sowie Examiner-/Korrekturkomponenten. Diese Pfade dürfen nicht allein aus visuellen Gründen zusammengelegt oder entfernt werden; die tatsächliche Workflow-/Datenquellen-Überlappung ist vor einer funktionalen Entscheidung zu untersuchen.
- Meine Notizen zeigen Suche, Liste und Bearbeitung derzeit teilweise gleichzeitig. Ein fokussierter Editor als eigene Arbeitsansicht ist ein UX-Vorschlag, der die bestehende Bearbeitungsfunktion beibehält. Erstellung bleibt ausschließlich im Reader; private Notizen bleiben eigentümerisoliert.
- Verwaltungsansichten und Teilnehmeransichten brauchen eine deutlichere visuelle Trennung. Rollenabhängige Verwaltungswerkzeuge dürfen nicht als gleichrangige Teilnehmeraktionen erscheinen.

### Recherche und Qualitätsmaßstab

Die Recherche vom 12.11.2026 ist in der Unterseitenspezifikation mit URLs und RCPD-spezifischer Übertragung dokumentiert. Maßgeblich sind insbesondere WCAG 2.2 AA, die WAI-ARIA-APG-Muster für tatsächliche Tabs/Keyboard-Verhalten, Home Office-/DWP-Patterns für interne Services und Suche/Filter sowie NN/g zur progressiven Offenlegung.

### Umsetzungsstatus

- **BESCHLOSSENE Schutzgrenzen:** Kachelstartseite, SVG-Illustrationen, Fünf-Bereiche-Navigation, Bereichsfarben, matte blaue Wellenform, private Notizregeln, Versions-/Veröffentlichungslogik, Prüfungs-/Ergebnisregeln.
- **REDESIGN-KONZEPT:** Die inneren Unterseiten und tieferen Arbeitsansichten werden in einem gemeinsamen System neu gegliedert. Konkrete Vorschläge und Umsetzungsreihenfolge sind in ACADEMY-SUBPAGE-REDESIGN.md dokumentiert.
- **NOCH NICHT MANUELL ABGENOMMEN:** Browserdarstellung nach aktuellem Render-Deployment, responsive Viewports, Tastatur-/Screenreader-Verhalten und Live-Firestore-Szenarien.

## 11. PR #250 – fokussierte Notizbearbeitung und Navigation (12.11.2026)

Der Notizbereich wird in PR #250 als eigener Arbeitsbereich umgesetzt:
- Die Liste bleibt auf Suche, Notizmetadaten, Vorschau und Quellenstatus konzentriert.
- Bearbeiten öffnet einen separaten, fokussierten Editor. Die Quellenverknüpfungen und ihr Verfügbarkeits-/Berechtigungsstatus bleiben dort sichtbar.
- Speichern, Verwerfen und Löschen sind visuell unterschiedlich gewichtet; destruktives Löschen ist als solches erkennbar.
- Der alte erklärende Hinweis auf ein angeblich nicht versionsgebundenes Materialmodell wurde durch eine knappe, mit dem aktuellen versionierten Reader übereinstimmende Erklärung ersetzt.
- Dirty-/Saving-State wird an die Academy-Hülle gemeldet. Navigation zu anderen Hauptbereichen, zur Kachelstartseite und über Examiner-Deep-Links fordert bei nicht abgeschlossenen Änderungen eine Bestätigung. Während eines aktiven Save-Requests sind die Editor-Abbruchaktionen deaktiviert.

**Schutzgrenze:** Die Erstellung neuer Notizen/Lesezeichen bleibt im Reader. Die Änderung führt weder eine neue Erstellungsfunktion noch API-/Datenmodell-/Berechtigungsänderungen ein. Die Owner-Isolation und Versionsbindung bleiben unverändert.

**Prüfstatus:** PR #250 am 12.11.2026 gemergt. GitHub Actions (TypeScript, Produktionsbuild, Tests und PR-Vorlagenprüfung) erfolgreich; optionaler Render-Deploy-Hook übersprungen. Manuelle Browser-/Tastatur-/Screenreader-/Dark-Mode-Abnahme steht noch aus.


## 12. Ergänzende konkrete Befunde aus dem Unterseiten-Codeabgleich (12.11.2026)

- **Übersicht:** Die globale Academy-Hülle und die interne Übersichtsseite rendern aktuell beide eine h1. Die interne Überschrift sollte als h2 geführt werden; die globale Academy-Überschrift bleibt die einzige Hauptüberschrift. Die zuvor irreführende Kachelbeschreibung („Ausbildungsstand und nächste Schritte“) wird in PR #251 an den beschlossenen Orientierungszweck angepasst.
- **Kursdetail:** Vor Kursbeginn sind Lernziele und Kapitel sichtbar. Nach Beginn der Teilnahme zeigt der aktive Detailpfad Nachweise und Materialreader, aber keine Lernziele/Kapitel mehr. Dieselben veröffentlichten Inhalte sollten im aktiven Pfad erhalten bleiben, ohne neue Funktionen oder Daten zu erfinden.
- **Prüfungen:** Der neue ExamParticipantRunner verwendet die aktuelle Exam-Catalog-/Attempt-API; die parallelen Bereiche „Übungstests“/„Abschlussprüfungen“ verwenden ältere AcademyExamDoc-Daten und den Legacy-Progress-Pfad. Der alte POST-Anlagepfad ist serverseitig ausdrücklich als Legacy gekennzeichnet. Keine Zusammenführung oder Entfernung vor Daten-/Workflow-/Migrationsprüfung.
- **Legacy-Code:** Die activeTab-Werte upload_textbook, add_code_test und instructor_grading besitzen im aktuellen lokalen State keine erreichbare Navigation. Ihre JSX-Zweige/Handler sind ungenutzte Legacy-Pfade. Vor Entfernung noch API-/Datensatzabhängigkeiten prüfen; Legacy-Teilnehmerdaten bleiben geschützt.
- **Responsive Navigation:** Die Fünf-Bereiche-Navigation wechselt unter 760 px in ein zweispaltiges Raster mit einer vollbreiten letzten Zeile. CSS vermeidet enge fünf Spalten; tatsächliche 320/375/768-Pixel-Abnahme bleibt offen.
- **Materialverwaltung:** Die Editoransicht ersetzt die Liste, zeigt Versionshistorie und Formular im eigenen Arbeitsmodus. Dieses fokussierte Muster ist sinnvoll und soll beibehalten werden.

Diese Befunde werden in ACADEMY-SUBPAGE-REDESIGN.md ausführlicher dokumentiert. Die Übersichtskachel wurde in PR #251 korrigiert. Die doppelte h1 und der fehlende Lernziel-/Kapitelkontext im aktiven Kursdetail werden in PR #252 korrigiert. Die Prüfungs-/Legacy-Fragen bleiben getrennte technische Prüfblöcke.


## 13. PR #252 – Kurskontext und verständliche Leerzustände

- Eine einzige h1 bleibt auf der Academy-Seite erhalten; die interne Überschrift der Übersichtsseite ist h2.
- Der aktive Kurspfad zeigt jetzt die veröffentlichten Lernziele und Kapitel derselben Kursversion weiter an. Das hält den Lernkontext nach dem Start sichtbar, ohne neue Daten oder fachliche Fortschrittsregeln zu erzeugen.
- Kataloge unterscheiden leere veröffentlichte Bestände von Suchanfragen ohne Treffer.
- Ein vorhandener Kurs-/Lehrgangsversionseintrag ohne Zusammenfassung erhält einen passenden Hinweis statt einer irreführenden Aussage, dass keine veröffentlichte Version existiert.
- **Status:** PR #252 gemergt; CI erfolgreich (455/455 Tests). Manuelle Browser-/Accessibility-Abnahme steht aus.


## 14. Prüfungsstart – fehlende Bestätigung und interne Berechtigungsdaten

Der Codeabgleich des ExamParticipantRunner hat zwei konkrete Abweichungen von der beschlossenen Prüfungs-UX gezeigt:

1. Der Button „Prüfung starten / fortsetzen“ rief bisher unmittelbar den POST-Start-Endpunkt auf. Die bestätigte Option C vom 06.11.2026 verlangt eine vorherige informierte Bestätigung. PR #253 ergänzt den GET-Check auf einen aktiven Versuch und die getrennte Bestätigungsstufe. Ein neuer Versuch entsteht erst nach „Prüfung verbindlich starten“; Fortsetzen verbraucht keinen weiteren Versuch.
2. Der Teilnehmerkatalog gab den numerischen Wert minClearance zurück und die UI zeigte „Freigabestufe“. Das widerspricht der Entscheidung, interne Clearance-/Berechtigungsdetails nicht offenzulegen. PR #253 entfernt das Feld aus der öffentlichen Katalogprojektion und UI; serverseitige Filterung bleibt erhalten.

Die Bestätigung zeigt nur Daten aus dem tatsächlichen veröffentlichten Prüfungsstand bzw. dem aktiven Versuch. Ein Zeitlimit von 0 bedeutet kein Zeitlimit; maxAttempts 0/null bedeutet unbegrenzt. Keine Konsequenzen werden erfunden.

**Status:** PR #253 offen; CI und manuelle Browser-/Tastatur-/Screenreader-Abnahme ausstehend.
