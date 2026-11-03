import React, { useEffect, useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  FileCheck,
  BookOpen,
  Users,
  GitBranch,
  LogOut,
  LogIn,
  Sun,
  Moon,
  CheckCircle2,
  Award,
  Clock,
  ArrowRight,
  Lock
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  sanitizeId
} from './lib/firebase';
import {
  AcademyExamDoc,
  TrainingModuleDoc,
  UserPrivateProfile,
  UserProgressDoc,
  UserPublicProfile,
  WhitelistApplicationDoc
} from './types/portal';
import { DEFAULT_EXAMS, DEFAULT_TRAINING_MODULES } from './data/seedData';
import { WhitelistPortal } from './components/WhitelistPortal';
import { AcademyCenter } from './components/AcademyCenter';
import { AdminPersonnelConsole } from './components/AdminPersonnelConsole';
import { DeploymentPipelineHub } from './components/DeploymentPipelineHub';

type ActiveSection = 'dashboard' | 'whitelist' | 'academy' | 'personnel' | 'deployment';

const BOOTSTRAP_ADMIN_EMAIL = 'marlon.xv0063@gmail.com';

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserPublicProfile | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Firestore Collections State
  const [roster, setRoster] = useState<UserPublicProfile[]>([]);
  const [privateProfiles, setPrivateProfiles] = useState<UserPrivateProfile[]>([]);
  const [applications, setApplications] = useState<WhitelistApplicationDoc[]>([]);
  const [modules, setModules] = useState<TrainingModuleDoc[]>([]);
  const [exams, setExams] = useState<AcademyExamDoc[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgressDoc[]>([]);

  const triggerToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 4000);
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // 1. Auth Listener & Auto-Bootstrap User Profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthUser(user);
      if (!user) {
        setCurrentUserProfile(null);
        setAuthReady(true);
        return;
      }

      const isBootstrappedAdmin =
        user.email === BOOTSTRAP_ADMIN_EMAIL && user.emailVerified === true;
      const userDocRef = doc(db, 'users', user.uid);
      const privDocRef = doc(db, 'users_private', user.uid);

      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          const initialProfile: Omit<UserPublicProfile, 'createdAt' | 'updatedAt'> = {
            uid: user.uid,
            displayName: (user.displayName || user.email?.split('@')[0] || 'Officer Cadet').slice(0, 80),
            badgeNumber: isBootstrappedAdmin ? 'CA-0001' : `CA-${Math.floor(1000 + Math.random() * 8999)}`,
            callsign: isBootstrappedAdmin ? '1-STAFF-1' : '10-CADET',
            rank: isBootstrappedAdmin ? 'Chief of Police' : 'Civilian Applicant',
            role: isBootstrappedAdmin ? 'admin' : 'applicant',
            clearanceLevel: isBootstrappedAdmin ? 10 : 1,
            division: isBootstrappedAdmin
              ? 'Office of the Chief of Police (Command Staff)'
              : 'Recruitment & Background Division',
            whitelistStatus: isBootstrappedAdmin ? 'whitelisted' : 'pending'
          };

          await setDoc(userDocRef, {
            ...initialProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          await setDoc(privDocRef, {
            uid: user.uid,
            email: (user.email || 'officer@lapd-post.ca.gov').slice(0, 150),
            discordTag: 'pending#0001',
            steamHex: 'steam:pending',
            supervisorNotes: isBootstrappedAdmin
              ? 'System Bootstrapped Chief of Police / Master Administrator'
              : '',
            updatedAt: serverTimestamp()
          });

          if (isBootstrappedAdmin) {
            await setDoc(doc(db, 'admins', user.uid), {
              uid: user.uid,
              grantedAt: serverTimestamp()
            });
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  const isAdmin =
    Boolean(
      authUser?.email === BOOTSTRAP_ADMIN_EMAIL && authUser?.emailVerified
    ) || currentUserProfile?.role === 'admin';

  // 2. Real-time Firestore Subscriptions (only when authenticated)
  useEffect(() => {
    if (!authReady || !authUser) return;

    // Subscribe to all public users
    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('clearanceLevel', '>=', 0)),
      snap => {
        const list: UserPublicProfile[] = [];
        snap.forEach(d => list.push(d.data() as UserPublicProfile));
        setRoster(list);
        const me = list.find(u => u.uid === authUser.uid);
        if (me) setCurrentUserProfile(me);
      },
      err => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    // Subscribe to training modules
    const unsubModules = onSnapshot(
      query(collection(db, 'training_modules'), where('minClearance', '>=', 0)),
      async snap => {
        const list: TrainingModuleDoc[] = [];
        snap.forEach(d => list.push({ id: d.id, ...(d.data() as Omit<TrainingModuleDoc, 'id'>) }));
        setModules(list);

        // Auto-seed realistic CA-POST modules if empty and user is Admin
        if (list.length === 0 && authUser.email === BOOTSTRAP_ADMIN_EMAIL) {
          for (const m of DEFAULT_TRAINING_MODULES) {
            const id = sanitizeId(`mod_${m.code}`);
            await setDoc(doc(db, 'training_modules', id), {
              ...m,
              authorUid: authUser.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        }
      },
      err => handleFirestoreError(err, OperationType.LIST, 'training_modules')
    );

    // Subscribe to academy exams
    const unsubExams = onSnapshot(
      query(collection(db, 'exams'), where('minClearance', '>=', 0)),
      async snap => {
        const list: AcademyExamDoc[] = [];
        snap.forEach(d => list.push({ id: d.id, ...(d.data() as Omit<AcademyExamDoc, 'id'>) }));
        setExams(list);

        if (list.length === 0 && authUser.email === BOOTSTRAP_ADMIN_EMAIL) {
          for (const ex of DEFAULT_EXAMS) {
            const id = sanitizeId(`exam_${ex.moduleCode}`);
            await setDoc(doc(db, 'exams', id), {
              ...ex,
              authorUid: authUser.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        }
      },
      err => handleFirestoreError(err, OperationType.LIST, 'exams')
    );

    return () => {
      unsubUsers();
      unsubModules();
      unsubExams();
    };
  }, [authReady, authUser]);

  // 3. Role-Scoped Listeners for Applications, Progress, and Private Profiles
  useEffect(() => {
    if (!authReady || !authUser || !currentUserProfile) return;

    const appsQuery = isAdmin
      ? collection(db, 'applications')
      : query(collection(db, 'applications'), where('applicantUid', '==', authUser.uid));

    const unsubApps = onSnapshot(
      appsQuery,
      snap => {
        const list: WhitelistApplicationDoc[] = [];
        snap.forEach(d =>
          list.push({ id: d.id, ...(d.data() as Omit<WhitelistApplicationDoc, 'id'>) })
        );
        setApplications(list);
      },
      err => handleFirestoreError(err, OperationType.LIST, 'applications')
    );

    const progQuery = isAdmin
      ? collection(db, 'user_progress')
      : query(collection(db, 'user_progress'), where('userId', '==', authUser.uid));

    const unsubProg = onSnapshot(
      progQuery,
      snap => {
        const list: UserProgressDoc[] = [];
        snap.forEach(d =>
          list.push({ id: d.id, ...(d.data() as Omit<UserProgressDoc, 'id'>) })
        );
        setUserProgress(list);
      },
      err => handleFirestoreError(err, OperationType.LIST, 'user_progress')
    );

    const privQuery = isAdmin
      ? collection(db, 'users_private')
      : query(collection(db, 'users_private'), where('uid', '==', authUser.uid));

    const unsubPriv = onSnapshot(
      privQuery,
      snap => {
        const list: UserPrivateProfile[] = [];
        snap.forEach(d => list.push(d.data() as UserPrivateProfile));
        setPrivateProfiles(list);
      },
      err => handleFirestoreError(err, OperationType.LIST, 'users_private')
    );

    return () => {
      unsubApps();
      unsubProg();
      unsubPriv();
    };
  }, [authReady, authUser, currentUserProfile, isAdmin]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        triggerToast('Anmeldefenster wurde vorzeitig geschlossen. Bitte wähle dein Google-Konto im Popup aus.');
        return;
      }
      if (code === 'auth/popup-blocked') {
        triggerToast('Popup wurde vom Browser blockiert. Bitte erlaube Popups für diese Seite.');
        return;
      }
      triggerToast('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    triggerToast('Erfolgreich vom Officer Portal abgemeldet.');
  };

  // Unauthenticated Landing & Login Screen
  if (!authUser || !currentUserProfile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Strict 3-Zone Top Bar Contract */}
        <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            CA-POST Officer Portal
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0">
              Whitelist Plattform
            </a>
            <a href="#academy" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0">
              POST Academy LMS
            </a>
            <a href="#rbac" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0">
              Rollen &amp; Clearance
            </a>
            <a href="#cicd" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0">
              Render CI/CD
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-md hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Portal Login (SSO)
            </button>
          </div>
        </header>

        {/* Main Hero Split */}
        {statusToast && (
          <div className="max-w-7xl w-full mx-auto px-6 pt-6">
            <div className="p-3.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs font-mono text-amber-700 dark:text-amber-300 flex items-center justify-between">
              <span>{statusToast}</span>
              <button
                type="button"
                onClick={() => setStatusToast(null)}
                className="text-amber-500 hover:underline cursor-pointer"
              >
                [Schließen]
              </button>
            </div>
          </div>
        )}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
              STATE OF CALIFORNIA // COMMISSION ON PEACE OFFICER STANDARDS &amp; TRAINING
            </div>
            <h1
              className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Zentrales Officer-, Whitelist- &amp; Ausbildungsportal für Kalifornisches Law Enforcement Roleplay.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              Unabhängige Backend- und Datenbankplattform zur Verwaltung von Bewerbungen, Officer-Dienstgraden, rollenbasierten Freigabestufen (Clearance Levels) sowie nahtlos eingebundenen Lehrmaterialien und interaktiven Prüfungen.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Mit Dienstkonto anmelden &amp; Portal öffnen
              </button>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-6 text-xs font-mono text-slate-500">
              <div>
                <div className="text-slate-900 dark:text-slate-100 font-bold text-base tabular-nums">
                  6 ROLLEN
                </div>
                <div>Applicant bis Chief Admin</div>
              </div>
              <div>
                <div className="text-slate-900 dark:text-slate-100 font-bold text-base tabular-nums">
                  LIVE SANDBOX
                </div>
                <div>Dokumente &amp; HTML/JS Code</div>
              </div>
              <div>
                <div className="text-slate-900 dark:text-slate-100 font-bold text-base tabular-nums">
                  REST BRIDGE
                </div>
                <div>Standalone Whitelist API</div>
              </div>
            </div>
          </div>

          {/* Right Column Preview Specification Card */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs font-mono text-amber-500">SYSTEM ARCHITEKTUR</div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  Integrierte Behörden-Module
                </div>
              </div>
              <Shield className="w-6 h-6 text-amber-500" />
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  1. Unabhängiges Whitelist- &amp; Bewerbungssystem
                </div>
                <p className="text-slate-500 mt-1">
                  Bewerber reichen ihr Personal History Statement (Form 2-251) ein. Command Staff genehmigt Bewerbungen mit automatischer Rollen- und Game-Server-Freigabe.
                </p>
              </div>

              <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  2. Nahtlose Lehrmaterialien &amp; Interaktive Prüfungen
                </div>
                <p className="text-slate-500 mt-1">
                  Admins binden externe SOP-Dokumente oder ausführbaren HTML/JS-Simulationscode direkt in Lehrmodule und Prüfungen ein — inklusive individuellem Fortschrittstracking.
                </p>
              </div>

              <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  3. Rollenbasierte Sichtbarkeit (RBAC) &amp; Render CI/CD
                </div>
                <p className="text-slate-500 mt-1">
                  Unterlagen sind nach Clearance Level (1–10) geschützt. Fertige GitHub Actions &amp; Render Blueprint-Konfiguration für automatisiertes Deployment.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Computed Metrics for Officer Dashboard
  const accessibleModules = modules.filter(
    m => isAdmin || currentUserProfile.clearanceLevel >= m.minClearance
  );
  const myProgress = userProgress.filter(p => p.userId === currentUserProfile.uid);
  const completedModulesCount = myProgress.filter(
    p => p.targetType === 'module' && p.status === 'completed'
  ).length;
  const passedExamsCount = myProgress.filter(
    p => p.targetType === 'exam' && p.status === 'passed'
  ).length;
  const completionRate =
    accessibleModules.length > 0
      ? Math.min(100, Math.round((completedModulesCount / accessibleModules.length) * 100))
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={e => {
            e.preventDefault();
            setActiveSection('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          CA-POST Officer Portal
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setActiveSection('dashboard')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'dashboard'
                ? 'text-amber-600 dark:text-amber-400 underline underline-offset-8'
                : ''
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('whitelist')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'whitelist'
                ? 'text-amber-600 dark:text-amber-400 underline underline-offset-8'
                : ''
            }`}
          >
            Whitelist &amp; Bewerbung
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('academy')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'academy'
                ? 'text-amber-600 dark:text-amber-400 underline underline-offset-8'
                : ''
            }`}
          >
            Academy &amp; Prüfungen
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('personnel')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'personnel'
                ? 'text-amber-600 dark:text-amber-400 underline underline-offset-8'
                : ''
            }`}
          >
            Personal &amp; Rollen
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('deployment')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'deployment'
                ? 'text-amber-600 dark:text-amber-400 underline underline-offset-8'
                : ''
            }`}
          >
            GitHub &amp; Render CI/CD
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSignOut}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Abmelden ({currentUserProfile.badgeNumber})
          </button>
        </div>
      </header>

      {/* Workspace Body: Sidebar (260px) + Main Content Viewport */}
      <div className="flex-1 flex">
        {/* Left Command Sidebar */}
        <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 hidden lg:flex flex-col justify-between">
          <div className="space-y-6">
            {/* Officer Identity Summary (Unboxed Typography) */}
            <div className="pb-5 border-b border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
                {currentUserProfile.badgeNumber} · {currentUserProfile.callsign}
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentUserProfile.displayName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {currentUserProfile.rank} · Level {currentUserProfile.clearanceLevel}
              </div>
              <div className="text-xs font-mono text-slate-500 pt-1">
                WHITELIST: <span className="uppercase text-slate-900 dark:text-slate-200 font-semibold">{currentUserProfile.whitelistStatus}</span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveSection('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeSection === 'dashboard'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Officer Command Dashboard
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('whitelist')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeSection === 'whitelist'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                Whitelist &amp; Bewerbungen
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('academy')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeSection === 'academy'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                POST Academy &amp; Prüfungen
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('personnel')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeSection === 'personnel'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                Benutzer- &amp; Rollenverwaltung
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('deployment')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeSection === 'deployment'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                GitHub &amp; Render CI/CD
              </button>
            </div>
          </div>

          {/* Workspace Theme Switch */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500">DARSTELLUNG</span>
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              {darkMode ? 'Light' : 'Dark'}
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          {statusToast && (
            <div className="p-3.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs font-mono text-amber-700 dark:text-amber-300 flex items-center justify-between">
              <span>{statusToast}</span>
              <button
                type="button"
                onClick={() => setStatusToast(null)}
                className="text-amber-500 hover:underline cursor-pointer"
              >
                [Schließen]
              </button>
            </div>
          )}

          {/* VIEW 1: DETAILED OFFICER COMMAND DASHBOARD */}
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              {/* Officer Shift & Clearance Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
                    METROPOLITAN POLICE DEPARTMENT // CALIFORNIA POST INTRANET
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                    Willkommen im Dienst, {currentUserProfile.rank} {currentUserProfile.displayName}
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                    <span>Dienstnummer: {currentUserProfile.badgeNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>Callsign: {currentUserProfile.callsign}</span>
                    <span aria-hidden="true">·</span>
                    <span>Division: {currentUserProfile.division}</span>
                    <span aria-hidden="true">·</span>
                    <span>Clearance Level {currentUserProfile.clearanceLevel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('academy')}
                    className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-md hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Ausbildung &amp; Prüfungen fortsetzen
                  </button>
                </div>
              </div>

              {/* 4-Column KPI Telemetry Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                  <div className="text-xs font-mono text-slate-500">WHITELIST &amp; DIENSTSTATUS</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-2 uppercase">
                    {currentUserProfile.whitelistStatus}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Rolle: {currentUserProfile.role.toUpperCase()} · Level {currentUserProfile.clearanceLevel}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                  <div className="text-xs font-mono text-slate-500">PERSÖNLICHER LERNFORTSCHRITT</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-2">
                    {completionRate}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {completedModulesCount} von {accessibleModules.length} freigegebenen Modulen absolviert
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                  <div className="text-xs font-mono text-slate-500">BESTANDENE POST-PRÜFUNGEN</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-2">
                    {passedExamsCount} / {exams.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Zertifizierte Prüfungsabschlüsse in deiner Personalakte
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                  <div className="text-xs font-mono text-slate-500">AKTIVE PERSONALAKTEN (ROSTER)</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-2">
                    {roster.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {applications.filter(a => a.status === 'pending').length} offene Whitelist-Bewerbungen
                  </div>
                </div>
              </div>

              {/* 2-Column Main Operational Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left 7 Cols: Assigned Curriculum & Progress Tracker */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Dein Ausbildungs- &amp; Prüfungsfortschritt (CA-POST)
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Sichtbarkeit gefiltert nach deiner Berechtigungsstufe (Clearance Level {currentUserProfile.clearanceLevel})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('academy')}
                      className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Academy öffnen <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {modules.map(mod => {
                      const unlocked = isAdmin || currentUserProfile.clearanceLevel >= mod.minClearance;
                      const prog = myProgress.find(
                        p => p.targetType === 'module' && p.targetId === mod.id
                      );
                      return (
                        <div key={mod.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                              <span>{mod.code}</span>
                              <span aria-hidden="true">·</span>
                              <span>{mod.category}</span>
                              <span aria-hidden="true">·</span>
                              <span>MIN LEVEL {mod.minClearance}</span>
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                              {mod.title}
                            </div>
                          </div>

                          <div className="shrink-0 font-mono text-xs">
                            {!unlocked ? (
                              <span className="text-rose-500 flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5" /> GESPERRT
                              </span>
                            ) : prog?.status === 'completed' ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> ABSOLVIERT
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveSection('academy')}
                                className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                              >
                                Starten →
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right 5 Cols: Recent Certifications & Department Directives */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Letzte Prüfungs- &amp; Lernprotokolle
                      </h2>
                      <Award className="w-4 h-4 text-amber-500" />
                    </div>

                    {userProgress.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4">
                        Noch keine abgeschlossenen Module oder Prüfungen protokolliert.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-200 dark:divide-slate-800">
                        {userProgress.slice(0, 6).map(item => (
                          <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {item.targetTitle}
                              </div>
                              <div className="text-slate-500 font-mono mt-0.5">
                                {item.userName} · {item.targetType.toUpperCase()} · {item.attempts} Versuch(e)
                              </div>
                            </div>
                            <div className="font-mono tabular-nums font-semibold shrink-0">
                              {item.status === 'passed' || item.status === 'completed' ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {item.scorePercent}% OK
                                </span>
                              ) : (
                                <span className="text-rose-500">{item.scorePercent}% FAIL</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Command Actions */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-3">
                    <div className="text-xs font-mono text-amber-500">SCHNELLZUGRIFF // PORTAL-FUNKTIONEN</div>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSection('whitelist')}
                        className="w-full text-left px-3.5 py-2.5 rounded border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-xs font-medium flex items-center justify-between cursor-pointer"
                      >
                        <span>Whitelist-Bewerbung einreichen oder prüfen</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('personnel')}
                        className="w-full text-left px-3.5 py-2.5 rounded border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-xs font-medium flex items-center justify-between cursor-pointer"
                      >
                        <span>Benutzerkonten, Dienstgrade &amp; Clearance verwalten</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('deployment')}
                        className="w-full text-left px-3.5 py-2.5 rounded border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-xs font-medium flex items-center justify-between cursor-pointer"
                      >
                        <span>GitHub Repository &amp; Render.com CI/CD Konfiguration</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: WHITELIST & APPLICATION PLATFORM */}
          {activeSection === 'whitelist' && (
            <WhitelistPortal
              currentUser={currentUserProfile}
              applications={applications}
              isAdmin={isAdmin}
              onStatusToast={triggerToast}
            />
          )}

          {/* VIEW 3: ACADEMY LEARNING & INTERACTIVE EXAMS */}
          {activeSection === 'academy' && (
            <AcademyCenter
              currentUser={currentUserProfile}
              modules={modules}
              exams={exams}
              userProgress={userProgress}
              isAdmin={isAdmin}
              onStatusToast={triggerToast}
            />
          )}

          {/* VIEW 4: ADMIN PERSONNEL & RBAC MANAGEMENT */}
          {activeSection === 'personnel' && (
            <AdminPersonnelConsole
              currentUser={currentUserProfile}
              roster={roster}
              privateProfiles={privateProfiles}
              allProgress={userProgress}
              isAdmin={isAdmin}
              onStatusToast={triggerToast}
            />
          )}

          {/* VIEW 5: GITHUB & RENDER CI/CD PIPELINE */}
          {activeSection === 'deployment' && (
            <DeploymentPipelineHub onStatusToast={triggerToast} />
          )}
        </main>
      </div>
    </div>
  );
}
