# RCPD Academy – ausführliche fachliche Spezifikation

**Stand:** 06.11.2026  
**Status:** Detaillierte Rekonstruktion der im verfügbaren Gesprächs- und Erinnerungskontext bestätigten Academy-Entscheidungen. Die Spezifikation ist fachliche Planungsgrundlage, kein Nachweis einer bereits erfolgten Implementierung. Offene Punkte sind ausdrücklich gekennzeichnet.

> Diese Datei ergänzt `DECISIONS.md`. Das Entscheidungsregister bleibt der schnelle Index verbindlicher Festlegungen; hier stehen deren ausführliche Bedeutung, Abläufe, Abgrenzungen und Randbedingungen. Bei Widersprüchen hat die ausdrücklich bestätigte spätere Nutzerentscheidung Vorrang. Nicht bestätigte Vorschläge bleiben Vorschläge.

## 1. Produktverständnis der Academy

### 1.1 Zwei gleichberechtigte Zwecke

Die Academy ist gleichzeitig:
- ein operativer Ausbildungsarbeitsbereich, in dem Nutzer Programme, Kurse, erforderliche Lernbestandteile, Prüfungen und persönliche Aufgaben bearbeiten;
- eine eigenständige Wissensbibliothek, in der fachliche Materialien unabhängig von einem bestimmten Kurs auffindbar und lesbar sind.

Die Bibliothek darf nicht zu einem reinen Anhängsel der Kurse werden. Inhalte sollen nicht künstlich in Kurskopien vervielfältigt werden. Ein Kurs oder Programm kann auf ein kanonisches Bibliotheksmaterial verweisen; das Material bleibt als eigenständige Wissensressource nutzbar.

Die Academy erzwingt keinen einzigen linearen Lernweg. Lernpfade, Programme und Empfehlungen geben Orientierung und Struktur, aber eine bloße Reihenfolge darf nicht automatisch eine Zugangssperre erzeugen.

### 1.2 Kurse und Programme sind unterschiedliche Ebenen

- Ein **Kurs** ist ein eigenständiges fachliches Lernmodul. Er kann unabhängig von einem Programm begonnen werden.
- Ein **Programm** bündelt Kurse zu einem übergeordneten Ausbildungsziel und definiert, welche davon erforderlich und welche lediglich empfohlen sind.
- Ein Kurs kann mehreren Programmen zugeordnet sein. Das bedeutet nicht, dass für jedes Programm eine separate Kurskopie oder künstlich getrennte Teilnahme nötig ist.
- Ein Kurs kann auch dann sinnvoll und zugänglich bleiben, wenn er keinem Programm zugeordnet ist.
- Eine Reihenfolge innerhalb eines Programms ist eine Orientierung. Eine Sperre darf nur aus einer ausdrücklich definierten fachlichen Voraussetzung entstehen, nicht allein aus der Position eines Kurses in einer Liste.

### 1.3 Hauptnavigation – Option A verbindlich

Die Academy besitzt fünf gleichwertige Hauptbereiche:

1. Übersicht
2. Kurse
3. Lernbibliothek
4. Prüfungen
5. Meine Notizen

Der Examiner wird bei entsprechender Berechtigung innerhalb der Academy angeboten. Er wird **nicht** zu einem sechsten allgemeinen Hauptmenüpunkt für alle Nutzer.

Die Entscheidung betrifft die fachlichen Hauptbereiche. Sie legt noch nicht fest, ob die spätere Darstellung als Sidebar, Tabs, Untermenü oder mobile Navigation erfolgt. Diese konkrete grafische Umsetzung bleibt Teil der späteren Informationsarchitektur und Designphase.

## 2. Übersicht, Programme und Kurse

### 2.1 Academy-Übersicht

Die Übersicht soll dem Nutzer helfen, seinen relevanten Ausbildungsstand und sinnvolle nächste Schritte zu erkennen, ohne die gesamte Academy als überladenes Dashboard zu wiederholen.

Bereits festgelegte Leitlinien:
- Programme stehen als wesentliche Orientierung im Vordergrund.
- Direkte Zugänge zu Kursen und Bibliothek bleiben möglich; der Nutzer muss nicht zwingend über ein Programm navigieren.
- Relevante bzw. aktive Programme sollen vor rein verfügbaren oder noch nicht begonnenen Angeboten erkennbar sein.
- Eine bloße Verfügbarkeit ist keine Teilnahme und kein Fortschritt.
- Persönliche Favoriten dürfen die Darstellung beeinflussen, aber niemals Zugriffsrechte oder fachliche Voraussetzungen verändern.
- Empfehlungen und Aufgaben sind Hilfen, keine zusätzliche Zugangsvoraussetzung.
- Die Oberfläche darf nur tatsächliche Daten und nachvollziehbare Status anzeigen.
- Das Öffnen eines Dokuments, eines Kurses oder einer Seite darf nicht als Verständnis, erfolgreiche Bearbeitung oder Abschluss ausgegeben werden.

Die genaue Karten-, Listen- oder Widget-Anordnung ist noch nicht entschieden.

### 2.2 Programmübersicht und Programmdetail

Ein Programm soll sein fachliches Ziel verständlich machen. Als Planungsleitlinie wurden **drei bis sechs konkrete Lernziele** pro Programmdetail festgehalten. Diese Ziele sollen beschreiben, was Teilnehmer fachlich lernen oder beherrschen sollen, nicht nur allgemeine Werbetexte darstellen.

Das Programmdetail unterscheidet mindestens:
- Zweck und Lernziele;
- erforderliche Kurse bzw. Bestandteile;
- empfohlene, aber freiwillige Kurse;
- eine gegebenenfalls sinnvolle Reihenfolge;
- Voraussetzungen und tatsächlichen persönlichen Status;
- den eigenen Fortschritt und noch ausstehende Anforderungen.

Erforderliche und empfohlene Kurse dürfen nicht visuell oder logisch vermischt werden. Empfohlene Kurse blockieren den Programmabschluss nicht.

### 2.3 Kursstruktur

Ein Kurs kann enthalten:
- Kapitel;
- zugeordnete Materialien;
- freiwillige Wissenschecks;
- ausdrücklich definierte Abschlussbedingungen;
- gegebenenfalls eine separate Abschlussprüfung, sofern dies für den Kurs fachlich festgelegt ist.

Kapitel, Materialien und freiwillige Checks sind optionale Strukturmittel. Nicht jeder Kurs muss dieselbe Struktur besitzen. Die Abschlussprüfung liegt außerhalb der normalen Kapitelstruktur und ist kein zwingender Bestandteil jedes Kurses.

Freiwillige Wissenschecks sind nicht automatisch eine Abschlussvoraussetzung. Ein freiwilliger Test darf einen Kursabschluss nicht blockieren, nur weil er nicht bestanden oder gar nicht absolviert wurde.

## 3. Drei voneinander getrennte Statusdimensionen

Eine der wichtigsten Academy-Grundentscheidungen ist die vollständige Trennung von:

1. **Veröffentlichungsstatus des Kurs-/Programmangebots** – ob eine konkrete Fassung veröffentlicht ist;
2. **Verfügbarkeit und Zugriffsberechtigung** – ob ein Nutzer das Angebot aktuell sehen bzw. öffnen darf;
3. **persönlichem Teilnahme- und Fortschrittsstatus** – was dieser Nutzer mit welcher Fassung bereits begonnen, abgeschlossen oder unterbrochen hat.

Diese drei Ebenen dürfen nicht in einen einzigen Status zusammengezogen werden.

Beispiele für die Konsequenz:
- Ein veröffentlichter Kurs kann für einen bestimmten Nutzer noch nicht begonnen sein.
- Ein Kurs kann veröffentlicht, aber vorübergehend für neue Teilnahmen nicht verfügbar sein.
- Ein archivierter Kurs kann für historische Abschlüsse weiterhin relevant sein.
- Der Verlust einer Zugriffsberechtigung löscht keinen persönlichen Abschluss.
- Eine neue Kursversion überschreibt nicht automatisch die Version, an der ein Teilnehmer bereits arbeitet.
- Ein ausgeblendetes Angebot ist nicht dasselbe wie ein unveröffentlichter Entwurf.

UI-Texte und Statusanzeigen müssen diese Unterschiede verständlich machen. Ein einziges mehrdeutiges Label wie „inaktiv“ reicht nicht aus, wenn dahinter fachlich unterschiedliche Zustände stehen.

## 4. Kursveröffentlichung, Archivierung und Versionierung

### 4.1 Veröffentlichen und vorübergehend verbergen

Ein veröffentlichter Kurs soll nicht zurück in einen Entwurfszustand gesetzt werden müssen, nur um ihn vorübergehend aus dem regulären Angebot zu nehmen. Dafür ist eine getrennte Verfügbarkeitssteuerung vorgesehen.

Die Veröffentlichungshistorie und die Verfügbarkeit sind unabhängig. Eine Änderung der Verfügbarkeit darf:
- bestehende Teilnahmen nicht löschen;
- persönliche Fortschritte nicht zurücksetzen;
- historische Abschlüsse nicht entfernen;
- die zugrunde liegende veröffentlichte Kursfassung nicht unbemerkt verändern.

### 4.2 Archivierung

Archivierung bedeutet, dass ein Kurs aus dem regulären aktuellen Angebot genommen wird. Sie bedeutet nicht, dass die fachliche oder historische Existenz des Kurses ausgelöscht wird.

Verbindliche Folgen:
- laufende Teilnahmen dürfen einen archivierten Kurs grundsätzlich weiterbearbeiten und abschließen;
- neue Teilnehmer beginnen archivierte Kurse nicht regulär;
- frühere Abschlüsse behalten ihre historische Referenz;
- eine spätere Reaktivierung ist möglich und wird protokolliert;
- bei unverändertem fachlichem Inhalt kann dieselbe Kursversion erneut verwendet werden;
- wesentliche fachliche Änderungen erfordern eine neue Kursversion.

### 4.3 Wann eine neue Kursversion erforderlich ist

Eine neue Version ist erforderlich, wenn fachlich wesentliche Änderungen vorgenommen werden, insbesondere an:
- Lerninhalten;
- Ausbildungszielen;
- Kursstruktur;
- fachlichen Anforderungen;
- Kapiteln;
- zugeordneten Materialien;
- einer fachlich relevanten Reihenfolge.

Reine redaktionelle Änderungen ohne fachliche Auswirkung können innerhalb derselben Version bleiben. Die Grenze ist nicht rein optisch zu beurteilen: Entscheidend ist, ob sich Lerninhalt, Ziel, Anforderung oder erwarteter Nachweis verändert.

### 4.4 Veröffentlichung einer neuen Version

Eine neue Kursversion wird zunächst als separater Entwurf erstellt. Die bisher veröffentlichte Version bleibt bestehen, bis die neue Fassung ausdrücklich veröffentlicht wird.

Für Teilnehmer gilt:
- Zugangsberechtigte Nutzer, die noch nicht begonnen haben, erhalten grundsätzlich die neueste veröffentlichte Version.
- Nutzer mit bereits begonnener Teilnahme bleiben standardmäßig an die Version gebunden, mit der sie begonnen haben.
- Historische Abschlüsse behalten immer die Version, auf der sie tatsächlich erworben wurden.
- Ein Versionswechsel laufender Teilnahmen geschieht nicht automatisch.
- Eine bewusste administrative Umstellung muss nachvollziehbar sein und darf gültige Nachweise nicht still verlieren.

