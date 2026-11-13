# Academy – vollständiges Unterseiten-Redesign und UX-Bestandsaudit

**Stand:** 12.11.2026  
**Prüfgrundlage:** main nach PR #255, einschließlich PRs #246–#255; zusätzlicher Codeabgleich der Teilnehmerprüfungen, Kursdetails, Notizen, Lernbibliothek, Verwaltungs- und Bewertungsansichten  
**Status:** Recherchegestütztes Redesign-Konzept; bestehende Fachregeln bleiben verbindlich. Die vorgeschlagenen Layout-/Kompositionsmuster dürfen innerhalb der bestätigten Academy-Designfreigabe eigenständig umgesetzt werden.  
**Geltungsbereich:** interne Academy-Übersicht, Kurse/Lehrgänge, Lernbibliothek/Reader/Verwaltung, Prüfungen/Examiner sowie Meine Notizen.

## 1. Ziel und Schutzgrenzen

Ziel ist nicht, fünf voneinander unabhängige Designs zu bauen, sondern eine zusammenhängende Lernumgebung mit klar unterscheidbaren Arbeitsaufgaben. Jede Unterseite soll unmittelbar beantworten: Wo befinde ich mich? Was kann ich hier tun? Welche Informationen sind für die aktuelle Aufgabe wichtig? Wie komme ich zuverlässig zurück zur Academy-Kachelstartseite?

**Unverändert und verbindlich:**
- Die fünfteilige Kachelstartseite bleibt unverändert: Übersicht, Kurse, Lernbibliothek, Prüfungen, Meine Notizen. Sie ist der einzige Einstieg in diese fünf Hauptbereiche.
- Innerhalb der Academy bleibt die horizontale Hauptnavigation mit denselben fünf Zielen erhalten. Keine parallelen Kacheln oder zweite Navigation mit denselben Zielen.
- Jede tiefere Academy-Ansicht behält einen klar erkennbaren direkten Rückweg zur Kachelstartseite.
- Bereichsakzente bleiben: Übersicht Blau #2864D9, Kurse Petrol #087F8C, Lernbibliothek Violett #6841B8, Prüfungen Beere #A33370, Meine Notizen Grün #287A45. Sie sind keine Statusfarben.
- Der bestätigte visuelle Charakter bleibt bestehen: freundliche, moderne Lernplattform; matte, begrenzte blaue Wellenform; ruhiger leicht getönter Hintergrund; klare Typografie; dezente, bereichsspezifische Akzente.
- Die fünf SVG-Kachelillustrationen bleiben unverändert und sind nicht Teil der Unterseiten-Dekoration.
- Keine erfundenen KPIs, Gesamtfortschrittsindizes, Status, Freigabestufen, Daten oder Aktionen.
- Keine Änderung an Berechtigungen, Veröffentlichung, Versionierung, Teilnahme, Prüfungsauswertung, privater Notizsichtbarkeit oder serverseitiger Datenlogik.
- PDF-Infrastruktur bleibt zurückgestellt. Keine neuen externen Dienste, Assets, bezahlten Abhängigkeiten oder laufenden Kosten.

## 2. Recherche und übertragbare Erkenntnisse

Die folgenden Quellen wurden am 12.11. und 13.11.2026 gezielt für interne Verwaltungs-/Lernoberflächen, Suche/Filter, progressive Offenlegung, Navigation, Lesbarkeit und Accessibility geprüft:

