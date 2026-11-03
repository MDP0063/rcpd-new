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
  Ban,
  CheckCircle2,
  Shield,
  Download,
  Upload
} from 'lucide-react';
import {
  AdminAccountView,
  OfficerRole,
  ROLE_HIERARCHY,
  UserProgressDoc,
  UserPublicProfile,
  WhitelistStatus
} from '../types/portal';

interface AdminPersonnelConsoleProps {
  currentUser: UserPublicProfile;
  adminAccounts: AdminAccountView[];
  allProgress: UserProgressDoc[];
  onRefreshState: () => Promise<void>;
  onStatusToast: (msg: string) => void;
}

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
  const [myNewUsername, setMyNewUsername] = useState(myAdminRecord?.username || currentUser.username || 'Admin1');
  const [myNewPassword, setMyNewPassword] = useState(myAdminRecord?.password || '1234');
  const [showMyPassword, setShowMyPassword] = useState(false);

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
  };

  const handleUpdateMyOwnCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/accounts/${currentUser.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUid: currentUser.uid,
          username: myNewUsername.trim(),
          password: myNewPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onStatusToast(data.error || 'Fehler beim Aktualisieren deiner Admin-Zugangsdaten.');
        return;
      }
      await onRefreshState();
      onStatusToast(`Deine Admin-Zugangsdaten (${myNewUsername}) wurden in Echtzeit aktualisiert.`);
    } catch {
      onStatusToast('Netzwerkfehler beim Speichern deiner Zugangsdaten.');
    }
  };

  const handleSaveAccount = async (uid: string) => {
    try {
      const res = await fetch(`/api/admin/accounts/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
          supervisorNotes: editNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        onStatusToast(data.error || 'Fehler beim Speichern des Kontos.');
        return;
      }

      await onRefreshState();
      setEditingUid(null);
      onStatusToast(`Konto "${editUsername}" (Rang: ${editRole.toUpperCase()}) in Echtzeit aktualisiert.`);
    } catch {
      onStatusToast('Netzwerkfehler beim Speichern.');
    }
  };

  const handleToggleSuspend = async (acc: AdminAccountView) => {
    if (acc.uid === currentUser.uid) {
      onStatusToast('Du kannst dein eigenes aktives Administratorkonto nicht suspendieren.');
      return;
    }
    const nextStatus: WhitelistStatus =
      acc.publicProfile.whitelistStatus === 'suspended' ? 'whitelisted' : 'suspended';

    try {
      const res = await fetch(`/api/admin/accounts/${acc.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      }
    } catch {
      onStatusToast('Fehler beim Ändern des Sperrstatus.');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const roleMeta = ROLE_HIERARCHY[newRole];

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          supervisorNotes: 'Vom Administrator persönlich erstellt.'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        onStatusToast(data.error || 'Konto konnte nicht angelegt werden.');
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
        `Neues Konto "${data.account.username}" (Rolle: ${data.account.publicProfile.role.toUpperCase()}) angelegt.`
      );
    } catch {
      onStatusToast('Serverfehler beim Anlegen des Benutzerkontos.');
    }
  };

  const handleDeleteAccount = async (uid: string, username: string) => {
    if (uid === currentUser.uid) {
      onStatusToast('Du kannst dein eigenes Administratorkonto nicht löschen.');
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/accounts/${uid}?adminUid=${encodeURIComponent(currentUser.uid)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        onStatusToast(data.error || 'Konto konnte nicht gelöscht werden.');
        return;
      }
      await onRefreshState();
      setEditingUid(null);
      onStatusToast(`Benutzerkonto "${username}" wurde dauerhaft gelöscht.`);
    } catch {
      onStatusToast('Fehler beim Löschen des Kontos.');
    }
  };

  const onlineCount = adminAccounts.filter(a => a.isOnline).length;
  const quickRestoreRef = useRef<HTMLInputElement | null>(null);

  const handleQuickExportBackup = async () => {
    try {
      const res = await fetch(
        `/api/admin/backup?adminUid=${encodeURIComponent(currentUser.uid)}`
      );
      const data = await res.json();
      if (!res.ok) {
        onStatusToast(data.error || 'Backup-Export fehlgeschlagen.');
        return;
      }
      const datePart = new Date().toISOString().slice(0, 10);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
    } catch {
      onStatusToast('Fehler beim Herunterladen des Backups.');
    }
  };

  const handleQuickRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const res = await fetch('/api/admin/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminUid: currentUser.uid,
            snapshot: parsed
          })
        });
        const data = await res.json();
        if (!res.ok) {
          onStatusToast(data.error || 'Backup-Wiederherstellung fehlgeschlagen.');
          return;
        }
        await onRefreshState();
        onStatusToast(
          `Backup wiederhergestellt (${data.summary.accountsCount} Konten, ${data.summary.modulesCount} PDFs, ${data.summary.examsCount} Prüfungen).`
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono text-sky-600 font-semibold">
            EXKLUSIVES ADMIN PANEL // ECHTZEIT KONTEN-, PASSWORT- &amp; RANGVERWALTUNG
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Benutzerkonten, Ränge &amp; Live-Status (Nur für Admin sichtbar)
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Dieser Bereich ist für alle anderen Ränge (inklusive Colonel) vollständig unsichtbar und gesperrt. Alle neuen Konten werden persönlich durch dich angelegt und starten standardmäßig als <strong>Trainee</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <button
            type="button"
            onClick={handleQuickExportBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-300 text-slate-800 rounded-md hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            title="Alle Accounts, Passwörter, PDFs & Tests als Backup-Datei sichern"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" /> Backup sichern (.json)
          </button>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-300 text-slate-800 rounded-md hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5 text-emerald-600" /> Backup einspielen
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
            <div className="text-sm font-semibold text-white">
              Eigene Anmeldedaten ({currentUser.username}) direkt ändern
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                ADMIN BENUTZERNAME
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
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                ADMIN PASSWORT
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
                >
                  {showMyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-[11px] font-mono text-slate-400">
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
                    ? 'border-sky-500 bg-sky-50/70'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <span className="uppercase font-semibold text-slate-800">{roleKey}</span>
                    <span>#{meta.rankOrder}</span>
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
                    {count}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 leading-tight">
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
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="text-xs font-mono text-sky-600 font-semibold">
                NEUES BENUTZERKONTO ANLEGEN // PERSÖNLICHE ADMIN-VERGABE
              </div>
              <h2 className="text-base font-semibold text-slate-900 mt-0.5">
                Neuen Account erstellen (Startet automatisch als Trainee, sofern nicht anders gewählt)
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Login-Benutzername (User) *
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="z.B. TraineeMiller"
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Login-Passwort *
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="z.B. 5829"
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Vollständiger Name (RP Name) *
              </label>
              <input
                type="text"
                required
                value={newDisplayName}
                onChange={e => setNewDisplayName(e.target.value)}
                placeholder="z.B. Lukas Miller"
                className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Rang / Rolle (Standard: Trainee)
              </label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as OfficerRole)}
                className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="trainee">5. Trainee (Standard-Einstieg — Lehrmaterial &amp; Tests)</option>
                <option value="rookie">4. Rookie (Inkl. Abschlussprüfung)</option>
                <option value="officer">3. Officer (Regulärer Streifendienst)</option>
                <option value="colonel">2. Colonel (Kann Lehrmaterialien &amp; Tests bearbeiten)</option>
                <option value="admin">1. Admin (Vollzugriff)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dienstnummer (Badge)
              </label>
              <input
                type="text"
                required
                value={newBadge}
                onChange={e => setNewBadge(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Funkrufname (Callsign)
              </label>
              <input
                type="text"
                required
                value={newCallsign}
                onChange={e => setNewCallsign(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Abteilung / Division
              </label>
              <input
                type="text"
                required
                value={newDivision}
                onChange={e => setNewDivision(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Konto-Status
              </label>
              <select
                value={newWhitelist}
                onChange={e => setNewWhitelist(e.target.value as WhitelistStatus)}
                className="w-full px-3 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900"
              >
                <option value="whitelisted">Aktiv / Freigeschaltet</option>
                <option value="probation">Auf Probe (Probation)</option>
                <option value="suspended">Suspendiert (Login gesperrt)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
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
            className="w-full pl-9 pr-4 py-2 text-xs rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
          <span>ANGEZEIGTE ACCOUNTS: {filteredAccounts.length}</span>
          {roleFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className="text-sky-600 hover:underline cursor-pointer"
            >
              [Filter zurücksetzen]
            </button>
          )}
        </div>
      </div>

      {/* Real-time Account Control Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-mono text-slate-600 bg-slate-100/80">
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
            <tbody className="divide-y divide-slate-200 text-xs">
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
                    <tr className="hover:bg-slate-50 transition-colors">
                      {/* Real-time Online / Offline Telemetry */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              acc.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                            }`}
                          />
                          <span
                            className={
                              acc.isOnline
                                ? 'text-emerald-700 font-semibold'
                                : 'text-slate-500'
                            }
                          >
                            {acc.isOnline ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap">
                        <span className="font-semibold text-slate-900">{officer.badgeNumber}</span>
                        <span className="text-slate-400 mx-1.5">·</span>
                        <span className="text-sky-700 font-medium">{officer.callsign}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{officer.displayName}</div>
                        <div className="text-slate-500 mt-0.5">{officer.division}</div>
                      </td>

                      {/* Credentials with Toggle */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 font-semibold">{acc.username}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-sky-700 font-semibold">
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
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
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
                        <div className="font-semibold text-slate-900 uppercase font-mono">
                          {officer.role}
                        </div>
                        <div className="text-slate-500">{officer.rank}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono uppercase whitespace-nowrap">
                        {officer.whitelistStatus === 'whitelisted' && (
                          <span className="text-emerald-700 font-semibold">AKTIV</span>
                        )}
                        {officer.whitelistStatus === 'probation' && (
                          <span className="text-sky-700 font-semibold">AUF PROBE</span>
                        )}
                        {officer.whitelistStatus === 'pending' && (
                          <span className="text-slate-500">AUSSTEHEND</span>
                        )}
                        {(officer.whitelistStatus === 'suspended' ||
                          officer.whitelistStatus === 'revoked') && (
                          <span className="text-rose-600 font-semibold">SUSPENDIERT</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
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
                                  ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                  : 'border-amber-300 text-amber-700 hover:bg-amber-50'
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded border border-sky-200 cursor-pointer"
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
                      <tr className="bg-slate-100/90">
                        <td colSpan={8} className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                              <div className="text-xs font-mono text-slate-800 font-semibold">
                                VOLLSTÄNDIGE KONTEN- &amp; RANGBEARBEITUNG // {acc.username}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-800 mb-1">
                                  Login-Benutzername
                                </label>
                                <input
                                  type="text"
                                  value={editUsername}
                                  onChange={e => setEditUsername(e.target.value)}
                                  className="w-full px-3 py-2 text-xs font-mono rounded bg-white border border-slate-300 text-slate-900"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-800 mb-1">
                                  Login-Passwort
                                </label>
                                <input
                                  type="text"
                                  value={editPassword}
                                  onChange={e => setEditPassword(e.target.value)}
                                  className="w-full px-3 py-2 text-xs font-mono rounded bg-white border border-slate-300 text-slate-900"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Anzeigename (RP Name)
                                </label>
                                <input
                                  type="text"
                                  value={editDisplayName}
                                  onChange={e => setEditDisplayName(e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded bg-white border border-slate-300 text-slate-900"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-sky-700 mb-1">
                                  System-Rang / Rolle
                                </label>
                                <select
                                  value={editRole}
                                  onChange={e => {
                                    const r = e.target.value as OfficerRole;
                                    setEditRole(r);
                                    setEditRank(ROLE_HIERARCHY[r].defaultRank);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-medium rounded bg-white border border-sky-400 text-slate-900"
                                >
                                  <option value="trainee">5. Trainee (Nur Lehrmaterial &amp; Tests)</option>
                                  <option value="rookie">4. Rookie (Inkl. Abschlussprüfung)</option>
                                  <option value="officer">3. Officer (Vollzugsdienst)</option>
                                  <option value="colonel">2. Colonel (Darf Lerninhalte &amp; Tests bearbeiten)</option>
                                  <option value="admin">1. Admin (Vollzugriff)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Dienstnummer (Badge)
                                </label>
                                <input
                                  type="text"
                                  value={editBadge}
                                  onChange={e => setEditBadge(e.target.value)}
                                  className="w-full px-3 py-2 text-xs font-mono rounded bg-white border border-slate-300 text-slate-900"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Funkrufname (Callsign)
                                </label>
                                <input
                                  type="text"
                                  value={editCallsign}
                                  onChange={e => setEditCallsign(e.target.value)}
                                  className="w-full px-3 py-2 text-xs font-mono rounded bg-white border border-slate-300 text-slate-900"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Dienstgrad-Bezeichnung
                                </label>
                                <input
                                  type="text"
                                  value={editRank}
                                  onChange={e => setEditRank(e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded bg-white border border-slate-300 text-slate-900"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Konto- &amp; Whitelist-Status
                                </label>
                                <select
                                  value={editWhitelist}
                                  onChange={e => setEditWhitelist(e.target.value as WhitelistStatus)}
                                  className="w-full px-3 py-2 text-xs rounded bg-white border border-slate-300 text-slate-900"
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
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Abteilung / Division
                                </label>
                                <input
                                  type="text"
                                  value={editDivision}
                                  onChange={e => setEditDivision(e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded bg-white border border-slate-300 text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Interne Admin-Notiz
                                </label>
                                <input
                                  type="text"
                                  value={editNotes}
                                  onChange={e => setEditNotes(e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded bg-white border border-slate-300 text-slate-900"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setEditingUid(null)}
                                className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
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
