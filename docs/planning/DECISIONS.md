# RCPD – Verbindliche Entscheidungen

**Stand:** 06.11.2026  
**Status:** Verbindliches Entscheidungsregister aus dem verfügbaren Projektgedächtnis und den Gesprächsentscheidungen. Diese Datei dient als kompakter Index der gewählten Regeln. Die ausführliche Bedeutung, konkrete Abläufe, Randfälle und Auswirkungen stehen ergänzend in [PORTAL-REDESIGN-DETAILS.md](./PORTAL-REDESIGN-DETAILS.md) und [ACADEMY-DETAILED-SPECIFICATION.md](./ACADEMY-DETAILED-SPECIFICATION.md). Technische Implementierung muss separat geprüft werden.

Nur Einträge mit Status **BESCHLOSSEN** gelten als verbindlich. Eine Empfehlung in einer früheren Unterhaltung gilt nicht als Beschluss, sofern der Projektinhaber sie nicht angenommen hat.

## A. Übergreifendes Design und Arbeitsweise

- **BESCHLOSSEN – Designrichtung B:** Modernes, professionelles, ruhiges, institutionell-operatives Portal. Keine spielerische/neonartige Überladung.
- **BESCHLOSSEN – UX-Leitlinie:** fachliche Vollständigkeit ohne überladene Oberflächen; administrative Funktionen belasten Teilnehmeransichten nicht unnötig; kontextbezogene Anzeige; unnötige Navigation und Statusanzeigen vermeiden.
- **BESCHLOSSEN – Planungsreihenfolge:** Modulkonzepte zuerst vollständig ausarbeiten, danach Cross-Module-Alignment, technische Machbarkeit, Designsystem und globale Navigation/Detailgestaltung.
- **BESCHLOSSEN – Repository-Grenzen:** separater Branch; kein Commit auf main, kein Merge und kein Produktionsdeployment ohne ausdrückliche Freigabe.
- **BESCHLOSSEN – Qualitätsmaßstab:** Sicherheits-, Datenintegritäts- und Zuverlässigkeitsfragen nicht vertagen; keine ungeprüften Testerfolge behaupten.


## A1. Gesamtes Portal-Redesign – verbindlicher Rahmen (05.–06.11.2026)

- **BESCHLOSSEN:** Das Redesign umfasst das gesamte RCPD-Portal, nicht nur die Academy.
- **BESCHLOSSEN:** Ausgangspunkt ist Designrichtung B „Modernes Einsatz- und Verwaltungsportal“. Die konkrete visuelle Ausgestaltung darf das UX-Audit begründet verfeinern; sie ist noch nicht final festgelegt.
- **BESCHLOSSEN:** Der aktuelle Schwerpunkt liegt auf Bestandsaufnahme, UX-Audit, funktionalem Konzept und Informationsarchitektur. Das finale grafische Design wird bewusst zurückgestellt, bis UX, Informationsarchitektur und technische Machbarkeit ausreichend geklärt sind.
- **BESCHLOSSEN:** Bestehende technische Architektur, Datenmodelle/Datenbankstruktur, Geschäftslogik und Berechtigungen sollen durch das UI/UX-Redesign grundsätzlich nicht verändert werden.
- **BESCHLOSSEN:** Vorhandene Funktionen und Berechtigungen bleiben erhalten. Redundante, unnötige, widersprüchliche oder unklare Bedienelemente dürfen nach Audit begründet neu organisiert oder entfernt werden, ohne die fachliche Funktion zu verlieren.
- **BESCHLOSSEN:** Jede relevante Layout-, UX-, Interaktions- und Modulentscheidung ist konkret zu begründen. Allgemeine Designintuition reicht nicht.
- **BESCHLOSSEN:** Zuerst vollständige Bestandsaufnahme aller Module, Rollen, Workflows, Datenquellen und Desktop-/Mobile-Verhalten; danach funktionales/IA-Konzept, Cross-Module-Abgleich, technische Machbarkeit, Designsystem, globaler Rahmen, modulweise Gestaltung und QA.
- **BESCHLOSSEN:** Vor UX-/Layout-/Navigations-/Interaktionsempfehlungen aktuelle etablierte Plattformmuster und maßgebliche UX-/Accessibility-Standards recherchieren, Quellen nennen und die Empfehlung anhand des konkreten RCPD-Arbeitsablaufs begründen.
- **BESCHLOSSEN:** Alle bereits getroffenen Entscheidungen müssen in einem Review-Dokument erhalten bleiben. Eine spätere unabhängige Claude-Review-Instanz darf jede Entscheidung kritisch hinterfragen; keine Festlegung ist gegen sachliche Kritik immun.
- **BESCHLOSSEN:** Claude-Review darf nicht dazu führen, dass Nutzerentscheidungen stillschweigend überschrieben werden. Kritik, Alternativen und Auswirkungen werden dokumentiert; der Projektinhaber entscheidet.
- **BESCHLOSSEN:** Mobile UX ist ein eigenständiger Audit- und Designgegenstand, nicht nur eine verkleinerte Desktopoberfläche.
- **BESCHLOSSEN:** Rollenorientierte und aufgabenorientierte UI ist ein Leitprinzip; konkrete Rollenansichten müssen aus den tatsächlich vorhandenen Rollen/Rechten abgeleitet werden, keine neuen Berechtigungen erfinden.
- **BESCHLOSSEN:** Bestehende Funktionen und Architektur zuerst read-only untersuchen; keine Implementierung während der konzeptionellen Bestandsaufnahme ohne ausdrückliche Freigabe.
- **BESCHLOSSEN:** Repository-Arbeit erfolgt auf separatem Branch. Kein Commit auf `main`, kein eigenmächtiger Merge und kein Produktionsdeployment. Ein Merge löst wegen Render-Autodeploy eine Live-Veröffentlichung aus.

### Noch keine verbindlichen Entscheidungen
Die folgenden Themen wurden als Audit-/Konzeptfelder oder Vorschläge angesprochen, aber nicht als konkrete UI-Entscheidung beschlossen:
- endgültige Sidebar-/Header-/Tab-Hierarchie;
- Command Palette bzw. Ctrl/Cmd+K als zusätzliche Funktion;
- konkrete Dashboard-Widgets und Anordnung;
- endgültige mobile Navigationsform;
- konkrete Rollen-Dashboard-Layouts;
- einheitliche Design-Tokens, Farben, Typografie und Komponenten;
- neue Berichtskennzahlen, Exportfunktionen oder Personalattribute.

## B. Academy – Grundkonzept und Navigation

- **BESCHLOSSEN:** Academy ist operativer Ausbildungsarbeitsbereich und frei zugängliche Wissensbibliothek; kein erzwungener linearer Lernpfad.
- **BESCHLOSSEN:** Library bleibt vollständige unabhängige Wissenssammlung; Kurse/Programme referenzieren kanonisches Material, statt Inhalte zu duplizieren.
- **BESCHLOSSEN:** Programme besitzen Lernziele; Kurse sind eigenständige Fachmodule, können mehreren Programmen zugeordnet und standalone genutzt werden.
- **BESCHLOSSEN:** Kursreihenfolge dient Orientierung und erzeugt keine pauschalen Zugangssperren.
- **BESCHLOSSEN:** Kurse können optional Kapitel, Materialien und freiwillige Wissenstests enthalten; Abschlussprüfung ist außerhalb der Kapitel und nicht für jeden Kurs zwingend.
- **BESCHLOSSEN:** Freiwillige Wissenstests sind keine Kursabschlussbedingung.
- **BESCHLOSSEN – Hauptnavigation Option A:** Übersicht, Kurse, Lernbibliothek, Prüfungen, Meine Notizen. Examiner ist rollen-/berechtigungsabhängig integriert und kein sechster allgemeiner Hauptmenüpunkt.
- **BESCHLOSSEN:** konkrete grafische Navigation (Sidebar, Icons, mobile Navigation, Untermenüs) wird erst in der späteren Designphase festgelegt.
- **BESCHLOSSEN:** Kurs-/Programmveröffentlichung, Zugriffsberechtigung und persönlicher Fortschritt sind vollständig getrennte Ebenen.

## C. Academy – Empfehlungen und Benachrichtigungen

- **BESCHLOSSEN – Empfehlungen Option C:** manuelle Empfehlungen berechtigter Ausbilder/Admins plus automatische regelbasierte Empfehlungen; jede Empfehlung hat nachvollziehbaren Grund; freiwillig und keine Zugangsvoraussetzung.
- **BESCHLOSSEN – Deduplizierung Option B:** gleiches Lernobjekt grundsätzlich nur einmal in der persönlichen Liste; mehrere Gründe werden zusammengeführt und bleiben nachvollziehbar; Herkunft, verantwortlicher Ausbilder und persönlicher Hinweis bleiben erkennbar.
- **BESCHLOSSEN – Lebenszyklus Option C:** Kurs-Empfehlung endet nach tatsächlichem Kursabschluss; Prüfungs-Empfehlung erst nach Erfüllung der fachlichen Voraussetzung; Material-Öffnen reicht nicht als Erledigung. Erledigte Empfehlungen bleiben historisch nachvollziehbar.
- **BESCHLOSSEN – Priorisierung Option B:** ausdrücklich gesetzte Dringlichkeit/Frist; offene erforderliche Ausbildungsbestandteile; konkreter Lernbedarf (z. B. nach nicht bestandenem Wissenstest); weitere persönliche Ausbilderempfehlungen; freiwillige Ergänzungen. Innerhalb gleicher Gruppe Aktualität. Herkunft allein erzeugt keine Dringlichkeit.
- **BESCHLOSSEN – Ausblenden Option B:** Nutzer kann einzelne persönliche Empfehlungen ausblenden. Das entfernt nur die Empfehlung aus der persönlichen Ansicht, nicht den Zugang zum Kurs/Material. Keine Bewertung oder komplexe Beeinflussung. Ausgeblendete Empfehlung bleibt ausgeblendet; nur eine tatsächlich neue eigenständige Empfehlung darf sie erneut erscheinen lassen.
- **BESCHLOSSEN – Meldungslesestatus Option C:** Kurs kann Anzahl neuer Meldungen anzeigen; einzelne Meldungen bleiben getrennt ungelesen; bloßes Öffnen des Kurses/Meldungsmenüs markiert nicht pauschal als gelesen; erst Öffnen des zugehörigen Inhalts markiert die Meldung als gelesen.
- **BESCHLOSSEN:** dezente Kennzeichnung am betroffenen Inhalt (Kurs, Prüfungsergebnis, Material).

## D. Teilnehmerprüfungen und Examiner

### Teilnehmerprüfungen
- **BESCHLOSSEN:** Prüfungen, für die Teilnehmer grundsätzlich nicht berechtigt sind, bleiben verborgen. Vorgesehene Prüfungen mit noch fehlenden fachlichen Voraussetzungen bleiben sichtbar; Voraussetzungen verständlich erklären, soweit zuverlässige Daten und Freigabe vorliegen. Interne Clearance-/Berechtigungsdetails und geschützte Prüfungsinformationen nicht offenlegen.
- **BESCHLOSSEN:** Prüfungsarten aktuell nur `test` und `final_exam`; keine dritte Kategorie erfinden.
- **BESCHLOSSEN:** Voraussetzungen serverseitig prüfen; aktiven Versuch im selben Kurskontext fortsetzen.
- **BESCHLOSSEN:** Startseite zeigt Prüfung/Kurs, Typ, Zeit, Versuche, Bestehensgrenze, Voraussetzungen/Unlock-Status, Beschreibung und tatsächliche Regeln.
- **BESCHLOSSEN:** informierte Startbestätigung zeigt reale Konsequenzen (Timerbeginn, Versuchverbrauch, Unterbrechungs-/Resetregeln).
- **BESCHLOSSEN:** Fragenansicht mit einer zentralen Frage, direkter Fragenübersicht, Status beantwortet/offen/markiert/aktuell; als beantwortet nur nach Speicherung; Übersicht mobil einklappbar.
- **BESCHLOSSEN:** Server-Timer, Autosave, Resume und Revision-Concurrency sind durch die vorhandene Engine vorgesehen; UI zeigt echte Speicherzustände und verspricht keine ungesicherte Offline-Funktion.
- **BESCHLOSSEN:** vor Endabgabe offene/markierte Fragen anzeigen, warnen und bewusste Bestätigung verlangen; nur bestätigte Speicherung zählt.
- **BESCHLOSSEN:** Abgabe, Bewertung und Ergebnisfreigabe sind getrennt. Nach Abgabe Bestätigung; Ergebnis/Details nur gemäß Freigaberegeln.
- **BESCHLOSSEN:** aggregiertes Ergebnis zuerst; Detailanalyse nur bei entsprechender Freigabe. Finale Fragen/Antworten/Lösungen bis Release schützen.
- **BESCHLOSSEN:** Bilder in Fragen responsiv und zoombar; Alt-Text soweit Modell vorhanden.
- **BESCHLOSSEN – Tastatur Option C:** vollständige Tastaturbedienung als Grundlage; gezielte Fokusverbesserungen bei Fragenwechsel, Fragenübersicht, Dialogen und Bildzoom; sichtbarer Fokus; Fokus nach Dialog sinnvoll zurück; keine unnötigen Shortcuts.
- **BESCHLOSSEN:** Prüfungshistorie zeigt pass/fail, Bewertungsstatus, Feedback und nur freigegebene Details. Erschöpfte Versuche bleiben gesperrt, Verlauf bleibt sichtbar. Zusatzversuch nur, wenn System/Regeln dies unterstützen.
- **BESCHLOSSEN:** keine falschen Lernfortschrittsangaben.