| Quelle | Relevante Erkenntnis | Konsequenz für die Academy |
|---|---|---|
| Home Office Design System – internes und öffentliches Service-Design: https://design.homeoffice.gov.uk/design-system | Ein Designsystem verbindet Styles, Komponenten und Aufgabenmuster; interne Services brauchen konsistente, aufgabenbezogene Oberflächen. | Einheitliche Seitengerüste und Interaktionsmuster, aber keine starre Einheitsseite für alle Aufgaben. |
| Home Office – Search pattern: https://design.homeoffice.gov.uk/design-system/patterns/help-users-to/search-for-something | Suche ist sinnvoll, wenn Navigation allein große Bestände nicht erschließt; bei einfachen Listen können Filter oder automatische Vorschläge geeigneter sein. | Suche nur dort prominent, wo der Bestand groß/heterogen ist (Bibliothek, Notizen, ggf. Kurskatalog); nicht als Dekoration auf jeder Seite. |
| DWP Design System – Filters: https://design-system.dwp.gov.uk/contribute/filters | Vor Filtern zuerst prüfen, ob Nutzer sie wirklich benötigen; Filter sind optional und dürfen die Kernaufgabe nicht blockieren. | Bestehende optionale Bibliotheksfilter kompakt halten; keine zusätzlichen Filter ohne tatsächlichen Bedarf. |
| Nielsen Norman Group – Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/ | Häufig benötigte Optionen gehören in die erste Ebene; seltene/komplexe Optionen werden klar beschriftet sekundär angeboten. Zu viele Offenlegungsebenen verwirren. | Teilnehmeraufgaben und Verwaltungswerkzeuge klar trennen; keine endlosen Untermenüs und keine gleichrangige Darstellung seltener Admin-Aktionen. |
| W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/ | Anforderungen u. a. zu Reflow, Fokus, Kontrast, konsistenter Navigation, Zielgrößen und verständlicher Interaktion. | Responsive Layouts, sichtbarer Fokus, ausreichende Touch-Ziele und konsistente Position wiederkehrender Navigation als Qualitätskriterien. |
| U.S. Web Design System – Typography: https://designsystem.digital.gov/components/typography/ und Measure: https://designsystem.digital.gov/design-tokens/typesetting/measure/ | Für Fließtext mindestens 16 px, üblicherweise 45–90 Zeichen pro Zeile und ungefähr 66 Zeichen als gutes Maß für längere Lesetexte; längere Texte benötigen mindestens etwa 1,5 Zeilenhöhe. Das sind Designempfehlungen, keine eigenständigen WCAG-Erfolgskriterien. | Der Reader begrenzt Markdown-Fließtext auf ungefähr 68ch, hält die Grundschrift bei 16 px und lässt Tabellen/Code als eigene Inhaltsformen behandeln. |
| WAI-ARIA APG – Tabs: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ | Tabs sind für wechselnde Panels einer gemeinsamen Ansicht gedacht und benötigen ein definiertes Tastaturmodell. | Nicht jede Button-Leiste als ARIA-Tablist auszeichnen. Seiten-/Bereichsnavigation bleibt Navigation; echte Tabs nur bei tatsächlich austauschenden Panels und vollständiger Tastaturbedienung. |
| GOV.UK – Step-by-step navigation: https://design-system.service.gov.uk/patterns/step-by-step-navigation/ | Aufgaben und Schritte sollen in der für Nutzer sinnvollen Reihenfolge stehen; Beschreibungen sollen nur wesentlichen Kontext enthalten. | Lehrgangs-/Kursdetails zeigen Anforderungen und nächste Lernschritte in einer nachvollziehbaren Reihenfolge, ohne unnötige erklärende Textwände. |
| GOV.UK – Using, adapting and creating patterns: https://www.gov.uk/service-manual/design/using-adapting-and-creating-patterns | Etablierte Muster zuerst nutzen; Anpassungen oder neue Muster auf konkrete Nutzerbedürfnisse und Evidenz stützen. | Keine generischen Dashboard-/KI-Muster kopieren; Muster an tatsächliche Academy-Aufgaben anpassen. |
| GOV.UK – Summary list: https://design-system.service.gov.uk/components/summary-list/ | Schlüssel-Wert-Informationen wie Version, Veröffentlichungsstatus und Datum als klar beschriftete Fakten darstellen; nicht für einfache Listen oder Tabellen zweckentfremden. | In Kurs-/Lehrgangsdetails und Verwaltungsmetadaten kompakte Faktenblöcke statt langer Metadaten-Fließtexte prüfen. |
| Nielsen Norman Group – Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/ | Häufig benötigte Funktionen gehören in die erste Ebene; seltene Optionen sekundär. Mehr als zwei Offenlegungsebenen sind häufig schwer navigierbar. | Teilnehmeraufgaben direkt sichtbar halten; Verwaltungs-/Sonderaktionen in eine klar benannte sekundäre Ebene legen. Keine tiefen Untermenüs oder doppelten Einstiege. |
| Nielsen Norman Group – Recognition and Recall: https://www.nngroup.com/articles/recognition-and-recall/ | Sichtbare, verständlich benannte Optionen reduzieren die Erinnerungsleistung, die Nutzer erbringen müssen. | Eindeutige Begriffe wie „Lehrgang“, „Kurs“, „Materialverwaltung“ und „Offene Bewertungen“ statt interner Fach-/Datenmodellbegriffe. |

**Quellenbewertung:** Die Quellen liefern Muster und Accessibility-Grundlagen, keine fertige RCPD-Oberfläche. Die konkrete Entscheidung wird jeweils aus dem bestehenden Datenmodell, den beschlossenen Nutzeraufgaben und den realen Rollen abgeleitet.

## 3. Aktueller Codebestand – festgestellte Struktur

Prüfgegenstand sind u. a.:
- src/components/AcademyCenter.tsx und AcademyCenter.css
- src/components/AcademyLearningCenter.tsx und zugehörige Styles
- src/components/AcademyAuthoringCenter.tsx und Styles
- src/components/AcademyMaterialManagementCenter.tsx, AcademyMaterialTaxonomyManager.css
- src/components/AcademyMaterialReader.tsx, AcademyMaterialReaderNotes.tsx, AcademyPrivateNoteSources.tsx
- ExamParticipantRunner, ExamReviewCenter, ExamCorrectionCenter
- die fünf lokalen SVG-Illustrationen unter src/assets/academy/.

### 3.1 Gemeinsame Academy-Hülle

Der aktuelle Code besitzt bereits eine fünfteilige Hauptnavigation und einen Rückweg zur Kachelstartseite. Die Navigation wird in AcademyCenter.tsx gerendert; der aktive Bereich erhält einen farbigen Unterstrich. Auf breiten Viewports nutzt sie fünf Spalten; unter 760 px wechselt das Raster bereits auf zwei Spalten, wobei der letzte Navigationspunkt die gesamte Zeile einnimmt. Der Rückweg und die Navigation sind vorhanden. Zu prüfen bleibt, ob diese zweispaltige mobile Anordnung in realen schmalen Viewports gut scanbar ist und ob die aktive Markierung, Fokusreihenfolge und Textlängen zuverlässig funktionieren.

**Redesign-Richtung:**
- Eine einzige gemeinsame Academy-Seitenhülle: direkter Rückweg zur Kachelstartseite, klarer Seitenkopf, horizontale Fünf-Bereiche-Navigation, darunter genau ein aktiver Inhaltsbereich.
- Der aktive Bereich bleibt durch Akzentfarbe plus Form/Gewicht/Unterstreichung erkennbar, nie nur durch Farbe.
- Die fünf Hauptpunkte bleiben auf großen Viewports gleichrangig und in stabiler Reihenfolge. Auf kleinen Viewports muss die Navigation lesbar bleiben; keine fünf schmalen, abgeschnittenen Buttons erzwingen. Eine responsive Umbruch- oder kontrollierte horizontale Navigationslösung ist anhand realer Viewports zu validieren; der aktive Punkt muss sichtbar bleiben.
- Interne Sekundärnavigation erscheint nur, wenn ein Bereich tatsächlich mehrere eigenständige Arbeitsansichten enthält. Sie darf nicht mit der Hauptnavigation konkurrieren.
- Seitentitel und Einleitung werden pro Unterseite einmal gezeigt. Keine mehrfachen Titel/Breadcrumbs mit identischer Information.
- Ein gemeinsames neutrales Oberflächenraster; Bereichsakzent nur in wenigen Orientierungsdetails. Statusfarben bleiben semantisch eigenständig.
- Wiederkehrende Seitentitel, Zurück-Aktion, Inhaltsbreite, Abstände, Oberflächen, Formulare und Fehlerzustände als gemeinsame Bausteine prüfen und vereinheitlichen.

