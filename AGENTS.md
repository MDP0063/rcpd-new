# Regeln für KI-Agenten (Claude, Antigravity, Google AI Studio u. a.)

Diese Datei ist die zentrale Quelle für technische, sicherheitsbezogene und Git-Regeln. Die Zuständigkeiten und Zusammenarbeit der Projektmitwirkenden stehen ergänzend in `CONTRIBUTOR_ROLES.md`. Die übergreifende Entwicklungsphilosophie steht in `DEVELOPMENT_PHILOSOPHY.md`.

**Vor jeder Projektarbeit zwingend vollständig lesen:**
1. Diese Datei (`AGENTS.md`).
2. `CONTRIBUTOR_ROLES.md`.
3. `DEVELOPMENT_PHILOSOPHY.md`.

Wenn eine dieser Dateien nicht zugänglich ist, weise ausdrücklich darauf hin und bitte um Bereitstellung. Behaupte nicht, unbekannte Anweisungen gelesen oder befolgt zu haben.

Diese Datei ist die einzige Quelle für die hier definierten technischen Regeln. `CLAUDE.md` und `GEMINI.md` verweisen auf diese zentralen Regeln und sollen keine widersprüchlichen Kopien enthalten.

## Projekt in drei Sätzen
Intranet-Portal für eine Polizei-Roleplay-Community (Officer-Training, Akademie, Bewerbungen, Nachrichten). Das Projekt ist in früher Alpha, Änderungen kommen häufig.
Frontend: React 19 + Vite + Tailwind (`src/`). Backend: ein Express-Server in `server.ts`. Er ist der einzige Schreiber und prüft alle Rechte. Gespeichert wird in einer JSON-Datei (`DATA_DIR`, Standard `./data`) oder mit `STORAGE_BACKEND=firestore` in Firestore (`server/firestoreStore.ts`). Der Browser schreibt nie direkt nach Firestore und liest dort nur das Änderungssignal `sync/state`; alle Daten kommen weiter über `/api/`.
Deployment: Render, automatisch bei jedem Push auf `main`. Ein Merge nach `main` geht also live.

## Git (zwingend)
- Nie direkt auf `main` oder `master` committen oder pushen. Kein Force-Push auf gemeinsame Branches.
- Vor jeder Änderung einen eigenen Branch anlegen, z. B. `feature/…`, `fix/…`, `security/…`, `docs/…`, `chore/…`.
- Ein Branch, ein Thema. Keine unabhängigen Änderungen mitnehmen, kein Umformatieren fremder Dateien.
- Danach Branch pushen und einen Pull Request nach `.github/PULL_REQUEST_TEMPLATE.md` öffnen. Den PR nicht selbst mergen.
- Commit-Nachrichten kurz und konkret (was und warum), auf Deutsch oder Englisch.

## Vor jedem Pull Request (zwingend)
1. `npm run lint` (TypeScript-Prüfung) muss ohne Fehler laufen.
2. `npm run build` muss ohne Fehler laufen.
3. `npm test` ausführen, sofern `package.json` ein `test`-Skript hat. Alle Tests müssen bestehen.
4. Schlägt etwas fehl, auf dem Branch beheben, bevor gepusht wird.
5. Im PR nur ankreuzen, was wirklich gelaufen ist. Konntest du etwas nicht ausführen (z. B. kein Netzwerk für `npm install`), schreibe das ausdrücklich in den PR und lass das Kästchen leer. Behaupte nie, dass ein Test oder Build lief, wenn er nicht lief.
6. Neue Logik, die sich ohne Browser prüfen lässt (Auth, Validierung, Berechtigungen), bekommt einen Test.

## Sicherheit (hohe Priorität)
- Dem Client wird nichts geglaubt. Wer eine Anfrage stellt, steht im Sitzungs-Token, nicht in `uid`, `adminUid`, `actorUid` oder ähnlichen Feldern des Requests. Rollen- und Rechteprüfungen laufen immer serverseitig.
- Passwörter nie im Klartext speichern, loggen oder an den Client senden. Nur Hashes.
- Keine Passwörter, Tokens, API-Keys oder Deploy-Hook-URLs im Code, in Beispielen oder in Commits. Alles Geheime kommt aus Umgebungsvariablen. Neue Variablen gehören mit Platzhalter in `.env.example`.
- `.env*` (außer `.env.example`) und `data/` nie committen.
- Neue API-Routen unter `/api/` sind standardmäßig geschützt. Eine öffentliche Route braucht eine Begründung im PR.
- Nutzereingaben auf dem Server prüfen (Typ, Länge, erlaubte Werte). Nutzerinhalt nie als HTML einfügen. Eingebettete interaktive Inhalte bleiben in einem `iframe` mit `sandbox="allow-scripts"` und ohne `allow-same-origin`.
- Änderungen an Anmeldung, Rollen oder Berechtigungen im PR eigens unter "Hinweise für den Admin" aufführen.

## Code
- Neue UI als eigene Komponente in `src/components/`, nicht weiter in `App.tsx` oder `server.ts` anhängen. Beide Dateien sind schon sehr groß.
- Oberflächentexte sind deutsch. Bezeichner im Code bleiben englisch.
- Abhängigkeiten nur hinzufügen, wenn es nötig ist, und im PR begründen.
- Bei dünnen oder widersprüchlichen Vorgaben nachfragen statt raten.
