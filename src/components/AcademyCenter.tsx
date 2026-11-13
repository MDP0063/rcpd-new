import React, { useEffect, useRef, useState } from 'react';
import './AcademyCenter.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import {
  BookOpen,
  ExternalLink,
  Lock,
  Award,
  FileText,
  Clock,
  Terminal
} from 'lucide-react';
import {
  AcademyExamDoc,
  ExamQuestionPublicItem,
  ModuleCategory,
  ROLE_HIERARCHY,
  TrainingModuleDoc,
  UserProgressDoc,
  UserPublicProfile
} from '../types/portal';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import overviewWayfinder from '../assets/academy/overview-wayfinder.svg';
import coursesGraduationCap from '../assets/academy/courses-graduation-cap.svg';
import libraryThreeBooks from '../assets/academy/library-three-books.svg';
import examsAnswerSheet from '../assets/academy/exams-answer-sheet.svg';
import notesNotepad from '../assets/academy/notes-notepad.svg';
import { ExamParticipantRunner } from './ExamParticipantRunner';
import { ExamReviewCenter } from './ExamReviewCenter';
import { ExamCorrectionCenter } from './ExamCorrectionCenter';
import { AcademyLearningCenter } from './AcademyLearningCenter';
import { AcademyAuthoringCenter } from './AcademyAuthoringCenter';
import { AcademyMaterialCategoryManager } from './AcademyMaterialCategoryManager';
import { AcademyMaterialDocumentTypeManager } from './AcademyMaterialDocumentTypeManager';
import { AcademyMaterialManagementCenter } from './AcademyMaterialManagementCenter';
import { AcademyMaterialReaderNotes } from './AcademyMaterialReaderNotes';
import type { AcademyPrivateNoteTextAnchor, AcademyPublicMaterialCatalogItem, AcademyPublicMaterialDetail } from '../types/academy';
import { createTextAnchorFromRange, resolveTextAnchorInElement } from '../lib/academyTextAnchors';
import { matchesLibrarySearch, sortLibraryEntries } from '../lib/academyLibrarySearch';

interface AcademyCenterProps {
  currentUser: UserPublicProfile;
  roster?: UserPublicProfile[];
  modules: TrainingModuleDoc[];
  exams: AcademyExamDoc[];
  userProgress: UserProgressDoc[];
  onRefreshState: () => Promise<void>;
  onStatusToast: (msg: string) => void;
  reviewNavigationTarget?: { examId: string; attemptId: string } | null;
  onReviewNavigationConsumed?: () => void;
}

