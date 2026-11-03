import React, { useState } from 'react';
import { Search, Download, History } from 'lucide-react';
import { AuditLogDoc } from '../types/portal';

interface AuditTrailConsoleProps {
  auditLogs: AuditLogDoc[];
  onStatusToast: (msg: string) => void;
}

const CATEGORY_LABELS: Record<AuditLogDoc['category'], string> = {
  ACCOUNT_ROLE: 'Konto & Rangverwaltung',
  REQUEST_REVIEW: 'Antragsbearbeitung',
  ACADEMY_DOC: 'Handbücher & Prüfungen',
  COURSE_GRADE: 'Lehrgangs-Notenvergabe',
  ANNOUNCEMENT: 'Offizielle Bekanntmachung',
  CALENDAR_EVENT: 'Kalender & Einsätze',
  SYSTEM_BACKUP: 'Datenbank & System'
};

export const AuditTrailConsole: React.FC<AuditTrailConsoleProps> = ({
  auditLogs,
  onStatusToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter(entry => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      entry.actionTitle.toLowerCase().includes(q) ||
      entry.actorName.toLowerCase().includes(q) ||
      entry.actorBadge.toLowerCase().includes(q) ||
      entry.targetLabel.toLowerCase().includes(q) ||
      entry.details.toLowerCase().includes(q);
    const matchesCategory =
      categoryFilter === 'ALL' ? true : entry.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleExportAuditCsv = () => {
    const header = [
      'Zeitstempel',
      'Kategorie',
      'Ausführender Beamter',
      'Dienstnummer',
      'System-Rang',
      'Vorgang',
      'Zielobjekt',
      'Details'
    ];
    const rows = filteredLogs.map(item => [
      new Date(item.createdIso).toLocaleString('de-DE'),
      CATEGORY_LABELS[item.category] || item.category,
      item.actorName,
      item.actorBadge,
      item.actorRole.toUpperCase(),
      item.actionTitle,
      item.targetLabel,
      item.details
    ]);

    const csvContent =
      '\uFEFF' +
      [header, ...rows]
        .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ca-post-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onStatusToast(`Audit-Protokoll (${filteredLogs.length} Einträge) als CSV exportiert.`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Administration · Revisions- &amp; Aktivitätsprotokoll
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Erweiterter Aktivitäts-Log &amp; Audit-Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Lückenlose Aufzeichnung aller Rangvergaben, Kontenänderungen, Antragsentscheidungen,
            Notenvergaben und Dokumenten-Updates im Team.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportAuditCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700 rounded-md transition-colors cursor-pointer shadow-xs"
        >
          <Download className="w-4 h-4 text-sky-400" />
          Audit-Protokoll als CSV exportieren
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs transition-colors">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Suche nach Beamten, Dienstnummer, Antrag, Lehrgangs-Code oder Aktion..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-600"
          >
            <option value="ALL">Alle Protokoll-Kategorien ({auditLogs.length})</option>
            {(Object.keys(CATEGORY_LABELS) as AuditLogDoc['category'][]).map(cat => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Structured Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs transition-colors">
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white border-b border-transparent dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold tracking-tight">
              Chronologisches Revisionsprotokoll ({filteredLogs.length} Einträge)
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-300">Schreibgeschützt · Revisionsfest</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Keine passenden Audit-Einträge gefunden.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                  <th className="py-3 px-4">Zeitpunkt</th>
                  <th className="py-3 px-4">Bereich</th>
                  <th className="py-3 px-4">Ausführender Beamter</th>
                  <th className="py-3 px-4">Aktion &amp; Zielobjekt</th>
                  <th className="py-3 px-4">Protokoll-Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredLogs.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(item.createdIso).toLocaleString('de-DE', {
                        dateStyle: 'short',
                        timeStyle: 'medium'
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-sky-700 dark:text-sky-400 font-semibold whitespace-nowrap">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{item.actorName}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {item.actorBadge} · {item.actorRole.toUpperCase()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.actionTitle}</div>
                      <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                        Ziel: {item.targetLabel}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-md">{item.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

