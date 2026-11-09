import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';

interface ReviewQuestion { questionId: string; question: string; answer: string; pointsMilli: number; gradingRubric: string }
interface ReviewItem { id: string; examId: string; examTitle: string; userName: string; attemptCourseCode: string; submittedAtIso: string; questions: ReviewQuestion[] }

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export const ExamReviewCenter: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const response = await apiFetch<{ reviews: ReviewItem[] }>(API_ENDPOINTS.ACADEMY_EXAM_REVIEWS, { cache: 'no-store' });
    if (!response.ok || !response.data) {
      setError(response.error || 'Die offenen Freitextbewertungen konnten nicht geladen werden.');
      setReviews([]);
    } else {
      setError('');
      setReviews(response.data.reviews);
      setGrades(current => {
        const next = { ...current };
        for (const review of response.data!.reviews) {
          next[review.id] ||= Object.fromEntries(review.questions.map(question => [question.questionId, '0']));
        }
        return next;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (review: ReviewItem) => {
    const parsedGrades = parseManualReviewGrades(review.questions, grades[review.id] || {});
    if (!parsedGrades.ok) {
      setError('Bitte gib für jede Frage einen gültigen Punktewert zwischen 0 und der Höchstpunktzahl ein. Leere Felder sind nicht zulässig.');
      return;
    }
    const gradeList = parsedGrades.grades;
    setSavingId(review.id); setError(''); setNotice('');
    const response = await apiFetch(API_ENDPOINTS.ACADEMY_EXAM_GRADE(review.examId, review.id), {
      method: 'POST', body: JSON.stringify({ grades: gradeList })
    });
    setSavingId('');
    if (!response.ok) { setError(response.error || 'Die Bewertung konnte nicht gespeichert werden.'); return; }
    setNotice('Die Freitextbewertung wurde gespeichert.');
    await load();
  };

  return <section className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900 dark:text-white">Offene Freitextbewertungen</h2><p className="mt-1 text-sm text-slate-500">Die Antworten werden anhand der gespeicherten Prüfungsrubrik bewertet.</p></div><button type="button" onClick={() => void load()} disabled={loading || Boolean(savingId)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">Aktualisieren</button></div>
    {error && <div role="alert" className="flex gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={17}/>{error}</div>}
    {notice && <div role="status" className="flex gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17}/>{notice}</div>}
    {loading ? <div className="p-8 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={17}/>Bewertungen werden geladen …</div> : reviews.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Keine offenen Freitextbewertungen.</div> : reviews.map(review => <article key={review.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold text-slate-900 dark:text-white">{review.examTitle}</h3><p className="text-xs text-slate-500">{review.userName} · {review.attemptCourseCode} · {new Date(review.submittedAtIso).toLocaleString('de-DE')}</p></div></header>
      {review.questions.map((question, index) => <div key={question.questionId} className="grid gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:grid-cols-[1fr_180px]"><div className="space-y-2"><h4 className="text-sm font-semibold">Frage {index + 1}: {question.question}</h4><p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">{question.answer}</p>{question.gradingRubric && <p className="whitespace-pre-wrap text-xs text-slate-500">Rubrik: {question.gradingRubric}</p>}</div><label className="text-xs font-medium text-slate-600 dark:text-slate-300">Punkte / {question.pointsMilli / 1000}<input className={fieldClass + ' mt-1'} type="number" disabled={savingId === review.id} min={0} max={question.pointsMilli / 1000} step="0.001" value={grades[review.id]?.[question.questionId] ?? '0'} onChange={event => setGrades(current => ({ ...current, [review.id]: { ...current[review.id], [question.questionId]: event.target.value } }))}/></label></div>)}
      <div className="flex justify-end"><button type="button" disabled={Boolean(savingId)} onClick={() => void submit(review)} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === review.id ? 'Speichert …' : 'Bewertung abschließen'}</button></div>
    </article>)}
  </section>;
};
