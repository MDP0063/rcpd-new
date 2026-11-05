import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface ExamComment {
  id: string;
  authorUid: string;
  authorName: string;
  body: string;
  createdIso: string;
}

interface Props { examId: string; }

export const ExamWorkshopComments: React.FC<Props> = ({ examId }) => {
  const [comments, setComments] = useState<ExamComment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await apiFetch<{ comments: ExamComment[] }>(
      `/api/admin/exams/${encodeURIComponent(examId)}/comments`,
      { cache: 'no-store' }
    );
    if (!response.ok || !response.data) {
      setError(response.error || 'Kommentare konnten nicht geladen werden.');
    } else {
      setComments(Array.isArray(response.data.comments) ? response.data.comments : []);
    }
    setLoading(false);
  }, [examId]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    const response = await apiFetch<{ comment: ExamComment }>(
      `/api/admin/exams/${encodeURIComponent(examId)}/comments`,
      { method: 'POST', body: JSON.stringify({ body }) }
    );
    setSending(false);
    if (!response.ok || !response.data?.comment) {
      setError(response.error || 'Kommentar konnte nicht gespeichert werden.');
      return;
    }
    setBody('');
    setComments(current => [...current, response.data!.comment]);
  };

  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <MessageSquare size={17}/> Kommentare
        </h2>
        <p className="mt-1 text-xs text-slate-500">Diskussion zu diesem Test bzw. dieser Abschlussprüfung. Sichtbar nur innerhalb der Prüfungswerkstatt.</p>
      </div>
      {error && <div role="alert" className="rounded-md bg-rose-50 text-rose-800 p-3 text-xs">{error}</div>}
      {loading ? (
        <div className="py-5 text-center text-sm text-slate-500"><Loader2 className="inline animate-spin mr-2" size={16}/>Kommentare werden geladen…</div>
      ) : comments.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center text-sm text-slate-500">Noch keine Kommentare.</p>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <article key={comment.id} className="rounded-md bg-slate-50 dark:bg-slate-950/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{comment.authorName}</span>
                <time className="text-[11px] text-slate-500">{new Date(comment.createdIso).toLocaleString('de-DE')}</time>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300">{comment.body}</p>
            </article>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="space-y-2">
        <label htmlFor="exam-workshop-comment" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Kommentar hinzufügen</label>
        <textarea id="exam-workshop-comment" value={body} onChange={event => setBody(event.target.value)}
          maxLength={4000} rows={3} placeholder="Sachlichen Kommentar zu dieser Prüfung schreiben…"
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"/>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500">{body.length}/4000 Zeichen</span>
          <button type="submit" disabled={!body.trim() || sending}
            className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {sending ? <Loader2 className="animate-spin" size={14}/> : <Send size={14}/>} Kommentar senden
          </button>
        </div>
      </form>
    </section>
  );
};
