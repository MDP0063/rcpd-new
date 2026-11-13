import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  GraduationCap
} from 'lucide-react';
import {
  AcademyExamDoc,
  ROLE_HIERARCHY,
  TrainingModuleDoc,
  UserProgressDoc,
  UserPublicProfile
} from '../types/portal';

interface ProfessionalDevelopmentModuleProps {
  currentUser: UserPublicProfile;
  modules: TrainingModuleDoc[];
  exams: AcademyExamDoc[];
  userProgress: UserProgressDoc[];
  onNavigateAcademy: () => void;
}

type ChartFilterMode = 'all' | 'modules' | 'exams';

interface ChartDataItem {
  id: string;
  code: string;
  title: string;
  kind: 'module' | 'test' | 'final_exam';
  kindLabel: string;
  categoryOrStage: string;
  scorePercent: number;
  passingThreshold: number;
  status: 'completed' | 'passed' | 'failed' | 'in_progress' | 'not_started';
  statusLabel: string;
  attempts: number;
  estimatedMinutes?: number;
  evaluatedByName?: string;
  instructorFeedback?: string;
  updatedIso?: string;
  lockedForRole: boolean;
}

export const ProfessionalDevelopmentModule: React.FC<ProfessionalDevelopmentModuleProps> = ({
  currentUser,
  modules,
  exams,
  userProgress,
  onNavigateAcademy
}) => {
  const [filterMode, setFilterMode] = useState<ChartFilterMode>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const roleMeta = ROLE_HIERARCHY[currentUser.role] || ROLE_HIERARCHY.trainee;
  const canAccessFinalExams = roleMeta.canAccessFinalExams;

  const myProgressMap = useMemo(() => {
    const map = new Map<string, UserProgressDoc>();
    for (const entry of userProgress) {
      if (entry.userId === currentUser.uid) {
        map.set(entry.targetId, entry);
      }
    }
    return map;
  }, [userProgress, currentUser.uid]);

  // Build unified graphical chart dataset from assigned training modules and exams
  const chartItems: ChartDataItem[] = useMemo(() => {
    const moduleItems: ChartDataItem[] = modules.map(mod => {
      const prog = myProgressMap.get(mod.id);
      const isCompleted = prog?.status === 'completed' || prog?.status === 'passed';
      const scorePercent = isCompleted ? 100 : prog ? Math.max(25, prog.scorePercent || 0) : 0;

      return {
        id: mod.id,
        code: mod.code,
        title: mod.title,
        kind: 'module',
        kindLabel: 'Lehrbuch / Modul',
        categoryOrStage: mod.category,
        scorePercent,
        passingThreshold: 100,
        status: isCompleted ? 'completed' : prog ? 'in_progress' : 'not_started',
        statusLabel: isCompleted
          ? 'Abgeschlossen'
          : prog
            ? 'In Bearbeitung'
            : 'Ausstehend',
        attempts: prog?.attempts || 0,
        estimatedMinutes: mod.estimatedMinutes,
        evaluatedByName: prog?.evaluatedByName,
        instructorFeedback: prog?.instructorFeedback,
        updatedIso: prog?.updatedIso || mod.updatedIso,
        lockedForRole: false
      };
    });

    const examItems: ChartDataItem[] = exams.map(ex => {
      const prog = myProgressMap.get(ex.id);
      const isFinalExam = ex.assessmentStage === 'final_exam';
      const lockedForRole = isFinalExam && !canAccessFinalExams;

      let status: ChartDataItem['status'] = 'not_started';
      let statusLabel = 'Offen';
      if (prog) {
        if (prog.status === 'passed' || prog.status === 'completed') {
          status = 'passed';
          statusLabel = 'Bestanden';
        } else if (prog.status === 'failed') {
          status = 'failed';
          statusLabel = 'Nicht bestanden';
        } else {
          status = 'in_progress';
          statusLabel = 'In Bearbeitung';
        }
      } else if (lockedForRole) {
        statusLabel = 'Freigabe ab Rookie';
      }

      return {
        id: ex.id,
        code: ex.moduleCode,
        title: ex.title,
        kind: ex.assessmentStage,
        kindLabel: isFinalExam ? 'Kursabschlussprüfung' : 'Übungstest',
        categoryOrStage: isFinalExam ? 'POST Zertifizierung' : 'Leistungsnachweis',
        scorePercent: prog ? Math.min(100, Math.max(0, prog.scorePercent)) : 0,
        passingThreshold: ex.passingScore,
        status,
        statusLabel,
        attempts: prog?.attempts || 0,
        estimatedMinutes: ex.timeLimitMinutes,
        evaluatedByName: prog?.evaluatedByName,
        instructorFeedback: prog?.instructorFeedback,
        updatedIso: prog?.updatedIso || ex.updatedIso,
        lockedForRole
      };
    });

    return [...moduleItems, ...examItems];
  }, [modules, exams, myProgressMap, canAccessFinalExams]);

  const filteredChartItems = useMemo(() => {
    if (filterMode === 'modules') {
      return chartItems.filter(item => item.kind === 'module');
    }
    if (filterMode === 'exams') {
      return chartItems.filter(item => item.kind === 'test' || item.kind === 'final_exam');
    }
    return chartItems;
  }, [chartItems, filterMode]);

  // Summary statistics for radial SVG chart & telemetry
  const summaryStats = useMemo(() => {
    const totalModules = modules.length;
    const completedModules = chartItems.filter(
      i => i.kind === 'module' && i.status === 'completed'
    ).length;
    const moduleCompletionRate =
      totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    const accessibleExams = chartItems.filter(
      i => (i.kind === 'test' || i.kind === 'final_exam') && !i.lockedForRole
    );
    const passedExams = accessibleExams.filter(i => i.status === 'passed').length;
    const examCompletionRate =
      accessibleExams.length > 0
        ? Math.round((passedExams / accessibleExams.length) * 100)
        : 0;

    const attemptedExams = chartItems.filter(
      i => (i.kind === 'test' || i.kind === 'final_exam') && i.attempts > 0
    );
    const avgExamScore =
      attemptedExams.length > 0
        ? Math.round(
            attemptedExams.reduce((acc, item) => acc + item.scorePercent, 0) /
              attemptedExams.length
          )
        : 0;

    const totalAttempts = chartItems.reduce((acc, item) => acc + item.attempts, 0);

    const completedStudyMinutes = chartItems
      .filter(i => i.status === 'completed' || i.status === 'passed')
      .reduce((acc, item) => acc + (item.estimatedMinutes || 20), 0);

    const overallDevelopmentIndex = Math.round(
      moduleCompletionRate * 0.5 + examCompletionRate * 0.5
    );

    return {
      totalModules,
      completedModules,
      moduleCompletionRate,
      totalAccessibleExams: accessibleExams.length,
      passedExams,
      examCompletionRate,
      avgExamScore,
      totalAttempts,
      completedStudyMinutes,
      overallDevelopmentIndex
    };
  }, [modules.length, chartItems]);

  const activeSelectedItem = useMemo(() => {
    if (selectedItemId) {
      const found = filteredChartItems.find(i => i.id === selectedItemId);
      if (found) return found;
    }
    return filteredChartItems[0] || null;
  }, [filteredChartItems, selectedItemId]);

  // SVG Radial Gauge geometry
  const outerRadius = 68;
  const innerRadius = 50;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const outerStrokeDashoffset =
    outerCircumference - (summaryStats.moduleCompletionRate / 100) * outerCircumference;
  const innerStrokeDashoffset =
    innerCircumference - (summaryStats.examCompletionRate / 100) * innerCircumference;

  return (
    <section
      aria-label="Professional Development"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs transition-colors"
    >
      {/* Top Anthracite Institutional Header */}
      <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white border-b border-transparent dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="text-xs text-slate-300">
              Ausbildungs- und Prüfungsübersicht
            </div>
            <h2 className="text-base font-bold tracking-tight text-white mt-0.5">
              Berufliche Weiterentwicklung &amp; Leistungsdiagramm
            </h2>
          </div>
        </div>

        {/* Interactive Filter Segmented Control (Functional Buttons) */}
        <div className="flex items-center gap-1 p-1 bg-slate-800 dark:bg-slate-900 rounded-lg border border-slate-700 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Alle ({chartItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('modules')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterMode === 'modules'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Lehrbücher ({modules.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('exams')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterMode === 'exams'
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Prüfungen ({exams.length})
          </button>
        </div>
      </div>

      {/* Main Content Grid: Left Dual-Ring SVG Chart + Right Comparative Bar Chart */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 4 Columns: Multi-Ring SVG Radial Chart & Core Telemetry */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-6 lg:border-r lg:border-slate-200 dark:lg:border-slate-800 lg:pr-6">
          <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-6">
            {/* Dual Concentric SVG Progress Chart */}
            <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
              <svg
                className="w-44 h-44 -rotate-90 transform"
                viewBox="0 0 160 160"
                role="img"
                aria-label={`Gesamtfortschritt ${summaryStats.overallDevelopmentIndex} Prozent`}
              >
                {/* Outer Track (Modules) */}
                <circle
                  cx="80"
                  cy="80"
                  r={outerRadius}
                  fill="transparent"
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="10"
                />
                {/* Outer Progress Ring (Sky Blue - Modules) */}
                <circle
                  cx="80"
                  cy="80"
                  r={outerRadius}
                  fill="transparent"
                  stroke="#0284c7"
                  strokeWidth="10"
                  strokeDasharray={outerCircumference}
                  strokeDashoffset={outerStrokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />

                {/* Inner Track (Exams) */}
                <circle
                  cx="80"
                  cy="80"
                  r={innerRadius}
                  fill="transparent"
                  className="stroke-slate-100 dark:stroke-slate-800/70"
                  strokeWidth="10"
                />
                {/* Inner Progress Ring (Emerald - Exams) */}
                <circle
                  cx="80"
                  cy="80"
                  r={innerRadius}
                  fill="transparent"
                  stroke="#059669"
                  strokeWidth="10"
                  strokeDasharray={innerCircumference}
                  strokeDashoffset={innerStrokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>

              {/* Center Metric Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-mono text-slate-400">GESAMTINDEX</span>
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {summaryStats.overallDevelopmentIndex}%
                </span>
                <span className="text-[11px] font-mono text-sky-700 dark:text-sky-400 font-semibold">
                  {currentUser.role.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Ring Legend & Breakdown */}
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-sky-600 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Lehrmodule (Außenring)
                  </span>
                </div>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {summaryStats.completedModules}/{summaryStats.totalModules} (
                  {summaryStats.moduleCompletionRate}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Prüfungen (Innenring)
                  </span>
                </div>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {summaryStats.passedExams}/{summaryStats.totalAccessibleExams} (
                  {summaryStats.examCompletionRate}%)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border border-transparent dark:border-slate-800 rounded-md">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Ø PRÜFUNG
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {summaryStats.avgExamScore}%
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border border-transparent dark:border-slate-800 rounded-md">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    VERSUCHE
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {summaryStats.totalAttempts}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border border-transparent dark:border-slate-800 rounded-md">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    LERNZEIT
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {summaryStats.completedStudyMinutes}m
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateAcademy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white rounded-md transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400 dark:text-white" />
            Ausbildungszentrum &amp; Prüfungen öffnen
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 dark:text-sky-100" />
          </button>
        </div>

        {/* Right 8 Columns: Graphical Score & Completion Chart Across All Modules & Exams */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <BarChart3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>MODUL- &amp; PRÜFUNGSVERLAUF</span>
                <span aria-hidden="true">·</span>
                <span>KLICK AUF BALKEN FÜR DETAILS</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                Grafische Auswertung aller zugewiesenen Lehrmodule und Prüfungen
              </h3>
            </div>

            {/* Clean inline legend */}
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-600 inline-block" />
                Lehrmodul
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                Bestanden
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                Nicht bestanden
              </span>
            </div>
          </div>

          {/* Graphical Vertical SVG Column Chart */}
          {filteredChartItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 rounded-md">
              Keine Einträge für diesen Filter vorhanden.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Interactive Vertical Column Chart Area */}
              <div className="pt-4 pb-2 px-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg">
                <div className="relative h-44 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-300 dark:border-slate-700">
                  {/* Horizontal Reference Grid Lines (100%, 75%, 50%, 25%) */}
                  {[100, 75, 50, 25].map(pct => (
                    <div
                      key={pct}
                      className="absolute left-0 right-0 border-t border-dashed border-slate-200 dark:border-slate-800 pointer-events-none flex items-center"
                      style={{ bottom: `${pct}%` }}
                    >
                      <span className="text-[9px] font-mono tabular-nums text-slate-400 bg-slate-50/90 dark:bg-slate-950/90 pr-1 -mt-2">
                        {pct}%
                      </span>
                    </div>
                  ))}

                  {/* Bars for each module / exam */}
                  {filteredChartItems.map(item => {
                    const isSelected = activeSelectedItem?.id === item.id;
                    const barHeightPercent = Math.max(6, item.scorePercent);

                    let barColorClass =
                      'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600';
                    if (item.status === 'completed') {
                      barColorClass = 'bg-sky-600 hover:bg-sky-500';
                    } else if (item.status === 'passed') {
                      barColorClass = 'bg-emerald-600 hover:bg-emerald-500';
                    } else if (item.status === 'failed') {
                      barColorClass = 'bg-rose-500 hover:bg-rose-400';
                    } else if (item.status === 'in_progress') {
                      barColorClass = 'bg-amber-500 hover:bg-amber-400';
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        className={`relative z-10 flex-1 h-full flex flex-col justify-end items-center group cursor-pointer focus:outline-none ${
                          isSelected ? 'opacity-100' : 'opacity-85 hover:opacity-100'
                        }`}
                        title={`${item.code}: ${item.title} (${item.scorePercent}%)`}
                      >
                        {/* Value label above bar */}
                        <span
                          className={`text-[10px] font-mono tabular-nums mb-1 transition-colors ${
                            isSelected
                              ? 'font-bold text-slate-900 dark:text-white'
                              : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                          }`}
                        >
                          {item.scorePercent}%
                        </span>

                        {/* Bar Column */}
                        <div className="w-full max-w-[44px] h-full flex items-end justify-center relative">
                          {/* Passing score threshold tick for exams */}
                          {(item.kind === 'test' || item.kind === 'final_exam') && (
                            <div
                              className="w-full border-t-2 border-slate-900/50 dark:border-white/50 absolute left-0 right-0 z-20 pointer-events-none"
                              style={{ bottom: `${item.passingThreshold}%` }}
                              title={`Mindestpunktzahl: ${item.passingThreshold}%`}
                            />
                          )}

                          <div
                            className={`w-full rounded-t transition-all duration-300 ${barColorClass} ${
                              isSelected
                                ? 'ring-2 ring-slate-900 dark:ring-sky-400 ring-offset-1 dark:ring-offset-slate-950'
                                : ''
                            }`}
                            style={{ height: `${barHeightPercent}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* X-Axis Course/Exam Codes */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  {filteredChartItems.map(item => {
                    const isSelected = activeSelectedItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        className={`flex-1 text-center truncate text-[10px] font-mono cursor-pointer transition-colors ${
                          isSelected
                            ? 'font-bold text-sky-700 dark:text-sky-400 underline underline-offset-4'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {item.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Bar Detailed Inspection Panel */}
              {activeSelectedItem && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {activeSelectedItem.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeSelectedItem.kindLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeSelectedItem.categoryOrStage}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          activeSelectedItem.status === 'completed' ||
                          activeSelectedItem.status === 'passed'
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : activeSelectedItem.status === 'failed'
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 font-semibold'
                        }
                      >
                        Status: {activeSelectedItem.statusLabel}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {activeSelectedItem.title}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-mono flex-wrap">
                      <span>
                        Ergebnis:{' '}
                        <strong className="text-slate-900 dark:text-white tabular-nums">
                          {activeSelectedItem.scorePercent}%
                        </strong>
                      </span>
                      {(activeSelectedItem.kind === 'test' ||
                        activeSelectedItem.kind === 'final_exam') && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            Bestehensgrenze:{' '}
                            <strong className="text-slate-900 dark:text-white tabular-nums">
                              {activeSelectedItem.passingThreshold}%
                            </strong>
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>
                        Versuche:{' '}
                        <strong className="text-slate-900 dark:text-white tabular-nums">
                          {activeSelectedItem.attempts}
                        </strong>
                      </span>
                      {activeSelectedItem.evaluatedByName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-700 dark:text-sky-400">
                            Bewertet durch: {activeSelectedItem.evaluatedByName}
                          </span>
                        </>
                      )}
                    </div>

                    {activeSelectedItem.instructorFeedback && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                        Ausbilder-Notiz: „{activeSelectedItem.instructorFeedback}“
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeSelectedItem.status === 'completed' ||
                    activeSelectedItem.status === 'passed' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Qualifiziert
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        {activeSelectedItem.statusLabel}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={onNavigateAcademy}
                      className="px-3.5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors cursor-pointer"
                    >
                      {activeSelectedItem.kind === 'module'
                        ? 'Modul öffnen'
                        : 'Prüfung öffnen'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
