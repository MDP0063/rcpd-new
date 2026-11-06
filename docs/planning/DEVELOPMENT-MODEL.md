# RCPD – Verbindliches Entwicklungsmodell für das Redesign

**Beschlossen:** 06.11.2026  
**Geltungsbereich:** gesamtes RCPD-Portal einschließlich Academy, gemeinsamer Portalrahmen, UX, Designsystem, technische Umsetzung und Qualitätssicherung.  
**Status:** Verbindliche Arbeitsweise; keine Implementierungsfreigabe.

## 1. Ziel bleibt unverändert

Das Ziel ist weiterhin ein möglichst hochwertiges, fachlich vollständiges, übersichtliches, zugängliches und professionell bedienbares Gesamtdesign. Die abschnittsweise Arbeitsweise ist keine Zieländerung und keine Rechtfertigung für Abstriche.

Ausdrücklich nicht erlaubt:
- Funktionen, Zustände, Rollenanforderungen oder relevante Sonderfälle nur zur Beschleunigung wegzulassen;
- fachlich zusammengehörige Funktionen künstlich zu trennen;
- Recherche, Accessibility, Mobile UX oder Qualitätssicherung als optionale Extras zu behandeln;
- unfertige Zwischenlösungen als endgültiges Design auszugeben;
- Entscheidungen allein wegen eines Zeitplans zu vereinfachen.

Wenn ein Abschnitt mehr Recherche, Konzeption, technische Untersuchung oder Validierung benötigt, wird dieser Aufwand eingeplant. Qualität und vollständiger vereinbarter Umfang haben Vorrang.

## 2. Endproduktorientierte Planung

**Jeder Abschnitt wird von Anfang an als Bestandteil des geplanten endgültigen Gesamtsystems konzipiert.**

Daraus folgt:
- Vor der Detailarbeit werden relevante globale Grundlagen, Abhängigkeiten und spätere Integrationsanforderungen untersucht.
- Gemeinsame Komponenten, Muster, Datenbegriffe und Interaktionen werden zentral geplant, statt sie in jedem Modul neu zu erfinden.
- Konzepte sollen möglichst direkt produktionsnah und dauerhaft nutzbar sein, nicht als Wegwerf-Provisorien.
- Ein Abschnitt darf nicht durch Entscheidungen die spätere Funktionalität oder Gestaltung anderer Module unnötig einschränken.
- Vorhandene, bereits geprüfte Ergebnisse werden wiederverwendet; dieselbe Sache wird nicht ohne sachlichen Grund erneut von Grund auf geplant.
- Notwendige Überarbeitungen aufgrund echter Erkenntnisse aus Prototypen, Tests oder technischen Befunden bleiben ausdrücklich erwünscht. Vermeidbare Doppelarbeit soll verhindert werden, nicht sinnvolle Verbesserung.

## 3. Zwei Planungsebenen

### 3.1 Gesamtplanung

Die Gesamtplanung wird fortlaufend gepflegt und klärt die Grundlagen, die mehrere Abschnitte beeinflussen:
- Zielbild und vollständiger Modul-/Funktionsumfang;
- globale Informationsarchitektur und Navigationsprinzipien;
- Rollen, Berechtigungsgrenzen und übergreifende Aufgaben;
- gemeinsame Status-, Benachrichtigungs-, Such- und Interaktionsmuster;
- Designsystem und responsive Grundprinzipien;
- technische Architektur, gemeinsame Datenverantwortung und Schnittstellen;
- Modulabhängigkeiten, Integrationspunkte und Reihenfolge.

Die Gesamtplanung muss nicht jedes Modul bis ins letzte Detail vorwegnehmen. Sie muss aber so weit geklärt sein, dass einzelne Abschnitte keine widersprüchlichen oder später kostspielig zu ersetzenden Grundlagen schaffen.

### 3.2 Abschnittsplanung

Ein Abschnitt ist eine fachlich zusammenhängende, sinnvoll abgrenzbare Einheit. Er wird so vollständig geplant, dass sein vereinbarter Umfang implementiert und geprüft werden kann. Seine Abhängigkeiten zum Gesamtsystem bleiben sichtbar.

## 4. Wiederholbarer Entwicklungszyklus

Jeder Abschnitt durchläuft – mit angemessener Tiefe und ohne Schritte nur formal abzuhaken – diesen Zyklus:

1. **Bestand und Nutzeraufgaben verstehen:** tatsächlichen Code, Daten, Rollen, Abläufe, Zustände und Probleme untersuchen.
2. **Aktuell recherchieren:** etablierte Websites, professionelle Produkte, Designsysteme, UX-Forschung und maßgebliche Accessibility-Standards für die konkrete Aufgabe untersuchen. Quellen und Übertragbarkeit auf RCPD dokumentieren.
3. **Fachlich konzipieren:** vollständige Funktionen, Regeln, Berechtigungen, Daten, Zustände, Fehlerfälle und Sonderfälle festlegen.
4. **Gesamtsystem-Abgleich:** globale Navigation, Designsystem, gemeinsame Komponenten, andere Module und technische Abhängigkeiten berücksichtigen.
5. **UX und Interaktionen gestalten:** Informationshierarchie, Layout, Bedienwege, Responsive-Verhalten, Tastatur- und Screenreader-Verhalten ausarbeiten.
6. **Prototypisch validieren:** realistische Aufgaben und Nutzerwege anhand zusammenhängender Oberflächen prüfen; Probleme beheben und betroffene Entscheidungen nachvollziehbar aktualisieren.
7. **Technische Machbarkeit prüfen:** vorhandene Architektur, APIs, Datenmodelle, Berechtigungen und Tests gegen das Zielkonzept abgleichen. Notwendige technische Erweiterungen gesondert begründen und freigeben lassen.
8. **Implementieren:** den vereinbarten vollständigen Umfang auf einem separaten Branch umsetzen; gemeinsame Bausteine wiederverwenden.
9. **Qualitätssichern:** Funktion, Berechtigungen, Datenintegrität, Fehlerzustände, Accessibility, mobile Bedienung und Modulübergänge tatsächlich testen.
10. **Abschließen und lernen:** Ergebnis, Prüfungen, offene Restpunkte und übergreifende Erkenntnisse dokumentieren und in die Gesamtplanung zurückführen.

