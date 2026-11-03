import React from 'react';
import {
  FileSpreadsheet,
  Printer,
  Award,
  Users,
  BookOpen,
  ClipboardCheck
} from 'lucide-react';
import {
  AcademyExamDoc,
  PortalRequestDoc,
  ROLE_HIERARCHY,
  TrainingModuleDoc,
  UserProgressDoc,
  UserPublicProfile
} from '../types/portal';

interface ReportsExportCenterProps {
  currentUser: UserPublicProfile;
  roster: UserPublicProfile[];
  modules: TrainingModuleDoc[];
  exams: AcademyExamDoc[];
  progress: UserProgressDoc[];
  requests: PortalRequestDoc[];
  onStatusToast: (msg: string) => void;
}

export const ReportsExportCenter: React.FC<ReportsExportCenterProps> = ({
  currentUser,
  roster,
  modules,
  exams,
  progress,
  requests,
  onStatusToast
}) => {
  // Compute per-officer training & exam stats
  const officerStats = roster.map(member => {
    const memberProg = progress.filter(p => p.userId === member.uid);
    const completedMods = memberProg.filter(
      p => p.targetType === 'module' && p.status === 'completed'
    ).length;
    const passedTests = memberProg.filter(
      p => (p.targetType === 'test' || p.targetType === 'final_exam') && p.status === 'passed'
    );
    const avgScore =
      passedTests.length > 0
        ? Math.round(
            passedTests.reduce((acc, item) => acc + item.scorePercent, 0) / passedTests.length
          )
        : 0;
    const readinessPercent =
      modules.length + exams.length > 0
        ? Math.min(
            100,
            Math.round(
              ((completedMods + passedTests.length) /
                Math.max(1, modules.length + exams.length)) *
                100
            )
          )
        : 100;

    return {
      member,
      completedMods,
      passedTestsCount: passedTests.length,
      avgScore,
      readinessPercent,
      lastEvaluatedBy:
        memberProg.find(p => p.evaluatedByName)?.evaluatedByName || 'Selbststudium / System'
    };
  });

  const handleExportTrainingCsv = () => {
    const header = [
      'Dienstnummer',
      'Name',
      'Rufzeichen',
      'System-Rang',
      'Dienstgrad',
      'Abteilung',
      'Handbücher abgeschlossen',
      'Prüfungen bestanden',
      'Durchschnittsnote (%)',
      'Gesamt-Ausbildungsstand (%)',
      'Letzter Prüfer / Ausbilder'
    ];

    const rows = officerStats.map(row => [
      row.member.badgeNumber,
      row.member.displayName,
      row.member.callsign,
      row.member.role.toUpperCase(),
      row.member.rank,
      row.member.division,
      `${row.completedMods}/${modules.length}`,
      `${row.passedTestsCount}/${exams.length}`,
      `${row.avgScore}%`,
      `${row.readinessPercent}%`,
      row.lastEvaluatedBy
    ]);

    const csv =
      '\uFEFF' +
      [header, ...rows]
        .map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ca-post-ausbildungsbericht-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onStatusToast('Ausbildungs- & Qualifikationsmatrix als CSV-Tabellendokument exportiert.');
  };

  const handleExportDetailedGradesCsv = () => {
    const header = [
      'Zeitstempel',
      'Beamter',
      'Typ',
      'Kurs-Code',
      'Titel',
      'Status',
      'Ergebnis (%)',
      'Versuche',
      'Bewertet durch Ausbilder',
      'Ausbilder-Kommentar'
    ];

    const rows = progress.map(p => [
      p.updatedIso ? new Date(p.updatedIso).toLocaleString('de-DE') : '-',
      p.userName,
      p.targetType.toUpperCase(),
      p.courseCode || '-',
      p.targetTitle,
      p.status.toUpperCase(),
      `${p.scorePercent}%`,
      String(p.attempts),
      p.evaluatedByName || 'System-Prüfung',
      p.instructorFeedback || '-'
    ]);

    const csv =
      '\uFEFF' +
      [header, ...rows]
        .map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ca-post-pruefungsprotokoll-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onStatusToast('Detailliertes Prüfungs- & Notenprotokoll als CSV exportiert.');
  };

  const handleDownloadPrintableReport = () => {
    const reportDate = new Date().toLocaleString('de-DE');
    const htmlDoc = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>CA-POST Leitungsbericht — ${reportDate}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 40px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .kicker { font-family: monospace; font-size: 11px; color: #0284c7; font-weight: bold; }
    h1 { margin: 4px 0 0 0; font-size: 22px; }
    .meta { font-family: monospace; font-size: 11px; color: #475569; text-align: right; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
    .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; }
    .card-label { font-family: monospace; font-size: 10px; color: #64748b; }
    .card-val { font-family: monospace; font-size: 20px; font-weight: bold; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 28px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-family: monospace; font-size: 11px; text-transform: uppercase; }
    .footer { margin-top: 32px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
    @media print { .no-print { display: none; } body { margin: 15mm; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; padding: 12px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 13px;"><strong>Druck- &amp; PDF-Ansicht:</strong> Nutze den Druckdialog deines Browsers ("Als PDF speichern"), um diesen Bericht als PDF abzulegen.</span>
    <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Jetzt drucken / Als PDF speichern</button>
  </div>
  <div class="header">
    <div>
      <div class="kicker">STATE OF CALIFORNIA · DEPARTMENT OF JUSTICE &amp; POST</div>
      <h1>Offizieller Ausbildungs- &amp; Dienststellenbericht</h1>
    </div>
    <div class="meta">
      <div>Erstellt am: ${reportDate}</div>
      <div>Erstellt durch: ${currentUser.displayName} (${currentUser.badgeNumber})</div>
    </div>
  </div>
  <div class="grid">
    <div class="card"><div class="card-label">GESAMTPERSONAL</div><div class="card-val">${roster.length} Beamte</div></div>
    <div class="card"><div class="card-label">LEHRBÜCHER AKTIV</div><div class="card-val">${modules.length} Module</div></div>
    <div class="card"><div class="card-label">PRÜFUNGEN AKTIV</div><div class="card-val">${exams.length} Tests</div></div>
    <div class="card"><div class="card-label">ANTRÄGE GESAMT</div><div class="card-val">${requests.length} Anträge</div></div>
  </div>
  <h2>1. Personal- &amp; Ausbildungsmatrix</h2>
  <table>
    <thead>
      <tr>
        <th>Dienstnummer</th>
        <th>Beamter</th>
        <th>System-Rang</th>
        <th>Abteilung</th>
        <th>Handbücher</th>
        <th>Prüfungen</th>
        <th>Ø Note</th>
        <th>Bereitschaft</th>
      </tr>
    </thead>
    <tbody>
      ${officerStats
        .map(
          s => `<tr>
        <td style="font-family:monospace;">${s.member.badgeNumber}</td>
        <td><strong>${s.member.displayName}</strong> (${s.member.callsign})</td>
        <td style="font-family:monospace;text-transform:uppercase;">${s.member.role}</td>
        <td>${s.member.division}</td>
        <td style="font-family:monospace;">${s.completedMods} / ${modules.length}</td>
        <td style="font-family:monospace;">${s.passedTestsCount} / ${exams.length}</td>
        <td style="font-family:monospace;">${s.avgScore}%</td>
        <td style="font-family:monospace;font-weight:bold;">${s.readinessPercent}%</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>
  <div class="footer">
    <span>CA-POST Intranet · Offizieller Nachweis für die Dienststellenleitung</span>
    <span>Signatur: ${currentUser.displayName} (${ROLE_HIERARCHY[currentUser.role].label})</span>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CA-POST-Leitungsbericht-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    onStatusToast(
      'Druckfertiger PDF-/Leitungsbericht heruntergeladen (im Browser öffnen & "Als PDF speichern" wählen).'
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Dienststellenleitung · Berichtswesen &amp; Datenexport
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Export- &amp; Berichtsfunktionen (CSV / PDF-Leitungsbericht)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Erstelle strukturierte Tabellenexporte (Excel/CSV) sowie druckfertige PDF-Berichte über
            Ausbildungsstände, Prüfungsquoten und Personalstatistiken für die Dienststellenleitung.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportTrainingCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Qualifikationsmatrix (CSV)
          </button>

          <button
            type="button"
            onClick={handleExportDetailedGradesCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Prüfungs- &amp; Notenprotokoll (CSV)
          </button>

          <button
            type="button"
            onClick={handleDownloadPrintableReport}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            PDF-Leitungsbericht generieren
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>ERFASSTE BEAMTE</span>
            <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {roster.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {roster.filter(r => r.isOnline).length} aktuell online im Dienst
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>LEHRBÜCHER &amp; MODULE</span>
            <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {modules.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Veröffentlichte Handbücher</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>PRÜFUNGSPROTOKOLLE</span>
            <ClipboardCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {progress.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gespeicherte Nachweise &amp; Noten</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>Ø BEREITSCHAFTSGRAD</span>
            <Award className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {officerStats.length > 0
              ? Math.round(
                  officerStats.reduce((acc, s) => acc + s.readinessPercent, 0) /
                    officerStats.length
                )
              : 100}
            %
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Durchschnitt über alle Ränge</div>
        </div>
      </div>

      {/* Qualification & Readiness Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs transition-colors">
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white border-b border-transparent dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight">
              Ausbildungs- &amp; Qualifikationsmatrix der Dienststelle
            </h2>
            <p className="text-[11px] text-slate-400">
              Übersicht über Handbücher, Prüfungen, Durchschnittsnoten und Lehrgangs-Freigaben
            </p>
          </div>
          <span className="text-xs font-mono text-sky-400">{officerStats.length} BEAMTE</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                <th className="py-3 px-4">Beamter / Dienstnummer</th>
                <th className="py-3 px-4">System-Rang &amp; Abteilung</th>
                <th className="py-3 px-4">Ausbilder-Lehrgänge</th>
                <th className="py-3 px-4">Handbücher</th>
                <th className="py-3 px-4">Prüfungen</th>
                <th className="py-3 px-4">Ø Note</th>
                <th className="py-3 px-4">Fortschritt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {officerStats.map(row => {
                const assignedCourses =
                  row.member.granularPermissions?.assignedCourseCodes || [];
                return (
                  <tr key={row.member.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{row.member.displayName}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {row.member.badgeNumber} · {row.member.callsign}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-semibold uppercase text-sky-700 dark:text-sky-400">
                        {row.member.role} ({row.member.rank})
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{row.member.division}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {assignedCourses.length > 0
                        ? assignedCourses.includes('*')
                          ? 'ALLE LEHRGÄNGE (*)'
                          : assignedCourses.join(', ')
                        : 'Keine (Standard)'}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {row.completedMods} / {modules.length}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {row.passedTestsCount} / {exams.length}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {row.avgScore > 0 ? `${row.avgScore}%` : '—'}
                    </td>
                    <td className="py-3.5 px-4 w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                          <div
                            className="h-full bg-sky-600"
                            style={{ width: `${row.readinessPercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 w-9 text-right">
                          {row.readinessPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