### Examiner
- **BESCHLOSSEN:** integriert in Academy, rollen-/berechtigungsabhängig; gemeinsame Aufgabenliste für Bewertung, Genehmigung, Korrektur etc.
- **BESCHLOSSEN:** Filter nach Kurs, Prüfungstyp, Status, „Meine beanspruchten Vorgänge“ und Teilnehmersuche.
- **BESCHLOSSEN:** Teilnehmersuche live, Teilnamen und case-insensitive; Tippfehlertoleranz zunächst nicht.
- **BESCHLOSSEN:** jeder Vorgang einzeln, auch mehrere beim selben Teilnehmer; nicht gruppieren.
- **BESCHLOSSEN:** Sortierung nach tatsächlicher Dringlichkeit/Deadline/Wartezeit, keine erfundenen Prioritäten.
- **BESCHLOSSEN:** Öffnen öffnet direkt den Grading Workspace und beansprucht keinen Vorgang.
- **BESCHLOSSEN:** nach Abschluss bewusster Wechsel zum nächsten offenen Vorgang, kein automatischer Abschluss.
- **BESCHLOSSEN:** Kontextpanel einklappbar.
- **BESCHLOSSEN:** Claim serverseitig persistent über Browserneustart/Geräte hinweg; andere sehen Status/Verantwortlichen, nicht vertrauliche Inhalte/Notizen.
- **BESCHLOSSEN:** manuelles Freigeben/Transfer/Admin-Neuzuweisung/Inaktivitätsfreigabe; Hinweis auf Claim-Regeln vor Claim und Bestätigung danach; nicht beim bloßen Listenöffnen.
- **BESCHLOSSEN:** Claim-Status „Claimed“/„In progress“, Name in Details.
- **BESCHLOSSEN:** manuelle Übergabe an anderen autorisierten Prüfer; Vorgesetzte können administrativ neu zuweisen; Claim/Transfer/Release/Reassignment werden geloggt.
- **BESCHLOSSEN:** Verlust der Verantwortung führt sofort zu Write-lock; lesbare Ansicht soweit berechtigt; gespeicherte Änderungen bleiben, ungespeicherte nicht still speichern.
- **BESCHLOSSEN:** Verbindungsabbruch hält Claim maximal 30 Minuten, danach Auto-Release; nach Wiederverbindung neu claimen.
- **BESCHLOSSEN:** 30 Minuten Inaktivität lösen Warnung aus; 10 Minuten Reaktionszeit, danach Auto-Release. Aktivität ist tatsächliche Arbeit, nicht offener Tab.
- **BESCHLOSSEN:** Resume während Warnung setzt Warnung zurück und neue 30 Minuten; Disconnect während Warning pausiert Warnungstimer, Claim maximal 30 Minuten halten.
- **BESCHLOSSEN:** manuelle Verlängerung nur bei echter weiterer Arbeit, nicht durch bloßen Klick.
- **BESCHLOSSEN:** Warnung im Grading-Bereich und In-App-Notification, Anzeige ungefähr „9 Minuten“, nicht sekundengenau.
- **BESCHLOSSEN:** Release-Gründe spezifisch loggen.
- **BESCHLOSSEN:** nach Auto-Release einmalige Zusammenfassung des zuletzt gespeicherten Zustands; keine ungespeicherten Änderungen/Write-Rechte; danach volle Historie.
- **BESCHLOSSEN:** Supervisor nur bei auffälligen automatischen Releases benachrichtigen; keine automatisierte Leistungseinstufung; Schwellenwerte später.
- **BESCHLOSSEN:** Supervisor-Einzelbearbeitung, keine Bulk-Reassignment.
- **BESCHLOSSEN:** Prüfer kann freiwillig ohne Grund freigeben; Bestätigung mit „zurück + speichern“, „freigeben + verwerfen“, „abbrechen“; gespeicherte Steps bleiben, ungespeicherte entfallen.
- **BESCHLOSSEN:** abgeschlossene Vorgänge verschwinden aus offener Liste, bleiben Historie.
- **BESCHLOSSEN:** Revision-Return in gemeinsame Liste, ggf. neuer Claim, Status „Revision“; gespeicherte Schritte bleiben; kein neuer Exam. Berechtigte Prüfer gleichberechtigt, ursprünglicher Prüfer ohne Priorität; ursprünglicher Prüfer bleibt sichtbar.
- **BESCHLOSSEN:** konkretes Feedback zu betroffenen Schritten/Grund ist Pflicht; neuer Prüfer darf weitere Fehler korrigieren; alles wird geloggt.
- **BESCHLOSSEN:** Benachrichtigungen für direkte Übergabe, Admin-Reassignment, drohende Auto-Freigabe und wichtige Action Requests; keine Notification für jeden Notenwechsel. Neuer Verantwortlicher erhält Prozess/Kurs/Grund/Link; alter Prüfer Verlust-/Neuzuweisungsinfo.
- **BESCHLOSSEN:** Grading UI Split View auf Desktop, responsive Tablet/Mobil.
- **BESCHLOSSEN – Drafts Konzept C:** einzelne Änderungen automatisch als Draft speichern, bewusster finaler Abschluss; Backend-Erweiterung erforderlich, da aktuelle Engine vollständiges Review atomar speichert.
- **BESCHLOSSEN:** Abschlussübersicht und separate Abschlussbestätigung; Punkte/Gesamtergebnis falls berechenbar, Feedback, unvollständige Schritte; zurück zum Editieren; final bestätigen.
- **BESCHLOSSEN:** unvollständige Pflichtbewertungen blockieren Abschluss; optionales Feedback nur verpflichtend, wenn Prüfungsregeln es verlangen.
- **BESCHLOSSEN:** Bewertungsabschluss und Ergebnisfreigabe getrennt; Release-Regeln je Prüfung; Teilnehmernotification nur bei tatsächlicher Freigabe.
- **BESCHLOSSEN:** Ergebnisnotification enthält Prüfungsname, Kurs, Ergebnis verfügbar; pass/fail nur wenn freigegeben und vorhanden; direkter Link; keine Punktdetails, Antworten oder geschützten Fragen.
- **BESCHLOSSEN:** Korrektur nach Freigabe: intern speichern, danach erneute manuelle Freigabe; altes Ergebnis bleibt sichtbar, bis neues freigegeben ist.
- **BESCHLOSSEN:** neutrale Teilnehmermeldung bei laufender Korrektur: „Deine Bewertung wird derzeit überprüft. Dein zuletzt freigegebenes Ergebnis bleibt gültig, bis eine mögliche Änderung veröffentlicht wird.“
- **BESCHLOSSEN:** keine unabhängige Ergebnis-Widerrufsfunktion.
- **BESCHLOSSEN:** Korrekturrechte nur Admins/Colonels; alte Version intern erhalten.
- **BESCHLOSSEN:** Prüferhistorie zentral und kompakt in Teilnehmerakte, keine doppelten Daten; vollständige read-only Bewertungsansicht für berechtigte Prüfer.
- **BESCHLOSSEN:** Korrekturhistorie mit Person, Zeit, Frage/Bewertungsschritt, alt/neu, Begründung soweit vorhanden; gesamte Historie bleibt.
- **BESCHLOSSEN:** beteiligte Prüfer und berechtigte Vorgesetzte sehen volle Details; andere autorisierte Prüfer nur Status/Verantwortlichkeit; Teilnehmer nur freigegebenes Ergebnis/Feedback.
- **BESCHLOSSEN:** Sortierung nach Abschlussdatum neueste zuerst; Korrektur ändert Position nicht; alternative Sortierung nach Teilnehmer/letzter Änderung.
- **BESCHLOSSEN:** dynamisches Nachladen; Filter/Sortierung erhalten; getrennte Leerzustände; Fehler nicht als leer darstellen.

## E. Ergebnisfreigabe

- **BESCHLOSSEN:** jede abgeschlossene Bewertung besitzt einen internen Bewertungsstand.
- **BESCHLOSSEN:** Teilnehmeransicht basiert ausschließlich auf ausdrücklich freigegebenem Ergebnis.
- **BESCHLOSSEN:** erste Freigabe folgt einer je Prüfung konfigurierbaren Einstellung (automatisch/manuell).
- **BESCHLOSSEN:** jede spätere Korrektur erfordert immer neue manuelle Freigabe.
- **BESCHLOSSEN:** vorheriges veröffentlichtes Ergebnis bleibt bis zur neuen Freigabe sichtbar.
- **BESCHLOSSEN:** interne und veröffentlichte Versionen werden getrennt protokolliert.
- **BESCHLOSSEN:** technische Umsetzung dieser Anforderungen wurde in separatem Branch erlaubt; kein Merge/main-Deployment ohne Zustimmung.
- **OFFEN:** Standardverhalten der erstmaligen Ergebnisfreigabe, wenn für eine Prüfung keine Einstellung existiert. Vor Implementation klären, falls bestehendes Modell keinen klaren Default liefert.
- **BESCHLOSSEN – Testanforderungen:** automatische Erstfreigabe; manuelle Erstfreigabe verborgen; Korrektur erhält altes veröffentlichtes Snapshot; neue Korrektur bleibt unveröffentlicht; neue Snapshot-Freigabe; Notification nur nach atomarer Veröffentlichung; unberechtigte Freigabe abgewiesen; Nebenläufigkeit/Idempotenz; Rollback/Fehler; öffentliche API gibt keine internen/unfreigegebenen Daten zurück; Altprüfungs-Kompatibilität.

## F. Kurse und Programme – Status, Versionierung und Historie (38 Beschlüsse)

