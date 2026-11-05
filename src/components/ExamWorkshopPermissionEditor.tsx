import React from 'react';
import type { ExamWorkshopCategoryPermissions, ExamWorkshopPermissions } from '../types/portal';

interface Props {
  value: ExamWorkshopPermissions;
  onChange: (value: ExamWorkshopPermissions) => void;
}

const checkboxClass = 'h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500';
const labelClass = 'flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200';

export const ExamWorkshopPermissionEditor: React.FC<Props> = ({ value, onChange }) => {
  const update = (patch: Partial<ExamWorkshopPermissions>) => onChange({ ...value, ...patch });
  const updateCategory = (
    key: 'tests' | 'finalExams',
    patch: Partial<ExamWorkshopCategoryPermissions>
  ) => update({ [key]: { ...value[key], ...patch } });
  const updatePublication = (key: keyof ExamWorkshopPermissions['publication'], checked: boolean) =>
    update({ publication: { ...value.publication, [key]: checked } });

  const categories = [
    { key: 'tests' as const, title: 'Tests' },
    { key: 'finalExams' as const, title: 'Abschlussprüfungen' }
  ];

  return (
    <section className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Prüfungswerkstatt</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Zugang, Bearbeitungsrechte und Freigaberegeln werden unabhängig von den allgemeinen Academy-Bewertungsrechten verwaltet.
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
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Allgemeine Rechte</h4>
          <p className="mt-1 text-xs text-slate-500">Sichtbarkeit, Erstellung und Bearbeitung getrennt pro Bereich.</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {categories.map(category => (
              <div key={category.key} className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
                <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-3">{category.title}</h5>
                <div className="grid gap-2">
                  {([
                    ['canView', 'Darf sehen'],
                    ['canCreate', 'Darf erstellen'],
                    ['canEdit', 'Darf Entwürfe bearbeiten'],
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
            Freigabe- und Aktualisierungsregeln
          </summary>
          <p className="mt-2 text-xs text-slate-500">Aktivierte Regeln verlangen vor der Veröffentlichung eine Admin-Freigabe.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([
              ['newTestsRequireApproval', 'Neue Tests benötigen Freigabe'],
              ['newFinalExamsRequireApproval', 'Neue Abschlussprüfungen benötigen Freigabe'],
              ['testUpdatesRequireApproval', 'Test-Aktualisierungen benötigen Freigabe'],
              ['finalExamUpdatesRequireApproval', 'Aktualisierungen von Abschlussprüfungen benötigen Freigabe']
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
            Individuelle Aktualisierungssperren
          </summary>
          <p className="mt-2 text-xs text-slate-500">
            Diese Prüfungen dürfen von diesem Konto unabhängig von den allgemeinen Rechten niemals aktualisiert werden.
          </p>
          <input
            className="mt-3 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
            value={value.lockedUpdateExamIds.join(', ')}
            onChange={e => update({
              lockedUpdateExamIds: [...new Set(e.target.value.split(',').map(id => id.trim()).filter(Boolean))].slice(0, 500)
            })}
            placeholder="Prüfungs-IDs, durch Komma getrennt"
          />
        </details>
      </div>
    </section>
  );
};
