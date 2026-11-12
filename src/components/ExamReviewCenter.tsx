import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Search } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import { parseManualReviewGrades } from '../lib/examReviewGrades';
import type { UserPublicProfile } from '../types/portal';
import './ExamReviewCenter.css';
import { ExamParticipantRecord } from './ExamParticipantRecord';

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
  revisionRequest: {
    requestedByUid: string;
    requestedAtIso: string;
    previousReviewerUid: string | null;
    reason: string;
    feedback: Array<{ questionId: string; feedback: string }>;
  } | null;
}

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

function canReviewCourse(member: UserPublicProfile, courseCode: string): boolean {
  if (['pending', 'suspended', 'revoked'].includes(member.whitelistStatus)) return false;
  if (member.role === 'admin' || member.role === 'colonel') return true;
  const permissions = member.granularPermissions;
  return Boolean(permissions?.canGradeAssignedCourses &&
    (permissions.assignedCourseCodes.includes('*') || permissions.assignedCourseCodes.includes(courseCode)));
}

function warningMinutesRemaining(claim: ReviewClaim): number {
  if (!claim.warningStartedAtIso) return 0;
  return Math.max(0, Math.ceil((Date.parse(claim.warningStartedAtIso) + 10 * 60_000 - Date.now()) / 60_000));
}