1. **BESCHLOSSEN:** Veröffentlichungsstatus, Verfügbarkeit/Zugriff und persönlicher Fortschritt sind drei getrennte Ebenen. Archivierung/Änderungen löschen keine historischen Abschlüsse.
2. **BESCHLOSSEN:** veröffentlichte Kurse vorübergehend verbergen über gesonderte Verfügbarkeitssteuerung, ohne Veröffentlichung/Historie zurückzusetzen.
3. **BESCHLOSSEN:** Archivierung entfernt aus regulärem Angebot; historische Referenz bleibt für frühere Absolventen soweit Rechte erlauben; Abschlüsse bleiben.
4. **BESCHLOSSEN:** laufende Teilnahmen dürfen bei Archivierung grundsätzlich fortgesetzt/abgeschlossen werden; neue Teilnehmer starten archivierte Kurse nicht regulär.
5. **BESCHLOSSEN:** Wiederaktivierung archivierter Kurse möglich und protokolliert; unveränderte Version bleibt, wesentliche Änderungen erzeugen neue Version.
6. **BESCHLOSSEN:** wesentliche Änderungen an Lerninhalten, Ausbildungszielen, Struktur, fachlichen Anforderungen, Kapiteln, Materialien oder fachlich relevanter Reihenfolge erfordern neue Kursversion. Redaktionelle Änderungen dürfen innerhalb der Version erfolgen.
7. **BESCHLOSSEN:** Teilnehmer mit Zugang und noch nicht begonnen erhalten neueste Version; laufende Teilnahme bleibt standardmäßig bei begonnener Version; Abschlüsse behalten Version.
8. **BESCHLOSSEN:** neue Kursversion entsteht als separater Entwurf; bisher veröffentlichte Version bleibt verfügbar; ausdrückliche Veröffentlichung macht neue Version aktuell.
9. **BESCHLOSSEN:** alte Versionen grundsätzlich ohne Zeitlimit abschließbar; Ausnahme nur bei ausdrücklich gesetzter verbindlicher Umstellungsfrist aus fachlichem/sicherheitsrelevantem Grund; Betroffene informieren; Fortschritt nicht still löschen.
10. **BESCHLOSSEN:** jeder Kurs besitzt ausdrückliche Abschlussbedingungen. Automatischer Abschluss nur mit zuverlässigen Nachweisen; alternativ manuelle Bestätigung. Öffnen/Durchblättern reicht nicht.
11. **BESCHLOSSEN:** jeder erforderliche Bestandteil hat konkrete Abschlussbedingung. Erforderliches Material kann Teilnehmer-Selbsterklärung erlauben, klar gekennzeichnet. Wissenstests, praktische Aufgaben, Pflichtkapitel und Materialien brauchen passende Nachweise.
12. **BESCHLOSSEN:** neue Kursversion freiwillig wiederholbar; jeder Versionsabschluss separat dokumentiert. Pflichtwiederqualifizierung ist eigenständig.
13. **BESCHLOSSEN:** Kursabschluss und Prüfungsergebnis getrennt; freiwilliger Test kann nicht bestanden sein, Kurs dennoch abgeschlossen. Prüfung verhindert Abschluss nur bei ausdrücklich verpflichtender Anforderung.
14. **BESCHLOSSEN:** Teilnahme beginnt mit erster bewusst ausgeführter kursbezogener Lernaktivität; bloßes Öffnen/Download zählt nicht.
15. **BESCHLOSSEN:** Inaktivität ändert Status nicht automatisch; letzter tatsächlicher Lernzeitpunkt separat.
16. **BESCHLOSSEN:** Teilnehmer kann Teilnahme freiwillig abbrechen; Fortschritt/History bleiben; spätere Wiederaufnahme möglich, wenn Kurs/Version zugänglich.
17. **BESCHLOSSEN:** Wiederaufnahme setzt bestehende Teilnahme fort; erfüllte Bestandteile bleiben erhalten; kein Neustart bei null.
18. **BESCHLOSSEN:** Admin kann Teilnahme fachlich/organisatorisch begründet beenden; Grund dokumentieren; nicht abgeschlossen; spätere Wiederaufnahme bewusste Admin-Entscheidung. Teilnahmebeendigung und Berechtigungsentzug getrennt.
19. **BESCHLOSSEN:** Berechtigungsverlust entzieht Zugriff, ändert persönlichen Fortschritt/Teilnahmestatus nicht automatisch.
20. **BESCHLOSSEN:** fehlerhafte Kursabschlüsse durch berechtigte Admins korrigierbar; Originalentscheidung bleibt, Zeitpunkt/Person/Grund dokumentiert; korrigierter Status wird angezeigt; Wiederqualifizierung eigenständig.
21. **BESCHLOSSEN:** gemeinsame Teilnahmehistorie. Teilnehmer sehen Kurs/Version, Fortschritt/Status, Beginn/Abschluss, eigene Abbrüche/Wiederaufnahmen. Admins zusätzlich administrative Beendigungen, Verantwortliche, Gründe, Korrekturen und Berechtigungsänderungen. Über Kursdetails, kein neuer Hauptbereich.
22. **BESCHLOSSEN:** Kontolöschung erhält historische Abschlüsse/Teilnahmevorgänge grundsätzlich soweit rechtlich zulässig; historische Identität nachvollziehbar soweit zulässig; Konto verliert Zugriff; personenbezogene Daten nach Lösch-/Aufbewahrungsregeln behandeln.
23. **BESCHLOSSEN:** fehlerhafte Kontozuordnung durch berechtigte Admins korrigierbar; Fortschritte/Abschlüsse neu zuordnen, nicht duplizieren; Originalzuordnung, Zeitpunkt, Person, Grund dokumentieren. Keine normale Übertragung zwischen Personen.
24. **BESCHLOSSEN:** Konflikte/duplizierte Teilnahmen nicht automatisch zusammenführen; Admin prüft; Originaldatensätze und Abschlussnachweise bleiben nachvollziehbar; keine doppelten Abschlüsse/Überschreibung.
25. **BESCHLOSSEN:** mögliche Duplikate erkennen, Admin prüft; keine automatische Auswahl des vermeintlich neueren/besseren Abschlusses; sichere Zusammenführung.
26. **BESCHLOSSEN:** stabile interne IDs für Benutzer, Teilnahmen, Kurse, Kursversionen, Nachweise. Profiländerungen ändern historische Identität nicht. Korrekturen als neue Ereignisse, nicht still überschreiben. Audit: Zeit, verantwortliche Identität, Vorgang, Aktion, Ergebnis, ggf. Grund; keine unnötigen Klicklogs/sensiblen Daten.
27. **BESCHLOSSEN:** gleichzeitige Änderungen mit serverseitiger Aktualitätsprüfung/Version; keine blinde Überschreibung; verständlicher Konflikt; Transaktionen/optimistische Nebenläufigkeitskontrolle.
28. **BESCHLOSSEN:** Datenschutz durch Zweckbindung, Rechtsgrundlage, Datenminimierung, Aufbewahrungsfristen/-kriterien, Löschen oder Anonymisieren nach Frist; Audit nicht als Datenschutzumgehung; keine pauschale unbegrenzte Speicherung.
29. **BESCHLOSSEN:** atomare Transaktionen, Idempotenz und wiederholbare Operationen ohne doppelte Ergebnisse; gespeicherter Zustand muss feststellbar sein.
30. **BESCHLOSSEN:** ein tatsächlicher Kursabschluss kann mehreren Programmen angerechnet werden, sofern die jeweilige Programmversion Kurs und Kursversion anerkennt; keine künstlichen separaten Teilnahmen.
31. **BESCHLOSSEN:** Programm-Anforderungen versionieren. Abgeschlossene Programme bleiben historisch abgeschlossen; neue Anforderungen nicht rückwirkend. Für laufende Teilnahmen ausdrücklich festlegen, ob neue Anforderungen gelten. Pflichtwiederqualifizierung eigenständig.
32. **BESCHLOSSEN:** laufende Programmteilnahmen bleiben standardmäßig bei begonnener Version; kein automatischer Wechsel. Admin kann bewusst umstellen; bestehende Kursabschlüsse übernehmen, wenn gültig; zusätzliche/nicht passende Anforderungen ausweisen; Umstellung protokollieren.
33. **BESCHLOSSEN:** fachlich/sicherheitsrelevant unzureichende Kursabschlüsse werden nicht gelöscht. Berechtigte Verantwortliche können verpflichtende Wiederqualifizierung mit Grund, Person, ggf. Frist anordnen. Originalabschluss und neue Anforderung getrennt; Teilnehmer informieren.
34. **BESCHLOSSEN:** Programmabschluss bei Erfüllung aller ausdrücklich erforderlichen Bedingungen der Programmversion. Empfohlene/optionale Kurse verhindern Abschluss nicht. Abschlussprüfung nur verpflichtend, wenn explizit Voraussetzung. Spätere Wiederqualifizierung getrennt.
35. **BESCHLOSSEN:** Wiederqualifizierung zentral beim Kurs/Qualifikationsnachweis; betroffene Programme berücksichtigen dieselbe Anforderung; keine mehrfachen Wiederholungen; Programmabschluss wird nicht rückwirkend ungültig; offene Anforderungen separat.
36. **BESCHLOSSEN:** historischer Programmabschluss und aktuelle Qualifikationsgültigkeit getrennt. Offene Wiederqualifizierung setzt historischen Abschluss nicht zurück.
37. **BESCHLOSSEN:** Wiederqualifizierungsanforderung definiert Umfang: betroffene Qualifikation/Kursversion/Kompetenz, Teilnehmer/Gruppe, Grund, erforderlicher neuer Nachweis, ggf. Frist. Normale Kursversionsänderung löst keine automatische Wiederqualifizierung aus.
38. **BESCHLOSSEN:** neuer Qualifikationsnachweis zentral dokumentiert und von Programmen referenziert, die ihn anerkennen. Keine doppelten Wiederqualifizierungen; keine Überschreibung alter Kurs-/Programmabschlüsse.

## G. Lernbibliothek, Dokumente, Reader, Notizen

### Kategorienverwaltung
- **BESCHLOSSEN:** Bibliothekskategorien werden nicht als feste Code-Liste vorgegeben. Berechtigte Administratoren und Colonels können Kategorien direkt in der Website erstellen, umbenennen, archivieren und reaktivieren; die Berechtigung folgt dem bestehenden Academy-Verwaltungszugriff.
- **BESCHLOSSEN:** Kategorien besitzen stabile interne IDs. Eine Umbenennung ändert keine Materialreferenz; Änderungen werden mit Revision und verantwortlicher Person nachvollziehbar gespeichert.
- **BESCHLOSSEN:** Kategorien können archiviert und reaktiviert werden. Zusätzlich ist endgültiges Löschen vorgesehen, aber nur solange keine Materialzuordnung auf die Kategorie verweist. Die Löschprüfung erfolgt serverseitig und transaktional; bei bestehenden Verweisen wird das Löschen abgelehnt und Archivierung bleibt möglich. Historische/aktive Referenzen werden niemals durch Löschen einer Kategorie gebrochen.
- **BESCHLOSSEN:** Material-Kategorie-Zuordnungen werden über stabile Kategorie-IDs gespeichert. Materialverwaltung muss die Zuordnungsreferenz atomar beim Erstellen/Ändern eines Materials pflegen; die Löschsperre prüft diese Referenzen serverseitig.
- **KLARSTELLUNG:** Kategorie und Dokumenttyp sind getrennte Metadaten. Die dynamische Kategorienverwaltung legt keine Dokumenttyp-Liste fest und ersetzt sie nicht.

### Dokumentversionierung und Upload
- **BESCHLOSSEN – Dokumentversionierung Option B:** veröffentlichte Kursversionen verweisen auf konkrete Dokumentversionen; neue Bibliotheksfassung ändert ältere Kursreferenz nicht automatisch. Admin entscheidet bewusst über Umstellung; wesentliche Änderungen können neue Kursversion erfordern.
- **BESCHLOSSEN:** Bibliothek zeigt regulär die aktuell veröffentlichte Materialfassung; ältere Fassungen bleiben für historische Kursverweise einsehbar, soweit Zugriffsrechte dies erlauben.
- **BESCHLOSSEN:** Dokumente können extern erstellt (z. B. PDF) und hochgeladen werden; keine verpflichtende PDF-Designvorlage beschlossen. Einheitliche Verwaltungsoberfläche und Metadaten/Freigabe sind als Zielbild vorgesehen, Detailworkflow noch auszuarbeiten.

- **BESCHLOSSEN – Upload-/Veröffentlichungsworkflow Option B (06.11.2026):** Ein neu hochgeladenes Bibliotheksmaterial wird zunächst als Entwurf gespeichert. Der erfolgreiche Upload veröffentlicht das Material nicht. Erst eine bewusste, ausdrücklich ausgelöste Veröffentlichungsaktion macht die Fassung im regulären Bibliotheksbestand für berechtigte Teilnehmer verfügbar.
- **BESCHLOSSEN:** Nicht veröffentlichte Entwürfe sind in der regulären Teilnehmer-Bibliothek, globalen Bibliothekssuche und Teilnehmerempfehlungen nicht sichtbar und dürfen nicht als aktuelle veröffentlichte Kursmaterialfassung verwendet werden.
- **BESCHLOSSEN:** Uploadbestätigung und Veröffentlichungsbestätigung sind getrennte Zustände und Rückmeldungen. Ein erfolgreicher Upload muss ausdrücklich als gespeicherter Entwurf bezeichnet werden.
- **BESCHLOSSEN:** Die Entwurfs-/Veröffentlichungsentscheidung ändert nicht die feste Versionsbindung: veröffentlichte Kursversionen referenzieren konkrete veröffentlichte Dokumentversionen; Entwürfe verändern keine bestehenden Kursreferenzen.
- **BESCHLOSSEN:** Eine spätere inhaltliche Änderung einer veröffentlichten Materialfassung wird als neue Entwurfsfassung vorbereitet und ersetzt die aktuelle Bibliotheksfassung erst nach bewusster Veröffentlichung. Historische Kursreferenzen bleiben unverändert.
- **NICHT BESCHLOSSEN:** Ein Vier-Augen-Prinzip, eine separate Review-Queue oder eine zwingende Freigabe durch eine zweite Person. Option B bedeutet bewusste Veröffentlichung, nicht automatisch mehrstufige Genehmigung.
- **BESCHLOSSEN – Archivierung/Löschung Option A:** veröffentlichte oder bereits in veröffentlichten Kursen verwendete Dokumente regulär archivieren oder fachlich zurückziehen, nicht normal endgültig löschen. Endgültige Löschung ist ein administrativer Ausnahmevorgang unter Berücksichtigung von Datenschutz, Aufbewahrung und historischen Abhängigkeiten. Unveröffentlichte, ungenutzte Entwürfe können einfacher gelöscht werden.
- **BESCHLOSSEN:** fachlich zurückgezogene Dokumente müssen nachvollziehbar gekennzeichnet werden; historische Kursverknüpfungen und Abschlüsse werden nicht automatisch verändert.

### Suche und Filter
- **BESCHLOSSEN – globale Suche Option A:** zentrale Suche durchsucht standardmäßig alle für den Nutzer zugänglichen Bibliotheksdokumente, unabhängig von aktueller Kategorie.
- **BESCHLOSSEN – Sortierung Option A:** Relevanz ist Standardsortierung; alternative Sortierung alphabetisch oder nach tatsächlichem Aktualisierungsdatum.
- **BESCHLOSSEN – Filterdarstellung Option A:** kompakte, zunächst eingeklappte Filter; aktive Filter sichtbar und einzeln entfernbar oder gemeinsam zurücksetzbar; mobile Bedienung platzsparend.
- **VORSCHLAG, nicht beschlossen:** mögliche Filter nach Kategorie, Dokumenttyp, Thema und Aktualisierungszeitraum – nur wenn verlässliche Metadaten vorliegen.
- **VORSCHLAG, nicht beschlossen:** Suchfelder Titel, Materialcode, Kategorien/Themen, Metadaten und Volltext, sofern technisch zuverlässig; OCR für Scans ist gesondert zu prüfen.

### Reader
- **BESCHLOSSEN:** eigener großzügiger Lesebereich; Rückkehr zur vorherigen Bibliotheksposition.
- **BESCHLOSSEN:** Navigation standardmäßig eingeklappt; bei Bedarf linkes Panel mit Inhaltsverzeichnis (sofern auslesbar) und Seitenminiaturen; direkte Seitennavigation.
- **BESCHLOSSEN:** kontinuierliches vertikales Scrollen als Standarddarstellung (im Gespräch am 06.11.2026 bestätigt).
- **BESCHLOSSEN:** Reader-Werkzeuge sollen die Lesefläche nicht unnötig verdrängen; Zoom, Seitenanpassung, Seitennavigation und Dokumentensuche gehören zum geplanten Reader-Funktionsumfang.
- **BESCHLOSSEN:** letzte Leseposition speichern und Wiederaufnahme ermöglichen.
- **BESCHLOSSEN:** persönliche Bookmarks und Notizen integrieren; Reader-Werkzeuge in ein-/ausklappbarem Panel.
- **OFFEN:** genaue visuelle Position/Anordnung von Reader-Toolbar, Navigation, Suche und Werkzeugen wird später im UX-/Designabschnitt festgelegt.

### Notizen und Lesezeichen
- **BESCHLOSSEN – Versionsbindung Option A:** Notizen und Lesezeichen sind an die konkrete Dokumentversion gebunden; keine automatische Übertragung auf neue Fassungen. Ein Hinweis auf Notizen zu älteren Fassungen kann beim Öffnen neuer Fassungen erscheinen.
- **BESCHLOSSEN – Synchronisierung Option A:** automatische serverseitige Speicherung und geräteübergreifende Synchronisierung über Benutzerkonto; sichtbarer Speicherstatus; Speicherfehler erkennbar; keine Zusage vollständiger Offline-Bearbeitung.
- **BESCHLOSSEN – Berechtigungsverlust Option A:** persönliche Notizen und Lesezeichen bleiben beim Nutzer; Quelle als nicht zugänglich kennzeichnen; historische Versions-/Seitenzuordnung erhalten; Notizen gewähren keinen Zugriff auf gesperrte Dokumente.
- **BESCHLOSSEN – Quellenstatus privater Notizen:** Maßgeblich ist der aktuelle Zugriff auf die konkrete versionierte Materialquelle, nicht eine frühere Kursteilnahme. Fehlende Material-/Versionsdatensätze bedeuten „nicht mehr verfügbar“; vorhandene, aber rollenbedingt gesperrte Fassungen bedeuten „nicht zugänglich“. Quellenverweise gewähren keinen Zugriff.
- **BESCHLOSSEN – endgültige Dokumententfernung Option A:** Notizen/Lesezeichen bleiben grundsätzlich erhalten und Quelle wird als nicht verfügbar markiert; gesetzlich erforderliche Löschung personenbezogener Daten hat Vorrang.
- **BESCHLOSSEN:** Notizen privat; keine Sharing-Funktion in erster Ausbaustufe.
- **BESCHLOSSEN:** Notizen sollen Rich Text, Autosave mit Status, Quellen-/Seitenverknüpfungen, Mehrfachquellen, Warnung bei veralteten Seitenreferenzen, Titel-/Volltextsuche und Tags/Themen unterstützen.

