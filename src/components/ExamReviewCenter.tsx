import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import { parseManualReviewGrades } from '../lib/examReviewGrades';

interface ReviewQuestion { questionId: string; question: string; answer: string; pointsMilli: number; gradingRubric: string }
interface ReviewClaim {
  reviewerName: string;
  claimedAtIso: string;
  warningStartedAtIso?: string;
  isDisconnected?: boolean;
}
interface ReviewItem {
  id: string; examId: string; examTitle: string; userName: string; attemptCourseCode: string;
  submittedAtIso: string; questions: ReviewQuestion[];
  reviewClaim: ReviewClaim | null; isClaimOwner: boolean; canClaim: boolean;
  draftGrades: Record<string, number>;
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
  const [draftSaveStatus, setDraftSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [releaseDialogId, setReleaseDialogId] = useState('');
  const activityTimers = useRef<Record<string, number>>({});
  const draftSaveTimers = useRef<Record<string, number>>({});
  const pendingDrafts = useRef<Record<string, { review: ReviewItem; question: ReviewQuestion; value: string }>>({});
  const inFlightDraftSaves = useRef<Record<string, { pending: { review: ReviewItem; question: ReviewQuestion; value: string }; promise: Promise<boolean> }>>({});
  const reviewsRef = useRef<ReviewItem[]>([]);

  const load = useCallback(async () => {
    const response = await apiFetch<{ reviews: ReviewItem[] }>(API_ENDPOINTS.ACADEMY_EXAM_REVIEWS, { cache: 'no-store' });
    if (!response.ok || !response.data) {
      setError(response.error || 'Die offenen Freitextbewertungen konnten nicht geladen werden.');
      reviewsRef.current = [];
      setReviews([]);
    } else {
      setError('');
      const previousReviews = reviewsRef.current;
      const nextReviewIds = new Set(response.data.reviews.map(review => review.id));
      for (const previous of previousReviews) {
        const current = response.data.reviews.find(review => review.id === previous.id);
        if (!current || (previous.isClaimOwner && !current.isClaimOwner)) discardPendingDraftSaves(previous);
      }
      reviewsRef.current = response.data.reviews;
      setReviews(response.data.reviews);
      setGrades(current => {
        const next = { ...current };
        for (const review of response.data!.reviews) {
          const wasClaimOwner = previousReviews.some(previous => previous.id === review.id && previous.isClaimOwner);
          if (!next[review.id] || (review.isClaimOwner && !wasClaimOwner)) {
            next[review.id] = Object.fromEntries(review.questions.map(question => [
              question.questionId,
              typeof review.draftGrades[question.questionId] === 'number'
                ? String(review.draftGrades[question.questionId] / 1000)
                : ''
            ]));
          }
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
    const onPageShow = () => { void load(); };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      for (const timer of Object.values(activityTimers.current)) window.clearTimeout(timer);
      for (const timer of Object.values(draftSaveTimers.current)) window.clearTimeout(timer);
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

  const draftKey = (reviewId: string, questionId: string) => `${reviewId}:${questionId}`;

  const hasDraftSaveInFlight = (reviewId: string) =>
    Object.keys(inFlightDraftSaves.current).some(key => key.startsWith(`${reviewId}:`));

  const saveDraftNow = async (key: string): Promise<boolean> => {
    const inFlight = inFlightDraftSaves.current[key];
    if (inFlight) {
      const saved = await inFlight.promise;
      if (saved && pendingDrafts.current[key] === inFlight.pending) delete pendingDrafts.current[key];
      if (pendingDrafts.current[key] && pendingDrafts.current[key] !== inFlight.pending) return saveDraftNow(key);
      return saved;
    }
    const pending = pendingDrafts.current[key];
    if (!pending) return true;
    const trimmed = pending.value.trim();
    const pointsEarnedMilli = trimmed === '' ? null : Number(trimmed) * 1000;
    if (pointsEarnedMilli !== null &&
        (!Number.isSafeInteger(pointsEarnedMilli) || pointsEarnedMilli < 0 || pointsEarnedMilli > pending.question.pointsMilli)) {
      setDraftSaveStatus(current => ({ ...current, [pending.review.id]: 'error' }));
      return false;
    }
    setDraftSaveStatus(current => ({ ...current, [pending.review.id]: 'saving' }));
    const promise = (async (): Promise<boolean> => {
      try {
        const response = await apiFetch<{ draftGrades: Record<string, number>; revision: number; updatedAtIso: string | null }>(
          API_ENDPOINTS.ACADEMY_EXAM_REVIEW_DRAFT(pending.review.examId, pending.review.id),
          { method: 'PUT', body: JSON.stringify({ questionId: pending.question.questionId, pointsEarnedMilli }) }
        );
        if (!response.ok || !response.data) {
          if (response.status === 403 || response.status === 409) discardPendingDraftSaves(pending.review);
          setDraftSaveStatus(current => ({ ...current, [pending.review.id]: 'error' }));
          setError(response.error || 'Der Bewertungsentwurf konnte nicht gespeichert werden. Prüfe deine Zuständigkeit.');
          return false;
        }
        setDraftSaveStatus(current => ({ ...current, [pending.review.id]: 'saved' }));
        return true;
      } catch {
        setDraftSaveStatus(current => ({ ...current, [pending.review.id]: 'error' }));
        setError('Der Bewertungsentwurf konnte wegen eines Verbindungsfehlers nicht gespeichert werden.');
        return false;
      }
    })();
    inFlightDraftSaves.current[key] = { pending, promise };
    const saved = await promise;
    if (inFlightDraftSaves.current[key]?.promise === promise) delete inFlightDraftSaves.current[key];
    if (saved && pendingDrafts.current[key] === pending) delete pendingDrafts.current[key];
    if (pendingDrafts.current[key] && pendingDrafts.current[key] !== pending) return saveDraftNow(key);
    return saved;
  };

  const scheduleDraftSave = (review: ReviewItem, question: ReviewQuestion, value: string) => {
    const key = draftKey(review.id, question.questionId);
    const previous = draftSaveTimers.current[key];
    if (previous) window.clearTimeout(previous);
    pendingDrafts.current[key] = { review, question, value };
    draftSaveTimers.current[key] = window.setTimeout(() => {
      delete draftSaveTimers.current[key];
      void saveDraftNow(key);
    }, 800);
  };

  const flushDraftSaves = async (review: ReviewItem): Promise<boolean> => {
    const keys = Object.keys(pendingDrafts.current).filter(key => key.startsWith(`${review.id}:`));
    for (const key of keys) {
      const timer = draftSaveTimers.current[key];
      if (timer) window.clearTimeout(timer);
      delete draftSaveTimers.current[key];
    }
    const results = await Promise.all(keys.map(key => saveDraftNow(key)));
    return results.every(Boolean);
  };

  const discardPendingDraftSaves = (review: ReviewItem) => {
    for (const key of Object.keys(pendingDrafts.current).filter(key => key.startsWith(`${review.id}:`))) {
      const timer = draftSaveTimers.current[key];
      if (timer) window.clearTimeout(timer);
      delete draftSaveTimers.current[key];
      delete pendingDrafts.current[key];
    }
  };

  const claimOrRelease = async (review: ReviewItem, action: 'claim' | 'release') => {
    if (action === 'release') {
      const timer = activityTimers.current[review.id];
      if (timer) window.clearTimeout(timer);
      delete activityTimers.current[review.id];
    }
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
    const activityTimer = activityTimers.current[review.id];
    if (activityTimer) window.clearTimeout(activityTimer);
    delete activityTimers.current[review.id];
    if (!review.isClaimOwner) {
      setError('Du musst den Vorgang zuerst beanspruchen, bevor du ihn abschließen kannst.');
      return;
    }
    if (!(await flushDraftSaves(review))) return;
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
        {review.reviewClaim ? <div className="text-right text-xs text-slate-500"><p>{review.isClaimOwner ? 'Dir zugewiesen' : review.reviewClaim.isDisconnected ? 'Dein vorheriger Claim ist unterbrochen' : `In Bearbeitung durch ${review.reviewClaim.reviewerName}`}</p>{review.isClaimOwner && <button type="button" disabled={Boolean(savingId) || hasDraftSaveInFlight(review.id)} onClick={() => setReleaseDialogId(review.id)} className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold dark:border-slate-700">Vorgang freigeben</button>}{review.canClaim && <button type="button" disabled={Boolean(savingId)} onClick={() => void claimOrRelease(review, 'claim')} className="mt-1 rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50">{savingId === review.id ? 'Bitte warten …' : review.reviewClaim.isDisconnected ? 'Erneut beanspruchen' : 'Vorgang beanspruchen'}</button>}</div>
          : <button type="button" disabled={Boolean(savingId)} onClick={() => void claimOrRelease(review, 'claim')} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === review.id ? 'Bitte warten …' : 'Vorgang beanspruchen'}</button>}
      </header>
      {review.reviewClaim?.warningStartedAtIso && review.isClaimOwner && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Wegen Inaktivität läuft die Freigabewarnung. Noch ca. {warningMinutesRemaining(review.reviewClaim)} Minuten bis zur automatischen Freigabe. Eine tatsächliche Bearbeitungsaktion setzt die Frist zurück.</p>}
      {review.reviewClaim && !review.isClaimOwner
        ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">Die vertraulichen Antwort- und Bewertungsinhalte sind während der Bearbeitung durch einen anderen Prüfer ausgeblendet.</p>
        : review.questions.map((question, index) => <div key={question.questionId} className="grid gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:grid-cols-[1fr_180px]"><div className="space-y-2"><h4 className="text-sm font-semibold">Frage {index + 1}: {question.question}</h4><p onClick={() => { if (review.isClaimOwner) recordActivity(review); }} className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">{question.answer}</p>{question.gradingRubric && <p className="whitespace-pre-wrap text-xs text-slate-500">Rubrik: {question.gradingRubric}</p>}</div><label className="text-xs font-medium text-slate-600 dark:text-slate-300">Punkte / {question.pointsMilli / 1000}<input className={fieldClass + ' mt-1'} type="number" disabled={!review.isClaimOwner || savingId === review.id} min={0} max={question.pointsMilli / 1000} step="0.001" value={grades[review.id]?.[question.questionId] ?? ''} onFocus={() => { if (review.isClaimOwner) recordActivity(review); }} onChange={event => { const value = event.target.value; setGrades(current => ({ ...current, [review.id]: { ...current[review.id], [question.questionId]: value } })); if (review.isClaimOwner) scheduleDraftSave(review, question, value); }}/></label></div>)}
      {review.isClaimOwner && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"><p className="text-xs text-slate-500">{draftSaveStatus[review.id] === 'saving' ? 'Bewertungsentwurf wird gespeichert …' : draftSaveStatus[review.id] === 'saved' ? 'Entwurf gespeichert' : draftSaveStatus[review.id] === 'error' ? 'Entwurf konnte nicht gespeichert werden' : 'Änderungen werden automatisch als Entwurf gespeichert.'}</p><button type="button" disabled={Boolean(savingId)} onClick={() => void submit(review)} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === review.id ? 'Speichert …' : 'Bewertung abschließen'}</button></div>}
      {releaseDialogId === review.id && <div role="dialog" aria-modal="true" aria-label="Prüfungsvorgang freigeben" className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Was soll mit noch nicht gespeicherten Eingaben geschehen?</p><div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(savingId)} onClick={async () => { const saved = await flushDraftSaves(review); if (saved) { setReleaseDialogId(''); setNotice('Entwurf gespeichert. Du bleibst für den Vorgang zuständig.'); } }} className="rounded-lg border border-amber-500 px-3 py-2 font-semibold">Zurück und speichern</button><button type="button" disabled={Boolean(savingId) || hasDraftSaveInFlight(review.id)} onClick={async () => { discardPendingDraftSaves(review); setReleaseDialogId(''); await claimOrRelease(review, 'release'); }} className="rounded-lg bg-amber-800 px-3 py-2 font-semibold text-white">Freigeben und ungespeicherte Änderungen verwerfen</button><button type="button" onClick={() => setReleaseDialogId('')} className="rounded-lg border border-amber-500 px-3 py-2">Abbrechen</button></div></div>}
    </article>)}
  </section>;
};
