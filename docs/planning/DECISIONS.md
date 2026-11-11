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


## Academy – visuelles Einstiegsdesign (11.11.2026)

- **BESCHLOSSEN:** Die Academy-Startansicht zeigt fünf gleichwertige farbige Kacheln als einzige primäre Einstiegspunkte: Übersicht, Kurse, Lernbibliothek, Prüfungen und Meine Notizen.
- **BESCHLOSSEN:** Auf der Einstiegsansicht wird die horizontale Academy-Hauptnavigation nicht zusätzlich angezeigt. Nach dem Öffnen eines Bereichs erscheint die horizontale Hauptnavigation unterhalb des Academy-Headers. Übersicht bleibt ein reguläres Ziel innerhalb dieser Navigation.
- **BESCHLOSSEN:** Jede Kachel enthält genau Illustration, Titel und kurze selbsterklärende Beschreibung. Die ganze Kachel ist der einzige primäre Einstieg; keine zusätzlichen Aktionsbuttons, Status-Badges, Zähler oder Fortschrittsanzeigen im Grundmuster.
- **BESCHLOSSEN:** Alle fünf Illustrationen verwenden eine gemeinsame 128×128-SVG-Zeichenfläche, gleiche sichtbare Größe und optische Gewichtung (Richtwert: etwa 70–78 % sichtbare Motivfläche, motivabhängig optisch zentriert) sowie einen einheitlichen schlichten, flächigen, geometrischen Stil. Keine 3D-Optik, Verläufe, Glanzlichter oder künstlichen Schatten innerhalb der SVGs. Dezente Reflexionen dürfen ausschließlich Teil der farbigen Kacheloberfläche sein.
- **BESCHLOSSEN:** Motive und Farbfamilien: Übersicht – Wegweiser/Blau `#2864D9`; Kurse – Abschlusskappe/Petrol `#087F8C`; Lernbibliothek – exakt drei geschlossene Bücher/Violett `#6841B8`; Prüfungen – Antwortbogen mit genau einem markierten Feld/Beerenton `#A33370`; Meine Notizen – oben gebundener Notizblock mit Schreiblinien/Grün `#287A45`.
- **BESCHLOSSEN:** Die Erkennungsmerkmale der drei dokumentartigen Motive dürfen bei der Vereinfachung nicht verloren gehen: Bücher über Buchkörper/Rücken und Dreiergruppe, Prüfungen über Antwortfelder und ein Häkchen, Notizen über obere Bindung und Schreiblinien.
- **BESCHLOSSEN:** Desktop-Raster 3 Spalten (3+2), Tablet 2 Spalten, Smartphone 1 Spalte.
- **BESCHLOSSEN:** Kacheloberflächen verwenden kräftige, satte einfarbige Bereichsfarben mit glatter, hochwertiger, leicht glänzender Wirkung. Eine weiche weiße Reflexion bleibt im Ruhezustand zurückhaltend und wird beim Hover etwas stärker; dezente weiche Schatten und eine sanfte Bewegung geben Tiefe. Farbverläufe und Metallstruktur sind ausgeschlossen. Der Glanz bleibt auf die Kacheloberfläche beschränkt, nicht auf die SVG-Symbole. Gleiche Kachel-Grundgestaltung und optische Gewichtung; Illustrationen oben, Titel und Beschreibung linksbündig darunter. Richtmaße werden responsiv mit echten Texten validiert.

## 11.11.2026 – Academy-Einstiegsseite: Header, Rücknavigation und Übergänge

