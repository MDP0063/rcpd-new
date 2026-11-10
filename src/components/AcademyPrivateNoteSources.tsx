import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import type { AcademyPrivateNoteSource } from '../types/academy';

type SourceStatus = AcademyPrivateNoteSource & {
  status: 'available' | 'restricted' | 'unavailable';
};

interface Props {
  noteId: string;
  sources: AcademyPrivateNoteSource[];
}

const statusLabels: Record<SourceStatus['status'], string> = {
  available: 'Verfügbar',
  restricted: 'Nicht zugänglich',
  unavailable: 'Nicht mehr verfügbar'
};

export const AcademyPrivateNoteSources: React.FC<Props> = ({ noteId, sources }) => {
  const [expanded, setExpanded] = useState(false);
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statuses, setStatuses] = useState<SourceStatus[] | null>(null);

  useEffect(() => {
    if (!expanded || requested) return;
    let active = true;
    setRequested(true);
    setLoading(true);
    setError('');
    void apiFetch<{ sources: SourceStatus[] }>(API_ENDPOINTS.ACADEMY_NOTE_SOURCE_STATUS(noteId))
      .then(response => {
        if (!active) return;
        if (!response.ok || !response.data) {
          setError(response.error || 'Der Quellenstatus konnte nicht geladen werden.');
          return;
        }
        setStatuses(response.data.sources);
      })
      .catch(fetchError => {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Der Quellenstatus konnte nicht geladen werden.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [expanded, noteId, requested]);

  const retry = () => {
    setStatuses(null);
    setRequested(false);
    setError('');
  };

  return (
    <details
      className="space-y-1 text-xs text-slate-500 dark:text-slate-400"
      onToggle={event => setExpanded(event.currentTarget.open)}
    >
      <summary className="cursor-pointer">Verknüpfte Quellen ({sources.length}) – Zugriffsstatus anzeigen</summary>
      <div className="space-y-2 pt-1">
        {sources.map(source => {
          const status = statuses?.find(item =>
            item.materialId === source.materialId && item.materialVersionId === source.materialVersionId
          );
          return (
            <div key={source.materialId + '::' + source.materialVersionId}>
              <p>Material {source.materialId} · Fassung {source.materialVersionId}</p>
              <p className={status?.status === 'restricted' || status?.status === 'unavailable'
                ? 'font-medium text-amber-700 dark:text-amber-300'
                : 'text-slate-500 dark:text-slate-400'}>
                {status ? statusLabels[status.status] : loading ? 'Status wird geprüft …' : error ? 'Status nicht geprüft' : 'Noch nicht geprüft'}
              </p>
            </div>
          );
        })}
        {error && <div role="alert" className="space-y-1">
          <p>{error}</p>
          <button type="button" className="underline" onClick={retry}>Erneut prüfen</button>
        </div>}
      </div>
    </details>
  );
};
