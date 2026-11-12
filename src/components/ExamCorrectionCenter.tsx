import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import './ExamCorrectionCenter.css';

interface CorrectionGrade { questionId: string; pointsEarnedMilli: number }
interface PendingRelease {
  id: string; examId: string; examTitle: string; userName: string; attemptCourseCode: string;
  submittedAtIso: string; assessmentStage: 'test' | 'final_exam'; status: 'passed' | 'failed';
  finalScoreBasisPoints: number | null; resultReleaseStatus: 'unreleased' | 'pending_rerelease';
  resultReleaseHistory: Array<{ releasedByUid: string; releasedAtIso: string; status: 'passed' | 'failed'; finalScoreBasisPoints: number | null }>;
}
interface CorrectionAudit {
  reviewerUid: string;
  atIso: string;
  reason: string;
  previousReviewerUid: string;
  previousReviewedAtIso: string;
  previousManualPointsMilli: number;
  nextManualPointsMilli: number;
  previousStatus: 'passed' | 'failed';
  nextStatus: 'passed' | 'failed';
  previousScoreBasisPoints: number | null;
  nextScoreBasisPoints: number | null;
  previousGrades: CorrectionGrade[];
  nextGrades: CorrectionGrade[];
}
interface ReviewQuestion {
  questionId: string;
  question: string;
  answer: string;
  pointsMilli: number;
  gradingRubric: string;
  pointsEarnedMilli: number;
}
interface Review {
  id: string;
  examId: string;
  examTitle: string;
  userName: string;
  attemptCourseCode: string;
  submittedAtIso: string;
  assessmentStage: 'test' | 'final_exam';
  status: 'passed' | 'failed';
  finalScoreBasisPoints: number | null;
  reviewedAtIso: string;
  reviewedByUid: string;
  reviewCorrections: CorrectionAudit[];
  questions: ReviewQuestion[];
}

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const formatPoints = (milli: number) => (milli / 1000).toLocaleString('de-DE', { maximumFractionDigits: 3 });
const formatScore = (basisPoints: number | null) => basisPoints === null ? '–' : `${(basisPoints / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} %`;

