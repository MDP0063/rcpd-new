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
  Play,
  FileText,
  Clock
} from 'lucide-react';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
  sanitizeId,
  VALIDATION_LIMITS
} from '../lib/firebase';
import {
  AcademyExamDoc,
  ExamFormatType,
  ExamQuestionItem,
  ModuleCategory,
  ModuleEmbedType,
  OfficerRole,
  TrainingModuleDoc,
  UserProgressDoc,
  UserPublicProfile
} from '../types/portal';

interface AcademyCenterProps {
  currentUser: UserPublicProfile;
  modules: TrainingModuleDoc[];
  exams: AcademyExamDoc[];
  userProgress: UserProgressDoc[];
  isAdmin: boolean;
  onStatusToast: (msg: string) => void;
}

export const AcademyCenter: React.FC<AcademyCenterProps> = ({
  currentUser,
  modules,
  exams,
  userProgress,
  isAdmin,
  onStatusToast
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'exams' | 'admin_authoring'>('modules');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(modules[0]?.id || null);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  // Interactive Exam Runner State
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [examSubmittedResult, setExamSubmittedResult] = useState<{
    score: number;
    passed: boolean;
  } | null>(null);

  // Admin Authoring Form State (Module)
  const [modTitle, setModTitle] = useState('');
  const [modCode, setModCode] = useState('POST-LD-20');
  const [modCategory, setModCategory] = useState<ModuleCategory>('SOP & Policy');
  const [modMinClearance, setModMinClearance] = useState<number>(1);
  const [modRequiredRole, setModRequiredRole] = useState<OfficerRole>('cadet');
  const [modEmbedType, setModEmbedType] = useState<ModuleEmbedType>('document');
  const [modMarkdown, setModMarkdown] = useState('');
  const [modExternalUrl, setModExternalUrl] = useState('');
  const [modInteractiveCode, setModInteractiveCode] = useState(
    '<!DOCTYPE html>\n<html><body style="background:#0f172a;color:#f8fafc;font-family:monospace;padding:16px;"><h3>CA-POST Interactive Scenario</h3><p>Hier kann beliebiger HTML/JS Trainings-Code eingebettet werden.</p></body></html>'
  );
  const [modMinutes, setModMinutes] = useState<number>(20);

  // Admin Authoring Form State (Exam)
  const [examTitle, setExamTitle] = useState('');
  const [examModuleCode, setExamModuleCode] = useState('POST-LD-20');
  const [examMinClearance, setExamMinClearance] = useState<number>(1);
  const [examPassingScore, setExamPassingScore] = useState<number>(75);
  const [examTimeLimit, setExamTimeLimit] = useState<number>(15);
  const [examFormat, setExamFormat] = useState<ExamFormatType>('structured_quiz');
  const [examWidgetCode, setExamWidgetCode] = useState('');
  const [examQuestionsJson, setExamQuestionsJson] = useState(
    JSON.stringify(
      [
        {
          id: 'q1',
          question: 'Welcher Code bezeichnet im LAPD/CHP Funkverkehr eine routinemäßige Anfahrt ohne Sondersignal?',
          options: ['Code 1 / Code 2', 'Code 3 (Emergency Lights & Siren)', 'Code 99', '11-99'],
          correctIndex: 0,
          explanation: 'Code 2 bezeichnet eine dringende Anfahrt ohne Sondersignal, Code 3 mit Light & Siren.'
        }
      ],
      null,
      2
    )
  );

  const myProgress = userProgress.filter(p => p.userId === currentUser.uid);

  const getModuleProgress = (modId: string) =>
    myProgress.find(p => p.targetType === 'module' && p.targetId === modId);

  const getExamProgress = (examId: string) =>
    myProgress.find(p => p.targetType === 'exam' && p.targetId === examId);

  const canAccessClearance = (minClearance: number) =>
    isAdmin || currentUser.clearanceLevel >= minClearance;

  const filteredModules = modules.filter(m =>
    selectedCategory === 'ALL' ? true : m.category === selectedCategory
  );

  const currentModule =
    modules.find(m => m.id === activeModuleId) || filteredModules[0] || null;

  const currentExam =
    exams.find(e => e.id === activeExamId) || exams[0] || null;

  const handleMarkModuleComplete = async (mod: TrainingModuleDoc) => {
    const progId = sanitizeId(`prog_${currentUser.uid}_mod_${mod.id}`);
    const existing = getModuleProgress(mod.id);
    const path = `user_progress/${progId}`;

    try {
      if (!existing) {
        await setDoc(doc(db, 'user_progress', progId), {
          userId: currentUser.uid,
          userName: currentUser.displayName.slice(0, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
          targetId: mod.id,
          targetType: 'module',
          targetTitle: mod.title.slice(0, VALIDATION_LIMITS.MODULE_TITLE_MAX),
          status: 'completed',
          scorePercent: 100,
          attempts: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'user_progress', progId), {
          status: 'completed',
          scorePercent: 100,
          attempts: existing.attempts + 1,
          updatedAt: serverTimestamp()
        });
      }
      onStatusToast(`Lehrmodul "${mod.code}" als abgeschlossen im Fortschrittstracking gespeichert.`);
    } catch (error) {
      handleFirestoreError(error, existing ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleSubmitExam = async (exam: AcademyExamDoc, parsedQuestions: ExamQuestionItem[]) => {
    if (parsedQuestions.length === 0) return;
    let correctCount = 0;
    parsedQuestions.forEach(q => {
      if (examAnswers[q.id] === q.correctIndex) {
        correctCount++;
      }
    });

    const scorePercent = Math.round((correctCount / parsedQuestions.length) * 100);
    const passed = scorePercent >= exam.passingScore;
    setExamSubmittedResult({ score: scorePercent, passed });

    const progId = sanitizeId(`prog_${currentUser.uid}_exam_${exam.id}`);
    const existing = getExamProgress(exam.id);
    const path = `user_progress/${progId}`;

    try {
      if (!existing) {
        await setDoc(doc(db, 'user_progress', progId), {
          userId: currentUser.uid,
          userName: currentUser.displayName.slice(0, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
          targetId: exam.id,
          targetType: 'exam',
          targetTitle: exam.title.slice(0, VALIDATION_LIMITS.MODULE_TITLE_MAX),
          status: passed ? 'passed' : 'failed',
          scorePercent,
          attempts: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'user_progress', progId), {
          status: passed ? 'passed' : 'failed',
          scorePercent,
          attempts: existing.attempts + 1,
          updatedAt: serverTimestamp()
        });
      }
      onStatusToast(
        passed
          ? `Prüfung bestanden (${scorePercent}%)! Zertifikat in deiner Akte hinterlegt.`
          : `Prüfung leider nicht bestanden (${scorePercent}% / benötigt: ${exam.passingScore}%).`
      );
    } catch (error) {
      handleFirestoreError(error, existing ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const id = sanitizeId(`mod_${modCode}_${Date.now()}`);
    const path = `training_modules/${id}`;
    try {
      await setDoc(doc(db, 'training_modules', id), {
        title: modTitle.trim().slice(0, VALIDATION_LIMITS.MODULE_TITLE_MAX),
        code: modCode.trim().slice(0, VALIDATION_LIMITS.MODULE_CODE_MAX),
        category: modCategory,
        minClearance: Number(modMinClearance),
        requiredRole: modRequiredRole,
        embedType: modEmbedType,
        contentMarkdown: (modMarkdown.trim() || 'Siehe eingebettetes Dokument / Code-Modul.').slice(
          0,
          VALIDATION_LIMITS.CONTENT_MD_MAX
        ),
        externalUrl: modExternalUrl.trim().slice(0, VALIDATION_LIMITS.EXTERNAL_URL_MAX),
        interactiveCode: modInteractiveCode.slice(0, VALIDATION_LIMITS.INTERACTIVE_CODE_MAX),
        estimatedMinutes: Math.max(1, Math.min(600, Number(modMinutes) || 20)),
        authorUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setModTitle('');
      setModMarkdown('');
      onStatusToast(`Lehrmodul "${modCode}" erfolgreich veröffentlicht.`);
      setActiveTab('modules');
      setActiveModuleId(id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      JSON.parse(examQuestionsJson);
    } catch {
      onStatusToast('Fehler: Fragen-JSON ist syntaktisch ungültig.');
      return;
    }

    const id = sanitizeId(`exam_${examModuleCode}_${Date.now()}`);
    const path = `exams/${id}`;
    try {
      await setDoc(doc(db, 'exams', id), {
        title: examTitle.trim().slice(0, VALIDATION_LIMITS.MODULE_TITLE_MAX),
        moduleCode: examModuleCode.trim().slice(0, VALIDATION_LIMITS.MODULE_CODE_MAX),
        minClearance: Number(examMinClearance),
        passingScore: Math.max(1, Math.min(100, Number(examPassingScore) || 75)),
        timeLimitMinutes: Math.max(1, Math.min(240, Number(examTimeLimit) || 15)),
        examFormat,
        questionsPayload: examQuestionsJson.slice(0, VALIDATION_LIMITS.CONTENT_MD_MAX),
        interactiveWidgetCode: examWidgetCode.slice(0, VALIDATION_LIMITS.INTERACTIVE_CODE_MAX),
        authorUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setExamTitle('');
      onStatusToast('Interaktive Prüfung erfolgreich veröffentlicht.');
      setActiveTab('exams');
      setActiveExamId(id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'training_modules', id));
      onStatusToast('Lehrmodul gelöscht.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `training_modules/${id}`);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'exams', id));
      onStatusToast('Prüfung gelöscht.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `exams/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
            POST LEARNING MANAGEMENT SYSTEM // CLEARANCE-GATED CURRICULUM
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Police Academy Lehrmaterialien & Interaktive Prüfungen
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Rollenspezifische Sichtbarkeit basierend auf deinem Clearance Level ({currentUser.clearanceLevel}). Nahtlose Einbindung externer Dokumente, interaktiver HTML/JS-Simulatoren und zertifizierter Prüfungen.
          </p>
        </div>

        {/* Interactive Segmented Tab Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'modules'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Lehrmaterialien ({modules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'exams'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Interaktive Prüfungen ({exams.length})
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('admin_authoring')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'admin_authoring'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-amber-600 dark:text-amber-400 hover:text-amber-500'
              }`}
            >
              + Dokumente & Code einbinden (Admin)
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: TRAINING MODULES */}
      {activeTab === 'modules' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 4 Columns: Module List + Category Filter */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <label className="block text-xs font-mono text-slate-500 mb-2">
                CURRICULUM FILTERN NACH SACHGEBIET
              </label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">Alle Lehrbereiche anzeigen</option>
                <option value="SOP & Policy">SOP &amp; Policy</option>
                <option value="California Penal Code">California Penal Code</option>
                <option value="Tactical Operations">Tactical Operations</option>
                <option value="Radio & Dispatch">Radio &amp; Dispatch</option>
                <option value="Field Training (FTO)">Field Training (FTO)</option>
                <option value="Supervisor Directive">Supervisor Directive</option>
              </select>

              <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
                {filteredModules.map(mod => {
                  const unlocked = canAccessClearance(mod.minClearance);
                  const prog = getModuleProgress(mod.id);
                  const isSelected = currentModule?.id === mod.id;

                  return (
                    <div
                      key={mod.id}
                      onClick={() => setActiveModuleId(mod.id)}
                      className={`py-3.5 px-3 -mx-1 rounded-md transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-slate-800/80'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                        <span>{mod.code}</span>
                        <span>·</span>
                        <span>LEVEL {mod.minClearance}+</span>
                        <span>·</span>
                        <span>{mod.estimatedMinutes} MIN</span>
                        <span className="ml-auto">
                          {!unlocked ? (
                            <Lock className="w-3.5 h-3.5 text-rose-500 inline" />
                          ) : prog?.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />
                          ) : null}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                        {mod.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                        <span>{mod.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {mod.embedType === 'interactive_code'
                            ? 'Code-Simulator'
                            : mod.embedType === 'external_url'
                            ? 'Externes Dokument'
                            : 'SOP Leitfaden'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 8 Columns: Seamless Document / External URL / Interactive Code Viewer */}
          <div className="lg:col-span-8">
            {!currentModule ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-sm text-slate-500">
                Bitte wähle links ein Lehrmodul aus.
              </div>
            ) : !canAccessClearance(currentModule.minClearance) ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 space-y-4">
                <div className="flex items-center gap-2 text-rose-500 font-mono text-xs">
                  <Lock className="w-4 h-4" />
                  <span>ZUGRIFF VERWEIGERT // INSUFFICIENT CLEARANCE LEVEL</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {currentModule.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Dieses Lehrmaterial erfordert mindestens <strong>Clearance Level {currentModule.minClearance}</strong> (Rolle: <span className="uppercase font-mono">{currentModule.requiredRole}</span>). Dein aktuelles Clearance Level ist <strong>Level {currentUser.clearanceLevel}</strong> ({currentUser.role}).
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-amber-600 dark:text-amber-400">
                      <span>{currentModule.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{currentModule.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>CLEARANCE LEVEL {currentModule.minClearance}</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
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
                        ? 'Wiederholung protokollieren'
                        : 'Als durchgearbeitet bestätigen'}
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteModule(currentModule.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-md border border-slate-200 dark:border-slate-800 cursor-pointer"
                        title="Modul löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Structured SOP Document Content */}
                <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {currentModule.contentMarkdown}
                </div>

                {/* Seamless External Document Reference / Iframe */}
                {currentModule.externalUrl && (
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-500" />
                        <span>EXTERNES REFERENZDOKUMENT / SOP SPEZIFIKATION</span>
                      </div>
                      <a
                        href={currentModule.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        In neuem Tab öffnen <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                      Quelle: {currentModule.externalUrl}
                    </div>
                  </div>
                )}

                {/* Seamless Sandboxed Interactive HTML/JS Code Simulator */}
                {currentModule.interactiveCode && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-amber-500" />
                        NAHTLOS EINGEBETTETES INTERAKTIVES TRAININGSMOUDL (SANDBOX RUNTIME)
                      </span>
                      <span>HTML5 / JS SIMULATOR</span>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800 bg-slate-950">
                      <iframe
                        title={currentModule.title}
                        srcDoc={currentModule.interactiveCode}
                        sandbox="allow-scripts"
                        className="w-full h-[360px] border-0"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE EXAMS */}
      {activeTab === 'exams' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Exam List */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 divide-y divide-slate-200 dark:divide-slate-800">
            {exams.map(ex => {
              const unlocked = canAccessClearance(ex.minClearance);
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
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800/80'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <span>{ex.moduleCode}</span>
                    <span>·</span>
                    <span>MIN {ex.passingScore}%</span>
                    <span>·</span>
                    <span>LEVEL {ex.minClearance}+</span>
                    <span className="ml-auto">
                      {!unlocked ? (
                        <Lock className="w-3.5 h-3.5 text-rose-500 inline" />
                      ) : prog?.status === 'passed' ? (
                        <span className="text-emerald-500 font-semibold">{prog.scorePercent}% PASS</span>
                      ) : prog?.status === 'failed' ? (
                        <span className="text-rose-500">{prog.scorePercent}% FAIL</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {ex.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> {ex.timeLimitMinutes} Min Zeitlimit
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Exam Runner */}
          <div className="lg:col-span-8">
            {!currentExam ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-sm text-slate-500">
                Keine Prüfung ausgewählt.
              </div>
            ) : !canAccessClearance(currentExam.minClearance) ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 space-y-3">
                <div className="text-xs font-mono text-rose-500 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> PRÜFUNG GESPERRT (CLEARANCE LEVEL {currentExam.minClearance} ERFORDERLICH)
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{currentExam.title}</h2>
              </div>
            ) : (
              (() => {
                let parsedQuestions: ExamQuestionItem[] = [];
                try {
                  parsedQuestions = JSON.parse(currentExam.questionsPayload);
                } catch {
                  parsedQuestions = [];
                }

                return (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6">
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
                          POST CERTIFICATION EXAM // {currentExam.moduleCode} · PASSING SCORE {currentExam.passingScore}%
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {currentExam.title}
                        </h2>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteExam(currentExam.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-md border border-slate-200 dark:border-slate-800 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {currentExam.interactiveWidgetCode && (
                      <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800">
                        <iframe
                          title="Exam Tactical Briefing"
                          srcDoc={currentExam.interactiveWidgetCode}
                          sandbox="allow-scripts"
                          className="w-full h-36 border-0"
                        />
                      </div>
                    )}

                    {examSubmittedResult && (
                      <div
                        className={`p-4 rounded-lg border ${
                          examSubmittedResult.passed
                            ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300'
                            : 'bg-rose-950/30 border-rose-700/50 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-sm font-bold">
                          <span>
                            ERGEBNIS: {examSubmittedResult.score}% ({examSubmittedResult.passed ? 'PASSED // ZERTIFIZIERT' : 'FAILED // WIEDERHOLUNG ERFORDERLICH'})
                          </span>
                          <span>BENÖTIGT: {currentExam.passingScore}%</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      {parsedQuestions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                        >
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
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
                                      ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-slate-100 font-medium'
                                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`question_${q.id}`}
                                    checked={selected}
                                    onChange={() =>
                                      setExamAnswers(prev => ({ ...prev, [q.id]: optIdx }))
                                    }
                                    className="text-amber-500 focus:ring-amber-500"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                          {examSubmittedResult && (
                            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                              Auswertung: {q.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleSubmitExam(currentExam, parsedQuestions)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-colors cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        Prüfung auswerten & Fortschritt speichern
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN AUTHORING STUDIO (EXTERNAL DOCS & INTERACTIVE CODE EMBEDS) */}
      {activeTab === 'admin_authoring' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Create Module Form */}
          <form
            onSubmit={handleCreateModule}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4"
          >
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="text-xs font-mono text-amber-500">CURRICULUM STUDIO</div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Neues Lehrmaterial / Externes Dokument / Code-Modul einbinden
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Modultitel
                </label>
                <input
                  type="text"
                  required
                  value={modTitle}
                  onChange={e => setModTitle(e.target.value)}
                  placeholder="z.B. LD-24: Pit Maneuver & Pursuit Policy"
                  className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Modul-Code
                </label>
                <input
                  type="text"
                  required
                  value={modCode}
                  onChange={e => setModCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Kategorie
                </label>
                <select
                  value={modCategory}
                  onChange={e => setModCategory(e.target.value as ModuleCategory)}
                  className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
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
                  Min. Clearance (1-10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={modMinClearance}
                  onChange={e => setModMinClearance(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Einbettungs-Typ
                </label>
                <select
                  value={modEmbedType}
                  onChange={e => setModEmbedType(e.target.value as ModuleEmbedType)}
                  className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="document">SOP Textdokument</option>
                  <option value="external_url">Externe Dokument-URL</option>
                  <option value="interactive_code">Interaktiver HTML/JS Code</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lehrmaterial-Inhalt / Leitfaden
              </label>
              <textarea
                rows={4}
                required
                value={modMarkdown}
                onChange={e => setModMarkdown(e.target.value)}
                placeholder="Detaillierte Lehrunterlagen, Paragraphen oder Anweisungen..."
                className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Externe Dokument-URL (Optional, z.B. Google Docs / PDF / CA-POST Richtlinie)
              </label>
              <input
                type="url"
                value={modExternalUrl}
                onChange={e => setModExternalUrl(e.target.value)}
                placeholder="https://post.ca.gov/..."
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Interaktiver HTML/JS Code-Simulator (Wird nahtlos in der Academy-Sandbox ausgeführt)
              </label>
              <textarea
                rows={5}
                value={modInteractiveCode}
                onChange={e => setModInteractiveCode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-md hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Lehrmodul in Datenbank veröffentlichen
            </button>
          </form>

          {/* Create Exam Form */}
          <form
            onSubmit={handleCreateExam}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4"
          >
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="text-xs font-mono text-amber-500">EXAMINATION BUILDER</div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Interaktive Prüfung & Code-Assessment erstellen
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Prüfungstitel
                </label>
                <input
                  type="text"
                  required
                  value={examTitle}
                  onChange={e => setExamTitle(e.target.value)}
                  placeholder="z.B. Pursuit & PIT Certification Exam"
                  className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Zugehöriger Modul-Code
                </label>
                <input
                  type="text"
                  required
                  value={examModuleCode}
                  onChange={e => setExamModuleCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Min. Clearance
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={examMinClearance}
                  onChange={e => setExamMinClearance(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
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
                  className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Zeitlimit (Min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={examTimeLimit}
                  onChange={e => setExamTimeLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prüfungsfragen als strukturiertes JSON (Frage, Antwortoptionen, correctIndex, Erklärung)
              </label>
              <textarea
                rows={7}
                required
                value={examQuestionsJson}
                onChange={e => setExamQuestionsJson(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Optionales Interaktives Szenario-Widget (HTML/JS Code über den Prüfungsfragen)
              </label>
              <textarea
                rows={3}
                value={examWidgetCode}
                onChange={e => setExamWidgetCode(e.target.value)}
                placeholder="<!DOCTYPE html>..."
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-md hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Interaktive Prüfung veröffentlichen
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
