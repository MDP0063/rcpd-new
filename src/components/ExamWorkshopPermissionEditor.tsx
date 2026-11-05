import React, { useEffect, useState } from 'react';
import type { ExamWorkshopCategoryPermissions, ExamWorkshopPermissions } from '../types/portal';
import { apiFetch } from '../lib/api';

interface Props {
  value: ExamWorkshopPermissions;
  onChange: (value: ExamWorkshopPermissions) => void;
}

const checkboxClass = 'h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500';
const labelClass = 'flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200';

export const ExamWorkshopPermissionEditor: React.FC<Props> = ({ value, onChange }) => {
  const [exams, setExams] = useState<{ id: string; title: string; assessmentStage: 'test' | 'final_exam' }[]>([]);
  const [examLoadError, setExamLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch<{ exams: { id: string; title: string; assessmentStage: 'test' | 'final_exam' }[] }>(
      '/api/admin/exams',
      { cache: 'no-store' }
    ).then(response => {
      if (!active) return;
      if (response.ok && response.data) setExams(response.data.exams || []);
      else setExamLoadError(response.error || 'Prüfungsliste für individuelle Sperren konnte nicht geladen werden.');
    });
    return () => { active = false; };
  }, []);

  const update = (patch: Partial<ExamWorkshopPermissions>) => onChange({ ...value, ...patch });
  const updateCategory = (key: 'tests' | 'finalExams', patch: Partial<ExamWorkshopCategoryPermissions>) =>
    update({ [key]: { ...value[key], ...patch } });
  const updatePublication = (key: keyof ExamWorkshopPermissions['publication'], checked: boolean) =>
    update({ publication: { ...value.publication, [key]: checked } });

  const categories = [
    { key: 'tests' as const, title: 'Übungstests' },
    { key: 'finalExams' as const, title: 'Abschlussprüfungen' }
  ];

  return (
    <section className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Prüfungswerkstatt – Zugriffssteuerung</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Diese Rechte sind unabhängig von den allgemeinen Academy-Bewertungsrechten. Administratoren behalten immer Vollzugriff.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            <input className={checkboxClass} type="checkbox" checked={value.hasAccess}
              onChange={e => update({ hasAccess: e.target.checked })} />
            Zugang zur Prüfungswerkstatt
          </label>
          <label className={labelClass}>
            <input className={checkboxClass} type="checkbox" checked={value.canRequestAccess}
              onChange={e => update({ canRequestAccess: e.target.checked })} />
            Darf Werkstattzugang beantragen
          </label>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Sichtbarkeit und Bearbeitung</h4>
          <p className="mt-1 text-xs text-slate-500">Jede Prüfungsart wird unabhängig konfiguriert.</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {categories.map(category => (
              <div key={category.key} className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
                <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-3">{category.title}</h5>
                <div className="grid gap-2">
                  {([
                    ['canView', 'Darf Prüfungen sehen'],
                    ['canCreate', 'Darf neue Prüfungen erstellen'],
                    ['canEdit', 'Darf eigene Entwürfe bearbeiten'],
                    ['canUpdateExisting', 'Darf bestehende Prüfungen aktualisieren']
                  ] as const).map(([key, label]) => (
                    <label key={key} className={labelClass}>
                      <input className={checkboxClass} type="checkbox" checked={value[category.key][key]}
                        onChange={e => updateCategory(category.key, { [key]: e.target.checked })} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <details className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-100">
            Veröffentlichungs- und Aktualisierungsregeln
          </summary>
          <p className="mt-2 text-xs text-slate-500">Aktivierte Regeln verlangen vor der Veröffentlichung eine Admin-Freigabe.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([
              ['newTestsRequireApproval', 'Neue Übungstests benötigen Freigabe'],
              ['newFinalExamsRequireApproval', 'Neue Abschlussprüfungen benötigen Freigabe'],
              ['testUpdatesRequireApproval', 'Änderungen an Übungstests benötigen Freigabe'],
              ['finalExamUpdatesRequireApproval', 'Änderungen an Abschlussprüfungen benötigen Freigabe']
            ] as const).map(([key, label]) => (
              <label key={key} className={labelClass}>
                <input className={checkboxClass} type="checkbox" checked={value.publication[key]}
                  onChange={e => updatePublication(key, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </details>

        <details className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-100">
            Individuelle Prüfungssperren
          </summary>
          <p className="mt-2 text-xs text-slate-500">
            Hier ausgewählte Prüfungen darf dieses Konto unabhängig von den allgemeinen Rechten nicht aktualisieren.
          </p>
          {examLoadError && <p role="alert" className="mt-2 text-xs text-rose-600">{examLoadError}</p>}
          <select multiple value={value.lockedUpdateExamIds}
            onChange={event => update({ lockedUpdateExamIds: Array.from(event.currentTarget.selectedOptions, option => option.value).slice(0, 500) })}
            aria-label="Prüfungen auswählen, die dieses Konto nicht aktualisieren darf"
            className="mt-3 min-h-32 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white">
            {exams.map(exam => (
              <option key={exam.id} value={exam.id}>
                {exam.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Übungstest'} · {exam.title || 'Unbenannter Entwurf'} · {exam.id}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            Mehrfachauswahl mit Strg (Windows) bzw. Cmd (Mac). {exams.length} Prüfungen geladen.
          </p>
        </details>
      </div>
    </section>
  );
};