### 3.2 Übersicht

**Ist-Bestand:** Begrüßungs-/Orientierungsseite mit Einordnung von Lehrgängen, Kursen und Bibliothek sowie kurzen Hinweisen zu Prüfungen und privaten Notizen. Die fünf Einstiegskacheln liegen ausschließlich auf der separaten Kachelstartseite.

**Redesign-Richtung:**
- Die Übersicht bleibt eine Orientierungsseite, kein zweites Dashboard.
- Ein kompakter, freundlicher Einstieg erklärt den Zweck der Academy in wenigen Sätzen.
- Ein klarer, leicht erfassbarer Zusammenhang zeigt: Lehrgänge bündeln Kurse; Kurse enthalten Lernziele/Kapitel/Material und Nachweisbedingungen; die Bibliothek stellt Materialien bereit; Prüfungen weisen Wissen/Anforderungen nach; Notizen bleiben privat.
- Keine fünf Bereichskacheln, keine zweite Navigation, keine persönliche Kursliste, keine Kennzahlen, kein Gesamtfortschrittsindex und keine kopierten Portal-Dashboard-Widgets.
- Inhalte als ein zusammenhängendes Erklärmodell statt mehrere dekorative Karten mit gleicher Gewichtung. Prüfungen und Notizen als kurze ergänzende Hinweise, nicht als weitere konkurrierende Hauptmodule.
- Die Wellenform bleibt auf die begrenzte Hero-/Kopfzone beschränkt; kein Vollflächenbild.

### 3.3 Kurse und Lehrgänge

**Ist-Bestand:** AcademyLearningCenter zeigt einen gemeinsamen Katalog mit getrennten Abschnitten für Ausbildungsprogramme/Lehrgänge und alle Kurse. Lehrgänge erscheinen als Karten, Kurse als kompakte Liste. Eine gemeinsame Suche filtert beide Bestände. Details unterscheiden Programmfortschritt, Pflicht-/Empfehlungskurse, Kursziele, Kapitel, Abschlussanforderungen und konkrete Materialbindungen. Admin/Colonel wechseln zusätzlich zwischen Lernen und Verwaltung.

**Redesign-Richtung:**
- Katalogkopf mit präzisem Titel, kurzer Erklärung und gemeinsamer Suche nur dann, wenn sie den tatsächlichen Bestand erschließt.
- Lehrgänge bleiben visuell als übergeordnete Ausbildungswege erkennbar; Kurse als einzelne Lerneinheiten. Beide werden nicht in eine einzige undifferenzierte Kartenwand gemischt.
- Lehrgangskarten zeigen nur vorhandene, entscheidungsrelevante Daten: Titel, kurze Zusammenfassung, vorhandenen persönlichen Status/Fortschritt und eine eindeutige Aktion.
- Kursliste bleibt kompakt und vergleichbar; Titel, Code/Version, kurze Zusammenfassung und tatsächlicher Teilnahmestatus in klarer Reihenfolge. Keine künstlichen Fortschrittswerte.
- Detailansicht eines Lehrgangs: Titel/Kennung/Version, echter Programmfortschritt (nur bei vorhandener Teilnahme), Lernziele, Pflichtkurse, empfohlene Kurse, Startaktion. Pflicht und Empfehlung müssen auch ohne Farbe unterscheidbar sein.
- Kursdetail: Titel/Kennung/Version, Lernziele, Kapitel, Nachweisbedingungen und zugehörige versionierte Materialien. Der Start ist eine bewusste Aktion; die UI darf nicht suggerieren, bloßes Öffnen beginne eine Teilnahme.
- Bestehende Statusunterschiede (nicht begonnen, in Bearbeitung, abgeschlossen, freiwillig/administrativ beendet) bleiben als Text klar lesbar. Abschluss ≠ bestanden.
- Kurs-/Programmverwaltung ist eine getrennte Arbeitsansicht für berechtigte Rollen, nicht ein zweiter Teilnehmerkatalog. Liste und Editor bleiben getrennte Ansichten; ungespeicherte Änderungen und Veröffentlichungs-/Materialprüfhinweise bleiben sichtbar.
- Keine neuen Statusfilter oder Datenfelder allein aus Designgründen einführen. Der im Audit festgestellte fehlende Statusfilter bleibt eine optionale spätere Funktionsfrage, nicht Bestandteil des visuellen Redesigns.

### 3.4 Lernbibliothek und Reader

**Ist-Bestand:** Der Katalog besitzt Themenbereiche, globale Suche, Sortierung, optionale Kategorie-/Dokumenttypfilter, aktive Filterchips und Materialkarten. Reader und Katalog sind getrennt; Materialnavigation kann im Reader geöffnet werden. Versionierte Materialien, Legacy-Materialien, private Notizen und Textanker folgen unterschiedlichen, bereits dokumentierten Regeln. Admins/Kursverantwortliche haben zusätzliche Verwaltungsansichten.

