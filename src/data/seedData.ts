import { TrainingModuleDoc, AcademyExamDoc, ExamQuestionItem } from '../types/portal';

export const DEFAULT_TRAINING_MODULES: Omit<TrainingModuleDoc, 'id' | 'authorUid' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'LD-01: California Penal Code & Peace Officer Authority (PC 830.1 / 835a)',
    code: 'POST-LD-01',
    category: 'California Penal Code',
    minClearance: 1,
    requiredRole: 'applicant',
    embedType: 'document',
    estimatedMinutes: 25,
    externalUrl: 'https://post.ca.gov/regular-basic-course-training-specifications',
    interactiveCode: '',
    contentMarkdown: `### 1. Statutory Authority of California Peace Officers (PC § 830.1)
Jeder zertifizierte Peace Officer im Bundesstaat Kalifornien unterliegt den Bestimmungen der **Commission on Peace Officer Standards and Training (CA POST)**.

#### Kernpunkte für das Whitelist-Verfahren:
* **Reasonable Suspicion (Terry v. Ohio):** Für eine rechtmäßige Detention (Terry Stop / Code 6) müssen spezifische, artikulierbare Fakten vorliegen, die darauf hindeuten, dass eine Straftat begangen wurde, wird oder unmittelbar bevorsteht.
* **Probable Cause (PC § 836):** Für eine Verhaftung (Custodial Arrest) muss eine objektive Wahrscheinlichkeit bestehen, dass die verdächtige Person die Tat begangen hat.
* **Miranda Warning (5th Amendment):** Muss zwingend **vor** einer custodial interrogation (Gewahrsam + befragende Vernehmung) ausgesprochen werden:
  1. *You have the right to remain silent.*
  2. *Anything you say can and will be used against you in a court of law.*
  3. *You have the right to talk to a lawyer and have them present with you while you are being questioned.*
  4. *If you cannot afford to hire a lawyer, one will be appointed to represent you before any questioning if you wish.*

---

### 2. Deadly Force Standard — Assembly Bill 392 (CA PC § 835a)
Seit Inkrafttreten von AB 392 darf tödliche Gewalt (**Lethal Force**) durch Peace Officers in Kalifornien **nur dann** angewendet werden, wenn dies unter der *Totality of the Circumstances* **notwendig (necessary)** ist:
1. Zur Verteidigung gegen eine unmittelbare Gefahr des Todes oder einer schweren Körperverletzung (*imminent threat of death or serious bodily injury*) für den Officer oder Dritte.
2. Zur Festnahme eines fliehenden Tatverdächtigen wegen eines gewalttätigen Verbrechens (*felony involving death or serious bodily injury*), sofern der Officer begründeten Anlass hat, dass die Person bei verzögerter Festnahme weiteren Tod oder schwere Verletzungen verursacht.`
  },
  {
    title: 'LD-15: High-Risk Felony Traffic Stop & Tactical Radio Simulator',
    code: 'POST-LD-15',
    category: 'Tactical Operations',
    minClearance: 2,
    requiredRole: 'cadet',
    embedType: 'interactive_code',
    estimatedMinutes: 35,
    externalUrl: '',
    contentMarkdown: `### High-Risk Traffic Stop (Code 5 / Felony Stop) — Taktisches Trainingsmodul
Dieses Modul kombiniert die offiziellen LAPD/CHP Felony-Stop-Leitlinien mit einem eingebetteten **interaktiven Taktik- & Funk-Simulator**. Cadets ab **Clearance Level 2** müssen die korrekte Fahrzeugpositionierung, 10-Codes und Befehlsabfolge trainieren.`,
    interactiveCode: `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<style>
  body {
    margin: 0;
    padding: 20px;
    background: #090d16;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .title { font-size: 15px; font-weight: 700; color: #f8fafc; letter-spacing: 0.04em; }
  .sub { font-size: 12px; color: #94a3b8; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .panel {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 14px;
  }
  .btn {
    display: block;
    width: 100%;
    text-align: left;
    background: #1e293b;
    color: #f1f5f9;
    border: 1px solid #334155;
    padding: 10px 12px;
    border-radius: 6px;
    margin-bottom: 8px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s;
  }
  .btn:hover { background: #334155; border-color: #f59e0b; }
  .log {
    font-family: monospace;
    font-size: 12px;
    background: #020617;
    border: 1px solid #1e293b;
    padding: 12px;
    height: 190px;
    overflow-y: auto;
    border-radius: 6px;
    line-height: 1.6;
  }
  .ok { color: #34d399; }
  .warn { color: #fbbf24; }
  .err { color: #f87171; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">CA-POST INTERACTIVE TACTICAL CAD SIMULATOR // FELONY STOP</div>
      <div class="sub">Führe die 4 Schritte eines Kalifornischen High-Risk Felony Stops in korrekter Reihenfolge aus</div>
    </div>
    <div id="scoreBadge" style="font-family:monospace;font-size:13px;color:#fbbf24;">STATUS: STANDBY</div>
  </div>
  <div class="grid">
    <div class="panel">
      <div style="font-size:12px;color:#94a3b8;margin-bottom:10px;">VERFÜGBARE TAKTISCHE MASSNAHMEN:</div>
      <button class="btn" onclick="step(1)">1. 10-99 / Code 6 über Funk an SCC Dispatch melden & Backup (10-33) anfordern</button>
      <button class="btn" onclick="step(2)">2. Streifenwagen im 30°-Offset (Tactical V-Formation) mit 15m Abstand & Fernlicht positionieren</button>
      <button class="btn" onclick="step(3)">3. Über PA-Anlage: Fahrer auffordern, Motor abzustellen, Schlüssel rauszuwerfen & Hände sichtbar zu halten</button>
      <button class="btn" onclick="step(4)">4. Einzelnes Rückwärts-Herausrufen zur Cover-Unit & Prone/Kneeling Arrest durch Arrest-Team</button>
      <button class="btn" style="background:#0f172a;color:#94a3b8;text-align:center;margin-top:8px;" onclick="resetSim()">Simulation zurücksetzen</button>
    </div>
    <div class="panel">
      <div style="font-size:12px;color:#94a3b8;margin-bottom:10px;">DISPATCH & TACTICAL TELEMETRY LOG:</div>
      <div id="logBox" class="log">
        [SYSTEM] Felony Vehicle Stop geladen (Kennzeichen: 8XJM912 - Stolen Felony Vehicle PC 10851).<br/>
        [HINT] Wähle die korrekte chronologische Reihenfolge...
      </div>
    </div>
  </div>
  <script>
    let expected = 1;
    function step(n) {
      const log = document.getElementById('logBox');
      const badge = document.getElementById('scoreBadge');
      if (n === expected) {
        log.innerHTML += '<div class="ok">[SCHRITT ' + n + ' KORREKT] Maßnahme gemäß CA-POST LD-15 ausgeführt.</div>';
        expected++;
        if (expected > 4) {
          badge.innerText = 'STATUS: CERTIFIED (100%)';
          badge.style.color = '#34d399';
          log.innerHTML += '<div class="ok"><strong>[ABGESCHLOSSEN]</strong> Alle 4 Phasen fehlerfrei absolviert. Du kannst das Modul nun als erledigt markieren.</div>';
        } else {
          badge.innerText = 'PHASE ' + (expected - 1) + '/4 OK';
        }
      } else {
        log.innerHTML += '<div class="err">[FEHLER] Falsche Reihenfolge! Officer Safety gefährdet. Erwartet wurde Schritt ' + expected + '.</div>';
        badge.innerText = 'SAFETY VIOLATION';
        badge.style.color = '#f87171';
      }
      log.scrollTop = log.scrollHeight;
    }
    function resetSim() {
      expected = 1;
      document.getElementById('logBox').innerHTML = '[SYSTEM] Simulation neu gestartet.<br/>';
      const badge = document.getElementById('scoreBadge');
      badge.innerText = 'STATUS: STANDBY';
      badge.style.color = '#fbbf24';
    }
  </script>
</body>
</html>`
  },
  {
    title: 'LD-33: Field Training Officer (FTO) Daily Observation Report & Supervision',
    code: 'POST-FTO-04',
    category: 'Field Training (FTO)',
    minClearance: 4,
    requiredRole: 'fto',
    embedType: 'document',
    estimatedMinutes: 30,
    externalUrl: 'https://post.ca.gov/field-training-program',
    interactiveCode: '',
    contentMarkdown: `### Vertrauliches FTO & Supervisor Handbuch (Ab Clearance Level 4)
Dieses Dokument ist durch die rollenbasierte Zugriffskontrolle (**RBAC Clearance Level >= 4**) geschützt und ausschließlich für **Field Training Officers (FTO)**, **Watch Commanders** und **Administratoren** sichtbar.

#### Bewertungsmatrix für Probationary Officers (Phase I – IV):
1. **Standardized Evaluation Guidelines (SEGs):** Bewertung auf einer Skala von 1 (Not Acceptable) bis 7 (Superior) gemäß California POST Field Training Program Guide.
2. **Critical Task Failure:**
   * Fehlende Eigensicherung bei Traffic Stops (Positionierung vor der B-Säule ohne Grund).
   * Unrechtmäßige Durchsuchung ohne *Probable Cause*, *Consent* oder *Search Incident to Arrest (SITA)*.
   * Falsche Anwendung des Use-of-Force-Kontinuums (PC § 835a).
3. **Freigabe zur Full Whitelist:** Nach erfolgreichem Abschluss der 10-Codes-Prüfung und der praktischen FTO-Sichtung wird der Status im Admin-Portal von \`probation\` auf \`whitelisted\` gesetzt.`
  }
];

