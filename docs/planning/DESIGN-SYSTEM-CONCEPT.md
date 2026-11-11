# RCPD – Visuelle Gestaltungsgrundlagen und Designsystem-Konzept

**Stand:** 11.11.2026  
**Status:** ARBEITSKONZEPT – noch kein finales Designsystem und keine Implementierungsfreigabe  
**Geltungsbereich:** Gesamtportal mit der Academy als erstem visuellen Arbeitsabschnitt

## 1. Zweck und Verhältnis zu bisherigen Beschlüssen

Dieses Dokument überführt die am 11.11.2026 bestätigte gestalterische Arbeitsweise in einen nachvollziehbaren Arbeitsstand. Es ergänzt Masterplan, Portal-Redesign-Details, Academy-Spezifikation und Entscheidungsregister; es ersetzt oder überschreibt keine davon.

Der Projektinhaber hat ChatGPT die eigenständige Ausarbeitung objektiv begründbarer visueller und UX-Details übertragen. Diese Freiheit gilt nur, wenn bestehende Arbeit, fachliche Anforderungen, Funktionen, Berechtigungen, Daten und bereits freigegebene Oberflächen nicht gefährdet oder rückgängig gemacht werden.

Prägende, nicht objektiv entscheidbare Grundsatzfragen – insbesondere visuelle Identität, grundlegende Stilrichtung, starke Farb-/Formensprache oder konzeptionelle Änderungen – werden vor einer Festlegung erneut mit dem Projektinhaber abgestimmt. Bereits bestätigte Grundrichtungen müssen nicht erneut grundsätzlich zur Wahl gestellt werden; ihre konkrete Ausarbeitung darf aber nicht stillschweigend zu einer anderen Identität führen.

## 2. Unveränderliche Grundlagen und Schutzgrenzen

- Das Redesign betrifft langfristig das gesamte RCPD-Portal; die endgültige globale Portalgestaltung ist noch nicht beschlossen.
- Die Academy kann eine eigenständige, freundlichere Lernplattform-Anmutung erhalten, muss aber in ein späteres Gesamtdesign integrierbar bleiben.
- Die bereits fertiggestellte fünfteilige Academy-Kachel-Startseite bleibt unverändert. Sie ist der einzige Einstieg in die fünf Academy-Hauptbereiche.
- Innerhalb eines geöffneten Academy-Bereichs bleibt die beschlossene horizontale Hauptnavigation maßgeblich: Übersicht, Kurse, Lernbibliothek, Prüfungen, Meine Notizen.
- Keine zweite parallele Navigation oder zusätzliche Kachelübersicht mit denselben fünf Zielen auf internen Bereichsseiten.
- Die interne Academy-Übersicht richtet sich nach der bereits beschlossenen Informationsarchitektur und dem umgesetzten Stand aus PR #158. Sie wird nicht durch die fünf Einstiegskacheln ersetzt oder dupliziert.
- Fachliche Regeln, Statusdefinitionen, Datenquellen, Berechtigungen, private Notizen, Versionsbindungen und bestehende Aktionen bleiben unverändert.
- Keine neue globale Sidebar, Header-Hierarchie, Portalnavigation, Theme-Strategie oder neue Funktion wird allein aus einem Mockup abgeleitet.
- PDF-Infrastruktur bleibt zurückgestellt und ist kein Bestandteil dieser Gestaltungsarbeit.
- Keine kostenpflichtigen Dienste, externen Assets oder zusätzlichen Laufzeitabhängigkeiten für rein visuelle Effekte einführen, wenn eine lokale Lösung genügt.

## 3. Bestätigte visuelle Richtung für die Academy

Die folgenden Punkte wurden im Gespräch am 11.11.2026 grundsätzlich bestätigt und bilden den Ausgangspunkt:

- moderne, einladende und freundliche Lernplattform statt rein nüchterner Verwaltungsoberfläche;
- ruhige, matte und dezente blaue Wellenform als begrenztes Gestaltungselement, nicht als großflächiges Hintergrundbild;
- leicht getönter, ruhiger Seitenhintergrund statt ausschließlich reinweißer Fläche;
- klar gegliederte Inhaltsflächen und eine moderne, gut lesbare Kopfzone;
- gemeinsame Designsprache für alle Academy-Bereiche mit dezenten, bereichsspezifischen Akzenten;
- die fünf Bereiche sollen individuell passend wirken, aber sichtbar zu einem zusammenhängenden System gehören.

