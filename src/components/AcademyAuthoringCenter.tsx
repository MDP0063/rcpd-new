import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import type {
  AcademyCourseChapter,
  AcademyCourseCompletionRequirement,
  AcademyCourseDraftDoc,
  AcademyCourseMasterDoc,
  AcademyCourseVersionDoc,
  AcademyLearningObjective,
  AcademyProgramCourseReference,
  AcademyProgramDraftDoc,
  AcademyProgramMasterDoc,
  AcademyProgramVersionDoc
} from '../types/academy';

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
interface Props {
  currentUser: { uid: string; role: string };
  onStatusToast: (message: string) => void;
}
type EditorMode = 'list' | 'new-course' | 'course' | 'new-program' | 'program';

const panel = 'rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';
const field = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const primary = 'inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const secondary = 'inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const danger = 'inline-flex items-center justify-center rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600';

function newId(prefix: string): string {
  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replaceAll('-', '')
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  return prefix + '_' + suffix;
}
function statusName(status: string): string {
  if (status === 'draft') return 'Entwurf';
  if (status === 'published') return 'Veröffentlicht';
  if (status === 'archived') return 'Archiviert';
  return status;
}
function apiErrorMessage(value?: string): string {
  switch (value) {
    case 'ACADEMY_CODE_INVALID': return 'Die Kennung muss mit einem Buchstaben oder einer Zahl beginnen und darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten.';
    case 'ACADEMY_CODE_ALREADY_EXISTS': return 'Diese Kennung wird bereits verwendet. Wähle eine andere Kennung.';
    case 'ACADEMY_WORKING_REVISION_CONFLICT': return 'Dieser Entwurf wurde zwischenzeitlich geändert. Lade die Liste neu und öffne den Entwurf erneut, bevor du weiterarbeitest.';
    case 'ACADEMY_DRAFT_VERSION_MISMATCH': return 'Der gespeicherte Entwurf entspricht nicht mehr der aktuellen Revision. Öffne ihn erneut und prüfe deine Änderungen.';
    case 'ACADEMY_PROGRAM_OBJECTIVES_COUNT': return 'Ein Programm benötigt mindestens drei und höchstens sechs Lernziele.';
    case 'ACADEMY_PROGRAM_DUPLICATE_COURSE': return 'Ein Kurs darf einem Programm nur einmal zugeordnet sein.';
    case 'ACADEMY_PROGRAM_COURSE_REFERENCE_INVALID': return 'Prüfe die Kurszuordnungen und ihre Reihenfolge.';
    case 'ACADEMY_COURSE_TITLE_INVALID': return 'Gib einen Kurstitel mit höchstens 200 Zeichen ein.';
    case 'ACADEMY_PROGRAM_TITLE_INVALID': return 'Gib einen Programmtitel mit höchstens 200 Zeichen ein.';
    case 'ACADEMY_COURSE_CHAPTER_INVALID': return 'Prüfe für jedes Kapitel Titel, Reihenfolge und Pflichtstatus.';
    case 'ACADEMY_COURSE_COMPLETION_TARGET_MISSING': return 'Eine Kapitel-Abschlussbedingung verweist auf ein Kapitel, das nicht mehr vorhanden ist.';
    default: return value || 'Die Änderung konnte nicht gespeichert werden. Prüfe deine Eingaben und versuche es erneut.';
  }
}
function courseValidation(code: string, title: string, objectives: AcademyLearningObjective[], chapters: AcademyCourseChapter[]): string[] {
  const errors: string[] = [];
  if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code.trim().toUpperCase())) errors.push('Die Kurskennung benötigt 2 bis 40 Zeichen und darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten.');
  if (!title.trim()) errors.push('Gib einen Kurstitel ein.');
  if (title.trim().length > 200) errors.push('Der Kurstitel darf höchstens 200 Zeichen enthalten.');
  if (objectives.some(item => !item.description.trim() || item.description.trim().length > 500)) errors.push('Jedes angelegte Lernziel benötigt eine Beschreibung mit höchstens 500 Zeichen.');
  if (chapters.some(item => !item.title.trim() || item.title.trim().length > 200 || (item.description || '').length > 1000)) errors.push('Jedes Kapitel benötigt einen Titel mit höchstens 200 Zeichen; die Beschreibung darf höchstens 1.000 Zeichen enthalten.');
  if (new Set(objectives.map(item => item.id)).size !== objectives.length || new Set(chapters.map(item => item.id)).size !== chapters.length) errors.push('Die internen Kennungen der Lernziele und Kapitel müssen eindeutig sein.');
  return errors;
}
function programValidation(code: string, title: string, objectives: AcademyLearningObjective[], references: AcademyProgramCourseReference[]): string[] {
  const errors: string[] = [];
  if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code.trim().toUpperCase())) errors.push('Die Programmkennung benötigt 2 bis 40 Zeichen und darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten.');
  if (!title.trim()) errors.push('Gib einen Programmtitel ein.');
  if (title.trim().length > 200) errors.push('Der Programmtitel darf höchstens 200 Zeichen enthalten.');
  if (objectives.length < 3 || objectives.length > 6) errors.push('Ein Programm benötigt drei bis sechs Lernziele.');
  if (objectives.some(item => !item.description.trim() || item.description.trim().length > 500)) errors.push('Jedes Lernziel benötigt eine Beschreibung mit höchstens 500 Zeichen.');
  if (new Set(objectives.map(item => item.id)).size !== objectives.length) errors.push('Die Kennungen der Lernziele müssen eindeutig sein.');
  if (new Set(references.map(item => item.courseId)).size !== references.length) errors.push('Ein Kurs darf nur einmal in einem Programm vorkommen.');
  return errors;
}