## H. Kontextbezogene Meldefunktion

- **BESCHLOSSEN – Integrationsanforderung:** In der Academy soll später ein gut erreichbarer kontextbezogener Meldebutton direkt an geeigneten Inhalten/Modulen erreichbar sein (z. B. unangemessene Inhalte, mögliche Rechtsverstöße, fachliche oder technische Probleme).
- **BESCHLOSSEN:** Button soll den betroffenen Inhalt bzw. Modulkontext automatisch zuordnen.
- **BESCHLOSSEN:** die eigentliche Melde-, Prüfungs-, Bearbeitungs- und Administrationsmechanik wird später als eigener Bereich separat konzipiert. Sie wird nicht in die laufende Lernbibliotheksplanung hineingezogen.
- **OFFEN:** genauer Umfang, Rollen, Verfahrensablauf, Datenschutz, rechtliche Anforderungen und technische Architektur des späteren Meldesystems.

## I. Historische und weitere Beschlüsse
- **BESCHLOSSEN:** Academy-Empfehlungen, Prüfungsfreigaben, Kursstatus und Teilnehmerfortschritt sind getrennt zu behandeln; interne Änderungen vor Ergebnisfreigabe lösen keine Teilnehmerbenachrichtigung oder Folgeempfehlung aus.
- **BESCHLOSSEN:** Examiner und Prüfungsdetails bleiben berechtigungsabhängig; keine vertraulichen Inhalte für andere Rollen offenlegen.
- **BESCHLOSSEN:** vollständige Academy-Planung ist noch nicht abgeschlossen; die oben genannten Beschlüsse sind kein Signal zur sofortigen Implementierung aller Funktionen.


## J. Auslegung der Beschlüsse und verbindliche Detailverweise

Die nachstehenden Klarstellungen sollen verhindern, dass die knappen Einträge oben bei späteren UX- oder Implementierungsarbeiten falsch verkürzt werden. Die Detail-Spezifikationen sind mit diesem Entscheidungsregister zusammen zu lesen.

### J.1 Übergreifendes Portal

- **BESCHLOSSEN:** Das Zielbild ist ein professionelles Einsatz- und Verwaltungsportal, kein generisches Admin-Dashboard und kein dekoratives Command-Center. „Ruhig“ bedeutet nicht, fachlich notwendige Informationen zu verstecken; es bedeutet, sie nach Rolle, Aufgabe und Kontext zu ordnen.
- **BESCHLOSSEN:** Die Oberfläche darf bestehende Funktionen nicht verlieren, nur weil ein Element redundant aussieht. Zuerst muss nachgewiesen werden, dass dieselbe Funktion an anderer Stelle vollständig und verständlich erhalten bleibt.
- **BESCHLOSSEN:** Mobile UX ist ein eigenständiger Nutzungskontext. Eine Desktopnavigation wird nicht einfach verkleinert oder horizontal zusammengedrängt.
- **BESCHLOSSEN:** Technische Bestandsprüfungen sind zunächst read-only. Technische Möglichkeiten begründen keine neue fachliche Funktion.
- **BESCHLOSSEN:** Ein unabhängiger Claude-Review darf Entscheidungen herausfordern, aber nicht selbst ändern. Alternativen und Auswirkungen werden dokumentiert; die Entscheidung liegt beim Projektinhaber.
- **BESCHLOSSEN:** Jeder neue UX-Vorschlag benötigt aktuelle Recherche, Quellen und eine Begründung anhand des konkreten RCPD-Ablaufs.
- **BESCHLOSSEN:** Ein Merge nach `main` kann wegen Render-Autodeployment eine Live-Veröffentlichung auslösen. Branch, Merge und Deployment bleiben deshalb getrennte und ausdrücklich kontrollierte Schritte.

### J.2 Verbindliche Bedeutungsunterschiede in der Academy

Die folgenden Begriffe dürfen nicht als Synonyme behandelt werden:

| Begriff A | Begriff B | Verbindliche Abgrenzung |
|---|---|---|
| Kurs veröffentlicht | Kurs verfügbar | Veröffentlichungsstand und Verfügbarkeit sind getrennte Ebenen |
| Kurs verfügbar | Nutzer hat begonnen | Verfügbarkeit ist keine Teilnahme |
| Kurs geöffnet | Kurs begonnen | Erst bewusste Lernaktivität beginnt Teilnahme |
| Material geöffnet | Material verstanden/abgeschlossen | Öffnen ist kein Verständnis- oder Abschlussnachweis |
| Kursabschluss | Prüfungsergebnis | Ein Kursabschluss und ein freigegebenes Prüfungsergebnis sind unterschiedliche Vorgänge |
| historischer Abschluss | aktuelle Qualifikationsgültigkeit | Wiederqualifizierung setzt historischen Abschluss nicht zurück |
| interne Bewertung | veröffentlichtes Ergebnis | Teilnehmer sehen ausschließlich ausdrücklich freigegebene Fassungen |
| Claim öffnen | Claim übernehmen | Öffnen des Vorgangs beansprucht ihn nicht |
| gespeicherter Draft | endgültig abgeschlossene Bewertung | Drafts bleiben bearbeitbar; Abschluss benötigt bewusste Finalisierung |
| Ergebnis korrigiert | korrigiertes Ergebnis veröffentlicht | Korrektur bleibt intern, bis eine neue manuelle Freigabe erfolgt |
| Berechtigungsverlust | Löschung persönlicher Historie | Zugriff entfällt, Historie wird nicht automatisch gelöscht |
| Empfehlung ausblenden | Kurszugriff entfernen | Ausblenden entfernt nur den Empfehlungseintrag aus der persönlichen Ansicht |

### J.3 Konkrete Sonderfälle, die Teil der Beschlüsse sind

- **BESCHLOSSEN:** Ein archivierter Kurs kann von laufenden Teilnehmern grundsätzlich weiter abgeschlossen werden; neue Teilnehmer starten ihn nicht regulär.
- **BESCHLOSSEN:** Ein Teilnehmer, der eine Kursversion bereits begonnen hat, bleibt standardmäßig auf dieser Version, auch wenn eine neuere Version veröffentlicht wird.
- **BESCHLOSSEN:** Ein Programmabschluss bleibt historisch bestehen, auch wenn später eine Wiederqualifizierung erforderlich wird.
- **BESCHLOSSEN:** Eine Kurskorrektur muss die ursprüngliche Entscheidung, den Korrekturzeitpunkt, die handelnde Person und den Grund nachvollziehbar halten.
- **BESCHLOSSEN:** Bei möglichen doppelten Teilnahmen wird nicht automatisch zusammengeführt oder ein vermeintlich besserer Datensatz ausgewählt. Erst Prüfung, dann protokollierte Korrektur.
- **BESCHLOSSEN:** Kursmeldungs-Lesestatus wird einzeln geführt. Das Öffnen eines Kurses oder Menüs markiert nicht alle Meldungen als gelesen.
- **BESCHLOSSEN:** Eine ausgeblendete Empfehlung kehrt nicht nach einem Reload oder einer bloßen Fortschritts-/Versionsänderung zurück.
- **BESCHLOSSEN:** Persönliche Notizen bleiben bei Berechtigungsverlust grundsätzlich erhalten, vermitteln aber keinerlei Zugriff auf die Quelle.
- **BESCHLOSSEN:** Bei Reader-Navigation bleibt die Navigation zunächst eingeklappt; das Inhaltsverzeichnis wird nur angezeigt, wenn es auslesbar ist. Seitenminiaturen und direkte Seitennavigation bleiben.
- **BESCHLOSSEN:** Bei Disconnect im Examiner wird der Claim maximal 30 Minuten gehalten; nach Wiederverbindung ist ein neuer Claim erforderlich, sofern der Vorgang nicht anderweitig vergeben wurde.
- **BESCHLOSSEN:** Während einer Claim-Warnphase pausiert ein Disconnect den Warnungstimer, nicht aber die maximale 30-Minuten-Haltezeit des Disconnect-Falls.
- **BESCHLOSSEN:** Wenn ein Claim verloren geht, wird die Schreibberechtigung sofort entzogen. Gespeicherte Arbeit bleibt, ungespeicherte Änderungen werden nicht automatisch gesichert.
- **BESCHLOSSEN:** Eine Revision erzeugt keinen neuen Prüfungsversuch. Sie kehrt als eigener Revision-Vorgang in die gemeinsame Arbeitsliste zurück.
- **BESCHLOSSEN:** Nach einer veröffentlichten Ergebnis-Korrektur bleibt die bisherige Veröffentlichung sichtbar, bis eine neue Fassung manuell freigegeben ist.
- **BESCHLOSSEN:** Ein interner Korrekturstand löst keine Teilnehmerbenachrichtigung und keine Folgeempfehlung aus.
- **BESCHLOSSEN:** Teilnehmer erhalten im Examiner-/Ergebniskontext ausschließlich freigegebene Ergebnisse und Feedback; andere Prüfer erhalten nur die für ihre Berechtigung vorgesehenen Informationen.

### J.4 Ausführliche Spezifikationen als verbindliche Auslegung

- Für globale UX-Grundsätze, Modulkommentare, Navigations- und Auditregeln gilt `PORTAL-REDESIGN-DETAILS.md`.
- Für Academy, Kurs- und Programmlebenszyklen, Materialversionen, Notizen, Prüfungen, Examiner, Korrekturen und Freigaben gilt `ACADEMY-DETAILED-SPECIFICATION.md`.
- Für die Rekonstruktionsgrenzen gilt `RECONSTRUCTION-NOTES.md`.

Wenn eine Detail-Spezifikation eine Entscheidung als offen markiert, darf sie nicht durch eine allgemeine Formulierung an anderer Stelle als beschlossen interpretiert werden. Bei einem echten Widerspruch gilt die ausdrücklich bestätigte spätere Entscheidung des Projektinhabers; der Widerspruch muss dokumentiert und aufgelöst werden.

- **BESCHLOSSEN – Veröffentlichungsberechtigung Option A (06.11.2026):** Dieselbe Person, die einen Entwurf mit entsprechender bestehender Berechtigung angelegt oder bearbeitet hat, darf ihn selbst bewusst veröffentlichen. Kein verpflichtendes Vier-Augen-Prinzip und keine zweite freigebende Person. Admin und Colonel behalten ihre bestehende übergreifende Verwaltungsbefugnis; weitere Rollen handeln nur innerhalb ihrer zugewiesenen Berechtigungen. Veröffentlichung bleibt eine separate, ausdrücklich ausgelöste Aktion.

- **BESCHLOSSEN – Pflichtmetadaten Option A (06.11.2026):** Verpflichtend sind Titel, Kategorie und Dokumenttyp. Beschreibung und erforderlicher Rang sind optional. Materialcode wird automatisch und eindeutig vom System vergeben; konkrete Dokumentfassungen erhalten zusätzlich eine eigene Versionskennung. Geschätzte Lesezeit soll möglichst automatisch abgeleitet werden, ist bei fehlender verlässlicher Berechnung optional bzw. kann entfallen. Keine umfangreichen manuellen Pflichtangaben.

- **BESCHLOSSEN am 06.11.2026 – Kategorien/Dokumenttypen Option A:** Zwei getrennte, kontrollierte Auswahllisten. Kategorie = fachliches Thema; Dokumenttyp = Art/Funktion des Dokuments. Beide werden unabhängig gespeichert und für Suche/Filter verwendet. Je Material eine Hauptkategorie und ein Dokumenttyp; Mehrfach-Tags sind dadurch nicht mitbeschlossen. Konkrete Werte werden anhand des tatsächlichen Materials festgelegt. Bestehende Werte im Code sind gemischte Bestandswerte und keine ungeprüft übernehmbare Ziel-Taxonomie.

- **BESCHLOSSEN am 06.11.2026 – Lernbibliothek-Berechtigungen Option B:** Kursverantwortliche mit bestehender passender Zuständigkeit dürfen Entwürfe anlegen/bearbeiten und selbst ausdrücklich veröffentlichen. Zurückziehen und Archivieren veröffentlichter Materialien bleiben Admin und Colonel vorbehalten. Die Kurszuständigkeit muss unabhängig vom automatisch generierten Materialcode geprüft werden. Server-seitige Durchsetzung und Auditierung sind erforderlich.


- **BESCHLOSSEN am 06.11.2026 – PDF-Uploadgrenze:** maximal 15 MB pro ursprünglicher PDF-Datei (Rohdatei, vor Base64-Kodierung). Serverseitige Prüfung ist verbindlich; Request-Limit und Hosting müssen Base64-/JSON-Overhead berücksichtigen.


- **BESCHLOSSEN am 06.11.2026 – PDF-Sicherheitsprüfung Option A:** echte PDF-Signatur und strukturelle Parserprüfung; leere, beschädigte, abgeschnittene, unlesbare sowie passwortgeschützte/verschlüsselte PDFs ablehnen. Malwareprüfung muss vor Veröffentlichung erfolgreich sein. Während Prüfung bleibt die Datei privat; bei negativem Ergebnis, Scanner-Ausfall oder technischem Prüfproblem keine Veröffentlichung (Fail-closed). Parser/Scanner benötigen Ressourcenlimits und isolierte Verarbeitung. Konkrete Parser-, Scanner-, Quarantäne- und Hostingarchitektur bleibt technische Prüfarbeit. Keine Implementierungsfreigabe.

