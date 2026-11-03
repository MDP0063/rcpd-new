import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  ExternalLink,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  Award,
  FileText,
  Clock,
  Upload,
  FileUp,
  Terminal
} from 'lucide-react';
import {
  AcademyExamDoc,
  AssessmentStage,
  ExamQuestionItem,
  ModuleCategory,
  ModuleEmbedType,
  OfficerRole,
  ROLE_HIERARCHY,
  TrainingModuleDoc,
  UserProgressDoc,
  UserPublicProfile
} from '../types/portal';
import { API_ENDPOINTS, apiFetch } from '../lib/api';

interface AcademyCenterProps {
  currentUser: UserPublicProfile;
  modules: TrainingModuleDoc[];
  exams: AcademyExamDoc[];
  userProgress: UserProgressDoc[];
  onRefreshState: () => Promise<void>;
  onStatusToast: (msg: string) => void;
}

export const AcademyCenter: React.FC<AcademyCenterProps> = ({
  currentUser,
  modules,
  exams,
  userProgress,
  onRefreshState,
  onStatusToast
}) => {
  const rolePermissions = ROLE_HIERARCHY[currentUser.role] || ROLE_HIERARCHY.trainee;
  const canEditAcademy = rolePermissions.canEditAcademy; // True for Admin & Colonel
  const canAccessFinalExams = rolePermissions.canAccessFinalExams; // False for Trainee, True for Rookie/Officer/Colonel/Admin

  const [activeTab, setActiveTab] = useState<
    'modules' | 'tests' | 'final_exams' | 'upload_textbook' | 'add_code_test'
  >('modules');

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(modules[0]?.id || null);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  // Interactive Test/Exam Runner State
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [customCodeScore, setCustomCodeScore] = useState<number>(100);
  const [examSubmittedResult, setExamSubmittedResult] = useState<{
    score: number;
    passed: boolean;
  } | null>(null);

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

  const filteredModules = modules.filter(m =>
    selectedCategory === 'ALL' ? true : m.category === selectedCategory
  );

  const currentModule =
    modules.find(m => m.id === activeModuleId) || filteredModules[0] || null;

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

  const handleSubmitExam = async (exam: AcademyExamDoc, parsedQuestions: ExamQuestionItem[]) => {
    let scorePercent = customCodeScore;

    if (exam.examFormat === 'structured_quiz' && parsedQuestions.length > 0) {
      let correctCount = 0;
      parsedQuestions.forEach(q => {
        if (examAnswers[q.id] === q.correctIndex) {
          correctCount++;
        }
      });
      scorePercent = Math.round((correctCount / parsedQuestions.length) * 100);
    }

    const passed = scorePercent >= exam.passingScore;
    setExamSubmittedResult({ score: scorePercent, passed });

    const res = await apiFetch(API_ENDPOINTS.PROGRESS, {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUser.uid,
        targetId: exam.id,
        targetType: exam.assessmentStage === 'final_exam' ? 'final_exam' : 'test',
        targetTitle: exam.title,
        status: passed ? 'passed' : 'failed',
        scorePercent
      })
    });

    if (res.ok) {
      await onRefreshState();
      onStatusToast(
        passed
          ? `Erfolgreich bestanden (${scorePercent}%)! Im Fortschrittstracking gespeichert.`
          : `Nicht bestanden (${scorePercent}% / erforderlich: ${exam.passingScore}%).`
      );
    } else {
      onStatusToast(res.error || 'Fehler beim Speichern des Ergebnisses.');
    }
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
    if (!canEditAcademy) return;
    const res = await apiFetch(
      `${API_ENDPOINTS.ACADEMY_EXAMS}/${id}?actorUid=${encodeURIComponent(currentUser.uid)}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      await onRefreshState();
      onStatusToast('Test / Prüfung entfernt.');
    } else {
      onStatusToast(res.error || 'Test / Prüfung konnte nicht gelöscht werden.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Direct Action Buttons for Admin / Colonel */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono text-sky-600 font-semibold">
            POST ACADEMY &amp; TRAINING // LEHRBÜCHER, ÜBUNGSTESTS &amp; ABSCHLUSSPRÜFUNGEN
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Lehrmaterialien, Tests &amp; Prüfungen
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Dein aktueller Rang: <strong className="uppercase font-mono text-slate-900">{currentUser.role}</strong>.
            {currentUser.role === 'trainee'
              ? ' Als Trainee hast du vollen Zugriff auf alle Lehrmaterialien und Übungstests. Die Abschlussprüfungen werden ab dem Rang Rookie freigeschaltet.'
              : ' Du hast Zugriff auf Lehrmaterialien, Übungstests sowie die Abschlussarbeit / Abschlussprüfung.'}
          </p>
        </div>

        {/* PROMINENT DIRECT BUTTONS FOR ADMIN & COLONEL */}
        {canEditAcademy && (
          <div className="flex flex-wrap items-center gap-2.5 self-start">
            <button
              type="button"
              onClick={() => setActiveTab('upload_textbook')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              <FileUp className="w-4 h-4 text-sky-400" />
              + Lehrbuch / PDF hochladen
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('add_code_test')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Code2 className="w-4 h-4" />
              + Test / Prüfung als Code hinzufügen
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/80 border border-slate-300 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('modules')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'modules'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Lehrbücher &amp; Lehrmaterialien ({modules.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('tests');
            setActiveExamId(practiceTests[0]?.id || null);
            setExamSubmittedResult(null);
          }}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'tests'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Übungstests ({practiceTests.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('final_exams');
            setActiveExamId(finalExams[0]?.id || null);
            setExamSubmittedResult(null);
          }}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'final_exams'
              ? 'bg-white text-slate-900 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {!canAccessFinalExams && <Lock className="w-3 h-3 text-rose-500" />}
          Abschlussarbeit / Prüfungen ({finalExams.length})
        </button>

        {canEditAcademy && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('upload_textbook')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'upload_textbook'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-sky-700 hover:text-sky-900'
              }`}
            >
              Lehrbuch-Upload
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('add_code_test')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'add_code_test'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-sky-700 hover:text-sky-900'
              }`}
            >
              Code-Prüfung einbinden
            </button>
          </>
        )}
      </div>

      {/* TAB 1: LEHRBÜCHER & LEHRMATERIALIEN */}
      {activeTab === 'modules' && (
        <div>
          {modules.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-4 shadow-xs">
              <BookOpen className="w-10 h-10 text-sky-600 mx-auto" />
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">
                  Noch keine Lehrbücher oder Dokumente hinterlegt
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Es sind standardmäßig keine Lehrbücher vorprogrammiert. Als Admin oder Colonel kannst du PDF-Lehrbücher, externe Dokumente oder Code-Module jederzeit über die Schaltfläche hinzufügen.
                </p>
              </div>
              {canEditAcademy && (
                <button
                  type="button"
                  onClick={() => setActiveTab('upload_textbook')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer"
                >
                  <FileUp className="w-4 h-4" /> Jetzt erstes Lehrbuch / PDF hochladen
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 4 Cols */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
                <label className="block text-xs font-mono text-slate-500 mb-2">
                  KATEGORIE FILTERN
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900"
                >
                  <option value="ALL">Alle Kategorien ({modules.length})</option>
                  <option value="SOP & Policy">SOP &amp; Policy</option>
                  <option value="California Penal Code">California Penal Code</option>
                  <option value="Tactical Operations">Tactical Operations</option>
                  <option value="Radio & Dispatch">Radio &amp; Dispatch</option>
                  <option value="Field Training (FTO)">Field Training (FTO)</option>
                  <option value="Supervisor Directive">Supervisor Directive</option>
                </select>

                <div className="mt-4 divide-y divide-slate-200">
                  {filteredModules.map(mod => {
                    const prog = getModuleProgress(mod.id);
                    const isSelected = currentModule?.id === mod.id;
                    return (
                      <div
                        key={mod.id}
                        onClick={() => setActiveModuleId(mod.id)}
                        className={`py-3.5 px-3 rounded-md transition-colors cursor-pointer ${
                          isSelected ? 'bg-sky-50 border border-sky-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                          <span>{mod.code}</span>
                          <span>·</span>
                          <span className="uppercase">{mod.requiredRole}+</span>
                          <span className="ml-auto">
                            {prog?.status === 'completed' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                            )}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 mt-1">{mod.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {mod.category} · {mod.pdfFileName ? `PDF: ${mod.pdfFileName}` : mod.embedType}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 8 Cols: Viewer */}
              <div className="lg:col-span-8">
                {currentModule && (
                  <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono text-sky-700 font-semibold">
                          <span>{currentModule.code}</span>
                          <span>·</span>
                          <span>{currentModule.category}</span>
                          <span>·</span>
                          <span className="uppercase">FREIGEGEBEN AB {currentModule.requiredRole}</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mt-1">
                          {currentModule.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMarkModuleComplete(currentModule)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {getModuleProgress(currentModule.id)?.status === 'completed'
                            ? 'Erneut als gelesen protokollieren'
                            : 'Als durchgearbeitet markieren'}
                        </button>

                        {canEditAcademy && (
                          <button
                            type="button"
                            onClick={() => handleDeleteModule(currentModule.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-md border border-slate-200 cursor-pointer"
                            title="Lehrmaterial löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {currentModule.contentMarkdown && (
                      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {currentModule.contentMarkdown}
                      </div>
                    )}

                    {/* Embedded PDF Viewer */}
                    {currentModule.pdfDataUrl && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-sky-600" />
                            HOCHGELADENES LEHRBUCH / DOKUMENT: {currentModule.pdfFileName || 'Dokument.pdf'}
                          </span>
                          <a
                            href={currentModule.pdfDataUrl}
                            download={currentModule.pdfFileName || 'lehrbuch.pdf'}
                            className="text-sky-600 hover:underline font-semibold"
                          >
                            PDF herunterladen ↓
                          </a>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-slate-300 bg-slate-100">
                          <iframe
                            title={currentModule.title}
                            src={currentModule.pdfDataUrl}
                            className="w-full h-[540px] border-0"
                          />
                        </div>
                      </div>
                    )}

                    {/* External Document URL */}
                    {currentModule.externalUrl && (
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div className="text-xs font-mono text-slate-700 truncate pr-4">
                          Externe Dokument-Quelle: {currentModule.externalUrl}
                        </div>
                        <a
                          href={currentModule.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:underline shrink-0"
                        >
                          Dokument öffnen <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Interactive Code inside Module */}
                    {currentModule.interactiveCode && (
                      <div className="space-y-2">
                        <div className="text-xs font-mono text-slate-500">
                          INTERAKTIVE CODE-UMGEBUNG
                        </div>
                        <div className="rounded-lg overflow-hidden border border-slate-300 bg-white">
                          <iframe
                            title={currentModule.title}
                            srcDoc={currentModule.interactiveCode}
                            sandbox="allow-scripts"
                            className="w-full h-[380px] border-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2 & 3: ÜBUNGSTESTS (TRAINEE+) & ABSCHLUSSPRÜFUNGEN (ROOKIE+) */}
      {(activeTab === 'tests' || activeTab === 'final_exams') && (
        <div>
          {activeTab === 'final_exams' && !canAccessFinalExams ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-mono text-rose-600 font-semibold">
                <Lock className="w-4 h-4" /> ZUGRIFF AUF ABSCHLUSSPRÜFUNGEN GESPERRT (RANG TRAINEE)
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Abschlussarbeiten und Abschlussprüfungen sind erst ab dem Rang „Rookie“ freigeschaltet
              </h2>
              <p className="text-sm text-slate-600 max-w-2xl">
                Als <strong>Trainee</strong> kannst du uneingeschränkt auf alle Lehrbücher, Lehrmaterialien sowie die regulären <strong>Übungstests</strong> zugreifen. Sobald der Administrator deinen Rang auf <strong>Rookie</strong> oder höher setzt, wird dieser Prüfungsbereich freigeschaltet.
              </p>
            </div>
          ) : activeExamList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-4 shadow-xs">
              <Terminal className="w-10 h-10 text-sky-600 mx-auto" />
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">
                  Noch keine {activeTab === 'final_exams' ? 'Abschlussprüfungen' : 'Übungstests'} hinterlegt
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Es sind keine Tests vorprogrammiert. Als Admin oder Colonel kannst du neue Tests und interaktive Prüfungen direkt als Code über die Schaltfläche einbinden.
                </p>
              </div>
              {canEditAcademy && (
                <button
                  type="button"
                  onClick={() => {
                    setExamStage(activeTab === 'final_exams' ? 'final_exam' : 'test');
                    setActiveTab('add_code_test');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer"
                >
                  <Code2 className="w-4 h-4" /> Jetzt {activeTab === 'final_exams' ? 'Abschlussprüfung' : 'Übungstest'} als Code hinzufügen
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 4 Cols */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-4 divide-y divide-slate-200 shadow-xs">
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
                      }}
                      className={`py-3.5 px-3 rounded-md transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50 border border-sky-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                        <span>{ex.moduleCode}</span>
                        <span>·</span>
                        <span>MIN {ex.passingScore}%</span>
                        <span className="ml-auto">
                          {prog?.status === 'passed' ? (
                            <span className="text-emerald-700 font-semibold">{prog.scorePercent}% PASS</span>
                          ) : prog?.status === 'failed' ? (
                            <span className="text-rose-600 font-semibold">{prog.scorePercent}% FAIL</span>
                          ) : null}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 mt-1">{ex.title}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
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
                  <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-xs">
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <div className="text-xs font-mono text-sky-700 font-semibold">
                          {currentExam.assessmentStage === 'final_exam'
                            ? 'OFFIZIELLE ABSCHLUSSPRÜFUNG (ROOKIE+)'
                            : 'ÜBUNGSTEST (TRAINEE+)'}{' '}
                          // {currentExam.moduleCode} · BESTEHENSGRENZE {currentExam.passingScore}%
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mt-1">
                          {currentExam.title}
                        </h2>
                      </div>

                      {canEditAcademy && (
                        <button
                          type="button"
                          onClick={() => handleDeleteExam(currentExam.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-md border border-slate-200 cursor-pointer"
                          title="Prüfung löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Sandboxed Interactive Code Widget */}
                    {currentExam.interactiveWidgetCode && (
                      <div className="space-y-2">
                        <div className="text-xs font-mono text-slate-500">
                          INTERAKTIVE CODE-PRÜFUNGSUMGEBUNG
                        </div>
                        <div className="rounded-lg overflow-hidden border border-slate-300 bg-slate-50">
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
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-rose-50 border-rose-300 text-rose-800'
                        }`}
                      >
                        <span>
                          ERGEBNIS: {examSubmittedResult.score}% (
                          {examSubmittedResult.passed ? 'BESTANDEN' : 'NICHT BESTANDEN'})
                        </span>
                        <span>ERFORDERLICH: {currentExam.passingScore}%</span>
                      </div>
                    )}

                    {/* Optional Structured Questions if provided */}
                    {(() => {
                      let parsedQuestions: ExamQuestionItem[] = [];
                      try {
                        parsedQuestions = JSON.parse(currentExam.questionsPayload || '[]');
                      } catch {
                        parsedQuestions = [];
                      }

                      return (
                        <>
                          {parsedQuestions.length > 0 ? (
                            <div className="space-y-4">
                              {parsedQuestions.map((q, idx) => (
                                <div
                                  key={q.id || idx}
                                  className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3"
                                >
                                  <div className="text-sm font-semibold text-slate-900">
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
                                              ? 'border-sky-500 bg-sky-50 text-slate-900 font-semibold'
                                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
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
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="text-xs text-slate-600">
                                Nach Durchführung des eingebetteten Code-Tests kannst du dein erreichtes Ergebnis für das Fortschrittstracking protokollieren:
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-mono text-slate-600">Ergebnis (%):</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={customCodeScore}
                                  onChange={e => setCustomCodeScore(Number(e.target.value))}
                                  className="w-20 px-2.5 py-1.5 text-xs font-mono rounded bg-white border border-slate-300 text-slate-900"
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
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 max-w-4xl shadow-xs"
        >
          <div className="pb-4 border-b border-slate-200">
            <div className="text-xs font-mono text-sky-600 font-semibold">
              LEHRBUCH &amp; DOKUMENTEN-UPLOAD // ADMIN &amp; COLONELFREIGABE
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Neues Lehrbuch (PDF), SOP-Dokument oder Code-Lehrmaterial hinzufügen
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Titel des Lehrbuchs / Lehrmaterials *
              </label>
              <input
                type="text"
                required
                value={modTitle}
                onChange={e => setModTitle(e.target.value)}
                placeholder="z.B. California POST Basic Peace Officer Workbook"
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dokumenten-Code *
              </label>
              <input
                type="text"
                required
                value={modCode}
                onChange={e => setModCode(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Fachbereich
              </label>
              <select
                value={modCategory}
                onChange={e => setModCategory(e.target.value as ModuleCategory)}
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900"
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
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sichtbar ab Rang
              </label>
              <select
                value={modRequiredRole}
                onChange={e => setModRequiredRole(e.target.value as OfficerRole)}
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              >
                <option value="trainee">Trainee (Alle Ränge sehen es)</option>
                <option value="rookie">Rookie+</option>
                <option value="officer">Officer+</option>
                <option value="colonel">Colonel &amp; Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Format-Typ
              </label>
              <select
                value={modEmbedType}
                onChange={e => setModEmbedType(e.target.value as ModuleEmbedType)}
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              >
                <option value="pdf_upload">PDF-Lehrbuch Datei-Upload</option>
                <option value="external_url">Externe Dokument-URL</option>
                <option value="interactive_code">Interaktives HTML/JS Code-Modul</option>
                <option value="document">Text-Handbuch</option>
              </select>
            </div>
          </div>

          {/* Direct PDF File Input */}
          <div className="p-4 rounded-lg bg-sky-50/60 border border-sky-200 space-y-2">
            <label className="block text-xs font-semibold text-slate-900">
              PDF-Lehrbuch oder Dokument direkt von deinem Gerät auswählen
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf,.html,.txt"
              onChange={handleFileUpload}
              className="block w-full text-xs text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
            />
            {modPdfFileName && (
              <div className="text-xs font-mono text-emerald-700 font-semibold">
                Bereit zum Einbinden: {modPdfFileName}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Begleittext / Zusammenfassung (Optional)
            </label>
            <textarea
              rows={4}
              value={modMarkdown}
              onChange={e => setModMarkdown(e.target.value)}
              placeholder="Kurze Beschreibung oder Kapitelübersicht zum Lehrbuch..."
              className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Alternativ: Externe PDF-/Dokument-URL oder HTML/JS-Code (Optional)
            </label>
            <input
              type="url"
              value={modExternalUrl}
              onChange={e => setModExternalUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 mb-3"
            />
            <textarea
              rows={4}
              value={modInteractiveCode}
              onChange={e => setModInteractiveCode(e.target.value)}
              placeholder="Optionaler HTML/JS Code für interaktive Lehrmodule..."
              className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('modules')}
              className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
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
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 max-w-4xl shadow-xs"
        >
          <div className="pb-4 border-b border-slate-200">
            <div className="text-xs font-mono text-sky-600 font-semibold">
              CODE-TEST &amp; PRÜFUNGS-STUDIO // ADMIN &amp; COLONELFREIGABE
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Neuen Übungstest (für Trainee+) oder Abschlussprüfung (ab Rookie+) als Code einbinden
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Titel des Tests / der Abschlussprüfung *
              </label>
              <input
                type="text"
                required
                value={examTitle}
                onChange={e => setExamTitle(e.target.value)}
                placeholder="z.B. 10-Codes & Funkdisziplin Praxistest"
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Prüfungs-Kennung *
              </label>
              <input
                type="text"
                required
                value={examModuleCode}
                onChange={e => setExamModuleCode(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-sky-700 mb-1">
                Prüfungs-Stufe (Steuert Trainee-Sichtbarkeit)
              </label>
              <select
                value={examStage}
                onChange={e => setExamStage(e.target.value as AssessmentStage)}
                className="w-full px-3.5 py-2 text-xs font-medium rounded-md bg-sky-50 border border-sky-300 text-slate-900"
              >
                <option value="test">Übungstest (Sichtbar für Trainee, Rookie, Officer, Colonel, Admin)</option>
                <option value="final_exam">Abschlussarbeit / Prüfung (Gesperrt für Trainee — erst ab Rookie+)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bestehensgrenze (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={examPassingScore}
                onChange={e => setExamPassingScore(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Zeitlimit (Minuten)
              </label>
              <input
                type="number"
                min={1}
                max={240}
                value={examTimeLimit}
                onChange={e => setExamTimeLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Ausführbarer Prüfungs-Code (HTML / CSS / JavaScript Sandbox) *
            </label>
            <textarea
              rows={10}
              required
              value={examWidgetCode}
              onChange={e => setExamWidgetCode(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-md bg-slate-900 text-slate-100 border border-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Optional: Zusätzliche Multiple-Choice-Fragen im JSON-Format (Standard: [] für reinen Code-Test)
            </label>
            <textarea
              rows={3}
              value={examQuestionsJson}
              onChange={e => setExamQuestionsJson(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
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
    </div>
  );
};