Die konkrete Form, Intensität und Positionierung der Wellenform bleibt im Prototyp zu prüfen. Die erste Bildgenerierung war eine explorative Visualisierung, keine verbindliche Layoutvorlage. Fehlerhafte oder nur illustrative Elemente des Bildes (u. a. doppelte Profilnavigation und wiederholte Bereichskacheln auf einer internen Seite) sind ausdrücklich nicht zu übernehmen.

## 4. Bestehende Bereichsfarben

Die bereits dokumentierten Bereichsfarben bleiben als bestehende Arbeitsgrundlage erhalten:

| Bereich | Akzentfarbe |
|---|---|
| Übersicht | Blau `#2864D9` |
| Kurse | Petrol `#087F8C` |
| Lernbibliothek | Violett `#6841B8` |
| Prüfungen | Beere `#A33370` |
| Meine Notizen | Grün `#287A45` |

Diese Farben sind Akzent-/Identifikationsfarben der Bereiche, keine vollständige Farbpalette. Ihre Verwendung für große Flächen, Text, Status oder Navigation ist nicht automatisch freigegeben. Kontrast und semantische Bedeutung sind separat zu prüfen. Statusfarben (Erfolg, Warnung, Fehler, Information) müssen unabhängig von Bereichsfarben verständlich bleiben.

## 5. Vorläufige Systemprinzipien

Die folgenden Prinzipien sind fachlich begründete Empfehlungen für das entstehende System. Sie legen noch keine endgültigen konkreten Werte oder subjektive Markenästhetik fest.

### 5.1 Design-Tokens statt Einzelwerte

- Farben, Typografie, Abstände, Radien, Linien, Oberflächen und Fokusdarstellung sollen über benannte, semantische Tokens gesteuert werden.
- Komponenten sollen keine zufällig verteilten Einzelwerte für dieselbe Funktion verwenden.
- Bereichsfarben, neutrale Oberflächen, Textfarben und Statusfarben sind getrennte Token-Gruppen.
- Tokens werden erst nach dem visuellen Prototyp und dem Abgleich mit bestehenden Styles verbindlich festgelegt.

Begründung: Das US Web Design System verwendet begrenzte, konsistente Token-Skalen für Farbe, Typografie und Abstände, damit Oberflächen zusammenhängend und wartbar bleiben. Quelle: https://designsystem.digital.gov/design-tokens/

### 5.2 Typografie und Lesbarkeit

- UI-Typografie bleibt klar, gut lesbar und für längere Lerninhalte geeignet.
- Überschriften, Fließtext, Metadaten und Hilfstexte erhalten nachvollziehbare Hierarchien.
- Lange Materialtexte dürfen nicht dieselbe enge Dichte wie kompakte Verwaltungsmetadaten erhalten.
- Zeilenlänge und Zeilenhöhe sind im Reader und auf schmalen Viewports gesondert zu prüfen.
- Kleine Schrift darf nicht zur Lösung von Platzproblemen werden.

Begründung: USWDS behandelt Schriftgröße, Zeilenhöhe, Textmaß und Abstände als zusammenhängende Lesbarkeitsfaktoren. Quelle: https://designsystem.digital.gov/design-tokens/typesetting/

### 5.3 Farbe und Kontrast

- Farbe unterstützt Hierarchie und Orientierung, ersetzt aber keine Beschriftung, Form oder Statusinformation.
- Für normalen Text gilt als Mindestziel WCAG 2.2 AA, Erfolgskriterium 1.4.3: Kontrastverhältnis 4,5:1; für großen Text 3:1.
- Interaktive Komponenten, Fokusindikatoren und nicht-textuelle Informationen werden anhand der jeweils einschlägigen WCAG-Kriterien separat geprüft.
- Bereichsfarben dürfen nicht ungeprüft als Textfarbe auf beliebigen Hintergründen verwendet werden.
- Keine Statusbedeutung ausschließlich über Farbe vermitteln.

Quellen: https://www.w3.org/TR/WCAG22/ und https://designsystem.digital.gov/design-tokens/color/overview/

### 5.4 Abstände, Gruppierung und Flächen

- Zusammengehörige Inhalte werden räumlich gruppiert; Gruppen erhalten konsistente Innen- und Außenabstände.
- Abstände folgen einer begrenzten Skala und nicht individuellen Zufallswerten.
- Karten werden nur eingesetzt, wenn sie eine erkennbare inhaltliche oder funktionale Gruppe bilden; nicht jeder Textabschnitt benötigt einen eigenen Container.
- Schatten, Rahmen und Rundungen bleiben zurückhaltend und erfüllen eine klare Hierarchieaufgabe.
- Die genaue Dichte wird pro Bereich und Aufgabe geprüft: Reader und Tabellen benötigen andere Flächenlogik als eine Übersichtsseite.

