## 📝 Beschreibung
<!-- Pflicht: Was wird geändert und warum? Beschreibe das Problem bzw. Ziel in eigenen Worten. -->
[Beschreibung und Hintergrund]

## 🏷️ Release-Kategorie
<!-- Pflicht: Zusätzlich genau ein passendes GitHub-Label setzen: feature, enhancement, fix, documentation, refactor, dependencies oder skip-changelog. -->
- [ ] `feature` / `enhancement` – Neue Funktion oder Erweiterung
- [ ] `fix` – Fehlerbehebung
- [ ] `documentation` / `refactor` / `dependencies` – Wartung, Doku oder technische Bereinigung
- [ ] `skip-changelog` – Soll nicht in den Release Notes erscheinen

## 🛠️ Art der Änderung
<!-- Pflicht: Mindestens eine passende Art auswählen. -->
- [ ] Neuer Feature-Bereich
- [ ] Bugfix / Fehlerbehebung
- [ ] Refactoring / Code-Bereinigung
- [ ] Dokumentation / README
- [ ] Sicherheit / Secrets / Configs
- [ ] Sonstige Änderung

## 📂 Geänderte / Hinzugefügte Komponenten
<!-- Pflicht: Nenne Dateien, Module, Routen oder Bereiche. -->
[Betroffene Komponenten und Dateien]

## 🧪 Testen & Überprüfung
<!-- Pflicht: Nur tatsächlich ausgeführte Prüfungen ankreuzen. Wenn keine Prüfung ausgeführt wurde, muss das unten konkret begründet werden. -->
- [ ] `npm run lint` ohne Fehler
- [ ] `npm run build` ohne Fehler
- [ ] `npm test` ohne Fehler
- [ ] Lokal im Browser / in der App auf Funktionsfähigkeit geprüft
- [ ] Andere Prüfung (unten erläutern)

**Nicht ausgeführt / Einschränkungen und ggf. andere Prüfungen:**
[Ergebnisse, nicht ausgeführte Tests und Gründe – falls alles geprüft wurde: "Keine"]

## 🔒 Sicherheit & Konfiguration
<!-- Pflicht: Die erste Aussage muss bestätigt werden. Weitere Punkte ausfüllen, wenn sie für diese Änderung relevant sind. -->
- [ ] Ich habe den Git-Diff auf Secrets, Passwörter, Tokens und API-Keys geprüft; es sind keine enthalten.
- [ ] Neue oder geänderte API-Routen prüfen Berechtigungen serverseitig.
- [ ] Neue Umgebungsvariablen sind in `.env.example` dokumentiert.
- [ ] Sicherheitsrelevante Auswirkungen wurden beschrieben oder sind nicht betroffen.

## 📷 Screenshots oder Demo
<!-- Bei UI-/Frontend-Änderungen Pflicht. Bei reinen Backend-/Dokumentationsänderungen "Nicht relevant" eintragen. -->
[Screenshots, GIF, Demo-Link oder "Nicht relevant"]

## 💡 Hinweise für Admins / Reviewer
<!-- Optional: Besondere Anmerkungen, benötigte Umgebungsvariablen, Test-Accounts oder Folgeschritte. -->
[Hinweise oder "Keine"]