**Redesign-Richtung:**
- PR #202 und die folgenden visuellen Korrekturen bilden die aktuelle Baseline. Keine Rücknahme der größeren Themen-/Materialkacheln, Reader-Trennung oder privaten Notizintegration.
- Katalog: Themenbereiche als Einstieg nur dann zeigen, wenn keine Suche/Filter aktiv sind und die Kategorien tatsächlich verfügbare Materialien enthalten. Such-/Sortierleiste kompakt, Filter sekundär und optional, aktive Filter sichtbar und einzeln entfernbar.
- Materialkarten erhalten eine klare Vergleichshierarchie: Titel zuerst, danach Kategorie/Dokumenttyp, kurze Beschreibung und Materialkennung. Keine Metadatenwände.
- Reader: ruhige lesefokussierte Inhaltsfläche mit gut lesbarer Typografie/Zeilenlänge, klarer Versions-/Quellenmetadatenzone und zurückhaltender Aktionszone. Materialnavigation bleibt optional und eingeklappt/öffnbar; der Katalog-Rückweg bleibt eindeutig.
- **Lesemaß für Markdown:** Fließtext erhält eine begrenzte Zeilenlänge von ungefähr 66 Zeichen (Implementierung: `max-width: 68ch`), mindestens 16 px Grundschrift und großzügige, aber nicht übertriebene Zeilenhöhe. Tabellen behalten bei Bedarf ihren eigenen horizontalen Scrollbereich; Codeblöcke dürfen als vorformatierter Inhalt separat horizontal scrollen. Grundlage: USWDS empfiehlt 45–90 Zeichen pro Zeile, für längere Lesetexte etwa 66 Zeichen, und mindestens 16 px für gewöhnlichen Fließtext.
- Text/Markdown und Code bleiben die aktuellen Formate; Code wird nicht ausgeführt. PDF-Ausbau bleibt ausgesetzt.
- Verwaltung: Teilnehmerkatalog und Verwaltungsaufgaben dürfen nicht gleichzeitig um Aufmerksamkeit konkurrieren. Materialbearbeitung, Kategorien und Dokumenttypen sollen als zusammengehörige Verwaltungsaufgaben verständlich gruppiert werden, ohne zusätzliche Rechte oder Funktionen. Konkrete Navigation wird im Prototyp gegen die bestehende Rollenmatrix getestet.
- Keine Änderung an Versionierung, Veröffentlichung, Archivierung, Kursreferenzen, Berechtigungen, Materialstatus, Textankern oder privaten Notizen.

### 3.5 Prüfungen

**Ist-Bestand:** Die Hauptnavigation öffnet einen Prüfungsbereich mit einer zusätzlichen Navigation: Prüfungszentrum, Übungstests, (rollenabhängig) Abschlussprüfungen, offene Bewertungen und (Admin/Colonel) Korrekturen/Freigaben. Die Teilnehmeransicht enthält den neuen Prüfungsablauf; daneben existieren ältere Übungstest-/Abschlussprüfungsansichten. Examiner-Bewertung und Korrekturen/Freigaben sind separate Komponenten.

**Redesign-Richtung:**
- Prüfungen sind der Bereich mit der höchsten Konzentrationsanforderung. Ruhige, neutrale Arbeitsflächen und klare Aufgabenhierarchie haben Vorrang vor dekorativen Karten.
- Der Beerenton #A33370 bleibt ein kleiner Bereichsakzent, niemals Warnrot oder flächige rote Umrandung. Bestanden/Nicht bestanden, Fehler, Warnung und Freigabestatus behalten eigene semantische Farben.
- Teilnehmeransicht priorisiert verfügbare Prüfungen, Voraussetzungen/Startregeln und den aktuellen Prüfungszustand. Die beschlossene informierte Startbestätigung bleibt vollständig erhalten.
- Während eines aktiven Versuchs: Prüfungsinhalt, Zeitlimit, Fortschritt, Antwortauswahl, Speichern/Verbindungsstatus und Abgabe müssen hierarchisch klar sein. Keine unnötigen Nebeninformationen oder Navigationswechsel, die den Versuch gefährden.
- Ergebnisse unterscheiden Versuchsergebnis, interne Bewertung und offiziell freigegebenes Ergebnis. Diese Zustände dürfen visuell nicht verschmelzen.
- Rollenabhängige Examiner-Aufgaben werden als eigener Arbeitsmodus innerhalb des Prüfungsbereichs gruppiert. Offene Bewertungen und Korrektur/Freigabe bleiben fachlich getrennte Aufgaben; keine Vermischung von Teilnehmer- und Prüferaktionen.
- Die derzeitige zusätzliche Navigationsleiste wird im Prototyp auf klare Gruppierung und mobile Lesbarkeit geprüft. Sie bleibt nur so umfangreich, wie die vorhandenen getrennten Aufgaben es erfordern.
- **Offener technischer/fachlicher Prüfschritt:** Neuer Prüfungsablauf und ältere Übungstest-/Abschlussprüfungsansichten dürfen nicht allein durch visuelle Gestaltung zusammengelegt oder entfernt werden. Zuerst ihre Daten-/Workflow-Überlappung, tatsächliche Nutzung, Status-/Ergebnisquellen und Spezifikationslage prüfen. Bis dahin beide Pfade funktionsfähig halten.

### 3.6 Meine Notizen

**Ist-Bestand:** Private Notizen werden mit Suchfeld und Liste angezeigt; Notizen können in der zentralen Ansicht bearbeitet und gelöscht werden. Neue Notizen und Lesezeichen entstehen weiterhin im Reader. Quellenstatus und Mehrfachquellen werden angezeigt. Ein Privatsphäre-Hinweis erklärt die Konto-Isolation.