- **BESCHLOSSEN:** Die fünf nach PR #156 bestätigten Einstiegskacheln bleiben optisch unverändert. Die manuelle Prüfung bestätigte korrekte Ziele, konsistente responsive Darstellung und Bedienbarkeit.
- **BESCHLOSSEN:** Auf Academy-Unterseiten wird „Academy“ als Breadcrumb-Rücksprung zur Kachel-Startseite angeboten; der aktuelle Hauptbereich wird daneben als aktuelle Breadcrumb-Stufe angezeigt. Kein zusätzlicher Hauptnavigationspunkt und keine zweite Kachel-/Bereichsnavigation.
- **BESCHLOSSEN:** Der Header kombiniert eine dezente Oberzeile „Ausbildungsbereich“, eine größere typografische Überschrift „Academy“, eine kurze Beschreibung und einen kleinen blauen Akzent. Keine große Hintergrundfläche oder Banner.
- **BESCHLOSSEN:** Der Abstand zwischen Header und Inhalt wird leicht vergrößert, passend zur neuen Header-Hierarchie.
- **BESCHLOSSEN:** Kachelaktivierung erhält eine minimale kurze Druckreaktion; der Zielbereich erscheint mit einem dezenten Fade-in und sehr leichter vertikaler Bewegung (Richtwert ca. 180 ms). `prefers-reduced-motion` deaktiviert die Bewegung.

## Academy – Inhalt und Gestaltung der internen Übersicht (11.11.2026)

- **BESCHLOSSEN:** Die interne Academy-Übersicht ist eine Orientierungs- und Erklärseite. Sie ist kein zweites Portal-Dashboard und keine zweite Kurs-/Programmübersicht.
- **BESCHLOSSEN:** Persönliche Teilnahmen, Kursstatus, Programmwahl und Fortschritt bleiben im Kursbereich. Portalweite Aufgaben bleiben auf dem Portal-Dashboard.
- **BESCHLOSSEN:** Die Seite erklärt den Zusammenhang: Lehrgänge können Kurse bündeln; Kurse können unabhängig von Lehrgängen genutzt werden; Lernmaterialien können aus Kursen heraus oder direkt über die Lernbibliothek aufgerufen werden. Dies ist kein zwingend linearer Lernweg.
- **BESCHLOSSEN:** Prüfungen werden als Wissensüberprüfung/Nachweis eingeordnet. Meine Notizen werden als private persönliche Lernhilfe erklärt.
- **BESCHLOSSEN:** Die fünf Bereiche werden auf der internen Übersicht nicht erneut als Kacheln oder zusätzliche Navigationslinks dargestellt. Die horizontale Academy-Navigation bleibt die Navigation.
- **BESCHLOSSEN:** Die Bereichsfarben dürfen in zurückhaltenden Akzenten wiederkehren; keine zweite großflächige Kachelgestaltung.
- **BESCHLOSSEN:** Die Seite soll ohne Vorwissen verständlich sein, auch für jüngere Nutzer, aber professionell und nicht kindlich wirken.
- **BESCHLOSSEN:** Interne Übersicht erhält einen eigenen Seitentitel und den direkten Rücksprung „Zurück zur Academy-Übersicht“ zur Kachelstartseite. Der globale Academy-Header/Breadcrumb wird auf dieser Übersicht nicht wiederholt.
- **UMSETZUNG IN PR #158:** Einführungstext, flexible Beziehung Lehrgang/Kurs/Lernbibliothek, kurze Einordnung von Prüfungen und privaten Notizen sowie Hinweis auf tatsächliche Abschlussbedingungen. Keine dynamischen persönlichen Kennzahlen oder Aufgabenlisten.


## D. Visuelle Gestaltung und gestalterische Verantwortung (11.11.2026)

