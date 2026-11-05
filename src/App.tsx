import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  KeyRound,
  Building2,
  FileUp,
  Megaphone,
  Mail,
  ClipboardList,
  Settings,
  Clock,
  XCircle,
  Send,
  FilePlus2,
  Bell,
  Save,
  UserCheck,
  Calendar,
  FileSpreadsheet,
  History,
  Search,
  Activity,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  ShieldAlert,
  X,
  AlertTriangle
} from 'lucide-react';
import {
  AcademyExamDoc,
  AdminAccountView,
  AnnouncementCategory,
  AnnouncementDoc,
  AnnouncementPriority,
  AuditLogDoc,
  CalendarEventDoc,
  DirectMessageDoc,
  OfficerRole,
  PortalDbStats,
  PortalDeploymentConfig,
  PortalNotificationDoc,
  PortalRequestDoc,
  PublicActivityDoc,
  ROLE_HIERARCHY,
  sortRequestsPendingFirst,
  TrainingModuleDoc,
  UserProgressDoc,
  UserPublicProfile,
  WhitelistApplicationDoc
} from './types/portal';
import { WhitelistPortal } from './components/WhitelistPortal';
import { AcademyCenter } from './components/AcademyCenter';
import { ExamWorkshop } from './components/ExamWorkshop';
import { AdminPersonnelConsole } from './components/AdminPersonnelConsole';
import { DeploymentPipelineHub } from './components/DeploymentPipelineHub';
import { AnnouncementsFeed } from './components/AnnouncementsFeed';
import { MessagesCenter } from './components/MessagesCenter';
import { RequestsCenter } from './components/RequestsCenter';
import { CalendarEventsCenter } from './components/CalendarEventsCenter';
import { AuditTrailConsole } from './components/AuditTrailConsole';
import { ReportsExportCenter } from './components/ReportsExportCenter';
import { CommandPaletteModal, CommandTargetSection } from './components/CommandPaletteModal';
import { ProfessionalDevelopmentModule } from './components/ProfessionalDevelopmentModule';
import { LoginScreen } from './components/LoginScreen';
import { API_ENDPOINTS, apiFetch, setAuthToken } from './lib/api';
import { isLiveSyncConfigured, startLiveSync } from './lib/liveSync';

type ActiveSection = CommandTargetSection;

const SESSION_STORAGE_KEY = 'ca_post_officer_session_uid_v3';
const THEME_STORAGE_KEY = 'ca_post_theme_mode_v1';
const INACTIVITY_TIMEOUT_SECONDS = 15 * 60; // 15 Minuten Inaktivitäts-Timeout

