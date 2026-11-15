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


## 12. Kursdetail – Versions- und Verfügbarkeitskontext (13.11.2026)

**PR #286 – am 15.11.2026 gemergt:** https://github.com/MDP0063/rcpd-new/pull/286 (Merge-Commit `ca2fcb0c31d2d317c51a8c880ea639f0ecbbf896`)

- Bei nicht gestarteten Kursen zeigt die Detailkopfzeile die tatsächlich ausgewählte veröffentlichte Kursversion. Die Teilnahmehistorie wird nicht länger als Ersatz für Versionsmetadaten verwendet.
- Fehlende Kurzbeschreibung und fehlende veröffentlichte Kursversion erhalten unterschiedliche, sachlich korrekte Hinweise.
- Archivierte und vorübergehend nicht verfügbare Kurse zeigen ihren vorhandenen Zustand auch in der Detailansicht. Der Start wird clientseitig deaktiviert, wenn der bestehende serverseitige Veröffentlichungs-/Verfügbarkeits-Gate einen neuen Start ablehnt.
- Die Änderung betrifft nur die bestehende Darstellung und Aktivierung der Startaktion. Serverprüfung, Version-Pinning, Berechtigungen, bestehende Teilnahmen und Nachweislogik bleiben unverändert.
- TypeScript-Check, Produktionsbuild und 455/455 Servertests sind auf Commit `9975db5` erfolgreich; die PR-Vorlagenprüfung ist ebenfalls erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen. Die gezielte Browser-/Responsive-/Accessibility-Prüfung steht noch aus; der PR bleibt Draft und es wurde kein Deployment ausgelöst.

## 13. Prüfungs-Unter-Navigation – rollenpräzise Aktionsbezeichnung (13.11.2026)

**PR #287 – am 15.11.2026 gemergt:** https://github.com/MDP0063/rcpd-new/pull/287 (Merge-Commit `df4f73a172ab29b056fffde78196dd3cac23ed2f`)

