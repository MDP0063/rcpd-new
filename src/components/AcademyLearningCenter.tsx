import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import type {
  AcademyCourseMasterDoc,
  AcademyCourseVersionDoc,
  AcademyCourseDraftDoc,
  AcademyProgramMasterDoc,
  AcademyProgramVersionDoc,
  AcademyProgramDraftDoc,
  AcademyCourseParticipationDoc,
  AcademyProgramParticipationDoc,
  AcademyProgressEvidenceDoc,
  AcademyCompletionCorrectionDoc,
  AcademyPrivateNoteDoc
} from '../types/academy';
import type { UserPublicProfile } from '../types/portal';

interface Props {
  currentUser: UserPublicProfile;
  area: 'courses' | 'notes';
  onStatusToast: (message: string) => void;
}

interface CourseEntry {
  master: AcademyCourseMasterDoc;
  version: AcademyCourseVersionDoc | null;
  draft?: AcademyCourseDraftDoc | null;
}
interface ProgramEntry {
  master: AcademyProgramMasterDoc;
  version: AcademyProgramVersionDoc | null;
  draft?: AcademyProgramDraftDoc | null;
}
interface CourseParticipationDetail {
  participation: AcademyCourseParticipationDoc;
  version: AcademyCourseVersionDoc;
  evidence: AcademyProgressEvidenceDoc[];
  corrections: AcademyCompletionCorrectionDoc[];
}
interface ProgramCourseProgress {
  pin: AcademyProgramParticipationDoc['requiredCoursePins'][number];
  version: AcademyCourseVersionDoc;
  participation: AcademyCourseParticipationDoc | null;
}
interface ProgramParticipationDetail {
  participation: AcademyProgramParticipationDoc;
  version: AcademyProgramVersionDoc;
  requiredCourses: ProgramCourseProgress[];
  progress: {
    requiredCourseCount: number;
    startedRequiredCourseCount: number;
    completedRequiredCourseCount: number;
    completionPercentage: number;
    status: 'not_started' | 'in_progress' | 'completed';
  };
}
type Screen = 'catalog' | 'course' | 'program';

const panel = 'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const muted = 'text-sm text-slate-600 dark:text-slate-300';
const field = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const primary = 'inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const secondary = 'inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';

function statusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Abgeschlossen';
    case 'in_progress': return 'In Bearbeitung';
    case 'not_started': return 'Nicht begonnen';
    case 'voluntarily_ended': return 'Freiwillig beendet';
    case 'administratively_ended': return 'Administrativ beendet';
    default: return status;
  }
}
function dateLabel(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(date);
}