export const DEFAULT_EXAMS: Omit<AcademyExamDoc, 'id' | 'authorUid' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'CA-POST Basic Whitelist & Legal Standards Examination (LD-01)',
    moduleCode: 'POST-LD-01',
    minClearance: 1,
    passingScore: 75,
    timeLimitMinutes: 15,
    examFormat: 'structured_quiz',
    interactiveWidgetCode: '',
    questionsPayload: JSON.stringify([
      {
        id: 'q1',
        question: 'Welcher rechtliche Maßstab ist in Kalifornien mindestens erforderlich, um einen kurzen investigativen Stop (Terry Detention / Code 6) durchzuführen?',
        options: [
          'Proof Beyond a Reasonable Doubt (Zweifelsfreier Nachweis)',
          'Reasonable Suspicion (Konkrete, artikulierbare Verdachtsmomente)',
          'Bauchgefühl des eingesetzten Officers (Intuitive Hunch)',
          'Ein richterlicher Durchsuchungsbeschluss (Search Warrant)'
        ],
        correctIndex: 1,
        explanation: 'Gemäß Terry v. Ohio und CA POST LD-15 reicht Reasonable Suspicion (spezifische, artikulierbare Fakten) für eine vorübergehende Detention aus.'
      },
      {
        id: 'q2',
        question: 'Wann muss die Miranda Warning zwingend vor einer Befragung ausgesprochen werden?',
        options: [
          'Sofort bei jedem regulären Traffic Stop vor der Führerscheinkontrolle',
          'Nur wenn die Person sowohl in Custody (Gewahrsam) ist ALS AUCH einer Interrogation (schuldbezogenen Vernehmung) unterzogen wird',
          'Nur bei Verbrechen mit Schusswaffengebrauch',
          'Erst nach Ankunft im County Jail durch den Watch Commander'
        ],
        correctIndex: 1,
        explanation: 'Die Formel lautet: Custody + Interrogation = Miranda. Bei reinen Kontaktgesprächen oder vor einer Festnahme ist Miranda noch nicht ausgelöst.'
      },
      {
        id: 'q3',
        question: 'Was regelt California Penal Code § 835a (AB 392) bezüglich des Einsatzes tödlicher Gewalt (Lethal Force)?',
        options: [
          'Tödliche Gewalt ist bei jedem fliehenden Ladendieb erlaubt',
          'Warnschüsse in die Luft sind das primäre Einsatzmittel bei Verfolgungsjagden',
          'Tödliche Gewalt darf nur angewendet werden, wenn sie objektiv notwendig (necessary) ist, um eine unmittelbare Gefahr von Tod oder schwerer Körperverletzung abzuwenden',
          'Tödliche Gewalt bedarf immer der vorherigen schriftlichen Freigabe des Bürgermeisters'
        ],
        correctIndex: 2,
        explanation: 'AB 392 hat den Maßstab in Kalifornien verschärft: Tödliche Gewalt muss unter Berücksichtigung aller Umstände objektiv notwendig sein, um Tod oder schwere Körperverletzung abzuwenden.'
      },
      {
        id: 'q4',
        question: 'Welcher Funkcode signalisiert im kalifornischen Polizeifunk „Officer Needs Immediate Help / Emergency“?',
        options: [
          '10-4 / Code 1',
          '11-99 (Officer Needs Help — Emergency)',
          '10-20 (Location)',
          'Code 7 (Meal Break)'
        ],
        correctIndex: 1,
        explanation: '11-99 ist der höchste Notrufcode der California Highway Patrol / LAPD für „Officer Needs Immediate Assistance“.'
      }
    ] satisfies ExamQuestionItem[])
  },
  {
    title: 'Tactical Dispatch & Felony Stop Live Code Evaluation (LD-15)',
    moduleCode: 'POST-LD-15',
    minClearance: 2,
    passingScore: 80,
    timeLimitMinutes: 20,
    examFormat: 'interactive_widget',
    questionsPayload: JSON.stringify([
      {
        id: 'q1',
        question: 'Welche Position nimmt das Primary Unit Fahrzeug bei einem High-Risk Felony Stop ein?',
        options: [
          'Direkt vor dem verdächtigen Fahrzeug quer auf der Fahrbahn (Roadblock)',
          'Ca. 10–15 Meter hinter dem Zielfahrzeug mit leichtem Versatz und eingeschaltetem Take-Down/Fernlicht zur Blendung der Spiegel',
          'Unmittelbar neben der Fahrertür des Verdächtigen',
          'Mindestens 200 Meter entfernt außer Sichtweite'
        ],
        correctIndex: 1,
        explanation: 'Der Abstand von ca. 10–15m mit Lichtblendung schützt die Officers hinter dem Motorblock und nimmt den Insassen die Sicht nach hinten.'
      },
      {
        id: 'q2',
        question: 'Wer gibt während eines High-Risk Felony Stops die verbalen Befehle über das PA-System?',
        options: [
          'Alle anwesenden Officers gleichzeitig, um maximalen Druck aufzubauen',
          'Ausschließlich EINE klar bestimmte Person (in der Regel Primary Officer / IC), um widersprüchliche Kommandos zu verhindern',
          'Nur der Hubschrauberpilot (Air Support)',
          'Der jüngste Cadet am Einsatzort'
        ],
        correctIndex: 1,
        explanation: 'Single Voice Command verhindert Verwirrung beim Verdächtigen und senkt das Risiko von Fehlreaktionen drastisch.'
      }
    ] satisfies ExamQuestionItem[]),
    interactiveWidgetCode: `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<style>
  body { margin:0; padding:16px; background:#090d16; color:#f1f5f9; font-family:monospace; }
  .box { border:1px solid #334155; background:#0f172a; padding:14px; border-radius:8px; }
  .code { color:#fbbf24; font-weight:bold; }
</style>
</head>
<body>
  <div class="box">
    <div><span class="code">SITUATION BRIEFING // CAD INCIDENT #CA-90482</span></div>
    <p style="font-size:13px;line-height:1.5;color:#cbd5e1;">
      Ein schwarzer Bravado Buffalo (Kennzeichen 5LKR881) wurde nach einem bewaffneten Raubüberfall (PC 211) auf dem Del Perro Freeway gestoppt.
      Zwei Insassen befinden sich im Fahrzeug. Beantworte die untenstehenden Prüfungsfragen gemäß CA-POST LD-15 Protokoll.
    </p>
  </div>
</body>
</html>`
  }
];