- **BESCHLOSSEN:** ChatGPT übernimmt die eigenständige Ausarbeitung des visuellen Designsystems und der objektiv begründbaren Gestaltungsdetails für das RCPD-Portal. Die Verantwortung umfasst Recherche, Konsistenz, UX-/Accessibility-Begründung, Prototyping und nachvollziehbare Dokumentation.
- **BESCHLOSSEN – Schutz bestehender Arbeit:** Die gestalterische Freiheit darf frühere Arbeit, bereits getroffene Entscheidungen, implementierte Funktionen, Berechtigungen, Datenlogik oder fertiggestellte Bereiche nicht gefährden, überschreiben oder zunichtemachen. Bestehende Ergebnisse sind Ausgangsbasis und bleiben erhalten, sofern der Projektinhaber keine Änderung ausdrücklich freigibt.
- **BESCHLOSSEN – Subjektive Grundsatzentscheidungen:** Bei nicht objektiv bewertbaren, prägenden Designfragen (z. B. grundlegende visuelle Identität, Stilrichtung, markante Farb-/Formensprache oder größere konzeptionelle Änderungen) wird der Projektinhaber vor der Festlegung erneut gefragt. Die allgemeine gestalterische Freiheit ersetzt diese Abstimmung nicht.
- **BESCHLOSSEN – Eigenständige Detailentscheidungen:** Objektiv begründbare Fragen zu Lesbarkeit, Kontrast, Barrierefreiheit, responsivem Verhalten, Abständen, Fokusführung und konsistenter Komponentenverwendung darf ChatGPT selbstständig entscheiden und begründen.
- **BESCHLOSSEN:** Relevante Änderungen, Beschlüsse, offene Fragen, Plananpassungen und Umsetzungsstände werden weiterhin in den zuständigen Repository-Planungsdokumenten festgehalten.
- **BESCHLOSSEN:** Die Academy darf als erster visueller Abschnitt eine freundlichere, eigenständige Lernplattform-Anmutung erhalten. Das endgültige globale Portaldesign und seine Markenidentität bleiben offen; die Academy-Gestaltung muss später in ein kohärentes Gesamtsystem integrierbar bleiben.
- **BESCHLOSSEN:** Die bereits fertiggestellte fünfteilige Academy-Kachel-Startseite bleibt unverändert. Die fünf Bereiche werden innerhalb der geöffneten Academy über die bereits beschlossene horizontale Hauptnavigation erreicht; interne Seiten duplizieren die fünf Kacheleinstiege nicht.
- **BESCHLOSSEN:** Die am 11.11.2026 bestätigte Grundrichtung für interne Academy-Seiten umfasst eine matte, dezente, begrenzte blaue Wellenform, einen leicht getönten ruhigen Hintergrund, klar gegliederte Flächen und eine gemeinsame Designsprache mit bereichsspezifischen Akzenten. Die konkrete Ausgestaltung wird prototypisch geprüft.
- **OFFEN:** Finale globale Portalidentität, globale Sidebar-/Header-/Navigationsgestaltung, übergreifende Theme-Strategie und weitere subjektive visuelle Grundsatzfragen. Sie werden nicht aus dem Academy-Mockup abgeleitet.
- Details und Quellen: [DESIGN-SYSTEM-CONCEPT.md](./DESIGN-SYSTEM-CONCEPT.md).


## 11.11.2026 – Äußerer Academy-Seitenhintergrund

- **BESCHLOSSEN:** Die variable freie Fläche des Academy-Viewports darf zusätzlich einen eigenen, sehr dezenten Hintergrund erhalten, damit breite Bildschirme nicht wie eine weiße, ungestaltete Umgebung um die Academy-Inhaltsfläche wirken.
- **BESCHLOSSEN:** Dieser äußere Hintergrund unterscheidet sich bewusst von der blauen Wellenform innerhalb der Academy-Fläche: zurückhaltende, großflächige Farbverläufe bzw. diffuse Farbflächen statt einer zweiten Welle oder eines weiteren Motivs.
- **BESCHLOSSEN:** Der Übergang zur bestehenden Academy-Fläche bleibt weich und kontrastarm. Die innere Wellenform, die Inhaltsfläche und ihre bisherige Gestaltung werden nicht ersetzt.
- **GELTUNGSBEREICH:** Nur wenn die Academy geöffnet ist. Die globale Portalhülle und die Hintergründe anderer Portalbereiche bleiben unverändert. Die Academy-Inhaltsbreite bleibt auf dem bisherigen Maß begrenzt; nur der äußere Viewport-Hintergrund nutzt die verfügbare Breite.