USWDS nutzt eine definierte Abstandsskala auf Basis von 8-Pixel-Schritten als Systemgrundlage. Das ist ein möglicher Referenzpunkt, kein bereits beschlossener RCPD-Wert. Quelle: https://designsystem.digital.gov/design-tokens/spacing-units/

### 5.5 Navigation und Orientierung

- Die beschlossene Academy-Navigation wird nicht dupliziert.
- Aktive Bereiche müssen eindeutig erkennbar sein und dürfen nicht nur durch einen schwachen Farbunterschied markiert werden.
- Globale Portalnavigation und ihr künftiger Stil bleiben offen, bis das Gesamtportal auditiert und konzipiert ist.
- Kontextwechsel, Zurückwege und Erhalt von Suche/Filter/Scrollposition müssen die bereits implementierten fachlichen Abläufe respektieren.
- Mobile Navigation ist eigenständig zu gestalten; Desktop-Menüs dürfen nicht einfach auf schmale Breite zusammengeschoben werden.

Canvas dokumentiert die Trennung zwischen globaler Navigation und bereichs-/kursbezogener Navigation sowie eine klare Kennzeichnung des aktiven Navigationspunkts. Das ist ein nützlicher Vergleich, aber kein Muster, das ungeprüft kopiert werden soll. Quelle: https://community.instructure.com/en/kb/articles/664370-how-do-i-use-the-course-navigation-menu-as-a-student

### 5.6 Interaktion und Accessibility

- Alle interaktiven Elemente müssen per Tastatur erreichbar und bedienbar sein.
- Fokuszustände bleiben sichtbar und werden nicht durch Header, Sticky-Elemente oder Overlays verdeckt.
- Bedienelemente erhalten verständliche Namen und ausreichende Zielgrößen; Touch-Bedienung wird auf mobilen Geräten geprüft.
- Bewegung und Animation sind nicht notwendig für die Gestaltung. Falls später eingesetzt, müssen reduzierte Bewegungspräferenzen respektiert werden.
- Lade-, Leer-, Fehler-, Erfolgs-, Sperr- und Berechtigungszustände werden nicht nur farblich unterschieden.
- Responsive Reflow darf keine fachlichen Aktionen oder Inhalte abschneiden.

Quelle und Prüfgrundlage: https://www.w3.org/TR/WCAG22/

## 6. Gemeinsame Komponenten – vorläufiger Umfang

Das Designsystem soll erst nach Prüfung realer Screens und Abläufe konkrete Komponenten standardisieren. Als Kandidaten werden geprüft:

- Seitenkopf mit Titel, Kontext und optionaler primärer Aktion;
- Academy-Hauptnavigation;
- Inhaltsabschnitte und Informationshinweise;
- Karten für echte zusammengehörige Einheiten;
- Buttons und Icon-Buttons;
- Formulare, Auswahlfelder und Validierungsfeedback;
- Tabellen und strukturierte Listen;
- Filter- und Suchzeilen;
- Statusanzeigen und Badges;
- Dialoge und Bestätigungsflächen;
- Reader-/Lerninhaltsflächen;
- leere, ladende, fehlerhafte und gesperrte Zustände.

Dies ist eine Prüfliste, keine Aufforderung, alle Elemente auf jeder Seite einzubauen. Unterschiedliche fachliche Aufgaben dürfen nicht durch ein künstlich einheitliches Muster verschlechtert werden.

## 7. Academy-Bereiche – unterschiedliche Aufgaben, gemeinsame Sprache

Die vorhandenen Bereichsakzente bleiben erhalten. Die visuelle Ausarbeitung soll die tatsächliche Aufgabe des jeweiligen Bereichs unterstützen:

- **Übersicht:** Orientierung und Einordnung; ruhig, erklärend und ohne erfundene Kennzahlen oder doppelte Einstiege.
- **Kurse:** strukturierte Lern- und Programmabläufe; klare Trennung von Kursen, Programmen, Status und tatsächlichen nächsten Aktionen.
- **Lernbibliothek:** lesefreundliche, informationsorientierte Oberfläche mit Suche, Filtern, Auswahl und Reader; Bibliotheksübersicht und Reader bleiben unterscheidbare Ansichten.
- **Prüfungen:** konzentrierte, sachliche Darstellung; Teilnahme, Bearbeitung, interne Bewertung und freigegebenes Ergebnis bleiben fachlich getrennt.
- **Meine Notizen:** persönliche, ruhige Arbeitsfläche; private Notizen und Quellenzugriff bleiben gemäß bestehenden Berechtigungsregeln geschützt.

Diese Beschreibungen leiten sich aus den bestehenden Academy-Beschlüssen ab. Sie erfinden keine zusätzlichen Funktionen.

## 8. Noch nicht entschieden – vor einer Festlegung erneut abstimmen

Folgende subjektive oder portalweit prägende Entscheidungen werden nicht eigenmächtig finalisiert:

- endgültige visuelle Identität und Markencharakter des Gesamtportals;
- ob das Gesamtportal langfristig die Academy-Farbigkeit übernimmt, neutraler bleibt oder eine andere gemeinsame Identität erhält;
- endgültige Formensprache, Illustrationsstil und Intensität dekorativer Gestaltung außerhalb bereits beschlossener Kachelillustrationen;
- konkrete Ausgestaltung der globalen Sidebar, des globalen Headers und der Portalnavigation;
- Light-/Dark-Mode-Strategie und ob beide Modi langfristig angeboten werden;
- endgültige Typografiefamilie, falls dafür eine bewusste Stilentscheidung erforderlich wird;
- deutliche Änderungen der bereits bestätigten Academy-Wellen-/Farbidee.

Objektiv prüfbare Fragen wie Kontrast, Lesbarkeit, responsive Reflow, Fokusführung und Konsistenz werden dagegen eigenständig bewertet und begründet.

## 9. Vorgehen und Qualitäts-Gates

1. Bestehende Implementierung und Screens der Academy gegen die bereits beschlossenen Funktionen prüfen.
2. Referenzmuster und aktuelle Accessibility-Standards für konkrete Komponenten untersuchen.
3. Ein zusammenhängendes Academy-Designsystem als Prototyp ausarbeiten, ohne bestehende Screens zu überschreiben.
4. Den internen Academy-Übersichtsbildschirm als ersten realistischen Screen prototypisch ausarbeiten; die Kachel-Startseite bleibt unverändert.
5. Danach repräsentative Screens aus Kursen, Bibliothek/Reader, Prüfungen und Notizen prüfen, damit das System nicht nur für eine Seite optimiert wird.
6. Desktop, Tablet und Mobile sowie Tastatur-/Screenreader-Verhalten prüfen.
7. Subjektive Grundsatzentscheidungen vor finaler Festlegung mit dem Projektinhaber abstimmen.
8. Erst nach fachlichem, visuellem und technischem Abgleich Implementierung auf eigenem Branch vorbereiten.
9. Vorhandene Funktionen, Rechte, Datenflüsse und Statuslogik durch Regressionstests absichern.

## 10. Quellen und Übertragbarkeit

- W3C, Web Content Accessibility Guidelines (WCAG) 2.2: https://www.w3.org/TR/WCAG22/ – maßgebliche normative Grundlage für Kontrast, Reflow, Fokus, Tastaturbedienung und weitere Accessibility-Kriterien.
- U.S. Web Design System, Design Tokens: https://designsystem.digital.gov/design-tokens/ – Referenz für konsistente, semantische Token-Skalen.
- U.S. Web Design System, Color: https://designsystem.digital.gov/design-tokens/color/overview/ – Rollen von Farbe, Kontrast und nicht ausschließlich farblicher Kommunikation.
- U.S. Web Design System, Spacing Units: https://designsystem.digital.gov/design-tokens/spacing-units/ – Referenz für begrenzte Abstandsskalen.
- U.S. Web Design System, Typesetting: https://designsystem.digital.gov/design-tokens/typesetting/ – Typografie, Textmaß und Zeilenhöhe.
- Instructure Canvas, Course Navigation Menu: https://community.instructure.com/en/kb/articles/664370-how-do-i-use-the-course-navigation-menu-as-a-student – Beispiel für bereichsbezogene Navigation und sichtbaren aktiven Zustand.

Die Quellen sind Referenzen, keine vollständigen Designvorlagen. Konkrete Muster werden nur übernommen, wenn sie zu den bestehenden RCPD-Aufgaben, Rollen, Beschlüssen und technischen Grenzen passen.