**Redesign-Richtung:**
- Persönliche, ruhige Arbeitsfläche mit grünem Akzent nur als Orientierungsdetail.
- Privatsphäre-Hinweis klar und dauerhaft auffindbar, aber nicht als dominantes Warnbanner.
- Suche über Titel/Inhalt/Schlagwörter bleibt die primäre Katalogaktion.
- Liste und Editor/Detailansicht sollen visuell nicht gleichzeitig um Aufmerksamkeit konkurrieren. Für die Bearbeitung wird eine fokussierte eigene Ansicht mit klarer Rückkehr zur Liste bevorzugt; mobile Ansicht folgt derselben Reihenfolge.
- Eintrag zeigt Titel, Notiz-/Lesezeichenart, Änderungsdatum, kurze Inhaltsvorschau, Schlagwörter und Quellenstatus in klarer Hierarchie.
- Quellen mit Status „nicht zugänglich“ oder „nicht mehr verfügbar“ bleiben als historische Referenz verständlich, dürfen aber keine Materialinhalte offenlegen oder Zugriff umgehen.
- Keine Erstellungsfunktion in der Notizenübersicht ergänzen: Neue Notizen/Lesezeichen entstehen weiterhin im Reader.
- Private Inhalte bleiben ausschließlich dem Eigentümer zugänglich; Admins erhalten keinen Zugriff. Keine Notizdaten in öffentliche Portal-State-/Backup-Projektionen verschieben.

### 3.7 Tieferliegende Verwaltungs- und Reader-Ansichten

- Kurs-/Programmverwaltung: Listenansicht und Editor getrennt; Formularabschnitte in fachlich sinnvoller Reihenfolge; Version/Revision und Warnhinweise sichtbar, nicht als dekorative Badges überladen.
- Materialverwaltung: Katalog/Liste und Editor mit klarer Auswahl; Metadaten, Kurszuständigkeit, Zugriffsvoraussetzung, Format und Inhalt logisch gruppiert; Versionshistorie sofort konsistent sichtbar.
- Kategorien/Dokumenttypen: spezialisierte Listen-/Editoraufgaben, keine gleichzeitige Formular- und Listenüberladung auf kleinen Bildschirmen; Archivieren/Reaktivieren und endgültiges Löschen klar auseinanderhalten.
- Reader-Notizen: Eingabe und Quellenkontext nahe am gelesenen Material; Speicherzustand und Konfliktauflösung verständlich, ohne private Inhalte an andere Rollen zu exponieren.
- Examiner-Bewertung: Bewertungsinhalt als Hauptarbeitsfläche, Kontextinformationen sekundär/einklappbar; Write-lock/Claim-Verlust und gespeicherte/ungespeicherte Änderungen müssen klar unterscheidbar bleiben.
- Korrektur-/Freigabearbeit: vorheriges freigegebenes Ergebnis, aktuelle Korrektur und Historie klar getrennt; verpflichtende Begründung sichtbar; keine Veränderung der Audit- oder Freigabelogik.

## 4. Gemeinsame Seitenmuster

### 4.1 Katalogseite
1. Rückweg zur Kachelstartseite und Seitenkopf.
2. Eine kurze, aufgabenbezogene Beschreibung.
3. Primäre Suche nur bei größeren Beständen.
4. Optionale Filter/Sortierung sekundär.
5. Inhalt als Karten oder kompakte Liste – abhängig davon, ob Einträge eher entdeckt oder verglichen werden.
6. Ein klarer Leer-, Lade-, Fehler- oder Berechtigungszustand; niemals Fehler als leeren Bestand darstellen.

### 4.2 Detailseite
1. Klarer Titel plus Kennung/Version als sekundäre Metadaten.
2. Zusammenfassung vor Detailmetadaten.
3. Inhalte in fachlich sinnvoller Reihenfolge.
4. Status und Voraussetzungen textlich sichtbar.
5. Genau eine primäre Aktion, weitere Aktionen sekundär.
6. Klarer Rückweg zur übergeordneten Katalogansicht und weiterhin direkter Academy-Kachel-Rückweg.

### 4.3 Editor-/Verwaltungsseite
1. Eigenständige Arbeitsansicht statt gleichzeitigem Katalog-/Formularwettbewerb.
2. Felder nach fachlicher Reihenfolge gruppiert; Pflichtfelder deutlich.
3. Ungespeicherter Zustand und Validierung klar kommuniziert.
4. Primäraktion (Speichern/Veröffentlichen) eindeutig; Abbrechen/Zurück sekundär.
5. Destruktive Aktionen räumlich getrennt und ausdrücklich gekennzeichnet.
6. Bestehende Berechtigungs- und Revisionsprüfungen unverändert.

### 4.4 Prüfungs-/Bewertungsarbeitsplatz
1. Aufgabe und aktueller Zustand sofort erkennbar.
2. Primärer Arbeitsinhalt bekommt den größten Raum.
3. Zeit, Versuch, Bewertung und Freigabe nicht in einem undifferenzierten Status zusammenziehen.
4. Sekundärer Kontext ist erreichbar, aber nicht dominant.
5. Kritische Aktionen (Start, Abgabe, Freigabe, Korrektur) erhalten klare, kontextgerechte Bestätigung.

## 5. Responsive und Accessibility-Anforderungen

- Ziel: WCAG 2.2 AA als Entwicklungs- und Testmaßstab, ohne zu behaupten, dass Konformität ohne vollständige Prüfung bereits erreicht ist.
- Navigation, Buttons, Formulare, Listen, Reader, Dialoge und Statusmeldungen müssen vollständig per Tastatur nutzbar sein.
- Sichtbarer Fokus darf nicht von Sticky-Elementen, Dialogen oder Container-Clipping verdeckt werden.
- Touch-Ziele ausreichend groß; WCAG 2.2 Target Size Minimum beachten, Ausnahmen nicht als Standardlayout missbrauchen.
- Inhalte müssen bei 320 CSS-Pixeln ohne horizontales Scrollen der gesamten Seite funktionieren; Codeblöcke dürfen eigene horizontale Scrollflächen behalten.
- Tabellen/Listen auf Mobilgeräten dürfen Informationen nicht stillschweigend verbergen. Gegebenenfalls in beschriftete Datengruppen umformen.
- Farbe ist nie der einzige Träger für Bereich, Status oder Auswahl.
- ARIA nur passend zur tatsächlichen Interaktion einsetzen. Navigation bleibt Navigation; echte Tabs benötigen vollständige APG-Tastaturinteraktion.
- Lade-, Leer-, Fehler-, Teilfehler-, Erfolgs-, Sperr- und Berechtigungszustände bleiben semantisch unterscheidbar und für Screenreader zuverlässig angekündigt.
- Reduced Motion, Dark Mode und Kontrast werden pro Muster geprüft.