export const AcademyLearningCenter: React.FC<Props> = ({ currentUser, area, onStatusToast }) => {
  const [screen, setScreen] = useState<Screen>('catalog');
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const [programs, setPrograms] = useState<ProgramEntry[]>([]);
  const [courseParticipations, setCourseParticipations] = useState<AcademyCourseParticipationDoc[]>([]);
  const [programParticipations, setProgramParticipations] = useState<AcademyProgramParticipationDoc[]>([]);
  const [programDetails, setProgramDetails] = useState<ProgramParticipationDetail[]>([]);
  const [notes, setNotes] = useState<AcademyPrivateNoteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseEntry | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseParticipationDetail | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<ProgramEntry | null>(null);
  const [programDetail, setProgramDetail] = useState<ProgramParticipationDetail | null>(null);
  const [search, setSearch] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [editingNote, setEditingNote] = useState<AcademyPrivateNoteDoc | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('');

  const canCreate = currentUser.role === 'admin' || currentUser.role === 'colonel';
  const ownCourseParticipationByCourse = useMemo(
    () => new Map<string, AcademyCourseParticipationDoc>(courseParticipations.map(item => [item.courseId, item] as const)),
    [courseParticipations]
  );
  const programPinByCourse = useMemo(() => {
    const map = new Map<string, ProgramCourseProgress[]>();
    for (const detail of programDetails) {
      for (const item of detail.requiredCourses) {
        map.set(item.pin.courseId, [...(map.get(item.pin.courseId) || []), item]);
      }
    }
    return map;
  }, [programDetails]);

  const loadLearningData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [courseResponse, programResponse, courseParticipationResponse, programParticipationResponse] = await Promise.all([
        apiFetch<{ courses: CourseEntry[] }>(API_ENDPOINTS.ACADEMY_COURSES),
        apiFetch<{ programs: ProgramEntry[] }>(API_ENDPOINTS.ACADEMY_PROGRAMS),
        apiFetch<{ participations: AcademyCourseParticipationDoc[] }>(API_ENDPOINTS.ACADEMY_COURSE_PARTICIPATIONS),
        apiFetch<{ participations: AcademyProgramParticipationDoc[] }>(API_ENDPOINTS.ACADEMY_PROGRAM_PARTICIPATIONS)
      ]);
      const failed = [courseResponse, programResponse, courseParticipationResponse, programParticipationResponse].find(item => !item.ok || !item.data);
      if (failed) throw new Error(failed.error || 'Academy-Daten konnten nicht geladen werden.');
      const nextCourses = courseResponse.data!.courses;
      const nextPrograms = programResponse.data!.programs;
      const nextCourseParticipations = courseParticipationResponse.data!.participations;
      const nextProgramParticipations = programParticipationResponse.data!.participations;
      const detailsResponse = await Promise.all(nextProgramParticipations.map(item =>
        apiFetch<ProgramParticipationDetail>(API_ENDPOINTS.ACADEMY_PROGRAM_PARTICIPATION(item.id))
      ));
      const failedDetail = detailsResponse.find(item => !item.ok || !item.data);
      if (failedDetail) throw new Error(failedDetail.error || 'Programmfortschritt konnte nicht geladen werden.');
      setCourses(nextCourses);
      setPrograms(nextPrograms);
      setCourseParticipations(nextCourseParticipations);
      setProgramParticipations(nextProgramParticipations);
      setProgramDetails(detailsResponse.map(item => item.data!));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Academy-Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const response = await apiFetch<{ notes: AcademyPrivateNoteDoc[] }>(API_ENDPOINTS.ACADEMY_NOTES);
    if (!response.ok || !response.data) {
      setLoadError(response.error || 'Deine privaten Notizen konnten nicht geladen werden.');
      setLoading(false);
      return;
    }
    setNotes(response.data.notes);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (area === 'courses') void loadLearningData();
    else void loadNotes();
  }, [area, loadLearningData, loadNotes]);

  const filteredCourses = useMemo(() => {
    const value = search.trim().toLocaleLowerCase('de-DE');
    if (!value) return courses;
    return courses.filter(item => [item.master.code, item.version?.title || '', item.version?.summary || '']
      .some(candidate => candidate.toLocaleLowerCase('de-DE').includes(value)));
  }, [courses, search]);
  const filteredPrograms = useMemo(() => {
    const value = search.trim().toLocaleLowerCase('de-DE');
    if (!value) return programs;
    return programs.filter(item => [item.master.code, item.version?.title || '', item.version?.summary || '']
      .some(candidate => candidate.toLocaleLowerCase('de-DE').includes(value)));
  }, [programs, search]);
  const filteredNotes = useMemo(() => {
    const value = noteSearch.trim().toLocaleLowerCase('de-DE');
    if (!value) return notes;
    return notes.filter(note => [note.title || '', note.content || '', ...note.tags]
      .some(candidate => candidate.toLocaleLowerCase('de-DE').includes(value)));
  }, [notes, noteSearch]);

  const openCourse = async (entry: CourseEntry) => {
    const pins = programPinByCourse.get(entry.master.id) || [];
    const pinnedVersionIds = [...new Set(pins.map(item => item.pin.courseVersionId))];
    const effectiveEntry = pinnedVersionIds.length === 1
      ? { ...entry, version: pins[0].version }
      : entry;
    setSelectedCourse(effectiveEntry);
    setCourseDetail(null);
    setScreen('course');
    const participation = ownCourseParticipationByCourse.get(entry.master.id);
    setDetailLoading(Boolean(participation));
    if (participation) {
      const response = await apiFetch<CourseParticipationDetail>(API_ENDPOINTS.ACADEMY_COURSE_PARTICIPATION(participation.id));
      if (!response.ok || !response.data) {
        setDetailLoading(false);
        onStatusToast(response.error || 'Kursteilnahme konnte nicht geladen werden.');
        return;
      }
      setCourseDetail(response.data);
      setDetailLoading(false);
    }
  };

  const startCourse = async () => {
    if (!selectedCourse) return;
    setSaving(true);
    const response = await apiFetch<{ participation: AcademyCourseParticipationDoc }>(
      API_ENDPOINTS.ACADEMY_COURSE_START(selectedCourse.master.id), { method: 'POST' }
    );
    setSaving(false);
    if (!response.ok || !response.data) {
      onStatusToast(response.error || 'Der Kurs konnte nicht gestartet werden.');
      return;
    }
    setDetailLoading(true);
    const detail = await apiFetch<CourseParticipationDetail>(API_ENDPOINTS.ACADEMY_COURSE_PARTICIPATION(response.data.participation.id));
    if (!detail.ok || !detail.data) {
      setDetailLoading(false);
      onStatusToast(detail.error || 'Der Kurs wurde gestartet, aber seine Details konnten nicht geladen werden.');
      await loadLearningData();
      return;
    }
    setCourseDetail(detail.data);
    setDetailLoading(false);
    await loadLearningData();
    onStatusToast('Kursteilnahme wurde gestartet. Die konkrete Kursversion ist jetzt fest zugeordnet.');
  };

  const recordEvidence = async (requirementId: string, label: string) => {
    if (!courseDetail) return;
    const confirmed = window.confirm(`Möchtest du den Nachweis wirklich erfassen: „${label}“? Es wird eine nachvollziehbare Fortschrittsaktion gespeichert.`);
    if (!confirmed) return;
    setSaving(true);
    const response = await apiFetch(API_ENDPOINTS.ACADEMY_COURSE_EVIDENCE(courseDetail.participation.id), {
      method: 'POST',
      body: JSON.stringify({ requirementId })
    });
    setSaving(false);
    if (!response.ok) {
      onStatusToast(response.error || 'Der Fortschrittsnachweis konnte nicht gespeichert werden.');
      return;
    }
    const detail = await apiFetch<CourseParticipationDetail>(API_ENDPOINTS.ACADEMY_COURSE_PARTICIPATION(courseDetail.participation.id));
    if (detail.ok && detail.data) setCourseDetail(detail.data);
    await loadLearningData();
    onStatusToast('Fortschrittsnachweis wurde gespeichert.');
  };

  const startProgram = async () => {
    if (!selectedProgram) return;
    setSaving(true);
    const response = await apiFetch<{ participation: AcademyProgramParticipationDoc }>(
      API_ENDPOINTS.ACADEMY_PROGRAM_START(selectedProgram.master.id), { method: 'POST' }
    );
    setSaving(false);
    if (!response.ok || !response.data) {
      onStatusToast(response.error || 'Das Programm konnte nicht begonnen werden.');
      return;
    }
    const detail = await apiFetch<ProgramParticipationDetail>(API_ENDPOINTS.ACADEMY_PROGRAM_PARTICIPATION(response.data.participation.id));
    if (detail.ok && detail.data) setProgramDetail(detail.data);
    setDetailLoading(false);
    await loadLearningData();
    onStatusToast('Programmteilnahme wurde angelegt. Die Pflichtkursversionen sind jetzt fest zugeordnet; die Kurse beginnen erst beim jeweiligen Kursstart.');
  };

  const openProgram = async (entry: ProgramEntry) => {
    setSelectedProgram(entry);
    setProgramDetail(null);
    setScreen('program');
    const participation = programParticipations.find(item => item.programId === entry.master.id);
    setDetailLoading(Boolean(participation));
    if (participation) {
      const response = await apiFetch<ProgramParticipationDetail>(API_ENDPOINTS.ACADEMY_PROGRAM_PARTICIPATION(participation.id));
      if (!response.ok || !response.data) {
        setDetailLoading(false);
        onStatusToast(response.error || 'Programmfortschritt konnte nicht geladen werden.');
        return;
      }
      setProgramDetail(response.data);
      setDetailLoading(false);
    }
  };

  const saveNote = async () => {
    if (!editingNote) return;
    setSaving(true);
    const response = await apiFetch<{ note: AcademyPrivateNoteDoc }>(API_ENDPOINTS.ACADEMY_NOTES + `/${encodeURIComponent(editingNote.id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: noteTitle.trim(),
        content: noteContent,
        tags: noteTags.split(',').map(tag => tag.trim()).filter(Boolean)
      })
    });
    setSaving(false);
    if (!response.ok || !response.data) {
      onStatusToast(response.error || 'Die Notiz konnte nicht gespeichert werden.');
      return;
    }
    setNotes(previous => previous.map(item => item.id === response.data!.note.id ? response.data!.note : item));
    setEditingNote(null);
    onStatusToast('Private Notiz gespeichert.');
  };

  const deleteNote = async (note: AcademyPrivateNoteDoc) => {
    if (!window.confirm('Diese private Notiz endgültig löschen?')) return;
    setSaving(true);
    const response = await apiFetch(API_ENDPOINTS.ACADEMY_NOTES + `/${encodeURIComponent(note.id)}`, { method: 'DELETE' });
    setSaving(false);
    if (!response.ok) {
      onStatusToast(response.error || 'Die Notiz konnte nicht gelöscht werden.');
      return;
    }
    setNotes(previous => previous.filter(item => item.id !== note.id));
    if (editingNote?.id === note.id) setEditingNote(null);
    onStatusToast('Private Notiz gelöscht.');
  };

  return (
    <div className="space-y-6">
      {area === 'courses' && (
        <>
          {screen !== 'catalog' && (
            <button type="button" className={secondary} onClick={() => { setScreen('catalog'); setSelectedCourse(null); setSelectedProgram(null); }}>
              ← Zurück zu Programmen und Kursen
            </button>
          )}
          {screen === 'catalog' && (
            <div className="space-y-6">
              <header className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Programme und Kurse</h2>
                <p className={muted}>Programme geben Ausbildungsziele und erforderliche Lernschritte vor. Kurse können unabhängig davon direkt begonnen werden.</p>
              </header>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Programme und Kurse durchsuchen</span>
                <input className={field} value={search} onChange={event => setSearch(event.target.value)} placeholder="Titel, Kennung oder Beschreibung" />
              </label>
              {loading ? <p className={muted} role="status">Programme und Kurse werden geladen …</p> : loadError ? (
                <div className={`${panel} p-4 space-y-3`} role="alert">
                  <p className="text-sm text-rose-700 dark:text-rose-300">{loadError}</p>
                  <button type="button" className={secondary} onClick={() => void loadLearningData()}>Erneut laden</button>
                </div>
              ) : (
                <>
                  <section className="space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ausbildungsprogramme</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{filteredPrograms.length} Programme</span>
                    </div>
                    {filteredPrograms.length === 0 ? <p className={`${panel} p-4 ${muted}`}>Derzeit sind keine veröffentlichten Programme verfügbar.</p> : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {filteredPrograms.map(entry => {
                          const detail = programDetails.find(item => item.participation.programId === entry.master.id);
                          return (
                            <article key={entry.master.id} className={`${panel} p-4 space-y-3`}>
                              <div className="flex justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{entry.master.code} · {entry.version ? `Version ${entry.version.versionNumber}` : 'Entwurf'}</p>
                                  <h4 className="mt-1 font-semibold text-slate-900 dark:text-white">{entry.version?.title || entry.draft?.title || entry.master.code}</h4>
                                  <p className={`mt-1 ${muted}`}>{entry.version?.summary || 'Noch keine veröffentlichte Programmversion.'}</p>
                                </div>
                                {detail && <span className="shrink-0 text-xs font-semibold text-sky-700 dark:text-sky-300">{detail.progress.completionPercentage}%</span>}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {detail ? statusLabel(detail.progress.status) : 'Noch keine Teilnahme'}
                                {entry.version ? ` · ${entry.version.courseReferences.filter(item => item.requirement === 'required').length} Pflichtkurse` : ''}
                              </p>
                              <button type="button" className={secondary} onClick={() => void openProgram(entry)}>Programm ansehen</button>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Alle Kurse</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{filteredCourses.length} Kurse</span>
                    </div>
                    {filteredCourses.length === 0 ? <p className={`${panel} p-4 ${muted}`}>Derzeit sind keine veröffentlichten Kurse verfügbar.</p> : (
                      <div className={`${panel} divide-y divide-slate-200 dark:divide-slate-800`}>
                        {filteredCourses.map(entry => {
                          const participation = ownCourseParticipationByCourse.get(entry.master.id);
                          return (
                            <div key={entry.master.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                              <div className="min-w-0">
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{entry.master.code} · {entry.version ? `Version ${entry.version.versionNumber}` : 'Keine Veröffentlichung'}</p>
                                <h4 className="font-medium text-slate-900 dark:text-white">{entry.version?.title || entry.master.code}</h4>
                                <p className={`mt-1 ${muted}`}>{entry.version?.summary || 'Noch keine veröffentlichte Kursversion.'}</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{participation ? statusLabel(participation.status) : 'Nicht begonnen'}</p>
                              </div>
                              <button type="button" className={secondary} onClick={() => void openCourse(entry)}>Kurs ansehen</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          {screen === 'course' && selectedCourse && (
            <section className="space-y-5">
              <header className="space-y-1">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{selectedCourse.master.code} · {courseDetail?.version ? `Version ${courseDetail.version.versionNumber}` : 'Noch keine Teilnahme'}</p>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{courseDetail?.version.title || selectedCourse.version?.title || selectedCourse.master.code}</h2>
                <p className={muted}>{courseDetail?.version.summary || selectedCourse.version?.summary}</p>
              </header>
              {courseDetail ? (
                <div className={`${panel} p-4 space-y-3`}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-sm font-semibold">{statusLabel(courseDetail.participation.status)}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Begonnen: {dateLabel(courseDetail.participation.startedIso)}</span>
                  </div>
                  {courseDetail.version.completionRequirements.length === 0 ? (
                    <p className={muted}>Für diese Kursversion sind keine ausdrücklichen Abschlussnachweise hinterlegt. Ein automatischer Abschluss wird daher nicht behauptet.</p>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-slate-900 dark:text-white">Abschlussbedingungen und Nachweise</h3>
                      {courseDetail.version.completionRequirements.map(requirement => {
                        const invalidated = new Set(courseDetail.corrections.flatMap(item => item.invalidatedEvidenceIds || []));
                        const matching = courseDetail.evidence.filter(item => item.requirementId === requirement.id && !invalidated.has(item.id));
                        const selfConfirmable = ['required_chapter', 'required_material', 'accepted_self_confirmation'].includes(requirement.type);
                        return (
                          <div key={requirement.id} className="border-t border-slate-200 pt-3 dark:border-slate-800 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{requirement.description || requirement.targetId}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{requirement.required ? 'Erforderlich' : 'Optional'} · {requirement.type === 'required_assessment' ? 'Prüfungsnachweis' : requirement.type === 'accepted_self_confirmation' ? 'Selbstbestätigung' : requirement.type === 'instructor_confirmation' ? 'Bestätigung durch Ausbilder' : requirement.type === 'practical_task' ? 'Praktische Aufgabe' : requirement.type === 'required_chapter' ? 'Kapitel' : 'Material'}</p>
                              </div>
                              <span className="text-xs font-semibold">{matching.length ? 'Nachweis vorhanden' : 'Offen'}</span>
                            </div>
                            {matching.map(item => <p key={item.id} className="text-xs text-slate-500 dark:text-slate-400">Erfasst am {dateLabel(item.recordedIso)} · {item.evidenceType === 'accepted_self_confirmation' ? 'Selbstbestätigung' : item.recordedByUid === currentUser.uid ? 'Dein Nachweis' : 'Ausbildernachweis'}</p>)}
                            {!matching.length && selfConfirmable && requirement.required && (
                              <button type="button" className={secondary} disabled={saving} onClick={() => void recordEvidence(requirement.id, requirement.description || requirement.targetId)}>
                                {requirement.type === 'accepted_self_confirmation' ? 'Selbstbestätigung abgeben' : 'Als erledigt markieren'}
                              </button>
                            )}
                            {requirement.type === 'required_assessment' && <p className="text-xs text-amber-700 dark:text-amber-300">Die Verknüpfung mit dem neuen Prüfungsnachweissystem ist noch nicht umgesetzt.</p>}
                            {['practical_task', 'instructor_confirmation'].includes(requirement.type) && !matching.length && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">Dieser Nachweis muss von einem berechtigten Ausbilder erfasst werden.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ein Kursabschluss wird nur angezeigt, wenn der Server die erforderlichen Nachweise als vollständig bewertet hat.</p>
                </div>
              ) : (
                <>
                  <div className={`${panel} p-4 space-y-3`}>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Lernziele</h3>
                    {selectedCourse.version?.learningObjectives.length ? (
                      <ul className={`list-disc pl-5 space-y-1 ${muted}`}>
                        {selectedCourse.version.learningObjectives.map(objective => <li key={objective.id}>{objective.description}</li>)}
                      </ul>
                    ) : <p className={muted}>Für diesen Kurs wurden noch keine veröffentlichten Lernziele bereitgestellt.</p>}
                  </div>
                  {selectedCourse.version?.chapters.length ? (
                    <div className={`${panel} p-4 space-y-3`}>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Kapitel</h3>
                      {selectedCourse.version.chapters.slice().sort((a,b) => a.order - b.order).map(chapter => (
                        <div key={chapter.id} className="border-t border-slate-200 pt-3 dark:border-slate-800">
                          <p className="text-sm font-medium">{chapter.title}</p>
                          {chapter.description && <p className={muted}>{chapter.description}</p>}
                          <p className="text-xs text-slate-500 dark:text-slate-400">{chapter.required ? 'Erforderliches Kapitel' : 'Optionales Kapitel'}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className={`${panel} p-4 space-y-2`}>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Teilnahme</h3>
                    {programPinByCourse.get(selectedCourse.master.id)?.length &&
                      new Set(programPinByCourse.get(selectedCourse.master.id)!.map(item => item.pin.courseVersionId)).size > 1 ? (
                        <p className="text-sm text-amber-700 dark:text-amber-300">Für diesen Kurs bestehen unterschiedliche Programmversions-Pins. Bitte wende dich an die Academy-Verwaltung, bevor du den Kurs startest.</p>
                      ) : (
                        <>
                          <p className={muted}>Der Kurs beginnt erst, wenn du ihn bewusst startest. Beim Start wird die für dich maßgebliche Kursversion festgehalten.</p>
                          {programPinByCourse.get(selectedCourse.master.id)?.[0] && <p className="text-xs text-slate-500 dark:text-slate-400">Dieser Kurs ist in einem begonnenen Programm an Version {programPinByCourse.get(selectedCourse.master.id)![0].version.versionNumber} gebunden.</p>}
                          <button type="button" className={primary} disabled={saving || !selectedCourse.version} onClick={() => void startCourse()}>
                            {saving ? 'Wird gestartet …' : 'Kurs starten'}
                          </button>
                        </>
                      )}
                  </div>
                </>
              )}
            </section>
          )}

          {screen === 'program' && selectedProgram && (
            <section className="space-y-5">
              <header className="space-y-1">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{selectedProgram.master.code} · {programDetail ? `Version ${programDetail.version.versionNumber}` : selectedProgram.version ? `Version ${selectedProgram.version.versionNumber}` : 'Entwurf'}</p>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{programDetail?.version.title || selectedProgram.version?.title || selectedProgram.master.code}</h2>
                <p className={muted}>{programDetail?.version.summary || selectedProgram.version?.summary}</p>
              </header>
              {(programDetail?.version || selectedProgram.version) && (() => {
                const version = programDetail?.version || selectedProgram.version!;
                const progress = programDetail?.progress;
                return (
                  <>
                    {progress && (
                      <div className={`${panel} p-4 space-y-2`}>
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold">Dein Programmfortschritt</h3>
                          <span className="text-sm font-semibold tabular-nums">{progress.completionPercentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.completionPercentage} aria-label="Programmfortschritt">
                          <div className="h-full bg-sky-700 dark:bg-sky-400" style={{ width: `${progress.completionPercentage}%` }} />
                        </div>
                        <p className={muted}>{progress.completedRequiredCourseCount} von {progress.requiredCourseCount} Pflichtkursen abgeschlossen · {progress.startedRequiredCourseCount} begonnen</p>
                      </div>
                    )}
                    <div className={`${panel} p-4 space-y-3`}>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Lernziele</h3>
                      <ul className="list-disc pl-5 space-y-1 ${muted}">
                        {version.learningObjectives.map(item => <li key={item.id}>{item.description}</li>)}
                      </ul>
                    </div>
                    <div className={`${panel} p-4 space-y-3`}>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Erforderliche Kurse</h3>
                      {version.courseReferences.filter(item => item.requirement === 'required').sort((a,b) => a.order-b.order).map(reference => {
                        const progressItem = programDetail?.requiredCourses.find(item => item.pin.courseId === reference.courseId);
                        const courseEntry = courses.find(item => item.master.id === reference.courseId);
                        return (
                          <div key={reference.courseId} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                            <div>
                              <p className="text-sm font-medium">{progressItem?.version.title || courseEntry?.version?.title || courseEntry?.master.code || reference.courseId}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{progressItem?.participation ? statusLabel(progressItem.participation.status) : 'Noch nicht begonnen'}</p>
                            </div>
                            <button type="button" className={secondary} onClick={() => {
                              const found = courseEntry || ({ master: { id: reference.courseId, code: reference.courseId } } as unknown as CourseEntry);
                              void openCourse(found);
                            }}>Zum Kurs</button>
                          </div>
                        );
                      })}
                      {version.courseReferences.filter(item => item.requirement === 'required').length === 0 && <p className={muted}>Diese Programmversion hat keine Pflichtkurse.</p>}
                    </div>
                    {version.courseReferences.some(item => item.requirement === 'recommended') && (
                      <div className={`${panel} p-4 space-y-3`}>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Empfohlene Kurse</h3>
                        {version.courseReferences.filter(item => item.requirement === 'recommended').sort((a,b) => a.order-b.order).map(reference => {
                          const courseEntry = courses.find(item => item.master.id === reference.courseId);
                          return <div key={reference.courseId} className="border-t border-slate-200 pt-3 dark:border-slate-800"><p className="text-sm font-medium">{courseEntry?.version?.title || courseEntry?.master.code || reference.courseId}</p><p className="text-xs text-slate-500 dark:text-slate-400">Freiwillige Ergänzung – blockiert den Programmabschluss nicht.</p></div>;
                        })}
                      </div>
                    )}
                    {!programDetail && (
                      <div className={`${panel} p-4 space-y-2`}>
                        <p className={muted}>Beim Programmstart werden die konkreten Versionen aller Pflichtkurse festgehalten. Die einzelnen Kurse beginnen erst, wenn du sie selbst startest.</p>
                        <button type="button" className={primary} disabled={saving || selectedProgram.master.publicationStatus !== 'published' || selectedProgram.master.availability !== 'available'} onClick={() => void startProgram()}>
                          {saving ? 'Wird gestartet …' : 'Programm beginnen'}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </section>
          )}
        </>
      )}

      {area === 'notes' && (
        <section className="space-y-5">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Meine Notizen</h2>
            <p className={muted}>Deine Notizen und Lesezeichen sind privat und werden nur deinem Konto zugeordnet. Andere Nutzer und Administratoren erhalten über diese Ansicht keinen Zugriff.</p>
          </header>
          {loading ? <p className={muted} role="status">Private Notizen werden geladen …</p> : loadError ? (
            <div className={`${panel} p-4 space-y-3`} role="alert">
              <p className="text-sm text-rose-700 dark:text-rose-300">{loadError}</p>
              <button type="button" className={secondary} onClick={() => void loadNotes()}>Erneut laden</button>
            </div>
          ) : (
            <>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Notizen durchsuchen</span>
                <input className={field} value={noteSearch} onChange={event => setNoteSearch(event.target.value)} placeholder="Titel, Inhalt oder Schlagwort" />
              </label>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={`${panel} divide-y divide-slate-200 dark:divide-slate-800`}>
                  {filteredNotes.length === 0 ? <p className={`p-4 ${muted}`}>{notes.length ? 'Keine Notiz passt zu deiner Suche.' : 'Du hast noch keine Notizen oder Lesezeichen gespeichert.'}</p> : filteredNotes.map(note => (
                    <article key={note.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{note.title || (note.kind === 'bookmark' ? 'Lesezeichen' : 'Notiz ohne Titel')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{note.kind === 'bookmark' ? 'Lesezeichen' : 'Private Notiz'} · {dateLabel(note.updatedIso)}</p>
                        </div>
                        <div className="flex gap-2">
                          {note.kind === 'note' && <button type="button" className={secondary} onClick={() => { setEditingNote(note); setNoteTitle(note.title || ''); setNoteContent(note.content || ''); setNoteTags(note.tags.join(', ')); }}>Bearbeiten</button>}
                          <button type="button" className={secondary} disabled={saving} onClick={() => void deleteNote(note)}>Löschen</button>
                        </div>
                      </div>
                      {note.content && <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap line-clamp-4">{note.content}</p>}
                      {note.tags.length > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">{note.tags.join(' · ')}</p>}
                      <p className="text-xs text-slate-500 dark:text-slate-400">Material {note.materialId} · Fassung {note.materialVersionId}</p>
                    </article>
                  ))}
                </div>
                {editingNote ? (
                  <form className={`${panel} p-4 space-y-3`} onSubmit={event => { event.preventDefault(); void saveNote(); }}>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Private Notiz bearbeiten</h3>
                    <label className="block space-y-1"><span className="text-sm font-medium">Titel</span><input className={field} value={noteTitle} onChange={event => setNoteTitle(event.target.value)} maxLength={200} /></label>
                    <label className="block space-y-1"><span className="text-sm font-medium">Inhalt</span><textarea className={field} rows={8} value={noteContent} onChange={event => setNoteContent(event.target.value)} maxLength={20000} /></label>
                    <label className="block space-y-1"><span className="text-sm font-medium">Schlagwörter (Komma getrennt)</span><input className={field} value={noteTags} onChange={event => setNoteTags(event.target.value)} /></label>
                    <div className="flex flex-wrap gap-2"><button type="submit" className={primary} disabled={saving}>{saving ? 'Speichert …' : 'Änderungen speichern'}</button><button type="button" className={secondary} onClick={() => setEditingNote(null)}>Abbrechen</button></div>
                  </form>
                ) : (
                  <div className={`${panel} p-4 space-y-2`}>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Notizen aus dem Reader</h3>
                    <p className={muted}>Neue Notizen und Lesezeichen werden direkt im Dokument-Reader angelegt. Die aktuelle Bibliothek verwendet noch das ältere Materialmodell ohne stabile Dokumentversions-IDs; deshalb kann eine neue Notiz hier nicht sicher an eine konkrete Materialfassung gebunden werden.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
};
