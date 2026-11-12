import React, { useCallback, useEffect, useRef, useState } from 'react';
import './ExamParticipantRunner.css';
import {
  AlertCircle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3,
  Cloud, CloudOff, Loader2, LockKeyhole, Send, ShieldCheck
} from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import { CoalescedRequestRunner } from '../lib/coalescedRequest';

type AssessmentStage = 'test' | 'final_exam';
type AnswerValue = string | string[] | boolean | Array<{ pairId: string; targetId: string }> | null;
type AnswerMap = Record<string, AnswerValue | undefined>;

interface CatalogEntry {
  id: string;
  title: string;
  assessmentStage: AssessmentStage;
  assignedCourseCodes: string[];
  versionNumber: number;
  timeLimitMinutes: number;
  passingScoreBasisPoints: number;
  maxAttempts: number | null;
  prerequisites: Array<{ examId: string; mode: 'completed' | 'passed'; minScoreBasisPoints?: number }>;
  minClearance: number;
}

interface PublicQuestionBase {
  id: string;
  question: string;
  pointsMilli: number;
  imageUrl?: string;
}
type PublicQuestion =
  | (PublicQuestionBase & { type: 'single_choice' | 'multiple_choice'; options: Array<{ id: string; text: string }> })
  | (PublicQuestionBase & { type: 'true_false' })
  | (PublicQuestionBase & { type: 'matching'; pairs: Array<{ id: string; prompt: string }>; targets: Array<{ id: string; text: string }> })
  | (PublicQuestionBase & { type: 'free_text'; maxAnswerLength: number });

interface PublicAttempt {
  id: string;
  examId: string;
  title: string;
  assessmentStage: AssessmentStage;
  attemptCourseCode: string;
  attemptNumber: number;
  startedAtIso: string;
  deadlineIso: string | null;
  lastHeartbeatAtIso: string;
  currentRevision: number;
  status: 'in_progress';
  answers: AnswerMap;
  questions: PublicQuestion[];
  totalPossiblePointsMilli: number;
  passingScoreBasisPoints: number;
  serverTimeIso: string;
}

interface PublicSubmission {
  id: string;
  examId: string;
  title: string;
  assessmentStage: AssessmentStage;
  attemptCourseCode: string;
  attemptNumber: number;
  submittedAtIso: string;
  status: 'passed' | 'failed' | 'pending_review' | 'awaiting_release';
  totalPossiblePointsMilli: number;
  automaticallyEarnedPointsMilli: number;
  manuallyEarnedPointsMilli: number;
  preliminaryScoreBasisPoints: number;
  finalScoreBasisPoints: number | null;
  requiresManualReview: boolean;
  questionResults: Array<{
    questionId: string;
    pointsEarnedMilli: number;
    maxPointsMilli: number;
    requiresManualReview: boolean;
    correct?: boolean;
    explanation?: string;
  }>;
}

type SaveResponse = { attempt: { currentRevision: number }; saved: boolean; stale: boolean };
type SubmitResponse = { submission: PublicSubmission; expired: boolean; alreadySubmitted: boolean };

const cardClass = 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = buttonClass + ' academy-exam-primary-button bg-sky-600 text-white hover:bg-sky-500';
const secondaryButton = buttonClass + ' border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

