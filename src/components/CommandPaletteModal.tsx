import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  ArrowRight,
  X
} from 'lucide-react';
import {
  AcademyExamDoc,
  CalendarEventDoc,
  PortalRequestDoc,
  TrainingModuleDoc,
  UserPublicProfile
} from '../types/portal';

export type CommandTargetSection =
  | 'dashboard'
  | 'announcements'
  | 'messages'
  | 'requests'
  | 'calendar'
  | 'academy'
  | 'reports'
  | 'whitelist'
  | 'settings'
  | 'personnel'
  | 'audit'
  | 'deployment';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: CommandTargetSection) => void;
  modules: TrainingModuleDoc[];
  exams: AcademyExamDoc[];
  roster: UserPublicProfile[];
  events: CalendarEventDoc[];
  requests: PortalRequestDoc[];
  canManageUsers: boolean;
  canViewTech: boolean;
}

interface SearchResultItem {
  id: string;
  category: 'Navigation' | 'Handbuch / Lehrbuch' | 'Prüfung / Test' | 'Beamter im Verzeichnis' | 'Termin / Event' | 'Antrag';
  title: string;
  subtitle: string;
  targetSection: CommandTargetSection;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  modules,
  exams,
  roster,
  events,
  requests,
  canManageUsers,
  canViewTech
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const allItems = useMemo<SearchResultItem[]>(() => {
    const navItems: SearchResultItem[] = [
      {
        id: 'nav-dashboard',
        category: 'Navigation',
        title: 'Officer Dashboard & Fortschrittsbalken',
        subtitle: 'Startseite, KPI-Kacheln & offene Aufgaben',
        targetSection: 'dashboard'
      },
      {
        id: 'nav-announcements',
        category: 'Navigation',
        title: 'Ankündigungen & Feed-Modul',
        subtitle: 'Offizielle Bekanntmachungen & Dienstanweisungen',
        targetSection: 'announcements'
      },
      {
        id: 'nav-messages',
        category: 'Navigation',
        title: 'Nachrichtensystem & Direktnachrichten',
        subtitle: 'Posteingang, Gesendete Mitteilungen & Rundschreiben',
        targetSection: 'messages'
      },
      {
        id: 'nav-requests',
        category: 'Navigation',
        title: 'Antrags- & Anforderungsformulare (Requests)',
        subtitle: 'Rangänderungen, Freigaben, Auszeichnungen & Versetzungen',
        targetSection: 'requests'
      },
      {
        id: 'nav-calendar',
        category: 'Navigation',
        title: 'Kalender & Einsatz-/Trainingsübersicht',
        subtitle: 'Termine für Trainings, Prüfungen & Sondereinsätze mit An-/Abmeldung',
        targetSection: 'calendar'
      },
      {
        id: 'nav-academy',
        category: 'Navigation',
        title: 'Ausbildungsbereich, Handbücher & Prüfungen',
        subtitle: 'PDF-Lehrbücher, Code-Tests, Abschlussprüfungen & Ausbilder-Notenvergabe',
        targetSection: 'academy'
      },
      {
        id: 'nav-reports',
        category: 'Navigation',
        title: 'Export- & Berichtsfunktionen (CSV / PDF)',
        subtitle: 'Ausbildungsstände & Statistiken für die Dienststellenleitung exportieren',
        targetSection: 'reports'
      },
      {
        id: 'nav-whitelist',
        category: 'Navigation',
        title: 'Personalbogen (Form 2-251)',
        subtitle: 'Personalakte & Whitelist-Status',
        targetSection: 'whitelist'
      },
      {
        id: 'nav-settings',
        category: 'Navigation',
        title: 'Persönliche Einstellungen & Rufzeichen',
        subtitle: 'Callsign, Abteilung und Dienst-Kurzprofil anpassen',
        targetSection: 'settings'
      }
    ];

    if (canManageUsers) {
      navItems.push(
        {
          id: 'nav-personnel',
          category: 'Navigation',
          title: 'Admin: Konten, Ränge & Granulare Berechtigungen',
          subtitle: 'Benutzerkonten, Passwörter und Lehrgangs-Ausbilder verwalten',
          targetSection: 'personnel'
        },
        {
          id: 'nav-audit',
          category: 'Navigation',
          title: 'Admin: Erweiterter Aktivitäts-Log / Audit-Trail',
          subtitle: 'Revisionsprotokoll aller Änderungen im Team',
          targetSection: 'audit'
        }
      );
    }

    if (canViewTech) {
      navItems.push({
        id: 'nav-deployment',
        category: 'Navigation',
        title: 'Admin: Technik & Render CI/CD Pipeline',
        subtitle: 'GitHub Sync, Render Live-Status & 1-Klick Backup',
        targetSection: 'deployment'
      });
    }

    const moduleItems: SearchResultItem[] = modules.map(m => ({
      id: `mod-${m.id}`,
      category: 'Handbuch / Lehrbuch',
      title: `${m.code}: ${m.title}`,
      subtitle: `${m.category} · Mindest-Rang: ${m.requiredRole.toUpperCase()}`,
      targetSection: 'academy'
    }));

    const examItems: SearchResultItem[] = exams.map(ex => ({
      id: `ex-${ex.id}`,
      category: 'Prüfung / Test',
      title: `${ex.moduleCode}: ${ex.title}`,
      subtitle: `${ex.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Übungstest'} · Bestehensgrenze: ${ex.passingScore}%`,
      targetSection: 'academy'
    }));

    const rosterItems: SearchResultItem[] = roster.map(u => ({
      id: `usr-${u.uid}`,
      category: 'Beamter im Verzeichnis',
      title: `${u.displayName} (${u.badgeNumber} · ${u.callsign})`,
      subtitle: `Rang: ${u.role.toUpperCase()} (${u.rank}) · ${u.division} · ${
        u.isOnline ? 'ONLINE' : 'OFFLINE'
      }`,
      targetSection: 'messages'
    }));

    const eventItems: SearchResultItem[] = events.map(ev => ({
      id: `evt-${ev.id}`,
      category: 'Termin / Event',
      title: ev.title,
      subtitle: `${ev.category} · ${new Date(ev.startIso).toLocaleDateString('de-DE')} · ${ev.location}`,
      targetSection: 'calendar'
    }));

    const requestItems: SearchResultItem[] = requests.map(rq => ({
      id: `req-${rq.id}`,
      category: 'Antrag',
      title: rq.title,
      subtitle: `Von ${rq.requesterName} (${rq.requesterBadge}) · Status: ${rq.status.toUpperCase()}`,
      targetSection: 'requests'
    }));

    return [
      ...navItems,
      ...moduleItems,
      ...examItems,
      ...rosterItems,
      ...eventItems,
      ...requestItems
    ];
  }, [modules, exams, roster, events, requests, canManageUsers, canViewTech]);

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 12);
    return allItems
      .filter(
        item =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      )
      .slice(0, 18);
  }, [allItems, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <Search className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Schnellsuche nach Handbüchern, Prüfungen, Kollegen (Dienstnummer), Terminen oder Formularen..."
            className="w-full text-sm text-slate-900 dark:text-white bg-transparent focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Keine Treffer für „{query}“ gefunden.
            </div>
          ) : (
            filteredResults.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.targetSection);
                  onClose();
                }}
                className="w-full px-5 py-3 text-left hover:bg-sky-50/70 dark:hover:bg-slate-800 flex items-center justify-between gap-4 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-semibold uppercase">
                    {item.category}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono text-sky-600 dark:text-sky-400 shrink-0">
                  <span>Öffnen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-900 dark:bg-slate-950 text-slate-300 border-t border-transparent dark:border-slate-800 text-[11px] font-mono flex items-center justify-between">
          <span>Tastenkombination: Strg+K (oder Cmd+K) zum Öffnen / Schließen</span>
          <span>{filteredResults.length} Ergebnisse</span>
        </div>
      </div>
    </div>
  );
};