## 11. Verifizierter Ausgangsbestand der Academy (11.11.2026)

Prüfstand: `main` / Commit `7e19ccbfda3d28a37b7cadb4bac9b3daa9a4ae89`.

- Die Kachel-Startseite befindet sich in `src/components/AcademyCenter.tsx` (Zeilen 726–765) und enthält bereits fünf farbige, interaktiv verknüpfte Einstiege mit den bekannten lokalen SVG-Illustrationen.
- Die horizontale Hauptnavigation für interne Academy-Bereiche steht in derselben Datei (Zeilen 682–707).
- Die interne Übersicht (Zeilen 766–861) besitzt bereits die verbindliche Erklärstruktur: Orientierung, flexible Lernwege, Lehrgänge/Kurse/Lernbibliothek, Prüfungen, private Notizen und der Hinweis, dass bloßes Öffnen keinen Abschluss erzeugt.
- Die Academy wird in `src/App.tsx` (Zeilen 2468–2479) als bestehender Portalbereich eingebunden. Die globale Portalhülle wird in diesem Konzept nicht neu gestaltet.
- `src/index.css` verwendet bereits Plus Jakarta Sans und globale Zeilen-/Überschriftenregeln. Bestehende globale und Dark-Mode-Styles sind vor einer späteren Implementierung zu berücksichtigen, nicht zu überschreiben.

**Konsequenz für den Prototyp:** Der interne Übersichtsbildschirm wird visuell verbessert, ohne Inhalte, fachliche Aussagen, Navigation, Kacheleinstiege oder Kennzahlen zu erfinden. Die fünf Kacheln gehören nicht in diesen Screen. Ein generierter Bildentwurf, der sie dort wiederholt oder Fortschrittsmetriken ergänzt, gilt als verworfen.


## 12. Erster Code-Prototyp der internen Übersicht (11.11.2026)

Der erste interne Übersichts-Prototyp wurde über PR #160 am 11.11.2026 gemergt: https://github.com/MDP0063/rcpd-new/pull/160.

Die Implementierung bleibt eng auf die bereits vorhandene Übersicht aus PR #158 begrenzt:
- Die vorhandenen Erklärtexte, Karteninhalte und Hinweise bleiben erhalten.
- Die Kachel-Startseite wird nicht geändert und auf der internen Übersicht nicht wiederholt.
- Der neue Stil verwendet einen leicht getönten blauen Seitenhintergrund, matte und räumlich begrenzte Wellenakzente, klare Typografie, drei bestehende Inhaltskarten mit den vorhandenen Bereichsfarben und einen ruhigen Hinweisbereich.
- Die horizontale Academy-Navigation erhält eine klare aktive Fläche und ein responsives Raster.
- Styles liegen lokal in `src/components/AcademyCenter.css`; die Komponente bindet sie ein. Es wurden keine globalen Styles, Funktionen, Datenmodelle, APIs oder Berechtigungen verändert.
- Light-/Dark-Mode, Tastaturfokus und reduzierte Bewegung wurden im Stylesheet berücksichtigt.

**Prüfstand:** GitHub Actions für den Code-Commit meldet TypeScript-Prüfung, Produktionsbuild und Tests als erfolgreich. Der optionale Render-Deploy-Hook wurde übersprungen. Eine echte Browser-/Responsive-Abnahme mit Screenshots steht noch aus. Der Code ist gemergt, die gestalterische Abnahme bleibt jedoch offen; der Prototyp ist daher noch kein finales Academy- oder Portaldesign.


## 13. Äußerer Academy-Viewport-Hintergrund (11.11.2026, PR #162 gemergt)

Auf Rückmeldung zur Browseransicht wurde die Gestaltung der variablen freien Fläche ergänzt. Auf breiten Displays soll sie nicht als große reinweiße Umgebung erscheinen, aber auch nicht mit der inneren blauen Wellenform konkurrieren.

- Der äußere Academy-Viewport erhält eine sehr helle, kühle und zurückhaltende Grundtönung.
- Zwei sehr diffuse, niedrig kontrastierte Farbverläufe geben der Fläche Tiefe, ohne als sichtbare zweite Wellenform oder Illustration aufzutreten.
- Der Übergang zur bestehenden inneren Academy-Fläche bleibt weich; deren blaue Wellenform und Karten bleiben unverändert.
- Der Hintergrund wird ausschließlich während des Academy-Moduls aktiv. Andere Portalbereiche und die globale Portalgestaltung bleiben unberührt.
- Die Inhaltsbreite der Academy bleibt auf dem bisherigen Maximalmaß begrenzt und wird nicht über breite Monitore auseinandergezogen.
- Dark Mode erhält eine entsprechend zurückhaltende dunkle Variante.

