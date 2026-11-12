import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './AcademyLearningCenter.css';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import { mapWithConcurrency } from '../lib/async';
import { AcademyMaterialReader } from './AcademyMaterialReader';
import { AcademyPrivateNoteSources } from './AcademyPrivateNoteSources';
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
  AcademyPrivateNoteDoc,
  AcademyCourseMaterialReaderItem
} from '../types/academy';
import type { UserPublicProfile } from '../types/portal';

interface Props {
  currentUser: UserPublicProfile;
  area: 'courses' | 'notes';
  onStatusToast: (message: string) => void;
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}

type ParticipantCourseMaster = Omit<AcademyCourseMasterDoc, 'ownerUid' | 'archivedByUid' | 'archiveReason'>;
type ParticipantCourseVersion = Omit<AcademyCourseVersionDoc, 'createdByUid' | 'publishedByUid'>;
type ParticipantProgramMaster = Omit<AcademyProgramMasterDoc, 'ownerUid' | 'archivedByUid' | 'archiveReason'>;
type ParticipantProgramVersion = Omit<AcademyProgramVersionDoc, 'createdByUid' | 'publishedByUid'>;

interface CourseEntry {
  master: ParticipantCourseMaster;
  version: ParticipantCourseVersion | null;
  draft?: AcademyCourseDraftDoc | null;
}
interface ProgramEntry {
  master: ParticipantProgramMaster;
  version: ParticipantProgramVersion | null;
  draft?: AcademyProgramDraftDoc | null;
}
type ParticipantCorrectionView = Pick<
  AcademyCompletionCorrectionDoc,
  'id' | 'participationId' | 'previousStatus' | 'correctedStatus' | 'correctedIso' | 'invalidatedEvidenceIds'
>;
type ParticipantEvidenceView = Omit<AcademyProgressEvidenceDoc, 'recordedByUid'> & {
  recordedByParticipant: boolean;
};