export default function App() {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [sessionUid, setSessionUid] = useState<string | null>(() =>
    localStorage.getItem(SESSION_STORAGE_KEY)
  );
  const [currentUserProfile, setCurrentUserProfile] = useState<UserPublicProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const toggleThemeMode = useCallback(() => {
    setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Command Palette (Ctrl+K) & Live Notification Center Popover
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotifPopoverOpen, setIsNotifPopoverOpen] = useState(false);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const initialLoadCompleteRef = useRef<boolean>(false);

  // Login State
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Session-Timeout & Auto-Logout State
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState<number>(
    INACTIVITY_TIMEOUT_SECONDS
  );

  // Central Admin Quick-Actions Modal States on Dashboard
  const [showQuickAnnouncementModal, setShowQuickAnnouncementModal] = useState(false);
  const [quickAnnTitle, setQuickAnnTitle] = useState('');
  const [quickAnnCategory, setQuickAnnCategory] =
    useState<AnnouncementCategory>('Dienstanweisung');
  const [quickAnnPriority, setQuickAnnPriority] = useState<AnnouncementPriority>('important');
  const [quickAnnContent, setQuickAnnContent] = useState('');
  const [quickAnnSubmitting, setQuickAnnSubmitting] = useState(false);

  const [showQuickRoleModal, setShowQuickRoleModal] = useState(false);
  const [quickRoleTargetUid, setQuickRoleTargetUid] = useState('');
  const [quickRoleValue, setQuickRoleValue] = useState<OfficerRole>('officer');
  const [quickRoleSubmitting, setQuickRoleSubmitting] = useState(false);

  // Portal Database State
  const [roster, setRoster] = useState<UserPublicProfile[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccountView[]>([]);
  const [applications, setApplications] = useState<WhitelistApplicationDoc[]>([]);
  const [modules, setModules] = useState<TrainingModuleDoc[]>([]);
  const [exams, setExams] = useState<AcademyExamDoc[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgressDoc[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementDoc[]>([]);
  const [messages, setMessages] = useState<DirectMessageDoc[]>([]);
  const [requests, setRequests] = useState<PortalRequestDoc[]>([]);
  const [events, setEvents] = useState<CalendarEventDoc[]>([]);
  const [notifications, setNotifications] = useState<PortalNotificationDoc[]>([]);
  const [recentPublicActivity, setRecentPublicActivity] = useState<PublicActivityDoc[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogDoc[]>([]);
  const [deploymentConfig, setDeploymentConfig] = useState<PortalDeploymentConfig | undefined>(
    undefined
  );
  const [dbStats, setDbStats] = useState<PortalDbStats | undefined>(undefined);

  // Self-Service Settings Form State
  const [settingsCallsign, setSettingsCallsign] = useState('');
  const [settingsDivision, setSettingsDivision] = useState('');
  const [settingsBio, setSettingsBio] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const toastTimerRef = useRef<number | null>(null);
  const triggerToast = useCallback((msg: string) => {
    setStatusToast(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setStatusToast(null), 5500);
  }, []);

  // Global Keyboard Shortcut: Strg+K / Cmd+K for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsNotifPopoverOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        announcements: AnnouncementDoc[];
        messages: DirectMessageDoc[];
        requests: PortalRequestDoc[];
        events: CalendarEventDoc[];
        notifications: PortalNotificationDoc[];
        recentPublicActivity: PublicActivityDoc[];
        auditLogs: AuditLogDoc[];
        deploymentConfig?: PortalDeploymentConfig;
        dbStats?: PortalDbStats;
      }>(`${API_ENDPOINTS.PORTAL_STATE}?uid=${encodeURIComponent(targetUid)}`);

      if (!res.ok || !res.data) {
        if (res.status === 401 || res.status === 403) {
          setAuthToken(null);
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

      // Detect brand-new live notifications without page reload
      const incomingNotifs = data.notifications || [];
      if (!initialLoadCompleteRef.current) {
        incomingNotifs.forEach(n => seenNotificationIdsRef.current.add(n.id));
        initialLoadCompleteRef.current = true;
      } else {
        for (const n of incomingNotifs) {
          if (!seenNotificationIdsRef.current.has(n.id)) {
            seenNotificationIdsRef.current.add(n.id);
            if (!n.readByUids.includes(targetUid)) {
              triggerToast(`Neue Mitteilung: ${n.title} — ${n.message}`);
            }
          }
        }
      }

      setCurrentUserProfile(data.currentUser);
      setIsAdmin(Boolean(data.isAdmin));
      setRoster(data.roster || []);
      setAdminAccounts(data.adminAccounts || []);
      setApplications(data.applications || []);
      setModules(data.modules || []);
      setExams(data.exams || []);
      setUserProgress(data.progress || []);
      setAnnouncements(data.announcements || []);
      setMessages(data.messages || []);
      setRequests(data.requests || []);
      setEvents(data.events || []);
      setNotifications(incomingNotifs);
      setRecentPublicActivity(data.recentPublicActivity || []);
      setAuditLogs(data.auditLogs || []);
      setDeploymentConfig(data.deploymentConfig);
      setDbStats(data.dbStats);
    },
    [sessionUid, triggerToast]
  );

  // Sync settings form when currentUserProfile loads
  useEffect(() => {
    if (currentUserProfile) {
      setSettingsCallsign(currentUserProfile.callsign || '');
      setSettingsDivision(currentUserProfile.division || '');
      setSettingsBio(currentUserProfile.bio || '');
    }
  }, [currentUserProfile?.uid]);

  // Echtzeit-Signal aus Firestore: bei jeder Änderung sofort neu laden (nur wenn konfiguriert).
  const fetchPortalStateRef = useRef(fetchPortalState);
  fetchPortalStateRef.current = fetchPortalState;
  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    if (!sessionUid || !isLiveSyncConfigured()) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    let refreshTimer: number | undefined;

    const refresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        void fetchPortalStateRef.current(sessionUid);
      }, 150);
    };

    startLiveSync(
      async () => {
        const res = await apiFetch<{ token: string }>(API_ENDPOINTS.FIREBASE_TOKEN);
        return res.ok && res.data ? res.data.token : null;
      },
      refresh,
      connected => {
        if (!cancelled) setLiveConnected(connected);
      }
    )
      .then(unsubscribe => {
        if (cancelled) unsubscribe();
        else stop = unsubscribe;
      })
      .catch(() => {
        if (!cancelled) setLiveConnected(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimer);
      stop?.();
      setLiveConnected(false);
    };
  }, [sessionUid]);

  // Initial load + Polling. Mit Echtzeit-Signal reicht ein langsamer Takt, der nur noch den
  // Online-Status auffrischt (der Server wertet 45 Sekunden ohne Lebenszeichen als offline).
  useEffect(() => {
    if (!sessionUid) return;
    fetchPortalState(sessionUid);
    const interval = setInterval(
      () => {
        fetchPortalState(sessionUid);
      },
      liveConnected ? 20000 : 5000
    );
    return () => clearInterval(interval);
  }, [sessionUid, fetchPortalState, liveConnected]);

  const handleLogin = async (username: string, password: string) => {
    setAuthError(null);
    setAuthLoading(true);

    const res = await apiFetch<{ user: UserPublicProfile; isAdmin: boolean; token: string }>(
      API_ENDPOINTS.AUTH_LOGIN,
      {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      }
    );

    setAuthLoading(false);

    if (!res.ok || !res.data) {
      setAuthError(
        res.error ||
          'Anmeldung fehlgeschlagen: Benutzername oder Passwort ungültig bzw. Dienstkonto gesperrt.'
      );
      return;
    }

    const loggedInUser = res.data.user;
    initialLoadCompleteRef.current = false;
    seenNotificationIdsRef.current.clear();
    setAuthToken(res.data.token);
    localStorage.setItem(SESSION_STORAGE_KEY, loggedInUser.uid);
    setSessionUid(loggedInUser.uid);
    setCurrentUserProfile(loggedInUser);
    setIsAdmin(Boolean(res.data.isAdmin));
    setInactivitySecondsLeft(INACTIVITY_TIMEOUT_SECONDS);
    setActiveSection('dashboard');
    await fetchPortalState(loggedInUser.uid);
    triggerToast(
      `Angemeldet als ${loggedInUser.displayName} (Rang: ${loggedInUser.role.toUpperCase()}).`
    );
  };

  const handleSignOut = useCallback(
    async (isAutoTimeout?: boolean) => {
      if (sessionUid) {
        await apiFetch(API_ENDPOINTS.AUTH_LOGOUT, {
          method: 'POST',
          body: JSON.stringify({ uid: sessionUid })
        });
      }
      setAuthToken(null);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSessionUid(null);
      setCurrentUserProfile(null);
      setIsAdmin(false);
      setActiveSection('dashboard');
      if (isAutoTimeout) {
        setAuthError(
          'SICHERHEITS-TIMEOUT: Du wurdest nach 15 Minuten Inaktivität automatisch abgemeldet, um unbefugten Zugriff Dritter zu verhindern.'
        );
      } else {
        triggerToast('Du wurdest erfolgreich abgemeldet.');
      }
    },
    [sessionUid, triggerToast]
  );

  // Session-Timeout & Auto-Logout Activity Tracker (Resets on Mouse, Keyboard, Click, Scroll)
  useEffect(() => {
    if (!sessionUid) return;

    const resetInactivityTimer = () => {
      setInactivitySecondsLeft(INACTIVITY_TIMEOUT_SECONDS);
    };

    const eventsToWatch = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    eventsToWatch.forEach(evt =>
      window.addEventListener(evt, resetInactivityTimer, { passive: true })
    );

    const countdownInterval = window.setInterval(() => {
      setInactivitySecondsLeft(prev => {
        if (prev <= 1) {
          handleSignOut(true);
          return INACTIVITY_TIMEOUT_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      eventsToWatch.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
      window.clearInterval(countdownInterval);
    };
  }, [sessionUid, handleSignOut]);

  // Admin Quick-Action 1: 1-Click Request Approval / Rejection from Dashboard
  const handleAdminQuickDecision = async (
    reqDoc: PortalRequestDoc,
    status: 'approved' | 'rejected'
  ) => {
    if (!currentUserProfile) return;
    const res = await apiFetch(`${API_ENDPOINTS.REQUESTS}/${reqDoc.id}/review`, {
      method: 'PUT',
      body: JSON.stringify({
        reviewerUid: currentUserProfile.uid,
        status,
        reviewerComment:
          status === 'approved'
            ? 'Direkt-Genehmigung über Admin-Schnellaktion im Dashboard.'
            : 'Direkt-Ablehnung über Admin-Schnellaktion im Dashboard.',
        applyRankChange: true
      })
    });
    if (!res.ok) {
      triggerToast(res.error || 'Fehler: Antrags-Schnellaktion fehlgeschlagen.');
      return;
    }
    await fetchPortalState(currentUserProfile.uid);
    triggerToast(
      status === 'approved'
        ? `Schnellaktion: Antrag "${reqDoc.title}" wurde sofort genehmigt.`
        : `Schnellaktion: Antrag "${reqDoc.title}" wurde abgelehnt.`
    );
  };

  // Admin Quick-Action 2: Publish Global Announcement via Dashboard Modal
  const handleAdminQuickPublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile) return;
    setQuickAnnSubmitting(true);
    const res = await apiFetch(API_ENDPOINTS.ANNOUNCEMENTS, {
      method: 'POST',
      body: JSON.stringify({
        actorUid: currentUserProfile.uid,
        title: quickAnnTitle.trim(),
        category: quickAnnCategory,
        priority: quickAnnPriority,
        content: quickAnnContent.trim(),
        pinned: true
      })
    });
    setQuickAnnSubmitting(false);
    if (!res.ok) {
      triggerToast(res.error || 'Fehler beim Veröffentlichen der Ankündigung.');
      return;
    }
    setQuickAnnTitle('');
    setQuickAnnContent('');
    setShowQuickAnnouncementModal(false);
    await fetchPortalState(currentUserProfile.uid);
    triggerToast('Globale Bekanntmachung erfolgreich für alle Beamten veröffentlicht.');
  };

  // Admin Quick-Action 3: Adjust Officer Role / Rank via Dashboard Modal
  const handleAdminQuickRoleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile || !quickRoleTargetUid) return;
    setQuickRoleSubmitting(true);
    const res = await apiFetch(`${API_ENDPOINTS.ADMIN_ACCOUNTS}/${quickRoleTargetUid}`, {
      method: 'PUT',
      body: JSON.stringify({
        adminUid: currentUserProfile.uid,
        role: quickRoleValue,
        rank: ROLE_HIERARCHY[quickRoleValue].defaultRank
      })
    });
    setQuickRoleSubmitting(false);
    if (!res.ok) {
      triggerToast(res.error || 'Fehler beim Anpassen der Benutzerrechte.');
      return;
    }
    setShowQuickRoleModal(false);
    await fetchPortalState(currentUserProfile.uid);
    triggerToast('Benutzer-Rang und Systemrechte erfolgreich aktualisiert.');
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!currentUserProfile) return;
    await apiFetch(`${API_ENDPOINTS.NOTIFICATIONS}/read-all`, {
      method: 'PUT',
      body: JSON.stringify({ userUid: currentUserProfile.uid })
    });
    await fetchPortalState(currentUserProfile.uid);
  };

  const handleSelectNotification = async (notif: PortalNotificationDoc) => {
    if (!currentUserProfile) return;
    await apiFetch(`${API_ENDPOINTS.NOTIFICATIONS}/${notif.id}/read`, {
      method: 'PUT',
      body: JSON.stringify({ userUid: currentUserProfile.uid })
    });
    setActiveSection(notif.linkSection);
    setIsNotifPopoverOpen(false);
    await fetchPortalState(currentUserProfile.uid);
  };

  const handleSaveSelfSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile) return;
    setSavingSettings(true);

    const res = await apiFetch<{ user: UserPublicProfile }>(API_ENDPOINTS.PROFILE_SELF, {
      method: 'PUT',
      body: JSON.stringify({
        uid: currentUserProfile.uid,
        callsign: settingsCallsign.trim(),
        division: settingsDivision.trim(),
        bio: settingsBio.trim()
      })
    });

    setSavingSettings(false);
    if (!res.ok) {
      triggerToast(res.error || 'Fehler beim Speichern des Profils.');
      return;
    }

    await fetchPortalState(currentUserProfile.uid);
    triggerToast('Deine Diensteinstellungen wurden erfolgreich aktualisiert.');
  };

  // ============================================================================
  // 1. CLEAN COMPACT LOGIN WINDOW (NO SELF-REGISTRATION)
  // ============================================================================
  if (!sessionUid || !currentUserProfile) {
    return (
      <LoginScreen
        themeMode={themeMode}
        onToggleThemeMode={toggleThemeMode}
        statusToast={statusToast}
        onDismissToast={() => setStatusToast(null)}
        authError={authError}
        authLoading={authLoading}
        onLogin={handleLogin}
      />
    );
  }

  // ============================================================================
  // 2. AUTHENTICATED PORTAL (CLEAN WHITE + ANTHRACITE + SKY BLUE ACCENTS)
  // ============================================================================
  const currentRoleMeta = ROLE_HIERARCHY[currentUserProfile.role] || ROLE_HIERARCHY.trainee;
  const hasScopedCourseRights =
    Boolean(currentUserProfile.granularPermissions?.canGradeAssignedCourses) &&
    (currentUserProfile.granularPermissions?.assignedCourseCodes?.length || 0) > 0;
  const canEditAcademy = currentRoleMeta.canEditAcademy || hasScopedCourseRights;
  const canManageUsers = currentRoleMeta.canManageUsers; // Strictly Admin ONLY
  const canAccessExamWorkshop = currentUserProfile.role === 'admin' || currentUserProfile.granularPermissions?.examWorkshop?.hasAccess === true;
  const canViewTech = currentRoleMeta.canViewTechPipeline; // Strictly Admin ONLY

  // Progress & Metrics Computation
  const myProgress = userProgress.filter(p => p.userId === currentUserProfile.uid);
  const completedModulesCount = myProgress.filter(
    p => p.targetType === 'module' && p.status === 'completed'
  ).length;
  const passedExamsCount = myProgress.filter(
    p => (p.targetType === 'test' || p.targetType === 'final_exam') && p.status === 'passed'
  ).length;

  const moduleProgressPercent =
    modules.length > 0
      ? Math.min(100, Math.round((completedModulesCount / modules.length) * 100))
      : 0;
  const examProgressPercent =
    exams.length > 0 ? Math.min(100, Math.round((passedExamsCount / exams.length) * 100)) : 0;

  const unacknowledgedAnnouncementsCount = announcements.filter(
    a => !a.acknowledgedByUids.includes(currentUserProfile.uid)
  ).length;
  const acknowledgedAnnouncementsCount =
    announcements.length - unacknowledgedAnnouncementsCount;
  const announcementAckPercent =
    announcements.length > 0
      ? Math.min(100, Math.round((acknowledgedAnnouncementsCount / announcements.length) * 100))
      : 100;

  const overallQualificationPercent = Math.round(
    moduleProgressPercent * 0.45 + examProgressPercent * 0.45 + announcementAckPercent * 0.1
  );

  const unreadMessagesCount = messages.filter(
    m =>
      (m.recipientUid === currentUserProfile.uid || m.recipientUid === 'ALL') &&
      m.senderUid !== currentUserProfile.uid &&
      !m.readByUids.includes(currentUserProfile.uid)
  ).length;

  const unreadNotificationsCount = notifications.filter(
    n => !n.readByUids.includes(currentUserProfile.uid)
  ).length;

  const myRequests = requests.filter(r => r.requesterUid === currentUserProfile.uid);
  const pendingRequestsForReviewCount =
    currentRoleMeta.canEditAcademy ||
    currentUserProfile.granularPermissions?.canReviewStandardRequests
      ? requests.filter(r => r.status === 'pending').length
      : myRequests.filter(r => r.status === 'pending').length;

  const sortedRequests = sortRequestsPendingFirst(requests);
  const pendingAdminRequests = sortedRequests.filter(r => r.status === 'pending');
  const unreadConfidentialAdminMessages = messages.filter(
    m =>
      m.recipientUid === currentUserProfile.uid &&
      !m.readByUids.includes(currentUserProfile.uid) &&
      (m.priority === 'confidential' ||
        m.subject.includes('[ADMIN-') ||
        m.subject.includes('[SUPPORT') ||
        m.subject.includes('[FEHLER'))
  );

  const sessionMinutes = Math.floor(inactivitySecondsLeft / 60);
  const sessionSeconds = inactivitySecondsLeft % 60;
  const formattedSessionTimer = `${String(sessionMinutes).padStart(2, '0')}:${String(
    sessionSeconds
  ).padStart(2, '0')}`;

  const isErrorToast =
    statusToast &&
    (statusToast.toLowerCase().includes('fehler') ||
      statusToast.toLowerCase().includes('abgelehnt') ||
      statusToast.toLowerCase().includes('verweigert'));

  // Open Tasks (Offene Aufgaben)
  const openTasks: {
    id: string;
    title: string;
    detail: string;
    priority: 'high' | 'normal';
    targetSection: ActiveSection;
    buttonLabel: string;
  }[] = [];

  if (unacknowledgedAnnouncementsCount > 0) {
    openTasks.push({
      id: 'task-ack-ann',
      title: `${unacknowledgedAnnouncementsCount} offizielle Bekanntmachung(en) unbestätigt`,
      detail:
        'Bitte lies die aktuellen Dienstanweisungen im Ankündigungs-Feed und bestätige die Kenntnisnahme.',
      priority: 'high',
      targetSection: 'announcements',
      buttonLabel: 'Feed öffnen'
    });
  }

  if (unreadMessagesCount > 0) {
    openTasks.push({
      id: 'task-unread-msg',
      title: `${unreadMessagesCount} ungelesene Direktnachricht(en) im Posteingang`,
      detail: 'Du hast ungelesene interne Dienstmitteilungen erhalten.',
      priority: 'high',
      targetSection: 'messages',
      buttonLabel: 'Posteingang'
    });
  }

  if (completedModulesCount < modules.length) {
    openTasks.push({
      id: 'task-modules',
      title: `Lehrbücher durcharbeiten (${completedModulesCount}/${modules.length} abgeschlossen)`,
      detail: 'Arbeite die verbleibenden POST Learning Domains im Ausbildungsbereich durch.',
      priority: 'normal',
      targetSection: 'academy',
      buttonLabel: 'Zu den Handbüchern'
    });
  }

  if (passedExamsCount < exams.length) {
    openTasks.push({
      id: 'task-exams',
      title: `Prüfungen & Tests absolvieren (${passedExamsCount}/${exams.length} bestanden)`,
      detail: 'Schließe deine offenen Übungstests oder Zertifizierungsprüfungen ab.',
      priority: 'normal',
      targetSection: 'academy',
      buttonLabel: 'Zu den Tests'
    });
  }

  if (
    (currentRoleMeta.canEditAcademy ||
      currentUserProfile.granularPermissions?.canReviewStandardRequests) &&
    requests.some(r => r.status === 'pending')
  ) {
    const openCount = requests.filter(r => r.status === 'pending').length;
    openTasks.push({
      id: 'task-review-requests',
      title: `${openCount} eingereichte(r) Antrag/Anträge zur Prüfung offen`,
      detail: 'Du kannst ausstehende Anträge prüfen und entscheiden.',
      priority: 'high',
      targetSection: 'requests',
      buttonLabel: 'Anträge prüfen'
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Command Palette Modal (Ctrl+K / Cmd+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={section => setActiveSection(section)}
        modules={modules}
        exams={exams}
        roster={roster}
        events={events}
        requests={requests}
        canManageUsers={canManageUsers}
        canViewTech={canViewTech}
      />

      {/* FLOATING TOP-RIGHT TOAST NOTIFICATION */}
      {statusToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-16 right-6 z-50 max-w-md w-full rounded-lg p-4 shadow-lg border flex items-start justify-between gap-3 transition-all ${
            isErrorToast
              ? 'bg-rose-950 text-rose-100 border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          <div className="flex items-start gap-2.5 text-xs leading-relaxed">
            {isErrorToast ? (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-slate-300">
                {isErrorToast ? 'Fehlermeldung' : 'Systemhinweis'}
              </div>
              <div className="mt-0.5">{statusToast}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer shrink-0"
            title="Benachrichtigung schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SESSION-TIMEOUT WARNING OVERLAY (When < 90s of inactivity remain) */}
      {inactivitySecondsLeft <= 90 && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-amber-950 text-amber-100 border border-amber-600 rounded-lg p-4 shadow-lg space-y-3">
          <div className="flex items-start gap-2.5">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-semibold text-amber-200">
                Automatische Abmeldung in {inactivitySecondsLeft} Sekunden
              </div>
              <p className="text-amber-100/90 leading-relaxed">
                Wegen Inaktivität wirst du zum Schutz des Dienstportals in Kürze automatisch
                abgemeldet.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setInactivitySecondsLeft(INACTIVITY_TIMEOUT_SECONDS)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-md hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Sitzung aktiv halten
            </button>
          </div>
        </div>
      )}

      {/* ADMIN QUICK-ACTION MODAL 1: GLOBAL ANNOUNCEMENT */}
      {showQuickAnnouncementModal && isAdmin && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-sky-400 font-semibold">
                  ADMIN-SCHNELLAKTION · GLOBALE BEKANNTMACHUNG
                </div>
                <h2 className="text-base font-bold text-white mt-0.5">
                  Offizielle Ankündigung für alle Beamten veröffentlichen
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAnnouncementModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdminQuickPublishAnnouncement} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={quickAnnCategory}
                    onChange={e =>
                      setQuickAnnCategory(e.target.value as AnnouncementCategory)
                    }
                    className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Dienstanweisung">Dienstanweisung</option>
                    <option value="Ausbildung & Academy">Ausbildung &amp; Academy</option>
                    <option value="Personal & Beförderungen">Personal &amp; Beförderungen</option>
                    <option value="Allgemeine Bekanntmachung">Allgemeine Bekanntmachung</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dringlichkeit
                  </label>
                  <select
                    value={quickAnnPriority}
                    onChange={e =>
                      setQuickAnnPriority(e.target.value as AnnouncementPriority)
                    }
                    className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Wichtig</option>
                    <option value="urgent">Dringend (Eilmeldung)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Titel der Bekanntmachung *
                </label>
                <input
                  type="text"
                  required
                  value={quickAnnTitle}
                  onChange={e => setQuickAnnTitle(e.target.value)}
                  placeholder="z.B. Neue Funk-Dienstanweisung ab sofort gültig"
                  className="w-full px-3.5 py-2 text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Inhalt *
                </label>
                <textarea
                  rows={4}
                  required
                  value={quickAnnContent}
                  onChange={e => setQuickAnnContent(e.target.value)}
                  placeholder="Text der globalen Bekanntmachung..."
                  className="w-full px-3.5 py-2 text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickAnnouncementModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={quickAnnSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 cursor-pointer"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  {quickAnnSubmitting ? 'Veröffentliche...' : 'Sofort veröffentlichen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN QUICK-ACTION MODAL 2: QUICK ROLE / PERMISSION ADJUSTMENT */}
      {showQuickRoleModal && isAdmin && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-sky-400 font-semibold">
                  ADMIN-SCHNELLAKTION · RANG &amp; RECHTE ANPASSEN
                </div>
                <h2 className="text-base font-bold text-white mt-0.5">
                  Benutzerrechte direkt ändern
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickRoleModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdminQuickRoleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Beamten auswählen *
                </label>
                <select
                  value={quickRoleTargetUid}
                  onChange={e => {
                    const uid = e.target.value;
                    setQuickRoleTargetUid(uid);
                    const found = roster.find(r => r.uid === uid);
                    if (found) setQuickRoleValue(found.role);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  {roster.map(member => (
                    <option key={member.uid} value={member.uid}>
                      {member.displayName} ({member.badgeNumber} · Aktuell:{' '}
                      {member.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Neuer System-Rang / Berechtigungsstufe *
                </label>
                <select
                  value={quickRoleValue}
                  onChange={e => setQuickRoleValue(e.target.value as OfficerRole)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="trainee">5. Trainee (Standard-Einstieg)</option>
                  <option value="rookie">4. Rookie (Anwärter)</option>
                  <option value="officer">3. Officer (Vollzugsdienst)</option>
                  <option value="colonel">2. Colonel (Stellv. Leitung)</option>
                  <option value="admin">1. Admin (Vollzugriff)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickRoleModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={quickRoleSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {quickRoleSubmitting ? 'Speichere...' : 'Rang sofort übernehmen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          KOPFBEREICH (HEADER)
          ========================================================================== */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30">
        {/* Left: Brand & Subtle Operational Status */}
        <div className="flex items-center gap-4">
          <a
            href="#dashboard"
            onClick={e => {
              e.preventDefault();
              setActiveSection('dashboard');
            }}
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <Shield className="w-5 h-5 text-sky-400" />
            <span>CA-POST Dienstportal</span>
          </a>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 border-l border-slate-800 pl-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{roster.filter(r => r.isOnline).length} im Dienst</span>
            <span className="text-slate-600">·</span>
            <span
              title="Automatischer Sicherheits-Logout nach 15 Minuten Inaktivität"
              className="font-mono text-slate-400"
            >
              Sitzung: {formattedSessionTimer}
            </span>
          </div>
        </div>

        {/* Center: Command Palette Search Button (Strg+K) + Logged-In User Info */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="inline-flex items-center gap-3 px-3 py-1.5 rounded-md bg-slate-800 dark:bg-slate-900 hover:bg-slate-700 dark:hover:bg-slate-800 border border-slate-700 dark:border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
            title="Schnellsuche öffnen (Strg+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Suche (Handbücher, Personal, Termine)...</span>
            <span className="md:hidden">Suche</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-900 dark:bg-slate-950 text-slate-300 rounded border border-slate-700">
              Strg+K
            </kbd>
          </button>

          <div className="hidden 2xl:flex items-center gap-2 text-xs text-slate-300">
            <span className="text-white font-semibold">{currentUserProfile.displayName}</span>
            <span className="text-slate-500">·</span>
            <span className="uppercase font-mono text-sky-400 font-semibold">
              {currentUserProfile.role}
            </span>
            <span className="text-slate-400 font-mono">({currentUserProfile.badgeNumber})</span>
          </div>
        </div>

        {/* Right: Theme Toggle + Notifications + Quick Links */}
        <div className="flex items-center gap-2 shrink-0 relative">
          <button
            type="button"
            onClick={toggleThemeMode}
            aria-label={
              themeMode === 'dark'
                ? 'Zum hellen Design wechseln'
                : 'Zum dunklen Design wechseln'
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border bg-slate-800 dark:bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-700 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {themeMode === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Hell</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden xl:inline">Dunkel</span>
              </>
            )}
          </button>

          {/* Notifications Popover Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifPopoverOpen(prev => !prev)}
              className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border bg-slate-800 dark:bg-slate-900 text-slate-200 border-slate-700 dark:border-slate-800 hover:bg-slate-700 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="System-Benachrichtigungen"
            >
              <Bell className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden md:inline">Hinweise</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-rose-600 text-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {isNotifPopoverOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 bg-slate-900 dark:bg-slate-950 text-white border-b border-transparent dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold">
                    Echtzeit-Benachrichtigungen ({unreadNotificationsCount} ungelesen)
                  </span>
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllNotificationsRead}
                      className="text-[11px] font-mono text-sky-400 hover:underline cursor-pointer"
                    >
                      Alle gelesen
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      Noch keine Live-Benachrichtigungen vorhanden.
                    </div>
                  ) : (
                    notifications.slice(0, 12).map(notif => {
                      const isUnread = !notif.readByUids.includes(currentUserProfile.uid);
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          onClick={() => handleSelectNotification(notif)}
                          className={`w-full text-left px-4 py-3 hover:bg-sky-50/70 dark:hover:bg-slate-800/80 transition-colors cursor-pointer block ${
                            isUnread
                              ? 'bg-sky-50/40 dark:bg-sky-950/30'
                              : 'bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {isUnread && (
                                <span className="inline-block w-2 h-2 rounded-full bg-sky-500 mr-1.5" />
                              )}
                              {notif.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {new Date(notif.createdIso).toLocaleTimeString('de-DE', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                            {notif.message}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveSection('calendar')}
            title="Kalender & Einsätze"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
              activeSection === 'calendar'
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-slate-800 dark:bg-slate-900 text-slate-200 border-slate-700 dark:border-slate-800 hover:bg-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden lg:inline">Kalender</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('messages')}
            title="Direktnachrichten"
            className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
              activeSection === 'messages'
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Nachrichten</span>
            {unreadMessagesCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-rose-600 text-white">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSignOut(false)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600/90 hover:bg-rose-600 border border-rose-500 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Abmelden ({currentUserProfile.username})
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* ==========================================================================
            HAUPTNAVIGATION / SIDEBAR (Fixed Left Navigation Sidebar)
            ========================================================================== */}
        <aside className="w-64 shrink-0 bg-slate-900 text-slate-200 border-r border-slate-800 p-5 hidden lg:flex flex-col justify-between sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="space-y-6">
            {/* Officer Identity Summary Card */}
            <div className="pb-4 border-b border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-sky-400">
                <span>{currentUserProfile.badgeNumber}</span>
                <span>{currentUserProfile.callsign}</span>
              </div>
              <div className="text-base font-bold text-white truncate">
                {currentUserProfile.displayName}
              </div>
              <div className="text-xs text-slate-400">{currentUserProfile.rank}</div>
              <div className="pt-2 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">SYSTEM-RANG:</span>
                <span className="uppercase text-sky-400 font-semibold">
                  {currentUserProfile.role}
                </span>
              </div>
              {currentUserProfile.granularPermissions?.assignedCourseCodes &&
                currentUserProfile.granularPermissions.assignedCourseCodes.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">KURSE:</span>
                    <span className="text-emerald-400 truncate max-w-[130px]">
                      {currentUserProfile.granularPermissions.assignedCourseCodes.join(', ')}
                    </span>
                  </div>
                )}
            </div>

            {/* Structured Main Navigation */}
            <div className="space-y-5">
              {/* Group 1: Übersicht, Kommunikation & Termine */}
              <div className="space-y-1">
                <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Hauptbereiche &amp; Kommunikation
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSection('dashboard')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSection === 'dashboard'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('announcements')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSection === 'announcements'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Megaphone className="w-4 h-4" />
                    Ankündigungen &amp; Feed
                  </span>
                  {unacknowledgedAnnouncementsCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500 text-slate-950">
                      {unacknowledgedAnnouncementsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('messages')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSection === 'messages'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Mail className="w-4 h-4" />
                    Nachrichtensystem
                  </span>
                  {unreadMessagesCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-rose-600 text-white">
                      {unreadMessagesCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('requests')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSection === 'requests'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <ClipboardList className="w-4 h-4" />
                    Anträge &amp; Anforderungen
                  </span>
                  {pendingRequestsForReviewCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-rose-600 text-white">
                      {pendingRequestsForReviewCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('calendar')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSection === 'calendar'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Calendar className="w-4 h-4" />
                    Kalender &amp; Einsätze
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{events.length}</span>
                </button>
              </div>

              {/* Group 2: Ausbildung, Handbücher, Berichte & Personalakte */}
              <div className="space-y-1">
                <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Ausbildung, Berichte &amp; Akte
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSection('academy')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSection === 'academy'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4" />
                    Ausbildung &amp; Handbücher
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {completedModulesCount}/{modules.length}
                  </span>
                </button>

                {canManageUsers && (
                  <button
                    type="button"
                    onClick={() => setActiveSection('reports')}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      activeSection === 'reports'
                        ? 'bg-sky-600 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <FileSpreadsheet className="w-4 h-4" />
                      Berichte &amp; Exporte
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveSection('whitelist')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSection === 'whitelist'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <FileCheck className="w-4 h-4" />
                    Personalbogen &amp; Akte
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('settings')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeSection === 'settings'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Settings className="w-4 h-4" />
                    Einstellungen
                  </span>
                </button>
              </div>

              {/* Group 3: Strictly Admin Only */}
              {(canManageUsers || canViewTech || canAccessExamWorkshop) && (
                <div className="space-y-1 pt-2 border-t border-slate-800">
                  <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-sky-400">
                    Verwaltung &amp; Administration
                  </div>

                  {canAccessExamWorkshop && !canManageUsers && (
                    <button
                      type="button"
                      onClick={() => setActiveSection('exam_workshop')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        activeSection === 'exam_workshop'
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'text-sky-400 hover:bg-slate-800'
                      }`}
                    >
                      <FilePlus2 className="w-4 h-4" />
                      Prüfungswerkstatt
                    </button>
                  )}

                  {canManageUsers && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveSection('exam_workshop')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          activeSection === 'exam_workshop'
                            ? 'bg-sky-600 text-white font-semibold'
                            : 'text-sky-400 hover:bg-slate-800'
                        }`}
                      >
                        <FilePlus2 className="w-4 h-4" />
                        Prüfungswerkstatt
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('personnel')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          activeSection === 'personnel'
                            ? 'bg-sky-600 text-white font-semibold'
                            : 'text-sky-400 hover:bg-slate-800'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        Admin: Konten &amp; Ränge
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('audit')}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          activeSection === 'audit'
                            ? 'bg-sky-600 text-white font-semibold'
                            : 'text-sky-400 hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <History className="w-4 h-4" />
                          Admin: Audit-Trail &amp; Log
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {auditLogs.length}
                        </span>
                      </button>
                    </>
                  )}

                  {canViewTech && (
                    <button
                      type="button"
                      onClick={() => setActiveSection('deployment')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
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
          {/* Mobile Quick Navigation Bar */}
          <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
            {(
              [
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'announcements', label: `Feed (${unacknowledgedAnnouncementsCount})` },
                { id: 'messages', label: `Nachrichten (${unreadMessagesCount})` },
                { id: 'requests', label: `Anträge (${pendingRequestsForReviewCount})` },
                { id: 'calendar', label: `Kalender (${events.length})` },
                { id: 'academy', label: 'Ausbildung' },
                ...(canManageUsers ? [{ id: 'reports', label: 'Berichte & Export' }] : []),
                { id: 'whitelist', label: 'Personalbogen' },
                { id: 'settings', label: 'Einstellungen' },
                ...(canAccessExamWorkshop ? [{ id: 'exam_workshop', label: 'Prüfungswerkstatt' }] : []),
                ...(canManageUsers
                  ? [
                      { id: 'personnel', label: 'Admin: Konten' },
                      { id: 'audit', label: 'Admin: Audit-Log' }
                    ]
                  : []),
                ...(canViewTech ? [{ id: 'deployment', label: 'Render CI/CD' }] : [])
              ] as { id: ActiveSection; label: string }[]
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer ${
                  activeSection === tab.id
                    ? 'bg-slate-900 dark:bg-sky-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ========================================================================
              VIEW 1: MODULAR OFFICER DASHBOARD
              ======================================================================== */}
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              {/* Top Welcome Banner & Quick Action Buttons */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-2 max-w-3xl">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    California Department of Justice &amp; POST · Dienstübersicht
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                    Willkommen im Dienst, {currentUserProfile.displayName}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Überblick über deinen aktuellen Ausbildungs- und Prüfungsstand, offene
                    Dienstaufgaben sowie offizielle Bekanntmachungen der Dienststellenleitung.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1 flex-wrap font-mono">
                    <span>Kennung: {currentUserProfile.username}</span>
                    <span>·</span>
                    <span className="font-semibold text-slate-900 dark:text-white uppercase">
                      Rang: {currentUserProfile.role} ({currentUserProfile.rank})
                    </span>
                    <span>·</span>
                    <span>Dienstnr.: {currentUserProfile.badgeNumber}</span>
                    <span>·</span>
                    <span>{currentUserProfile.division}</span>
                  </div>
                </div>

                {/* Schnellzugriffe im Dashboard */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCommandPaletteOpen(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    Suche (Strg+K)
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSection('calendar')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Kalender ({events.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSection('requests')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <FilePlus2 className="w-3.5 h-3.5 text-slate-500" />
                    Antrag stellen
                  </button>

                  {canEditAcademy && (
                    <button
                      type="button"
                      onClick={() => setActiveSection('academy')}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-md hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <FileUp className="w-3.5 h-3.5 text-sky-400" />
                      Ausbildung &amp; Bewertung
                    </button>
                  )}

                  {canManageUsers && (
                    <button
                      type="button"
                      onClick={() => setActiveSection('personnel')}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Konten &amp; Ränge
                    </button>
                  )}
                </div>
              </div>

              {/* ======================================================================
                  ZENTRALE ADMIN-SCHNELLAKTIONEN (NUR FÜR ADMIN)
                  ====================================================================== */}
              {isAdmin && (
                <section
                  aria-label="Zentrale Admin-Schnellaktionen"
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs transition-colors"
                >
                  <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs text-slate-400 font-medium">
                          Systemadministration · Schnellzugriff
                        </span>
                        {(pendingAdminRequests.length > 0 ||
                          unreadConfidentialAdminMessages.length > 0) && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-rose-600 text-white">
                            {pendingAdminRequests.length +
                              unreadConfidentialAdminMessages.length}{' '}
                            offene Eingänge
                          </span>
                        )}
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                        Administrative Direktaktionen &amp; Antragsfreigaben
                      </h2>
                    </div>

                    {/* Quick-Action Trigger Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQuickAnnouncementModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors cursor-pointer"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        Bekanntmachung veröffentlichen
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!quickRoleTargetUid && roster.length > 0) {
                            setQuickRoleTargetUid(roster[0].uid);
                            setQuickRoleValue(roster[0].role);
                          }
                          setShowQuickRoleModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-300" />
                        Rang &amp; Rechte ändern
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('messages')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md transition-colors cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        Admin-Meldezentrum
                        {unreadConfidentialAdminMessages.length > 0 && (
                          <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-rose-600 text-white">
                            {unreadConfidentialAdminMessages.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('audit')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-md transition-colors cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-slate-300" />
                        Audit-Protokoll ({auditLogs.length})
                      </button>
                    </div>
                  </div>

                  {/* Direct Approval Queue for Pending Requests */}
                  <div className="p-5 bg-slate-50/60 dark:bg-slate-950/40">
                    {pendingAdminRequests.length === 0 ? (
                      <div className="flex items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-2 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          Keine ausstehenden Anträge zur Prüfung vorhanden.
                        </span>
                        <span className="text-xs text-slate-500">
                          Direkte Weiterleitung an die Administration
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Offene Anträge zur direkten Entscheidung ({pendingAdminRequests.length}):
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                          {pendingAdminRequests.slice(0, 3).map(reqItem => (
                            <div
                              key={reqItem.id}
                              className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                    Ausstehend ·
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {reqItem.title}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Antragsteller: {reqItem.requesterName} ({reqItem.requesterBadge}) ·{' '}
                                  {reqItem.targetDetail || reqItem.category}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleAdminQuickDecision(reqItem, 'approved')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Genehmigen
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdminQuickDecision(reqItem, 'rejected')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Ablehnen
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 4-Column Modular KPI Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs flex flex-col justify-between transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Aktueller Dienstgrad
                    </span>
                    <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2 uppercase">
                    {currentUserProfile.role}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {currentUserProfile.rank}
                  </div>
                </div>

                <div
                  onClick={() => setActiveSection('academy')}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg p-5 shadow-xs flex flex-col justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Ausbildung &amp; Prüfungen
                    </span>
                    <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                    {completedModulesCount}/{modules.length} · {passedExamsCount}/{exams.length}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Handbücher gelesen · Tests bestanden
                  </div>
                </div>

                <div
                  onClick={() => setActiveSection('calendar')}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg p-5 shadow-xs flex flex-col justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Termine &amp; Einsätze
                    </span>
                    <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                    {events.length} Termine
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Lehrgänge, Prüfungen &amp; Besprechungen
                  </div>
                </div>

                <div
                  onClick={() => setActiveSection('requests')}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg p-5 shadow-xs flex flex-col justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Anträge &amp; Anforderungen
                    </span>
                    <ClipboardList className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                    {pendingRequestsForReviewCount} offen
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {canEditAcademy
                      ? 'Ausstehende Anträge zur Bearbeitung'
                      : `Insgesamt ${myRequests.length} eigene Anträge`}
                  </div>
                </div>
              </div>

              {/* FORTSCHRITTSBALKEN & OFFENE AUFGABEN */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left 6 Cols: Ausbildungs- & Qualifikationsstand */}
                <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5 shadow-xs transition-colors">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Qualifikation &amp; Ausbildungsstand
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        Persönlicher Fortschritt
                      </h2>
                    </div>
                    <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                      Gesamt: {overallQualificationPercent}%
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Progress Bar 1: Lehrbücher */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          1. Lehrbücher &amp; Handbücher durchgearbeitet
                        </span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {completedModulesCount} / {modules.length} ({moduleProgressPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div
                          className="h-full bg-sky-600 transition-all duration-300 rounded-full"
                          style={{ width: `${moduleProgressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Progress Bar 2: Tests & Prüfungen */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          2. Bestandene Tests &amp; Akademie-Prüfungen
                        </span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {passedExamsCount} / {exams.length} ({examProgressPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                          style={{ width: `${examProgressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Progress Bar 3: Dienstanweisungen bestätigt */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          3. Offizielle Bekanntmachungen quittiert
                        </span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {acknowledgedAnnouncementsCount} / {announcements.length} (
                          {announcementAckPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div
                          className="h-full bg-slate-700 dark:bg-sky-500 transition-all duration-300 rounded-full"
                          style={{ width: `${announcementAckPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Infobox Berechtigungsstufe */}
                  <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Berechtigungsstufe ({currentUserProfile.role.toUpperCase()}):{' '}
                    </span>
                    {currentRoleMeta.permissionsSummary}
                  </div>
                </div>

                {/* Right 6 Cols: Offene Aufgaben */}
                <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4 shadow-xs transition-colors">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Aufgaben &amp; Pflichten
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        Offene Dienstaufgaben ({openTasks.length})
                      </h2>
                    </div>
                    <Award className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>

                  {openTasks.length === 0 ? (
                    <div className="p-6 rounded-md bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                      <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                        Alle aktuellen Dienstaufgaben erledigt
                      </div>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300/80">
                        Du hast alle Bekanntmachungen bestätigt, Nachrichten gelesen und Lehrmodule
                        abgeschlossen.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {openTasks.map(task => (
                        <div
                          key={task.id}
                          className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {task.priority === 'high' ? (
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0" />
                              )}
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {task.title}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 pl-4">
                              {task.detail}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveSection(task.targetSection)}
                            className="px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {task.buttonLabel}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* PROFESSIONAL DEVELOPMENT MODULE */}
              <ProfessionalDevelopmentModule
                currentUser={currentUserProfile}
                modules={modules}
                exams={exams}
                userProgress={userProgress}
                onNavigateAcademy={() => setActiveSection('academy')}
              />

              {/* TABELLEN- UND LISTENANSICHTEN */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Structured Table 1: Anträge & Anforderungen */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs transition-colors">
                  <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white border-b border-transparent dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold tracking-tight">
                        Antrags- &amp; Anforderungsübersicht
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Statusverfolgung für Rangänderungen, Freigaben &amp; Belobigungen
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('requests')}
                      className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded cursor-pointer"
                    >
                      Alle Anträge
                    </button>
                  </div>

                  {requests.length === 0 ? (
                    <div className="p-10 text-center space-y-2.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-600 dark:text-slate-400">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Keine ausstehenden Anträge vorhanden
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        Über das Antragsformular können Rangänderungen oder Sonderfreigaben
                        eingereicht werden.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            <th className="py-2.5 px-4">Antrag / Betreff</th>
                            <th className="py-2.5 px-4">Antragsteller</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4 text-right">Datum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                          {sortedRequests.slice(0, 5).map(req => (
                            <tr
                              key={req.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {req.title}
                                </div>
                                {req.requestedRole && (
                                  <div className="text-[11px] font-mono text-sky-700 dark:text-sky-400">
                                    Ziel-Rang: {req.requestedRole.toUpperCase()}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {req.requesterName}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  {req.requesterBadge} · {req.requesterCurrentRole.toUpperCase()}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {req.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                                    <Clock className="w-3.5 h-3.5" />
                                    In Bearbeitung
                                  </span>
                                )}
                                {req.status === 'approved' && (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Genehmigt
                                  </span>
                                )}
                                {req.status === 'rejected' && (
                                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Abgelehnt
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-slate-400">
                                {new Date(req.createdIso).toLocaleDateString('de-DE')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Right Dashboard Sidebar Column: Recent Activity Widget + Department Roster */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Recent Activity Sidebar Widget */}
                  <aside
                    aria-label="Letzte Aktivitäten"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs transition-colors"
                  >
                    <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white border-b border-transparent dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Activity className="w-4 h-4 text-sky-400 shrink-0" />
                        <div>
                          <h2 className="text-sm sm:text-base font-bold tracking-tight">
                            Letzte Portal-Aktivitäten
                          </h2>
                          <p className="text-xs text-slate-300 mt-0.5">
                            Die letzten 5 öffentlichen Bekanntmachungen und Lehrgangs-Updates
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {recentPublicActivity.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                          Keine aktuellen öffentlichen Aktivitäten vorhanden.
                        </div>
                      ) : (
                        recentPublicActivity.slice(0, 5).map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveSection(item.targetSection)}
                            className="w-full text-left px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-start justify-between gap-3 cursor-pointer group"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                                <span className="font-semibold text-sky-700 dark:text-sky-400">
                                  {item.actionLabelDe || item.actionType}
                                </span>
                                <span>·</span>
                                <span>{item.actorName}</span>
                              </div>
                              <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors truncate">
                                {item.title}
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex flex-col items-end justify-between">
                              <span className="text-[11px] font-mono text-slate-400">
                                {new Date(item.createdIso).toLocaleDateString('de-DE', {
                                  day: '2-digit',
                                  month: '2-digit'
                                })}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors mt-2" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </aside>

                  {/* Structured Table 2: Öffentliches Dienstverzeichnis (Department Roster) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs transition-colors">
                    <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white border-b border-transparent dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm sm:text-base font-bold tracking-tight">
                          Dienstverzeichnis (Roster)
                        </h2>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Übersicht aller registrierten Dienstkräfte
                        </p>
                      </div>
                      <span className="text-xs font-mono text-slate-300">
                        {roster.length} Einträge
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[300px] overflow-y-auto px-5">
                      {roster.map(member => (
                        <div
                          key={member.uid}
                          className="py-3 flex items-center justify-between gap-4 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                member.isOnline
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                              title={member.isOnline ? 'Online' : 'Offline'}
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-white truncate">
                                {member.displayName}{' '}
                                <span className="font-mono text-slate-500 dark:text-slate-400 font-normal">
                                  ({member.badgeNumber} · {member.callsign})
                                </span>
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 truncate">
                                {member.division}
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono shrink-0">
                            <div className="uppercase font-semibold text-slate-800 dark:text-slate-200">
                              {member.role}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                              {member.rank}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================
              VIEW 2: ANKÜNDIGUNGS- UND FEED-MODUL
              ======================================================================== */}
          {activeSection === 'announcements' && (
            <AnnouncementsFeed
              currentUser={currentUserProfile}
              announcements={announcements}
              totalOfficersCount={roster.length}
              onRefreshState={() => fetchPortalState(currentUserProfile.uid)}
              onStatusToast={triggerToast}
            />
          )}

          {/* ========================================================================
              VIEW 3: NACHRICHTEN- UND KOMMUNIKATIONSBEREICH
              ======================================================================== */}
          {activeSection === 'messages' && (
            <MessagesCenter
              currentUser={currentUserProfile}
              messages={messages}
              roster={roster}
              onRefreshState={() => fetchPortalState(currentUserProfile.uid)}
              onStatusToast={triggerToast}
            />
          )}

          {/* ========================================================================
              VIEW 4: ANTRAGS- UND ANFORDERUNGSFORMULARE (REQUESTS)
              ======================================================================== */}
          {activeSection === 'requests' && (
            <RequestsCenter
              currentUser={currentUserProfile}
              requests={requests}
              onRefreshState={() => fetchPortalState(currentUserProfile.uid)}
              onStatusToast={triggerToast}
            />
          )}

          {/* ========================================================================
              VIEW 5: INTERAKTIVES KALENDER- UND EVENT-MODUL
              ======================================================================== */}
          {activeSection === 'calendar' && (
            <CalendarEventsCenter
              currentUser={currentUserProfile}
              events={events}
              onRefreshState={() => fetchPortalState(currentUserProfile.uid)}
              onStatusToast={triggerToast}
            />
          )}

          {/* ========================================================================
              VIEW 6: AUSBILDUNGSBEREICHE & HANDBÜCHER (ACADEMY + GRANULAR GRADING)
              ======================================================================== */}
          {activeSection === 'academy' && (
            <AcademyCenter
              currentUser={currentUserProfile}
              roster={roster}
              modules={modules}
              exams={exams}
              userProgress={userProgress}
              onRefreshState={() => fetchPortalState(currentUserProfile.uid)}
              onStatusToast={triggerToast}
            />
          )}

          {/* ========================================================================
              VIEW 7: EXPORT- UND BERICHTSFUNKTIONEN (CSV / PDF LEITUNGSBERICHT)
              ======================================================================== */}
          {activeSection === 'reports' && canManageUsers && (
            <ReportsExportCenter
              currentUser={currentUserProfile}
              roster={roster}
              modules={modules}
              exams={exams}
              progress={userProgress}
              requests={requests}
              onStatusToast={triggerToast}
            />
          )}

          {/* ========================================================================
              VIEW 8: PERSONALBOGEN & AKTE (WHITELIST / FORM 2-251)
              ======================================================================== */}
          {activeSection === 'whitelist' && (
            <WhitelistPortal
              currentUser={currentUserProfile}
              applications={applications}
              isAdmin={isAdmin}
              onRefreshState={() => fetchPortalState(currentUserProfile.uid)}
              onStatusToast={triggerToast}
            />
          )}

              {/* VIEW 9: EINSTELLUNGEN (SELF-SERVICE PROFIL & BERECHTIGUNGSÜBERSICHT) */}
          {activeSection === 'settings' && (
            <div className="space-y-8">
              <div className="pb-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Benutzereinstellungen &amp; Dienstprofil
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                    Persönliche Einstellungen &amp; Dienstdaten
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Hier kannst du dein Funk-Rufzeichen (Callsign), deine Abteilungszuordnung sowie
                    dein Dienst-Kurzprofil für das interne Verzeichnis aktualisieren.
                  </p>
                </div>

                {/* Theme Selector in Settings */}
                <button
                  type="button"
                  onClick={toggleThemeMode}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 self-start"
                >
                  {themeMode === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" />
                      Ansicht: Dunkel (Zu Hell wechseln)
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-slate-600" />
                      Ansicht: Hell (Zu Dunkel wechseln)
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left 7 Cols: Editable Operational Profile */}
                <form
                  onSubmit={handleSaveSelfSettings}
                  className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5 shadow-xs transition-colors"
                >
                  <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Operative Dienstdaten bearbeiten
                    </h2>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                      Änderungen sind sofort im öffentlichen Dienstverzeichnis sichtbar.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Funk-Rufzeichen (Callsign)
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsCallsign}
                        onChange={e => setSettingsCallsign(e.target.value)}
                        placeholder="z. B. 1-ADAM-12"
                        className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-600 dark:focus:border-sky-400 focus:bg-white dark:focus:bg-slate-950"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Abteilung / Division
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsDivision}
                        onChange={e => setSettingsDivision(e.target.value)}
                        placeholder="z. B. Patrol Division / Field Operations"
                        className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-600 dark:focus:border-sky-400 focus:bg-white dark:focus:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Dienst-Kurzprofil / Vermerk (Bio)
                    </label>
                    <textarea
                      rows={4}
                      value={settingsBio}
                      onChange={e => setSettingsBio(e.target.value)}
                      placeholder="Kurze Beschreibung deiner Funktion, Qualifikationen oder Zuständigkeiten..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-600 dark:focus:border-sky-400 focus:bg-white dark:focus:bg-slate-950"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingSettings ? 'Wird gespeichert...' : 'Einstellungen speichern'}
                    </button>
                  </div>
                </form>

                {/* Right 5 Cols: Read-Only Account & Role Security Card */}
                <div className="lg:col-span-5 bg-slate-900 text-white rounded-lg p-6 space-y-4">
                  <div className="text-xs font-mono text-sky-400 font-semibold">
                    FESTGELEGTE KONTO- &amp; RANGDATEN
                  </div>
                  <div className="space-y-2.5 text-xs font-mono border-b border-slate-800 pb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">BENUTZERNAME:</span>
                      <span className="text-white font-semibold">{currentUserProfile.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">DIENSTNAME:</span>
                      <span className="text-white">{currentUserProfile.displayName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">DIENSTNUMMER:</span>
                      <span className="text-sky-400">{currentUserProfile.badgeNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">SYSTEM-RANG:</span>
                      <span className="text-sky-400 font-bold uppercase">
                        {currentUserProfile.role}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ZUGEWIESENE LEHRGÄNGE:</span>
                      <span className="text-emerald-400">
                        {currentUserProfile.granularPermissions?.assignedCourseCodes?.join(', ') ||
                          'Standard'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                    <div className="font-semibold text-white">Hinweis zu Rangänderungen:</div>
                    <p>
                      Wenn du eine Beförderung, Rangänderung oder Sonderfreigabe beantragen
                      möchtest, nutze bitte das Modul{' '}
                      <button
                        type="button"
                        onClick={() => setActiveSection('requests')}
                        className="text-sky-400 underline cursor-pointer font-semibold"
                      >
                        Anträge &amp; Anforderungen
                      </button>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================
              VIEW 10: STRICTLY ADMIN ONLY — ACCOUNT, PASSWORD, ROLE & GRANULAR PERMISSIONS
              ======================================================================== */}
          {activeSection === 'exam_workshop' && (currentUserProfile.role === 'admin' || currentUserProfile.granularPermissions?.examWorkshop?.hasAccess === true) && (
            <ExamWorkshop />
          )}

          {activeSection === 'personnel' && canManageUsers && (
            <AdminPersonnelConsole
              currentUser={currentUserProfile}
              adminAccounts={adminAccounts}
              allProgress={userProgress}
              onRefreshState={() => fetchPortalState(currentUserProfile.uid)}
              onStatusToast={triggerToast}
            />
          )}

          {/* ========================================================================
              VIEW 11: STRICTLY ADMIN ONLY — AUDIT-TRAIL & ACTIVITY LOG
              ======================================================================== */}
          {activeSection === 'audit' && canManageUsers && (
            <AuditTrailConsole auditLogs={auditLogs} onStatusToast={triggerToast} />
          )}

          {/* ========================================================================
              VIEW 12: STRICTLY ADMIN ONLY — TECHNICAL GITHUB & RENDER PIPELINE
              ======================================================================== */}
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