## 11.11.2026 – Kursbereich: visuelle Ausarbeitung

- **BESCHLOSSEN:** Der Kursbereich verwendet die gemeinsame Academy-Designsprache und den bereits festgelegten Petrol-Akzent #087F8C als zurückhaltende Bereichsfarbe.
- **BESCHLOSSEN:** Die vorhandene inhaltliche Trennung bleibt sichtbar: Ausbildungsprogramme als eigenständige Karten, alle Kurse als kompakte Liste. Die gemeinsame Suche bleibt übergeordnet.
- **BESCHLOSSEN:** Bestehende Status-, Versions-, Verfügbarkeits- und Fortschrittsinformationen werden ausschließlich aus den vorhandenen Daten angezeigt. Keine künstlichen Kennzahlen, neuen Status oder zusätzlichen Einstiegspunkte.
- **SCHUTZGRENZE:** Die Kachel-Startseite, horizontale Academy-Navigation, Verwaltungsoberfläche, API-/Berechtigungslogik, Datenmodelle und Kurs-/Prüfungsnachweise bleiben von der visuellen Ausarbeitung unberührt.


## 11.11.2026 – Lernbibliothek: visuelle Ausarbeitung

- **BESCHLOSSEN:** Die Lernbibliothek verwendet den festgelegten violetten Bereichsakzent #6841B8 als ruhige, wissensorientierte Bereichsfarbe.
- **BESCHLOSSEN:** Katalog und Reader bleiben klar getrennte Ansichten. Der Reader ersetzt nicht die Bibliotheksübersicht; die Rückkehr zur Bibliothek und die Materialliste bleiben klar erreichbar.
- **BESCHLOSSEN:** Suche, Sortierung und bestehende Filter bleiben an der Bibliotheksübersicht gebündelt. Materialeinträge zeigen weiterhin die vorhandenen Metadaten.
- **SCHUTZGRENZE:** Legacy-/versionierte Materialien, PDF-Bestand, Zugriffsschutz, Versionsbindung, Reader, Notizen, Code-Sandbox und APIs werden funktional nicht verändert.


## 11.11.2026 – Teilnehmer-Prüfungszentrum: visuelle Ausarbeitung

- **BESCHLOSSEN:** Der Bereichsakzent für Prüfungen ist der bereits definierte Beerenton #A33370.
- **BESCHLOSSEN:** Der Prüfungsablauf erhält eine konzentrierte, sachliche Oberfläche mit klarer Trennung zwischen Katalog, aktivem Versuch und Ergebnis.
- **BESCHLOSSEN:** Ergebniszustände behalten ihre eigenen Bedeutungsfarben und werden immer textlich benannt; der Beerenton ersetzt keine Erfolgs-/Warn-/Fehlerstatusfarbe.
- **SCHUTZGRENZE:** Zeitlimit, Autospeicher, Versuchsversion, Abgabe, Bewertung, Freigabe, API und Berechtigungen bleiben unverändert. Legacy-Prüfungsansichten und Examiner-Administration werden separat geprüft.


## 11.11.2026 – Meine Notizen: visuelle Ausarbeitung

- **BESCHLOSSEN:** Der Bereich verwendet den festgelegten grünen Akzent #287A45 und bleibt eine ruhige, persönliche Arbeitsfläche.
- **BESCHLOSSEN:** Die Erklärung zur Privatsphäre bleibt sichtbar. Notizen und Lesezeichen werden mit ihren vorhandenen Quellenbezügen dargestellt.
- **BESCHLOSSEN:** Bearbeiten/Löschen und der Editor bleiben getrennte, eindeutig beschriftete Aktionen. Neue Notizen werden weiterhin im Reader erstellt.
- **SCHUTZGRENZE:** Keine Änderung an Privatheit, Zugriffsschutz, Datenmodell, Sync, Quellenbindung, API oder bestehenden Aktionen.


