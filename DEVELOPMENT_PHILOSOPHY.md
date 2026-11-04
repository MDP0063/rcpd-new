# Entwicklungsphilosophie und Qualitätsgrundsätze

Diese Leitlinie gilt für alle am RCPD-Projekt beteiligten Personen und KI-Werkzeuge. Sie ergänzt die verbindlichen technischen, sicherheitsbezogenen und Git-Regeln aus `AGENTS.md`. Die projektspezifischen Anforderungen und freigegebenen Spezifikationen bleiben maßgeblich.

## 1. Grundprinzip

Ziel ist immer die bestmögliche, sicherste und langfristig zuverlässigste praktikable Lösung.

Sicherheit, Datenintegrität, Zuverlässigkeit und Erweiterbarkeit dürfen niemals zugunsten von Bequemlichkeit, geringerem Arbeitsaufwand oder schnellerer Fertigstellung vernachlässigt werden. Wenn mehrere Lösungen die Anforderungen erfüllen, ist die qualitativ bessere und sicherere Lösung zu bevorzugen – nicht automatisch die bequemste.

## 2. Vorausschauend planen, nicht überplanen

Vor der Implementierung werden die grundlegenden Anforderungen, wesentlichen Architekturentscheidungen und erkennbaren kritischen Risiken geklärt.

Es ist nicht erforderlich, jedes denkbare Szenario, jede theoretische Ausnahme und jeden unwahrscheinlichen Sonderfall vorab vollständig durchzuplanen.

- Kritische Sicherheits-, Berechtigungs- und Datenintegritätsfragen werden vor der Implementierung geklärt.
- Wesentliche Anforderungen, Vertrauensgrenzen und Datenflüsse werden von Anfang an berücksichtigt.
- Nichtkritische Sonderfälle können während der Umsetzung oder im Review behandelt werden, sobald sie konkret relevant werden.
- Theoretische Risiken ohne realistische Auswirkungen rechtfertigen nicht automatisch zusätzliche Architektur oder neue Anforderungen.
- Eine erkennbare Sicherheitslücke oder ein grundlegender Architekturfehler darf nicht mit dem Hinweis auf spätere Optimierung vertagt werden.

## 3. Erweiterbarkeit ohne Overengineering

Heutige Entscheidungen sollen sinnvolle zukünftige Erweiterungen nicht unnötig erschweren oder verhindern.

Eine Funktion muss nicht sofort vollständig konfigurierbar oder universell sein. Die zugrunde liegende Lösung soll aber dort erweiterbar bleiben, wo dies mit angemessenem Aufwand möglich ist.

Erweiterbarkeit bedeutet nicht, vorsorglich jede denkbare Abstraktion, Konfigurationsoption oder Infrastruktur einzubauen. Es wird nur so viel vorbereitet, wie einen konkreten zukünftigen Umbau vermeidet, ohne die heutige Lösung unnötig aufzublähen.

## 4. Entwicklung in zwei aufeinanderfolgenden Schritten

Die Entwicklung erfolgt grundsätzlich in zwei Schritten:

### Schritt 1 – Solides Grundgerüst

Zunächst wird die definierte Kernfunktionalität vollständig, sicher und architektonisch sauber implementiert.

Das Grundgerüst muss die vereinbarten Anforderungen erfüllen und eine zuverlässige Basis für die weitere Entwicklung bilden. Wesentliche Sicherheits- und Qualitätsanforderungen gehören bereits in diesen Schritt; sie sind keine optionale spätere Optimierung.

### Schritt 2 – Gezielte Optimierung und Verbesserung

Sobald das Grundgerüst steht, werden die empfohlenen Verbesserungen und Optimierungen systematisch geprüft und die sinnvollen davon umgesetzt. Diese Verbesserungsphase soll unmittelbar anschließend stattfinden und nicht aus Bequemlichkeit übersprungen oder dauerhaft aufgeschoben werden.

Dabei werden insbesondere berücksichtigt:

- konkrete Qualitäts- und Wartbarkeitsverbesserungen,
- sinnvolle zusätzliche Sicherheitsverstärkungen,
- relevante Fehlerbehandlung und realistische Grenzfälle,
- Verbesserungen der Erweiterbarkeit,
- relevante Performance- und Benutzerfreundlichkeitsoptimierungen.

Nicht jede theoretisch denkbare Verbesserung muss umgesetzt werden. Entscheidend sind tatsächlicher Nutzen, Sicherheitsgewinn und langfristige Produktqualität. Sicherheits- oder Datenintegritätsmängel werden unabhängig vom Zeitpunkt behoben und dürfen nicht als bloße Optimierung behandelt werden.

## 5. Reviews und Verbesserungsvorschläge

Reviews sollen tatsächliche Probleme identifizieren und die Qualität der Implementierung verbessern.

- Echte Sicherheits-, Datenintegritäts- und Funktionsprobleme müssen behoben werden.
- Sinnvolle Verbesserungen sollen berücksichtigt und nach Möglichkeit umgesetzt werden.
- Findings müssen konkret begründet und nach Auswirkung priorisiert werden.
- Vermutungen und theoretische Möglichkeiten sind als solche zu kennzeichnen und nicht ohne realistische Folgen zu kritischen Blockern hochzustufen.
- Unwesentliche Stilfragen und unwahrscheinliche Sonderfälle sollen keine unnötigen Überarbeitungszyklen auslösen.
- Bereits ausreichend gute und sichere Lösungen werden nicht ohne konkreten Grund neu entworfen.
- Abgeschlossene Spezifikationen werden nicht wegen jeder nachträglich entdeckten Verbesserung erneut grundlegend überarbeitet. Notwendige Korrekturen bleiben selbstverständlich möglich.

## 6. Qualitätsmaßstab

Das Ziel ist nicht die schnellstmögliche Fertigstellung, sondern ein hochwertiges, sicheres, zuverlässiges und langfristig wartbares Produkt.

Effiziente Entwicklung bedeutet, unnötigen Aufwand zu vermeiden – niemals notwendige Qualität oder Sicherheit einzusparen.

Im Zweifel gilt: **So einfach wie möglich, so robust wie nötig – und niemals auf Kosten der Sicherheit.**