- Admins sehen für den bestehenden Korrektur-/Freigabebereich die Bezeichnung „Korrekturen & Freigaben“.
- Colonels sehen „Bewertungskorrekturen“, da die vorhandene Komponente Ergebnisfreigaben ausschließlich für Admins lädt und anbietet (`canReleaseResults={currentUser.role === 'admin'}`).
- Die Unter-Navigation gruppiert die Teilnehmerwege sichtbar unter „Teilnahme“ und rollenabhängige Arbeitsaufgaben unter „Prüferaufgaben“; die Prüfergruppe erscheint nur für berechtigte Rollen. Auf schmalen Viewports werden die Gruppen untereinander angeordnet.
- Die Änderung korrigiert Gruppierung und Beschriftung; Rollen, Rechte, API-Aufrufe und tatsächliche Aktionen bleiben unverändert.
- TypeScript-Check, Produktionsbuild und 455/455 Servertests sind auf dem aktuellen Implementierungsstand `b6cc35c` erfolgreich; PR-Vorlagenprüfung ebenfalls. [Build-/Testworkflow](https://github.com/MDP0063/rcpd-new/actions/runs/43391193711). Der optionale Render-Deploy-Hook wurde übersprungen. Die Browserprüfung mit Admin- und Colonel-Rolle steht noch aus; keine Berechtigungs- oder Workflowänderung.

## 14. Lernbibliothek – visuelle Verfeinerung (13.11.2026)

**PR #288 – am 15.11.2026 gemergt:** https://github.com/MDP0063/rcpd-new/pull/288 (Merge-Commit `d5b742363ff4cd0b4d7f8fb6b37eb5e7c576c8cf`)

- Der bestätigte violette Bereichsakzent (#6841B8) wird in Themenbereichen, Materialmetadaten, Fokuszuständen und primären Reader-Aktionen konsistent verwendet. Die Farbe bleibt ein Bereichsakzent und wird nicht als Statusfarbe eingesetzt.
- Themenbereichs- und Materialkarten erhalten eine ruhigere, konsistente Oberflächenhierarchie mit klarer Hover-/Fokus-Rückmeldung; der Tastaturfokus nutzt eine durchgezogene, kontrastreiche Violettkontur.
- Kategorie und Dokumenttyp werden auf Materialkarten als kompakte Metadaten-Chips dargestellt.
- Beschreibungen in Karten werden auf maximal drei Zeilen begrenzt, damit Katalogkarten bei längeren Texten vergleichbar bleiben; der vollständige Inhalt bleibt im Reader zugänglich.
- Reader-Navigation, Kopfbereich und Materialaktion werden dezent auf die Bibliotheksidentität abgestimmt. Die Lesefläche selbst bleibt neutral und lesefokussiert.
- Mobile Karten und Such-/Sortierflächen erhalten ausreichend große Aktionen und volle verfügbare Breite.
- Keine Änderung an Katalogdaten, Suche, Filtern, Sortierung, Materialzugriff, Versionierung, Notizen, Textankern oder Verwaltung. Keine neuen Abhängigkeiten und keine PDF-Infrastruktur.
- TypeScript-Check, Produktionsbuild und 455/455 Servertests sind auf Implementierungs-Commit `4dca74f` erfolgreich. [Build-/Testworkflow](https://github.com/MDP0063/rcpd-new/actions/runs/43427744171); [PR-Vorlagenprüfung](https://github.com/MDP0063/rcpd-new/actions/runs/43427744279) erfolgreich. Die nachfolgenden Änderungen betreffen nur die Dokumentation. Browser-/Accessibility-Prüfung steht noch aus.

## 15.11.2026 – Statuskorrektur der bereits integrierten Redesign-Schritte

Die folgenden PRs sind seit dem vorherigen Dokumentstand in `main` integriert:

- **PR #286 – Kursdetail: Versions- und Verfügbarkeitskontext**, Merge-Commit `ca2fcb0c31d2d317c51a8c880ea639f0ecbbf896`. Nicht gestartete Kurse zeigen die tatsächlich ausgewählte veröffentlichte Kursversion; fehlende Beschreibung und fehlende Veröffentlichung sind getrennt. Archivierte/nicht verfügbare Kurse werden benannt und können nicht über die UI neu gestartet werden.
- **PR #287 – Rollenpräzise Prüfungsnavigation**, Merge-Commit `df4f73a172ab29b056fffde78196dd3cac23ed2f`. Teilnehmerwege und Prüferaufgaben sind gruppiert; die Aktionsbezeichnung richtet sich nach der tatsächlich vorhandenen Admin-/Colonel-Berechtigung. Die beiden Navigationsgruppen haben sichtbare Tastatur-Fokusmarkierungen.
- **PR #288 – Lernbibliothek visuell verfeinern**, Merge-Commit `d5b742363ff4cd0b4d7f8fb6b37eb5e7c576c8cf`. Violetter Bibliotheksakzent, Themen-/Materialkarten, Metadaten, Reader-Kopfbereich und mobile Flächen wurden konsistenter. Dark-Mode-Kartenfokus und Blockquote-Kontrast der Materialvorschau wurden ergänzt.
- **PR #289 – Materialeditor und Taxonomie**, Merge-Commit `8f25d303165f466f9b295a265caa5a07566209d6`. Die bestehenden Formulargruppen, Bearbeiten-/Vorschau-Umschaltung, Aktionen sowie Taxonomieelemente erhielten eine klarere Hierarchie; Dark-Mode-Fokus wurde ergänzt.

Alle vier PRs durchliefen den jeweiligen TypeScript-/Build-/Server-Testworkflow und die PR-Vorlagenprüfung erfolgreich. Die optionalen Render-Deploy-Schritte wurden übersprungen. **Nicht behauptet** werden Browser-, Screenreader-, responsive oder Live-Firestore-Abnahmen; diese bleiben Bestandteil der späteren gemeinsamen Academy-QA.

---

## 16. Vollständiges Academy-Usability-Redesign – Zielbild vom 15.11.2026

### 16.1 Ziel und Arbeitsprinzip

Das Redesign adressiert nicht nur einzelne CSS-Abweichungen. Es soll die Bedienlogik der Academy für alle bestehenden Aufgaben verständlich und vorhersehbar machen. Nutzer sollen möglichst schnell erkennen:

1. In welchem Bereich und welcher Ansicht sie sich befinden.
2. Welches Objekt bzw. welcher Vorgang gerade betrachtet wird.
3. Welcher Zustand tatsächlich vorliegt und was dieser Zustand bedeutet.
4. Welche Handlung als Nächstes möglich und sinnvoll ist.
5. Was beim Auslösen einer wichtigen Aktion geschieht und ob die Aktion erfolgreich gespeichert wurde.
6. Wie sie sicher zur vorherigen Übersicht bzw. zur Academy-Kachelstartseite zurückkehren.

Die Gestaltung wird nicht künstlich auf 14-Jährige zugeschnitten. Sie nutzt einfache, konkrete Sprache, stabile Muster, kurze Beschriftungen, sichtbare Rückmeldungen und eine klare Informationshierarchie. Fachbegriffe bleiben dort erhalten, wo sie tatsächlich wichtig sind; sie werden beim ersten Auftreten in verständlicher Sprache erklärt.

**Grundprinzip:** Pro Ansicht gibt es eine klar erkennbare Hauptaufgabe. Sekundäre Informationen und seltene Aktionen bleiben erreichbar, konkurrieren aber nicht gleich stark mit dieser Aufgabe. Weniger sichtbare Elemente dürfen niemals fachlich notwendige Informationen oder Folgen verschweigen.

### 16.2 Gemeinsame Academy-Seitenstruktur

Jede interne Ansicht verwendet dieselbe Orientierungsstruktur:

- **Academy-Rückweg:** Eine dauerhafte, eindeutig beschriftete Aktion führt direkt zur fünfteiligen Kachelstartseite zurück. Sie ist keine Breadcrumb-Ersatzlösung und darf bei tiefen Ansichten nicht verschwinden.
- **Bereichsorientierung:** Die bestehende horizontale Fünf-Bereiche-Navigation bleibt der einzige Wechsel zwischen Übersicht, Kurse, Lernbibliothek, Prüfungen und Meine Notizen. Der aktive Bereich erhält einen deutlich sichtbaren, aber dezenten Bereichsakzent.
- **Seitenkopf:** Ein konkreter Seitentitel beschreibt die aktuelle Aufgabe (z. B. „Lehrgänge und Kurse“, „Lernbibliothek“, „Meine Notizen“, „Verfügbare Prüfungen“). Eine kurze Einordnung erklärt nur dann etwas, wenn sie bei der Aufgabe hilft.
- **Kontextnavigation:** Innerhalb eines Bereichs werden zusätzliche Ziele nur dann als Navigation dargestellt, wenn sie eigenständige Ansichten sind. Ansichtsumschalter für denselben Datensatz (z. B. Bearbeiten/Vorschau) sind dagegen lokale Steuerelemente und keine zweite Navigation.
- **Arbeitsfläche:** Die aktuelle Hauptaufgabe erhält den größten Raum. Such-/Filtersteuerungen, Hilfstexte, Historien und Verwaltungsaktionen folgen ihrer tatsächlichen Bedeutung.
- **Rückkehr und Zustandserhalt:** Ein Rückweg innerhalb des Moduls stellt nach Möglichkeit Suchbegriff, Filter, Sortierung, Auswahl und die relevante Scrollposition wieder her. Die direkte Academy-Kachel-Rückkehr bleibt davon unabhängig.

Nicht jede Seite benötigt eine Karte oder ein Panel. Container werden nur eingesetzt, wenn sie zusammengehörige Inhalte visuell abgrenzen. Flächen, Rahmen und Schatten dürfen keine künstliche Hierarchie vortäuschen.

### 16.3 Gemeinsame Bedienmuster und Steuerelemente

**Buttons**
- Primär: genau eine Hauptaktion pro Arbeitskontext, mit konkretem Verb („Kurs starten“, „Entwurf speichern“, „Prüfung verbindlich starten“).
- Sekundär: unterstützende Aktion mit neutraler Outline-/Flächenbehandlung („Details ansehen“, „Zurück“, „Vorschau“).
- Tertiär: seltene oder ergänzende Aktion als ruhiger Textbutton.
- Destruktiv: Löschen und endgültiges Entfernen werden ausdrücklich benannt und räumlich von Speichern/Veröffentlichen getrennt. Archivieren ist nicht automatisch „rot“, weil es ein anderer, reversibler Lebenszyklusschritt ist.
- Deaktivierte Aktion: nur deaktivieren, wenn der Grund direkt verständlich bleibt. Wo hilfreich steht eine kurze Erklärung unmittelbar daneben bzw. darunter. Eine nicht verfügbare Aktion darf nicht wie ein aktiver Button aussehen.

**Suche**
- Ein sichtbares Label statt ausschließlich eines Platzhalters.
- Der Platzhalter ist ein Beispiel für Suchinhalte, keine Ersatzbeschriftung.
- Suche ist klar auf ihren Bereich beschränkt; bei der Bibliothek bleibt sie ausdrücklich global für alle zugänglichen Materialien.
- Suchbegriff lässt sich mit einer eindeutigen Aktion löschen. Aktive Filter werden getrennt als entfernbarer Zustand angezeigt.
- Ergebniszahlen beziehen sich auf tatsächlich geladene und gefilterte Datensätze; Teilfehler werden als unvollständige Ergebnisse benannt, nicht als vollständige Trefferzahl.

**Filter**
- Filter bleiben sekundär und zunächst kompakt, solange ihre Anwendung nicht die Hauptaufgabe der Seite ist.
- Aktive Filter bleiben außerhalb des eingeklappten Filterbereichs sichtbar und einzeln entfernbar; eine gemeinsame Zurücksetzen-Aktion ist vorhanden.
- Filteroptionen werden nur aus verlässlichen Datenfeldern und bereits definierten Statuswerten angeboten. Kein Filter darf einen nicht vorhandenen fachlichen Zustand simulieren.
- Filteränderungen dürfen die Auswahl oder Tastaturposition nicht unerwartet verlieren. Auf kleinen Viewports wird der Filterbereich in den Dokumentfluss eingeblendet, nicht als schwer kontrollierbares Overlay über Inhalte gelegt.

**Sortierung**
- Eine klar benannte Auswahl mit wenigen fachlich sinnvollen Optionen.
- Standardreihenfolge muss zur Aufgabe passen: Relevanz bei einer Suche, eine nachvollziehbare stabile Reihenfolge beim normalen Durchstöbern.
- Datumsbasierte Sortierung nur mit tatsächlich vorhandenen, fachlich richtigen Zeitstempeln. Keine „zuletzt aktiv“- oder „beliebt“-Sortierung aus nicht vorhandenen Daten.
- Status und Sortierung sind unterschiedliche Steuerungen.

**Statusdarstellung**
- Ein Status ist eine beschreibende Information, kein Button. Klickbare Filter erhalten deshalb eine andere Form als ein Status-Tag.
- Die sichtbare Beschriftung enthält die Bedeutung („In Bearbeitung“, „Ergebnis noch nicht freigegeben“, „Archiviert“), nicht nur ein farbiges Kürzel.
- Mehrere unabhängige Zustände werden nicht zu einem einzigen Badge verdichtet. Veröffentlichung, Verfügbarkeit/Zugriff, persönliche Teilnahme und Ergebnisfreigabe bleiben unterscheidbar.
- Wenn ein Zustand unklar, fehlend oder nur teilweise geladen ist, wird er neutral beschrieben und nicht in eine positive/negative Kategorie gezwungen.

**Formulare**
- Felder nach dem tatsächlichen Arbeitsablauf gruppieren, Pflichtangaben erkennbar kennzeichnen und Hinweise direkt am betroffenen Feld platzieren.
- Fehler werden in verständlicher Sprache erklärt; Werte bleiben erhalten. Bei längeren Formularen erhält eine Fehlerzusammenfassung Fokus und verlinkt zu den Feldern.
- Ungespeicherte Änderungen müssen sichtbar sein. Navigation, Wechsel in andere Ansichten und Abbruch dürfen Eingaben nicht still verwerfen.
- Speichern, Veröffentlichen, Archivieren und Löschen sind fachlich getrennte Aktionen und dürfen nicht durch eine generische Aktionsgruppe verwischt werden.
- Nur echte modale Prozesse werden als Dialog implementiert. Inline-Details bleiben normale beschriftete Regionen; Fokus wird bei Bedarf sinnvoll geführt und zurückgegeben.

**Listen und Karten**
- Karten dienen der Entdeckung unterscheidbarer Objekte (z. B. Lehrgänge und Bibliotheksthemen).
- Gleichartige Einträge, die Nutzer vergleichen oder gezielt suchen, erhalten eine kompakte, wiedererkennbare Listen-/Kartenstruktur mit stabiler Informationsreihenfolge.
- Eine Materialkarte bleibt gemäß Beschluss eine größere, eigenständige Kachel – sie wird aber in ihrer Höhe und Metadatenmenge so reduziert, dass mehrere Einträge schnell verglichen werden können.
- Keine Karte bekommt eine künstliche Punktzahl, Fortschrittsgrafik, Lesezeit, Beliebtheit, Empfehlung oder Priorität, wenn die Daten dafür nicht verlässlich vorhanden sind.

### 16.4 Farb- und Statussystem

Die fünf bereits festgelegten Bereichsakzente bleiben bestehen. Sie kennzeichnen die Identität des Bereichs und erscheinen sparsam in kleinen Flächen, aktiven Navigationsmarkierungen, ausgewählten Überschriftakzenten oder kleinen Illustrations-/Kicker-Details. Sie sind kein allgemeines Aktions- oder Statussystem.

Für alle Academy-Unterseiten gilt:
- Neutrale Oberflächen bilden den Hauptteil der Arbeitsfläche.
- Primäre Aktionen verwenden eine einheitliche, neutrale Aktionsfarbe und nicht automatisch die Farbe des Bereichs.
- Sekundäre Aktionen bleiben neutral und unterscheidbar.
- Statusfarben werden ausschließlich nach tatsächlicher fachlicher Bedeutung eingesetzt und werden stets mit verständlichem Text bzw. Symbol kombiniert.
- Grün bedeutet nur einen nachweislich erfolgreichen/abgeschlossenen/freigegebenen Zustand.
- Amber bedeutet tatsächlichen Handlungsbedarf oder einen fachlich relevanten Vorbehalt, nicht bloß eine normale Information.
- Rot bedeutet tatsächlichen Fehler, nicht bestanden/fehlgeschlagen oder irreversible/destruktive Aktion; es ist keine Ersatzfarbe für Archivierung oder normale Navigation.
- Blau/neutral kennzeichnet Information oder einen aktiven Zustand nur, wenn die fachliche Bedeutung dazu passt.
- „Nicht begonnen“, „Archiviert“, „Derzeit nicht verfügbar“, „Nicht zugänglich“, „Bewertung offen“, „Ergebnis erwartet“ und „Ergebnis freigegeben“ müssen als unterschiedliche Aussagen erhalten bleiben. Es wird nicht jeder Zustand einer Farbe zugeordnet, nur um mehr Farbe auf dem Bildschirm zu haben.
- Der Dark Mode erhält dieselbe Semantik. Farben werden neu auf den jeweiligen Oberflächenkontrast abgestimmt; es ist nicht zulässig, eine helle Statusfarbe ungeprüft in den Dark Mode zu übernehmen.

### 16.5 Modul 1 – Übersicht

**Aufgabe:** verstehen, wie die Academy aufgebaut ist und wie Lehrgänge, Kurse, Lernbibliothek, Prüfungen und private Notizen zusammenhängen.

**Zielgestaltung:**
- Kurzer Einstieg mit einem klaren Zweck und einer ruhigen Einordnung.
- Der nicht-lineare Zusammenhang zwischen Lehrgang, eigenständigem Kurs und Bibliotheksmaterial wird durch eine leicht erfassbare Struktur erklärt.
- Prüfungen werden als Rückmeldung/Nachweis eingeordnet, nicht als pauschale nächste Stufe.
- Private Notizen werden als persönliches Werkzeug erklärt, nicht als administrative Ablage.
- Der Hinweis, dass bloßes Öffnen keinen Abschluss erzeugt, bleibt sichtbar, aber nicht als Warnbanner.
- Keine fünf Kacheln, keine zweite Bereichsnavigation, keine persönliche Kursliste, keine KPIs, kein Gesamtfortschrittsindex und keine duplizierten Dashboard-Aufgaben.

**Entwicklungsaufwand:** niedrig bis mittel. Hauptsächlich Kompositions-/Typografie- und semantische Überarbeitung. Funktionale Datenänderungen sind nicht erforderlich.

### 16.6 Modul 2 – Kurse und Lehrgänge

**Katalog**
- Lehrgänge und unabhängige Kurse bleiben zwei klar erkennbare Gruppen, aber innerhalb eines gemeinsamen Katalogs mit derselben Suche.
- Lehrgänge erhalten eine etwas erklärendere Kartenstruktur, weil sie ein übergeordnetes Ausbildungsziel mit Pflicht- und Empfehlungskursen darstellen.
- Kurse werden kompakter und vergleichbarer dargestellt: Titel, Kurskennung, Veröffentlichungs-/Verfügbarkeitsinformation, eigener Teilnahmestatus, kurze Beschreibung und genau eine Detailaktion.
- Suchergebnisse, leere veröffentlichte Bestände, nicht verfügbare Einträge und Ladefehler werden getrennt behandelt.
- UI-Filter für bestehende Teilnahmezustände können angeboten werden: Alle, Nicht begonnen, In Bearbeitung, Abgeschlossen, Freiwillig beendet, Administrativ beendet. Diese Werte stammen aus dem vorhandenen Statusmodell; der Filter ändert keine Teilnahme und erfindet keine Zwischenstufen.
- Ein zusätzlicher Verfügbarkeitsfilter wird nur verwendet, wenn die Katalogdaten diese Dimension vollständig und verlässlich enthalten.
- Bei Suche ist Relevanz sinnvoll, bei normaler Katalogansicht eine stabile, nachvollziehbare Reihenfolge. Es wird keine künstliche Priorität oder „empfohlen für dich“-Sortierung eingeführt.

**Kursdetail**
- Kopfbereich: Titel, Kurskennung und ausgewählte veröffentlichte Version. Fehlende Zusammenfassung ist eine andere Aussage als fehlende Veröffentlichung.
- Statusinformationen werden getrennt: Veröffentlichung/Verfügbarkeit und persönliche Teilnahme. Ein Kurs kann veröffentlicht und verfügbar sein, ohne dass der Nutzer ihn begonnen hat.
- Lernziele und Kapitel bleiben auch während einer begonnenen Teilnahme sichtbar.
- Abschlussbedingungen und Nachweise werden in einer eigenen, klar benannten Gruppe erklärt. „Abgeschlossen“ und „Bestanden“ werden nicht gleichgesetzt.
- Die primäre Aktion spiegelt den tatsächlichen Zustand: „Kurs starten“ oder „Teilnahme fortsetzen“, nur wenn die bestehenden serverseitigen Regeln dies zulassen.
- Materialreader und Nachweise bleiben in derselben Kursversion sichtbar. Die Kursmaterialien verweisen weiter auf exakt gepinnte Materialversionen.
- Historie und Korrekturen bleiben aufrufbar, aber konkurrieren nicht mit der aktuellen Lernaufgabe.

**Lehrgangdetail**
- Titel, Ziel und Version zuerst.
- Pflichtkurse und empfohlene Kurse räumlich und sprachlich klar trennen.
- Fortschritt nur anhand bereits gespeicherter, autoritativer Beteiligungs-/Abschlussdaten. Der Prozentwert wird erklärt und ist nicht die einzige Statusinformation.
- Keine künstliche lineare Reihenfolge, keine pauschale Sperre empfohlener Kurse und keine neuen Voraussetzungen.
- Fehlende, archivierte oder nicht verfügbare Teilkurse werden mit ihrem wirklichen Zustand erklärt.

**Verwaltung**
- Teilnehmerkatalog und Kurs-/Lehrgangsverwaltung bleiben getrennte Modi.
- Kurseditor und Lehrgangseditor verwenden dieselbe Feldlogik, aber zeigen nur die für den jeweiligen Objekttyp relevanten Felder.
- Gruppen: Grunddaten; Lernziele/Kapitel; Material- und Kurszuordnungen; Voraussetzungen/Abschlussregeln; Version/Veröffentlichung.
- Speichern als Entwurf ist nicht Veröffentlichen. Veröffentlichte Fassungen bleiben unverändert; neue Fassungen und Versionshistorien sind ausdrücklich als solche dargestellt.
- Status- und Versionsinformationen dürfen keine falsche Aktionserwartung erzeugen.

**Entwicklungsaufwand:** mittel. UI-Filter und Sortierung können aus vorhandenen Katalog-/Teilnahmedaten abgeleitet werden. Detail-/Editor-Komposition ist vorwiegend Frontend. Vor Implementierung ist nachzuweisen, dass alle angezeigten Werte bereits in der Teilnehmerprojektion vorhanden sind; fehlende sensible Felder dürfen nicht über neue APIs nachgereicht werden.

### 16.7 Modul 3 – Lernbibliothek und Reader

**Bibliothekskatalog**
- Der Einstieg beginnt mit „Lernbibliothek“ und der Beschreibung, dass alle zugänglichen veröffentlichten Materialien an einem Ort liegen.
- Themenbereiche erscheinen nur, solange keine Suche oder Filter aktiv sind und nur wenn sie tatsächlich zugängliche Materialien enthalten. Die größere Themenkachel bleibt erhalten; sie ist aber visuell deutlich von der fünfteiligen Academy-Startkachel unterscheidbar.
- Suchfeld ist die primäre Katalogsteuerung. Es durchsucht weiterhin global alle zugänglichen Materialien, nicht nur die sichtbare Kategorie.
- Sortierung bietet Relevanz, Titel A–Z und tatsächliches Aktualisierungsdatum. Die Sortierung bleibt auf einer klaren Position neben der Suche.
- Filter für Kategorie und Dokumenttyp bleiben eingeklappt; aktive Filter sind außerhalb des Filterbereichs als einzeln entfernbare Auswahl sichtbar. „Alle Filter zurücksetzen“ ist vorhanden.
- Keine neuen Filterdimensionen wie Popularität, Schwierigkeit, Lesezeit oder Aktualitätsfenster ohne zuverlässige tatsächliche Metadaten.
- Ergebnisanzahl bezieht sich auf die wirkliche Trefferliste. Wenn Legacy-/Versioned-Katalogdaten nur teilweise geladen sind, wird das klar als Teilfehler kommuniziert.
- Materialeinträge bleiben größere Kacheln, werden aber deutlich kompakter und vergleichbarer: Titel zuerst; Kategorie/Dokumenttyp neutral als Metadaten; eine kurze Beschreibung mit maximal drei Zeilen; Materialcode sowie tatsächliche Versions-/Aktualitätsinformation sekundär; ein klarer Öffnungsbutton. Die Karte darf keine künstliche Mindesthöhe oder leeren Flächen erzeugen, wenn der Inhalt kurz ist.
- Karten sollen in einer gut scannbaren vertikalen Liste erscheinen. Die vorhandene Kachel-/Card-Identität bleibt erhalten; ein Wechsel zu einer winzigen, dichten Tabelle ist nicht vorgesehen. Bei sehr breiten Viewports darf die Darstellung erst nach Prüfung der Vergleichbarkeit in mehrere Spalten wechseln; Standard bleibt gut lesbare vertikale Orientierung.
- Eine vollständig leere Bibliothek, keine Treffer aufgrund von Such-/Filterbedingungen, Ladefehler und teilweise geladene Bestände sind vier unterschiedliche Zustände. Fehler dürfen nicht als „keine Materialien“ dargestellt werden.
- Zurück aus einem geöffneten Material erhält Suchbegriff, Filter, Sortierung, Auswahl und den relevanten Listen-Kontext.

**Reader**
- Die Lesefläche ist neutral, großzügig und von Verwaltungselementen getrennt. Bereichsviolett darf im Kopfbereich und in kleinen Werkzeugmarkierungen auftauchen, nicht als große Lesefläche.
- Inhaltstext nutzt 16 px als Ausgangspunkt und eine Lesebreite um 68ch; längere Zeilen werden begrenzt, Tabellen und Codeblöcke dürfen eigene horizontale Scrollbereiche erhalten.
- Überschriftenhierarchie, Absätze, Listen, Blockquotes, Tabellen und Inline-Code müssen im Hell- und Dunkelmodus gut lesbar sein. Alle Elemente erhalten explizite, zum Theme passende Vordergrund-/Hintergrundfarben, statt von zufälliger Vererbung abzuhängen.
- Die Material-/Versionsmetadaten bleiben erkennbar, aber klein und nachrangig gegenüber Titel und Inhalt.
- Inhaltsübersicht und Materialnavigation bleiben optional und standardmäßig eingeklappt; die Lesefläche wird nicht unnötig eingeengt. Der Katalog-Rückweg ist jederzeit eindeutig.
- Private Notizen und Lesezeichen bleiben am Reader und an der konkreten Materialversion gebunden. Speicherstatus, Konflikt und Wiederherstellung müssen verständlich und sichtbar sein. Die Privatsphäre wird ruhig als „Nur für dich sichtbar“ erklärt, nicht als grüne Statusauszeichnung.
- Code bleibt Quelltext und wird niemals ausgeführt; Markdown bleibt sanitisiert. Externe Bilder werden nicht ungeprüft gerendert.

**Verwaltung**
- Teilnehmerkatalog, Materialverwaltung, Kategorien und Dokumenttypen bleiben rollenabhängig getrennte Aufgaben.
- Materialliste/Editor, Taxonomieliste/Editor und Dokumenttyp-Liste/Editor konkurrieren nicht gleichzeitig um den Fokus.
- Editorgruppen: Grunddaten und Zuordnung; Zugriff/Kurszuständigkeit (nur vorhandene Felder); Inhalt/Format; Vorschau; Versions-/Veröffentlichungszustand.
- „Entwurf speichern“ ist die primäre Aktion; „Entwurf veröffentlichen“ wird nur angezeigt/aktiviert, wenn die vorhandene Logik es erlaubt. Archivierung und endgültige Löschung bleiben getrennt und klar erläutert.
- Kategorie und Dokumenttyp werden als Metadaten erklärt; keine farbigen, interaktiven Status-Chips, die wie Filter oder Buttons aussehen, wenn sie keine sind.

**Entwicklungsaufwand:** mittel bis hoch. CSS-Konsolidierung und gemeinsame Markdown-Darstellung haben hohen Wiederverwendungswert. Katalog- und Reader-Zustandserhalt sind wichtig, aber können Regressionen in Notiz-Textankern und Versionierung verursachen. Neue PDF-Infrastruktur bleibt ausgeschlossen.

### 16.8 Modul 4 – Prüfungen und Examiner

**Teilnehmer-Prüfungsübersicht**
- Prüfungsnavigation bleibt in „Teilnahme“ und „Prüferaufgaben“ gruppiert.
- Die Liste zeigt Prüfungstitel, Kursbezug, Prüfungstyp und tatsächliche Voraussetzungen bzw. verfügbare Regeln. Nicht freigegebene Prüfungen und interne Clearance-Daten werden nicht offengelegt.
- Auswahl und Detailansicht sind klar getrennt. Eine ausgewählte Prüfung darf nicht wie eine bereits gestartete Prüfung aussehen.
- Ergebnisse und Prüfungshistorie bleiben der Teilnehmeransicht zugeordnet; interne Review-/Freigabeschritte sind keine Teilnehmeraktionen.
- Startbestätigung Option C bleibt vollständig bestehen und erklärt ausschließlich die wirklichen Konsequenzen.

**Laufender Versuch**
- Prüfungsinhalt erhält den größten Platz; Timer, Fortschritt, Fragenübersicht und Speicherzustand sind klar getrennte Hilfsinformationen.
- Eine Frage wird nur als beantwortet angezeigt, wenn die serverseitige Speicherung bestätigt wurde. Ausstehende oder fehlgeschlagene Speicherung ist sichtbar.
- Fragenübersicht unterscheidet aktuelle, beantwortete, offene und markierte Frage nicht allein über Farben.
- Auf kleinen Viewports wird die Fragenübersicht bewusst eingeklappt; die eigentliche Frage bleibt im Fokus.
- Abgabe zeigt vorab noch offene und markierte Fragen und fordert bewusste Bestätigung. Ein ungespeicherter Antwortstand darf nicht als sicher abgegeben gelten.

**Ergebnisse**
- Abgegeben, interne Bewertung offen, Ergebnisfreigabe ausstehend, bestanden/nicht bestanden und historischer Snapshot bleiben unterschiedliche Zustände.
- Nur offiziell freigegebene Werte werden als Teilnehmer-Ergebnis ausgegeben. Ein sichtbarer Snapshot während Revision ist klar als historischer/derzeit nicht nachweiswirksamer Stand erklärbar, sobald der bestehende Workflow das so vorgibt.
- Die Farben passen zum echten Zustand; Beerenton bleibt Prüfungs-Bereichsidentität und keine Fehler- oder Warnfarbe.

**Examiner-Arbeitsplatz**
- „Prüferaufgaben“ ist ein eigener Arbeitsmodus innerhalb der Prüfungsnavigation, kein sechster Academy-Hauptbereich.
- Offene Bewertungen, Korrekturen/Freigaben und Revisionsanfragen bleiben fachlich getrennte Aufgaben. Ihre Berechtigung wird serverseitig durchgesetzt; die Navigation zeigt nur tatsächlich erlaubte Einstiege.
- Aufgabenlisten verwenden die bereits beschlossenen Filter (Kurs, Prüfungstyp, Status, eigene Vorgänge und Teilnehmersuche). Sortierung basiert nur auf echten Zeit-/Fristfeldern. Keine künstliche Priorität.
- Öffnen beansprucht nicht; Claim ist eine gesonderte Handlung und wird vor dem Start verständlich erklärt.
- Ein aktueller Claim, Zuständigkeit, Schreibsperre, Speichern, Übergabe und Freigabe müssen unterscheidbar sein. Interne Teilnehmerantworten oder vertrauliche Bewertungsdaten werden nicht in allgemeine Listen projiziert.
- Kontext- und Historienbereiche dürfen eingeklappt sein, aber bleiben ohne neue Navigationsebene erreichbar.
- Der Grading Workspace priorisiert die Bewertung selbst; Kontextpanel bleibt optional. Tablet/Mobil erhält eine klare vertikale Reihenfolge.

**Verbindliche Schutzgrenze:** Der neue ExamParticipantRunner und die älteren Übungstest-/Kursabschlussprüfungsansichten sind unterschiedliche Daten-/Workflow-Familien. Sie werden nicht allein aus Designgründen zusammengeführt oder entfernt. Die Daten-/Migrationsfrage ist ein eigener technischer Prüfpunkt.

**Entwicklungsaufwand:** hoch. Prüfungsversuch, Autosave, Timer, Claim- und Freigabestatus sind sicherheits-/datenintegritätsrelevant. Vorrang haben visuelle Vereinheitlichung und Tastaturbedienung ohne Änderungen an Ablauf/Backend; jede funktionale Korrektur wird separat regressionsgetestet.

### 16.9 Modul 5 – Meine Notizen

- Der Bereich bleibt ein persönlicher Arbeitsbereich, kein zweiter Editor im Reader und keine neue Erstellungsoberfläche.
- Liste und Editor bleiben getrennte Ansichten. Die Liste konzentriert sich auf Suche, Titel, Notiz-/Lesezeichenart, kurze Vorschau, Tags, Aktualisierungsdatum und Quellenstatus.
- Suchbegriff filtert Titel, Inhalt und Tags wie bisher. Leere Liste und keine Treffer werden sprachlich getrennt.
- Quellenstatus wird pro Quelle sachlich erläutert: verfügbar, nicht zugänglich oder nicht mehr verfügbar. Eine Quelle darf niemals selbst Zugriff gewähren.
- Der Editor zeigt Titel, Inhalt, Tags, Speicherstatus und Quellen. Speichern/Autosave ist klar bestätigt; Konflikt/Retry/aktuelle Fassung laden sind unterscheidbare Wege.
- Neu erstellen und Lesezeichen setzen bleiben ausschließlich im Reader. Die Notizenübersicht erhält keinen zweiten Erstellungsbutton.
- Private Inhalte bleiben ausschließlich dem Eigentümer zugänglich; eine administrative Vorschau oder geteilte Notizenfunktion wird nicht eingeführt.

**Entwicklungsaufwand:** mittel. Das Redesign nutzt vorhandene Funktionen und muss die bestehende Save Queue und Parent-/Child-Dirty-State-Logik ausdrücklich schützen.

### 16.10 Gemeinsame responsive Regeln

Die folgenden Breiten sind konkrete Prüfviewports und keine starren Layoutvorgaben: 320, 375, 768, 1024 und 1440 CSS-Pixel. Zusätzlich sind Zoom 200 % und 400 % sowie längere Überschriften/Fehlertexte zu prüfen.

- Hauptnavigation bleibt im beschlossenen Muster. Bei engen Breiten werden Beschriftungen nicht abgeschnitten und nicht auf unverständliche Kürzel reduziert.
- Such-/Filtergruppen stacken bei wenig Platz. Filter werden im Dokumentfluss eingeblendet und verdrängen Inhalte, statt eine dauerhaft überlappende Ebene zu bilden.
- Listen und Karten bleiben auf Mobile vollständig nutzbar; Aktionen erhalten ausreichend große Touch-Ziele.
- Reader und Prüfungsversuch erhalten eine klare lineare Priorität; sekundäre Navigation/Seitenleisten werden einklappbar.
- Formulare werden einspaltig; Aktionsgruppen stapeln sich in sinnvoller Reihenfolge. Destruktive Aktionen bleiben separat und sind nicht direkt neben der primären Speichern-Aktion als gleichwertige Schaltfläche angeordnet.
- Keine horizontale Seitenscrollfläche; nur Code, Tabellen oder ausdrücklich eigenständige Inhaltsbereiche dürfen intern horizontal scrollen.
- Sticky-Elemente dürfen Fokus nicht verdecken. Fokus-/Aktivzustände bleiben auch bei 200–400 % Zoom erkennbar.

### 16.11 Gemeinsame Design- und QA-Gates

- WCAG 2.2 AA wird als Mindestmaßstab verwendet; zusätzlich wird bei den primären Touch-Aktionen auf ungefähr 44×44 CSS-Pixel gezielt, obwohl SC 2.5.8 mindestens 24×24 CSS-Pixel (mit definierten Ausnahmen) fordert.
- Normale Textfarbe braucht mindestens 4,5:1; große Schrift mindestens 3:1. Interaktive Komponenten und Fokusindikatoren werden gesondert geprüft.
- Kein Status, keine Auswahl und keine Fehlermeldung wird ausschließlich durch Farbe vermittelt.
- Jede Interaktion ist per Tastatur erreichbar; Fokus ist sichtbar, logisch geordnet, nicht verdeckt und wird bei Inline-/Dialogaktionen korrekt geführt.
- Screenreader erhalten korrekte Überschriften, Labels, Landmarken, Live-Statusmeldungen, Fehlerzuordnung und sinnvolle Namen.
- Reduced Motion wird respektiert; Animation erklärt keinen Zustand, der nicht auch ohne Bewegung sichtbar ist.
- Light/Dark Mode verwenden dieselbe Informations- und Farbbedeutung; Kontrast wird pro Oberfläche neu geprüft.
- CI (TypeScript, Build, Servertests) und manuelle Browser-/Screenreader-/Live-Firestore-Abnahme werden getrennt ausgewiesen. Die manuelle Abnahme erfolgt später in der vereinbarten gemeinsamen QA.

### 16.12 Umsetzungsreihenfolge und Aufwand

1. **Gemeinsame Design-/Bediengrundlagen** – neutrale Aktionsstile, Statussemantik, Fokus, Feldlabels, Fehlermeldungen, Flächentokens und Markdown-Darstellung. Aufwand: mittel; hoher Wiederverwendungswert.
2. **Lernbibliothek und Reader** – wichtigste Usability-Baustelle; Such-/Filter-/Ergebnisorientierung, kompakte größere Materialkacheln, klare Rückkehr, lesefokussierter Reader und Theme-konsistente Markdown-Elemente. Aufwand: hoch; Regressionrisiko bei Versionierung, Suche, Readerposition und privaten Textankern.
3. **Kurse und Lehrgänge** – vorhandene Zustände nutzbar filterbar und Katalog-/Detailhierarchie. Aufwand: mittel; Filter nur aus bereits vorhandenen Teilnahmezuständen und sicheren Teilnehmerprojektionen.
4. **Meine Notizen** – Liste/Detail/Editor, Quellenstatus und Save-Feedback. Aufwand: mittel; Save Queue und Owner-Isolation dürfen nicht regressieren.
5. **Prüfungen und Examiner** – Teilnehmerkatalog, Prüfungsausführung, Ergebnisse und Arbeitswarteschlange konsistent gestalten. Aufwand: hoch; besonders hohe Testanforderungen wegen Timer, Autosave, Claims, Ergebnisfreigabe, Revision und Rollen.
6. **Verwaltung** – Kurs-/Lehrgangs-, Material- und Taxonomieeditoren als klare Arbeitsmodi. Aufwand: mittel; Rechte und Lebenszyklusaktionen unverändert.
7. **Übersicht und Gesamtintegration** – visuelle Harmonisierung, Lesbarkeit und Navigation, ohne Kennzahlen/Kachelduplikate. Aufwand: niedrig bis mittel.
8. **Gemeinsame Abschluss-QA** – reale Daten und Rollen, Browsernavigation, Tastatur, Screenreader, Theme und Reflow. Aufwand: hoch und separat einzuplanen.

Ein Untermodul wird erst nach eigenem Diff-/Regressionreview und vollständigen CI-Prüfungen gemergt. Große Module sollen in klar abgegrenzte PRs aufgeteilt werden; ein vollständiges Designziel bedeutet nicht einen riesigen, unreviewbaren Code-PR.

### 16.13 Recherchequellen und konkrete Übertragbarkeit

- [W3C – WCAG 2.2](https://www.w3.org/TR/WCAG22/): normative Grundlage für Kontrast, Farbsemantik, Tastatur, Reflow, Fokus und Zielgrößen.
- [W3C – Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): bei schmalen Viewports und Zoom muss Inhalt in einer Spalte nutzbar bleiben; horizontales Scrollen bleibt auf tatsächlich zweidimensionale Inhalte begrenzt.
- [W3C – Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum): 24×24 CSS-Pixel oder eine der spezifizierten Ausnahmen. Für primäre Touch-Aktionen wird bewusst großzügiger gestaltet.
- [W3C – Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum): Sticky-Header/Seitenleisten dürfen Tastaturfokus nicht vollständig verdecken.
- [GOV.UK – Task list](https://design-system.service.gov.uk/components/task-list/): verständliche, kurz benannte Aufgaben, sinnvolle Gruppierung und getrennte Statusinformation. Übertragbar auf Kurs-/Lehrgangsschritte und Examiner-Arbeitslisten, aber nicht als starre lineare Kursreihenfolge.
- [GOV.UK – Tag](https://design-system.service.gov.uk/components/tag/): Status-Tags sind beschreibend und nicht interaktiv; Verben in Tags können wie Aktionen wirken. Daher sind klickbare Filter sichtbar anders gestaltet.
- [U.S. Web Design System – Typography](https://designsystem.digital.gov/components/typography/): 45–90 Zeichen als normale Zeilenlänge, etwa 66 Zeichen als Zielwert für längere Lesetexte. Das stützt die bereits beschlossene Readerbreite um 68ch.
- [Canvas Student Dashboard](https://community.instructure.com/en/kb/articles/664361-how-do-i-use-the-dashboard-as-a-student): unterschiedliche Dashboard-Ansichten (Karten, Liste, aktuelle Aktivitäten) dienen verschiedenen Bedürfnissen; für RCPD wird daraus keine zusätzliche Dashboard-Kennzahl abgeleitet.
- [Open edX – Course dashboard](https://docs.openedx.org/en/latest/educators/how-tos/course_development/manage_course/dashboard.html): Kurskatalog nach Status und Titel sortierbar; für RCPD ist das ein Muster für UI-Filtern nach vorhandenen Teilnahmezuständen, ohne neue fachliche Statuswerte zu erfinden.
- [USWDS – Search](https://designsystem.digital.gov/components/search/): dauerhaftes Label, ausreichend breites Suchfeld, persistenter Suchbegriff in Ergebnissen und einfache Standardsuche. Für RCPD: keine komplexe erweiterte Suche als Standard.
- [GOV.UK – Details](https://design-system.service.gov.uk/components/details/): Zusatzinformationen dürfen bei Bedarf offengelegt werden, aber keine Information verstecken, die die meisten Nutzer für ihre Aufgabe benötigen. Für RCPD: Filter können kompakt sein; handlungsrelevante Voraussetzungen und Konsequenzen nicht.
- [GOV.UK – Accordion](https://design-system.service.gov.uk/components/accordion/): nur einsetzen, wenn Nutzer verwandte Abschnitte tatsächlich vergleichen oder gezielt ein-/ausblenden müssen; keine verschachtelten Accordions. Für RCPD: lieber klare Überschriften und kurze Abschnitte, statt jede Gruppe in eine zusätzliche Offenlegungsebene zu legen.
- [GOV.UK – Error message](https://design-system.service.gov.uk/components/error-message/): Fehler erklären Ursache und Korrektur, Eingaben bleiben erhalten, Fehlertext wird mit dem Feld verknüpft und bei Bedarf zusammengefasst.
- [GOV.UK – Button](https://design-system.service.gov.uk/components/button/): riskante Aktionen werden nicht allein über Rot kommuniziert; Text und Kontext benennen die Folge.
- [Canvas – Module als Teilnehmer](https://community.instructure.com/en/instructure/kb/articles/661313-how-do-i-view-modules-as-a-student): Inhaltsmodule und Anforderungen sind getrennt erkennbar; Fortschritts-/Sperrsymbole werden erklärt. Für RCPD wird keine lineare Reihenfolge übernommen, wo die vorhandenen Kursregeln keine erzwingen.
- [Khan Academy – Student Dashboard](https://support.khanacademy.org/hc/en-us/articles/46935588089997-How-do-I-use-the-student-dashboard): Lernaufgaben werden nach echten Fälligkeiten priorisiert. Für RCPD ist dies nur bei tatsächlich vorhandenen Fristdaten übertragbar; künstliche Fristen, Streaks oder Gamification werden nicht ergänzt.

Diese Quellen sind die Begründungsbasis für Muster, keine Vorlagen zum Kopieren. Die Übertragung orientiert sich an den bereits beschlossenen RCPD-Daten-, Rollen-, Status- und Navigationsregeln.