export const ExamReviewCenter: React.FC<{
  currentUser: UserPublicProfile;
  roster: UserPublicProfile[];
  initialAttemptId?: string | null;
}> = ({ currentUser, roster, initialAttemptId }) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draftSaveStatus, setDraftSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [releaseDialogId, setReleaseDialogId] = useState('');
  const [transferDialog, setTransferDialog] = useState<{ review: ReviewItem; mode: 'transfer' | 'reassign' } | null>(null);
  const [transferTargetUid, setTransferTargetUid] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [participantQuery, setParticipantQuery] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<UserPublicProfile | null>(null);
  const isSupervisor = currentUser.role === 'admin' || currentUser.role === 'colonel';
  const activityTimers = useRef<Record<string, number>>({});
  const draftSaveTimers = useRef<Record<string, number>>({});
  const pendingDrafts = useRef<Record<string, { review: ReviewItem; question: ReviewQuestion; value: string }>>({});
  const inFlightDraftSaves = useRef<Record<string, { pending: { review: ReviewItem; question: ReviewQuestion; value: string }; promise: Promise<boolean> }>>({});
  const reviewsRef = useRef<ReviewItem[]>([]);
  const scrolledTargetRef = useRef<string | null>(null);
  const transferTriggerRef = useRef<HTMLButtonElement | null>(null);
  const releaseTriggerRef = useRef<HTMLButtonElement | null>(null);
  const transferDialogHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const releaseDialogHeadingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    if (transferDialog) transferDialogHeadingRef.current?.focus();
    else transferTriggerRef.current?.focus();
  }, [transferDialog]);
  useEffect(() => {
    if (releaseDialogId) releaseDialogHeadingRef.current?.focus();
    else releaseTriggerRef.current?.focus();
  }, [releaseDialogId]);
  useEffect(() => {
    if (!initialAttemptId || loading || scrolledTargetRef.current === initialAttemptId) return;
    const target = document.getElementById(`exam-review-${initialAttemptId}`);
    if (target) {
      target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      scrolledTargetRef.current = initialAttemptId;
    }
  }, [initialAttemptId, loading, reviews]);

  const load = useCallback(async () => {
    const response = await apiFetch<{ reviews: ReviewItem[] }>(API_ENDPOINTS.ACADEMY_EXAM_REVIEWS, { cache: 'no-store' });
    if (!response.ok || !response.data) {
      setError(response.error || 'Die offenen Freitextbewertungen konnten nicht geladen werden.');
      reviewsRef.current = [];
      setReviews([]);
    } else {
      setError('');
      const previousReviews = reviewsRef.current;
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

  const openTransferDialog = (review: ReviewItem, mode: 'transfer' | 'reassign') => {
    const currentOwnerName = review.reviewClaim?.reviewerName;
    const candidates = roster.filter(member =>
      canReviewCourse(member, review.attemptCourseCode) &&
      (mode === 'transfer'
        ? member.uid !== currentUser.uid
        : member.displayName !== currentOwnerName)
    );
    setTransferDialog({ review, mode });
    setTransferTargetUid(candidates[0]?.uid || '');
    setTransferReason('');
    setError('');
  };

  const submitTransfer = async (savePendingDrafts: boolean) => {
    if (!transferDialog) return;
    const { review, mode } = transferDialog;
    if (!transferTargetUid) {
      setError('Für diesen Kurs wurde kein anderer berechtigter Prüfer gefunden.');
      return;
    }
    if (mode === 'transfer' && savePendingDrafts && !(await flushDraftSaves(review))) return;
    if (mode === 'transfer' && !savePendingDrafts) discardPendingDraftSaves(review);
    setSavingId(review.id);
    setError('');
    setNotice('');
    const response = await apiFetch(
      mode === 'transfer'
        ? API_ENDPOINTS.ACADEMY_EXAM_REVIEW_TRANSFER(review.examId, review.id)
        : API_ENDPOINTS.ACADEMY_EXAM_REVIEW_REASSIGN(review.examId, review.id),
      { method: 'POST', body: JSON.stringify({ targetUid: transferTargetUid, reason: transferReason.trim() }) }
    );
    setSavingId('');
    if (!response.ok) {
      setError(response.error || 'Der Prüfungsvorgang konnte nicht übergeben werden.');
      return;
    }
    setTransferDialog(null);
    setNotice(mode === 'transfer'
      ? 'Der Prüfungsvorgang wurde übergeben. Deine Schreibrechte sind beendet.'
      : 'Der Prüfungsvorgang wurde administrativ neu zugewiesen.');
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

  const normalizedParticipantQuery = participantQuery.trim().toLocaleLowerCase('de-DE');
  const participantMatches = normalizedParticipantQuery.length < 2 || selectedParticipant
    ? []
    : roster.filter(member => member.uid !== currentUser.uid && [
        member.displayName, member.badgeNumber, member.callsign, member.rank
      ].some(value => value.toLocaleLowerCase('de-DE').includes(normalizedParticipantQuery))).slice(0, 8);

  return <section className="exam-review-center space-y-5">
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Search size={17} className="shrink-0 text-slate-400"/>
        <label htmlFor="exam-participant-search" className="text-sm font-semibold text-slate-800 dark:text-slate-200">Teilnehmerakte öffnen</label>
      </div>
      <input
        id="exam-participant-search"
        type="search"
        value={participantQuery}
        onChange={event => { setParticipantQuery(event.target.value); setSelectedParticipant(null); }}
        placeholder="Name, Badge oder Callsign suchen …"
        autoComplete="off"
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
      {participantMatches.length > 0 && <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
        {participantMatches.map(member => <li key={member.uid}>
          <button type="button" onClick={() => { setSelectedParticipant(member); setParticipantQuery(member.displayName); }} className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
            <span className="font-medium text-slate-800 dark:text-slate-200">{member.displayName}</span>
            <span className="text-xs text-slate-500">{member.badgeNumber} · {member.callsign}</span>
          </button>
        </li>)}
      </ul>}
      {normalizedParticipantQuery.length >= 2 && !selectedParticipant && participantMatches.length === 0 && <p className="mt-2 text-xs text-slate-500">Keine passenden Teilnehmer im Verzeichnis gefunden.</p>}
    </div>
    {selectedParticipant && <ExamParticipantRecord participant={selectedParticipant} onClose={() => { setSelectedParticipant(null); setParticipantQuery(''); }}/>}

    <div className="exam-review-heading flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900 dark:text-white">Offene Freitextbewertungen</h2><p className="mt-1 text-sm text-slate-500">Das Öffnen beansprucht einen Vorgang nicht. Zum Bearbeiten muss er ausdrücklich übernommen werden.</p></div><button type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading || Boolean(savingId)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700">Aktualisieren</button></div>
    {error && <div role="alert" className="flex gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={17}/>{error}</div>}
    {notice && <div role="status" className="flex gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17}/>{notice}</div>}
    {loading ? <div className="p-8 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={17}/>Bewertungen werden geladen …</div> : reviews.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Keine offenen Freitextbewertungen.</div> : reviews.map(review => <article id={`exam-review-${review.id}`} key={review.id} className="exam-review-card space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <header className="exam-review-card-heading flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-slate-900 dark:text-white">{review.examTitle}</h3><p className="text-xs text-slate-500">{review.userName} · {review.attemptCourseCode} · {new Date(review.submittedAtIso).toLocaleString('de-DE')}</p></div>
        {review.reviewClaim ? <div className="exam-review-claim-actions text-right text-xs text-slate-500"><p>{review.isClaimOwner ? 'Dir zugewiesen' : review.reviewClaim.isDisconnected ? 'Dein vorheriger Claim ist unterbrochen' : `In Bearbeitung durch ${review.reviewClaim.reviewerName}`}</p>{review.isClaimOwner && <><button type="button" disabled={Boolean(savingId)} onClick={event => { transferTriggerRef.current = event.currentTarget; openTransferDialog(review, 'transfer'); }} className="mt-1 mr-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold dark:border-slate-700">Übergeben</button><button type="button" disabled={Boolean(savingId) || hasDraftSaveInFlight(review.id)} onClick={event => { releaseTriggerRef.current = event.currentTarget; setReleaseDialogId(review.id); }} className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold dark:border-slate-700">Vorgang freigeben</button></>}{isSupervisor && review.reviewClaim && !review.isClaimOwner && <button type="button" disabled={Boolean(savingId)} onClick={event => { transferTriggerRef.current = event.currentTarget; openTransferDialog(review, 'reassign'); }} className="mt-1 rounded-lg border border-amber-400 px-3 py-1.5 font-semibold text-amber-800 dark:text-amber-300">Administrativ neu zuweisen</button>}{review.canClaim && <button type="button" disabled={Boolean(savingId)} onClick={() => void claimOrRelease(review, 'claim')} className="mt-1 rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50">{savingId === review.id ? 'Bitte warten …' : review.reviewClaim.isDisconnected ? 'Erneut beanspruchen' : 'Vorgang beanspruchen'}</button>}</div>
          : <button type="button" disabled={Boolean(savingId)} onClick={() => void claimOrRelease(review, 'claim')} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === review.id ? 'Bitte warten …' : 'Vorgang beanspruchen'}</button>}
      </header>
      {review.revisionRequest && <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100" aria-label="Revisionsanfrage">
        <h4 className="font-semibold">Zur Revision zurückgegeben</h4>
        <p className="mt-1"><span className="font-semibold">Begründung:</span> {review.revisionRequest.reason}</p>
        <p className="mt-1 text-xs opacity-80">Angefordert am {new Date(review.revisionRequest.requestedAtIso).toLocaleString('de-DE')}</p>
        <ul className="mt-3 space-y-2 border-t border-amber-300/70 pt-3 dark:border-amber-800">
          {review.revisionRequest.feedback.map(item => {
            const index = review.questions.findIndex(question => question.questionId === item.questionId);
            return <li key={item.questionId}>
              <p className="font-semibold">{index >= 0 ? `Frage ${index + 1}` : 'Bewertungsschritt'}</p>
              <p className="mt-0.5 whitespace-pre-wrap">{item.feedback}</p>
            </li>;
          })}
        </ul>
      </section>}
      {review.reviewClaim?.warningStartedAtIso && review.isClaimOwner && <p role="status" className="exam-review-warning rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Wegen Inaktivität läuft die Freigabewarnung. Noch ca. {warningMinutesRemaining(review.reviewClaim)} Minuten bis zur automatischen Freigabe. Eine tatsächliche Bearbeitungsaktion setzt die Frist zurück.</p>}
      <div className="exam-review-workspace">
        <div className="exam-review-primary">
          {review.reviewClaim && !review.isClaimOwner
            ? <p className="exam-review-locked rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">Die vertraulichen Antwort- und Bewertungsinhalte sind während der Bearbeitung durch einen anderen Prüfer ausgeblendet.</p>
            : <div className="exam-review-questions">{review.questions.map((question, index) => <div key={question.questionId} className="exam-review-question grid gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:grid-cols-[1fr_180px]"><div className="exam-review-question-copy space-y-2"><h4 className="text-sm font-semibold">Frage {index + 1}: {question.question}</h4><p onClick={() => { if (review.isClaimOwner) recordActivity(review); }} className="exam-review-answer whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">{question.answer}</p>{question.gradingRubric && <p className="exam-review-rubric whitespace-pre-wrap text-xs text-slate-500">Rubrik: {question.gradingRubric}</p>}</div><label className="exam-review-score text-xs font-medium text-slate-600 dark:text-slate-300">Punkte / {question.pointsMilli / 1000}<input className={fieldClass + ' mt-1'} type="number" disabled={!review.isClaimOwner || savingId === review.id} min={0} max={question.pointsMilli / 1000} step="0.001" value={grades[review.id]?.[question.questionId] ?? ''} onFocus={() => { if (review.isClaimOwner) recordActivity(review); }} onChange={event => { const value = event.target.value; setGrades(current => ({ ...current, [review.id]: { ...current[review.id], [question.questionId]: value } })); if (review.isClaimOwner) scheduleDraftSave(review, question, value); }}/></label></div>)}</div>}
        </div>
        <aside className="exam-review-context" aria-label="Kontext zum Prüfungsvorgang">
          <details>
            <summary>Vorgangskontext</summary>
            <dl>
              <div><dt>Teilnehmer</dt><dd>{review.userName}</dd></div>
              <div><dt>Kurskennung</dt><dd>{review.attemptCourseCode}</dd></div>
              <div><dt>Eingereicht</dt><dd>{new Date(review.submittedAtIso).toLocaleString('de-DE')}</dd></div>
              <div><dt>Freitextfragen</dt><dd>{review.questions.length}</dd></div>
              <div><dt>Zuständigkeit</dt><dd>{review.isClaimOwner ? 'Dir zugewiesen' : review.reviewClaim ? review.reviewClaim.isDisconnected ? 'Verbindung unterbrochen' : 'In Bearbeitung durch ' + review.reviewClaim.reviewerName : 'Noch nicht übernommen'}</dd></div>
              {review.reviewClaim && <div><dt>Übernommen</dt><dd>{new Date(review.reviewClaim.claimedAtIso).toLocaleString('de-DE')}</dd></div>}
            </dl>
          </details>
        </aside>
      </div>
      {review.isClaimOwner && <div className="exam-review-footer flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"><p className="text-xs text-slate-500">{draftSaveStatus[review.id] === 'saving' ? 'Bewertungsentwurf wird gespeichert …' : draftSaveStatus[review.id] === 'saved' ? 'Entwurf gespeichert' : draftSaveStatus[review.id] === 'error' ? 'Entwurf konnte nicht gespeichert werden' : 'Änderungen werden automatisch als Entwurf gespeichert.'}</p><button type="button" disabled={Boolean(savingId)} onClick={() => void submit(review)} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === review.id ? 'Speichert …' : 'Bewertung abschließen'}</button></div>}
      {transferDialog?.review.id === review.id && <section role="region" aria-labelledby="exam-review-transfer-heading" className="exam-review-dialog space-y-3 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm text-sky-950">
        <h4 ref={transferDialogHeadingRef} tabIndex={-1} id="exam-review-transfer-heading" className="font-semibold outline-none">{transferDialog.mode === 'transfer' ? 'Vorgang an einen anderen Prüfer übergeben' : 'Zuständigkeit administrativ neu zuweisen'}</h4>
        <p className="text-xs">Gespeicherte Bewertungsentwürfe bleiben erhalten. Nicht gespeicherte Eingaben werden nicht übertragen.</p>
        <label className="block text-xs font-semibold">Neuer Verantwortlicher
          <select value={transferTargetUid} onChange={event => setTransferTargetUid(event.target.value)} className={fieldClass + ' mt-1'}>
            <option value="">Prüfer auswählen …</option>
            {roster.filter(member =>
              canReviewCourse(member, review.attemptCourseCode) &&
              (transferDialog.mode === 'transfer'
                ? member.uid !== currentUser.uid
                : member.displayName !== review.reviewClaim?.reviewerName)
            ).map(member => <option key={member.uid} value={member.uid}>{member.displayName} · {member.role.toUpperCase()}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold">Grund (optional)
          <textarea value={transferReason} onChange={event => setTransferReason(event.target.value)} maxLength={500} rows={2} className={fieldClass + ' mt-1'} placeholder="Kurze Begründung für die Übergabe …" />
        </label>
        <div className="flex flex-wrap gap-2">
          {transferDialog.mode === 'transfer'
            ? <><button type="button" disabled={Boolean(savingId) || !transferTargetUid} onClick={() => void submitTransfer(true)} className="rounded-lg bg-sky-700 px-3 py-2 font-semibold text-white disabled:opacity-50">Draft speichern und übergeben</button><button type="button" disabled={Boolean(savingId) || !transferTargetUid || hasDraftSaveInFlight(review.id)} onClick={() => void submitTransfer(false)} className="rounded-lg border border-sky-600 px-3 py-2 font-semibold">Übergeben und ungespeicherte Eingaben verwerfen</button></>
            : <button type="button" disabled={Boolean(savingId) || !transferTargetUid} onClick={() => void submitTransfer(false)} className="rounded-lg bg-amber-700 px-3 py-2 font-semibold text-white disabled:opacity-50">Neu zuweisen</button>}
          <button type="button" disabled={Boolean(savingId)} onClick={() => setTransferDialog(null)} className="rounded-lg border border-sky-600 px-3 py-2">Abbrechen</button>
        </div>
      </section>}
      {releaseDialogId === review.id && <section role="region" aria-labelledby="exam-review-release-heading" className="exam-review-dialog space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><h4 ref={releaseDialogHeadingRef} tabIndex={-1} id="exam-review-release-heading" className="font-semibold outline-none">Was soll mit noch nicht gespeicherten Eingaben geschehen?</h4><div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(savingId)} onClick={async () => { const saved = await flushDraftSaves(review); if (saved) { setReleaseDialogId(''); setNotice('Entwurf gespeichert. Du bleibst für den Vorgang zuständig.'); } }} className="rounded-lg border border-amber-500 px-3 py-2 font-semibold">Zurück und speichern</button><button type="button" disabled={Boolean(savingId) || hasDraftSaveInFlight(review.id)} onClick={async () => { discardPendingDraftSaves(review); setReleaseDialogId(''); await claimOrRelease(review, 'release'); }} className="rounded-lg bg-amber-800 px-3 py-2 font-semibold text-white">Freigeben und ungespeicherte Änderungen verwerfen</button><button type="button" onClick={() => setReleaseDialogId('')} className="rounded-lg border border-amber-500 px-3 py-2">Abbrechen</button></div></section>}
    </article>)}
  </section>;
};