- **BESCHLOSSEN am 06.11.2026 – Priorisierung der Materialverwaltung:** Die erste Ausbaustufe der neuen Materialverwaltung unterstützt Text-/Markdown-Inhalte und codebasierte Inhalte. PDF-Upload, separate PDF-Speicherung, PDF-Parser, Malwareprüfung und die dafür erforderliche Infrastruktur werden bis zu einer späteren Ausbaustufe zurückgestellt. In dieser Phase werden dafür weder ein separates privates GitHub-Repository noch neue externe Speicher-/Prüfdienste, Konto-Verknüpfungen oder laufende Zusatzkosten eingerichtet. Das Materialmodell soll später um dateibasierte Formate erweiterbar bleiben, ohne die Master-/Versionsstruktur neu aufzubauen. Bereits beschlossene PDF-Sicherheitsanforderungen bleiben Anforderungen für die spätere Wiederaufnahme und werden nicht aufgehoben.

- **Umsetzungsstand Dokumenttyp-Verwaltung:** Die zentrale Pflege der kontrollierten Dokumenttyp-Liste wird im Branch `feature/academy-managed-document-types` als eigene Verwaltung für Admin und Colonel umgesetzt. Es werden keine vordefinierten Taxonomiewerte eingeführt; die konkreten Werte müssen weiterhin anhand der tatsächlichen Materialien festgelegt bzw. von der berechtigten Verwaltung gepflegt werden.

### Implementierungsstand der Lernbibliothek (06.11.2026)

- PR #59 hat die zentrale dynamische Kategorienverwaltung geliefert und ist gemergt.
- PR #60 hat die zentrale dynamische Dokumenttypenverwaltung geliefert und ist gemergt. Beide kontrollierten Listen bleiben voneinander getrennt und beginnen ohne vorgegebene Werte.
- Draft-PR #61 auf Branch `feature/academy-versioned-text-code-materials` setzt die erste versionierte Materialverwaltung für Markdown und gespeicherten Code um. Er führt keine Codeausführung und keine PDF-/Dateiablage ein.
- Die Materialstruktur trennt Materialstamm, Arbeitsentwurf und unveränderliche veröffentlichte Materialversion. Das Speichern eines Entwurfs veröffentlicht nicht; eine ausdrückliche Veröffentlichung erzeugt einen neuen Snapshot. Kursreferenzen bleiben an konkrete `materialId`-/`materialVersionId`-Paare gebunden.
- Die neue Verwaltung nutzt die bestehende Kurszuständigkeit getrennt vom Materialcode. Kursverantwortliche veröffentlichen im zugewiesenen Bereich selbst; Archivierung bleibt Admin/Colonel vorbehalten. Der Teilnehmer-Reader und die Materialauswahl im Kurseditor sind noch nicht Teil dieses Implementierungsschritts.



## L. Private Notizen – stabile Textanker (10.11.2026)

- **BESCHLOSSEN:** Textanker werden pro konkreter Materialquelle gespeichert, nicht pauschal auf der Notiz. Mehrfachquellen können jeweils eigene Positionen enthalten; Lesezeichen bleiben Einzelquellen.
- **BESCHLOSSEN:** Markdown-Anker verwenden ausgewählten Text, begrenzten Vor-/Nachtextkontext und Überschriftenpfad. Code-Anker verwenden exakten Quelltext, Kontext und ursprüngliche Zeilenposition.
- **BESCHLOSSEN:** Nur eindeutige Treffer werden automatisch angesprungen. Fehlende oder mehrdeutige Treffer werden ausdrücklich gemeldet; keine heuristische automatische Auswahl.
- **BESCHLOSSEN:** Anker bleiben an die exakte Materialversion gebunden; keine automatische Übertragung auf neue Fassungen.
- **BESCHLOSSEN:** Anker vermitteln keinerlei Leserechte und dürfen gesperrte Materialinhalte nicht offenlegen.


## M. Materialaktualisierung und betroffene Kurse (10.11.2026)

- **BESCHLOSSEN:** Wird eine neue veröffentlichte Materialfassung angelegt, werden alle aktuell veröffentlichten und verfügbaren Kursversionen ermittelt, deren fest gebundene Materialreferenzen auf den Materialstamm zeigen.
- **BESCHLOSSEN:** Betroffene Kurse werden unmittelbar bei Veröffentlichung der neuen Materialfassung vorsorglich für neue Teilnahmen gesperrt (Verfügbarkeit „nicht verfügbar“), bis eine berechtigte Person die Auswirkungen geprüft und entschieden hat. Die Sperre muss serverseitig und atomar mit der Materialveröffentlichung erfolgen.
- **BESCHLOSSEN:** Bereits begonnene Teilnahmen behalten den Zugriff auf ihre fest gebundene Kurs- und Materialversion. Die vorsorgliche Sperre verhindert ausschließlich neue Teilnahmen; sie ändert oder löscht keine bestehenden Teilnahmen, Kursversionen, Nachweise oder Abschlüsse.
- **BESCHLOSSEN:** Nach Prüfung kann die berechtigte Kursverwaltung entscheiden, die bisherige Kursversion unverändert wieder verfügbar zu machen oder den Kurs bis zur Veröffentlichung einer angepassten Kursversion nicht verfügbar zu lassen. Eine neue Kursversion muss die beabsichtigten Materialfassungen explizit referenzieren.
- **BESCHLOSSEN:** Dauerhafte Archivierung ist von der vorübergehenden Nichtverfügbarkeit zu unterscheiden. Kurs- und Materialhistorien werden nicht regulär endgültig gelöscht.
- **BESCHLOSSEN:** Betroffene Kursverantwortliche erhalten eine In-App-Benachrichtigung mit Kurs, Material und neuer Versionskennung sowie dem Hinweis, dass eine Prüfung erforderlich ist.
- **BESCHLOSSEN:** Benachrichtigungszustellung muss wiederholbar und idempotent sein; die fachliche Sperre darf nicht davon abhängen, ob die Benachrichtigung erfolgreich zugestellt wurde.
- **BESCHLOSSEN – Sonderfall Programmteilnahme:** Eine bereits bestehende Programmteilnahme berechtigt nicht dazu, einen darin gepinnten, aber noch nicht begonnenen Kurs trotz Materialprüfsperre zu starten. Erst nach ausdrücklicher Freigabe darf diese Kursteilnahme beginnen. Bereits gestartete Kursteilnahmen bleiben unberührt.
- **BESCHLOSSEN – mehrere Aktualisierungen:** Werden während einer offenen Prüfung weitere referenzierte Materialien aktualisiert, werden die zusätzlichen Prüfungen ergänzt; sie überschreiben keine bereits offenen Materialprüfungen. Eine Freigabe darf den Kurs erst wieder aktivieren, wenn keine Prüfung mehr offen ist.
- **BESCHLOSSEN – Offline-Entscheidung:** Wird entschieden, den Kurs bis zu einer Anpassung offline zu lassen, darf die Verfügbarkeit erst nach Veröffentlichung einer neuen Kursversion wieder aktiviert werden. Diese Kursversion muss die betroffenen Materialreferenzen auf die gewünschte aktuelle Fassung aktualisieren oder die betreffenden Materialien entfernen. Die Veröffentlichung allein aktiviert den Kurs nicht automatisch. Weitere Materialaktualisierungen bis zur ausdrücklichen Reaktivierung lösen erneut eine Prüfung aus.
- **BESCHLOSSEN – archivierte Materialien:** Eine neue Kursteilnahme darf auch dann nicht beginnen, wenn eine bereits gepinnte Kursversion auf ein inzwischen archiviertes Material verweist. Betroffene veröffentlichte Kurse werden für neue Starts als nicht verfügbar behandelt; vor einer Reaktivierung muss eine neue Kursversion die archivierte Referenz entfernen. Bereits begonnene Teilnahmen behalten ihren historischen Zugriff.


## Ergebnisfreigabe und Kursabschlussnachweis – Beschluss vom 10.11.2026

- **BESCHLOSSEN:** Eine verpflichtende Kursabschlussprüfung gilt ausschließlich dann als erfüllt, wenn der zugehörige Versuch den Typ `final_exam` hat, endgültig bewertet und bestanden wurde und das Ergebnis offiziell für den Teilnehmer freigegeben ist.
- **BESCHLOSSEN:** Fehlt an einer Prüfung eine explizite Ergebnisfreigabe-Einstellung, gilt als sicherer Standard die **manuelle Erstfreigabe**. Eine Bewertung allein veröffentlicht das Ergebnis nicht.
- **BESCHLOSSEN:** Laufende, abgegebene aber noch nicht abschließend bewertete, fehlgeschlagene und noch nicht freigegebene Versuche erfüllen keinen verpflichtenden Prüfungsnachweis.
- **BESCHLOSSEN:** Nach einer Korrektur eines bereits freigegebenen Ergebnisses muss die bisherige Freigabe kontrolliert aufgehoben werden. Das korrigierte Ergebnis ist bis zur erneuten Freigabe nicht als gültiger Kursabschlussnachweis verwendbar. Frühere Freigaben und Korrekturen bleiben revisionssicher historisch nachvollziehbar.
- **BESCHLOSSEN:** Die Prüfungsteilnehmeransicht zeigt Ergebnisstatus und Bewertungsdetails erst nach offizieller Freigabe. Vorher darf sie nur einen neutralen Abgabe-/Bearbeitungsstatus zeigen.
- **BESCHLOSSEN:** Die Kursabschlussprüfung wird serverseitig anhand des tatsächlich freigegebenen Prüfungsversuchs verifiziert. Clientseitig übermittelte Nachweise oder ein bloßes `status === 'passed'` sind kein gültiger Beleg.


### Umsetzung der dynamischen Prüfungsnachweis-Verifikation (10.11.2026)

- **BESCHLOSSEN:** `required_assessment` verweist mit `targetId` auf die exakte Prüfungs-ID der Abschlussprüfung. Zusätzlich muss der Versuchscode der Kurskennung des betreffenden Academy-Kurses entsprechen.
- **BESCHLOSSEN:** Der Server akzeptiert ausschließlich einen aktuellen Versuch mit `assessmentStage === 'final_exam'`, identischer Prüfungs-ID und unveränderlicher, passender Prüfungsversion, Teilnehmer-UID der Kursteilnahme, Status `passed`, Ergebnisfreigabestatus `released` und einem dazu passenden letzten Freigabeeintrag. Die erreichte Punktzahl muss mindestens der Bestehensgrenze der Version entsprechen.
- **BESCHLOSSEN:** Bei mehreren Versuchen kann jeder aktuell gültig freigegebene bestandene Abschlussprüfungsversuch den Nachweis erfüllen. Ein korrigierter Versuch zählt bis zur erneuten Freigabe nicht; ein erneut freigegebenes, nicht bestandenes Ergebnis zählt nicht. Andere unabhängige gültige bestandene Versuche bleiben eigenständige Nachweise.
- **BESCHLOSSEN:** Es wird kein dauerhaftes Academy-Evidenzduplikat des Prüfungsversuchs angelegt. Der aktuelle Prüfungsstand wird bei Academy-Abschlussprojektionen serverseitig dynamisch aufgelöst. Dadurch werden Korrekturen und erneute Freigaben beim nächsten Lesen wirksam, ohne zwei getrennte Repositories atomar synchronisieren zu müssen.
- **BESCHLOSSEN:** Wenn die Prüfungsdaten nicht verfügbar, ungültig oder nicht eindeutig verifizierbar sind, gilt der Nachweis als nicht erfüllt (fail-closed). Ein Kurs darf dann nicht als abgeschlossen projiziert werden.
- **BESCHLOSSEN:** Die dynamische Projektion gilt für Kursdetail, eigene Kursteilnahmen, administrative Kursteilnahmeübersichten und den Fortschritt erforderlicher Lehrgangskurse. Die Teilnehmeransicht zeigt den Freigabezeitpunkt des verifizierten Prüfungsnachweises.



## Examiner – Revision-Rückgabe und Action Request (11.11.2026)

- **BESCHLOSSEN – Berechtigung Option A:** Jede Person, die aktuell für den konkreten Kurs als Prüfer autorisiert ist, darf eine abgeschlossene Bewertung zur Revision zurückgeben und die dafür vorgesehene Action Request auslösen.
- Die Berechtigung ist kursbezogen und muss serverseitig anhand der aktuellen Kurs-/Prüferberechtigung geprüft werden. Eine sichtbare UI-Aktion allein begründet keine Berechtigung.
- Admins und Colonels behalten ihre bereits festgelegten administrativen Befugnisse; diese Entscheidung schränkt sie nicht ein und führt keine neue Rolle ein.
- Die Revision bleibt eine Weiterbearbeitung desselben Prüfungsversuchs. Gespeicherte Drafts und die vorherige Bewertungshistorie bleiben erhalten. Revisionsgrund und konkretes Feedback zu betroffenen Bewertungsschritten sind verpflichtend.
- Alle für den Kurs autorisierten Prüfer sind bei der anschließenden Bearbeitung gleichberechtigt; der ursprüngliche Prüfer erhält keinen Vorrang, bleibt aber historisch nachvollziehbar.


## Academy – Erneute Empfehlung nach Ausblenden (11.11.2026)

- **BESCHLOSSEN:** Eine manuelle Empfehlung gilt als tatsächlich neu, wenn ein berechtigter Ausbilder oder Administrator sie ausdrücklich erneut erstellt.
- **BESCHLOSSEN:** Eine automatische Empfehlung gilt als tatsächlich neu, wenn ein neuer, eigenständiger fachlicher Auslöser eintritt.
- **BESCHLOSSEN:** Eine bloße Versionsänderung, ein erneutes Laden/Öffnen oder eine Fortschrittsänderung ohne neuen fachlichen Auslöser erzeugt keine neue Empfehlung.
- **BESCHLOSSEN:** Eine ausgeblendete Empfehlung bleibt ansonsten ausgeblendet; nur eine nach diesen Kriterien tatsächlich neu erstellte Empfehlung darf erneut erscheinen.