Alte Kursversionen bleiben grundsätzlich ohne automatische zeitliche Ablaufgrenze abschließbar. Eine Ausnahme ist nur bei einer ausdrücklich festgelegten verbindlichen Umstellung zulässig, etwa aus Sicherheits- oder technischen Gründen. Betroffene Nutzer müssen informiert werden; Fortschritt darf nicht stillschweigend gelöscht werden.

## 5. Teilnahme, Fortschritt und Abschluss eines Kurses

### 5.1 Beginn einer Teilnahme

Eine Teilnahme beginnt bei der ersten bewussten Lernaktivität innerhalb des Kurses. Das bloße Öffnen eines Kurses, einer Materialvorschau oder eines Dokuments reicht dafür nicht aus.

Die genaue technische Erkennung der ersten bewussten Lernaktivität muss mit dem vorhandenen Produkt- und Datenmodell abgeglichen werden. Fachlich ist die Abgrenzung verbindlich: „angesehen“ ist nicht automatisch „begonnen“.

### 5.2 Fortschritt und Nachweise

Jede Kursversion benötigt ausdrücklich definierte Abschlussbedingungen. Ein automatischer Abschluss ist nur erlaubt, wenn die dafür benötigten Nachweise zuverlässig und eindeutig vorliegen.

Mögliche Nachweisarten können je nach Kurs sein:
- abgeschlossene erforderliche Kapitel;
- tatsächlich bearbeitete Pflichtmaterialien mit geeignetem Nachweis;
- bestandene verpflichtende Tests;
- dokumentierte praktische Aufgaben;
- manuell bestätigte fachliche Leistungen.

Dabei gilt:
- Öffnen oder Herunterladen ist kein ausreichender Nachweis für Verständnis.
- Eine Selbstbestätigung durch den Teilnehmer darf nur verwendet werden, wenn sie für den betreffenden Materialtyp fachlich akzeptiert und sichtbar als Selbstbestätigung gekennzeichnet ist.
- Ein Test oder eine praktische Aufgabe ist nur verpflichtend, wenn die Kursregeln dies ausdrücklich festlegen.
- Freiwillige Inhalte und freiwillige Wissenschecks dürfen nicht unbeabsichtigt in die Pflichtberechnung einfließen.
- Unvollständige oder nicht zuverlässig ermittelbare Daten dürfen nicht zu einem vermeintlichen Abschluss führen.

### 5.3 Aktivität und Inaktivität

Inaktivität führt nicht automatisch zu einem Abbruch, Entzug oder Reset der Teilnahme.

Die letzte tatsächliche Lernaktivität kann getrennt vom Teilnahmezustand angezeigt werden. Ein Zeitstempel allein darf keine fachliche Aussage wie „abgebrochen“ oder „nicht mehr aktiv“ erzeugen.

### 5.4 Freiwilliges Beenden und Wiederaufnehmen

Teilnehmer dürfen eine Teilnahme freiwillig beenden. Das ist kein erfolgreicher Abschluss:
- der erreichte Fortschritt bleibt erhalten;
- die Historie bleibt nachvollziehbar;
- eine spätere Wiederaufnahme kann dieselbe Teilnahme fortsetzen;
- bereits gültig abgeschlossene Bestandteile bleiben abgeschlossen.

Eine Wiederaufnahme soll nicht künstlich eine neue Teilnahme erzeugen, wenn es sich fachlich um die Fortsetzung derselben Teilnahme handelt.

### 5.5 Administrative Beendigung

Ein berechtigter Administrator kann eine Teilnahme mit dokumentiertem Grund administrativ beenden. Das ist ebenfalls kein erfolgreicher Abschluss.

Eine spätere Wiederaufnahme erfordert in diesem Fall eine bewusste administrative Freigabe. Administrative Beendigung und freiwilliger Abbruch müssen unterscheidbar sein.

### 5.6 Verlust von Berechtigungen

Der Verlust einer Zugriffsberechtigung entfernt den Zugang zum Kurs. Er verändert aber nicht automatisch:
- den historischen Teilnahmebeginn;
- bereits gespeicherte Fortschritte;
- gültige Kursabschlüsse;
- die Version, mit der eine Teilnahme begonnen wurde.

Zugriff und Teilnahmehistorie sind getrennt zu behandeln.

### 5.7 Korrektur falscher Kursabschlüsse

Entsprechend berechtigte Administratoren dürfen fehlerhafte Kursabschlüsse korrigieren.

Die ursprüngliche Abschlussentscheidung wird nicht spurlos gelöscht. Zu dokumentieren sind mindestens:
- der Korrekturzeitpunkt;
- die verantwortliche Person;
- eine Begründung;
- die korrigierte fachliche Folge bzw. der anschließend angezeigte tatsächliche Status.

Eine fachlich angeordnete Wiederqualifizierung ist kein solcher Korrekturvorgang und darf nicht mit ihm vermischt werden.

## 6. Historie, Identitäten und Datenintegrität

### 6.1 Teilnahmehistorie

Es gibt eine gemeinsame Teilnahmehistorie, die fachlich nicht doppelt in mehreren Modulen gepflegt werden soll.

Teilnehmer sehen im Rahmen ihrer Berechtigung:
- Kurs und Kursversion;
- Fortschritt und Status;
- Beginn und Abschluss;
- eigene freiwillige Beendigungen und Wiederaufnahmen.

Administrativ berechtigte Personen sehen darüber hinaus erforderliche Vorgänge wie:
- administrative Beendigungen;
- verantwortliche Person;
- Begründungen;
- Korrekturen;
- relevante Berechtigungsänderungen.

Die Historie wird aus dem passenden Kurs-/Teilnahmekontext erreicht; dafür wird kein neuer allgemeiner Academy-Hauptbereich eingeführt.

### 6.2 Kontolöschung und personenbezogene Daten

Bei einer Kontolöschung sind rechtmäßige Aufbewahrungs- und Löschpflichten zu beachten. Fachlich notwendige historische Nachweise können, soweit rechtlich zulässig, erhalten bleiben. Zugriffe werden entzogen; personenbezogene Daten dürfen nicht unbegrenzt nur deshalb aufbewahrt werden, weil ein Audit-Log existiert.

Die Historie muss soweit zulässig eine nachvollziehbare Identität des früheren Vorgangs erhalten. Die konkrete Anonymisierung/Löschung richtet sich nach den rechtlichen und technischen Anforderungen und ist nicht pauschal für alle Daten gleich zu entscheiden.

### 6.3 Fehlzuordnungen und Duplikate

Eine irrtümliche Zuordnung eines Kurses zu einem Konto kann durch berechtigte Administratoren korrigiert werden. Die Zuordnung darf ohne neue Teilnahme duplizierungsfrei berichtigt werden; ursprüngliche Zuordnung, Zeitpunkt, verantwortliche Person und Begründung bleiben nachvollziehbar.

Konfliktfälle und doppelte Teilnahmen werden nicht automatisch zusammengeführt:
- kein automatisches „neuester Datensatz gewinnt“;
- keine willkürliche Übernahme des vermeintlich besten Fortschritts;
- Originaldatensätze und Nachweise erhalten;
- mögliche Duplikate markieren und administrativ prüfen;
- eine Zusammenführung muss sicherstellen, dass weder doppelte Abschlüsse noch überschriebenes Beweismaterial entstehen.

### 6.4 Stabile IDs, konkurrierende Änderungen und technische Fehler

Für Benutzer, Teilnahmen, Kurse, Versionen und Nachweise sind stabile interne Identitäten erforderlich. Profiländerungen dürfen historische Vorgänge nicht umhängen.

Korrekturen sollen als neue nachvollziehbare Ereignisse erkennbar sein, statt historische Werte unbemerkt zu überschreiben. Für relevante Änderungen sind Akteur, Zeit, Aktion, Ergebnis und gegebenenfalls Grund zu erfassen.

Gleichzeitige Bearbeitungen müssen durch serverseitige Versions-/Frischeprüfung oder ein gleichwertiges Schutzverfahren gegen blindes Überschreiben abgesichert werden. Bei Konflikten erhält der Nutzer einen verständlichen Hinweis. Transaktionen und idempotente Wiederholungen sollen verhindern, dass technische Wiederholungen doppelte Teilnahmen, Nachweise oder Abschlüsse erzeugen.

Datenschutz und Datenminimierung gelten auch für Audit-Daten. Ein Audit-Log ist kein Freibrief für unbegrenzte Speicherung sämtlicher personenbezogener Aktivitäten.

## 7. Programme, Anforderungen und Wiederqualifizierung

### 7.1 Programmabschluss

Ein Programm ist abgeschlossen, wenn alle ausdrücklich als erforderlich markierten Bedingungen der maßgeblichen Programmversion erfüllt sind.

Nicht blockierend sind:
- empfohlene Kurse;
- optionale Inhalte;
- freiwillige Wissenstests;
- Abschlussprüfungen, sofern sie nicht ausdrücklich als Voraussetzung des Programms definiert wurden.

Ein Kursabschluss kann für mehrere Programme zählen, wenn die jeweilige Programmversion diese Kursversion bzw. diesen Nachweis anerkennt. Dafür werden keine künstlich getrennten Kurs-Teilnahmen erzeugt.

### 7.2 Versionierung von Programmen

Programm-Anforderungen werden versioniert:
- ein bereits abgeschlossenes Programm bleibt historisch abgeschlossen;
- neue Anforderungen werden nicht rückwirkend auf einen historischen Abschluss angewendet;
- für laufende Programmteilnahmen ist ausdrücklich zu entscheiden, ob eine neue Programmversion übernommen wird;
- der Standard ist, dass laufende Teilnahmen bei der begonnenen Programmversion bleiben;
- ein automatischer Wechsel auf eine neue Programmversion findet nicht statt.

Ein berechtigter Administrator kann eine laufende Teilnahme bewusst auf eine neue Programmversion umstellen. Dabei:
- bleiben gültige Kursabschlüsse erhalten, wenn sie von der neuen Version anerkannt werden;
- werden zusätzliche oder nicht mehr passende Anforderungen transparent ausgewiesen;
- wird die Umstellung protokolliert;
- wird keine Fortschrittshistorie stillschweigend überschrieben.

### 7.3 Wiederqualifizierung ist ein eigener Vorgang

Ein historischer Kurs- oder Programmabschluss und die aktuelle Gültigkeit einer Qualifikation sind zwei verschiedene Dinge.

Eine fachlich/sicherheitsrelevant unzureichende aktuelle Qualifikation kann eine neue verpflichtende Wiederqualifizierung auslösen. Das löscht oder entwertet nicht automatisch den historischen Abschluss.

Eine Wiederqualifizierungsanforderung muss den Umfang eindeutig benennen:
- betroffene Qualifikation, Kursversion oder Kompetenz;
- betroffener Teilnehmer bzw. betroffene Gruppe;
- fachlicher Grund;
- erforderlicher neuer Nachweis;
- gegebenenfalls eine Frist.

Die Anordnung erfolgt durch eine berechtigte verantwortliche Person und wird mit Person, Grund und gegebenenfalls Frist protokolliert. Der Teilnehmer wird informiert.

Normale Änderungen an einer Kursversion lösen keine automatische Wiederqualifizierung aus.

### 7.4 Zentrale Qualifikationsnachweise

