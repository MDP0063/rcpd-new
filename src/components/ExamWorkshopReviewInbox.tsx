import React, { useCallback, useEffect, useState } from 'react';
import { Archive, CheckCircle2, ClipboardCheck, Loader2, RotateCcw } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface ReviewRequest {
  id: string;
  examId: string;
  examTitle: string;
  requestedByName: string;
  assessmentStage: 'test' | 'final_exam';
  requestKind: 'new' | 'update';
  createdIso: string;
}

interface Props {
  onOpenRequest: (requestId: string, examId: string) => void;
  onChanged: () => void;
}

export const ExamWorkshopReviewInbox: React.FC<Props> = ({ onOpenRequest, onChanged }) => {
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await apiFetch<{ requests: ReviewRequest[] }>('/api/admin/exam-publication-requests', { cache: 'no-store' });
    if (!response.ok || !response.data) {
      setError(response.error || 'Freigabeanfragen konnten nicht geladen werden.');
    } else {
      setRequests(Array.isArray(response.data.requests) ? response.data.requests : []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (request: ReviewRequest, decision: 'return' | 'archive') => {
    const comment = window.prompt(
      decision === 'return'
        ? 'Begründung oder Hinweise für die Überarbeitung (optional):'
        : 'Grund für die Archivierung (optional):'
    );
    if (comment === null) return;
    setBusyId(request.id);
    const response = await apiFetch(
      `/api/admin/exam-publication-requests/${encodeURIComponent(request.id)}/decision`,
      { method: 'POST', body: JSON.stringify({ decision, comment }) }
    );
    setBusyId(null);
    if (!response.ok) {
      setError(response.error || 'Die Entscheidung konnte nicht gespeichert werden.');
      return;
    }
    await load();
    onChanged();
  };

  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><ClipboardCheck size={18}/> Freigabeanfragen</h2>
          <p className="mt-1 text-xs text-slate-500">Eingereichte Prüfungen prüfen, bearbeiten, veröffentlichen oder entscheiden.</p>
        </div>
        <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-bold">{requests.length} offen</span>
      </div>
      {error && <div role="alert" className="rounded-md bg-rose-50 text-rose-800 p-3 text-xs">{error}</div>}
      {loading ? (
        <div className="py-5 text-center text-sm text-slate-500"><Loader2 className="inline animate-spin mr-2" size={16}/>Anfragen werden geladen…</div>
      ) : requests.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center text-sm text-slate-500">Aktuell liegen keine offenen Freigabeanfragen vor.</p>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {requests.map(request => (
            <article key={request.id} className="py-3 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{request.examTitle}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {request.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Test'} · {request.requestKind === 'update' ? 'Aktualisierung' : 'Neue Prüfung'} · Eingereicht von {request.requestedByName}
                </p>
                <time className="text-[11px] text-slate-500">{new Date(request.createdIso).toLocaleString('de-DE')}</time>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button type="button" onClick={() => onOpenRequest(request.id, request.examId)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white">
                  <CheckCircle2 size={14}/> Prüfen
                </button>
                <button type="button" disabled={busyId === request.id} onClick={() => void decide(request, 'return')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50">
                  <RotateCcw size={14}/> Zurückgeben
                </button>
                <button type="button" disabled={busyId === request.id} onClick={() => void decide(request, 'archive')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50">
                  <Archive size={14}/> Archivieren
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