export const ExamCorrectionCenter: React.FC<{ canReleaseResults?: boolean }> = ({ canReleaseResults = false }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pendingReleases, setPendingReleases] = useState<PendingRelease[]>([]);
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const response = await apiFetch<{ reviews: Review[] }>(API_ENDPOINTS.ACADEMY_EXAM_REVIEW_CORRECTIONS, { cache: 'no-store' });
    if (!response.ok || !response.data) {
      setError(response.error || 'Die abgeschlossenen Bewertungen konnten nicht geladen werden.');
      setReviews([]);
    } else {
      setError('');
      setReviews(response.data.reviews);
      setGrades(current => {
        const next = { ...current };
        for (const review of response.data!.reviews) {
          next[review.id] = Object.fromEntries(review.questions.map(question => [question.questionId, String(question.pointsEarnedMilli / 1000)]));
        }
        return next;
      });
    }
    if (canReleaseResults) {
      const releaseResponse = await apiFetch<{ releases: PendingRelease[] }>(API_ENDPOINTS.ADMIN_EXAM_RESULT_RELEASES, { cache: 'no-store' });
      if (releaseResponse.ok && releaseResponse.data && Array.isArray(releaseResponse.data.releases)) {
        setPendingReleases(releaseResponse.data.releases);
      } else {
        setPendingReleases([]);
        setError(releaseResponse.error || 'Die ausstehenden Ergebnisfreigaben konnten nicht geladen werden.');
      }
    } else {
      setPendingReleases([]);
    }
    setLoading(false);
  }, [canReleaseResults]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (review: Review) => {
    const reason = (reasons[review.id] || '').trim();
    if (reason.length < 10 || reason.length > 1000) {
      setError('Bitte gib eine Korrekturbegründung mit 10 bis 1000 Zeichen ein.');
      return;
    }
    const gradeValues = review.questions.map(question => grades[review.id]?.[question.questionId] ?? '');
    const gradeList = review.questions.map((question, index) => ({
      questionId: question.questionId,
      pointsEarnedMilli: Math.round(Number(gradeValues[index]) * 1000)
    }));
    if (gradeList.some((grade, index) =>
      !gradeValues[index].trim() ||
      !Number.isFinite(Number(gradeValues[index])) ||
      !Number.isSafeInteger(grade.pointsEarnedMilli) ||
      Math.abs(Number(gradeValues[index]) * 1000 - grade.pointsEarnedMilli) > 1e-7 ||
      grade.pointsEarnedMilli < 0 ||
      grade.pointsEarnedMilli > review.questions[index].pointsMilli
    )) {
      setError('Bitte gib für jede Frage gültige Punkte zwischen 0 und der Höchstpunktzahl ein.');
      return;
    }

    setSavingId(review.id);
    setError('');
    setNotice('');
    const response = await apiFetch(
      API_ENDPOINTS.ACADEMY_EXAM_REVIEW_CORRECT(review.examId, review.id),
      { method: 'POST', body: JSON.stringify({ grades: gradeList, reason }) }
    );
    setSavingId('');
    if (!response.ok) {
      setError(response.error || 'Die Korrektur konnte nicht gespeichert werden.');
      return;
    }
    setNotice('Die Bewertung wurde korrigiert und die Änderung mit Begründung protokolliert.');
    setReasons(current => ({ ...current, [review.id]: '' }));
    await load();
  };

  const release = async (item: PendingRelease) => {
    setSavingId(item.id);
    setError('');
    setNotice('');
    const response = await apiFetch(
      API_ENDPOINTS.ADMIN_EXAM_RESULT_RELEASE(item.examId, item.id),
      { method: 'POST', body: JSON.stringify({}) }
    );
    setSavingId('');
    if (!response.ok) {
      setError(response.error || 'Das Prüfungsergebnis konnte nicht freigegeben werden.');
      return;
    }
    setNotice('Das Prüfungsergebnis wurde offiziell freigegeben.');
    await load();
  };

  return <section className="exam-correction-center space-y-5">
    <div className="exam-correction-heading flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Abgeschlossene Bewertungen korrigieren</h2>
        <p className="mt-1 text-sm text-slate-500">Nur abgeschlossene Prüfungen mit bereits manuell bewerteten Freitextantworten werden angezeigt. Jede Korrektur benötigt eine Begründung und wird dauerhaft protokolliert.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading || Boolean(savingId)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">Aktualisieren</button>
    </div>

    {error && <div role="alert" className="flex gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={17}/>{error}</div>}
    {notice && <div role="status" className="flex gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17}/>{notice}</div>}

    {canReleaseResults && <section className="exam-release-panel space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="exam-release-heading"><h3 className="font-bold text-slate-900 dark:text-white">Ausstehende Ergebnisfreigaben</h3><p className="mt-1 text-xs text-slate-500">Nur endgültig bewertete Ergebnisse können hier offiziell für Teilnehmer freigegeben werden. Korrekturen nach einer früheren Freigabe erfordern eine erneute Freigabe.</p></div>
      {pendingReleases.length === 0 ? <p className="text-sm text-slate-500">Keine ausstehenden Ergebnisfreigaben.</p> : pendingReleases.map(item => <div key={item.id} className="exam-release-item flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
        <div className="exam-release-details"><p className="font-semibold text-slate-900 dark:text-white">{item.examTitle} · {item.attemptCourseCode}</p><p className="text-xs text-slate-500">{item.userName} · {item.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Übungstest'} · {new Date(item.submittedAtIso).toLocaleString('de-DE')}</p><p className="text-xs text-slate-500">{item.status === 'passed' ? 'Bestanden' : 'Nicht bestanden'} · {formatScore(item.finalScoreBasisPoints)}{item.resultReleaseStatus === 'pending_rerelease' ? ' · erneute Freigabe nach Korrektur' : ''}</p>{item.resultReleaseHistory.length > 0 && <p className="mt-1 text-[11px] text-slate-500">Vorherige Freigaben: {item.resultReleaseHistory.map(entry => `${new Date(entry.releasedAtIso).toLocaleString('de-DE')} (${entry.releasedByUid})`).join(' · ')}</p>}</div>
        <button type="button" disabled={Boolean(savingId)} onClick={() => void release(item)} className="exam-release-button rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingId === item.id ? 'Gibt frei …' : 'Ergebnis freigeben'}</button>
      </div>)}
    </section>}

    {loading ? <div className="p-8 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={17}/>Bewertungen werden geladen …</div>
      : reviews.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Keine abgeschlossenen manuellen Bewertungen vorhanden.</div>
      : reviews.map(review => <article key={review.id} className="exam-correction-card space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <header className="exam-correction-card-heading flex flex-wrap justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{review.examTitle}</h3>
            <p className="text-xs text-slate-500">{review.userName} · {review.attemptCourseCode} · {review.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Übungstest'}</p>
            <p className="mt-1 text-xs text-slate-500">Abgegeben: {new Date(review.submittedAtIso).toLocaleString('de-DE')} · zuletzt bewertet: {new Date(review.reviewedAtIso).toLocaleString('de-DE')}</p>
          </div>
          <div className="exam-correction-result text-right text-sm">
            <p className={`exam-correction-status ${review.status === 'passed' ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'font-semibold text-rose-700 dark:text-rose-400'}`}>{review.status === 'passed' ? 'Bestanden' : 'Nicht bestanden'}</p>
            <p className="text-slate-500">{formatScore(review.finalScoreBasisPoints)}</p>
          </div>
        </header>

        {review.questions.map((question, index) => <div key={question.questionId} className="exam-correction-question grid gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:grid-cols-[1fr_180px]">
          <div className="exam-correction-question-copy space-y-2">
            <h4 className="text-sm font-semibold">Frage {index + 1}: {question.question}</h4>
            <p className="exam-correction-answer whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">{question.answer}</p>
            {question.gradingRubric && <p className="exam-correction-rubric whitespace-pre-wrap text-xs text-slate-500">Bewertungsrubrik: {question.gradingRubric}</p>}
            <p className="exam-correction-previous-score text-xs text-slate-500">Bisherige Bewertung: {formatPoints(question.pointsEarnedMilli)} / {formatPoints(question.pointsMilli)} Punkte</p>
          </div>
          <label className="exam-correction-score-input text-xs font-medium text-slate-600 dark:text-slate-300">Neue Punkte / {formatPoints(question.pointsMilli)}
            <input className={fieldClass + ' mt-1'} type="number" disabled={savingId === review.id} min={0} max={question.pointsMilli / 1000} step="0.001" value={grades[review.id]?.[question.questionId] ?? ''} onChange={event => setGrades(current => ({ ...current, [review.id]: { ...current[review.id], [question.questionId]: event.target.value } }))}/>
          </label>
        </div>)}

        <div className="exam-correction-reason space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Begründung der Korrektur (10–1000 Zeichen)
            <textarea className={fieldClass + ' mt-1 min-h-24'} maxLength={1000} disabled={savingId === review.id} value={reasons[review.id] || ''} onChange={event => setReasons(current => ({ ...current, [review.id]: event.target.value }))} placeholder="Warum muss die ursprüngliche Bewertung geändert werden?"/>
          </label>
          <div className="flex justify-end">
            <button type="button" disabled={Boolean(savingId) || (reasons[review.id] || '').trim().length < 10} onClick={() => void submit(review)} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === review.id ? 'Speichert …' : 'Korrektur speichern'}</button>
          </div>
        </div>

        {review.reviewCorrections.length > 0 && <details className="exam-correction-history space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <summary className="text-sm font-semibold">Korrekturhistorie ({review.reviewCorrections.length})</summary>
          {review.reviewCorrections.map((entry, index) => <div key={entry.atIso + index} className="exam-correction-history-entry rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950">
            <p className="font-semibold">{new Date(entry.atIso).toLocaleString('de-DE')} · korrigiert von {entry.reviewerUid}</p>
            <p className="mt-1 text-slate-500">Vorherige Bewertung: {entry.previousReviewerUid} · {new Date(entry.previousReviewedAtIso).toLocaleString('de-DE')}</p>
            <p className="mt-1">Ergebnis: {entry.previousStatus === 'passed' ? 'Bestanden' : 'Nicht bestanden'} ({formatScore(entry.previousScoreBasisPoints)}) → {entry.nextStatus === 'passed' ? 'Bestanden' : 'Nicht bestanden'} ({formatScore(entry.nextScoreBasisPoints)})</p>
            <p className="mt-1 whitespace-pre-wrap">Begründung: {entry.reason}</p>
            <p className="mt-1 text-slate-500">Punkte: {entry.previousGrades.map(grade => formatPoints(grade.pointsEarnedMilli)).join(', ')} → {entry.nextGrades.map(grade => formatPoints(grade.pointsEarnedMilli)).join(', ')}</p>
          </div>)}
        </details>}
      </article>)}
  </section>;
};