Planung und Umsetzung laufen somit in sinnvollen Abschnitten iterativ zusammen. Es gibt keine pauschale Regel, dass das gesamte Portal erst vollständig konzipiert sein muss, bevor irgendein Abschnitt umgesetzt werden darf.

## 5. Qualitäts-Gate vor Implementierung

Ein Abschnitt darf erst implementiert werden, wenn – soweit für seinen Umfang relevant – folgende Punkte belastbar geklärt sind:
- vollständiger fachlicher Umfang und Nutzeraufgaben;
- Rollen, Berechtigungen und Datenzugriff;
- Abhängigkeiten und Einordnung in die globale Informationsarchitektur;
- aktuelle Recherche mit Quellen und RCPD-spezifischer Begründung;
- Informationshierarchie, Navigation und Interaktionen;
- Desktop-, Mobile- und Accessibility-Anforderungen;
- relevante Lade-, Leer-, Fehler-, Erfolgs-, Sperr- und Sonderzustände;
- Einbindung in das gemeinsame Designsystem;
- Prototyp oder anderweitig nachvollziehbare UX-Validierung;
- technische Machbarkeit, Datenintegrität und erforderliche Architekturänderungen;
- klare Abnahmekriterien und tatsächlicher Testumfang.

Ein Gate ist keine Checklistenbürokratie: Die Nachweise müssen zum konkreten Abschnitt passen. Ein nicht relevanter Punkt wird begründet als nicht anwendbar markiert, nicht stillschweigend ignoriert.

## 6. Umgang mit Entscheidungen und Änderungen

- Verbindliche Beschlüsse bleiben verbindlich, bis der Projektinhaber sie ausdrücklich ändert.
- Vorschläge, Prüfhypothesen, technische Befunde und offene Fragen bleiben klar von Beschlüssen getrennt.
- Neue Erkenntnisse aus Prototypen oder Tests dürfen eine Überprüfung auslösen; sie ersetzen keine Entscheidung stillschweigend.
- Änderungen an übergreifenden Grundlagen werden auf Auswirkungen auf bereits geplante und implementierte Abschnitte geprüft.
- Dokumentation wird fortlaufend und im selben Arbeitsabschnitt gepflegt, damit Entscheidungen nicht nur im Chat verbleiben.
- Bereits vorhandene Dokumentation wird vor jeder Rückfrage und Änderung gelesen; bereits entschiedene Fragen werden nicht ohne konkreten Grund erneut geöffnet.

## 7. Empfohlene Reihenfolge für RCPD

Die konkrete Reihenfolge wird anhand der tatsächlichen Abhängigkeiten angepasst. Der aktuelle Arbeitsplan lautet:

1. Das neue Entwicklungsmodell und die aktuelle Status-/Branchlage dokumentieren.
2. Die Academy-Planung gezielt abschließen: offene fachliche Bibliothekspunkte, technische Prüffelder und Cross-Module-Abhängigkeiten klären; danach Konsistenzprüfung. Keine unnötige Vorabfestlegung technischer Implementierungsdetails.
3. Parallel bzw. anschließend die übergreifende Bestandsaufnahme und gemeinsame Grundlagen vertiefen: Rollen-/Aufgabenmatrix aus dem Bestand, globale Informationsarchitektur, Navigation, gemeinsame Interaktionsmuster und technische Abhängigkeiten.
4. Designsystem und globalen Portalrahmen auf Grundlage der Audits und realen Modulanforderungen entwickeln.
5. Vollständige modulbezogene UX-Konzepte und Prototypen abschnittsweise entwickeln und validieren. Die Academy kann als erster vollständiger Abschnitt dienen, sofern ihre globalen Abhängigkeiten ausreichend geklärt sind.
6. Abschnitte implementieren, integrieren und qualitätssichern; Erkenntnisse fortlaufend in noch nicht abgeschlossene Planung zurückführen.
7. Abschließende portalweite Integrations- und Qualitätsprüfung.

Die Academy ist bereits weit fortgeschritten, aber nicht automatisch vollständig, nicht automatisch umsetzungsreif und nicht das einzige Redesignziel. Andere Module werden nicht bis zum Abschluss der Academy ignoriert; globale Grundlagen und Abhängigkeiten sind frühzeitig mitzuentwickeln.

## 8. Unveränderte Änderungs- und Freigabegrenzen

- Planung und Dokumentation allein autorisieren keine Anwendungscodeänderung.
- Repository-Änderungen erfolgen auf separaten Branches.
- Keine direkten Änderungen an `main`.
- Kein Merge und kein Produktionsdeployment ohne ausdrückliche Zustimmung des Projektinhabers.
- Technische Erweiterungen, die über den vereinbarten Redesignumfang hinausgehen, werden separat erklärt und freigegeben.

## 9. Erfolgsmaßstab

Erfolg bedeutet nicht, möglichst schnell einen Abschnitt abzuhaken. Erfolg bedeutet, dass jeder Abschnitt fachlich vollständig, visuell und funktional überzeugend, zugänglich, technisch tragfähig und konsistent mit dem endgültigen Portal ist – und dass das Gesamtsystem als Ganzes diese Qualität ebenfalls erreicht.
