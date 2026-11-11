import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock3, X } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import type { UserPublicProfile } from '../types/portal';

interface ClaimHistoryEvent {
  action: string;
  actorName?: string | null;
  targetName?: string | null;
  previousName?: string | null;
  reason?: string;
  atIso: string;
}

interface ReviewQuestion {
  questionId: string;
  question: string;
  answer: string;
  pointsMilli: number;
  gradingRubric: string;
  pointsEarnedMilli?: number;
}

interface ParticipantHistoryItem {
  id: string;
  examId: string;
  examTitle: string;
  courseCode: string;
  submittedAtIso: string;
  assessmentStage: 'test' | 'final_exam';
  status: 'pending_review' | 'passed' | 'failed' | 'invalidated_by_admin';
  responsibleReviewerUid: string | null;
  responsibleReviewerName: string | null;
  reviewedAtIso: string | null;
  detailed: boolean;
  claimHistory?: ClaimHistoryEvent[];
  reviewCorrections?: Array<Record<string, unknown>>;
  questions?: ReviewQuestion[];
}

const dateLabel = (value: string | null | undefined) => {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Nicht dokumentiert';
  return new Date(value).toLocaleString('de-DE');
};

const statusLabel: Record<ParticipantHistoryItem['status'], string> = {
  pending_review: 'Bewertung ausstehend',
  passed: 'Bestanden',
  failed: 'Nicht bestanden',
  invalidated_by_admin: 'Administrativ ungültig'
};

const actionLabel: Record<string, string> = {
  claimed: 'Prüfungsvorgang übernommen',
  reclaimed: 'Prüfungsvorgang erneut übernommen',
  released: 'Zuständigkeit freigegeben',
  auto_released: 'Zuständigkeit automatisch freigegeben',
  warning_started: 'Inaktivitätswarnung gestartet',
  transferred: 'An anderen Prüfer übergeben',
  reassigned: 'Administrativ neu zugewiesen'
};

export const ExamParticipantRecord: React.FC<{
  participant: UserPublicProfile;
  onClose: () => void;
}> = ({ participant, onClose }) => {
  const [history, setHistory] = useState<ParticipantHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setHistory([]);
    void apiFetch<{ history: ParticipantHistoryItem[] }>(
      API_ENDPOINTS.ACADEMY_EXAM_PARTICIPANT_HISTORY(participant.uid),
      { cache: 'no-store' }
    ).then(response => {
      if (!active) return;
      if (!response.ok || !response.data) {
        setError(response.error || 'Die Teilnehmerhistorie konnte nicht geladen werden.');
        return;
      }
      setHistory(response.data.history);
    }).catch(() => {
      if (active) setError('Die Teilnehmerhistorie konnte nicht geladen werden.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [participant.uid]);

  return <section aria-labelledby="exam-participant-record-title" className="mb-5 space-y-4 rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zentrale Teilnehmerakte · Prüfungen</p>
        <h3 id="exam-participant-record-title" className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{participant.displayName}</h3>
        <p className="mt-1 text-sm text-slate-500">{participant.badgeNumber} · {participant.callsign} · {participant.rank}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Teilnehmerakte schließen" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
        <X size={16}/> Schließen
      </button>
    </header>

    {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={17} className="mt-0.5 shrink-0"/>{error}</div>}
    {loading ? <p role="status" className="py-6 text-center text-sm text-slate-500">Prüfungshistorie wird geladen …</p>
      : !error && history.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">Für die dir zugewiesenen Kurse liegen keine einsehbaren Prüfungsvorgänge vor.</p>
      : <div className="space-y-3">
        {history.map(item => <article key={item.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">{item.examTitle}</h4>
              <p className="mt-1 text-xs text-slate-500">{item.courseCode} · {item.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Wissenstest'} · Eingereicht: {dateLabel(item.submittedAtIso)}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{statusLabel[item.status]}</span>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-slate-500">Verantwortlicher Prüfer</dt><dd className="font-medium text-slate-800 dark:text-slate-200">{item.responsibleReviewerName || (item.responsibleReviewerUid ? 'Zuständigkeit dokumentiert' : 'Noch nicht zugewiesen')}</dd></div>
            {item.detailed && <div><dt className="text-xs text-slate-500">Bewertung abgeschlossen</dt><dd className="font-medium text-slate-800 dark:text-slate-200">{dateLabel(item.reviewedAtIso)}</dd></div>}
          </dl>

          {!item.detailed && <p className="mt-3 text-xs text-slate-500">Aus Datenschutzgründen werden dir hier nur Status und aktuelle Zuständigkeit angezeigt.</p>}

          {item.detailed && item.claimHistory && item.claimHistory.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <h5 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Prüfer- und Übergabehistorie</h5>
            <ol className="space-y-2">
              {item.claimHistory.map((event, index) => <li key={index} className="flex gap-2 text-xs">
                <Clock3 size={14} className="mt-0.5 shrink-0 text-slate-400"/>
                <div><span className="font-semibold text-slate-700 dark:text-slate-200">{actionLabel[event.action] || 'Prüfungsvorgang aktualisiert'}</span><span className="text-slate-500"> · {dateLabel(event.atIso)}</span>
                  <p className="mt-0.5 text-slate-500">{event.actorName || 'System'}{event.targetName ? ` → ${event.targetName}` : ''}{event.previousName ? ` (zuvor: ${event.previousName})` : ''}{event.reason ? ` · Grund: ${event.reason}` : ''}</p>
                </div>
              </li>)}
            </ol>
          </div>}

          {item.detailed && item.questions && item.questions.length > 0 && <div className="mt-4 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Manuelle Bewertungsdetails</h5>
            {item.questions.map((question, index) => <div key={question.questionId} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Frage {index + 1}: {question.question}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{question.answer}</p>
              {question.gradingRubric && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">Bewertungsrubrik: {question.gradingRubric}</p>}
              {typeof question.pointsEarnedMilli === 'number' && <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Bewertung: {(question.pointsEarnedMilli / 1000).toLocaleString('de-DE')} / {(question.pointsMilli / 1000).toLocaleString('de-DE')} Punkte</p>}
            </div>)}
          </div>}

          {item.detailed && item.reviewCorrections && item.reviewCorrections.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <h5 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Nachträgliche Korrekturen</h5>
            <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {item.reviewCorrections.map((correction, index) => <li key={index} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                <p className="font-semibold">{String(correction.reason || 'Korrektur')}</p>
                <p className="mt-1 text-slate-500">{dateLabel(String(correction.atIso || ''))} · Prüferkennung: {String(correction.reviewerUid || 'Nicht dokumentiert')}</p>
              </li>)}
            </ol>
          </div>}
        </article>)}
      </div>}
  </section>;
};