Wiederqualifizierungsanforderungen werden zentral bei dem betroffenen Kurs bzw. Qualifikationsnachweis geführt. Programme, die dieselbe Qualifikation voraussetzen, referenzieren denselben Vorgang. Dadurch soll verhindert werden, dass derselbe Nutzer dieselbe Wiederqualifizierung mehrfach für mehrere Programme absolvieren muss.

Ein neu erworbener Qualifikationsnachweis wird zentral dokumentiert und von Programmen referenziert, die ihn anerkennen. Frühere Nachweise und Programmabschlüsse bleiben historisch nachvollziehbar.

## 8. Empfehlungen

### 8.1 Entstehung – Option C beschlossen

Empfehlungen entstehen sowohl:
- manuell durch berechtigte Ausbilder/Administratoren;
- automatisch durch nachvollziehbare regelbasierte Kriterien.

Jede Empfehlung braucht einen erkennbaren Grund. Empfehlungen sind freiwillige Orientierung und keine zusätzliche Zugangsvoraussetzung. Die bloße Existenz einer Empfehlung darf keine Zugriffssperre oder Pflicht erzeugen.

Automatische Regeln müssen auf tatsächlich vorhandenen und fachlich belastbaren Daten beruhen. Es darf kein verborgenes, nicht nachvollziehbares Bewertungssystem entstehen.

### 8.2 Deduplizierung – Option B beschlossen

Dasselbe Lernobjekt erscheint grundsätzlich nur einmal in der persönlichen Empfehlungsliste, auch wenn mehrere Gründe dafür vorliegen.

Mehrere Ursachen werden in der einen Empfehlung zusammengeführt und bleiben nachvollziehbar. Dabei gehen insbesondere nicht verloren:
- Herkunft bzw. Quelle der Empfehlung;
- verantwortlicher Ausbilder;
- persönlicher Hinweis oder Kontext;
- weitere zusammengeführte Empfehlungsgründe.

Deduplizierung darf also nicht dazu führen, dass der Nutzer nicht mehr erkennen kann, warum etwas empfohlen wurde oder wer die Empfehlung ausgesprochen hat.

### 8.3 Lebenszyklus – Option C beschlossen

- Eine Kurs-Empfehlung endet nach dem tatsächlichen Kursabschluss.
- Eine Prüfungs-Empfehlung gilt erst dann als erledigt, wenn die fachliche Voraussetzung für die Prüfung tatsächlich erfüllt ist und der empfohlene Schritt entsprechend bearbeitet wurde.
- Das Öffnen eines Materials reicht nicht als Erledigung.
- Materialempfehlungen bleiben so lange bestehen, bis ein tatsächlicher sinnvoller Abschlussnachweis vorliegt oder der Nutzer sie ausblendet.
- Erledigte Empfehlungen bleiben historisch nachvollziehbar.

Es darf keine Erledigung aus bloßem Öffnen, aus einem Seitenaufruf oder aus einem nicht gespeicherten Zustand abgeleitet werden.

### 8.4 Priorisierung – Option B beschlossen

Die Reihenfolge der Empfehlungen folgt diesen fachlichen Gruppen:
1. ausdrücklich festgelegte Dringlichkeit oder Frist;
2. noch offene erforderliche Ausbildungsbestandteile;
3. konkreter Lernbedarf, etwa nach einem nicht bestandenen freiwilligen Wissenstest;
4. weitere persönliche Empfehlungen von Ausbildern;
5. freiwillige Ergänzungen.

Innerhalb derselben Gruppe kann Aktualität berücksichtigt werden.

Die Herkunft allein macht eine Empfehlung nicht dringlich. Ein nicht bestandener Test erzeugt nicht automatisch eine hohe Dringlichkeit. Dafür muss ein konkreter fachlicher Zusammenhang oder eine ausdrücklich gesetzte Priorität vorliegen.

### 8.5 Persönlich ausblenden – Option B beschlossen

Nutzer können einzelne Empfehlungen aus ihrer persönlichen Übersicht ausblenden.

Das Ausblenden:
- entfernt nur die Empfehlung aus der eigenen Ansicht;
- entzieht keinen Kurs- oder Materialzugang;
- verändert keine Kurs-/Programmberechtigung;
- ist keine Bewertung der Empfehlung;
- liefert keine zusätzliche Feedback-/Ratingfunktion;
- soll kein komplexes Empfehlungsmodell durch Nutzerbewertungen erzeugen.

Eine ausgeblendete Empfehlung darf nicht sofort nach Reload oder erneutem Öffnen wieder erscheinen. Nur eine tatsächlich neue, eigenständige Empfehlung kann die gleiche Lernressource erneut in die persönliche Übersicht bringen. Was genau als „neue eigenständige Empfehlung“ gilt, ist noch zu konkretisieren; bloße Versions-, Fortschritts- oder Reload-Ereignisse reichen nicht.

### 8.6 Noch offene Empfehlungsregeln

Noch nicht entschieden sind:
- präzise Kriterien für eine tatsächlich neue unabhängige Empfehlung;
- Ablauf, Rückzug oder Ungültigkeit, wenn ein Kurs nicht mehr verfügbar oder fachlich veraltet ist;
- Fristen und Erinnerungen;
- Abgrenzung der Empfehlungshistorie zur Benachrichtigungshistorie;
- Verhalten bei manueller Zurücknahme einer Empfehlung.

Diese Punkte dürfen nicht stillschweigend als bereits beschlossen behandelt werden.

## 9. Kursmeldungen und Benachrichtigungen

Für Meldungen innerhalb eines Kurses gilt Option C:
- Der Kurs kann die Anzahl neuer Meldungen anzeigen.
- Jede Meldung besitzt ihren eigenen Lesestatus.
- Das Öffnen des Kurses allein markiert nicht alle Meldungen als gelesen.
- Das Öffnen eines Meldungsmenüs setzt ebenfalls nicht pauschal alle Meldungen auf gelesen.
- Erst das Öffnen des jeweiligen zugehörigen Inhalts markiert diese konkrete Meldung als gelesen.
- Der ungelesene Zustand soll zusätzlich dezent am betroffenen Inhalt erkennbar sein.

Damit wird verhindert, dass ein Nutzer durch das bloße Betreten des Kurses wichtige neue Meldungen unabsichtlich als gelesen markiert. Ein Sammelzähler ersetzt nicht die einzelnen Read-States.

Allgemeine Systembenachrichtigungen bleiben von Kursmeldungen, persönlichen Nachrichten und offiziellen Ankündigungen unterscheidbar.

## 10. Lernbibliothek und Materialverwaltung

### 10.1 Eigenständige Bibliothek

Die Bibliothek ist ein vollständiger, unabhängig nutzbarer Wissensbestand. Alle für den Nutzer zugänglichen Materialien sollen grundsätzlich unabhängig von ihrer Kurszuordnung auffindbar sein.

Kurse referenzieren kanonische Bibliotheksmaterialien. Inhalte sollen nicht durch getrennte Kopien auseinanderlaufen. Eine Kurszuordnung darf die eigenständige Bibliotheksauffindbarkeit nicht aufheben.

### 10.1.1 Bibliotheksstartseite und Kategorien

Die Bibliotheksstartseite soll einen schnellen Einstieg in den gesamten zugänglichen Wissensbestand ermöglichen. Als Struktur wurden besprochen:
- Empfehlungen und zuletzt geöffnete bzw. zuletzt verwendete Materialien als hilfreiche Einstiege;
- Kategorien als visuell erkennbare Einstiegsbereiche;
- Kurs- und Levelbezug als mögliche Orientierung bzw. Filter, sofern die entsprechenden Metadaten tatsächlich gepflegt sind;
- gut sichtbare globale Suche;
- wenige kompakte Schnellfilter;
- weitergehende Filter zunächst eingeklappt bzw. auf Abruf.

Kategorien können als Kacheln oder vergleichbare klare Einstiege erscheinen. Die einzelnen Dokumente werden dagegen in einer kompakten Liste dargestellt; Dokumenteinträge sollen nicht unnötig große Karten werden.

Die genaue visuelle Ausgestaltung bleibt offen. Empfehlungen und zuletzt geöffnete Dokumente dürfen nur auf tatsächlichen Nutzungs-/Empfehlungsdaten beruhen und müssen Zugriffsrechte respektieren. Das Vorhandensein dieser Einstiege darf keine neue fachliche Pflicht oder künstliche Priorität erzeugen.

### 10.2 Materialversionierung – Option B beschlossen

Die Bibliothek zeigt im regulären aktuellen Bestand die aktuell veröffentlichte Materialfassung.

Eine veröffentlichte Kursversion verweist dagegen auf eine konkrete Dokumentversion. Daraus folgt:
- ein neues Bibliotheksdokument ersetzt nicht stillschweigend die Materialgrundlage einer älteren veröffentlichten Kursversion;
- historische Kurse behalten die ihnen zugeordnete Materialfassung;
- eine neue Dokumentfassung kann in der Bibliothek als aktuelle Fassung erscheinen, ohne alte Kursreferenzen zu verändern;
- eine zuständige administrative Person entscheidet ausdrücklich, ob eine Kursversion auf ein neues Material umgestellt wird;
- eine fachlich wesentliche Änderung am Kursinhalt oder an seinem Lernmaterial kann eine neue Kursversion erforderlich machen;
- ältere Materialfassungen bleiben für historische Kursbezüge erhalten, soweit Zugriffsrechte und rechtliche Pflichten dies erlauben.

Die technische Modellierung muss die feste Versionsbindung tatsächlich abbilden. Eine bloß dynamische Referenz auf „immer neueste freigegebene Datei“ wäre nicht ausreichend, wenn sie historische Kursinhalte unbemerkt verändert.

### 10.3 Erstellen und Hochladen von Dokumenten

Es wurde ausdrücklich besprochen, wie neue Materialien in die Bibliothek gelangen und ob es eine PDF-Vorlage geben soll.

Verbindlich festgehalten:
- Dokumente dürfen extern erstellt werden, etwa als PDF, und anschließend hochgeladen werden.
- Eine verpflichtende PDF-Designvorlage ist **nicht** beschlossen.
- Die Plattform muss keinen vollständigen PDF-Editor oder ein internes Layoutsystem bereitstellen.
- Upload und Veröffentlichung sind zwei getrennte Handlungen.
- **BESCHLOSSEN am 06.11.2026 – Veröffentlichungsworkflow Option B:** Ein neu hochgeladenes Material wird zunächst als Entwurf angelegt. Es wird nicht allein durch den erfolgreichen Upload veröffentlicht. Erst eine bewusste, ausdrücklich ausgelöste Veröffentlichungsaktion macht die geprüfte Fassung für den regulären Bibliotheksbestand verfügbar.
- Der erfolgreiche Upload bestätigt daher nur, dass die Datei als Entwurf übernommen wurde. Er darf nicht mit einer Veröffentlichung verwechselt werden.
- Nicht veröffentlichte Entwürfe dürfen nicht in der regulären Teilnehmer-Bibliothek, der globalen Bibliothekssuche, Teilnehmerempfehlungen oder als aktuelle veröffentlichte Kursmaterialfassung erscheinen.
- Ein Entwurf muss im Verwaltungsbereich für entsprechend berechtigte Personen auffindbar und eindeutig als Entwurf gekennzeichnet sein.
- Die Entscheidung über Entwurf und Veröffentlichung ergänzt die bereits beschlossene Dokumentversionierung: eine veröffentlichte Kursversion referenziert weiterhin eine konkrete veröffentlichte Dokumentversion; ein Entwurf verändert keine bestehende Referenz.
- Nach der Veröffentlichung darf eine in Kursen oder historischen Vorgängen verwendete Materialfassung nicht stillschweigend durch Bearbeiten überschrieben werden. Eine inhaltliche Änderung wird als neue Dokumentfassung vorbereitet und nach bewusster Veröffentlichung zur aktuellen Bibliotheksfassung. Historische Kursverweise bleiben auf ihrer konkreten Fassung.
- Die frühere Frage, ob ein PDF-Template verpflichtend sein soll, bleibt mit **Nein / nicht beschlossen** beantwortet.