export const AcademyAuthoringCenter: React.FC<Props> = ({ currentUser, onStatusToast }) => {
  const [mode, setMode] = useState<EditorMode>('list');
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const [programs, setPrograms] = useState<ProgramEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState<string[]>([]);
  const [courseMaster, setCourseMaster] = useState<AcademyCourseMasterDoc | null>(null);
  const [courseDraft, setCourseDraft] = useState<AcademyCourseDraftDoc | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSummary, setCourseSummary] = useState('');
  const [courseObjectives, setCourseObjectives] = useState<AcademyLearningObjective[]>([]);
  const [courseChapters, setCourseChapters] = useState<AcademyCourseChapter[]>([]);
  const [courseRequirements, setCourseRequirements] = useState<AcademyCourseCompletionRequirement[]>([]);
  const [courseDirty, setCourseDirty] = useState(false);
  const [programMaster, setProgramMaster] = useState<AcademyProgramMasterDoc | null>(null);
  const [programDraft, setProgramDraft] = useState<AcademyProgramDraftDoc | null>(null);
  const [programCode, setProgramCode] = useState('');
  const [programTitle, setProgramTitle] = useState('');
  const [programSummary, setProgramSummary] = useState('');
  const [programObjectives, setProgramObjectives] = useState<AcademyLearningObjective[]>([]);
  const [programReferences, setProgramReferences] = useState<AcademyProgramCourseReference[]>([]);
  const [programCourseToAdd, setProgramCourseToAdd] = useState('');
  const [programDirty, setProgramDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const [courseResponse, programResponse] = await Promise.all([
      apiFetch<{ courses: CourseEntry[] }>(API_ENDPOINTS.ACADEMY_COURSES),
      apiFetch<{ programs: ProgramEntry[] }>(API_ENDPOINTS.ACADEMY_PROGRAMS)
    ]);
    if (!courseResponse.ok || !courseResponse.data || !programResponse.ok || !programResponse.data) {
      setLoadError(apiErrorMessage(courseResponse.error || programResponse.error));
      setLoading(false);
      return;
    }
    setCourses(courseResponse.data.courses);
    setPrograms(programResponse.data.programs);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectableCourses = useMemo(
    () => courses.filter(item => item.master.publicationStatus === 'published' &&
      item.master.availability === 'available' && Boolean(item.version)),
    [courses]
  );
  const listedCourses = useMemo(() => [...courses].sort((a, b) => a.master.code.localeCompare(b.master.code, 'de-DE')), [courses]);
  const listedPrograms = useMemo(() => [...programs].sort((a, b) => a.master.code.localeCompare(b.master.code, 'de-DE')), [programs]);

  const resetEditor = () => {
    setCourseMaster(null); setCourseDraft(null); setCourseCode(''); setCourseTitle(''); setCourseSummary('');
    setCourseObjectives([]); setCourseChapters([]); setCourseRequirements([]); setCourseDirty(false);
    setProgramMaster(null); setProgramDraft(null); setProgramCode(''); setProgramTitle(''); setProgramSummary('');
    setProgramObjectives([]); setProgramReferences([]); setProgramDirty(false); setFormError([]);
  };

  const openNewCourse = () => {
    resetEditor();
    setMode('new-course');
  };
  const openNewProgram = () => {
    resetEditor();
    setMode('new-program');
  };
  const openCourse = (entry: CourseEntry) => {
    if (!entry.draft || entry.master.publicationStatus === 'archived') return;
    resetEditor();
    setCourseMaster(entry.master); setCourseDraft(entry.draft); setCourseCode(entry.master.code);
    setCourseTitle(entry.draft.title); setCourseSummary(entry.draft.summary);
    setCourseObjectives(entry.draft.learningObjectives.map(item => ({ ...item })));
    setCourseChapters(entry.draft.chapters.map(item => ({ ...item, materialReferences: item.materialReferences.map(reference => ({ ...reference })) })));
    setCourseRequirements(entry.draft.completionRequirements.map(item => ({ ...item })));
    setMode('course');
  };
  const openProgram = (entry: ProgramEntry) => {
    if (!entry.draft || entry.master.publicationStatus === 'archived') return;
    resetEditor();
    setProgramMaster(entry.master); setProgramDraft(entry.draft); setProgramCode(entry.master.code);
    setProgramTitle(entry.draft.title); setProgramSummary(entry.draft.summary);
    setProgramObjectives(entry.draft.learningObjectives.map(item => ({ ...item })));
    setProgramReferences(entry.draft.courseReferences.map(item => ({ ...item })));
    setMode('program');
  };

  const saveCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = courseValidation(courseCode, courseTitle, courseObjectives, courseChapters);
    if (errors.length) { setFormError(errors); return; }
    setFormError([]);
    setBusy(true);
    const draftPayload = {
      title: courseTitle.trim(), summary: courseSummary.trim(),
      learningObjectives: courseObjectives.map(item => ({ ...item, description: item.description.trim() })),
      chapters: courseChapters.map((item, index) => ({ ...item, title: item.title.trim(), description: item.description.trim(), order: index })),
      completionRequirements: courseRequirements
    };
    if (!courseMaster) {
      const response = await apiFetch<{ master: AcademyCourseMasterDoc; draft: AcademyCourseDraftDoc }>(API_ENDPOINTS.ACADEMY_COURSES, {
        method: 'POST',
        body: JSON.stringify({ code: courseCode.trim().toUpperCase(), ...draftPayload })
      });
      setBusy(false);
      if (!response.ok || !response.data) { setFormError([apiErrorMessage(response.error)]); return; }
      setCourseMaster(response.data.master); setCourseDraft(response.data.draft); setCourseCode(response.data.master.code);
      setCourseDirty(false); setMode('course'); await load();
      onStatusToast('Kursentwurf wurde angelegt. Er ist noch nicht veröffentlicht.');
      return;
    }
    if (!courseDraft) { setBusy(false); setFormError(['Der Kursentwurf konnte nicht geladen werden. Öffne den Kurs erneut.']); return; }
    const response = await apiFetch<{ draft: AcademyCourseDraftDoc }>(API_ENDPOINTS.ACADEMY_COURSE(courseMaster.id) + '/draft', {
      method: 'PUT',
      body: JSON.stringify({ expectedRevision: courseDraft.workingRevision, draft: draftPayload })
    });
    setBusy(false);
    if (!response.ok || !response.data) { setFormError([apiErrorMessage(response.error)]); return; }
    setCourseDraft(response.data.draft); setCourseDirty(false); await load();
    onStatusToast('Kursentwurf wurde gespeichert. Die veröffentlichte Version bleibt unverändert.');
  };

  const publishCourse = async () => {
    if (!courseMaster || !courseDraft || courseDirty || busy) return;
    const errors = courseValidation(courseCode, courseTitle, courseObjectives, courseChapters);
    if (errors.length) { setFormError(errors); return; }
    if (!window.confirm('Möchtest du den gespeicherten Kursentwurf jetzt als neue veröffentlichte Kursversion bereitstellen? Teilnehmende, die bereits begonnen haben, behalten ihre fest zugeordnete Version.')) return;
    setBusy(true);
    const response = await apiFetch<{ master: AcademyCourseMasterDoc; version: AcademyCourseVersionDoc }>(API_ENDPOINTS.ACADEMY_COURSE(courseMaster.id) + '/publish', {
      method: 'POST',
      body: JSON.stringify({ expectedRevision: courseDraft.workingRevision })
    });
    setBusy(false);
    if (!response.ok || !response.data) { setFormError([apiErrorMessage(response.error)]); return; }
    await load();
    setMode('list');
    onStatusToast('Kursversion ' + response.data.version.versionNumber + ' wurde veröffentlicht.');
  };

  const saveProgram = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = programValidation(programCode, programTitle, programObjectives, programReferences);
    if (errors.length) { setFormError(errors); return; }
    setFormError([]);
    setBusy(true);
    const draftPayload = {
      title: programTitle.trim(), summary: programSummary.trim(),
      learningObjectives: programObjectives.map(item => ({ ...item, description: item.description.trim() })),
      courseReferences: programReferences.map((item, index) => ({ ...item, order: index }))
    };
    if (!programMaster) {
      const response = await apiFetch<{ master: AcademyProgramMasterDoc; draft: AcademyProgramDraftDoc }>(API_ENDPOINTS.ACADEMY_PROGRAMS, {
        method: 'POST',
        body: JSON.stringify({ code: programCode.trim().toUpperCase(), ...draftPayload })
      });
      setBusy(false);
      if (!response.ok || !response.data) { setFormError([apiErrorMessage(response.error)]); return; }
      setProgramMaster(response.data.master); setProgramDraft(response.data.draft); setProgramCode(response.data.master.code);
      setProgramDirty(false); setMode('program'); await load();
      onStatusToast('Programmentwurf wurde angelegt. Er ist noch nicht veröffentlicht.');
      return;
    }
    if (!programDraft) { setBusy(false); setFormError(['Der Programmentwurf konnte nicht geladen werden. Öffne das Programm erneut.']); return; }
    const response = await apiFetch<{ draft: AcademyProgramDraftDoc }>(API_ENDPOINTS.ACADEMY_PROGRAM(programMaster.id) + '/draft', {
      method: 'PUT',
      body: JSON.stringify({ expectedRevision: programDraft.workingRevision, draft: draftPayload })
    });
    setBusy(false);
    if (!response.ok || !response.data) { setFormError([apiErrorMessage(response.error)]); return; }
    setProgramDraft(response.data.draft); setProgramDirty(false); await load();
    onStatusToast('Programmentwurf wurde gespeichert. Die veröffentlichte Version bleibt unverändert.');
  };

  const publishProgram = async () => {
    if (!programMaster || !programDraft || programDirty || busy) return;
    const errors = programValidation(programCode, programTitle, programObjectives, programReferences);
    if (errors.length) { setFormError(errors); return; }
    if (!window.confirm('Möchtest du den gespeicherten Programmentwurf jetzt als neue Programmversion veröffentlichen? Bei einer Teilnahme werden die Pflichtkursversionen zu diesem Zeitpunkt fest zugeordnet.')) return;
    setBusy(true);
    const response = await apiFetch<{ master: AcademyProgramMasterDoc; version: AcademyProgramVersionDoc }>(API_ENDPOINTS.ACADEMY_PROGRAM(programMaster.id) + '/publish', {
      method: 'POST',
      body: JSON.stringify({ expectedRevision: programDraft.workingRevision })
    });
    setBusy(false);
    if (!response.ok || !response.data) { setFormError([apiErrorMessage(response.error)]); return; }
    await load();
    setMode('list');
    onStatusToast('Programmversion ' + response.data.version.versionNumber + ' wurde veröffentlicht.');
  };

  const addCourseObjective = () => { setCourseObjectives(items => [...items, { id: newId('objective'), description: '' }]); setCourseDirty(true); };
  const addCourseChapter = () => {
    setCourseChapters(items => [...items, { id: newId('chapter'), title: '', description: '', materialReferences: [], required: false, order: items.length }]);
    setCourseDirty(true);
  };
  const addProgramObjective = () => { if (programObjectives.length < 6) setProgramObjectives(items => [...items, { id: newId('objective'), description: '' }]); setProgramDirty(true); };
  const addProgramCourse = () => {
    if (!programCourseToAdd || programReferences.some(item => item.courseId === programCourseToAdd)) return;
    setProgramReferences(items => [...items, { courseId: programCourseToAdd, requirement: 'required', order: items.length }]);
    setProgramDirty(true);
  };
  const setChapterCompletionRequired = (chapterId: string, checked: boolean) => {
    setCourseRequirements(current => {
      const without = current.filter(item => !(item.type === 'required_chapter' && item.targetId === chapterId));
      if (!checked) return without;
      const chapter = courseChapters.find(item => item.id === chapterId);
      return [...without, { id: newId('requirement'), type: 'required_chapter', targetId: chapterId, required: true, description: chapter ? 'Kapitel abgeschlossen: ' + chapter.title : 'Kapitel abgeschlossen' }];
    });
    setCourseDirty(true);
  };

  const isCourseEditor = mode === 'new-course' || mode === 'course';
  const isProgramEditor = mode === 'new-program' || mode === 'program';

  if (loading && mode === 'list') {
    return <section className={panel} aria-live="polite"><p className="text-sm text-slate-600 dark:text-slate-300">Kurs- und Programmdaten werden geladen …</p></section>;
  }

  return (
    <div className="space-y-6">
      {mode === 'list' && (
        <>
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Kurse und Programme verwalten</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Entwürfe bearbeiten, neue Versionen vorbereiten und Veröffentlichungen bewusst auslösen.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondary} onClick={openNewCourse}>Neuen Kurs anlegen</button>
              <button type="button" className={primary} onClick={openNewProgram}>Neues Programm anlegen</button>
            </div>
          </header>
          {loadError && <div role="alert" className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{loadError} <button type="button" className="underline" onClick={() => void load()}>Erneut laden</button></div>}
          <section className={panel} aria-labelledby="academy-author-courses-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="academy-author-courses-heading" className="font-semibold text-slate-900 dark:text-white">Kurse</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">{listedCourses.length} Einträge</span>
            </div>
            {listedCourses.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">Noch keine Kurse vorhanden.</p> : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {listedCourses.map(entry => (
                  <li key={entry.master.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white">{entry.draft?.title || entry.version?.title || entry.master.code}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{entry.master.code} · {statusName(entry.master.publicationStatus)} · {entry.master.latestVersionNumber > 0 ? 'Veröffentlichte Version ' + entry.master.latestVersionNumber : 'Noch keine veröffentlichte Version'}{entry.draft ? ' · Entwurf Revision ' + entry.draft.workingRevision : ''}</p>
                    </div>
                    {entry.draft && entry.master.publicationStatus !== 'archived'
                      ? <button type="button" className={secondary} onClick={() => openCourse(entry)}>Entwurf bearbeiten</button>
                      : <span className="text-xs text-slate-500 dark:text-slate-400">{entry.master.publicationStatus === 'archived' ? 'Archiviert – schreibgeschützt' : 'Kein bearbeitbarer Entwurf'}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={panel} aria-labelledby="academy-author-programs-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="academy-author-programs-heading" className="font-semibold text-slate-900 dark:text-white">Programme</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">{listedPrograms.length} Einträge</span>
            </div>
            {listedPrograms.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">Noch keine Programme vorhanden.</p> : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {listedPrograms.map(entry => (
                  <li key={entry.master.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white">{entry.draft?.title || entry.version?.title || entry.master.code}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{entry.master.code} · {statusName(entry.master.publicationStatus)} · {entry.master.latestVersionNumber > 0 ? 'Veröffentlichte Version ' + entry.master.latestVersionNumber : 'Noch keine veröffentlichte Version'}{entry.draft ? ' · Entwurf Revision ' + entry.draft.workingRevision : ''}</p>
                    </div>
                    {entry.draft && entry.master.publicationStatus !== 'archived'
                      ? <button type="button" className={secondary} onClick={() => openProgram(entry)}>Entwurf bearbeiten</button>
                      : <span className="text-xs text-slate-500 dark:text-slate-400">{entry.master.publicationStatus === 'archived' ? 'Archiviert – schreibgeschützt' : 'Kein bearbeitbarer Entwurf'}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {isCourseEditor && (
        <section className="mx-auto max-w-3xl space-y-5">
          <header className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Kursverwaltung</p><h2 className="text-xl font-semibold text-slate-900 dark:text-white">{courseMaster ? 'Kursentwurf bearbeiten' : 'Neuen Kurs anlegen'}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{courseMaster ? courseCode + ' · Revision ' + courseDraft?.workingRevision : 'Ein neuer Kurs beginnt als unveröffentlichter Entwurf.'}</p></div>
            <button type="button" className={secondary} onClick={() => { setMode('list'); setFormError([]); }}>Zurück zur Verwaltung</button>
          </header>
          {formError.length > 0 && <div role="alert" aria-live="assertive" className="rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"><p className="font-semibold">Bitte prüfe folgende Angaben:</p><ul className="mt-2 list-disc space-y-1 pl-5">{formError.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
          <form className="space-y-5" noValidate onSubmit={saveCourse}>
            <section className={panel + ' space-y-4'}>
              <h3 className="font-semibold text-slate-900 dark:text-white">Grunddaten</h3>
              <div><label htmlFor="academy-course-code" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Kurskennung</label><input id="academy-course-code" className={field} value={courseCode} onChange={event => { setCourseCode(event.target.value.toUpperCase()); setCourseDirty(true); }} disabled={Boolean(courseMaster)} maxLength={40} autoComplete="off" /><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">2 bis 40 Zeichen, eindeutig im Academy-Bereich</p></div>
              <div><label htmlFor="academy-course-title" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Kurstitel</label><input id="academy-course-title" className={field} value={courseTitle} onChange={event => { setCourseTitle(event.target.value); setCourseDirty(true); }} maxLength={200} /></div>
              <div><label htmlFor="academy-course-summary" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Zusammenfassung</label><textarea id="academy-course-summary" className={field} value={courseSummary} onChange={event => { setCourseSummary(event.target.value); setCourseDirty(true); }} maxLength={2000} rows={4} /><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Bis zu 2.000 Zeichen</p></div>
            </section>
            <section className={panel + ' space-y-4'}>
              <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900 dark:text-white">Lernziele</h3><button type="button" className={secondary} onClick={addCourseObjective}>Lernziel hinzufügen</button></div>
              {courseObjectives.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-300">Noch keine Lernziele angelegt.</p>}
              {courseObjectives.map((item, index) => <div key={item.id} className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700"><label htmlFor={'academy-course-objective-' + item.id} className="block text-sm font-medium text-slate-800 dark:text-slate-200">Lernziel {index + 1}</label><textarea id={'academy-course-objective-' + item.id} className={field} rows={2} maxLength={500} value={item.description} onChange={event => { setCourseObjectives(items => items.map(current => current.id === item.id ? { ...current, description: event.target.value } : current)); setCourseDirty(true); }} /><button type="button" className={danger} onClick={() => { setCourseObjectives(items => items.filter(current => current.id !== item.id)); setCourseDirty(true); }}>Lernziel entfernen</button></div>)}
            </section>
            <section className={panel + ' space-y-4'}>
              <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900 dark:text-white">Kapitel</h3><button type="button" className={secondary} onClick={addCourseChapter}>Kapitel hinzufügen</button></div>
              {courseChapters.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-300">Noch keine Kapitel angelegt.</p>}
              {courseChapters.map((item, index) => {
                const completionRequired = courseRequirements.some(requirement => requirement.type === 'required_chapter' && requirement.targetId === item.id && requirement.required);
                return <div key={item.id} className="space-y-3 rounded-md border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-3"><h4 className="font-medium text-slate-900 dark:text-white">Kapitel {index + 1}</h4><button type="button" className={danger} onClick={() => { setCourseChapters(items => items.filter(chapter => chapter.id !== item.id).map((chapter, order) => ({ ...chapter, order }))); setCourseRequirements(items => items.filter(requirement => !(requirement.type === 'required_chapter' && requirement.targetId === item.id))); setCourseDirty(true); }}>Kapitel entfernen</button></div>
                  <div><label htmlFor={'academy-chapter-title-' + item.id} className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Kapiteltitel</label><input id={'academy-chapter-title-' + item.id} className={field} maxLength={200} value={item.title} onChange={event => { setCourseChapters(items => items.map(chapter => chapter.id === item.id ? { ...chapter, title: event.target.value } : chapter)); setCourseDirty(true); }} /></div>
                  <div><label htmlFor={'academy-chapter-description-' + item.id} className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Beschreibung</label><textarea id={'academy-chapter-description-' + item.id} className={field} rows={2} maxLength={1000} value={item.description || ''} onChange={event => { setCourseChapters(items => items.map(chapter => chapter.id === item.id ? { ...chapter, description: event.target.value } : chapter)); setCourseDirty(true); }} /></div>
                  <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={item.required} onChange={event => { setCourseChapters(items => items.map(chapter => chapter.id === item.id ? { ...chapter, required: event.target.checked } : chapter)); setCourseDirty(true); }} className="mt-1" />Kapitel ist als Pflichtinhalt gekennzeichnet</label>
                  <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={completionRequired} onChange={event => setChapterCompletionRequired(item.id, event.target.checked)} className="mt-1" />Für dieses Kapitel ist ein eigener Abschlussnachweis erforderlich</label>
                  {item.materialReferences.length > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">{item.materialReferences.length} bestehende Materialreferenz(en) werden unverändert beibehalten.</p>}
                </div>;
              })}
              <p className="text-xs text-slate-500 dark:text-slate-400">Die Zuordnung konkreter Dokumentversionen folgt mit der versionierten Lernbibliothek. Bereits vorhandene Referenzen bleiben beim Speichern erhalten.</p>
            </section>
            {courseRequirements.some(item => item.type !== 'required_chapter') && <section className={panel}><h3 className="font-semibold text-slate-900 dark:text-white">Weitere Abschlussbedingungen</h3><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{courseRequirements.filter(item => item.type !== 'required_chapter').length} weitere Abschlussbedingung(en) bleiben bei Änderungen erhalten. Ihre Bearbeitung folgt mit der Prüfungs- und Materialintegration.</p></section>}
            <div className="flex flex-wrap items-center gap-2"><button type="submit" className={primary} disabled={busy}>{busy ? 'Speichern …' : courseMaster ? 'Entwurf speichern' : 'Kursentwurf anlegen'}</button>{courseMaster && <button type="button" className={secondary} onClick={() => void publishCourse()} disabled={busy || courseDirty || !courseDraft}>{busy ? 'Bitte warten …' : 'Gespeicherte Version veröffentlichen'}</button>}</div>
            {courseDirty && courseMaster && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">Es gibt ungespeicherte Änderungen. Speichere den Entwurf, bevor du eine neue Version veröffentlichst.</p>}
            {courseMaster && <p className="text-xs text-slate-500 dark:text-slate-400">Veröffentlichungsstatus: {statusName(courseMaster.publicationStatus)}. Das Speichern ändert keine bereits veröffentlichte Version und startet keine Kursteilnahmen.</p>}
          </form>
        </section>
      )}

      {isProgramEditor && (
        <section className="mx-auto max-w-3xl space-y-5">
          <header className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Programmverwaltung</p><h2 className="text-xl font-semibold text-slate-900 dark:text-white">{programMaster ? 'Programmentwurf bearbeiten' : 'Neues Programm anlegen'}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{programMaster ? programCode + ' · Revision ' + programDraft?.workingRevision : 'Ein neues Programm beginnt als unveröffentlichter Entwurf.'}</p></div>
            <button type="button" className={secondary} onClick={() => { setMode('list'); setFormError([]); }}>Zurück zur Verwaltung</button>
          </header>
          {formError.length > 0 && <div role="alert" aria-live="assertive" className="rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"><p className="font-semibold">Bitte prüfe folgende Angaben:</p><ul className="mt-2 list-disc space-y-1 pl-5">{formError.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
          <form className="space-y-5" noValidate onSubmit={saveProgram}>
            <section className={panel + ' space-y-4'}>
              <h3 className="font-semibold text-slate-900 dark:text-white">Grunddaten</h3>
              <div><label htmlFor="academy-program-code" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Programmkennung</label><input id="academy-program-code" className={field} value={programCode} onChange={event => { setProgramCode(event.target.value.toUpperCase()); setProgramDirty(true); }} disabled={Boolean(programMaster)} maxLength={40} autoComplete="off" /><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">2 bis 40 Zeichen, eindeutig im Academy-Bereich</p></div>
              <div><label htmlFor="academy-program-title" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Programmname</label><input id="academy-program-title" className={field} value={programTitle} onChange={event => { setProgramTitle(event.target.value); setProgramDirty(true); }} maxLength={200} /></div>
              <div><label htmlFor="academy-program-summary" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Zusammenfassung</label><textarea id="academy-program-summary" className={field} value={programSummary} onChange={event => { setProgramSummary(event.target.value); setProgramDirty(true); }} maxLength={2000} rows={4} /></div>
            </section>
            <section className={panel + ' space-y-4'}>
              <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900 dark:text-white">Lernziele</h3><button type="button" className={secondary} onClick={addProgramObjective} disabled={programObjectives.length >= 6}>Lernziel hinzufügen</button></div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ein Programm benötigt drei bis sechs konkrete Lernziele.</p>
              {programObjectives.map((item, index) => <div key={item.id} className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700"><label htmlFor={'academy-program-objective-' + item.id} className="block text-sm font-medium text-slate-800 dark:text-slate-200">Lernziel {index + 1}</label><textarea id={'academy-program-objective-' + item.id} className={field} rows={2} maxLength={500} value={item.description} onChange={event => { setProgramObjectives(items => items.map(current => current.id === item.id ? { ...current, description: event.target.value } : current)); setProgramDirty(true); }} /><button type="button" className={danger} onClick={() => { setProgramObjectives(items => items.filter(current => current.id !== item.id)); setProgramDirty(true); }}>Lernziel entfernen</button></div>)}
            </section>
            <section className={panel + ' space-y-4'}>
              <h3 className="font-semibold text-slate-900 dark:text-white">Kurszuordnung</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Du kannst veröffentlichte, verfügbare Kurse als Pflicht- oder Empfehlungskurse aufnehmen. Die genaue Kursversion wird bei einer Programmteilnahme fest zugeordnet.</p>
              <div className="flex flex-col gap-2 sm:flex-row"><div className="min-w-0 flex-1"><label htmlFor="academy-program-course-select" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">Kurs auswählen</label><select id="academy-program-course-select" className={field} value={programCourseToAdd} onChange={event => setProgramCourseToAdd(event.target.value)}><option value="">Kurs auswählen</option>{selectableCourses.filter(item => !programReferences.some(reference => reference.courseId === item.master.id)).map(item => <option key={item.master.id} value={item.master.id}>{item.master.code} · {item.version?.title || item.master.code}</option>)}</select></div><button type="button" className={secondary + ' self-end'} onClick={addProgramCourse} disabled={!programCourseToAdd}>Kurs hinzufügen</button></div>
              {programReferences.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">Noch keine Kurse zugeordnet.</p> : <ul className="divide-y divide-slate-200 dark:divide-slate-800">{programReferences.map(reference => {
                const course = courses.find(item => item.master.id === reference.courseId);
                return <li key={reference.courseId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium text-slate-900 dark:text-white">{course?.master.code || reference.courseId} · {course?.version?.title || course?.draft?.title || 'Kursreferenz'}</p><p className="text-xs text-slate-500 dark:text-slate-400">Reihenfolge {reference.order + 1}</p></div><div className="flex flex-wrap items-center gap-2"><label className="text-xs text-slate-600 dark:text-slate-300" htmlFor={'academy-program-requirement-' + reference.courseId}>Einstufung</label><select id={'academy-program-requirement-' + reference.courseId} className={field + ' min-w-36'} value={reference.requirement} onChange={event => { setProgramReferences(items => items.map(item => item.courseId === reference.courseId ? { ...item, requirement: event.target.value as 'required' | 'recommended' } : item)); setProgramDirty(true); }}><option value="required">Erforderlich</option><option value="recommended">Empfohlen</option></select><button type="button" className={danger} onClick={() => { setProgramReferences(items => items.filter(item => item.courseId !== reference.courseId).map((item, index) => ({ ...item, order: index }))); setProgramDirty(true); }}>Entfernen</button></div></li>;
              })}</ul>}
              {selectableCourses.length === 0 && <p className="text-sm text-amber-700 dark:text-amber-300">Es gibt noch keine veröffentlichten und verfügbaren Kurse, die zugeordnet werden können.</p>}
            </section>
            <div className="flex flex-wrap items-center gap-2"><button type="submit" className={primary} disabled={busy}>{busy ? 'Speichern …' : programMaster ? 'Entwurf speichern' : 'Programmentwurf anlegen'}</button>{programMaster && <button type="button" className={secondary} onClick={() => void publishProgram()} disabled={busy || programDirty || !programDraft}>{busy ? 'Bitte warten …' : 'Gespeicherte Version veröffentlichen'}</button>}</div>
            {programDirty && programMaster && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">Es gibt ungespeicherte Änderungen. Speichere den Entwurf, bevor du eine neue Version veröffentlichst.</p>}
            {programMaster && <p className="text-xs text-slate-500 dark:text-slate-400">Veröffentlichungsstatus: {statusName(programMaster.publicationStatus)}. Erforderliche Kurse bestimmen den Programmabschluss; empfohlene Kurse sind kein Abschlusskriterium.</p>}
          </form>
        </section>
      )}
    </div>
  );
};