## 6. Reihenfolge der Umsetzung

1. Gemeinsame Academy-Hülle und responsive Hauptnavigation prüfen/vereinheitlichen, ohne Kachelstartseite zu verändern.
2. Kurse/Lehrgänge: Katalog, Detailseiten und getrennte Verwaltungsansicht.
3. Meine Notizen: fokussierte Listen-/Editoransicht, Privatsphäre und Quellenstatus.
4. Prüfungen: Teilnehmerfluss, sekundäre Bereichsnavigation, Examiner und Freigabe/Korrektur.
5. Lernbibliothek/Reader: nur gezielte Konsistenzverbesserungen nach PR #202; keine Regression des bereits abgeschlossenen Redesigns.
6. Academy-Übersicht final gegen die anderen vier Bereiche prüfen; keine Dopplung.
7. Gesamtabnahme: Desktop, Tablet, 320/375/768/1024/1440 CSS-Pixel; Tastatur-only; Screenreader-Stichproben; Light/Dark; Reduced Motion; echte Rollen; Lade-/Fehler-/Leerdaten; Live-Firestore und Browsernavigation.

## 7. Abnahmekriterien

- Kein doppelter Einstieg in dieselben fünf Hauptbereiche.
- Kachelstartseite, Illustrationen, Hauptnavigation und Bereichsfarben entsprechen den bestehenden Beschlüssen.
- Jeder Unterbereich hat eindeutigen Titel, Zweck, Rückweg und klare primäre Aktion.
- Häufige Teilnehmeraufgaben sind sichtbar; seltene Verwaltungsaufgaben sind rollenbasiert und sekundär.
- Keine erfundenen Daten, Kennzahlen, Status oder Aktionen.
- Katalog, Detail, Editor, Reader und Prüfungsarbeitsplatz sind visuell klar unterscheidbar.
- Bestehende Geschäftslogik, API-Aufrufe, Berechtigungen, Versionen, private Daten und Prüfungsresultate bleiben unverändert.
- CI, Regressionstests und manuelle Browser-/Accessibility-Abnahme werden getrennt dokumentiert.
- Keine zusätzlichen Kosten oder externen Dienste.

## 8. Offene Prüfpunkte – keine stillschweigenden Beschlüsse

- Tatsächliche Desktop-/Mobil-Screens der aktuellen main-Version nach dem letzten Deployment prüfen.
- Daten-/Workflow-Überlappung zwischen neuem Prüfungszentrum und älteren Übungstest-/Abschlussprüfungsansichten fachlich/technisch aufklären.
- Prüfen, ob die mobile Fünf-Punkte-Hauptnavigation mit Umbruch oder horizontaler Navigation verständlicher bleibt; durch Prototyp und reale Viewports entscheiden.
- Bestehende Rollen-/Berechtigungsdarstellung in Verwaltungsansichten gegen aktuelle serverseitige Rechte prüfen.
- Fehlende Kursstatusfilter bleiben außerhalb des reinen visuellen Umfangs; eine funktionale Ergänzung benötigt separate fachliche Abwägung.
- Manuelle Live-Firestore-/Browser-/Screenreader-Abnahme bleibt offen.

## 9. Umsetzungsprotokoll – Meine Notizen

**PR #250 – am 12.11.2026 gemergt (Commit `1a4bb48841c017b7a2f8cc935660754c27523abc`):** Die Notizenübersicht und der Editor werden als getrennte Ansichten umgesetzt. Der Editor zeigt die privaten Quellenverknüpfungen weiterhin an. Speichern erhält die Primärgewichtung, Verwerfen eine sekundäre Aktion und Löschen eine klar destruktive Gestaltung. Ein Parent-/Child-Dirty-State schützt den Wechsel über die Hauptnavigation, den Kachel-Rückweg und Examiner-Deep-Links; während eines laufenden Speichervorgangs werden die lokalen Abbruchaktionen gesperrt.

Die Änderung ist rein clientseitige Darstellung/Zustandsführung. API, Revision, Datenmodell, Quellenbindung und Owner-Isolation bleiben unverändert. Der PR ist gemergt. CI (TypeScript, Produktionsbuild, Tests und PR-Vorlagenprüfung) war erfolgreich; der optionale Render-Deploy-Hook wurde übersprungen. Manuelle Browser-/Tastatur-/Screenreader-/Dark-Mode-Abnahme bleibt offen.


## 10. Vertiefter Codeabgleich und konkrete Befunde (12.11.2026)

### 10.1 Übersicht – Semantik und Inhalt

- Die Academy-Hülle rendert auf Unterseiten bereits eine globale h1 „Academy“. Die interne Übersichtsseite rendert zusätzlich eine zweite h1 „Willkommen in der Academy“. Das ist eine unnötige doppelte Hauptüberschrift im selben Dokument. **In PR #252 umgesetzt:** die interne Überschrift ist jetzt h2; die globale Academy-Überschrift bleibt die eine h1.
- Die Beschreibung der Übersichtskachel versprach zuvor „Ausbildungsstand und nächste Schritte“, obwohl die beschlossene Übersicht keine persönliche Fortschritts- oder Aufgabenliste ist. **In PR #251 korrigiert:** die Kachel beschreibt jetzt die Orientierung über Aufbau und Zusammenspiel der Academy-Bereiche.
- Die eigentliche Übersichtsseite entspricht inhaltlich bereits dem Beschluss: nicht-linearer Lernweg, Lehrgänge/Kurse/Bibliothek, kurze Einordnung von Prüfungen und privaten Notizen, keine duplizierten persönlichen Kennzahlen oder Bereichslinks. Die Grundstruktur muss nicht neu erfunden werden.