interface CourseParticipationDetail {
  participation: AcademyCourseParticipationDoc;
  version: ParticipantCourseVersion;
  evidence: ParticipantEvidenceView[];
  corrections: ParticipantCorrectionView[];
  assessmentProofs: Record<string, { attemptId: string; releasedAtIso: string; finalScoreBasisPoints: number }>;
  materials: AcademyCourseMaterialReaderItem[];
}
interface ProgramCourseProgress {
  pin: AcademyProgramParticipationDoc['requiredCoursePins'][number];
  version: ParticipantCourseVersion;
  participation: AcademyCourseParticipationDoc | null;
}
interface ProgramParticipationDetail {
  participation: AcademyProgramParticipationDoc;
  version: ParticipantProgramVersion;
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

function availabilityNotice(master: { publicationStatus: string; availability: string }): string | null {
  if (master.publicationStatus === 'archived') return 'Archiviert';
  if (master.availability === 'unavailable') return 'Derzeit nicht verfügbar';
  return null;
}

export const AcademyLearningCenter: React.FC<Props> = ({ currentUser, area, onStatusToast, onUnsavedChangesChange }) => {
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
  const contentLoadRequestIdRef = useRef(0);
  const areaRef = useRef(area);
  areaRef.current = area;
  const mountedRef = useRef(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseEntry | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseParticipationDetail | null>(null);
  const detailRequestIdRef = useRef(0);
  const [selectedProgram, setSelectedProgram] = useState<ProgramEntry | null>(null);
  const [programDetail, setProgramDetail] = useState<ProgramParticipationDetail | null>(null);
  const [search, setSearch] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [editingNote, setEditingNote] = useState<AcademyPrivateNoteDoc | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('');
  const noteHasUnsavedChanges = Boolean(editingNote && (
    noteTitle !== (editingNote.title || '') ||
    noteContent !== (editingNote.content || '') ||
    noteTags !== editingNote.tags.join(', ')
  ));
  useEffect(() => {
    onUnsavedChangesChange?.(noteHasUnsavedChanges || saving);
  }, [noteHasUnsavedChanges, saving, onUnsavedChangesChange]);
  useEffect(() => () => onUnsavedChangesChange?.(false), [onUnsavedChangesChange]);

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
    const requestId = ++contentLoadRequestIdRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const [courseResponse, programResponse, courseParticipationResponse, programParticipationResponse] = await Promise.all([
        apiFetch<{ courses: CourseEntry[] }>(API_ENDPOINTS.ACADEMY_COURSES),
        apiFetch<{ programs: ProgramEntry[] }>(API_ENDPOINTS.ACADEMY_PROGRAMS),
        apiFetch<{ participations: AcademyCourseParticipationDoc[] }>(API_ENDPOINTS.ACADEMY_COURSE_PARTICIPATIONS),
        apiFetch<{ participations: AcademyProgramParticipationDoc[] }>(API_ENDPOINTS.ACADEMY_PROGRAM_PARTICIPATIONS)
      ]);
      if (requestId !== contentLoadRequestIdRef.current) return;
      const failed = [courseResponse, programResponse, courseParticipationResponse, programParticipationResponse].find(item => !item.ok || !item.data);
      if (failed) throw new Error(failed.error || 'Academy-Daten konnten nicht geladen werden.');
      const nextCourses = courseResponse.data!.courses;
      const nextPrograms = programResponse.data!.programs;
      const nextCourseParticipations = courseParticipationResponse.data!.participations;
      const nextProgramParticipations = programParticipationResponse.data!.participations;

      // Keep all program progress available for pinned course versions, but avoid
      // creating hundreds of simultaneous HTTP requests for long participation histories.
      const detailsResponse = await mapWithConcurrency(nextProgramParticipations, 6, item =>
        apiFetch<ProgramParticipationDetail>(API_ENDPOINTS.ACADEMY_PROGRAM_PARTICIPATION(item.id))
      );
      if (requestId !== contentLoadRequestIdRef.current) return;
      const failedDetail = detailsResponse.find(item => !item.ok || !item.data);
      if (failedDetail) throw new Error(failedDetail.error || 'Programmfortschritt konnte nicht geladen werden.');
      setCourses(nextCourses);
      setPrograms(nextPrograms);
      setCourseParticipations(nextCourseParticipations);
      setProgramParticipations(nextProgramParticipations);
      setProgramDetails(detailsResponse.map(item => item.data!));
    } catch (error) {
      if (requestId === contentLoadRequestIdRef.current) {
        setLoadError(error instanceof Error ? error.message : 'Academy-Daten konnten nicht geladen werden.');
      }
    } finally {
      if (requestId === contentLoadRequestIdRef.current) setLoading(false);
    }
  }, []);

  const loadNotes = useCallback(async () => {
    const requestId = ++contentLoadRequestIdRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const response = await apiFetch<{ notes: AcademyPrivateNoteDoc[] }>(API_ENDPOINTS.ACADEMY_NOTES);
      if (requestId !== contentLoadRequestIdRef.current) return;
      if (!response.ok || !response.data) {
        setLoadError(response.error || 'Deine privaten Notizen konnten nicht geladen werden.');
        return;
      }
      setNotes(response.data.notes);
    } catch (error) {
      if (requestId === contentLoadRequestIdRef.current) {
        setLoadError(error instanceof Error ? error.message : 'Deine privaten Notizen konnten nicht geladen werden.');
      }
    } finally {
      if (requestId === contentLoadRequestIdRef.current) setLoading(false);
    }
  }, []);

  const refreshLearningDataIfActive = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current || areaRef.current !== 'courses') return false;
    await loadLearningData();
    return true;
  }, [loadLearningData]);

  useEffect(() => {
    mountedRef.current = true;
    // A section change or unmount invalidates any detail/list response still in flight.
    detailRequestIdRef.current += 1;
    setDetailLoading(false);
    if (area === 'courses') void loadLearningData();
    else void loadNotes();
    return () => {
      mountedRef.current = false;
      contentLoadRequestIdRef.current += 1;
      detailRequestIdRef.current += 1;
    };
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
    const requestId = ++detailRequestIdRef.current;
    const pins = programPinByCourse.get(entry.master.id) || [];
    const pinnedVersionIds = [...new Set(pins.map(item => item.pin.courseVersionId))];
    const effectiveEntry = pinnedVersionIds.length === 1
      ? { ...entry, version: pins[0].version }
      : entry;
    setSelectedCourse(effectiveEntry);
    setCourseDetail(null);
    setSelectedProgram(null);
    setProgramDetail(null);
    setScreen('course');
    const participation = ownCourseParticipationByCourse.get(entry.master.id);
    setDetailLoading(Boolean(participation));
    if (participation) {
      const response = await apiFetch<CourseParticipationDetail>(API_ENDPOINTS.ACADEMY_COURSE_PARTICIPATION(participation.id));
      if (detailRequestIdRef.current !== requestId) return;
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
    const requestId = detailRequestIdRef.current;
    setSaving(true);
    const response = await apiFetch<{ participation: AcademyCourseParticipationDoc }>(
      API_ENDPOINTS.ACADEMY_COURSE_START(selectedCourse.master.id), { method: 'POST' }
    );
    setSaving(false);
    if (!response.ok || !response.data) {
      onStatusToast(response.error || 'Der Kurs konnte nicht gestartet werden.');
      return;
    }
    if (detailRequestIdRef.current !== requestId) {
      if (await refreshLearningDataIfActive()) {
        onStatusToast('Kursteilnahme wurde gestartet. Die konkrete Kursversion ist jetzt fest zugeordnet.');
      }
      return;
    }
    setDetailLoading(true);
    const detail = await apiFetch<CourseParticipationDetail>(API_ENDPOINTS.ACADEMY_COURSE_PARTICIPATION(response.data.participation.id));
    if (detailRequestIdRef.current !== requestId) {
      await refreshLearningDataIfActive();
      return;
    }
    if (!detail.ok || !detail.data) {
      setDetailLoading(false);
      onStatusToast(detail.error || 'Der Kurs wurde gestartet, aber seine Details konnten nicht geladen werden.');
      await loadLearningData();
      return;
    }
    setCourseDetail(detail.data);
    setDetailLoading(false);
    if (await refreshLearningDataIfActive()) {
      onStatusToast('Kursteilnahme wurde gestartet. Die konkrete Kursversion ist jetzt fest zugeordnet.');
    }
  };

  const recordEvidence = async (requirementId: string, label: string) => {
    if (!courseDetail) return;
    const requestId = detailRequestIdRef.current;
    const participationId = courseDetail.participation.id;
    const confirmed = window.confirm(`Möchtest du den Nachweis wirklich erfassen: „${label}“? Es wird eine nachvollziehbare Fortschrittsaktion gespeichert.`);
    if (!confirmed) return;
    setSaving(true);
    const response = await apiFetch(API_ENDPOINTS.ACADEMY_COURSE_EVIDENCE(participationId), {
      method: 'POST',
      body: JSON.stringify({ requirementId })
    });
    setSaving(false);
    if (!response.ok) {
      onStatusToast(response.error || 'Der Fortschrittsnachweis konnte nicht gespeichert werden.');
      return;
    }
    if (detailRequestIdRef.current === requestId) {
      const detail = await apiFetch<CourseParticipationDetail>(API_ENDPOINTS.ACADEMY_COURSE_PARTICIPATION(participationId));
      if (detailRequestIdRef.current === requestId && detail.ok && detail.data) setCourseDetail(detail.data);
    }
    await refreshLearningDataIfActive();
    if (detailRequestIdRef.current === requestId) onStatusToast('Fortschrittsnachweis wurde gespeichert.');
  };

  const startProgram = async () => {
    if (!selectedProgram) return;
    const requestId = detailRequestIdRef.current;
    setSaving(true);
    const response = await apiFetch<{ participation: AcademyProgramParticipationDoc }>(
      API_ENDPOINTS.ACADEMY_PROGRAM_START(selectedProgram.master.id), { method: 'POST' }
    );
    if (!response.ok || !response.data) {
      setSaving(false);
      onStatusToast(response.error || 'Das Programm konnte nicht begonnen werden.');
      return;
    }
    if (detailRequestIdRef.current === requestId) {
      setDetailLoading(true);
      const detail = await apiFetch<ProgramParticipationDetail>(API_ENDPOINTS.ACADEMY_PROGRAM_PARTICIPATION(response.data.participation.id));
      if (detailRequestIdRef.current === requestId && detail.ok && detail.data) setProgramDetail(detail.data);
      if (detailRequestIdRef.current === requestId) setDetailLoading(false);
    }
    setSaving(false);
    if (await refreshLearningDataIfActive() && detailRequestIdRef.current === requestId) {
      onStatusToast('Programmteilnahme wurde angelegt. Die Pflichtkursversionen sind jetzt fest zugeordnet; die Kurse beginnen erst beim jeweiligen Kursstart.');
    }
  };

  const openProgram = async (entry: ProgramEntry) => {
    const requestId = ++detailRequestIdRef.current;
    setSelectedProgram(entry);
    setProgramDetail(null);
    setSelectedCourse(null);
    setCourseDetail(null);
    setScreen('program');
    const participation = programParticipations.find(item => item.programId === entry.master.id);
    setDetailLoading(Boolean(participation));
    if (participation) {
      const response = await apiFetch<ProgramParticipationDetail>(API_ENDPOINTS.ACADEMY_PROGRAM_PARTICIPATION(participation.id));
      if (detailRequestIdRef.current !== requestId) return;
      if (!response.ok || !response.data) {
        setDetailLoading(false);
        onStatusToast(response.error || 'Programmfortschritt konnte nicht geladen werden.');
        return;
      }
      setProgramDetail(response.data);
      setDetailLoading(false);
    }
  };

  const cancelNoteEdit = () => {
    if (saving) return;
    if (noteHasUnsavedChanges && !window.confirm('Nicht gespeicherte Änderungen an dieser privaten Notiz verwerfen?')) return;
    setEditingNote(null);
  };

  const saveNote = async () => {
    if (!editingNote) return;
    setSaving(true);
    const response = await apiFetch<{ note: AcademyPrivateNoteDoc }>(API_ENDPOINTS.ACADEMY_NOTES + `/${encodeURIComponent(editingNote.id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        expectedRevision: editingNote.revision ?? 1,
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
    <div className={`space-y-6 ${area === 'courses' ? 'academy-learning-center academy-learning-center--courses' : area === 'notes' ? 'academy-learning-center academy-learning-center--notes' : ''}`}>
      {area === 'courses' && (
        <>
          {screen !== 'catalog' && (
            <button type="button" className={`${secondary} academy-course-back`} onClick={() => {
              detailRequestIdRef.current += 1;
              setDetailLoading(false);
              setCourseDetail(null);
              setProgramDetail(null);
              setScreen('catalog');
              setSelectedCourse(null);
              setSelectedProgram(null);
            }}>
              ← Zurück zu Programmen und Kursen
            </button>
          )}
          {screen === 'catalog' && (
            <div className="academy-courses-catalog space-y-6">
              <header className="academy-courses-heading space-y-2">
                <p className="academy-courses-eyebrow">DEIN AUSBILDUNGSWEG</p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Programme und Kurse</h2>
                <p className={muted}>Programme geben Ausbildungsziele und erforderliche Lernschritte vor. Kurse können unabhängig davon direkt begonnen werden.</p>
              </header>
              <label className="academy-courses-search block space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Programme und Kurse durchsuchen</span>
                <input className={`${field} academy-courses-search-input`} value={search} onChange={event => setSearch(event.target.value)} placeholder="Titel, Kennung oder Beschreibung" />
              </label>
              {loading ? <p className={muted} role="status">Programme und Kurse werden geladen …</p> : loadError ? (
                <div className={`${panel} p-4 space-y-3`} role="alert">
                  <p className="text-sm text-rose-700 dark:text-rose-300">{loadError}</p>
                  <button type="button" className={secondary} onClick={() => void loadLearningData()}>Erneut laden</button>
                </div>
              ) : (
                <>
                  <section className="academy-courses-section space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ausbildungsprogramme</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{filteredPrograms.length} Programme</span>
                    </div>
                    {filteredPrograms.length === 0 ? <p className={`${panel} p-4 ${muted}`}>Derzeit sind keine veröffentlichten Programme verfügbar.</p> : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {filteredPrograms.map(entry => {
                          const detail = programDetails.find(item => item.participation.programId === entry.master.id);
                          return (
                            <article key={entry.master.id} className={`${panel} academy-program-card p-5 space-y-3`}>
                              <div className="flex justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{entry.master.code} · {entry.version ? `Version ${entry.version.versionNumber}` : 'Entwurf'}</p>
                                  {availabilityNotice(entry.master) && <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">{availabilityNotice(entry.master)}</p>}
                                  <h4 className="mt-1 font-semibold text-slate-900 dark:text-white">{entry.version?.title || entry.draft?.title || entry.master.code}</h4>
                                  <p className={`mt-1 ${muted}`}>{entry.version?.summary || 'Noch keine veröffentlichte Programmversion.'}</p>
                                </div>
                                {detail && <span className="shrink-0 text-xs font-semibold text-sky-700 dark:text-sky-300" aria-label={`Fortschritt: ${detail.progress.completionPercentage} Prozent`}>Fortschritt {detail.progress.completionPercentage}%</span>}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {detail ? statusLabel(detail.progress.status) : 'Noch keine Teilnahme'}
                                {entry.version ? ` · ${entry.version.courseReferences.filter(item => item.requirement === 'required').length} Pflichtkurse` : ''}
                              </p>
                              <button type="button" className={`${secondary} academy-course-action`} onClick={() => void openProgram(entry)}>Programm ansehen</button>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="academy-courses-section space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Alle Kurse</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{filteredCourses.length} Kurse</span>
                    </div>
                    {filteredCourses.length === 0 ? <p className={`${panel} p-4 ${muted}`}>Derzeit sind keine veröffentlichten Kurse verfügbar.</p> : (
                      <div className={`${panel} academy-course-list divide-y divide-slate-200 dark:divide-slate-800`}>
                        {filteredCourses.map(entry => {
                          const participation = ownCourseParticipationByCourse.get(entry.master.id);
                          return (
                            <div key={entry.master.id} className="academy-course-row flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                              <div className="min-w-0">
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{entry.master.code} · {entry.version ? `Version ${entry.version.versionNumber}` : 'Keine Veröffentlichung'}</p>
                                {availabilityNotice(entry.master) && <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">{availabilityNotice(entry.master)}</p>}
                                <h4 className="font-medium text-slate-900 dark:text-white">{entry.version?.title || entry.master.code}</h4>
                                <p className={`mt-1 ${muted}`}>{entry.version?.summary || 'Noch keine veröffentlichte Kursversion.'}</p>
                                <p className="academy-course-status mt-2 text-xs text-slate-600 dark:text-slate-300">{participation ? statusLabel(participation.status) : 'Nicht begonnen'}</p>
                              </div>
                              <button type="button" className={`${secondary} academy-course-action`} onClick={() => void openCourse(entry)}>Kurs ansehen</button>
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
            <section className="academy-course-detail space-y-5">
              <header className="academy-course-detail-heading space-y-2">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{selectedCourse.master.code} · {courseDetail?.version ? `Version ${courseDetail.version.versionNumber}` : 'Noch keine Teilnahme'}</p>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{courseDetail?.version.title || selectedCourse.version?.title || selectedCourse.master.code}</h2>
                <p className={muted}>{courseDetail?.version.summary || selectedCourse.version?.summary}</p>
              </header>
              {detailLoading ? <p className={muted} role="status">Deine Kursteilnahme wird geladen …</p> : courseDetail ? (
                <>
                <div className={`${panel} academy-course-panel p-4 space-y-3`}>
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
                        const assessmentProof = courseDetail.assessmentProofs[requirement.id];
                        const satisfied = requirement.type === 'required_assessment' ? Boolean(assessmentProof) : matching.length > 0;
                        const selfConfirmable = ['required_chapter', 'required_material', 'accepted_self_confirmation'].includes(requirement.type);
                        return (
                          <div key={requirement.id} className="academy-course-requirement border-t border-slate-200 pt-3 dark:border-slate-800 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{requirement.description || requirement.targetId}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{requirement.required ? 'Erforderlich' : 'Optional'} · {requirement.type === 'required_assessment' ? 'Prüfungsnachweis' : requirement.type === 'accepted_self_confirmation' ? 'Selbstbestätigung' : requirement.type === 'instructor_confirmation' ? 'Bestätigung durch Ausbilder' : requirement.type === 'practical_task' ? 'Praktische Aufgabe' : requirement.type === 'required_chapter' ? 'Kapitel' : 'Material'}</p>
                              </div>
                              <span className="text-xs font-semibold">{satisfied ? 'Nachweis vorhanden' : 'Offen'}</span>
                            </div>
                            {matching.map(item => <p key={item.id} className="text-xs text-slate-500 dark:text-slate-400">Erfasst am {dateLabel(item.recordedIso)} · {item.evidenceType === 'accepted_self_confirmation' ? 'Selbstbestätigung' : item.recordedByParticipant ? 'Dein Nachweis' : 'Ausbildernachweis'}</p>)}
                            {assessmentProof && <p className="text-xs text-slate-500 dark:text-slate-400">Prüfung bestanden und offiziell freigegeben am {dateLabel(assessmentProof.releasedAtIso)}.</p>}
                            {!matching.length && selfConfirmable && requirement.required && (
                              <button type="button" className={secondary} disabled={saving} onClick={() => void recordEvidence(requirement.id, requirement.description || requirement.targetId)}>
                                {requirement.type === 'accepted_self_confirmation' ? 'Selbstbestätigung abgeben' : 'Als erledigt markieren'}
                              </button>
                            )}
                            {requirement.type === 'required_assessment' && <p className="text-xs text-slate-500 dark:text-slate-400">Der Nachweis wird nach bestandener und offiziell freigegebener Abschlussprüfung automatisch berücksichtigt.</p>}
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
                <AcademyMaterialReader participationId={courseDetail.participation.id} materials={courseDetail.materials || []} />
                </>
              ) : ownCourseParticipationByCourse.has(selectedCourse.master.id) ? (
                <div className={`${panel} academy-course-panel p-4 space-y-3`}>
                  <p className={muted}>Eine bestehende Kursteilnahme ist vorhanden, ihre Details konnten aber noch nicht geladen werden.</p>
                  <button type="button" className={secondary} onClick={() => void openCourse(selectedCourse)}>Teilnahme erneut laden</button>
                </div>
              ) : (
                <>
                  <div className={`${panel} academy-course-panel p-4 space-y-3`}>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Lernziele</h3>
                    {selectedCourse.version?.learningObjectives.length ? (
                      <ul className={`list-disc pl-5 space-y-1 ${muted}`}>
                        {selectedCourse.version.learningObjectives.map(objective => <li key={objective.id}>{objective.description}</li>)}
                      </ul>
                    ) : <p className={muted}>Für diesen Kurs wurden noch keine veröffentlichten Lernziele bereitgestellt.</p>}
                  </div>
                  {selectedCourse.version?.chapters.length ? (
                    <div className={`${panel} academy-course-panel p-4 space-y-3`}>
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
                  <div className={`${panel} academy-course-panel p-4 space-y-2`}>
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
            <section className="academy-program-detail space-y-5">
              <header className="academy-course-detail-heading space-y-2">
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
                      <div className={`${panel} academy-program-panel p-4 space-y-2`}>
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold">Dein Programmfortschritt</h3>
                          <span className="text-sm font-semibold tabular-nums">{progress.completionPercentage}%</span>
                        </div>
                        <div className="academy-program-progress-track h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.completionPercentage} aria-label="Programmfortschritt">
                          <div className="h-full bg-sky-700 dark:bg-sky-400" style={{ width: `${progress.completionPercentage}%` }} />
                        </div>
                        <p className={muted}>{progress.completedRequiredCourseCount} von {progress.requiredCourseCount} Pflichtkursen abgeschlossen · {progress.startedRequiredCourseCount} begonnen</p>
                      </div>
                    )}
                    <div className={`${panel} academy-program-panel p-4 space-y-3`}>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Lernziele</h3>
                      <ul className={`list-disc pl-5 space-y-1 ${muted}`}>
                        {version.learningObjectives.map(item => <li key={item.id}>{item.description}</li>)}
                      </ul>
                    </div>
                    <div className={`${panel} academy-program-panel p-4 space-y-3`}>
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
                      <div className={`${panel} academy-program-panel p-4 space-y-3`}>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Empfohlene Kurse</h3>
                        {version.courseReferences.filter(item => item.requirement === 'recommended').sort((a,b) => a.order-b.order).map(reference => {
                          const courseEntry = courses.find(item => item.master.id === reference.courseId);
                          return <div key={reference.courseId} className="border-t border-slate-200 pt-3 dark:border-slate-800"><p className="text-sm font-medium">{courseEntry?.version?.title || courseEntry?.master.code || reference.courseId}</p><p className="text-xs text-slate-500 dark:text-slate-400">Freiwillige Ergänzung – blockiert den Programmabschluss nicht.</p></div>;
                        })}
                      </div>
                    )}
                    {detailLoading && !programDetail && <p className={muted} role="status">Deine Programmteilnahme wird geladen …</p>}
                    {!programDetail && !detailLoading && programParticipations.some(item => item.programId === selectedProgram.master.id) && (
                      <div className={`${panel} academy-program-panel p-4 space-y-2`}>
                        <p className={muted}>Eine bestehende Programmteilnahme ist vorhanden, ihr Fortschritt konnte aber noch nicht geladen werden.</p>
                        <button type="button" className={secondary} onClick={() => void openProgram(selectedProgram)}>Fortschritt erneut laden</button>
                      </div>
                    )}
                    {!programDetail && !detailLoading && !programParticipations.some(item => item.programId === selectedProgram.master.id) && (
                      <div className={`${panel} academy-program-panel p-4 space-y-2`}>
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
        <section className="academy-notes-area space-y-5">
          {editingNote ? (
            <div className="academy-notes-editor-view space-y-5">
              <header className="academy-notes-editor-heading flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="academy-notes-eyebrow">PERSÖNLICHER ARBEITSBEREICH</p>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Private Notiz bearbeiten</h2>
                  <p className={muted}>Nur du kannst diese Notiz und ihre verknüpften Quellen sehen.</p>
                </div>
                <button type="button" className={`${secondary} academy-note-cancel`} onClick={cancelNoteEdit} disabled={saving}>← Zurück zu meinen Notizen</button>
              </header>
              <form className={`${panel} academy-note-editor p-5 space-y-4`} onSubmit={event => { event.preventDefault(); void saveNote(); }}>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Titel</span>
                  <input className={field} value={noteTitle} onChange={event => setNoteTitle(event.target.value)} maxLength={200} />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Inhalt</span>
                  <textarea className={field} rows={12} value={noteContent} onChange={event => setNoteContent(event.target.value)} maxLength={20000} />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Schlagwörter</span>
                  <input className={field} value={noteTags} onChange={event => setNoteTags(event.target.value)} placeholder="Mit Kommas getrennt" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Schlagwörter helfen dir, die Notiz später wiederzufinden.</span>
                </label>
                <div className="academy-note-editor-actions flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" className={`${secondary} academy-note-cancel`} onClick={cancelNoteEdit} disabled={saving}>Änderungen verwerfen</button>
                  <button type="submit" className={`${primary} academy-note-save`} disabled={saving || !noteHasUnsavedChanges}>{saving ? 'Speichert …' : 'Änderungen speichern'}</button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <header className="academy-notes-heading space-y-2">
                <p className="academy-notes-eyebrow">PERSÖNLICHER ARBEITSBEREICH</p>
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
                  <label className="academy-notes-search block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Notizen durchsuchen</span>
                    <input className={field} value={noteSearch} onChange={event => setNoteSearch(event.target.value)} placeholder="Titel, Inhalt oder Schlagwort" />
                  </label>
                  <div className={`${panel} academy-notes-list divide-y divide-slate-200 dark:divide-slate-800`}>
                    {filteredNotes.length === 0 ? (
                      <div className="academy-notes-empty p-6">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{notes.length ? 'Keine passenden Notizen' : 'Noch keine Notizen gespeichert'}</h3>
                        <p className={`${muted} mt-1`}>{notes.length ? 'Ändere deinen Suchbegriff, um weitere Einträge zu finden.' : 'Neue Notizen und Lesezeichen legst du direkt im Material-Reader an.'}</p>
                      </div>
                    ) : filteredNotes.map(note => (
                      <article key={note.id} className="academy-note-card p-4 space-y-2">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white">{note.title || (note.kind === 'bookmark' ? 'Lesezeichen' : 'Notiz ohne Titel')}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note.kind === 'bookmark' ? 'Lesezeichen' : 'Private Notiz'} · {dateLabel(note.updatedIso)}</p>
                          </div>
                          <div className="academy-note-card-actions flex flex-wrap gap-2">
                            {note.kind === 'note' && <button type="button" className={secondary} onClick={() => { setEditingNote(note); setNoteTitle(note.title || ''); setNoteContent(note.content || ''); setNoteTags(note.tags.join(', ')); }}>Bearbeiten</button>}
                            <button type="button" className="academy-note-delete" disabled={saving} onClick={() => void deleteNote(note)}>Löschen</button>
                          </div>
                        </div>
                        {note.content && <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap line-clamp-4">{note.content}</p>}
                        {note.tags.length > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">{note.tags.join(' · ')}</p>}
                        <AcademyPrivateNoteSources
                          noteId={note.id}
                          sources={note.sources?.length ? note.sources : [{ materialId: note.materialId, materialVersionId: note.materialVersionId }]}
                        />
                      </article>
                    ))}
                  </div>
                  <div className="academy-notes-reader-hint p-4 space-y-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Notizen und Lesezeichen im Reader</h3>
                    <p className={muted}>Neue Notizen und Lesezeichen legst du direkt beim Lesen eines Materials an. So bleibt jede neue Notiz an die konkrete Materialfassung gebunden.</p>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
};