Der fachliche Mindestablauf ist damit:
1. Berechtigte Person startet „Material hinzufügen“.
2. Sie erfasst die für das Material erforderlichen Angaben und wählt eine lokale PDF-Datei aus.
3. Die Plattform prüft die Datei serverseitig und übernimmt sie als Entwurf.
4. Die Verwaltungsoberfläche zeigt den Entwurf mit Dateiname, Metadaten, Upload-/Prüfstatus und einer klaren Kennzeichnung „Nicht veröffentlicht“.
5. Eine berechtigte Person kontrolliert Inhalt und Angaben und löst die Veröffentlichung ausdrücklich aus.
6. Erst nach erfolgreicher serverseitiger Prüfung und bestätigter Speicherung wechselt die Fassung in den Status „Veröffentlicht“ und wird für berechtigte Teilnehmer in der Bibliothek verfügbar.
7. Eine spätere inhaltliche Änderung an einer veröffentlichten Fassung erzeugt eine neue Entwurfsfassung; sie ersetzt die bisher veröffentlichte Fassung erst durch eine eigene bewusste Veröffentlichung.

Die Oberfläche muss die Zustände klar unterscheiden: Datei lokal ausgewählt, Upload läuft, Entwurf gespeichert, Prüfung fehlgeschlagen, Veröffentlichung läuft und veröffentlicht. Ein Uploadfehler darf keinen scheinbar gespeicherten Entwurf erzeugen; ein Veröffentlichungsfehler darf den bereits gespeicherten Entwurf nicht als veröffentlicht anzeigen.

**BESCHLOSSEN am 06.11.2026 – Veröffentlichungsberechtigung Option A:** Dieselbe Person, die einen Entwurf mit entsprechender bestehender Berechtigung angelegt oder bearbeitet hat, darf ihn auch selbst bewusst veröffentlichen. Es ist keine zweite Person und kein Vier-Augen-Prinzip vorgeschrieben. Die Veröffentlichung bleibt eine separate, ausdrücklich ausgelöste Aktion. Admin und Colonel behalten ihre bestehende übergreifende Verwaltungsbefugnis; weitere Rollen dürfen nur innerhalb ihrer bereits zugewiesenen Kurs-/Verwaltungsberechtigungen handeln. Eine Veröffentlichung darf niemals allein aus der Uploadberechtigung oder einem automatischen Speichervorgang folgen. Die genaue technische Abbildung und Prüfung der Rechte bleibt Implementierungsarbeit.

### 10.3.1 Dateiauswahl, Prüfung und Upload-Rückmeldung

Die Datei ist nicht allein anhand ihres Namens oder eines vom Browser gemeldeten MIME-Typs als PDF zu akzeptieren. Die serverseitige Prüfung muss den tatsächlichen Dateiinhalt berücksichtigen. OWASP empfiehlt eine mehrschichtige Prüfung unter anderem von erlaubter Dateiendung, MIME-Angabe, Signatur und Inhalt; keine einzelne Prüfung reicht allein aus. Die Datei muss außerdem Größenlimits haben und darf nur durch berechtigte Nutzer hochgeladen werden.

Für den Upload-Dialog gelten folgende UX-Leitlinien:
- Zulässiges Format und maximale Dateigröße müssen vor der Auswahl sichtbar sein, sobald die Grenzen festgelegt sind.
- Dateiname und Dateigröße werden nach Auswahl angezeigt; die Auswahl kann vor dem Upload ersetzt werden.
- Drag-and-drop kann zusätzlich angeboten werden, darf aber nicht der einzige Weg sein.
- Uploadfortschritt und anschließende Verarbeitung werden getrennt und verständlich dargestellt.
- Erfolgreicher Upload bestätigt ausdrücklich „Entwurf gespeichert“ und nennt den nächsten sinnvollen Schritt; nicht „Material veröffentlicht“.
- Fehler müssen konkret benennen, ob Dateityp, Größe, beschädigte Datei, Passwortschutz, fehlgeschlagene Übertragung oder eine serverseitige Prüfung das Problem verursacht hat.
- Bei einem Fehler bleiben Metadaten und Formularangaben erhalten, soweit dies technisch sicher möglich ist; die Datei kann erneut ausgewählt werden.
- Die Statusrückmeldung muss auch assistiven Technologien zugänglich sein; Fehler werden dem jeweiligen Eingabefeld zugeordnet und nicht nur farblich dargestellt.
- Der Nutzer darf nicht durch wiederholtes Klicken unbeabsichtigt mehrere Entwürfe desselben Uploads erzeugen. Die technische Operation sollte eine sichere Wiederholung ermöglichen.

Die genaue maximale PDF-Größe, die Zahl gleichzeitiger Uploads, erlaubte PDF-Untertypen, Viren-/Malware-Prüfung, PDF-Parser-/Sandbox-Lösung und Aufbewahrung fehlgeschlagener Uploads bleiben technische Entscheidungen und müssen anhand des tatsächlichen Hosting-/Speichermodells geprüft werden.

#### PDF-Sicherheit und Uploadgrenzen – fachliche Leitplanken und Empfehlung (noch nicht abschließend beschlossen)

Der aktuelle Ist-Stand ist keine ausreichende Sicherheitsprüfung: `isSafePdfDataUrl` kontrolliert derzeit nur den Data-URL-Präfix und die Base64-Zeichen. Die Prüfung bestätigt weder die PDF-Signatur noch die strukturelle Lesbarkeit oder Schadsoftwarefreiheit. Der Browser liest die Datei als Base64-Data-URL ein. Der allgemeine JSON-Parser ist auf 25 MB begrenzt. Bei Firestore werden PDF-Daten in `blobs` in Teilstücke von 700.000 Zeichen zerlegt; das 1-MiB-Dokumentlimit wird dadurch adressiert, nicht aber Upload-, Speicher- oder Verarbeitungsrisiken.

**Empfohlene Mindestanforderungen:**
- Nur PDF-Dateien zulassen; Dateiendung und gemeldeter MIME-Typ sind unterstützende Plausibilitätsprüfungen, keine Vertrauensgrundlage.
- Dateigröße bereits im Browser vor dem Einlesen prüfen und zwingend nochmals serverseitig anhand der dekodierten Bytes. Die Serverprüfung ist maßgeblich.
- Base64-Daten strikt dekodieren; ungültige Kodierung, leere Dateien, übergroße Dateien und Größenüberschreitungen ablehnen.
- PDF-Signatur und tatsächliche Parser-/Strukturlesbarkeit serverseitig prüfen. Eine Signatur allein genügt nicht.
- Passwortgeschützte, beschädigte, abgeschnittene oder nicht unterstützte PDFs nicht veröffentlichen; klare Fehlerursache zurückmelden. Kein stilles Überspringen der Prüfung.
- Dateinamen nicht als Speicherpfad oder Dokumentidentität verwenden. Serverseitige Material-/Datei-IDs verwenden und den Originalnamen nur als bereinigte Anzeigeinformation behalten.
- Upload und Abruf bleiben authentifiziert und autorisiert; Abruf muss die bestehenden Rang-/Zugriffsregeln serverseitig durchsetzen.
- Unvertrauenswürdige PDF-Inhalte nicht als HTML ausführen. Parser/Renderer aktuell halten und Verarbeitung mit begrenzten Ressourcen durchführen.
- Malwareprüfung bzw. Content Disarm and Reconstruction (CDR) prüfen. Falls ein geeigneter, datenschutzkonformer Scanner verfügbar ist, Upload bis zum abgeschlossenen Scan als „in Prüfung“ behandeln und bei Scannerfehlern nicht freigeben. Keine vertraulichen RCPD-Dateien ohne gesonderte Datenschutz-/Vertragsprüfung an öffentliche Scan-Dienste senden.
- Temporäre Dateien, Fehlerabbrüche und Wiederholungen sicher behandeln; keine unvollständigen oder mehrfachen Materialentwürfe erzeugen. Speicher- und Request-Limits müssen zusammenpassen.

**Größenempfehlung zur Entscheidung:** Maximal **15 MB pro PDF-Datei (Rohdatei)**. Bei Base64 entstehen daraus ungefähr 20 MB Daten vor JSON-Overhead. Das liegt unter dem derzeitigen 25-MB-JSON-Limit und lässt etwas Reserve für Metadaten/Request-Struktur. Das Limit muss serverseitig auf den dekodierten PDF-Bytes gelten; die JSON-Request-Grenze bleibt ein separater Schutz. Diese Zahl ist eine Empfehlung, noch kein Beschluss. Vor Implementierung ist sie mit realen Dokumentgrößen und Hosting-/Speicherbedingungen zu verifizieren.

**UX-Rückmeldungen:** Die erlaubte Dateigröße und der Dateityp stehen vor der Dateiauswahl. Spezifische Fehlerzustände werden verständlich benannt (zu groß, falscher Typ, leer, beschädigt/nicht lesbar, passwortgeschützt, Prüfung fehlgeschlagen, Upload nicht verfügbar). Metadaten bleiben nach Fehlern erhalten, soweit sicher möglich. Upload erfolgreich bedeutet nur „Entwurf gespeichert“, nicht „veröffentlicht“.

### 10.3.2 Veröffentlichung einer Entwurfsfassung

Die Veröffentlichungsaktion ist von der Uploadaktion getrennt und muss die tatsächliche Fassung eindeutig benennen. Vor der Aktion sollen mindestens Titel, Materialcode, Version und Dateiname sichtbar sein, damit nicht versehentlich ein anderer Entwurf freigegeben wird.

Die Veröffentlichung muss serverseitig autorisiert und als eine nachvollziehbare Zustandsänderung gespeichert werden. Die Teilnehmeransicht darf eine Fassung erst dann erhalten, wenn der Server den Veröffentlichungsstatus bestätigt hat. Ein Client-seitiger Statuswechsel oder eine Erfolgsmeldung vor bestätigter Speicherung reicht nicht aus.

Eine separate fachliche Review-Queue, zweite Person als Pflichtfreigeber oder zusätzliche Freigabestufe wird durch Option B nicht automatisch eingeführt. Diese Frage bleibt separat offen.

### 10.3.3 Nachträgliche Änderungen und neue Fassungen

- Ein unveröffentlichter Entwurf kann vor Veröffentlichung korrigiert werden.
- Eine veröffentlichte Fassung bleibt als konkrete Version erhalten.
- Eine neue inhaltliche Fassung wird als neuer Entwurf mit Bezug auf das bestehende Bibliotheksmaterial vorbereitet.
- Die Veröffentlichung der neuen Fassung ändert die aktuelle Bibliotheksfassung, aber nicht automatisch bereits veröffentlichte Kursversionen oder historische Nachweise.
- Die Zuordnung eines neuen Materials zu Kursen bzw. die Umstellung bestehender Kursversionen ist eine separate bewusste fachliche Handlung.
- Für rein redaktionelle Metadatenkorrekturen ohne Änderung des Dokuments oder seiner fachlichen Bedeutung ist noch festzulegen, ob sie ohne neue Dokumentversion zulässig sind. Diese Grenze darf nicht durch ein stilles Überschreiben des PDF-Inhalts verwischt werden.

