import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';

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

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export const ExamReviewRevisionCenter: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [expandedId, setExpandedId] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [selectedSteps, setSelectedSteps] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
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
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

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
    if (reason.length < 10 || reason.length > 1000) {
      setError('Bitte gib eine nachvollziehbare Begründung mit 10 bis 1000 Zeichen ein.');
      return;
    }
    if (!entries.length || entries.some(entry => entry.feedback.length < 10 || entry.feedback.length > 1000)) {
      setError('Wähle mindestens einen Bewertungsschritt aus und gib dazu konkretes Feedback mit 10 bis 1000 Zeichen ein.');
      return;
    }

    setSavingId(review.id);
    setError('');
    setNotice('');
    const response = await apiFetch(
      API_ENDPOINTS.ACADEMY_EXAM_REVIEW_REQUEST_REVISION(review.examId, review.id),
      { method: 'POST', body: JSON.stringify({ reason, feedback: entries }) }
    );
    setSavingId('');
    if (!response.ok) {
      setError(response.error || 'Die Bewertung konnte nicht zur Revision zurückgegeben werden.');
      return;
    }
    setReviews(current => current.filter(item => item.id !== review.id));
    setExpandedId('');
    setNotice('Die Bewertung wurde zur Revision zurückgegeben. Admins und Colonels wurden benachrichtigt; der Vorgang steht wieder in der gemeinsamen Prüferliste.');
  };

  return <section className="exam-review-revision-center space-y-4" aria-labelledby="exam-review-revision-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id="exam-review-revision-title" className="text-base font-semibold text-slate-900 dark:text-white">Abgeschlossene Bewertungen</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Du kannst eine abgeschlossene manuelle Bewertung zur Revision zurückgeben. Die Anfrage benötigt eine Begründung und konkretes Feedback zu mindestens einem Bewertungsschritt.
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
    {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={17} className="mt-0.5 shrink-0"/>{error}</div>}
    {notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17} className="mt-0.5 shrink-0"/>{notice}</div>}

    {loading ? <p role="status" className="py-5 text-center text-sm text-slate-500"><Loader2 size={16} className="mr-2 inline animate-spin"/>Abgeschlossene Bewertungen werden geladen …</p>
      : !loadError && reviews.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700">Keine abgeschlossenen manuellen Bewertungen in deinen Kursen vorhanden.</p>
      : <div className="space-y-3">
        {reviews.map(review => <article key={review.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-900 dark:text-white">{review.examTitle}</h4>
              <p className="mt-1 text-xs text-slate-500">{review.userName} · {review.attemptCourseCode} · {review.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Übungstest'}</p>
              <p className="mt-1 text-xs text-slate-500">Bewertet am {new Date(review.reviewedAtIso).toLocaleString('de-DE')} · {review.reviewedByName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={review.status === 'passed' ? 'text-xs font-semibold text-emerald-700 dark:text-emerald-400' : 'text-xs font-semibold text-rose-700 dark:text-rose-400'}>
                {review.status === 'passed' ? 'Bestanden' : 'Nicht bestanden'}
              </span>
              <button type="button" onClick={() => { setExpandedId(current => current === review.id ? '' : review.id); setError(''); }}
                aria-expanded={expandedId === review.id}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <RotateCcw size={15}/> {expandedId === review.id ? 'Schließen' : 'Revision anfordern'}
              </button>
            </div>
          </div>

          {expandedId === review.id && <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div>
              <label htmlFor={`exam-revision-reason-${review.id}`} className="mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-200">Begründung der Revision</label>
              <textarea id={`exam-revision-reason-${review.id}`} className={fieldClass} rows={3} required minLength={10} maxLength={1000}
                value={reasons[review.id] || ''} onChange={event => setReasons(current => ({ ...current, [review.id]: event.target.value }))}
                placeholder="Beschreibe, warum die abgeschlossene Bewertung erneut geprüft werden soll." aria-describedby={`exam-revision-reason-help-${review.id}`}/>
              <p id={`exam-revision-reason-help-${review.id}`} className="mt-1 text-xs text-slate-500">Mindestens 10, höchstens 1000 Zeichen.</p>
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">Betroffene Bewertungsschritte</legend>
              <p className="text-xs text-slate-500">Es werden nur die Nummern der manuell bewerteten Fragen angezeigt. Antworten und interne Bewertungsdetails bleiben bis zur Übernahme des Vorgangs geschützt.</p>
              {review.questionSteps.map(step => {
                const checked = (selectedSteps[review.id] || []).includes(step.questionId);
                return <div key={step.questionId} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <label className="flex min-h-8 items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                    <input type="checkbox" checked={checked} onChange={event => toggleStep(review.id, step.questionId, event.target.checked)} className="h-4 w-4 accent-sky-600"/>
                    {step.label}
                  </label>
                  {checked && <div className="mt-2">
                    <label htmlFor={`exam-revision-feedback-${review.id}-${step.questionId}`} className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Konkretes Feedback zu {step.label}</label>
                    <textarea id={`exam-revision-feedback-${review.id}-${step.questionId}`} className={fieldClass} rows={2} required minLength={10} maxLength={1000}
                      value={feedback[review.id]?.[step.questionId] || ''}
                      onChange={event => setFeedback(current => ({ ...current, [review.id]: { ...(current[review.id] || {}), [step.questionId]: event.target.value } }))}
                      placeholder="Welcher Bewertungsschritt soll überprüft werden und warum?" aria-describedby={`exam-revision-feedback-help-${review.id}-${step.questionId}`}/>
                    <p id={`exam-revision-feedback-help-${review.id}-${step.questionId}`} className="mt-1 text-xs text-slate-500">Mindestens 10, höchstens 1000 Zeichen.</p>
                  </div>}
                </div>;
              })}
            </fieldset>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setExpandedId('')} disabled={Boolean(savingId)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">Abbrechen</button>
              <button type="button" onClick={() => void submit(review)} disabled={Boolean(savingId)} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {savingId === review.id ? 'Wird zurückgegeben …' : 'Zur Revision zurückgeben'}
              </button>
            </div>
          </div>}
        </article>)}
      </div>}
  </section>;
};