### 10.2 Kurse und Lehrgänge – Kontext im aktiven Kurs

- Vor dem Kursstart zeigt die Detailansicht Lernziele und Kapitel.
- Nach Beginn einer Teilnahme zeigt der aktive Detailpfad Abschlussbedingungen/Nachweise und den versionierten Materialreader, blendet aber Lernziele und Kapitel aus derselben Kursversion aus.
- Das ist ein konkreter Informationsverlust für bereits gestartete Teilnehmer: die fachliche Zielsetzung und Kapitelstruktur bleiben relevant, auch wenn die Teilnahme begonnen hat.
- **In PR #252 umgesetzt:** dieselben veröffentlichten Lernziele und Kapitel werden auch im aktiven Detailpfad angezeigt, in kompakter Hierarchie und ohne neue Daten/Status/Funktionen. Abschlussnachweise und Materialreader bleiben zentral.

### 10.3 Prüfungen – zwei unterschiedliche Daten-/Workflow-Familien

- Der neue ExamParticipantRunner lädt den Prüfungskatalog über /api/academy/exams/catalog und arbeitet mit versionierten Prüfungsversuchen, Autosave, serverseitigen Versuchsstatuswerten und freigegebenen Ergebnissen.
- Die zusätzlichen Bereiche „Übungstests“ und „Abschlussprüfungen“ in AcademyCenter lesen dagegen die ältere AcademyExamDoc-Familie aus den Portal-Props und speichern Fortschritt über den älteren Progress-Endpunkt. Die alte Anlage unter POST /api/academy/exams ist serverseitig ausdrücklich als Legacy-Anlage gekennzeichnet.
- Beide Systeme verwenden ähnliche sichtbare Begriffe, sind aber keine nachgewiesen identischen Datenquellen oder Workflows. Dadurch besteht ein reales Risiko doppelter bzw. widersprüchlicher Prüfungs-Einstiege.
- **Schutzmaßnahme:** bis Datenbestand, Migration, Nutzung und Ergebnis-/Freigaberegeln vollständig abgeglichen sind, weder die alten Pfade löschen noch die beiden Systeme visuell/funktional zusammenführen. Dieser Punkt bleibt ein eigener technischer und fachlicher Prüfblock.

### 10.4 Nicht erreichbare Legacy-Editorpfade

- Der lokale activeTab-State enthält noch upload_textbook, add_code_test und instructor_grading; die zugehörigen JSX-Zweige und Handler sind noch im großen AcademyCenter.tsx enthalten.
- Im gesamten Component-State gibt es keine Navigation, die diese Werte setzt. Die aktuellen sichtbaren Einstiege führen zur versionierten Lernbibliothek, zum neuen Prüfungszentrum und zur separaten Kurs-/Lehrgangsverwaltung.
- Die betreffenden Legacy-Editorpfade sind damit im aktuellen Academy-UI nicht erreichbar. Das ist zunächst ein Wartbarkeitsbefund, keine Berechtigungslücke: die Handler prüfen zusätzlich serverseitige Rechte und die Routen sind nicht sichtbar verlinkt.
- **Nächster Prüfschritt:** Abhängigkeiten, alte Datensätze und API-Verträge prüfen. Danach die nachweislich toten UI-Zweige/States gezielt entfernen oder eine bewusste Legacy-Rückführung dokumentieren. Keine Daten oder Legacy-Teilnehmeransichten ohne Migrationsprüfung löschen.

### 10.5 Gemeinsame Navigation und Verwaltungsansichten

- Die Hauptnavigation bleibt ein fünfteiliger, einzelner Navigationsbereich; die mobile CSS-Regel verwendet unter 760 px zwei Spalten und eine volle letzte Zeile. Das vermeidet fünf zu schmale gleich breite Buttons. Die tatsächliche Lesbarkeit bei 320/375/768 px muss manuell geprüft werden; aus CSS allein wird keine responsive Abnahme abgeleitet.
- Kursverwaltung und Materialverwaltung öffnen jeweils eigenständige Listen-/Editoransichten. Die Materialverwaltung blendet die Liste beim Editieren aus; Versionshistorie und Formular sind dadurch nicht gleichzeitig mit einem zweiten Katalog im Wettbewerb. Dieses Muster bleibt erhalten.
- Die Bibliotheks-Unterbereiche „Materialien“, „Kategorien“, „Dokumenttypen“ und „Materialverwaltung“ sind unterschiedliche vorhandene Aufgaben. Keine zusätzliche Untermenüebene allein aus optischen Gründen einführen.

## 11. Umsetzungsprotokoll – Terminologie (PR #251)

**PR #251 – am 12.11.2026 gemergt (Commit `611f701df54ecb302a4fcf84005544beee4485a1`):** Teilnehmerkatalog, Kurs-/Lehrgangsdetails, Fortschritt, Teilnahme, Versionsbindungen, Verwaltungslisten, Editorbeschriftungen, Fehlermeldungen, Bestätigungen und Kursbereich-Navigation verwenden sichtbar „Lehrgang“ statt „Programm“. Die Academy-Übersichtskachel beschreibt nun den tatsächlichen Orientierungszweck. Technische Program-Namen und Datenverträge bleiben unverändert.

