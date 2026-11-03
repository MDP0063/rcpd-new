import React, { useRef, useState } from 'react';
import {
  Save,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  KeyRound,
  Download,
  Upload,
  HelpCircle
} from 'lucide-react';
import {
  AdminAccountView,
  OfficerRole,
  PortalBackupSnapshot,
  ROLE_HIERARCHY,
  UserProgressDoc,
  UserPublicProfile,
  WhitelistStatus
} from '../types/portal';
import { API_ENDPOINTS, apiFetch } from '../lib/api';

interface AdminPersonnelConsoleProps {
  currentUser: UserPublicProfile;
  adminAccounts: AdminAccountView[];
  allProgress: UserProgressDoc[];
  onRefreshState: () => Promise<void>;
  onStatusToast: (msg: string) => void;
}

interface FieldTooltipProps {
  title: string;
  description: string;
  hint?: string;
  variant?: 'default' | 'dark' | 'warning';
  align?: 'left' | 'center' | 'right';
}

/**
 * Icon-based hover & keyboard-focus tooltip for critical administrative form fields.
 * Helps prevent configuration, permission, and credential errors.
 */
const FieldTooltip: React.FC<FieldTooltipProps> = ({
  title,
  description,
  hint,
  variant = 'default',
  align = 'left'
}) => {
  const alignmentClasses =
    align === 'right'
      ? 'right-0'
      : align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'left-0';

  return (
    <span className="relative inline-flex items-center group ml-1.5 align-middle">
      <button
        type="button"
        tabIndex={0}
        aria-label={`Hilfe zu ${title}: ${description}`}
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-sky-500 ${
          variant === 'dark'
            ? 'text-slate-400 hover:text-sky-400 hover:bg-slate-800'
            : variant === 'warning'
              ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/60'
              : 'text-slate-400 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800'
        }`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      <span
        role="tooltip"
        className={`pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-all duration-150 z-50 absolute bottom-full mb-2 ${alignmentClasses} w-64 sm:w-72 p-3 rounded-md bg-slate-900 dark:bg-slate-950 text-white border border-slate-700 shadow-lg text-left font-sans normal-case tracking-normal`}
      >
        <span className="block text-xs font-semibold text-white mb-1">
          {title}
        </span>
        <span className="block text-xs text-slate-200 leading-relaxed font-normal">
          {description}
        </span>
        {hint && (
          <span className="block mt-1.5 pt-1.5 border-t border-slate-800 text-[11px] text-slate-300 leading-snug">
            {hint}
          </span>
        )}
      </span>
    </span>
  );
};

export const AdminPersonnelConsole: React.FC<AdminPersonnelConsoleProps> = ({
  currentUser,
  adminAccounts,
  allProgress,
  onRefreshState,
  onStatusToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Quick Own Password / Account Update State (For Admin1)
  const myAdminRecord = adminAccounts.find(a => a.uid === currentUser.uid);
  const [myNewUsername, setMyNewUsername] = useState(
    myAdminRecord?.username || currentUser.username || 'Admin1'
  );
  const [myNewPassword, setMyNewPassword] = useState(myAdminRecord?.password || '1234');
  const [showMyPassword, setShowMyPassword] = useState(false);

  React.useEffect(() => {
    if (myAdminRecord) {
      setMyNewUsername(myAdminRecord.username);
      setMyNewPassword(myAdminRecord.password);
    }
  }, [myAdminRecord?.username, myAdminRecord?.password]);

  // Edit Buffer for any selected account
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [editCallsign, setEditCallsign] = useState('');
  const [editRank, setEditRank] = useState('');
  const [editRole, setEditRole] = useState<OfficerRole>('trainee');
  const [editDivision, setEditDivision] = useState('');
  const [editWhitelist, setEditWhitelist] = useState<WhitelistStatus>('whitelisted');
  const [editDiscord, setEditDiscord] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCourseCodes, setEditCourseCodes] = useState('');
  const [editCanGradeCourses, setEditCanGradeCourses] = useState(false);
  const [editCanManageEvents, setEditCanManageEvents] = useState(false);
  const [editCanPublishAnnouncements, setEditCanPublishAnnouncements] = useState(false);
  const [editCanReviewStandardRequests, setEditCanReviewStandardRequests] = useState(false);
  const [editCanExportReports, setEditCanExportReports] = useState(false);

  // Create New Account State (Default Role: Trainee)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newBadge, setNewBadge] = useState(`CA-${Math.floor(1000 + Math.random() * 8999)}`);
  const [newCallsign, setNewCallsign] = useState('10-TRN');
  const [newRole, setNewRole] = useState<OfficerRole>('trainee'); // Always defaults to Trainee!
  const [newDivision, setNewDivision] = useState('Training & Evaluation Division');
  const [newWhitelist, setNewWhitelist] = useState<WhitelistStatus>('whitelisted');
  const [newDiscord, setNewDiscord] = useState('');
  const [newCourseCodes, setNewCourseCodes] = useState('');
  const [newCanGradeCourses, setNewCanGradeCourses] = useState(false);
  const [newCanManageEvents, setNewCanManageEvents] = useState(false);

  const filteredAccounts = adminAccounts.filter(acc => {
    const u = acc.publicProfile;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.displayName.toLowerCase().includes(q) ||
      acc.username.toLowerCase().includes(q) ||
      u.badgeNumber.toLowerCase().includes(q) ||
      u.callsign.toLowerCase().includes(q) ||
      u.division.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'ALL' ? true : u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const startEditing = (acc: AdminAccountView) => {
    setEditingUid(acc.uid);
    setEditUsername(acc.username);
    setEditPassword(acc.password);
    setEditDisplayName(acc.publicProfile.displayName);
    setEditBadge(acc.publicProfile.badgeNumber);
    setEditCallsign(acc.publicProfile.callsign);
    setEditRank(acc.publicProfile.rank);
    setEditRole(acc.publicProfile.role);
    setEditDivision(acc.publicProfile.division);
    setEditWhitelist(acc.publicProfile.whitelistStatus);
    setEditDiscord(acc.privateProfile.discordTag || '');
    setEditNotes(acc.privateProfile.supervisorNotes || '');
    const perms = acc.publicProfile.granularPermissions;
    setEditCourseCodes((perms?.assignedCourseCodes || []).join(', '));
    setEditCanGradeCourses(Boolean(perms?.canGradeAssignedCourses));
    setEditCanManageEvents(Boolean(perms?.canManageEvents));
    setEditCanPublishAnnouncements(Boolean(perms?.canPublishAnnouncements));
    setEditCanReviewStandardRequests(Boolean(perms?.canReviewStandardRequests));
    setEditCanExportReports(Boolean(perms?.canExportReports));
  };

  const handleUpdateMyOwnCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch(`${API_ENDPOINTS.ADMIN_ACCOUNTS}/${currentUser.uid}`, {
      method: 'PUT',
      body: JSON.stringify({
        adminUid: currentUser.uid,
        username: myNewUsername.trim(),
        password: myNewPassword
      })
    });
    if (!res.ok) {
      onStatusToast(res.error || 'Fehler beim Aktualisieren deiner Admin-Zugangsdaten.');
      return;
    }
    await onRefreshState();
    onStatusToast(`Deine Admin-Zugangsdaten (${myNewUsername}) wurden in Echtzeit aktualisiert.`);
  };

  const handleSaveAccount = async (uid: string) => {
    const res = await apiFetch(`${API_ENDPOINTS.ADMIN_ACCOUNTS}/${uid}`, {
      method: 'PUT',
      body: JSON.stringify({
        adminUid: currentUser.uid,
        username: editUsername.trim(),
        password: editPassword,
        displayName: editDisplayName.trim(),
        badgeNumber: editBadge.trim().toUpperCase(),
        callsign: editCallsign.trim(),
        role: editRole,
        rank: editRank.trim(),
        division: editDivision.trim(),
        whitelistStatus: editWhitelist,
        discordTag: editDiscord.trim(),
        supervisorNotes: editNotes,
        granularPermissions: {
          assignedCourseCodes: editCourseCodes
            .split(',')
            .map(c => c.trim().toUpperCase())
            .filter(Boolean),
          canGradeAssignedCourses: editCanGradeCourses,
          canManageEvents: editCanManageEvents,
          canPublishAnnouncements: editCanPublishAnnouncements,
          canReviewStandardRequests: editCanReviewStandardRequests,
          canExportReports: editCanExportReports
        }
      })
    });

    if (!res.ok) {
      onStatusToast(res.error || 'Fehler beim Speichern des Kontos.');
      return;
    }

    await onRefreshState();
    setEditingUid(null);
    onStatusToast(`Konto "${editUsername}" (Rang: ${editRole.toUpperCase()}) in Echtzeit aktualisiert.`);
  };

  const handleToggleSuspend = async (acc: AdminAccountView) => {
    if (acc.uid === currentUser.uid) {
      onStatusToast('Du kannst dein eigenes aktives Administratorkonto nicht suspendieren.');
      return;
    }
    const nextStatus: WhitelistStatus =
      acc.publicProfile.whitelistStatus === 'suspended' ? 'whitelisted' : 'suspended';

    const res = await apiFetch(`${API_ENDPOINTS.ADMIN_ACCOUNTS}/${acc.uid}`, {
      method: 'PUT',
      body: JSON.stringify({
        adminUid: currentUser.uid,
        whitelistStatus: nextStatus
      })
    });

    if (res.ok) {
      await onRefreshState();
      onStatusToast(
        nextStatus === 'suspended'
          ? `Konto "${acc.username}" wurde sofort suspendiert.`
          : `Suspendierung für "${acc.username}" aufgehoben (Aktiv).`
      );
    } else {
      onStatusToast(res.error || 'Fehler beim Ändern des Sperrstatus.');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const roleMeta = ROLE_HIERARCHY[newRole];

    const res = await apiFetch<{ ok: boolean; account: AdminAccountView }>(
      API_ENDPOINTS.ADMIN_ACCOUNTS,
      {
        method: 'POST',
        body: JSON.stringify({
          adminUid: currentUser.uid,
          username: newUsername.trim(),
          password: newPassword,
          displayName: newDisplayName.trim() || newUsername.trim(),
          badgeNumber: newBadge.trim().toUpperCase(),
          callsign: newCallsign.trim(),
          role: newRole, // Trainee by default
          rank: roleMeta.defaultRank,
          division: newDivision.trim(),
          whitelistStatus: newWhitelist,
          discordTag: newDiscord.trim() || `${newUsername.trim().toLowerCase()}#0001`,
          supervisorNotes: 'Vom Administrator persönlich erstellt.',
          granularPermissions: {
            assignedCourseCodes: newCourseCodes
              .split(',')
              .map(c => c.trim().toUpperCase())
              .filter(Boolean),
            canGradeAssignedCourses: newCanGradeCourses,
            canManageEvents: newCanManageEvents,
            canPublishAnnouncements: false,
            canReviewStandardRequests: false,
            canExportReports: false
          }
        })
      }
    );

    if (!res.ok || !res.data) {
      onStatusToast(res.error || 'Konto konnte nicht angelegt werden.');
      return;
    }

    await onRefreshState();
    setNewUsername('');
    setNewPassword('');
    setNewDisplayName('');
    setNewRole('trainee');
    setNewBadge(`CA-${Math.floor(1000 + Math.random() * 8999)}`);
    setShowCreateForm(false);
    onStatusToast(
      `Neues Konto "${res.data.account.username}" (Rolle: ${res.data.account.publicProfile.role.toUpperCase()}) angelegt.`
    );
  };

  const handleDeleteAccount = async (uid: string, username: string) => {
    if (uid === currentUser.uid) {
      onStatusToast('Du kannst dein eigenes Administratorkonto nicht löschen.');
      return;
    }
    const res = await apiFetch(
      `${API_ENDPOINTS.ADMIN_ACCOUNTS}/${uid}?adminUid=${encodeURIComponent(currentUser.uid)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      onStatusToast(res.error || 'Konto konnte nicht gelöscht werden.');
      return;
    }
    await onRefreshState();
    setEditingUid(null);
    onStatusToast(`Benutzerkonto "${username}" wurde dauerhaft gelöscht.`);
  };

  const onlineCount = adminAccounts.filter(a => a.isOnline).length;
  const quickRestoreRef = useRef<HTMLInputElement | null>(null);

  const handleQuickExportBackup = async () => {
    const res = await apiFetch<PortalBackupSnapshot>(
      `${API_ENDPOINTS.ADMIN_BACKUP}?adminUid=${encodeURIComponent(currentUser.uid)}`
    );
    if (!res.ok || !res.data) {
      onStatusToast(res.error || 'Backup-Export fehlgeschlagen.');
      return;
    }
    const datePart = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ca-post-portal-backup-${datePart}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    await onRefreshState();
    onStatusToast('Komplettes Datenbank-Backup (Konten, Passwörter, PDFs & Tests) heruntergeladen.');
  };

  const handleQuickRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const res = await apiFetch<{
          ok: boolean;
          summary: { accountsCount: number; modulesCount: number; examsCount: number };
        }>(API_ENDPOINTS.ADMIN_RESTORE, {
          method: 'POST',
          body: JSON.stringify({
            adminUid: currentUser.uid,
            snapshot: parsed
          })
        });
        if (!res.ok || !res.data) {
          onStatusToast(res.error || 'Backup-Wiederherstellung fehlgeschlagen.');
          return;
        }
        await onRefreshState();
        onStatusToast(
          `Backup wiederhergestellt (${res.data.summary.accountsCount} Konten, ${res.data.summary.modulesCount} PDFs, ${res.data.summary.examsCount} Prüfungen).`
        );
      } catch {
        onStatusToast('Ungültige JSON-Backup-Datei.');
      } finally {
        if (quickRestoreRef.current) quickRestoreRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Personalverwaltung · Konten, Ränge und Zugriffsrechte
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            Benutzerkonten &amp; Rangverwaltung
          </h1>
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            <p>
              Dieser Bereich ist für alle anderen Ränge (inklusive Colonel) vollständig unsichtbar
              und gesperrt. Alle neuen Konten werden persönlich durch dich angelegt und starten
              standardmäßig als{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">Trainee</strong>.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Bewege den Mauszeiger über die{' '}
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-sky-700 dark:text-sky-400">
                <HelpCircle className="w-3.5 h-3.5 inline" /> Hilfe-Icons
              </span>{' '}
              neben den Formularfeldern, um detaillierte Format- und Sicherheitshinweise einzublenden.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <button
            type="button"
            onClick={handleQuickExportBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            title="Alle Accounts, Passwörter, PDFs & Tests als Backup-Datei sichern"
          >
            <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Backup sichern (.json)
          </button>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Backup einspielen
            <input
              ref={quickRestoreRef}
              type="file"
              accept=".json,application/json"
              onChange={handleQuickRestoreFile}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Neues Benutzerkonto anlegen (Standard: Trainee)
          </button>
        </div>
      </div>

      {/* Top Row: Admin's Own Live Credential Changer + 5-Role Filter Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Admin Own Password & Username Real-time Box */}
        <form
          onSubmit={handleUpdateMyOwnCredentials}
          className="lg:col-span-5 bg-slate-900 text-white rounded-lg p-5 flex flex-col justify-between border border-slate-800"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-sky-400">
              <span>MEIN MASTER-ADMIN ZUGANG (ECHTZEIT)</span>
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="text-base font-bold text-white">
              Eigene Anmeldedaten ({currentUser.username}) direkt ändern
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
            <div>
              <label className="flex items-center text-[11px] font-mono text-slate-300 mb-1">
                <span>ADMIN BENUTZERNAME</span>
                <FieldTooltip
                  variant="dark"
                  title="Master-Admin Benutzername"
                  description="Eindeutige Login-Kennung für dein primäres Administratorkonto. Wird sofort für zukünftige Anmeldungen übernommen."
                  hint="Hinweis: Keine Leerzeichen verwenden (z. B. Admin1)."
                />
              </label>
              <input
                type="text"
                required
                value={myNewUsername}
                onChange={e => setMyNewUsername(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="flex items-center text-[11px] font-mono text-slate-300 mb-1">
                <span>ADMIN PASSWORT</span>
                <FieldTooltip
                  variant="dark"
                  align="right"
                  title="Master-Admin Passwort"
                  description="Geheimer Hauptschlüssel für den uneingeschränkten Zugriff auf alle Konten, Ränge und Systemeinstellungen."
                  hint="Sicherheit: Nach dem Speichern sofort für den nächsten Login gültig."
                />
              </label>
              <div className="relative">
                <input
                  type={showMyPassword ? 'text' : 'password'}
                  required
                  value={myNewPassword}
                  onChange={e => setMyNewPassword(e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 text-xs font-mono rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  onClick={() => setShowMyPassword(!showMyPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title="Passwort ein-/ausblenden"
                >
                  {showMyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-[11px] font-mono text-slate-300">
              AKTIV ONLINE: {onlineCount} / {adminAccounts.length} KONTEN
            </span>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded transition-colors cursor-pointer"
            >
              Eigenes Passwort &amp; Login speichern
            </button>
          </div>
        </form>

        {/* 5-Role Hierarchy Filter Cards */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(['admin', 'colonel', 'officer', 'rookie', 'trainee'] as OfficerRole[]).map(roleKey => {
            const meta = ROLE_HIERARCHY[roleKey];
            const count = adminAccounts.filter(a => a.publicProfile.role === roleKey).length;
            const isSelected = roleFilter === roleKey;
            return (
              <div
                key={roleKey}
                onClick={() => setRoleFilter(isSelected ? 'ALL' : roleKey)}
                className={`p-4 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
                    <span className="uppercase font-bold text-slate-900 dark:text-white">{roleKey}</span>
                    <span>#{meta.rankOrder}</span>
                  </div>
                  <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                    {count}
                  </div>
                </div>
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-2 leading-tight">
                  {meta.defaultRank}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create New Account Drawer (Defaults to Trainee) */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateAccount}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Personalverwaltung · Kontoerstellung
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
                Neues Benutzerkonto anlegen (Standardmäßig Rang Trainee)
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <span>Login-Benutzername (User) *</span>
                <FieldTooltip
                  title="Login-Benutzername"
                  description="Eindeutiger Anmeldename für das Portal. Der Beamte nutzt diesen Namen zusammen mit seinem Passwort auf der Login-Maske."
                  hint="Format: Keine Leerzeichen, eindeutig (z. B. TraineeMiller)."
                />
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="z.B. TraineeMiller"
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <span>Login-Passwort *</span>
                <FieldTooltip
                  title="Initiales Login-Passwort"
                  description="Start-Passwort für das neue Konto. Da kein automatischer Passwort-Reset existiert, übermittle dieses Passwort direkt an den Beamten."
                  hint="Empfehlung: Mindestens 4–8 Zeichen oder numerischer PIN-Code."
                />
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="z.B. 5829"
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <span>Vollständiger Name (RP Name) *</span>
                <FieldTooltip
                  title="Offizieller Dienstname"
                  description="Vor- und Nachname des Beamten für das Dienstverzeichnis, die Personalakte (Form 2-251) und Prüfungszertifikate."
                  hint="Beispiel: Lukas Miller"
                />
              </label>
              <input
                type="text"
                required
                value={newDisplayName}
                onChange={e => setNewDisplayName(e.target.value)}
                placeholder="z.B. Lukas Miller"
                className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <span>Rang / Rolle (Standard: Trainee)</span>
                <FieldTooltip
                  variant="warning"
                  align="right"
                  title="System-Rang & Berechtigungsstufe"
                  description="Legt die systemweiten Zugriffsrechte fest (Stufe 5 Trainee bis Stufe 1 Admin). Colonel darf Lehrmodule bearbeiten; nur Admin hat Vollzugriff."
                  hint="Wichtig: Neue Anwärter sollten immer als 5. Trainee starten."
                />
              </label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as OfficerRole)}
                className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="trainee">5. Trainee (Standard-Einstieg — Lehrmaterial &amp; Tests)</option>
                <option value="rookie">4. Rookie (Inkl. Abschlussprüfung)</option>
                <option value="officer">3. Officer (Regulärer Streifendienst)</option>
                <option value="colonel">2. Colonel (Kann Lehrmaterialien &amp; Tests bearbeiten)</option>
                <option value="admin">1. Admin (Vollzugriff)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <span>Dienstnummer (Badge)</span>
                <FieldTooltip
                  title="CA-POST Dienstnummer (Badge)"
                  description="Offizielle Dienstmarken-Kennung zur eindeutigen Zuordnung in Ausbildungsberichten, Anträgen und im Audit-Log."
                  hint="Standardformat: CA-XXXX (wird automatisch generiert)."
                />
              </label>
              <input
                type="text"
                required
                value={newBadge}
                onChange={e => setNewBadge(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <span>Funkrufname (Callsign)</span>
                <FieldTooltip
                  title="Taktischer Funkrufname"
                  description="Operatives Rufzeichen für den Funk- und Streifendienst. Kann später vom Beamten auch in den persönlichen Einstellungen angepasst werden."
                  hint="Beispiel: 10-TRN, 1-ADAM-12 oder 2-LINCOLN-4"
                />
              </label>
              <input
                type="text"
                required
                value={newCallsign}
                onChange={e => setNewCallsign(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <span>Abteilung / Division</span>
                <FieldTooltip
                  title="Abteilung / Organisationseinheit"
                  description="Fachbereich oder Einheit innerhalb der Dienststelle. Wird im öffentlichen Dienstverzeichnis und in Exportberichten aufgeführt."
                  hint="Beispiel: Training & Evaluation Division, Patrol Division"
                />
              </label>
              <input
                type="text"
                required
                value={newDivision}
                onChange={e => setNewDivision(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <span>Konto-Status</span>
                <FieldTooltip
                  variant="warning"
                  align="right"
                  title="Konto- & Login-Freigabestatus"
                  description="Steuert, ob sich der Beamte anmelden darf. 'Suspendiert' blockiert den Login sofort mit einem Sicherheitshinweis auf der Anmeldemaske."
                  hint="Standard für neue Beamte: Aktiv / Freigeschaltet."
                />
              </label>
              <select
                value={newWhitelist}
                onChange={e => setNewWhitelist(e.target.value as WhitelistStatus)}
                className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="whitelisted">Aktiv / Freigeschaltet</option>
                <option value="probation">Auf Probe (Probation)</option>
                <option value="suspended">Suspendiert (Login gesperrt)</option>
              </select>
            </div>
          </div>

          {/* Granular Course Instructor Permissions on Account Creation */}
          <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-mono text-sky-700 dark:text-sky-400 font-bold uppercase tracking-wider">
              GRANULARE AUSBILDER- &amp; SONDERBERECHTIGUNGEN (OPTIONAL)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  <span>Zugewiesene Lehrgangs-Codes (z. B. SOP-01, PC-102 oder *)</span>
                  <FieldTooltip
                    title="Lehrgangs-Zuweisung (Kurs-Codes)"
                    description="Kommagetrennte Liste von Modul-Codes, für die dieser Beamte als Ausbilder zuständig ist. Verwende '*' für alle Lehrgänge."
                    hint="Wichtig: Wirkt in Kombination mit der Checkbox 'Noten/Status vergeben'."
                  />
                </label>
                <input
                  type="text"
                  value={newCourseCodes}
                  onChange={e => setNewCourseCodes(e.target.value)}
                  placeholder="SOP-01, FTO-02"
                  className="w-full px-3 py-1.5 text-xs font-mono uppercase rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex flex-wrap gap-4 pt-3">
                <label className="inline-flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCanGradeCourses}
                    onChange={e => setNewCanGradeCourses(e.target.checked)}
                  />
                  <span>Darf in zugewiesenen Lehrgängen Noten/Status vergeben</span>
                  <FieldTooltip
                    title="Kursgebundene Bewertungsfreigabe"
                    description="Erlaubt dem Nutzer, im Ausbildungsbereich Noten und Bestanden-Status ausschließlich für die links eingetragenen Lehrgangs-Codes zu vergeben."
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCanManageEvents}
                    onChange={e => setNewCanManageEvents(e.target.checked)}
                  />
                  <span>Darf Kalender-Termine verwalten</span>
                  <FieldTooltip
                    align="right"
                    title="Kalender- & Einsatzplanung"
                    description="Berechtigt den Nutzer, neue Trainings, Prüfungen oder Dienstbesprechungen im interaktiven Einsatzkalender anzulegen."
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer"
            >
              Benutzerkonto verbindlich anlegen
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Suche nach Benutzername, Name, Dienstnummer oder Abteilung..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-300">
          <span>ANGEZEIGTE ACCOUNTS: {filteredAccounts.length}</span>
          {roleFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className="text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              [Filter zurücksetzen]
            </button>
          )}
        </div>
      </div>

      {/* Real-time Account Control Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-950/70">
                <th className="py-3.5 px-4">VERBINDUNG (LIVE)</th>
                <th className="py-3.5 px-4">BADGE / CALLSIGN</th>
                <th className="py-3.5 px-4">NAME &amp; ABTEILUNG</th>
                <th className="py-3.5 px-4">BENUTZERNAME &amp; PASSWORT</th>
                <th className="py-3.5 px-4">RANG / ROLLE</th>
                <th className="py-3.5 px-4">KONTO-STATUS</th>
                <th className="py-3.5 px-4 text-right">FORTSCHRITT</th>
                <th className="py-3.5 px-4 text-right">ECHTZEIT-AKTIONEN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredAccounts.map(acc => {
                const officer = acc.publicProfile;
                const isEditing = editingUid === acc.uid;
                const isPwVisible = Boolean(showPasswords[acc.uid]);
                const officerProg = allProgress.filter(p => p.userId === acc.uid);
                const completedCount = officerProg.filter(
                  p => p.status === 'completed' || p.status === 'passed'
                ).length;

                return (
                  <React.Fragment key={acc.uid}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Real-time Online / Offline Telemetry */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              acc.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                          <span
                            className={
                              acc.isOnline
                                ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                : 'text-slate-500 dark:text-slate-400'
                            }
                          >
                            {acc.isOnline ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-white">{officer.badgeNumber}</span>
                        <span className="text-slate-400 mx-1.5">·</span>
                        <span className="text-sky-700 dark:text-sky-400 font-medium">{officer.callsign}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{officer.displayName}</div>
                        <div className="text-slate-600 dark:text-slate-300 mt-0.5">{officer.division}</div>
                      </td>

                      {/* Credentials with Toggle */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 dark:text-white font-semibold">{acc.username}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-sky-700 dark:text-sky-400 font-semibold">
                            {isPwVisible ? acc.password : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords(prev => ({
                                ...prev,
                                [acc.uid]: !prev[acc.uid]
                              }))
                            }
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                            title="Passwort anzeigen/verbergen"
                          >
                            {isPwVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white uppercase font-mono">
                          {officer.role}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">{officer.rank}</div>
                        {officer.granularPermissions?.assignedCourseCodes &&
                          officer.granularPermissions.assignedCourseCodes.length > 0 && (
                            <div className="text-[10px] font-mono text-sky-700 dark:text-sky-400 mt-0.5">
                              Kurse: {officer.granularPermissions.assignedCourseCodes.join(', ')}
                            </div>
                          )}
                      </td>

                      <td className="py-3.5 px-4 font-mono uppercase whitespace-nowrap">
                        {officer.whitelistStatus === 'whitelisted' && (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">AKTIV</span>
                        )}
                        {officer.whitelistStatus === 'probation' && (
                          <span className="text-sky-700 dark:text-sky-400 font-semibold">AUF PROBE</span>
                        )}
                        {officer.whitelistStatus === 'pending' && (
                          <span className="text-slate-500 dark:text-slate-400">AUSSTEHEND</span>
                        )}
                        {(officer.whitelistStatus === 'suspended' ||
                          officer.whitelistStatus === 'revoked') && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">SUSPENDIERT</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {completedCount} Abschlüsse
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {acc.uid !== currentUser.uid && (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspend(acc)}
                              className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
                                officer.whitelistStatus === 'suspended'
                                  ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                  : 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                              }`}
                            >
                              {officer.whitelistStatus === 'suspended'
                                ? 'Freischalten'
                                : 'Suspendieren'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => (isEditing ? setEditingUid(null) : startEditing(acc))}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded border border-sky-200 dark:border-sky-800 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            {isEditing ? 'Schließen' : 'Bearbeiten'}
                          </button>

                          {acc.uid !== currentUser.uid && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(acc.uid, acc.username)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded border border-transparent hover:border-rose-200 cursor-pointer"
                              title="Konto löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Full Editor Row */}
                    {isEditing && (
                      <tr className="bg-slate-100/90 dark:bg-slate-950/90">
                        <td colSpan={8} className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-800 pb-2">
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                Konten- &amp; Rangbearbeitung · {acc.username}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Hover über (?) für Feld-Hilfe
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                  <span>Login-Benutzername</span>
                                  <FieldTooltip
                                    title="Login-Benutzername ändern"
                                    description="Ändert den Anmeldenamen dieses Kontos. Der Beamte muss beim nächsten Login diesen neuen Benutzernamen eingeben."
                                    hint="Darf nicht leer oder doppelt vergeben sein."
                                  />
                                </label>
                                <input
                                  type="text"
                                  value={editUsername}
                                  onChange={e => setEditUsername(e.target.value)}
                                  className="w-full px-3 py-2 text-xs font-mono rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                  <span>Login-Passwort</span>
                                  <FieldTooltip
                                    title="Passwort direkt zurücksetzen"
                                    description="Direkte Passwort-Verwaltung durch den Administrator. Überschreibt das bisherige Passwort nach dem Speichern sofort."
                                    hint="Kein E-Mail-Reset nötig — direkt dem Beamten mitteilen."
                                  />
                                </label>
                                <input
                                  type="text"
                                  value={editPassword}
                                  onChange={e => setEditPassword(e.target.value)}
                                  className="w-full px-3 py-2 text-xs font-mono rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                  <span>Anzeigename (RP Name)</span>
                                  <FieldTooltip
                                    title="Öffentlicher Dienstname"
                                    description="Vollständiger Name des Beamten in der Dienststellen-Liste, bei Anträgen, Nachrichten und auf Ausbildungsnachweisen."
                                  />
                                </label>
                                <input
                                  type="text"
                                  value={editDisplayName}
                                  onChange={e => setEditDisplayName(e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="flex items-center text-xs font-semibold text-sky-700 dark:text-sky-400 mb-1">
                                  <span>System-Rang / Rolle</span>
                                  <FieldTooltip
                                    variant="warning"
                                    align="right"
                                    title="Kritische System-Rolle"
                                    description="Steuert die Haupt-Berechtigungsstufe im Portal. Ein Wechsel aktualisiert automatisch die Standard-Dienstgradbezeichnung und protokolliert die Änderung im Audit-Log."
                                    hint="Achtung: '1. Admin' gewährt vollen Systemzugriff!"
                                  />
                                </label>
                                <select
                                  value={editRole}
                                  onChange={e => {
                                    const r = e.target.value as OfficerRole;
                                    setEditRole(r);
                                    setEditRank(ROLE_HIERARCHY[r].defaultRank);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-medium rounded bg-white dark:bg-slate-900 border border-sky-400 text-slate-900 dark:text-white"
                                >
                                  <option value="trainee">5. Trainee (Nur Lehrmaterial &amp; Tests)</option>
                                  <option value="rookie">4. Rookie (Inkl. Abschlussprüfung)</option>
                                  <option value="officer">3. Officer (Vollzugsdienst)</option>
                                  <option value="colonel">2. Colonel (Darf Lerninhalte &amp; Tests bearbeiten)</option>
                                  <option value="admin">1. Admin (Vollzugriff)</option>
                                </select>
                              </div>

                              <div>
                                <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                  <span>Dienstnummer (Badge)</span>
                                  <FieldTooltip
                                    title="Dienstnummer (Badge Number)"
                                    description="Eindeutige Kennnummer der Dienstmarke (z. B. CA-1004). Wird automatisch in Großbuchstaben gespeichert."
                                  />
                                </label>
                                <input
                                  type="text"
                                  value={editBadge}
                                  onChange={e => setEditBadge(e.target.value)}
                                  className="w-full px-3 py-2 text-xs font-mono rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                  <span>Funkrufname (Callsign)</span>
                                  <FieldTooltip
                                    title="Funk-Rufzeichen (Callsign)"
                                    description="Taktische Funkkennung im Einsatz- und Streifendienst (z. B. 1-ADAM-12)."
                                  />
                                </label>
                                <input
                                  type="text"
                                  value={editCallsign}
                                  onChange={e => setEditCallsign(e.target.value)}
                                  className="w-full px-3 py-2 text-xs font-mono rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                  <span>Dienstgrad-Bezeichnung</span>
                                  <FieldTooltip
                                    title="Offizieller Dienstgrad (Rank)"
                                    description="Individuelle Amtsbezeichnung (z. B. 'Police Officer II', 'Sergeant', 'Commander'), die ergänzend zur System-Rolle im Profil angezeigt wird."
                                  />
                                </label>
                                <input
                                  type="text"
                                  value={editRank}
                                  onChange={e => setEditRank(e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                  <span>Konto- &amp; Whitelist-Status</span>
                                  <FieldTooltip
                                    variant="warning"
                                    align="right"
                                    title="Konto-Freigabe & Sperrstatus"
                                    description="Steuert die Zugangsberechtigung: 'Suspendiert' und 'Widerrufen' verweigern die Anmeldung am Portal mit sofortiger Wirkung."
                                    hint="Dein eigenes Admin-Konto kann nicht gesperrt werden."
                                  />
                                </label>
                                <select
                                  value={editWhitelist}
                                  onChange={e => setEditWhitelist(e.target.value as WhitelistStatus)}
                                  className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                >
                                  <option value="whitelisted">Aktiv (Whitelisted)</option>
                                  <option value="probation">Auf Probe (Probation)</option>
                                  <option value="suspended">Suspendiert (Login gesperrt)</option>
                                  <option value="revoked">Widerrufen (Revoked)</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                  <span>Abteilung / Division</span>
                                  <FieldTooltip
                                    title="Abteilungszuordnung"
                                    description="Zugeordnete Abteilung oder Sondereinheit des Beamten für Dienstverzeichnis und Leitungsberichte."
                                  />
                                </label>
                                <input
                                  type="text"
                                  value={editDivision}
                                  onChange={e => setEditDivision(e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                  <span>Interne Admin-Notiz</span>
                                  <FieldTooltip
                                    align="right"
                                    title="Vertraulicher Admin-Aktenvermerk"
                                    description="Interne Notiz zur Personalakte (z. B. Beförderungshistorie, Verwarnungen oder Sonderaufgaben). Nur für Administratoren sichtbar."
                                  />
                                </label>
                                <input
                                  type="text"
                                  value={editNotes}
                                  onChange={e => setEditNotes(e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>

                            {/* Granular Role Permissions Editor */}
                            <div className="p-4 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 space-y-3">
                              <div className="text-xs font-mono text-sky-700 dark:text-sky-400 font-bold uppercase tracking-wider">
                                FLEXIBLE BERECHTIGUNGS-GRANULARITÄT (LEHRGANGS-SPEZIFISCHE RECHTE)
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                <div className="md:col-span-5">
                                  <label className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                    <span>Zugewiesene Ausbilder-Lehrgänge (z. B. SOP-01, PC-102 oder *)</span>
                                    <FieldTooltip
                                      title="Zugewiesene Lehrgangs-Codes"
                                      description="Definiert, für welche spezifischen Module dieser Beamte als Fachausbilder eingeteilt ist. Mehrere Codes mit Komma trennen oder '*' für alle Lehrgänge eintragen."
                                      hint="Beispiel: SOP-01, LD-15, FTO-02"
                                    />
                                  </label>
                                  <input
                                    type="text"
                                    value={editCourseCodes}
                                    onChange={e => setEditCourseCodes(e.target.value)}
                                    placeholder="SOP-01, LD-15"
                                    className="w-full px-3 py-1.5 text-xs font-mono uppercase rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-800 dark:text-slate-200">
                                  <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editCanGradeCourses}
                                      onChange={e => setEditCanGradeCourses(e.target.checked)}
                                    />
                                    <span>Noten &amp; Status in zugewiesenen Lehrgängen vergeben</span>
                                    <FieldTooltip
                                      title="Noten- & Statusvergabe"
                                      description="Berechtigt den Nutzer, Prüfungsnoten und Modul-Abschlüsse ausschließlich in den ihm zugewiesenen Lehrgängen zu bearbeiten."
                                    />
                                  </label>
                                  <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editCanManageEvents}
                                      onChange={e => setEditCanManageEvents(e.target.checked)}
                                    />
                                    <span>Kalender-Termine &amp; Trainings anlegen</span>
                                    <FieldTooltip
                                      align="right"
                                      title="Termin- & Trainingsverwaltung"
                                      description="Erlaubt das Erstellen, Bearbeiten und Löschen von Terminen im interaktiven Einsatz- und Ausbildungskalender."
                                    />
                                  </label>
                                  <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editCanPublishAnnouncements}
                                      onChange={e => setEditCanPublishAnnouncements(e.target.checked)}
                                    />
                                    <span>Offizielle Bekanntmachungen veröffentlichen</span>
                                    <FieldTooltip
                                      title="Bekanntmachungen veröffentlichen"
                                      description="Berechtigt zum Verfassen offizieller Mitteilungen und Dienstanweisungen im globalen Ankündigungs-Feed."
                                    />
                                  </label>
                                  <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editCanReviewStandardRequests}
                                      onChange={e => setEditCanReviewStandardRequests(e.target.checked)}
                                    />
                                    <span>Fachanträge prüfen (Rangänderung bleibt Admin-exklusiv)</span>
                                    <FieldTooltip
                                      variant="warning"
                                      align="right"
                                      title="Fachanträge bearbeiten"
                                      description="Erlaubt die Vorprüfung von Lehrgangs- oder Auszeichnungsanträgen. Beförderungen und Rangänderungen bleiben weiterhin strikt dem Admin vorbehalten."
                                    />
                                  </label>
                                  <label className="inline-flex items-center gap-2 cursor-pointer sm:col-span-2">
                                    <input
                                      type="checkbox"
                                      checked={editCanExportReports}
                                      onChange={e => setEditCanExportReports(e.target.checked)}
                                    />
                                    <span>Leitungsberichte &amp; Ausbildungsmatrix exportieren</span>
                                    <FieldTooltip
                                      title="Berichts- & Datenexport"
                                      description="Schaltet den Export von Ausbildungsständen und Statistiken als CSV-Tabelle oder druckfertigen PDF-Leitungsbericht frei."
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setEditingUid(null)}
                                className="px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              >
                                Abbrechen
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveAccount(acc.uid)}
                                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" /> Änderungen in Echtzeit übernehmen
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