- **BESCHLOSSEN – Empfehlungshistorie vs. Benachrichtigungshistorie (11.11.2026):** Beide Historien sind fachlich getrennt. Die Empfehlungshistorie dokumentiert Erstellung, Zusammenführung, Ausblenden, Erledigung und Zurücknahme einer Empfehlung einschließlich Herkunft/Grund. Die Benachrichtigungshistorie dokumentiert Versand/Zustellung, Lesezustand und Ziel einer Benachrichtigung. Eine bestehende Empfehlung erzeugt nicht bei jeder Änderung automatisch eine neue Benachrichtigung. Bereits versendete Benachrichtigungen bleiben nachvollziehbar, auch wenn die zugrunde liegende Empfehlung später zurückgenommen wird.

- **BESCHLOSSEN – Nichtverfügbarkeit und Veraltung von Empfehlungen (11.11.2026):** Bei vorübergehender Nichtverfügbarkeit bleibt eine Empfehlung fachlich offen und wird nicht als erledigt behandelt. Sie bleibt historisch erhalten; in der aktiven Übersicht wird sie mit einem verständlichen Hinweis dargestellt, sofern sie dort weiterhin sinnvoll ist. Nach Wiederverfügbarkeit kann sie normal weiterbearbeitet werden. Wird der Inhalt fachlich veraltet oder dauerhaft zurückgezogen, wird die Empfehlung als zurückgenommen markiert und aus der aktiven Übersicht entfernt; Grund und Historie bleiben erhalten. Ein offiziell zugeordneter Nachfolger kann als neue Empfehlung verknüpft werden, jedoch nur mit nachvollziehbarer fachlicher Zuordnung.

- **BESCHLOSSEN – Manuelle Zurücknahme von Empfehlungen (11.11.2026):** Die Person, die eine manuelle Empfehlung erstellt hat, darf diese zurücknehmen; Admins dürfen jede manuelle Empfehlung zurücknehmen. Automatische Empfehlungen werden grundsätzlich anhand ihrer fachlichen Regeln beendet oder zurückgenommen. Admins dürfen automatische Empfehlungen ausnahmsweise manuell zurücknehmen, müssen dabei einen Grund angeben. In allen Fällen verschwindet die Empfehlung aus der aktiven Liste, bleibt aber mit Urheber/Herkunft, Zeitpunkt und Zurücknahmegrund historisch nachvollziehbar. Die Zurücknahme ist vom persönlichen Ausblenden durch den Teilnehmer getrennt.


## Academy UI-Redesign – horizontale Hauptnavigation und Recherchepflicht (11.11.2026)

- **BESCHLOSSEN:** Die fünf Academy-Hauptbereiche werden horizontal direkt unter dem Academy-Kopfbereich navigiert: Übersicht, Kurse, Lernbibliothek, Prüfungen und Meine Notizen.
- **BESCHLOSSEN:** Diese Hauptnavigation besteht aus echten Navigationslinks zu eigenständigen Ansichten. Sie wird nicht als ARIA-Tab-Komponente umgesetzt, da es sich um Seiten-/Bereichsnavigation und nicht um alternative Ansichten desselben Inhalts handelt.
- **BESCHLOSSEN:** Hohe Übersichtlichkeit innerhalb des gesamten Academy-Moduls hat Vorrang. Die globale Portalnavigation wird nicht durch eine redundante zweite Sidebar innerhalb der Academy dupliziert.
- **BESCHLOSSEN:** Jede weitere relevante UI-/UX-Entscheidung wird vor der Empfehlung anhand etablierter professioneller Websites/Designsysteme und einschlägiger UX-/Accessibility-Standards recherchiert. Die Empfehlung nennt konkrete Quellen, übertragbare Muster, Grenzen und die Begründung für den jeweiligen Academy-Arbeitsablauf. Keine unbegründeten Geschmacksentscheidungen.
- **BESCHLOSSEN:** Die fünf Hauptbereiche bleiben gleichberechtigt. Rollen-/Examiner-Unteransichten werden kontextbezogen innerhalb der bestehenden Bereiche geführt und erzeugen keinen zusätzlichen allgemeinen Hauptnavigationspunkt.
- **GESTALTUNGSDETAILS NOCH OFFEN:** exakte visuelle Ausprägung, Abstände, aktive Markierung, Icons, Breakpoints und mobile Darstellung. Diese werden nach Recherche und anhand der bestehenden Portalstruktur festgelegt.
- **RECHERCHEHINWEISE:** USWDS Header Guidance (horizontale Navigation bei überschaubarer Anzahl von Hauptbereichen, kurze Labels, aktuelle Position sichtbar, Tastaturbedienbarkeit); GOV.UK Tabs Guidance (Tabs nicht als Seitennavigation verwenden); NICE Design System (Horizontal Navigation für eigenständige Seiten, Tabs für Ansichten im selben Kontext); ONS Design System (mobile Darstellung ohne mehrzeiliges Umbrechen der Tabs).

### Ergänzung: Academy-Redesign – Einstiegsseite und Vermeidung doppelter Einstiegspunkte (11.11.2026)

- **BESCHLOSSEN:** Die fünf Academy-Hauptbereiche werden horizontal direkt unter dem Academy-Kopfbereich navigiert, sobald sich der Nutzer innerhalb einer Bereichsansicht befindet.
- **BESCHLOSSEN:** Die Academy-Einstiegsseite verwendet stattdessen große, farbige, selbsterklärende Bereichskacheln als jeweils einzige Einstiegspunkte zu den Academy-Bereichen.
- **BESCHLOSSEN:** Auf derselben Ansicht werden dieselben Ziele/Funktionen nicht zusätzlich noch einmal über eine zweite gleichwertige Navigationsform angeboten. Insbesondere gibt es auf der Einstiegsseite nicht gleichzeitig die fünf Bereichskacheln und eine identische horizontale Fünf-Punkte-Navigation.
- **BESCHLOSSEN:** Nach dem Öffnen eines Bereichs übernimmt die horizontale Hauptnavigation den Wechsel zwischen Übersicht, Kurse, Lernbibliothek, Prüfungen und Meine Notizen.
- **BESCHLOSSEN:** Kacheln sollen professionell und institutionell wirken, mit klaren Titeln, passenden Symbolen, harmonierenden Farben und kurzen verständlichen Beschreibungen. Die Oberfläche soll auch für jüngere RP-Nutzer selbsterklärend sein, ohne kindlich oder ausschließlich auf eine Altersgruppe zugeschnitten zu wirken.
- **OFFEN:** Konkrete Kachelgestaltung, Farbpalette, Größe/Anordnung, ergänzende Inhalte der Einstiegsseite und responsive/mobile Darstellung werden nach weiterer Recherche einzeln ausgearbeitet.


## Academy UI-Redesign – Kachel-Inhalte der Einstiegsseite (11.11.2026)

**BESCHLOSSEN:** Jede der fünf großen Bereichskacheln auf der Academy-Einstiegsseite enthält genau drei inhaltliche Bestandteile:
1. Ein gut erkennbares, passendes Symbol.
2. Einen eindeutigen Bereichsnamen.
3. Einen kurzen, selbsterklärenden Satz, der beschreibt, was Nutzer in diesem Bereich finden oder erledigen können.

Die Kachel ist als Ganzes der eindeutige Einstiegspunkt in den jeweiligen Bereich. Keine zusätzlichen Aktionsbuttons, Status-Badges, Kennzahlen oder Fortschrittsbalken innerhalb der Kacheln im Grundentwurf. Zusätzliche Inhalte dürfen nur später nach belegtem Nutzwert und separater Entscheidung ergänzt werden.

Die Gestaltung verwendet große, farbige, harmonierende und klar unterscheidbare Flächen mit professionellem institutionellem Charakter. Sie soll auch für jüngere Nutzer verständlich sein, ohne kindlich oder ausschließlich auf eine Altersgruppe zugeschnitten zu wirken. Konkrete Farbwerte, Symbolstil, Typografie, Kachelmaße und responsive Anordnung bleiben Teil der weiteren Recherche und Gestaltung.

## Academy UI-Redesign – frühere Farbgestaltung der Bereichskacheln (11.11.2026, ÜBERHOLT)

Die damalige Entscheidung für helle Kachelflächen mit kräftigeren Symbolakzenten wurde durch die spätere, ausdrücklich bestätigte Oberflächenrichtung ersetzt. Sie ist nur noch als Entscheidungshistorie relevant.

Weiterhin gültig bleiben:
- Die fünf Kachelfarben dienen ausschließlich der visuellen Bereichsorientierung und erhalten keine Statusbedeutung wie Erfolg, Warnung oder Fehler.
- Die Farbpalette muss harmonisch, klar unterscheidbar und professionell wirken; grelle/neonartige oder spielerisch überladene Gestaltung bleibt ausgeschlossen.
- Konkrete Farbtöne, Kontrastwerte und die Zuordnung der fünf Farben zu den Bereichen bleiben offen und werden im Designsystem geprüft.

Aktueller verbindlicher Stand: siehe „Academy-Einstiegskacheln – aktualisierte Farb- und Oberflächenrichtung“ am Ende dieses Dokuments.


## Academy UI-Redesign – frühere Icon-Festlegungen (11.11.2026, ÜBERHOLT)

Die damalige Festlegung auf klassische Outline-Icons als Kachelvisuals und die spätere Zuordnung konkreter Lucide-Icons wurden durch die Entscheidung für fünf individuelle, ruhige geometrische SVG-Illustrationen ersetzt. Die alten Lucide-Kandidaten werden nicht als Kachelvisuals umgesetzt. Die vorhandene lucide-react-Abhängigkeit bleibt davon unberührt und kann an anderen Stellen der Anwendung weiterhin verwendet werden.

Weiterhin gültig sind die Qualitätsprinzipien: gute Erkennbarkeit, einheitliche Proportionen, kontrollierte Detailtiefe und die unterstützende Rolle gegenüber Titel und Kurzbeschreibung.


### Beschlossene Anordnung und vorläufige Icon-Größen der Academy-Kacheln (11.11.2026)

Für alle fünf Bereichskacheln wird **Variante A: Symbol oben, Titel und Kurzbeschreibung darunter** verwendet.

- Einheitliche vertikale Reihenfolge: Symbol, Titel, Kurzbeschreibung.
- Die Textinhalte werden linksbündig ausgerichtet.
- Das Muster gilt einheitlich für alle fünf Kacheln.
- Vorläufige Richtwerte für die optische Icon-Größe: Desktop 48 px, Tablet 44–48 px, Smartphone 40 px.
- Die Größen sind Startwerte für den späteren visuellen Prototyp und keine endgültigen Design-Tokens. Die endgültige Größe und Strichwirkung werden im responsiven Designsystem anhand der tatsächlichen Kachelabmessungen und Lesbarkeit überprüft.

Die Entscheidung betrifft ausschließlich die visuelle Anordnung. Sie ändert weder Kachel-Inhalte noch Navigation oder Verhalten.


### Beschlossene Abstände der Academy-Einstiegskacheln (11.11.2026)

Gewählt wurde **Variante A – ausgewogen**. Ziel ist eine übersichtliche, cleane und zugleich farbige Bereichsauswahl: Die Kacheln sollen klar unterscheidbar und angenehm luftig wirken, ohne übermäßig groß oder dekorativ zu werden.

Vorläufige Abstandsrichtwerte:
- Innenabstand: Desktop 32 px, Tablet 28 px, Smartphone 24 px.
- Abstand zwischen Symbol und Titel: 20 px.
- Abstand zwischen Titel und Kurzbeschreibung: 8 px.
- Abstand zwischen Kacheln: 24 px.

Die Werte sind Ausgangswerte für den responsiven Prototyp und noch keine endgültigen globalen Design-Tokens. Sie werden später anhand der tatsächlichen Kachelmaße, Textlängen und verfügbaren Bildschirmfläche überprüft. Die fünf Kacheln bleiben gleichwertig und verwenden weiterhin das beschlossene helle, harmonische Farbkonzept.


### Beschlossener Eckenradius der Academy-Einstiegskacheln (11.11.2026)

Für die fünf Academy-Einstiegskacheln wird eine **dezente mittlere Abrundung** verwendet: sichtbar abgerundet, aber deutlich näher an einer sachlich/fast eckigen Form als an stark gerundeten, pillenartigen Karten.

Als vorläufiger Richtwert für den visuellen Prototyp gelten **8–12 px Eckenradius**. Der endgültige Wert wird im responsiven Layout anhand der tatsächlichen Kachelgrößen und der Gesamtwirkung überprüft. Die Abrundung soll den professionellen, cleanen Charakter unterstützen und nicht verspielt wirken.

### Beschlossene Illustrationssprache der Academy-Einstiegskacheln (11.11.2026)

Die zuvor festgehaltene vorläufige Entscheidung für klassische Lucide-Outline-Icons als Kachelvisuals wird durch diese spätere Nutzerentscheidung ersetzt. Für die fünf Academy-Einstiegskacheln wird eine **ruhige, reduzierte, geometrische Illustrationssprache** verwendet.

Verbindliche Gestaltungsregeln:
- Illustrationen mit zurückhaltenden Farbflächen und dezenter Überlagerung; eine leichte räumliche Wirkung ist möglich, aber kein ausgeprägter 3D-Effekt.
- Wenige, bewusst gewählte Details; die Symbole müssen auch in kleiner Darstellung verständlich bleiben.
- Einheitliche Geometrie, Proportionen, Strichstärken (wo Konturen verwendet werden) und Detailtiefe über alle fünf Kacheln.
- Keine glänzenden Oberflächen, künstlich wirkenden Schatten, zufälligen Details, übertriebene Perspektiven oder typische überladene KI-Bildgenerator-Optik.
- Die Illustrationen ergänzen die Benutzeroberfläche und unterstützen die Bereichsorientierung; sie dominieren weder Kacheln noch Inhalte. Titel und Kurzbeschreibung bleiben die primären Informationsträger.
- Die Illustrationen bleiben selbst farblich zurückhaltend und werden harmonisch auf die nun beschlossene kräftigere, satte und einfarbige Kachelfarbpalette abgestimmt. Sie sollen nicht mit deren weißer Lichtreflexion konkurrieren.
- Die fünf Illustrationen werden als zusammengehöriges Set individuell gestaltet und lokal als SVG-Dateien eingebunden. Keine externen Bilddienste zur Laufzeit.