Dies ist eine konkret abgestimmte Detailentscheidung aus der Browserprüfung, keine Festlegung des späteren globalen Portalhintergrunds. Die Umsetzung wurde in PR #162 gemergt. TypeScript-Prüfung, Produktionsbuild, Tests und PR-Vorlagenprüfung waren erfolgreich; der optionale Render-Deploy-Hook wurde übersprungen. Die Browserabnahme der neuen Außenfläche steht nach dem Deployment noch aus.


## 14. Kursbereich – erster visueller Ausbau (11.11.2026)

- Der Kursbereich übernimmt die gemeinsame Academy-Typografie, Abstandslogik, Karten- und Oberflächenbehandlung.
- Der bestehende Bereichsakzent Petrol (#087F8C) wird als dezenter visueller Anker verwendet; er ersetzt nicht die gemeinsame blaue Academy-Grundsprache.
- Der Katalog bleibt fachlich in zwei klar getrennte Gruppen gegliedert: Ausbildungsprogramme und alle Kurse. Programme erhalten eigenständige Karten; Kurse bleiben eine kompakte, gut scannbare Liste.
- Suche bleibt der gemeinsame Einstieg für beide Gruppen. Es werden keine zusätzlichen Filter, Kennzahlen, Empfehlungen oder neuen Statusarten erfunden.
- Status, Versionsnummern, Verfügbarkeit, Teilnahmefortschritt und Handlungsoptionen stammen weiterhin aus den vorhandenen Daten. Farben unterstützen die Orientierung, ersetzen aber keine Statusbeschriftung.
- Kurs- und Programm-Detailansichten bleiben im selben Bereichssystem; die fünfteilige Academy-Kachel-Startseite und die horizontale Hauptnavigation werden nicht verändert.
- Diese Gestaltung ist ein erster Code-Prototyp und wird anhand der Live-Browserdarstellung weiter geprüft. Sie ist keine Festlegung für das spätere globale Portaldesign.


### Ergänzung 11.11.2026 – Kurs- und Lehrgangsdetails

- Kurs- und Programmdetails verwenden dieselbe ruhige Petrol-Akzentfarbe und Oberflächenbehandlung wie der Katalog.
- Überschriften, Kennung/Version und erklärende Zusammenfassung erhalten eine klarere Hierarchie.
- Nachweisbedingungen, Lernziele, Kapitel und erforderliche/empfohlene Kurse bleiben fachlich getrennt und werden als lesbare Inhaltsabschnitte dargestellt.
- Der echte Programmfortschritt bleibt mit seiner vorhandenen Datenquelle sichtbar; er wird nicht mit einem Academy-Gesamtfortschritt vermischt.
- Aktionen und Status bleiben textlich eindeutig und tastaturbedienbar. Es werden keine neuen Daten oder Aktionen ergänzt.


## 15. Lernbibliothek – erster visueller Ausbau (11.11.2026)

- Die Lernbibliothek erhält den bereits festgelegten violetten Bereichsakzent (#6841B8) in einer zurückhaltenden, wissensorientierten Gestaltung.
- Katalog, Suche/Sortierung/Filter und Materialreader bleiben als getrennte Nutzungsschritte erkennbar. Der Katalog wird nicht in den Reader hineingezogen.
- Materialeinträge bleiben kompakt und gut vergleichbar; Code, Titel, Kategorie und Dokumenttyp behalten ihre vorhandenen Bedeutungen.
- Der Reader erhält eine ruhige, lesefokussierte Oberfläche mit klarer Metadaten- und Aktionszone.
- Legacy- und versionierte Materialien behalten ihre vorhandenen getrennten Daten-/Renderpfade. Es werden keine PDF-Infrastruktur, Parser, Speicher- oder Abruffunktionen ergänzt.
- Bestehende Suche, Sortierung, Filter, Zugriffsschutz, externe Quellen, Code-Sandbox und private Notizfunktionen bleiben unverändert.
- Diese Gestaltung ist ein erster Prototyp und wird nach Deployment auf großen und kleinen Viewports geprüft.


## 16. Prüfungen – Teilnehmer-Prüfungszentrum (11.11.2026)

- Der Prüfungsbereich verwendet den bestehenden Beerenton (#A33370) als ruhigen, fokussierten Akzent. Ergebniszustände wie bestanden, Bewertung offen und nicht bestanden behalten ihre fachlich unterschiedlichen Statusfarben.
- Prüfungskatalog, ausgewählte Prüfung, aktiver Versuch und Ergebnisansicht bleiben klar unterscheidbare Zustände innerhalb desselben Bereichs.
- Die Darstellung priorisiert Konzentration und Lesbarkeit: klare Prüfungsmetadaten, verständliche Fortschrittsanzeige, gut erkennbare Fragennavigation und ausreichend große Antwortflächen.
- Autospeicherstatus, Zeitlimit, Abgabe, offizielle Ergebnisfreigabe und manuelle Bewertung bleiben inhaltlich unverändert und sichtbar.
- Die Auswahl einer Prüfung erhält zusätzlich den semantischen Zustand aria-pressed; dies verbessert die programmatische Erkennbarkeit für assistive Technologien.
- Die Gestaltung betrifft zunächst das Teilnehmer-Prüfungszentrum. Die Legacy-Ansichten Übungstests/Abschlussprüfungen und die Examiner-Verwaltungsansichten werden nicht stillschweigend vereinheitlicht; ihre fachliche Abgrenzung bleibt Gegenstand des bestehenden Audits.


## 17. Meine Notizen – persönlicher Arbeitsbereich (11.11.2026)

- Der Bereich verwendet den bereits festgelegten grünen Akzent (#287A45) in einer ruhigen, persönlichen und zurückhaltenden Gestaltung.
- Privatsphäre wird in der Informationshierarchie klar, aber unaufdringlich erklärt: Notizen und Lesezeichen gehören ausschließlich zum eigenen Konto.
- Gespeicherte Notizen und Lesezeichen bleiben als kompakte Einträge mit Titel, Typ, Änderungsdatum, Inhalt, Schlagwörtern und Quellenbezug erkennbar.
- Bearbeiten und Löschen bleiben klar getrennte Aktionen; der Editor wird als eigener Arbeitsbereich dargestellt.
- Neue Notizen werden weiterhin im Reader angelegt. Es wird keine neue Erstellungsfunktion oder ein neues Datenmodell erfunden.
- Private Notizdaten, Quellenverknüpfung, Zugriffsschutz, Synchronisierung und API-Verhalten bleiben unverändert.


## 18. Examiner-Bewertungsarbeitsplatz – visuelle Ausarbeitung (11.11.2026)

- Der Bewertungsarbeitsplatz gehört zum rollen-/berechtigungsabhängigen Prüfungsbereich und bleibt kein sechster Academy-Hauptbereich.
- Die vorhandene Aufgabenkarte wird als geteilte Arbeitsfläche strukturiert: links die eigentliche Bewertung mit Frage, Antwort, Rubrik und Punkteingabe; rechts ein einklappbarer Kontextbereich mit den bereits vorhandenen Vorgangsinformationen.
- Der Kontextbereich zeigt ausschließlich vorhandene Metadaten (Teilnehmer, Kurskennung, Abgabezeitpunkt, Anzahl der Freitextfragen und Zuständigkeit). Er führt keine neue Datenquelle und keine zusätzlichen Status ein.
- Auf schmaleren Viewports wechselt die Fläche in eine einspaltige Darstellung; der Kontext bleibt über ein natives, tastaturbedienbares Disclosure erreichbar.
- Der Beerenton #A33370 dient als zurückhaltender Arbeitsbereichsakzent. Warnungen, Fehler und Erfolg behalten ihre eigenen Statusfarben.
- Anspruchs-/Claim-, Übergabe-, Freigabe-, Draft-Speicher- und Abschlussaktionen bleiben in ihrer bestehenden Position/Funktion und werden nicht fachlich verändert.
- Die Examiner-Historienansicht, Revisionen und weitere noch offene Examiner-Funktionen werden nicht durch diese visuelle Änderung vorweggenommen.


**Umsetzungsstand:** Die geteilte Bewertungsfläche und das einklappbare Kontextpanel wurden in PR #175 gemergt. TypeScript-Prüfung, Produktionsbuild und Tests waren erfolgreich. Die Browserabnahme steht nach Deployment aus.


## 19. Ergebnisfreigabe und Korrekturarbeitsplatz – visuelle Ausarbeitung (11.11.2026)

- Ausstehende Ergebnisfreigaben und die Korrektur abgeschlossener Bewertungen bleiben als getrennte Aufgabenabschnitte erkennbar.
- Freigabeeinträge zeigen Prüfung, Kurskennung, Teilnehmer, Prüfungsart, Abgabezeitpunkt, aktuelles Ergebnis und vorhandene Freigabehistorie. Es werden keine neuen Kennzahlen oder Status erzeugt.
- Korrekturansichten stellen Prüfungs-/Teilnehmerkontext, bisherigen Ergebnisstand, Antwort und Bewertungsrubrik sowie neue Punkteingabe klar getrennt dar.
- Die Begründung bleibt als verpflichtender, eigenständiger Schritt deutlich sichtbar. Die bestehende Mindest-/Maximallänge und Validierung bleiben unverändert.
- Die Korrekturhistorie wird als chronologisch lesbarer Auditbereich mit altem/neuem Ergebnis, Verantwortlichen und Begründung gestaltet. Bestehende Historienfelder bleiben erhalten.
- Der Beerenton #A33370 ist der Arbeitsbereichsakzent; Bestanden/Nicht bestanden behalten ihre fachlichen Statusfarben.
- Ergebnisfreigabe, erneute Freigabe nach Korrektur, Berechtigungen, Auditdaten und Teilnehmerprojektion werden funktional nicht verändert.


**Umsetzungsstand:** Die visuelle Gliederung der Ergebnisfreigaben, Korrektureingaben und Historie wurde in PR #177 gemergt. TypeScript-Prüfung, Produktionsbuild und Tests waren erfolgreich; die Browserabnahme steht aus.


## 20. Kurs- und Programmverwaltung – visueller Ausbau (11.11.2026)

- Der Verwaltungsbereich verwendet dieselbe Academy-Grundsprache und den Petrol-Akzent #087F8C wie der Kursbereich, bleibt aber als Arbeitsoberfläche klar von der Teilnehmeransicht unterscheidbar.
- Die Verwaltungsübersicht stellt Kurse und Programme als zwei getrennte, gut scannbare Listen dar. Kennung, Veröffentlichung, Version/Revision und vorhandene Verfügbarkeits-/Materialprüfhinweise bleiben in der bestehenden Bedeutung erhalten.
- Kurs- und Programmeditoren erhalten eine konsistente Formularhierarchie: Grunddaten, Lernziele, Kapitel/Materialbindungen bzw. Kurszuordnungen und Abschlussbedingungen.
- Kapitel, Lernziele und Zuordnungen werden als eigenständige, visuell getrennte Bearbeitungseinheiten dargestellt.
- Warnungen zu Materialrevision, fehlenden Abschlussbedingungen und ungespeicherten Änderungen bleiben in ihren vorhandenen Statusfarben und mit ihrem bestehenden Text erhalten.
- Speichern, Veröffentlichen, Verlassen mit ungespeicherten Änderungen, Versionsbindung und alle Validierungen bleiben funktional unverändert.


**Umsetzungsstand:** Kurs-/Programmlisten und Editoren wurden in PR #179 visuell überarbeitet. TypeScript-Prüfung, Produktionsbuild und Tests waren erfolgreich; die Browserabnahme steht aus.


## 21. Versionierte Materialverwaltung – visueller Ausbau (11.11.2026)

- Die Materialverwaltung bleibt eine administrative Arbeitsansicht innerhalb der Lernbibliothek; sie ist kein zusätzlicher Teilnehmer-Hauptbereich.
- Die vorhandene Materialliste mit Suche und die Detail-/Editorfläche bleiben als zwei klar getrennte Arbeitszonen angeordnet. Auf schmalen Viewports wird die Materialliste vor dem Editor priorisiert.
- Materialkennung, Veröffentlichung/Archivstatus, Arbeitsrevision und Versionshistorie erhalten eine klare Hierarchie. Der aktive Listeneintrag wird semantisch mit aria-pressed kenntlich gemacht.
- Der Editor gliedert Metadaten, Kurszuständigkeit, Kategorie/Dokumenttyp, Zugriffsvoraussetzung, Inhaltsformat und Inhalt in gut erkennbare Formularabschnitte.
- Text/Markdown und Code bleiben die unterstützten Formate dieser Stufe. Der Quelltext bleibt nicht ausführbar; PDF-Infrastruktur bleibt zurückgestellt.
- Entwurf speichern, ausdrückliche Veröffentlichung, Archivierung, Versionshistorie und bestehende Validierung bleiben funktional unverändert.