function formatDuration(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatPoints(milli: number): string {
  return (milli / 1000).toLocaleString('de-DE', { maximumFractionDigits: 3 });
}

function answerCount(questions: PublicQuestion[], answers: AnswerMap): number {
  return questions.filter(question => {
    const answer = answers[question.id];
    if (answer === undefined || answer === null) return false;
    if (typeof answer === 'string') return answer.trim().length > 0;
    if (Array.isArray(answer)) return answer.length > 0;
    return typeof answer === 'boolean';
  }).length;
}

export const ExamParticipantRunner: React.FC = () => {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [attempt, setAttempt] = useState<PublicAttempt | null>(null);
  const [submission, setSubmission] = useState<PublicSubmission | null>(null);
  const [resultHistory, setResultHistory] = useState<PublicSubmission[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [runnerError, setRunnerError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const revisionRef = useRef(0);
  const answersRef = useRef<AnswerMap>({});
  const attemptRef = useRef<PublicAttempt | null>(null);
  const saveQueueRef = useRef<CoalescedRequestRunner | null>(null);
  if (!saveQueueRef.current) saveQueueRef.current = new CoalescedRequestRunner();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const autoSubmitRef = useRef(false);

  const selectedExam = catalog.find(exam => exam.id === selectedExamId) || null;
  const activeQuestion = attempt?.questions[currentQuestionIndex] || null;
  const answeredCount = attempt ? answerCount(attempt.questions, answers) : 0;
  const resultScore = submission?.finalScoreBasisPoints ?? submission?.preliminaryScoreBasisPoints ?? 0;

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setCatalogError('');
    const response = await apiFetch<{ exams: CatalogEntry[] }>(API_ENDPOINTS.ACADEMY_EXAM_CATALOG, {
      cache: 'no-store'
    });
    if (!response.ok || !response.data || !Array.isArray(response.data.exams)) {
      setCatalogError(response.error || 'Der Prüfungskatalog konnte nicht geladen werden.');
      setCatalog([]);
    } else {
      setCatalog(response.data.exams);
      setSelectedExamId(current => current && response.data!.exams.some(exam => exam.id === current)
        ? current
        : response.data!.exams[0]?.id || '');
    }
    setLoadingCatalog(false);
  }, []);

  const loadResultHistory = useCallback(async () => {
    const response = await apiFetch<{ results: PublicSubmission[] }>(API_ENDPOINTS.ACADEMY_EXAM_RESULTS, { cache: 'no-store' });
    if (response.ok && response.data && Array.isArray(response.data.results)) setResultHistory(response.data.results);
  }, []);

  useEffect(() => {
    void loadCatalog();
    void loadResultHistory();
  }, [loadCatalog, loadResultHistory]);

  const clearRunner = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    attemptRef.current = null;
    setAttempt(null);
    setSubmission(null);
    setAnswers({});
    answersRef.current = {};
    revisionRef.current = 0;
    setCurrentQuestionIndex(0);
    setRemainingSeconds(null);
    setRunnerError('');
    setSaveState('saved');
    submittingRef.current = false;
    autoSubmitRef.current = false;
  }, []);

  const applyAttempt = useCallback((next: PublicAttempt) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const restoredAnswers = next.answers || {};
    attemptRef.current = next;
    answersRef.current = restoredAnswers;
    revisionRef.current = next.currentRevision;
    setAttempt(next);
    setAnswers(restoredAnswers);
    setSubmission(null);
    setCurrentQuestionIndex(0);
    setServerOffsetMs(new Date(next.serverTimeIso).getTime() - Date.now());
    setSaveState('saved');
    setRunnerError('');
  }, []);

  const startOrResume = async () => {
    if (!selectedExam || !selectedCourseCode || starting) return;
    setStarting(true);
    setRunnerError('');
    const response = await apiFetch<{ attempt: PublicAttempt }>(
      API_ENDPOINTS.ACADEMY_EXAM_START(selectedExam.id),
      { method: 'POST', body: JSON.stringify({ attemptCourseCode: selectedCourseCode }) }
    );
    if (response.ok && response.data?.attempt) {
      applyAttempt(response.data.attempt);
    } else {
      setRunnerError(response.error || 'Die Prüfung konnte nicht gestartet werden.');
    }
    setStarting(false);
  };

  const saveAnswers = useCallback(async (allowDuringSubmit = false, keepalive = false): Promise<boolean> => {
    const current = attemptRef.current;
    if (!current || (submittingRef.current && !allowDuringSubmit)) return false;
    const snapshot = answersRef.current;
    const nextRevision = revisionRef.current + 1;
    setSaveState('saving');
    const response = await apiFetch<SaveResponse>(
      API_ENDPOINTS.ACADEMY_EXAM_AUTOSAVE(current.examId, current.id),
      {
        method: 'PUT',
        body: JSON.stringify({ revision: nextRevision, answers: snapshot }),
        keepalive
      }
    );
    if (response.ok && response.data?.attempt) {
      if (attemptRef.current?.id !== current.id) return false;
      revisionRef.current = Math.max(revisionRef.current, response.data.attempt.currentRevision);
      setSaveState('saved');
      return true;
    }
    setSaveState('error');
    if (response.status === 409 && response.data && (response.data as { expired?: boolean }).expired) {
      setRunnerError('Das Zeitlimit ist abgelaufen. Es wird ausschließlich dein letzter rechtzeitig gespeicherter Stand ausgewertet.');
      return false;
    }
    setRunnerError(response.error || 'Die Antworten konnten nicht gespeichert werden.');
    return false;
  }, []);

  const enqueueSave = useCallback(() => {
    const targetAttemptId = attemptRef.current?.id;
    if (!targetAttemptId || submittingRef.current) return Promise.resolve();
    // One active save plus at most one trailing save of the newest answer snapshot.
    return saveQueueRef.current!.run(async () => {
      if (attemptRef.current?.id !== targetAttemptId) return;
      await saveAnswers();
    });
  }, [saveAnswers]);

  const submitAttempt = useCallback(async (automatic = false) => {
    const current = attemptRef.current;
    if (!current || submittingRef.current || submission) return;
    submittingRef.current = true;
    setSubmitting(true);
    setRunnerError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;

    try {
      // Alle bereits ausgelösten Autosaves zuerst abarbeiten. Die Abgabe selbst akzeptiert
      // bewusst keine Antworten; ausgewertet wird ausschließlich der bestätigte Serverstand.
      await saveQueueRef.current!.waitForIdle().catch(() => undefined);
      if (!automatic) {
        const saved = await saveAnswers(true);
        if (!saved) {
          const latest = attemptRef.current;
          if (latest?.deadlineIso && Date.now() + serverOffsetMs >= new Date(latest.deadlineIso).getTime()) {
            automatic = true;
          } else {
            submittingRef.current = false;
            setSubmitting(false);
            return;
          }
        }
      }

      const response = await apiFetch<SubmitResponse>(
        API_ENDPOINTS.ACADEMY_EXAM_SUBMIT(current.examId, current.id),
        { method: 'POST', body: JSON.stringify({}) }
      );
      if ((response.ok || response.status === 409) && response.data?.submission) {
        setSubmission(response.data.submission);
        void loadResultHistory();
        attemptRef.current = null;
        setAttempt(null);
        setSaveState('saved');
      } else {
        setRunnerError(response.error || 'Die Prüfung konnte nicht abgegeben werden. Bitte versuche es erneut.');
        submittingRef.current = false;
        setSubmitting(false);
      }
    } catch {
      setRunnerError('Verbindungsfehler bei der Abgabe. Dein gespeicherter Prüfungsstand bleibt erhalten.');
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [loadResultHistory, saveAnswers, serverOffsetMs, submission]);

  const updateAnswer = (questionId: string, value: AnswerValue) => {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;
    setAnswers(next);
    setSaveState('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void enqueueSave(); }, 700);
  };

  // Regelmäßige Sicherung zusätzlich zur Eingabe-Debounce-Sicherung.
  useEffect(() => {
    if (!attempt) return;
    const interval = setInterval(() => {
      if (attemptRef.current && !submittingRef.current) void enqueueSave();
    }, 20_000);
    return () => clearInterval(interval);
  }, [attempt?.id, enqueueSave]);

  // Die Deadline wird anhand der Serverzeit berechnet, nicht anhand einer verstellbaren Client-Uhr.
  useEffect(() => {
    if (!attempt?.deadlineIso) {
      setRemainingSeconds(null);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((new Date(attempt.deadlineIso!).getTime() - (Date.now() + serverOffsetMs)) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        void submitAttempt(true);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [attempt?.id, attempt?.deadlineIso, serverOffsetMs, submitAttempt]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    if (!attemptRef.current || submittingRef.current) return;
    // Tabs/routes can unmount the runner before the input debounce fires. Drain earlier saves,
    // then send the latest in-memory answer snapshot as a keepalive request.
    void saveQueueRef.current!
      .waitForIdle()
      .catch(() => undefined)
      .then(() => saveAnswers(true, true));
  }, [saveAnswers]);

  const canStart = Boolean(selectedExam && selectedCourseCode && !starting);

  if (attempt) {
    const progressPercent = Math.round((answeredCount / Math.max(1, attempt.questions.length)) * 100);
    return (
      <div className="academy-exam-runner academy-exam-runner--attempt space-y-5">
        <div className={cardClass + ' academy-exam-attempt-card overflow-hidden'}>
          <div className="academy-exam-attempt-header flex flex-col gap-4 border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                {attempt.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Übungstest'} · {attempt.attemptCourseCode}
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{attempt.title}</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Versuch {attempt.attemptNumber} · {attempt.questions.length} Fragen · {answeredCount} beantwortet
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {saveState === 'saved' ? <Cloud className="h-4 w-4 text-emerald-600" /> : saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin text-sky-600" /> : <CloudOff className="h-4 w-4 text-rose-600" />}
                {saveState === 'saved' ? 'Gespeichert' : saveState === 'saving' ? 'Speichert …' : 'Speicherfehler'}
              </div>
              {remainingSeconds !== null && (
                <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm font-bold tabular-nums ${remainingSeconds <= 300 ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300' : 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white'}`}>
                  <Clock3 className="h-4 w-4" /> {formatDuration(remainingSeconds)}
                </div>
              )}
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800">
            <div className="h-full bg-sky-600 transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="academy-exam-question-nav space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fragenübersicht</div>
              <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
                {attempt.questions.map((question, index) => {
                  const value = answers[question.id];
                  const answered = value !== undefined && value !== null &&
                    (typeof value !== 'string' || value.trim().length > 0) &&
                    (!Array.isArray(value) || value.length > 0);
                  return (
                    <button key={question.id} type="button" disabled={submitting} onClick={() => {
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      debounceRef.current = null;
                      void enqueueSave();
                      setCurrentQuestionIndex(index);
                    }} className={`flex h-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${index === currentQuestionIndex ? 'border-sky-600 bg-sky-600 text-white' : answered ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                <div className="flex justify-between"><span>Fortschritt</span><strong>{answeredCount}/{attempt.questions.length}</strong></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </aside>
            <section className="academy-exam-question-panel min-w-0 space-y-5">
              {activeQuestion && (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Frage {currentQuestionIndex + 1} von {attempt.questions.length}</div>
                      <h3 className="mt-2 text-lg font-semibold leading-relaxed text-slate-900 dark:text-white">{activeQuestion.question}</h3>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{formatPoints(activeQuestion.pointsMilli)} Pkt.</span>
                  </div>
                  {activeQuestion.imageUrl && <img src={activeQuestion.imageUrl} alt="Abbildung zur Frage" className="max-h-80 max-w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700" />}
                  {activeQuestion.type === 'single_choice' && (
                    <div className="space-y-2">
                      {activeQuestion.options.map(option => (
                        <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${answers[activeQuestion.id] === option.id ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                          <input type="radio" name={activeQuestion.id} disabled={submitting} checked={answers[activeQuestion.id] === option.id} onChange={() => updateAnswer(activeQuestion.id, option.id)} className="mt-0.5 text-sky-600 focus:ring-sky-500" />
                          <span className="text-slate-800 dark:text-slate-200">{option.text}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {activeQuestion.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Mehrere Antworten können richtig sein.</p>
                      {activeQuestion.options.map(option => {
                        const selected = Array.isArray(answers[activeQuestion.id]) && (answers[activeQuestion.id] as string[]).includes(option.id);
                        return <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${selected ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                          <input type="checkbox" disabled={submitting} checked={selected} onChange={event => {
                            const current = Array.isArray(answersRef.current[activeQuestion.id]) ? answersRef.current[activeQuestion.id] as string[] : [];
                            updateAnswer(activeQuestion.id, event.target.checked ? [...current, option.id] : current.filter(id => id !== option.id));
                          }} className="mt-0.5 rounded text-sky-600 focus:ring-sky-500" />
                          <span className="text-slate-800 dark:text-slate-200">{option.text}</span>
                        </label>;
                      })}
                    </div>
                  )}
                  {activeQuestion.type === 'true_false' && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[{ value: true, label: 'Wahr' }, { value: false, label: 'Falsch' }].map(option => (
                        <label key={String(option.value)} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm font-medium ${answers[activeQuestion.id] === option.value ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40' : 'border-slate-200 dark:border-slate-700'}`}>
                          <input type="radio" name={activeQuestion.id} disabled={submitting} checked={answers[activeQuestion.id] === option.value} onChange={() => updateAnswer(activeQuestion.id, option.value)} />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  )}
                  {activeQuestion.type === 'matching' && (
                    <div className="space-y-3">
                      {activeQuestion.pairs.map(pair => {
                        const current = Array.isArray(answers[activeQuestion.id]) ? answers[activeQuestion.id] as Array<{ pairId: string; targetId: string }> : [];
                        const selectedTarget = current.find(entry => entry.pairId === pair.id)?.targetId || '';
                        const usedTargets = new Set(current.filter(entry => entry.pairId !== pair.id).map(entry => entry.targetId));
                        return <div key={pair.id} className="grid gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2 sm:items-center">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{pair.prompt}</span>
                          <select disabled={submitting} value={selectedTarget} onChange={event => {
                            const next = current.filter(entry => entry.pairId !== pair.id);
                            if (event.target.value) next.push({ pairId: pair.id, targetId: event.target.value });
                            updateAnswer(activeQuestion.id, next);
                          }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                            <option value="">Zuordnung wählen …</option>
                            {activeQuestion.targets.map(target => <option key={target.id} value={target.id} disabled={usedTargets.has(target.id)}>{target.text}</option>)}
                          </select>
                        </div>;
                      })}
                    </div>
                  )}
                  {activeQuestion.type === 'free_text' && (
                    <div className="space-y-2">
                      <textarea disabled={submitting} value={typeof answers[activeQuestion.id] === 'string' ? answers[activeQuestion.id] as string : ''} maxLength={activeQuestion.maxAnswerLength} rows={7} onChange={event => updateAnswer(activeQuestion.id, event.target.value)} placeholder="Deine Antwort …" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                      <div className="text-right text-xs text-slate-500">{typeof answers[activeQuestion.id] === 'string' ? (answers[activeQuestion.id] as string).length : 0}/{activeQuestion.maxAnswerLength} Zeichen · Manuelle Bewertung</div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <button type="button" disabled={submitting || currentQuestionIndex === 0} onClick={() => { if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = null; void enqueueSave(); setCurrentQuestionIndex(index => Math.max(0, index - 1)); }} className={secondaryButton}><ArrowLeft className="h-4 w-4" /> Zurück</button>
                    {currentQuestionIndex < attempt.questions.length - 1 ? (
                      <button type="button" disabled={submitting} onClick={() => { if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = null; void enqueueSave(); setCurrentQuestionIndex(index => Math.min(attempt.questions.length - 1, index + 1)); }} className={primaryButton}>Nächste Frage <ArrowRight className="h-4 w-4" /></button>
                    ) : (
                      <button type="button" disabled={submitting} onClick={() => void submitAttempt(false)} className={primaryButton}><Send className="h-4 w-4" /> Prüfung abgeben</button>
                    )}
                  </div>
                </>
              )}
              {runnerError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{runnerError}</div>}
              {submitting && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Abgabe wird verarbeitet …</div>}
            </section>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">Deine Antworten werden automatisch gespeichert. Bei einer Unterbrechung kannst du den Versuch fortsetzen.</p>
            <button type="button" disabled={submitting} onClick={() => void submitAttempt(false)} className={primaryButton}><Send className="h-4 w-4" /> Abgabe abschließen</button>
          </div>
        </div>
      </div>
    );
  }

  if (submission) {
    const passed = submission.status === 'passed';
    const pending = submission.status === 'pending_review';
    const awaitingRelease = submission.status === 'awaiting_release';
    return (
      <div className={cardClass + ' academy-exam-runner academy-exam-runner--result academy-exam-result-card space-y-5 p-5 sm:p-7'}>
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-3 ${pending || awaitingRelease ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
            {pending || awaitingRelease ? <Clock3 className="h-6 w-6" /> : passed ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prüfung abgeschlossen · {submission.attemptCourseCode}</div>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{submission.title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{awaitingRelease ? 'Deine Abgabe ist eingegangen. Das Bewertungsergebnis wird erst angezeigt, wenn es offiziell freigegeben wurde.' : pending ? 'Deine Antworten enthalten Freitext und werden von einem Ausbilder bewertet. Das endgültige Ergebnis folgt nach der Korrektur und Freigabe.' : passed ? 'Du hast die erforderliche Bestehensgrenze erreicht.' : 'Die erforderliche Bestehensgrenze wurde nicht erreicht.'}</p>
          </div>
        </div>
        {!awaitingRelease && <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950"><div className="text-xs text-slate-500">Ergebnis</div><div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{(resultScore / 100).toLocaleString('de-DE')}%</div></div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950"><div className="text-xs text-slate-500">Erreichte Punkte</div><div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatPoints(submission.automaticallyEarnedPointsMilli + submission.manuallyEarnedPointsMilli)} / {formatPoints(submission.totalPossiblePointsMilli)}</div></div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950"><div className="text-xs text-slate-500">Versuch</div><div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">#{submission.attemptNumber}</div></div>
        </div>
        }
        {!awaitingRelease && submission.assessmentStage === 'test' && submission.questionResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">Auswertung der Übungsfragen</h3>
            {submission.questionResults.map((result, index) => (
              <div key={result.questionId} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-200">Frage {index + 1}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{formatPoints(result.pointsEarnedMilli)} / {formatPoints(result.maxPointsMilli)} Pkt.</span>
                </div>
                {result.requiresManualReview && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Diese Antwort wartet auf manuelle Bewertung.</p>}
                {result.explanation && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{result.explanation}</p>}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => { clearRunner(); void loadCatalog(); }} className={primaryButton}><BookOpen className="h-4 w-4" /> Zur Prüfungsübersicht</button>
        </div>
      </div>
    );
  }

  return (
    <div className="academy-exam-runner academy-exam-runner--catalog space-y-5">
      <div className="academy-exam-heading flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">Academy · Prüfungszentrum</div>
          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Verfügbare Prüfungen</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Starte eine Prüfung oder setze einen begonnenen Versuch fort. Deine Antworten werden automatisch und revisionsgesichert gespeichert.</p>
        </div>
        <button type="button" onClick={() => void loadCatalog()} disabled={loadingCatalog} className={secondaryButton}><Loader2 className={`h-4 w-4 ${loadingCatalog ? 'animate-spin' : 'hidden'}`} /> Aktualisieren</button>
      </div>
      {catalogError && <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{catalogError}</div>}
      {resultHistory.length > 0 && <section className={cardClass + ' academy-exam-history space-y-3 p-5'}><div><h3 className="font-bold text-slate-900 dark:text-white">Deine Prüfungsergebnisse</h3><p className="mt-1 text-xs text-slate-500">Deine eigenen Abgaben. Bewertungsergebnisse werden erst nach offizieller Freigabe angezeigt.</p></div>{resultHistory.map(result => <div key={result.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800"><div><div className="font-semibold text-slate-800 dark:text-slate-200">{result.title} · {result.attemptCourseCode}</div><div className="text-xs text-slate-500">{new Date(result.submittedAtIso).toLocaleString('de-DE')} · Versuch {result.attemptNumber}</div></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${result.status === 'passed' ? 'bg-emerald-100 text-emerald-800' : result.status === 'pending_review' || result.status === 'awaiting_release' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{result.status === 'awaiting_release' ? 'Ergebnis noch nicht freigegeben' : result.status === 'passed' ? 'Bestanden' : result.status === 'pending_review' ? 'Bewertung offen' : 'Nicht bestanden'}{result.status !== 'awaiting_release' && result.finalScoreBasisPoints !== null ? ` · ${(result.finalScoreBasisPoints / 100).toLocaleString('de-DE')}%` : ''}</span></div>)}</section>}
      {loadingCatalog ? (
        <div className={cardClass + ' flex items-center justify-center gap-3 p-12 text-sm text-slate-500'}><Loader2 className="h-5 w-5 animate-spin" />Prüfungen werden geladen …</div>
      ) : catalog.length === 0 ? (
        <div className={cardClass + ' academy-exam-empty space-y-2 p-10 text-center'}>
          <ShieldCheck className="mx-auto h-9 w-9 text-sky-600" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Derzeit keine Prüfungen verfügbar</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sobald eine Prüfung veröffentlicht und für deine Freigabestufe verfügbar ist, erscheint sie hier.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            {catalog.map(exam => (
              <button key={exam.id} type="button" onClick={() => {
                setSelectedExamId(exam.id);
                setSelectedCourseCode(exam.assignedCourseCodes[0] || '');
                setRunnerError('');
              }} aria-pressed={selectedExamId === exam.id}
                className={`academy-exam-option w-full rounded-xl border p-4 text-left transition-colors ${selectedExamId === exam.id ? 'border-sky-500 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{exam.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Übungstest'} · Version {exam.versionNumber}</div>
                    <h3 className="mt-1 font-semibold text-slate-900 dark:text-white">{exam.title}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{exam.assignedCourseCodes.join(' · ')} · {exam.timeLimitMinutes === 0 ? 'Ohne Zeitlimit' : `${exam.timeLimitMinutes} Minuten`} · Bestehensgrenze {(exam.passingScoreBasisPoints / 100).toLocaleString('de-DE')}%</p>
                  </div>
                  {selectedExamId === exam.id && <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600" />}
                </div>
                {exam.prerequisites.length > 0 && <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300"><LockKeyhole className="h-3.5 w-3.5" />Voraussetzungen werden beim Start geprüft.</div>}
              </button>
            ))}
          </div>
          <aside className={cardClass + ' academy-exam-selection-panel h-fit space-y-4 p-5'}>
            {selectedExam ? (
              <>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">Ausgewählte Prüfung</div>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{selectedExam.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedExam.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Übungstest'}</p>
                </div>
                <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between gap-2"><span>Maximale Versuche</span><strong>{selectedExam.maxAttempts === null ? 'Unbegrenzt' : selectedExam.maxAttempts}</strong></div>
                  <div className="flex justify-between gap-2"><span>Bestehensgrenze</span><strong>{(selectedExam.passingScoreBasisPoints / 100).toLocaleString('de-DE')}%</strong></div>
                  <div className="flex justify-between gap-2"><span>Freigabestufe</span><strong>{selectedExam.minClearance}</strong></div>
                </div>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Kurskontext</span>
                  <select value={selectedCourseCode} onChange={event => setSelectedCourseCode(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                    {selectedExam.assignedCourseCodes.map(code => <option key={code} value={code}>{code}</option>)}
                  </select>
                </label>
                <button type="button" disabled={!canStart} onClick={() => void startOrResume()} className={primaryButton + ' w-full'}>{starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{starting ? 'Wird vorbereitet …' : 'Prüfung starten / fortsetzen'}</button>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Voraussetzungen, tatsächliche Startberechtigung und verbleibende Versuche werden bei jedem Start verbindlich auf dem Server geprüft.</p>
              </>
            ) : <p className="text-sm text-slate-500">Wähle eine Prüfung aus der Liste.</p>}
          </aside>
        </div>
      )}
      {runnerError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{runnerError}</div>}
    </div>
  );
};