### 10.3.5 Pflichtmetadaten – Option A beschlossen

**BESCHLOSSEN am 06.11.2026 – Option A (schlanke Pflichtangaben):**
- **Titel:** verpflichtend; muss das Material für Nutzer verständlich und unterscheidbar benennen.
- **Kategorie:** verpflichtend; ordnet das Material einem fachlichen Themenbereich zu.
- **Dokumenttyp:** verpflichtend; beschreibt die Art bzw. Funktion des Dokuments (z. B. Handbuch, Richtlinie oder Merkblatt), nicht sein Dateiformat.
- **Beschreibung:** optional; ergänzt den Titel um Kontext, ohne für jeden Upload einen künstlichen Beschreibungstext zu erzwingen.
- **Erforderlicher Rang:** optional; nur setzen, wenn für das Material tatsächlich eine entsprechende Zugriffsbeschränkung fachlich vorgesehen ist. Ein leerer Wert darf nicht durch einen willkürlichen Standardrang ersetzt werden.
- **Materialcode:** wird automatisch und eindeutig durch das System vergeben. Nutzer müssen keine Kennung erfinden oder manuell eintippen.
- **Dokumentversionskennung:** wird zusätzlich pro konkreter Datei-/Dokumentfassung erzeugt und ist von der stabilen Materialkennung zu unterscheiden.
- **Geschätzte Lesezeit:** soll nach Möglichkeit aus dem Dokumentinhalt abgeleitet werden. Ist eine verlässliche automatische Schätzung nicht möglich, bleibt sie optional oder wird nicht angezeigt; sie ist keine Pflichtangabe.

Die schlanke Pflichtfeldregel ist verbindlich. Die konkreten Auswahllisten für Kategorien und Dokumenttypen, die automatische Kennungsstruktur und die technische Berechnung der Lesezeit bleiben gesonderte Detailfragen. Freitext für Kategorie oder Dokumenttyp ist nicht automatisch freigegeben; diese Eingaben müssen für konsistente Suche und Filter kontrolliert gestaltet werden.

Für die Oberfläche:
- Pflichtfelder werden sichtbar als erforderlich gekennzeichnet; optionale Felder sind entsprechend markiert oder in einen optionalen Abschnitt gruppiert.
- Feldbeschriftungen und Hinweise müssen Zweck und erwartete Eingabe verständlich benennen.
- Validierungsfehler bleiben konkret dem Feld zugeordnet; bereits eingegebene Angaben bleiben bei einem Fehler soweit möglich erhalten.
- Die Systemkennung wird nach Anlage angezeigt, ist aber nicht als manuell zu bearbeitendes Pflichtfeld zu präsentieren.

**Begründung:** Die Bibliothek benötigt genug strukturierte Angaben für Auffindbarkeit und eindeutige Einordnung, soll aber keine unnötige Datenerfassung erzwingen. Die Trennung zwischen Thema/Kategorie und Dokumenttyp folgt etablierten Taxonomieprinzipien: Themen beschreiben, worum es inhaltlich geht; Inhaltstypen beschreiben die Art bzw. den Zweck des Inhalts. Die Werte sollen kontrolliert, verständlich und für die tatsächlichen RCPD-Materialien passend sein.

### 10.3.6 Kategorien und Dokumenttypen – Option A beschlossen

**BESCHLOSSEN am 06.11.2026 – Option A:** Fachliche Kategorien und Dokumenttypen werden als zwei getrennte, kontrollierte Auswahllisten geführt.

- **Kategorie** beantwortet: Welches fachliche Thema behandelt das Material?
- **Dokumenttyp** beantwortet: Was für eine Art bzw. Funktion hat das Dokument?
- Ein Material erhält eine fachliche Hauptkategorie und einen Dokumenttyp. Mehrfach-Tags oder zusätzliche Zuordnungen sind damit nicht automatisch beschlossen.
- Beide Werte werden unabhängig voneinander gespeichert, angezeigt und für Suche/Filter nutzbar gemacht.
- Die Werte werden zentral kontrolliert gepflegt. Unkontrollierte freie Eingaben, die unbemerkt neue Schreibweisen oder Dubletten erzeugen, sind nicht vorgesehen.
- Die konkreten Listenwerte und eine mögliche Untergliederung sind noch festzulegen. Sie müssen anhand des tatsächlichen RCPD-Materialbestands geprüft werden; keine theoretische Vollständigkeit und keine unnötig feingranulare Taxonomie.
- Die vorhandenen Kategorien im aktuellen Code sind nur Bestandswerte, keine bestätigte Ziel-Taxonomie. Sie vermischen derzeit Themenbereiche (z. B. „California Penal Code“, „Tactical Operations“, „Radio & Dispatch“, „Field Training (FTO)“) mit Dokument-/Funktionsbezeichnungen (z. B. „SOP & Policy“, „Supervisor Directive“). Sie dürfen daher nicht ungeprüft als neue Kategorienliste übernommen werden.

Die Trennung folgt dem Zweck der Felder: Kategorien bilden die fachliche Themenordnung, Dokumenttypen beschreiben die Form/Funktion des Materials. Dadurch kann beispielsweise ein Dokument zum Thema „Tactical Operations“ den Typ „SOP / Dienstanweisung“ erhalten, ohne dass beide Informationen in einem einzigen Feld konkurrieren.

### 10.3.7 Berechtigungen für Entwürfe, Rücknahme und Archivierung – Option B beschlossen

**BESCHLOSSEN am 06.11.2026 – Option B:** Die Berechtigung zur laufenden Entwurfsverwaltung wird von der Befugnis getrennt, veröffentlichte Materialien zurückzuziehen oder zu archivieren.

- Bereits entsprechend berechtigte Kursverantwortliche dürfen Entwürfe innerhalb ihrer zugewiesenen Kurszuständigkeit anlegen und bearbeiten sowie diese selbst ausdrücklich veröffentlichen.
- Das Zurückziehen und Archivieren bereits veröffentlichter Materialien bleibt Admin und Colonel vorbehalten.
- Für Entwürfe gilt weiterhin die konkrete Kurszuständigkeit. Ein automatisch generierter Materialcode ist eine Materialkennung und darf nicht als Ersatz für den Kurs-/Zuständigkeitsbezug der Berechtigungsprüfung verwendet werden.
- Die Entscheidung erweitert keine sonstigen Rollenrechte und führt keine neuen pauschalen Berechtigungen ein.
- Die konkrete technische Rechteprüfung muss serverseitig erfolgen; UI-Ausblendung allein genügt nicht.
- Admin und Colonel behalten ihre bestehende übergreifende Verwaltungsbefugnis.
- Ein Rückzug/Archivierungsvorgang muss nachvollziehbar protokolliert werden und darf historische Kursversionen, Abschlüsse oder deren konkrete Dokumentreferenzen nicht stillschweigend verändern.

### 10.3.4 Offene Upload- und Veröffentlichungsentscheidungen

Noch zu definieren sind insbesondere:
- Die fachliche Trennung der Berechtigungen ist mit Option B beschlossen; die serverseitige Umsetzung und sichere Zuordnung zu Kurszuständigkeiten bleibt Implementierungsarbeit.

- Welche konkreten Werte und ggf. Untergliederungen sollen die getrennten, kontrollierten Kategorien- und Dokumenttyp-Listen enthalten?
- Wie werden Materialcodes vergeben, auf Eindeutigkeit geprüft und bei Versionsfolgen verwendet?
- Welche Dateigrößen- und Uploadgrenzen sind für den tatsächlichen Betrieb angemessen?
- Welche serverseitigen PDF-Prüfungen und Sicherheitsmaßnahmen werden eingesetzt?
- Wie werden passwortgeschützte, beschädigte, leere, nicht unterstützte oder ungewöhnliche PDF-Dateien behandelt?
- Wie wird Text-Extraktion geprüft und wann wird OCR angeboten bzw. benötigt?
- Wie werden bei Veröffentlichung betroffene Kursverantwortliche über eine neue Fassung informiert, ohne bestehende Kursversionen automatisch umzustellen?
- Welche Metadatenänderungen benötigen eine neue Dokumentversion?
- Wie werden Upload-/Veröffentlichungsfehler, Wiederholungen und parallele Bearbeitungen behandelt?

Diese Punkte bleiben offen, soweit sie nicht ausdrücklich in den vorstehenden Abschnitten als beschlossen gekennzeichnet sind.

### 10.4 Archivierung und endgültige Löschung – Option A beschlossen

Veröffentlichte Dokumente oder Materialien, die bereits in veröffentlichten Kursen verwendet wurden, sollen im Normalbetrieb archiviert oder fachlich zurückgezogen werden und nicht regulär endgültig gelöscht werden.

Endgültige Löschung ist ein administrativer Ausnahmefall. Dabei sind Datenschutz, gesetzliche Aufbewahrung, historische Abhängigkeiten und bereits abgeschlossene Kurse zu berücksichtigen.

Unveröffentlichte, nicht verwendete Entwürfe können einfacher gelöscht werden. Fachlich zurückgezogene Materialien müssen nachvollziehbar als zurückgezogen oder nicht mehr aktuell gekennzeichnet sein. Historische Kursreferenzen und Abschlüsse werden nicht automatisch verändert.

### 10.5 Suche – Option A beschlossen

Die Bibliothek besitzt eine globale Suche. Sie durchsucht standardmäßig alle für den jeweiligen Nutzer zugänglichen Bibliotheksdokumente, unabhängig von der aktuell geöffneten Kategorie.

Das bedeutet:
- die Suche ist nicht nur ein Filter innerhalb der gerade ausgewählten Kategorie;
- Zugriffsrechte bleiben maßgeblich;
- nicht zugängliche Dokumente dürfen nicht durch Suchergebnisse oder Metadaten offengelegt werden;
- Ergebnisrelevanz ist die Standardsortierung;
- alphabetische Sortierung und Sortierung nach tatsächlichem Aktualisierungsdatum sind alternative Ansichten.

Mögliche Suchfelder wie Titel, Materialcode, Kategorie, Thema, Metadaten und extrahierter Volltext sind fachlich sinnvoll, aber nur zu verwenden, wenn die Daten bzw. Indizes zuverlässig vorhanden sind. OCR für Scans ist eine gesonderte technische Prüfung, keine garantierte Fähigkeit.

### 10.6 Filterdarstellung – Option A beschlossen

Filter sind zunächst kompakt und eingeklappt, damit die Dokumente und die Lesefläche im Vordergrund stehen.

Wenn Filter aktiv sind:
- aktive Filter bleiben sichtbar;
- jeder Filter kann einzeln entfernt werden;
- alle Filter können gemeinsam zurückgesetzt werden;
- mobile Bedienung muss platzsparend bleiben.

Konkrete Filterdimensionen sind nur anzubieten, wenn die zugehörigen Metadaten tatsächlich gepflegt und zuverlässig sind. Kategorien, Dokumenttyp, Thema und Aktualisierungszeitraum sind mögliche Prüffelder, keine pauschal beschlossenen Pflichtfilter.

### 10.7 Dokumentliste