GitHub Actions: PR-Vorlagenprüfung erfolgreich; TypeScript-/Produktionsbuild-/Testworkflow erfolgreich, 455/455 Tests. Optionaler Render-Deploy-Hook übersprungen. PR #251 ist gemergt; manuelle Browser-/Screenreader-Abnahme steht aus.


## 12. Umsetzungsprotokoll – Kursdetail und Katalogzustände (PR #252)

**PR #252 – am 12.11.2026 gemergt (Commit `a952a59360f3ef1c47c5517acf0b9dd78f1d9da0`):** Die doppelte h1 auf der Academy-Übersicht wurde behoben, indem die interne Überschrift auf h2 herabgestuft wurde. Im aktiven Kursdetail werden die Lernziele und Kapitel aus der bereits geladenen, teilnahmegebundenen Kursversion zusätzlich angezeigt. Suchergebnislosigkeit erhält eigene Meldungen; ein vorhandener Versionsdatensatz ohne Kurzbeschreibung wird nicht mehr als fehlende Veröffentlichung dargestellt.

Die Änderung verändert keine Daten, API, Berechtigungen, Statuswerte, Nachweisbedingungen oder Versionierung. TypeScript, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung waren erfolgreich; manuelle Browser-/Accessibility-Abnahme steht noch aus.


## 13. Umsetzungsprotokoll – Prüfungsstart und Berechtigungsprojektion (PR #253)

**PR #253 – am 12.11.2026 gemergt (Commit `8df61a5d1e04df91126955aa76825c818b7bc00f`):** Der erste Klick auf „Prüfung starten / fortsetzen“ legt keinen Versuch mehr an. Der Runner fragt zunächst den aktiven Versuch für genau diesen Prüfung-/Kurskontext ab. Die Bestätigung unterscheidet einen neuen Start von der Fortsetzung eines bestehenden Versuchs.

- Neuer Versuch: tatsächlicher Zeitlimitbeginn und echte Versuchslimitierung werden angezeigt; 0/null werden gemäß Datenmodell als unbegrenzt interpretiert.
- Fortsetzung: Versuchnummer, Kurskontext, Startzeit und vorhandene Deadline werden angezeigt; kein zusätzlicher Versuch wird gezählt und die Frist wird nicht zurückgesetzt.
- „Zurück“ schließt die Bestätigung, „Prüfung verbindlich starten“ legt erst dann einen neuen Versuch an; „Laufenden Versuch fortsetzen“ setzt den aktiven Versuch idempotent fort.
- Numerische minClearance-Werte werden aus der öffentlichen Katalogprojektion entfernt. Die serverseitige Filterung nach Freigabestufe bleibt unverändert; sichtbare Texte sagen nur „für dich freigegeben“.

Die Entscheidung basiert auf der bereits beschlossenen Option C vom 06.11.2026. Der PR änderte keine Bewertungs-, Fragen-, Timer- oder Berechtigungslogik. CI erfolgreich: TypeScript, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung. Manuelle Browser-/Tastatur-/Screenreader-Abnahme bleibt offen.

## 14. Umsetzungsprotokoll – Examiner-Accessibility und sekundäre Informationen (PR #255)

**PR #255 – am 12.11.2026 gemergt (Commit bcce59fb9f967299105313ce769fc6bc549e885e):**

- Übergabe-/Neuzuweisungs- und Freigabepanels sind Inline-Regionen im normalen Dokumentfluss. Die vorherige role="dialog" aria-modal="true"-Kennzeichnung war falsch, da kein Modal-Overlay und keine Modal-Fokusbegrenzung existierten.
- Die Panels haben nun eine beschriftete Region und eine fokussierbare Überschrift. Beim Öffnen wird der Fokus auf diese Überschrift gesetzt; beim Abbrechen wird er zum Auslöser zurückgeführt.
- Der sekundäre Vorgangskontext einer offenen Bewertung ist standardmäßig geschlossen.
- Die Korrekturhistorie einer abgeschlossenen Bewertung ist als native Disclosure mit Eintragsanzahl standardmäßig geschlossen.

Claims, Übergabe, Neuzuweisung, Speichern, Freigabe, Korrektur und Auditdaten bleiben unverändert. CI erfolgreich: TypeScript, Produktionsbuild, 455/455 Tests und PR-Vorlagenprüfung. Manuelle Tastatur-/Screenreader-Abnahme bleibt offen.


## 13. Prüfungs-Unter-Navigation – rollenpräzise Aktionsbezeichnung (13.11.2026)

**PR #287 – in Arbeit:** https://github.com/MDP0063/rcpd-new/pull/287

- Admins sehen für den bestehenden Korrektur-/Freigabebereich die Bezeichnung „Korrekturen & Freigaben“.
- Colonels sehen „Bewertungskorrekturen“, da die vorhandene Komponente Ergebnisfreigaben ausschließlich für Admins lädt und anbietet (`canReleaseResults={currentUser.role === 'admin'}`).
- Die Unter-Navigation gruppiert die Teilnehmerwege sichtbar unter „Teilnahme“ und rollenabhängige Arbeitsaufgaben unter „Prüferaufgaben“; die Prüfergruppe erscheint nur für berechtigte Rollen. Auf schmalen Viewports werden die Gruppen untereinander angeordnet.
- Admins behalten die Bezeichnung „Korrekturen & Freigaben“, Colonels sehen „Bewertungskorrekturen“. Die Änderung korrigiert Gruppierung und Beschriftung; Rollen, Rechte, API-Aufrufe und tatsächliche Aktionen bleiben unverändert.
- TypeScript-Check, Produktionsbuild und 455/455 Servertests sind auf Code-Commit `b0250ec` erfolgreich; PR-Vorlagenprüfung ebenfalls. Der optionale Render-Deploy-Hook wurde übersprungen. Die Browserprüfung mit Admin- und Colonel-Rolle steht noch aus; keine Berechtigungs- oder Workflowänderung.
