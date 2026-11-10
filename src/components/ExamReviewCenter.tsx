import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import { parseManualReviewGrades } from '../lib/examReviewGrades';

interface ReviewQuestion { questionId: string; question: string; answer: string; pointsMilli: number; gradingRubric: string }
interface ReviewClaim {
  reviewerName: string;
  claimedAtIso: string;
  warningStartedAtIso?: string;
}
interface ReviewItem {
  id: string; examId: string; examTitle: string; userName: string; attemptCourseCode: string;
  submittedAtIso: string; questions: ReviewQuestion[];
  reviewClaim: ReviewClaim | null; isClaimOwner: boolean;
}

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

function warningMinutesRemaining(claim: ReviewClaim): number {
  if (!claim.warningStartedAtIso) return 0;
  return Math.max(0, Math.ceil((Date.parse(claim.warningStartedAtIso) + 10 * 60_000 - Date.now()) / 60_000));
}

export const ExamReviewCenter: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const activityTimers = useRef<Record<string, number>>({});
  const reviewsRef = useRef<ReviewItem[]>([]);

  const load = useCallback(async () => {
    const response = await apiFetch<{ reviews: ReviewItem[] }>(API_ENDPOINTS.ACADEMY_EXAM_REVIEWS, { cache: 'no-store' });
    if (!response.ok || !response.data) {
      setError(response.error || 'Die offenen Freitextbewertungen konnten nicht geladen werden.');
      setReviews([]);
    } else {
      setError('');
      reviewsRef.current = response.data.reviews;
      setReviews(response.data.reviews);
      setGrades(current => {
        const next = { ...current };
        for (const review of response.data!.reviews) {
          next[review.id] ||= Object.fromEntries(review.questions.map(question => [question.questionId, '']));
        }
        return next;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => { void load(); }, 60_000);
    const onPageHide = () => {
      for (const review of reviewsRef.current) {
        if (review.isClaimOwner) {
          void apiFetch(API_ENDPOINTS.ACADEMY_EXAM_REVIEW_DISCONNECT(review.examId, review.id), {
            method: 'POST', keepalive: true
          });
        }
      }
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', onPageHide);
      for (const timer of Object.values(activityTimers.current)) window.clearTimeout(timer);
    };
  }, [load]);

  const recordActivity = (review: ReviewItem) => {
    const previous = activityTimers.current[review.id];
    if (previous) window.clearTimeout(previous);
    activityTimers.current[review.id] = window.setTimeout(() => {
      void apiFetch(API_ENDPOINTS.ACADEMY_EXAM_REVIEW_ACTIVITY(review.examId, review.id), { method: 'POST' })
        .then(response => {
          if (!response.ok) setError(response.error || 'Die Zuständigkeit konnte nicht bestätigt werden. Bitte lade den Vorgang neu.');
        });
    }, 1200);
  };

  const claimOrRelease = async (review: ReviewItem, action: 'claim' | 'release') => {
    setSavingId(review.id); setError(''); setNotice('');
    const response = await apiFetch(
      API_ENDPOINTS.ACADEMY_EXAM_REVIEW_CLAIM(review.examId, review.id),
      { method: action === 'claim' ? 'POST' : 'DELETE' }
    );
    setSavingId('');
    if (!response.ok) { setError(response.error || 'Die Zuständigkeit konnte nicht geändert werden.'); return; }
    setNotice(action === 'claim' ? 'Der Prüfungsvorgang wurde dir zugewiesen.' : 'Du hast den Prüfungsvorgang freigegeben.');
    await load();
  };

  const submit = async (review: ReviewItem) => {
    if (!review.isClaimOwner) {
      setError('Du musst den Vorgang zuerst beanspruchen, bevor du ihn abschließen kannst.');
      return;
    }
    const parsedGrades = parseManualReviewGrades(review.questions, grades[review.id] || {});
    if (!parsedGrades.ok) {
      setError('Bitte gib für jede Frage einen gültigen Punktewert zwischen 0 und der Höchstpunktzahl ein. Leere Felder sind nicht zulässig.');
      return;
    }
    setSavingId(review.id); setError(''); setNotice('');
    const response = await apiFetch(API_ENDPOINTS.ACADEMY_EXAM_GRADE(review.examId, review.id), {
      method: 'POST', body: JSON.stringify({ grades: parsedGrades.grades })
    });
    setSavingId('');
    if (!response.ok) { setError(response.error || 'Die Bewertung konnte nicht gespeichert werden.'); return; }
    setNotice('Die Freitextbewertung wurde abgeschlossen.');
    await load();
  };

  return <section className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900 dark:text-white">Offene Freitextbewertungen</h2><p className="mt-1 text-sm text-slate-500">Das Öffnen beansprucht einen Vorgang nicht. Zum Bearbeiten muss er ausdrücklich übernommen werden.</p></div><button type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading || Boolean(savingId)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">Aktualisieren</button></div>
    {error && <div role="alert" className="flex gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={17}/>{error}</div>}
    {notice && <div role="status" className="flex gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17}/>{notice}</div>}
    {loading ? <div className="p-8 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={17}/>Bewertungen werden geladen …</div> : reviews.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Keine offenen Freitextbewertungen.</div> : reviews.map(review => <article key={review.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-slate-900 dark:text-white">{review.examTitle}</h3><p className="text-xs text-slate-500">{review.userName} · {review.attemptCourseCode} · {new Date(review.submittedAtIso).toLocaleString('de-DE')}</p></div>
        {review.reviewClaim ? <div className="text-right text-xs text-slate-500"><p>{review.isClaimOwner ? 'Dir zugewiesen' : `In Bearbeitung durch ${review.reviewClaim.reviewerName}`}</p>{review.isClaimOwner && <button type="button" disabled={Boolean(savingId)} onClick={() => void claimOrRelease(review, 'release')} className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold dark:border-slate-700">Vorgang freigeben</button>}</div>
          : <button type="button" disabled={Boolean(savingId)} onClick={() => void claimOrRelease(review, 'claim')} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === review.id ? 'Bitte warten …' : 'Vorgang beanspruchen'}</button>}
      </header>
      {review.reviewClaim?.warningStartedAtIso && review.isClaimOwner && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Wegen Inaktivität läuft die Freigabewarnung. Noch ca. {warningMinutesRemaining(review.reviewClaim)} Minuten bis zur automatischen Freigabe. Eine tatsächliche Bearbeitungsaktion setzt die Frist zurück.</p>}
      {review.reviewClaim && !review.isClaimOwner
        ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">Die vertraulichen Antwort- und Bewertungsinhalte sind während der Bearbeitung durch einen anderen Prüfer ausgeblendet.</p>
        : review.questions.map((question, index) => <div key={question.questionId} className="grid gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:grid-cols-[1fr_180px]"><div className="space-y-2"><h4 className="text-sm font-semibold">Frage {index + 1}: {question.question}</h4><p onClick={() => { if (review.isClaimOwner) recordActivity(review); }} className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">{question.answer}</p>{question.gradingRubric && <p className="whitespace-pre-wrap text-xs text-slate-500">Rubrik: {question.gradingRubric}</p>}</div><label className="text-xs font-medium text-slate-600 dark:text-slate-300">Punkte / {question.pointsMilli / 1000}<input className={fieldClass + ' mt-1'} type="number" disabled={!review.isClaimOwner || savingId === review.id} min={0} max={question.pointsMilli / 1000} step="0.001" value={grades[review.id]?.[question.questionId] ?? ''} onFocus={() => { if (review.isClaimOwner) recordActivity(review); }} onChange={event => { setGrades(current => ({ ...current, [review.id]: { ...current[review.id], [question.questionId]: event.target.value } })); if (review.isClaimOwner) recordActivity(review); }}/></label></div>)}
      {review.isClaimOwner && <div className="flex justify-end"><button type="button" disabled={Boolean(savingId)} onClick={() => void submit(review)} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === review.id ? 'Speichert …' : 'Bewertung abschließen'}</button></div>}
    </article>)}
  </section>;
};