Die Bibliothek soll Dokumente in kompakten, gut scanbaren Listen präsentieren, nicht unnötig große Karten für jedes einzelne Dokument verwenden.

Als mögliche Zeileninformationen wurden Titel, Dateityp, Materialcode und – sofern belastbar vorhanden – geschätzte Lesezeit und Änderungsdatum diskutiert. Es dürfen keine Metadaten erfunden oder aus unzuverlässigen Daten abgeleitet werden.

Die Grundsortierung innerhalb einer Kategorie wurde alphabetisch als Ausgangspunkt besprochen; globale Suchergebnisse nutzen Relevanz als Standardsortierung. Alternative Sortierungen müssen auf echten Datumsfeldern beruhen.

## 11. Dokument-Reader

### 11.1 Lesefläche als Priorität

Der Reader soll eine großzügige, ruhige Lesefläche bieten. Werkzeuge und Navigation dürfen die eigentliche Dokumentansicht nicht unnötig verdrängen. Die Rückkehr zur Bibliothek soll möglichst an die vorherige Position, Suche und den bisherigen Kontext anschließen.

### 11.2 Dokumentnavigation – Option A beschlossen

Die Dokumentnavigation ist zunächst eingeklappt. Bei Bedarf kann links ein Navigationspanel geöffnet werden mit:
- einem Inhaltsverzeichnis, sofern das Dokument eine auslesbare Struktur besitzt;
- Seitenminiaturen;
- direkter Seitennavigation.

Ein Inhaltsverzeichnis darf nicht als verfügbar versprochen werden, wenn es aus dem konkreten Dokument nicht auslesbar ist. Seitenminiaturen und direkte Seitennavigation bleiben als alternative Orientierung bestehen.

### 11.3 Darstellung und Werkzeuge

- Kontinuierliches vertikales Scrollen ist die Standarddarstellung.
- Direkte Seitennavigation bleibt zusätzlich verfügbar.
- Zoom, Seiteneinpassung, Seitennavigation und Dokumentsuche gehören zum geplanten Funktionsumfang.
- Werkzeuge sollen in einem ein-/ausklappbaren Panel untergebracht werden, damit die Lesefläche groß bleibt.
- Die genaue Toolbar-Position, Anordnung und visuelle Ausgestaltung ist noch offen.
- Die letzte Leseposition wird gespeichert und kann wieder aufgenommen werden.

### 11.4 Lesestatus ist kein Verständnisnachweis

Das Anzeigen oder Öffnen eines Dokuments ist kein Nachweis, dass der Nutzer es gelesen, verstanden oder fachlich beherrscht. Fortschrittsanzeigen dürfen diese Dinge nicht gleichsetzen.

## 12. Persönliche Notizen und Lesezeichen

### 12.1 Privat und dokumentversionsgebunden

Notizen und Lesezeichen sind persönliche, private Inhalte. Eine Sharing-Funktion ist für die erste Ausbaustufe nicht beschlossen.

Sie sind an die konkrete Dokumentversion gebunden. Eine neue Dokumentfassung verschiebt die Referenz nicht automatisch. Beim Öffnen einer neuen Fassung kann ein Hinweis auf persönliche Notizen oder Lesezeichen aus einer älteren Version sinnvoll sein; die ursprüngliche Referenz bleibt erhalten.

### 12.2 Funktionen

Als Zielumfang wurden festgehalten:
- Rich-Text-Notizen;
- automatische Speicherung;
- sichtbarer Speicherstatus;
- Verknüpfung von Notizen mit Dokumenten und konkreten Seiten/Textstellen, soweit zuverlässig möglich;
- mehrere Quellen pro Notiz;
- Warnung, wenn eine Seitenreferenz durch eine geänderte Dokumentfassung nicht mehr eindeutig zuordenbar ist;
- Suche nach Titel und Volltext;
- Tags bzw. Themen zur persönlichen Organisation.

Notizen sollen die Quellstelle auffindbar machen, dürfen aber selbst keinen Zugriff auf ein gesperrtes Dokument gewähren.

### 12.3 Synchronisierung – Option A beschlossen

Speicherung erfolgt automatisch serverseitig über das Benutzerkonto und synchronisiert geräteübergreifend.

Der Nutzer muss erkennen können:
- ob Änderungen gespeichert wurden;
- ob eine Speicherung noch läuft;
- ob ein Fehler aufgetreten ist.

Eine vollständige Offline-Bearbeitung wurde nicht zugesagt. Ein fehlgeschlagener Speichervorgang darf nicht still als erfolgreich erscheinen.

### 12.4 Verlust von Berechtigungen – Option A beschlossen

Wenn ein Nutzer den Zugriff auf ein Quelldokument verliert:
- bleiben seine persönlichen Notizen und Lesezeichen grundsätzlich erhalten;
- wird die Quelle als nicht zugänglich gekennzeichnet;
- bleiben historische Versions- und Seitenzuordnungen erhalten;
- erhält der Nutzer über die Notiz keinen indirekten Zugriff auf das gesperrte Dokument.

### 12.5 Entfernung des Quelldokuments – Option A beschlossen

Wenn ein Quelldokument endgültig entfernt wird, bleiben persönliche Notizen und Lesezeichen grundsätzlich erhalten und die Quelle wird als nicht mehr verfügbar gekennzeichnet.

Gesetzliche oder andere verbindliche Löschpflichten für personenbezogene Daten haben Vorrang. Die Erhaltungsregel ist keine pauschale Ausnahme vom Datenschutz.

## 13. Teilnehmerprüfungen

### 13.1 Sichtbarkeit und Voraussetzungen

Es gibt aktuell nur zwei Prüfungsarten:
- `test`;
- `final_exam`.

Eine dritte Prüfungsart wird nicht erfunden.

Prüfungen, für die ein Nutzer grundsätzlich nicht berechtigt ist, bleiben verborgen. Prüfungen, die für den Nutzer vorgesehen sind, bei denen aber fachliche Voraussetzungen noch nicht erfüllt sind, können sichtbar bleiben – mit verständlicher Erklärung, sofern die nötigen Informationen zuverlässig und zur Anzeige freigegeben sind.

Interne Clearance-Details, geschützte Prüfungsinhalte und nicht freigegebene Berechtigungsinformationen dürfen nicht offengelegt werden. Die eigentliche Prüfung der Voraussetzungen erfolgt serverseitig; eine versteckte UI-Schaltfläche ist kein Sicherheitsmechanismus.

### 13.2 Prüfungsstartseite

Vor dem Start sollen die für die Entscheidung relevanten Informationen klar sichtbar sein:
- Prüfungsname und zugehöriger Kurs;
- Prüfungsart;
- Zeitlimit;
- verfügbare Versuche;
- Bestehensgrenze;
- Voraussetzungen und Freischaltungsstatus;
- Beschreibung;
- konkrete Prüfungsregeln.

Es dürfen nur tatsächliche, für diese Prüfung geltende Werte angezeigt werden.

### 13.3 Startbestätigung – Option C beschlossen

Nach Betätigung von „Prüfung starten“ erscheint eine informierte Bestätigung über die tatsächlichen Konsequenzen des Starts. Dazu gehören je nach Prüfungsregel:
- Beginn des Zeitlimits;
- Verbrauch eines Versuchs;
- mögliche Einschränkungen für Unterbrechen oder Zurücksetzen.

Die Bestätigung darf keine Konsequenz behaupten, die für die konkrete Prüfung nicht gilt. Aktionen sind „Zurück“ und die bewusste endgültige Startbestätigung. Der Start darf nicht versehentlich bereits durch das Öffnen der Startseite ausgelöst werden.

### 13.4 Laufender Prüfungsversuch

- Voraussetzungen und Prüfungsstart werden serverseitig kontrolliert.
- Ein aktiver Versuch kann im selben Kurskontext fortgesetzt werden.
- Timer und Abgabezustand müssen auf der serverseitigen Wahrheit beruhen.
- Autosave und Wiederaufnahme müssen echte gespeicherte Zustände wiedergeben.
- Es darf keine vollständige Offline-Funktion versprochen werden, wenn sie nicht tatsächlich implementiert und sicher ist.
- Revision- bzw. Nebenläufigkeitskonflikte dürfen nicht zum stillen Überschreiben neuerer Antworten führen.

### 13.5 Fragenoberfläche und Navigation

Die zentrale Darstellung zeigt jeweils eine Frage im Arbeitsfokus. Daneben bzw. in einer einklappbaren Übersicht kann der Teilnehmer direkt zwischen Fragen wechseln.

Die Übersicht unterscheidet:
- aktuell ausgewählte Frage;
- beantwortete Frage;
- offene Frage;
- markierte Frage.

Eine Frage gilt erst als beantwortet, wenn ihre Antwort zuverlässig gespeichert wurde. Eine lokale Eingabe, deren Speicherung noch aussteht oder fehlgeschlagen ist, darf nicht als sicher beantwortet erscheinen.

Auf Mobilgeräten ist die Fragenübersicht einklappbar, damit die eigentliche Frage ausreichend Platz erhält.

### 13.6 Abgabe

Vor der endgültigen Abgabe werden offene und markierte Fragen sichtbar gemacht. Der Nutzer erhält eine Warnung und muss die Abgabe bewusst bestätigen.

Nur Antworten, deren Speicherung bestätigt ist, gelten als gesichert. Eine Abgabe darf nicht auf einem nur lokal vorhandenen, noch nicht gespeicherten Stand beruhen.

Abgabe, Bewertung und Ergebnisfreigabe bleiben getrennte Vorgänge:
1. Teilnehmer gibt ab.
2. Der Versuch wird als abgegeben dokumentiert.
3. Die Bewertung erfolgt nach Prüfungsregeln.
4. Ein Ergebnis wird erst nach der dafür geltenden Freigabe sichtbar.

### 13.7 Ergebnisse und Prüfungshistorie

Zunächst ist eine aggregierte Ergebnisinformation vorgesehen. Eine detaillierte Analyse, Fragen, Antworten, Lösungen oder geschützte Prüfungsinhalte werden nur angezeigt, wenn die geltenden Regeln sie freigeben.

Die Prüfungshistorie soll den Status und verfügbare Ergebnisse nachvollziehbar machen. Ausgeschöpfte Versuche bleiben gesperrt, aber ihre Historie bleibt sichtbar. Ein zusätzlicher Versuch ist nur möglich, wenn das bestehende System bzw. die konkreten Regeln dies unterstützen.

Falsche Lernfortschrittsangaben sind zu vermeiden. Ein abgegebener Versuch ist nicht automatisch ein bestandener Kurs oder ein abgeschlossener Ausbildungspfad.

### 13.8 Tastaturbedienung – Option C beschlossen

Vollständige grundlegende Tastaturbedienbarkeit ist die Grundlage. Gezielte Verbesserungen sind insbesondere vorgesehen bei:
- Fragenwechsel;
- Fragenübersicht;
- Dialogen;
- Bildvergrößerung.

Fokus muss sichtbar sein. Nach dem Schließen eines Dialogs soll der Fokus sinnvoll zum auslösenden Element oder zur passenden Stelle zurückkehren. Die Reihenfolge muss verständlich sein.

Eigene Tastaturkürzel werden nicht pauschal ergänzt. Sie sind nur dort sinnvoll, wo ein echter Arbeitsvorteil besteht und keine unnötige Komplexität entsteht.

### 13.9 Bilder und Inhalte in Fragen

