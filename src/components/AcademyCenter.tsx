import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  CheckCircle2,
  Lock,
  Plus,
  Award,
  FileText,
  Clock,
  Upload,
  Terminal
} from 'lucide-react';
import {
  AcademyExamDoc,
  AssessmentStage,
  ExamQuestionPublicItem,
  ModuleCategory,
  ModuleEmbedType,
  OfficerRole,
  ROLE_HIERARCHY,
  TrainingModuleDoc,
  UserProgressDoc,
  UserPublicProfile
} from '../types/portal';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import { ExamParticipantRunner } from './ExamParticipantRunner';
import { ExamReviewCenter } from './ExamReviewCenter';
import { ExamCorrectionCenter } from './ExamCorrectionCenter';
import { AcademyLearningCenter } from './AcademyLearningCenter';
import { AcademyAuthoringCenter } from './AcademyAuthoringCenter';

interface AcademyCenterProps {
  currentUser: UserPublicProfile;
  roster?: UserPublicProfile[];
  modules: TrainingModuleDoc[];
  exams: AcademyExamDoc[];
  userProgress: UserProgressDoc[];
  onRefreshState: () => Promise<void>;
  onStatusToast: (msg: string) => void;
}

export const AcademyCenter: React.FC<AcademyCenterProps> = ({
  currentUser,
  roster = [],
  modules,
  exams,
  userProgress,
  onRefreshState,
  onStatusToast
}) => {
  const rolePermissions = ROLE_HIERARCHY[currentUser.role] || ROLE_HIERARCHY.trainee;
  const assignedCourses = currentUser.granularPermissions?.assignedCourseCodes || [];
  const hasScopedCourseRights =
    Boolean(currentUser.granularPermissions?.canGradeAssignedCourses) &&
    assignedCourses.length > 0;
  const canEditAcademy = rolePermissions.canEditAcademy || hasScopedCourseRights; // True for Admin, Colonel, or Granular Course Instructor
  const canAccessFinalExams = rolePermissions.canAccessFinalExams; // False for Trainee, True for Rookie/Officer/Colonel/Admin

  const [activeTab, setActiveTab] = useState<
    'overview' | 'courses' | 'modules' | 'notes' | 'exam_center' | 'exam_reviews' | 'exam_corrections' | 'tests' | 'final_exams' | 'instructor_grading' | 'upload_textbook' | 'add_code_test'
  >('overview');
  const [courseAreaMode, setCourseAreaMode] = useState<'learning' | 'management'>('learning');
  const canAuthorCourses = currentUser.role === 'admin' || currentUser.role === 'colonel';

  // Granular Instructor Grading Form State
  const [gradeTargetUserUid, setGradeTargetUserUid] = useState<string>('');
  const [gradeCourseCode, setGradeCourseCode] = useState<string>(
    assignedCourses[0] && assignedCourses[0] !== '*' ? assignedCourses[0] : 'SOP-01'
  );
  const [gradeCourseTitle, setGradeCourseTitle] = useState<string>(
    'Praxis- & Lehrgangsbewertung'
  );
  const [gradeScorePercent, setGradeScorePercent] = useState<number>(92);
  const [gradeStatus, setGradeStatus] = useState<'passed' | 'completed' | 'failed'>('passed');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [moduleSortOrder, setModuleSortOrder] = useState<'alphabetical' | 'updated'>('alphabetical');
  const [isLibraryNavigationOpen, setIsLibraryNavigationOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  // Interactive Test/Exam Runner State
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [customCodeScore, setCustomCodeScore] = useState<number>(100);
  const [examSubmittedResult, setExamSubmittedResult] = useState<{
    score: number;
    passed: boolean;
  } | null>(null);
  const [examExplanations, setExamExplanations] = useState<Record<string, string>>({});

  // Admin / Colonel: Upload PDF / Textbook State
  const [modTitle, setModTitle] = useState('');
  const [modCode, setModCode] = useState('SOP-101');
  const [modCategory, setModCategory] = useState<ModuleCategory>('SOP & Policy');
  const [modRequiredRole, setModRequiredRole] = useState<OfficerRole>('trainee');
  const [modEmbedType, setModEmbedType] = useState<ModuleEmbedType>('pdf_upload');
  const [modMarkdown, setModMarkdown] = useState('');
  const [modExternalUrl, setModExternalUrl] = useState('');
  const [modPdfDataUrl, setModPdfDataUrl] = useState('');
  const [modPdfFileName, setModPdfFileName] = useState('');
  const [modInteractiveCode, setModInteractiveCode] = useState('');
  const [modMinutes, setModMinutes] = useState<number>(25);

  // Admin / Colonel: Add Test or Final Exam as Code State
  const [examTitle, setExamTitle] = useState('');
  const [examModuleCode, setExamModuleCode] = useState('TEST-101');
  const [examStage, setExamStage] = useState<AssessmentStage>('test');
  const [examPassingScore, setExamPassingScore] = useState<number>(75);
  const [examTimeLimit, setExamTimeLimit] = useState<number>(20);
  const [examFormat, setExamFormat] = useState<'interactive_code' | 'structured_quiz'>('interactive_code');
  const [examWidgetCode, setExamWidgetCode] = useState(
    `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; color: #0f172a; padding: 20px; margin: 0; }
  .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; }
  h3 { margin-top: 0; color: #0f172a; }
  button { background: #0284c7; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; }
</style>
</head>
<body>
  <div class="card">
    <h3>Interaktives Prüfungs- / Testmodul</h3>
    <p>Füge hier deinen gewünschten HTML/JS Prüfungs-Code oder dein interaktives Szenario ein.</p>
  </div>
</body>
</html>`
  );
  const [examQuestionsJson, setExamQuestionsJson] = useState('[]');

  const myProgress = userProgress.filter(p => p.userId === currentUser.uid);

  const getModuleProgress = (modId: string) =>
    myProgress.find(p => p.targetType === 'module' && p.targetId === modId);

  const getExamProgress = (examId: string) =>
    myProgress.find(p => (p.targetType === 'test' || p.targetType === 'final_exam') && p.targetId === examId);

  const practiceTests = exams.filter(e => e.assessmentStage !== 'final_exam');
  const finalExams = exams.filter(e => e.assessmentStage === 'final_exam');

  const normalizedModuleSearch = moduleSearchQuery.trim().toLocaleLowerCase('de-DE');
  const filteredModules = modules.filter(module => {
    if (!normalizedModuleSearch) return true;
    return [module.title, module.code, module.category, module.pdfFileName || '']
      .some(value => value.toLocaleLowerCase('de-DE').includes(normalizedModuleSearch));
  });
  const sortedModules = [...filteredModules].sort((a, b) => {
    if (moduleSortOrder === 'updated') {
      const dateA = a.updatedIso ? Date.parse(a.updatedIso) : Number.NaN;
      const dateB = b.updatedIso ? Date.parse(b.updatedIso) : Number.NaN;
      if (Number.isFinite(dateA) && Number.isFinite(dateB) && dateA !== dateB) return dateB - dateA;
      if (Number.isFinite(dateA) !== Number.isFinite(dateB)) return Number.isFinite(dateA) ? -1 : 1;
    }
    return a.title.localeCompare(b.title, 'de-DE');
  });

  const currentModule = modules.find(module => module.id === activeModuleId) || null;

  // PDFs werden erst beim Öffnen eines Handbuchs nachgeladen.
  const [pdfCache, setPdfCache] = useState<Record<string, string>>({});
  const currentModuleId = currentModule ? `${currentModule.id}:${currentModule.updatedIso || ''}` : undefined;
  const currentHasPdf = Boolean(currentModule?.hasPdf || currentModule?.pdfDataUrl);
  const currentPdfLoaded = currentModuleId ? currentModuleId in pdfCache : false;
  useEffect(() => {
    if (!currentModuleId || !currentHasPdf || currentPdfLoaded) return;
    let cancelled = false;
    void apiFetch<{ pdfDataUrl: string }>(API_ENDPOINTS.ACADEMY_MODULE_PDF(currentModule!.id)).then(res => {
      if (cancelled || !res.ok || !res.data) return;
      const url = res.data.pdfDataUrl || '';
      setPdfCache(prev => ({ ...prev, [currentModuleId]: url }));
    });
    return () => {
      cancelled = true;
    };
  }, [currentModuleId, currentHasPdf, currentPdfLoaded]);
  const currentPdfUrl = (currentModuleId && pdfCache[currentModuleId]) || currentModule?.pdfDataUrl || '';

  const activeExamList = activeTab === 'final_exams' ? finalExams : practiceTests;
  const currentExam =
    activeExamList.find(e => e.id === activeExamId) || activeExamList[0] || null;

  // Handle local PDF or Document file selection -> Base64 Data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModPdfFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setModPdfDataUrl(reader.result);
        onStatusToast(`Datei "${file.name}" geladen und bereit zum Speichern.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMarkModuleComplete = async (mod: TrainingModuleDoc) => {
    const res = await apiFetch(API_ENDPOINTS.PROGRESS, {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUser.uid,
        targetId: mod.id,
        targetType: 'module',
        targetTitle: mod.title,
        status: 'completed',
        scorePercent: 100
      })
    });
    if (res.ok) {
      await onRefreshState();
      onStatusToast(`Lehrmaterial "${mod.title}" als gelesen/absolviert markiert.`);
    } else {
      onStatusToast(res.error || 'Fehler beim Speichern des Fortschritts.');
    }
  };

  const handleSubmitExam = async (
    exam: AcademyExamDoc,
    parsedQuestions: ExamQuestionPublicItem[]
  ) => {
    const isStructuredQuiz = exam.examFormat === 'structured_quiz';
    if (isStructuredQuiz && parsedQuestions.length === 0) {
      onStatusToast('Diese Prüfung enthält keine gültigen Fragen und kann nicht abgegeben werden.');
      return;
    }
    if (isStructuredQuiz) {
      const unansweredCount = parsedQuestions.filter(q => examAnswers[q.id] === undefined).length;
      if (unansweredCount > 0) {
        onStatusToast(
          `Bitte beantworte zuerst alle ${parsedQuestions.length} Prüfungsfragen (${unansweredCount} noch offen).`
        );
        return;
      }
    }
    const res = await apiFetch<{
      scorePercent: number;
      passed: boolean;
      explanations?: Record<string, string>;
    }>(API_ENDPOINTS.PROGRESS, {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUser.uid,
        targetId: exam.id,
        targetType: exam.assessmentStage === 'final_exam' ? 'final_exam' : 'test',
        ...(isStructuredQuiz ? { answers: examAnswers } : { scorePercent: customCodeScore })
      })
    });

    if (!res.ok || !res.data) {
      onStatusToast(res.error || 'Fehler beim Speichern des Ergebnisses.');
      return;
    }

    const scorePercent = res.data.scorePercent;
    const passed = res.data.passed;
    setExamSubmittedResult({ score: scorePercent, passed });
    setExamExplanations(res.data.explanations || {});
    await onRefreshState();
    onStatusToast(
      passed
        ? `Erfolgreich bestanden (${scorePercent}%)! Im Fortschrittstracking gespeichert.`
        : `Nicht bestanden (${scorePercent}% / erforderlich: ${exam.passingScore}%).`
    );
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditAcademy) return;

    const res = await apiFetch<{ ok: boolean; module: TrainingModuleDoc }>(
      API_ENDPOINTS.ACADEMY_MODULES,
      {
        method: 'POST',
        body: JSON.stringify({
          actorUid: currentUser.uid,
          title: modTitle,
          code: modCode,
          category: modCategory,
          requiredRole: modRequiredRole,
          embedType: modEmbedType,
          contentMarkdown: modMarkdown,
          externalUrl: modExternalUrl,
          pdfDataUrl: modPdfDataUrl,
          pdfFileName: modPdfFileName,
          interactiveCode: modInteractiveCode,
          estimatedMinutes: Number(modMinutes) || 25
        })
      }
    );

    if (!res.ok || !res.data) {
      onStatusToast(res.error || 'Lehrbuch/Dokument konnte nicht gespeichert werden.');
      return;
    }

    await onRefreshState();
    setModTitle('');
    setModMarkdown('');
    setModPdfDataUrl('');
    setModPdfFileName('');
    onStatusToast(`Lehrmaterial "${res.data.module.title}" erfolgreich veröffentlicht.`);
    setActiveTab('modules');
    setActiveModuleId(res.data.module.id);
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditAcademy) return;

    if (examFormat === 'structured_quiz') {
      try {
        JSON.parse(examQuestionsJson);
      } catch {
        onStatusToast('Fehler: Das eingegebene Fragen-JSON ist ungültig.');
        return;
      }
    }

    const res = await apiFetch<{ ok: boolean; exam: AcademyExamDoc }>(
      API_ENDPOINTS.ACADEMY_EXAMS,
      {
        method: 'POST',
        body: JSON.stringify({
          actorUid: currentUser.uid,
          title: examTitle,
          moduleCode: examModuleCode,
          assessmentStage: examStage,
          passingScore: Number(examPassingScore) || 75,
          timeLimitMinutes: Number(examTimeLimit) || 20,
          examFormat,
          questionsPayload: examQuestionsJson,
          interactiveWidgetCode: examWidgetCode
        })
      }
    );

    if (!res.ok || !res.data) {
      onStatusToast(res.error || 'Test/Prüfung konnte nicht erstellt werden.');
      return;
    }

    await onRefreshState();
    setExamTitle('');
    onStatusToast(
      `${examStage === 'final_exam' ? 'Abschlussprüfung' : 'Übungstest'} "${res.data.exam.title}" veröffentlicht.`
    );
    setActiveTab(examStage === 'final_exam' ? 'final_exams' : 'tests');
    setActiveExamId(res.data.exam.id);
  };

  const handleDeleteModule = async (id: string) => {
    if (!canEditAcademy) return;
    const res = await apiFetch(
      `${API_ENDPOINTS.ACADEMY_MODULES}/${id}?actorUid=${encodeURIComponent(currentUser.uid)}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      await onRefreshState();
      onStatusToast('Lehrmaterial entfernt.');
    } else {
      onStatusToast(res.error || 'Lehrmaterial konnte nicht gelöscht werden.');
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (currentUser.role !== 'admin') return;
    const reason = window.prompt('Begründung für die Archivierung dieser älteren Prüfung:');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      onStatusToast('Bitte gib einen nachvollziehbaren Archivierungsgrund ein.');
      return;
    }
    const res = await apiFetch(
      `${API_ENDPOINTS.ACADEMY_EXAMS}/${id}?actorUid=${encodeURIComponent(currentUser.uid)}`,
      { method: 'DELETE', body: JSON.stringify({ reason }) }
    );
    if (res.ok) {
      await onRefreshState();
      onStatusToast('Ältere Prüfung wurde archiviert.');
    } else {
      onStatusToast(res.error || 'Test / Prüfung konnte nicht gelöscht werden.');
    }
  };

  const handleAssignInstructorGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeTargetUserUid || !gradeCourseCode.trim()) {
      onStatusToast('Bitte Teilnehmer und Lehrgangs-Code auswählen.');
      return;
    }
    setSubmittingGrade(true);
    const res = await apiFetch(API_ENDPOINTS.INSTRUCTOR_GRADE, {
      method: 'POST',
      body: JSON.stringify({
        instructorUid: currentUser.uid,
        targetUserUid: gradeTargetUserUid,
        courseCode: gradeCourseCode.trim().toUpperCase(),
        targetTitle: gradeCourseTitle.trim(),
        targetType: 'module',
        status: gradeStatus,
        scorePercent: Number(gradeScorePercent),
        instructorFeedback: gradeFeedback.trim()
      })
    });
    setSubmittingGrade(false);

    if (!res.ok) {
      onStatusToast(res.error || 'Notenvergabe fehlgeschlagen.');
      return;
    }

    setGradeFeedback('');
    await onRefreshState();
    onStatusToast(
      `Lehrgangs-Note (${gradeScorePercent}% · ${gradeStatus.toUpperCase()}) für ${gradeCourseCode.toUpperCase()} gespeichert und Teilnehmer benachrichtigt.`
    );
  };

  const renderStructuredHandbookContent = (markdown: string) => {
    const blocks = markdown
      .split(/\n{2,}/)
      .map(b => b.trim())
      .filter(Boolean);

    return (
      <div className="space-y-4 text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed">
        {blocks.map((block, index) => {
          if (block.startsWith('# ')) {
            return (
              <h3
                key={index}
                className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white pt-3 pb-2 border-b border-slate-200 dark:border-slate-800"
              >
                {block.replace(/^#\s+/, '')}
              </h3>
            );
          }
          if (block.startsWith('## ') || block.startsWith('### ')) {
            return (
              <h4
                key={index}
                className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white pt-3 pb-1 border-b border-slate-100 dark:border-slate-800"
              >
                {block.replace(/^#{2,3}\s+/, '')}
              </h4>
            );
          }
          // Check if block is a bullet list
          const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.every(l => l.startsWith('- ') || l.startsWith('• ') || l.startsWith('* '))) {
            return (
              <ul
                key={index}
                className="list-disc pl-6 space-y-2 text-slate-800 dark:text-slate-100"
              >
                {lines.map((item, i) => (
                  <li key={i} className="leading-relaxed">
                    {item.replace(/^[-•*]\s+/, '')}
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <div key={index} className="space-y-2.5">
              {lines.map((line, lineIdx) => {
                if (/^(\d+\.|§\s*\d+|Kapitel\s+\d+|Abschnitt\s+\d+)/i.test(line) && line.length < 95) {
                  return (
                    <h4
                      key={lineIdx}
                      className="text-base sm:text-lg font-bold text-slate-900 dark:text-white pt-2"
                    >
                      {line}
                    </h4>
                  );
                }
                return (
                  <p key={lineIdx} className="leading-relaxed text-slate-800 dark:text-slate-100">
                    {line}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Ausbildungsbereich</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Academy</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Programme, Kurse, Lernbibliothek, Prüfungen und persönliche Notizen.</p>
      </header>
      <nav aria-label="Academy-Hauptbereiche" className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview' as const, label: 'Übersicht' },
          { id: 'courses' as const, label: 'Kurse' },
          { id: 'modules' as const, label: 'Lernbibliothek' },
          { id: 'exam_center' as const, label: 'Prüfungen' },
          { id: 'notes' as const, label: 'Meine Notizen' }
        ].map(item => {
          const selected = item.id === 'exam_center'
            ? ['exam_center', 'tests', 'final_exams', 'exam_reviews', 'exam_corrections'].includes(activeTab)
            : activeTab === item.id;
          return <button key={item.id} type="button"
            onClick={() => {
              setActiveTab(item.id);
              if (item.id === 'exam_center') {
                setActiveExamId(null); setExamSubmittedResult(null); setExamAnswers({}); setExamExplanations({});
              }
              if (item.id === 'modules') { setActiveModuleId(null); setIsLibraryNavigationOpen(false); }
            }}
            aria-current={selected ? 'page' : undefined}
            className={`px-3 py-2 text-sm border-b-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${selected ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}>
            {item.label}
          </button>;
        })}
      </nav>
      {['exam_center', 'tests', 'final_exams'].includes(activeTab) && (
        <nav aria-label="Prüfungsbereiche" className="flex flex-wrap gap-2">
          {[
            { id: 'exam_center' as const, label: 'Prüfungszentrum' },
            { id: 'tests' as const, label: `Übungstests (${practiceTests.length})` },
            ...(canAccessFinalExams ? [{ id: 'final_exams' as const, label: `Abschlussprüfungen (${finalExams.length})` }] : [])
          ].map(item => (
            <button key={item.id} type="button" onClick={() => {
              setActiveTab(item.id);
              if (item.id === 'tests') setActiveExamId(practiceTests[0]?.id || null);
              if (item.id === 'final_exams') setActiveExamId(finalExams[0]?.id || null);
              setExamSubmittedResult(null); setExamAnswers({}); setExamExplanations({});
            }} aria-current={activeTab === item.id ? 'page' : undefined} className={`px-3 py-1.5 text-xs rounded-md border ${activeTab === item.id ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100' : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'}`}>{item.label}</button>
          ))}
        </nav>
      )}
      {activeTab === 'overview' && (
        <section aria-labelledby="academy-overview-heading" className="space-y-5">
          <div>
            <h2 id="academy-overview-heading" className="text-lg font-semibold text-slate-900 dark:text-white">Deine Academy</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Direkteinstieg in die derzeit verfügbaren Lernmaterialien und Prüfungen.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" onClick={() => setActiveTab('courses')} className="text-left border border-slate-300 dark:border-slate-700 rounded-md p-4">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">Programme & Kurse</span>
              <span className="block mt-1 text-xs text-slate-600 dark:text-slate-400">Lernpfade ansehen, Teilnahmen beginnen und Fortschritt nachweisen</span>
            </button>
            <button type="button" onClick={() => setActiveTab('notes')} className="text-left border border-slate-300 dark:border-slate-700 rounded-md p-4">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">Meine Notizen</span>
              <span className="block mt-1 text-xs text-slate-600 dark:text-slate-400">Private Notizen und Lesezeichen öffnen</span>
            </button>
            <button type="button" onClick={() => setActiveTab('modules')} className="text-left border border-slate-300 dark:border-slate-700 rounded-md p-4">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">Lernbibliothek</span>
              <span className="block mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{modules.length}</span>
              <span className="block text-xs text-slate-600 dark:text-slate-400">Verfügbare Materialien</span>
            </button>
            <button type="button" onClick={() => setActiveTab('exam_center')} className="text-left border border-slate-300 dark:border-slate-700 rounded-md p-4">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">Prüfungen</span>
              <span className="block mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{practiceTests.length + (canAccessFinalExams ? finalExams.length : 0)}</span>
              <span className="block text-xs text-slate-600 dark:text-slate-400">Für deinen Rang zugängliche Prüfungen</span>
            </button>
          </div>
          <section className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Dein dokumentierter Lernstand</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{myProgress.filter(item => (item.targetType === 'test' || item.targetType === 'final_exam') && item.status === 'passed').length} bestandene Prüfungen sind deinem Konto zugeordnet.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Das Öffnen eines Materials wird nicht als Kursabschluss oder Nachweis gewertet.</p>
          </section>
        </section>
      )}
      {activeTab === 'courses' && (
        <section className="space-y-5">
          {canAuthorCourses && (
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800" role="group" aria-label="Kursbereich">
              <button type="button" aria-pressed={courseAreaMode === 'learning'} onClick={() => setCourseAreaMode('learning')} className={`rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${courseAreaMode === 'learning' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}>Lernen</button>
              <button type="button" aria-pressed={courseAreaMode === 'management'} onClick={() => setCourseAreaMode('management')} className={`rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${courseAreaMode === 'management' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}>Kurse und Programme verwalten</button>
            </div>
          )}
          {courseAreaMode === 'management' && canAuthorCourses
            ? <AcademyAuthoringCenter currentUser={currentUser} onStatusToast={onStatusToast} />
            : <AcademyLearningCenter currentUser={currentUser} area="courses" onStatusToast={onStatusToast} />}
        </section>
      )}
      {activeTab === 'notes' && <AcademyLearningCenter currentUser={currentUser} area="notes" onStatusToast={onStatusToast} />}

      {/* TAB 1: LEHRBÜCHER & LEHRMATERIALIEN */}
      {activeTab === 'modules' && (
        <div>
          {modules.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center space-y-4 shadow-xs">
              <BookOpen className="w-10 h-10 text-sky-600 mx-auto" />
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Noch keine Lehrbücher oder Dokumente hinterlegt
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  In der Lernbibliothek sind derzeit keine Materialien hinterlegt.
                </p>
              </div>
            </div>
          ) : !currentModule ? (
            <section aria-labelledby="academy-library-heading" className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <h2 id="academy-library-heading" className="text-xl font-semibold text-slate-900 dark:text-white">Lernbibliothek</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Alle für dich zugänglichen veröffentlichten Materialien an einem Ort.</p>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{filteredModules.length} von {modules.length} Materialien</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3">
                <div>
                  <label htmlFor="academy-library-global-search" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bibliothek durchsuchen</label>
                  <input id="academy-library-global-search" type="search" value={moduleSearchQuery} onChange={event => setModuleSearchQuery(event.target.value)} placeholder="Titel, Materialcode, Thema oder Dateiname" className="w-full px-3 py-2.5 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="academy-library-sort" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sortieren</label>
                  <select id="academy-library-sort" value={moduleSortOrder} onChange={event => setModuleSortOrder(event.target.value as 'alphabetical' | 'updated')} className="w-full sm:w-auto px-3 py-2.5 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                    <option value="alphabetical">Alphabetisch</option>
                    <option value="updated">Zuletzt aktualisiert</option>
                  </select>
                </div>
              </div>
              {sortedModules.length === 0 ? (
                <p role="status" className="border border-slate-200 dark:border-slate-800 rounded-md p-5 text-sm text-slate-600 dark:text-slate-300">Keine Materialien entsprechen deiner Suche. Ändere den Suchbegriff, um weitere Ergebnisse zu finden.</p>
              ) : (
                <div className="border-y border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800" aria-label="Bibliotheksmaterialien">
                  {sortedModules.map(module => (
                    <button key={module.id} type="button" onClick={() => { setActiveModuleId(module.id); setIsLibraryNavigationOpen(false); }} className="w-full text-left px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-600">
                      <span className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className="font-medium text-sm text-slate-900 dark:text-white">{module.title}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{module.code}</span>
                      </span>
                      <span className="block mt-1 text-xs text-slate-600 dark:text-slate-400">{module.category}{module.pdfFileName ? ` · ${module.pdfFileName}` : ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <div className={`grid grid-cols-1 ${isLibraryNavigationOpen ? 'lg:grid-cols-12' : ''} gap-6 items-start`}>
              {isLibraryNavigationOpen && (
                <aside id="academy-material-navigation" aria-label="Materialnavigation" className="lg:col-span-4 border border-slate-300 dark:border-slate-700 rounded-md p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Materialien</h2>
                  <label htmlFor="academy-library-search" className="block text-xs font-medium text-slate-700 dark:text-slate-300">Materialien durchsuchen</label>
                  <input id="academy-library-search" type="search" value={moduleSearchQuery} onChange={event => setModuleSearchQuery(event.target.value)} placeholder="Titel, Kennung oder Thema" className="w-full px-3 py-2 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                  {filteredModules.length === 0 ? <p className="text-xs text-slate-600 dark:text-slate-400 py-3">Keine passenden Materialien gefunden.</p> : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredModules.map(mod => {
                        const isSelected = currentModule?.id === mod.id;
                        return <button key={mod.id} type="button" onClick={() => setActiveModuleId(mod.id)} aria-current={isSelected ? 'page' : undefined} className={`w-full text-left py-3 px-2 rounded-md ${isSelected ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                          <span className="block text-xs font-mono text-slate-500 dark:text-slate-400">{mod.code}</span>
                          <span className="block mt-1 text-sm font-semibold text-slate-900 dark:text-white">{mod.title}</span>
                          <span className="block mt-0.5 text-xs text-slate-600 dark:text-slate-400">{mod.category}</span>
                        </button>;
                      })}
                    </div>
                  )}
                </aside>
              )}
              {/* Right 8 Cols: Viewer */}
              <div className={isLibraryNavigationOpen ? 'lg:col-span-8' : 'w-full'}>
                {currentModule && (
                  ROLE_HIERARCHY[currentUser.role].rankOrder >
                  ROLE_HIERARCHY[currentModule.requiredRole].rankOrder ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-3 shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
                        <Lock className="w-4 h-4" /> ZUGRIFF AUF DIESES HANDBUCH GESPERRT
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        „{currentModule.title}“ erfordert mindestens den Rang „{currentModule.requiredRole.toUpperCase()}“
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Dein aktueller System-Rang lautet{' '}
                        <strong className="uppercase">{currentUser.role}</strong>. Sobald du auf den
                        erforderlichen Dienstgrad befördert wirst, wird dieses Lehrmodul automatisch
                        freigeschaltet.
                      </p>
                    </div>
                  ) : (
                  <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-mono text-sky-700 dark:text-sky-400 font-bold">
                          <span>{currentModule.code}</span>
                          <span>·</span>
                          <span>{currentModule.category}</span>
                          <span>·</span>
                          <span className="uppercase">FREIGEGEBEN AB {currentModule.requiredRole}</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                          {currentModule.title}
                        </h2>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button type="button" onClick={() => { setActiveModuleId(null); setIsLibraryNavigationOpen(false); }} className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200">Zur Bibliothek</button>
                        <button type="button" onClick={() => setIsLibraryNavigationOpen(open => !open)} aria-expanded={isLibraryNavigationOpen} className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200">
                          {isLibraryNavigationOpen ? 'Materialliste schließen' : 'Materialliste öffnen'}
                        </button>
                      </div>
                    </div>

                    {currentModule.contentMarkdown &&
                      renderStructuredHandbookContent(currentModule.contentMarkdown)}

                    {/* Embedded PDF Viewer */}
                    {currentHasPdf && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                            HOCHGELADENES LEHRBUCH / DOKUMENT: {currentModule.pdfFileName || 'Dokument.pdf'}
                          </span>
                          <a
                            href={currentPdfUrl}
                            download={currentModule.pdfFileName || 'lehrbuch.pdf'}
                            className="text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                          >
                            PDF herunterladen ↓
                          </a>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                          {currentPdfUrl ? (
                            <iframe
                              title={currentModule.title}
                              src={currentPdfUrl}
                              className="w-full h-[540px] border-0"
                            />
                          ) : (
                            <div className="p-6 text-xs font-mono text-slate-500">PDF wird geladen …</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* External Document URL */}
                    {currentModule.externalUrl && (
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate pr-4">
                          Externe Dokument-Quelle: {currentModule.externalUrl}
                        </div>
                        <a
                          href={currentModule.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline shrink-0"
                        >
                          Dokument öffnen <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Interactive Code inside Module */}
                    {currentModule.interactiveCode && (
                      <div className="space-y-2">
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          INTERAKTIVE CODE-UMGEBUNG
                        </div>
                        <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-white">
                          <iframe
                            title={currentModule.title}
                            srcDoc={currentModule.interactiveCode}
                            sandbox="allow-scripts"
                            className="w-full h-[380px] border-0"
                          />
                        </div>
                      </div>
                    )}
                  </article>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'exam_center' && <ExamParticipantRunner />}
      {activeTab === 'exam_corrections' && (currentUser.role === 'admin' || currentUser.role === 'colonel') && <ExamCorrectionCenter />}
      {activeTab === 'exam_reviews' && canEditAcademy && <ExamReviewCenter />}

      {/* TAB 2 & 3: ÜBUNGSTESTS (TRAINEE+) & ABSCHLUSSPRÜFUNGEN (ROOKIE+) */}
      {(activeTab === 'tests' || activeTab === 'final_exams') && (
        <div>
          {activeTab === 'final_exams' && !canAccessFinalExams ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-10 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
                <Lock className="w-4 h-4" /> ZUGRIFF AUF ABSCHLUSSPRÜFUNGEN GESPERRT (RANG TRAINEE)
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Abschlussarbeiten und Abschlussprüfungen sind erst ab dem Rang „Rookie“ freigeschaltet
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                Als <strong>Trainee</strong> kannst du uneingeschränkt auf alle Lehrbücher, Lehrmaterialien sowie die regulären <strong>Übungstests</strong> zugreifen. Sobald der Administrator deinen Rang auf <strong>Rookie</strong> oder höher setzt, wird dieser Prüfungsbereich freigeschaltet.
              </p>
            </div>
          ) : activeExamList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center space-y-4 shadow-xs">
              <Terminal className="w-10 h-10 text-sky-600 dark:text-sky-400 mx-auto" />
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Noch keine {activeTab === 'final_exams' ? 'Abschlussprüfungen' : 'Übungstests'} hinterlegt
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  In diesem Bereich sind derzeit keine Prüfungen verfügbar.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 4 Cols */}
              <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 divide-y divide-slate-200 dark:divide-slate-800 shadow-xs">
                {activeExamList.map(ex => {
                  const prog = getExamProgress(ex.id);
                  const isSelected = currentExam?.id === ex.id;
                  return (
                    <div
                      key={ex.id}
                      onClick={() => {
                        setActiveExamId(ex.id);
                        setExamAnswers({});
                        setExamSubmittedResult(null);
                        setExamExplanations({});
                      }}
                      className={`py-3.5 px-3 rounded-md transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                        <span>{ex.moduleCode}</span>
                        <span>·</span>
                        <span>MIN {ex.passingScore}%</span>
                        <span className="ml-auto">
                          {prog?.status === 'passed' ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{prog.scorePercent}% PASS</span>
                          ) : prog?.status === 'failed' ? (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">{prog.scorePercent}% FAIL</span>
                          ) : null}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{ex.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> {ex.timeLimitMinutes} Min ·{' '}
                        {ex.assessmentStage === 'final_exam' ? 'Abschlussprüfung (Rookie+)' : 'Übungstest (Trainee+)'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right 8 Cols: Active Test / Final Exam Runner */}
              <div className="lg:col-span-8">
                {currentExam && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6 shadow-xs">
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-mono text-sky-700 dark:text-sky-400 font-semibold">
                          {currentExam.assessmentStage === 'final_exam'
                            ? 'Offizielle Abschlussprüfung (Rookie+)'
                            : 'Übungstest (Trainee+)'}{' '}
                          · {currentExam.moduleCode} · Bestehensgrenze {currentExam.passingScore}%
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                          {currentExam.title}
                        </h2>
                      </div>

                    </div>

                    {/* Sandboxed Interactive Code Widget */}
                    {currentExam.interactiveWidgetCode && (
                      <div className="space-y-2">
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          INTERAKTIVE CODE-PRÜFUNGSUMGEBUNG
                        </div>
                        <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-50">
                          <iframe
                            title={currentExam.title}
                            srcDoc={currentExam.interactiveWidgetCode}
                            sandbox="allow-scripts"
                            className="w-full h-[380px] border-0"
                          />
                        </div>
                      </div>
                    )}

                    {examSubmittedResult && (
                      <div
                        className={`p-4 rounded-lg border text-xs font-mono font-bold flex items-center justify-between ${
                          examSubmittedResult.passed
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        <span>
                          ERGEBNIS: {examSubmittedResult.score}% (
                          {examSubmittedResult.passed ? 'BESTANDEN' : 'NICHT BESTANDEN'})
                        </span>
                        <span>ERFORDERLICH: {currentExam.passingScore}%</span>
                      </div>
                    )}

                    {/* Structured Questions or Code Score Input */}
                    {(() => {
                      let parsedQuestions: ExamQuestionPublicItem[] = [];
                      try {
                        parsedQuestions = JSON.parse(currentExam.questionsPayload || '[]');
                      } catch {
                        parsedQuestions = [];
                      }

                      return (
                        <>
                          {currentExam.examFormat === 'structured_quiz' ? (
                            <div className="space-y-4">
                              {parsedQuestions.map((q, idx) => (
                                <div
                                  key={q.id || idx}
                                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                                >
                                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {idx + 1}. {q.question}
                                  </div>
                                  <div className="space-y-2">
                                    {q.options.map((opt, optIdx) => {
                                      const selected = examAnswers[q.id] === optIdx;
                                      return (
                                        <label
                                          key={optIdx}
                                          className={`flex items-center gap-3 p-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                                            selected
                                              ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-slate-900 dark:text-white font-semibold'
                                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`question_${q.id}`}
                                            checked={selected}
                                            onChange={() =>
                                              setExamAnswers(prev => ({ ...prev, [q.id]: optIdx }))
                                            }
                                            className="text-sky-600 focus:ring-sky-500"
                                          />
                                          <span>{opt}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                  {examSubmittedResult && examExplanations[q.id] && (
                                    <div className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                                      <strong className="text-slate-900 dark:text-white">Erläuterung:</strong>{' '}
                                      {examExplanations[q.id]}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                Nach Durchführung des eingebetteten Code-Tests kannst du dein erreichtes Ergebnis für das Fortschrittstracking protokollieren:
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-mono text-slate-600 dark:text-slate-300">Ergebnis (%):</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={customCodeScore}
                                  onChange={e => setCustomCodeScore(Number(e.target.value))}
                                  className="w-20 px-2.5 py-1.5 text-xs font-mono rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                          )}

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => handleSubmitExam(currentExam, parsedQuestions)}
                              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors cursor-pointer"
                            >
                              <Award className="w-4 h-4" />
                              Ergebnis abschließen &amp; im Fortschrittstracking speichern
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: UPLOAD TEXTBOOK / PDF / LEHRMATERIAL (ADMIN & COLONEL) */}
      {activeTab === 'upload_textbook' && canEditAcademy && (
        <form
          onSubmit={handleCreateModule}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5 max-w-4xl shadow-xs"
        >
          <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Lehrbuch- &amp; Dokumenten-Upload · Freigabe für Admin &amp; Colonel
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Neues Lehrbuch (PDF), SOP-Dokument oder Code-Lehrmaterial hinzufügen
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Titel des Lehrbuchs / Lehrmaterials *
              </label>
              <input
                type="text"
                required
                value={modTitle}
                onChange={e => setModTitle(e.target.value)}
                placeholder="z.B. California POST Basic Peace Officer Workbook"
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Dokumenten-Code *
              </label>
              <input
                type="text"
                required
                value={modCode}
                onChange={e => setModCode(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Fachbereich
              </label>
              <select
                value={modCategory}
                onChange={e => setModCategory(e.target.value as ModuleCategory)}
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="SOP & Policy">SOP &amp; Policy</option>
                <option value="California Penal Code">California Penal Code</option>
                <option value="Tactical Operations">Tactical Operations</option>
                <option value="Radio & Dispatch">Radio &amp; Dispatch</option>
                <option value="Field Training (FTO)">Field Training (FTO)</option>
                <option value="Supervisor Directive">Supervisor Directive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sichtbar ab Rang
              </label>
              <select
                value={modRequiredRole}
                onChange={e => setModRequiredRole(e.target.value as OfficerRole)}
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="trainee">Trainee (Alle Ränge sehen es)</option>
                <option value="rookie">Rookie+</option>
                <option value="officer">Officer+</option>
                <option value="colonel">Colonel &amp; Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Format-Typ
              </label>
              <select
                value={modEmbedType}
                onChange={e => setModEmbedType(e.target.value as ModuleEmbedType)}
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="pdf_upload">PDF-Lehrbuch Datei-Upload</option>
                <option value="external_url">Externe Dokument-URL</option>
                <option value="interactive_code">Interaktives HTML/JS Code-Modul</option>
                <option value="document">Text-Handbuch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lesezeit (Minuten)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={modMinutes}
                onChange={e => setModMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Direct PDF File Input */}
          <div className="p-4 rounded-lg bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-900 dark:text-white">
              PDF-Lehrbuch oder Dokument direkt von deinem Gerät auswählen
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf,.html,.txt"
              onChange={handleFileUpload}
              className="block w-full text-xs text-slate-700 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
            />
            {modPdfFileName && (
              <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                Bereit zum Einbinden: {modPdfFileName}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Begleittext / Handbuch-Inhalt (Optional)
            </label>
            <textarea
              rows={4}
              value={modMarkdown}
              onChange={e => setModMarkdown(e.target.value)}
              placeholder="Kurze Beschreibung oder Kapitelübersicht zum Lehrbuch..."
              className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Alternativ: Externe PDF-/Dokument-URL oder HTML/JS-Code (Optional)
            </label>
            <input
              type="url"
              value={modExternalUrl}
              onChange={e => setModExternalUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white mb-3"
            />
            <textarea
              rows={4}
              value={modInteractiveCode}
              onChange={e => setModInteractiveCode(e.target.value)}
              placeholder="Optionaler HTML/JS Code für interaktive Lehrmodule..."
              className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('modules')}
              className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Lehrbuch / Lehrmaterial veröffentlichen
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: ADD TEST / FINAL EXAM AS CODE (ADMIN & COLONEL) */}
      {activeTab === 'add_code_test' && canEditAcademy && (
        <form
          onSubmit={handleCreateExam}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5 max-w-4xl shadow-xs"
        >
          <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Prüfungsverwaltung · Freigabe für Admin &amp; Colonel
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Neuen Übungstest (für Trainee+) oder Abschlussprüfung (ab Rookie+) einbinden
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Titel des Tests / der Abschlussprüfung *
              </label>
              <input
                type="text"
                required
                value={examTitle}
                onChange={e => setExamTitle(e.target.value)}
                placeholder="z.B. 10-Codes & Funkdisziplin Praxistest"
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prüfungs-Kennung *
              </label>
              <input
                type="text"
                required
                value={examModuleCode}
                onChange={e => setExamModuleCode(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-sky-700 dark:text-sky-400 mb-1">
                Prüfungs-Stufe
              </label>
              <select
                value={examStage}
                onChange={e => setExamStage(e.target.value as AssessmentStage)}
                className="w-full px-3.5 py-2 text-xs font-medium rounded-md bg-sky-50 dark:bg-slate-950 border border-sky-300 dark:border-sky-700 text-slate-900 dark:text-white"
              >
                <option value="test">Übungstest (Ab Trainee)</option>
                <option value="final_exam">Abschlussprüfung (Ab Rookie+)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prüfungsformat
              </label>
              <select
                value={examFormat}
                onChange={e => setExamFormat(e.target.value as 'interactive_code' | 'structured_quiz')}
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="structured_quiz">Multiple-Choice Fragenkatalog</option>
                <option value="interactive_code">Interaktives HTML/JS Code-Modul</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Bestehensgrenze (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={examPassingScore}
                onChange={e => setExamPassingScore(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Zeitlimit (Minuten)
              </label>
              <input
                type="number"
                min={1}
                max={240}
                value={examTimeLimit}
                onChange={e => setExamTimeLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Ausführbarer Prüfungs-Code (HTML / CSS / JavaScript Sandbox — optional bei reinem Multiple-Choice-Test)
            </label>
            <textarea
              rows={8}
              value={examWidgetCode}
              onChange={e => setExamWidgetCode(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-md bg-slate-900 text-slate-100 border border-slate-700"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Multiple-Choice-Fragen im JSON-Format (Standard: [] für reinen Code-Test)
              </label>
              <button
                type="button"
                onClick={() => {
                  setExamFormat('structured_quiz');
                  setExamQuestionsJson(
                    JSON.stringify(
                      [
                        {
                          id: 'q1',
                          question: 'Was ist vor dem Verlassen des Streifenwagens bei einer Kontrolle durchzugeben?',
                          options: [
                            'Standort (10-20) und Kennzeichen an die Leitstelle',
                            'Keine Angabe erforderlich',
                            'Nur die Uhrzeit'
                          ],
                          correctIndex: 0,
                          explanation: 'Standort und Kennzeichen dienen der Eigensicherung.'
                        }
                      ],
                      null,
                      2
                    )
                  );
                }}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                Beispiel-Fragenkatalog einfügen
              </button>
            </div>
            <textarea
              rows={4}
              value={examQuestionsJson}
              onChange={e => setExamQuestionsJson(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Test / Prüfung in Portal einbinden
            </button>
          </div>
        </form>
      )}

      {/* TAB 6: GRANULAR COURSE INSTRUCTOR GRADING (AUSBILDER-NOTENVERGABE) */}
      {activeTab === 'instructor_grading' && canEditAcademy && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleAssignInstructorGrade}
            className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5 shadow-xs"
          >
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Lehrgangs-spezifische Noten- &amp; Statusvergabe
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Ausbilder-Bewertung für zugewiesene Lehrgänge eintragen
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Deine freigeschalteten Lehrgangs-Codes:{' '}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {rolePermissions.canEditAcademy || assignedCourses.includes('*')
                    ? 'ALLE LEHRGÄNGE (*)'
                    : assignedCourses.join(', ')}
                </strong>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Teilnehmer / Beamter auswählen *
                </label>
                <select
                  required
                  value={gradeTargetUserUid}
                  onChange={e => setGradeTargetUserUid(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">-- Bitte Beamten wählen --</option>
                  {roster.map(u => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.badgeNumber} · {u.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lehrgangs-Code (Nur eigene Freigaben) *
                </label>
                {!rolePermissions.canEditAcademy &&
                !assignedCourses.includes('*') &&
                assignedCourses.length > 0 ? (
                  <select
                    value={gradeCourseCode}
                    onChange={e => setGradeCourseCode(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {assignedCourses.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={gradeCourseCode}
                    onChange={e => setGradeCourseCode(e.target.value)}
                    placeholder="z. B. SOP-01 oder LD-15"
                    className="w-full px-3.5 py-2 text-xs font-mono uppercase rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Erreichte Punktzahl (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={gradeScorePercent}
                  onChange={e => setGradeScorePercent(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lehrgangs-Status
                </label>
                <select
                  value={gradeStatus}
                  onChange={e =>
                    setGradeStatus(e.target.value as 'passed' | 'completed' | 'failed')
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="passed">Bestanden (PASSED)</option>
                  <option value="completed">Teilnahme abgeschlossen (COMPLETED)</option>
                  <option value="failed">Nicht bestanden / Nachschulung (FAILED)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bezeichnung der Prüfung / Praxiseinheit *
              </label>
              <input
                type="text"
                required
                value={gradeCourseTitle}
                onChange={e => setGradeCourseTitle(e.target.value)}
                placeholder="z. B. Funk- & Taktik-Praxisprüfung SOP-01"
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ausbilder-Beurteilung / Feedbackvermerk
              </label>
              <textarea
                rows={3}
                value={gradeFeedback}
                onChange={e => setGradeFeedback(e.target.value)}
                placeholder="Kurze Beurteilung der gezeigten Leistung..."
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingGrade}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md cursor-pointer disabled:opacity-50"
              >
                <Award className="w-4 h-4" />
                {submittingGrade ? 'Wird gespeichert...' : 'Note & Status verbindlich eintragen'}
              </button>
            </div>
          </form>

          {/* Recent Instructor Evaluations List */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4 shadow-xs">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Letzte Lehrgangs-Bewertungen
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Protokollierte Noten und Statusvergaben im Ausbildungsbereich
              </p>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-96 overflow-y-auto">
              {userProgress.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                  Noch keine Bewertungen eingetragen.
                </p>
              ) : (
                userProgress.slice(0, 10).map(item => (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                      <span>
                        {item.userName} · {item.targetTitle}
                      </span>
                      <span
                        className={`font-mono ${
                          item.status === 'passed' || item.status === 'completed'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.scorePercent}% ({item.status.toUpperCase()})
                      </span>
                    </div>
                    {item.instructorFeedback && (
                      <div className="text-slate-600 dark:text-slate-300 italic">„{item.instructorFeedback}“</div>
                    )}
                    <div className="text-[11px] font-mono text-slate-400">
                      {item.evaluatedByName
                        ? `Prüfer: ${item.evaluatedByName}`
                        : 'Selbststudium / Online-Test'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