Die bisher beschlossene Platzierung bleibt bestehen: Symbol oben, Titel und Kurzbeschreibung darunter; Titel und Beschreibung linksbündig. Diese Stilentscheidung ersetzt nur die bisherige Festlegung des visuellen Icon-Stils bzw. der Icon-Bibliothek. Sie ändert weder die fünf Bereiche noch Navigation, Kachelstruktur, Abstände oder fachliche Funktionen.

Die konkrete Ausarbeitung und Prüfung im responsiven Prototyp erfolgt später im Rahmen des Designsystems.

## Academy-Einstiegskacheln – aktualisierte Farb- und Oberflächenrichtung (11.11.2026)

Diese spätere Nutzerentscheidung präzisiert und ersetzt widersprechende frühere Aussagen zur Kachelfarbigkeit und Oberflächenwirkung:

- **Farbigkeit:** Die fünf Kacheln erhalten jeweils eine eigene, klar unterscheidbare, kräftigere und satte einfarbige Grundfarbe. Die Farben sollen lebendig und harmonisch aufeinander abgestimmt sein, dabei professionell bleiben. Die frühere Vorgabe, ausschließlich sehr helle/zurückhaltende Kachelflächen zu verwenden, ist insoweit überholt. Konkrete Farbtöne und Kontrastwerte bleiben offen.
- **Einfarbigkeit:** Keine sichtbaren Farbverläufe. Die Grundfläche jeder Kachel bleibt einfarbig.
- **Oberfläche:** Glatt, hochwertig und leicht glänzend – eher wie eine glatte, lackierte/acrylartige Oberfläche als Papier oder Metall. Keine gebürstete Metalloptik, keine erkennbare Metallstruktur und keine Spiegel-/Chromwirkung.
- **Reflexion:** Eine weiche, dezente weiße Lichtreflexion liegt auf der farbigen Oberfläche. Sie soll wie eine sanfte Lichtquelle wirken, nicht wie ein harter Streifen. Die Reflexion erzeugt die Glanzwirkung; sie ist kein Farbverlauf.
- **Tiefe:** Dezente Schattierung und weiche Schatten geben den Kacheln etwas räumliche Tiefe, ohne ausgeprägten 3D- oder Glaseffekt.
- **Interaktion:** Die Kacheln dürfen beim Hover sanft reagieren. Der weiße Reflex kann etwas deutlicher werden; eine minimale Anhebung und ein weicher Schatten sind als Gestaltungsrichtung vorgesehen. Exakte Bewegung, Intensität und Dauer werden erst am Prototyp festgelegt. Tastaturfokus muss unabhängig vom Glanzeffekt klar erkennbar sein; reduzierte Bewegung ist zu berücksichtigen.
- **Touch:** Die Oberfläche muss auch ohne Hover vollständig und hochwertig wirken; Hover darf keine Information oder Funktion voraussetzen.

Die frühere Aussage „keine glänzenden Oberflächen“ in der Illustrationsentscheidung gilt weiterhin ausschließlich für die fünf SVG-Illustrationen selbst: Die Illustrationen sollen nicht künstlich glänzen oder wie 3D-Objekte wirken. Sie schließt ausdrücklich **nicht** die nun beschlossene leichte Glanzwirkung der Kacheloberflächen aus.

Die Kacheln bleiben leicht breitformatig (Breite etwas größer als Höhe), nicht bannerartig. Ein exaktes Seitenverhältnis ist noch nicht beschlossen und wird mit realen Texten und responsiven Ansichten geprüft.

Diese Oberflächenentscheidung verändert weder die fünf Academy-Bereiche noch Kachel-Inhalte, Navigation oder fachliche Funktionen.

## Academy-Einstiegskacheln – bestätigte Farbpalette und Bereichszuordnung (11.11.2026)

Der Nutzer hat den vorgeschlagenen Farbentwurf ausdrücklich bestätigt (Auswahl „proposed“, Zuordnung „same“). Damit sind die folgenden fünf Farbfamilien, ihre Zuordnung und die angegebenen Hex-Werte als **beschlossene Ausgangspalette** festgelegt:

| Academy-Bereich | Farbfamilie | Ausgangsfarbe |
| --- | --- | --- |
| Übersicht | Blau | `#2864D9` |
| Kurse | Türkis | `#087F8C` |
| Lernbibliothek | Violett | `#6841B8` |
| Prüfungen | Beere | `#A33370` |
| Meine Notizen | Grün | `#287A45` |

Die Farben dienen ausschließlich der visuellen Orientierung der fünf Academy-Bereiche. Sie erhalten keine Statusbedeutung (z. B. Erfolg, Warnung oder Fehler). Die fünf Farbfamilien sollen kräftig, satt, lebendig und untereinander harmonisch wirken und den professionellen Charakter des Portals bewahren.

Die Werte sind die bestätigten Ausgangsfarben für den visuellen Prototyp. Eine abschließende technische Freigabe der Design-Tokens erfolgt nach Prüfung der tatsächlichen Kacheloberfläche einschließlich weißer Lichtreflexion, Textpositionen, Kontrast, Fokusdarstellung und responsiver Darstellung. Falls dabei eine kleine Farbwertkorrektur für Lesbarkeit oder Oberflächenwirkung nötig wird, ist sie auf diese Palette zurückzuführen und darf die beschlossene Farbfamilie oder Bereichszuordnung nicht ohne erneute Nutzerentscheidung ändern.

## Academy-SVG-Illustrationen – bestätigtes Farbkonzept (11.11.2026)

Der Nutzer hat **Variante B – neutrale Basis mit Bereichsfarbakzent** ausdrücklich ausgewählt. Diese Entscheidung gilt verbindlich für alle fünf individuellen Academy-SVG-Illustrationen:

- Die Illustrationen verwenden eine gemeinsame, zurückhaltende neutrale Grundpalette für Hauptflächen und wiederkehrende Elemente.
- Jede Illustration erhält einen gezielten, dezenten Akzent aus der zugehörigen Kachelfarbfamilie: Übersicht Blau (`#2864D9`), Kurse Türkis (`#087F8C`), Lernbibliothek Violett (`#6841B8`), Prüfungen Beere (`#A33370`), Meine Notizen Grün (`#287A45`).
- Der Akzent wird gegenüber der kräftigen Kachelgrundfarbe visuell zurückgenommen. Er stellt eine erkennbare Verbindung zum Bereich her, darf aber nicht mit der Kacheloberfläche konkurrieren.
- Dunkle Konturen/Details und neutrale Füllflächen bleiben über alle fünf Illustrationen konsistent.
- Pro Illustration sind höchstens drei bis vier bewusst eingesetzte Farben vorgesehen. Die genaue neutrale Palette und die konkreten Akzentabstufungen werden im visuellen Entwurf festgelegt.
- Die SVGs bleiben geometrisch und reduziert. Die frühere Vorgabe einer vollständig flachen, rein matten Darstellung ohne Schatten/3D wird durch die spätere Entscheidung für eine dezente räumliche Wirkung präzisiert; künstlicher Glanz und überladene 3D-Effekte bleiben ausgeschlossen.

Die Entscheidung betrifft ausschließlich die Farbgestaltung der Illustrationen. Motive, Geometrie, Strichstärke, Proportionen und Detailtiefe müssen weiterhin ein kohärentes Set bilden. Die kräftigen Kachelfarben und ihre Zuordnung bleiben unverändert.

## Academy-SVG-Illustrationen – dezente Überlagerung der Motivbestandteile (11.11.2026)

- Nutzer hat die Gestaltungsrichtung **B – leicht überlagerte Bestandteile** bestätigt: Die räumliche Wirkung entsteht aus den jeweiligen Gegenständen selbst (z. B. versetzte Dashboard-Karten, leicht gestaffelte Buchseiten oder Dokumente), nicht aus zusätzlichen dekorativen Hintergrundformen.
- Die Überlagerung bleibt zurückhaltend: wenige klar erkennbare Ebenen, nur teilweise sichtbare hintere Bestandteile und keine unnötige Detailfülle. Das Hauptmotiv muss auf der kleinen Kachelgröße sofort lesbar bleiben.
- **Harmonisierungsvorbehalt:** Die Illustrationen müssen als Teil der gesamten Academy-Kachel und des späteren Portal-Designsystems funktionieren. Sie dürfen weder mit der kräftigen Kachelgrundfarbe und deren weicher weißer Reflexion noch mit Titel/Beschreibung konkurrieren. Neutrale matte Grundflächen und der bereits beschlossene dezente Bereichsfarbakzent bleiben maßgeblich.
- Keine künstlichen Glanzreflexe, Transparenz-Spielereien oder ausgeprägten 3D-Effekte. Eine dezente, gegenstandsbezogene Schattierung und leichte räumliche Hervorhebung sind nach der späteren Präzisierung ausdrücklich erwünscht; die konkrete Stärke wird am Kachelprototyp geprüft.
- Die Entscheidung legt die gemeinsame Illustrationssprache fest, nicht die endgültige Komposition jedes einzelnen Motivs. Motive und Detailausarbeitung müssen weiterhin als kohärentes Fünfer-Set gestaltet werden.


## Academy-SVG-Illustrationen – frontale Perspektive (11.11.2026)

- Nutzer hat **Variante A – frontale/gerade Ansicht** als gemeinsamen Perspektivstandard für alle fünf Academy-Illustrationen bestätigt.
- Die Motive behalten grundsätzlich eine überwiegend frontale, leicht erfassbare Ausrichtung. Eine dezente räumliche Wirkung durch flache Seitenflächen, leichte Versätze und sanfte Schattierung ist nun ausdrücklich erwünscht; ausgeprägte isometrische oder stark schräge Perspektiven bleiben ausgeschlossen.
- Blickrichtung, geometrische Formsprache, Proportionen und Ausrichtung müssen über alle fünf Illustrationen konsistent bleiben.
- Die frontale Darstellung ist zusammen mit den kräftigen, leicht glänzenden Kacheloberflächen zu beurteilen: Die SVGs bleiben matt und visuell zurückhaltend; die Kacheloberfläche liefert die visuelle Präsenz. Die endgültigen Größen und Abstände werden im realen responsiven Kachelprototyp geprüft.
- Diese Entscheidung ändert weder Motive/Bereichszuordnung noch Farbpalette, Kachelstruktur oder fachliche Funktionen.


## Academy-SVG-Illustrationen – flächenbetonte Gestaltung mit Konturen (11.11.2026)

- Nutzer hat **Variante B – flächenbetonte Gestaltung mit Konturen** als gemeinsamen Standard für alle fünf Academy-Illustrationen bestätigt.
- Die Gegenstände werden überwiegend durch ruhige, matte und neutrale Füllflächen aufgebaut. Dunkle Konturen und gezielte Details definieren die Formen und sichern die Erkennbarkeit.
- Die jeweilige Bereichsfarbe wird nur als zurückhaltender, gezielter Akzent eingesetzt; sie soll die kräftige Kachelgrundfarbe nicht großflächig wiederholen.
- Es gelten weiterhin höchstens drei bis vier bewusst eingesetzte Farben pro Illustration, eine konsistente Konturwirkung und eine einheitliche geometrische Formsprache.
- Die SVGs dürfen eine dezente räumliche Hervorhebung mit sanfter Schattierung und leichten Seitenflächen erhalten. Künstliche Glanzreflexe, Transparenz-Spielereien, starke Schatten und überladene 3D-Effekte bleiben ausgeschlossen. Der Glanz der Kacheloberfläche bleibt davon getrennt.
- Die hellen neutralen Flächen und Konturen müssen auf allen fünf kräftigen Kachelfarben ausreichend klar und harmonisch wirken. Kontrast, Detailgröße und Lesbarkeit werden im echten Kachelprototyp auf Desktop, Tablet und Mobilgeräten geprüft.
- Diese Entscheidung ergänzt die bereits beschlossene frontale Perspektive und dezente gegenstandsbezogene Überlagerung. Sie verändert weder Motive/Bereichszuordnung noch Kachelstruktur oder fachliche Funktionen.


## Academy-SVG-Illustrationen – Detailgrad bestätigt (11.11.2026)

- **BESCHLOSSEN:** Die fünf Illustrationen werden schlicht, klar und auf den ersten Blick gegenständlich erkennbar gestaltet. Sie sollen unmittelbar visualisieren, wofür der jeweilige Academy-Bereich steht.
- **BESCHLOSSEN:** Als gemeinsamer Detailgrad gilt eine reduzierte Gestaltung mit wenigen größeren, gut lesbaren Formen und nur gezielt ausgewählten funktionalen Einzelheiten. Die Motive dürfen weder überladen noch so stark vereinfacht sein, dass ihre Bedeutung unklar oder beliebig wird.
- **BESCHLOSSEN:** Details wie Dokumentzeilen, einzelne Dashboard-Karten oder angedeutete Buchseiten sind zulässig, wenn sie die Erkennbarkeit des jeweiligen Motivs unterstützen. Dekorative Kleinteile ohne inhaltlichen Nutzen werden vermieden.
- **BESCHLOSSEN:** Alle fünf Illustrationen erhalten eine vergleichbare Detailtiefe und müssen auch in der vorgesehenen kleinen Kachelgröße verständlich bleiben. Die konkrete Ausarbeitung wird im responsiven Kachelprototyp geprüft.
- Diese Festlegung ergänzt die bereits beschlossenen neutralen Füllflächen mit klaren Konturen, den dezenten Bereichsfarbakzent, die frontale Perspektive und die sparsame gegenstandsbezogene Überlagerung.


## Academy-SVG-Illustrationen – weichere, stärker reduzierte Formensprache (11.11.2026)