export const AcademyCenter: React.FC<AcademyCenterProps> = ({
  currentUser,
  roster = [],
  modules,
  exams,
  userProgress,
  onRefreshState,
  onStatusToast,
  reviewNavigationTarget = null,
  onReviewNavigationConsumed
}) => {
  const rolePermissions = ROLE_HIERARCHY[currentUser.role] || ROLE_HIERARCHY.trainee;
  const assignedCourses = currentUser.granularPermissions?.assignedCourseCodes || [];
  const hasScopedCourseRights =
    Boolean(currentUser.granularPermissions?.canGradeAssignedCourses) &&
    assignedCourses.length > 0;
  const canEditAcademy = rolePermissions.canEditAcademy || hasScopedCourseRights; // True for Admin, Colonel, or Granular Course Instructor
  const canAccessFinalExams = rolePermissions.canAccessFinalExams; // False for Trainee, True for Rookie/Officer/Colonel/Admin

  const [isAcademyHome, setIsAcademyHome] = useState(true);
  const [hasUnsavedNoteChanges, setHasUnsavedNoteChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'courses' | 'modules' | 'notes' | 'exam_center' | 'exam_reviews' | 'exam_corrections' | 'tests' | 'final_exams'
  >('overview');
  const canLeaveNotes = () => activeTab !== 'notes' || !hasUnsavedNoteChanges || window.confirm('Deine privaten Notizänderungen sind noch nicht abgeschlossen. Möchtest du den Bereich wirklich verlassen?');
  const [initialReviewAttemptId, setInitialReviewAttemptId] = useState<string | null>(null);
  const processedReviewNavigationRef = useRef<string | null>(null);
  useEffect(() => {
    if (!reviewNavigationTarget) {
      processedReviewNavigationRef.current = null;
      return;
    }
    const targetKey = `${reviewNavigationTarget.examId}:${reviewNavigationTarget.attemptId}`;
    if (processedReviewNavigationRef.current === targetKey) return;
    processedReviewNavigationRef.current = targetKey;
    if (activeTab === 'notes' && hasUnsavedNoteChanges && !window.confirm('Deine privaten Notizänderungen sind noch nicht abgeschlossen. Möchtest du die Notiz verlassen und zur Bewertung wechseln?')) {
      onReviewNavigationConsumed?.();
      return;
    }
    setHasUnsavedNoteChanges(false);
    setIsAcademyHome(false);
    setActiveTab('exam_reviews');
    setInitialReviewAttemptId(reviewNavigationTarget.attemptId);
    onReviewNavigationConsumed?.();
  }, [reviewNavigationTarget?.examId, reviewNavigationTarget?.attemptId, activeTab, hasUnsavedNoteChanges, onReviewNavigationConsumed]);
  const [courseAreaMode, setCourseAreaMode] = useState<'learning' | 'management'>('learning');
  const [libraryAreaMode, setLibraryAreaMode] = useState<'materials' | 'categories' | 'documentTypes' | 'versionedMaterials'>('materials');
  const canAuthorCourses = currentUser.role === 'admin' || currentUser.role === 'colonel';
  const canManageVersionedMaterials = canAuthorCourses || hasScopedCourseRights;

  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [moduleSortOrder, setModuleSortOrder] = useState<'relevance' | 'alphabetical' | 'updated'>('relevance');
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState('');
  const [moduleDocumentTypeFilter, setModuleDocumentTypeFilter] = useState('');
  const [isLibraryNavigationOpen, setIsLibraryNavigationOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [versionedMaterials, setVersionedMaterials] = useState<AcademyPublicMaterialCatalogItem[]>([]);
  const [versionedMaterialsLoading, setVersionedMaterialsLoading] = useState(false);
  const [versionedMaterialsError, setVersionedMaterialsError] = useState('');
  const [versionedMaterialsRetryable, setVersionedMaterialsRetryable] = useState(false);
  const [versionedMaterialsLoadAttempt, setVersionedMaterialsLoadAttempt] = useState(0);
  const [activeVersionedMaterialId, setActiveVersionedMaterialId] = useState<string | null>(null);
  const [currentVersionedMaterial, setCurrentVersionedMaterial] = useState<AcademyPublicMaterialDetail | null>(null);
  const [versionedMaterialLoading, setVersionedMaterialLoading] = useState(false);
  const [versionedMaterialError, setVersionedMaterialError] = useState('');
  const [versionedMaterialRetryable, setVersionedMaterialRetryable] = useState(false);
  const [versionedMaterialLoadAttempt, setVersionedMaterialLoadAttempt] = useState(0);
  const [loadedVersionedMaterialAccessKey, setLoadedVersionedMaterialAccessKey] = useState('');
  const versionedMaterialRequestIdRef = useRef(0);
  const versionedMaterialAccessKey = activeVersionedMaterialId
    ? activeVersionedMaterialId + ':' + currentUser.uid + ':' + currentUser.role
    : '';
  const displayedVersionedMaterial = currentVersionedMaterial &&
    loadedVersionedMaterialAccessKey === versionedMaterialAccessKey
      ? currentVersionedMaterial
      : null;
  const isVersionedMaterialLoading = Boolean(activeVersionedMaterialId) &&
    !displayedVersionedMaterial && !versionedMaterialError;
  const [selectedVersionedMaterialAnchor, setSelectedVersionedMaterialAnchor] = useState<AcademyPrivateNoteTextAnchor | null>(null);
  const versionedMaterialMarkdownRef = useRef<HTMLDivElement | null>(null);
  const versionedMaterialCodeRef = useRef<HTMLPreElement | null>(null);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedVersionedMaterialAnchor(null);
  }, [activeVersionedMaterialId, currentVersionedMaterial?.versionId]);

  const captureVersionedMaterialAnchor = (event: React.MouseEvent<HTMLElement>, kind: 'markdown' | 'code') => {
    setSelectedVersionedMaterialAnchor(null);
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    setSelectedVersionedMaterialAnchor(createTextAnchorFromRange(event.currentTarget, kind, selection.getRangeAt(0)));
  };

  const jumpToVersionedMaterialAnchor = (anchor: AcademyPrivateNoteTextAnchor): 'resolved' | 'missing' | 'ambiguous' => {
    const root = anchor.kind === 'markdown' ? versionedMaterialMarkdownRef.current : versionedMaterialCodeRef.current;
    if (!root) return 'missing';
    const result = resolveTextAnchorInElement(root, anchor);
    if (result.status !== 'resolved') return result.status;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(result.range);
    result.range.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return 'resolved';
  };

  // Interactive Test/Exam Runner State
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [customCodeScore, setCustomCodeScore] = useState<number>(100);
  const [examSubmittedResult, setExamSubmittedResult] = useState<{
    score: number;
    passed: boolean;
  } | null>(null);
  const [examExplanations, setExamExplanations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeTab !== 'modules' || libraryAreaMode !== 'materials') return;
    let cancelled = false;
    setVersionedMaterialsLoading(true);
    setVersionedMaterialsError('');
    setVersionedMaterialsRetryable(false);
    setVersionedMaterials([]);
    void apiFetch<{ materials: AcademyPublicMaterialCatalogItem[] }>(API_ENDPOINTS.ACADEMY_MATERIAL_CATALOG)
      .then(response => {
        if (cancelled) return;
        if (!response.ok || !response.data) {
          setVersionedMaterialsError(response.error || 'Neue Materialien konnten nicht geladen werden.');
          setVersionedMaterialsRetryable(response.status === 0 || response.status === 429 || response.status >= 500);
          return;
        }
        setVersionedMaterials(Array.isArray(response.data.materials) ? response.data.materials : []);
        setVersionedMaterialsRetryable(false);
      })
      .catch(() => {
        if (!cancelled) {
          setVersionedMaterialsError('Neue Materialien konnten nicht geladen werden.');
          setVersionedMaterialsRetryable(true);
        }
      })
      .finally(() => {
        if (!cancelled) setVersionedMaterialsLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, libraryAreaMode, currentUser.uid, currentUser.role, versionedMaterialsLoadAttempt]);

  useEffect(() => {
    const requestId = ++versionedMaterialRequestIdRef.current;
    if (!activeVersionedMaterialId) {
      setCurrentVersionedMaterial(null);
      setLoadedVersionedMaterialAccessKey('');
      setVersionedMaterialLoading(false);
      setVersionedMaterialError('');
      setVersionedMaterialRetryable(false);
      return;
    }
    let cancelled = false;
    const accessKey = activeVersionedMaterialId + ':' + currentUser.uid + ':' + currentUser.role;
    setCurrentVersionedMaterial(null);
    setLoadedVersionedMaterialAccessKey('');
    setVersionedMaterialLoading(true);
    setVersionedMaterialError('');
    setVersionedMaterialRetryable(false);
    void apiFetch<{ material: AcademyPublicMaterialDetail }>(
      API_ENDPOINTS.ACADEMY_MATERIAL_CATALOG_ITEM(activeVersionedMaterialId)
    )
      .then(response => {
        if (cancelled || requestId !== versionedMaterialRequestIdRef.current) return;
        if (!response.ok || !response.data) {
          setVersionedMaterialError(response.error || 'Dieses Material ist nicht mehr verfügbar.');
          setVersionedMaterialRetryable(response.status === 0 || response.status === 429 || response.status >= 500);
          return;
        }
        setCurrentVersionedMaterial(response.data.material);
        setLoadedVersionedMaterialAccessKey(accessKey);
        setVersionedMaterialRetryable(false);
      })
      .catch(() => {
        if (!cancelled && requestId === versionedMaterialRequestIdRef.current) {
          setVersionedMaterialError('Dieses Material konnte nicht geladen werden.');
          setVersionedMaterialRetryable(true);
        }
      })
      .finally(() => {
        if (!cancelled && requestId === versionedMaterialRequestIdRef.current) setVersionedMaterialLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeVersionedMaterialId, currentUser.uid, currentUser.role, versionedMaterialLoadAttempt]);

  const myProgress = userProgress.filter(p => p.userId === currentUser.uid);

  const getModuleProgress = (modId: string) =>
    myProgress.find(p => p.targetType === 'module' && p.targetId === modId);

  const getExamProgress = (examId: string) =>
    myProgress.find(p => (p.targetType === 'test' || p.targetType === 'final_exam') && p.targetId === examId);

  const practiceTests = exams.filter(e => e.assessmentStage !== 'final_exam');
  const finalExams = exams.filter(e => e.assessmentStage === 'final_exam');

  const libraryEntries = [
    ...modules.map(module => ({
      kind: 'legacy' as const,
      id: module.id,
      title: module.title,
      code: module.code,
      category: module.category,
      description: '',
      documentTypeName: module.embedType === 'pdf_upload' ? 'PDF-Dokument' : module.embedType === 'interactive_code' ? 'Interaktiver Code' : module.embedType === 'external_url' ? 'Externer Inhalt' : 'Textdokument',
      searchTerms: module.pdfFileName || '',
      updatedIso: module.updatedIso || '',
      module
    })),
    ...versionedMaterials.map(material => ({
      kind: 'versioned' as const,
      id: material.id,
      title: material.title,
      code: material.code,
      category: material.categoryName,
      description: material.description || '',
      documentTypeName: material.documentTypeName,
      searchTerms: '',
      updatedIso: material.publishedIso,
      material
    }))
  ];
  const libraryCategories = [...new Set(libraryEntries.map(entry => entry.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'de-DE'));
  const libraryDocumentTypes = [...new Set(libraryEntries.map(entry => entry.documentTypeName).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'de-DE'));
  const filteredLibraryEntries = libraryEntries.filter(entry =>
    (!moduleCategoryFilter || entry.category === moduleCategoryFilter) &&
    (!moduleDocumentTypeFilter || entry.documentTypeName === moduleDocumentTypeFilter) &&
    matchesLibrarySearch(entry, moduleSearchQuery)
  );
  const sortedLibraryEntries = sortLibraryEntries(filteredLibraryEntries, moduleSearchQuery, moduleSortOrder);
  const hasActiveLibraryFilters = Boolean(moduleCategoryFilter || moduleDocumentTypeFilter);
  const clearLibraryFilters = () => {
    setModuleCategoryFilter('');
    setModuleDocumentTypeFilter('');
  };

  const openVersionedMaterial = (materialId: string) => {
    if (activeVersionedMaterialId === materialId) {
      setIsLibraryNavigationOpen(true);
      return;
    }
    versionedMaterialRequestIdRef.current += 1;
    setActiveModuleId(null);
    setCurrentVersionedMaterial(null);
    setLoadedVersionedMaterialAccessKey('');
    setVersionedMaterialLoading(true);
    setVersionedMaterialError('');
    setVersionedMaterialRetryable(false);
    setSelectedVersionedMaterialAnchor(null);
    setActiveVersionedMaterialId(materialId);
    setIsLibraryNavigationOpen(true);
  };

  const currentModule = modules.find(module => module.id === activeModuleId) || null;

  // PDFs werden erst beim Öffnen eines Handbuchs nachgeladen.
  const [pdfCache, setPdfCache] = useState<Record<string, string>>({});
  const currentModuleId = currentModule ? `${currentModule.id}:${currentModule.updatedIso || ''}` : undefined;
  const currentHasPdf = Boolean(currentModule?.hasPdf || currentModule?.pdfDataUrl);
  const currentPdfLoaded = currentModuleId ? currentModuleId in pdfCache : false;

  // Keep only the currently selected PDF in browser memory; revisiting another document reloads it.
  useEffect(() => {
    setPdfCache(previous => {
      if (!currentModuleId) return {};
      const currentUrl = previous[currentModuleId];
      return currentUrl ? { [currentModuleId]: currentUrl } : {};
    });
  }, [currentModuleId]);

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

  const handleDeleteModule = async (id: string) => {
    if (!canEditAcademy) return;
    const res = await apiFetch(
      `${API_ENDPOINTS.ACADEMY_MODULES}/${id}`,
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

  const renderVersionedMaterialMarkdown = (markdown: string) => (
    <div className="space-y-3 text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children }) => <h1 className="pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{children}</h1>,
          h2: ({ children }) => <h2 className="pt-3 pb-1 border-b border-slate-100 dark:border-slate-800 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="pt-3 pb-1 text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">{children}</h3>,
          h4: ({ children }) => <h4 className="pt-2 text-base sm:text-lg font-semibold text-slate-900 dark:text-white">{children}</h4>,
          p: ({ children }) => <p className="my-3 leading-7">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-slate-300 pl-4 text-slate-600 dark:border-slate-700 dark:text-slate-300">{children}</blockquote>,
          a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline underline-offset-2 dark:text-sky-300">{children}</a>,
          pre: ({ children }) => <pre className="my-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100">{children}</pre>,
          code: ({ children, className }) => <code className={className || 'rounded bg-slate-100 px-1 py-0.5 text-sm dark:bg-slate-800'}>{children}</code>,
          table: ({ children }) => <div className="my-4 overflow-x-auto"><table className="min-w-full border-collapse text-sm">{children}</table></div>,
          th: ({ children }) => <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left dark:border-slate-700 dark:bg-slate-800">{children}</th>,
          td: ({ children }) => <td className="border border-slate-300 px-3 py-2 dark:border-slate-700">{children}</td>,
          img: ({ alt }) => <span role="note" className="inline-block rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">Externes Bild nicht geladen{alt ? ' (' + alt + ')' : ''}.</span>
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className={`academy-center-root ${isAcademyHome ? 'space-y-9' : activeTab === 'overview' ? 'academy-interior-shell space-y-7' : 'academy-subpage-shell space-y-7'}`}>

      {(isAcademyHome || activeTab !== 'overview') && (
        <header className="space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            <span aria-hidden="true" className="h-px w-6 bg-[#2864D9]" />
            <span>Ausbildungsbereich</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Academy</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Ausbildung, Lehrgänge und Wissen für den Dienst.</p>
          
        </header>
      )}
      <div
        key={isAcademyHome ? 'academy-home' : `academy-${activeTab}`}
        className={!isAcademyHome ? 'academy-content-enter' : undefined}
      >
      {!isAcademyHome && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (!canLeaveNotes()) return;
              setHasUnsavedNoteChanges(false);
              setIsAcademyHome(true);
              setActiveTab('overview');
            }}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
            aria-label="Zur Academy-Kachelansicht zurückkehren"
          >
            <span aria-hidden="true">←</span>
            Zur Kachelansicht
          </button>
          <nav aria-label="Academy-Hauptbereiche" className="academy-main-nav flex flex-wrap gap-1">
            {[
              { id: 'overview' as const, label: 'Übersicht', accent: '#2864D9' },
              { id: 'courses' as const, label: 'Kurse', accent: '#087F8C' },
              { id: 'modules' as const, label: 'Lernbibliothek', accent: '#6841B8' },
              { id: 'exam_center' as const, label: 'Prüfungen', accent: '#A33370' },
              { id: 'notes' as const, label: 'Meine Notizen', accent: '#287A45' }
            ].map(item => {
              const selected = item.id === 'exam_center'
                ? ['exam_center', 'tests', 'final_exams', 'exam_reviews', 'exam_corrections'].includes(activeTab)
                : item.id === 'courses'
                  ? ['courses'].includes(activeTab)
                  : item.id === 'modules'
                    ? ['modules'].includes(activeTab)
                    : activeTab === item.id;
              return <button key={item.id} type="button"
                onClick={() => {
                  if (!canLeaveNotes()) return;
                  setHasUnsavedNoteChanges(false);
                  setActiveTab(item.id);
                  if (item.id === 'exam_center') {
                    setActiveExamId(null); setExamSubmittedResult(null); setExamAnswers({}); setExamExplanations({});
                  }
                  if (item.id === 'modules') { setActiveModuleId(null); setIsLibraryNavigationOpen(false); }
                }}
                aria-current={selected ? 'page' : undefined}
                style={selected ? { color: item.accent, borderBottomColor: item.accent } : undefined}
                className={`px-3 py-2 text-sm border-b-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${selected ? 'font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}>
                {item.label}
              </button>;
            })}
          </nav>
        </div>
      )}
      {['exam_center', 'tests', 'final_exams', 'exam_reviews', 'exam_corrections'].includes(activeTab) && (
        <nav aria-label="Prüfungsbereiche" className="academy-exam-section-nav flex flex-wrap gap-2">
          {[
            { id: 'exam_center' as const, label: 'Prüfungszentrum' },
            { id: 'tests' as const, label: `Übungstests (${practiceTests.length})` },
            ...(canAccessFinalExams ? [{ id: 'final_exams' as const, label: `Kursabschlussprüfungen (${finalExams.length})` }] : []),
            ...(canEditAcademy ? [{ id: 'exam_reviews' as const, label: 'Offene Bewertungen' }] : []),
            ...(['admin', 'colonel'].includes(currentUser.role) ? [{ id: 'exam_corrections' as const, label: 'Korrekturen & Freigaben' }] : [])
          ].map(item => (
            <button key={item.id} type="button" onClick={() => {
              setIsAcademyHome(false);
              setActiveTab(item.id);
              if (item.id === 'tests') setActiveExamId(practiceTests[0]?.id || null);
              if (item.id === 'final_exams') setActiveExamId(finalExams[0]?.id || null);
              if (['exam_center', 'tests', 'final_exams'].includes(item.id)) {
                setExamSubmittedResult(null); setExamAnswers({}); setExamExplanations({});
              }
            }} aria-current={activeTab === item.id ? 'page' : undefined} className={`px-3 py-1.5 text-xs rounded-md border ${activeTab === item.id ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100' : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'}`}>{item.label}</button>
          ))}
        </nav>
      )}
      {isAcademyHome && (
        <section aria-labelledby="academy-overview-heading" className="space-y-7">
          <div>
            <h2 id="academy-overview-heading" className="text-lg font-semibold text-slate-900 dark:text-white">Deine Academy</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Wähle einen Bereich, um deine Ausbildung fortzusetzen.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <button type="button" onClick={() => { setActiveTab('overview'); setIsAcademyHome(false); }} className="academy-entry-tile group relative isolate min-h-[220px] overflow-hidden rounded-xl bg-[#2864D9] p-6 sm:p-7 xl:p-8 text-left text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.18)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 active:scale-[0.985] active:duration-150 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2864D9]">
              <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 -z-10 h-28 w-48 rounded-full bg-white/10 blur-3xl opacity-70 transition-all duration-300 group-hover:bg-white/15 group-hover:opacity-100" />
              <img src={overviewWayfinder} alt="" aria-hidden="true" className="mb-5 h-10 w-10 object-contain sm:h-12 sm:w-12" />
              <span className="block text-lg font-semibold">Übersicht</span>
              <span className="mt-2 block max-w-xs text-sm leading-relaxed text-white">Den Aufbau der Academy und das Zusammenspiel von Lehrgängen, Kursen und Lernbibliothek verstehen.</span>
            </button>
            <button type="button" onClick={() => { setActiveTab('courses'); setIsAcademyHome(false); }} className="academy-entry-tile group relative isolate min-h-[220px] overflow-hidden rounded-xl bg-[#087F8C] p-6 sm:p-7 xl:p-8 text-left text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.18)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 active:scale-[0.985] active:duration-150 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#087F8C]">
              <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 -z-10 h-28 w-48 rounded-full bg-white/10 blur-3xl opacity-70 transition-all duration-300 group-hover:bg-white/15 group-hover:opacity-100" />
              <img src={coursesGraduationCap} alt="" aria-hidden="true" className="mb-5 h-10 w-10 object-contain sm:h-12 sm:w-12" />
              <span className="block text-lg font-semibold">Kurse</span>
              <span className="mt-2 block max-w-xs text-sm leading-relaxed text-white">Lehrgänge und Kurse entdecken, beginnen und bearbeiten.</span>
            </button>
            <button type="button" onClick={() => { setActiveTab('modules'); setIsAcademyHome(false); }} className="academy-entry-tile group relative isolate min-h-[220px] overflow-hidden rounded-xl bg-[#6841B8] p-6 sm:p-7 xl:p-8 text-left text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.18)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 active:scale-[0.985] active:duration-150 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6841B8]">
              <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 -z-10 h-28 w-48 rounded-full bg-white/10 blur-3xl opacity-70 transition-all duration-300 group-hover:bg-white/15 group-hover:opacity-100" />
              <img src={libraryThreeBooks} alt="" aria-hidden="true" className="mb-5 h-10 w-10 object-contain sm:h-12 sm:w-12" />
              <span className="block text-lg font-semibold">Lernbibliothek</span>
              <span className="mt-2 block max-w-xs text-sm leading-relaxed text-white">Fachliche Materialien finden und als Wissensquelle nutzen.</span>
            </button>
            <button type="button" onClick={() => { setActiveTab('exam_center'); setIsAcademyHome(false); }} className="academy-entry-tile group relative isolate min-h-[220px] overflow-hidden rounded-xl bg-[#A33370] p-6 sm:p-7 xl:p-8 text-left text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.18)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 active:scale-[0.985] active:duration-150 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A33370]">
              <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 -z-10 h-28 w-48 rounded-full bg-white/10 blur-3xl opacity-70 transition-all duration-300 group-hover:bg-white/15 group-hover:opacity-100" />
              <img src={examsAnswerSheet} alt="" aria-hidden="true" className="mb-5 h-10 w-10 object-contain sm:h-12 sm:w-12" />
              <span className="block text-lg font-semibold">Prüfungen</span>
              <span className="mt-2 block max-w-xs text-sm leading-relaxed text-white">Wissen überprüfen und zugängliche Prüfungen ablegen.</span>
            </button>
            <button type="button" onClick={() => { setActiveTab('notes'); setIsAcademyHome(false); }} className="academy-entry-tile group relative isolate min-h-[220px] overflow-hidden rounded-xl bg-[#287A45] p-6 sm:p-7 xl:p-8 text-left text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.18)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 active:scale-[0.985] active:duration-150 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#287A45]">
              <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 -z-10 h-28 w-48 rounded-full bg-white/10 blur-3xl opacity-70 transition-all duration-300 group-hover:bg-white/15 group-hover:opacity-100" />
              <img src={notesNotepad} alt="" aria-hidden="true" className="mb-5 h-10 w-10 object-contain sm:h-12 sm:w-12" />
              <span className="block text-lg font-semibold">Meine Notizen</span>
              <span className="mt-2 block max-w-xs text-sm leading-relaxed text-white">Private Notizen und Lesezeichen verwalten.</span>
            </button>
          </div>
        </section>
      )}
      {!isAcademyHome && activeTab === 'overview' && (
        <section aria-labelledby="academy-overview-content-heading" className="academy-overview-content space-y-7">
          <div className="academy-overview-hero">

            <div className="academy-overview-intro space-y-2">
              <div className="academy-eyebrow">
                Orientierung
              </div>
              <h2 id="academy-overview-content-heading" className="academy-page-title">
                Willkommen in der Academy
              </h2>
              <p className="academy-page-lede">
                Hier findest du deine Ausbildungsinhalte an einem Ort. Die Academy verbindet Lehrgänge, einzelne Kurse und Lernmaterialien – damit du dich gezielt informieren, lernen und dein Wissen überprüfen kannst.
              </p>
            </div>
          </div>

          <div className="academy-learning-path-card">
            <div className="relative max-w-3xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2864D9] dark:text-blue-300">Ein Bereich – verschiedene Wege</p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Lernen ist nicht immer eine gerade Linie.</h2>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                Ein Lehrgang kann mehrere Kurse bündeln. Du kannst einen Kurs aber auch unabhängig davon bearbeiten und Materialien direkt in der Lernbibliothek nachschlagen. Die Academy gibt dir Orientierung, ohne einen einzigen festen Lernweg vorzuschreiben.
              </p>
            </div>
          </div>

          <div className="academy-structure-section space-y-4">
            <div className="max-w-2xl space-y-1">
              <h2 className="academy-structure-heading text-xl font-semibold tracking-tight">Wie die Inhalte zusammenhängen</h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Diese drei Bestandteile bilden den fachlichen Kern deiner Ausbildung.
              </p>
            </div>
            <div className="academy-structure-grid">
              <article className="academy-structure-card academy-structure-card--blue">
                <p className="academy-structure-label mb-1 text-xs font-semibold uppercase tracking-[0.12em]">Ausbildungsziel</p>
                <h3 className="academy-structure-title text-lg font-semibold">Lehrgänge</h3>
                <p className="academy-structure-copy mt-2 text-sm leading-relaxed">
                  Ein Lehrgang beschreibt ein übergeordnetes Ausbildungsziel und kann mehrere thematisch passende Kurse zusammenfassen.
                </p>
              </article>
              <article className="academy-structure-card academy-structure-card--teal">
                <p className="academy-structure-label mb-1 text-xs font-semibold uppercase tracking-[0.12em]">Lerneinheiten</p>
                <h3 className="academy-structure-title text-lg font-semibold">Kurse</h3>
                <p className="academy-structure-copy mt-2 text-sm leading-relaxed">
                  Ein Kurs behandelt ein bestimmtes Thema. Er kann Teil eines Lehrgangs sein oder unabhängig davon genutzt werden.
                </p>
              </article>
              <article className="academy-structure-card academy-structure-card--violet">
                <p className="academy-structure-label mb-1 text-xs font-semibold uppercase tracking-[0.12em]">Wissensgrundlage</p>
                <h3 className="academy-structure-title text-lg font-semibold">Lernbibliothek</h3>
                <p className="academy-structure-copy mt-2 text-sm leading-relaxed">
                  Hier liegen die Lernmaterialien. Du kannst sie aus einem Kurs heraus öffnen oder direkt zum Nachschlagen verwenden.
                </p>
              </article>
            </div>
          </div>

          <div className="academy-overview-notes grid gap-5 md:grid-cols-2">
            <div className="flex gap-3">
              <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#A33370]" />
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">Prüfungen geben Rückmeldung</h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Übungstests helfen dir, deinen Wissensstand einzuschätzen. Vorgesehene Kursabschlussprüfungen weisen nach, ob bestimmte Anforderungen erfüllt sind.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#287A45]" />
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">Notizen bleiben persönlich</h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  In deinen Notizen kannst du eigene Gedanken festhalten und Materialien als Lesezeichen speichern. Private Notizen sind nur für dich sichtbar.
                </p>
              </div>
            </div>
          </div>

          <p className="academy-overview-footnote text-xs leading-relaxed">
            Ein geöffnetes Material oder ein besuchter Kurs gilt nicht automatisch als abgeschlossen. Ein Abschluss wird nur erfasst, wenn die dafür festgelegten Bedingungen tatsächlich erfüllt sind.
          </p>
        </section>
      )}
      {activeTab === 'courses' && (
        <section className="space-y-5">
          {canAuthorCourses && (
            <div className="academy-course-mode-nav flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800" role="group" aria-label="Kursbereich">
              <button type="button" aria-pressed={courseAreaMode === 'learning'} onClick={() => setCourseAreaMode('learning')} className={`rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${courseAreaMode === 'learning' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}>Lernen</button>
              <button type="button" aria-pressed={courseAreaMode === 'management'} onClick={() => setCourseAreaMode('management')} className={`rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${courseAreaMode === 'management' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}>Kurse und Lehrgänge verwalten</button>
            </div>
          )}
          {courseAreaMode === 'management' && canAuthorCourses
            ? <AcademyAuthoringCenter currentUser={currentUser} onStatusToast={onStatusToast} />
            : <AcademyLearningCenter currentUser={currentUser} area="courses" onStatusToast={onStatusToast} />}
        </section>
      )}
      {activeTab === 'notes' && <AcademyLearningCenter currentUser={currentUser} area="notes" onStatusToast={onStatusToast} onUnsavedChangesChange={setHasUnsavedNoteChanges} />}

      {/* TAB 1: LEHRBÜCHER & LEHRMATERIALIEN */}
      {activeTab === 'modules' && (
        <div className="academy-library-area space-y-5">
          {canManageVersionedMaterials && (
            <div className="academy-library-mode-nav flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800" role="group" aria-label="Bibliotheksverwaltung">
              <button type="button" aria-pressed={libraryAreaMode === 'materials'} onClick={() => setLibraryAreaMode('materials')} className={`rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${libraryAreaMode === 'materials' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}>Materialien</button>
              {canAuthorCourses && (
                <>
                  <button type="button" aria-pressed={libraryAreaMode === 'categories'} onClick={() => setLibraryAreaMode('categories')} className={`rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${libraryAreaMode === 'categories' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}>Kategorien</button>
                  <button type="button" aria-pressed={libraryAreaMode === 'documentTypes'} onClick={() => setLibraryAreaMode('documentTypes')} className={`rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${libraryAreaMode === 'documentTypes' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}>Dokumenttypen</button>
                </>
              )}
              <button type="button" aria-pressed={libraryAreaMode === 'versionedMaterials'} onClick={() => setLibraryAreaMode('versionedMaterials')} className={`rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${libraryAreaMode === 'versionedMaterials' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}>Materialverwaltung</button>
            </div>
          )}
          {libraryAreaMode === 'categories' && canAuthorCourses ? (
            <AcademyMaterialCategoryManager onStatusToast={onStatusToast} />
          ) : libraryAreaMode === 'documentTypes' && canAuthorCourses ? (
            <AcademyMaterialDocumentTypeManager onStatusToast={onStatusToast} />
          ) : libraryAreaMode === 'versionedMaterials' && canManageVersionedMaterials ? (
            <AcademyMaterialManagementCenter currentUser={currentUser} onStatusToast={onStatusToast} />
          ) : (
          <div>
          {modules.length === 0 && versionedMaterials.length === 0 && !versionedMaterialsLoading && !versionedMaterialsError ? (
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
          ) : !currentModule && !activeVersionedMaterialId ? (
            <section aria-labelledby="academy-library-heading" className="academy-library-catalog space-y-5">
              <div className="academy-library-heading flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <h2 id="academy-library-heading" className="text-xl font-semibold text-slate-900 dark:text-white">Lernbibliothek</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Alle für dich zugänglichen veröffentlichten Materialien an einem Ort.</p>
                </div>
                {!versionedMaterialsLoading && (
                  <p role="status" aria-atomic="true" className="text-sm text-slate-500 dark:text-slate-400">
                    {versionedMaterialsError ? 'Ergebnisse unvollständig.' : filteredLibraryEntries.length + ' von ' + libraryEntries.length + ' Materialien'}
                  </p>
                )}
              </div>
              <p role="alert" className="sr-only">{versionedMaterialsError}</p>
              {versionedMaterialsLoading && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">Versionierte Materialien werden geladen …</p>}
              {versionedMaterialsError && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-rose-700 dark:text-rose-300">
                  <p>{versionedMaterialsError}</p>
                  {versionedMaterialsRetryable && (
                    <button type="button" className="academy-library-open-button" onClick={() => setVersionedMaterialsLoadAttempt(attempt => attempt + 1)} disabled={versionedMaterialsLoading}>
                      Erneut versuchen
                    </button>
                  )}
                </div>
              )}
              {!moduleSearchQuery.trim() && !moduleCategoryFilter && !moduleDocumentTypeFilter && libraryCategories.length > 0 && (
<section className="academy-library-topics space-y-3" aria-labelledby="academy-library-topics-heading">
<div className="flex flex-wrap items-end justify-between gap-2"><div><h3 id="academy-library-topics-heading" className="text-base font-semibold text-slate-900 dark:text-white">Themenbereiche</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Wähle einen Bereich, um die zugehörigen Materialien zu entdecken.</p></div><button type="button" className="academy-library-text-action" onClick={() => { setModuleCategoryFilter(''); setModuleDocumentTypeFilter(''); }}>Alle Materialien anzeigen</button></div>
<div className="academy-library-topic-grid">
{libraryCategories.map(category => { const count = libraryEntries.filter(entry => entry.category === category).length; return <button key={category} type="button" className="academy-library-topic-card" onClick={() => { setModuleCategoryFilter(category); setModuleDocumentTypeFilter(''); }}><span className="academy-library-topic-kicker">THEMENBEREICH</span><span className="academy-library-topic-title">{category}</span><span className="academy-library-topic-meta">{count} {count === 1 ? 'Material' : 'Materialien'}</span><span className="academy-library-topic-arrow" aria-hidden="true">Ansehen →</span></button>; })}
</div></section>
)}<div className="academy-library-toolbar grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3">
                <div className="academy-library-search">
                  <label htmlFor="academy-library-global-search" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bibliothek durchsuchen</label>
                  <input id="academy-library-global-search" type="search" value={moduleSearchQuery} onChange={event => setModuleSearchQuery(event.target.value)} placeholder="Titel, Materialcode, Thema oder Beschreibung" className="w-full px-3 py-2.5 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </div>
                <div className="academy-library-sort">
                  <label htmlFor="academy-library-sort" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sortieren</label>
                  <select id="academy-library-sort" value={moduleSortOrder} onChange={event => setModuleSortOrder(event.target.value as 'relevance' | 'alphabetical' | 'updated')} className="w-full sm:w-auto px-3 py-2.5 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                    <option value="relevance">Relevanz</option>
                    <option value="alphabetical">Alphabetisch</option>
                    <option value="updated">Zuletzt aktualisiert</option>
                  </select>
                </div>
              </div>
              <details className="academy-library-filters rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2">
                <summary className="cursor-pointer select-none text-sm font-medium text-slate-700 dark:text-slate-200">
                  Filter {hasActiveLibraryFilters ? '· aktiv' : ''}
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                  <div>
                    <label htmlFor="academy-library-category-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Kategorie</label>
                    <select id="academy-library-category-filter" value={moduleCategoryFilter} onChange={event => setModuleCategoryFilter(event.target.value)} className="w-full px-3 py-2 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                      <option value="">Alle Kategorien</option>
                      {libraryCategories.map(category => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="academy-library-document-type-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Dokumenttyp</label>
                    <select id="academy-library-document-type-filter" value={moduleDocumentTypeFilter} onChange={event => setModuleDocumentTypeFilter(event.target.value)} className="w-full px-3 py-2 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                      <option value="">Alle Dokumenttypen</option>
                      {libraryDocumentTypes.map(documentType => <option key={documentType} value={documentType}>{documentType}</option>)}
                    </select>
                  </div>
                </div>
              </details>
              {hasActiveLibraryFilters && (
                <div className="flex flex-wrap items-center gap-2" aria-label="Aktive Bibliotheksfilter">
                  {moduleCategoryFilter && (
                    <button type="button" onClick={() => setModuleCategoryFilter('')} className="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200">
                      Kategorie: {moduleCategoryFilter} <span aria-hidden="true">×</span><span className="sr-only"> entfernen</span>
                    </button>
                  )}
                  {moduleDocumentTypeFilter && (
                    <button type="button" onClick={() => setModuleDocumentTypeFilter('')} className="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200">
                      Dokumenttyp: {moduleDocumentTypeFilter} <span aria-hidden="true">×</span><span className="sr-only"> entfernen</span>
                    </button>
                  )}
                  <button type="button" onClick={clearLibraryFilters} className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-300">Alle Filter zurücksetzen</button>
                </div>
              )}
              {sortedLibraryEntries.length === 0 ? (
                versionedMaterialsLoading || versionedMaterialsError ? null : (
                  <p role="status" className="border border-slate-200 dark:border-slate-800 rounded-md p-5 text-sm text-slate-600 dark:text-slate-300">Keine Materialien entsprechen deiner Suche. Ändere den Suchbegriff, um weitere Ergebnisse zu finden.</p>
                )
              ) : (
                <div className="academy-library-results" aria-label="Bibliotheksmaterialien">
{sortedLibraryEntries.map(entry => <article key={entry.kind + ':' + entry.id} className="academy-library-material-card">
<div className="academy-library-material-card-content"><div className="academy-library-material-meta"><span>{entry.category}</span>{entry.documentTypeName && <><span aria-hidden="true">·</span><span>{entry.documentTypeName}</span></>}</div><h3 className="academy-library-material-title">{entry.title}</h3>{entry.description && <p className="academy-library-material-description">{entry.description}</p>}<p className="academy-library-material-code">{entry.code}</p></div>
<button type="button" onClick={() => { if (entry.kind === 'legacy') { setActiveVersionedMaterialId(null); setActiveModuleId(entry.id); setIsLibraryNavigationOpen(true); } else { openVersionedMaterial(entry.id); } }} className="academy-library-open-button">Material öffnen <span aria-hidden="true">→</span></button>
</article>)}
</div>
              )}
            </section>
          ) : (
            <div className={`academy-library-reader-layout grid grid-cols-1 ${isLibraryNavigationOpen ? 'lg:grid-cols-12' : ''} gap-6 items-start`}>
              {versionedMaterialsError && (
                <div className="col-span-full flex flex-wrap items-center gap-3 rounded-md border border-rose-200 p-3 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">
                  <p>{versionedMaterialsError}</p>
                  {versionedMaterialsRetryable && <button type="button" className="academy-library-open-button" onClick={() => setVersionedMaterialsLoadAttempt(attempt => attempt + 1)} disabled={versionedMaterialsLoading}>Erneut versuchen</button>}
                </div>
              )}
              {isLibraryNavigationOpen && (
                <aside id="academy-material-navigation" aria-label="Materialnavigation" className="academy-library-sidebar lg:col-span-4 border border-slate-300 dark:border-slate-700 rounded-md p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Materialien</h2>
                  <label htmlFor="academy-library-search" className="block text-xs font-medium text-slate-700 dark:text-slate-300">Materialien durchsuchen</label>
                  <input id="academy-library-search" type="search" value={moduleSearchQuery} onChange={event => setModuleSearchQuery(event.target.value)} placeholder="Titel, Kennung oder Thema" className="w-full px-3 py-2 text-sm rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                   <p role="status" aria-atomic="true" className="mt-1 text-xs text-slate-500 dark:text-slate-400">{versionedMaterialsLoading ? 'Materialien werden geladen …' : versionedMaterialsError ? 'Ergebnisse unvollständig.' : filteredLibraryEntries.length + (filteredLibraryEntries.length === 1 ? ' Material' : ' Materialien')}</p>
                  {filteredLibraryEntries.length === 0 ? (versionedMaterialsLoading || versionedMaterialsError ? null : <p className="text-xs text-slate-600 dark:text-slate-400 py-3">Keine passenden Materialien gefunden.</p>) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredLibraryEntries.map(entry => {
                        const isSelected = entry.kind === 'legacy'
                          ? currentModule?.id === entry.id
                          : activeVersionedMaterialId === entry.id;
                        return <button key={entry.kind + ':' + entry.id} type="button" onClick={() => {
                          if (entry.kind === 'legacy') {
                            setActiveVersionedMaterialId(null);
                            setActiveModuleId(entry.id);
                          } else {
                            openVersionedMaterial(entry.id);
                          }
                        }} aria-current={isSelected ? 'page' : undefined} className={`w-full text-left py-3 px-2 rounded-md ${isSelected ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                          <span className="block text-xs font-mono text-slate-500 dark:text-slate-400">{entry.code}</span>
                          <span className="block mt-1 text-sm font-semibold text-slate-900 dark:text-white">{entry.title}</span>
                          <span className="block mt-0.5 text-xs text-slate-600 dark:text-slate-400">{entry.category}{entry.documentTypeName ? ` · ${entry.documentTypeName}` : ''}</span>
                        </button>;
                      })}
                    </div>
                  )}
                </aside>
              )}
              {/* Right 8 Cols: Viewer */}
              <div className={isLibraryNavigationOpen ? 'lg:col-span-8' : 'w-full'}>
                <p role="alert" className="sr-only">{versionedMaterialsError}</p>
                <p role="alert" className="sr-only">{versionedMaterialError}</p>
                {activeVersionedMaterialId ? (
                  isVersionedMaterialLoading ? (
                    <p role="status" className="rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-sm text-slate-600 dark:text-slate-300">Material wird geladen …</p>
                  ) : displayedVersionedMaterial ? (
                    <article className="academy-library-reader bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
                      <div className="academy-library-reader-heading flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-sky-700 dark:text-sky-400 font-bold">
                            <span>{displayedVersionedMaterial.code}</span>
                            <span>·</span>
                            <span>{displayedVersionedMaterial.categoryName}</span>
                            <span>·</span>
                            <span>{displayedVersionedMaterial.documentTypeName}</span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{displayedVersionedMaterial.title}</h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Freigegeben ab: {displayedVersionedMaterial.requiredRole || 'Alle Ränge'} · Version {displayedVersionedMaterial.versionNumber}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button type="button" onClick={() => { setActiveVersionedMaterialId(null); setIsLibraryNavigationOpen(false); }} className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200">Zur Materialübersicht</button>
                          <button type="button" onClick={() => setIsLibraryNavigationOpen(open => !open)} aria-expanded={isLibraryNavigationOpen} className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200">
                            {isLibraryNavigationOpen ? 'Navigation ausblenden' : 'Materialnavigation anzeigen'}
                          </button>
                        </div>
                      </div>
                      {displayedVersionedMaterial.description && <p className="text-sm text-slate-600 dark:text-slate-300">{displayedVersionedMaterial.description}</p>}
                      {displayedVersionedMaterial.contentFormat === 'markdown'
                        ? (
                          <div ref={versionedMaterialMarkdownRef} onMouseUp={event => captureVersionedMaterialAnchor(event, 'markdown')}>
                            {renderVersionedMaterialMarkdown(displayedVersionedMaterial.content)}
                          </div>
                        )
                        : (
                          <div className="space-y-2">
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">QUELLCODE · WIRD NICHT AUSGEFÜHRT</p>
                            <pre ref={versionedMaterialCodeRef} onMouseUp={event => captureVersionedMaterialAnchor(event, 'code')} className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-800 dark:text-slate-100"><code>{displayedVersionedMaterial.content}</code></pre>
                          </div>
                        )}
                      <AcademyMaterialReaderNotes
                        materialId={displayedVersionedMaterial.id}
                        materialVersionId={displayedVersionedMaterial.versionId}
                        selectedAnchor={selectedVersionedMaterialAnchor}
                        onJumpToAnchor={jumpToVersionedMaterialAnchor}
                      />
                      <p className="border-t border-slate-200 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400">Veröffentlicht am {new Date(displayedVersionedMaterial.publishedIso).toLocaleString('de-DE')}</p>
                    </article>
                  ) : (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-8 space-y-3">
                      <p className="text-sm text-slate-600 dark:text-slate-300">{versionedMaterialError || 'Dieses Material ist nicht mehr verfügbar oder dein Rang reicht nicht für den Zugriff aus.'}</p>
                      {versionedMaterialRetryable && (
                        <button type="button" onClick={() => setVersionedMaterialLoadAttempt(attempt => attempt + 1)} disabled={versionedMaterialLoading} className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
                          Erneut versuchen
                        </button>
                      )}
                      <button type="button" onClick={() => { setActiveVersionedMaterialId(null); setIsLibraryNavigationOpen(false); }} className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200">Zur Materialübersicht</button>
                    </div>
                  )
                ) : currentModule && (
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
                  <article className="academy-library-reader bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
                    <div className="academy-library-reader-heading flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
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
                        <button type="button" onClick={() => { setActiveModuleId(null); setIsLibraryNavigationOpen(false); }} className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200">Zur Materialübersicht</button>
                        <button type="button" onClick={() => setIsLibraryNavigationOpen(open => !open)} aria-expanded={isLibraryNavigationOpen} className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200">
                          {isLibraryNavigationOpen ? 'Materialnavigation ausblenden' : 'Materialnavigation anzeigen'}
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
        </div>
      )}

      {activeTab === 'exam_center' && <ExamParticipantRunner />}
      {activeTab === 'exam_corrections' && (currentUser.role === 'admin' || currentUser.role === 'colonel') && <ExamCorrectionCenter canReleaseResults={currentUser.role === 'admin'} />}
      {activeTab === 'exam_reviews' && canEditAcademy && <ExamReviewCenter currentUser={currentUser} roster={roster} initialAttemptId={initialReviewAttemptId} />}

      {/* TAB 2 & 3: ÜBUNGSTESTS (TRAINEE+) & KURSABSCHLUSSPRÜFUNGEN (ROOKIE+) */}
      {(activeTab === 'tests' || activeTab === 'final_exams') && (
        <div>
          {activeTab === 'final_exams' && !canAccessFinalExams ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-10 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
                <Lock className="w-4 h-4" /> ZUGRIFF AUF KURSABSCHLUSSPRÜFUNGEN GESPERRT (RANG TRAINEE)
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Abschlussarbeiten und Kursabschlussprüfungen sind erst ab dem Rang „Rookie“ freigeschaltet
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
                  Noch keine {activeTab === 'final_exams' ? 'Kursabschlussprüfungen' : 'Übungstests'} hinterlegt
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
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setActiveExamId(ex.id);
                        setExamAnswers({});
                        setExamSubmittedResult(null);
                        setExamExplanations({});
                      }}
                      aria-pressed={isSelected}
                      className={`academy-legacy-exam-option w-full text-left py-3.5 px-3 rounded-md transition-colors ${
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
                        {ex.assessmentStage === 'final_exam' ? 'Kursabschlussprüfung (Rookie+)' : 'Übungstest (Trainee+)'}
                      </div>
                    </button>
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
                            ? 'Offizielle Kursabschlussprüfung (Rookie+)'
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


      </div>
    </div>
  );
};