Fragebilder sollen responsiv dargestellt und bei Bedarf vergrößert werden können. Alternativtexte sollen verwendet werden, wenn das Datenmodell bzw. der Inhalt sie bereitstellt. Nicht vorhandene Alt-Texte dürfen nicht erfunden werden.

## 14. Examiner und Bewertungsarbeitsplatz

### 14.1 Position innerhalb der Academy

Examiner ist kein allgemeiner, für alle sichtbarer sechster Hauptbereich. Er wird innerhalb der Academy angezeigt, wenn die bestehenden Berechtigungen den Zugriff erlauben.

Der Bereich ist als Arbeitsoberfläche für berechtigte Prüfer und Vorgesetzte gedacht. Komplexe Bewertungs- und Administrationsfunktionen sollen normale Teilnehmeransichten nicht belasten.

### 14.2 Gemeinsame Aufgabenliste

Es gibt eine gemeinsame Aufgabenliste für relevante Examiner-Vorgänge, darunter:
- Bewertungen;
- Freigaben;
- Korrekturen;
- Revisionen bzw. zurückgegebene Bewertungen.

Die Liste soll nach tatsächlicher fachlicher Notwendigkeit gefiltert werden können. Festgehaltene Filter:
- Kurs;
- Prüfungstyp;
- Status;
- eigene beanspruchte Vorgänge;
- Teilnehmersuche.

Teilnehmersuche:
- reagiert während der Eingabe;
- unterstützt Teilnamen;
- ist unabhängig von Groß-/Kleinschreibung;
- benötigt in der ersten Ausbaustufe keine unscharfe Tippfehlertoleranz.

Jeder Prüfungsvorgang bleibt ein eigener Eintrag. Auch wenn ein Teilnehmer mehrere Prüfungen hat, werden diese nicht zu einem Sammelvorgang zusammengefasst.

### 14.3 Sortierung und Priorität

Sortierung soll tatsächliche Dringlichkeit, Fristen oder Wartezeit abbilden. Es wird keine künstliche Priorität erfunden, nur damit eine Liste sortierbar ist.

Die Daten müssen eine Priorität oder Frist tatsächlich tragen. Der bloße Ursprung einer Aufgabe, ein bestimmter Prüfer oder die Anzahl offener Vorgänge reicht nicht automatisch als Dringlichkeitsbegründung.

### 14.4 Öffnen ist nicht Beanspruchen

Ein Klick auf einen Vorgang öffnet den Grading Workspace. Er beansprucht den Vorgang noch nicht.

Das Claiming ist eine bewusste gesonderte Aktion. Vor dem Claim soll über die relevanten Claim-Regeln informiert werden. Nach erfolgreichem Claim folgt eine knappe Bestätigung. Das bloße Öffnen der Aufgabenliste oder eines Details darf keinen Claim auslösen.

### 14.5 Persistenter Claim

Ein Claim wird serverseitig persistent gespeichert und bleibt über Browserneustart und Gerätewechsel hinweg bestehen.

Andere berechtigte Prüfer dürfen erkennen:
- dass ein Vorgang beansprucht bzw. in Bearbeitung ist;
- wer verantwortlich ist;
- welcher allgemeine Prozessstatus vorliegt.

Sie erhalten dadurch nicht automatisch Zugriff auf vertrauliche Inhalte, interne Notizen oder geschützte Bewertungskommentare.

### 14.6 Freigabe, Übergabe und administrative Neuzuweisung

Ein beanspruchter Vorgang kann:
- vom aktuellen Prüfer manuell freigegeben werden;
- an einen anderen autorisierten Prüfer übergeben werden;
- durch einen berechtigten Vorgesetzten administrativ neu zugewiesen werden;
- bei definierten Inaktivitäts-/Verbindungsfällen automatisch freigegeben werden.

Claim, Transfer, Release und Reassignment werden nachvollziehbar protokolliert.

Der Vorgesetzte bearbeitet Neuzuweisungen einzeln. Eine Sammel-Neuzuweisung mehrerer Vorgänge ist nicht beschlossen.

### 14.7 Sofortige Schreibsperre bei Verlust der Zuständigkeit

Wenn ein Prüfer die Zuständigkeit verliert, wird sein Schreibzugriff sofort gesperrt.

- Die Ansicht darf, sofern die Person weiterhin berechtigt ist, read-only verfügbar bleiben.
- Gespeicherte Änderungen bleiben erhalten.
- Ungespeicherte Änderungen werden nicht stillschweigend gespeichert.
- Die Oberfläche muss klar erklären, dass keine Schreibberechtigung mehr besteht.

Eine verzögerte oder nur visuelle Sperre wäre nicht ausreichend. Der Server muss die Schreibberechtigung weiterhin durchsetzen.

### 14.8 Inaktivität und automatische Freigabe

Verbindliche Zeitregeln:
- Nach 30 Minuten tatsächlicher Inaktivität wird eine Warnung ausgelöst.
- Es folgt eine Reaktionszeit von 10 Minuten.
- Reagiert der Prüfer nicht und arbeitet nicht weiter, wird der Vorgang automatisch freigegeben.
- Die Warnung wird im Grading-Bereich sowie durch eine In-App-Notification angezeigt.
- Als Restzeit soll ungefähr „9 Minuten“ angezeigt werden, nicht eine unnötig sekundengenaue Anzeige.
- Tatsächliche Aktivität bedeutet Arbeit am Vorgang, nicht nur ein offener Browser-Tab.

Ein Resume während der Warnphase setzt die Warnung zurück und startet eine neue 30-Minuten-Phase. Ein Verbindungsabbruch während der Warnphase pausiert den Warnungstimer, jedoch gilt weiterhin die maximale Claim-Haltezeit von 30 Minuten für Disconnect-Fälle.

Eine manuelle Verlängerung ist nur zulässig, wenn tatsächlich weitergearbeitet wird. Ein bloßer Klick oder künstliches Offenhalten ist kein legitimer Verlängerungsgrund.

### 14.9 Verbindungsabbruch

Bei einem Disconnect wird der Claim höchstens 30 Minuten gehalten. Danach wird er automatisch freigegeben.

Nach einer Wiederverbindung ist ein neuer Claim notwendig, sofern der Vorgang nicht inzwischen einer anderen Person zugewiesen wurde. Der vorherige Claim darf nicht unbemerkt wiederhergestellt werden.

### 14.10 Freiwillige Freigabe durch Prüfer

Ein Prüfer kann einen Vorgang freiwillig ohne Angabe eines Grundes freigeben.

Vor der Freigabe erscheint eine bewusste Auswahl:
- zurück und speichern;
- freigeben und ungespeicherte Änderungen verwerfen;
- abbrechen.

Gespeicherte Bewertungsschritte bleiben erhalten. Ungespeicherte Änderungen werden verworfen. Nach erfolgreicher Freigabe folgt eine knappe Bestätigung.

### 14.11 Zustand nach automatischer Freigabe

Nach einer automatischen Freigabe wird beim nächsten Öffnen einmalig eine Zusammenfassung des zuletzt gespeicherten Zustands gezeigt.

Diese Zusammenfassung:
- gibt keine Schreibrechte zurück;
- enthält keine ungespeicherten Änderungen;
- erklärt, dass der Claim verloren bzw. freigegeben wurde;
- führt anschließend in die normale, berechtigungskonforme Historienansicht.

Vorgesetzte werden nur bei auffälligen automatischen Freigaben benachrichtigt. Es wird kein automatisches Leistungs- oder Produktivitätsscore-System eingeführt. Konkrete Schwellenwerte für „auffällig“ sind später zu definieren.

### 14.12 Status und Benachrichtigungen

Status wie „Claimed“, „In progress“ und „Revision“ sollen den tatsächlichen Prozesszustand darstellen. Verantwortliche Namen sind in den passenden Details erkennbar.

Benachrichtigungen werden insbesondere für folgende Ereignisse eingesetzt:
- direkte Übergabe an einen anderen Prüfer;
- administrative Neuzuweisung;
- bevorstehende automatische Freigabe;
- wichtige Action Requests.

Nicht jede Bewertungsänderung erzeugt eine Notification.

Der neue Verantwortliche erhält die wesentlichen Prozessinformationen, Kurs/Prüfung, Grund und direkten Link. Der vorherige Verantwortliche erhält eine Nachricht über Verlust oder Neuzuweisung. Vertrauliche Bewertungsinhalte werden dabei nicht unnötig breit verteilt.

### 14.13 Aufgabenabschluss und Wechsel zum nächsten Vorgang

Nach Abschluss eines Bewertungsvorgangs wechselt der Prüfer nicht automatisch in einen weiteren Vorgang oder schließt diesen unbewusst mit ab. Der nächste Vorgang wird bewusst ausgewählt.

Abgeschlossene Vorgänge verschwinden aus der offenen Aufgabenliste, bleiben aber in der Historie vorhanden.

### 14.14 Revision und erneute Bewertung

Eine zurückgegebene Bewertung wird wieder in die gemeinsame Aufgabenliste aufgenommen und als „Revision“ kenntlich gemacht.

- Ein neuer Claim kann erforderlich sein.
- Es entsteht kein neuer Prüfungsversuch; der bestehende Vorgang wird weiterbearbeitet.
- Bereits gespeicherte Bewertungsschritte bleiben erhalten.
- Alle autorisierten Prüfer sind gleichberechtigt.
- Der ursprüngliche Prüfer erhält keinen Vorrang, bleibt aber in den Details nachvollziehbar.
- Konkretes Feedback zu betroffenen Bewertungsschritten und der Grund der Revision sind erforderlich.
- Ein neuer Prüfer darf weitere Fehler korrigieren, auch wenn sie nicht ursprünglich markiert waren.
- Sämtliche Änderungen und Übergaben werden protokolliert.

Die Revision darf nicht dazu führen, dass die vorherige Bewertungshistorie unsichtbar wird.

### 14.15 Grading Workspace

Der Bewertungsarbeitsplatz ist auf Desktop als geteilte Ansicht konzipiert: Bewertungsschritte und relevante Prüfungs-/Teilnehmerinformationen sollen parallel erkennbar sein. Auf Tablet und Mobilgeräten muss eine responsive, sinnvoll priorisierte Darstellung entstehen.

Ein Kontextpanel ist einklappbar. Es soll Informationen bereitstellen, ohne permanent den eigentlichen Bewertungsbereich zu verdrängen.

Die genaue Pixelanordnung, Farben und Komponenten werden erst im späteren UX-/Designabschnitt festgelegt.

### 14.16 Draft-Speicherung – Konzept C beschlossen

Einzelne Bewertungsänderungen sollen automatisch als Draft gespeichert werden. Der Prüfer schließt den gesamten Bewertungsvorgang anschließend bewusst und ausdrücklich ab.

Das unterscheidet:
- bereits gespeicherte Draft-Änderungen;
- noch ungespeicherte lokale Änderungen;
- endgültig abgeschlossene Bewertung.

Das bestehende technische Verhalten wurde im früheren Audit so beschrieben, dass die Grading Engine ein vollständiges Review atomar speichert und keine separaten Grader-Drafts besitzt. Daher ist das beschlossene Draft-Konzept voraussichtlich eine Backend-Erweiterung und nicht bloß eine UI-Änderung. Vor Umsetzung muss der aktuelle Code erneut geprüft werden.

### 14.17 Abschlussübersicht und finale Bestätigung

