import React, { useCallback, useEffect, useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  FileCheck,
  BookOpen,
  Users,
  GitBranch,
  LogIn,
  CheckCircle2,
  Award,
  ArrowRight,
  Lock,
  KeyRound,
  Building2,
  FileUp,
  Code2
} from 'lucide-react';
import {
  AcademyExamDoc,
  AdminAccountView,
  PortalDbStats,
  PortalDeploymentConfig,
  ROLE_HIERARCHY,
  TrainingModuleDoc,
  UserProgressDoc,
  UserPublicProfile,
  WhitelistApplicationDoc
} from './types/portal';
import { WhitelistPortal } from './components/WhitelistPortal';
import { AcademyCenter } from './components/AcademyCenter';
import { AdminPersonnelConsole } from './components/AdminPersonnelConsole';
import { DeploymentPipelineHub } from './components/DeploymentPipelineHub';
import { API_ENDPOINTS, apiFetch } from './lib/api';

type ActiveSection = 'dashboard' | 'academy' | 'whitelist' | 'personnel' | 'deployment';

const SESSION_STORAGE_KEY = 'ca_post_officer_session_uid_v3';

export default function App() {
  const [sessionUid, setSessionUid] = useState<string | null>(() =>
    localStorage.getItem(SESSION_STORAGE_KEY)
  );
  const [currentUserProfile, setCurrentUserProfile] = useState<UserPublicProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Login Form State (Strictly Admin-created accounts; default Admin1 / 1234)
  const [loginUsername, setLoginUsername] = useState('Admin1');
  const [loginPassword, setLoginPassword] = useState('1234');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Portal Database State
  const [roster, setRoster] = useState<UserPublicProfile[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccountView[]>([]);
  const [applications, setApplications] = useState<WhitelistApplicationDoc[]>([]);
  const [modules, setModules] = useState<TrainingModuleDoc[]>([]);
  const [exams, setExams] = useState<AcademyExamDoc[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgressDoc[]>([]);
  const [deploymentConfig, setDeploymentConfig] = useState<PortalDeploymentConfig | undefined>(
    undefined
  );
  const [dbStats, setDbStats] = useState<PortalDbStats | undefined>(undefined);

  const triggerToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 4500);
  };

  const fetchPortalState = useCallback(
    async (uidToLoad?: string | null) => {
      const targetUid = uidToLoad ?? sessionUid;
      if (!targetUid) return;

      const res = await apiFetch<{
        currentUser: UserPublicProfile;
        isAdmin: boolean;
        roster: UserPublicProfile[];
        adminAccounts: AdminAccountView[];
        applications: WhitelistApplicationDoc[];
        modules: TrainingModuleDoc[];
        exams: AcademyExamDoc[];
        progress: UserProgressDoc[];
        deploymentConfig?: PortalDeploymentConfig;
        dbStats?: PortalDbStats;
      }>(`${API_ENDPOINTS.PORTAL_STATE}?uid=${encodeURIComponent(targetUid)}`);

      if (!res.ok || !res.data) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          setSessionUid(null);
          setCurrentUserProfile(null);
          setIsAdmin(false);
          if (res.error) {
            setAuthError(res.error);
          }
        }
        return;
      }

      const data = res.data;
      setCurrentUserProfile(data.currentUser);
      setIsAdmin(Boolean(data.isAdmin));
      setRoster(data.roster || []);
      setAdminAccounts(data.adminAccounts || []);
      setApplications(data.applications || []);
      setModules(data.modules || []);
      setExams(data.exams || []);
      setUserProgress(data.progress || []);
      setDeploymentConfig(data.deploymentConfig);
      setDbStats(data.dbStats);
    },
    [sessionUid]
  );

  // Initial load + 10-second real-time heartbeat polling for online/offline status & live account updates
  useEffect(() => {
    if (!sessionUid) return;
    fetchPortalState(sessionUid);
    const interval = setInterval(() => {
      fetchPortalState(sessionUid);
    }, 10000);
    return () => clearInterval(interval);
  }, [sessionUid, fetchPortalState]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    const res = await apiFetch<{ user: UserPublicProfile; isAdmin: boolean }>(
      API_ENDPOINTS.AUTH_LOGIN,
      {
        method: 'POST',
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword
        })
      }
    );

    setAuthLoading(false);

    if (!res.ok || !res.data) {
      setAuthError(res.error || 'Anmeldung fehlgeschlagen.');
      return;
    }

    const loggedInUser = res.data.user;
    localStorage.setItem(SESSION_STORAGE_KEY, loggedInUser.uid);
    setSessionUid(loggedInUser.uid);
    setCurrentUserProfile(loggedInUser);
    setIsAdmin(Boolean(res.data.isAdmin));
    setActiveSection('dashboard');
    await fetchPortalState(loggedInUser.uid);
    triggerToast(`Angemeldet als ${loggedInUser.displayName} (Rang: ${loggedInUser.role.toUpperCase()}).`);
  };

  const handleSignOut = async () => {
    if (sessionUid) {
      await apiFetch(API_ENDPOINTS.AUTH_LOGOUT, {
        method: 'POST',
        body: JSON.stringify({ uid: sessionUid })
      });
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionUid(null);
    setCurrentUserProfile(null);
    setIsAdmin(false);
    setActiveSection('dashboard');
    triggerToast('Du wurdest erfolgreich abgemeldet.');
  };

  // ============================================================================
  // 1. CLEAN WHITE, ANTHRACITE & SKY-BLUE LOGIN WINDOW (NO SELF-REGISTRATION)
  // ============================================================================
  if (!sessionUid || !currentUserProfile) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        {/* Top Institutional Bar (Anthracite) */}
        <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <Shield className="w-5 h-5 text-sky-400" />
            <span className="text-sm font-bold tracking-tight">
              STATE OF CALIFORNIA · DEPARTMENT OF JUSTICE &amp; POST
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs font-mono text-slate-400">
            <span>OFFICIAL OFFICER &amp; ACADEMY PORTAL</span>
            <span>·</span>
            <span>AUTHORIZED ACCESS ONLY</span>
          </div>

          <div className="text-xs font-mono text-sky-400 font-semibold whitespace-nowrap shrink-0">
            CA-POST INTRANET
          </div>
        </header>

        {/* Centered Clean White & Anthracite Login Card */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
            {/* Left 5 Columns: Anthracite Institutional Panel */}
            <div className="lg:col-span-5 bg-slate-900 text-white p-8 flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <div className="w-11 h-11 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-sky-400" />
                </div>

                <div>
                  <div className="text-xs font-mono text-sky-400 font-semibold">
                    CALIFORNIA POST // OFFICER PORTAL
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                    Dienst- &amp; Ausbildungsportal
                  </h1>
                  <p className="text-xs text-slate-300 leading-relaxed mt-3">
                    Zentrale Plattform für Lehrbücher, interaktive Prüfungen, Personalbögen und Dienstverwaltung. Neue Benutzerkonten werden ausschließlich durch den Administrator vergeben und starten standardmäßig im Rang <strong>Trainee</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-5 border-t border-slate-800 text-xs font-mono">
                <div className="text-slate-400">SYSTEM-RANGORDNUNG:</div>
                <div className="text-slate-200 space-y-1 text-[11px]">
                  <div>1. ADMIN — Vollzugriff &amp; Kontenverwaltung</div>
                  <div>2. COLONEL — Lehrmaterial &amp; Prüfungen verwalten</div>
                  <div>3. OFFICER — Vollzugsdienst &amp; alle Prüfungen</div>
                  <div>4. ROOKIE — Lehrmaterial, Tests &amp; Abschlussarbeit</div>
                  <div>5. TRAINEE — Lehrmaterial &amp; Übungstests</div>
                </div>
              </div>
            </div>

            {/* Right 7 Columns: Clean White Login Form */}
            <div className="lg:col-span-7 p-8 bg-white flex flex-col justify-between">
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <div className="text-xs font-mono text-sky-600 font-semibold">
                    DIENSTANMELDUNG // CREDENTIAL AUTHENTICATION
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    Mit Benutzername und Passwort anmelden
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Standard-Administrator-Zugang: <code className="font-mono text-slate-800 font-semibold">Admin1</code> / Passwort: <code className="font-mono text-slate-800 font-semibold">1234</code>
                  </p>
                </div>

                {authError && (
                  <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-xs font-mono text-rose-700">
                    {authError}
                  </div>
                )}

                {statusToast && (
                  <div className="p-3.5 rounded-md bg-sky-50 border border-sky-200 text-xs font-mono text-sky-800">
                    {statusToast}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Benutzername (User)
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={loginUsername}
                      onChange={e => setLoginUsername(e.target.value)}
                      placeholder="Admin1"
                      className="w-full px-3.5 py-2.5 text-sm font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Passwort
                    </label>
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••"
                      className="w-full px-3.5 py-2.5 text-sm font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <LogIn className="w-4 h-4" />
                      {authLoading ? 'Anmeldung wird geprüft...' : 'Am Portal anmelden'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200 text-[11px] font-mono text-slate-500 flex items-center justify-between">
                <span>Kontenvergabe ausschließlich durch den Administrator</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginUsername('Admin1');
                    setLoginPassword('1234');
                    setAuthError(null);
                  }}
                  className="text-sky-600 hover:underline cursor-pointer font-semibold"
                >
                  Standard-Admin eintragen
                </button>
              </div>
            </div>
          </div>
        </main>

        <footer className="px-6 py-3 bg-white border-t border-slate-200 text-center text-xs font-mono text-slate-500">
          State of California Department of Justice · Commission on Peace Officer Standards and Training
        </footer>
      </div>
    );
  }

  // ============================================================================
  // 2. AUTHENTICATED PORTAL (CLEAN WHITE + ANTHRACITE + SKY BLUE ACCENTS)
  // ============================================================================
  const currentRoleMeta = ROLE_HIERARCHY[currentUserProfile.role] || ROLE_HIERARCHY.trainee;
  const canEditAcademy = currentRoleMeta.canEditAcademy; // Admin & Colonel
  const canManageUsers = currentRoleMeta.canManageUsers; // Strictly Admin ONLY
  const canViewTech = currentRoleMeta.canViewTechPipeline; // Strictly Admin ONLY

  const myProgress = userProgress.filter(p => p.userId === currentUserProfile.uid);
  const completedModulesCount = myProgress.filter(
    p => p.targetType === 'module' && p.status === 'completed'
  ).length;
  const passedExamsCount = myProgress.filter(
    p => (p.targetType === 'test' || p.targetType === 'final_exam') && p.status === 'passed'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract (Anthracite Header with Sky Blue Accents) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={e => {
            e.preventDefault();
            setActiveSection('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          CA-POST Officer Portal
        </a>

        {/* Zone 2: Role-filtered single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => setActiveSection('dashboard')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'dashboard'
                ? 'text-sky-400 underline underline-offset-8 font-semibold'
                : ''
            }`}
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('academy')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'academy'
                ? 'text-sky-400 underline underline-offset-8 font-semibold'
                : ''
            }`}
          >
            Lehrmaterial &amp; Prüfungen
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('whitelist')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'whitelist'
                ? 'text-sky-400 underline underline-offset-8 font-semibold'
                : ''
            }`}
          >
            Personalbogen
          </button>

          {/* STRICTLY ADMIN ONLY: User & Role Management */}
          {canManageUsers && (
            <button
              type="button"
              onClick={() => setActiveSection('personnel')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === 'personnel'
                  ? 'text-sky-400 underline underline-offset-8 font-semibold'
                  : ''
              }`}
            >
              Admin: Konten &amp; Ränge
            </button>
          )}

          {/* STRICTLY ADMIN ONLY: Technical GitHub & Render Pipeline */}
          {canViewTech && (
            <button
              type="button"
              onClick={() => setActiveSection('deployment')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === 'deployment'
                  ? 'text-sky-400 underline underline-offset-8 font-semibold'
                  : ''
              }`}
            >
              Technik &amp; CI/CD
            </button>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSignOut}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Abmelden ({currentUserProfile.username})
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Anthracite Left Command Sidebar */}
        <aside className="w-64 shrink-0 bg-slate-900 text-slate-200 border-r border-slate-800 p-5 hidden lg:flex flex-col justify-between">
          <div className="space-y-6">
            {/* Officer Identity Box */}
            <div className="pb-5 border-b border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-sky-400">
                <span>{currentUserProfile.badgeNumber}</span>
                <span>{currentUserProfile.callsign}</span>
              </div>
              <div className="text-base font-bold text-white truncate">
                {currentUserProfile.displayName}
              </div>
              <div className="text-xs text-slate-400">{currentUserProfile.rank}</div>
              <div className="pt-2 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">RANG:</span>
                <span className="uppercase text-sky-400 font-semibold">
                  {currentUserProfile.role}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">STATUS:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveSection('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeSection === 'dashboard'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Officer Dashboard
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('academy')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeSection === 'academy'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Lehrmaterial &amp; Prüfungen
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('whitelist')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeSection === 'whitelist'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                Personalbogen &amp; Akte
              </button>

              {/* Strictly Admin Only */}
              {canManageUsers && (
                <button
                  type="button"
                  onClick={() => setActiveSection('personnel')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSection === 'personnel'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-sky-400 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Admin: Konten &amp; Ränge
                </button>
              )}

              {/* Strictly Admin Only */}
              {canViewTech && (
                <button
                  type="button"
                  onClick={() => setActiveSection('deployment')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSection === 'deployment'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <GitBranch className="w-4 h-4" />
                  Technik &amp; Render CI/CD
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-400 leading-relaxed">
            <div>BERECHTIGUNGSSTUFE:</div>
            <div className="text-slate-200 mt-0.5">{currentRoleMeta.label}</div>
          </div>
        </aside>

        {/* Main White Content Viewport */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          {statusToast && (
            <div className="p-3.5 rounded-lg bg-sky-50 border border-sky-200 text-xs font-mono text-sky-900 flex items-center justify-between shadow-xs">
              <span>{statusToast}</span>
              <button
                type="button"
                onClick={() => setStatusToast(null)}
                className="text-sky-700 hover:underline font-semibold cursor-pointer"
              >
                [Schließen]
              </button>
            </div>
          )}

          {/* VIEW 1: OFFICER DASHBOARD */}
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <div className="text-xs font-mono text-sky-600 font-semibold">
                    CALIFORNIA DEPARTMENT OF JUSTICE &amp; POST // DIENST-DASHBOARD
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                    Willkommen im Dienst, {currentUserProfile.displayName}
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap font-mono">
                    <span>BENUTZER: {currentUserProfile.username}</span>
                    <span>·</span>
                    <span className="uppercase font-semibold text-slate-800">
                      RANG: {currentUserProfile.role}
                    </span>
                    <span>·</span>
                    <span>DIENSTNUMMER: {currentUserProfile.badgeNumber}</span>
                    <span>·</span>
                    <span>ABTEILUNG: {currentUserProfile.division}</span>
                  </div>
                </div>

                {/* Direct Admin / Colonel Quick Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {canEditAcademy && (
                    <button
                      type="button"
                      onClick={() => setActiveSection('academy')}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      <FileUp className="w-3.5 h-3.5 text-sky-400" />
                      Lehrbücher (PDF) &amp; Code-Tests einbinden
                    </button>
                  )}
                  {canManageUsers && (
                    <button
                      type="button"
                      onClick={() => setActiveSection('personnel')}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Admin Panel: Konten &amp; Ränge verwalten
                    </button>
                  )}
                </div>
              </div>

              {/* 4-Column KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                  <div className="text-xs font-mono text-slate-500">AKTUELLER SYSTEM-RANG</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2 uppercase">
                    {currentUserProfile.role}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{currentUserProfile.rank}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                  <div className="text-xs font-mono text-slate-500">ABSOLVIERTE LEHRBÜCHER</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
                    {completedModulesCount} / {modules.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Durchgearbeitete Lehrmaterialien
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                  <div className="text-xs font-mono text-slate-500">BESTANDENE TESTS &amp; PRÜFUNGEN</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
                    {passedExamsCount} / {exams.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {currentUserProfile.role === 'trainee'
                      ? 'Übungstests (Abschlussprüfung ab Rookie)'
                      : 'Übungstests & Abschlussprüfungen'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                  <div className="text-xs font-mono text-slate-500">DIENSTVERZEICHNIS (ONLINE)</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
                    {roster.filter(r => r.isOnline).length} / {roster.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Aktive Beamte im Intranet
                  </div>
                </div>
              </div>

              {/* 2-Column Main Operational Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left 7 Cols: Public Roster & Role Permissions Overview */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          Öffentliches Dienstverzeichnis (Department Roster)
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Übersicht aller registrierten Beamten und Anwärter im Department
                        </p>
                      </div>
                      <span className="text-xs font-mono text-slate-500 tabular-nums">
                        {roster.length} BEAMTE
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {roster.map(member => (
                        <div
                          key={member.uid}
                          className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                member.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                              title={member.isOnline ? 'Online' : 'Offline'}
                            />
                            <div>
                              <div className="font-semibold text-slate-900">
                                {member.displayName}{' '}
                                <span className="font-mono text-slate-500 font-normal">
                                  ({member.badgeNumber} · {member.callsign})
                                </span>
                              </div>
                              <div className="text-slate-500 mt-0.5">{member.division}</div>
                            </div>
                          </div>

                          <div className="text-right font-mono shrink-0">
                            <div className="uppercase font-semibold text-sky-700">
                              {member.role}
                            </div>
                            <div className="text-slate-500 text-[11px]">{member.rank}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Role Permissions Reference Card */}
                  <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3 shadow-xs">
                    <div className="text-xs font-mono text-sky-600 font-semibold">
                      DEINE RANG-BERECHTIGUNGEN ({currentUserProfile.role.toUpperCase()})
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {currentRoleMeta.permissionsSummary}
                    </p>
                  </div>
                </div>

                {/* Right 5 Cols: Academy & Quick Actions */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <h2 className="text-base font-semibold text-slate-900">
                        Lernfortschritt &amp; Prüfungsprotokoll
                      </h2>
                      <Award className="w-4 h-4 text-sky-600" />
                    </div>

                    {userProgress.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4">
                        Noch keine abgeschlossenen Lehrbücher oder Tests protokolliert.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {userProgress.slice(0, 6).map(item => (
                          <div
                            key={item.id}
                            className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-slate-900">{item.targetTitle}</div>
                              <div className="text-slate-500 font-mono mt-0.5">
                                {item.userName} · {item.targetType.toUpperCase()} · {item.attempts} Versuch(e)
                              </div>
                            </div>
                            <div className="font-mono tabular-nums font-semibold shrink-0">
                              {item.status === 'passed' || item.status === 'completed' ? (
                                <span className="text-emerald-700">{item.scorePercent}% OK</span>
                              ) : (
                                <span className="text-rose-600">{item.scorePercent}% FAIL</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Direct Navigation Panel */}
                  <div className="bg-slate-900 text-white rounded-lg p-6 space-y-3">
                    <div className="text-xs font-mono text-sky-400 font-semibold">
                      SCHNELLZUGRIFF
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSection('academy')}
                        className="w-full text-left px-3.5 py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium flex items-center justify-between cursor-pointer"
                      >
                        <span>
                          {canEditAcademy
                            ? 'Lehrbücher (PDF) hochladen & Tests als Code einbinden'
                            : 'Lehrbücher, Übungstests & Prüfungen öffnen'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('whitelist')}
                        className="w-full text-left px-3.5 py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium flex items-center justify-between cursor-pointer"
                      >
                        <span>Personalbogen (Form 2-251) einsehen</span>
                        <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                      </button>

                      {canManageUsers && (
                        <button
                          type="button"
                          onClick={() => setActiveSection('personnel')}
                          className="w-full text-left px-3.5 py-2.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-between cursor-pointer"
                        >
                          <span>Exklusives Admin-Panel: Konten, Passwörter &amp; Ränge</span>
                          <ArrowRight className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: ACADEMY (TEXTBOOKS, PRACTICE TESTS, FINAL EXAMS) */}
          {activeSection === 'academy' && (
            <AcademyCenter
              currentUser={currentUserProfile}
              modules={modules}
              exams={exams}
              userProgress={userProgress}
              onRefreshState={() => fetchPortalState(currentUserProfile.uid)}
              onStatusToast={triggerToast}
            />
          )}

          {/* VIEW 3: WHITELIST & PERSONAL HISTORY STATEMENT */}
          {activeSection === 'whitelist' && (
            <WhitelistPortal
              currentUser={currentUserProfile}
              applications={applications}
              isAdmin={isAdmin}
              onRefreshState={() => fetchPortalState(currentUserProfile.uid)}
              onStatusToast={triggerToast}
            />
          )}

          {/* VIEW 4: STRICTLY ADMIN ONLY — ACCOUNT, PASSWORD, ROLE & LIVE ONLINE CONTROL */}
          {activeSection === 'personnel' && canManageUsers && (
            <AdminPersonnelConsole
              currentUser={currentUserProfile}
              adminAccounts={adminAccounts}
              allProgress={userProgress}
              onRefreshState={() => fetchPortalState(currentUserProfile.uid)}
              onStatusToast={triggerToast}
            />
          )}

          {/* VIEW 5: STRICTLY ADMIN ONLY — TECHNICAL GITHUB & RENDER PIPELINE */}
          {activeSection === 'deployment' && canViewTech && (
            <DeploymentPipelineHub
              currentUser={currentUserProfile}
              deploymentConfig={deploymentConfig}
              dbStats={dbStats}
              onRefreshState={() => fetchPortalState(currentUserProfile.uid)}
              onStatusToast={triggerToast}
            />
          )}
        </main>
      </div>
    </div>
  );
}
