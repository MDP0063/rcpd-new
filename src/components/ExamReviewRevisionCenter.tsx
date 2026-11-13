import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import type { UserPublicProfile } from '../types/portal';

interface PendingRevisionRequest {
  id: string; examId: string; examTitle: string; userName: string; attemptCourseCode: string;
  submittedAtIso: string; assessmentStage: 'test' | 'final_exam'; status: 'passed' | 'failed';
  reviewedAtIso: string; reviewedByName: string; requestedAtIso: string; requestedByName: string;
  reason: string;
  feedback: Array<{ questionId: string; label: string; feedback: string }>;
  previousGrades: Array<{ questionId: string; label: string; pointsEarnedMilli: number; maxPointsMilli: number }>;
}

interface ReviewSummary {
  id: string;
  examId: string;
  examTitle: string;
  userName: string;
  attemptCourseCode: string;
  submittedAtIso: string;
  assessmentStage: 'test' | 'final_exam';
  status: 'passed' | 'failed';
  reviewedAtIso: string;
  reviewedByName: string;
  questionSteps: Array<{ questionId: string; label: string }>;
}

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

export const ExamReviewRevisionCenter: React.FC<{ currentUser: UserPublicProfile }> = ({ currentUser }) => {
  const isSupervisor = (currentUser.role === 'admin' || currentUser.role === 'colonel') &&
    !['pending', 'suspended', 'revoked'].includes(currentUser.whitelistStatus);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [requests, setRequests] = useState<PendingRevisionRequest[]>([]);
  const [requestLoadError, setRequestLoadError] = useState('');
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState('');
  const [decisionSavingId, setDecisionSavingId] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [selectedSteps, setSelectedSteps] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [errorTargetId, setErrorTargetId] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationErrorLinks, setValidationErrorLinks] = useState<Array<{ targetId: string; message: string }>>([]);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const response = await apiFetch<{ reviews: ReviewSummary[] }>(API_ENDPOINTS.ACADEMY_EXAM_REVIEW_HISTORY, { cache: 'no-store' });
    if (!response.ok || !response.data) {
      setLoadError(response.error || 'Abgeschlossene Bewertungen konnten nicht geladen werden.');
      setReviews([]);
    } else {
      setLoadError('');
      setReviews(response.data.reviews);
    }
    if (isSupervisor) {
      const pending = await apiFetch<{ requests: PendingRevisionRequest[] }>(API_ENDPOINTS.ACADEMY_EXAM_REVIEW_REVISION_REQUESTS, { cache: 'no-store' });
      if (!pending.ok || !pending.data) {
        setRequestLoadError(pending.error || 'Offene Revisionsanfragen konnten nicht geladen werden.');
        setRequests([]);
      } else {
        setRequestLoadError('');
        setRequests(pending.data.requests);
      }
    } else {
      setRequests([]);
      setRequestLoadError('');
    }
    setLoading(false);
  }, [isSupervisor]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (error) errorSummaryRef.current?.focus(); }, [error]);

  const decide = async (request: PendingRevisionRequest, decision: 'accept' | 'reject') => {
    const reason = (rejectionReasons[request.id] || '').trim();
    if (decision === 'reject' && (reason.length < 10 || reason.length > 1000)) {
      setErrorTargetId(`exam-revision-reject-reason-${request.id}`);
      setError('Die Begründung der Ablehnung muss zwischen 10 und 1000 Zeichen lang sein.');
      return;
    }
    setDecisionSavingId(request.id);
    setError('');
    setErrorTargetId('');
    setNotice('');
    const response = await apiFetch(
      API_ENDPOINTS.ACADEMY_EXAM_REVIEW_RESOLVE_REVISION(request.examId, request.id),
      { method: 'POST', body: JSON.stringify({ decision, ...(decision === 'reject' ? { reason } : {}) }) }
    );
    if (!response.ok) {
      setDecisionSavingId('');
      setError(response.error || 'Die Revisionsanfrage konnte nicht entschieden werden.');
      return;
    }
    setRejectingId('');
    setRejectionReasons(current => { const next = { ...current }; delete next[request.id]; return next; });
    setNotice(decision === 'accept'
      ? 'Die Revisionsanfrage wurde angenommen. Der Vorgang ist jetzt wieder in der gemeinsamen Prüferliste.'
      : 'Die Revisionsanfrage wurde begründet abgelehnt. Die bisherige Bewertung bleibt unverändert.');
    await load();
    setDecisionSavingId('');
  };

  const toggleStep = (reviewId: string, questionId: string, checked: boolean) => {
    setSelectedSteps(current => {
      const previous = current[reviewId] || [];
      return {
        ...current,
        [reviewId]: checked
          ? [...previous, questionId]
          : previous.filter(id => id !== questionId)
      };
    });
  };

  const submit = async (review: ReviewSummary) => {
    const reason = (reasons[review.id] || '').trim();
    const selected = selectedSteps[review.id] || [];
    const entries = selected.map(questionId => ({
      questionId,
      feedback: (feedback[review.id]?.[questionId] || '').trim()
    }));
    const nextErrors: Record<string, string> = {};
    const nextErrorLinks: Array<{ targetId: string; message: string }> = [];
    if (reason.length < 10 || reason.length > 1000) {
      const message = 'Die Begründung muss zwischen 10 und 1000 Zeichen lang sein.';
      nextErrors[`reason:${review.id}`] = message;
      nextErrorLinks.push({ targetId: `exam-revision-reason-${review.id}`, message });
    }
    if (!entries.length) {
      const message = 'Wähle mindestens einen Bewertungsschritt aus.';
      nextErrors[`steps:${review.id}`] = message;
      nextErrorLinks.push({ targetId: `exam-revision-step-${review.id}-${review.questionSteps[0]?.questionId || ''}`, message });
    }
    for (const entry of entries) {
      if (entry.feedback.length < 10 || entry.feedback.length > 1000) {
        const message = 'Das Feedback muss zwischen 10 und 1000 Zeichen lang sein.';
        nextErrors[`feedback:${review.id}:${entry.questionId}`] = message;
        nextErrorLinks.push({ targetId: `exam-revision-feedback-${review.id}-${entry.questionId}`, message });
      }
    }
    if (Object.keys(nextErrors).length) {
      setValidationErrors(nextErrors);
      setValidationErrorLinks(nextErrorLinks);
      setErrorTargetId(nextErrorLinks[0]?.targetId || '');
      setError('Bitte korrigiere die markierten Angaben.');
      return;
    }

    setSavingId(review.id);
    setValidationErrors({});
    setValidationErrorLinks([]);
    setError('');
    setErrorTargetId('');
    setNotice('');
    const response = await apiFetch(
      API_ENDPOINTS.ACADEMY_EXAM_REVIEW_REQUEST_REVISION(review.examId, review.id),
      { method: 'POST', body: JSON.stringify({ reason, feedback: entries }) }
    );
    setSavingId('');
    if (!response.ok) {
      setErrorTargetId('');
      setError(response.error || 'Die Revisionsanfrage konnte nicht gesendet werden.');
      return;
    }
    setReviews(current => current.filter(item => item.id !== review.id));
    setExpandedId('');
    setValidationErrors({});
    setValidationErrorLinks([]);
    setNotice('Die Revisionsanfrage wurde an Admins und Colonels gesendet. Die bisherige Bewertung bleibt bis zur Entscheidung unverändert; eine erneute Bewertung beginnt erst nach Annahme.');
  };

  return <section className="exam-review-revision-center space-y-4" aria-labelledby="exam-review-revision-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id="exam-review-revision-title" className="text-base font-semibold text-slate-900 dark:text-white">Abgeschlossene Bewertungen</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Du kannst eine abgeschlossene manuelle Bewertung zur Prüfung durch Admins und Colonels vorschlagen. Erst nach Annahme beginnt die erneute Bewertung. Die Anfrage benötigt eine Begründung und konkretes Feedback zu mindestens einem Bewertungsschritt.
        </p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading || Boolean(savingId)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
        Aktualisieren
      </button>
    </div>

    {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
      <span>{loadError}</span>
      <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-rose-400 px-3 py-1.5 font-semibold disabled:opacity-50">Erneut laden</button>
    </div>}
    {error && <div ref={errorSummaryRef} tabIndex={-1} role="alert" aria-labelledby="exam-revision-error-title" className="flex items-start gap-2 rounded-lg border-l-4 border-rose-600 bg-rose-50 p-3 text-sm text-rose-900 outline-none focus-visible:ring-2 focus-visible:ring-rose-700 dark:bg-rose-950/40 dark:text-rose-100">
      <AlertCircle size={17} className="mt-0.5 shrink-0"/><div><p id="exam-revision-error-title" className="font-semibold">Es gibt ein Problem</p><p className="mt-1">{error}</p>
        {validationErrorLinks.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5">{validationErrorLinks.map(item => <li key={item.targetId}><a className="font-semibold underline underline-offset-2" href={`#${item.targetId}`}>{item.message}</a></li>)}</ul> : errorTargetId && <a className="mt-1 inline-block font-semibold underline underline-offset-2" href={`#${errorTargetId}`}>Zum betroffenen Feld</a>}
      </div>
    </div>}
    {notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17} className="mt-0.5 shrink-0"/>{notice}</div>}

    {isSupervisor && <section aria-labelledby="exam-revision-requests-title" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 id="exam-revision-requests-title" className="font-semibold text-slate-900 dark:text-white">Offene Revisionsanfragen</h4>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Diese Anfragen warten auf eine Entscheidung. Erst nach Annahme wird der Versuch wieder für kursberechtigte Prüfer freigegeben.</p>
        </div>
        <span className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{requests.length} offen</span>
      </div>
      {requestLoadError && <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{requestLoadError}</div>}
      {!loading && !requestLoadError && requests.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">Keine offenen Revisionsanfragen.</p>}
      {requests.map(request => <article key={request.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h5 className="font-semibold text-slate-900 dark:text-white">{request.examTitle}</h5>
            <p className="mt-1 text-xs text-slate-500">{request.userName} · {request.attemptCourseCode} · {request.assessmentStage === 'final_exam' ? 'Kursabschlussprüfung' : 'Übungstest'}</p>
            <p className="mt-1 text-xs text-slate-500">Angefragt von {request.requestedByName} am {new Date(request.requestedAtIso).toLocaleString('de-DE')}</p>
            <p className="text-xs text-slate-500">Ursprüngliche Bewertung: {request.reviewedByName} · {new Date(request.reviewedAtIso).toLocaleString('de-DE')}</p>
          </div>
          <span className={request.status === 'passed' ? 'text-xs font-semibold text-emerald-700 dark:text-emerald-400' : 'text-xs font-semibold text-rose-700 dark:text-rose-400'}>{request.status === 'passed' ? 'Bisher bestanden' : 'Bisher nicht bestanden'}</span>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Begründung</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{request.reason}</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Betroffene Bewertungsschritte</p>
          {request.feedback.map(item => <div key={item.questionId} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.label}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{item.feedback}</p>
            {request.previousGrades.find(grade => grade.questionId === item.questionId) && <p className="mt-1 text-xs text-slate-500">Bisherige Punkte: {(request.previousGrades.find(grade => grade.questionId === item.questionId)!.pointsEarnedMilli / 1000).toLocaleString('de-DE')} / {(request.previousGrades.find(grade => grade.questionId === item.questionId)!.maxPointsMilli / 1000).toLocaleString('de-DE')}</p>}
          </div>)}
        </div>
        {rejectingId === request.id && <div>
          <label htmlFor={`exam-revision-reject-reason-${request.id}`} className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">Begründung der Ablehnung</label>
          <textarea id={`exam-revision-reject-reason-${request.id}`} aria-invalid={errorTargetId === `exam-revision-reject-reason-${request.id}`} aria-describedby={`exam-revision-reject-help-${request.id}${errorTargetId === `exam-revision-reject-reason-${request.id}` ? ` exam-revision-reject-error-${request.id}` : ''}`} className={`${fieldClass} ${errorTargetId === `exam-revision-reject-reason-${request.id}` ? 'border-rose-600 dark:border-rose-400' : ''}`} rows={3} required minLength={10} maxLength={1000}
            value={rejectionReasons[request.id] || ''}
            onChange={event => { setRejectionReasons(current => ({ ...current, [request.id]: event.target.value })); setError(''); setErrorTargetId(''); }}
            placeholder="Erkläre nachvollziehbar, warum die Revisionsanfrage abgelehnt wird."/>
          <p id={`exam-revision-reject-help-${request.id}`} className="mt-1 text-xs text-slate-500">Mindestens 10, höchstens 1000 Zeichen.</p>
          {errorTargetId === `exam-revision-reject-reason-${request.id}` && <p id={`exam-revision-reject-error-${request.id}`} className="mt-1 text-sm font-medium text-rose-700 dark:text-rose-300">Die Begründung muss zwischen 10 und 1000 Zeichen lang sein.</p>}
        </div>}
        <div className="flex flex-wrap justify-end gap-2">
          {rejectingId === request.id ? <>
            <button type="button" onClick={() => setRejectingId('')} disabled={Boolean(decisionSavingId)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">Abbrechen</button>
            <button type="button" onClick={() => void decide(request, 'reject')} disabled={Boolean(decisionSavingId)} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-800 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300">{decisionSavingId === request.id ? 'Wird gespeichert …' : 'Begründet ablehnen'}</button>
          </> : <>
            <button type="button" onClick={() => setRejectingId(request.id)} disabled={Boolean(decisionSavingId)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Ablehnen</button>
            <button type="button" onClick={() => void decide(request, 'accept')} disabled={Boolean(decisionSavingId)} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{decisionSavingId === request.id ? 'Wird angenommen …' : 'Annehmen und erneut bewerten lassen'}</button>
          </>}
        </div>
      </article>)}
    </section>}

    {loading ? <p role="status" className="py-5 text-center text-sm text-slate-500"><Loader2 size={16} className="mr-2 inline animate-spin"/>Abgeschlossene Bewertungen werden geladen …</p>
      : !loadError && reviews.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700">Keine abgeschlossenen manuellen Bewertungen in deinen Kursen vorhanden.</p>
      : <div className="space-y-3">
        {reviews.map(review => <article key={review.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-900 dark:text-white">{review.examTitle}</h4>
              <p className="mt-1 text-xs text-slate-500">{review.userName} · {review.attemptCourseCode} · {review.assessmentStage === 'final_exam' ? 'Kursabschlussprüfung' : 'Übungstest'}</p>
              <p className="mt-1 text-xs text-slate-500">Bewertet am {new Date(review.reviewedAtIso).toLocaleString('de-DE')} · {review.reviewedByName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={review.status === 'passed' ? 'text-xs font-semibold text-emerald-700 dark:text-emerald-400' : 'text-xs font-semibold text-rose-700 dark:text-rose-400'}>
                {review.status === 'passed' ? 'Bestanden' : 'Nicht bestanden'}
              </span>
              <button type="button" onClick={() => { setExpandedId(current => current === review.id ? '' : review.id); setError(''); }}
                aria-expanded={expandedId === review.id}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <RotateCcw size={15}/> {expandedId === review.id ? 'Schließen' : 'Revisionsanfrage stellen'}
              </button>
            </div>
          </div>

          {expandedId === review.id && <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div>
              <label htmlFor={`exam-revision-reason-${review.id}`} className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">Begründung der Revision</label>
              <textarea id={`exam-revision-reason-${review.id}`} aria-invalid={Boolean(validationErrors[`reason:${review.id}`])} aria-describedby={`exam-revision-reason-help-${review.id}${validationErrors[`reason:${review.id}`] ? ` exam-revision-reason-error-${review.id}` : ''}`} className={`${fieldClass} ${validationErrors[`reason:${review.id}`] ? 'border-rose-600 dark:border-rose-400' : ''}`} rows={3} required minLength={10} maxLength={1000}
                value={reasons[review.id] || ''} onChange={event => { setReasons(current => ({ ...current, [review.id]: event.target.value })); setValidationErrors({}); setValidationErrorLinks([]); setError(''); setErrorTargetId(''); }}
                placeholder="Beschreibe, warum die abgeschlossene Bewertung erneut geprüft werden soll." aria-describedby={`exam-revision-reason-help-${review.id}`}/>
              <p id={`exam-revision-reason-help-${review.id}`} className="mt-1 text-xs text-slate-500">Mindestens 10, höchstens 1000 Zeichen.</p>
              {validationErrors[`reason:${review.id}`] && <p id={`exam-revision-reason-error-${review.id}`} className="mt-1 text-sm font-medium text-rose-700 dark:text-rose-300">{validationErrors[`reason:${review.id}`]}</p>}
            </div>
            <fieldset className="space-y-3" aria-describedby={validationErrors[`steps:${review.id}`] ? `exam-revision-steps-error-${review.id}` : undefined}>
              <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">Betroffene Bewertungsschritte</legend>
              <p className="text-xs text-slate-500">Es werden nur die Nummern der manuell bewerteten Fragen angezeigt. Antworten und interne Bewertungsdetails bleiben bis zur Übernahme des Vorgangs geschützt.</p>
              {validationErrors[`steps:${review.id}`] && <p id={`exam-revision-steps-error-${review.id}`} className="text-sm font-medium text-rose-700 dark:text-rose-300">{validationErrors[`steps:${review.id}`]}</p>}
              {review.questionSteps.map(step => {
                const checked = (selectedSteps[review.id] || []).includes(step.questionId);
                return <div key={step.questionId} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <label className="flex min-h-8 items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                    <input id={`exam-revision-step-${review.id}-${step.questionId}`} type="checkbox" checked={checked} onChange={event => { toggleStep(review.id, step.questionId, event.target.checked); setValidationErrors({}); setValidationErrorLinks([]); setError(''); setErrorTargetId(''); }} className="h-4 w-4 accent-sky-600"/>
                    {step.label}
                  </label>
                  {checked && <div className="mt-2">
                    <label htmlFor={`exam-revision-feedback-${review.id}-${step.questionId}`} className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Konkretes Feedback zu {step.label}</label>
                    <textarea id={`exam-revision-feedback-${review.id}-${step.questionId}`} aria-invalid={Boolean(validationErrors[`feedback:${review.id}:${step.questionId}`])} aria-describedby={`exam-revision-feedback-help-${review.id}-${step.questionId}${validationErrors[`feedback:${review.id}:${step.questionId}`] ? ` exam-revision-feedback-error-${review.id}-${step.questionId}` : ''}`} className={`${fieldClass} ${validationErrors[`feedback:${review.id}:${step.questionId}`] ? 'border-rose-600 dark:border-rose-400' : ''}`} rows={2} required minLength={10} maxLength={1000}
                      value={feedback[review.id]?.[step.questionId] || ''}
                      onChange={event => { setFeedback(current => ({ ...current, [review.id]: { ...(current[review.id] || {}), [step.questionId]: event.target.value } })); setValidationErrors({}); setValidationErrorLinks([]); setError(''); setErrorTargetId(''); }}
                      placeholder="Welcher Bewertungsschritt soll überprüft werden und warum?" aria-describedby={`exam-revision-feedback-help-${review.id}-${step.questionId}`}/>
                    <p id={`exam-revision-feedback-help-${review.id}-${step.questionId}`} className="mt-1 text-xs text-slate-500">Mindestens 10, höchstens 1000 Zeichen.</p>
                    {validationErrors[`feedback:${review.id}:${step.questionId}`] && <p id={`exam-revision-feedback-error-${review.id}-${step.questionId}`} className="mt-1 text-sm font-medium text-rose-700 dark:text-rose-300">{validationErrors[`feedback:${review.id}:${step.questionId}`]}</p>}
                  </div>}
                </div>;
              })}
            </fieldset>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setExpandedId('')} disabled={Boolean(savingId)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">Abbrechen</button>
              <button type="button" onClick={() => void submit(review)} disabled={Boolean(savingId)} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {savingId === review.id ? 'Wird gesendet …' : 'Revisionsanfrage senden'}
              </button>
            </div>
          </div>}
        </article>)}
      </div>}
  </section>;
};