Vor dem endgültigen Abschluss erhält der Prüfer eine Übersicht über:
- Punkte bzw. Gesamtergebnis, sofern berechenbar;
- Feedback;
- noch unvollständige Bewertungsschritte;
- gegebenenfalls weitere konkrete, für die Entscheidung relevante Informationen.

Von dort kann er zurück in die Bearbeitung wechseln oder den Abschluss bewusst bestätigen.

Unvollständige Pflichtbewertungen blockieren den Abschluss. Optionales Feedback ist nur dann erforderlich, wenn die konkreten Prüfungsregeln es vorschreiben.

Der Abschluss der Bewertung ist ausdrücklich nicht dasselbe wie die Veröffentlichung des Ergebnisses an den Teilnehmer.

## 15. Ergebnisfreigabe, Korrekturen und Historie

### 15.1 Interner und veröffentlichter Bewertungsstand

Jede abgeschlossene Bewertung besitzt einen internen Bewertungsstand. Teilnehmer erhalten ausschließlich einen ausdrücklich freigegebenen Ergebnisstand.

Es gibt somit zwei fachlich unterschiedliche Ebenen:
- interne Bewertung, die für Prüfer und berechtigte Vorgesetzte verfügbar ist;
- veröffentlichte Ergebnisfassung, die der Teilnehmer sehen darf.

Ein gespeicherter oder abgeschlossener Bewertungsstand ist nicht automatisch für Teilnehmer sichtbar.

### 15.2 Erstfreigabe – prüfungsbezogene Einstellung

Die erste Ergebnisfreigabe folgt einer pro Prüfung konfigurierbaren Einstellung:
- automatische Erstfreigabe;
- manuelle Erstfreigabe.

Es ist noch offen, welches Standardverhalten gilt, wenn für eine Prüfung keine Einstellung hinterlegt ist. Vor Implementierung muss geprüft werden, ob das bestehende Modell einen eindeutigen Default definiert. Wenn nicht, ist der Projektinhaber zu fragen. Es darf kein stillschweigender Default erfunden werden.

### 15.3 Korrektur nach Veröffentlichung

Jede spätere Korrektur benötigt immer eine neue manuelle Freigabe, selbst wenn die erste Freigabe automatisch erfolgt war.

Der Ablauf:
1. Die Korrektur wird intern vorgenommen und gespeichert.
2. Der bisherige veröffentlichte Ergebnisstand bleibt für den Teilnehmer sichtbar.
3. Die neue korrigierte Fassung bleibt intern bzw. unveröffentlicht.
4. Erst nach ausdrücklicher erneuter Freigabe wird ein neuer veröffentlichter Snapshot sichtbar.
5. Erst nach tatsächlicher Veröffentlichung wird der Teilnehmer benachrichtigt.

Es gibt keine unabhängige Funktion, mit der ein bereits freigegebenes Ergebnis einfach ohne neue veröffentlichte Fassung zurückgezogen wird.

### 15.4 Mitteilung während einer Korrektur

Während eine Korrektur geprüft oder vorbereitet wird, erhält der Teilnehmer eine neutrale Information:

„Deine Bewertung wird derzeit überprüft. Dein zuletzt freigegebenes Ergebnis bleibt gültig, bis eine mögliche Änderung veröffentlicht wird.“

Diese Aussage vermeidet den Eindruck, dass ein intern geänderter Stand bereits rechtswirksam oder für den Teilnehmer sichtbar geworden sei.

### 15.5 Korrekturberechtigung und Historie

Korrekturen nach Freigabe sind auf Admins/Colonels beschränkt.

Der alte veröffentlichte und der neue interne Stand müssen nachvollziehbar bleiben. Die Korrekturhistorie hält fest:
- verantwortliche Person;
- Zeitpunkt;
- betroffene Frage bzw. Bewertungsschritt;
- alter Wert;
- neuer Wert;
- Begründung.

Die vollständige Historie bleibt erhalten. Eine Korrektur sortiert den ursprünglichen Vorgang nicht künstlich nach oben, wenn die Sortierung das tatsächliche Bewertungsabschlussdatum darstellen soll.

### 15.6 Teilnehmerbenachrichtigung

Eine Notification über das Ergebnis wird nur nach tatsächlicher Freigabe ausgelöst.

Sie enthält:
- Prüfungsname;
- Kurs;
- Information, dass das Ergebnis verfügbar ist;
- Bestehen/Nichtbestehen nur dann, wenn dies freigegeben und tatsächlich vorhanden ist;
- direkten Link zum Ergebnis.

Sie enthält nicht:
- Punktdetails, sofern nicht ausdrücklich freigegeben;
- Antworten;
- geschützte Fragen;
- interne Prüfernotizen;
- nicht veröffentlichte Korrekturstände.

Ein bloß intern gespeicherter Korrekturstand erzeugt weder eine Teilnehmerbenachrichtigung noch eine daraus abgeleitete neue Empfehlung.

### 15.7 Historienansichten und Berechtigungen

Die Prüferhistorie ist zentral und kompakt in der Teilnehmerakte erreichbar. Daten werden nicht in mehreren Modulen dupliziert. Berechtigte Prüfer erhalten bei Bedarf eine vollständige read-only Bewertungsansicht.

Sichtbarkeit:
- direkt beteiligte Prüfer und autorisierte Vorgesetzte: volle fachlich notwendige Details;
- andere autorisierte Prüfer: allgemeiner Status und Verantwortlichkeit, keine vertraulichen Inhalte oder privaten Notizen;
- Teilnehmer: ausschließlich freigegebene Ergebnisse und freigegebenes Feedback.

Die Liste lädt dynamisch nach; Filter und Sortierung bleiben beim Nachladen erhalten. Leerzustände sind fachlich getrennt (z. B. keine offenen Vorgänge vs. Filter liefert keine Treffer). Ein Lade- oder API-Fehler darf niemals als leere Liste dargestellt werden.

Standard-Sortierung ist tatsächliches Bewertungsabschlussdatum, neueste zuerst. Korrekturen verändern dieses Datum nicht. Eine alternative Sortierung nach Teilnehmer oder letzter Änderung kann angeboten werden, sofern die Daten dies zuverlässig abbilden.

## 16. Kontextbezogene Meldung problematischer Inhalte

In der Academy soll später eine gut erreichbare kontextbezogene Meldefunktion erreichbar sein.

Der Button soll es ermöglichen, konkrete Inhalte oder Fehler zu melden, zum Beispiel:
- unangemessene Inhalte;
- mögliche Rechtsverstöße;
- fachliche Fehler;
- technische Probleme.

Der aktuelle Inhalt bzw. Modulkontext soll automatisch zugeordnet werden, damit der Nutzer nicht erst manuell erklären muss, auf welches Dokument, welchen Kurs oder welchen Bereich sich die Meldung bezieht.

Wichtige Abgrenzung:
- beschlossen ist der spätere kontextbezogene Einstiegspunkt;
- nicht beschlossen ist bereits das vollständige Meldeverfahren;
- Kategorien, Rollen, Verantwortlichkeiten, Prüfablauf, Bearbeitungsstatus, Eskalation, Datenschutz, rechtliche Anforderungen, Moderationsoberfläche und technische Architektur sind später als eigenes Vorhaben zu planen;
- die vollständige Melde-/Prüf-/Administrationslogik wird nicht vorgezogen und nicht stillschweigend in die laufende Bibliotheksplanung eingebaut.

## 17. Offene fachliche und technische Punkte

Die folgenden Punkte sind trotz der umfangreichen Beschlüsse offen und müssen vor einer konkreten Umsetzung geklärt werden:

### Bibliothek und Upload
- **Entwurfs- und bewusste Veröffentlichung Option B ist beschlossen**; offen sind die Rollen, die veröffentlichen dürfen, und ob ein Vier-Augen-Prinzip zusätzlich erforderlich sein soll;
- vollständiger Metadatenworkflow, Pflichtfelder und Materialcode-Regeln;
- Rollen und Rechte für Upload, Änderung, Veröffentlichung, Rückzug, Archivierung und endgültige Löschung;
- maximale Dateigröße, Uploadgrenzen, konkrete serverseitige PDF-Validierung und sichere Speicherung;
- Materialcodes und Metadatenmodell;
- Umgang mit beschädigten, passwortgeschützten, nicht unterstützten oder unlesbaren PDFs;
- Volltext-Extraktion und OCR-Qualität bei Scans;
- Regeln für Rückzug und Benachrichtigung betroffener Kursverantwortlicher;
- konkrete technische Speicherung und Referenzierung exakt gepinnter Dokumentversionen.

### Reader und persönliche Daten
- visuelle Anordnung der Reader-Werkzeuge;
- stabile Seiten-/Textstellenreferenzen bei geänderten PDF-Layouts;
- Warnung und Zuordnung, wenn Seitenreferenzen nicht mehr eindeutig sind;
- Sync-Konflikte und fehlgeschlagene Autosaves;
- Browser-/Geräteunterstützung;
- konkrete rechtmäßige Aufbewahrungs-/Löschregeln für persönliche Notizen bei Konto- und Quelldokumentlöschung.

### Empfehlungen
- Kriterien für neue unabhängige Empfehlungen;
- Entzug/Verfall/Zurückziehen von Empfehlungen bei nicht verfügbaren oder obsoleten Inhalten;
- Fristen, Erinnerungen und Benachrichtigungshistorie.

### Prüfungen und Examiner
- konkrete Fehlerzustände bei Start, Autosave, Resume, Abgabe, Bewertung und Ergebnisfreigabe;
- Backend-Entwurfsspeicherung;
- Claim-Grenzfälle bei gleichzeitiger Bearbeitung, Disconnect und Inaktivität;
- aktuelle Rechteprojektionen und Schutz nicht freigegebener Inhalte;
- lesbare Zuordnung historischer Korrekturen zu Fragen und Schritten;
- Performance, Pagination und dynamisches Nachladen;
- Default der erstmaligen Ergebnisfreigabe, falls nicht je Prüfung gesetzt.

### Academy-übergreifend
- genaue Übergänge und Kontextwiederherstellung zwischen fünf Hauptbereichen;
- konsistente Lade-, Fehler-, Leer- und Sperrzustände;
- mobile Detailgestaltung;
- endgültige UX-/Visual-Design-Entscheidungen.

---

## 18. Leitlinien für die weitere Arbeit

1. Diese Spezifikation ist ein Nachschlagewerk; bereits entschiedene Fragen werden nicht ohne echten Widerspruch erneut gestellt.
2. Nutzerbeschlüsse dürfen nicht durch technische Empfehlungen ersetzt werden.
3. Neue Empfehlungen müssen aktuelle UX-/Accessibility-Recherche, konkrete Quellen und eine Begründung anhand des tatsächlichen Academy-Arbeitsablaufs enthalten.
4. Technische Befunde aus älteren Audits sind vor Umsetzung erneut am aktuellen Code zu überprüfen.
5. Keine Fortschritts-, Speicher-, Ergebnis- oder Freigabezustände vortäuschen.
6. Keine vertraulichen Daten durch UI-Projektionen oder Benachrichtigungen offenlegen.
7. Jede nötige Backend-/Datenmodell-Erweiterung ist separat zu beschreiben; sie ist nicht automatisch durch ein UI-Konzept autorisiert.
8. Das vollständige Meldesystem und noch nicht spezifizierte Academy-Bereiche bleiben eigenständige zukünftige Planungsaufgaben.