- **BESCHLOSSEN:** Die fünf Illustrationen erhalten eine moderne, weichere und stärker abgerundete Formensprache. Ecken, Übergänge und Grundformen sollen freundlich und ruhig wirken, nicht kantig oder technisch-hart.
- **BESCHLOSSEN:** Die Motive werden weiter vereinfacht und enthalten weniger Einzelheiten als die zuerst gezeigten Motiv-Referenzen. Wenige prägnante Formen und nur notwendige Details sollen die Bedeutung vermitteln.
- **BESCHLOSSEN:** Die fünf Motive müssen sich durch ihre Gegenstände und Silhouetten klar voneinander unterscheiden. Die Bereichsfarben allein dürfen nicht die Unterscheidung tragen.
- **BESCHLOSSEN:** Die Kachel „Übersicht“ bezeichnet ausschließlich die Übersicht innerhalb der Academy. Sie darf weder „Dashboard“ genannt noch als zweites Dashboard des Gesamtportals visualisiert werden. Das konkrete Motiv für „Übersicht“ bleibt offen und muss sich sichtbar von den übrigen vier Motiven unterscheiden.
- Diese Präzisierung verfeinert den bereits beschlossenen reduzierten Detailgrad. Die bisherigen Beispiele mit Dashboard-Karten sind keine verbindliche Motivvorgabe und gelten für die Kachel „Übersicht“ ausdrücklich nicht. Die frontale Perspektive, neutralen Füllflächen, klaren Konturen, dezenten Bereichsfarbakzente und sparsame gegenstandsbezogene Überlagerung bleiben bestehen.

### Academy-SVG-Motiv „Übersicht“ – Wegweiser (11.11.2026)

- **BESCHLOSSEN – Variante A:** Die Illustration der Academy-Kachel „Übersicht“ verwendet ein schlichtes Wegweiser-/Orientierungssymbol.
- Das Wegweiser-Motiv wurde gewählt, um eine eigenständige Silhouette zu schaffen und die Verwechslung mit den bereits ähnlichen Papier-, Buch- und Dokumentmotiven der anderen Bereiche zu vermeiden.
- Die Darstellung bleibt modern, weich und abgerundet sowie bewusst detailarm. Keine Dashboard-Karten, kein Papierblatt und keine dekorativen Zusatzformen.
- Die gemeinsamen SVG-Regeln bleiben unverändert: frontale Perspektive, matte neutrale Füllflächen, klare dunkle Konturen, dezenter blauer Bereichsfarbakzent und sparsame gegenstandsbezogene Überlagerung.

## 2026-11-11 – Motiv der Academy-Kachel „Kurse“ festgelegt

- Nutzer hat Variante B bestätigt: Die Kachel „Kurse“ erhält als eigenständiges Motiv eine reduzierte, weich abgerundete Abschlusskappe.
- Die Abschlusskappe muss gestalterisch exakt derselben Illustrationsfamilie wie der bereits festgelegte Wegweiser für „Übersicht“ angehören. Unterschiedliche Gegenstände sind erwünscht, aber kein Wechsel der Designart.
- Für beide und alle folgenden Motive gelten dieselben weichen Formen, der reduzierte Detailgrad, matte neutrale Füllflächen, klare dunkle Konturen, frontale Perspektive, sparsame gegenstandsbezogene Überlagerung sowie einheitliche Geometrie, Proportionen und Konturwirkung.
- Für „Kurse“ wird ausschließlich ein zurückhaltender türkiser Akzent aus der zugeordneten Bereichsfarbfamilie verwendet. Die Motive müssen auch ohne ihre Kachelfarben anhand ihrer Silhouette unterscheidbar bleiben.
- Ausschließlich Planungsdokumentation auf Draft-PR #155; keine App-Implementierung, Tests, Merge oder Deployment.

## 2026-11-11 – Lernbibliothek-Motiv und Präzisierung der gemeinsamen SVG-Formensprache

- **BESCHLOSSEN – Variante A:** Die Academy-Kachel „Lernbibliothek“ erhält drei klassische Bücher als eigenständiges Motiv, nicht ein Bücherregal. Die Bücher stehen als kleine Gruppe nebeneinander; eines ist leicht schräg geneigt. Die Silhouette grenzt das Motiv von Wegweiser und Abschlusskappe ab.
- **BESCHLOSSEN:** Die drei Bücher werden in derselben Illustrationsfamilie wie der Wegweiser für „Übersicht“ und die Abschlusskappe für „Kurse“ gestaltet. Es entsteht kein eigener Illustrationsstil für die Bibliothek.
- **BESCHLOSSEN – Präzisierung der gemeinsamen Formensprache für alle fünf Motive:** Die bisherige Richtung „weich und stärker abgerundet“ wird konkretisiert: Die Illustrationen sollen schlichter und geometrischer wirken, weniger kurvig und weniger verspielt. Formen dürfen weiterhin leicht abgerundete Ecken und Übergänge haben, sollen aber klarer und ruhiger aufgebaut sein.
- **BESCHLOSSEN:** Die dunklen Konturen werden etwas kräftiger und über alle fünf Illustrationen hinweg einheitlich ausgeführt. Das Konturgewicht muss bei kleiner Kachelgröße klar erkennbar bleiben.
- **BESCHLOSSEN:** Die Motive werden weiter auf wenige prägnante Grundformen und notwendige Erkennungsdetails reduziert. Keine zusätzlichen dekorativen Kurven oder Kleinteile.
- Die Präzisierung gilt rückwirkend gleichermaßen für Wegweiser und Abschlusskappe und verbindlich für Bücherregal sowie die beiden noch offenen Motive. Die bisher beschlossene frontale Perspektive, neutralen matten Füllflächen, dezenten Bereichsfarbakzente, sparsame gegenstandsbezogene Überlagerung und klare Motivunterscheidung bleiben bestehen.
- Exakte Strichstärke, Rundungsradien und Proportionen werden bei der gemeinsamen visuellen Ausarbeitung festgelegt und an allen fünf SVGs konsistent angewendet.
- Ausschließlich Planungsdokumentation auf Draft-PR #155; keine App-Implementierung, Tests, Merge oder Deployment.

## 2026-11-11 – Outline-Stil mit flacher Ebenenwirkung und klassischem Büchermotiv (aktuelle Korrektur)

- **BESCHLOSSEN – aktuelle Stilkorrektur:** Die Academy-SVGs werden nicht als 3D-Motive gestaltet. Die zuvor dokumentierte räumliche 3D-Anmutung mit Seitenflächen und Schattierung ist verworfen.
- Verbindlich ist wieder ein flacher, klarer Outline-Stil: etwas kräftigere, einheitliche dunkle Konturen, wenige einfache geometrische Formen und nur notwendige Erkennungsdetails.
- Die gewünschte leichte Tiefenwirkung entsteht ausschließlich durch sparsame, gegenstandsbezogene Ebenen: zusammengehörige Bestandteile dürfen sich überlagern oder leicht versetzt hintereinanderliegen. Keine räumlichen Seitenflächen, keine 3D-Modellierung und keine 3D-Schattierung.
- Die Motive bleiben detailarm, frontal, ruhig und auf kleine Kachelgrößen gut erkennbar. Neutrale Füllflächen und der jeweils dezente Bereichsfarbakzent bleiben bestehen.
- **BESCHLOSSEN – Lernbibliothek:** Drei klassische Bücher als kleine Gruppe, eines leicht schräg geneigt; keine Regalstruktur. Das Motiv wird ebenfalls im flachen Outline-/Ebenenstil ausgeführt.
- Diese Korrektur gilt rückwirkend für Wegweiser, Abschlusskappe und Büchergruppe sowie für die beiden noch offenen Motive. Sie ersetzt die unmittelbar vorherige Festlegung einer 3D-Anmutung.
- Ausschließlich Planungsdokumentation auf Draft-PR #155 aktualisiert; keine App-Implementierung, Tests, Merge oder Deployment.


## 2026-11-11 – Gemeinsamer Illustrationsstil nach neuer Bildreferenz festgelegt (aktuell)

- **BESCHLOSSEN:** Alle fünf Academy-Kachelmotive verwenden den schlichten, flächigen Piktogrammstil der vom Nutzer bereitgestellten Wegweiser-Referenz. Diese Referenz ist die maßgebliche Stilvorlage für das gesamte Set.
- Die Motive bestehen aus wenigen klaren, geometrischen, überwiegend gefüllten Formen mit einfachen Silhouetten. Die Formen dürfen leicht abgerundet sein, bleiben aber ruhig, sachlich und stark reduziert.
- Eine dezente Ebenenwirkung entsteht durch wenige überlagerte bzw. leicht versetzte Bestandteile des eigentlichen Gegenstands – wie beim Wegweiser durch Pfosten und Richtungsschilder. Keine räumliche Modellierung.
- **Nicht Teil des Zielstils:** ausgeprägte Outline-/Linienillustrationen mit dominanten Konturen, 3D-Motive, Seitenflächen, plastische Schattierung, Glanzreflexe innerhalb der SVGs, starke Schatten, feine Details oder dekorative Zusatzformen.
- Die vorherige Festlegung auf einen kräftigen Outline-Stil wird durch diese Bildreferenz ersetzt. Ebenso bleibt die zwischenzeitliche 3D-Richtung verworfen.
- Alle fünf Motive müssen dieselbe visuelle Einfachheit, Formensprache, Ebenentechnik und Detaildichte besitzen. Die bestehende Motivwahl bleibt: Übersicht – Wegweiser; Kurse – Abschlusskappe; Lernbibliothek – drei klassische Bücher, eines leicht geneigt, ohne Regal. Prüfungen und Meine Notizen bleiben motivisch offen.
- Die Bereichsfarbzuordnung und die Kacheloberflächen bleiben separate Entscheidungen; die Illustrationen werden in diesem neuen Stil darauf abgestimmt.
- Ausschließlich Planungsdokumentation auf Draft-PR #155 aktualisiert; keine App-Implementierung, Tests, Merge oder Deployment.


## 2026-11-11 – Motiv der Academy-Kachel „Prüfungen“ festgelegt

- **BESCHLOSSEN – Variante B:** Die Kachel „Prüfungen“ erhält einen stark reduzierten Prüfungsbogen mit wenigen Antwortfeldern und einem klar markierten Häkchen.
- Das Motiv soll den Prüfungs-/Antwortcharakter unmittelbar vermitteln, aber nicht wie ein weiteres Buch, eine Lernunterlage oder ein Notizblatt wirken. Dafür bleibt die Silhouette kompakt und die Anzahl der Elemente sehr gering.
- Das Motiv wird exakt im gemeinsamen flächigen Piktogrammstil der vom Nutzer bereitgestellten Wegweiser-Referenz ausgeführt: wenige geometrische Füllflächen, einfache Formen und dezente Überlagerung echter Motivbestandteile. Keine dominanten Konturen, 3D-Effekte oder dekorativen Details.
- Der Bereichsakzent bleibt Beere/Pink gemäß der bereits festgelegten Kachelfarbzuordnung. Die Motivwahl legt keine zusätzliche Statusfarbe fest.
- Ausschließlich Planungsdokumentation auf Draft-PR #155; keine App-Implementierung, Tests, Merge oder Deployment.


## 2026-11-11 – Notizmotiv und ausschließliche Kachel-Farbakzente

- **MOTIVRICHTUNG BESCHLOSSEN – Meine Notizen:** Statt eines geschlossenen Buches wird ein klar als Notizblock erkennbares Motiv verfolgt. Vorzugsrichtung: einfacher, oben gebundener Notizblock mit wenigen kurzen Schreiblinien und optional einer dezent versetzten zweiten Ebene. Keine zusätzliche Buch- oder Stiftdekoration. Die genaue zeichnerische Ausführung wird bei der Motivgestaltung geprüft.
- **BESCHLOSSEN – Farbakzente für alle fünf Illustrationen:** Jeder SVG-Farbakzent darf ausschließlich aus der Farbfamilie der zugehörigen Kachel stammen. Der Akzent wird gegenüber der kräftigen Kachelfarbe deutlich zurückgenommen bzw. aufgehellt, muss aber als derselbe Farbton erkennbar bleiben. Keine zusätzlichen, unabhängigen Akzentfarben.
- Neutrale Grund- und Füllflächen bleiben erlaubt. Die Regel betrifft die farbigen Akzente der Illustrationen, nicht die neutrale Grundpalette.
- Zuordnung: Übersicht Blau, Kurse Türkis, Lernbibliothek Violett, Prüfungen Beere/Pink, Meine Notizen Grün. Die bereits festgelegten Kachelgrundfarben bleiben unverändert.
- Der gemeinsame schlichte, flächige Piktogrammstil der Wegweiser-Referenz bleibt verbindlich.
- Ausschließlich Planungsdokumentation auf Draft-PR #155 aktualisiert; keine App-Implementierung, Tests, Merge oder Deployment.


## 2026-11-11 – Einheitliche Größe und visuelle Gewichtung der Academy-Motive

- **BESCHLOSSEN:** Alle fünf Academy-Kachelillustrationen erhalten dieselbe Zeichenflächengröße und dieselben äußeren Abmessungen. Sie werden zentral und mit vergleichbarer optischer Größe sowie visueller Gewichtung gestaltet.
- Kein Motiv darf durch seine Silhouette oder Flächendichte größer bzw. dominanter wirken als die anderen. Unterschiedliche Formen werden innerhalb derselben Gestaltungsgrenzen ausgeglichen.
- **ENTWURFSSTAND, noch nicht endgültig freigegeben:** Erste konkrete Formausarbeitung: Wegweiser mit Mittelpfosten und zwei Richtungsschildern; Abschlusskappe mit klarer symmetrischer Kappenform und kleiner Quaste; drei geschlossene, leicht versetzte Bücher, eines dezent geneigt; kompakter Prüfungsbogen mit wenigen Antwortfeldern und einer Markierung; oben gebundener Notizblock mit wenigen Schreiblinien.
- Bei Prüfungsbogen und Notizblock werden Antwortkästchen/Häkchen klar von einfachen Schreiblinien getrennt, damit die Motive nicht verwechselt werden.
- Die Entwürfe folgen weiterhin dem schlichten flächigen Piktogrammstil der Nutzerreferenz und der festgelegten Kachel-Farbakzentregel. Die endgültige Ausarbeitung wird erst nach gemeinsamer Sichtprüfung festgelegt.