## 11.11.2026 – Examiner-Bewertungsarbeitsplatz

- **BESCHLOSSEN AUS SPEZIFIKATION ABGELEITET:** Die bereits definierte geteilte Desktop-Arbeitsfläche wird umgesetzt: Bewertung und Antwortinhalt im Hauptbereich, einklappbarer Kontext mit vorhandenen Vorgangsmetadaten daneben.
- **BESCHLOSSEN AUS SPEZIFIKATION ABGELEITET:** Auf Tablet und Smartphone wird die Darstellung einspaltig; das Kontextpanel bleibt semantisch und per Tastatur bedienbar.
- **SCHUTZGRENZE:** Keine neuen Daten, Status, Rechte oder Aktionen. Die Sichtbarkeit vertraulicher Antworten bleibt exakt an die bestehende Claim-Berechtigung gebunden.


## 11.11.2026 – Ergebnisfreigabe und Korrekturarbeitsplatz

- **BESCHLOSSEN AUS BESTEHENDER SPEZIFIKATION ABGELEITET:** Ergebnisfreigaben und Korrekturen werden als getrennte Aufgabenblöcke dargestellt; alte und neue Ergebnisstände sowie die Korrekturbegründung bleiben klar unterscheidbar.
- **BESCHLOSSEN AUS BESTEHENDER SPEZIFIKATION ABGELEITET:** Korrekturhistorie bleibt vollständig sichtbar und nachvollziehbar; Bestanden/Nicht bestanden behalten ihre Statusfarben.
- **SCHUTZGRENZE:** Keine Änderung an Ergebnisfreigabe, erneuter Freigabe, Korrekturberechtigung, Historienfeldern, API oder Teilnehmerprojektion.


## 11.11.2026 – Kurs- und Programmverwaltung

- **BESCHLOSSEN AUS BESTEHENDER SPEZIFIKATION ABGELEITET:** Kurs- und Programmverwaltung bleibt innerhalb des bestehenden Bereichs „Kurse“ und wird nicht zu einem neuen Hauptbereich.
- **BESCHLOSSEN AUS BESTEHENDER SPEZIFIKATION ABGELEITET:** Die Verwaltungsübersicht trennt Kurs- und Programmlisten; Editoren gliedern vorhandene Felder und Zuordnungen nach ihrer fachlichen Aufgabe.
- **SCHUTZGRENZE:** Keine Änderung an Veröffentlichungsworkflow, Versionierung, Status, Validierung, Materialbindungen, Abschlussbedingungen, Berechtigungen oder API.


## 11.11.2026 – Versionierte Materialverwaltung

- **BESCHLOSSEN AUS BESTEHENDER SPEZIFIKATION ABGELEITET:** Materialliste und Editor bleiben getrennte Arbeitszonen; der aktive Materialeintrag wird semantisch als ausgewählt gekennzeichnet.
- **BESCHLOSSEN AUS BESTEHENDER SPEZIFIKATION ABGELEITET:** Metadaten, Zuständigkeit, Kategorie/Dokumenttyp, Zugriffsvoraussetzung und Text-/Code-Inhalt werden klar gegliedert.
- **SCHUTZGRENZE:** Keine Änderung an Veröffentlichungsworkflow, Archivierung, Versionierung, Zugriffsschutz, Validierung, Datenmodell oder PDF-Infrastruktur.


## 11.11.2026 – Bibliotheks-Taxonomieverwaltung

- **BESCHLOSSEN AUS BESTEHENDER SPEZIFIKATION ABGELEITET:** Kategorie- und Dokumenttypverwaltung verwenden dieselbe Grundstruktur aus Formular und Bestandsliste, bleiben aber eigenständige Aufgaben.
- **SCHUTZGRENZE:** Keine neuen Felder, Status, Verwaltungsrechte, Lösch-/Archivierungsregeln oder API-Verhalten.
