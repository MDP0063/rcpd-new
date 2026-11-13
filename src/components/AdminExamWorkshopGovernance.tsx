import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Archive, Check, Loader2, RotateCcw, X } from 'lucide-react';
import { apiFetch } from '../lib/api';

type PublicationRequest = {
  id: string; examId: string; requestedByUid: string; requestedByName: string;
  assessmentStage: 'test' | 'final_exam'; requestKind: 'new' | 'update';
  status: string; submittedRevision: number; submittedHash: string;
  createdIso: string; reviewedByName?: string; reviewedAtIso?: string; reviewComment?: string;
};

export const AdminExamWorkshopGovernance: React.FC<{ onOpenExam: (id: string) => void }> = ({ onOpenExam }) => {
  const [requests, setRequests] = useState<PublicationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    const response = await apiFetch<{ requests: PublicationRequest[] }>('/api/admin/exam-workshop/publication-requests', { cache: 'no-store' });
    if (!response.ok || !response.data) setError(response.error || 'Freigabeanträge konnten nicht geladen werden.');
    else { setRequests(response.data.requests || []); setError(null); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const decide = async (request: PublicationRequest, decision: 'approve' | 'returned' | 'rejected' | 'archived') => {
    if (decision !== 'approve' && reason.trim().length < 3) { setError('Bitte gib eine nachvollziehbare Begründung ein.'); return; }
    setBusyId(request.id); setError(null);
    const response = decision === 'approve'
      ? await apiFetch(`/api/admin/exam-workshop/publication-requests/${encodeURIComponent(request.id)}/approve`, { method: 'POST', body: JSON.stringify({}) })
      : await apiFetch(`/api/admin/exam-workshop/publication-requests/${encodeURIComponent(request.id)}/decision`, { method: 'PUT', body: JSON.stringify({ decision, reviewComment: reason }) });
    setBusyId(null);
    if (!response.ok) { setError(response.error || 'Die Entscheidung konnte nicht gespeichert werden.'); return; }
    setReason('');
    await load();
  };

  return <section className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
    <div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Veröffentlichungsprüfung</h2><p className="text-sm text-slate-500">Anträge, Revisionen und Entscheidungen im Verlauf</p></div>
    {error && <div role="alert" className="flex gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={16}/>{error}</div>}
    {loading ? <div className="py-5 text-center text-slate-500"><Loader2 className="mr-2 inline animate-spin"/>Anträge werden geladen…</div> : requests.length === 0 ? <p className="rounded border border-dashed border-slate-300 p-5 text-sm text-slate-500">Keine Veröffentlichungsanträge vorhanden.</p> :
      <div className="space-y-3">{requests.map(request => <article key={request.id} className="rounded-md border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900 dark:text-white">{request.examId}</h3><p className="text-xs text-slate-500">{request.requestedByName} · {request.assessmentStage === 'final_exam' ? 'Kursabschlussprüfung' : 'Übungstest'} · {request.requestKind === 'new' ? 'Neue Prüfung' : 'Aktualisierung'}</p></div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{request.status === 'pending' ? 'Offen' : request.status === 'published' ? 'Veröffentlicht' : request.status === 'returned' ? 'Zur Überarbeitung' : request.status === 'rejected' ? 'Abgelehnt' : 'Archiviert'}</span></div>
        <dl className="grid gap-2 text-xs sm:grid-cols-2"><div><dt className="text-slate-500">Eingereicht</dt><dd>{new Date(request.createdIso).toLocaleString('de-DE')}</dd></div><div><dt className="text-slate-500">Revision / Hash</dt><dd>r{request.submittedRevision} · {request.submittedHash.slice(0, 12)}…</dd></div></dl>
        <button type="button" onClick={() => onOpenExam(request.examId)} className="text-sm font-semibold text-sky-700 underline">Prüfung direkt öffnen</button>
        {request.status === 'pending' ? <div className="space-y-2 border-t border-slate-200 pt-3">
          <textarea value={reason} onChange={event => setReason(event.target.value)} rows={2} maxLength={1000} placeholder="Begründung für Rückgabe, Ablehnung oder Archivierung…" className="w-full rounded border border-slate-300 bg-transparent p-2 text-sm"/>
          <div className="flex flex-wrap gap-2">
            <button disabled={busyId === request.id} onClick={() => void decide(request, 'approve')} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check size={14}/>Freigeben & veröffentlichen</button>
            <button disabled={busyId === request.id} onClick={() => void decide(request, 'returned')} className="inline-flex items-center gap-1 rounded bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><RotateCcw size={14}/>Zur Überarbeitung</button>
            <button disabled={busyId === request.id} onClick={() => void decide(request, 'rejected')} className="inline-flex items-center gap-1 rounded bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><X size={14}/>Ablehnen</button>
            <button disabled={busyId === request.id} onClick={() => void decide(request, 'archived')} className="inline-flex items-center gap-1 rounded bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Archive size={14}/>Archivieren</button>
          </div>
        </div> : <p className="border-t border-slate-200 pt-3 text-xs text-slate-600">{request.reviewedByName || 'Admin'} · {request.reviewedAtIso ? new Date(request.reviewedAtIso).toLocaleString('de-DE') : ''}{request.reviewComment ? ` · ${request.reviewComment}` : ''}</p>}
      </article>)}</div>}
  </section>;
};
